export function getDomPath(el) {
    if (!el)
        return '';
    const stack = [];
    let current = el;
    while (current && current.parentNode && current.tagName !== 'HTML') {
        let str = current.tagName.toLowerCase();
        if (current.id) {
            str += '#' + current.id;
            stack.unshift(str);
            break;
        }
        else if (current.className && typeof current.className === 'string' && current.className.trim()) {
            str += '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.');
        }
        stack.unshift(str);
        current = current.parentNode;
    }
    return stack.join(' > ');
}
function getTextContent(el) {
    // Only visible text — skip hidden elements, scripts, styles
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent)
                return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT')
                return NodeFilter.FILTER_REJECT;
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden')
                return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const parts = [];
    let node;
    while ((node = walker.nextNode())) {
        const text = node.textContent?.replace(/\s+/g, ' ').trim();
        if (text)
            parts.push(text);
    }
    const combined = parts.join(' ').trim();
    return combined.length > 120 ? combined.slice(0, 117) + '...' : combined;
}
function getRole(el) {
    const ariaRole = el.getAttribute('role');
    if (ariaRole)
        return ariaRole;
    const tag = el.tagName.toLowerCase();
    const roleMap = {
        a: 'link', button: 'button', input: 'input', select: 'dropdown',
        textarea: 'textbox', img: 'image', nav: 'navigation',
        header: 'banner', main: 'main', footer: 'contentinfo',
        form: 'form', label: 'label', summary: 'summary', details: 'details'
    };
    return roleMap[tag] || tag;
}
function getComputedSummary(el) {
    const s = window.getComputedStyle(el);
    const parts = [];
    const props = [
        ['display', null], ['position', null], ['width', null], ['height', null],
        ['margin', null], ['padding', null], ['background', null], ['color', null],
        ['font-size', null], ['border', null], ['border-radius', null],
        ['flex-direction', 'flex'], ['gap', 'flex'], ['justify-content', 'flex'],
        ['align-items', 'flex'], ['z-index', null], ['opacity', null],
        ['box-shadow', null], ['overflow', null]
    ];
    for (const [prop, onlyIf] of props) {
        if (onlyIf && !s.display.includes(onlyIf))
            continue;
        const val = s.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'normal' && val !== 'auto'
            && val !== '0px' && val !== '0' && val !== '0 0px 0px 0px') {
            const short = val.length > 50 ? val.slice(0, 47) + '...' : val;
            parts.push(`${prop}: ${short}`);
            if (parts.length >= 6)
                break;
        }
    }
    return parts.join('; ');
}
function getMeaningfulAttrs(el) {
    const noisy = new Set([
        'class', 'style', 'data-ved', 'jsaction', 'jscontroller', 'jsmodel',
        'jsdata', 'jsname', 'data-hveid', 'data-atf', 'data-csiid',
        'jsshadow', 'tabindex'
    ]);
    const attrs = [];
    for (let i = 0; i < el.attributes.length && attrs.length < 5; i++) {
        const a = el.attributes[i];
        if (noisy.has(a.name))
            continue;
        // Keep aria-* and meaningful data-* attributes
        const val = a.value.length > 60 ? a.value.slice(0, 57) + '...' : a.value;
        attrs.push(`${a.name}="${val}"`);
    }
    return attrs;
}
function buildSelector(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id;
    if (id)
        return `${tag}#${id}`;
    const cls = typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
    const sel = cls ? `${tag}.${cls}` : tag;
    // Add a parent selector for disambiguation
    const parent = el.parentElement;
    if (!parent || parent.tagName === 'HTML')
        return sel;
    const pTag = parent.tagName.toLowerCase();
    const pId = parent.id;
    if (pId)
        return `${pTag}#${pId} > ${sel}`;
    const pCls = typeof parent.className === 'string'
        ? parent.className.trim().split(/\s+/)[0] : '';
    return pCls ? `${pTag}.${pCls} > ${sel}` : sel;
}
export function formatElementDetails(el) {
    const rect = el.getBoundingClientRect();
    const domPath = getDomPath(el);
    const selector = buildSelector(el);
    const role = getRole(el);
    const text = getTextContent(el);
    const css = getComputedSummary(el);
    const attrs = getMeaningfulAttrs(el);
    let pageUrl;
    try {
        // Use the real target URL injected by the proxy, not the proxy origin
        const realUrl = window.__vbTargetUrl || location.href;
        const base = new URL(realUrl);
        // Reconstruct: use target host but current path (proxy preserves the path)
        const u = new URL(location.pathname + location.search + location.hash, realUrl);
        pageUrl = u.hostname + u.pathname + u.search;
    }
    catch {
        pageUrl = location.hostname + location.pathname;
    }
    const lines = [
        `## Page: ${pageUrl}`,
        ``,
        `### Element: \`${selector}\``,
        `- **Role:** ${role}`,
        `- **Path:** ${domPath}`,
        `- **Size:** ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
        `- **Position:** (${Math.round(rect.left)}, ${Math.round(rect.top)})`,
    ];
    if (text) {
        lines.push(`- **Text:** "${text}"`);
    }
    lines.push(`- **Styles:** ${css}`);
    if (attrs.length > 0) {
        lines.push(`- **Attrs:** ${attrs.join(' ')}`);
    }
    lines.push(`- **Comment:**`);
    return lines.join('\n');
}
