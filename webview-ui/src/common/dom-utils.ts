
export function getDomPath(el: Element): string {
    if (!el) return '';
    const stack: string[] = [];
    let current: Element | null = el;
    while (current && current.parentNode && current.tagName !== 'HTML') {
        let str = current.tagName.toLowerCase();
        if (current.id) {
            str += '#' + current.id;
            stack.unshift(str);
            break; // IDs are supposed to be unique
        } else {
            if (current.className && typeof current.className === 'string' && current.className.trim()) {
                str += '.' + current.className.trim().split(/\s+/).join('.');
            }
        }
        stack.unshift(str);
        current = current.parentNode as Element;
    }
    return stack.join(' > ');
}

export function getComputedStyles(el: Element): any {
    const style = window.getComputedStyle(el);
    const isFlex = style.display.includes('flex');
    const isGrid = style.display.includes('grid');
    
    let layoutInfo = `display=${style.display}`;
    
    if (isFlex || isGrid) {
        layoutInfo += `, gap=${style.gap}`;
        layoutInfo += `, justify=${style.justifyContent}`;
        layoutInfo += `, align=${style.alignItems}`;
        if (isFlex) layoutInfo += `, direction=${style.flexDirection}`;
    }

    return {
        color: style.color,
        background: style.backgroundColor,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        font: `${style.fontSize} ${style.fontFamily}`,
        model: `m:${style.margin}, p:${style.padding}, border:${style.borderWidth}`,
        layout: layoutInfo,
        visibility: `z-index=${style.zIndex}, opacity=${style.opacity}, visibility=${style.visibility}`
    };
}

export function getAttributes(el: Element): string {
    if (!el.hasAttributes()) return '';
    const attrs: string[] = [];
    for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr.name !== 'class' && attr.name !== 'style' && attr.name !== 'id') {
            attrs.push(`${attr.name}="${attr.value}"`);
        }
    }
    return attrs.length > 0 ? 'Attributes: ' + attrs.join(' ') : '';
}

export function formatElementDetails(el: HTMLElement): string {
    const rect = el.getBoundingClientRect();
    const domPath = getDomPath(el);
    const styles = getComputedStyles(el);
    const attrs = getAttributes(el);
    
    // Get full outerHTML without any truncation
    const fullHtml = el.outerHTML;
    const htmlLength = fullHtml.length;
    // Use full HTML without limits
    const htmlSnippet = fullHtml.replace(/\s+/g, ' ').trim();

    return `
**Picked Element Details:**

- **DOM Path:** \`${domPath}\`
- **Position:** \`top=${Math.round(rect.top)}px\`, \`left=${Math.round(rect.left)}px\`, \`width=${Math.round(rect.width)}px\`, \`height=${Math.round(rect.height)}px\`

**Visual Properties:**
- **Styles:** \`color=${styles.color}\`, \`bg=${styles.background}\`, \`font=${styles.font}\`
- **Layout:** \`display=${styles.layout.split('=')[1] || styles.layout}\`, \`${styles.model}\`
- **Visibility:** \`${styles.visibility}\`
${attrs ? '- **Attributes:** `' + attrs + '`' : ''}

**HTML:** (${htmlLength} chars)
\`\`\`html
${htmlSnippet}
\`\`\`
`.trim();
}
