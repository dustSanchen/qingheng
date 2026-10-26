/**
 * Recovery: index.html was rewritten through PowerShell's ANSI decoding and lost its Chinese text.
 * Restore the newest backup that still reads correctly, then re-apply this round's HTML edits with the
 * patch library (which reads and writes UTF-8).
 */
import fs from 'node:fs';
import path from 'node:path';
import {patch} from '../lib/patch.mjs';

const target = 'app/src/main/assets/index.html';
const root = 'backups';
const candidates = [];
if (fs.existsSync(root)) {
  for (const dir of fs.readdirSync(root)) {
    const file = path.join(root, dir, 'assets', 'index.html');
    if (fs.existsSync(file)) candidates.push({file, mtime: fs.statSync(file).mtimeMs});
  }
}
candidates.sort((a, b) => b.mtime - a.mtime);
const good = candidates.find(row => {
  const text = fs.readFileSync(row.file, 'utf8');
  return text.includes('今日三样') && text.includes('饮食目标');
});
if (!good) throw new Error('no intact backup of index.html found');
fs.copyFileSync(good.file, target);
console.log('restored from', good.file);

const html = fs.readFileSync(target, 'utf8');
if (!html.includes('今日三样')) throw new Error('restored file still broken');

patch(target, [
  [
    'training advice card after the energy card',
    /id="macro-summary"><\/div>[\s\S]{0,400}?<\/article>/,
    `id="macro-summary"></div><p class="fine-print">记录热量不等于实际全部摄入；未记录的餐食不计入汇总。</p></article>
      <article class="card" id="training-advice"><div class="card-heading"><h2>今日训练建议</h2><span class="tag">问一句</span></div><p class="muted">结合今天的训练记录与你的目标，直接问练什么、强度怎么定。</p><div class="button-row" id="training-advice-chips"></div><form id="training-advice-form"><label>你的问题<textarea id="training-advice-input" rows="2" maxlength="600" placeholder="例如：今天只有 40 分钟，练推还是拉？"></textarea></label><div class="check-label"><input type="checkbox" id="training-advice-consent"><span>同意把这个问题与今天的训练数据发送给已配置的外部模型。</span></div><button class="button primary full-width" type="submit">问训练建议</button><p class="form-feedback" id="training-advice-feedback" role="status" aria-live="polite"></p></form><div id="training-advice-answer" class="answer" hidden></div></article>`,
  ],
  [
    'chat suggestion chips',
    `</details><label>你的问题<textarea id="chat-question"`,
    `</details><div class="button-row" id="chat-chips" aria-label="常用问题"></div><label>你的问题<textarea id="chat-question"`,
  ],
  [
    'push: today card first, history stays below',
    '<article class="card"><div class="card-heading"><h2>每日推送生活建议</h2><button class="text-button" type="button" id="refresh-push-history">查询 ↻</button></div><div id="push-history" class="muted">查询每天早晚推送中保存的生活建议。</div>',
    '<article class="card" id="push-today-card"><div class="card-heading"><h2>今天的建议</h2><span class="tag" id="push-today-tag">当天</span></div><div id="push-today" class="list-stack" role="list"><p class="muted">正在读取今天的建议…</p></div><p class="fine-print">这里只显示今天的建议；未开启推送或当天还没生成时为空。</p></article><article class="card"><div class="card-heading"><h2>历史建议</h2><button class="text-button" type="button" id="refresh-push-history">查询 ↻</button></div><div id="push-history" class="muted">按日期范围回看已保存的建议。</div>',
  ],
  [
    'habit quick chips + copy row',
    `<label>饮水 · ml<input name="water" type="number" step="50" min="0" max="20000" placeholder="可选"></label></div><button class="button primary" type="submit">保存日常习惯</button>`,
    `<label>饮水 · ml<input name="water" type="number" step="50" min="0" max="20000" placeholder="可选"></label></div><div class="button-row" id="habit-chips" aria-label="快速填入"></div><div class="button-row" id="habit-copy-row"></div><button class="button primary" type="submit">保存日常习惯</button>`,
  ],
]);

const after = fs.readFileSync(target, 'utf8');
const checks = {
  'Chinese intact': after.includes('今日三样') && after.includes('每日推送生活建议'),
  'training card': after.includes('id="training-advice"'),
  'chat chips': after.includes('id="chat-chips"'),
  'push today': after.includes('id="push-today-card"'),
  'habit chips': after.includes('id="habit-chips"') && after.includes('id="habit-copy-row"'),
  'no replacement chars': !after.includes('\uFFFD'),
};
for (const [label, ok] of Object.entries(checks)) console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1;
