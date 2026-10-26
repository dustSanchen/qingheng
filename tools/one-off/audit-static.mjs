import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'app/src/main/assets/styles.css');
const htmlPath = path.join(root, 'app/src/main/assets/index.html');
const appPath = path.join(root, 'app/src/main/assets/app.js');
const reportPath = path.join(root, 'build/audit-static.txt');
const css = fs.readFileSync(cssPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

function collectClasses(source) {
  const classes = new Set();
  const attrPattern = /\bclass(?:Name)?\s*=\s*\\?["'`]([^"'`]*?)\\?["'`]/gs;
  for (const match of source.matchAll(attrPattern)) {
    for (const name of match[1].split(/\s+/)) if (name && !name.includes('${')) classes.add(name);
  }
  for (const match of source.matchAll(/classList\.(?:add|remove|toggle|contains)\s*\(([^)]*)\)/gs)) {
    for (const value of match[1].matchAll(/["'`]([_a-zA-Z][\w-]*)["'`]/g)) classes.add(value[1]);
  }
  for (const match of source.matchAll(/\.([_a-zA-Z][\w-]*)/g)) classes.add(match[1]);
  return classes;
}
function cssRules(source) {
  const rules = [];
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of clean.matchAll(pattern)) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith('@')) continue;
    rules.push({selector: prelude, body: match[2]});
  }
  return rules;
}

const appSource = `${html}\n${app}`;
const appClasses = collectClasses(appSource);
for (const match of appSource.matchAll(/(?:classList\.(?:add|remove|toggle|contains)\s*\(|className\s*=\s*)["'`]([^"'`]+)["'`]/g)) {
  for (const name of match[1].split(/\s+/)) if (name) appClasses.add(name);
}
const rules = cssRules(css);
const dead = new Map();
for (const rule of rules) {
  for (const selector of rule.selector.split(',')) {
    const classes = [...selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map(match => match[1]);
    for (const name of classes) {
      if (!appClasses.has(name)) {
        if (!dead.has(name)) dead.set(name, new Set());
        dead.get(name).add(selector.trim());
      }
    }
  }
}

const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
const undeclared = new Map();
for (const match of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
  const name = match[1];
  if (!declared.has(name)) {
    const line = css.slice(0, match.index).split('\n').length;
    if (!undeclared.has(name)) undeclared.set(name, new Set());
    undeclared.get(name).add(line);
  }
}

const selfReferences = [];
for (const rule of rules) {
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;{}]*);/g;
  for (const declaration of rule.body.matchAll(declarationPattern)) {
    const token = declaration[1];
    const value = declaration[2];
    if (new RegExp(`var\\(\\s*${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*[,)]|\\s*$)`).test(value)) {
      const offset = css.indexOf(declaration[0], css.indexOf(rule.body));
      const line = css.slice(0, offset).split('\n').length;
      selfReferences.push({token, line, selector: rule.selector});
    }
  }
}

const formatMap = (map, render) => map.size
  ? [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => render(key, value)).join('\n')
  : '(none)';
const lines = [
  'A1 Static Audit',
  'Generated: deterministic; audit-static v1',
  `Inputs: ${path.relative(root, cssPath)}, ${path.relative(root, htmlPath)}, ${path.relative(root, appPath)}`,
  '',
  `a) Dead CSS class selectors: ${dead.size} unique class names (${[...dead.values()].reduce((sum, value) => sum + value.size, 0)} selector occurrences)`,
  formatMap(dead, (name, selectors) => `  .${name}: ${[...selectors].join(' | ')}`),
  '',
  `b) Undeclared var() references: ${[...undeclared.values()].reduce((sum, value) => sum + value.size, 0)} occurrences across ${undeclared.size} token names`,
  formatMap(undeclared, (name, lineNumbers) => `  ${name}: lines ${[...lineNumbers].sort((a, b) => a - b).join(', ')}`),
  '',
  `c) Self-referencing custom properties: ${selfReferences.length}`,
  selfReferences.length ? selfReferences.map(item => `  ${item.token} at line ${item.line} (${item.selector})`).join('\n') : '(none)',
  '',
  'No source files were modified by this audit.'
];
fs.mkdirSync(path.dirname(reportPath), {recursive: true});
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
console.log(lines.join('\n'));
