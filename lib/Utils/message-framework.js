/**
 * MessageFramework — Entry point utama yang menggabungkan semua sistem:
 * Pipeline, Hook, Queue, Cache, Metrics, Logger, Retry, Plugin, Builder.
 *
 * Digunakan oleh messages-send.js dan messages-recv.js sebagai fondasi framework.
 */

import { PipelineRegistry, HookSystem, createMessageContext, LifecycleEvents } from './message-pipeline.js';
import { PipelineLogger, pipelineLogger }                                        from './message-logger.js';
import { MetricsRegistry, globalMetrics }                                        from './message-metrics.js';
import { MessageQueue, QueueManager, globalQueueManager }                        from './message-queue.js';
import { CacheRegistry, globalCache }                                            from './message-cache.js';
import { AdaptiveRetryManager, DEFAULT_SEND_POLICY, DEFAULT_MEDIA_POLICY }       from './message-retry-adaptive.js';
import { PluginManager, globalPluginManager }                                    from './message-plugin.js';
import { MessageBuilder, globalMessageBuilder, createBuildContext }              from './message-builder.js';
import { UploadPipeline, globalUploadPipeline, createUploadContext }             from './message-upload-pipeline.js';
import { DownloadPipeline, globalDownloadPipeline, createDownloadContext }       from './message-download-pipeline.js';
import { normalizeToPipelineError }                                              from './message-error.js';

// ─────────────────────────────────────────────
// FRAMEWORK CLASS
// ─────────────────────────────────────────────

export class MessageFramework {
    /**
     * @param {object} config — Baileys socket config
     */
    constructor(config = {}) {
        const logger = config.logger ?? null;

        // ── Core Logger ───────────────────────────────────────────────────────
        this.logger = new PipelineLogger({
            logger,
            prefix:   '[MarrBaileys]',
            minLevel: config.frameworkLogLevel ?? 1, // DEBUG
        });

        // ── Metrics ───────────────────────────────────────────────────────────
        this.metrics = new MetricsRegistry();

        // ── Cache ─────────────────────────────────────────────────────────────
        this.cache = new CacheRegistry({ adapter: config.frameworkCacheAdapter });

        // ── Hook + Pipeline ───────────────────────────────────────────────────
        this.hooks    = new HookSystem();
        this.pipeline = new PipelineRegistry();
        this.pipeline.hooks = this.hooks;

        // ── Queue Manager ─────────────────────────────────────────────────────
        this.queue = new QueueManager();
        this.sendQueue = this.queue.getQueue('send', {
            maxSize:         config.sendQueueMaxSize    ?? 10_000,
            concurrency:     config.sendQueueConcurrency ?? 5,
            rateLimitPerSec: config.sendQueueRateLimit   ?? 20,
            rateLimitBurst:  config.sendQueueBurst       ?? 30,
            deduplication:   config.sendQueueDedup !== false,
            onError: (err, item) => {
                this.logger.error(`Queue send error [${item.id}]: ${err?.message}`, { err });
                this.metrics.inc('errors.total');
            },
            onMetrics: (event, data) => {
                if (event === 'enqueued')  this.metrics.inc('queue.enqueued');
                if (event === 'dequeued')  this.metrics.inc('queue.dequeued');
                if (event === 'dropped')   this.metrics.inc('queue.dropped');
                if (data?.waitMs !== undefined) this.metrics.observe('queue.wait_ms', data.waitMs);
                if (data?.size    !== undefined) this.metrics.set('queue.size', data.size);
            },
        });

        // ── Retry Manager ─────────────────────────────────────────────────────
        this.retryManager = new AdaptiveRetryManager({
            logger,
            metrics: this.metrics,
            hooks:   this.hooks,
        });

        // ── Plugin Manager ────────────────────────────────────────────────────
        this.plugins = new PluginManager({
            logger,
            hooks:   this.hooks,
            metrics: this.metrics,
        });

        // ── Message Builder ───────────────────────────────────────────────────
        this.builder = new MessageBuilder({
            logger,
            hooks:   this.hooks,
            metrics: this.metrics,
            plugins: this.plugins,
        });

        // ── Upload Pipeline ───────────────────────────────────────────────────
        this.uploadPipeline = new UploadPipeline({
            logger,
            hooks:       this.hooks,
            metrics:     this.metrics,
            cache:       this.cache,
            retryPolicy: config.mediaRetryPolicy ?? DEFAULT_MEDIA_POLICY,
            timeoutMs:   config.mediaUploadTimeoutMs ?? 120_000,
        });

        // ── Download Pipeline ─────────────────────────────────────────────────
        this.downloadPipeline = new DownloadPipeline({
            logger,
            hooks:       this.hooks,
            metrics:     this.metrics,
            cache:       this.cache,
            retryPolicy: config.mediaRetryPolicy ?? DEFAULT_MEDIA_POLICY,
            timeoutMs:   config.mediaDownloadTimeoutMs ?? 60_000,
        });

        // ── Retry Policies ────────────────────────────────────────────────────
        this.sendPolicy  = config.sendRetryPolicy  ?? DEFAULT_SEND_POLICY;
        this.mediaPolicy = config.mediaRetryPolicy ?? DEFAULT_MEDIA_POLICY;

        this._config   = config;
        this._attached = false;
        this.socket    = null;
    }

    // ─────────────────────────────────────────
    // ATTACH / TEARDOWN
    // ─────────────────────────────────────────

    /**
     * Attach framework ke socket Baileys.
     * Dipanggil dari makeMessagesSocket().
     *
     * @param {object} socket — partial atau full socket instance
     */
    attach(socket) {
        if (this._attached) return this;
        this.socket = socket;

        // Wire plugins
        if (socket?.ev) {
            this.plugins.attach(socket, this.pipeline);
        }

        // Bridge framework logger ke socket logger
        if (this._config.logger) {
            this.logger.setCustomLogger((level, msg, data) => {
                if (this._config.logger?.[level]) {
                    this._config.logger[level](data ?? {}, msg);
                }
            });
        }

        // Wire events ke metrics
        if (socket?.ev) {
            socket.ev.on('messages.upsert', ({ messages, type }) => {
                if (type === 'notify') {
                    this.metrics.inc('messages.received.total', messages?.length ?? 1);
                }
            });
            socket.ev.on('messages.update', (updates) => {
                this.metrics.inc('messages.updated.total', updates?.length ?? 1);
            });
            socket.ev.on('connection.update', (update) => {
                if (update.connection === 'open')  this.metrics.gauge('connections.active').inc();
                if (update.connection === 'close') this.metrics.gauge('connections.active').dec();
            });
        }

        this._attached = true;
        this.logger.info('MessageFramework berhasil di-attach ke socket');
        return this;
    }

    /**
     * Teardown — dipanggil saat socket ditutup.
     */
    async teardown() {
        try {
            this.sendQueue?.stop();
            this.queue?.stopAll();
            await this.plugins?.uninstallAll?.();
            this.hooks?.removeAll();
            this._attached = false;
            this.logger.info('MessageFramework di-teardown');
        } catch (_) {}
    }

    // ─────────────────────────────────────────
    // CONTEXT FACTORIES
    // ─────────────────────────────────────────

    createContext(overrides = {}) {
        return createMessageContext({ socket: this.socket, ...overrides });
    }
    createBuildContext(overrides = {})    { return createBuildContext(overrides); }
    createUploadContext(overrides = {})   { return createUploadContext(overrides); }
    createDownloadContext(overrides = {}) { return createDownloadContext(overrides); }

    // ─────────────────────────────────────────
    // PLUGIN / MIDDLEWARE / HOOK SHORTCUTS
    // ─────────────────────────────────────────

    /** Install plugin */
    async use(plugin) { await this.plugins.install(plugin); return this; }

    /** Daftarkan middleware pipeline */
    middleware(pipelineName, fn, priority = 0) {
        this.pipeline.use(pipelineName, fn, priority);
        return this;
    }

    /** Daftarkan lifecycle hook */
    hook(event, handler) { this.hooks.on(event, handler); return this; }

    // ─────────────────────────────────────────
    // QUEUE SEND
    // ─────────────────────────────────────────

    /**
     * Tambahkan task ke send queue.
     * @param {Function} sendFn    — async () => result
     * @param {object}   opts      — { priority, delayMs, dedupKey, jid }
     */
    queueSend(sendFn, opts = {}) {
        return this.sendQueue.enqueue(sendFn, opts);
    }

    // ─────────────────────────────────────────
    // METRICS
    // ─────────────────────────────────────────

    /** Ambil semua metrics */
    getMetrics() {
        return {
            framework: this.metrics.getAll(),
            queues:    this.queue.getAllStats(),
            cache:     this.cache.stats,
            retry:     this.retryManager.getStats(),
            plugins:   this.plugins.list(),
        };
    }

    // ─────────────────────────────────────────
    // PIPELINE RUNNERS
    // ─────────────────────────────────────────

    /**
     * Jalankan full send pipeline: before → relay → after + hooks.
     */
    async runSendPipeline(relayFn, ctx) {
        const start = Date.now();
        await this._emitHook(LifecycleEvents.SEND_START, ctx);

        await this.pipeline.beforeSend.run(ctx, async () => {});
        if (ctx.cancelled) {
            this.logger.info(`[Framework] Send dibatalkan: ${ctx.jid}`);
            return null;
        }

        let result;
        try {
            result = await this.retryManager.run(
                relayFn,
                this.sendPolicy,
                ctx.metadata?.msgId,
                { type: 'send', jid: ctx.jid }
            );
            this.metrics.inc('messages.sent.total');
            this.metrics.observe('send.duration_ms', Date.now() - start);
            ctx.result = result;
            ctx.timestamps.sent = Date.now();
        } catch (err) {
            ctx.error = normalizeToPipelineError(err);
            this.metrics.inc('messages.failed.total');
            this.metrics.inc('errors.total');
            await this._emitHook(LifecycleEvents.SEND_FAILED, ctx);
            throw ctx.error;
        }

        await this.pipeline.afterSend.run(ctx, async () => {});
        await this._emitHook(LifecycleEvents.SEND_FINISH, ctx);
        return result;
    }

    /**
     * Jalankan full receive pipeline.
     */
    async runReceivePipeline(processFn, ctx) {
        const start = Date.now();
        await this._emitHook(LifecycleEvents.MESSAGE_RECEIVE, ctx);

        await this.pipeline.beforeReceive.run(ctx, async () => {});
        if (ctx.cancelled) return null;

        let result;
        try {
            result = await processFn();
            this.metrics.inc('messages.received.total');
            this.metrics.observe('receive.duration_ms', Date.now() - start);
            ctx.result = result;
            ctx.timestamps.received = Date.now();
        } catch (err) {
            ctx.error = normalizeToPipelineError(err);
            this.metrics.inc('errors.total');
            throw ctx.error;
        }

        await this.pipeline.afterReceive.run(ctx, async () => {});
        return result;
    }

    /**
     * Jalankan full decode pipeline.
     */
    async runDecodePipeline(decodeFn, ctx) {
        const start = Date.now();
        await this._emitHook(LifecycleEvents.MESSAGE_DECODE, ctx);

        await this.pipeline.beforeDecode.run(ctx, async () => {});
        if (ctx.cancelled) return null;

        let result;
        try {
            result = await decodeFn();
            this.metrics.inc('decode.total');
            this.metrics.observe('decode.duration_ms', Date.now() - start);
            ctx.timestamps.decoded = Date.now();
        } catch (err) {
            ctx.error = normalizeToPipelineError(err);
            this.metrics.inc('errors.total');
            throw ctx.error;
        }

        await this.pipeline.afterDecode.run(ctx, async () => {});
        return result;
    }

    // ── Internal ──────────────────────────────

    async _emitHook(event, ctx) {
        if (this.hooks) {
            try { await this.hooks.emit(event, ctx); } catch (_) {}
        }
        this.metrics.inc('hooks.fired');
    }
}

// ─────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────

export function createMessageFramework(config) {
    return new MessageFramework(config);
}

// Re-export semua subsystems untuk akses langsung
export {
    PipelineRegistry, HookSystem, createMessageContext, LifecycleEvents,
    PipelineLogger, pipelineLogger,
    MetricsRegistry, globalMetrics,
    MessageQueue, QueueManager, globalQueueManager,
    CacheRegistry, globalCache,
    AdaptiveRetryManager, DEFAULT_SEND_POLICY, DEFAULT_MEDIA_POLICY,
    PluginManager, globalPluginManager,
    MessageBuilder, globalMessageBuilder, createBuildContext,
    UploadPipeline, globalUploadPipeline, createUploadContext,
    DownloadPipeline, globalDownloadPipeline, createDownloadContext,
};
