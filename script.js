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
renderer.setPixelRatio(window.devicePixelRatio); // Use full pixel ratio for maximum detail
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Get maximum supported anisotropy for high-quality texture filtering
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

// Business card dimensions
const cardWidth = 4;
const cardHeight = 2.5;
const cardDepth = 0.001;

// Load all texture maps
const textureLoader = new THREE.TextureLoader();
const paperColorTexture = textureLoader.load(colorMap);
const paperNormalTexture = textureLoader.load(normalMap);
const paperRoughnessTexture = textureLoader.load(roughnessMap);
const paperDisplacementTexture = textureLoader.load(displacementMap);

// Configure all textures for maximum detail and quality
// Higher repeat values = more tiles = smaller, more refined details
const textureRepeat = 1.5; // Tile the texture 2x2 times - balances detail visibility with refinement
[paperColorTexture, paperNormalTexture, paperRoughnessTexture, paperDisplacementTexture].forEach(texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(textureRepeat, textureRepeat); // Repeat texture for finer details
    texture.flipY = false;
    // Use high-quality filtering for sharper details
    texture.minFilter = THREE.LinearMipmapLinearFilter; // Best quality for minification
    texture.magFilter = THREE.LinearFilter; // Best quality for magnification
    texture.generateMipmaps = true; // Enable mipmaps for better quality at different distances
    texture.anisotropy = Math.min(16, maxAnisotropy); // Maximum anisotropic filtering supported by GPU
});

// Create card geometry with high segment count for maximum detail
// More segments = finer displacement detail and better texture mapping
const cardGeometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth, 512, 512);

// Create material for sides (just paper texture)
const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: paperColorTexture,
    emissiveMap: paperColorTexture,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    normalMap: paperNormalTexture,
    roughnessMap: paperRoughnessTexture,
    displacementMap: paperDisplacementTexture,
    displacementScale: 0.01,
    roughness: 0.6,
    metalness: 0.0,
    receiveShadow: false,
    castShadow: false,
});

// Create material for front face - will blend paper (smooth) + text (crisp)
const frontMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: paperColorTexture, // Paper texture with mipmaps for smooth detail
    emissiveMap: paperColorTexture,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    normalMap: paperNormalTexture,
    roughnessMap: paperRoughnessTexture,
    displacementMap: paperDisplacementTexture,
    displacementScale: 0.01,
    roughness: 0.6,
    metalness: 0.0,
    receiveShadow: false,
    castShadow: false,
});

// Create materials array for box geometry (right, left, top, bottom, front, back)
const materials = [
    sideMaterial, // right
    sideMaterial, // left
    sideMaterial, // top
    sideMaterial, // bottom
    frontMaterial, // front (with text)
    sideMaterial,  // back
];

// Create card mesh with multiple materials
const card = new THREE.Mesh(cardGeometry, materials);
scene.add(card);

// Create text using TextGeometry - vector-based, perfectly crisp at any resolution
const fontLoader = new FontLoader();

// Parse the Inria Serif font (soft serif font) - font is already imported
const font = fontLoader.parse(inriaSerifFont);

// Create text geometry - size it to fit nicely on the card
// Card is 4 wide x 2.5 tall, so text should fit with margins
const textSize = 0.35; // Size to be visible on card
const textGeometry = new TextGeometry('Perspective', {
    font: font,
    size: textSize,
    height: 0.001, // Small depth but visible
    curveSegments: 24, // High detail for smooth curves
    bevelEnabled: false, // No bevel for crisp edges
});

// Center the geometry at origin (0,0,0) so it can be positioned relative to card center
textGeometry.computeBoundingBox();
const textCenterX = (textGeometry.boundingBox.min.x + textGeometry.boundingBox.max.x) / 2;
const textCenterY = (textGeometry.boundingBox.min.y + textGeometry.boundingBox.max.y) / 2;
// Translate geometry so its center is at origin
textGeometry.translate(-textCenterX, -textCenterY, 0);

// Create material for text - deep black, no emission
const textMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000, // Deep black
    emissive: 0x000000,
    emissiveIntensity: 0, // No emission so text stays black
    roughness: 0.3,
    metalness: 0.0,
});

// Create text mesh
const textMesh = new THREE.Mesh(textGeometry, textMaterial);

// Position text on front face of card
// Card BoxGeometry is centered, so front face is at z = cardDepth/2 = 0.0005
// Position text on the front face surface - make sure it's visible
// Center it at (0, 0) for perfect centering on the front face
textMesh.position.set(0, 0, cardDepth + 0.005);

// Add text to card so it rotates with it
card.add(textMesh);

console.log('Text geometry created and added to card with Inria Serif font');
console.log('Text size:', textSize);
console.log('Text position:', textMesh.position);
console.log('Text bounds:', textGeometry.boundingBox);
console.log('Card dimensions:', cardWidth, 'x', cardHeight, 'x', cardDepth);

// Create quote text on back face (bottom left corner)
// Parse Baskervville Regular font
const baskervvilleFont = fontLoader.parse(baskervvilleRegular);

// Create quote text geometry - smaller size for bottom corner
const quoteTextSize = 0.08;
const quoteText = '"Did I lose my perspective?"';
const quoteGeometry = new TextGeometry(quoteText, {
    font: baskervvilleFont,
    size: quoteTextSize,
    height: 0.001,
    curveSegments: 12,
    bevelEnabled: false,
});

// Position quote at bottom left - don't center, keep it left-aligned
quoteGeometry.computeBoundingBox();
// Position from bottom-left corner (negative x and negative y)
const quoteX = -cardWidth / 2 + 0.15; // Left edge + margin
const quoteY = -cardHeight / 2 + 0.25; // Bottom edge + margin (moved up)
// Translate so the bottom-left of the text aligns with our position
quoteGeometry.translate(
    quoteX - quoteGeometry.boundingBox.min.x,
    quoteY - quoteGeometry.boundingBox.min.y,
    0
);

// Create material for quote text
const quoteMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.3,
    metalness: 0.0,
});

// Create quote mesh
const quoteMesh = new THREE.Mesh(quoteGeometry, quoteMaterial);
// Position on back face (opposite side from "Perspective" text)
// Front face text is at z = cardDepth + 0.005, so back face should be at z = -(cardDepth + 0.005)
quoteMesh.position.set(0, 0, -cardDepth - 0.005);
// Rotate 180 degrees around Y axis so text is correctly oriented when viewing the back face
quoteMesh.rotation.y = Math.PI;
card.add(quoteMesh);

// Create attribution text (author name)
const attributionText = "— Charlotte Emma Aitchison";
const attributionGeometry = new TextGeometry(attributionText, {
    font: baskervvilleFont,
    size: quoteTextSize * 0.85, // Slightly smaller
    height: 0.001,
    curveSegments: 12,
    bevelEnabled: false,
});

// Position attribution below the quote
attributionGeometry.computeBoundingBox();
const attributionY = quoteY - (quoteGeometry.boundingBox.max.y - quoteGeometry.boundingBox.min.y) - 0.005; // Below quote with spacing
attributionGeometry.translate(
    quoteX - attributionGeometry.boundingBox.min.x + 0.1,
    attributionY - attributionGeometry.boundingBox.min.y,
    0
);

// Create attribution mesh
const attributionMesh = new THREE.Mesh(attributionGeometry, quoteMaterial);
// Position on back face, same z as quote
attributionMesh.position.set(0, 0, -cardDepth - 0.005);
// Rotate 180 degrees around Y axis so text is correctly oriented when viewing the back face
attributionMesh.rotation.y = Math.PI;
card.add(attributionMesh);

// Ambient lighting only - provides even, flat illumination
// This ensures the texture color is visible everywhere without shadows or darkening
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Rotation controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };

// Mouse events
document.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    
    rotation.y += deltaX * 0.005;
    rotation.x -= deltaY * 0.005;
    
    rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
    
    card.rotation.y = rotation.y;
    card.rotation.x = rotation.x;
    
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch events
let touchStart = { x: 0, y: 0 };

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    rotation.y += deltaX * 0.005;
    rotation.x -= deltaY * 0.005;
    
    rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, rotation.x));
    
    card.rotation.y = rotation.y;
    card.rotation.x = rotation.x;
    
    touchStart = { x: touch.clientX, y: touch.clientY };
});

document.addEventListener('touchend', () => {
    isDragging = false;
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
