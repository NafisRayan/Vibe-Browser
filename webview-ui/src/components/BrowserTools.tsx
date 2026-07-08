import React, { useState, useRef, useEffect } from 'react';

interface BrowserToolsProps {
    isPickerActive: boolean;
    onTogglePicker: () => void;
    onScreenshot: () => void;
    onToggleConsole: () => void;
    onCopyConsole: () => void;
    onReload: () => void;
}

export const BrowserTools: React.FC<BrowserToolsProps> = ({
    isPickerActive,
    onTogglePicker,
    onScreenshot,
    onToggleConsole,
    onCopyConsole,
    onReload
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [visibleTools, setVisibleTools] = useState({
        picker: true,
        camera: true,
        terminal: true
    });
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTool = (tool: keyof typeof visibleTools) => {
        setVisibleTools(prev => ({ ...prev, [tool]: !prev[tool] }));
    };

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

    const menuItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        borderRadius: '4px',
        transition: 'background 0.1s'
    };

    return (
        <div className="browser-tools" style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            position: 'relative'
        }}>
            {visibleTools.picker && (
                <button
                    title="Select element"
                    className={`tool-button ${isPickerActive ? 'active' : ''}`}
                    onClick={onTogglePicker}
                    style={{
                        ...buttonStyle,
                        background: isPickerActive ? 'var(--vscode-button-background)' : 'transparent',
                        color: isPickerActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-icon-foreground)',
                        boxShadow: isPickerActive ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                    }}
                    onMouseEnter={e => !isPickerActive && (e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)')}
                    onMouseLeave={e => !isPickerActive && (e.currentTarget.style.background = 'transparent')}
                >
                    <i className="codicon codicon-inspect"></i>
                </button>
            )}

            {visibleTools.camera && (
                <button
                    title="Capture area screenshot"
                    className="tool-button"
                    onClick={onScreenshot}
                    style={buttonStyle}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <i className="codicon codicon-device-camera"></i>
                </button>
            )}

            {(visibleTools.picker || visibleTools.camera) && visibleTools.terminal && (
                <div style={{ width: '1px', height: '20px', background: 'var(--vscode-panel-border)', margin: '0 4px', opacity: 0.5 }}></div>
            )}

            {visibleTools.terminal && (
                <button
                    title="Show Console"
                    className="tool-button"
                    onClick={onToggleConsole}
                    style={buttonStyle}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <i className="codicon codicon-terminal"></i>
                </button>
            )}

            <button
                title="Browser Menu"
                className="tool-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                    ...buttonStyle,
                    background: isMenuOpen ? 'var(--vscode-toolbar-activeBackground)' : 'transparent'
                }}
                onMouseEnter={e => !isMenuOpen && (e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)')}
                onMouseLeave={e => !isMenuOpen && (e.currentTarget.style.background = 'transparent')}
            >
                <i className="codicon codicon-ellipsis"></i>
            </button>

            {isMenuOpen && (
                <div ref={menuRef} style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--vscode-menu-background)',
                    border: '1px solid var(--vscode-menu-border)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    padding: '4px',
                    minWidth: '180px',
                    zIndex: 1000000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                }}>
                    <div 
                        style={menuItemStyle}
                        onClick={() => { onReload(); setIsMenuOpen(false); }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="codicon codicon-refresh" style={{ fontSize: '14px' }}></i>
                        <span>Hard Refresh</span>
                    </div>

                    <div
                        style={menuItemStyle}
                        onClick={() => { onCopyConsole(); setIsMenuOpen(false); }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="codicon codicon-debug-console" style={{ fontSize: '14px' }}></i>
                        <span>Copy Console Logs</span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--vscode-menu-separatorBackground)', margin: '4px 8px' }}></div>
                    
                    <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Toggle Visibility
                    </div>

                    <div 
                        style={menuItemStyle}
                        onClick={() => toggleTool('picker')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className={`codicon ${visibleTools.picker ? 'codicon-check' : ''}`} style={{ width: '16px', fontSize: '14px' }}></i>
                        <i className="codicon codicon-inspect" style={{ fontSize: '14px' }}></i>
                        <span>Element Picker</span>
                    </div>

                    <div 
                        style={menuItemStyle}
                        onClick={() => toggleTool('camera')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className={`codicon ${visibleTools.camera ? 'codicon-check' : ''}`} style={{ width: '16px', fontSize: '14px' }}></i>
                        <i className="codicon codicon-device-camera" style={{ fontSize: '14px' }}></i>
                        <span>Screenshot</span>
                    </div>

                    <div 
                        style={menuItemStyle}
                        onClick={() => toggleTool('terminal')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-menu-selectionBackground)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className={`codicon ${visibleTools.terminal ? 'codicon-check' : ''}`} style={{ width: '16px', fontSize: '14px' }}></i>
                        <i className="codicon codicon-terminal" style={{ fontSize: '14px' }}></i>
                        <span>Console</span>
                    </div>
                </div>
            )}
        </div>
    );
};
