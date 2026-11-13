// Builds the vendored browser libraries into app/src/main/assets/vendor/.
//
// Why this exists: the app ships plain <script> files into a WebView, so a dependency has to arrive
// as one committed, reviewable bundle instead of a node_modules tree. This script is the only build
// step in the repo: run it when vendor/package.json changes, commit the output plus the manifest,
// and the APK build stays offline and dependency-free.
//
//   node tools/build-vendor.mjs           # build + manifest
//   node tools/build-vendor.mjs --check   # verify committed files match the manifest
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
// assets/ must stay flat (aapt packaging invariant, enforced by tests), so the bundle lands beside
// app.js instead of in a subdirectory.
const outDir = path.join(root, 'app', 'src', 'main', 'assets');
const manifestPath = path.join(root, 'vendor', 'manifest.json');
const checkOnly = process.argv.includes('--check');

const require = createRequire(path.join(root, 'vendor', 'package.json'));
const esbuild = require('esbuild');
const esbuildVersion = require('esbuild/package.json').version;
const motionVersion = require('motion/package.json').version;

const BUILD = {
  entry: 'vendor/src/motion-entry.js',
  file: 'motion.min.js',
  global: 'MotionLib',
  package: 'motion',
  subpath: 'motion/mini',
  version: motionVersion,
  license: 'MIT',
};

const banner = `/*! ${BUILD.file} | ${BUILD.subpath}@${BUILD.version} | MIT | bundled by tools/build-vendor.mjs with esbuild ${esbuildVersion} */`;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

if (checkOnly) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let failed = 0;
  for (const entry of manifest.entries) {
    const file = path.join(root, 'app', 'src', 'main', 'assets', entry.file);
    const bytes = fs.readFileSync(file);
    const ok = sha256(bytes) === entry.sha256 && bytes.length === entry.bytes;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${entry.file}  ${bytes.length} bytes`);
    if (!ok) failed++;
  }
  process.exit(failed ? 1 : 0);
}

fs.mkdirSync(outDir, { recursive: true });
const result = await esbuild.build({
  entryPoints: [path.join(root, BUILD.entry)],
  bundle: true,
  format: 'iife',
  globalName: BUILD.global,
  platform: 'browser',
  target: ['chrome100', 'safari15'],
  minify: true,
  legalComments: 'inline',
  banner: { js: banner },
  outfile: path.join(outDir, BUILD.file),
  logLevel: 'warning',
});
if (result.errors.length) throw new Error('esbuild failed: ' + result.errors.join('; '));

const bytes = fs.readFileSync(path.join(outDir, BUILD.file));
const text = bytes.toString('utf8');
for (const banned of ['eval(', 'new Function(']) {
  if (text.includes(banned)) throw new Error(`vendored bundle contains ${banned}, which the WebView policy forbids`);
}

const manifest = {
  generatedBy: 'tools/build-vendor.mjs',
  entries: [{
    file: BUILD.file,
    package: BUILD.package,
    subpath: BUILD.subpath,
    version: BUILD.version,
    license: BUILD.license,
    global: BUILD.global,
    esbuild: esbuildVersion,
    bytes: bytes.length,
    sha256: sha256(bytes),
  }],
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`built ${BUILD.file}: ${bytes.length} bytes (sha256 ${manifest.entries[0].sha256.slice(0, 12)}…) -> ${path.relative(root, outDir)}`);
