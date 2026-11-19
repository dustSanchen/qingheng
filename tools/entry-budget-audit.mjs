#!/usr/bin/env node
/**
 * 入口预算静态审计（只读：只报告，不改文件）
 *
 *   node tools/entry-budget-audit.mjs          # 人类可读
 *   node tools/entry-budget-audit.mjs --json   # 机器可读（接 CI 用）
 *
 * 规则（docs 层刚定的「入口预算」）：
 *   1. 同一个用户动作（记一餐 / 记训练 / 记身体 / 复制一餐）全站最多 2 个入口
 *      （主路径 + 一处补录），超过报 WARN。
 *   2. 每个 view 容器（#view-today / #view-records / #view-chat / #view-trends /
 *      #view-profile）里的卡片数 ≤ 8，超过报 WARN。
 *
 * 退出码：读不到输入文件时为 1；其余情况恒为 0（WARN 不阻断，和
 * tools/aesthetic-audit.mjs 的「只有 FAIL 才非 0」约定一致——这里没有 FAIL）。
 *
 * ── 入口计数怎么数（只数「可点击入口」，不浮夸）────────────────────────────
 * 判据：同一段 DOM/JS 里同时出现「动作名」和「点击语义」。具体只认这几类：
 *   a) HTML/模板里的 <button ...>动作名</button>、<a ...>动作名</a>；
 *   b) JS 里 stateBlock 的 action 声明：action: {label: '动作名', go/focus}；
 *      它由 00-head 的 stateBlock() 渲染成 <button class="state-block-action">；
 *   c) JS 里 quick-chip 的数据项：['icon.svg', '动作名', '目标字段', ...]；
 *      它由 70-rest 的 map() 渲染成 <button data-quick-focus="目标字段">；
 *   d) JS 里 button.innerHTML / textContent = '动作名'（变量就叫 button）；
 *   e) 带 data-focus / data-quick-focus 且目标字段属于该动作的可点击元素；
 *   f) 生成 <a data-focus="…"> 的补录链接工厂：
 *      chip('补训练', 'icon.svg', 'training-form')（60-training 的 check-fix 行）。
 * 明确不算：标题（如 <h2>轻松记一餐</h2>）、提示/空态说明文案、aria-label、
 * 源码注释、`headings: [...]` 这类折叠标题表，以及动态标签里只有变量占位符
 * （${label}）的按钮模板——它们不是「动作名 + 点击语义」同时出现。
 *
 * 动作清单不是猜的：先内置候选名（记一餐 / 记训练 / 记身体 / 复制一餐 / 记录一餐），
 * 再按仓库里实际出现的可点击文案/焦点字段归类。实机里「记训练」「记身体」的按钮
 * 文案是 quick chip 的「训练」「身体」，补录写成「＋ 记一条训练」「补训练」与
 * 「记录身体数据」「记录体重」「补体重」；「记录一餐」只作为同一动作的叙述写法
 * 并入「记一餐」（否则改个文案就能绕过预算）。
 *
 * ── 卡片数怎么数 ──────────────────────────────────────────────────────────
 * 只看 app/src/main/assets/index.html（app.js 是生成物，重复计数）。对每个
 * #view-* 容器，数「class 里含 card 这个 class」的元素：class="card"、
 * class="card xxx" 都算一张；class="card estimate-card" 这种复合类名也只算
 * 一张（不重复）；class="card-heading" / class="card-notes" 不是卡片，不算。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HTML_PATH = join(ROOT, "app/src/main/assets/index.html");
const FRAGMENT_DIR = join(ROOT, "app/src/fragments");
const JSON_OUT = process.argv.includes("--json");

const ENTRY_LIMIT = 2;
const CARD_LIMIT = 8;

if (!existsSync(HTML_PATH)) {
  console.error("找不到 " + HTML_PATH);
  process.exit(1);
}
if (!existsSync(FRAGMENT_DIR)) {
  console.error("找不到 " + FRAGMENT_DIR);
  process.exit(1);
}

/* ── 动作模型 ───────────────────────────────────────────────────────────
 * name   = 候选动作名（预算口径）
 * labels = 实机可点击文案（从仓库数据里核过；逐字匹配，避免「训练建议」这类
 *          含「训练」但不相干的按钮被误算）
 * focus  = 该动作对应的输入字段；带这个 data-*focus 的可点击元素算入口
 */
const ACTIONS = [
  {
    name: "记一餐",
    labels: ["记一餐", "去记一餐", "记录一餐"],
    focus: ["meal-text"],
  },
  {
    name: "记训练",
    labels: ["记训练", "训练", "记一条训练"],
    focus: ["training-form"],
  },
  {
    name: "记身体",
    labels: ["记身体", "身体", "记录身体数据", "记录体重"],
    focus: ["measurement-weight"],
  },
  {
    name: "复制一餐",
    labels: ["复制一餐"],
    focus: [],
  },
];

// 候选清单与动作模型的对应（记录一餐 与 记一餐 是同一个用户动作，合并计数；
// 否则改个文案就能绕过「同动作 ≤2」的预算）。
const CANDIDATE_MAP = [
  { candidate: "记一餐", action: "记一餐" },
  { candidate: "记训练", action: "记训练" },
  { candidate: "记身体", action: "记身体" },
  { candidate: "复制一餐", action: "复制一餐" },
  { candidate: "记录一餐", action: "记一餐", note: "同一用户动作的另一种写法，并入「记一餐」" },
];

const KIND_LABEL = {
  button: "button",
  anchor: "a",
  stateBlock: "state-block",
  quickChip: "quick-chip",
  buttonAssign: "button 赋值",
  chipCall: "check-fix",
};

/* ── 工具 ─────────────────────────────────────────────────────────────── */
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[body.toLowerCase()] ?? m;
  });
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, " ");
}

function stripInterpolations(s) {
  return s.replace(/\$\{[^}]*\}/g, " ");
}

function normalizeLabel(s) {
  return decodeEntities(stripTags(stripInterpolations(s)))
    .replace(/^[\s＋+·•›»]+/, "")
    .replace(/[\s↗→›»…]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function displayWidth(s) {
  let width = 0;
  for (const ch of s) {
    width += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2 : 1;
  }
  return width;
}

function padDisplay(s, width) {
  return s + " ".repeat(Math.max(0, width - displayWidth(s)));
}

/* ── 读输入（index.html + fragments，不碰生成物 app.js）────────────────── */
const sources = [
  { path: "app/src/main/assets/index.html", file: "index.html", text: readFileSync(HTML_PATH, "utf8") },
];
for (const name of readdirSync(FRAGMENT_DIR).sort()) {
  if (!name.endsWith(".fragment.js")) continue;
  sources.push({
    path: "app/src/fragments/" + name,
    file: basename(name),
    text: readFileSync(join(FRAGMENT_DIR, name), "utf8"),
  });
}

/* ── 入口采集 ─────────────────────────────────────────────────────────── */
const entries = [];
const seen = new Set();

function addEntry({ source, index, label, focus, kind, snippet }) {
  const key = source.file + "#" + index + "#" + kind + "#" + label;
  if (seen.has(key)) return;
  seen.add(key);
  entries.push({
    file: source.file,
    path: source.path,
    index,
    line: lineAt(source.text, index),
    label,
    focus: focus || "",
    kind,
    snippet: (snippet || "").replace(/\s+/g, " ").slice(0, 120),
  });
}

/** a) <button>…</button> / <a>…</a>：文案里是动作名才算，heading/提示不是 button。 */
const CLICK_TAG_RE = /<(button|a)\b([^>]*)>([\s\S]{0,400}?)<\/\1\s*>/gi;
for (const source of sources) {
  for (const m of source.text.matchAll(CLICK_TAG_RE)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const label = normalizeLabel(m[3]);
    if (!label) continue;
    const focusMatch = attrs.match(/\bdata-(?:quick-)?focus\s*=\s*"([^"]*)"/);
    addEntry({
      source,
      index: m.index,
      label,
      focus: focusMatch ? focusMatch[1] : "",
      kind: tag === "a" ? "anchor" : "button",
      snippet: m[0],
    });
  }

  /** b) stateBlock({... action: {label: '…', go, focus}}) → 渲染成可点击按钮。 */
  for (const m of source.text.matchAll(/action\s*:\s*\{([^{}]{0,320})\}/g)) {
    const body = m[1];
    const labelMatch = body.match(/label\s*:\s*(['"])(.*?)\1/);
    if (!labelMatch) continue;
    const focusMatch = body.match(/focus\s*:\s*(['"])(.*?)\1/);
    addEntry({
      source,
      index: m.index,
      label: normalizeLabel(labelMatch[2]),
      focus: focusMatch ? focusMatch[2] : "",
      kind: "stateBlock",
      snippet: m[0],
    });
  }

  /** d) button.innerHTML / textContent = '…'：变量名就是 button，属可点击文案。 */
  for (const m of source.text.matchAll(/\bbutton\s*\.\s*(?:innerHTML|textContent)\s*=\s*(['"])([^'"\n]{1,80}?)\1/g)) {
    addEntry({
      source,
      index: m.index,
      label: normalizeLabel(m[2]),
      focus: "",
      kind: "buttonAssign",
      snippet: m[0],
    });
  }
}

/** c) quick-chip 数据项：文件里存在 data-quick-focus 渲染器时才成立。 */
const QUICK_CHIP_RE = /\[\s*'([^']*\.svg)',\s*'([^']+)',\s*'([^']+)'(?:\s*,\s*'[^']*')?\s*\]/g;
for (const source of sources) {
  if (!source.text.includes("data-quick-focus")) continue;
  for (const m of source.text.matchAll(QUICK_CHIP_RE)) {
    addEntry({
      source,
      index: m.index,
      label: normalizeLabel(m[2]),
      focus: m[3],
      kind: "quickChip",
      snippet: m[0],
    });
  }
}

/** f) check-fix 补录链接工厂：chip('补训练', 'icon.svg', 'training-form')
 *  渲染成 <a class="check-fix" data-focus="training-form">补训练</a>。 */
const CHIP_CALL_RE = /\bchip\(\s*'([^']+)'\s*,\s*'([^']*\.svg)'\s*,\s*'([^']+)'/g;
for (const source of sources) {
  if (!source.text.includes('class="check-fix"') || !source.text.includes('data-focus="${focus}"')) continue;
  for (const m of source.text.matchAll(CHIP_CALL_RE)) {
    addEntry({
      source,
      index: m.index,
      label: normalizeLabel(m[1]),
      focus: m[3],
      kind: "chipCall",
      snippet: m[0],
    });
  }
}

/* ── 归类：文案逐字命中，或 focus 指向该动作的字段 ─────────────────────── */
function entryMatchesAction(entry, action) {
  if (entry.label && action.labels.includes(entry.label)) return true;
  if (entry.focus && action.focus.includes(entry.focus)) return true;
  return false;
}

const actionResults = ACTIONS.map((action) => {
  const matched = entries
    .filter((entry) => entryMatchesAction(entry, action))
    .sort((a, b) => {
      if (a.file === b.file) return a.index - b.index;
      if (a.file === "index.html") return -1;
      if (b.file === "index.html") return 1;
      return a.file.localeCompare(b.file);
    });
  return {
    name: action.name,
    threshold: ENTRY_LIMIT,
    count: matched.length,
    level: matched.length > ENTRY_LIMIT ? "WARN" : "PASS",
    entries: matched.map((entry) => ({
      file: entry.file,
      path: entry.path,
      line: entry.line,
      kind: entry.kind,
      label: entry.label,
      focus: entry.focus,
      snippet: entry.snippet,
    })),
  };
});

/* ── 卡片计数（index.html 的每个 #view-* 容器）─────────────────────────── */
const html = sources[0].text;
const viewMatches = [...html.matchAll(/\bid="view-([a-z0-9-]+)"/g)];
const mainClose = html.indexOf("</main>");
const views = viewMatches.map((m, i) => {
  let end = i + 1 < viewMatches.length ? viewMatches[i + 1].index : html.length;
  if (mainClose > m.index && mainClose < end) end = mainClose;
  return { name: m[1], start: m.index, end };
});

// 只认 class 这个 class 名：class="card" / class="card xxx" / class="card estimate-card"。
// 不看 card-heading / card-notes / card-* 后缀（它们是卡片内部零件）。
const CARD_TAG_RE = /<([a-z][a-z0-9-]*)\b[^>]*?\bclass\s*=\s*"([^"]*)"[^>]*>/gi;

function countCardsInView(view) {
  const cards = [];
  CARD_TAG_RE.lastIndex = 0;
  let m;
  while ((m = CARD_TAG_RE.exec(html))) {
    if (m.index >= view.end) break;
    if (m.index < view.start) continue;
    const classes = m[2].split(/\s+/).filter(Boolean);
    if (classes.includes("card")) {
      cards.push({ tag: m[1], classes: m[2], line: lineAt(html, m.index) });
    }
  }
  return cards;
}

const cardResults = views.map((view) => {
  const cards = countCardsInView(view);
  return {
    view: view.name,
    threshold: CARD_LIMIT,
    count: cards.length,
    level: cards.length > CARD_LIMIT ? "WARN" : "PASS",
    over: Math.max(0, cards.length - CARD_LIMIT),
    cards,
  };
});

/* ── 汇总 ─────────────────────────────────────────────────────────────── */
const findings = [];

for (const action of actionResults) {
  const where = action.count
    ? action.entries
        .map((entry) => entry.file + ":" + entry.line + " " + KIND_LABEL[entry.kind] + "「" + (entry.label || entry.focus) + "」")
        .join("；")
    : "未找到可点击入口";
  const over = action.count - ENTRY_LIMIT;
  findings.push({
    level: action.level,
    rule: "入口预算（同动作 ≤2）",
    detail:
      action.name + " " + action.count + " 处（阈值 ≤" + ENTRY_LIMIT + (over > 0 ? "，超出 " + over : "") + "）：" + where,
  });
}

for (const view of cardResults) {
  findings.push({
    level: view.level,
    rule: "每页卡片上限（≤8）",
    detail:
      view.view +
      " " +
      view.count +
      " 张（阈值 ≤" +
      CARD_LIMIT +
      (view.over > 0 ? "，超出 " + view.over : "") +
      "）",
  });
}

// 结构漂移兜底：一个 view 都找不到时不要静默 PASS。
if (views.length === 0) {
  findings.push({
    level: "WARN",
    rule: "每页卡片上限（≤8）",
    detail: "未找到任何 #view-* 容器（index.html 结构可能变了），卡片数无法审计",
  });
}

const passCount = findings.filter((f) => f.level === "PASS").length;
const warnCount = findings.filter((f) => f.level === "WARN").length;
const verdict = warnCount > 0 ? "WARN" : "PASS";

/* ── 输出 ─────────────────────────────────────────────────────────────── */
if (JSON_OUT) {
  const candidates = CANDIDATE_MAP.map((item) => {
    const action = actionResults.find((result) => result.name === item.action);
    return {
      candidate: item.candidate,
      action: item.action,
      kept: action.count > 0,
      clickableEntries: action.count,
      ...(item.note ? { note: item.note } : {}),
    };
  });
  console.log(
    JSON.stringify(
      {
        summary: { total: findings.length, pass: passCount, warn: warnCount, verdict },
        entryBudget: {
          threshold: ENTRY_LIMIT,
          actions: actionResults,
          candidates,
        },
        cardBudget: {
          threshold: CARD_LIMIT,
          views: cardResults,
        },
        findings,
      },
      null,
      2
    )
  );
} else {
  for (const f of findings) {
    console.log(f.level.padEnd(5) + padDisplay(f.rule, 26) + f.detail);
  }
  console.log("-".repeat(60));
  console.log(
    "总计 " +
      findings.length +
      " 项：PASS " +
      passCount +
      " / WARN " +
      warnCount +
      " · 结论 " +
      verdict +
      "（退出码 0，WARN 不阻断）"
  );
}

process.exit(0);
