#!/usr/bin/env node
/**
 * 开工预检：一次校验「仓库形状、工具齐全、adb 在线、测试基线、版本一致」。
 *
 * 用法：
 *   node tools/preflight.mjs                # 全量（含测试，约 9s）
 *   node tools/preflight.mjs --fast         # 跳过测试
 *   node tools/preflight.mjs --json         # 机器可读输出
 * 退出码：有任何 FAIL 时为 1。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = new Set(process.argv.slice(2));
const FAST = argv.has("--fast");
const JSON_OUT = argv.has("--json");

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
}

function checkPaths() {
  const required = [
    "app/src/main/assets/index.html",
    "app/src/main/assets/styles.css",
    "app/src/main/assets/app.js",
    "app/src/fragments",
    "tools/test-all.mjs",
    "tools/assemble-app.ps1",
    "tools/dev-loop.ps1",
    "tools/device.mjs",
    "tests",
  ];
  const missing = required.filter((rel) => !existsSync(join(ROOT, rel)));
  const wrong = ["app/src/main/assets/fragments"].filter((rel) => existsSync(join(ROOT, rel)));
  if (missing.length) record("路径", "FAIL", "缺: " + missing.join(", "));
  else if (wrong.length) record("路径", "WARN", "存在可疑目录: " + wrong.join(", "));
  else record("路径", "PASS", required.length + " 项齐全");
}

function tryRun(cmd, args) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", timeout: 120000 });
    return { ok: true, out };
  } catch (error) {
    return { ok: false, out: (error.stdout || "") + (error.stderr || "") };
  }
}

// aapt links the whole assets directory (`-A app/src/main/assets`), so any *.bak-* left
// next to the shipped files is packaged into the APK. Keep that from silently growing back.
function checkBaks() {
  const dir = join(ROOT, "app", "src");
  const found = [];
  const walk = (path) => {
    let entries;
    try {
      entries = readdirSync(path, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.includes(".bak-")) found.push({ full, size: statSync(full).size });
    }
  };
  walk(dir);
  if (!found.length) {
    record("快照", "PASS", "app/src 下无 .bak- 文件（不会打进 APK）");
    return;
  }
  const kb = Math.round(found.reduce((sum, f) => sum + f.size, 0) / 1024);
  record("快照", "WARN", found.length + " 个 .bak- 文件约 " + kb + " KB 会打进 APK，移到 backups/");
}

function checkAdb() {
  const version = tryRun("adb", ["version"]);
  if (!version.ok) {
    record("adb", "FAIL", "adb 不在 PATH（本机应为 D:\\Tools\\platform-tools\\adb.exe）");
    return null;
  }
  const devices = tryRun("adb", ["devices"]);
  const lines = (devices.out || "").split(/\r?\n/).filter((l) => l.includes("\t"));
  const online = lines.filter((l) => l.endsWith("device")).map((l) => l.split("\t")[0]);
  if (!devices.ok) record("设备", "FAIL", "adb devices 执行失败");
  else if (!online.length) record("设备", "WARN", "无在线设备（只做静态任务）");
  else record("设备", "PASS", online.join(", ") + " 在线");
  return online;
}

function checkTests() {
  if (FAST) {
    record("测试", "SKIP", "--fast 跳过");
    return;
  }
  const run = tryRun(process.execPath, ["tools/test-all.mjs"]);
  const tail = (run.out || "").trim().split(/\r?\n/).slice(-2).join(" / ");
  record("测试", run.ok ? "PASS" : "FAIL", tail || "无输出");
}

function checkVersion(online) {
  const dist = join(ROOT, "dist");
  if (!existsSync(dist)) {
    record("版本", "WARN", "无 dist/ 目录");
    return;
  }
  const apks = readdirSync(dist)
    .filter((f) => /^qingheng-[\d.]+\.apk$/.test(f))
    .map((f) => ({ f, mtime: statSync(join(dist, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!apks.length) {
    record("版本", "WARN", "dist/ 里没有 APK");
    return;
  }
  const newest = apks[0].f.replace(/^qingheng-|\.apk$/g, "");
  if (!online || !online.length) {
    record("版本", "SKIP", "最新构建 " + newest + "（无设备，无法比对装机版）");
    return;
  }
  const pkg = "cn.qingheng.health";
  const dump = tryRun("adb", ["shell", "dumpsys", "package", pkg]);
  const m = /versionName=([\w.\-]+)/.exec(dump.out || "");
  const installed = m ? m[1] : null;
  if (!installed) record("版本", "WARN", "最新构建 " + newest + "；读不到装机版本");
  else if (installed === newest) record("版本", "PASS", "装机 " + installed + " = 最新构建");
  else record("版本", "WARN", "装机 " + installed + " ≠ 最新构建 " + newest);
}

checkPaths();
checkBaks();
const online = checkAdb();
checkTests();
checkVersion(online);

const fails = results.filter((r) => r.status === "FAIL");
const summary = fails.length ? "FAIL (" + fails.length + ")" : "OK";

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  for (const r of results) {
    console.log(r.status.padEnd(5) + " " + r.name.padEnd(4) + " " + r.detail);
  }
  console.log("-".repeat(48));
  console.log(summary + "  ·  " + (FAST ? "跳过测试" : "含测试") + "  · " + ROOT);
}
process.exit(fails.length ? 1 : 0);
