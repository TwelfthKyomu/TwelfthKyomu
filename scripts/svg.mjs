export const C = {
    page: '#0d1117',
    panel: '#081420',
    plate: '#18345a',
    deep: '#29509a',
    blue: '#3169d5',
    sky: '#5281de',
    moon: '#acc2de',
    lamp: '#f0c27a',
    empty: '#161b22',
};

export const W = 830;
export const PAD = 24;

const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;

const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const textWidth = (s, size) => [...s].length * size * 0.6;

export function text(s, { x, y, size = 12, fill = C.moon }) {
    return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" textLength="${textWidth(s, size)}" lengthAdjust="spacingAndGlyphs">${esc(s)}</text>`;
}

export const heading = (s, y) => text(s, { x: PAD, y, fill: C.sky });

export const frame = (width, height) =>
    `<rect width="${width}" height="${height}" rx="10" fill="${C.page}"/>`;

export const panel = (x, y, width, height) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${C.panel}"/>`;

const PILL = { height: 26, padX: 9, icon: 14, gap: 6, size: 12 };

export const pillWidth = (label) => PILL.padX * 2 + PILL.icon + PILL.gap + textWidth(label, PILL.size);

export function pill({ x, y, label, icon }) {
    const iconX = x + PILL.padX;
    const iconY = y + (PILL.height - PILL.icon) / 2;
    return [
        `<rect x="${x}" y="${y}" width="${pillWidth(label)}" height="${PILL.height}" rx="4" fill="${C.plate}"/>`,
        `<svg x="${iconX}" y="${iconY}" width="${PILL.icon}" height="${PILL.icon}" viewBox="0 0 24 24"><path fill="${C.lamp}" d="${icon}"/></svg>`,
        text(label, { x: iconX + PILL.icon + PILL.gap, y: y + 17.5, size: PILL.size }),
    ].join('\n');
}

export const PILL_HEIGHT = PILL.height;

export function svgFile({ width = W, height, title, body, style = '' }) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>text { font-family: ${MONO}; }${style}</style>
${body}
</svg>
`;
}
