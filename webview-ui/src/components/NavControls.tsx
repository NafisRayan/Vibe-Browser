import React from 'react';

interface NavControlsProps {
    canGoBack: boolean;
    canGoForward: boolean;
    isBookmarked: boolean;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onToggleBookmark: () => void;
}

export const NavControls: React.FC<NavControlsProps> = ({
    canGoBack,
    canGoForward,
    isBookmarked,
    onBack,
    onForward,
    onReload,
    onToggleBookmark
}) => {
    return (
        <div className="nav-controls" style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
        }}>
            <button
                className="vb-btn nav-back"
                title="Navigate back"
                disabled={!canGoBack}
                onClick={onBack}
            >
                <i className="codicon codicon-arrow-left"></i>
            </button>

            <button
                className="vb-btn nav-forward"
                title="Navigate forward"
                disabled={!canGoForward}
                onClick={onForward}
            >
                <i className="codicon codicon-arrow-right"></i>
            </button>

            <button
                className="vb-btn nav-refresh"
                title="Hard reload (clears cache)"
                onClick={onReload}
            >
                <i className="codicon codicon-refresh"></i>
            </button>

            <button
                className={`vb-btn ${isBookmarked ? 'bookmarked' : ''}`}
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                onClick={onToggleBookmark}
            >
                <i className={`codicon ${isBookmarked ? 'codicon-star-full' : 'codicon-star-empty'}`}></i>
            </button>
        </div>
    );
};
