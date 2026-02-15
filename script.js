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

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
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
    tex.anisotropy = Math.min(16, maxAnisotropy);
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

const TEXTURE_SIZE = 4096;
const textureAspect = cardWidth / cardHeight;

function renderTextToTexture(textItems, opts = {}) {
    const w = opts.width || Math.round(TEXTURE_SIZE);
    const h = opts.height || Math.round(TEXTURE_SIZE / textureAspect);
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
        -cardWidth / 2, cardWidth / 2,
        cardHeight / 2, -cardHeight / 2,
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
            curveSegments: 32,
            bevelEnabled: false,
        });
        geom.computeBoundingBox();
        if (item.center) {
            const cx = (geom.boundingBox.min.x + geom.boundingBox.max.x) / 2;
            const cy = (geom.boundingBox.min.y + geom.boundingBox.max.y) / 2;
            geom.translate(-cx, -cy, 0);
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

// Back: tagline, quote, attribution layout
const quoteTextSize = 0.08;
const quoteX = -cardWidth / 2 + 0.15;
const quoteY = -cardHeight / 2 + 0.25;
const taglineText = '... building the web we want to live with, one system at a time';
const _quoteGeom = new TextGeometry('"Did I lose my perspective?"', {
    font: baskervvilleFont, size: quoteTextSize, height: 0.001, curveSegments: 20, bevelEnabled: false
});
_quoteGeom.computeBoundingBox();
const quoteHeight = _quoteGeom.boundingBox.max.y - _quoteGeom.boundingBox.min.y;
_quoteGeom.dispose();
const taglineY = quoteY + quoteHeight + 0.05;
const attributionY = quoteY - quoteHeight - 0.02;

const BACK_UV_FLIP_X = true;
const hoverUniform = { value: 0 };
const noHoverUniform = { value: 0 };
const HOVER_LERP = 0.08;

function createEngravedMaterial(baseProps, textMaskTexture, flipBackUV = false, letterColorsTexture = null, enableHover = true) {
    const mat = new THREE.MeshStandardMaterial({
        ...baseProps,
        map: paperColorTexture,
        emissiveMap: paperColorTexture,
        emissive: 0xffffff,
        emissiveIntensity: 0.65,
        normalMap: paperNormalTexture,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughnessMap: paperRoughnessTexture,
        displacementMap: paperDisplacementTexture,
        displacementScale: 0.025,
        roughness: 0.6,
        metalness: 0,
    });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTextMask = { value: textMaskTexture };
        shader.uniforms.uHover = enableHover ? hoverUniform : noHoverUniform;
        if (letterColorsTexture) shader.uniforms.uLetterColors = { value: letterColorsTexture };

        // Pass raw face UV (0-1) for text mask - vMapUv is scaled by map repeat
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_pars_vertex>',
            '#include <uv_pars_vertex>\nvarying vec2 vEngravedUv;'
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>',
            '#include <uv_vertex>\nvEngravedUv = uv;'
        );
        const uniformDecl = letterColorsTexture
            ? 'uniform sampler2D uTextMask;\nuniform sampler2D uLetterColors;\nuniform float uHover;\nvarying vec2 vEngravedUv;\n'
            : 'uniform sampler2D uTextMask;\nuniform float uHover;\nvarying vec2 vEngravedUv;\n';
        shader.fragmentShader = uniformDecl + shader.fragmentShader;

        const uvSample = flipBackUV ? 'vec2(1.0 - vEngravedUv.x, vEngravedUv.y)' : 'vEngravedUv';
        const hoverColor = letterColorsTexture
            ? 'texture2D(uLetterColors, ' + uvSample + ').rgb'
            : 'vec3(0.04, 0.08, 0.5)';
        const inject = `
            vec4 textSample = texture2D(uTextMask, ${uvSample});
            float raw = 1.0 - textSample.r;
            float inText = smoothstep(0.0, 0.95, raw);
            float darken = inText * (1.0 - uHover * 0.5) * 1.0;
            vec3 darkened = outgoingLight * (1.0 - darken);
            vec3 hoverColor = ${hoverColor};
            outgoingLight = mix(darkened, hoverColor, uHover * inText * 1.0);
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
    displacementMap: paperDisplacementTexture,
    displacementScale: 0.025,
    roughness: 0.6,
    metalness: 0,
});

let card;

function createHoverPlane(width, height, x, y, z, rotationY = 0) {
    const geom = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geom, mat);
    plane.position.set(x, y, z);
    plane.rotation.y = rotationY;
    plane.userData.isHoverPlane = true;
    return plane;
}

function initCard() {
    const { mask: frontTextTexture, colors: frontLetterColorsTexture } = renderPerspectiveTextures(font, 0.35);

    const backTextTexture = renderTextToTexture([
        { text: taglineText, font: baskervvilleFont, size: quoteTextSize * 0.75, x: quoteX, y: taglineY },
        { text: '"Did I lose my perspective?"', font: baskervvilleFont, size: quoteTextSize, x: quoteX, y: quoteY },
        { text: '— Charlotte Emma Aitchison', font: baskervvilleFont, size: quoteTextSize * 0.85, x: quoteX + 0.1, y: attributionY }
    ]);

    const frontMaterial = createEngravedMaterial({}, frontTextTexture, false, frontLetterColorsTexture, true);
    const backMaterial = createEngravedMaterial({}, backTextTexture, BACK_UV_FLIP_X, null, false);

    const cardGeometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth, 256, 256);
    card = new THREE.Mesh(cardGeometry, [
        sideMaterial, sideMaterial, sideMaterial, sideMaterial,
        frontMaterial,
        backMaterial,
    ]);
    scene.add(card);

    // Hover hit planes - bounding rectangles for each text item
    const pad = 0.03;
    const frontZ = cardDepth / 2 + 0.001;

    const perspGeom = new TextGeometry('Perspective', { font, size: 0.35, height: 0.001, curveSegments: 8, bevelEnabled: false });
    perspGeom.computeBoundingBox();
    const pw = perspGeom.boundingBox.max.x - perspGeom.boundingBox.min.x + pad * 2;
    const ph = perspGeom.boundingBox.max.y - perspGeom.boundingBox.min.y + pad * 2;
    perspGeom.dispose();

    const frontPlane = createHoverPlane(pw, ph, 0, 0, frontZ, 0);
    card.add(frontPlane);
}

// Raycaster for hover
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isHovering = false;

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function updateHover() {
    if (!card) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(card, true);
    isHovering = hits.some(hit => hit.object.userData.isHoverPlane);
}

// Ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Rotation controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };

document.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', (e) => {
    onPointerMove(e);
    if (!isDragging) updateHover();

    if (isDragging && card) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        rotation.y += deltaX * 0.005;
        rotation.x -= deltaY * 0.005;
        rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
        card.rotation.y = rotation.y;
        card.rotation.x = rotation.x;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

document.addEventListener('mouseup', () => { isDragging = false; });

document.getElementById('canvas').addEventListener('pointerleave', () => {
    pointer.x = -999;
    pointer.y = -999;
    updateHover();
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    if (touch) {
        onPointerMove(touch);
        touchStart = { x: touch.clientX, y: touch.clientY };
    }
});

let touchStart = { x: 0, y: 0 };
document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touch && card) {
        onPointerMove(touch);
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        rotation.y += deltaX * 0.005;
        rotation.x -= deltaY * 0.005;
        rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
        card.rotation.y = rotation.y;
        card.rotation.x = rotation.x;
        touchStart = { x: touch.clientX, y: touch.clientY };
    }
});

document.addEventListener('touchend', () => {
    isDragging = false;
    pointer.x = -999;
    pointer.y = -999;
    updateHover();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    if (!card) {
        initCard();
    }
    if (card) {
        const target = isHovering ? 1 : 0;
        hoverUniform.value += (target - hoverUniform.value) * HOVER_LERP;
    }
    renderer.render(scene, camera);
}
animate();
