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
// The framed page is served from the proxy origin. When the app calls another
// localhost port with an ABSOLUTE url (e.g. a separate API server at
// http://localhost:25001), the browser would treat it as cross-origin and block
// it (CORS). We rewrite those calls to /__vbproxy__/<port>/... on our own
// origin, so the proxy forwards them and the browser sees a same-origin request.
// ============================================================================
(function patchNetwork() {
    if (window.__visualBrowserNetPatched) return;
    window.__visualBrowserNetPatched = true;

    const isLocal = (h: string) => h === 'localhost' || h === '127.0.0.1';

    // http(s) -> proxied same-origin path
    function toProxy(raw: string): string {
        try {
            const abs = new URL(raw, location.href);
            if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return raw;
            if (!isLocal(abs.hostname)) return raw;
            if (abs.host === location.host) return raw;              // already our origin
            const port = abs.port || (abs.protocol === 'https:' ? '443' : '80');
            if (port === location.port) return raw;                 // the proxy itself
            return location.origin + '/__vbproxy__/' + port + abs.pathname + abs.search + abs.hash;
        } catch { return raw; }
    }

    // ws(s) -> proxied websocket on our origin
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

// Immediate console log to confirm script is loaded


(function() {
    // Prevent duplicate injection
    if (window.__visualBrowserPickerInjected) {
        
        return;
    }
    window.__visualBrowserPickerInjected = true;
    

    let pickerEnabled = false;
    let hovered: HTMLElement | null = null;
    let snipperEnabled = false;
    
    // Create UI Elements
    const overlay = document.createElement('div');
    overlay.id = 'vibe-browser-injected-overlay';
    overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.5);
        z-index: 2147483646;
        display: none;
        transition: all 0.05s ease-out;
    `;

    const badge = document.createElement('span');
    badge.style.cssText = `
        position: absolute;
        top: -24px;
        left: 0;
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        font-family: Consolas, monospace;
        font-size: 12px;
        border-radius: 2px;
        pointer-events: none;
        white-space: nowrap;
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

    // Message Handler
    window.addEventListener('message', (event) => {
        if (event.data && event.data.command === 'reloadFrame') {
            location.reload();
            return;
        }
        if (event.data && event.data.command === 'copyConsole') {
            const text = window.__vbGetConsole ? window.__vbGetConsole() : '';
            window.parent.postMessage({
                command: 'consoleLogsCaptured',
                text: text || '_No console logs captured on this page yet._'
            }, '*');
            return;
        }
        if (event.data && event.data.command === 'historyBack') {
            history.back();
            return;
        }
        if (event.data && event.data.command === 'historyForward') {
            history.forward();
            return;
        }
        if (event.data && event.data.command === 'togglePicker') {
            
            pickerEnabled = event.data.enabled;
            // Disable snipper if picker is toggled
            if (pickerEnabled) snipperEnabled = false;

            if (!pickerEnabled) {
                overlay.style.display = 'none';
                hovered = null;
                document.body.style.cursor = '';
                
            } else {
                document.body.style.cursor = 'crosshair';
                
            }
        }
        if (event.data && event.data.command === 'toggleSnipper') {
            
            snipperEnabled = event.data.enabled;
            // Disable picker if snipper is toggled
            if (snipperEnabled) {
                pickerEnabled = false;
                
            }
            
            if (snipperEnabled) {
                document.body.style.cursor = 'crosshair';
                
                createSnipperOverlay();
                
            } else {
                document.body.style.cursor = '';
                
                removeSnipperOverlay();
            }
        }
    });

    // Snipper Logic
    let snipperOverlay: HTMLElement | null = null;
    let selectionBox: HTMLElement | null = null;
    let startX = 0, startY = 0, isDragging = false;

    function createSnipperOverlay() {
        if (snipperOverlay) return;
        
        snipperOverlay = document.createElement('div');
        snipperOverlay.id = 'vibe-browser-snipper-overlay';
        snipperOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 2147483647;
            background: rgba(0, 0, 0, 0.3);
            cursor: crosshair;
        `;

        selectionBox = document.createElement('div');
        selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            display: none;
            pointer-events: none;
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
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);
        
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
    }

    function onSnipperMouseUp(e: MouseEvent) {
        
        isDragging = false;
        
        if (!selectionBox || !snipperOverlay) return;
        const rect = selectionBox.getBoundingClientRect();
        
        // More debug info - page dimensions and selection position
        
        
        
        
        // Calculate absolute coordinates (viewport + scroll)
        const captureX = rect.left + window.scrollX;
        const captureY = rect.top + window.scrollY;
        
        
        
        // Capture screenshot of the area
        if (rect.width > 5 && rect.height > 5) {
            
            
            /*
            console.log('[Screenshot Debug] Mouse Up / Selection Finalized:', {
                selectionRect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                captureX,
                captureY
            });
            */
            
            // Hide overlays for capture
            snipperOverlay.style.display = 'none';
            if (overlay) overlay.style.display = 'none';

            // Wait a frame for overlays to fully hide
            requestAnimationFrame(async () => {
                try {
                    const startTime = performance.now();
                    
                    // OPTIMIZED: Capture ONLY the selected area directly (much faster!)
                    // Use higher quality for better screenshots
                    const pixelRatio = 2;  // Higher quality (2x)
                    const viewportDataUrl = await toPng(document.documentElement, {
                        // Capture at 2x pixel ratio for better quality
                        pixelRatio: pixelRatio,
                        // Skip expensive operations
                        cacheBust: false,
                        skipFonts: true,  // Skip font embedding
                        skipAutoScale: true,  // Skip auto scaling
                        style: {
                            // Minimize styling work
                            transform: 'none',
                        },
                        // Skip external images to avoid CORS
                        filter: (node) => {
                            const element = node as HTMLElement;
                            
                            // Skip hidden elements
                            if (element.style?.display === 'none' || element.style?.visibility === 'hidden') return false;
                            
                            // Skip overlays
                            if (element.id === 'vibe-browser-injected-overlay' || 
                                element.id === 'vibe-browser-snipper-overlay' ||
                                element.id === 'react-toolbar-root' ||
                                element.id === 'vibe-browser-devtools-overlay') return false;
                            
                            // Skip external images (CORS)
                            if (element.tagName === 'IMG') {
                                const src = element.getAttribute('src') || '';
                                if (src.startsWith('http') && !src.startsWith(window.location.origin)) {
                                    return false;
                                }
                            }
                            
                            return true;
                        }
                    });
                    const captureTime = performance.now();
                    

                    // Crop the image using canvas
                    const img = new Image();
                    
                    // Handle both load and error events
                    img.onload = () => {
                        try {
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;

                            canvas.width = rect.width;
                            canvas.height = rect.height;

                            // The captured image is at pixelRatio: 2, so scale coordinates accordingly
                            const sourceX = (rect.left + window.scrollX) * pixelRatio;
                            const sourceY = (rect.top + window.scrollY) * pixelRatio;
                            const sourceWidth = rect.width * pixelRatio;
                            const sourceHeight = rect.height * pixelRatio;
                            
                            

                            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, rect.width, rect.height);

                            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            
                            
                            window.parent.postMessage({
                                command: 'screenshotCaptured',
                                data: croppedDataUrl
                            }, '*');
                            
                        } catch (err) {
                            
                        }
                    };
                    
                    img.onerror = () => {
                        
                        
                        window.parent.postMessage({
                            command: 'screenshotCaptured',
                            data: viewportDataUrl
                        }, '*');
                    };
                    
                    img.src = viewportDataUrl;
                } catch (err) {
                    
                }
            });
            
            // Cleanup after a short delay or immediately
            
            removeSnipperOverlay();
            window.parent.postMessage({ command: 'toggleSnipper', enabled: false }, '*');
        } else {
             
             removeSnipperOverlay();
             window.parent.postMessage({ command: 'toggleSnipper', enabled: false }, '*');
        }
    }

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
                
                // Batch visual updates
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
        
        if (!pickerEnabled) {
            
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const target = e.target as HTMLElement;
        const detailedInfo = formatElementDetails(target);

        // Hide overlay temporarily for screenshot
        overlay.style.display = 'none';

        // Capture screenshot of the selected element
        let elementScreenshot: string | null = null;
        try {
            const startTime = performance.now();
            
            
            // Use html-to-image - capture at higher quality
            // Get computed background color to preserve it
            const computedStyle = window.getComputedStyle(target);
            const bgColor = computedStyle.backgroundColor;
            
            const result = await toPng(target, {
                pixelRatio: 2,  // Higher quality (2x)
                cacheBust: false,
                skipFonts: true,
                style: {
                    // Force background color to be rendered
                    backgroundColor: bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : undefined,
                },
            });
            
            const endTime = performance.now();
            
            
            if (result) {
                elementScreenshot = result;
                
            }
        } catch (err) {
            
        }

        // Send to parent window (the VS Code Webview)
        window.parent.postMessage({
            command: 'elementPicked',
            text: detailedInfo,
            elementScreenshot: elementScreenshot
        }, '*');
        
        
        
        // Re-show overlay for next pick
        overlay.style.display = 'block';

    }, true);
})();
