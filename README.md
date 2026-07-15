# Vibe Browser for VS Code

<p align="center">
  <img src="https://raw.githubusercontent.com/NafisRayan/vibe-browser/main/logo.png" alt="Vibe Browser Logo" width="128" height="128"/>
</p>

> Browse any website right inside VS Code — with built-in element inspection, screenshots, and DevTools.

Vibe Browser embeds a real browser into your VS Code workspace so you can preview, inspect, and capture web pages (local or remote) without leaving the editor.

## Overview

Vibe Browser lets you:

- Browse **any website** inside VS Code (localhost dev servers, remote sites, etc.)
- Click any element to capture its HTML, styles, and DOM path — copied straight to your clipboard in an AI-friendly format
- Drag-to-select screenshots copied to clipboard
- Inspect console logs and copy them to clipboard
- Open integrated DevTools (Elements, Console, Network)
- Persist bookmarks and your last-visited URL across sessions

## Features

### 🌐 Full Browser
- Browse any URL (localhost, remote, etc.) within VS Code
- Native browser behavior: real cookies, localStorage, sessionStorage, IndexedDB
- URL persistence — your last visited page is restored on reload
- Persistent bookmarks
- VS Code-native toolbar
- Automatic redirect handling — stays in the proxy even when sites redirect

### 🎯 Element Picker
- Click any element to capture its full context (selector, role, DOM path, computed styles, and text)
- AI-friendly, structured Markdown format ready for ChatGPT or other AI tools
- High-quality 2× resolution element screenshots (PNG for crispness)
- All captured info goes straight to your clipboard — paste it anywhere

### 📸 Area Screenshots
- Drag to select any region of the page
- Automatically copied to clipboard on capture (lossless PNG)

### 📋 Console Logs
- View console output from the page
- One-click copy of all console logs to clipboard

### 🔧 DevTools
- Integrated DevTools panel (Elements, Console, Network)
- Works for both local and remote sites

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
1. Enter any URL in the address bar (e.g. `localhost:3000`, `github.com`, or just `3000` for `localhost:3000`)
2. Vibe Browser proxies the page through a local origin, preserving full browser functionality

### Picking Elements
1. Click the **Inspect icon** in the toolbar
2. Hover over elements — they'll be highlighted
3. Click to capture — element details and a screenshot (if available) are copied to your clipboard in AI-friendly Markdown

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

Vibe Browser runs a lightweight HTTP proxy on a random local port that forwards requests to the target URL. The proxied page is loaded in a sandboxed iframe within a VS Code Webview panel. This architecture gives you:

- **Same-origin injection** — the element picker and screenshot tools are served from the proxy origin, so they work on every framework and website
- **Real browser storage** — cookies, localStorage, sessionStorage, and IndexedDB are handled natively by the iframe
- **Stripped framing headers** — `X-Frame-Options` and CSP `frame-ancestors` directives are removed so pages never blank out

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

### 1.1.0
- **Removed localhost-only restriction** — now works with any website!
- **AI-friendly element picker** — structured Markdown format with selector, role, text, styles, and real page URL
- **PNG screenshots** — switched from JPEG to lossless PNG for higher quality
- **Fixed redirect handling** — all redirects stay in the proxy so the element picker works after navigation
- **Better port handling** — OS-assigned random port to avoid permission/conflict errors
- **Bookmark key migration** — updated from `copilot-bridge-bookmarks` to `vibe-browser-bookmarks`
- **Cleaned up code** — removed dead code, simplified CSS, improved comments

### 1.0.0
- Rearchitected as a proxy-based browser with a stable origin
- Element picker works everywhere (including Next.js) — injected script is same-origin
- Real browser storage — native cookies, localStorage, sessionStorage, IndexedDB
- Strips `X-Frame-Options` / CSP so framed dev pages never blank out
- Tightened webview CSP and removed legacy security holes

---

<p align="center">
Made with ❤️ for AI-powered development
</p>
