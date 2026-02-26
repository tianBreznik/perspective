// Script to package the Wallet pass into a .pkpass file
// Run with: node create-pkpass.js

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const passDir = path.join(__dirname, 'wallet-pass', 'perspective.pass');
const outputFile = path.join(__dirname, 'perspective-card.pkpass');

// Check if pass directory exists and has required files
if (!fs.existsSync(passDir)) {
    console.error('❌ Error: wallet-pass/perspective.pass/ directory not found!');
    console.error('   Run generate-wallet-pass.js first');
    process.exit(1);
}

const passJsonPath = path.join(passDir, 'pass.json');
if (!fs.existsSync(passJsonPath)) {
    console.error('❌ Error: pass.json not found!');
    console.error('   Run generate-wallet-pass.js first');
    process.exit(1);
}

// Check for images (they're optional but recommended)
const hasIcon = fs.existsSync(path.join(passDir, 'icon.png'));
const hasLogo = fs.existsSync(path.join(passDir, 'logo.png'));

if (!hasIcon || !hasLogo) {
    console.warn('⚠️  Warning: Some images are missing. The pass will work but may not look as good.');
    console.warn('   Generate images using wallet-pass/generate-images.html');
}

// Create .pkpass file (it's just a ZIP file)
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Success! Created ${outputFile}`);
    console.log(`   File size: ${sizeMB} MB`);
    console.log('\n📱 To add to Apple Wallet:');
    console.log('   1. Transfer the .pkpass file to your iPhone');
    console.log('   2. Open it (via AirDrop, email, or Files app)');
    console.log('   3. Tap "Add" when prompted');
    console.log('\n💡 Tip: You can also serve this file from a web server');
    console.log('   and link to it with: <a href="perspective-card.pkpass">Add to Wallet</a>');
});

archive.on('error', (err) => {
    console.error('❌ Error creating .pkpass file:', err);
    process.exit(1);
});

archive.pipe(output);

// Add all files from pass directory
archive.directory(passDir, false);

archive.finalize();

