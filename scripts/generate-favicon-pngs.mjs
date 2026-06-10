/**
 * Rasterize the iOS ✅ emoji into PNG/ICO favicon sizes.
 * Uses system color emoji fonts (Apple Color Emoji on macOS) via Playwright.
 * Patches index.html with an inline data-URI favicon (always shows in tabs).
 * Run: npm run generate-favicons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const INDEX = path.join(ROOT, 'index.html');
const EMOJI = '✅';
const RENDER_SIZE = 128;

function magick(args) {
    const r = spawnSync('magick', args, { stdio: 'pipe' });
    if (r.status !== 0) {
        throw new Error(`magick failed: ${r.stderr?.toString() || r.status}`);
    }
}

function trimToSize(src, dest, size) {
    magick([
        src,
        '-trim',
        '+repage',
        '-resize', `${size}x${size}`,
        '-background', 'none',
        '-gravity', 'center',
        '-extent', `${size}x${size}`,
        dest,
    ]);
    console.log(`Wrote public/${path.basename(dest)}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const rawPath = path.join(PUBLIC, '.favicon-raw.png');

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${RENDER_SIZE}px;
  height: ${RENDER_SIZE}px;
  overflow: hidden;
  background: transparent;
}
body {
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji {
  font-size: ${Math.round(RENDER_SIZE * 0.92)}px;
  line-height: 1;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", emoji, sans-serif;
}
</style></head>
<body><div class="emoji">${EMOJI}</div></body></html>`;

await page.setViewportSize({ width: RENDER_SIZE, height: RENDER_SIZE });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: rawPath, type: 'png', omitBackground: true });
await browser.close();

trimToSize(rawPath, path.join(PUBLIC, 'favicon-16.png'), 16);
trimToSize(rawPath, path.join(PUBLIC, 'favicon-32.png'), 32);
trimToSize(rawPath, path.join(PUBLIC, 'favicon-48.png'), 48);
trimToSize(rawPath, path.join(PUBLIC, 'icon-192.png'), 192);
trimToSize(rawPath, path.join(PUBLIC, 'icon-512.png'), 512);

magick([
    path.join(PUBLIC, 'favicon-16.png'),
    path.join(PUBLIC, 'favicon-32.png'),
    path.join(PUBLIC, 'favicon-48.png'),
    path.join(PUBLIC, 'favicon.ico'),
]);
console.log('Wrote public/favicon.ico');

fs.copyFileSync(
    path.join(PUBLIC, 'favicon-32.png'),
    path.join(PUBLIC, 'favicon.png'),
);
console.log('Wrote public/favicon.png');

fs.unlinkSync(rawPath);

const b64 = fs.readFileSync(path.join(PUBLIC, 'favicon-32.png')).toString('base64');
const dataUri = `data:image/png;base64,${b64}`;

let indexHtml = fs.readFileSync(INDEX, 'utf8');
indexHtml = indexHtml.replace(
    /<!-- FAVICON_START -->[\s\S]*?<!-- FAVICON_END -->/,
    `<!-- FAVICON_START -->
    <link rel="icon" id="favicon" type="image/png" href="${dataUri}">
    <link rel="shortcut icon" type="image/png" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <!-- FAVICON_END -->`,
);
fs.writeFileSync(INDEX, indexHtml);
console.log('Updated index.html favicon links (inline data URI + file fallbacks)');
