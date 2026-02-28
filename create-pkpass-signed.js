// Script to create a signed .pkpass file using passkit-generator
// Requires: Apple Developer certificates in certs/ folder
// Run with: node create-pkpass-signed.js

const fs = require('fs');
const path = require('path');
const { PKPass } = require('passkit-generator');

const passModelDir = path.join(__dirname, 'wallet-pass', 'perspective.pass');
const certsDir = path.join(__dirname, 'certs');
const outputFile = path.join(__dirname, 'perspective-card.pkpass');

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://tianbreznik.github.io/perspective';
const SIGNER_KEY_PASSPHRASE = process.env.SIGNER_KEY_PASSPHRASE || '';

async function createSignedPass() {
    // Check model directory
    if (!fs.existsSync(passModelDir)) {
        console.error('❌ Error: wallet-pass/perspective.pass/ not found!');
        console.error('   Run: npm run generate-wallet-pass');
        process.exit(1);
    }
    if (!fs.existsSync(path.join(passModelDir, 'pass.json'))) {
        console.error('❌ Error: pass.json not found in perspective.pass/');
        process.exit(1);
    }
    if (!fs.existsSync(path.join(passModelDir, 'icon.png'))) {
        console.error('❌ Error: icon.png is required. Generate images via wallet-pass/generate-images.html');
        process.exit(1);
    }

    // Load certificates
    const wwdrPath = path.join(certsDir, 'wwdr.pem');
    const signerCertPath = path.join(certsDir, 'signerCert.pem');
    const signerKeyPath = path.join(certsDir, 'signerKey.pem');

    if (!fs.existsSync(wwdrPath) || !fs.existsSync(signerCertPath) || !fs.existsSync(signerKeyPath)) {
        console.error('❌ Error: Certificate files not found in certs/');
        console.error('   Required: wwdr.pem, signerCert.pem, signerKey.pem');
        console.error('   See certs/CERTIFICATES.md for setup instructions');
        process.exit(1);
    }

    const wwdr = fs.readFileSync(wwdrPath);
    const signerCert = fs.readFileSync(signerCertPath);
    const signerKey = fs.readFileSync(signerKeyPath);

    try {
        const pass = await PKPass.from(
            {
                model: passModelDir,
                certificates: {
                    wwdr,
                    signerCert,
                    signerKey,
                    signerKeyPassphrase: SIGNER_KEY_PASSPHRASE || undefined,
                },
            },
            {
                serialNumber: 'perspective-001',
                passTypeIdentifier: 'pass.com.distribute.perspective',
                teamIdentifier: process.env.APPLE_TEAM_ID || 'JJYL234FP7',
            }
        );

        const buffer = pass.getAsBuffer();
        fs.writeFileSync(outputFile, buffer);

        const sizeKB = (buffer.length / 1024).toFixed(1);
        console.log(`\n✅ Success! Created signed ${outputFile}`);
        console.log(`   File size: ${sizeKB} KB`);
        console.log('\n📱 To add to Apple Wallet:');
        console.log('   1. Transfer the .pkpass file to your iPhone');
        console.log('   2. Open it (via AirDrop, email, or Safari link)');
        console.log('   3. Tap "Add" when prompted');
        console.log('\n💡 This pass is signed and can be distributed to others.');
    } catch (err) {
        console.error('❌ Error creating signed pass:', err.message);
        if (err.message.includes('passTypeIdentifier') || err.message.includes('teamIdentifier')) {
            console.error('\n   Make sure pass.json and your certificate match:');
            console.error('   - passTypeIdentifier in pass.json must match your Pass Type ID');
            console.error('   - teamIdentifier must match your Apple Team ID (APPLE_TEAM_ID env)');
        }
        process.exit(1);
    }
}

createSignedPass();
