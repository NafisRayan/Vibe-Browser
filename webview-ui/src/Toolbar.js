import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { NavControls } from './components/NavControls';
import { URLDisplay } from './components/URLDisplay';
import { BrowserTools } from './components/BrowserTools';
import { BookmarksBar } from './components/BookmarksBar';
import { getVsCodeApi } from './vscode';
const vscode = getVsCodeApi();
export const Toolbar = () => {
    const [url, setUrl] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [pickerActive, setPickerActive] = useState(false);
    const [snipperActive, setSnipperActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const loadingTimerRef = React.useRef(null);
    // Auto-reset loading after 10s (page may have errored silently)
    const startLoadingTimeout = () => {
        if (loadingTimerRef.current)
            clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = setTimeout(() => setLoading(false), 10000);
    };
    const clearLoadingTimeout = () => {
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
        }
    };
    // Bookmarks
    const [bookmarks, setBookmarks] = useState([]);
    const [isBookmarked, setIsBookmarked] = useState(false);
    useEffect(() => {
        const listener = (event) => {
            const message = event.data;
            if (message.command === 'updateUrl') {
                setUrl(message.url);
                setLoading(true);
                startLoadingTimeout();
            }
            else if (message.command === 'updatePageTitle') {
                setPageTitle(message.title || '');
                setLoading(false);
                clearLoadingTimeout();
            }
            else if (message.command === 'togglePicker') {
                setPickerActive(message.enabled);
                if (message.enabled)
                    setSnipperActive(false);
            }
            else if (message.command === 'toggleSnipper') {
                setSnipperActive(message.enabled);
                if (message.enabled)
                    setPickerActive(false);
            }
            else if (message.command === 'loadBookmarks') {
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
        const handler = (e) => {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                // Focus the URL input inside the iframe — dispatch via postMessage
                window.postMessage({ command: 'focusUrlBar' }, '*');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    const navigate = (newUrl) => {
        setUrl(newUrl);
        setLoading(true);
        startLoadingTimeout();
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
        }
        else {
            try {
                const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
                const newBookmark = {
                    url,
                    title: pageTitle || parsedUrl.hostname,
                    domain: parsedUrl.hostname
                };
                const newBookmarks = [...bookmarks, newBookmark];
                setBookmarks(newBookmarks);
                vscode.postMessage({ command: 'saveBookmarks', bookmarks: newBookmarks });
            }
            catch (e) {
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
    const handleBookmarkClick = (bookmarkUrl) => {
        navigate(bookmarkUrl);
    };
    const handleBookmarkRemove = (bookmarkUrl) => {
        const newBookmarks = bookmarks.filter(b => b.url !== bookmarkUrl);
        setBookmarks(newBookmarks);
        vscode.postMessage({ command: 'saveBookmarks', bookmarks: newBookmarks });
    };
    return (_jsxs("div", { style: {
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
        }, children: [loading && (_jsx("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '2px',
                    width: '100%',
                    overflow: 'hidden',
                    zIndex: 10
                }, children: _jsx("div", { style: {
                        width: '30%',
                        height: '100%',
                        background: 'var(--vscode-progressBar-background)',
                        borderRadius: '1px',
                        animation: 'vb-loading-slide 1.5s ease-in-out infinite'
                    } }) })), _jsxs("div", { className: "browser-navbar", style: {
                    display: 'flex',
                    alignItems: 'center',
                    height: '32px',
                    gap: '8px',
                    fontFamily: 'var(--vscode-font-family)'
                }, children: [_jsx(NavControls, { canGoBack: !!url, canGoForward: !!url, isBookmarked: isBookmarked, onBack: handleBack, onForward: handleForward, onReload: handleReload, onToggleBookmark: handleToggleBookmark }), _jsx(URLDisplay, { url: url, pageTitle: pageTitle, onUrlChange: setUrl, onNavigate: handleGo }), _jsx(BrowserTools, { isPickerActive: pickerActive, onTogglePicker: togglePicker, onScreenshot: handleScreenshot, onToggleConsole: handleToggleConsole, onCopyConsole: handleCopyConsole, onReload: handleReload })] }), _jsx(BookmarksBar, { bookmarks: bookmarks, onBookmarkClick: handleBookmarkClick, onBookmarkRemove: handleBookmarkRemove })] }));
};
