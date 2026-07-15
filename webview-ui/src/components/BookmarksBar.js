import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const BookmarksBar = ({ bookmarks, onBookmarkClick, onBookmarkRemove }) => {
    if (bookmarks.length === 0)
        return null;
    const getFaviconUrl = (domain) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    };
    return (_jsx("div", { className: "browser-bookmarks-bar", style: {
            height: '28px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            overflow: 'auto',
            gap: '4px'
        }, children: _jsx("div", { className: "browser-bookmarks-inner", style: {
                display: 'flex',
                gap: '2px',
                alignItems: 'center'
            }, children: bookmarks.map((bookmark) => (_jsxs("button", { draggable: true, className: "vb-bookmark-item", title: bookmark.url, onClick: () => onBookmarkClick(bookmark.url), onContextMenu: (e) => {
                    e.preventDefault();
                    onBookmarkRemove(bookmark.url);
                }, children: [_jsx("img", { className: "vb-bookmark-favicon", src: getFaviconUrl(bookmark.domain), alt: "", onError: (e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('vb-bookmark-fallback');
                        } }), _jsx("i", { className: "vb-bookmark-fallback codicon codicon-globe" }), _jsx("span", { className: "bookmark-domain", style: { fontWeight: 400 }, children: bookmark.title })] }, bookmark.url))) }) }));
};
