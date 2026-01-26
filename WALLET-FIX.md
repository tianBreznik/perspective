# Fix: Pass Not Adding to Wallet

## The Problem
When you open a `.pkpass` file from the **Files app**, iOS doesn't recognize it as a Wallet pass and just shows a file preview.

## The Solution
You need to open the pass from **Safari** (web browser), not the Files app.

## Steps to Fix

### Option 1: Serve from Your Website (Recommended)

1. **Copy the `.pkpass` file to your `public/` folder:**
   ```bash
   cp perspective-card.pkpass public/
   ```

2. **Deploy to GitHub Pages** (if not already done)

3. **Open in Safari on iPhone:**
   - Go to: `https://tianbreznik.github.io/perspective/perspective-card.pkpass`
   - Safari will automatically prompt "Add to Wallet"

### Option 2: Use AirDrop or Email

1. **AirDrop the file** from your Mac to iPhone
2. **Tap the notification** on iPhone
3. It should open in Wallet automatically

### Option 3: Email Yourself

1. **Email the `.pkpass` file** to yourself
2. **Open the email on iPhone** in the Mail app
3. **Tap the attachment**
4. It should prompt to add to Wallet

## Why This Happens

- The Files app treats `.pkpass` as a generic file
- Safari recognizes the MIME type and triggers Wallet
- AirDrop/Email work because they use the system's pass handler

## Quick Test

1. Make sure you have the pass file: `perspective-card.pkpass`
2. Copy it to `public/` folder
3. Deploy to GitHub Pages
4. Open `https://tianbreznik.github.io/perspective/perspective-card.pkpass` in Safari on iPhone
5. You should see the "Add to Wallet" prompt!

