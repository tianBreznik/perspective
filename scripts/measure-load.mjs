/**
 * Measure page load milestones (dev or preview).
 * Usage:
 *   npm run measure-load              # dev server at :3000
 *   npm run measure-load -- --preview # vite preview at :4173
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const preview = args.includes('--preview');
const url = preview ? 'http://127.0.0.1:4173/' : 'http://127.0.0.1:3000/';
const runs = 5;

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function fmtMs(n) {
    return n == null ? '—' : `${n} ms`;
}

async function measureOnce(browser) {
    const context = await browser.newContext();
    await context.clearCookies();
    const page = await context.newPage();

    const started = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__cardReady === true, null, { timeout: 120000 });
    const wallMs = Date.now() - started;

    const timing = await page.evaluate(() => window.__loadTiming);
    await context.close();
    return { wallMs, timing };
}

async function main() {
    const browser = await chromium.launch({ headless: true });
    const results = [];

    console.log(`Measuring ${runs} cold loads → ${url}\n`);

    for (let i = 0; i < runs; i++) {
        const { wallMs, timing } = await measureOnce(browser);
        results.push({ wallMs, timing });
        const m = timing?.measures || {};
        console.log(
            `Run ${i + 1}: wall=${wallMs} ms | `
            + `three=${fmtMs(m['boot-to-three'])} | `
            + `initCard=${fmtMs(m['three-to-card'])} | `
            + `to frame=${fmtMs(m['boot-to-frame'])} | `
            + `FCP=${fmtMs(timing?.paints?.['first-contentful-paint'])}`,
        );
    }

    await browser.close();

    const walls = results.map((r) => r.wallMs);
    const bootToFrame = results.map((r) => r.timing?.measures?.['boot-to-frame']).filter((n) => n != null);
    const bootToThree = results.map((r) => r.timing?.measures?.['boot-to-three']).filter((n) => n != null);
    const threeToCard = results.map((r) => r.timing?.measures?.['three-to-card']).filter((n) => n != null);
    const fcp = results.map((r) => r.timing?.paints?.['first-contentful-paint']).filter((n) => n != null);
    const dcl = results.map((r) => r.timing?.navigationMs?.domContentLoaded).filter((n) => n != null);
    const transfer = results.map((r) => r.timing?.transferKB).filter((n) => n != null);

    console.log('\n--- Median (5 runs) ---');
    console.log(`Wall clock to card ready:  ${fmtMs(median(walls))}`);
    console.log(`DOMContentLoaded:          ${fmtMs(median(dcl))}`);
    console.log(`First contentful paint:    ${fmtMs(median(fcp))}`);
    console.log(`Boot → Three.js loaded:    ${fmtMs(median(bootToThree))}`);
    console.log(`Three.js → initCard done:  ${fmtMs(median(threeToCard))}`);
    console.log(`Boot → first card frame:   ${fmtMs(median(bootToFrame))}`);
    if (transfer.length) console.log(`HTML transfer (nav):       ${median(transfer)} KB`);
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
