import { BACK_BUTTON_LABELS } from './card-face-layout.js';
import { PROJECT_INDEX_ITEMS } from './project-index-data.js';

export const CARD_BUTTON_TEXTURE_KEYS = BACK_BUTTON_LABELS.map(
    (label) => `button-${label.toLowerCase()}-mask`,
);

export const CARD_TEXTURE_KEYS = [
    'back-home',
    'back-projects',
    'email-mask',
    ...CARD_BUTTON_TEXTURE_KEYS,
    'back-link-mask',
    ...PROJECT_INDEX_ITEMS.map((item) => `index-${item.slug}-mask`),
];

export function cardTextureUrl(name) {
    return `/card-textures/${name}.png`;
}

export function cardButtonTextureKey(label) {
    return `button-${label.toLowerCase()}-mask`;
}

export function cardIndexTextureKey(slug) {
    return `index-${slug}-mask`;
}
