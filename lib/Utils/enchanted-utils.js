
import { EventEmitter } from 'events';
import { CommandRouter, createMessageCollector } from './advanced.js';

/**
 * Plugin System
 */
export class PluginManager {
    constructor(socket) {
        this.socket = socket;
        this.plugins = new Map();
    }

    async load(pluginName, pluginInstance) {
        if (this.plugins.has(pluginName)) {
            console.warn(`Plugin ${pluginName} is already loaded.`);
            return;
        }
        if (typeof pluginInstance.install === 'function') {
            await pluginInstance.install(this.socket);
        }
        this.plugins.set(pluginName, pluginInstance);
    }

    get(pluginName) {
        return this.plugins.get(pluginName);
    }
}

/**
 * Middleware System
 */
export class MiddlewareManager {
    constructor() {
        this.middlewares = [];
    }

    use(fn) {
        if (typeof fn !== 'function') throw new Error('Middleware must be a function');
        this.middlewares.push(fn);
    }

    async run(context, next) {
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index) return Promise.reject(new Error('next() called multiple times'));
            index = i;
            let fn = this.middlewares[i];
            if (i === this.middlewares.length) fn = next;
            if (!fn) return Promise.resolve();
            try {
                return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
            } catch (err) {
                return Promise.reject(err);
            }
        };
        return dispatch(0);
    }
}

/**
 * Utility API Enhancements
 */
export const enhanceSocket = (socket) => {
    socket.enchanted = {
        plugins: new PluginManager(socket),
        middleware: new MiddlewareManager(),
        hooks: new EventEmitter(),
        router: new CommandRouter(),
        collectors: new Map(),
        scheduler: new Map()
    };

    socket.waitForMessage = async (jid, options) => {
        return createMessageCollector(socket, jid, options);
    };

    // Easy reply
    socket.reply = async (jid, text, quoted, options) => {
        return socket.sendMessage(jid, { text }, { quoted, ...options });
    };

    // Simplified media sending
    socket.sendImage = async (jid, url, caption, quoted, options) => {
        return socket.sendMessage(jid, { image: { url }, caption }, { quoted, ...options });
    };

    socket.sendVideo = async (jid, url, caption, quoted, options) => {
        return socket.sendMessage(jid, { video: { url }, caption }, { quoted, ...options });
    };

    return socket;
};
