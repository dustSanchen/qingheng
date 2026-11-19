/**
 * 启动完整性（2026-11-19，1.4.46）。
 * 事故：把「食品热量参考库」的 searchFoods() 一起删掉后，启动行里还留着 `searchFoods();`，
 * 于是 1.4.46 一启动就 ReferenceError，页面停在「正在计算…」的骨架态；而 77 个测试全绿。
 * 这份测试只做一件事：启动行里调用的每个本仓函数都必须真的存在。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const lines = app.split('\n');
const bootLine = lines.find(line => line.includes('setupCollapsibleSections()') && line.includes('installQuickRecordControls()'));
check('the boot line is found', Boolean(bootLine), bootLine ? bootLine.trim().slice(0, 80) : 'not found');

const BUILTINS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'setTimeout', 'setInterval', 'clearTimeout', 'requestAnimationFrame', 'parseInt', 'parseFloat', 'isNaN', 'Number', 'String', 'Boolean', 'Array', 'Object', 'JSON', 'Promise', 'Date', 'Math', 'Map', 'Set', 'encodeURIComponent', 'decodeURIComponent', 'alert']);
const called = bootLine
  ? [...bootLine.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[2]).filter(name => !BUILTINS.has(name))
  : [];

// 定义可能有两种形态：function foo( / const foo = / let foo = / foo = function
const defined = name => new RegExp(`function\\s+${name}\\s*\\(|(const|let|var)\\s+${name}\\s*=|^\\s*${name}\\s*=\\s*(async\\s*)?(function|\\()`, 'm').test(app);
const missing = [...new Set(called)].filter(name => !defined(name));

check('every function called at boot is defined', missing.length === 0, missing.join(', '));
check('the removed food-search boot call is gone', !app.includes('searchFoods('));
check('the removed manual-meal wiring is gone', !app.includes("$('#manual-meal-form')") && !app.includes("$('#off-search')"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
