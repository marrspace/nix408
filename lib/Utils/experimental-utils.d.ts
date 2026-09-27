/**
 * nix408: experimental message builders.
 * Everything here is reverse-engineered and undocumented — treat it as unstable.
 */

export interface AiRichHtmlOptions {
    /** Raw HTML rendered inside the GenAI HTML primitive. */
    html?: string;
    /** Domains shown as trusted sources under the card. */
    trustedSources?: string[];
    headerText?: string;
    contentText?: string;
    footerText?: string;
    /** Small print under the message. */
    disclaimerText?: string;
    /** Response id. Generated when omitted. */
    responseId?: string;
}

export interface AiRichGridImage {
    url: string;
    previewUrl?: string;
    highResUrl?: string;
    sourceUrl?: string;
    mimeType?: string;
    width?: number;
    height?: number;
}

export interface AiRichEntity {
    title?: string;
    subtitle?: string;
    secondarySubtitle?: string;
    entityId?: number;
    entityUrl?: string;
    entityType?: string;
    actionType?: string;
    isVerified?: boolean;
    imageUrl?: string;
    imageFallbackUrl?: string;
}

export interface AiRichGridOptions {
    images?: AiRichGridImage[];
    entity?: AiRichEntity;
    headerText?: string;
    footerText?: string;
    disclaimerText?: string;
    responseId?: string;
}

export interface A2UICard {
    title?: string;
    image?: string;
    imageVariant?: string;
    imageFit?: string;
    lines?: Array<{ text: string; variant?: string }>;
}

export interface A2UISurfaceOptions {
    surfaceId?: string;
    catalogId?: string;
    cards?: A2UICard[];
}

export interface A2UISurface {
    version: string;
    createSurface: {
        surfaceId: string;
        catalogId: string;
        components: any[];
    };
}

export interface BloksWidgetOptions {
    /** Surface object from buildA2UISurface. */
    surface?: A2UISurface;
    /** Ready-made JSON string, used instead of `surface` when present. */
    data?: string;
    uuid?: string;
    type?: string;
    bodyText?: string;
    footerText?: string;
    hasMediaAttachment?: boolean;
    expiration?: number;
}

/** Wrap plain text in a view-once V2 message. */
export function prepareViewOnceV2Text(text: string): unknown;

/** Render arbitrary HTML inside an AI Rich reply (GenAIaeacdsnwHtmlPrimitive). */
export function prepareAiRichHtml(content: AiRichHtmlOptions): unknown;

/** AI Rich reply with a grid of images and an optional entity card. */
export function prepareAiRichGrid(content: AiRichGridOptions): unknown;

/** Build the A2UI createSurface payload a bloks widget renders. */
export function buildA2UISurface(options: A2UISurfaceOptions): A2UISurface;

/** Interactive message that renders an A2UI bloks widget (type im_a2ui). */
export function prepareBloksWidget(content: BloksWidgetOptions): unknown;

export const DEFAULT_A2UI_CATALOG: string;
