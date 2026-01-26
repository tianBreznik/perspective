# Deploying to GitHub Pages

Your site is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

## First-Time Setup

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub: `https://github.com/tianBreznik/perspective`
   - Click **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save the settings

2. **Push your code:**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for deployment:**
   - Go to the **Actions** tab in your repository
   - You'll see the deployment workflow running
   - Once complete, your site will be live at:
     `https://tianbreznik.github.io/perspective/`

## Automatic Deployment

Every time you push to the `main` branch, GitHub Actions will:
1. Build your site
2. Deploy it to GitHub Pages
3. Make it available at `https://tianbreznik.github.io/perspective/`

## Manual Deployment

You can also trigger a deployment manually:
1. Go to the **Actions** tab
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

## Updating the Wallet Pass

After deployment, update the wallet pass with your live URL:

```bash
WEBSITE_URL="https://tianbreznik.github.io/perspective" npm run generate-wallet-pass
# Then add images and create the pass
npm run create-pkpass
```

## Troubleshooting

- **404 errors**: Make sure the `base` path in `vite.config.js` matches your repository name
- **Build fails**: Check the Actions tab for error messages
- **Assets not loading**: Ensure all paths use relative URLs (Vite handles this automatically)

