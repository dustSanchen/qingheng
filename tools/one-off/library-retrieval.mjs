/**
 * 用口述级知识库优化 App 的健身建议：
 *  1. libraryLookup(question)：按问题关键词检索相关规则，问答只带相关内容（替代固定 top-6）
 *  2. libraryCues(template)：训练卡给出 2 条今天可用的动作要点
 *  3. 体检卡的建议附一条库依据（已有），再加「什么时候该休息」的信号提示
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// ---------------------------------------------------------------- 检索 ---------------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['topic routing for questions',
   '  /** Which library rule answers the weakest metric of the day. */',
   `  /** Keyword → tag routing, so a question about 腹肌 gets the abs rules instead of the top 6 by priority. */
  const LIBRARY_ROUTES = [
    {match: /腹肌|核心|举腿|卷腹/, tags: ['abs']},
    {match: /肩|侧平举|后束|飞鸟/, tags: ['shoulder']},
    {match: /腿|深蹲|硬拉|保加利亚/, tags: ['legs']},
    {match: /背|划船|下拉|引体/, tags: ['pull']},
    {match: /胸|卧推|推日|上斜/, tags: ['push']},
    {match: /热身|激活|拉伸|放松|泡沫轴/, tags: ['warmup', 'stretch']},
    {match: /力竭|RPE|组数|次数|强度/, tags: ['intensity', 'main']},
    {match: /减脂|减肥|缺口|平台|体重不降/, tags: ['fatloss', 'deficit']},
    {match: /蛋白|蛋白质|吃多少/, tags: ['protein']},
    {match: /睡眠|熬夜|累|疲劳|恢复/, tags: ['sleep', 'recovery']},
    {match: /增肌|肌肉|围度/, tags: ['main', 'volume']}
  ];
  function libraryLookup(question, max = 8) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const text = String(question || '');
    const wanted = new Set();
    for (const route of LIBRARY_ROUTES) if (route.match.test(text)) route.tags.forEach(tag => wanted.add(tag));
    if (!wanted.size) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const index = order.indexOf(source);
      return index >= 0 ? index : 9;
    };
    const hits = lib.rules
      .filter(rule => (rule.tags || []).some(tag => wanted.has(tag)))
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max);
    return hits.map(rule => '[' + rule.topic + '] ' + rule.claim
      + (rule.evidence ? '（口述 ' + rule.evidence.at + '，' + rule.evidence.bvid + '）'
        : rule.video ? '（视频 ' + rule.video.bvid + '）' : '')).join('\\n');
  }
  /** Two short cues for today's template, taken from the transcript-level rules. */
  function libraryCues(template) {
    const lib = trainingLibrary();
    if (!lib) return [];
    const byTemplate = {
      push: ['lateral-raise-partial', 'rpe8-is-not-rm'],
      pull: ['rear-delt-neutral-grip', 'compound-deload-not-failure'],
      legs: ['leg-warmup-six-moves', 'rest-by-signal-not-calendar']
    };
    return (byTemplate[template] || [])
      .map(id => lib.rules.find(rule => rule.id === id))
      .filter(Boolean)
      .map(rule => rule.claim.split('；')[0]);
  }
  /** Which library rule answers the weakest metric of the day. */`],
]);

// ---------------------------------------------------------------- 问答只带相关内容 ---------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['send the relevant rules, not just the top six',
   "tier,library:librarySummary(6),webSearch:",
   "tier,library:(libraryLookup(question, 8) || librarySummary(6)),webSearch:"],
]);

// ---------------------------------------------------------------- 训练卡动作要点 -----------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['cues under today plan',
   "    box.innerHTML = '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'",
   `    const cues = (typeof libraryCues === 'function' && plan.days.length) ? libraryCues(plan.days[0].template) : [];
    const cueHtml = cues.length ? '<p class="plan-cue">' + cues.map(cue => esc(cue)).join('；') + '</p>' : '';
    box.innerHTML = cueHtml + '<p class="plan-today"><strong>' + esc(todayText) + '</strong></p>'`],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.plan-cue{')) {
  css += `
/* Two actionable cues from the transcript-level library, above the "what to train today" line. */
.plan-cue{margin:0 0 8px;padding:7px 10px;border-radius:10px;background:#f2f6ee;color:#4d6b52;font-size:12px;line-height:1.55}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  plan-cue styles');
}

console.log('library lookups wired');
