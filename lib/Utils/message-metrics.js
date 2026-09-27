/**
 * Metrics System — Counter, Gauge, Histogram + Registry.
 * Expose via getMetrics() API.
 */

export class Counter {
    constructor(name, description = '') {
        this.name = name; this.description = description;
        this._value = 0; this._labels = new Map();
    }
    inc(amount = 1, labels = {}) {
        this._value += amount;
        const key = JSON.stringify(labels);
        this._labels.set(key, (this._labels.get(key) || 0) + amount);
        return this;
    }
    get value() { return this._value; }
    reset() { this._value = 0; this._labels.clear(); return this; }
    toJSON() { return { name: this.name, value: this._value, description: this.description }; }
}

export class Gauge {
    constructor(name, description = '') {
        this.name = name; this.description = description; this._value = 0;
    }
    set(v) { this._value = v; return this; }
    inc(v = 1) { this._value += v; return this; }
    dec(v = 1) { this._value -= v; return this; }
    get value() { return this._value; }
    toJSON() { return { name: this.name, value: this._value, description: this.description }; }
}

export class Histogram {
    constructor(name, description = '', buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
        this.name = name; this.description = description;
        this._buckets = buckets;
        this._counts = new Array(buckets.length + 1).fill(0);
        this._sum = 0; this._total = 0;
        this._min = Infinity; this._max = -Infinity;
    }
    observe(value) {
        this._sum += value; this._total++;
        if (value < this._min) this._min = value;
        if (value > this._max) this._max = value;
        let placed = false;
        for (let i = 0; i < this._buckets.length; i++) {
            if (value <= this._buckets[i]) { this._counts[i]++; placed = true; break; }
        }
        if (!placed) this._counts[this._counts.length - 1]++;
        return this;
    }
    get avg()  { return this._total === 0 ? 0 : this._sum / this._total; }
    get p50()  { return this._percentile(50); }
    get p95()  { return this._percentile(95); }
    get p99()  { return this._percentile(99); }
    _percentile(pct) {
        if (this._total === 0) return 0;
        const target = Math.ceil(this._total * pct / 100);
        let cum = 0;
        for (let i = 0; i < this._buckets.length; i++) {
            cum += this._counts[i];
            if (cum >= target) return this._buckets[i];
        }
        return this._max;
    }
    toJSON() {
        return {
            name: this.name, description: this.description,
            count: this._total, sum: this._sum, avg: this.avg,
            min: this._min === Infinity ? 0 : this._min,
            max: this._max === -Infinity ? 0 : this._max,
            p50: this.p50, p95: this.p95, p99: this.p99,
        };
    }
}

// ─────────────────────────────────────────────
// METRICS REGISTRY
// ─────────────────────────────────────────────

export class MetricsRegistry {
    constructor() {
        this._counters   = new Map();
        this._gauges     = new Map();
        this._histograms = new Map();

        // Pre-define standard metrics
        const counters = [
            'messages.sent.total', 'messages.received.total', 'messages.failed.total',
            'messages.retry.total', 'messages.cancelled.total', 'messages.updated.total',
            'media.upload.total', 'media.upload.failed', 'media.download.total', 'media.download.failed',
            'encode.total', 'decode.total', 'hooks.fired',
            'queue.enqueued', 'queue.dequeued', 'queue.dropped',
            'errors.total', 'retries.total',
        ];
        for (const name of counters) this._counters.set(name, new Counter(name));

        const gauges = ['connections.active', 'queue.size'];
        for (const name of gauges) this._gauges.set(name, new Gauge(name));

        const histograms = [
            'send.duration_ms', 'receive.duration_ms', 'encode.duration_ms',
            'decode.duration_ms', 'upload.duration_ms', 'download.duration_ms',
            'retry.delay_ms', 'queue.wait_ms',
        ];
        for (const name of histograms) this._histograms.set(name, new Histogram(name));
    }

    // ── Counter shortcuts ─────────────────────

    /**
     * Inc a counter by name. Auto-creates if missing.
     */
    inc(name, amount = 1, labels = {}) {
        if (!this._counters.has(name)) this._counters.set(name, new Counter(name));
        this._counters.get(name).inc(amount, labels);
        return this;
    }

    counter(name) {
        if (!this._counters.has(name)) this._counters.set(name, new Counter(name));
        return this._counters.get(name);
    }

    // ── Gauge shortcuts ───────────────────────

    set(name, value) {
        if (!this._gauges.has(name)) this._gauges.set(name, new Gauge(name));
        this._gauges.get(name).set(value);
        return this;
    }

    gauge(name) {
        if (!this._gauges.has(name)) this._gauges.set(name, new Gauge(name));
        return this._gauges.get(name);
    }

    // ── Histogram shortcuts ───────────────────

    observe(name, value) {
        if (!this._histograms.has(name)) this._histograms.set(name, new Histogram(name));
        this._histograms.get(name).observe(value);
        return this;
    }

    histogram(name) {
        if (!this._histograms.has(name)) this._histograms.set(name, new Histogram(name));
        return this._histograms.get(name);
    }

    // ── Get all metrics ───────────────────────

    getAll() {
        const result = {};
        for (const [k, v] of this._counters)   result[k] = v.toJSON();
        for (const [k, v] of this._gauges)     result[k] = v.toJSON();
        for (const [k, v] of this._histograms) result[k] = v.toJSON();
        return result;
    }

    reset() {
        for (const c of this._counters.values())   c.reset();
        for (const g of this._gauges.values())     g.set(0);
        for (const h of this._histograms.values()) {
            h._sum = 0; h._total = 0;
            h._min = Infinity; h._max = -Infinity;
            h._counts = new Array(h._buckets.length + 1).fill(0);
        }
        return this;
    }
}

export const globalMetrics = new MetricsRegistry();
