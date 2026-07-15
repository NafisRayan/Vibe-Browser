import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { ProxyServer } from './proxy/ProxyServer';
const { copyImg, ErrorCodes, isWayland } = require('img-clipboard');

// Single iframe id used for every proxied page.
const FRAME_ID = 'vibe-browser-frame';

export class BrowserPanel {
    public static currentPanel: BrowserPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentUrl: string = '';
    private _bookmarks: any[] = [];
    private _proxyServer: ProxyServer;
    private _context: vscode.ExtensionContext;

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

        this._bookmarks = this._context.globalState.get('copilot-bridge-bookmarks', []);
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

    private _saveBookmarks(bookmarks: any[]) {
        this._bookmarks = bookmarks;
        this._context.globalState.update('copilot-bridge-bookmarks', bookmarks);
    }

    // ===== DevTools =====

    private _openDevTools() {
        if (!this._isLocalhostUrl(this._currentUrl)) {
            vscode.window.showWarningMessage('DevTools is only available for a loaded localhost page.');
            return;
        }
        this._proxyServer.getChiiUrl().then(result => {
            if (result.error) {
                vscode.window.showErrorMessage(`DevTools Error: ${result.error}`);
                return;
            }
            if (!result.url) {
                vscode.window.showErrorMessage('DevTools is not ready. Load a localhost URL first.');
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

            const filePath = path.join(require('os').tmpdir(), `vibe-browser-shot-${Date.now()}.png`);
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
                    const filePath = path.join(require('os').tmpdir(), `vibe-browser-element-${Date.now()}.png`);
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

    private _isLocalhostUrl(url: string): boolean {
        if (!url) return false;
        try {
            const host = new URL(url.startsWith('http') ? url : `http://${url}`).hostname;
            return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]';
        } catch {
            return false;
        }
    }

    private async _loadUrl(rawUrl: string) {
        let url = (rawUrl || '').trim();
        if (!url) return;

        // Bare port number -> localhost:<port>
        if (/^\d+$/.test(url)) {
            url = `http://localhost:${url}`;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }

        if (!this._isLocalhostUrl(url)) {
            this._currentUrl = url;
            this._renderLocalhostOnly(url);
            return;
        }

        this._currentUrl = url;
        this._context.globalState.update('vibe-browser-last-url', url);
        await this._loadLocalhostViaProxy(url);
    }

    private async _loadLocalhostViaProxy(url: string) {
        try {
            const parsed = new URL(url);
            const targetPort = parseInt(parsed.port || '80', 10);

            const proxyPort = await this._proxyServer.start(targetPort);
            const proxyUrl = `http://127.0.0.1:${proxyPort}${parsed.pathname}${parsed.search}`;

            // Tunnel our proxy port so the webview iframe can reach it
            const tunneled = await vscode.env.asExternalUri(vscode.Uri.parse(proxyUrl));

            this._renderShell(tunneled.toString());

            setTimeout(() => {
                this._panel.webview.postMessage({ command: 'updateUrl', url });
                this._panel.webview.postMessage({ command: 'updatePageTitle', title: 'Localhost' });
            }, 100);

            // Push the DevTools target URL once Chii has discovered it
            setTimeout(async () => {
                const result = await this._proxyServer.getChiiUrl();
                if (result.url) {
                    this._panel.webview.postMessage({ command: 'updateChiiUrl', chiiUrl: result.url });
                }
            }, 2000);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load localhost: ${error.message}`);
            this._renderShell(undefined, `<h2>Error loading ${this._escapeHtml(url)}</h2><p>${this._escapeHtml(error.message)}</p>`);
        }
    }

    // ===== Rendering =====

    private _escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private _csp(): string {
        const cspSource = this._panel.webview.cspSource;
        return [
            `default-src 'none'`,
            `script-src ${cspSource} 'unsafe-inline' 'unsafe-eval'`,
            `style-src ${cspSource} https://unpkg.com 'unsafe-inline'`,
            `font-src ${cspSource} https://unpkg.com`,
            `img-src ${cspSource} https: http: data: blob:`,
            `frame-src http://127.0.0.1:* http://localhost:* https:`,
            `connect-src ${cspSource} https: http://127.0.0.1:* ws: wss:`
        ].join('; ');
    }

    /**
     * Render the outer shell: React toolbar + one content area.
     * - `frameSrc` set  -> proxied localhost page in an iframe
     * - `bodyHtml` set  -> custom message (error / localhost-only)
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
                        <p>Enter a <strong>localhost</strong> URL above to start (e.g. <code>localhost:3000</code>).</p>
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
    </style>
</head>
<body>
    <div id="react-toolbar-root" style="position: fixed; top: 0; left: 0; width: 100%; z-index: 10000; height: 75px;"></div>
    ${content}
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    private _renderLocalhostOnly(url: string) {
        this._renderShell(undefined, `
            <div class="welcome">
                <h1>Localhost only</h1>
                <p>Vibe Browser is built for local development. It can load
                <code>localhost</code> / <code>127.0.0.1</code> URLs only.</p>
                <p style="opacity:.6">You entered: <code>${this._escapeHtml(url)}</code></p>
            </div>`);
        setTimeout(() => {
            this._panel.webview.postMessage({ command: 'updateUrl', url });
            this._panel.webview.postMessage({ command: 'updatePageTitle', title: 'Localhost only' });
        }, 100);
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
