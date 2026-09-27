/**
 * Logger Integration — Internal logger dengan level lengkap dan custom logger support.
 * Level: trace(0) debug(1) info(2) warn(3) error(4) fatal(5)
 */

export const LogLevel = Object.freeze({
    TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, FATAL: 5, SILENT: 99,
});

const LEVEL_NAMES = { 0:'trace', 1:'debug', 2:'info', 3:'warn', 4:'error', 5:'fatal' };

export class PipelineLogger {
    constructor(opts = {}) {
        this._logger    = opts.logger    || null;
        this._prefix    = opts.prefix    || '[Pipeline]';
        this._minLevel  = opts.minLevel  !== undefined ? opts.minLevel : LogLevel.DEBUG;
        this._customFn  = null;
    }

    setCustomLogger(fn) {
        if (typeof fn !== 'function') throw new TypeError('Custom logger harus berupa function');
        this._customFn = fn;
        return this;
    }

    setLevel(level) { this._minLevel = level; return this; }

    _log(level, msg, data) {
        if (level < this._minLevel) return;
        const lvName = LEVEL_NAMES[level] || 'debug';
        const full   = `${this._prefix} ${msg}`;

        if (this._customFn) {
            try { this._customFn(lvName, full, data); } catch (_) {}
            return;
        }
        if (this._logger && typeof this._logger[lvName] === 'function') {
            data !== undefined ? this._logger[lvName](data, full) : this._logger[lvName](full);
            return;
        }
        const out = data !== undefined ? [full, data] : [full];
        level >= LogLevel.ERROR ? console.error(...out)
            : level >= LogLevel.WARN  ? console.warn(...out)
            : console.log(...out);
    }

    trace(msg, data) { this._log(LogLevel.TRACE, msg, data); }
    debug(msg, data) { this._log(LogLevel.DEBUG, msg, data); }
    info (msg, data) { this._log(LogLevel.INFO,  msg, data); }
    warn (msg, data) { this._log(LogLevel.WARN,  msg, data); }
    error(msg, data) { this._log(LogLevel.ERROR, msg, data); }
    fatal(msg, data) { this._log(LogLevel.FATAL, msg, data); }

    child(prefix) {
        return new PipelineLogger({
            logger: this._logger,
            prefix: `${this._prefix}:${prefix}`,
            minLevel: this._minLevel,
        });
    }
}

export const pipelineLogger = new PipelineLogger({ prefix: '[MarrBaileys]' });
