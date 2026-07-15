import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from 'react';
function parseURL(urlStr) {
    try {
        const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
        return {
            protocol: parsed.protocol.replace(':', ''),
            domain: parsed.hostname,
            port: parsed.port ? `:${parsed.port}` : '',
            path: parsed.pathname + parsed.search + parsed.hash
        };
    }
    catch {
        return { protocol: '', domain: urlStr, port: '', path: '' };
    }
}
export const URLDisplay = ({ url, pageTitle, onUrlChange, onNavigate }) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const parts = parseURL(url);
    const isSecure = parts.protocol === 'https';
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onNavigate();
            inputRef.current?.blur();
        }
    };
    return (_jsx("div", { className: "url-input-container", style: {
            flex: 1,
            position: 'relative',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center'
        }, children: _jsxs("div", { className: "url-display", style: {
                position: 'relative',
                width: '100%',
                height: '26px',
                background: 'var(--vscode-input-background)',
                border: `1px solid ${isFocused ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                borderRadius: '6px',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'text',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: isFocused ? '0 0 0 2px var(--vscode-focusBorder)44' : 'none'
            }, onClick: () => inputRef.current?.focus(), children: [_jsx("i", { className: `codicon ${isSecure ? 'codicon-lock' : 'codicon-warning'}`, style: {
                        fontSize: '11px',
                        marginRight: '6px',
                        color: isSecure ? 'var(--vscode-charts-green)' : 'var(--vscode-editorWarning-foreground)',
                        opacity: 0.8
                    } }), _jsx("input", { ref: inputRef, type: "text", value: url, onChange: (e) => onUrlChange(e.target.value), onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false), onKeyDown: handleKeyDown, placeholder: "Search or enter address", style: {
                        position: 'absolute',
                        left: 24,
                        right: 10,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--vscode-input-foreground)',
                        fontSize: '12px',
                        fontFamily: 'var(--vscode-font-family)',
                        opacity: isFocused ? 1 : 0,
                        pointerEvents: isFocused ? 'auto' : 'none',
                        transition: 'opacity 0.1s'
                    } }), _jsxs("span", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'opacity 0.1s',
                        overflow: 'hidden',
                        minWidth: 0,
                        opacity: isFocused ? 0 : 1,
                        pointerEvents: isFocused ? 'none' : 'auto',
                        fontSize: '12px'
                    }, children: [!url && !isFocused && (_jsx("span", { style: { color: 'var(--vscode-input-placeholderForeground)', opacity: 0.7 }, children: "Search or enter address" })), parts.protocol && (_jsxs("span", { className: "url-protocol", style: {
                                color: 'var(--vscode-descriptionForeground)',
                                opacity: 0.5,
                                marginRight: '1px'
                            }, children: [parts.protocol, "://"] })), _jsx("span", { className: "url-domain", style: {
                                color: 'var(--vscode-input-foreground)',
                                fontWeight: 600
                            }, children: parts.domain }), parts.port && (_jsx("span", { className: "url-port", style: {
                                color: 'var(--vscode-descriptionForeground)',
                                opacity: 0.8
                            }, children: parts.port })), parts.path && parts.path !== '/' && (_jsx("span", { className: "url-path", style: {
                                color: 'var(--vscode-descriptionForeground)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.8
                            }, children: parts.path })), pageTitle && (_jsxs(_Fragment, { children: [_jsx("span", { className: "url-title-separator", style: {
                                        margin: '0 6px',
                                        color: 'var(--vscode-descriptionForeground)',
                                        opacity: 0.3
                                    }, children: "\u2014" }), _jsx("span", { className: "url-page-title", style: {
                                        color: 'var(--vscode-descriptionForeground)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: '12px',
                                        opacity: 0.7
                                    }, title: pageTitle, children: pageTitle })] }))] })] }) }));
};
