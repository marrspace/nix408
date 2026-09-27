/**
 * Message Builder — Pipeline berbasis stage untuk membangun pesan.
 * Stage: validate → normalize → prepareMedia → interactive → mentions → quoted → encode → send
 * Setiap stage dapat di-override oleh plugin.
 */

import { LifecycleEvents } from './message-pipeline.js';
import { ValidationError } from './message-error.js';

export const BuildStage = Object.freeze({
    VALIDATE:       'validate',
    NORMALIZE:      'normalize',
    PREPARE_MEDIA:  'prepareMedia',
    INTERACTIVE:    'interactive',
    MENTIONS:       'mentions',
    QUOTED:         'quoted',
    ENCODE:         'encode',
    PRE_SEND:       'preSend',
});

// ─────────────────────────────────────────────
// BUILD CONTEXT
// ─────────────────────────────────────────────

export function createBuildContext(overrides = {}) {
    return {
        jid:         null,
        content:     null,
        options:     {},
        message:     null,
        media:       null,
        mentions:    [],
        quoted:      null,
        interactive: null,
        metadata:    {},
        cancelled:   false,
        cancelReason: null,
        error:       null,
        timestamps: {
            created:   Date.now(),
            validated: null,
            prepared:  null,
            encoded:   null,
        },
        ...overrides,
    };
}

// ─────────────────────────────────────────────
// MESSAGE BUILDER
// ─────────────────────────────────────────────

export class MessageBuilder {
    constructor(opts = {}) {
        this._logger  = opts.logger  ?? console;
        this._hooks   = opts.hooks   ?? null;
        this._metrics = opts.metrics ?? null;
        this._plugins = opts.plugins ?? null;

        // Stage overrides: stageName → async (ctx) => {}
        this._overrides = new Map();
        // Stage middlewares: stageName → [(ctx, next) => {}]
        this._stageMiddlewares = new Map();

        for (const stage of Object.values(BuildStage)) {
            this._stageMiddlewares.set(stage, []);
        }
    }

    // ── Stage Override API ────────────────────

    /** Override stage default handler */
    overrideStage(stageName, fn) {
        if (!BuildStage[stageName.toUpperCase().replace('-', '_')] &&
            !Object.values(BuildStage).includes(stageName)) {
            throw new Error(`[MessageBuilder] Stage "${stageName}" tidak dikenal`);
        }
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

    // ── Build Pipeline ────────────────────────

    /**
     * Jalankan semua stage build pipeline.
     * @param {string} jid
     * @param {object} content  — isi pesan (format Baileys WAMessageContent)
     * @param {object} options  — generateWAMessage options
     * @returns {Promise<BuildContext>}
     */
    async build(jid, content, options = {}) {
        const ctx = createBuildContext({ jid, content, options });

        // ── STAGE 1: Validate ──
        await this._runStage(BuildStage.VALIDATE, ctx, async (c) => {
            if (!c.jid) throw new ValidationError('JID tidak boleh kosong');
            if (!c.content) throw new ValidationError('Konten pesan tidak boleh kosong');
            c.timestamps.validated = Date.now();
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 2: Normalize ──
        await this._runStage(BuildStage.NORMALIZE, ctx, async (c) => {
            // Normalisasi format konten — bisa di-override plugin
            if (typeof c.content === 'string') {
                c.content = { text: c.content };
            }
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 3: PrepareMedia ──
        await this._runStage(BuildStage.PREPARE_MEDIA, ctx, async (c) => {
            // Default: tidak ada transformasi, diserahkan ke generateWAMessage
            // Plugin dapat inject media preprocessing di sini
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 4: Interactive ──
        await this._runStage(BuildStage.INTERACTIVE, ctx, async (c) => {
            // Plugin dapat inject button, list, flow, dll.
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 5: Mentions ──
        await this._runStage(BuildStage.MENTIONS, ctx, async (c) => {
            if (c.options?.mentions && Array.isArray(c.options.mentions)) {
                c.mentions = c.options.mentions;
            }
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 6: Quoted ──
        await this._runStage(BuildStage.QUOTED, ctx, async (c) => {
            if (c.options?.quoted) {
                c.quoted = c.options.quoted;
            }
        });
        if (ctx.cancelled) return ctx;

        // ── STAGE 7: Encode ──
        await this._runStage(BuildStage.ENCODE, ctx, async (c) => {
            c.timestamps.encoded = Date.now();
            if (this._metrics) this._metrics.inc('encode.total');
        });
        if (ctx.cancelled) return ctx;

        // ── Hooks ──
        await this._emitHook(LifecycleEvents.MESSAGE_PREPARED,  ctx);
        await this._emitHook(LifecycleEvents.MESSAGE_VALIDATED, ctx);

        // ── STAGE 8: Pre-Send ──
        await this._runStage(BuildStage.PRE_SEND, ctx, async (c) => {
            c.timestamps.prepared = Date.now();
        });

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

    async _emitHook(event, ctx) {
        if (this._hooks) try { await this._hooks.emit(event, ctx); } catch (_) {}
    }

    _log(level, msg, data) {
        if (this._logger?.[level]) this._logger[level](data ?? {}, msg);
        else console.log(msg, data);
    }
}

export const globalMessageBuilder = new MessageBuilder();
