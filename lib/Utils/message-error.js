/**
 * Error System — Standarisasi semua error pada pipeline send/receive.
 * Setiap error memiliki: code, type, category, retryable, originalError, stack, metadata.
 */

export const ErrorCategory = Object.freeze({
    VALIDATION: 'validation',
    NETWORK:    'network',
    ENCRYPTION: 'encryption',
    MEDIA:      'media',
    AUTH:       'auth',
    RATE_LIMIT: 'rate_limit',
    TIMEOUT:    'timeout',
    QUEUE:      'queue',
    PIPELINE:   'pipeline',
    UNKNOWN:    'unknown',
});

export const ErrorType = Object.freeze({
    SEND_FAILED:       'SEND_FAILED',
    RECEIVE_FAILED:    'RECEIVE_FAILED',
    ENCODE_FAILED:     'ENCODE_FAILED',
    DECODE_FAILED:     'DECODE_FAILED',
    ENCRYPT_FAILED:    'ENCRYPT_FAILED',
    DECRYPT_FAILED:    'DECRYPT_FAILED',
    UPLOAD_FAILED:     'UPLOAD_FAILED',
    DOWNLOAD_FAILED:   'DOWNLOAD_FAILED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    QUEUE_OVERFLOW:    'QUEUE_OVERFLOW',
    RETRY_EXHAUSTED:   'RETRY_EXHAUSTED',
    CANCELLED:         'CANCELLED',
    TIMEOUT:           'TIMEOUT',
    UNAUTHORIZED:      'UNAUTHORIZED',
    RATE_LIMITED:      'RATE_LIMITED',
    MEDIA_INVALID:     'MEDIA_INVALID',
    MEDIA_TOO_LARGE:   'MEDIA_TOO_LARGE',
    SESSION_INVALID:   'SESSION_INVALID',
    UNKNOWN:           'UNKNOWN',
});

// ─────────────────────────────────────────────
// BASE PIPELINE ERROR CLASS
// ─────────────────────────────────────────────

export class PipelineError extends Error {
    constructor(message, opts = {}) {
        super(message);
        this.name        = 'PipelineError';
        this.code        = opts.code       || 'ERR_PIPELINE_UNKNOWN';
        this.type        = opts.type       || ErrorType.UNKNOWN;
        this.category    = opts.category   || ErrorCategory.UNKNOWN;
        this.retryable   = opts.retryable  !== undefined ? opts.retryable : false;
        this.originalError = opts.originalError || null;
        this.metadata    = opts.metadata   || {};
        this.statusCode  = opts.statusCode || 500;
        this.timestamp   = Date.now();
        if (opts.originalError?.stack) {
            this.stack = `${this.stack}\nCaused by: ${opts.originalError.stack}`;
        }
    }
    toJSON() {
        return {
            name: this.name, message: this.message, code: this.code,
            type: this.type, category: this.category, retryable: this.retryable,
            statusCode: this.statusCode, metadata: this.metadata, timestamp: this.timestamp,
            originalError: this.originalError
                ? { message: this.originalError.message, name: this.originalError.name } : null,
        };
    }
}

export class SendError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_SEND', type: ErrorType.SEND_FAILED,
            category: ErrorCategory.NETWORK, retryable: true, ...opts });
        this.name = 'SendError';
    }
}

export class ReceiveError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_RECEIVE', type: ErrorType.RECEIVE_FAILED,
            category: ErrorCategory.NETWORK, retryable: false, ...opts });
        this.name = 'ReceiveError';
    }
}

export class EncodeError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_ENCODE', type: ErrorType.ENCODE_FAILED,
            category: ErrorCategory.ENCRYPTION, retryable: false, ...opts });
        this.name = 'EncodeError';
    }
}

export class DecodeError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_DECODE', type: ErrorType.DECODE_FAILED,
            category: ErrorCategory.ENCRYPTION, retryable: true, ...opts });
        this.name = 'DecodeError';
    }
}

export class MediaUploadError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_MEDIA_UPLOAD', type: ErrorType.UPLOAD_FAILED,
            category: ErrorCategory.MEDIA, retryable: true, ...opts });
        this.name = 'MediaUploadError';
    }
}

export class MediaDownloadError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_MEDIA_DOWNLOAD', type: ErrorType.DOWNLOAD_FAILED,
            category: ErrorCategory.MEDIA, retryable: true, ...opts });
        this.name = 'MediaDownloadError';
    }
}

export class ValidationError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_VALIDATION', type: ErrorType.VALIDATION_FAILED,
            category: ErrorCategory.VALIDATION, retryable: false, statusCode: 400, ...opts });
        this.name = 'ValidationError';
    }
}

export class RetryExhaustedError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_RETRY_EXHAUSTED', type: ErrorType.RETRY_EXHAUSTED,
            category: ErrorCategory.NETWORK, retryable: false, ...opts });
        this.name = 'RetryExhaustedError';
    }
}

export class QueueOverflowError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_QUEUE_OVERFLOW', type: ErrorType.QUEUE_OVERFLOW,
            category: ErrorCategory.QUEUE, retryable: true, statusCode: 429, ...opts });
        this.name = 'QueueOverflowError';
    }
}

export class TimeoutError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_TIMEOUT', type: ErrorType.TIMEOUT,
            category: ErrorCategory.TIMEOUT, retryable: true, statusCode: 408, ...opts });
        this.name = 'TimeoutError';
    }
}

export class RateLimitError extends PipelineError {
    constructor(message, opts = {}) {
        super(message, { code: 'ERR_RATE_LIMIT', type: ErrorType.RATE_LIMITED,
            category: ErrorCategory.RATE_LIMIT, retryable: true, statusCode: 429, ...opts });
        this.name = 'RateLimitError';
    }
}

/**
 * Konversi error apapun menjadi PipelineError terstandarisasi.
 */
export function normalizeToPipelineError(err, defaultOpts = {}) {
    if (err instanceof PipelineError) return err;
    if (err?.isBoom) {
        const statusCode = err.output?.statusCode || 500;
        const retryable  = statusCode >= 500 || statusCode === 429 || statusCode === 408;
        return new PipelineError(err.message, {
            code: `ERR_BOOM_${statusCode}`,
            type: statusCode >= 500 ? ErrorType.SEND_FAILED : ErrorType.VALIDATION_FAILED,
            category: statusCode >= 500 ? ErrorCategory.NETWORK : ErrorCategory.VALIDATION,
            retryable, statusCode, originalError: err, metadata: err.data || {}, ...defaultOpts,
        });
    }
    return new PipelineError(err?.message || 'Unknown error', { originalError: err, ...defaultOpts });
}
