import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { URL } from 'url';
import { ProxyServer } from './proxy/ProxyServer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { copyImg, ErrorCodes, isWayland } = require('img-clipboard');

// Shared CSS for toolbar buttons (injected into webview shell)
const SHARED_CSS = `
.vb-btn{background:transparent;border:none;color:var(--vscode-icon-foreground);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;padding:0;font-size:16px;transition:background .15s ease}
.vb-btn:hover{background:var(--vscode-toolbar-hoverBackground)}
.vb-btn:active{background:var(--vscode-toolbar-activeBackground)}
.vb-btn:disabled,.vb-btn[disabled]{opacity:.3;cursor:default;filter:grayscale(1);pointer-events:none}
.vb-btn.active{background:var(--vscode-button-background);color:var(--vscode-button-foreground);box-shadow:0 2px 4px rgba(0,0,0,.2)}
.vb-btn.active:hover{background:var(--vscode-button-hoverBackground)}
.vb-btn.bookmarked{color:var(--vscode-charts-yellow)}
.vb-btn.nav-back:hover{transform:translateX(-2px)}
.vb-btn.nav-forward:hover{transform:translateX(2px)}
.vb-btn.nav-refresh:hover .codicon-refresh{transform:rotate(180deg)}
.vb-btn.nav-refresh .codicon-refresh{transition:transform .4s ease}
.vb-menu-item{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:13px;color:var(--vscode-foreground);border-radius:4px;transition:background .1s}
.vb-menu-item:hover{background:var(--vscode-menu-selectionBackground)}
.vb-menu-item .codicon{font-size:14px}
.vb-menu-check{width:16px;font-size:14px}
.vb-bookmark-item{display:flex;align-items:center;gap:6px;padding:4px 8px;background:transparent;border:none;border-radius:4px;color:var(--vscode-foreground);cursor:pointer;font-size:11px;white-space:nowrap;transition:background .15s ease,opacity .15s ease;opacity:.9}
.vb-bookmark-item:hover{background:var(--vscode-toolbar-hoverBackground);opacity:1}
.vb-bookmark-favicon{width:14px;height:14px;border-radius:2px}
.vb-bookmark-fallback{display:none;font-size:14px;opacity:.6}
@keyframes vb-loading-slide{0%{transform:translateX(-100%)}50%{transform:translateX(300%)}100%{transform:translateX(-100%)}}
`;

interface Bookmark {
    url: string;
    title: string;
    domain: string;
}

// Single iframe id used for every proxied page.
const FRAME_ID = 'vibe-browser-frame';

export class BrowserPanel {
    public static currentPanel: BrowserPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentUrl: string = '';
    private _bookmarks: Bookmark[] = [];
    private _proxyServer: ProxyServer;
    private _context: vscode.ExtensionContext;
    private _webviewReady: boolean = false;

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (BrowserPanel.currentPanel) {
            BrowserPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'visualBrowser',
            'Vibe Browser',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    extensionUri
                ]
            }
        );

        BrowserPanel.currentPanel = new BrowserPanel(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Cookies / storage are handled natively by the webview (the framed page
        // runs on a real proxy origin), so no server-side storage manager needed.
        this._proxyServer = new ProxyServer(extensionUri);

        // Migrate old key if present
        const oldBookmarks = this._context.globalState.get('copilot-bridge-bookmarks');
        if (oldBookmarks) {
            this._context.globalState.update('vibe-browser-bookmarks', oldBookmarks);
            this._context.globalState.update('copilot-bridge-bookmarks', undefined);
        }
        this._bookmarks = this._context.globalState.get('vibe-browser-bookmarks', []);
        this._currentUrl = this._context.globalState.get('vibe-browser-last-url', '');

        if (this._currentUrl && this._currentUrl.trim() !== '') {
            this._loadUrl(this._currentUrl);
        } else {
            this._renderShell(); // landing page
        }

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'webviewReady':
                        this._webviewReady = true;
                        return;
                    case 'loadUrl':
                        this._loadUrl(message.url);
                        return;
                    case 'elementPicked':
                        this._handleElementPicked(message.text, message.elementScreenshot);
                        return;
                    case 'getBookmarks':
                        this._sendBookmarks();
                        return;
                    case 'saveBookmarks':
                        this._saveBookmarks(message.bookmarks);
                        return;
                    case 'screenshotCaptured':
                        this._handleScreenshotCaptured(message.data);
                        return;
                    case 'consoleLogsCaptured':
                        this._sendTextToChat(message.text);
                        return;
                    case 'openDevTools':
                        this._openDevTools();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    // ===== Bookmarks =====

    private _sendBookmarks() {
        this._panel.webview.postMessage({ command: 'loadBookmarks', bookmarks: this._bookmarks });
    }

    private _saveBookmarks(bookmarks: Bookmark[]) {
        this._bookmarks = bookmarks;
        this._context.globalState.update('vibe-browser-bookmarks', bookmarks);
    }

    // ===== DevTools =====

    private _openDevTools() {
        this._proxyServer.getChiiUrl().then(result => {
            if (result.error) {
                vscode.window.showErrorMessage(`DevTools Error: ${result.error}`);
                return;
            }
            if (!result.url) {
                vscode.window.showErrorMessage('DevTools is not ready. Try reloading the page.');
                return;
            }
            this._panel.webview.postMessage({ command: 'toggleInternalDevTools', chiiUrl: result.url });
        }).catch(err => {
            vscode.window.showErrorMessage(`Failed to start DevTools: ${err.message}`);
        });
    }

    // ===== Screenshot / element capture =====

    private async _handleScreenshotCaptured(base64Data: string) {
        try {
            const base64Image = base64Data.split(';base64,').pop();
            if (!base64Image) return;

            const filePath = path.join(os.tmpdir(), `vibe-browser-shot-${Date.now()}.png`);
            await fs.promises.writeFile(filePath, Buffer.from(base64Image, 'base64'));

            const [err, stdout, stderr] = await copyImg(filePath);
            await fs.promises.unlink(filePath).catch(() => {});
            if (err) {
                if (err.code === ErrorCodes.COMMAND_NOT_FOUND && process.platform === 'linux') {
                    const missingPackage = isWayland() ? 'wl-clipboard' : 'xclip';
                    vscode.window.showErrorMessage(`Screenshot failed: ${missingPackage} is not installed.`);
                } else {
                    vscode.window.showErrorMessage(`Screenshot clipboard error: ${stdout || stderr || err.message}`);
                }
                return;
            }

            vscode.window.showInformationMessage('Screenshot copied to clipboard.');
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to handle screenshot: ${e.message}`);
        }
    }

    private async _handleElementPicked(text: string, elementScreenshot?: string) {
        if (!text) return;

        // Copy element screenshot to clipboard (if any)
        if (elementScreenshot) {
            try {
                const base64Image = elementScreenshot.split(';base64,').pop();
                if (base64Image) {
                    const filePath = path.join(os.tmpdir(), `vibe-browser-element-${Date.now()}.png`);
                    await fs.promises.writeFile(filePath, Buffer.from(base64Image, 'base64'));

                    const [err] = await copyImg(filePath);
                    await fs.promises.unlink(filePath).catch(() => {});
                    if (err) {
                        vscode.window.showErrorMessage(`Screenshot clipboard error: ${err.message}`);
                    }
                }
            } catch (imgErr) {
                console.error('[BrowserPanel] Element screenshot failed:', imgErr);
            }
        }

        // Copy element details text to clipboard
        await vscode.env.clipboard.writeText(text + '\n');
        vscode.window.showInformationMessage('Element details copied to clipboard.');
    }

    /**
     * Copy text to the clipboard.
     */
    private async _sendTextToChat(text: string) {
        if (!text) return;
        await vscode.env.clipboard.writeText(text + '\n');
        vscode.window.showInformationMessage('Console logs copied to clipboard.');
    }

    // ===== URL loading =====

    private async _loadUrl(rawUrl: string) {
        let url = (rawUrl || '').trim();
        if (!url) return;

        if (/^\d+$/.test(url)) {
            url = `http://localhost:${url}`;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }

        this._currentUrl = url;
        this._context.globalState.update('vibe-browser-last-url', url);
        await this._loadViaProxy(url);
    }

    private async _loadViaProxy(url: string) {
        try {
            const parsed = new URL(url);

            const proxyPort = await this._proxyServer.start(url);
            const proxyUrl = `http://127.0.0.1:${proxyPort}${parsed.pathname}${parsed.search}`;

            const tunneled = await vscode.env.asExternalUri(vscode.Uri.parse(proxyUrl));

            this._renderShell(tunneled.toString());

            await this._waitForWebviewReady();
            this._panel.webview.postMessage({ command: 'updateUrl', url });
            this._panel.webview.postMessage({ command: 'updatePageTitle', title: parsed.hostname });

            // Push DevTools target URL once Chii discovers the page
            this._proxyServer.getChiiUrl().then(result => {
                if (result.url) {
                    this._panel.webview.postMessage({ command: 'updateChiiUrl', chiiUrl: result.url });
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load ${url}: ${error.message}`);
            this._renderShell(undefined, `<h2>Error loading ${this._escapeHtml(url)}</h2><p>${this._escapeHtml(error.message)}</p>`);
        }
    }

    // ===== Rendering =====

    /** Wait until the webview sends a 'webviewReady' message (max 5s). */
    private _waitForWebviewReady(timeoutMs = 5000): Promise<void> {
        if (this._webviewReady) return Promise.resolve();
        return new Promise(resolve => {
            const timer = setTimeout(() => resolve(), timeoutMs);
            const check = this._panel.webview.onDidReceiveMessage(msg => {
                if (msg.command === 'webviewReady') {
                    clearTimeout(timer);
                    check.dispose();
                    resolve();
                }
            });
        });
    }

    private _escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private _csp(): string {
        const cspSource = this._panel.webview.cspSource;
        return [
            `default-src 'none'`,
            `script-src ${cspSource} 'unsafe-inline'`,
            `style-src ${cspSource} https: http: 'unsafe-inline'`,
            `font-src ${cspSource} https: http:`,
            `img-src ${cspSource} https: http: data: blob:`,
            `frame-src https: http:`,
            `connect-src ${cspSource} https: http: ws: wss:`
        ].join('; ');
    }

    /**
     * Render the outer shell: React toolbar + one content area.
     * - `frameSrc` set  -> proxied page in an iframe
     * - `bodyHtml` set  -> custom message (error)
     * - neither         -> landing page
     */
    private _renderShell(frameSrc?: string, bodyHtml?: string) {
        const webview = this._panel.webview;
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview-bundle.js'));
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'logo.png'));

        let content: string;
        if (frameSrc) {
            content = `<iframe id="${FRAME_ID}"
                src="${frameSrc}"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
                allow="clipboard-read; clipboard-write; geolocation; microphone; camera;"></iframe>`;
        } else if (bodyHtml) {
            content = `<div id="message-container">${bodyHtml}</div>`;
        } else {
            content = `
                <div id="message-container">
                    <div class="welcome">
                        <img src="${logoUri}" class="logo" alt="Vibe Browser" />
                        <h1>Vibe Browser</h1>
                        <p>Enter a <strong>URL</strong> above to start (e.g. <code>localhost:3000</code> or <code>github.com</code>).</p>
                    </div>
                </div>`;
        }

        this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${this._csp()}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vibe Browser</title>
    <style>
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden;
            background: var(--vscode-editor-background); color: var(--vscode-foreground);
            font-family: var(--vscode-font-family); }
        #${FRAME_ID}, #message-container {
            position: absolute; top: 75px; left: 0; width: 100%; height: calc(100% - 75px); border: none; }
        #message-container { display: flex; align-items: center; justify-content: center; text-align: center; }
        .welcome { max-width: 420px; padding: 2rem; }
        .logo { width: 96px; height: 96px; border-radius: 20px; margin-bottom: 1rem; }
        code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 4px; }
        ${SHARED_CSS}
    </style>
</head>
<body>
    <div id="react-toolbar-root" style="position: fixed; top: 0; left: 0; width: 100%; z-index: 10000; height: 75px;"></div>
    ${content}
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    public dispose() {
        BrowserPanel.currentPanel = undefined;
        this._panel.dispose();
        if (this._proxyServer) {
            this._proxyServer.stop();
        }
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }
}
