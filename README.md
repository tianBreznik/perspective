# Perspective Studio - Digital Business Card

A 3D interactive business card built with Three.js.

🌐 **Live Site:** [https://tianbreznik.github.io/perspective/](https://tianbreznik.github.io/perspective/)

## Features

- 3D rendered business card with paper texture
- Interactive rotation (drag to rotate)
- Responsive design for mobile and desktop
- Apple Wallet (`.pkpass`) and Google Wallet (signed save link) on the **Add to Wallet** button
- Progressive Web App (PWA) ready

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Automatically deploys to GitHub Pages on push to `master` branch.

## Wallet passes (Apple & Google)

**iPhone:** generate a `.pkpass` that links to the site:

```bash
npm run generate-wallet-pass
npm run create-pkpass
```

**Android (Google Wallet):** there is no static file. After you complete [Google Wallet API](https://developers.google.com/wallet/generic) onboarding and can produce a signed “Add to Google Wallet” URL, set **`VITE_GOOGLE_WALLET_SAVE_URL`** or **`VITE_GOOGLE_WALLET_JWT`** at build time (see `.env.example`). Without that, Android users get the contact-card `.vcf` fallback.

See **`WALLET-PASS.md`** for full instructions.
