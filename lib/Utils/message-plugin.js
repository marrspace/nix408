/**
 * Plugin System — Plugin dapat memodifikasi payload/metadata, replace media/caption,
 * tambah button, block message, audit — tanpa menyentuh kode inti.
 */

// ─────────────────────────────────────────────
// PLUGIN BASE CLASS
// ─────────────────────────────────────────────

export class BasePlugin {
    /** @param {string} name — nama unik plugin */
    constructor(name) {
        if (!name) throw new Error('Plugin harus memiliki nama');
        this.name    = name;
        this.version = '1.0.0';
        this.enabled = true;
    }

    /** Dipanggil saat plugin di-install. Override untuk inisialisasi. */
    async install(context) {}

    /** Dipanggil saat plugin di-uninstall. Override untuk cleanup. */
    async uninstall() {}

    /** Middleware send: (ctx, next) => {} */
    async onSend(ctx, next) { return next(); }

    /** Middleware receive: (ctx, next) => {} */
    async onReceive(ctx, next) { return next(); }

    /** Hook lifecycle: (ctx, event) => {} */
    async onHook(ctx, event) {}

    enable()  { this.enabled = true;  return this; }
    disable() { this.enabled = false; return this; }
}

// ─────────────────────────────────────────────
// PLUGIN MANAGER
// ─────────────────────────────────────────────

export class PluginManager {
    /**
     * @param {object} opts
     * @param {object} opts.logger
     * @param {object} opts.hooks    — HookSystem
     * @param {object} opts.metrics  — MetricsRegistry
     */
    constructor(opts = {}) {
        this._logger  = opts.logger  ?? console;
        this._hooks   = opts.hooks   ?? null;
        this._metrics = opts.metrics ?? null;
        this._plugins = new Map();  // name → plugin instance
        this._socket  = null;
        this._pipeline = null;
    }

    /**
     * Attach ke socket & pipeline — dipanggil dari framework.attach()
     */
    attach(socket, pipeline) {
        this._socket   = socket;
        this._pipeline = pipeline;

        // Wire semua plugin yang sudah di-install ke pipeline
        for (const plugin of this._plugins.values()) {
            if (plugin.enabled) this._wireToPipeline(plugin);
        }
    }

    /**
     * Install plugin.
     * @param {BasePlugin|object} plugin
     */
    async install(plugin) {
        if (!plugin?.name) throw new Error('[PluginManager] Plugin harus memiliki properti "name"');
        if (this._plugins.has(plugin.name)) {
            this._log('warn', `Plugin "${plugin.name}" sudah di-install, skip`);
            return this;
        }

        try {
            if (typeof plugin.install === 'function') {
                await plugin.install({
                    socket: this._socket,
                    pipeline: this._pipeline,
                    hooks: this._hooks,
                    metrics: this._metrics,
                    logger: this._logger,
                });
            }
            this._plugins.set(plugin.name, plugin);

            // Wire ke pipeline jika sudah ada
            if (this._pipeline && plugin.enabled) {
                this._wireToPipeline(plugin);
            }

            // Wire ke hook system
            if (this._hooks && typeof plugin.onHook === 'function') {
                this._hooks.onAny(async (ctx, event) => {
                    if (plugin.enabled) {
                        await plugin.onHook(ctx, event);
                    }
                });
            }

            this._log('info', `Plugin "${plugin.name}" v${plugin.version ?? '?'} berhasil di-install`);
            if (this._metrics) this._metrics.inc('plugins.installed');
        } catch (err) {
            this._log('error', `Gagal install plugin "${plugin.name}": ${err?.message}`, { err });
            throw err;
        }
        return this;
    }

    /**
     * Uninstall plugin.
     */
    async uninstall(nameOrPlugin) {
        const name   = typeof nameOrPlugin === 'string' ? nameOrPlugin : nameOrPlugin?.name;
        const plugin = this._plugins.get(name);
        if (!plugin) return this;

        try {
            if (typeof plugin.uninstall === 'function') await plugin.uninstall();
            this._plugins.delete(name);
            this._log('info', `Plugin "${name}" di-uninstall`);
        } catch (err) {
            this._log('warn', `Error saat uninstall plugin "${name}": ${err?.message}`);
        }
        return this;
    }

    /** Uninstall semua plugin */
    async uninstallAll() {
        for (const name of [...this._plugins.keys()]) await this.uninstall(name);
    }

    /** Ambil plugin berdasarkan nama */
    get(name) { return this._plugins.get(name); }

    /** List semua plugin yang ter-install */
    list() {
        return [...this._plugins.values()].map(p => ({
            name: p.name, version: p.version, enabled: p.enabled,
        }));
    }

    /** Enable plugin */
    enablePlugin(name)  { const p = this._plugins.get(name); if (p) p.enable();  return this; }

    /** Disable plugin */
    disablePlugin(name) { const p = this._plugins.get(name); if (p) p.disable(); return this; }

    /**
     * Jalankan semua plugin onSend terhadap context.
     * Dipanggil dari relayMessageWithPipeline sebelum send.
     */
    async applyToSend(ctx) {
        for (const plugin of this._plugins.values()) {
            if (!plugin.enabled) continue;
            if (typeof plugin.onSend !== 'function') continue;
            if (ctx.cancelled) break;
            try {
                await new Promise(async (resolve, reject) => {
                    try {
                        await plugin.onSend(ctx, resolve);
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                this._log('warn', `Plugin "${plugin.name}" onSend error: ${err?.message}`);
            }
        }
    }

    /**
     * Jalankan semua plugin onReceive terhadap context.
     */
    async applyToReceive(ctx) {
        for (const plugin of this._plugins.values()) {
            if (!plugin.enabled) continue;
            if (typeof plugin.onReceive !== 'function') continue;
            if (ctx.cancelled) break;
            try {
                await new Promise(async (resolve, reject) => {
                    try {
                        await plugin.onReceive(ctx, resolve);
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                this._log('warn', `Plugin "${plugin.name}" onReceive error: ${err?.message}`);
            }
        }
    }

    // ── Internal ──────────────────────────────

    _wireToPipeline(plugin) {
        if (!this._pipeline) return;
        // Wire onSend sebagai middleware before-send
        if (typeof plugin.onSend === 'function') {
            this._pipeline.beforeSend.use(
                (ctx, next) => plugin.enabled ? plugin.onSend(ctx, next) : next(),
                plugin.priority ?? 0
            );
        }
        // Wire onReceive sebagai middleware before-receive
        if (typeof plugin.onReceive === 'function') {
            this._pipeline.beforeReceive.use(
                (ctx, next) => plugin.enabled ? plugin.onReceive(ctx, next) : next(),
                plugin.priority ?? 0
            );
        }
    }

    _log(level, msg, data) {
        const prefix = '[PluginManager]';
        if (this._logger?.[level]) this._logger[level](data ?? {}, `${prefix} ${msg}`);
        else if (level === 'error') console.error(`${prefix} ${msg}`, data);
        else console.log(`${prefix} ${msg}`, data);
    }
}

export const globalPluginManager = new PluginManager();
