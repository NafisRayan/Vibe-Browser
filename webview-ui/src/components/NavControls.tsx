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
    const buttonStyle: React.CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: 'var(--vscode-icon-foreground)',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        cursor: 'pointer',
        padding: 0,
        fontSize: '16px',
        transition: 'all 0.2s ease'
    };

    const disabledStyle: React.CSSProperties = {
        ...buttonStyle,
        opacity: 0.3,
        cursor: 'default',
        filter: 'grayscale(1)'
    };

    return (
        <div className="nav-controls" style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
        }}>
            <button
                className="nav-button"
                title="Navigate back"
                disabled={!canGoBack}
                onClick={onBack}
                style={canGoBack ? buttonStyle : disabledStyle}
                onMouseEnter={e => canGoBack && (
                    e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)',
                    e.currentTarget.style.transform = 'translateX(-2px)'
                )}
                onMouseLeave={e => (
                    e.currentTarget.style.background = 'transparent',
                    e.currentTarget.style.transform = 'none'
                )}
            >
                <i className="codicon codicon-arrow-left"></i>
            </button>

            <button
                className="nav-button"
                title="Navigate forward"
                disabled={!canGoForward}
                onClick={onForward}
                style={canGoForward ? buttonStyle : disabledStyle}
                onMouseEnter={e => canGoForward && (
                    e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)',
                    e.currentTarget.style.transform = 'translateX(2px)'
                )}
                onMouseLeave={e => (
                    e.currentTarget.style.background = 'transparent',
                    e.currentTarget.style.transform = 'none'
                )}
            >
                <i className="codicon codicon-arrow-right"></i>
            </button>

            <button
                className="nav-button"
                title="Hard reload (clears cache)"
                onClick={onReload}
                style={buttonStyle}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
                    const icon = e.currentTarget.querySelector('.codicon-refresh') as HTMLElement;
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    const icon = e.currentTarget.querySelector('.codicon-refresh') as HTMLElement;
                    if (icon) icon.style.transform = 'none';
                }}
            >
                <i className="codicon codicon-refresh" style={{ transition: 'transform 0.4s ease' }}></i>
            </button>

            <button
                className="nav-button"
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                onClick={onToggleBookmark}
                style={{
                    ...buttonStyle,
                    color: isBookmarked ? 'var(--vscode-charts-yellow)' : 'var(--vscode-icon-foreground)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <i className={`codicon ${isBookmarked ? 'codicon-star-full' : 'codicon-star-empty'}`}></i>
            </button>
        </div>
    );
};





