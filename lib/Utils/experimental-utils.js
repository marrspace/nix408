/**
 * nix408: experimental message builders.
 *
 * These message types are reverse-engineered and undocumented. WhatsApp can change or drop them
 * at any time, so treat everything here as unstable. Each helper returns a message object you can
 * hand to `sendMessage` or `relayMessage` directly.
 */
import { randomUUID } from 'crypto';
import { proto } from '../../WAProto/index.js';
import { RichSubMessageType } from '../Types/RichType.js';
import { wrapToBotForwardedMessage } from './rich-message-utils.js';

const AI_BOT_JID = '867051314767696@bot';

// ── shared internals ─────────────────────────────────────────────────────────

const buildUnified = (sections, responseId) => ({
    response_id: responseId || randomUUID(),
    sections
});

const wrapRich = ({ submessages, unified, disclaimerText, responseId }) => {
    const uuid = responseId || unified.response_id || randomUUID();
    const richResponseMessage = proto.AIRichResponseMessage.create({
        submessages,
        messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
        unifiedResponse: {
            // proto wants a Uint8Array, so keep the buffer as-is (do not base64 it)
            data: Buffer.from(JSON.stringify(unified))
        },
        contextInfo: {
            isForwarded: true,
            forwardingScore: 1,
            forwardedAiBotMessageInfo: { botJid: AI_BOT_JID },
            forwardOrigin: 4
        }
    });
    const message = wrapToBotForwardedMessage(richResponseMessage);
    const botMetadata = message.messageContextInfo.botMetadata;
    if (disclaimerText) {
        botMetadata.messageDisclaimerText = disclaimerText;
    }
    botMetadata.botResponseId = uuid;
    return message;
};

const textSub = (messageText) => ({ messageType: RichSubMessageType.TEXT, messageText });

// ── 1. View-once V2, pure text ───────────────────────────────────────────────

/**
 * Wrap plain text in a view-once V2 message. No media, no caption, just text that disappears.
 * `sendMessage(jid, { text: '...', viewOnceV2: true })` does the same thing; this exists when you
 * want the raw shape.
 */
export const prepareViewOnceV2Text = (text) => ({
    viewOnceMessageV2: {
        message: {
            extendedTextMessage: {
                text
            }
        }
    }
});

// ── 2. AI Rich: raw HTML primitive ───────────────────────────────────────────

/**
 * Render arbitrary HTML inside an AI Rich reply (GenAIaeacdsnwHtmlPrimitive).
 * `trustedSources` shows up as the source chips under the card.
 */
export const prepareAiRichHtml = (content) => {
    const { html = '', trustedSources = [], headerText, contentText = '', footerText, disclaimerText, responseId } = content;
    const submessages = [];
    if (headerText)
        submessages.push(textSub(headerText));
    submessages.push(textSub(contentText));
    if (footerText)
        submessages.push(textSub(footerText));
    const unified = buildUnified([
        {
            view_model: {
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: trustedSources
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        }
    ], responseId);
    return wrapRich({ submessages, unified, disclaimerText, responseId });
};

// ── 3. AI Rich: grid image + entity card ─────────────────────────────────────

/**
 * A rich reply with a grid of images and an optional profile/entity card underneath.
 *
 * images: [{ url, previewUrl?, highResUrl?, sourceUrl?, mimeType?, width?, height? }]
 * entity: { title, subtitle, secondarySubtitle, entityId, entityUrl, entityType, actionType,
 *           isVerified, imageUrl, imageFallbackUrl }
 */
export const prepareAiRichGrid = (content) => {
    const { images = [], entity, headerText, footerText, disclaimerText, responseId } = content;
    const submessages = [];
    if (headerText)
        submessages.push(textSub(headerText));
    if (images.length) {
        submessages.push({
            messageType: RichSubMessageType.GRID_IMAGE,
            gridImageMetadata: {
                imageUrls: images.map((img) => ({
                    imagePreviewUrl: img.previewUrl || img.url,
                    imageHighResUrl: img.highResUrl || img.url,
                    sourceUrl: img.sourceUrl || img.url
                }))
            }
        });
    }
    if (footerText)
        submessages.push(textSub(footerText));
    const sections = images.map((img) => ({
        view_model: {
            primitive: {
                media: {
                    url: img.url,
                    mime_type: img.mimeType || 'image/png',
                    width: img.width,
                    height: img.height
                },
                imagine_type: 'IMAGE',
                status: { status: 'READY' },
                __typename: 'GenAIImaginePrimitive'
            },
            __typename: 'GenAISingleLayoutViewModel'
        }
    }));
    if (entity) {
        sections.push({
            view_model: {
                primitive: {
                    __typename: 'GenAICompactEntityPrimitive',
                    title: entity.title,
                    subtitle: entity.subtitle,
                    secondary_subtitle: entity.secondarySubtitle,
                    entity_id: entity.entityId,
                    entity_url: entity.entityUrl,
                    entity_type: entity.entityType || 'PAGE',
                    action_type: entity.actionType || 'FOLLOW',
                    is_verified: !!entity.isVerified,
                    image: {
                        url: entity.imageUrl,
                        url_fallback: entity.imageFallbackUrl
                    }
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        });
    }
    const unified = buildUnified(sections, responseId);
    return wrapRich({ submessages, unified, disclaimerText, responseId });
};

// ── 4. A2UI bloks widget ─────────────────────────────────────────────────────

const DEFAULT_A2UI_CATALOG = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

/**
 * Build the A2UI `createSurface` payload that a bloks widget renders.
 *
 * cards: [{ title?, image?, imageVariant?, imageFit?, lines: [{ text, variant }] }]
 * Each card becomes a Column of its children wrapped in a Card, stacked under one root Column.
 */
export const buildA2UISurface = ({ surfaceId, catalogId = DEFAULT_A2UI_CATALOG, cards = [] }) => {
    const components = [];
    const cardIds = [];
    let n = 0;
    const nextId = (prefix) => `${prefix}_${(n++).toString(36)}`;
    cards.forEach((card) => {
        const children = [];
        if (card.image) {
            const id = nextId('image');
            components.push({ id, component: 'Image', url: card.image, variant: card.imageVariant || 'header', fit: card.imageFit || 'cover' });
            children.push(id);
        }
        if (card.title) {
            const id = nextId('text');
            components.push({ id, component: 'Text', text: card.title, variant: 'body' });
            children.push(id);
        }
        (card.lines || []).forEach((line) => {
            const id = nextId('text');
            components.push({ id, component: 'Text', text: line.text, variant: line.variant || 'caption' });
            children.push(id);
        });
        const columnId = nextId('column');
        components.push({ id: columnId, component: 'Column', children });
        const cardId = nextId('card');
        components.push({ id: cardId, component: 'Card', child: columnId });
        cardIds.push(cardId);
    });
    components.unshift({ id: 'root', component: 'Column', children: cardIds });
    return {
        version: 'v0.9',
        createSurface: {
            surfaceId: surfaceId || `starcore-widget=${randomUUID()}`,
            catalogId,
            components
        }
    };
};

/**
 * Interactive message that renders an A2UI bloks widget. `surface` may be the object from
 * buildA2UISurface, or a ready-made JSON string.
 */
export const prepareBloksWidget = (content) => {
    const { surface, data, uuid = randomUUID(), type = 'im_a2ui', bodyText = '', footerText, hasMediaAttachment = false, expiration } = content;
    const surfaceId = (surface && surface.createSurface && surface.createSurface.surfaceId) || `starcore-widget=${uuid}`;
    const payload = data || JSON.stringify(surface || buildA2UISurface({ surfaceId }));
    return {
        interactiveMessage: {
            header: {
                hasMediaAttachment
            },
            body: {
                text: bodyText
            },
            footer: footerText ? { text: footerText } : undefined,
            nativeFlowMessage: {
                buttons: [],
                messageParamsJson: '{}'
            },
            bloksWidget: {
                uuid,
                data: payload,
                type
            },
            contextInfo: {
                mentionedJid: [],
                groupMentions: [],
                statusAttributions: [],
                expiration
            }
        }
    };
};
