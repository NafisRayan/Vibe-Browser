import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export const BrowserTools = ({ isPickerActive, onTogglePicker, onScreenshot, onToggleConsole, onCopyConsole, onReload }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [visibleTools, setVisibleTools] = useState({
        picker: true,
        camera: true,
        terminal: true
    });
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const toggleTool = (tool) => {
        setVisibleTools(prev => ({ ...prev, [tool]: !prev[tool] }));
    };
    return (_jsxs("div", { className: "browser-tools", style: {
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            position: 'relative'
        }, children: [visibleTools.picker && (_jsx("button", { title: "Select element", className: `vb-btn ${isPickerActive ? 'active' : ''}`, onClick: onTogglePicker, children: _jsx("i", { className: "codicon codicon-inspect" }) })), visibleTools.camera && (_jsx("button", { title: "Capture area screenshot", className: "vb-btn", onClick: onScreenshot, children: _jsx("i", { className: "codicon codicon-device-camera" }) })), (visibleTools.picker || visibleTools.camera) && visibleTools.terminal && (_jsx("div", { style: { width: '1px', height: '20px', background: 'var(--vscode-panel-border)', margin: '0 4px', opacity: 0.5 } })), visibleTools.terminal && (_jsx("button", { title: "Show Console", className: "vb-btn", onClick: onToggleConsole, children: _jsx("i", { className: "codicon codicon-terminal" }) })), _jsx("button", { title: "Browser Menu", className: "vb-btn", onClick: () => setIsMenuOpen(!isMenuOpen), style: isMenuOpen ? { background: 'var(--vscode-toolbar-activeBackground)' } : undefined, children: _jsx("i", { className: "codicon codicon-ellipsis" }) }), isMenuOpen && (_jsxs("div", { ref: menuRef, style: {
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
                }, children: [_jsxs("div", { className: "vb-menu-item", onClick: () => { onReload(); setIsMenuOpen(false); }, children: [_jsx("i", { className: "codicon codicon-refresh" }), _jsx("span", { children: "Hard Refresh" })] }), _jsxs("div", { className: "vb-menu-item", onClick: () => { onCopyConsole(); setIsMenuOpen(false); }, children: [_jsx("i", { className: "codicon codicon-debug-console" }), _jsx("span", { children: "Copy Console Logs" })] }), _jsx("div", { style: { height: '1px', background: 'var(--vscode-menu-separatorBackground)', margin: '4px 8px' } }), _jsx("div", { style: { padding: '4px 12px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontWeight: 600, textTransform: 'uppercase' }, children: "Toggle Visibility" }), _jsxs("div", { className: "vb-menu-item", onClick: () => toggleTool('picker'), children: [_jsx("i", { className: `codicon vb-menu-check ${visibleTools.picker ? 'codicon-check' : ''}` }), _jsx("i", { className: "codicon codicon-inspect" }), _jsx("span", { children: "Element Picker" })] }), _jsxs("div", { className: "vb-menu-item", onClick: () => toggleTool('camera'), children: [_jsx("i", { className: `codicon vb-menu-check ${visibleTools.camera ? 'codicon-check' : ''}` }), _jsx("i", { className: "codicon codicon-device-camera" }), _jsx("span", { children: "Screenshot" })] }), _jsxs("div", { className: "vb-menu-item", onClick: () => toggleTool('terminal'), children: [_jsx("i", { className: `codicon vb-menu-check ${visibleTools.terminal ? 'codicon-check' : ''}` }), _jsx("i", { className: "codicon codicon-terminal" }), _jsx("span", { children: "Console" })] })] }))] }));
};
