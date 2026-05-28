# Tab Reader

A clean, distraction-free Ultimate Guitar tab reader. Paste a UG URL, get a beautiful tab view.

## Deploy in 2 minutes

### Step 1 — Push to GitHub

```bash
# In this folder:
git init
git add .
git commit -m "init tab reader"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ug-tab-reader.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** and select your repo
3. Leave all settings as default — Vercel auto-detects Next.js
4. Click **Deploy**

That's it. No environment variables needed.

## How it works

- **Frontend**: Next.js (Pages Router), no external UI libraries
- **Backend**: `/pages/api/fetch-tab.js` — a Vercel Serverless Function that fetches the UG page with browser-like headers, extracts the embedded `window.UGAPP.store.page` JSON, parses the tab content, and strips UG formatting tags
- **Styling**: Pure CSS-in-JS via `<style jsx global>`, no Tailwind dependency

## Project structure

```
ug-tab-reader/
├── pages/
│   ├── index.js          # Frontend UI
│   └── api/
│       └── fetch-tab.js  # Serverless scraper
├── package.json
├── next.config.js
└── .gitignore
```
