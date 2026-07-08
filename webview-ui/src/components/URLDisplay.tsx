import React, { useState, useRef, useEffect } from 'react';

interface URLDisplayProps {
    url: string;
    pageTitle?: string;
    onUrlChange: (url: string) => void;
    onNavigate: () => void;
}

export const URLDisplay: React.FC<URLDisplayProps> = ({ url, pageTitle, onUrlChange, onNavigate }) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const parseURL = (urlStr: string) => {
        try {
            const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
            return {
                protocol: parsed.protocol.replace(':', ''),
                domain: parsed.hostname,
                port: parsed.port ? `:${parsed.port}` : '',
                path: parsed.pathname + parsed.search + parsed.hash
            };
        } catch {
            return { protocol: '', domain: urlStr, port: '', path: '' };
        }
    };

    const parts = parseURL(url);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onNavigate();
            inputRef.current?.blur();
        }
    };

    return (
        <div className="url-input-container" style={{
            flex: 1,
            position: 'relative',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center'
        }}>
            <div className="url-display" style={{
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
            }} onClick={() => inputRef.current?.focus()}>
                <i className="codicon codicon-lock" style={{ 
                    fontSize: '11px', 
                    marginRight: '6px', 
                    color: 'var(--vscode-charts-green)',
                    opacity: 0.8
                }}></i>
                
                {/* Raw input (visible when focused) */}
                <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or enter address"
                    style={{
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
                    }}
                />
                
                {/* Parsed display (visible when not focused) */}
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'opacity 0.1s',
                    overflow: 'hidden',
                    minWidth: 0,
                    opacity: isFocused ? 0 : 1,
                    pointerEvents: isFocused ? 'none' : 'auto',
                    fontSize: '12px'
                }}>
                    {!url && !isFocused && (
                        <span style={{ color: 'var(--vscode-input-placeholderForeground)', opacity: 0.7 }}>
                            Search or enter address
                        </span>
                    )}
                    {parts.protocol && (
                        <span className="url-protocol" style={{
                            color: 'var(--vscode-descriptionForeground)',
                            opacity: 0.5,
                            marginRight: '1px'
                        }}>
                            {parts.protocol}://
                        </span>
                    )}
                    <span className="url-domain" style={{
                        color: 'var(--vscode-input-foreground)',
                        fontWeight: 600
                    }}>
                        {parts.domain}
                    </span>
                    {parts.port && (
                        <span className="url-port" style={{
                            color: 'var(--vscode-descriptionForeground)',
                            opacity: 0.8
                        }}>
                            {parts.port}
                        </span>
                    )}
                    {parts.path && parts.path !== '/' && (
                        <span className="url-path" style={{
                            color: 'var(--vscode-descriptionForeground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: 0.8
                        }}>
                            {parts.path}
                        </span>
                    )}
                    {pageTitle && (
                        <>
                            <span className="url-title-separator" style={{
                                margin: '0 6px',
                                color: 'var(--vscode-descriptionForeground)',
                                opacity: 0.3
                            }}>
                                —
                            </span>
                            <span className="url-page-title" style={{
                                color: 'var(--vscode-descriptionForeground)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                                fontSize: '12px',
                                opacity: 0.7
                            }} title={pageTitle}>
                                {pageTitle}
                            </span>
                        </>
                    )}
                </span>
            </div>
        </div>
    );
};





