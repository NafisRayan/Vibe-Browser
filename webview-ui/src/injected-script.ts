import { formatElementDetails } from './common/dom-utils';
import { toPng } from 'html-to-image';

declare global {
    interface Window {
        __visualBrowserPickerInjected: boolean;
        __visualBrowserNetPatched: boolean;
        __vbConsoleCaptured: boolean;
        __vbGetConsole?: () => string;
    }
}

// ============================================================================
// Console capture — runs FIRST so it records every log the page emits.
// Wraps console.log/info/warn/error/debug (and window errors), keeping the
// original output intact, and exposes a formatted dump via __vbGetConsole().
// ============================================================================
(function captureConsole() {
    if (window.__vbConsoleCaptured) return;
    window.__vbConsoleCaptured = true;

    const buffer: { level: string; text: string }[] = [];
    const MAX = 1000;

    function serialize(args: any[]): string {
        return args.map((a) => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return a.stack || a.message;
            try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
    }
    function record(level: string, text: string) {
        buffer.push({ level, text });
        if (buffer.length > MAX) buffer.shift();
    }

    (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
        const orig = (console as any)[level] ? (console as any)[level].bind(console) : () => {};
        (console as any)[level] = function (...args: any[]) {
            try { record(level, serialize(args)); } catch { /* ignore */ }
            orig(...args);
        };
    });

    window.addEventListener('error', (e) => {
        record('error', e.message + (e.filename ? ` (${e.filename}:${e.lineno}:${e.colno})` : ''));
    });
    window.addEventListener('unhandledrejection', (e: any) => {
        record('error', 'Unhandled promise rejection: ' + serialize([e && e.reason]));
    });

    window.__vbGetConsole = function () {
        if (buffer.length === 0) return '';
        const lines = buffer.map((e) => `[${e.level.toUpperCase()}] ${e.text}`).join('\n');
        return '**Console logs — ' + location.href + '**\n\n```\n' + lines + '\n```';
    };
})();

// ============================================================================
// Network rewriter — runs FIRST, before any app code.
// Rewrites cross-port localhost fetch/XHR/WS calls to go through the proxy
// origin so the browser sees same-origin requests (no CORS).
// ============================================================================
(function patchNetwork() {
    if (window.__visualBrowserNetPatched) return;
    window.__visualBrowserNetPatched = true;

    const isLocal = (h: string) => h === 'localhost' || h === '127.0.0.1';

    function toProxy(raw: string): string {
        try {
            const abs = new URL(raw, location.href);
            if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return raw;
            if (!isLocal(abs.hostname)) return raw;
            if (abs.host === location.host) return raw;
            const port = abs.port || (abs.protocol === 'https:' ? '443' : '80');
            if (port === location.port) return raw;
            return location.origin + '/__vbproxy__/' + port + abs.pathname + abs.search + abs.hash;
        } catch { return raw; }
    }

    function toProxyWs(raw: string): string {
        try {
            const abs = new URL(raw, location.href);
            if (abs.protocol !== 'ws:' && abs.protocol !== 'wss:') return raw;
            if (!isLocal(abs.hostname)) return raw;
            if (abs.host === location.host) return raw;
            const port = abs.port || (abs.protocol === 'wss:' ? '443' : '80');
            if (port === location.port) return raw;
            const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            return proto + '//' + location.host + '/__vbproxy__/' + port + abs.pathname + abs.search;
        } catch { return raw; }
    }

    try {
        const origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function (input: any, init?: any) {
                try {
                    if (typeof input === 'string') input = toProxy(input);
                    else if (input instanceof URL) input = toProxy(input.href);
                    else if (typeof Request !== 'undefined' && input instanceof Request) {
                        const nu = toProxy(input.url);
                        if (nu !== input.url) input = new Request(nu, input);
                    }
                } catch { /* ignore */ }
                return origFetch.call(this, input, init);
            };
        }
    } catch { /* ignore */ }

    try {
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
            try { url = toProxy(String(url)); } catch { /* ignore */ }
            return (origOpen as any).call(this, method, url, ...rest);
        };
    } catch { /* ignore */ }

    try {
        const OrigWS: any = window.WebSocket;
        if (OrigWS) {
            const WSProxy: any = function (url: string, protocols?: any) {
                const u = toProxyWs(String(url));
                return protocols !== undefined ? new OrigWS(u, protocols) : new OrigWS(u);
            };
            WSProxy.prototype = OrigWS.prototype;
            ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => { WSProxy[k] = OrigWS[k]; });
            window.WebSocket = WSProxy;
        }
    } catch { /* ignore */ }

    try {
        if (navigator.sendBeacon) {
            const origBeacon = navigator.sendBeacon.bind(navigator);
            navigator.sendBeacon = function (url: string | URL, data?: any) {
                try { url = toProxy(String(url)); } catch { /* ignore */ }
                return origBeacon(url as string, data);
            };
        }
    } catch { /* ignore */ }
})();

// ============================================================================
// Element picker + area screenshot snipper
// ============================================================================
(function () {
    if (window.__visualBrowserPickerInjected) return;
    window.__visualBrowserPickerInjected = true;

    let pickerEnabled = false;
    let hovered: HTMLElement | null = null;
    let snipperEnabled = false;

    // Picker overlay
    const overlay = document.createElement('div');
    overlay.id = 'vibe-browser-injected-overlay';
    overlay.style.cssText = `
        position: fixed; pointer-events: none;
        background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.5);
        z-index: 2147483646; display: none; transition: all 0.05s ease-out;
    `;

    const badge = document.createElement('span');
    badge.style.cssText = `
        position: absolute; top: -24px; left: 0;
        background: #3b82f6; color: white; padding: 2px 6px;
        font-family: Consolas, monospace; font-size: 12px;
        border-radius: 2px; pointer-events: none; white-space: nowrap;
    `;
    overlay.appendChild(badge);

    function init() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        document.body.appendChild(overlay);
    }
    init();

    // Message handler
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || !msg.command) return;

        switch (msg.command) {
            case 'reloadFrame':
                location.reload();
                break;
            case 'copyConsole': {
                const text = window.__vbGetConsole ? window.__vbGetConsole() : '';
                window.parent.postMessage({
                    command: 'consoleLogsCaptured',
                    text: text || '_No console logs captured on this page yet._'
                }, '*');
                break;
            }
            case 'historyBack':
                history.back();
                break;
            case 'historyForward':
                history.forward();
                break;
            case 'togglePicker':
                pickerEnabled = msg.enabled;
                if (pickerEnabled) snipperEnabled = false;
                if (!pickerEnabled) {
                    overlay.style.display = 'none';
                    hovered = null;
                    document.body.style.cursor = '';
                } else {
                    document.body.style.cursor = 'crosshair';
                }
                break;
            case 'toggleSnipper':
                snipperEnabled = msg.enabled;
                if (snipperEnabled) {
                    pickerEnabled = false;
                    document.body.style.cursor = 'crosshair';
                    createSnipperOverlay();
                } else {
                    document.body.style.cursor = '';
                    removeSnipperOverlay();
                }
                break;
        }
    });

    // ===== Snipper (area screenshot) =====

    let snipperOverlay: HTMLElement | null = null;
    let selectionBox: HTMLElement | null = null;
    let startX = 0, startY = 0, isDragging = false;

    function createSnipperOverlay() {
        if (snipperOverlay) return;

        snipperOverlay = document.createElement('div');
        snipperOverlay.id = 'vibe-browser-snipper-overlay';
        snipperOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 2147483647; background: rgba(0, 0, 0, 0.3); cursor: crosshair;
        `;

        selectionBox = document.createElement('div');
        selectionBox.style.cssText = `
            position: absolute; border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1); display: none; pointer-events: none;
        `;
        snipperOverlay.appendChild(selectionBox);
        document.body.appendChild(snipperOverlay);

        snipperOverlay.addEventListener('mousedown', onSnipperMouseDown);
        snipperOverlay.addEventListener('mousemove', onSnipperMouseMove);
        snipperOverlay.addEventListener('mouseup', onSnipperMouseUp);
    }

    function removeSnipperOverlay() {
        if (snipperOverlay) {
            snipperOverlay.remove();
            snipperOverlay = null;
            selectionBox = null;
        }
    }

    function onSnipperMouseDown(e: MouseEvent) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        if (selectionBox) {
            selectionBox.style.display = 'block';
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
        }
    }

    function onSnipperMouseMove(e: MouseEvent) {
        if (!isDragging || !selectionBox) return;
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
        selectionBox.style.left = Math.min(e.clientX, startX) + 'px';
        selectionBox.style.top = Math.min(e.clientY, startY) + 'px';
    }

    function onSnipperMouseUp(_e: MouseEvent) {
        isDragging = false;
        if (!selectionBox || !snipperOverlay) return;
        const rect = selectionBox.getBoundingClientRect();

        const finishSnipper = () => {
            removeSnipperOverlay();
            window.parent.postMessage({ command: 'toggleSnipper', enabled: false }, '*');
        };

        if (rect.width <= 5 || rect.height <= 5) {
            finishSnipper();
            return;
        }

        // Hide overlays for capture
        snipperOverlay.style.display = 'none';
        if (overlay) overlay.style.display = 'none';

        requestAnimationFrame(async () => {
            try {
                const pixelRatio = 2;
                const viewportDataUrl = await toPng(document.documentElement, {
                    pixelRatio,
                    cacheBust: false,
                    skipFonts: true,
                    skipAutoScale: true,
                    style: { transform: 'none' },
                    filter: (node) => {
                        const el = node as HTMLElement;
                        if (el.style?.display === 'none' || el.style?.visibility === 'hidden') return false;
                        if (el.id === 'vibe-browser-injected-overlay' ||
                            el.id === 'vibe-browser-snipper-overlay' ||
                            el.id === 'react-toolbar-root' ||
                            el.id === 'vibe-browser-devtools-overlay') return false;
                        if (el.tagName === 'IMG') {
                            const src = el.getAttribute('src') || '';
                            if (src.startsWith('http') && !src.startsWith(window.location.origin)) return false;
                        }
                        return true;
                    }
                });

                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        canvas.width = rect.width;
                        canvas.height = rect.height;

                        const sourceX = (rect.left + window.scrollX) * pixelRatio;
                        const sourceY = (rect.top + window.scrollY) * pixelRatio;
                        const sourceWidth = rect.width * pixelRatio;
                        const sourceHeight = rect.height * pixelRatio;

                        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, rect.width, rect.height);

                        // Use PNG for lossless clipboard quality
                        const croppedDataUrl = canvas.toDataURL('image/png');
                        window.parent.postMessage({ command: 'screenshotCaptured', data: croppedDataUrl }, '*');
                    } catch { /* canvas error — fall through */ }
                };
                img.onerror = () => {
                    window.parent.postMessage({ command: 'screenshotCaptured', data: viewportDataUrl }, '*');
                };
                img.src = viewportDataUrl;
            } catch { /* capture error */ }

            finishSnipper();
        });
    }

    // ===== Picker hover + click =====

    let rAF: number | null = null;

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!pickerEnabled) return;
        if (rAF) return;

        rAF = requestAnimationFrame(() => {
            rAF = null;
            const target = e.target as HTMLElement;
            if (target === overlay || target === badge) return;

            if (hovered !== target) {
                hovered = target;
                const rect = target.getBoundingClientRect();
                overlay.style.display = 'block';
                overlay.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
                overlay.style.top = '0';
                overlay.style.left = '0';

                const idStr = target.id ? '#' + target.id : '';
                const tagStr = target.tagName ? target.tagName.toLowerCase() : '';
                badge.textContent = tagStr + idStr + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height);
            }
        });
    }, true);

    document.addEventListener('click', async (e: MouseEvent) => {
        if (!pickerEnabled) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const target = e.target as HTMLElement;
        const detailedInfo = formatElementDetails(target);

        // Hide overlay temporarily for screenshot
        overlay.style.display = 'none';

        let elementScreenshot: string | null = null;
        try {
            const computedStyle = window.getComputedStyle(target);
            const bgColor = computedStyle.backgroundColor;

            const result = await toPng(target, {
                pixelRatio: 2,
                cacheBust: false,
                skipFonts: true,
                style: {
                    backgroundColor: bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : undefined,
                },
            });

            if (result) {
                elementScreenshot = result;
            }
        } catch { /* capture error */ }

        window.parent.postMessage({
            command: 'elementPicked',
            text: detailedInfo,
            elementScreenshot: elementScreenshot
        }, '*');

        // Re-show overlay for next pick
        overlay.style.display = 'block';
    }, true);
})();
