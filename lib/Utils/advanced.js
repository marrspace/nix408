
/**
 * Message Collector
 */
export const createMessageCollector = (socket, jid, options = {}) => {
    const { timeout = 60000, filter = () => true } = options;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.ev.off('messages.upsert', handler);
            reject(new Error('Timeout'));
        }, timeout);

        const handler = async ({ messages, type }) => {
            if (type !== 'notify') return;
            for (const msg of messages) {
                if (msg.key.remoteJid === jid && filter(msg)) {
                    clearTimeout(timer);
                    socket.ev.off('messages.upsert', handler);
                    resolve(msg);
                }
            }
        };

        socket.ev.on('messages.upsert', handler);
    });
};

/**
 * Command Router
 */
export class CommandRouter {
    constructor(prefix = '/') {
        this.prefix = prefix;
        this.commands = new Map();
    }

    register(name, handler, options = {}) {
        this.commands.set(name, { handler, ...options });
    }

    async handle(socket, msg) {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        if (!text || !text.startsWith(this.prefix)) return;

        const args = text.slice(this.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const cmd = this.commands.get(commandName);
        if (cmd) {
            await cmd.handler(socket, msg, args);
        }
    }
}

/**
 * Scheduler / Task Manager
 */
export class Scheduler {
    constructor() {
        this.tasks = new Map();
    }

    schedule(id, cronTime, taskFn) {
        // Basic implementation using setTimeout for specific delay or interval
        // In a real scenario, use node-cron
        this.tasks.set(id, { cronTime, taskFn });
    }

    cancel(id) {
        this.tasks.delete(id);
    }
}

/**
 * Storage Adapter
 */
export class StorageAdapter {
    constructor(adapter) {
        this.adapter = adapter; // e.g., JSON file, Database
    }

    async save(key, data) {
        return this.adapter.save(key, data);
    }

    async load(key) {
        return this.adapter.load(key);
    }
}
