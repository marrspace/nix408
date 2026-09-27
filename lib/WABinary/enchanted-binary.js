
import { getBinaryNodeChild, getBinaryNodeChildren } from './generic-utils.js';

/**
 * Enhanced Binary Node Utilities
 */
export const queryNode = (node, path) => {
    const parts = path.split('/');
    let current = node;
    for (const part of parts) {
        current = getBinaryNodeChild(current, part);
        if (!current) return null;
    }
    return current;
};

export const getChildrenByTag = (node, tag) => {
    return getBinaryNodeChildren(node, tag);
};

export const createNode = (tag, attrs = {}, content = []) => {
    return { tag, attrs, content };
};

export const findNode = (node, tag) => {
    if (node.tag === tag) return node;
    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            const found = findNode(child, tag);
            if (found) return found;
        }
    }
    return null;
};

export const getAttr = (node, attr) => {
    return node.attrs ? node.attrs[attr] : undefined;
};
