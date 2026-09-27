/**
 * Upload Pipeline — Pipeline upload media dengan 8 stage yang dapat di-override.
 * Stage: validate → preprocess → compression → thumbnail → encryption → upload → verify → cache
 */

import { LifecycleEvents } from './message-pipeline.js';
import { MediaUploadError, ValidationError, TimeoutError } from './message-error.js';
import { AdaptiveRetryManager, DEFAULT_MEDIA_POLICY } from './message-retry-adaptive.js';
import { globalMetrics } from './message-metrics.js';
import { globalCache } from './message-cache.js';

export const UploadStage = Object.freeze({
    VALIDATE:    'validate',
    PREPROCESS:  'preprocess',
    COMPRESSION: 'compression',
    THUMBNAIL:   'thumbnail',
    ENCRYPTION:  'encryption',
    UPLOAD:      'upload',
    VERIFY:      'verify',
    CACHE:       'cache',
});

// ─────────────────────────────────────────────
// UPLOAD CONTEXT
// ─────────────────────────────────────────────

export function createUploadContext(overrides = {}) {
    return {
        mediaType:        null,
        mimetype:         null,
        buffer:           null,
        filePath:         null,
        stream:           null,
        fileLength:       null,
        fileSha256:       null,
        fileEncSha256:    null,
        mediaKey:         null,
        iv:               null,
        cipherKey:        null,
        macKey:           null,
        thumbnail:        null,
        thumbnailWidth:   null,
        thumbnailHeight:  null,
        uploadUrl:        null,
        directPath:       null,
        mediaKeyTimestamp:null,
        cached:           false,
        cacheKey:         null,
        uploadDurationMs: null,
        retryCount:       0,
        cancelled:        false,
        error:            null,
        metadata:         {},
        options:          {},
        timestamps: {
            start:        null,
            validated:    null,
            preprocessed: null,
            encrypted:    null,
            uploaded:     null,
            verified:     null,
            cached:       null,
        },
        ...overrides,
    };
}

// ─────────────────────────────────────────────
// UPLOAD PIPELINE
// ─────────────────────────────────────────────

export class UploadPipeline {
    constructor(opts = {}) {
        this._logger      = opts.logger      ?? console;
        this._hooks       = opts.hooks       ?? null;
        this._metrics     = opts.metrics     ?? globalMetrics;
        this._cache       = opts.cache       ?? globalCache;
        this._retryPolicy = opts.retryPolicy ?? DEFAULT_MEDIA_POLICY;
        this._timeoutMs   = opts.timeoutMs   ?? 120_000;
        this._retryMgr    = new AdaptiveRetryManager({ logger: this._logger, metrics: this._metrics });

        // Stage overrides & middlewares
        this._overrides         = new Map();
        this._stageMiddlewares  = new Map();
        for (const stage of Object.values(UploadStage)) {
            this._stageMiddlewares.set(stage, []);
        }
    }

    // ── Public API ────────────────────────────

    /** Override default handler untuk stage tertentu */
    overrideStage(stageName, fn) {
        this._overrides.set(stageName, fn);
        return this;
    }

    /** Tambah middleware ke stage tertentu */
    useStage(stageName, fn) {
        if (!this._stageMiddlewares.has(stageName))
            this._stageMiddlewares.set(stageName, []);
        this._stageMiddlewares.get(stageName).push(fn);
        return this;
    }

    /**
     * Jalankan upload pipeline.
     * @param {object} ctx  — UploadContext
     * @param {Function} uploadFn  — fungsi upload actual: async (ctx) => { url, directPath, ... }
     */
    async run(ctx, uploadFn) {
        ctx.timestamps.start = Date.now();
        await this._emitHook(LifecycleEvents.MEDIA_UPLOAD_START, ctx);

        // ── STAGE 1: Validate ──
        await this._runStage(UploadStage.VALIDATE, ctx, async (c) => {
            if (!c.buffer && !c.filePath && !c.stream) {
                throw new ValidationError('Upload membutuhkan buffer, filePath, atau stream');
            }
            if (!c.mediaType) throw new ValidationError('mediaType wajib diisi');
            c.timestamps.validated = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 2: Preprocess ──
        await this._runStage(UploadStage.PREPROCESS, ctx, async (c) => {
            // Plugin dapat inject resize, format conversion, dll.
            c.timestamps.preprocessed = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 3: Compression ──
        await this._runStage(UploadStage.COMPRESSION, ctx, async (c) => {
            // Plugin dapat inject compression
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 4: Thumbnail ──
        await this._runStage(UploadStage.THUMBNAIL, ctx, async (c) => {
            // Plugin dapat inject thumbnail generation
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 5: Encryption ──
        await this._runStage(UploadStage.ENCRYPTION, ctx, async (c) => {
            // Default encryption dilakukan oleh Baileys encryptedStream
            // Plugin dapat override jika perlu custom encryption
            c.timestamps.encrypted = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 6: Upload (dengan retry) ──
        await this._runStage(UploadStage.UPLOAD, ctx, async (c) => {
            if (!uploadFn) throw new MediaUploadError('uploadFn tidak disediakan');

            const start = Date.now();
            const result = await this._retryMgr.run(
                () => this._withTimeout(uploadFn(c), this._timeoutMs, 'Upload timeout'),
                this._retryPolicy,
                `upload_${Date.now()}`,
                { mediaType: c.mediaType }
            );

            if (result) {
                c.uploadUrl       = result.url        ?? result.uploadUrl   ?? c.uploadUrl;
                c.directPath      = result.directPath ?? c.directPath;
                c.mediaKey        = result.mediaKey   ?? c.mediaKey;
                c.fileEncSha256   = result.fileEncSha256   ?? c.fileEncSha256;
                c.fileSha256      = result.fileSha256      ?? c.fileSha256;
                c.fileLength      = result.fileLength      ?? c.fileLength;
                c.mediaKeyTimestamp = result.mediaKeyTimestamp ?? c.mediaKeyTimestamp;
            }
            c.uploadDurationMs    = Date.now() - start;
            c.timestamps.uploaded = Date.now();

            if (this._metrics) {
                this._metrics.inc('media.upload.total');
                this._metrics.observe('upload.duration_ms', c.uploadDurationMs);
            }
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 7: Verify ──
        await this._runStage(UploadStage.VERIFY, ctx, async (c) => {
            if (!c.directPath && !c.uploadUrl) {
                throw new MediaUploadError('Upload selesai tapi tidak ada directPath/url');
            }
            c.timestamps.verified = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 8: Cache ──
        await this._runStage(UploadStage.CACHE, ctx, async (c) => {
            if (c.cacheKey && this._cache) {
                await this._cache.mediaUpload.set(c.cacheKey, {
                    url: c.uploadUrl, directPath: c.directPath,
                    mediaKey: c.mediaKey, fileEncSha256: c.fileEncSha256,
                    fileSha256: c.fileSha256, fileLength: c.fileLength,
                    mediaKeyTimestamp: c.mediaKeyTimestamp,
                }, 5 * 60 * 1000);
                c.cached = true;
                c.timestamps.cached = Date.now();
            }
        });

        await this._emitHook(LifecycleEvents.MEDIA_UPLOAD_END, ctx);
        return ctx;
    }

    // ── Internal ──────────────────────────────

    async _runStage(stageName, ctx, defaultFn) {
        if (ctx.cancelled) return;
        const middlewares = this._stageMiddlewares.get(stageName) ?? [];
        const handler     = this._overrides.get(stageName) ?? defaultFn;
        if (middlewares.length > 0) {
            let idx = -1;
            const dispatch = async (i) => {
                if (i <= idx) throw new Error('next() dipanggil lebih dari sekali di stage ' + stageName);
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

export const globalUploadPipeline = new UploadPipeline();
