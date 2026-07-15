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
                    className={`vb-btn ${isPickerActive ? 'active' : ''}`}
                    onClick={onTogglePicker}
                >
                    <i className="codicon codicon-inspect"></i>
                </button>
            )}

            {visibleTools.camera && (
                <button
                    title="Capture area screenshot"
                    className="vb-btn"
                    onClick={onScreenshot}
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
                    className="vb-btn"
                    onClick={onToggleConsole}
                >
                    <i className="codicon codicon-terminal"></i>
                </button>
            )}

            <button
                title="Browser Menu"
                className="vb-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={isMenuOpen ? { background: 'var(--vscode-toolbar-activeBackground)' } : undefined}
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
                        className="vb-menu-item"
                        onClick={() => { onReload(); setIsMenuOpen(false); }}
                    >
                        <i className="codicon codicon-refresh"></i>
                        <span>Hard Refresh</span>
                    </div>

                    <div
                        className="vb-menu-item"
                        onClick={() => { onCopyConsole(); setIsMenuOpen(false); }}
                    >
                        <i className="codicon codicon-debug-console"></i>
                        <span>Copy Console Logs</span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--vscode-menu-separatorBackground)', margin: '4px 8px' }}></div>

                    <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Toggle Visibility
                    </div>

                    <div
                        className="vb-menu-item"
                        onClick={() => toggleTool('picker')}
                    >
                        <i className={`codicon vb-menu-check ${visibleTools.picker ? 'codicon-check' : ''}`}></i>
                        <i className="codicon codicon-inspect"></i>
                        <span>Element Picker</span>
                    </div>

                    <div
                        className="vb-menu-item"
                        onClick={() => toggleTool('camera')}
                    >
                        <i className={`codicon vb-menu-check ${visibleTools.camera ? 'codicon-check' : ''}`}></i>
                        <i className="codicon codicon-device-camera"></i>
                        <span>Screenshot</span>
                    </div>

                    <div
                        className="vb-menu-item"
                        onClick={() => toggleTool('terminal')}
                    >
                        <i className={`codicon vb-menu-check ${visibleTools.terminal ? 'codicon-check' : ''}`}></i>
                        <i className="codicon codicon-terminal"></i>
                        <span>Console</span>
                    </div>
                </div>
            )}
        </div>
    );
};
