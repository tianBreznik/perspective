import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import {
    BACK_LINK_LABEL,
    BACK_LINK_SIZE,
    buildProjectIndexLayout,
    CARD_HEIGHT,
    CARD_WIDTH,
} from './bake/project-detail-render.js';

export const QUOTE_TEXT = '"Did I lose my perspective?"';
export const ATTRIBUTION_TEXT = '— Charlotte Emma Aitchison';
export const EMAIL_TEXT = 'tian@perspective.credit';
export const BACK_BUTTON_LABELS = ['INFO', 'PROJECTS', 'CV'];

export const QUOTE_TEXT_SIZE = 0.08;
export const BACK_BUTTON_SIZE = 0.13;
export const BACK_BUTTON_SPACING = 0.3;
export const PROJECT_INDEX_SIZE = BACK_BUTTON_SIZE * 0.82;

export function buildCardFaceLayout(baskervvilleFont, backButtonFont, curveSegments, indexItems) {
    const quoteX = -CARD_WIDTH / 2 + 0.15;
    const quoteY = -CARD_HEIGHT / 2 + 0.25;

    const quoteGeom = new TextGeometry(QUOTE_TEXT, {
        font: baskervvilleFont,
        size: QUOTE_TEXT_SIZE,
        height: 0.001,
        curveSegments: Math.min(curveSegments, 20),
        bevelEnabled: false,
    });
    quoteGeom.computeBoundingBox();
    const quoteHeight = quoteGeom.boundingBox.max.y - quoteGeom.boundingBox.min.y;
    quoteGeom.dispose();
    const attributionY = quoteY - quoteHeight - 0.02;

    const emailGeom = new TextGeometry(EMAIL_TEXT, {
        font: baskervvilleFont,
        size: QUOTE_TEXT_SIZE,
        height: 0.001,
        curveSegments: Math.min(curveSegments, 20),
        bevelEnabled: false,
    });
    emailGeom.computeBoundingBox();
    const emailWidth = emailGeom.boundingBox.max.x - emailGeom.boundingBox.min.x;
    const emailHeight = emailGeom.boundingBox.max.y - emailGeom.boundingBox.min.y;
    emailGeom.dispose();
    const emailX = CARD_WIDTH / 2 - 0.15 - emailWidth;
    const emailY = quoteY;

    const backButtonY = 0;
    const backButtonMetrics = BACK_BUTTON_LABELS.map((label) => {
        const g = new TextGeometry(label, {
            font: backButtonFont,
            size: BACK_BUTTON_SIZE,
            height: 0.001,
            curveSegments,
            bevelEnabled: false,
        });
        g.computeBoundingBox();
        const w = g.boundingBox.max.x - g.boundingBox.min.x;
        const h = g.boundingBox.max.y - g.boundingBox.min.y;
        g.dispose();
        return { label, w, h };
    });
    const totalButtonsWidth = backButtonMetrics.reduce((sum, m) => sum + m.w, 0)
        + BACK_BUTTON_SPACING * (BACK_BUTTON_LABELS.length - 1);
    let bx = -totalButtonsWidth / 2;
    const backButtonPositions = backButtonMetrics.map((m) => {
        const pos = { x: bx, y: backButtonY };
        bx += m.w + BACK_BUTTON_SPACING;
        return pos;
    });

    return {
        quoteX,
        quoteY,
        attributionY,
        emailX,
        emailY,
        emailWidth,
        emailHeight,
        backButtonMetrics,
        backButtonPositions,
        backButtonY,
        projectIndexLayout: buildProjectIndexLayout(indexItems, backButtonFont, curveSegments),
        BACK_LINK_LABEL,
        BACK_LINK_SIZE,
        PROJECT_INDEX_SIZE,
    };
}

export function getBackHomeTextItems(layout, baskervvilleFont, backButtonFont) {
    const items = [
        { text: QUOTE_TEXT, font: baskervvilleFont, size: QUOTE_TEXT_SIZE, x: layout.quoteX, y: layout.quoteY },
        {
            text: ATTRIBUTION_TEXT,
            font: baskervvilleFont,
            size: QUOTE_TEXT_SIZE * 0.85,
            x: layout.quoteX + 0.1,
            y: layout.attributionY,
        },
        { text: EMAIL_TEXT, font: baskervvilleFont, size: QUOTE_TEXT_SIZE, x: layout.emailX, y: layout.emailY },
    ];
    layout.backButtonMetrics.forEach((m, i) => {
        items.push({
            text: m.label,
            font: backButtonFont,
            size: BACK_BUTTON_SIZE,
            x: layout.backButtonPositions[i].x,
            y: layout.backButtonPositions[i].y,
        });
    });
    return items;
}

export function measureTextLabel(text, size, font, curveSegments) {
    const g = new TextGeometry(text, { font, size, height: 0.001, curveSegments, bevelEnabled: false });
    g.computeBoundingBox();
    const w = g.boundingBox.max.x - g.boundingBox.min.x;
    const ascent = g.boundingBox.max.y;
    const descent = -g.boundingBox.min.y;
    const h = ascent + descent;
    g.dispose();
    return { w, h, ascent, descent };
}
