/**
 * Adaptive Retry Manager — Exponential backoff + jitter + custom policies.
 * Berlaku untuk sendMessage, media upload, media download.
 */

import { normalizeToPipelineError, RetryExhaustedError } from './message-error.js';

export const RetryStrategy = Object.freeze({
    IMMEDIATE:    'immediate',
    LINEAR:       'linear',
    EXPONENTIAL:  'exponential',
    FIBONACCI:    'fibonacci',
});

export function calcRetryDelay(attempt, strategy, baseMs, maxMs, jitterMs) {
    let delay = 0;
    switch (strategy) {
        case RetryStrategy.IMMEDIATE:   delay = 0; break;
        case RetryStrategy.LINEAR:      delay = baseMs * attempt; break;
        case RetryStrategy.FIBONACCI: {
            let a = 0, b = 1;
            for (let i = 0; i < attempt; i++) { [a, b] = [b, a + b]; }
            delay = baseMs * a;
            break;
        }
        case RetryStrategy.EXPONENTIAL:
        default:
            delay = baseMs * Math.pow(2, attempt - 1);
            break;
    }
    if (jitterMs > 0) delay += Math.random() * jitterMs;
    return Math.min(delay, maxMs);
}

// ─────────────────────────────────────────────
// RETRY POLICY
// ─────────────────────────────────────────────

export const DEFAULT_SEND_POLICY = {
    maxAttempts:     5,
    strategy:        RetryStrategy.EXPONENTIAL,
    baseMs:          250,
    maxMs:           30_000,
    jitterMs:        100,
    retryCondition:  (err) => {
        if (err?.retryable === false) return false;
        if (err?.isBoom) {
            const code = err.output?.statusCode;
            return code >= 500 || code === 429 || code === 408;
        }
        return true;
    },
    onRetry:   null,
    onSuccess: null,
    onFailed:  null,
};

export const DEFAULT_MEDIA_POLICY = {
    maxAttempts:    4,
    strategy:       RetryStrategy.EXPONENTIAL,
    baseMs:         500,
    maxMs:          60_000,
    jitterMs:       200,
    retryCondition: (err) => {
        if (err?.retryable === false) return false;
        if (err?.isBoom) {
            const code = err.output?.statusCode;
            return code >= 500 || code === 429 || code === 408;
        }
        return true;
    },
    onRetry:   null,
    onSuccess: null,
    onFailed:  null,
};

// ─────────────────────────────────────────────
// ADAPTIVE RETRY MANAGER
// ─────────────────────────────────────────────

export class AdaptiveRetryManager {
    constructor(opts = {}) {
        this._logger  = opts.logger  ?? console;
        this._metrics = opts.metrics ?? null;
        this._hooks   = opts.hooks   ?? null;
        this._history = new Map();   // operationId → RetryHistory
        this._totalRetries  = 0;
        this._totalSuccess  = 0;
        this._totalFailed   = 0;
    }

    /**
     * Run operation with retry policy.
     * @param {Function} operation  async () => result
     * @param {object}   policy
     * @param {string}   operationId
     * @param {object}   context
     */
    async run(operation, policy = DEFAULT_SEND_POLICY, operationId = null, context = {}) {
        const id = operationId ?? `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const {
            maxAttempts    = 5,
            strategy       = RetryStrategy.EXPONENTIAL,
            baseMs         = 250,
            maxMs          = 30_000,
            jitterMs       = 100,
            retryCondition = () => true,
            onRetry        = null,
            onSuccess      = null,
            onFailed       = null,
        } = policy;

        const history = {
            id, operationId: id, attempts: [], startTime: Date.now(),
            endTime: null, succeeded: false, failed: false,
            totalRetries: 0, finalError: null,
        };
        this._history.set(id, history);
        if (this._history.size > 500) {
            // Keep history bounded
            const firstKey = this._history.keys().next().value;
            this._history.delete(firstKey);
        }

        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const attemptStart = Date.now();
            try {
                const result = await operation();

                history.attempts.push({ attempt, success: true, durationMs: Date.now() - attemptStart, error: null });
                history.succeeded = true;
                history.endTime   = Date.now();
                this._totalSuccess++;

                if (this._metrics) {
                    this._metrics.inc('messages.sent.total');
                    if (attempt > 1) this._metrics.inc('messages.retry.total', attempt - 1);
                }
                if (onSuccess) try { await onSuccess(result, { attempt, history, context }); } catch (_) {}
                await this._emitHook('message:success', { id, attempt, result, context });
                return result;

            } catch (err) {
                lastError = normalizeToPipelineError(err);
                history.attempts.push({
                    attempt, success: false, durationMs: Date.now() - attemptStart,
                    error: { message: err?.message, code: lastError.code, type: lastError.type },
                });
                history.totalRetries++;
                this._totalRetries++;

                const shouldRetry = attempt < maxAttempts && retryCondition(err);

                if (!shouldRetry) {
                    history.failed     = true;
                    history.finalError = lastError;
                    history.endTime    = Date.now();
                    this._totalFailed++;

                    if (this._metrics) {
                        this._metrics.inc('messages.failed.total');
                        this._metrics.inc('errors.total');
                    }
                    if (onFailed) try { await onFailed(lastError, { attempt, history, context }); } catch (_) {}
                    await this._emitHook('message:error', { id, attempt, error: lastError, context });

                    throw new RetryExhaustedError(
                        `Operasi gagal setelah ${attempt} percobaan: ${err?.message}`,
                        { originalError: err, metadata: { attempts: attempt, history: history.attempts, context } }
                    );
                }

                const delayMs = calcRetryDelay(attempt, strategy, baseMs, maxMs, jitterMs);

                this._log('debug', `[Retry] Attempt ${attempt}/${maxAttempts} gagal, retry dalam ${delayMs}ms`,
                    { id, error: err?.message, attempt, delayMs });

                if (this._metrics) {
                    this._metrics.inc('messages.retry.total');
                    this._metrics.observe('retry.delay_ms', delayMs);
                }
                if (onRetry) try { await onRetry(lastError, { attempt, delayMs, history, context }); } catch (_) {}
                await this._emitHook('message:retry', { id, attempt, error: lastError, delayMs, context });

                if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
            }
        }
        throw lastError ?? new RetryExhaustedError('Operasi gagal setelah semua percobaan');
    }

    getHistory(operationId) { return this._history.get(operationId); }

    getStats() {
        return {
            totalRetries: this._totalRetries,
            totalSuccess: this._totalSuccess,
            totalFailed:  this._totalFailed,
            historySize:  this._history.size,
        };
    }

    clear() { this._history.clear(); return this; }

    async _emitHook(event, data) {
        if (this._hooks) try { await this._hooks.emit(event, data); } catch (_) {}
    }

    _log(level, msg, data) {
        if (this._logger?.[level]) this._logger[level](data ?? {}, msg);
        else if (level === 'error') console.error(msg, data);
        else console.log(msg, data);
    }
}

export const globalRetryManager = new AdaptiveRetryManager();
