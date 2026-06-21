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
    BAKE_CURVE_SEGMENTS,
    BAKE_TEXTURE_SIZE,
    CARD_HEIGHT,
    CARD_WIDTH,
    renderTextMaskScene,
} from './project-detail-render.js';

function createOrthoScene(worldW, worldH) {
    const orthoScene = new THREE.Scene();
    orthoScene.background = new THREE.Color(1, 1, 1);
    const orthoCamera = new THREE.OrthographicCamera(
        -worldW / 2, worldW / 2,
        worldH / 2, -worldH / 2,
        0.1, 10,
    );
    orthoCamera.position.z = 1;
    orthoCamera.lookAt(0, 0, 0);
    return { orthoScene, orthoCamera };
}

function renderMaskTarget(renderer, orthoScene, orthoCamera) {
    const w = Math.round(BAKE_TEXTURE_SIZE);
    const h = Math.round(BAKE_TEXTURE_SIZE * (CARD_HEIGHT / CARD_WIDTH));
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

export function renderBackHomeTarget(renderer, layout, baskervvilleFont, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    return renderTextItemsTarget(renderer, getBackHomeTextItems(layout, baskervvilleFont, backButtonFont), curveSegments);
}

export function renderBackProjectsTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const textMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    for (const entry of layout.projectIndexLayout.entries) {
        addTextItem(orthoScene, {
            text: entry.title,
            font: backButtonFont,
            size: PROJECT_INDEX_SIZE,
            x: entry.x,
            y: entry.y,
            baseline: true,
        }, textMat, curveSegments);
    }
    const back = layout.projectIndexLayout.backLink;
    addTextItem(orthoScene, {
        text: back.label,
        font: backButtonFont,
        size: layout.BACK_LINK_SIZE,
        x: back.x,
        y: back.y,
    }, textMat, curveSegments);
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
    const entry = layout.projectIndexLayout.entries[entryIndex];
    return renderTextItemsTarget(renderer, [{
        text: entry.title,
        font: backButtonFont,
        size: PROJECT_INDEX_SIZE,
        x: entry.x,
        y: entry.y,
        baseline: true,
    }], curveSegments);
}

export function renderBackLinkMaskTarget(renderer, layout, backButtonFont, curveSegments = BAKE_CURVE_SEGMENTS) {
    const back = layout.projectIndexLayout.backLink;
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
        { name: 'email-mask' },
        ...BACK_BUTTON_LABELS.map((label) => ({ name: `button-${label.toLowerCase()}-mask` })),
        { name: 'back-link-mask' },
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
    if (job.name === 'email-mask') {
        return renderEmailMaskTarget(renderer, layout, baskervvilleFont, curveSegments);
    }
    if (job.name === 'back-link-mask') {
        return renderBackLinkMaskTarget(renderer, layout, backButtonFont, curveSegments);
    }
    if (job.name.startsWith('button-') && job.name.endsWith('-mask')) {
        const label = job.name.slice('button-'.length, -'-mask'.length);
        const buttonIndex = BACK_BUTTON_LABELS.findIndex((b) => b.toLowerCase() === label);
        if (buttonIndex < 0) throw new Error(`Unknown button texture ${job.name}`);
        return renderBackButtonMaskTarget(renderer, layout, backButtonFont, buttonIndex, curveSegments);
    }
    if (job.name.startsWith('index-') && job.name.endsWith('-mask')) {
        const slug = job.name.slice('index-'.length, -'-mask'.length);
        const entryIndex = indexItems.findIndex((item) => item.slug === slug);
        if (entryIndex < 0) throw new Error(`Unknown index texture ${job.name}`);
        return renderProjectIndexEntryMaskTarget(renderer, layout, backButtonFont, entryIndex, curveSegments);
    }
    throw new Error(`Unknown card face job ${job.name}`);
}
