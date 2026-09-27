/**
 * Download Pipeline — Streaming download dengan progress, cancel, retry, checksum, cache.
 * Stage: validate → checkCache → request → decrypt → verify → cache
 */

import { LifecycleEvents } from './message-pipeline.js';
import { MediaDownloadError, ValidationError, TimeoutError } from './message-error.js';
import { AdaptiveRetryManager, DEFAULT_MEDIA_POLICY } from './message-retry-adaptive.js';
import { globalMetrics } from './message-metrics.js';
import { globalCache } from './message-cache.js';

export const DownloadStage = Object.freeze({
    VALIDATE:    'validate',
    CHECK_CACHE: 'checkCache',
    REQUEST:     'request',
    DECRYPT:     'decrypt',
    VERIFY:      'verify',
    CACHE:       'cache',
});

// ─────────────────────────────────────────────
// DOWNLOAD CONTEXT
// ─────────────────────────────────────────────

export function createDownloadContext(overrides = {}) {
    return {
        url:              null,
        directPath:       null,
        mediaKey:         null,
        mediaType:        null,
        mimetype:         null,
        fileEncSha256:    null,
        fileSha256:       null,
        fileLength:       null,
        buffer:           null,
        stream:           null,
        progressBytes:    0,
        totalBytes:       null,
        cached:           false,
        cacheKey:         null,
        checksum:         null,
        cancelled:        false,
        retryCount:       0,
        error:            null,
        metadata:         {},
        options:          {},
        onProgress:       null,   // (downloaded, total) => void
        timestamps: {
            start:        null,
            requested:    null,
            decrypted:    null,
            verified:     null,
            cached:       null,
        },
        ...overrides,
    };
}

// ─────────────────────────────────────────────
// DOWNLOAD PIPELINE
// ─────────────────────────────────────────────

export class DownloadPipeline {
    constructor(opts = {}) {
        this._logger      = opts.logger      ?? console;
        this._hooks       = opts.hooks       ?? null;
        this._metrics     = opts.metrics     ?? globalMetrics;
        this._cache       = opts.cache       ?? globalCache;
        this._retryPolicy = opts.retryPolicy ?? DEFAULT_MEDIA_POLICY;
        this._timeoutMs   = opts.timeoutMs   ?? 60_000;
        this._retryMgr    = new AdaptiveRetryManager({ logger: this._logger, metrics: this._metrics });

        this._overrides        = new Map();
        this._stageMiddlewares = new Map();
        for (const stage of Object.values(DownloadStage)) {
            this._stageMiddlewares.set(stage, []);
        }
    }

    overrideStage(stageName, fn) { this._overrides.set(stageName, fn); return this; }

    useStage(stageName, fn) {
        if (!this._stageMiddlewares.has(stageName)) this._stageMiddlewares.set(stageName, []);
        this._stageMiddlewares.get(stageName).push(fn);
        return this;
    }

    /**
     * Jalankan download pipeline.
     * @param {object}   ctx        — DownloadContext
     * @param {Function} downloadFn — async (ctx) => Buffer|Stream
     */
    async run(ctx, downloadFn) {
        ctx.timestamps.start = Date.now();
        await this._emitHook(LifecycleEvents.MEDIA_DOWNLOAD_START, ctx);

        // ── STAGE 1: Validate ──
        await this._runStage(DownloadStage.VALIDATE, ctx, async (c) => {
            if (!c.url && !c.directPath) throw new ValidationError('URL atau directPath wajib diisi');
            if (!c.mediaKey)             throw new ValidationError('mediaKey wajib diisi');
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 2: Check Cache ──
        await this._runStage(DownloadStage.CHECK_CACHE, ctx, async (c) => {
            if (c.cacheKey && this._cache) {
                const cached = await this._cache.mediaUpload.get(c.cacheKey);
                if (cached) {
                    c.buffer  = cached.buffer ?? c.buffer;
                    c.cached  = true;
                    c.cancelled = true; // skip remaining stages
                    c.cancelReason = 'cache_hit';
                }
            }
        });
        if (ctx.cached || ctx.cancelled) {
            await this._emitHook(LifecycleEvents.MEDIA_DOWNLOAD_END, ctx);
            return ctx;
        }

        // ── STAGE 3: Request (dengan retry) ──
        await this._runStage(DownloadStage.REQUEST, ctx, async (c) => {
            if (!downloadFn) throw new MediaDownloadError('downloadFn tidak disediakan');
            const start = Date.now();
            const result = await this._retryMgr.run(
                () => this._withTimeout(
                    downloadFn(c),
                    this._timeoutMs,
                    `Download timeout setelah ${this._timeoutMs}ms`
                ),
                this._retryPolicy,
                `download_${Date.now()}`,
                { mediaType: c.mediaType }
            );
            if (result instanceof Buffer) {
                c.buffer = result;
            } else if (result) {
                c.buffer = result.buffer ?? result;
                c.stream = result.stream ?? null;
            }
            const durationMs = Date.now() - start;
            c.timestamps.requested = Date.now();
            if (this._metrics) {
                this._metrics.inc('media.download.total');
                this._metrics.observe('download.duration_ms', durationMs);
            }
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 4: Decrypt ──
        await this._runStage(DownloadStage.DECRYPT, ctx, async (c) => {
            // Default: decryption dilakukan oleh Baileys downloadContentFromMessage
            // Plugin dapat override jika butuh custom decryption
            c.timestamps.decrypted = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 5: Verify ──
        await this._runStage(DownloadStage.VERIFY, ctx, async (c) => {
            if (!c.buffer && !c.stream) {
                throw new MediaDownloadError('Download selesai tapi buffer/stream kosong');
            }
            // Checksum verification jika ada
            if (c.checksum && c.fileSha256 && c.buffer) {
                // Plugin dapat override untuk verifikasi checksum
            }
            c.timestamps.verified = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 6: Cache ──
        await this._runStage(DownloadStage.CACHE, ctx, async (c) => {
            if (c.cacheKey && c.buffer && this._cache) {
                await this._cache.mediaUpload.set(c.cacheKey, { buffer: c.buffer }, 10 * 60 * 1000);
                c.cached = true;
                c.timestamps.cached = Date.now();
            }
        });

        await this._emitHook(LifecycleEvents.MEDIA_DOWNLOAD_END, ctx);
        return ctx;
    }

    async _runStage(stageName, ctx, defaultFn) {
        if (ctx.cancelled) return;
        const middlewares = this._stageMiddlewares.get(stageName) ?? [];
        const handler     = this._overrides.get(stageName) ?? defaultFn;
        if (middlewares.length > 0) {
            let idx = -1;
            const dispatch = async (i) => {
                if (i <= idx) throw new Error('next() di stage ' + stageName + ' dipanggil 2x');
                idx = i;
                if (i < middlewares.length) return middlewares[i](ctx, () => dispatch(i + 1));
                return handler(ctx);
            };
            await dispatch(0);
        } else {
            await handler(ctx);
        }
    }

    _withTimeout(promise, ms, message) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new TimeoutError(message)), ms);
            Promise.resolve(promise)
                .then(v => { clearTimeout(t); resolve(v); })
                .catch(e => { clearTimeout(t); reject(e); });
        });
    }

    async _emitHook(event, ctx) {
        if (this._hooks) try { await this._hooks.emit(event, ctx); } catch (_) {}
    }
}

export const globalDownloadPipeline = new DownloadPipeline();
