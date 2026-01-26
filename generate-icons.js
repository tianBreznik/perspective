// Simple script to generate PWA icons
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Create a simple HTML file that generates icons using canvas
const iconGeneratorHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <h1>PWA Icon Generator</h1>
    <p>Open this file in a browser and the icons will be generated automatically.</p>
    <canvas id="icon192" width="192" height="192" style="border: 1px solid #ccc; margin: 10px;"></canvas>
    <canvas id="icon512" width="512" height="512" style="border: 1px solid #ccc; margin: 10px;"></canvas>
    <br>
    <button onclick="downloadIcons()">Download Icons</button>
    
    <script>
        function generateIcon(canvas, size) {
            const ctx = canvas.getContext('2d');
            
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // Draw "P" for Perspective
            ctx.fillStyle = '#000000';
            ctx.font = \`bold \${size * 0.6}px serif\`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', size / 2, size / 2);
        }
        
        function downloadIcons() {
            // Generate 192x192 icon
            const canvas192 = document.getElementById('icon192');
            generateIcon(canvas192, 192);
            canvas192.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'icon-192.png';
                a.click();
                URL.revokeObjectURL(url);
            });
            
            // Generate 512x512 icon
            setTimeout(() => {
                const canvas512 = document.getElementById('icon512');
                generateIcon(canvas512, 512);
                canvas512.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'icon-512.png';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }, 500);
        }
        
        // Auto-generate on load
        window.onload = () => {
            generateIcon(document.getElementById('icon192'), 192);
            generateIcon(document.getElementById('icon512'), 512);
        };
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'icon-generator.html'), iconGeneratorHTML);

console.log('Icon generator created!');
console.log('1. Open public/icon-generator.html in your browser');
console.log('2. Click "Download Icons" to save icon-192.png and icon-512.png');
console.log('3. Move the downloaded icons to the public/ folder');

