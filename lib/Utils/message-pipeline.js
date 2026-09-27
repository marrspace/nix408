/**
 * Message Pipeline — Middleware & Hook System
 * Menyediakan pipeline middleware yang dapat diintervensi setiap tahap
 * pengiriman dan penerimaan pesan.
 */

// ─────────────────────────────────────────────
// MESSAGE CONTEXT
// ─────────────────────────────────────────────

export function createMessageContext(overrides = {}) {
    return {
        socket: null, jid: null, sender: null, participant: null,
        message: null, payload: null, options: {}, metadata: {},
        timestamps: {
            created: Date.now(), prepared: null, encoded: null,
            sent: null, received: null, decoded: null, decrypted: null,
        },
        retry: { count: 0, maxCount: 5, history: [], lastError: null, policy: null },
        upload: {
            started: null, finished: null, url: null, directPath: null,
            mediaKey: null, fileEncSha256: null, fileSha256: null,
            fileLength: null, mediaType: null, mediaKeyTimestamp: null,
        },
        media: {
            type: null, mimetype: null, thumbnail: null,
            cached: false, compressed: false, width: null, height: null, duration: null,
        },
        cancelled: false, cancelReason: null, result: null, error: null,
        tags: new Set(),
        ...overrides,
    };
}

// ─────────────────────────────────────────────
// MIDDLEWARE PIPELINE
// ─────────────────────────────────────────────

export class MiddlewarePipeline {
    constructor(name = 'unnamed') {
        this.name = name;
        this._middlewares = [];
    }

    use(fn, priority = 0) {
        if (typeof fn !== 'function')
            throw new TypeError(`[MiddlewarePipeline:${this.name}] Middleware harus berupa function`);
        this._middlewares.push({ fn, priority });
        this._middlewares.sort((a, b) => b.priority - a.priority);
        return this;
    }

    remove(fn) {
        const idx = this._middlewares.findIndex(m => m.fn === fn);
        if (idx !== -1) this._middlewares.splice(idx, 1);
        return this;
    }

    async run(ctx, finalHandler) {
        const fns = this._middlewares.map(m => m.fn);
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index)
                throw new Error(`[MiddlewarePipeline:${this.name}] next() dipanggil lebih dari satu kali`);
            index = i;
            if (ctx.cancelled) return;
            let fn = fns[i];
            if (i === fns.length) fn = finalHandler;
            if (!fn) return;
            await fn(ctx, () => dispatch(i + 1));
        };
        return dispatch(0);
    }

    clear() { this._middlewares = []; return this; }
    get size() { return this._middlewares.length; }
}

// ─────────────────────────────────────────────
// HOOK SYSTEM
// ─────────────────────────────────────────────

export class HookSystem {
    constructor() {
        this._hooks = new Map();
        this._wildcardHooks = [];
        this._maxListeners = 100;
    }

    on(event, handler) {
        if (typeof handler !== 'function')
            throw new TypeError('[HookSystem] Handler harus berupa function');
        if (!this._hooks.has(event)) this._hooks.set(event, []);
        const list = this._hooks.get(event);
        if (list.length >= this._maxListeners)
            console.warn(`[HookSystem] Terlalu banyak handler untuk "${event}"`);
        list.push(handler);
        return this;
    }

    once(event, handler) {
        const wrapper = async (ctx, ev) => { this.off(event, wrapper); return handler(ctx, ev); };
        return this.on(event, wrapper);
    }

    onAny(handler) {
        if (typeof handler !== 'function')
            throw new TypeError('[HookSystem] Handler harus berupa function');
        this._wildcardHooks.push(handler);
        return this;
    }

    off(event, handler) {
        const handlers = this._hooks.get(event);
        if (!handlers) return this;
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
        return this;
    }

    async emit(event, ctx) {
        const handlers  = this._hooks.get(event) || [];
        const wildcards = this._wildcardHooks;
        const all = [
            ...handlers.map(h  => this._safeCall(h,  ctx, event)),
            ...wildcards.map(h => this._safeCall(h,  ctx, event)),
        ];
        if (all.length === 0) return;
        await Promise.allSettled(all);
    }

    async _safeCall(fn, ctx, event) {
        try { return await fn(ctx, event); }
        catch (err) { console.warn(`[HookSystem] Hook "${event}" error:`, err?.message); }
    }

    removeAll(event) {
        if (event) this._hooks.delete(event);
        else { this._hooks.clear(); this._wildcardHooks = []; }
        return this;
    }

    listEvents() { return [...this._hooks.keys()]; }
    getHandlerCount(event) { return this._hooks.get(event)?.length ?? 0; }
}

// ─────────────────────────────────────────────
// PIPELINE REGISTRY
// ─────────────────────────────────────────────

export class PipelineRegistry {
    constructor() {
        this.hooks = new HookSystem();

        // Send
        this.beforeSend          = new MiddlewarePipeline('before-send');
        this.afterSend           = new MiddlewarePipeline('after-send');

        // Receive
        this.beforeReceive       = new MiddlewarePipeline('before-receive');
        this.afterReceive        = new MiddlewarePipeline('after-receive');

        // Decode
        this.beforeDecode        = new MiddlewarePipeline('before-decode');
        this.afterDecode         = new MiddlewarePipeline('after-decode');

        // Upload media
        this.beforeUploadMedia   = new MiddlewarePipeline('before-upload-media');
        this.afterUploadMedia    = new MiddlewarePipeline('after-upload-media');

        // Download media
        this.beforeDownloadMedia = new MiddlewarePipeline('before-download-media');
        this.afterDownloadMedia  = new MiddlewarePipeline('after-download-media');

        // Encrypt / Decrypt
        this.beforeEncrypt       = new MiddlewarePipeline('before-encrypt');
        this.afterEncrypt        = new MiddlewarePipeline('after-encrypt');
        this.beforeDecrypt       = new MiddlewarePipeline('before-decrypt');
        this.afterDecrypt        = new MiddlewarePipeline('after-decrypt');
    }

    use(name, fn, priority = 0) {
        if (!this[name] || !(this[name] instanceof MiddlewarePipeline))
            throw new Error(`[PipelineRegistry] Pipeline "${name}" tidak dikenal`);
        this[name].use(fn, priority);
        return this;
    }

    hook(event, handler) { this.hooks.on(event, handler); return this; }

    clearAll() {
        for (const key of Object.keys(this))
            if (this[key] instanceof MiddlewarePipeline) this[key].clear();
        this.hooks.removeAll();
        return this;
    }
}

export const globalPipeline = new PipelineRegistry();

// ─────────────────────────────────────────────
// LIFECYCLE EVENTS
// ─────────────────────────────────────────────

export const LifecycleEvents = Object.freeze({
    MESSAGE_CREATE:        'message:create',
    MESSAGE_PREPARE:       'message:prepare',
    MESSAGE_ENCODE:        'message:encode',
    MESSAGE_SEND:          'message:send',
    MESSAGE_SUCCESS:       'message:success',
    MESSAGE_ERROR:         'message:error',
    MESSAGE_RETRY:         'message:retry',

    MESSAGE_RECEIVE:       'message:receive',
    MESSAGE_DECODE:        'message:decode',
    MESSAGE_DECRYPT:       'message:decrypt',
    MESSAGE_UPDATE:        'message:update',
    MESSAGE_DELETE:        'message:delete',

    SEND_START:            'send:start',
    SEND_FINISH:           'send:finish',
    SEND_RETRY:            'send:retry',
    SEND_FAILED:           'send:failed',

    MEDIA_UPLOAD_START:    'media:upload:start',
    MEDIA_UPLOAD_END:      'media:upload:end',
    MEDIA_DOWNLOAD_START:  'media:download:start',
    MEDIA_DOWNLOAD_END:    'media:download:end',

    MESSAGE_PREPARED:      'message:prepared',
    MESSAGE_VALIDATED:     'message:validated',
    MESSAGE_QUEUED:        'message:queued',
    MESSAGE_DEQUEUED:      'message:dequeued',
    MESSAGE_ENCRYPTED:     'message:encrypted',
    MESSAGE_DECRYPTED:     'message:decrypted',
});
