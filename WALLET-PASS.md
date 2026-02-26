# Creating an Apple Wallet Pass

This guide helps you create an Apple Wallet pass (.pkpass) that opens your 3D business card website.

## Quick Start

### Unsigned pass (testing)

1. **Generate pass structure**:
   ```bash
   export WEBSITE_URL="https://tianbreznik.github.io/perspective"
   npm run generate-wallet-pass
   ```

2. **Create images**:
   - **Strip (card front)**: Open the 3D card in your browser, click "Download Wallet Strip", move `strip.png` and `strip@2x.png` to `wallet-pass/perspective.pass/`
   - **Icon & logo**: Open `wallet-pass/generate-images.html`, click "Download All Images", move `icon.png`, `logo.png`, and `logo@2x.png` to `wallet-pass/perspective.pass/`

3. **Create .pkpass**:
   ```bash
   npm run create-pkpass
   ```

Unsigned passes work for local testing (e.g. Simulator or your own device) but may not add on all devices.

### Signed pass (production, after Apple Developer setup)

1. Complete the unsigned steps above
2. Set up certificates (see [certs/CERTIFICATES.md](certs/CERTIFICATES.md))
3. **Create signed .pkpass**:
   ```bash
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   npm run create-pkpass-signed
   ```

## Commands

| Command | Description |
|--------|-------------|
| `npm run generate-wallet-pass` | Creates `wallet-pass/perspective.pass/` and `pass.json` |
| `npm run create-pkpass` | Builds unsigned `.pkpass` |
| `npm run create-pkpass-signed` | Builds signed `.pkpass` (requires certs) |
| `npm run wallet-pass` | generate + create (unsigned) |
| `npm run wallet-pass-signed` | generate + create (signed) |

## Structure

```
wallet-pass/
├── perspective.pass/     # Pass model (pass.json + images)
│   ├── pass.json
│   ├── icon.png
│   ├── logo.png
│   ├── logo@2x.png
│   ├── strip.png        # optional: card front banner
│   └── strip@2x.png
├── generate-images.html
└── ...

certs/                    # For signed passes
├── wwdr.pem
├── signerCert.pem
├── signerKey.pem
└── CERTIFICATES.md       # Full setup guide
```

## Signing (production)

To distribute passes that add on any iPhone:

1. Join the [Apple Developer Program](https://developer.apple.com/programs/)
2. Create a Pass Type ID and signing certificate
3. Convert and place certificates in `certs/`
4. See **certs/CERTIFICATES.md** for step-by-step instructions

## Customization

Edit `wallet-pass/perspective.pass/pass.json`:

- `passTypeIdentifier` – must match your Apple Pass Type ID when signing
- `teamIdentifier` – your Apple Team ID (when signing)
- `foregroundColor`, `backgroundColor`, `labelColor`
- Text fields under `generic`
- `organizationName`, `logoText`

## Troubleshooting

**Pass won't add on a real device**  
Use a signed pass (`create-pkpass-signed`) with valid certificates.

**"Invalid data" or "passTypeIdentifier/teamIdentifier" error**  
Check that `pass.json` matches your certificate. See certs/CERTIFICATES.md.

**Images not showing**  
Ensure `icon.png`, `logo.png`, and `logo@2x.png` are in `wallet-pass/perspective.pass/`.

**Website doesn't open**  
Set `WEBSITE_URL` when generating, or edit `appLaunchURL` in `pass.json`. Must use HTTPS.
