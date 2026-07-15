import React from 'react';
import { Bookmark } from '../common/types';

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
                {bookmarks.map((bookmark) => (
                    <button
                        key={bookmark.url}
                        draggable
                        className="vb-bookmark-item"
                        title={bookmark.url}
                        onClick={() => onBookmarkClick(bookmark.url)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onBookmarkRemove(bookmark.url);
                        }}
                    >
                        <img
                            className="vb-bookmark-favicon"
                            src={getFaviconUrl(bookmark.domain)}
                            alt=""
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('vb-bookmark-fallback');
                            }}
                        />
                        <i
                            className="vb-bookmark-fallback codicon codicon-globe"
                        ></i>
                        <span className="bookmark-domain" style={{ fontWeight: 400 }}>{bookmark.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
