// Script to generate Apple Wallet pass (.pkpass file)
// Run with: node generate-wallet-pass.js

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration - UPDATE THIS with your deployed URL
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://tianbreznik.github.io/perspective';
const PASS_TYPE = 'generic'; // 'generic', 'coupon', 'eventTicket', etc.

// Create pass directory structure
const passDir = path.join(__dirname, 'wallet-pass');
const passContentDir = path.join(passDir, 'pass');

// Clean and create directories
if (fs.existsSync(passDir)) {
    fs.rmSync(passDir, { recursive: true });
}
fs.mkdirSync(passContentDir, { recursive: true });

// Generate pass.json
const passJson = {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.perspective.studio',
    serialNumber: 'perspective-001',
    teamIdentifier: 'TEAM123456', // You'll need to replace with your Apple Team ID if signing
    organizationName: 'Perspective Studio',
    description: 'Perspective Studio Digital Business Card',
    logoText: 'Perspective',
    foregroundColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(100, 100, 100)',
    webServiceURL: WEBSITE_URL,
    associatedStoreIdentifiers: [],
    appLaunchURL: WEBSITE_URL,
    userInfo: {
        website: WEBSITE_URL
    },
    generic: {
        primaryFields: [
            {
                key: 'name',
                label: 'Perspective Studio',
                value: 'Perspective Studio'
            }
        ],
        secondaryFields: [
            {
                key: 'tagline',
                label: '',
                value: 'Building the web we want to live with, one system at a time'
            }
        ],
        auxiliaryFields: [
            {
                key: 'quote',
                label: '',
                value: '"Did I lose my perspective?"'
            }
        ],
        backFields: [
            {
                key: 'website',
                label: 'Website',
                value: WEBSITE_URL
            },
            {
                key: 'description',
                label: 'Description',
                value: 'Building the web we want to live with, one system at a time'
            },
            {
                key: 'quote',
                label: 'Quote',
                value: '"Did I lose my perspective?" — Charlotte Emma Aitchison'
            }
        ]
    }
};

// Write pass.json
fs.writeFileSync(
    path.join(passContentDir, 'pass.json'),
    JSON.stringify(passJson, null, 2)
);

console.log('✓ Created pass.json');

// Create a simple HTML file to generate images using canvas
const imageGeneratorHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Wallet Pass Image Generator</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        canvas { border: 1px solid #ccc; margin: 10px; display: block; }
        button { padding: 10px 20px; font-size: 16px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Apple Wallet Pass Image Generator</h1>
    <p>Generate the required images for your Wallet pass:</p>
    
    <h2>Icon (29x29, 40x40, 60x60, 58x58, 87x87, 80x80, 120x120, 180x180, 1024x1024)</h2>
    <canvas id="icon" width="1024" height="1024"></canvas>
    
    <h2>Logo (320x100)</h2>
    <canvas id="logo" width="320" height="100"></canvas>
    
    <h2>Logo@2x (640x200)</h2>
    <canvas id="logo2x" width="640" height="200"></canvas>
    
    <br>
    <button onclick="downloadImages()">Download All Images</button>
    
    <script>
        function generateIcon(canvas) {
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            
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
        
        function generateLogo(canvas) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // Draw "Perspective" text
            ctx.fillStyle = '#000000';
            ctx.font = \`bold \${height * 0.4}px serif\`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Perspective', width / 2, height / 2);
        }
        
        function downloadCanvas(canvas, filename) {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        
        function downloadImages() {
            // Generate icon
            const iconCanvas = document.getElementById('icon');
            generateIcon(iconCanvas);
            downloadCanvas(iconCanvas, 'icon.png');
            
            // Generate logo
            setTimeout(() => {
                const logoCanvas = document.getElementById('logo');
                generateLogo(logoCanvas);
                downloadCanvas(logoCanvas, 'logo.png');
            }, 500);
            
            // Generate logo@2x
            setTimeout(() => {
                const logo2xCanvas = document.getElementById('logo2x');
                generateLogo(logo2xCanvas);
                downloadCanvas(logo2xCanvas, 'logo@2x.png');
            }, 1000);
        }
        
        // Auto-generate on load
        window.onload = () => {
            generateIcon(document.getElementById('icon'));
            generateLogo(document.getElementById('logo'));
            generateLogo(document.getElementById('logo2x'));
        };
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(passDir, 'generate-images.html'), imageGeneratorHTML);
console.log('✓ Created image generator at wallet-pass/generate-images.html');

console.log('\n📱 Next steps:');
console.log('1. Open wallet-pass/generate-images.html in your browser');
console.log('2. Click "Download All Images"');
console.log('3. Move icon.png, logo.png, and logo@2x.png to wallet-pass/pass/');
console.log('4. Run this script again to create the .pkpass file');
console.log('\n⚠️  Note: You need to add the images before creating the .pkpass file');

