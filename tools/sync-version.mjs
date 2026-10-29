#!/usr/bin/env node
/**
 * 单点写版本号：一次把三处对齐，避免「APK 是 1.1.91、关于页还是 1.1.71」这类漂移。
 *
 *   node tools/sync-version.mjs 1.1.92 192
 *
 * 三处：
 *   1. app/src/fragments/70-rest.fragment.js   const APP_VERSION = 'x.y.z'
 *   2. build.ps1                               param(...$Version='x.y.z',[int]$VersionCode=n)
 *   3. tests/meal-date-java.test.mjs           const APP_VERSION = 'x.y.z'
 * 只改这几行，其余内容原样保留（UTF-8 无 BOM）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [version, codeRaw] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || "")) {
  console.error("usage: node tools/sync-version.mjs <x.y.z> <versionCode>");
  process.exit(1);
}
const code = Number(codeRaw);
if (!Number.isInteger(code) || code < 1) {
  console.error("versionCode must be a positive integer");
  process.exit(1);
}

const root = process.cwd();
const changes = [];

function rewrite(rel, pattern, replacement) {
  const path = join(root, rel);
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    changes.push(rel);
  }
}

rewrite(
  "app/src/fragments/70-rest.fragment.js",
  /const APP_VERSION = '[^']*'/,
  `const APP_VERSION = '${version}'`,
);

rewrite(
  "build.ps1",
  /param\(\[switch\]\$Clean,\[string\]\$Version='[^']*',\[int\]\$VersionCode=\d+\)/,
  `param([switch]$Clean,[string]$Version='${version}',[int]$VersionCode=${code})`,
);

rewrite(
  "tests/meal-date-java.test.mjs",
  /const APP_VERSION = '[^']*'/,
  `const APP_VERSION = '${version}'`,
);

console.log(
  changes.length
    ? `version synced to ${version}/${code}: ${changes.join(", ")}`
    : `version already ${version}/${code}; nothing to change`,
);
