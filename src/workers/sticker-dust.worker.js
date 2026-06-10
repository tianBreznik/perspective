/** Scan sticker image pixels and build particle buffers off the main thread. */
self.onmessage = (e) => {
    const { data, imgW, imgH, stride, stickerW, stickerH, alphaThreshold } = e.data;

    let count = 0;
    for (let py = 0; py < imgH; py += stride) {
        for (let px = 0; px < imgW; px += stride) {
            if (data[(py * imgW + px) * 4 + 3] >= alphaThreshold) count++;
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
            if (data[idx + 3] < alphaThreshold) continue;

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

    self.postMessage(
        { count, positions, initPos, colors, pvx, pvy },
        [positions.buffer, initPos.buffer, colors.buffer, pvx.buffer, pvy.buffer]
    );
};
