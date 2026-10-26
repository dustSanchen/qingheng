/**
 * 知识库接入建议链路：
 *  1. 体检卡：最差项给一条库引用；
 *  2. 问答：把库摘要随请求发出，原生拼进上下文（P1→P3 优先级写清楚）；
 *  3. 关于页：显示库版本、条目数与来源数。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 库 → 建议 ----------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'advice helpers built on the library',
    "  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */",
    `  /** Which library rule answers the weakest metric of the day. */
  function libraryRuleForMetric(key) {
    const map = {calories: 'weekly-rate', protein: 'protein-preserve', fat: 'protein-preserve',
      training: 'split-3-rationale', sleep: 'sleep-deficit'};
    return libraryRule(map[key] || '');
  }
  /** Compact digest for the question payload: priority order, one line per rule. */
  function librarySummary(max = 6) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const row = lib.sources.find(item => item.id === source);
      const index = order.indexOf(source);
      return index >= 0 ? index : (row && Number.isFinite(row.priority) ? row.priority : 9);
    };
    return lib.rules.slice()
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max)
      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim)
      .join('\\n');
  }
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */`,
  ],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'the check cites one library rule',
    `      + \`<p class="check-action"><strong>今天优先：</strong>\${esc(check.action)}</p>\`;`,
    `      + \`<p class="check-action"><strong>今天优先：</strong>\${esc(check.action)}</p>\`
      + (() => {const rule = libraryRuleForMetric(check.worst && check.worst.key); return rule
        ? \`<p class="check-rule">依据：\${esc(rule.claim.split('；')[0].slice(0, 60))} · \${esc(librarySourceLabel(rule.source))}</p>\` : '';})();`,
  ],
]);

// ---------------------------------------------------------------- 问答载荷 ----------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'send the library digest with the question',
    "      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,webSearch:",
    "      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,library:librarySummary(6),webSearch:",
  ],
]);

// ---------------------------------------------------------------- 原生上下文 --------------------------
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'the library rides along as a system message',
    `        messages.put(new JSONObject().put("role", "system").put("content", fastTier ? chatDataContextCompact(selectedDate) : chatDataContext(selectedDate)));`,
    `        messages.put(new JSONObject().put("role", "system").put("content", fastTier ? chatDataContextCompact(selectedDate) : chatDataContext(selectedDate)));
        // The local knowledge base, if the page sent one: cite it by priority, never let it override the app's rules.
        String libraryDigest = b.optString("library", "").trim();
        if (!libraryDigest.isEmpty() && libraryDigest.length() <= 1500) {
            messages.put(new JSONObject().put("role", "system").put("content",
                    "本地建议库（优先按 P1 凯圣王×谭成义、P2 凯圣王、P3 ALEX 的顺序引用；"
                    + "库内条目不得覆盖 App 的热量/蛋白/缺口口径。引用时说明来自哪一级）：\\n" + libraryDigest));
        }`,
  ],
]);

// ---------------------------------------------------------------- 关于页 ------------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the about page shows the library',
    `        + (coldStart > 0 ? \`<span>冷启动 <b>\${fmt(coldStart, 0)}</b> ms</span>\` : '');`,
    `        + (coldStart > 0 ? \`<span>冷启动 <b>\${fmt(coldStart, 0)}</b> ms</span>\` : '')
        + (window.TRAINING_PRINCIPLES
          ? \`<span>建议库 <b>\${esc(window.TRAINING_PRINCIPLES.version)}</b> · \${window.TRAINING_PRINCIPLES.rules.length} 条 · \${window.TRAINING_PRINCIPLES.sources.length} 来源</span>\`
          : '');`,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.check-rule{')) {
  css += `
/* One line under the daily check: which library rule backs the advice. */
.check-rule{margin:6px 0 0;font-size:11.5px;color:var(--muted)}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  check-rule styles');
}

console.log('knowledge base wired into advice paths');
