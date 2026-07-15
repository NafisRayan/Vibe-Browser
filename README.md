# Vibe Browser for VS Code

<p align="center">
  <img src="https://raw.githubusercontent.com/NafisRayan/vibe-browser/main/logo.png" alt="Vibe Browser Logo" width="128" height="128"/>
</p>

> Browse your localhost dev server right inside VS Code — with built-in element inspection, screenshots, and DevTools.

Vibe Browser embeds a real browser into your VS Code workspace so you can preview, inspect, and capture your local web app without leaving the editor.

## Overview

Run a local dev server? Vibe Browser lets you:

- Browse **localhost** inside VS Code (Vite, Next.js, React, Angular, Vue, SvelteKit, …)
- Click any element to capture its HTML, styles, and DOM path — copied straight to your clipboard
- Drag-to-select screenshots copied to clipboard
- Inspect console logs and copy them to clipboard
- Open integrated DevTools (Elements, Console, Network)
- Persist bookmarks and your last-visited URL across sessions

> Vibe Browser is a **localhost-only** tool. It loads `localhost` / `127.0.0.1` URLs only — everything is routed through a local proxy so cookies, storage, and the element picker all work like a real browser tab.

## Features

### 🌐 Localhost Browser
- Browse any localhost dev server within VS Code
- Native browser behavior: real cookies, localStorage, sessionStorage, IndexedDB
- URL persistence — your last visited page is restored on reload
- Persistent bookmarks
- VS Code-native toolbar

### 🎯 Element Picker
- Click any element to capture its full context (DOM path, computed styles, HTML)
- High-quality 2× resolution element screenshots
- All captured info goes straight to your clipboard — paste it anywhere

### 📸 Area Screenshots
- Drag to select any region of the page
- Automatically copied to clipboard on capture

### 📋 Console Logs
- View console output from the page
- One-click copy of all console logs to clipboard

### 🔧 DevTools
- Integrated DevTools panel (Elements, Console, Network)
- Deep inspection powered by a local proxy

## Requirements

- VS Code **1.96.0** or later

## Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=NafisRayan.vibe-browser)
2. Or search **"Vibe Browser"** in the VS Code Extensions sidebar

## Usage

### Opening the Browser
- Click the **Globe icon** (`🌐`) in the editor title bar or the status bar
- Or press `F1` → **Open Vibe Browser**

### Browsing
1. Enter a localhost URL in the address bar (e.g. `localhost:3000`, `127.0.0.1:5173`, or just `3000`)
2. Vibe Browser proxies the page through a local origin, preserving full browser functionality

### Picking Elements
1. Click the **Inspect icon** in the toolbar
2. Hover over elements — they'll be highlighted
3. Click to capture — element details and a screenshot (if available) are copied to your clipboard

### Taking Screenshots
1. Click the **Camera icon** in the toolbar
2. Drag to select an area
3. The screenshot is copied to your clipboard

### Console Logs
1. Click the **Terminal icon** to open the console panel
2. Use **Browser Menu → Copy Console Logs** to copy all output to clipboard

### Bookmarks
- Click the star icon in the address bar to bookmark the current page
- Bookmarks are saved across sessions

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `visualBrowser.enableDebugLogs` | `boolean` | `false` | Enable debug logging for the proxy and injection scripts |

## How It Works

Vibe Browser runs a lightweight HTTP proxy on a random local port that forwards requests to your dev server. The proxied page is loaded in a sandboxed iframe within a VS Code Webview panel. This architecture gives you:

- **Same-origin injection** — the element picker and screenshot tools are served from the proxy origin, so they work on every framework (including Next.js with mixed content protections)
- **Real browser storage** — cookies, localStorage, sessionStorage, and IndexedDB are handled natively by the iframe
- **Stripped framing headers** — `X-Frame-Options` and CSP `frame-ancestors` directives are removed so dev pages never blank out

Non-localhost URLs are rejected with a clear message.

## Development

```bash
# Install dependencies
npm install
cd webview-ui && npm install

# Compile the extension
npm run compile

# Build the webview UI
npm run build:webview

# Watch for changes
npm run watch

# Package as .vsix
npm run package
```

## Release Notes

### 1.0
- Rearchitected as a localhost-only browser with a single local proxy on a stable origin
- Element picker works everywhere (including Next.js) — injected script is same-origin
- Real browser storage — native cookies, localStorage, sessionStorage, IndexedDB
- Strips `X-Frame-Options` / CSP so framed dev pages never blank out
- Tightened webview CSP and removed legacy security holes
- Non-localhost URLs show a clear message instead of a broken iframe

### 1.0.4
- Fixed URL persistence — last visited page restored on reload

### 1.0.3
- Added persistent storage (cookies, localStorage, sessionStorage)
- Improved external site stability with iframe isolation

### 1.0.2
- Added bookmarks support
- High-quality element picker (2× resolution)

### 1.0.1
- Initial release

---

<p align="center">
Made with ❤️ for AI-powered development
</p>
