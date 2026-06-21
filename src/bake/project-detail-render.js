import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { getProjectDetailMetaList } from '../project-index-data.js';

export const BAKE_TEXTURE_SIZE = 1024;
export const BAKE_CURVE_SEGMENTS = 64;
export const TEXT_MASK_SUPERSAMPLE = 2;
export const TEXT_MASK_SUPERSAMPLE_DESKTOP = 2;

export const CARD_WIDTH = 4;
export const CARD_HEIGHT = 2.5;

export const BACK_LINK_LABEL = 'back';
export const BACK_LINK_SIZE = 0.13 * 0.82;
export const PROJECT_INDEX_SIZE = 0.13 * 0.82;

export const PROJECT_DETAIL_TITLE_SIZE = PROJECT_INDEX_SIZE;
export const PROJECT_DETAIL_TOP_MARGIN = 0.2;
export const PROJECT_DETAIL_TITLE_DESC_GAP = 0.14;
export const PROJECT_DETAIL_DESC_SIZE = 0.13 * 0.62;
export const PROJECT_DETAIL_DESC_MAX_W = CARD_WIDTH - 0.36;
export const PROJECT_DETAIL_DESC_LINE_GAP = 0.065;
export const PROJECT_DETAIL_DESC_BOTTOM_MARGIN = 0.22;
export const PROJECT_DETAIL_META_SIZE = PROJECT_DETAIL_DESC_SIZE * 0.88;
export const PROJECT_DETAIL_META_LEFT = -CARD_WIDTH / 2 + 0.14;
export const PROJECT_DETAIL_META_BOTTOM = -CARD_HEIGHT / 2 + 0.14;
export const PROJECT_DETAIL_META_GAP = 0.045;
export const PROJECT_DETAIL_META_DESC_GAP = 0.08;
export const PROJECT_INDEX_GAP = 0.24;

export function measureTextLabel(text, size, font, curveSegments = BAKE_CURVE_SEGMENTS) {
    const g = new TextGeometry(text, { font, size, height: 0.001, curveSegments, bevelEnabled: false });
    g.computeBoundingBox();
    const w = g.boundingBox.max.x - g.boundingBox.min.x;
    const ascent = g.boundingBox.max.y;
    const descent = -g.boundingBox.min.y;
    const h = ascent + descent;
    g.dispose();
    return { w, h, ascent, descent };
}

export function wrapTextLines(text, size, maxW, font, curveSegments) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && measureTextLabel(candidate, size, font, curveSegments).w > maxW) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

export function getProjectDetailTitleLayout(item, font, curveSegments) {
    const metrics = measureTextLabel(item.title, PROJECT_DETAIL_TITLE_SIZE, font, curveSegments);
    return {
        ...metrics,
        x: -metrics.w / 2,
        y: CARD_HEIGHT / 2 - PROJECT_DETAIL_TOP_MARGIN - metrics.h,
    };
}

export function getProjectDetailDescriptionLayout(item, font, curveSegments) {
    if (!item.description) return null;
    const titleLayout = getProjectDetailTitleLayout(item, font, curveSegments);
    const lines = wrapTextLines(item.description, PROJECT_DETAIL_DESC_SIZE, PROJECT_DETAIL_DESC_MAX_W, font, curveSegments);
    const metaLayout = getProjectDetailMetaLayout(item, font, curveSegments);
    let minLineBottom = -CARD_HEIGHT / 2 + PROJECT_DETAIL_DESC_BOTTOM_MARGIN;
    if (metaLayout) {
        minLineBottom = Math.max(minLineBottom, metaLayout.top + PROJECT_DETAIL_META_DESC_GAP);
    }
    let lineY = titleLayout.y - PROJECT_DETAIL_TITLE_DESC_GAP;
    const lineLayouts = [];
    for (const line of lines) {
        const m = measureTextLabel(line, PROJECT_DETAIL_DESC_SIZE, font, curveSegments);
        lineY -= m.h;
        if (lineY < minLineBottom) break;
        lineLayouts.push({ line, x: -m.w / 2, y: lineY, w: m.w, h: m.h });
        lineY -= PROJECT_DETAIL_DESC_LINE_GAP;
    }
    if (lineLayouts.length === 0) return null;
    const minX = Math.min(...lineLayouts.map((l) => l.x));
    const maxX = Math.max(...lineLayouts.map((l) => l.x + l.w));
    const minY = Math.min(...lineLayouts.map((l) => l.y));
    const maxY = Math.max(...lineLayouts.map((l) => l.y + l.h));
    return { lines: lineLayouts, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function getProjectDetailMetaLayout(item, font, curveSegments) {
    const rows = getProjectDetailMetaList(item);
    if (!rows.length) return null;
    let y = PROJECT_DETAIL_META_BOTTOM;
    const lines = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const row of rows) {
        const m = measureTextLabel(row, PROJECT_DETAIL_META_SIZE, font, curveSegments);
        const line = { line: row, x: PROJECT_DETAIL_META_LEFT, y, w: m.w, h: m.h };
        lines.push(line);
        minX = Math.min(minX, line.x);
        minY = Math.min(minY, line.y);
        maxX = Math.max(maxX, line.x + line.w);
        maxY = Math.max(maxY, line.y + line.h);
        y += m.h + PROJECT_DETAIL_META_GAP;
    }
    return { lines, x: minX, y: minY, w: maxX - minX, h: maxY - minY, top: maxY };
}

export function buildProjectIndexLayout(items, font, curveSegments) {
    const metrics = items.map((item) => ({
        ...item,
        ...measureTextLabel(item.title, PROJECT_INDEX_SIZE, font, curveSegments),
    }));
    // Space by cap-line → next-line-top so mixed-case / descender titles don't look extra open.
    const totalH = metrics[0].ascent
        + metrics.slice(1).reduce((sum, m) => sum + m.ascent, 0)
        + metrics[metrics.length - 1].descent
        + PROJECT_INDEX_GAP * (metrics.length - 1);
    let baselineY = totalH / 2 - metrics[0].ascent;
    const entries = metrics.map((m, i) => {
        const entry = { ...m, x: -m.w / 2, y: baselineY };
        if (i < metrics.length - 1) {
            baselineY -= PROJECT_INDEX_GAP + metrics[i + 1].ascent;
        }
        return entry;
    });
    const backMetrics = measureTextLabel(BACK_LINK_LABEL, BACK_LINK_SIZE, font, curveSegments);
    const backLink = {
        label: BACK_LINK_LABEL,
        ...backMetrics,
        x: -CARD_WIDTH / 2 + 0.12,
        y: CARD_HEIGHT / 2 - 0.12 - backMetrics.h,
    };
    return { entries, backLink };
}

function createOrthoScene(worldW, worldH) {
    const orthoScene = new THREE.Scene();
    orthoScene.background = new THREE.Color(1, 1, 1);
    const orthoCamera = new THREE.OrthographicCamera(
        -worldW / 2, worldW / 2,
        worldH / 2, -worldH / 2,
        0.1, 10
    );
    orthoCamera.position.z = 1;
    orthoCamera.lookAt(0, 0, 0);
    return { orthoScene, orthoCamera };
}

function renderSceneToTarget(renderer, orthoScene, orthoCamera, worldW, worldH, textureSize) {
    const w = Math.round(textureSize);
    const h = Math.round(textureSize * (worldH / worldW));
    return renderTextMaskScene(renderer, orthoScene, orthoCamera, w, h, TEXT_MASK_SUPERSAMPLE);
}

let downsampleScene = null;
let downsampleCamera = null;
let downsampleMaterial = null;

function ensureDownsamplePass() {
    if (downsampleMaterial) return;
    downsampleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    downsampleScene = new THREE.Scene();
    downsampleMaterial = new THREE.ShaderMaterial({
        uniforms: { tMap: { value: null } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tMap;
            varying vec2 vUv;
            void main() {
                vec2 px = 1.0 / vec2(textureSize(tMap, 0));
                vec4 c = texture2D(tMap, vUv) * 0.2270270270;
                c += texture2D(tMap, vUv + vec2(px.x, 0.0)) * 0.1945945946;
                c += texture2D(tMap, vUv - vec2(px.x, 0.0)) * 0.1945945946;
                c += texture2D(tMap, vUv + vec2(0.0, px.y)) * 0.1216216216;
                c += texture2D(tMap, vUv - vec2(0.0, px.y)) * 0.1216216216;
                c += texture2D(tMap, vUv + px) * 0.0702702703;
                c += texture2D(tMap, vUv + vec2(-px.x, px.y)) * 0.0702702703;
                c += texture2D(tMap, vUv - px) * 0.0702702703;
                c += texture2D(tMap, vUv + vec2(px.x, -px.y)) * 0.0702702703;
                gl_FragColor = c;
            }
        `,
        depthTest: false,
        depthWrite: false,
    });
    downsampleScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), downsampleMaterial));
}

function clampSupersample(renderer, w, h, supersample) {
    const maxTex = renderer.capabilities.maxTextureSize || 8192;
    const ss = Math.max(1, Math.min(
        supersample,
        Math.floor(maxTex / w),
        Math.floor(maxTex / h),
    ));
    return ss;
}

export function renderTextMaskScene(renderer, orthoScene, orthoCamera, w, h, supersample = TEXT_MASK_SUPERSAMPLE, clearColor = 0xffffff) {
    const ss = clampSupersample(renderer, w, h, supersample);
    const msaa = renderer.capabilities.isWebGL2 ? 4 : 0;
    const clear = new THREE.Color(clearColor);

    const loRt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
        samples: ss === 1 ? msaa : 0,
    });

    const prevRt = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());

    if (ss === 1) {
        renderer.setRenderTarget(loRt);
        renderer.setClearColor(clear, 1);
        renderer.clear();
        renderer.render(orthoScene, orthoCamera);
        renderer.setRenderTarget(prevRt);
        renderer.setClearColor(prevClear);
        return { rt: loRt, w, h };
    }

    ensureDownsamplePass();
    const hw = w * ss;
    const hh = h * ss;
    const hiRt = new THREE.WebGLRenderTarget(hw, hh, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
        samples: msaa,
    });

    renderer.setRenderTarget(hiRt);
    renderer.setClearColor(clear, 1);
    renderer.clear();
    renderer.render(orthoScene, orthoCamera);

    downsampleMaterial.uniforms.tMap.value = hiRt.texture;
    renderer.setRenderTarget(loRt);
    renderer.setClearColor(clear, 1);
    renderer.clear();
    renderer.render(downsampleScene, downsampleCamera);

    renderer.setRenderTarget(prevRt);
    renderer.setClearColor(prevClear);
    hiRt.dispose();

    return { rt: loRt, w, h };
}

function addTextMesh(scene, text, size, x, y, font, curveSegments, inkMat) {
    const geom = new TextGeometry(text, {
        font,
        size,
        height: 0.002,
        curveSegments,
        bevelEnabled: false,
    });
    geom.computeBoundingBox();
    geom.translate(x - geom.boundingBox.min.x, y - geom.boundingBox.min.y, 0);
    scene.add(new THREE.Mesh(geom, inkMat));
}

export function renderProjectDetailTarget(renderer, font, item, projectIndexLayout, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });

    const titleLayout = getProjectDetailTitleLayout(item, font, curveSegments);
    addTextMesh(orthoScene, item.title, PROJECT_DETAIL_TITLE_SIZE, titleLayout.x, titleLayout.y, font, curveSegments, inkMat);

    const descLayout = getProjectDetailDescriptionLayout(item, font, curveSegments);
    if (descLayout) {
        for (const line of descLayout.lines) {
            addTextMesh(orthoScene, line.line, PROJECT_DETAIL_DESC_SIZE, line.x, line.y, font, curveSegments, inkMat);
        }
    }

    const metaLayout = getProjectDetailMetaLayout(item, font, curveSegments);
    if (metaLayout) {
        for (const line of metaLayout.lines) {
            addTextMesh(orthoScene, line.line, PROJECT_DETAIL_META_SIZE, line.x, line.y, font, curveSegments, inkMat);
        }
    }

    const back = projectIndexLayout.backLink;
    addTextMesh(orthoScene, back.label, BACK_LINK_SIZE, back.x, back.y, font, curveSegments, inkMat);

    return renderSceneToTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, CARD_HEIGHT, BAKE_TEXTURE_SIZE);
}

export function renderTitleMaskTarget(renderer, font, item, curveSegments = BAKE_CURVE_SEGMENTS) {
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    const titleLayout = getProjectDetailTitleLayout(item, font, curveSegments);
    addTextMesh(orthoScene, item.title, PROJECT_DETAIL_TITLE_SIZE, titleLayout.x, titleLayout.y, font, curveSegments, inkMat);
    return renderSceneToTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, CARD_HEIGHT, BAKE_TEXTURE_SIZE);
}

export function renderDescMaskTarget(renderer, font, item, curveSegments = BAKE_CURVE_SEGMENTS) {
    const descLayout = getProjectDetailDescriptionLayout(item, font, curveSegments);
    if (!descLayout) return null;
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    for (const line of descLayout.lines) {
        addTextMesh(orthoScene, line.line, PROJECT_DETAIL_DESC_SIZE, line.x, line.y, font, curveSegments, inkMat);
    }
    return renderSceneToTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, CARD_HEIGHT, BAKE_TEXTURE_SIZE);
}

export function readRenderTargetPixels(renderer, rt, w, h) {
    const pixels = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
    rt.dispose();
    return pixels;
}
