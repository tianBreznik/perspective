# Deployment Steps - Quick Guide

## Step 1: Enable GitHub Pages
1. Go to: https://github.com/tianBreznik/perspective/settings/pages
2. Under "Source", select **"GitHub Actions"** (NOT "Deploy from a branch")
3. Click **Save**

## Step 2: Check Workflow Status
1. Go to: https://github.com/tianBreznik/perspective/actions
2. You should see "Deploy to GitHub Pages" workflow
3. If it's not running, click **"Run workflow"** → **"Run workflow"** button

## Step 3: Wait for Deployment
- The workflow will take 1-2 minutes
- You'll see green checkmarks when it's done
- Your site will be live at: **https://tianbreznik.github.io/perspective/**

## Step 4: Update Wallet Pass (After Deployment)
Once your site is live, update the wallet pass:

```bash
WEBSITE_URL="https://tianbreznik.github.io/perspective" npm run generate-wallet-pass
```

Then:
1. Open `wallet-pass/generate-images.html` in browser
2. Download the images
3. Move them to `wallet-pass/pass/`
4. Run: `npm run create-pkpass`

## Step 5: Test Your Site
Visit: https://tianbreznik.github.io/perspective/

If you see your 3D card, you're all set! 🎉

