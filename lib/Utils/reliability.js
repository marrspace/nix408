
import { delay } from './generics.js';

/**
 * Cache System
 */
export class Cache {
    constructor(ttl = 60000) {
        this.store = new Map();
        this.ttl = ttl;
    }

    set(key, value, ttl = this.ttl) {
        const expires = Date.now() + ttl;
        this.store.set(key, { value, expires });
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    delete(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

/**
 * Retry Logic
 */
export const withRetry = async (fn, maxRetries = 3, backoff = 1000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            await delay(backoff * (i + 1));
        }
    }
    throw lastError;
};

/**
 * Hook System Integration
 */
export const setupHooks = (socket) => {
    const originalEvOn = socket.ev.on;
    socket.ev.on = (event, handler) => {
        const wrappedHandler = async (arg) => {
            // Pre-hook
            socket.enchanted.hooks.emit(`pre:${event}`, arg);
            
            await handler(arg);
            
            // Post-hook
            socket.enchanted.hooks.emit(`post:${event}`, arg);
        };
        return originalEvOn.call(socket.ev, event, wrappedHandler);
    };
};
