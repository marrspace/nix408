/**
 * nix408: fixed AI bot identity and verification scaffolding for AI Rich replies.
 *
 * These values are stable in production. Import them instead of hardcoding the strings and
 * byte arrays into your own code.
 */

/** The bot identity WhatsApp expects in `forwardedAiBotMessageInfo.botJid`. */
export const AI_BOT_JID: string;

/** Fixed 64-byte signature used in `verificationMetadata.proofs[0].signature`. */
export const AI_BOT_SIGNATURE: Uint8Array;

/** Base64 source of {@link AI_BOT_SIGNATURE}. */
export const AI_BOT_SIGNATURE_B64: string;

/** Fixed certificate chain used in `verificationMetadata.proofs[0].certificateChain`. */
export const AI_BOT_CERTIFICATE_CHAIN: Uint8Array[];

/** Base64 sources of {@link AI_BOT_CERTIFICATE_CHAIN}. */
export const AI_BOT_CERTIFICATE_CHAIN_B64: string[];

/** Ready-made `messageContextInfo.botMetadata` block. */
export const AI_BOT_METADATA: {
    verificationMetadata: {
        proofs: Array<{
            version: number;
            useCase: number;
            signature: Uint8Array;
            certificateChain: Uint8Array[];
        }>;
    };
};

/** Ready-made `richResponseMessage.contextInfo`. */
export const AI_BOT_FORWARDED_CONTEXT_INFO: {
    isForwarded: boolean;
    forwardingScore: number;
    forwardedAiBotMessageInfo: { botJid: string };
    forwardOrigin: number;
};

/** Ready-made top-level `messageContextInfo` for a bot-forwarded message. */
export const AI_BOT_MESSAGE_CONTEXT_INFO: {
    botMetadata: typeof AI_BOT_METADATA;
};
