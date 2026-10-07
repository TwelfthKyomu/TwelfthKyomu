import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { C, PAD, W, frame, heading, panel, svgFile, text, textWidth } from './svg.mjs';

const QUERY = `query($login: String!) {
  user(login: $login) {
    name
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes { name languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

const LEVELS = {
    NONE: C.empty,
    FIRST_QUARTILE: C.plate,
    SECOND_QUARTILE: C.deep,
    THIRD_QUARTILE: C.blue,
    FOURTH_QUARTILE: C.sky,
};

const LANGUAGE_COLORS = [C.blue, C.sky, C.lamp, C.moon];

async function load(login, token, skip) {
    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'twelfth-activity' },
        body: JSON.stringify({ query: QUERY, variables: { login } }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(`GitHub GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json)}`);

    const { contributionCalendar } = json.data.user.contributionsCollection;
    const sizes = new Map();
    for (const repo of json.data.user.repositories.nodes) {
        if (repo.name === skip) continue;
        for (const { size, node } of repo.languages.edges) sizes.set(node.name, (sizes.get(node.name) ?? 0) + size);
    }
    return {
        login,
        name: json.data.user.name || login,
        total: contributionCalendar.totalContributions,
        weeks: contributionCalendar.weeks.map((week) =>
            week.contributionDays.map((day) => ({
                weekday: day.weekday,
                count: day.contributionCount,
                level: day.contributionLevel,
            })),
        ),
        languages: [...sizes].map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size),
    };
}

function streaks(days) {
    let best = 0;
    let run = 0;
    for (const day of days) {
        run = day.count > 0 ? run + 1 : 0;
        best = Math.max(best, run);
    }
    let current = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].count > 0) current++;
        else if (i < days.length - 1 || current > 0) break;
    }
    return { current, best };
}

const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function statsPanel(data, x, y, width, height) {
    const days = data.weeks.flat();
    const { current, best } = streaks(days);
    const stats = [
        [formatNumber(data.total), 'вкладов за год'],
        [String(days.filter((day) => day.count > 0).length), 'активных дней'],
        [`${current} / ${best}`, 'серия / лучшая'],
    ];
    const column = (width - 32) / stats.length;
    return [
        panel(x, y, width, height),
        text(`${data.name} · GitHub`, { x: x + 16, y: y + 26, size: 13, fill: C.lamp }),
        ...stats.flatMap(([value, label], i) => [
            text(value, { x: x + 16 + i * column, y: y + 60, size: 20 }),
            text(label, { x: x + 16 + i * column, y: y + 78, size: 11, fill: C.sky }),
        ]),
    ].join('\n');
}

function languagesPanel(languages, x, y, width, height) {
    const total = languages.reduce((sum, l) => sum + l.size, 0);
    const top = languages.slice(0, 3).map((l, i) => ({ ...l, color: LANGUAGE_COLORS[i], share: l.size / total }));
    const rest = 1 - top.reduce((sum, l) => sum + l.share, 0);
    const barWidth = width - 32;

    let barX = x + 16;
    const bar = [...top, ...(rest > 0.005 ? [{ share: rest, color: C.plate }] : [])].map((part) => {
        const segment = `<rect x="${barX}" y="${y + 40}" width="${part.share * barWidth}" height="6" fill="${part.color}"/>`;
        barX += part.share * barWidth;
        return segment;
    });

    let legendX = x + 16;
    const legend = top.map((l) => {
        const label = `${l.name} ${Math.round(l.share * 100)}%`;
        const item = [
            `<rect x="${legendX}" y="${y + 62}" width="8" height="8" rx="2" fill="${l.color}"/>`,
            text(label, { x: legendX + 14, y: y + 70, size: 12 }),
        ].join('\n');
        legendX += 14 + textWidth(label, 12) + 18;
        return item;
    });

    return [
        panel(x, y, width, height),
        text('Языки', { x: x + 16, y: y + 26, size: 13, fill: C.lamp }),
        `<clipPath id="bar"><rect x="${x + 16}" y="${y + 40}" width="${barWidth}" height="6" rx="3"/></clipPath>`,
        `<g clip-path="url(#bar)">${bar.join('')}</g>`,
        ...legend,
    ].join('\n');
}

function snake(cols, cellAt, step = 0.08, length = 6) {
    const path = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < 7; r++) path.push(cellAt(c, c % 2 ? 6 - r : r));
    }
    const dur = (path.length * step).toFixed(2);
    return Array.from({ length }, (_, i) => {
        const values = path.map((_, k) => path[(k - i + path.length) % path.length].join(' ')).join(';');
        return `<rect width="11" height="11" rx="2" fill="${C.lamp}" opacity="${1 - i * 0.12}"><animateTransform attributeName="transform" type="translate" calcMode="discrete" dur="${dur}s" repeatCount="indefinite" values="${values}"/></rect>`;
    }).join('\n');
}

function grid(weeks, y) {
    const cell = Math.min(14, Math.floor((W - 2 * PAD) / weeks.length));
    const x0 = (W - (weeks.length * cell - (cell - 11))) / 2;
    const cellAt = (c, r) => [x0 + c * cell, y + r * cell];
    const cells = weeks.flatMap((week, c) =>
        week.map((day) => {
            const [x, cy] = cellAt(c, day.weekday);
            return `<rect x="${x}" y="${cy}" width="11" height="11" rx="2" fill="${LEVELS[day.level] ?? C.empty}"/>`;
        }),
    );
    return { svg: `${cells.join('')}\n${snake(weeks.length, cellAt)}`, bottom: y + 7 * cell - (cell - 11) };
}

export function render(data) {
    const top = 50;
    const panelHeight = 92;
    const inner = W - 2 * PAD;
    const panels = data.languages.length
        ? [
              statsPanel(data, PAD, top, (inner - 16) / 2, panelHeight),
              languagesPanel(data.languages, PAD + (inner + 16) / 2, top, (inner - 16) / 2, panelHeight),
          ]
        : [statsPanel(data, PAD, top, inner, panelHeight)];
    const calendar = grid(data.weeks, top + panelHeight + 22);
    const height = calendar.bottom + 26;
    return svgFile({
        height,
        title: `Активность ${data.name}: ${data.total} вкладов за год`,
        body: [frame(W, height), heading('// активность', 34), ...panels, calendar.svg].join('\n'),
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { LOGIN, TOKEN, REPO } = process.env;
    if (!LOGIN || !TOKEN) throw new Error('Нужны переменные LOGIN и TOKEN');
    const out = process.argv[2] ?? 'dist/activity.svg';
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, render(await load(LOGIN, TOKEN, REPO?.split('/').pop())));
    console.log(out);
}
