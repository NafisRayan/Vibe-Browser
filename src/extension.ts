import * as vscode from 'vscode';
import { BrowserPanel } from './BrowserPanel';

export function activate(context: vscode.ExtensionContext) {
    
    // Register the command to open our internal browser
    const openBrowserCmd = vscode.commands.registerCommand('vibe-browser.openBrowser', () => {
        BrowserPanel.createOrShow(context.extensionUri, context);
    });

    context.subscriptions.push(openBrowserCmd);

    // Create a Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'vibe-browser.openBrowser';
    statusBarItem.text = '$(globe) Vibe Browser';
    statusBarItem.tooltip = 'Click to open Vibe Browser';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {}