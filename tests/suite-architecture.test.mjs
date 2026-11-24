/**
 * 架构守卫自检（tools/check-architecture.mjs 的测试）。
 *
 * 为什么守卫也要被测试：一个只会打印 PASSED 的检查器等于没装。这里用临时目录造出几棵坏树，
 * 确认它真的会红（领域层摸 DOM / 新片段编号越层 / 片段名不合规范 / app.js 与片段漂移 / 底座没合入），
 * 再确认真实工程树是绿的、`--strict-bands` 能当迁移开关用。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkArchitecture, probeNamespace} from '../tools/check-architecture.mjs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const CORE = fs.readFileSync('app/src/fragments/05-core-runtime.fragment.js', 'utf8');
// 最小 head/tail 桩：守卫只认 'use strict' 的位置和 IIFE 的边界，不认别的。
const HEAD = "/* head stub */\n'use strict';\n(() => {\n  const ready = true;\n";
const TAIL = '})();\n';
const TRENDS = '  const trendsReady = true;\n';

/** 在系统临时目录里拼一棵「片段 + 生成物」的小工程树。 */
function makeTree(fragments) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qh-arch-'));
  const dir = path.join(root, 'app', 'src', 'fragments');
  const assets = path.join(root, 'app', 'src', 'main', 'assets');
  fs.mkdirSync(dir, {recursive: true});
  fs.mkdirSync(assets, {recursive: true});
  const names = Object.keys(fragments);
  for (const name of names) fs.writeFileSync(path.join(dir, name), fragments[name]);
  fs.writeFileSync(path.join(assets, 'app.js'), names.sort().map(name => fragments[name]).join(''));
  return root;
}

const trees = [];
function tree(fragments) { const root = makeTree(fragments); trees.push(root); return root; }

try {
  // --- 1. 底座本身：把它单独放进没有 DOM 的 vm 里跑 --------------------------------------------
  const probes = probeNamespace(CORE);
  const broken = probes.filter(entry => !entry[1]);
  check('QH runs without a DOM and passes every probe', broken.length === 0,
    broken.map(entry => entry[0] + ': ' + entry[2]).join(' | '));
  check('the probe covers define / duplicate guard / bus / select / storage', probes.length >= 6, String(probes.length));

  // --- 2. 真实工程树 ---------------------------------------------------------------------------
  const live = checkArchitecture({quiet: true});
  check('the live tree passes', live.ok, live.errors.join(' | '));
  check('the core runtime is the second fragment', live.fragments[1] === '05-core-runtime.fragment.js', live.fragments.slice(0, 2).join(', '));
  check('unmigrated band deviations are warnings, not errors',
    live.ok && live.warnings.every(warning => warning.startsWith('legacy ')), live.warnings.join(' | '));

  // --- 3. 迁移开关：存量偏差在 --strict-bands 下必须变红 ----------------------------------------
  const strict = checkArchitecture({quiet: true, strictBands: true});
  check('--strict-bands reports the legacy deviations as errors', live.ok && !strict.ok,
    strict.errors.length + ' error(s) under strict bands');

  // --- 4. 领域层摸 DOM 必须红 ------------------------------------------------------------------
  const domRoot = tree({
    '00-head.fragment.js': HEAD,
    '05-core-runtime.fragment.js': CORE,
    '55-training-domain.fragment.js': "  function badSummary(rows) { return document.querySelector('#x').innerHTML + rows.length; }\n",
    '90-trends.fragment.js': TRENDS + TAIL
  });
  const dom = checkArchitecture({quiet: true, root: domRoot});
  check('a domain fragment that reads the DOM fails the guard',
    !dom.ok && dom.errors.some(error => error.includes('DOM-free')), dom.errors.join(' | '));

  // --- 5. 新片段编号越层必须红（存量白名单不覆盖新名字） ----------------------------------------
  const bandRoot = tree({
    '00-head.fragment.js': HEAD,
    '05-core-runtime.fragment.js': CORE,
    '20-meal-planner.fragment.js': '  const planner = [];\n',
    '90-trends.fragment.js': TRENDS + TAIL
  });
  const band = checkArchitecture({quiet: true, root: bandRoot});
  check('a new fragment in the wrong layer fails the guard',
    !band.ok && band.errors.some(error => error.includes('fragment sits in its own layer')), band.errors.join(' | '));

  // --- 6. 片段名不合编号规范必须红 --------------------------------------------------------------
  const nameRoot = tree({
    '00-head.fragment.js': HEAD,
    '05-core-runtime.fragment.js': CORE,
    '5-broken.fragment.js': '  const broken = true;\n',
    '90-trends.fragment.js': TRENDS + TAIL
  });
  const badName = checkArchitecture({quiet: true, root: nameRoot});
  check('a fragment without a two-digit prefix fails the guard',
    !badName.ok && badName.errors.some(error => error.includes('fragment name follows')), badName.errors.join(' | '));

  // --- 7. 生成物与片段漂移必须红（手改 app.js 或忘记 assemble） -----------------------------------
  const driftRoot = tree({
    '00-head.fragment.js': HEAD,
    '05-core-runtime.fragment.js': CORE,
    '90-trends.fragment.js': TRENDS + TAIL
  });
  fs.appendFileSync(path.join(driftRoot, 'app', 'src', 'main', 'assets', 'app.js'), '// hand-edited\n');
  const drift = checkArchitecture({quiet: true, root: driftRoot});
  check('a hand-edited app.js fails the guard',
    !drift.ok && drift.errors.some(error => error.includes('concatenated fragments')), drift.errors.join(' | '));

  // --- 8. 底座没合入（缺 05）必须红 -------------------------------------------------------------
  const missingRoot = tree({
    '00-head.fragment.js': HEAD,
    '90-trends.fragment.js': TRENDS + TAIL
  });
  const missing = checkArchitecture({quiet: true, root: missingRoot});
  check('a tree without the core runtime fails the guard',
    !missing.ok && missing.errors.some(error => error.includes('core runtime')), missing.errors.join(' | '));
} finally {
  for (const root of trees) {
    try { fs.rmSync(root, {recursive: true, force: true}); } catch { /* 临时目录清不掉不影响断言 */ }
  }
}

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
