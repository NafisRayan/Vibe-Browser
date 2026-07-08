import * as http from 'http';
import httpProxy from 'http-proxy';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
const chii = require('chii');

// Path served (same-origin) for the injected picker script. Unique prefix to
// avoid colliding with a real app route.
const INJECTED_SCRIPT_PATH = '/__visualbrowser__/injected.js';

// Requests the injected script rewrites to reach OTHER localhost ports (e.g. a
// separate API server) through this same proxy origin: /__vbproxy__/<port>/...
const CROSS_PORT_RE = /^\/__vbproxy__\/(\d+)(\/.*)?$/;

// Debug logging utility - only logs when enabled in settings
function debugLog(...args: any[]): void {
    const config = vscode.workspace.getConfiguration('visualBrowser');
    if (config.get<boolean>('enableDebugLogs', false)) {
        console.log(...args);
    }
}

/**
 * Single local proxy in front of a localhost dev server.
 *
 * Everything the webview iframe loads is served from THIS origin
 * (http://127.0.0.1:<port>). That gives the framed page a real HTTP origin, so:
 *   - the element-picker script is served same-origin (relative path) and is
 *     never blocked by mixed-content on WSL / Codespaces tunnels;
 *   - native localStorage / sessionStorage / cookies / IndexedDB just work,
 *     no polyfills required.
 * The proxy also strips X-Frame-Options / CSP so the target's own headers can't
 * blank the frame or block the injected script.
 */
export class ProxyServer {
    private _proxy: httpProxy;
    private _server: http.Server | undefined;
    private _extensionUri: vscode.Uri;
    private _port: number = 0;
    private _targetPort: number = 0;
    private _injectedScriptContent: string = '';
    private _chiiPort: number | undefined;
    private _chiiServer: http.Server | undefined;
    private _chiiReady: boolean = false;
    private _chiiStartupError: Error | undefined;

    private _chiiServerPromise: Promise<void> | undefined;
    private _listenPromise: Promise<number> | undefined;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;

        // Load the injected script content once (built by webpack from TypeScript)
        try {
            const scriptPath = path.join(this._extensionUri.fsPath, 'media', 'injected-picker.js');
            this._injectedScriptContent = fs.readFileSync(scriptPath, 'utf8');
        } catch (e) {
            console.error('Failed to load injected-picker.js (ensure webview-ui has been built):', e);
        }

        this._proxy = httpProxy.createProxyServer({
            ws: true,
            xfwd: true,
            secure: false,
            changeOrigin: true,
            selfHandleResponse: true // we rewrite HTML responses before sending
        });

        // Pre-start Chii DevTools backend in the background
        this._chiiServerPromise = this._startChii();

        this._proxy.on('proxyRes', (proxyRes, req, res) => this._onProxyRes(proxyRes, req, res));

        this._proxy.on('error', (err: Error, _req: http.IncomingMessage, res: http.ServerResponse | any) => {
            console.error('[ProxyServer] Proxy error:', err);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'text/html' });
                res.end(`<h2>Cannot reach localhost:${this._targetPort}</h2><p>${err.message}</p><p>Is your dev server running?</p>`);
            }
        });
    }

    /**
     * Start (or re-target) the proxy in front of the given localhost port.
     * Idempotent: if the server is already listening, only the target changes.
     * Returns the proxy's own port.
     */
    public async start(targetPort: number): Promise<number> {
        this._targetPort = targetPort;

        if (this._server) {
            return this._port;
        }
        if (this._listenPromise) {
            return this._listenPromise;
        }

        this._listenPromise = new Promise<number>((resolve, reject) => {
            const server = http.createServer((req, res) => this._handleRequest(req, res));
            this._server = server;

            server.on('upgrade', (req, socket, head) => {
                // Forward websockets (Vite / Next / webpack HMR, or a rewritten
                // cross-port app socket) to the right localhost port.
                let targetPort = this._targetPort;
                const cross = req.url ? req.url.match(CROSS_PORT_RE) : null;
                if (cross) {
                    targetPort = parseInt(cross[1], 10);
                    req.url = cross[2] || '/';
                }
                this._proxy.ws(req, socket, head, { target: `http://127.0.0.1:${targetPort}` });
            });

            const onListening = () => {
                const address = server.address();
                if (address && typeof address !== 'string') {
                    this._port = address.port;
                    debugLog(`[ProxyServer] Listening on 127.0.0.1:${this._port} -> localhost:${this._targetPort}`);
                    resolve(this._port);
                } else {
                    reject(new Error('Failed to get proxy port'));
                }
            };

            // Prefer a deterministic port derived from the target so the iframe's
            // origin stays stable across sessions -> localStorage / sessionStorage
            // / cookies persist like a real browser. Fall back to a random port if
            // the preferred one is taken.
            const preferred = this._preferredPort(this._targetPort);
            server.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    server.once('error', (err2) => {
                        console.error('[ProxyServer] HTTP server failed to start:', err2);
                        this._server = undefined;
                        this._listenPromise = undefined;
                        reject(err2);
                    });
                    server.listen(0, '127.0.0.1', onListening);
                } else {
                    console.error('[ProxyServer] HTTP server failed to start:', err);
                    this._server = undefined;
                    this._listenPromise = undefined;
                    reject(err);
                }
            });
            server.listen(preferred, '127.0.0.1', onListening);
        });

        return this._listenPromise;
    }

    /** Deterministic proxy port for a given target, for a stable iframe origin. */
    private _preferredPort(targetPort: number): number {
        return 41000 + (targetPort % 20000);
    }

    private async _handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Serve the injected picker script from our own origin (relative path in
        // the page), so it is never blocked by mixed-content or the target's CSP.
        if (req.url && req.url.split('?')[0] === INJECTED_SCRIPT_PATH) {
            res.writeHead(200, {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            res.end(this._injectedScriptContent);
            return;
        }

        // Cross-port API calls the page made to another localhost port get
        // rewritten by the injected script to /__vbproxy__/<port>/... - forward
        // them to that port so the browser sees a same-origin request (no CORS).
        let targetPort = this._targetPort;
        const cross = req.url ? req.url.match(CROSS_PORT_RE) : null;
        if (cross) {
            targetPort = parseInt(cross[1], 10);
            req.url = cross[2] || '/';
        }
        (req as any)._vbPort = targetPort;

        // Cookies, storage and auth are handled natively by the webview since the
        // framed page runs on a real (proxy) origin - we don't touch them here.
        // Ask upstream for identity encoding so we can rewrite HTML without
        // juggling every compression scheme (gzip fallback kept below anyway).
        this._proxy.web(req, res, {
            target: `http://127.0.0.1:${targetPort}`,
            headers: { 'accept-encoding': 'identity' }
        });
    }

    private _onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse): void {
        const headers = { ...proxyRes.headers };

        // Never let the target's own headers blank the frame or block our script
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        delete headers['content-security-policy-report-only'];
        delete headers['cross-origin-opener-policy'];
        delete headers['cross-origin-embedder-policy'];

        // Permissive CORS so the page's cross-origin fetch/XHR to this proxy work
        const origin = req.headers['origin'];
        if (origin) {
            headers['access-control-allow-origin'] = origin;
            headers['access-control-allow-credentials'] = 'true';
        }

        // Keep redirects inside the proxy: rewrite absolute Location headers that
        // point back at the dev server to a relative path, so the iframe never
        // navigates straight to localhost:<port> (which would re-trigger
        // X-Frame-Options and blank the frame).
        if (headers['location']) {
            headers['location'] = this._rewriteLocation(headers['location'] as string, (req as any)._vbPort || this._targetPort);
        }

        const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
        const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');

        // Non-HTML (JS/CSS/JSON/images/HMR): stream straight through untouched.
        if (!isHtml) {
            res.writeHead(proxyRes.statusCode || 200, headers);
            proxyRes.pipe(res);
            return;
        }

        // HTML: buffer, strip inline CSP, inject the picker script, then send.
        // Force revalidation so we always re-inject on reload.
        delete headers['etag'];
        delete headers['last-modified'];
        delete headers['content-length'];
        delete headers['content-encoding'];
        headers['cache-control'] = 'no-cache, no-store, must-revalidate';

        const encoding = proxyRes.headers['content-encoding'];
        let stream: NodeJS.ReadableStream = proxyRes;
        if (encoding === 'gzip') {
            stream = proxyRes.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
            stream = proxyRes.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
            stream = proxyRes.pipe(zlib.createBrotliDecompress());
        }

        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
            let html = Buffer.concat(chunks).toString('utf8');
            html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
            html = this._injectInto(html);
            res.writeHead(proxyRes.statusCode || 200, headers);
            res.end(html);
        });
        stream.on('error', (err) => {
            console.error('[ProxyServer] Stream error:', err);
            if (!res.headersSent) res.writeHead(502);
            res.end();
        });
    }

    private _rewriteLocation(location: string, port: number): string {
        try {
            const loc = new URL(location, `http://127.0.0.1:${port}`);
            if (loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
                return location;
            }
            const locPort = loc.port ? parseInt(loc.port, 10) : (loc.protocol === 'https:' ? 443 : 80);
            const rest = loc.pathname + loc.search + loc.hash;
            // Main target -> relative; other localhost port -> keep it proxied.
            return locPort === this._targetPort ? rest : `/__vbproxy__/${locPort}${rest}`;
        } catch {
            return location;
        }
    }

    private _injectInto(html: string): string {
        const chiiScript = this._chiiPort
            ? `<script src="http://127.0.0.1:${this._chiiPort}/target.js"></script>`
            : '';

        // No body padding: the toolbar lives in the outer webview shell and the
        // iframe is already positioned below it, so the framed page keeps its own
        // full layout (top:0) exactly like a real browser tab.
        const injection =
            `${chiiScript}` +
            `<script src="${INJECTED_SCRIPT_PATH}"></script>`;

        if (/<head[^>]*>/i.test(html)) {
            return html.replace(/<head[^>]*>/i, (m) => `${m}${injection}`);
        }
        if (/<body[^>]*>/i.test(html)) {
            return html.replace(/<body[^>]*>/i, (m) => `${m}${injection}`);
        }
        return injection + html;
    }

    // ===== Chii DevTools backend =====

    private async _startChii(): Promise<void> {
        if (this._chiiPort) return;
        try {
            const chiiServer = http.createServer();
            this._chiiServer = chiiServer;

            await new Promise<void>((resolve, reject) => {
                chiiServer.listen(0, '127.0.0.1', () => {
                    const addr = chiiServer.address();
                    if (addr && typeof addr !== 'string') {
                        this._chiiPort = addr.port;
                        resolve();
                    } else {
                        reject(new Error('Failed to get Chii port'));
                    }
                });
                chiiServer.on('error', reject);
            });

            // @ts-ignore
            await chii.start({ server: chiiServer, domain: `localhost:${this._chiiPort}` });
            this._chiiReady = true;
            this._chiiStartupError = undefined;
        } catch (e: any) {
            console.error('[ProxyServer] Failed to start Chii:', e);
            this._chiiReady = false;
            this._chiiStartupError = e;
            throw e;
        }
    }

    public async getChiiUrl(retries = 3, delay = 1000): Promise<{ url?: string; error?: string }> {
        if (this._chiiStartupError) {
            return { error: `DevTools server failed to start: ${this._chiiStartupError.message}` };
        }

        if (!this._chiiReady && this._chiiServerPromise) {
            try {
                await this._chiiServerPromise;
            } catch (e: any) {
                return { error: `DevTools initialization failed: ${e.message}` };
            }
        }

        if (!this._chiiPort) {
            return { error: 'DevTools server not initialized. Please load a localhost URL first.' };
        }

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await new Promise<string>((resolve, reject) => {
                    const request = http.get({
                        hostname: '127.0.0.1',
                        port: this._chiiPort,
                        path: '/targets',
                        headers: { 'accept': 'application/json', 'accept-encoding': 'identity' }
                    }, (r) => {
                        let data = '';
                        r.on('data', chunk => data += chunk);
                        r.on('end', () => resolve(data));
                    });
                    request.on('error', reject);
                    request.setTimeout(2000, () => {
                        request.destroy();
                        reject(new Error('Timeout fetching targets'));
                    });
                    request.end();
                });

                const targets = (JSON.parse(response).targets || []) as Array<{ id: string }>;
                if (targets.length > 0) {
                    const id = targets[0].id;
                    const url = `http://127.0.0.1:${this._chiiPort}/front_end/chii_app.html?ws=127.0.0.1:${this._chiiPort}/client/${id}?target=${id}`;
                    return { url };
                }

                if (attempt < retries - 1) {
                    await new Promise(r => setTimeout(r, delay));
                }
            } catch (e: any) {
                if (attempt === retries - 1) {
                    return { error: `Failed to connect to DevTools: ${e.message}` };
                }
                await new Promise(r => setTimeout(r, delay));
            }
        }

        return { url: `http://127.0.0.1:${this._chiiPort}/` };
    }

    public stop(): void {
        if (this._server) {
            this._server.close();
            this._server = undefined;
            this._listenPromise = undefined;
        }
        if (this._chiiServer) {
            this._chiiServer.close();
            this._chiiServer = undefined;
            this._chiiPort = undefined;
            this._chiiReady = false;
        }
    }
}
