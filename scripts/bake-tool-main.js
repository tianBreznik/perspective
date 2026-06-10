/**
 * Browser-side baker — headless Chromium runs this via Playwright.
 * Uses the same Three.js text pipeline as the card.
 */
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import inriaSerifFont from '../src/assets/fonts/Baskervville Medium_Regular.json';
import { PROJECT_INDEX_ITEMS } from '../src/project-index-data.js';
import {
    buildProjectIndexLayout,
    readRenderTargetPixels,
    renderDescMaskTarget,
    renderProjectDetailTarget,
    renderTitleMaskTarget,
} from '../src/bake/project-detail-render.js';

function pixelsToBase64Png(pixels, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        const srcRow = h - 1 - y;
        for (let x = 0; x < w; x++) {
            const src = (srcRow * w + x) * 4;
            const dst = (y * w + x) * 4;
            imageData.data[dst] = pixels[src];
            imageData.data[dst + 1] = pixels[src + 1];
            imageData.data[dst + 2] = pixels[src + 2];
            imageData.data[dst + 3] = pixels[src + 3];
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
}

function bakeTarget(renderer, targetResult) {
    const { rt, w, h } = targetResult;
    const pixels = readRenderTargetPixels(renderer, rt, w, h);
    return { w, h, base64: pixelsToBase64Png(pixels, w, h) };
}

const font = new FontLoader().parse(inriaSerifFont);
const projectIndexLayout = buildProjectIndexLayout(PROJECT_INDEX_ITEMS, font);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setClearColor(0xffffff, 1);

const baked = [];

for (const item of PROJECT_INDEX_ITEMS) {
    if (!item.url) continue;
    baked.push({
        slug: item.slug,
        name: 'detail',
        ...bakeTarget(renderer, renderProjectDetailTarget(renderer, font, item, projectIndexLayout)),
    });
    baked.push({
        slug: item.slug,
        name: 'title-mask',
        ...bakeTarget(renderer, renderTitleMaskTarget(renderer, font, item)),
    });
    if (item.writeUpUrl && item.description) {
        const descTarget = renderDescMaskTarget(renderer, font, item);
        if (descTarget) {
            baked.push({
                slug: item.slug,
                name: 'desc-mask',
                ...bakeTarget(renderer, descTarget),
            });
        }
    }
}

renderer.dispose();
window.__bakedTextures = baked;
window.__bakeComplete = true;
