/**
 * Pre-bake engraved project detail textures via headless Chromium.
 * Run after editing src/project-index-data.js: npm run bake-project-textures
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_OUT_DIR = path.join(ROOT, 'public/project-textures');
const CARD_OUT_DIR = path.join(ROOT, 'public/card-textures');
const BAKE_PORT = 3457;
const BAKE_URL = `http://127.0.0.1:${BAKE_PORT}/bake-tool.html`;

function waitForServer(url, timeoutMs = 60000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = async () => {
            try {
                const res = await fetch(url);
                if (res.ok) return resolve();
            } catch {
                // not ready
            }
            if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
            setTimeout(tick, 250);
        };
        tick();
    });
}

function startVite() {
    const proc = spawn('npx', ['vite', '--port', String(BAKE_PORT), '--strictPort'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    return proc;
}

function base64ToPngBuffer(base64) {
    return PNG.sync.read(Buffer.from(base64, 'base64'));
}

const vite = startVite();
let browser;

try {
    await waitForServer(BAKE_URL);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', (msg) => {
        const text = msg.text();
        if (text.startsWith('[bake]')) console.log(text);
    });

    await page.goto(BAKE_URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__bakeComplete || window.__bakeError, null, { timeout: 600000 });
    const bakeError = await page.evaluate(() => window.__bakeError);
    if (bakeError) throw new Error(bakeError);
    const baked = await page.evaluate(() => window.__bakedTextures);

    for (const entry of baked) {
        if (entry.group === 'card') {
            fs.mkdirSync(CARD_OUT_DIR, { recursive: true });
            const outPath = path.join(CARD_OUT_DIR, `${entry.name}.png`);
            fs.writeFileSync(outPath, PNG.sync.write(base64ToPngBuffer(entry.base64)));
            console.log(`Wrote ${path.relative(ROOT, outPath)}`);
            continue;
        }
        const dir = path.join(PROJECT_OUT_DIR, entry.slug);
        fs.mkdirSync(dir, { recursive: true });
        const outPath = path.join(dir, `${entry.name}.png`);
        fs.writeFileSync(outPath, PNG.sync.write(base64ToPngBuffer(entry.base64)));
        console.log(`Wrote ${path.relative(ROOT, outPath)}`);
    }

    const cardCount = baked.filter((e) => e.group === 'card').length;
    const projectCount = baked.length - cardCount;
    console.log(`Done — ${cardCount} card + ${projectCount} project textures`);
} finally {
    if (browser) await browser.close();
    vite.kill('SIGTERM');
}
