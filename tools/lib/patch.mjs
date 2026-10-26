/**
 * Shared patcher for one-off edits -- replaces the ~15 ad-hoc scripts this repo accumulated.
 *
 * Why it exists: every hand-written patch script re-implemented the same three things (CRLF handling,
 * "exactly once" anchor checks, idempotency), and each miss cost a full write-run-fix cycle.
 *
 * Guarantees:
 *  - CRLF is detected once per file and anchors are written with plain \n (no more invisible misses);
 *  - an anchor that does not match exactly once throws with the closest candidate, not a bare index;
 *  - applying twice is a no-op (idempotent), so re-running after a partial failure is safe;
 *  - the original file is copied to backups/patched/<stamp>/ before the first write.
 *
 * Usage:
 *   import { patch } from '../lib/patch.mjs';
 *   patch('app/src/fragments/40-targets.fragment.js', [
 *     ['protein band', 'const proteinPerKgMin = rules.proteinPerKgMin;', 'let proteinPerKgMin = rules.proteinPerKgMin;'],
 *     ['lean preset', /lean:\s+\{deficitPercent: \d+/, 'lean:     {deficitPercent: 12'],
 *   ]);
 */
import fs from 'node:fs';
import path from 'node:path';

const stamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join('backups', 'patched', stamp());
const backedUp = new Set();

function backup(file) {
  if (backedUp.has(file)) return;
  fs.mkdirSync(backupDir, {recursive: true});
  fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
  backedUp.add(file);
}

/** The line that most resembles the anchor, so a failed match says something useful. */
function closest(text, needle) {
  const head = String(needle).replace(/\s+/g, ' ').trim().slice(0, 24);
  const lines = text.split('\n');
  const hit = lines.find(line => head && line.replace(/\s+/g, ' ').includes(head.slice(0, 8)));
  return hit ? `nearest line: ${hit.trim().slice(0, 120)}` : 'no similar line found';
}

/**
 * Applies labelled edits to one file.
 * @param {string} file
 * @param {Array<[string, string|RegExp, string]>} edits [label, anchor, replacement]
 * @param {{dry?: boolean}} [options]
 * @returns {{applied: string[], skipped: string[]}}
 */
export function patch(file, edits, options = {}) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  if (crlf) text = text.replace(/\r\n/g, '\n');
  const applied = [];
  const skipped = [];

  for (const [label, anchor, replacement] of edits) {
    const to = crlf ? replacement.replace(/\n/g, '\r\n') : replacement;
    const toLf = replacement;
    if (anchor instanceof RegExp) {
      const flags = anchor.flags.includes('g') ? anchor.flags : `${anchor.flags}g`;
      const matches = text.match(new RegExp(anchor.source, flags)) || [];
      if (matches.length === 0) {
        if (text.includes(toLf.trim().slice(0, 60))) { skipped.push(label); continue; }
        throw new Error(`${file} :: ${label}: regex anchor not found (${closest(text, anchor.source)})`);
      }
      if (matches.length > 1) throw new Error(`${file} :: ${label}: regex matched ${matches.length} times, expected 1`);
      text = text.replace(new RegExp(anchor.source, anchor.flags.replace('g', '')), () => toLf);
    } else {
      const from = anchor;
      const count = text.split(from).length - 1;
      if (count === 0) {
        if (text.includes(toLf)) { skipped.push(label); continue; }
        throw new Error(`${file} :: ${label}: anchor not found (${closest(text, from)})`);
      }
      if (count > 1) throw new Error(`${file} :: ${label}: anchor found ${count} times, expected 1`);
      text = text.replace(from, () => toLf);
    }
    applied.push(label);
    text = crlf ? text.replace(/\n/g, '\r\n') : text;
    if (crlf) text = text.replace(/\r\n/g, '\n');
  }

  const out = crlf ? text.replace(/\n/g, '\r\n') : text;
  if (!options.dry) {
    backup(file);
    fs.writeFileSync(file, out);
  }
  const summary = `${path.basename(file)}: ${applied.length} applied, ${skipped.length} already applied`;
  console.log(summary + (options.dry ? ' (dry run)' : ''));
  for (const label of applied) console.log(`  ok      ${label}`);
  for (const label of skipped) console.log(`  skip    ${label}`);
  return {applied, skipped};
}

/** Convenience: apply several files in one call. */
export function patchAll(plan, options = {}) {
  for (const [file, edits] of Object.entries(plan)) patch(file, edits, options);
}
