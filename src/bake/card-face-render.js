import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import {
    BACK_BUTTON_LABELS,
    EMAIL_TEXT,
    getBackHomeTextItems,
    PROJECT_INDEX_SIZE,
    QUOTE_TEXT_SIZE,
    BACK_BUTTON_SIZE,
} from '../card-face-layout.js';
import {
    addBackListArrowMesh,
    BAKE_CURVE_SEGMENTS,
    BAKE_TEXTURE_SIZE,
    CARD_HEIGHT,
    CARD_WIDTH,
    renderTextMaskScene,
} from './project-detail-render.js';

function createOrthoScene(worldW, worldH, centerY = 0) {
    const orthoScene = new THREE.Scene();
    orthoScene.background = new THREE.Color(1, 1, 1);
    // Frustum is camera-local; world offset comes only from camera.position.y.
    const orthoCamera = new THREE.OrthographicCamera(
        -worldW / 2, worldW / 2,
        worldH / 2, -worldH / 2,
        0.1, 10,
    );
    orthoCamera.position.set(0, centerY, 1);
    orthoCamera.lookAt(0, centerY, 0);
    return { orthoScene, orthoCamera };
}

function renderMaskTarget(renderer, orthoScene, orthoCamera, worldW = CARD_WIDTH, worldH = CARD_HEIGHT) {
    const w = Math.round(BAKE_TEXTURE_SIZE);
    const h = Math.round(BAKE_TEXTURE_SIZE * (worldH / worldW));
    return renderTextMaskScene(renderer, orthoScene, orthoCamera, w, h);
}

function addTextItem(scene, item, textMat, curveSegments) {
    const geom = new TextGeometry(item.text, {
        font: item.font,
        size: item.size,
        height: 0.002,
        curveSegments,
        bevelEnabled: false,
    });
    geom.computeBoundingBox();
    if (item.center) {
        const cx = (geom.boundingBox.min.x + geom.boundingBox.max.x) / 2;
        const cy = (geom.boundingBox.min.y + geom.boundingBox.max.y) / 2;
        geom.translate(-cx, -cy, 0);
    } else if (item.baseline) {
        geom.translate(item.x - geom.boundingBox.min.x, item.y, 0);
    } else {
        geom.translate(
            item.x - geom.boundingBox.min.x,
            item.y - geom.boundingBox.min.y,
            0,
        );
    }
    scene.add(new THREE.Mesh(geom, textMat));
}

function renderTextItemsTarget(renderer, textItems, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    for (const item of textItems) addTextItem(orthoScene, item, textMat, curveSegments);
    return renderMaskTarget(renderer, orthoScene, orthoCamera);
}

function getProjectsListBakeBounds(layout) {
    const index = layout.projectIndexLayout;
    const worldH = index.contentHeight;
    const centerY = (index.contentTop + index.contentBottom) / 2;
    return { worldH, centerY };
}

function addProjectIndexEntries(orthoScene, layout, backButtonFont, textMat, curveSegments, entryIndex = null) {
    const entries = layout.projectIndexLayout.entries;
    const range = entryIndex == null ? entries : [entries[entryIndex]];
    for (const entry of range) {
        if (!entry) continue;
        addTextItem(orthoScene, {
            text: entry.title,
            font: backButtonFont,
            size: PROJECT_INDEX_SIZE,
            x: entry.x,
            y: entry.y,
            baseline: true,
        }, textMat, curveSegments);
    }
}

export function renderBackHomeTarget(renderer, layout, baskervvilleFont, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    return renderTextItemsTarget(renderer, getBackHomeTextItems(layout, baskervvilleFont, backButtonFont), curveSegments);
}

export function renderBackProjectsListTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { worldH, centerY } = getProjectsListBakeBounds(layout);
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, worldH, centerY);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    addProjectIndexEntries(orthoScene, layout, backButtonFont, textMat, curveSegments);
    return renderMaskTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, worldH);
}

export function renderBackProjectsTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    // Card-sized scroll=0 snapshot (list clipped by camera + fixed back arrow).
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    const index = layout.projectIndexLayout;
    for (const entry of index.entries) {
        const top = entry.y + entry.ascent;
        const bottom = entry.y - entry.descent;
        if (bottom > index.viewportTop || top < index.viewportBottom) continue;
        addTextItem(orthoScene, {
            text: entry.title,
            font: backButtonFont,
            size: PROJECT_INDEX_SIZE,
            x: entry.x,
            y: entry.y,
            baseline: true,
        }, textMat, curveSegments);
    }
    const back = index.backLink;
    addBackListArrowMesh(orthoScene, back.x, back.y, layout.BACK_LINK_SIZE, textMat);
    return renderMaskTarget(renderer, orthoScene, orthoCamera);
}

export function renderEmailMaskTarget(renderer, layout, baskervvilleFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    return renderTextItemsTarget(renderer, [{
        text: EMAIL_TEXT,
        font: baskervvilleFont,
        size: QUOTE_TEXT_SIZE,
        x: layout.emailX,
        y: layout.emailY,
    }], curveSegments);
}

export function renderBackButtonMaskTarget(renderer, layout, backButtonFont, buttonIndex, curveSegments = BAKE_CURVE_SEGMENTS) {
    return renderTextItemsTarget(renderer, [{
        text: BACK_BUTTON_LABELS[buttonIndex],
        font: backButtonFont,
        size: BACK_BUTTON_SIZE,
        x: layout.backButtonPositions[buttonIndex].x,
        y: layout.backButtonPositions[buttonIndex].y,
    }], curveSegments);
}

export function renderProjectIndexEntryMaskTarget(renderer, layout, backButtonFont, entryIndex, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { worldH, centerY } = getProjectsListBakeBounds(layout);
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, worldH, centerY);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    addProjectIndexEntries(orthoScene, layout, backButtonFont, textMat, curveSegments, entryIndex);
    return renderMaskTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, worldH);
}

export function renderBackLinkMaskTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    const back = layout.projectIndexLayout.backLink;
    addBackListArrowMesh(orthoScene, back.x, back.y, layout.BACK_LINK_SIZE, textMat);
    return renderMaskTarget(renderer, orthoScene, orthoCamera);
}

export function renderBackLinkDetailMaskTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    const back = layout.projectIndexLayout.backLinkDetail;
    return renderTextItemsTarget(renderer, [{
        text: back.label,
        font: backButtonFont,
        size: layout.BACK_LINK_SIZE,
        x: back.x,
        y: back.y,
    }], curveSegments);
}

export function listCardFaceBakeJobs(layout, indexItems) {
    const jobs = [
        { name: 'back-home' },
        { name: 'back-projects' },
        { name: 'back-projects-list' },
        { name: 'email-mask' },
        ...BACK_BUTTON_LABELS.map((label) => ({ name: `button-${label.toLowerCase()}-mask` })),
        { name: 'back-link-mask' },
        { name: 'back-link-detail-mask' },
        ...indexItems.map((item) => ({ name: `index-${item.slug}-mask`, slug: item.slug })),
    ];
    return jobs;
}

export function renderCardFaceTarget(renderer, layout, baskervvilleFont, backButtonFont, job, indexItems, curveSegments = BAKE_CURVE_SEGMENTS) {
    if (job.name === 'back-home') {
        return renderBackHomeTarget(renderer, layout, baskervvilleFont, backButtonFont, curveSegments);
    }
    if (job.name === 'back-projects') {
        return renderBackProjectsTarget(renderer, layout, backButtonFont, curveSegments);
    }
    if (job.name === 'back-projects-list') {
        return renderBackProjectsListTarget(renderer, layout, backButtonFont, curveSegments);
    }
    if (job.name === 'email-mask') {
        return renderEmailMaskTarget(renderer, layout, baskervvilleFont, curveSegments);
    }
    if (job.name === 'back-link-mask') {
        return renderBackLinkMaskTarget(renderer, layout, backButtonFont, curveSegments);
    }
    if (job.name === 'back-link-detail-mask') {
        return renderBackLinkDetailMaskTarget(renderer, layout, backButtonFont, curveSegments);
    }
    if (job.name.startsWith('button-') && job.name.endsWith('-mask')) {
        const label = job.name.slice('button-'.length, -'-mask'.length);
        const buttonIndex = BACK_BUTTON_LABELS.findIndex((b) => b.toLowerCase() === label);
        if (buttonIndex < 0) throw new Error(`Unknown button texture ${job.name}`);
        return renderBackButtonMaskTarget(renderer, layout, backButtonFont, buttonIndex, curveSegments);
    }
    if (job.name.startsWith('index-') && job.name.endsWith('-mask')) {
        const slug = job.slug || job.name.slice('index-'.length, -'-mask'.length);
        const entryIndex = indexItems.findIndex((item) => item.slug === slug);
        if (entryIndex < 0) throw new Error(`Unknown index texture ${job.name}`);
        const entry = layout.projectIndexLayout.entries[entryIndex];
        if (!entry) throw new Error(`Missing layout entry for ${slug}`);
        return renderProjectIndexEntryMaskTarget(renderer, layout, backButtonFont, entryIndex, curveSegments);
    }
    throw new Error(`Unknown card face job ${job.name}`);
}
