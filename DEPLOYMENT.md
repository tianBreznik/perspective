# Deploying Your Digital Business Card

## Quick Deploy Options

### Option 1: Vercel (Recommended - Free & Easy)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in the project directory
3. Follow the prompts
4. Your card will be live at a URL like `https://perspective.vercel.app`
5. Share this URL with anyone!

### Option 2: Netlify (Free & Easy)
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Build your project: `npm run build`
3. Deploy: `netlify deploy --prod --dir=dist`
4. Follow the prompts to create a site
5. Share the URL!

### Option 3: GitHub Pages
1. Push your code to GitHub
2. Go to Settings > Pages
3. Select source branch (usually `main`)
4. Your site will be at `https://yourusername.github.io/perspective`

## Making Icons for PWA

1. Open `public/icon-generator.html` in your browser
2. Click "Download Icons"
3. Move `icon-192.png` and `icon-512.png` to the `public/` folder
4. Or create custom icons (192x192 and 512x512 PNG files) and place them in `public/`

## Installing on iOS (After Deployment)

1. Open your deployed URL on an iPhone/iPad
2. Tap the Share button
3. Select "Add to Home Screen"
4. The card will appear as an app icon!

## Installing on Android

1. Open your deployed URL on Android
2. Browser will show "Add to Home Screen" prompt
3. Tap to install

## Sharing Your Card

Once deployed, you can:
- Share the URL directly
- Share via QR code (generate at https://qr-code-generator.com)
- Add to Apple Wallet (requires additional setup)
- Share as a link in messages, email, etc.

