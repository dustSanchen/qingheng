// Icon style gate for the WebView assets folder.
// Run from the project root:  node tests/icon-style.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const assetsDir = path.join(projectRoot, 'app', 'src', 'main', 'assets');

const ICONS = fs.readdirSync(assetsDir)
  .filter(name => /^icon-[a-z0-9-]+\.svg$/i.test(name))
  .sort();

const STYLE_SNIPPETS = [
  'viewBox="0 0 24 24"',
  'fill="none"',
  '<g ',
  'stroke-width="1.5"',
  'stroke-linecap="round"',
  'stroke-linejoin="round"',
];

const FORBIDDEN_SNIPPETS = ['<image', 'base64', 'style='];
// Only the SVG canvas must be CSS-sized; rect/path geometry may use width/height.
const FORBIDDEN_SIZE_ATTR = /<svg\b[^>]*\s(?:width|height)="/i;

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const svgText = new Map();

// 1. The browser-facing assets folder must stay flat (AAPT/asset pitfalls).
const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
const subDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
check(subDirs.length === 0, `assets must stay flat, found subdirectories: ${subDirs.join(', ')}`);

// 2. Every icon in the flat assets directory obeys one shared drawing contract.
check(ICONS.length > 0, 'assets must contain at least one icon-*.svg');
for (const name of ICONS) {
  const file = path.join(assetsDir, name);
  const raw = fs.readFileSync(file);
  const text = raw.toString('utf8');
  svgText.set(name, text);

  check(raw.length < 900, `${name}: ${raw.length} bytes is not < 900`);
  for (const snippet of STYLE_SNIPPETS) {
    check(text.includes(snippet), `${name}: missing ${snippet}`);
  }
  for (const snippet of FORBIDDEN_SNIPPETS) {
    check(!text.includes(snippet), `${name}: must not contain ${snippet}`);
  }
  check(!FORBIDDEN_SIZE_ATTR.test(text), `${name}: must not set a width/height attribute (CSS governs size)`);

  const colors = [...text.matchAll(/(?:stroke|fill)="(#[0-9a-fA-F]{3,8}|currentColor)"/g)]
    .map(match => match[1].toLowerCase());
  check(new Set(colors).size === 1, `${name}: expected one non-none drawing color, got ${[...new Set(colors)].join(', ')}`);
  check(!/fill="#/i.test(text), `${name}: must remain an outline icon`);

  // Geometry must breathe inside a 24x24 box: absolute coordinates stay in 3..21.
  // Absolute commands are arity-aware scanned; relative deltas and arc flags are skipped.
  const PATH_ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const tokens = [];
  for (const d of text.matchAll(/\sd="([^"]+)"/g)) {
    for (const m of d[1].matchAll(/([A-Za-z])|(-?\d*\.?\d+)/g)) {
      tokens.push(m[1] !== undefined ? m[1] : Number(m[2]));
    }
  }
  const coords = [];
  let command = null;
  let arity = 0;
  let consumed = 0;
  let group = [];
  for (const token of tokens) {
    if (typeof token === 'string') {
      command = token;
      arity = PATH_ARITY[token.toLowerCase()] ?? 0;
      consumed = 0;
      group = [];
      continue;
    }
    if (command === null || arity === 0) continue;
    consumed += 1;
    group.push(token);
    if (group.length === arity) {
      if (command === command.toUpperCase()) {
        if (command.toLowerCase() === 'a') {
          // rx ry x-axis-rotation large-arc-flag sweep-flag x y
          // Only the end point is a position; the radii and the rotation carry no
          // location and the two flags are legitimately 0/1.
          coords.push(group[5], group[6]);
        } else {
          coords.push(...group);
        }
      }
      group = [];
    }
  }
  const outOfRange = [...new Set(coords)].filter((n) => n < 3 || n > 21);
  check(outOfRange.length === 0, `${name}: coordinates outside 3..21: ${outOfRange.join(', ')}`);
}

// 3. Every ./icon-*.svg reference in the shipped web code must resolve to a real file.
const REF_SOURCES = ['index.html', 'app.js'];
const refPattern = /(?:\.\/)?(icon-[a-z0-9-]+\.svg)/g;
let refCount = 0;
const referenced = new Set();
for (const sourceName of REF_SOURCES) {
  const sourceFile = path.join(assetsDir, sourceName);
  if (!fs.existsSync(sourceFile)) continue;
  const source = fs.readFileSync(sourceFile, 'utf8');
  for (const match of source.matchAll(refPattern)) {
    refCount += 1;
    referenced.add(match[1]);
    const target = path.join(assetsDir, match[1]);
    check(fs.existsSync(target), `${sourceName}: references missing asset ${match[1]}`);
  }
}
for (const name of ICONS) check(referenced.has(name), `${name}: unreferenced icon asset`);

if (failures.length > 0) {
  console.error(`FAIL icon style: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
      `PASS icon style: ${ICONS.length} icons, 24x24 / 1.5 round strokes, ` +
      `flat assets dir, ${refCount} references resolved, no orphans, all < 900 bytes`,
  );
}
