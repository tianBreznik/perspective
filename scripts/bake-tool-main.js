/**
 * Browser-side baker — headless Chromium runs this via Playwright.
 * Bakes static card faces + per-project detail textures.
 */
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import inriaSerifFont from '../src/assets/fonts/Baskervville Medium_Regular.json';
import baskervvilleRegular from '../src/assets/fonts/Baskervville_Regular.json';
import { buildCardFaceLayout } from '../src/card-face-layout.js';
import { listCardFaceBakeJobs, renderCardFaceTarget } from '../src/bake/card-face-render.js';
import { PROJECT_INDEX_ITEMS } from '../src/project-index-data.js';
import {
    buildProjectIndexLayout,
    readRenderTargetPixels,
    renderDescMaskTarget,
    renderProjectDetailTarget,
    renderTitleMaskTarget,
} from '../src/bake/project-detail-render.js';

const statusEl = document.getElementById('bake-status');

function setStatus(message) {
    window.__bakeStatus = message;
    if (statusEl) statusEl.textContent = message;
    console.log(`[bake] ${message}`);
}

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

function yieldToBrowser() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function runBake() {
    setStatus('Initializing WebGL…');
    const backButtonFont = new FontLoader().parse(inriaSerifFont);
    const baskervvilleFont = new FontLoader().parse(baskervvilleRegular);
    const cardFaceLayout = buildCardFaceLayout(baskervvilleFont, backButtonFont, 64, PROJECT_INDEX_ITEMS);
    const projectIndexLayout = buildProjectIndexLayout(PROJECT_INDEX_ITEMS, backButtonFont);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0xffffff, 1);

    const baked = [];
    const cardJobs = listCardFaceBakeJobs(cardFaceLayout, PROJECT_INDEX_ITEMS);
    const projectItems = PROJECT_INDEX_ITEMS.filter((item) => item.url);
    const totalSteps = cardJobs.length + projectItems.reduce(
        (sum, item) => sum + 2 + (item.writeUpUrl && item.description ? 1 : 0),
        0,
    );
    let step = 0;

    for (const job of cardJobs) {
        await yieldToBrowser();
        step += 1;
        setStatus(`Baking card ${job.name} (${step}/${totalSteps})…`);
        baked.push({
            group: 'card',
            name: job.name,
            ...bakeTarget(renderer, renderCardFaceTarget(
                renderer,
                cardFaceLayout,
                baskervvilleFont,
                backButtonFont,
                job,
                PROJECT_INDEX_ITEMS,
            )),
        });
    }

    for (let i = 0; i < projectItems.length; i++) {
        const item = projectItems[i];
        await yieldToBrowser();

        step += 1;
        setStatus(`Baking ${item.slug} detail (${step}/${totalSteps})…`);
        baked.push({
            group: 'project',
            slug: item.slug,
            name: 'detail',
            ...bakeTarget(renderer, renderProjectDetailTarget(renderer, backButtonFont, item, projectIndexLayout)),
        });

        await yieldToBrowser();
        step += 1;
        setStatus(`Baking ${item.slug} title-mask (${step}/${totalSteps})…`);
        baked.push({
            group: 'project',
            slug: item.slug,
            name: 'title-mask',
            ...bakeTarget(renderer, renderTitleMaskTarget(renderer, backButtonFont, item)),
        });

        if (item.writeUpUrl && item.description) {
            const descTarget = renderDescMaskTarget(renderer, backButtonFont, item);
            if (descTarget) {
                await yieldToBrowser();
                step += 1;
                setStatus(`Baking ${item.slug} desc-mask (${step}/${totalSteps})…`);
                baked.push({
                    group: 'project',
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
    setStatus(`Done — ${baked.length} textures baked.`);
}

runBake().catch((err) => {
    window.__bakeError = String(err?.message || err);
    setStatus(`Bake failed: ${window.__bakeError}`);
    console.error(err);
});
