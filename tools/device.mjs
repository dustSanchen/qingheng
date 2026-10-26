/**
 * Device helper: the three things this session did by hand dozens of times, with the two mistakes
 * that cost the most calls fixed by construction.
 *
 *  1. Coordinates. Screenshots come back 1156x2510 but DSH previews them at 877x1904. Reading a
 *     position off the preview and tapping it directly lands ~1.3x too high -- which is how a tap on
 *     "下一步" ended up focusing the weight field. `--preview` converts for you.
 *  2. Verification. `smoke` launches, waits, greps logcat for JS errors, checks the installed version
 *     and takes one screenshot, so "does it still work on the phone" is a single command.
 *
 * Usage (all coordinates are DEVICE pixels unless --preview is given):
 *   node tools/device.mjs tap 578 2300
 *   node tools/device.mjs tap 242 1318 --preview
 *   node tools/device.mjs scroll 1900 700 [--count 2]
 *   node tools/device.mjs shot build/name.png
 *   node tools/device.mjs smoke [--package cn.qingheng.health]
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ADB = path.join('toolchain', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const PACKAGE = 'cn.qingheng.health';
const PREVIEW = {width: 877, height: 1904};

const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const adb = (args, options = {}) =>
  execFileSync(ADB, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options});

function deviceSize() {
  try {
    const match = /(\d+)x(\d+)/.exec(adb(['shell', 'wm', 'size']));
    return match ? {width: Number(match[1]), height: Number(match[2])} : null;
  } catch { return null; }
}

/** Converts preview-image coordinates to device pixels using the real screen size. */
function fromPreview(x, y) {
  if (x < 0 || y < 0 || x > PREVIEW.width || y > PREVIEW.height) {
    throw new Error(`--preview expects preview pixels (<= ${PREVIEW.width}x${PREVIEW.height}), got ${x},${y}; drop --preview if these are device pixels`);
  }
  const size = deviceSize();
  if (!size) throw new Error('cannot read screen size; pass device coordinates instead');
  return [Math.round(x * size.width / PREVIEW.width), Math.round(y * size.height / PREVIEW.height)];
}

function shot(target) {
  const remote = '/sdcard/__shot.png';
  adb(['shell', 'screencap', '-p', remote]);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  adb(['pull', remote, target]);
  adb(['shell', 'rm', '-f', remote]);
  return target;
}

function installedVersion(pkg) {
  try {
    const out = adb(['shell', 'dumpsys', 'package', pkg]);
    return /versionName=([^\s]+)/.exec(out)?.[1] || null;
  } catch { return null; }
}

function jsErrors(limit = 5) {
  try {
    const out = adb(['shell', 'logcat', '-d']);
    return out.split('\n')
      .filter(line => /Uncaught|ReferenceError|TypeError|SyntaxError/.test(line))
      .slice(-limit);
  } catch { return []; }
}

const [, , command, ...rest] = process.argv;
const flags = new Set(rest.filter(arg => arg.startsWith('--')));
const positional = rest.filter(arg => !arg.startsWith('--'));
const flagValue = name => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : undefined;
};

try {
  if (command === 'tap') {
    let [x, y] = positional.map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('tap needs x y');
    if (flags.has('--preview')) {
      const [dx, dy] = fromPreview(x, y);
      console.log(`preview ${x},${y} -> device ${dx},${dy}`);
      [x, y] = [dx, dy];
    }
    adb(['shell', 'input', 'tap', String(x), String(y)]);
    console.log(`tapped ${x},${y}`);
  } else if (command === 'scroll') {
    const [from, to] = positional.map(Number);
    const count = Number(flagValue('count') || 1);
    for (let i = 0; i < count; i++) {
      adb(['shell', 'input', 'swipe', '578', String(from), '578', String(to), '250']);
      sleep(500);
    }
    console.log(`scrolled ${from}->${to} x${count}`);
  } else if (command === 'shot') {
    const target = positional[0] || `build/shot-${Date.now()}.png`;
    console.log('screenshot: ' + shot(target));
  } else if (command === 'smoke') {
    const pkg = flagValue('package') || PACKAGE;
    const started = Date.now();
    adb(['shell', 'am', 'force-stop', pkg]);
    adb(['shell', 'am', 'start', '-n', `${pkg}/.MainActivity`]);
    sleep(7000);
    const errors = jsErrors();
    const version = installedVersion(pkg);
    const target = `build/smoke-${Date.now()}.png`;
    shot(target);
    console.log(`installed : ${version || 'unknown'}`);
    console.log(`js errors : ${errors.length ? errors.length + ' found' : 'none'}`);
    for (const line of errors) console.log('  ' + line.trim().slice(0, 160));
    console.log(`screenshot: ${target}`);
    console.log(`elapsed   : ${((Date.now() - started) / 1000).toFixed(1)}s`);
    if (errors.length) process.exitCode = 1;
  } else {
    console.log('commands: tap <x> <y> [--preview] | scroll <from> <to> [--count n] | shot <path> | smoke');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(String(error.message || error));
  process.exitCode = 1;
}
