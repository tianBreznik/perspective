/**
 * Downscale paper PBR maps to 1K and recompress (macOS sips).
 * Run after replacing source maps: npm run compress-paper-textures
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/textures/Paper001_2K-JPG');
const maps = [
    'Paper001_2K-JPG_Color',
    'Paper001_2K-JPG_NormalGL',
    'Paper001_2K-JPG_Roughness',
    'Paper001_2K-JPG_Displacement',
];

for (const name of maps) {
    const src = path.join(dir, `${name}.jpg`);
    const tmp = path.join(dir, `${name}.tmp.jpg`);
    if (!fs.existsSync(src)) {
        console.warn(`Skip missing ${src}`);
        continue;
    }
    const res = spawnSync('sips', ['-Z', '1024', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', src, '--out', tmp], {
        stdio: 'inherit',
    });
    if (res.status !== 0) process.exit(res.status ?? 1);
    fs.renameSync(tmp, src);
    console.log(`Compressed ${name}.jpg`);
}

console.log('Done — paper maps at 1024px max, JPEG q≈82');
