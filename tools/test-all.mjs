/**
 * 全量测试运行器（Node 版）。
 *
 * 为什么不用 PowerShell 循环：`& node test.mjs *> $null` 或 Start-Process 在连续启动十几个子进程后
 * 会卡在 WaitForExit（我们遇到：第 20 个测试开始每个都等满 90 秒）。原因还是子进程句柄——
 * javac/java/adb 之类的孙进程继承了管道，父进程等不到 EOF。
 *
 * 这里：
 *  - 每个测试独立进程，stdout/stderr 直接指向**文件描述符**（没有 EOF 语义，不依赖管道关闭）；
 *  - stdin 接 'ignore'，不会等输入；
 *  - spawnSync 的 timeout 到点杀进程，并记为 TIMEOUT，套件继续跑。
 *
 * 用法：
 *   node tools/test-all.mjs                # 全部
 *   node tools/test-all.mjs --filter train # 过滤
 *   node tools/test-all.mjs --timeout 120
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const index = args.indexOf('--' + name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const timeoutMs = Number(opt('timeout', '90')) * 1000;
const filter = opt('filter', '');
const testsDir = 'tests';
const logDir = path.join('build', 'test-logs');
fs.mkdirSync(logDir, {recursive: true});

let files = fs.readdirSync(testsDir).filter(name => name.endsWith('.test.mjs')).sort();
if (filter) files = files.filter(name => name.includes(filter));
if (!files.length) {
  console.log('no test files matched');
  process.exit(1);
}

const failed = [];
const timedOut = [];
const started = Date.now();

for (const name of files) {
  const file = path.join(testsDir, name);
  const logPath = path.join(logDir, name.replace(/\.mjs$/, '.log'));
  const fd = fs.openSync(logPath, 'w');
  const clock = Date.now();
  let status = 0;
  let timed = false;
  try {
    const result = spawnSync(process.execPath, [file], {
      stdio: ['ignore', fd, fd],
      timeout: timeoutMs,
      windowsHide: true
    });
    if (result.error && result.error.code === 'ETIMEDOUT') timed = true;
    status = result.status === null ? 1 : result.status;
  } catch {
    status = 1;
  } finally {
    fs.closeSync(fd);
  }
  const seconds = ((Date.now() - clock) / 1000).toFixed(1);
  if (timed) {
    timedOut.push(name);
    console.log('TIMEOUT ' + name + ' (' + seconds + 's)');
  } else if (status !== 0) {
    failed.push(name);
    console.log('FAIL    ' + name + ' (' + seconds + 's)');
    const tail = fs.readFileSync(logPath, 'utf8').trim().split(/\r?\n/).slice(-6);
    for (const line of tail) console.log('        ' + line);
  } else {
    console.log('ok      ' + name + ' (' + seconds + 's)');
  }
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log('');
console.log(files.length + ' run / ' + failed.length + ' failed / ' + timedOut.length + ' timeout / ' + total + 's');
if (failed.length) console.log('failed:  ' + failed.join(', '));
if (timedOut.length) console.log('timeout: ' + timedOut.join(', '));
if (failed.length || timedOut.length) process.exit(1);
console.log('all tests passed');
