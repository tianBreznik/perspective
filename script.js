import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// Import fonts
import inriaSerifFont from './src/assets/fonts/Baskervville Medium_Regular.json';
import baskervvilleRegular from './src/assets/fonts/Baskervville_Regular.json';

// Import texture files
import colorMap from './src/assets/textures/Paper001_2K-JPG/Paper001_2K-JPG_Color.jpg';
import normalMap from './src/assets/textures/Paper001_2K-JPG/Paper001_2K-JPG_NormalGL.jpg';
import roughnessMap from './src/assets/textures/Paper001_2K-JPG/Paper001_2K-JPG_Roughness.jpg';
import displacementMap from './src/assets/textures/Paper001_2K-JPG/Paper001_2K-JPG_Displacement.jpg';
import stickerSrc from './src/assets/reretouchedemoji.png';
import mbosGifSrc from './src/assets/textures/Paper001_2K-JPG/mbOS.gif';
import walletPassUrl from './perspective-card.pkpass?url';
import { PROJECT_INDEX_ITEMS, projectTextureUrl } from './src/project-index-data.js';
import {
    buildProjectIndexLayout,
    getProjectDetailDescriptionLayout as layoutProjectDetailDescription,
    getProjectDetailTitleLayout as layoutProjectDetailTitle,
} from './src/bake/project-detail-render.js';

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || window.innerWidth <= 768;
}

// Mobile keeps smaller iframe layout + section dialogs; rendering quality is shared
// now that project detail text is pre-baked (no runtime TextGeometry warmup).
const IS_MOBILE = isMobileDevice();
const TEXTURE_SIZE = 2048;
const TEXT_CURVE_SEGMENTS = 64;
const CARD_MESH_SEGMENTS = 64;
const MAX_DEVICE_PIXEL_RATIO = IS_MOBILE ? Math.min(window.devicePixelRatio || 1, 1.5) : (window.devicePixelRatio || 1);
const PAPER_ANISOTROPY = 16;
const DISPLACEMENT_SCALE = 0.025;
const STICKER_DUST_STRIDE = IS_MOBILE ? 2 : 1;

// Scene setup
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(MAX_DEVICE_PIXEL_RATIO);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

// Business card dimensions
const cardWidth = 4;
const cardHeight = 2.5;
const cardDepth = 0.001;

// Load all texture maps
const textureLoader = new THREE.TextureLoader();

function configureTexture(tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.0, 2.0);
    tex.flipY = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(PAPER_ANISOTROPY, maxAnisotropy);
}

const paperColorTexture = textureLoader.load(colorMap, configureTexture);
const paperNormalTexture = textureLoader.load(normalMap, configureTexture);
const paperRoughnessTexture = textureLoader.load(roughnessMap, configureTexture);
const paperDisplacementTexture = textureLoader.load(displacementMap, configureTexture);
[paperColorTexture, paperNormalTexture, paperRoughnessTexture, paperDisplacementTexture].forEach(configureTexture);

// --- Text mask texture generation (runs after renderer context is ready) ---
const fontLoader = new FontLoader();
const font = fontLoader.parse(inriaSerifFont);
const baskervvilleFont = fontLoader.parse(baskervvilleRegular);

const textureAspect = cardWidth / cardHeight;

function renderTextToTexture(textItems, opts = {}) {
    const worldW = opts.worldWidth || cardWidth;
    const worldH = opts.worldHeight || cardHeight;
    const w = opts.width || Math.round(TEXTURE_SIZE);
    const h = opts.height || Math.round(TEXTURE_SIZE * (worldH / worldW));
    const rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: true,
    });

    const orthoScene = new THREE.Scene();
    orthoScene.background = new THREE.Color(1, 1, 1);
    const orthoCamera = new THREE.OrthographicCamera(
        -worldW / 2, worldW / 2,
        worldH / 2, -worldH / 2,
        0.1, 10
    );
    orthoCamera.position.z = 1;
    orthoCamera.lookAt(0, 0, 0);

    const textMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        depthTest: true,
        depthWrite: true,
    });

    for (const item of textItems) {
        const geom = new TextGeometry(item.text, {
            font: item.font,
            size: item.size,
            height: 0.002,
            curveSegments: TEXT_CURVE_SEGMENTS,
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
                0
            );
        }
        const mesh = new THREE.Mesh(geom, textMat);
        orthoScene.add(mesh);
    }

    // Use main renderer - textures must stay in same WebGL context
    const prevRt = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(orthoScene, orthoCamera);
    renderer.setRenderTarget(prevRt);
    renderer.setClearColor(prevClear);

    rt.texture.flipY = false;
    rt.texture.wrapS = THREE.ClampToEdgeWrapping;
    rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.generateMipmaps = true;
    rt.texture.anisotropy = Math.min(16, maxAnisotropy);
    return rt.texture;
}

function renderProjectIndexToTexture(layout) {
    const worldW = cardWidth;
    const worldH = cardHeight;
    const w = Math.round(TEXTURE_SIZE);
    const h = Math.round(TEXTURE_SIZE * (worldH / worldW));
    const rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: true,
    });

    const orthoScene = new THREE.Scene();
    orthoScene.background = new THREE.Color(1, 1, 1);
    const orthoCamera = new THREE.OrthographicCamera(
        -worldW / 2, worldW / 2,
        worldH / 2, -worldH / 2,
        0.1, 10
    );
    orthoCamera.position.z = 1;
    orthoCamera.lookAt(0, 0, 0);

    const textMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        depthTest: true,
        depthWrite: true,
    });

    for (const entry of layout.entries) {
        const geom = new TextGeometry(entry.title, {
            font: backButtonFont,
            size: PROJECT_INDEX_SIZE,
            height: 0.002,
            curveSegments: TEXT_CURVE_SEGMENTS,
            bevelEnabled: false,
        });
        geom.computeBoundingBox();
        geom.translate(entry.x - geom.boundingBox.min.x, entry.y, 0);
        orthoScene.add(new THREE.Mesh(geom, textMat));
    }

    const back = layout.backLink;
    const backGeom = new TextGeometry(back.label, {
        font: backButtonFont,
        size: BACK_LINK_SIZE,
        height: 0.002,
        curveSegments: TEXT_CURVE_SEGMENTS,
        bevelEnabled: false,
    });
    backGeom.computeBoundingBox();
    backGeom.translate(back.x - backGeom.boundingBox.min.x, back.y - backGeom.boundingBox.min.y, 0);
    orthoScene.add(new THREE.Mesh(backGeom, textMat));

    const prevRt = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(orthoScene, orthoCamera);
    renderer.setRenderTarget(prevRt);
    renderer.setClearColor(prevClear);

    rt.texture.flipY = false;
    rt.texture.wrapS = THREE.ClampToEdgeWrapping;
    rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.generateMipmaps = true;
    rt.texture.anisotropy = Math.min(16, maxAnisotropy);
    return rt.texture;
}

function wrapTextLines(text, size, maxW) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? current + ' ' + word : word;
        if (current && measureTextLabel(candidate, size).w > maxW) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function getProjectDetailTitleLayout(item) {
    return layoutProjectDetailTitle(item, backButtonFont, TEXT_CURVE_SEGMENTS);
}

function getProjectDetailDescriptionLayout(item) {
    return layoutProjectDetailDescription(item, backButtonFont, TEXT_CURVE_SEGMENTS);
}

function configureBakedProjectTexture(tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    // PNGs from the baker are top-left origin; Three.js image textures need flipY true
    // (runtime render-target textures used flipY false — different upload path).
    tex.flipY = true;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(16, maxAnisotropy);
    tex.needsUpdate = true;
}

function preloadProjectDetailTextures() {
    projectIndexItems.forEach((item, i) => {
        if (!item.url && !item.image) return;
        textureLoader.load(projectTextureUrl(item.slug, 'detail'), (tex) => {
            configureBakedProjectTexture(tex);
            projectDetailTextureCache.set(i, tex);
            if (activeProjectIndex === i && backFaceTarget === 'project') {
                backFaceTextures.project = tex;
                if (backInkBlendUniforms) backInkBlendUniforms.uTo.value = tex;
                lastInkRenderProgress = -1;
                updateBackFaceTextMask();
            }
        });
    });
}

function loadBakedMaskTexture(slug, name, onLoad) {
    textureLoader.load(projectTextureUrl(slug, name), (tex) => {
        configureBakedProjectTexture(tex);
        onLoad(tex);
    });
}

function randomSaturatedColor() {
    const h = Math.random() * 360;
    const s = 0.85;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return new THREE.Color(r + m, g + m, b + m);
}

function buildLetterMeshes(text, textFont, size, colorFn) {
    const letters = text.split('');
    const group = new THREE.Group();
    let xOffset = 0;
    for (let i = 0; i < letters.length; i++) {
        const geom = new TextGeometry(letters[i], {
            font: textFont,
            size,
            height: 0.002,
            curveSegments: 32,
            bevelEnabled: false,
        });
        geom.computeBoundingBox();
        const w2 = geom.boundingBox.max.x - geom.boundingBox.min.x;
        const cy = (geom.boundingBox.min.y + geom.boundingBox.max.y) / 2;
        geom.translate(xOffset - geom.boundingBox.min.x, -cy, 0);
        xOffset += w2;

        const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
            color: colorFn(i),
            depthTest: true,
            depthWrite: true,
        }));
        group.add(mesh);
    }
    group.position.x = -xOffset / 2;
    return group;
}

function renderPerspectiveTextures(textFont, size) {
    const w = Math.round(TEXTURE_SIZE);
    const h = Math.round(TEXTURE_SIZE / textureAspect);
    const orthoCamera = new THREE.OrthographicCamera(
        -cardWidth / 2, cardWidth / 2,
        cardHeight / 2, -cardHeight / 2,
        0.1, 10
    );
    orthoCamera.position.z = 1;
    orthoCamera.lookAt(0, 0, 0);

    const maskGroup = buildLetterMeshes('Perspective', textFont, size, () => 0x000000);
    const colors = 'Perspective'.split('').map(() => randomSaturatedColor());
    const colorGroup = buildLetterMeshes('Perspective', textFont, size, i => colors[i]);

    const rtMask = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType, generateMipmaps: true,
    });
    const rtColors = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType, generateMipmaps: true,
    });

    const prevRt = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());

    const sceneMask = new THREE.Scene();
    sceneMask.background = new THREE.Color(1, 1, 1);
    sceneMask.add(maskGroup);
    renderer.setRenderTarget(rtMask);
    renderer.setClearColor(1, 1, 1, 1);
    renderer.clear();
    renderer.render(sceneMask, orthoCamera);

    const sceneColors = new THREE.Scene();
    sceneColors.background = new THREE.Color(0, 0, 0);
    sceneColors.add(colorGroup);
    renderer.setRenderTarget(rtColors);
    renderer.setClearColor(0, 0, 0, 1);
    renderer.clear();
    renderer.render(sceneColors, orthoCamera);

    renderer.setRenderTarget(prevRt);
    renderer.setClearColor(prevClear);

    [rtMask.texture, rtColors.texture].forEach(tex => {
        tex.flipY = false;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = Math.min(16, maxAnisotropy);
    });

    return { mask: rtMask.texture, colors: rtColors.texture };
}

// Back: quote, attribution, contact email layout
const quoteTextSize = 0.08;
const quoteX = -cardWidth / 2 + 0.15;
const quoteY = -cardHeight / 2 + 0.25;
const _quoteGeom = new TextGeometry('"Did I lose my perspective?"', {
    font: baskervvilleFont, size: quoteTextSize, height: 0.001, curveSegments: 20, bevelEnabled: false
});
_quoteGeom.computeBoundingBox();
const quoteHeight = _quoteGeom.boundingBox.max.y - _quoteGeom.boundingBox.min.y;
_quoteGeom.dispose();

const attributionY = quoteY - quoteHeight - 0.02;

// Email on back face, bottom-right area
const emailText = 'tian@perspective.credit';
const _emailGeom = new TextGeometry(emailText, {
    font: baskervvilleFont, size: quoteTextSize, height: 0.001, curveSegments: 20, bevelEnabled: false
});
_emailGeom.computeBoundingBox();
const emailWidth = _emailGeom.boundingBox.max.x - _emailGeom.boundingBox.min.x;
const emailHeight = _emailGeom.boundingBox.max.y - _emailGeom.boundingBox.min.y;
_emailGeom.dispose();
const emailX = cardWidth / 2 - 0.15 - emailWidth;
const emailY = quoteY;

// Back nav buttons (centered, horizontal row)
const backButtonSize = 0.13;
const backButtonSpacing = 0.3;
const backButtonY = 0; // vertically centered
const backButtons = ['INFO', 'PROJECTS', 'CV'];
const backButtonFont = font;
const backButtonMetrics = backButtons.map((label) => {
    const _g = new TextGeometry(label, { font: backButtonFont, size: backButtonSize, height: 0.001, curveSegments: TEXT_CURVE_SEGMENTS, bevelEnabled: false });
    _g.computeBoundingBox();
    const w = _g.boundingBox.max.x - _g.boundingBox.min.x;
    const h = _g.boundingBox.max.y - _g.boundingBox.min.y;
    _g.dispose();
    return { label, w, h };
});
const totalButtonsWidth = backButtonMetrics.reduce((sum, m) => sum + m.w, 0) + backButtonSpacing * (backButtons.length - 1);
let bx = -totalButtonsWidth / 2;
const backButtonPositions = backButtonMetrics.map((m) => {
    const pos = { x: bx, y: backButtonY };
    bx += m.w + backButtonSpacing;
    return pos;
});

const projectIndexItems = PROJECT_INDEX_ITEMS.map((item) =>
    item.slug === 'maribor-on-sea' ? { ...item, image: mbosGifSrc } : item
);
const PROJECT_INDEX_SIZE = backButtonSize * 0.82;
const BACK_LINK_LABEL = 'back';
const BACK_LINK_SIZE = backButtonSize * 0.82;

// Project detail view — title + description on card back; live site fills the viewport behind the card.

function measureTextLabel(text, size, typeface = backButtonFont) {
    const g = new TextGeometry(text, { font: typeface, size, height: 0.001, curveSegments: TEXT_CURVE_SEGMENTS, bevelEnabled: false });
    g.computeBoundingBox();
    const w = g.boundingBox.max.x - g.boundingBox.min.x;
    const ascent = g.boundingBox.max.y;
    const descent = -g.boundingBox.min.y;
    const h = ascent + descent;
    g.dispose();
    return { w, h, ascent, descent };
}

const projectIndexLayout = buildProjectIndexLayout(projectIndexItems, backButtonFont, TEXT_CURVE_SEGMENTS);

const BACK_UV_FLIP_X = true;
const hoverUniform = { value: 0 };
const backHoverUniform = { value: 0 };
const backButtonHoverUniforms = backButtons.map(() => ({ value: 0 }));
const noHoverUniform = { value: 0 };
const HOVER_LERP = 0.28;

function createEngravedMaterial(baseProps, textMaskTexture, flipBackUV = false, letterColorsTexture = null, enableHover = true, hoverUniformOverride = null, emailMaskTexture = null, textMaskUniform = null) {
    const mat = new THREE.MeshStandardMaterial({
        ...baseProps,
        map: paperColorTexture,
        emissiveMap: paperColorTexture,
        emissive: 0xffffff,
        emissiveIntensity: 0.65,
        normalMap: paperNormalTexture,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughnessMap: paperRoughnessTexture,
        ...(paperDisplacementTexture ? { displacementMap: paperDisplacementTexture, displacementScale: DISPLACEMENT_SCALE } : {}),
        roughness: 0.6,
        metalness: 0,
    });

    const hoverSource = enableHover ? (hoverUniformOverride || hoverUniform) : noHoverUniform;

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTextMask = textMaskUniform || { value: textMaskTexture };
        shader.uniforms.uHover = hoverSource;
        if (letterColorsTexture) shader.uniforms.uLetterColors = { value: letterColorsTexture };
        if (emailMaskTexture) shader.uniforms.uEmailMask = { value: emailMaskTexture };

        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_pars_vertex>',
            '#include <uv_pars_vertex>\nvarying vec2 vEngravedUv;'
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>',
            '#include <uv_vertex>\nvEngravedUv = uv;'
        );
        let uniformDecl = letterColorsTexture
            ? 'uniform sampler2D uTextMask;\nuniform sampler2D uLetterColors;\nuniform float uHover;\nvarying vec2 vEngravedUv;\n'
            : 'uniform sampler2D uTextMask;\nuniform float uHover;\nvarying vec2 vEngravedUv;\n';
        if (emailMaskTexture) uniformDecl += 'uniform sampler2D uEmailMask;\n';
        shader.fragmentShader = uniformDecl + shader.fragmentShader;

        const uvSample = flipBackUV ? 'vec2(1.0 - vEngravedUv.x, vEngravedUv.y)' : 'vEngravedUv';
        const hoverColor = letterColorsTexture
            ? 'texture2D(uLetterColors, ' + uvSample + ').rgb'
            : (emailMaskTexture ? 'vec3(0.25, 0.45, 0.95)' : 'vec3(0.04, 0.08, 0.5)');
        const emailGate = emailMaskTexture
            ? `float inEmailRect = 1.0 - smoothstep(0.3, 0.6, texture2D(uEmailMask, ${uvSample}).r);`
            : 'float inEmailRect = 1.0;';
        const inject = `
            vec4 textSample = texture2D(uTextMask, ${uvSample});
            float raw = 1.0 - textSample.r;
            float inText = smoothstep(-0.05, 0.95, raw);
            ${emailGate}
            float hoverAmount = inText * inEmailRect * uHover;
            float darken = inText * (1.0 - hoverAmount * 0.5) * 1.0;
            vec3 darkened = outgoingLight * (1.0 - darken);
            vec3 hoverColor = ${hoverColor};
            outgoingLight = mix(darkened, hoverColor, hoverAmount * 1.0);
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `${inject}\n\t#include <opaque_fragment>`
        );
    };

    return mat;
}

const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: paperColorTexture,
    emissiveMap: paperColorTexture,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    normalMap: paperNormalTexture,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughnessMap: paperRoughnessTexture,
    ...(paperDisplacementTexture ? { displacementMap: paperDisplacementTexture, displacementScale: DISPLACEMENT_SCALE } : {}),
    roughness: 0.6,
    metalness: 0,
});

let card;
let walletTextMaskTexture = null;
// Ink dissolve always runs 0 -> 1, from the previously settled face to the target face.
let backInkProgress = { value: 1 };
let backFaceTarget = 'home'; // 'home' | 'projects' | 'project'
const backFaceTextures = { home: null, projects: null, project: null };
let activeProjectItem = null;
let activeProjectIndex = -1;
const projectDetailTextureCache = new Map();
const BACK_INK_SPEED = 1.85;
const backTextMaskUniform = { value: null };
let backHomeTextTexture = null;
let backProjectsTextTexture = null;
let backInkBlendTarget = null;
let backInkBlendScene = null;
let backInkBlendCamera = null;
let backInkBlendUniforms = null;

function initBackInkBlend() {
    const w = Math.round(TEXTURE_SIZE);
    const h = Math.round(TEXTURE_SIZE * (cardHeight / cardWidth));
    backInkBlendTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
    });
    backInkBlendTarget.texture.flipY = false;
    backInkBlendTarget.texture.wrapS = THREE.ClampToEdgeWrapping;
    backInkBlendTarget.texture.wrapT = THREE.ClampToEdgeWrapping;
    backInkBlendTarget.texture.anisotropy = Math.min(16, maxAnisotropy);

    backInkBlendUniforms = {
        uFrom: { value: backHomeTextTexture },
        uTo: { value: backHomeTextTexture },
        uProgress: { value: 1 },
    };

    backInkBlendScene = new THREE.Scene();
    backInkBlendCamera = new THREE.OrthographicCamera(
        -cardWidth / 2, cardWidth / 2,
        cardHeight / 2, -cardHeight / 2,
        0.1, 10
    );
    backInkBlendCamera.position.z = 1;
    backInkBlendCamera.lookAt(0, 0, 0);

    const blendMat = new THREE.ShaderMaterial({
        uniforms: backInkBlendUniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uFrom;
            uniform sampler2D uTo;
            uniform float uProgress;
            varying vec2 vUv;

            float inkHash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float inkNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                float a = inkHash(i);
                float b = inkHash(i + vec2(1.0, 0.0));
                float c = inkHash(i + vec2(0.0, 1.0));
                float d = inkHash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }

            float inkGrain(vec2 p) {
                float v = 0.0;
                float amp = 0.55;
                for (int i = 0; i < 3; i++) {
                    v += amp * inkNoise(p);
                    p *= 2.05;
                    amp *= 0.5;
                }
                return v;
            }

            void main() {
                vec4 fromTex = texture2D(uFrom, vUv);
                vec4 toTex = texture2D(uTo, vUv);

                float grain = inkGrain(vUv * 14.0);
                float dissolve = uProgress < 0.001 ? 0.0 : (
                    uProgress > 0.999 ? 1.0 : (1.0 - smoothstep(uProgress - 0.12, uProgress + 0.06, grain))
                );
                vec4 blended = mix(fromTex, toTex, dissolve);

                float fromInk = 1.0 - fromTex.r;
                float toInk = 1.0 - toTex.r;
                float inkBody = max(mix(fromInk, toInk, dissolve), 0.0);
                float bleedEdge = 4.0 * dissolve * (1.0 - dissolve);
                float settling = 1.0 - abs(uProgress - 0.5) * 1.35;
                float wetInk = inkBody * bleedEdge * settling * 0.42;

                gl_FragColor = vec4(blended.rgb * (1.0 - wetInk), 1.0);
            }
        `,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(cardWidth, cardHeight), blendMat);
    backInkBlendScene.add(quad);
}

let lastInkRenderProgress = -1;

function updateBackFaceTextMask() {
    if (!backHomeTextTexture || !backProjectsTextTexture) return;
    if (!backInkBlendTarget) initBackInkBlend();
    // The composite only changes while the ink is moving; once progress snaps
    // to 1 the last rendered state is final, so skip the 2K pass entirely.
    if (backInkProgress.value === lastInkRenderProgress) return;
    lastInkRenderProgress = backInkProgress.value;
    backInkBlendUniforms.uProgress.value = backInkProgress.value;
    const prevRt = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    renderer.setRenderTarget(backInkBlendTarget);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(backInkBlendScene, backInkBlendCamera);
    renderer.setRenderTarget(prevRt);
    renderer.setClearColor(prevClear);
    backTextMaskUniform.value = backInkBlendTarget.texture;
}

let backHomeHoverPlanes = [];
let backProjectsHoverPlanes = [];
let backProjectDetailHoverPlanes = [];
let backProjectDetailDescHoverPlanes = [];
let backProjectDetailOverlays = [];
let backProjectDetailDescOverlays = [];
let backEmailOverlay = null;
let backButtonOverlays = [];
let backProjectsOverlays = [];
let projectIndexHoverUniforms = [];
let projectDetailTitleHoverUniforms = projectIndexItems.map(() => ({ value: 0 }));
let projectDetailWriteUpHoverUniforms = projectIndexItems.map(() => ({ value: 0 }));
let backLinkHoverUniform = { value: 0 };
let hoveringProjectIndex = -1;
let hoveringProjectTitle = false;
let hoveringProjectWriteUp = false;
let hoveringBackLink = false;

function isBackInkTransitioning() {
    return backInkProgress.value < 0.98;
}

function isBackProjectsActive() {
    return backFaceTarget === 'projects' && backInkProgress.value > 0.88;
}

function isBackHomeActive() {
    return backFaceTarget === 'home' && backInkProgress.value > 0.88;
}

function isBackProjectDetailActive() {
    return backFaceTarget === 'project' && backInkProgress.value > 0.88;
}

function transitionBackFace(state) {
    if (state === backFaceTarget) return;
    if (backInkBlendUniforms) {
        backInkBlendUniforms.uFrom.value = backFaceTextures[backFaceTarget];
        backInkBlendUniforms.uTo.value = backFaceTextures[state];
    }
    backInkProgress.value = 0;
    backFaceTarget = state;
    resetBackHoverState();
}

function resetBackHoverState() {
    hoveringBackButton = -1;
    hoveringProjectIndex = -1;
    hoveringProjectTitle = false;
    hoveringProjectWriteUp = false;
    hoveringBackLink = false;
    backButtonHoverUniforms.forEach((u) => { u.value = 0; });
    projectIndexHoverUniforms.forEach((u) => { u.value = 0; });
    projectDetailTitleHoverUniforms.forEach((u) => { u.value = 0; });
    projectDetailWriteUpHoverUniforms.forEach((u) => { u.value = 0; });
    backLinkHoverUniform.value = 0;
}

function openBackProjectsIndex() {
    transitionBackFace('projects');
}

function closeBackProjectsIndex() {
    transitionBackFace('home');
}

function getProjectDetailTexture(index) {
    const cached = projectDetailTextureCache.get(index);
    if (cached) return cached;
    return backProjectsTextTexture;
}

function openProjectDetail(index) {
    const item = projectIndexItems[index];
    if (!item || (!item.url && !item.image)) return;
    activeProjectIndex = index;
    backFaceTextures.project = getProjectDetailTexture(index);
    activeProjectItem = item;
    commitProjectFrameContent(item);
    projectFrameMode = 'in';
    projectFrameEl.style.visibility = 'visible';
    transitionBackFace('project');
}

function closeProjectDetail() {
    projectFrameMode = 'out';
    transitionBackFace('projects');
}

function updateBackHoverPlaneVisibility() {
    const { backVisible } = card ? getCardFaceVisibility() : { backVisible: false };
    const showHomeNav = backFaceTarget === 'home' && backVisible;
    const showHomeInk = isBackHomeActive();
    const showProjects = isBackProjectsActive();
    const showDetail = isBackProjectDetailActive();
    const showBackLink = showProjects || showDetail;
    backHomeHoverPlanes.forEach((plane) => { plane.visible = showHomeNav; });
    backProjectsHoverPlanes.forEach((plane) => {
        plane.visible = plane.userData.kind === 'backLink' ? showBackLink : showProjects;
    });
    backProjectDetailHoverPlanes.forEach((plane) => {
        plane.visible = showDetail && plane.userData.projectIndex === activeProjectIndex;
    });
    backProjectDetailDescHoverPlanes.forEach((plane) => {
        plane.visible = showDetail && plane.userData.projectIndex === activeProjectIndex;
    });
    if (backEmailOverlay) backEmailOverlay.visible = showHomeInk;
    backButtonOverlays.forEach((mesh) => { mesh.visible = showHomeInk; });
    backProjectsOverlays.forEach((mesh) => {
        mesh.visible = mesh.userData.isBackLinkOverlay ? showBackLink : showProjects;
    });
    backProjectDetailOverlays.forEach((mesh) => {
        mesh.visible = showDetail && mesh.userData.projectIndex === activeProjectIndex;
    });
    backProjectDetailDescOverlays.forEach((mesh) => {
        mesh.visible = showDetail && mesh.userData.projectIndex === activeProjectIndex;
    });
}

function createBackHighlightOverlay(maskTexture, hoverUniform, cardParent, overlayZ) {
    const geom = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: {
            uMask: { value: maskTexture },
            uHover: hoverUniform,
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uMask;
            uniform float uHover;
            varying vec2 vUv;
            void main() {
                float mask = texture2D(uMask, vUv).r;
                float inText = 1.0 - smoothstep(0.15, 0.7, mask);
                vec3 blue = vec3(0.25, 0.45, 0.95);
                gl_FragColor = vec4(blue, inText * uHover);
            }
        `,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 0, overlayZ);
    mesh.rotation.y = Math.PI;
    mesh.renderOrder = 1;
    cardParent.add(mesh);
    return mesh;
}

function createHoverPlane(width, height, x, y, z, rotationY = 0) {
    const geom = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false, // always render on top (used for hover/debug planes)
        side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geom, mat);
    plane.position.set(x, y, z);
    plane.rotation.y = rotationY;
    plane.userData.isHoverPlane = true;
    return plane;
}

const stickerDustWorkerUrl = new URL('./src/workers/sticker-dust.worker.js', import.meta.url);
const STICKER_DUST_ALPHA = 30;

function collectStickerDustPixelsSync(data, imgW, imgH, stride, stickerW, stickerH) {
    let count = 0;
    for (let py = 0; py < imgH; py += stride) {
        for (let px = 0; px < imgW; px += stride) {
            if (data[(py * imgW + px) * 4 + 3] >= STICKER_DUST_ALPHA) count++;
        }
    }

    const positions = new Float32Array(count * 3);
    const initPos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const pvx = new Float32Array(count);
    const pvy = new Float32Array(count);

    let i = 0;
    for (let py = 0; py < imgH; py += stride) {
        for (let px = 0; px < imgW; px += stride) {
            const idx = (py * imgW + px) * 4;
            if (data[idx + 3] < STICKER_DUST_ALPHA) continue;

            const wx = ((px / imgW) - 0.5) * stickerW;
            const wy = (0.5 - (py / imgH)) * stickerH;
            initPos[i * 3] = positions[i * 3] = wx;
            initPos[i * 3 + 1] = positions[i * 3 + 1] = wy;
            initPos[i * 3 + 2] = positions[i * 3 + 2] = 0;
            colors[i * 3] = data[idx] / 255;
            colors[i * 3 + 1] = data[idx + 1] / 255;
            colors[i * 3 + 2] = data[idx + 2] / 255;
            pvx[i] = (Math.random() - 0.5) * 0.5;
            pvy[i] = 0.3 + Math.random() * 0.6;
            i++;
        }
    }

    return { count, positions, initPos, colors, pvx, pvy };
}

function collectStickerDustPixelsAsync(imgData, imgW, imgH, stride, stickerW, stickerH) {
    if (typeof Worker === 'undefined') {
        return Promise.resolve(collectStickerDustPixelsSync(imgData.data, imgW, imgH, stride, stickerW, stickerH));
    }

    return new Promise((resolve, reject) => {
        const worker = new Worker(stickerDustWorkerUrl, { type: 'module' });
        worker.onmessage = (e) => {
            worker.terminate();
            resolve(e.data);
        };
        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };
        worker.postMessage({
            data: imgData.data,
            imgW,
            imgH,
            stride,
            stickerW,
            stickerH,
            alphaThreshold: STICKER_DUST_ALPHA,
        }, [imgData.data.buffer]);
    });
}

function attachStickerDustAnimation(stickerMesh, stickerMat, stickerW, stickerH, imgW, imgH, stride, buffers) {
    const { count, positions, initPos, colors, pvx, pvy } = buffers;

    const partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    partGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const partMat = new THREE.PointsMaterial({
        size: stride * (stickerW / imgW) * 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
    });
    const particles = new THREE.Points(partGeom, partMat);
    particles.position.set(0, 4.0, -2.49);
    scene.add(particles);

    const CROSSFADE = 0.3;
    const DUST_DURATION = 2.5;
    let dustTime = 0;
    let dusting = false;

    setTimeout(() => { dusting = true; }, 1000);

    window._stickerUpdate = (delta) => {
        if (!dusting) return;
        dustTime += delta;
        const t = Math.min(dustTime / DUST_DURATION, 1.0);

        const crossT = Math.min(t / CROSSFADE, 1.0);
        stickerMat.opacity = 1.0 - crossT;
        partMat.opacity = crossT * (1.0 - Math.max(0, (t - CROSSFADE) / (1.0 - CROSSFADE)));

        const pos = partGeom.attributes.position.array;
        for (let i = 0; i < count; i++) {
            pos[i * 3] = initPos[i * 3] + pvx[i] * t * DUST_DURATION;
            pos[i * 3 + 1] = initPos[i * 3 + 1] + pvy[i] * t * DUST_DURATION;
        }
        partGeom.attributes.position.needsUpdate = true;

        if (t >= 1.0) {
            stickerMesh.visible = false;
            particles.visible = false;
            dusting = false;
        }
    };
}

function initCard() {
    const { mask: frontTextTexture, colors: frontLetterColorsTexture } = renderPerspectiveTextures(font, 0.35);
    walletTextMaskTexture = frontTextTexture;

    const backTextItems = [
        { text: '"Did I lose my perspective?"', font: baskervvilleFont, size: quoteTextSize, x: quoteX, y: quoteY },
        { text: '— Charlotte Emma Aitchison', font: baskervvilleFont, size: quoteTextSize * 0.85, x: quoteX + 0.1, y: attributionY },
        { text: emailText, font: baskervvilleFont, size: quoteTextSize, x: emailX, y: emailY },
    ];
    backButtonMetrics.forEach((m, i) => {
        backTextItems.push({ text: m.label, font: backButtonFont, size: backButtonSize, x: backButtonPositions[i].x, y: backButtonPositions[i].y });
    });
    backHomeTextTexture = renderTextToTexture(backTextItems);

    backProjectsTextTexture = renderProjectIndexToTexture(projectIndexLayout);
    backFaceTextures.home = backHomeTextTexture;
    backFaceTextures.projects = backProjectsTextTexture;
    preloadProjectDetailTextures();
    initBackInkBlend();
    updateBackFaceTextMask();

    // Email-only mask
    const backEmailMaskTexture = renderTextToTexture([
        { text: emailText, font: baskervvilleFont, size: quoteTextSize, x: emailX, y: emailY }
    ]);

    // Per-button masks for blue click highlight
    const backButtonMaskTextures = backButtonMetrics.map((m, i) =>
        renderTextToTexture([{ text: m.label, font: backButtonFont, size: backButtonSize, x: backButtonPositions[i].x, y: backButtonPositions[i].y }])
    );

    const projectIndexMaskTextures = projectIndexLayout.entries.map((entry) =>
        renderTextToTexture([{
            text: entry.title,
            font: backButtonFont,
            size: PROJECT_INDEX_SIZE,
            x: entry.x,
            y: entry.y,
            baseline: true,
        }])
    );
    const backLinkMaskTexture = renderTextToTexture([{
        text: projectIndexLayout.backLink.label,
        font: backButtonFont,
        size: BACK_LINK_SIZE,
        x: projectIndexLayout.backLink.x,
        y: projectIndexLayout.backLink.y,
    }]);

    const frontMaterial = createEngravedMaterial({}, frontTextTexture, false, frontLetterColorsTexture, true);
    const backMaterial = createEngravedMaterial({}, backHomeTextTexture, BACK_UV_FLIP_X, null, false, null, null, backTextMaskUniform);

    const cardGeometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth, CARD_MESH_SEGMENTS, CARD_MESH_SEGMENTS);
    card = new THREE.Mesh(cardGeometry, [
        sideMaterial, sideMaterial, sideMaterial, sideMaterial,
        frontMaterial,
        backMaterial,
    ]);
    scene.add(card);

    // Overlay on back: blue only over email when hovered (same UV space as back face)
    const overlayZ = -cardDepth / 2 + 0.002;
    const overlayGeom = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const overlayMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: {
            uEmailMask: { value: backEmailMaskTexture },
            uHover: backHoverUniform,
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uEmailMask;
            uniform float uHover;
            varying vec2 vUv;
            void main() {
                vec2 uvSample = vUv;
                float mask = texture2D(uEmailMask, uvSample).r;
                float inEmail = 1.0 - smoothstep(0.15, 0.7, mask);
                vec3 blue = vec3(0.25, 0.45, 0.95);
                float alpha = inEmail * uHover;
                gl_FragColor = vec4(blue, alpha);
            }
        `,
    });
    const overlayMesh = new THREE.Mesh(overlayGeom, overlayMat);
    overlayMesh.position.set(0, 0, overlayZ);
    overlayMesh.rotation.y = Math.PI;
    overlayMesh.renderOrder = 1;
    card.add(overlayMesh);
    backEmailOverlay = overlayMesh;

    backButtonOverlays = backButtonMaskTextures.map((maskTex, i) =>
        createBackHighlightOverlay(maskTex, backButtonHoverUniforms[i], card, overlayZ)
    );

    projectIndexHoverUniforms = projectIndexLayout.entries.map(() => ({ value: 0 }));
    projectIndexMaskTextures.forEach((maskTex, i) => {
        backProjectsOverlays.push(createBackHighlightOverlay(maskTex, projectIndexHoverUniforms[i], card, overlayZ));
    });
    const backLinkOverlay = createBackHighlightOverlay(backLinkMaskTexture, backLinkHoverUniform, card, overlayZ);
    backLinkOverlay.userData.isBackLinkOverlay = true;
    backProjectsOverlays.push(backLinkOverlay);

    projectIndexItems.forEach((item, i) => {
        if (!item.url && !item.image) return;
        loadBakedMaskTexture(item.slug, 'title-mask', (titleMaskTexture) => {
            const titleOverlay = createBackHighlightOverlay(titleMaskTexture, projectDetailTitleHoverUniforms[i], card, overlayZ);
            titleOverlay.userData.projectIndex = i;
            titleOverlay.visible = false;
            backProjectDetailOverlays.push(titleOverlay);
        });
    });

    projectIndexItems.forEach((item, i) => {
        if (!item.writeUpUrl || !item.description) return;
        loadBakedMaskTexture(item.slug, 'desc-mask', (descMaskTexture) => {
            const descOverlay = createBackHighlightOverlay(descMaskTexture, projectDetailWriteUpHoverUniforms[i], card, overlayZ);
            descOverlay.userData.projectIndex = i;
            descOverlay.visible = false;
            backProjectDetailDescOverlays.push(descOverlay);
        });
    });

    // Sticker fixed in scene behind the card — doesn't rotate with card
    textureLoader.load(stickerSrc, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = Math.min(PAPER_ANISOTROPY, maxAnisotropy);
        tex.needsUpdate = true;
        const aspect = tex.image.width / tex.image.height;
        const stickerH = cardHeight * 6.0;
        const stickerW = stickerH * aspect;
        const stickerGeom = new THREE.PlaneGeometry(stickerW, stickerH);
        const stickerMat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide,
        });
        const stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
        stickerMesh.position.set(0, 4.0, -2.5);
        scene.add(stickerMesh);

        const imgW = tex.image.width;
        const imgH = tex.image.height;
        const offscreen = document.createElement('canvas');
        offscreen.width = imgW;
        offscreen.height = imgH;
        const octx = offscreen.getContext('2d');
        octx.drawImage(tex.image, 0, 0);
        const imgData = octx.getImageData(0, 0, imgW, imgH);

        collectStickerDustPixelsAsync(imgData, imgW, imgH, STICKER_DUST_STRIDE, stickerW, stickerH)
            .then((buffers) => {
                attachStickerDustAnimation(stickerMesh, stickerMat, stickerW, stickerH, imgW, imgH, STICKER_DUST_STRIDE, buffers);
            })
            .catch(() => {
                octx.drawImage(tex.image, 0, 0);
                const retry = octx.getImageData(0, 0, imgW, imgH);
                const buffers = collectStickerDustPixelsSync(retry.data, imgW, imgH, STICKER_DUST_STRIDE, stickerW, stickerH);
                attachStickerDustAnimation(stickerMesh, stickerMat, stickerW, stickerH, imgW, imgH, STICKER_DUST_STRIDE, buffers);
            });
    });

    // Hover hit planes - bounding rectangles for each interactive text item
    const pad = 0.03;
    // Front face: plane just in front of card so ray hits it when viewing front
    const frontZ = cardDepth / 2 + 0.001;
    // Back face: plane just in front of back (between camera and back surface) so ray hits it when viewing back
    const backZ = -cardDepth / 2 + 0.001;

    // Front title hover area — centered on front face, normal +Z
    const perspGeom = new TextGeometry('Perspective', { font, size: 0.35, height: 0.001, curveSegments: 8, bevelEnabled: false });
    perspGeom.computeBoundingBox();
    const pw = perspGeom.boundingBox.max.x - perspGeom.boundingBox.min.x + pad * 2;
    const ph = perspGeom.boundingBox.max.y - perspGeom.boundingBox.min.y + pad * 2;
    perspGeom.dispose();

    const frontPlane = createHoverPlane(pw, ph, 0, 0, frontZ, 0);
    frontPlane.userData.kind = 'frontTitle';
    card.add(frontPlane);

    // Back email hover area — mirrored in X because the back face is viewed after a 180° Y rotation
    // and the back material also flips UVs horizontally. Using the mirrored X center lines the plane
    // up visually with the engraved email text on the back-right.
    const emailCenterX = emailX + emailWidth / 2;
    const mirroredCenterX = -emailCenterX;
    const emailPlane = createHoverPlane(
        emailWidth + pad * 2,
        emailHeight + pad * 2,
        mirroredCenterX,
        emailY + emailHeight / 2,
        backZ,
        Math.PI
    );
    emailPlane.userData.kind = 'email';
    card.add(emailPlane);
    backHomeHoverPlanes.push(emailPlane);

    // Back nav-button hover planes (mirrored X like email)
    backButtonMetrics.forEach((m, i) => {
        const btnCenterX = backButtonPositions[i].x + m.w / 2;
        const mirroredX = -btnCenterX;
        const btnPlane = createHoverPlane(
            m.w + pad * 2,
            m.h + pad * 2,
            mirroredX,
            backButtonPositions[i].y + m.h / 2,
            backZ,
            Math.PI
        );
        btnPlane.userData.kind = 'backButton';
        btnPlane.userData.buttonIndex = i;
        card.add(btnPlane);
        backHomeHoverPlanes.push(btnPlane);
    });

    projectIndexLayout.entries.forEach((entry, i) => {
        const centerX = entry.x + entry.w / 2;
        const mirroredX = -centerX;
        const centerY = entry.y + (entry.ascent - entry.descent) / 2;
        const itemPlane = createHoverPlane(
            entry.w + pad * 2,
            entry.h + pad * 2,
            mirroredX,
            centerY,
            backZ,
            Math.PI
        );
        itemPlane.userData.kind = 'projectIndex';
        itemPlane.userData.projectIndex = i;
        itemPlane.visible = false;
        card.add(itemPlane);
        backProjectsHoverPlanes.push(itemPlane);
    });

    const backLink = projectIndexLayout.backLink;
    const backLinkCenterX = backLink.x + backLink.w / 2;
    const backLinkPlane = createHoverPlane(
        backLink.w + pad * 2,
        backLink.h + pad * 2,
        -backLinkCenterX,
        backLink.y + backLink.h / 2,
        backZ,
        Math.PI
    );
    backLinkPlane.userData.kind = 'backLink';
    backLinkPlane.visible = false;
    card.add(backLinkPlane);
    backProjectsHoverPlanes.push(backLinkPlane);

    projectIndexItems.forEach((item, i) => {
        if (!item.url && !item.image) return;
        const titleLayout = getProjectDetailTitleLayout(item);
        const titleCenterX = titleLayout.x + titleLayout.w / 2;
        const titlePlane = createHoverPlane(
            titleLayout.w + pad * 2,
            titleLayout.h + pad * 2,
            -titleCenterX,
            titleLayout.y + titleLayout.h / 2,
            backZ,
            Math.PI
        );
        titlePlane.userData.kind = 'projectTitle';
        titlePlane.userData.projectIndex = i;
        titlePlane.visible = false;
        card.add(titlePlane);
        backProjectDetailHoverPlanes.push(titlePlane);
    });

    projectIndexItems.forEach((item, i) => {
        if (!item.writeUpUrl || !item.description) return;
        const descLayout = getProjectDetailDescriptionLayout(item);
        if (!descLayout) return;
        const descCenterX = descLayout.x + descLayout.w / 2;
        const descPlane = createHoverPlane(
            descLayout.w + pad * 2,
            descLayout.h + pad * 2,
            -descCenterX,
            descLayout.y + descLayout.h / 2,
            backZ,
            Math.PI
        );
        descPlane.userData.kind = 'projectWriteUp';
        descPlane.userData.projectIndex = i;
        descPlane.visible = false;
        card.add(descPlane);
        backProjectDetailDescHoverPlanes.push(descPlane);
    });
}

// Raycaster for hover / click
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isHovering = false;
let isHoveringEmail = false;
let hoveringBackButton = -1; // index of back button being hovered, -1 = none
const _cardWorldPos = new THREE.Vector3();
const _cardToCamera = new THREE.Vector3();
const _frontNormal = new THREE.Vector3();
const _backNormal = new THREE.Vector3();

function getCardFaceVisibility() {
    if (!card) return { frontVisible: false, backVisible: false };
    card.getWorldPosition(_cardWorldPos);
    _cardToCamera.copy(camera.position).sub(_cardWorldPos).normalize();
    _frontNormal.set(0, 0, 1).applyQuaternion(card.quaternion);
    _backNormal.set(0, 0, -1).applyQuaternion(card.quaternion);
    return {
        frontVisible: _frontNormal.dot(_cardToCamera) > 0,
        backVisible: _backNormal.dot(_cardToCamera) > 0,
    };
}

const canvasEl = document.getElementById('canvas');

function getCanvasScreenRect() {
    return canvasEl.getBoundingClientRect();
}

function clientToCanvasNdc(clientX, clientY) {
    const rect = getCanvasScreenRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
        ndcX: (x / w) * 2 - 1,
        ndcY: -(y / h) * 2 + 1,
    };
}

function ndcToClientScreen(ndcX, ndcY) {
    const rect = getCanvasScreenRect();
    return [
        rect.left + (ndcX + 1) * 0.5 * rect.width,
        rect.top + (1 - ndcY) * 0.5 * rect.height,
    ];
}

function onPointerMove(event) {
    const { ndcX, ndcY } = clientToCanvasNdc(event.clientX, event.clientY);
    pointer.x = ndcX;
    pointer.y = ndcY;
}

// Map a raycast hit on the card back face to the same layout coords used when engraving text.
function backFaceHitToLayoutCoords(hit) {
    if (!hit?.uv || hit.object !== card || hit.face?.materialIndex !== 5) return null;
    const u = BACK_UV_FLIP_X ? (1.0 - hit.uv.x) : hit.uv.x;
    return {
        x: u * cardWidth - cardWidth / 2,
        y: cardHeight / 2 - hit.uv.y * cardHeight,
    };
}

function getBackFaceLayoutFromHits(hits) {
    for (const hit of hits) {
        const coords = backFaceHitToLayoutCoords(hit);
        if (coords) return coords;
    }
    return null;
}

const BACK_HOME_HIT_PAD = IS_MOBILE ? 0.14 : 0.05;

function hitTestBackButtonAtLayout(x, y, pad = BACK_HOME_HIT_PAD) {
    for (let i = 0; i < backButtonMetrics.length; i++) {
        const m = backButtonMetrics[i];
        const px = backButtonPositions[i].x;
        const py = backButtonPositions[i].y;
        if (x >= px - pad && x <= px + m.w + pad && y >= py - pad && y <= py + m.h + pad) {
            return i;
        }
    }
    return -1;
}

function hitTestEmailAtLayout(x, y, pad = BACK_HOME_HIT_PAD) {
    return x >= emailX - pad && x <= emailX + emailWidth + pad
        && y >= emailY - pad && y <= emailY + emailHeight + pad;
}

function triggerBackButtonClick(index) {
    backButtonHoverUniforms[index].value = 1;
    setTimeout(() => { backButtonHoverUniforms[index].value = 0; }, 250);
    handleBackButtonClick(index);
}

function triggerEmailClick() {
    isHoveringEmail = true;
    setTimeout(() => { isHoveringEmail = false; }, 180);
    window.location.href = 'mailto:tian@perspective.credit';
}

function tryBackHomeLayoutTap(hits) {
    const layout = getBackFaceLayoutFromHits(hits);
    if (!layout) return false;

    const btnIndex = hitTestBackButtonAtLayout(layout.x, layout.y);
    if (btnIndex >= 0) {
        triggerBackButtonClick(btnIndex);
        return true;
    }

    if (hitTestEmailAtLayout(layout.x, layout.y)) {
        triggerEmailClick();
        return true;
    }

    return false;
}

function updateHover() {
    if (!card) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(card, true);
    const { frontVisible, backVisible } = getCardFaceVisibility();
    isHovering = false;
    isHoveringEmail = false;
    hoveringBackButton = -1;
    hoveringProjectIndex = -1;
    hoveringProjectTitle = false;
    hoveringProjectWriteUp = false;
    hoveringBackLink = false;

    for (const hit of hits) {
        if (!hit.object.userData.isHoverPlane) continue;
        const kind = hit.object.userData.kind;
        if (kind === 'frontTitle' && frontVisible) isHovering = true;
        if (kind === 'email' && backVisible && backFaceTarget === 'home') isHoveringEmail = true;
        if (kind === 'backButton' && backVisible && backFaceTarget === 'home') {
            hoveringBackButton = hit.object.userData.buttonIndex;
        }
        if (kind === 'projectIndex' && backVisible && isBackProjectsActive()) {
            hoveringProjectIndex = hit.object.userData.projectIndex;
            const item = projectIndexItems[hoveringProjectIndex];
            if (item?.url) prefetchProjectUrl(item.url);
        }
        if (kind === 'projectTitle' && backVisible && isBackProjectDetailActive()) {
            hoveringProjectTitle = true;
        }
        if (kind === 'projectWriteUp' && backVisible && isBackProjectDetailActive()) {
            hoveringProjectWriteUp = true;
        }
        if (kind === 'backLink' && backVisible && (isBackProjectsActive() || isBackProjectDetailActive())) hoveringBackLink = true;
    }

    if (backVisible && backFaceTarget === 'home' && hoveringBackButton < 0) {
        const layout = getBackFaceLayoutFromHits(hits);
        if (layout) {
            const btnIndex = hitTestBackButtonAtLayout(layout.x, layout.y);
            if (btnIndex >= 0) hoveringBackButton = btnIndex;
            else if (hitTestEmailAtLayout(layout.x, layout.y)) isHoveringEmail = true;
        }
    }
}

// Ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Rotation controls with damping
let isDragging = false;
let pointerDownPos = null;
let dragClientPos = null;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
const ROTATION_SENSITIVITY = 0.005;
const DAMPING = 0.96;
const DRAG_THRESHOLD_PX = 6;
const CARD_MOTION_IFRAME_SUSPEND = 0.0008;

function isCardMotionActive() {
    return isDragging
        || Math.abs(velocity.x) > CARD_MOTION_IFRAME_SUSPEND
        || Math.abs(velocity.y) > CARD_MOTION_IFRAME_SUSPEND;
}

function setProjectFrameFrozen(frozen) {
    projectFrameEl.classList.toggle('is-frozen', frozen);
    if (frozen) {
        projectFrameEl.setAttribute('inert', '');
    } else {
        projectFrameEl.removeAttribute('inert');
    }
}

function updateProjectFramePerformance() {
    if (!isProjectBackgroundActive()) {
        setProjectFrameFrozen(false);
        document.body.classList.remove('project-bg-active', 'card-motion-active');
        if (renderer.getPixelRatio() !== MAX_DEVICE_PIXEL_RATIO) {
            renderer.setPixelRatio(MAX_DEVICE_PIXEL_RATIO);
        }
        return;
    }
    document.body.classList.add('project-bg-active');
    const motion = isCardMotionActive();
    document.body.classList.toggle('card-motion-active', motion);
    setProjectFrameFrozen(motion);
    const motionDpr = IS_MOBILE ? 1 : Math.min(1.5, MAX_DEVICE_PIXEL_RATIO);
    const targetDpr = motion ? motionDpr : Math.min(1.75, MAX_DEVICE_PIXEL_RATIO);
    if (renderer.getPixelRatio() !== targetDpr) renderer.setPixelRatio(targetDpr);
}

function beginCardPointer(clientX, clientY, event) {
    pointerDownPos = { x: clientX, y: clientY };
    isDragging = false;
    dragClientPos = null;
    previousMousePosition = { x: clientX, y: clientY };
    onPointerMove(event);
}

function endCardPointer(event) {
    const wasClick = pointerDownPos && !isDragging;
    if (wasClick) {
        onPointerMove(event);
        tryBackInteraction();
    }
    pointerDownPos = null;
    dragClientPos = null;
    isDragging = false;
    updateProjectFramePerformance();
}

function moveCardPointer(clientX, clientY, event) {
    onPointerMove(event);
    if (!pointerDownPos) {
        if (!isDragging) updateHover();
        return;
    }
    const dx = clientX - pointerDownPos.x;
    const dy = clientY - pointerDownPos.y;
    if (!isDragging && (dx * dx + dy * dy) > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        isDragging = true;
        updateProjectFramePerformance();
    }
    if (!isDragging) {
        updateHover();
        return;
    }
    dragClientPos = { x: clientX, y: clientY };
}

function applyDragRotationStep() {
    if (!isDragging || !dragClientPos || !card) return;
    const deltaX = dragClientPos.x - previousMousePosition.x;
    const deltaY = dragClientPos.y - previousMousePosition.y;
    if (!deltaX && !deltaY) return;
    const rotDx = deltaX * ROTATION_SENSITIVITY;
    const rotDy = -deltaY * ROTATION_SENSITIVITY;
    rotation.y += rotDx;
    rotation.x += rotDy;
    rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
    velocity.y = rotDx;
    velocity.x = rotDy;
    previousMousePosition.x = dragClientPos.x;
    previousMousePosition.y = dragClientPos.y;
}

document.addEventListener('mousedown', (e) => {
    if (isProjectBackgroundActive() && !pointerHitsCard(e.clientX, e.clientY)) return;
    beginCardPointer(e.clientX, e.clientY, e);
});

document.addEventListener('mousemove', (e) => {
    moveCardPointer(e.clientX, e.clientY, e);
});

document.addEventListener('mouseup', (e) => {
    endCardPointer(e);
});

canvasEl.addEventListener('pointerleave', () => {
    pointer.x = -999;
    pointer.y = -999;
    updateHover();
});

function openProjectExternalLink(item) {
    const href = item.url || item.image;
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
}

function openProjectWriteUp(item) {
    if (!item?.writeUpUrl) return;
    window.open(item.writeUpUrl, '_blank', 'noopener,noreferrer');
}

function tryBackProjectDetailLayoutTap(hits) {
    if (!activeProjectItem) return false;
    const layout = getBackFaceLayoutFromHits(hits);
    if (!layout) return false;
    const pad = BACK_HOME_HIT_PAD;

    const backLink = projectIndexLayout.backLink;
    if (layout.x >= backLink.x - pad && layout.x <= backLink.x + backLink.w + pad
        && layout.y >= backLink.y - pad && layout.y <= backLink.y + backLink.h + pad) {
        backLinkHoverUniform.value = 1;
        setTimeout(() => { backLinkHoverUniform.value = 0; }, 250);
        closeProjectDetail();
        return true;
    }

    const titleLayout = getProjectDetailTitleLayout(activeProjectItem);
    if (layout.x >= titleLayout.x - pad && layout.x <= titleLayout.x + titleLayout.w + pad
        && layout.y >= titleLayout.y - pad && layout.y <= titleLayout.y + titleLayout.h + pad) {
        projectDetailTitleHoverUniforms[activeProjectIndex].value = 1;
        setTimeout(() => { projectDetailTitleHoverUniforms[activeProjectIndex].value = 0; }, 250);
        openProjectExternalLink(activeProjectItem);
        return true;
    }

    const descLayout = getProjectDetailDescriptionLayout(activeProjectItem);
    if (descLayout && activeProjectItem.writeUpUrl) {
        for (const line of descLayout.lines) {
            if (layout.x >= line.x - pad && layout.x <= line.x + line.w + pad
                && layout.y >= line.y - pad && layout.y <= line.y + line.h + pad) {
                projectDetailWriteUpHoverUniforms[activeProjectIndex].value = 1;
                setTimeout(() => { projectDetailWriteUpHoverUniforms[activeProjectIndex].value = 0; }, 250);
                openProjectWriteUp(activeProjectItem);
                return true;
            }
        }
    }
    return false;
}

function tryBackProjectsLayoutTap(hits) {
    const layout = getBackFaceLayoutFromHits(hits);
    if (!layout) return false;
    const pad = BACK_HOME_HIT_PAD;

    const backLink = projectIndexLayout.backLink;
    if (layout.x >= backLink.x - pad && layout.x <= backLink.x + backLink.w + pad
        && layout.y >= backLink.y - pad && layout.y <= backLink.y + backLink.h + pad) {
        backLinkHoverUniform.value = 1;
        setTimeout(() => { backLinkHoverUniform.value = 0; }, 250);
        closeBackProjectsIndex();
        return true;
    }

    for (let i = 0; i < projectIndexLayout.entries.length; i++) {
        const entry = projectIndexLayout.entries[i];
        if (layout.x >= entry.x - pad && layout.x <= entry.x + entry.w + pad
            && layout.y >= entry.y - entry.descent - pad && layout.y <= entry.y + entry.ascent + pad) {
            projectIndexHoverUniforms[i].value = 1;
            setTimeout(() => { projectIndexHoverUniforms[i].value = 0; }, 250);
            handleProjectIndexClick(i);
            return true;
        }
    }
    return false;
}

function tryBackInteraction() {
    if (!card) return false;
    const { backVisible } = getCardFaceVisibility();
    if (!backVisible) return false;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(card, true);

    // Home nav — tappable as soon as the back face is visible (no ink-settle wait).
    if (backFaceTarget === 'home') {
        const btnHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'backButton');
        if (btnHit) {
            triggerBackButtonClick(btnHit.object.userData.buttonIndex);
            return true;
        }

        const emailHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'email');
        if (emailHit) {
            triggerEmailClick();
            return true;
        }

        // UV fallback — matches engraved text layout (independent of hover-plane placement).
        if (tryBackHomeLayoutTap(hits)) return true;
    }

    if (isBackInkTransitioning()) return false;

    if (isBackProjectDetailActive()) {
        const titleHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'projectTitle');
        if (titleHit && activeProjectItem) {
            projectDetailTitleHoverUniforms[activeProjectIndex].value = 1;
            setTimeout(() => { projectDetailTitleHoverUniforms[activeProjectIndex].value = 0; }, 250);
            openProjectExternalLink(activeProjectItem);
            return true;
        }

        const writeUpHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'projectWriteUp');
        if (writeUpHit && activeProjectItem?.writeUpUrl) {
            projectDetailWriteUpHoverUniforms[activeProjectIndex].value = 1;
            setTimeout(() => { projectDetailWriteUpHoverUniforms[activeProjectIndex].value = 0; }, 250);
            openProjectWriteUp(activeProjectItem);
            return true;
        }

        const backHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'backLink');
        if (backHit) {
            backLinkHoverUniform.value = 1;
            setTimeout(() => { backLinkHoverUniform.value = 0; }, 250);
            closeProjectDetail();
            return true;
        }
        if (tryBackProjectDetailLayoutTap(hits)) return true;
        return false;
    }

    if (isBackProjectsActive()) {
        const backHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'backLink');
        if (backHit) {
            backLinkHoverUniform.value = 1;
            setTimeout(() => { backLinkHoverUniform.value = 0; }, 250);
            closeBackProjectsIndex();
            return true;
        }

        const projectHit = hits.find((hit) => hit.object.userData.isHoverPlane && hit.object.userData.kind === 'projectIndex');
        if (projectHit) {
            const idx = projectHit.object.userData.projectIndex;
            projectIndexHoverUniforms[idx].value = 1;
            setTimeout(() => { projectIndexHoverUniforms[idx].value = 0; }, 250);
            handleProjectIndexClick(idx);
            return true;
        }
        if (tryBackProjectsLayoutTap(hits)) return true;
        return false;
    }

    return false;
}

function handleProjectIndexClick(index) {
    const item = projectIndexItems[index];
    if (!item) return;
    if (item.url || item.image) {
        openProjectDetail(index);
        return;
    }
    if (IS_MOBILE) {
        openSectionDialog(sectionDialogs['PROJECTS']);
    } else {
        window.open(sectionPages.PROJECTS, item.title, 'width=700,height=600,scrollbars=yes,resizable=yes');
    }
}

const sectionPages = { 'INFO': '/info.html', 'PROJECTS': '/projects.html', 'CV': '/cv.html' };
const sectionDialogs = { 'INFO': 'dialog-info', 'PROJECTS': 'dialog-projects', 'CV': 'dialog-cv' };

function openSectionDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    const iframe = dialog.querySelector('iframe[data-src]');
    if (iframe && !iframe.src) {
        iframe.src = iframe.dataset.src;
    }
    dialog.showModal();
}

// Close buttons for all dialogs
document.querySelectorAll('.section-dialog .dialog-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('dialog')?.close());
});
// Close on backdrop click
document.querySelectorAll('.section-dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });
});

// Live project iframe — full viewport behind the 3D card (not on the card back).
const IFRAME_DESKTOP_W = 1280;
const IFRAME_DESKTOP_H = 720;

function useMobileProjectFrameLayout() {
    return IS_MOBILE || window.innerWidth <= 768;
}

const projectFrameEl = document.createElement('div');
projectFrameEl.id = 'project-frame';
const projectFrameContent = document.createElement('div');
projectFrameContent.className = 'project-frame-content';
const projectFrameIframe = document.createElement('iframe');
projectFrameIframe.title = 'Project preview';
projectFrameIframe.setAttribute('loading', 'eager');
projectFrameContent.appendChild(projectFrameIframe);
const projectFrameImg = document.createElement('img');
projectFrameImg.alt = 'Project preview';
projectFrameImg.style.display = 'none';
projectFrameContent.appendChild(projectFrameImg);
projectFrameEl.appendChild(projectFrameContent);
const projectFrameFreezeShield = document.createElement('div');
projectFrameFreezeShield.className = 'project-frame-freeze-shield';
projectFrameFreezeShield.setAttribute('aria-hidden', 'true');
projectFrameEl.appendChild(projectFrameFreezeShield);
document.body.insertBefore(projectFrameEl, document.getElementById('canvas'));
let projectFrameMode = null; // 'in' | 'out' | null

const cardPointerCapture = document.createElement('div');
cardPointerCapture.id = 'card-pointer-capture';
cardPointerCapture.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none;';
document.body.appendChild(cardPointerCapture);

const _cardCaptureCorner = new THREE.Vector3();
const _cardCaptureScreen = [[0, 0], [0, 0], [0, 0], [0, 0]];

function updateCardPointerCapture() {
    if (!isProjectBackgroundActive() || !card) {
        cardPointerCapture.style.pointerEvents = 'none';
        cardPointerCapture.style.clipPath = 'none';
        return;
    }
    const localCorners = [
        [-cardWidth / 2, cardHeight / 2],
        [cardWidth / 2, cardHeight / 2],
        [cardWidth / 2, -cardHeight / 2],
        [-cardWidth / 2, -cardHeight / 2],
    ];
    for (let i = 0; i < 4; i++) {
        _cardCaptureCorner.set(localCorners[i][0], localCorners[i][1], 0);
        card.localToWorld(_cardCaptureCorner);
        _cardCaptureCorner.project(camera);
        const screen = ndcToClientScreen(_cardCaptureCorner.x, _cardCaptureCorner.y);
        _cardCaptureScreen[i][0] = screen[0];
        _cardCaptureScreen[i][1] = screen[1];
    }
    const poly = _cardCaptureScreen.map((c) => `${c[0]}px ${c[1]}px`).join(', ');
    cardPointerCapture.style.clipPath = `polygon(${poly})`;
    cardPointerCapture.style.pointerEvents = backInkProgress.value > 0.15 ? 'auto' : 'none';
}

const projectPrefetchIframe = document.createElement('iframe');
projectPrefetchIframe.setAttribute('aria-hidden', 'true');
projectPrefetchIframe.setAttribute('tabindex', '-1');
projectPrefetchIframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
document.body.appendChild(projectPrefetchIframe);
let prefetchedProjectUrl = null;

function prefetchProjectUrl(url) {
    if (!url || url === prefetchedProjectUrl || projectFrameIframe.getAttribute('src') === url) return;
    prefetchedProjectUrl = url;
    projectPrefetchIframe.src = url;
}

function isProjectBackgroundActive() {
    return projectFrameMode === 'in' && !!activeProjectItem?.url && !activeProjectItem?.image;
}

function pointerHitsCard(clientX, clientY) {
    if (!card) return false;
    const { ndcX, ndcY } = clientToCanvasNdc(clientX, clientY);
    _pointerHitNdc.set(ndcX, ndcY);
    raycaster.setFromCamera(_pointerHitNdc, camera);
    return raycaster.intersectObject(card, true).length > 0;
}

function updateProjectPointerRouting() {
    if (!isProjectBackgroundActive()) {
        canvasEl.style.pointerEvents = '';
        projectFrameEl.style.pointerEvents = 'none';
        updateCardPointerCapture();
        return;
    }
    canvasEl.style.pointerEvents = 'none';
    const iframeInteractive = backInkProgress.value > 0.15 && !projectFrameEl.classList.contains('is-frozen');
    projectFrameEl.style.pointerEvents = iframeInteractive ? 'auto' : 'none';
    updateCardPointerCapture();
}

const _pointerHitNdc = new THREE.Vector2();

function setProjectFrameMediaSize(w, h) {
    projectFrameContent.style.width = w + 'px';
    projectFrameContent.style.height = h + 'px';
    projectFrameIframe.style.width = w + 'px';
    projectFrameIframe.style.height = h + 'px';
    projectFrameIframe.setAttribute('width', String(Math.round(w)));
    projectFrameIframe.setAttribute('height', String(Math.round(h)));
    projectFrameImg.style.width = w + 'px';
    projectFrameImg.style.height = h + 'px';
}

function applyProjectFrameViewport() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (useMobileProjectFrameLayout()) {
        projectFrameContent.style.transform = 'none';
        setProjectFrameMediaSize(vw, vh);
        return;
    }

    const scale = Math.max(vw / IFRAME_DESKTOP_W, vh / IFRAME_DESKTOP_H);
    const scaledW = IFRAME_DESKTOP_W * scale;
    const scaledH = IFRAME_DESKTOP_H * scale;
    const left = (vw - scaledW) / 2;
    const top = (vh - scaledH) / 2;
    projectFrameContent.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    setProjectFrameMediaSize(IFRAME_DESKTOP_W, IFRAME_DESKTOP_H);
}
applyProjectFrameViewport();
window.addEventListener('resize', applyProjectFrameViewport);

let pendingProjectFrameItem = null;
let loadedProjectFrameKey = null;

function projectFrameItemKey(item) {
    return item?.image || item?.url || '';
}

function commitProjectFrameContent(item) {
    const key = projectFrameItemKey(item);
    if (loadedProjectFrameKey === key) return;
    loadedProjectFrameKey = key;
    if (item.image) {
        if (projectFrameImg.getAttribute('src') !== item.image) projectFrameImg.src = item.image;
        projectFrameImg.style.display = 'block';
        projectFrameIframe.style.display = 'none';
    } else {
        if (projectFrameIframe.src !== item.url) projectFrameIframe.src = item.url;
        projectFrameIframe.style.display = 'block';
        projectFrameImg.style.display = 'none';
    }
}

function setProjectFrameContent(item) {
    pendingProjectFrameItem = item;
    commitProjectFrameContent(item);
}

function hideProjectFrame() {
    projectFrameEl.style.opacity = '0';
    projectFrameEl.style.visibility = 'hidden';
    updateProjectPointerRouting();
}

function updateProjectFrameOverlay() {
    if (!card || !activeProjectItem || projectFrameMode === null) {
        hideProjectFrame();
        return;
    }

    const p = backInkProgress.value;
    if (projectFrameMode === 'in') {
        projectFrameEl.style.visibility = 'visible';
        projectFrameEl.style.opacity = String(Math.min(1, p));
    } else {
        if (p > 0.999) {
            projectFrameMode = null;
            pendingProjectFrameItem = null;
            hideProjectFrame();
            return;
        }
        projectFrameEl.style.visibility = 'visible';
        projectFrameEl.style.opacity = String(Math.max(0, 1 - p));
    }
    updateProjectPointerRouting();
}

function openCvSection() {
    if (IS_MOBILE) {
        openSectionDialog(sectionDialogs.CV);
        return;
    }
    window.open(sectionPages.CV, 'CV', 'width=480,height=680,scrollbars=yes,resizable=yes');
}

function handleBackButtonClick(index) {
    const label = backButtons[index];

    if (label === 'PROJECTS') {
        openBackProjectsIndex();
        return;
    }

    if (label === 'CV') {
        openCvSection();
        return;
    }

    if (IS_MOBILE) {
        openSectionDialog(sectionDialogs[label]);
    } else {
        window.open(sectionPages[label], label, 'width=700,height=600,scrollbars=yes,resizable=yes');
    }
}

let touchStart = { x: 0, y: 0 };

function handleTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;
    if (isProjectBackgroundActive() && !pointerHitsCard(touch.clientX, touch.clientY)) return;

    beginCardPointer(touch.clientX, touch.clientY, touch);
    touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleTouchMove(e) {
    const touch = e.touches[0];
    if (!touch) return;
    if (isProjectBackgroundActive() && !pointerDownPos && !pointerHitsCard(touch.clientX, touch.clientY)) {
        return;
    }

    if (isDragging && card) e.preventDefault();
    moveCardPointer(touch.clientX, touch.clientY, touch);
    if (isDragging && card) {
        touchStart = { x: touch.clientX, y: touch.clientY };
    }
}

function handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    if (!touch) return;

    onPointerMove(touch);
    endCardPointer(touch);
    pointer.x = -999;
    pointer.y = -999;
    updateHover();
}

document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });
document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

function onViewportResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(MAX_DEVICE_PIXEL_RATIO);
    renderer.setSize(w, h);
}

window.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('scroll', onViewportResize);

// Wallet strip dimensions (@2x: 750x246)
const STRIP_WIDTH = 750;
const STRIP_HEIGHT = 246;

function downloadWalletStrip() {
    if (!card) {
        console.warn('Card not ready yet');
        return;
    }
    const prevRt = renderer.getRenderTarget();
    const prevSize = renderer.getSize(new THREE.Vector2());
    const prevPixelRatio = renderer.getPixelRatio();
    const savedRotation = { x: card.rotation.x, y: card.rotation.y, z: card.rotation.z };
    const savedHover = hoverUniform.value;

    card.rotation.set(0, 0, 0);
    hoverUniform.value = 0;

    // Render the text mask texture directly onto a fullscreen quad — no card mesh, no paper texture
    const maskScene = new THREE.Scene();
    // The text mask texture covers the card in card-space coords
    // Zoom: show only the center portion of the card (0.72 of card width)
    const stripZoom = 0.72;
    const stripAspect = STRIP_WIDTH / STRIP_HEIGHT;
    const viewWidth = cardWidth * stripZoom;
    const viewHeight = viewWidth / stripAspect;
    const maskCamera = new THREE.OrthographicCamera(-viewWidth/2, viewWidth/2, viewHeight/2, -viewHeight/2, 0.1, 10);
    maskCamera.position.set(0, 0, 1);
    maskCamera.lookAt(0, 0, 0);

    // Fullscreen quad displaying the text mask texture
    const quadGeom = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const quadMat = new THREE.MeshBasicMaterial({ map: walletTextMaskTexture, depthTest: false });
    const quad = new THREE.Mesh(quadGeom, quadMat);
    maskScene.add(quad);

    const maskRt = new THREE.WebGLRenderTarget(STRIP_WIDTH, STRIP_HEIGHT, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    });
    renderer.setRenderTarget(maskRt);
    renderer.setPixelRatio(1);
    renderer.setSize(STRIP_WIDTH, STRIP_HEIGHT);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(maskScene, maskCamera);

    const maskPixels = new Uint8Array(STRIP_WIDTH * STRIP_HEIGHT * 4);
    renderer.readRenderTargetPixels(maskRt, 0, 0, STRIP_WIDTH, STRIP_HEIGHT, maskPixels);
    maskRt.dispose();
    quadGeom.dispose();
    quadMat.dispose();

    // Composite: luminance from mask → solid paper color
    const PAPER_R = 232, PAPER_G = 229, PAPER_B = 223;
    const canvas = document.createElement('canvas');
    canvas.width = STRIP_WIDTH;
    canvas.height = STRIP_HEIGHT;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(STRIP_WIDTH, STRIP_HEIGHT);
    for (let y = 0; y < STRIP_HEIGHT; y++) {
        for (let x = 0; x < STRIP_WIDTH; x++) {
            const srcRow = STRIP_HEIGHT - 1 - y;
            const src = (srcRow * STRIP_WIDTH + x) * 4;
            const dst = (y * STRIP_WIDTH + x) * 4;
            const lum = (maskPixels[src] * 0.299 + maskPixels[src+1] * 0.587 + maskPixels[src+2] * 0.114) / 255;
            imageData.data[dst]   = Math.round(PAPER_R * lum);
            imageData.data[dst+1] = Math.round(PAPER_G * lum);
            imageData.data[dst+2] = Math.round(PAPER_B * lum);
            imageData.data[dst+3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);

    const download = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const canvas1x = document.createElement('canvas');
    canvas1x.width = 375;
    canvas1x.height = 123;
    canvas1x.getContext('2d').drawImage(canvas, 0, 0, 375, 123);

    canvas.toBlob((blob) => {
        download(blob, 'strip@2x.png');
        canvas1x.toBlob((b) => {
            setTimeout(() => download(b, 'strip.png'), 300);
        });
    });

    card.rotation.set(savedRotation.x, savedRotation.y, savedRotation.z);
    hoverUniform.value = savedHover;
    renderer.setRenderTarget(prevRt);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y);
}

document.getElementById('download-strip')?.addEventListener('click', downloadWalletStrip);

// Oversized tall strip — provide portrait 750×1500 @2x and let Apple overflow/crop from bottom
const ROT_STRIP_W = 750;
const ROT_STRIP_H = 1500;

function downloadWalletBackground() {
    if (!card) {
        console.warn('Card not ready yet');
        return;
    }
    const prevRt = renderer.getRenderTarget();
    const prevSize = renderer.getSize(new THREE.Vector2());
    const prevPixelRatio = renderer.getPixelRatio();
    const savedRotation = { x: card.rotation.x, y: card.rotation.y, z: card.rotation.z };
    const savedHover = hoverUniform.value;

    card.rotation.set(0, 0, 0);
    hoverUniform.value = 0;

    // Render card into portrait canvas — card fills width, centered vertically
    const renderW = ROT_STRIP_W;
    const renderH = ROT_STRIP_H;
    const viewWidth = cardWidth;
    const viewHeight = viewWidth * (renderH / renderW);
    const bgCamera = new THREE.OrthographicCamera(
        -viewWidth / 2, viewWidth / 2,
        viewHeight / 2, -viewHeight / 2,
        0.1, 10
    );
    bgCamera.position.set(0, 0, 5);
    bgCamera.lookAt(0, 0, 0);

    const rt = new THREE.WebGLRenderTarget(renderW, renderH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
    });
    renderer.setRenderTarget(rt);
    renderer.setPixelRatio(1);
    renderer.setSize(renderW, renderH);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, bgCamera);

    const pixels = new Uint8Array(renderW * renderH * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, renderW, renderH, pixels);
    rt.dispose();

    // Flip WebGL Y
    const portrait = document.createElement('canvas');
    portrait.width = renderW;
    portrait.height = renderH;
    const pCtx = portrait.getContext('2d');
    const imageData = pCtx.createImageData(renderW, renderH);
    for (let y = 0; y < renderH; y++) {
        for (let x = 0; x < renderW; x++) {
            const srcRow = renderH - 1 - y;
            const src = (srcRow * renderW + x) * 4;
            const dst = (y * renderW + x) * 4;
            imageData.data[dst] = pixels[src];
            imageData.data[dst + 1] = pixels[src + 1];
            imageData.data[dst + 2] = pixels[src + 2];
            imageData.data[dst + 3] = pixels[src + 3];
        }
    }
    pCtx.putImageData(imageData, 0, 0);

    const download = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Rotate 90° CCW — text reads bottom-to-top in the final strip
    const rotated2x = document.createElement('canvas');
    rotated2x.width = renderW;
    rotated2x.height = renderH;
    const rCtx = rotated2x.getContext('2d');
    rCtx.translate(0, renderH);
    rCtx.rotate(-Math.PI / 2);
    // After -90° rotation, original (renderW x renderH) becomes (renderH x renderW) visually
    // Draw portrait centered in the rotated space
    rCtx.drawImage(portrait, 0, 0, renderH, renderW);

    const strip1x = document.createElement('canvas');
    strip1x.width = ROT_STRIP_W / 2;
    strip1x.height = ROT_STRIP_H / 2;
    strip1x.getContext('2d').drawImage(rotated2x, 0, 0, ROT_STRIP_W / 2, ROT_STRIP_H / 2);

    rotated2x.toBlob((blob) => {
        download(blob, 'strip@2x.png');
        strip1x.toBlob((b) => {
            setTimeout(() => download(b, 'strip.png'), 300);
        });
    });

    card.rotation.set(savedRotation.x, savedRotation.y, savedRotation.z);
    hoverUniform.value = savedHover;
    renderer.setRenderTarget(prevRt);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y);
}

document.getElementById('download-background')?.addEventListener('click', downloadWalletBackground);

function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent || '');
}

function publicAssetUrl(filename) {
    const base = import.meta.env.BASE || '/';
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}${filename}`.replace(/([^:]\/)\/+/g, '$1');
}

/** Full Add to Google Wallet URL, or built from JWT — see WALLET-PASS.md (Google Wallet). */
function getGoogleWalletSaveUrl() {
    const explicit = import.meta.env.VITE_GOOGLE_WALLET_SAVE_URL;
    if (explicit && String(explicit).trim()) {
        return String(explicit).trim();
    }
    const jwt = import.meta.env.VITE_GOOGLE_WALLET_JWT;
    if (jwt && String(jwt).trim()) {
        return `https://pay.google.com/gp/v/save/${String(jwt).trim()}`;
    }
    return null;
}

document.getElementById('download-wallet-pass')?.addEventListener('click', () => {
    if (isAndroidDevice()) {
        const googleSave = getGoogleWalletSaveUrl();
        if (googleSave) {
            window.open(googleSave, '_blank', 'noopener,noreferrer');
            return;
        }
        // No Google Wallet JWT configured — contact card still useful on Android
        const a = document.createElement('a');
        a.rel = 'noopener';
        a.href = publicAssetUrl('perspective-android.vcf');
        a.download = 'perspective-studio.vcf';
        a.click();
        return;
    }
    const a = document.createElement('a');
    a.href = walletPassUrl;
    a.download = 'perspective-card.pkpass';
    a.rel = 'noopener';
    a.click();
});

// ---- Level 2 glass refraction (scene-sampled) for wallet pass button ----
const walletGlassCanvas = document.getElementById('wallet-pass-glass');
const walletGlassButton = document.getElementById('download-wallet-pass');
const walletGlassCtx = walletGlassCanvas?.getContext('2d', { alpha: true, willReadFrequently: true }) || null;
const walletGlassSrcCanvas = document.createElement('canvas');
const walletGlassSrcCtx = walletGlassSrcCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
let walletGlassBuf = null;
let walletGlassLastW = 0;
let walletGlassLastH = 0;

function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
}

function sampleChannelOverWhite(src, w, h, x, y, channel, bg = 255) {
    const sx = clamp(x | 0, 0, w - 1);
    const sy = clamp(y | 0, 0, h - 1);
    const i = (sy * w + sx) * 4;
    const a = src[i + 3] / 255;
    const c = src[i + channel];
    return c * a + bg * (1 - a);
}

function renderWalletButtonRefraction(timeSec) {
    if (!walletGlassCanvas || !walletGlassButton || !walletGlassCtx || !walletGlassSrcCtx) return;
    const rect = walletGlassButton.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const dpr = renderer.getPixelRatio();
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (walletGlassCanvas.width !== w || walletGlassCanvas.height !== h) {
        walletGlassCanvas.width = w;
        walletGlassCanvas.height = h;
        walletGlassSrcCanvas.width = w;
        walletGlassSrcCanvas.height = h;
        walletGlassLastW = w;
        walletGlassLastH = h;
        walletGlassBuf = new Uint8ClampedArray(w * h * 4);
    }

    const canvasRect = getCanvasScreenRect();
    const srcScaleX = renderer.domElement.width / canvasRect.width;
    const srcScaleY = renderer.domElement.height / canvasRect.height;
    const sx = (rect.left - canvasRect.left) * srcScaleX;
    const sy = (rect.top - canvasRect.top) * srcScaleY;
    const sw = rect.width * srcScaleX;
    const sh = rect.height * srcScaleY;

    walletGlassSrcCtx.clearRect(0, 0, w, h);
    // WebGL canvas is transparent outside the card — underpaint white so refraction
    // doesn't sample black (matches the page when no iframe is visible behind the button).
    walletGlassSrcCtx.fillStyle = '#ffffff';
    walletGlassSrcCtx.fillRect(0, 0, w, h);
    walletGlassSrcCtx.drawImage(renderer.domElement, sx, sy, sw, sh, 0, 0, w, h);

    // Draw button label into the source layer so it sits "behind" glass and gets refracted.
    const label = 'Add to Wallet';
    walletGlassSrcCtx.save();
    walletGlassSrcCtx.textAlign = 'center';
    walletGlassSrcCtx.textBaseline = 'middle';
    walletGlassSrcCtx.font = `${Math.round(h * 0.40)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
    walletGlassSrcCtx.fillStyle = 'rgba(36, 40, 48, 0.88)';
    walletGlassSrcCtx.fillText(label, w * 0.5, h * 0.53);
    walletGlassSrcCtx.restore();

    const srcData = walletGlassSrcCtx.getImageData(0, 0, w, h);
    const src = srcData.data;
    if (!walletGlassBuf || walletGlassLastW !== w || walletGlassLastH !== h) {
        walletGlassBuf = new Uint8ClampedArray(w * h * 4);
    }
    const out = walletGlassBuf;

    const cx = w * 0.5;
    const cy = h * 0.5;
    const invMax = 1 / Math.max(cx, cy);
    const t = timeSec;
    const strength = 4.4 * dpr;
    const chroma = 1.45 * dpr;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const nx = (x - cx) * invMax;
            const ny = (y - cy) * invMax;
            const r2 = nx * nx + ny * ny;
            const edge = clamp((r2 - 0.35) * 1.6, 0, 1);

            const lens = Math.pow(1 - clamp(r2, 0, 1), 1.2) * 1.75;
            const micro =
                Math.sin(x * 0.22 + y * 0.11) * 0.22 +
                Math.cos(x * 0.15 - y * 0.19) * 0.18;
            // Very subtle animated component to keep the glass alive without looking liquid
            const drift =
                Math.sin((x + y) * 0.03 + t * 0.9) * 0.12 +
                Math.cos((x - y) * 0.02 - t * 0.75) * 0.1;
            const dx = (nx * 1.28 * lens + micro * 0.45 + drift * 0.5) * strength;
            const dy = (ny * 0.98 * lens + micro * 0.3 + drift * 0.3) * strength * 0.8;

            const rx = x + dx + chroma;
            const gx = x + dx;
            const bx = x + dx - chroma;
            const syy = y + dy;

            let r = sampleChannelOverWhite(src, w, h, rx, syy, 0);
            let g = sampleChannelOverWhite(src, w, h, gx, syy, 1);
            let b = sampleChannelOverWhite(src, w, h, bx, syy, 2);

            // Fresnel-like brightening near edges to sell curved glass
            const fres = Math.pow(edge, 1.6) * 42;
            r = clamp(r + fres, 0, 255);
            g = clamp(g + fres * 0.95, 0, 255);
            b = clamp(b + fres * 1.08, 0, 255);

            out[i] = r;
            out[i + 1] = g;
            out[i + 2] = b;
            out[i + 3] = 255;
        }
    }

    const outData = new ImageData(out, w, h);
    walletGlassCtx.putImageData(outData, 0, 0);

    // Smoked tint overlay and top sheen for 3D depth
    walletGlassCtx.save();
    walletGlassCtx.globalCompositeOperation = 'source-over';
    walletGlassCtx.fillStyle = 'rgba(118, 124, 136, 0.30)';
    walletGlassCtx.fillRect(0, 0, w, h);
    const sheen = walletGlassCtx.createLinearGradient(0, 0, 0, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.26)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.05)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.08)');
    walletGlassCtx.fillStyle = sheen;
    walletGlassCtx.fillRect(0, 0, w, h);
    walletGlassCtx.restore();
}

let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    if (window._stickerUpdate) window._stickerUpdate(delta);
    if (!card) {
        initCard();
    }
    if (card) {
        applyDragRotationStep();
        updateProjectFramePerformance();

        if (!isDragging) {
            const target = isHovering ? 1 : 0;
            hoverUniform.value += (target - hoverUniform.value) * HOVER_LERP;

            const emailTarget = isHoveringEmail ? 1 : 0;
            backHoverUniform.value += (emailTarget - backHoverUniform.value) * HOVER_LERP;

            for (let bi = 0; bi < backButtonHoverUniforms.length; bi++) {
                const btnTarget = (hoveringBackButton === bi) ? 1 : 0;
                const u = backButtonHoverUniforms[bi];
                u.value += (btnTarget - u.value) * HOVER_LERP;
            }

            for (let pi = 0; pi < projectIndexHoverUniforms.length; pi++) {
                const projTarget = hoveringProjectIndex === pi ? 1 : 0;
                const u = projectIndexHoverUniforms[pi];
                u.value += (projTarget - u.value) * HOVER_LERP;
            }
            for (let ti = 0; ti < projectDetailTitleHoverUniforms.length; ti++) {
                const titleTarget = hoveringProjectTitle && ti === activeProjectIndex ? 1 : 0;
                const u = projectDetailTitleHoverUniforms[ti];
                u.value += (titleTarget - u.value) * HOVER_LERP;
            }
            for (let wi = 0; wi < projectDetailWriteUpHoverUniforms.length; wi++) {
                const writeUpTarget = hoveringProjectWriteUp && wi === activeProjectIndex ? 1 : 0;
                const u = projectDetailWriteUpHoverUniforms[wi];
                u.value += (writeUpTarget - u.value) * HOVER_LERP;
            }
            const backLinkTarget = hoveringBackLink ? 1 : 0;
            backLinkHoverUniform.value += (backLinkTarget - backLinkHoverUniform.value) * HOVER_LERP;
        }

        backInkProgress.value += (1 - backInkProgress.value) * Math.min(1, delta * BACK_INK_SPEED);
        if (backInkProgress.value > 0.996) backInkProgress.value = 1; // settle so the composite pass can stop
        updateBackFaceTextMask();
        if (!isDragging) updateBackHoverPlaneVisibility();

        if (!isDragging) {
            rotation.y += velocity.y;
            rotation.x += velocity.x;
            rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
            velocity.y *= DAMPING;
            velocity.x *= DAMPING;
        }
        card.rotation.x = rotation.x;
        card.rotation.y = rotation.y;
        card.position.y = 0;
        card.updateMatrixWorld();
        updateProjectFrameOverlay();
    }
    renderer.setClearColor(0xffffff, 0);
    renderer.render(scene, camera);
    renderWalletButtonRefraction(now * 0.001);
}
animate();
