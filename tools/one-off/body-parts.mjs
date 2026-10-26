/** 关于页新增「按部位查解剖要点」：数据驱动，新规则入库后自动出现。 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  ['body-part hints in about',
   "        + (window.TRAINING_PRINCIPLES\n          ? `<span>建议库 <b>${esc(window.TRAINING_PRINCIPLES.version)}</b> · ${window.TRAINING_PRINCIPLES.rules.length} 条 · ${window.TRAINING_PRINCIPLES.sources.length} 来源</span>`\n          : '');",
   `        + (window.TRAINING_PRINCIPLES
          ? \`<span>建议库 <b>\${esc(window.TRAINING_PRINCIPLES.version)}</b> · \${window.TRAINING_PRINCIPLES.rules.length} 条 · \${window.TRAINING_PRINCIPLES.sources.length} 来源</span>\`
          : '')
        + bodyPartHints();`],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  ['body part hint builder',
   '  async function loadStorageStatus(remirror = false) {',
   `  /** 「按部位查解剖要点」：每个部位取 2~3 条最相关的规则，带口述时间戳。 */
  function bodyPartHints() {
    const lib = window.TRAINING_PRINCIPLES;
    if (!lib || !Array.isArray(lib.rules)) return '';
    const parts = [
      {label: '关节活动度', tags: ['anatomy', 'warmup']},
      {label: '胸', tags: ['push']},
      {label: '肩', tags: ['shoulder']},
      {label: '背', tags: ['pull']},
      {label: '手臂', tags: ['isolation', 'arm']},
      {label: '腹肌 / 核心', tags: ['abs']},
      {label: '腿 / 臀', tags: ['legs']},
      {label: '减脂与恢复', tags: ['fatloss', 'recovery', 'sleep']}
    ];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index >= 0 ? index : 9; };
    const rows = parts.map(part => {
      const hits = lib.rules
        .filter(rule => (rule.tags || []).some(tag => part.tags.includes(tag)))
        .sort((a, b) => rank(a.source) - rank(b.source))
        .slice(0, 3);
      if (!hits.length) return '';
      const items = hits.map(rule => '<p>' + esc(rule.claim.split('；')[0]) + (rule.evidence ? '<small> · 口述 ' + esc(rule.evidence.at) + '</small>' : '') + '</p>').join('');
      return '<p class="part-title">' + esc(part.label) + '</p>' + items;
    }).join('');
    return rows ? '<details class="body-parts"><summary>按部位查解剖要点</summary>' + rows + '</details>' : '';
  }
  async function loadStorageStatus(remirror = false) {`],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.body-parts{')) {
  css += `
/* Anatomy hints by body part: collapsed by default in the about card. */
.body-parts{margin:10px 0 0;flex-basis:100%;border-top:1px dashed var(--line);padding-top:8px}
.body-parts summary{cursor:pointer;font-size:12.5px;color:var(--muted)}
.body-parts .part-title{margin:8px 0 2px;font-size:12.5px;font-weight:600;color:var(--ink)}
.body-parts p{margin:3px 0;font-size:12px;line-height:1.55;color:var(--ink)}
.body-parts small{color:var(--muted)}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  body-parts styles');
}

console.log('body part hints wired');
