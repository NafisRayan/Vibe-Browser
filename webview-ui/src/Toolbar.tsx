import React, { useState, useEffect } from 'react';
import { NavControls } from './components/NavControls';
import { URLDisplay } from './components/URLDisplay';
import { BrowserTools } from './components/BrowserTools';
import { BookmarksBar, Bookmark } from './components/BookmarksBar';
import { getVsCodeApi } from './vscode';

const vscode = getVsCodeApi();

export const Toolbar: React.FC = () => {
    const [url, setUrl] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [pickerActive, setPickerActive] = useState(false);
    const [snipperActive, setSnipperActive] = useState(false);

    // Navigation history
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Bookmarks
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        // Load bookmarks from VS Code state (sent from extension)
        const listener = (event: MessageEvent) => {
             const message = event.data;
             if (message.command === 'updateUrl') {
                 setUrl(message.url);
             } else if (message.command === 'updatePageTitle') {
                 setPageTitle(message.title || '');
             } else if (message.command === 'togglePicker') {
                 setPickerActive(message.enabled);
                 if (message.enabled) setSnipperActive(false);
             } else if (message.command === 'toggleSnipper') {
                 setSnipperActive(message.enabled);
                 if (message.enabled) setPickerActive(false);
             } else if (message.command === 'loadBookmarks') {
                 setBookmarks(message.bookmarks || []);
             }
        };
        window.addEventListener('message', listener);
        
        // Request initial bookmarks
        vscode.postMessage({ command: 'getBookmarks' });
        
        return () => window.removeEventListener('message', listener);
    }, []);

    useEffect(() => {
        // Check if current URL is bookmarked
        const bookmarked = bookmarks.some(b => b.url === url);
        setIsBookmarked(bookmarked);
    }, [url, bookmarks]);

    const navigate = (newUrl: string, addToHistory = true) => {
        if (addToHistory) {
            // Add to history (remove everything after current index)
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newUrl);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
        
        setUrl(newUrl);
        vscode.postMessage({ command: 'loadUrl', url: newUrl });
    };

    const handleGo = () => {
        navigate(url);
    };

    const handleBack = () => {
        // Use the page's own history (link clicks + SPA routes happen inside the
        // iframe, so the outer toolbar can't track them).
        window.postMessage({ command: 'historyBack' }, '*');
    };

    const handleForward = () => {
        window.postMessage({ command: 'historyForward' }, '*');
    };

    const handleReload = () => {
        // Reload from inside the iframe (same-origin as the page). Re-issuing
        // loadUrl would rebuild an identical webview.html, which VS Code skips.
        window.postMessage({ command: 'reloadFrame' }, '*');
    };

    const handleToggleBookmark = () => {
        if (isBookmarked) {
            const newBookmarks = bookmarks.filter(b => b.url !== url);
            setBookmarks(newBookmarks);
            vscode.postMessage({ command: 'saveBookmarks', bookmarks: newBookmarks });
        } else {
            try {
                const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
                const newBookmark: Bookmark = {
                    url,
                    title: pageTitle || parsedUrl.hostname,
                    domain: parsedUrl.hostname
                };
                const newBookmarks = [...bookmarks, newBookmark];
                setBookmarks(newBookmarks);
                vscode.postMessage({ command: 'saveBookmarks', bookmarks: newBookmarks });
            } catch (e) {
                console.error('Failed to parse URL for bookmark', e);
            }
        }
    };

    const togglePicker = () => {
        // Picker is now safer for localhost, so we removed the block
        const newState = !pickerActive;
        setPickerActive(newState);
        setSnipperActive(false); // Exclusive
        window.postMessage({ command: 'togglePicker', enabled: newState }, '*');
    };

    const handleScreenshot = () => {
        const newState = !snipperActive;
        setSnipperActive(newState);
        setPickerActive(false); // Exclusive
        window.postMessage({ command: 'toggleSnipper', enabled: newState }, '*');
    };

    const handleToggleConsole = () => {
        vscode.postMessage({ command: 'openDevTools' });
    };

    const handleCopyConsole = () => {
        window.postMessage({ command: 'copyConsole' }, '*');
    };

    const handleBookmarkClick = (bookmarkUrl: string) => {
        navigate(bookmarkUrl);
    };

    const handleBookmarkRemove = (bookmarkUrl: string) => {
        const newBookmarks = bookmarks.filter(b => b.url !== bookmarkUrl);
        setBookmarks(newBookmarks);
        vscode.postMessage({ command: 'saveBookmarks', bookmarks: newBookmarks });
    };

    return (
        <div style={{ 
            userSelect: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999999,
            padding: '4px 8px',
            background: 'var(--vscode-sideBar-background)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        }}>
            {/* Navbar */}
            <div className="browser-navbar" style={{
                display: 'flex',
                alignItems: 'center',
                height: '32px',
                gap: '8px',
                fontFamily: 'var(--vscode-font-family)'
            }}>
                <NavControls
                    canGoBack={!!url}
                    canGoForward={!!url}
                    isBookmarked={isBookmarked}
                    onBack={handleBack}
                    onForward={handleForward}
                    onReload={handleReload}
                    onToggleBookmark={handleToggleBookmark}
                />

                <URLDisplay
                    url={url}
                    pageTitle={pageTitle}
                    onUrlChange={setUrl}
                    onNavigate={handleGo}
                />

                <BrowserTools
                    isPickerActive={pickerActive}
                    onTogglePicker={togglePicker}
                    onScreenshot={handleScreenshot}
                    onToggleConsole={handleToggleConsole}
                    onCopyConsole={handleCopyConsole}
                    onReload={handleReload}
                />
            </div>

            {/* Bookmarks Bar */}
            <BookmarksBar
                bookmarks={bookmarks}
                onBookmarkClick={handleBookmarkClick}
                onBookmarkRemove={handleBookmarkRemove}
            />
        </div>
    );
};