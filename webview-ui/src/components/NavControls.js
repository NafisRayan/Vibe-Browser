import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const NavControls = ({ canGoBack, canGoForward, isBookmarked, onBack, onForward, onReload, onToggleBookmark }) => {
    return (_jsxs("div", { className: "nav-controls", style: {
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
        }, children: [_jsx("button", { className: "vb-btn nav-back", title: "Navigate back", disabled: !canGoBack, onClick: onBack, children: _jsx("i", { className: "codicon codicon-arrow-left" }) }), _jsx("button", { className: "vb-btn nav-forward", title: "Navigate forward", disabled: !canGoForward, onClick: onForward, children: _jsx("i", { className: "codicon codicon-arrow-right" }) }), _jsx("button", { className: "vb-btn nav-refresh", title: "Hard reload (clears cache)", onClick: onReload, children: _jsx("i", { className: "codicon codicon-refresh" }) }), _jsx("button", { className: `vb-btn ${isBookmarked ? 'bookmarked' : ''}`, title: isBookmarked ? "Remove bookmark" : "Add bookmark", onClick: onToggleBookmark, children: _jsx("i", { className: `codicon ${isBookmarked ? 'codicon-star-full' : 'codicon-star-empty'}` }) })] }));
};
