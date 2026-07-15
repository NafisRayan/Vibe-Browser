import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Toolbar } from './Toolbar';
import { getVsCodeApi } from './vscode';
import { Z_INDEX } from './common/constants';
// Acquire VS Code API once
const vscode = getVsCodeApi();
const rootId = 'react-toolbar-root';
const FRAME_ID = 'vibe-browser-frame';
function getFrame() {
    return document.getElementById(FRAME_ID);
}
function initializeApp() {
    // Load Codicons stylesheet
    const codiconsLink = document.createElement('link');
    codiconsLink.rel = 'stylesheet';
    codiconsLink.href = 'https://unpkg.com/@vscode/codicons@latest/dist/codicon.css';
    document.head.appendChild(codiconsLink);
    const rootElement = document.getElementById(rootId);
    if (!rootElement) {
        console.error('Failed to find #react-toolbar-root');
        return;
    }
    try {
        const root = ReactDOM.createRoot(rootElement);
        root.render(_jsx(React.StrictMode, { children: _jsx(Toolbar, {}) }));
    }
    catch (err) {
        console.error('Failed to mount React:', err);
    }
    // Notify extension host that the webview is ready
    vscode.postMessage({ command: 'webviewReady' });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
}
else {
    initializeApp();
}
// ===== Message bridge =====
// The page content lives inside the proxied iframe. The injected picker script
// runs there and talks to us via postMessage. We forward tool toggles down into
// the iframe, and relay results up to the extension.
window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.command)
        return;
    // Reliable direction check: a message is "from the iframe" only if its source
    // is the iframe's own window. (In a webview, event.source is null for a
    // window.postMessage to self, so `source !== window` misclassifies toolbar
    // messages and they never get forwarded down to the page.)
    const frame = getFrame();
    const fromIframe = !!frame && event.source === frame.contentWindow;
    // Toolbar (this window) -> iframe: forward picker / snipper / reload / nav
    if (!fromIframe && (msg.command === 'togglePicker' ||
        msg.command === 'toggleSnipper' ||
        msg.command === 'reloadFrame' ||
        msg.command === 'historyBack' ||
        msg.command === 'historyForward' ||
        msg.command === 'copyConsole')) {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage(msg, '*');
        }
        return;
    }
    // iframe -> extension: element picked
    if (fromIframe && msg.command === 'elementPicked') {
        vscode.postMessage({
            command: 'elementPicked',
            text: msg.text,
            elementScreenshot: msg.elementScreenshot
        });
        return;
    }
    // iframe -> extension: region screenshot
    if (fromIframe && msg.command === 'screenshotCaptured') {
        vscode.postMessage({ command: 'screenshotCaptured', data: msg.data });
        return;
    }
    // iframe -> extension: captured console logs
    if (fromIframe && msg.command === 'consoleLogsCaptured') {
        vscode.postMessage({ command: 'consoleLogsCaptured', text: msg.text });
        return;
    }
    // iframe -> toolbar: snipper finished, sync button state
    if (fromIframe && msg.command === 'toggleSnipper') {
        window.postMessage({ command: 'toggleSnipper', enabled: msg.enabled }, '*');
        return;
    }
    // extension -> update the DevTools overlay target as Chii discovers it
    if (msg.command === 'updateChiiUrl' && msg.chiiUrl) {
        const overlay = document.getElementById('vb-devtools-overlay');
        const iframe = overlay?.querySelector('iframe');
        if (iframe && iframe.src !== msg.chiiUrl)
            iframe.src = msg.chiiUrl;
        return;
    }
    // extension -> open / toggle DevTools overlay
    if (msg.command === 'toggleInternalDevTools' && msg.chiiUrl) {
        openDevToolsOverlay(msg.chiiUrl);
        return;
    }
});
const DEVTOOLS_HEIGHT = '50%';
// Dock/undock: shrink the page iframe so DevTools sits BELOW it (like a real
// browser) instead of covering the page.
function dockFrame(open) {
    const frame = getFrame();
    if (frame) {
        frame.style.height = open ? `calc(${DEVTOOLS_HEIGHT} - 75px)` : 'calc(100% - 75px)';
    }
}
function openDevToolsOverlay(chiiUrl) {
    let overlay = document.getElementById('vb-devtools-overlay');
    if (overlay) {
        const willShow = overlay.style.display === 'none';
        overlay.style.display = willShow ? 'flex' : 'none';
        dockFrame(willShow);
        const iframe = overlay.querySelector('iframe');
        if (iframe && iframe.src !== chiiUrl)
            iframe.src = chiiUrl;
        return;
    }
    overlay = document.createElement('div');
    overlay.id = 'vb-devtools-overlay';
    overlay.style.cssText = `
        position: fixed; left: 0; right: 0; bottom: 0; height: ${DEVTOOLS_HEIGHT};
        background: #1e1e1e; z-index: ${Z_INDEX.DEVTOOLS};
        display: flex; flex-direction: column;
        overflow: hidden; border-top: 1px solid #333;
    `;
    const iframe = document.createElement('iframe');
    iframe.src = chiiUrl;
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:white;';
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
    dockFrame(true);
}
