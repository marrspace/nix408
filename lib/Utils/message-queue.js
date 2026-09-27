/**
 * Queue Manager — Internal queue untuk pengiriman pesan.
 * Fitur: priority, delay, concurrency, rate limiting, deduplication.
 * Mampu menangani ribuan pesan tanpa blocking event loop.
 */

import { QueueOverflowError, RateLimitError } from './message-error.js';

// ─────────────────────────────────────────────
// QUEUE ITEM
// ─────────────────────────────────────────────

let _itemSeq = 0;

class QueueItem {
    constructor(fn, opts = {}) {
        this.id       = opts.id       ?? `qi_${++_itemSeq}`;
        this.fn       = fn;
        this.priority = opts.priority ?? 0;
        this.delayMs  = opts.delayMs  ?? 0;
        this.dedupKey = opts.dedupKey ?? null;
        this.jid      = opts.jid      ?? null;
        this.addedAt  = Date.now();
        this._resolve = null;
        this._reject  = null;
        this.promise  = new Promise((res, rej) => { this._resolve = res; this._reject = rej; });
    }
}

// ─────────────────────────────────────────────
// MESSAGE QUEUE
// ─────────────────────────────────────────────

export class MessageQueue {
    /**
     * @param {object} opts
     * @param {number}   opts.maxSize         max items in queue (default 10000)
     * @param {number}   opts.concurrency      max concurrent executions (default 5)
     * @param {number}   opts.rateLimitPerSec  max items per second (default 20)
     * @param {number}   opts.rateLimitBurst   burst allowance (default 30)
     * @param {boolean}  opts.deduplication    drop duplicate dedupKey (default true)
     * @param {Function} opts.onError          (err, item) => void
     * @param {Function} opts.onMetrics        (event, data) => void
     */
    constructor(opts = {}) {
        this._name            = opts.name            ?? 'default';
        this._maxSize         = opts.maxSize          ?? 10_000;
        this._concurrency     = opts.concurrency      ?? 5;
        this._rateLimitPerSec = opts.rateLimitPerSec  ?? 20;
        this._rateLimitBurst  = opts.rateLimitBurst   ?? 30;
        this._deduplication   = opts.deduplication    !== false;
        this._onError         = opts.onError          ?? null;
        this._onMetrics       = opts.onMetrics        ?? null;

        /** @type {QueueItem[]} priority queue (sorted by priority desc, then addedAt asc) */
        this._queue    = [];
        this._running  = 0;         // active concurrent tasks
        this._stopped  = false;
        this._dedupSet = new Set(); // active dedupKeys

        // Token bucket for rate limiting
        this._tokens   = this._rateLimitBurst;
        this._lastRefill = Date.now();

        // Stats
        this._stats = {
            enqueued: 0, dequeued: 0, dropped: 0,
            failed: 0, completed: 0,
        };
    }

    // ── Public API ────────────────────────────

    /**
     * Tambahkan task ke queue. Mengembalikan Promise yang resolve dengan hasil task.
     * @param {Function} fn      async () => result
     * @param {object}   opts    { priority, delayMs, dedupKey, jid, id }
     * @returns {Promise<any>}
     */
    enqueue(fn, opts = {}) {
        if (this._stopped) {
            return Promise.reject(new QueueOverflowError('Queue sudah dihentikan'));
        }
        if (this._queue.length >= this._maxSize) {
            this._stats.dropped++;
            this._emit('dropped', { size: this._queue.length, name: this._name });
            return Promise.reject(new QueueOverflowError(
                `Queue "${this._name}" penuh (max: ${this._maxSize})`
            ));
        }

        const item = new QueueItem(fn, opts);

        // Deduplication
        if (this._deduplication && item.dedupKey) {
            if (this._dedupSet.has(item.dedupKey)) {
                // Find existing item and return its promise
                const existing = this._queue.find(q => q.dedupKey === item.dedupKey);
                if (existing) return existing.promise;
            }
            this._dedupSet.add(item.dedupKey);
        }

        this._insertByPriority(item);
        this._stats.enqueued++;
        this._emit('enqueued', { size: this._queue.length, name: this._name });

        // Schedule with delay if needed
        if (item.delayMs > 0) {
            setTimeout(() => this._tick(), item.delayMs);
        } else {
            // Use setImmediate to avoid blocking
            setImmediate(() => this._tick());
        }

        return item.promise;
    }

    /** Hentikan queue (pending items di-reject) */
    stop(flush = false) {
        this._stopped = true;
        if (!flush) {
            const pending = [...this._queue];
            this._queue = [];
            for (const item of pending) {
                item._reject(new QueueOverflowError('Queue dihentikan'));
            }
        }
    }

    /** Resume queue yang dihentikan */
    resume() {
        this._stopped = false;
        this._tick();
    }

    get size()      { return this._queue.length; }
    get running()   { return this._running; }
    get stats()     { return { ...this._stats, running: this._running, pending: this._queue.length }; }
    get isStopped() { return this._stopped; }

    // ── Internal ──────────────────────────────

    _insertByPriority(item) {
        // Binary search insert (highest priority first, then oldest first)
        let lo = 0, hi = this._queue.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            const m = this._queue[mid];
            if (m.priority > item.priority || (m.priority === item.priority && m.addedAt <= item.addedAt))
                lo = mid + 1;
            else
                hi = mid;
        }
        this._queue.splice(lo, 0, item);
    }

    _refillTokens() {
        const now    = Date.now();
        const elapsed = (now - this._lastRefill) / 1000; // seconds
        const refill  = elapsed * this._rateLimitPerSec;
        this._tokens  = Math.min(this._tokens + refill, this._rateLimitBurst);
        this._lastRefill = now;
    }

    _tick() {
        if (this._stopped) return;
        if (this._running >= this._concurrency) return;
        if (this._queue.length === 0) return;

        this._refillTokens();
        if (this._tokens < 1) {
            // Rate limited — schedule next tick after refill delay
            const waitMs = Math.ceil((1 - this._tokens) / this._rateLimitPerSec * 1000) + 1;
            setTimeout(() => this._tick(), waitMs);
            return;
        }

        const item = this._queue.shift();
        if (!item) return;

        this._tokens -= 1;
        this._running++;

        const waitMs = Date.now() - item.addedAt;
        this._emit('dequeued', { size: this._queue.length, waitMs, name: this._name });
        this._stats.dequeued++;

        if (item.dedupKey) this._dedupSet.delete(item.dedupKey);

        const run = async () => {
            try {
                const result = await item.fn();
                item._resolve(result);
                this._stats.completed++;
            } catch (err) {
                item._reject(err);
                this._stats.failed++;
                if (this._onError) {
                    try { this._onError(err, item); } catch (_) {}
                }
            } finally {
                this._running--;
                // Schedule next item
                setImmediate(() => this._tick());
            }
        };

        run();

        // Try to schedule more concurrent tasks
        if (this._running < this._concurrency && this._queue.length > 0) {
            setImmediate(() => this._tick());
        }
    }

    _emit(event, data) {
        if (this._onMetrics) {
            try { this._onMetrics(event, data); } catch (_) {}
        }
    }
}

// ─────────────────────────────────────────────
// QUEUE MANAGER
// ─────────────────────────────────────────────

export class QueueManager {
    constructor() {
        this._queues = new Map();
    }

    /**
     * Ambil atau buat queue dengan nama tertentu.
     * @param {string} name
     * @param {object} opts — MessageQueue options
     */
    getQueue(name, opts = {}) {
        if (!this._queues.has(name)) {
            this._queues.set(name, new MessageQueue({ name, ...opts }));
        }
        return this._queues.get(name);
    }

    /** Hapus queue */
    removeQueue(name) {
        const q = this._queues.get(name);
        if (q) { q.stop(); this._queues.delete(name); }
    }

    /** Stop semua queue */
    stopAll(flush = false) {
        for (const q of this._queues.values()) q.stop(flush);
    }

    /** Semua stats */
    getAllStats() {
        const result = {};
        for (const [name, q] of this._queues) result[name] = q.stats;
        return result;
    }

    get queueNames() { return [...this._queues.keys()]; }
}

export const globalQueueManager = new QueueManager();
