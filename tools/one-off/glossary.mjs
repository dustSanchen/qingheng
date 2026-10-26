import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) 术语库 + 标注 + 浮层逻辑（放在 00-head，全局可用）
patch('app/src/fragments/00-head.fragment.js', [
  ['fitness glossary and term sheet',
   '  /** 一天里的时段：决定「现在最该记什么」',
   [
     '  /** 健身术语表：含义 + 注意事项。点一下词就出解释，不跳页。 */',
     '  const TERMS = {',
     '    "RPE": {full: "Rate of Perceived Exertion，自觉用力程度", meaning: "用 1~10 描述这一组有多难。RPE 8 = 还能再做约 2 次，RPE 10 = 力竭。", caution: "它靠自我感受，不同动作的体感不一样；第一次用建议对照「停下来还能做几次」校准。"},',
     '    "RM": {full: "Repetition Maximum，最大重复次数", meaning: "12RM 指某个重量最多只能做 12 次。计划里写「12 次」通常不是 12RM，而是留了余量的 12 次。", caution: "把「12 次」当 12RM 做，会让每组都变成力竭，恢复跟不上。"},',
     '    "ACWR": {full: "Acute:Chronic Workload Ratio，急慢性负荷比", meaning: "最近 7 天训练量 ÷ 最近 28 天周均训练量。1.0 左右是维持，超过 1.5 通常提示负荷涨太快。", caution: "它只是提示，不是判决；换动作、换计划都会让它短暂失真。"},',
     '    "TDEE": {full: "Total Daily Energy Expenditure，每日总消耗", meaning: "基础代谢 + 日常活动 + 训练 + 食物热效应。本 App 用公式估算，再用两周体重均值校准。", caution: "公式天生有 10%~20% 误差，别把估算值当精确值。"},',
     '    "减载": {full: "Deload", meaning: "主动安排一周降低负荷（负重 ×0.9、组数 −1），让神经与关节恢复。", caution: "减载不是休息，动作照做，只是量降下来。"},',
     '    "渐进超负荷": {full: "Progressive Overload", meaning: "让训练刺激逐步变大：加重、加次数、加组，一次只动一个变量。", caution: "同时加重又加量是最常见的过载方式，也是最先崩的方式。"},',
     '    "力竭": {full: "Muscular Failure", meaning: "这一组再也做不出一次标准动作。单关节动作可以接近力竭，复合主项不建议。", caution: "大重量复合动作做到力竭，恢复成本很高，容易影响接下来几天。"},',
     '    "离心": {full: "Eccentric，下放阶段", meaning: "肌肉被拉长的阶段，比如卧推下放。离心能承受更大张力，也更容易酸痛。", caution: "离心放慢到 3 秒以上会显著增加酸痛，训练日之间要留够间隔。"}',
     '  };',
     '  /** 把已知术语包成可点击的按钮；只处理纯文本，避免破坏已有标签。 */',
     '  function annotateTerms(html) {',
     '    let out = String(html || "");',
     '    for (const term of Object.keys(TERMS)) {',
     '      const token = ">" + term + "<";',
     '      if (!out.includes(token)) continue;',
     '      out = out.replace(token, "><button type=\\"button\\" class=\\"term\\" data-term=\\"" + term + "\\">" + term + "</button><");',
     '    }',
     '    return out;',
     '  }',
     '  function openTerm(name) {',
     '    const sheet = $("#term-sheet");',
     '    const term = TERMS[name];',
     '    if (!sheet || !term) return;',
     '    $("#term-title").textContent = name;',
     '    $("#term-full").textContent = term.full;',
     '    $("#term-meaning").textContent = term.meaning;',
     '    $("#term-caution").textContent = term.caution;',
     '    sheet.hidden = false;',
     '    sheet.dataset.term = name;',
     '  }',
     '  function closeTerm() { const sheet = $("#term-sheet"); if (sheet) sheet.hidden = true; }',
     '  document.addEventListener("click", event => {',
     '    const trigger = event.target.closest && event.target.closest("[data-term]");',
     '    if (trigger) { event.preventDefault(); openTerm(trigger.dataset.term); return; }',
     '    const sheet = $("#term-sheet");',
     '    if (sheet && !sheet.hidden && !event.target.closest("#term-sheet")) closeTerm();',
     '  });',
     '  /** 一天里的时段：决定「现在最该记什么」'
   ].join(NL)],
]);

// 2) 浮层标记
patch('app/src/main/assets/index.html', [
  ['term sheet markup',
   '<div class="sheet" id="action-sheet" hidden',
   [
     '<div class="term-sheet" id="term-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="term-title"><div class="term-panel"><div class="term-head"><strong id="term-title">术语</strong><button type="button" class="term-close" id="term-close" aria-label="关闭">×</button></div><p class="term-full" id="term-full"></p><p class="term-line" id="term-meaning"></p><p class="term-line term-warn" id="term-caution"></p></div></div>',
     '<div class="sheet" id="action-sheet" hidden'
   ].join(NL)],
]);

// 3) 在计划卡与体检依据上启用标注
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['annotate plan cues',
   "    const cueHtml = cues.length ? '<p class=\"plan-cue\">' + cues.map(cue => esc(cue)).join('；') + '</p>' : '';",
   "    const cueHtml = cues.length ? annotateTerms('<p class=\"plan-cue\">' + cues.map(cue => esc(cue)).join('；') + '</p>') : '';"],
  ['annotate the check rule',
   "      ? `<p class=\"check-rule\">依据：${esc(rule.claim.split('；')[0].slice(0, 60))} · ${esc(librarySourceLabel(rule.source))}</p>` : '';",
   "      ? annotateTerms(`<p class=\"check-rule\">依据：${esc(rule.claim.split('；')[0].slice(0, 60))} · ${esc(librarySourceLabel(rule.source))}</p>`) : '';"],
]);

// 4) 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.term{')) {
  css += NL + [
    '/* 术语：虚线下划线，点一下出解释；不跳页、不打断记录。 */',
    '.term{display:inline;padding:0;border:0;background:transparent;color:inherit;font:inherit;border-bottom:1px dashed var(--muted);cursor:pointer}',
    '.term::after{content:"?";font-size:.75em;vertical-align:super;color:var(--muted);margin-left:1px}',
    '.term-sheet{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,20,19,.28);padding:var(--space-3)}',
    '.term-sheet[hidden]{display:none}',
    '.term-panel{width:100%;max-width:520px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:var(--space-4);box-shadow:0 -8px 32px -24px rgba(20,20,19,.5)}',
    '.term-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)}',
    '.term-head strong{font-size:var(--text-lg);color:var(--ink)}',
    '.term-close{width:32px;height:32px;border:0;background:transparent;color:var(--muted);font-size:20px}',
    '.term-full{margin:0 0 var(--space-2);font-size:var(--text-sm);color:var(--muted)}',
    '.term-line{margin:0 0 var(--space-2);font-size:var(--text-md);line-height:1.65;color:var(--body-text)}',
    '.term-warn{color:var(--warn)}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  term styles');
}

console.log('glossary wired');
