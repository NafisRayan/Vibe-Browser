import React, { useState, useEffect } from 'react';
import { NavControls } from './components/NavControls';
import { URLDisplay } from './components/URLDisplay';
import { BrowserTools } from './components/BrowserTools';
import { BookmarksBar } from './components/BookmarksBar';
import { Bookmark } from './common/types';
import { getVsCodeApi } from './vscode';

const vscode = getVsCodeApi();

export const Toolbar: React.FC = () => {
    const [url, setUrl] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [pickerActive, setPickerActive] = useState(false);
    const [snipperActive, setSnipperActive] = useState(false);
    const [loading, setLoading] = useState(false);

    // Bookmarks
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'updateUrl') {
                setUrl(message.url);
                setLoading(true);
            } else if (message.command === 'updatePageTitle') {
                setPageTitle(message.title || '');
                setLoading(false);
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

        vscode.postMessage({ command: 'getBookmarks' });

        return () => window.removeEventListener('message', listener);
    }, []);

    useEffect(() => {
        const bookmarked = bookmarks.some(b => b.url === url);
        setIsBookmarked(bookmarked);
    }, [url, bookmarks]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                // Focus the URL input inside the iframe — dispatch via postMessage
                window.postMessage({ command: 'focusUrlBar' }, '*');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const navigate = (newUrl: string) => {
        setUrl(newUrl);
        setLoading(true);
        vscode.postMessage({ command: 'loadUrl', url: newUrl });
    };

    const handleGo = () => {
        navigate(url);
    };

    const handleBack = () => {
        window.postMessage({ command: 'historyBack' }, '*');
    };

    const handleForward = () => {
        window.postMessage({ command: 'historyForward' }, '*');
    };

    const handleReload = () => {
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
        const newState = !pickerActive;
        setPickerActive(newState);
        setSnipperActive(false);
        window.postMessage({ command: 'togglePicker', enabled: newState }, '*');
    };

    const handleScreenshot = () => {
        const newState = !snipperActive;
        setSnipperActive(newState);
        setPickerActive(false);
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
            {/* Loading bar */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '2px',
                    width: '100%',
                    overflow: 'hidden',
                    zIndex: 10
                }}>
                    <div style={{
                        width: '30%',
                        height: '100%',
                        background: 'var(--vscode-progressBar-background)',
                        borderRadius: '1px',
                        animation: 'vb-loading-slide 1.5s ease-in-out infinite'
                    }}></div>
                </div>
            )}
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
