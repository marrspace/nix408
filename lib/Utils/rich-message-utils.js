/**
 * nix408: [WIP]
 * Adds support for tables and code blocks with richResponseMessage (wrapped inside botForwardedMessage).
 *
 * If you use or copy this code, please credit my name or project. AND DO NOT CHANGE THIS NOTE
 */
import { randomUUID } from 'crypto';
import { DONATE_URL, LEXER_REGEX } from '../Defaults/index.js';
import { AI_BOT_CERTIFICATE_CHAIN, AI_BOT_JID, AI_BOT_METADATA, AI_BOT_SIGNATURE } from '../Defaults/ai-bot.js';
import { LANGUAGE_KEYWORDS } from '../WABinary/constants.js';
import { CodeHighlightType, RichSubMessageType } from '../Types/RichType.js';
import { proto } from '../../WAProto/index.js';
import { unixTimestampSeconds } from './generics.js';
const NOOP = new Set([]);
export const tokenizeCode = (code, language = 'javascript') => {
    const keywords = LANGUAGE_KEYWORDS[language] || NOOP;
    const blocks = [];
    LEXER_REGEX.lastIndex = 0;
    let match;
    while ((match = LEXER_REGEX.exec(code)) !== null) {
        if (match[1]) {
            blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: match[1] });
        }
        else if (match[2]) {
            blocks.push({ highlightType: CodeHighlightType.STRING, codeContent: match[2] });
        }
        else if (match[3]) {
            blocks.push({
                highlightType: keywords.has(match[3]) ? CodeHighlightType.KEYWORD : CodeHighlightType.METHOD,
                codeContent: match[3],
            });
        }
        else if (match[4]) {
            blocks.push({
                highlightType: keywords.has(match[4]) ? CodeHighlightType.KEYWORD : CodeHighlightType.DEFAULT,
                codeContent: match[4],
            });
        }
        else if (match[5]) {
            blocks.push({ highlightType: CodeHighlightType.NUMBER, codeContent: match[5] });
        }
        else {
            blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: match[6] });
        }
    }
    return blocks;
};
// nix408: Inject buffer into unifiedResponse.data to support proper rendering of rich messages (ex: tables and code blocks)
export const toUnified = (submessages, uuid) => ({
    response_id: uuid || randomUUID(),
    sections: submessages.map((submessage, index) => {
        switch (submessage.messageType) {
            case RichSubMessageType.CODE:
                const codeMetadata = submessage.codeMetadata;
                return {
                    view_model: {
                        primitive: {
                            language: codeMetadata.codeLanguage,
                            code_blocks: codeMetadata.codeBlocks.map((block) => ({ content: block.codeContent, type: CodeHighlightType[block.highlightType] })),
                            __typename: 'GenAICodeUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            case RichSubMessageType.CONTENT_ITEMS:
                return {};
            case RichSubMessageType.INLINE_IMAGE:
                return {};
            case RichSubMessageType.LATEX:
                return {};
            case RichSubMessageType.TABLE:
                const tableMetadata = submessage.tableMetadata;
                return {
                    view_model: {
                        primitive: {
                            title: tableMetadata.title,
                            rows: tableMetadata.rows.map((row) => ({
                                is_header: row.isHeading,
                                cells: row.items,
                                markdown_cells: row.items.map((item) => ({ text: item }))
                            })),
                            __typename: 'GenATableUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            case RichSubMessageType.TEXT:
                return {
                    view_model: {
                        primitive: {
                            text: submessage.messageText,
                            inline_entities: submessage.inlineEntities || [],
                            __typename: 'GenAIMarkdownTextUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
        }
        return submessage;
    })
});
export const prepareRichResponseMessage = (content) => {
    const { alignment, code, contentText, disclaimerText, footerText, headerText, imageText, inlineImage, inlineVideo, items, language, latex, links, noHeading, posts, products, suggested, richResponse, table, tapLinkUrl, title } = content;
    let submessages = [];
    // nix408: a `links` submessage expands into one citation block per link, so it has to be
    // mapped with flatMap and checked before `text` (both keys are often present together).
    const expandLinks = (linkField, index) => {
        const prefix = 'SS_' + index;
        const url = linkField.url || DONATE_URL;
        const sources = linkField.sources?.map((sourceField) => ({
            source_type: 'THIRD_PARTY',
            source_display_name: sourceField.displayName || 'Donate',
            source_subtitle: sourceField.subtitle || 'Donation',
            source_url: sourceField.url || url
        }));
        return {
            messageType: RichSubMessageType.TEXT,
            messageText: linkField.text + ` {{${prefix}}}¹{{/${prefix}}} `,
            inlineEntities: [{
                    key: prefix,
                    metadata: {
                        reference_id: index + 1,
                        reference_url: url,
                        reference_title: linkField.title || 'For Donation',
                        reference_display_name: linkField.displayName || 'Donation',
                        sources: sources || [],
                        __typename: 'GenAISearchCitationItem'
                    }
                }]
        };
    };
    if (Array.isArray(richResponse)) {
        submessages = richResponse.flatMap((submessage) => {
            if (Array.isArray(submessage.links)) {
                return submessage.links.map(expandLinks);
            }
            if (submessage.text) {
                return [{
                        messageType: RichSubMessageType.TEXT,
                        messageText: submessage.text,
                        inlineEntities: submessage.inlineEntities
                    }];
            }
            else if (submessage.code) {
                return [{
                        messageType: RichSubMessageType.CODE,
                        codeMetadata: {
                            codeLanguage: submessage.language || 'javascript',
                            // nix408: `code` may be a raw string (tokenize it) or pre-tokenized blocks
                            // (use as-is). toUnified() requires an array either way.
                            codeBlocks: typeof submessage.code === 'string'
                                ? tokenizeCode(submessage.code, submessage.language || 'javascript')
                                : submessage.code
                        }
                    }];
            }
            else if (submessage.items) {
                return [{
                        messageType: RichSubMessageType.CONTENT_ITEMS,
                        contentItemsMetadata: {
                            itemsMetadata: submessage.items,
                            contentType: proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
                        }
                    }];
            }
            else if (submessage.inlineImage) {
                return [{
                        messageType: RichSubMessageType.INLINE_IMAGE,
                        imageMetadata: {
                            imageUrl: submessage.inlineImage,
                            imageText: submessage.imageText,
                            alignment: submessage.alignment,
                            tapLinkUrl: submessage.tapLinkUrl
                        }
                    }];
            }
            else if (submessage.inlineVideo) {
                return [{
                        messageType: RichSubMessageType.TEXT,
                        messageText: 'INLINE_VIDEO'
                    }];
            }
            else if (submessage.latex) {
                return [{
                        messageType: RichSubMessageType.LATEX,
                        latexMetadata: {
                            text: submessage.text,
                            expressions: submessage.latex
                        }
                    }];
            }
            else if (submessage.posts) {
                return [{
                        messageType: RichSubMessageType.TEXT,
                        messageText: 'POSTS'
                    }];
            }
            else if (submessage.products) {
                return [{
                        messageType: RichSubMessageType.TEXT,
                        messageText: 'PRODUCTS'
                    }];
            }
            else if (submessage.suggested) {
                return [{
                        messageType: RichSubMessageType.TEXT,
                        messageText: 'SUGGESTED_PROMPT'
                    }];
            }
            else if (submessage.table) {
                return [{
                        messageType: RichSubMessageType.TABLE,
                        tableMetadata: {
                            title: submessage.title,
                            // nix408: normalize rows the same way the top-level `table` shortcut does,
                            // otherwise toUnified() reads row.items off a raw array and crashes.
                            rows: submessage.table.map((items, index) => ({
                                isHeading: !submessage.noHeading && index === 0,
                                items
                            }))
                        }
                    }];
            }
            return [submessage];
        });
    }
    else {
        if (headerText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: headerText
            });
        }
        if (contentText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: contentText
            });
        }
        if (code) {
            language ||= 'javascript';
            submessages.push({
                messageType: RichSubMessageType.CODE,
                codeMetadata: {
                    codeLanguage: language,
                    codeBlocks: tokenizeCode(code, language)
                }
            });
        }
        if (items) {
            submessages.push({
                messageType: RichSubMessageType.CONTENT_ITEMS,
                contentItemsMetadata: {
                    itemsMetadata: items,
                    contentType: proto.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL
                }
            });
        }
        if (inlineImage) {
            submessages.push({
                messageType: RichSubMessageType.INLINE_IMAGE,
                imageMetadata: {
                    imageUrl: inlineImage,
                    imageText,
                    alignment,
                    tapLinkUrl
                }
            });
        }
        if (inlineVideo) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'INLINE_VIDEO'
            });
        }
        if (latex) {
            submessages.push({
                messageType: RichSubMessageType.LATEX,
                latexMetadata: {
                    text,
                    expressions: latex
                }
            });
        }
        if (links) {
            links.forEach((linkField, index) => {
                const prefix = 'SS_' + index;
                const url = linkField.url || DONATE_URL;
                const sources = linkField.sources?.map((sourceField) => ({
                    source_type: 'THIRD_PARTY',
                    source_display_name: sourceField.displayName || 'Donate',
                    source_subtitle: sourceField.subtitle || 'Donation',
                    source_url: sourceField.url || url
                }));
                submessages.push({
                    messageType: RichSubMessageType.TEXT,
                    messageText: linkField.text + ` {{${prefix}}}¹{{/${prefix}}} `,
                    inlineEntities: [{
                            key: prefix,
                            metadata: {
                                reference_id: index + 1,
                                reference_url: url,
                                reference_title: linkField.title || 'For Donation',
                                reference_display_name: linkField.displayName || 'Donation',
                                sources: sources || [],
                                __typename: 'GenAISearchCitationItem'
                            }
                        }]
                });
            });
        }
        if (posts) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'POSTS'
            });
        }
        if (products) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'PRODUCTS'
            });
        }
        if (suggested) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: 'SUGGESTED_PROMPT'
            });
        }
        if (table) {
            submessages.push({
                messageType: RichSubMessageType.TABLE,
                tableMetadata: {
                    title,
                    rows: table.map((items, index) => ({
                        isHeading: !noHeading && index == 0,
                        items
                    }))
                }
            });
        }
        if (footerText) {
            submessages.push({
                messageType: RichSubMessageType.TEXT,
                messageText: footerText
            });
        }
    }
    const uuid = randomUUID();
    const unified = toUnified(submessages, uuid);
    const richResponseMessage = proto.AIRichResponseMessage.create({
        submessages,
        messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
        unifiedResponse: {
            data: Buffer.from(JSON.stringify(unified)) // nix408: Expects "ArrayBufferLike"
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
    // nix408: Add disclaimer text on richResponseMessage
    if (disclaimerText) {
        botMetadata.messageDisclaimerText = disclaimerText;
    }
    // nix408: Add responseId from unified directly to botMetadata
    botMetadata.botResponseId = uuid;
    return message;
};
// nix408: signature and certificate chain are fixed values, kept in Defaults/ai-bot.js
export { AI_BOT_SIGNATURE as botMetadataSignature, AI_BOT_CERTIFICATE_CHAIN as botMetadataCertificateChain };
export const botMetadataCertificate = (index = 0) => AI_BOT_CERTIFICATE_CHAIN[index];
export const wrapToBotForwardedMessage = (richResponseMessage) => ({
    messageContextInfo: {
        botMetadata: {
            ...AI_BOT_METADATA
        }
    },
    botForwardedMessage: {
        message: { richResponseMessage }
    }
});
//# sourceMappingURL=rich-message-utils.js.map