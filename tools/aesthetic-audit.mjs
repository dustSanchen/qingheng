#!/usr/bin/env node
/**
 * 审美静态审计：把 docs/design/13-aesthetic-claude.md 的十条自检里
 * 能自动判定的部分做成脚本。只报告，不改文件。
 *
 *   node tools/aesthetic-audit.mjs          # 人类可读
 *   node tools/aesthetic-audit.mjs --json   # 机器可读
 *
 * 退出码：有 FAIL 时为 1；只有 WARN 时为 0。
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CSS = join(ROOT, "app/src/main/assets/styles.css");
const HTML = join(ROOT, "app/src/main/assets/index.html");
const JSON_OUT = process.argv.includes("--json");

if (!existsSync(CSS)) {
  console.error("找不到 " + CSS);
  process.exit(1);
}

const css = readFileSync(CSS, "utf8");
const html = existsSync(HTML) ? readFileSync(HTML, "utf8") : "";
const lines = css.split(/\r?\n/);

const findings = [];
const add = (level, rule, detail) => findings.push({ level, rule, detail });

function lineOf(index) {
  return css.slice(0, index).split(/\r?\n/).length;
}

// 1) token 之外的硬编码十六进制色
const hexMatches = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
const tokenBlock = /:root\s*\{[\s\S]*?\}/.exec(css);
const tokenHex = tokenBlock ? [...tokenBlock[0].matchAll(/#[0-9a-fA-F]{3,8}\b/g)].length : 0;
const outsideHex = hexMatches.length - tokenHex;
if (outsideHex > 0) {
  const samples = hexMatches
    .filter((m) => !tokenBlock || m.index > tokenBlock.index + tokenBlock[0].length)
    .slice(0, 3)
    .map((m) => "L" + lineOf(m.index) + " " + m[0]);
  add(outsideHex > 12 ? "WARN" : "INFO", "色值全部来自 token", outsideHex + " 处 token 外硬编码（" + samples.join("；") + "）");
} else {
  add("PASS", "色值全部来自 token", "0 处越界");
}

// 2) 发丝线是否用墨色透明，而不是灰色
const greyBorder = lines
  .map((l, i) => ({ l, i: i + 1 }))
  .filter((x) => /border[^;]*:\s*1px\s+solid\s+(#(?:e|d|c|b)[0-9a-f]{2,5}\b|#(?:e|d|c|b)[0-9a-f]{2}|gray|grey|silver)/i.test(x.l));
if (greyBorder.length) {
  add("WARN", "发丝线用墨色透明", greyBorder.length + " 处疑似灰线（L" + greyBorder.slice(0, 3).map((x) => x.i).join(", L") + "）");
} else {
  add("PASS", "发丝线用墨色透明", "未发现灰线边框");
}

// 3) 静态卡片是否用阴影造层级
const shadowCard = lines
  .map((l, i) => ({ l, i: i + 1 }))
  .filter((x) => /\.card[^{]*\{/.test(x.l) && /box-shadow/.test(x.l));
if (shadowCard.length) {
  add("WARN", "静态卡片不加阴影", shadowCard.length + " 处 .card 带 box-shadow（L" + shadowCard[0].i + "）");
} else {
  add("PASS", "静态卡片不加阴影", "未发现");
}

// 4) 字号是否只有少数几级
const sizes = [...new Set([...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1])))].sort((a, b) => b - a);
if (sizes.length > 8) {
  add("WARN", "字号阶梯封顶", sizes.length + " 种字号：" + sizes.join(" / "));
} else {
  add("PASS", "字号阶梯封顶", sizes.length + " 种：" + sizes.join(" / "));
}

// 5) 数字是否等宽
if (/tabular-nums/.test(css)) {
  add("PASS", "数字等宽", "已使用 tabular-nums");
} else {
  add("FAIL", "数字等宽", "未出现 tabular-nums");
}

// 6) 焦点可见
if (/focus-visible/.test(css)) {
  add("PASS", "焦点环可见", "存在 :focus-visible");
} else {
  add("FAIL", "焦点环可见", "缺少 :focus-visible 规则");
}

// 7) 动效降级
if (/prefers-reduced-motion/.test(css)) {
  add("PASS", "动效降级", "已处理 prefers-reduced-motion");
} else {
  add("WARN", "动效降级", "缺少 prefers-reduced-motion");
}

// 8) 账本规则是否收在作用域里
const ledgerSelectors = [...css.matchAll(/\[data-skin="ledger"\][^{]*\{/g)].length;
add(ledgerSelectors > 0 ? "PASS" : "WARN", "账本作用域", ledgerSelectors + " 条 [data-skin=\"ledger\"] 规则");

// 9) 强调色使用面（粗略：统计强调 token 在非 :root 中的声明次数）
const accentDecls = [...css.matchAll(/--accent[-\w]*\s*:/g)].length;
add(accentDecls > 6 ? "WARN" : "INFO", "强调色收敛", accentDecls + " 处 accent token 声明");

const fails = findings.filter((f) => f.level === "FAIL");

if (JSON_OUT) {
  console.log(JSON.stringify({ fails: fails.length, findings }, null, 2));
} else {
  for (const f of findings) {
    console.log(f.level.padEnd(5) + f.rule.padEnd(14) + f.detail);
  }
  console.log("-".repeat(60));
  console.log(fails.length ? "FAIL " + fails.length + " 项" : "OK（无阻塞项）");
}
process.exit(fails.length ? 1 : 0);
