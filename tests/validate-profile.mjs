// Validate cordis.patch.yml using the YAML parser that ships inside the DSH app.asar,
// so the check uses the very same parser DSH itself will use.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const asar = process.argv[2];
const target = process.argv[3];

const fd = fs.openSync(asar, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const headerStringSize = head.readUInt32LE(12);
const json = Buffer.alloc(headerStringSize);
fs.readSync(fd, json, 0, headerStringSize, 16);
const dir = JSON.parse(json.toString('utf8'));
const base = 8 + head.readUInt32LE(4) + 4;

// Locate the content section empirically: the archive header layout varies between
// asar writers, so calibrate against a file we know must be valid JSON.
const pkgEntry = lookup('dsh/node_modules/js-yaml/package.json');
if (!pkgEntry) throw new Error('js-yaml package.json not found in asar');
const guess = 8 + head.readUInt32LE(4) + 4;
let baseOffset = null;
for (let delta = -8; delta <= 8 && baseOffset === null; delta++) {
  const candidate = guess + delta;
  if (candidate < 0) continue;
  const probe = Buffer.alloc(Number(pkgEntry.size));
  fs.readSync(fd, probe, 0, probe.length, candidate + Number(pkgEntry.offset));
  try { JSON.parse(probe.toString('utf8')); baseOffset = candidate; } catch { /* try next */ }
}
if (baseOffset === null) throw new Error('could not calibrate the asar content offset');
console.log('content offset calibrated at', baseOffset, '(initial guess', guess + ')');

function lookup(p) {
  const parts = p.split('/');
  let node = dir;
  for (const part of parts) {
    node = node.files && node.files[part];
    if (!node) return null;
  }
  return node;
}
function extract(p, dest) {
  const entry = lookup(p);
  if (!entry) throw new Error('not found in asar: ' + p);
  const buf = Buffer.alloc(Number(entry.size));
  fs.readSync(fd, buf, 0, buf.length, baseOffset + Number(entry.offset));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-yaml-'));
const pkgPath = extract('dsh/node_modules/js-yaml/package.json', path.join(tmp, 'js-yaml-pkg.json'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const entryRel = (pkg.exports && pkg.exports['.'] && (pkg.exports['.'].import || pkg.exports['.'].default)) || pkg.module || pkg.main;
console.log('js-yaml', pkg.version, '-> entry', entryRel);
const entryAbs = extract('dsh/node_modules/js-yaml/' + String(entryRel).replace(/^\.\//, ''), path.join(tmp, 'js-yaml.mjs'));

const yaml = await import(pathToFileURL(entryAbs).href);

let text = fs.readFileSync(target, 'utf8');
// The profile legitimately uses !!js expressions; swap to a local tag we can intercept.
const jsTagCount = (text.match(/!!js /g) || []).length;
text = text.replace(/!!js /g, '!js ');

const JS = new yaml.Type('!js', { kind: 'scalar', construct: d => (d === null ? null : String(d)) });
const schema = yaml.DEFAULT_SCHEMA.extend([JS]);

let doc;
try {
  doc = yaml.load(text, { schema, filename: target });
} catch (error) {
  console.error('PARSE FAILED:', error.message);
  process.exit(2);
}

const fail = [];
if (!Array.isArray(doc)) fail.push('top level is not a sequence');
const ids = doc.filter(x => x && typeof x === 'object').map(x => x.id);
const dupes = ids.filter((id, i) => id && ids.indexOf(id) !== i);
if (dupes.length) fail.push('duplicate ids: ' + [...new Set(dupes)].join(', '));

const last = doc[doc.length - 1];
if (!last || last.id !== 'mcp-rea') fail.push('mcp-rea is not the last top-level entry');
else {
  const c = last.config || {};
  if (last.name !== '@deepseek-ai/dsh-mcp-client') fail.push('wrong plugin name');
  if (c.serverName !== 'rea') fail.push('wrong serverName');
  if (c.transport !== 'stdio') fail.push('wrong transport');
  if (!String(c.command).endsWith('node.exe')) fail.push('command is not an absolute node.exe');
  if (!Array.isArray(c.args) || c.args.length !== 2 || c.args[1] !== 'mcp') fail.push('args are wrong');
  if (!Number.isInteger(c.toolCallTimeoutMs)) fail.push('toolCallTimeoutMs is not an integer');
  const scriptPath = String(c.args[0]);
  if (!fs.existsSync(scriptPath)) fail.push('REA script does not exist: ' + scriptPath);
  if (!fs.existsSync(String(c.command))) fail.push('node.exe does not exist: ' + c.command);
}

console.log('top-level entries:', doc.length, '| !!js expressions kept as strings:', jsTagCount);
console.log('last four ids:', ids.slice(-4).join(', '));
if (fail.length) { console.error('VALIDATION FAILED:\n - ' + fail.join('\n - ')); process.exit(3); }
console.log('VALIDATED: profile parses with DSH\'s own parser; mcp-rea entry is well formed');
fs.closeSync(fd);
