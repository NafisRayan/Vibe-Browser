import React from 'react';

export interface Bookmark {
    url: string;
    title: string;
    domain: string;
}

interface BookmarksBarProps {
    bookmarks: Bookmark[];
    onBookmarkClick: (url: string) => void;
    onBookmarkRemove: (url: string) => void;
}

export const BookmarksBar: React.FC<BookmarksBarProps> = ({
    bookmarks,
    onBookmarkClick,
    onBookmarkRemove
}) => {
    if (bookmarks.length === 0) return null;

    const getFaviconUrl = (domain: string) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    };

    return (
        <div className="browser-bookmarks-bar" style={{
            height: '28px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            overflow: 'auto',
            gap: '4px'
        }}>
            <div className="browser-bookmarks-inner" style={{
                display: 'flex',
                gap: '2px',
                alignItems: 'center'
            }}>
                {bookmarks.map((bookmark, idx) => (
                    <button
                        key={idx}
                        draggable
                        className="bookmark-item"
                        title={bookmark.url}
                        onClick={() => onBookmarkClick(bookmark.url)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onBookmarkRemove(bookmark.url);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'var(--vscode-foreground)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            opacity: 0.9
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
                            e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.opacity = '0.9';
                        }}
                    >
                        <img
                            className="bookmark-favicon"
                            src={getFaviconUrl(bookmark.domain)}
                            alt=""
                            style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '2px'
                            }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.removeAttribute('style');
                            }}
                        />
                        <i
                            className="bookmark-favicon-fallback codicon codicon-globe"
                            style={{
                                display: 'none',
                                fontSize: '14px',
                                opacity: 0.6
                            }}
                        ></i>
                        <span className="bookmark-domain" style={{ fontWeight: 400 }}>{bookmark.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};





