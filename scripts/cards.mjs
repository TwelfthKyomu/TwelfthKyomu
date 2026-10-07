import { writeFile } from 'node:fs/promises';
import { C, PAD, PILL_HEIGHT, W, frame, heading, pill, pillWidth, svgFile, text, textWidth } from './svg.mjs';

const ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/icons';

const STACK = [
    ['TypeScript', 'typescript'],
    ['React', 'react'],
    ['Next.js', 'nextdotjs'],
    ['TanStack Query', 'reactquery'],
    ['PostgreSQL', 'postgresql'],
    ['Drizzle', 'drizzle'],
];

const SUBTITLE = 'frontend · novosibirsk · utc+7';

const GLYPHS = {
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};

async function icon(slug) {
    const res = await fetch(`${ICONS}/${slug}.svg`);
    if (!res.ok) throw new Error(`simple-icons: ${slug} → ${res.status}`);
    return (await res.text()).match(/ d="([^"]+)"/)[1];
}

function wordmark(word, y, cell = 9) {
    const advance = 7 * cell;
    const width = word.length * advance - 2 * cell;
    const x0 = (W - width) / 2;
    const d = [];
    [...word].forEach((ch, i) =>
        GLYPHS[ch].forEach((row, r) =>
            [...row].forEach((bit, c) => {
                if (bit === '1') d.push(`M${x0 + i * advance + c * cell} ${y + r * cell}h${cell - 1}v${cell - 1}h-${cell - 1}z`);
            }),
        ),
    );
    return { svg: `<path fill="${C.moon}" d="${d.join('')}"/>`, height: 7 * cell };
}

function pillRow(items, y) {
    const out = [];
    let x = PAD;
    let row = y;
    for (const item of items) {
        const width = pillWidth(item.label);
        if (x + width > W - PAD) {
            x = PAD;
            row += PILL_HEIGHT + 8;
        }
        out.push(pill({ x, y: row, ...item }));
        x += width + 8;
    }
    return { svg: out.join('\n'), bottom: row + PILL_HEIGHT };
}

async function header() {
    const name = wordmark('TWELFTH', 30);
    const subY = 30 + name.height + 32;
    const subWidth = textWidth(SUBTITLE, 13);
    const subX = (W - (subWidth + 6 + 8)) / 2;
    const stack = pillRow(
        await Promise.all(STACK.map(async ([label, slug]) => ({ label, icon: await icon(slug) }))),
        subY + 59,
    );
    const height = stack.bottom + 26;
    return svgFile({
        height,
        title: `TWELFTH — ${SUBTITLE}. Стек: ${STACK.map(([label]) => label).join(', ')}`,
        style: `
.cursor { animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }`,
        body: [
            frame(W, height),
            name.svg,
            text(SUBTITLE, { x: subX, y: subY, size: 13, fill: C.lamp }),
            `<rect class="cursor" x="${subX + subWidth + 6}" y="${subY - 11}" width="8" height="15" fill="${C.lamp}"/>`,
            heading('// стек', subY + 45),
            stack.svg,
        ].join('\n'),
    });
}

const SEAM = W * 0.24;
const GAP = 8;
const BAND_HEIGHT = 88;

async function contacts() {
    const pillY = 44;
    const left = SEAM - GAP;
    if (PAD + pillWidth('@dannistwelfth') > left - 16) throw new Error('Telegram не помещается в карточку');
    const telegram = svgFile({
        width: SEAM,
        height: BAND_HEIGHT,
        title: 'Telegram: @dannistwelfth',
        body: [
            frame(left, BAND_HEIGHT),
            heading('// связь', 30),
            pill({ x: PAD, y: pillY, label: '@dannistwelfth', icon: await icon('telegram') }),
        ].join('\n'),
    });
    const mail = svgFile({
        width: W - SEAM,
        height: BAND_HEIGHT,
        title: 'Почта: danyadannis@gmail.com',
        body: [
            frame(W - SEAM, BAND_HEIGHT),
            pill({ x: PAD, y: pillY, label: 'danyadannis@gmail.com', icon: await icon('gmail') }),
        ].join('\n'),
    });
    return { telegram, mail };
}

const out = new URL('../assets/', import.meta.url);
const { telegram, mail } = await contacts();
await writeFile(new URL('header.svg', out), await header());
await writeFile(new URL('contact-telegram.svg', out), telegram);
await writeFile(new URL('contact-mail.svg', out), mail);
console.log('assets: header.svg, contact-telegram.svg, contact-mail.svg');
