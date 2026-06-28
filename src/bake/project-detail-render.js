import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { buildProjectDetailFooter, PROJECT_DETAIL_SIDE_MARGIN } from '../project-index-data.js';

export const BAKE_TEXTURE_SIZE = 1024;
export const BAKE_CURVE_SEGMENTS = 64;
export const TEXT_MASK_SUPERSAMPLE = 2;
export const TEXT_MASK_SUPERSAMPLE_DESKTOP = 2;

export const CARD_WIDTH = 4;
export const CARD_HEIGHT = 2.5;

export const BACK_LINK_LABEL = 'back';
export const BACK_LINK_LIST_LABEL = '↢';
export const BACK_LINK_SIZE = 0.13 * 0.82;

export function measureBackListArrow(size = BACK_LINK_SIZE) {
    const w = size * 1.36;
    const h = size * 0.66;
    return { w, h, ascent: h, descent: 0 };
}

export function addBackListArrowMesh(scene, x, y, size, inkMat) {
    const { w, h } = measureBackListArrow(size);
    const stroke = size * 0.105;
    const shaftY = y + stroke * 0.42;
    const headLen = w * 0.27;
    const shaftLen = w - headLen - stroke * 0.15;
    const headSpread = stroke * 1.55;

    const headShape = new THREE.Shape();
    headShape.moveTo(x, shaftY + stroke / 2);
    headShape.lineTo(x + headLen, shaftY + stroke / 2 + headSpread);
    headShape.lineTo(x + headLen, shaftY + stroke / 2 - headSpread);
    headShape.closePath();
    scene.add(new THREE.Mesh(new THREE.ShapeGeometry(headShape), inkMat));

    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(shaftLen, stroke), inkMat);
    shaft.position.set(x + headLen + shaftLen / 2, shaftY + stroke / 2, 0);
    scene.add(shaft);

    const tailH = size * 0.3;
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(stroke * 0.9, tailH), inkMat);
    tail.position.set(x + headLen + shaftLen, shaftY + stroke / 2 + tailH / 2, 0);
    scene.add(tail);
}
export const PROJECT_INDEX_SIZE = 0.13 * 0.82;

export const PROJECT_DETAIL_TITLE_SIZE = PROJECT_INDEX_SIZE * 1.04;
export const PROJECT_DETAIL_TOP_MARGIN = 0.2;
export const PROJECT_DETAIL_TITLE_DESC_GAP = 0.11;
export const PROJECT_DETAIL_DESC_SIZE = 0.13 * 0.58;
export const PROJECT_DETAIL_DESC_MAX_W = CARD_WIDTH - PROJECT_DETAIL_SIDE_MARGIN * 2;
export const PROJECT_DETAIL_DESC_LINE_GAP = 0.072;
export const PROJECT_DETAIL_META_FOOTER_SIZE = 0.13 * 0.48;
export const PROJECT_DETAIL_META_CREDIT_SIZE = 0.13 * 0.44;
export const PROJECT_DETAIL_META_FOOTER_BOTTOM = -CARD_HEIGHT / 2 + 0.13;
export const PROJECT_DETAIL_META_CREDIT_FOOTER_GAP = 0.038;
export const PROJECT_DETAIL_META_DESC_GAP = 0.1;
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
        x: -CARD_WIDTH / 2 + PROJECT_DETAIL_SIDE_MARGIN,
        y: CARD_HEIGHT / 2 - PROJECT_DETAIL_TOP_MARGIN - metrics.h,
    };
}

export function getProjectDetailDescriptionLayout(item, font, curveSegments) {
    if (!item.description) return null;
    const titleLayout = getProjectDetailTitleLayout(item, font, curveSegments);
    const lines = wrapTextLines(item.description, PROJECT_DETAIL_DESC_SIZE, PROJECT_DETAIL_DESC_MAX_W, font, curveSegments);
    const metaLayout = getProjectDetailMetaLayout(item, font, curveSegments);
    const minLineBottom = metaLayout
        ? metaLayout.top + PROJECT_DETAIL_META_DESC_GAP
        : PROJECT_DETAIL_META_FOOTER_BOTTOM + PROJECT_DETAIL_META_DESC_GAP;
    let lineY = titleLayout.y - PROJECT_DETAIL_TITLE_DESC_GAP;
    const lineLayouts = [];
    const descLeft = -CARD_WIDTH / 2 + PROJECT_DETAIL_SIDE_MARGIN;
    for (const line of lines) {
        const m = measureTextLabel(line, PROJECT_DETAIL_DESC_SIZE, font, curveSegments);
        lineY -= m.h;
        if (lineY < minLineBottom) break;
        lineLayouts.push({ line, x: descLeft, y: lineY, w: m.w, h: m.h });
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
    const footer = buildProjectDetailFooter(item);
    const hasFooter = footer.link || footer.category || footer.year;
    const hasCredits = footer.credits.length > 0;
    if (!hasFooter && !hasCredits) return null;

    const lines = [];
    const leftX = -CARD_WIDTH / 2 + PROJECT_DETAIL_SIDE_MARGIN;
    const rightX = CARD_WIDTH / 2 - PROJECT_DETAIL_SIDE_MARGIN;
    const footerY = PROJECT_DETAIL_META_FOOTER_BOTTOM;
    const footerSize = PROJECT_DETAIL_META_FOOTER_SIZE;
    const footerLineH = hasFooter
        ? measureTextLabel('Ag', footerSize, font, curveSegments).h
        : 0;

    if (hasFooter) {
        if (footer.link) {
            const m = measureTextLabel(footer.link.text, footerSize, font, curveSegments);
            lines.push({
                line: footer.link.text,
                x: leftX,
                y: footerY,
                w: m.w,
                h: m.h,
                size: footerSize,
                role: 'footer-link',
            });
        }
        if (footer.category) {
            const m = measureTextLabel(footer.category, footerSize, font, curveSegments);
            lines.push({ line: footer.category, x: -m.w / 2, y: footerY, w: m.w, h: m.h, size: footerSize });
        }
        if (footer.year) {
            const m = measureTextLabel(footer.year, footerSize, font, curveSegments);
            lines.push({ line: footer.year, x: rightX - m.w, y: footerY, w: m.w, h: m.h, size: footerSize });
        }
    }

    if (hasCredits) {
        const creditSize = PROJECT_DETAIL_META_CREDIT_SIZE;
        const creditText = footer.credits.join(' · ');
        const creditM = measureTextLabel(creditText, creditSize, font, curveSegments);
        const creditMaxW = CARD_WIDTH - PROJECT_DETAIL_SIDE_MARGIN * 2;
        let creditY = footerY + footerLineH + PROJECT_DETAIL_META_CREDIT_FOOTER_GAP;

        if (creditM.w <= creditMaxW) {
            lines.push({
                line: creditText,
                x: leftX,
                y: creditY,
                w: creditM.w,
                h: creditM.h,
                size: creditSize,
            });
        } else {
            for (const credit of footer.credits) {
                const m = measureTextLabel(credit, creditSize, font, curveSegments);
                creditY += m.h;
                lines.push({ line: credit, x: leftX, y: creditY, w: m.w, h: m.h, size: creditSize });
                creditY += PROJECT_DETAIL_META_CREDIT_FOOTER_GAP * 0.6;
            }
        }
    }

    const minX = Math.min(...lines.map((line) => line.x));
    const minY = Math.min(...lines.map((line) => line.y));
    const maxX = Math.max(...lines.map((line) => line.x + line.w));
    const maxY = Math.max(...lines.map((line) => line.y + line.h));

    const linkLine = lines.find((line) => line.role === 'footer-link');

    return {
        lines,
        linkLayout: linkLine ? { x: linkLine.x, y: linkLine.y, w: linkLine.w, h: linkLine.h } : null,
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        top: maxY,
    };
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
    const arrowMetrics = measureBackListArrow(BACK_LINK_SIZE);
    const last = entries[entries.length - 1];
    const lastMidY = last.y + (last.ascent - last.descent) / 2;
    const backLink = {
        label: BACK_LINK_LIST_LABEL,
        isArrow: true,
        ...arrowMetrics,
        x: -CARD_WIDTH / 2 + PROJECT_DETAIL_SIDE_MARGIN,
        y: lastMidY - arrowMetrics.h / 2,
    };
    const backDetailMetrics = measureTextLabel(BACK_LINK_LABEL, BACK_LINK_SIZE, font, curveSegments);
    const backLinkDetail = {
        label: BACK_LINK_LABEL,
        ...backDetailMetrics,
        x: CARD_WIDTH / 2 - PROJECT_DETAIL_SIDE_MARGIN - backDetailMetrics.w,
        y: CARD_HEIGHT / 2 - PROJECT_DETAIL_TOP_MARGIN - backDetailMetrics.h,
    };
    return { entries, backLink, backLinkDetail };
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
            addTextMesh(orthoScene, line.line, line.size, line.x, line.y, font, curveSegments, inkMat);
        }
    }

    const back = projectIndexLayout.backLinkDetail;
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

export function renderFooterLinkMaskTarget(renderer, font, item, curveSegments = BAKE_CURVE_SEGMENTS) {
    const metaLayout = getProjectDetailMetaLayout(item, font, curveSegments);
    const linkLine = metaLayout?.lines.find((line) => line.role === 'footer-link');
    if (!linkLine) return null;
    const { orthoScene, orthoCamera } = createOrthoScene(CARD_WIDTH, CARD_HEIGHT);
    const inkMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: true, depthWrite: true });
    addTextMesh(orthoScene, linkLine.line, linkLine.size, linkLine.x, linkLine.y, font, curveSegments, inkMat);
    return renderSceneToTarget(renderer, orthoScene, orthoCamera, CARD_WIDTH, CARD_HEIGHT, BAKE_TEXTURE_SIZE);
}

export function readRenderTargetPixels(renderer, rt, w, h) {
    const pixels = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
    rt.dispose();
    return pixels;
}
