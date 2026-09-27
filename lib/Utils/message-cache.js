/**
 * Cache Layer — LRU Memory Cache + NamespacedCache + CacheRegistry.
 * Support adapter: Memory (default), Redis, SQLite, MongoDB, custom.
 */

export class MemoryCacheAdapter {
    constructor(opts = {}) {
        this._store      = new Map();
        this._defaultTTL = opts.ttl     ?? 5 * 60 * 1000;
        this._maxSize    = opts.maxSize ?? 5000;
        this._hits = 0; this._misses = 0;
        this._order = [];
    }

    async get(key) {
        const entry = this._store.get(key);
        if (!entry) { this._misses++; return undefined; }
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this._store.delete(key); this._removeFromOrder(key);
            this._misses++; return undefined;
        }
        this._touchKey(key); this._hits++;
        return entry.value;
    }

    async set(key, value, ttlMs) {
        if (!this._store.has(key) && this._store.size >= this._maxSize) {
            const oldest = this._order.shift();
            if (oldest) this._store.delete(oldest);
        }
        const expiresAt = Date.now() + (ttlMs ?? this._defaultTTL);
        this._store.set(key, { value, expiresAt });
        this._touchKey(key);
        return true;
    }

    async delete(key) { this._removeFromOrder(key); return this._store.delete(key); }
    async has(key)    { return (await this.get(key)) !== undefined; }
    async clear()     { this._store.clear(); this._order = []; return true; }

    async mget(keys) {
        const result = {};
        for (const k of keys) { const v = await this.get(k); if (v !== undefined) result[k] = v; }
        return result;
    }
    async mset(entries) {
        for (const { key, value, ttlMs } of entries) await this.set(key, value, ttlMs);
        return true;
    }

    _touchKey(key) { this._removeFromOrder(key); this._order.push(key); }
    _removeFromOrder(key) {
        const idx = this._order.indexOf(key);
        if (idx !== -1) this._order.splice(idx, 1);
    }

    get size()    { return this._store.size; }
    get hitRate() { const t = this._hits + this._misses; return t === 0 ? 0 : this._hits / t; }
    get stats()   { return { size: this._store.size, hits: this._hits, misses: this._misses, hitRate: this.hitRate }; }
}

// ─────────────────────────────────────────────
// NAMESPACED CACHE
// ─────────────────────────────────────────────

export class NamespacedCache {
    constructor(namespace, adapter) {
        this._ns = namespace;
        this._adapter = adapter;
    }
    _key(k) { return `${this._ns}:${k}`; }

    async get(key)              { return this._adapter.get(this._key(key)); }
    async set(key, value, ttlMs){ return this._adapter.set(this._key(key), value, ttlMs); }
    async delete(key)           { return this._adapter.delete(this._key(key)); }
    async has(key)              { return this._adapter.has(this._key(key)); }
    async clear()               { return this._adapter.clear(); }
    async mget(keys) {
        const raw = await this._adapter.mget(keys.map(k => this._key(k)));
        const result = {};
        for (const [k, v] of Object.entries(raw))
            result[k.replace(`${this._ns}:`, '')] = v;
        return result;
    }
    async mset(entries) {
        return this._adapter.mset(entries.map(e => ({ ...e, key: this._key(e.key) })));
    }
}

// ─────────────────────────────────────────────
// CACHE REGISTRY
// ─────────────────────────────────────────────

export class CacheRegistry {
    constructor(opts = {}) {
        this._adapter    = opts.adapter ?? new MemoryCacheAdapter(opts);
        this._namespaces = new Map();
        this._ttls = {
            jid:             opts.jidTTL             ?? 30 * 60 * 1000,
            groupMetadata:   opts.groupMetadataTTL   ?? 10 * 60 * 1000,
            businessProfile: opts.businessProfileTTL ?? 15 * 60 * 1000,
            newsletter:      opts.newsletterTTL      ?? 10 * 60 * 1000,
            mediaUpload:     opts.mediaUploadTTL     ??  5 * 60 * 1000,
            thumbnail:       opts.thumbnailTTL       ?? 60 * 60 * 1000,
            quotedMessage:   opts.quotedMsgTTL       ?? 30 * 60 * 1000,
            participantInfo: opts.participantTTL     ??  5 * 60 * 1000,
            deviceList:      opts.deviceListTTL      ??  5 * 60 * 1000,
        };
        for (const ns of Object.keys(this._ttls)) this._namespace(ns);
    }

    _namespace(name) {
        if (!this._namespaces.has(name))
            this._namespaces.set(name, new NamespacedCache(name, this._adapter));
        return this._namespaces.get(name);
    }

    get jid()             { return this._namespace('jid'); }
    get groupMetadata()   { return this._namespace('groupMetadata'); }
    get businessProfile() { return this._namespace('businessProfile'); }
    get newsletter()      { return this._namespace('newsletter'); }
    get mediaUpload()     { return this._namespace('mediaUpload'); }
    get thumbnail()       { return this._namespace('thumbnail'); }
    get quotedMessage()   { return this._namespace('quotedMessage'); }
    get participantInfo() { return this._namespace('participantInfo'); }
    get deviceList()      { return this._namespace('deviceList'); }

    ns(name) { return this._namespace(name); }

    setAdapter(adapter) {
        this._adapter = adapter;
        for (const [name] of this._namespaces)
            this._namespaces.set(name, new NamespacedCache(name, adapter));
        return this;
    }

    async clearAll() { await this._adapter.clear(); return this; }

    get stats() {
        return typeof this._adapter.stats === 'object' ? this._adapter.stats : {};
    }
}

export const globalCache = new CacheRegistry();
