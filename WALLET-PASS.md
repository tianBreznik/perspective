# Creating an Apple Wallet Pass

This guide will help you create an Apple Wallet pass (.pkpass file) that opens your 3D business card website.

## Quick Start

1. **Set your website URL** (after deployment):
   ```bash
   export WEBSITE_URL="https://tianbreznik.github.io/perspective"
   npm run generate-wallet-pass
   ```

2. **Generate images**:
   - Open `wallet-pass/generate-images.html` in your browser
   - Click "Download All Images"
   - Move `icon.png`, `logo.png`, and `logo@2x.png` to `wallet-pass/pass/`

3. **Create the .pkpass file**:
   ```bash
   npm run create-pkpass
   ```

4. **Share the pass**:
   - The file `perspective-card.pkpass` will be created
   - Share it via AirDrop, email, or host it on your website

## Detailed Steps

### Step 1: Deploy Your Website

First, deploy your website to a public URL (Vercel, Netlify, etc.). You'll need this URL for the pass.

### Step 2: Generate Pass Structure

```bash
WEBSITE_URL="https://tianbreznik.github.io/perspective" npm run generate-wallet-pass
```

This creates:
- `wallet-pass/pass/pass.json` - The pass configuration
- `wallet-pass/generate-images.html` - Image generator tool

### Step 3: Create Images

1. Open `wallet-pass/generate-images.html` in your browser
2. Click "Download All Images"
3. Move the downloaded files to `wallet-pass/pass/`:
   - `icon.png` (1024x1024)
   - `logo.png` (320x100)
   - `logo@2x.png` (640x200)

**Or create custom images:**
- Icon: 1024x1024 PNG (will be scaled down for different sizes)
- Logo: 320x100 PNG (standard) and 640x200 PNG (@2x)

### Step 4: Package the Pass

```bash
npm run create-pkpass
```

This creates `perspective-card.pkpass` in your project root.

### Step 5: Test on iPhone

1. Transfer `perspective-card.pkpass` to your iPhone:
   - AirDrop it
   - Email it to yourself
   - Upload to iCloud Files
   - Host it on a website and open the link

2. Open the file on your iPhone
3. Tap "Add" when prompted
4. The card will appear in your Wallet app!

### Step 6: Share with Others

**Option A: Direct File Share**
- Send the `.pkpass` file via AirDrop, email, or messaging

**Option B: Web Link**
- Host the `.pkpass` file on your website
- Create a link: `<a href="perspective-card.pkpass">Add to Wallet</a>`
- When users tap the link on iOS, it will automatically open in Wallet

**Option C: QR Code**
- Generate a QR code pointing to your `.pkpass` file URL
- Users scan the QR code to add to Wallet

## Customization

Edit `wallet-pass/pass/pass.json` to customize:
- Colors (foregroundColor, backgroundColor)
- Text fields
- Organization name
- Logo text

## Important Notes

⚠️ **Unsigned Passes**: The passes created by this script are unsigned. They will work for:
- Testing on your own devices
- Development purposes
- Personal use

For production/distribution, you may want to:
- Sign the pass with an Apple Developer certificate
- Use a service like PassKit or similar

🔒 **Signing (Optional)**: To sign passes for wider distribution:
1. Get an Apple Developer account
2. Create a Pass Type ID
3. Generate certificates
4. Use a library like `node-passbook` with signing

## Troubleshooting

**Pass won't add to Wallet:**
- Make sure the `.pkpass` file is a valid ZIP
- Check that `pass.json` is valid JSON
- Ensure images are PNG format

**Images not showing:**
- Verify image files are in `wallet-pass/pass/` directory
- Check image dimensions match requirements
- Ensure images are PNG format

**Website doesn't open:**
- Verify `WEBSITE_URL` is set correctly in `pass.json`
- Make sure the website is publicly accessible
- Check that the URL uses HTTPS (required for production)

