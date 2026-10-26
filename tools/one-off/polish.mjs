/**
 * 文案瘦身 + 排版提密度 + 快捷记录不弹键盘 + 下周计划并入训练段。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 1. 文案瘦身 --------------------------
const copy = [
  ['未记录的餐食不计入汇总。', '记录热量不等于实际全部摄入；未记录的餐食不计入汇总。'],
  ['每天 30 秒，三样就够。', '训练、睡眠、体重 —— 每天 30 秒填完这三样，长期趋势就有依据。'],
  ['动作 · 组数 · 次数 · 负重；容量变化在趋势页看。', '记下今天练了什么：动作、组数、次数、负重。同一动作的容量变化会在趋势页给出，用来判断渐进超负荷。'],
  ['一键复制到当前日期，再按实际份量微调。', '昨天或最近吃过的同一餐，一键复制到当前日期，再按实际份量微调即可。'],
  ['会标记为「复制」。', '复制的记录会标记为「复制」，方便你区分估算与复用。'],
  ['照片在本机压缩并移除元数据，同意后才发送。', '拍照后会先在手机本地压缩到最长边 1280px 并移除元数据，再显示预览。照片只在你勾选同意并点击估算后发送。'],
  ['逐项核对克重与营养；确认后才保存。', '逐项检查并修改克重与营养数值。可点击「按食品模型校核」用本地模型换算；份量与油量仍需确认。未点击确认不会保存。'],
  ['拍摄时间 ≠ 进餐时间，可在上方改。', '拍摄时间不等于进餐日期与进餐时间；有照片时默认取拍摄时刻，特殊情况可在上方改。'],
  ['相近条件下测量；单次读数不代表趋势。', '尽量在相近条件下测量。设备估算有误差，单次读数不代表趋势。'],
  ['超出记录的就不下结论。', '我先用你本机记录的数据直接回答；哪部分没有记录就跳过哪部分，不给结论留空。'],
  ['仅预览，不发送；发送仍要点「提问」。', '这里只是预览，不会发送任何内容；真正发送仍需你勾选下方同意并点击提问。数据为你本机的记录数字与分析日期，不含姓名、备注原文、记录编号、密钥或照片。'],
  ['连线只连接实测点。', '连线只连接已测量点，不表示缺失日期的体重。体重短期变化可能受水分等因素影响。'],
  ['BMI 与体脂仅供一般参考，不是诊断。', 'BMI 仅用于一般参考，不是医学诊断。体脂率波动不能单独证明肌肉流失。'],
  ['按档案身高计算，仅供参考。', 'BMI 使用当前档案身高计算，仅是一般筛查参考，不是医学诊断。体脂率不是肌肉流失的证据。'],
  ['Mifflin-St Jeor 公式；结果需用 2~4 周记录校准。', '测算依据 Mifflin-St Jeor 公式与所选目标；结果是起点而非医学处方，建议用 2~4 周真实记录校准。本应用不提供诊断或极端减重建议。'],
  ['默认与执行规则一致，改动一起保存。', '下面这组阈值就是测算口径，默认与执行规则一致；改动会一起保存，并在每次测算时参与校验。'],
  ['记录只存在本机；API Key 由原生层保存、不回传。', '无需登录，记录离线保存在手机。API Key 仅由 APK 原生层保存，绝不回传；浏览器演示不能保存密钥或使用外部模型。'],
  ['deepseek-flash 支持文字与图片；deepseek-v4-pro 仅文字。', 'DeepSeek 的 deepseek-flash 同时支持文字与图片（官方当前模型为 deepseek-flash 与 deepseek-v4-pro，后者不支持图片）；deepseek-v4-pro 仅可文字。'],
];
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
let replaced = 0;
for (const [short, long] of copy) {
  if (html.includes(long)) { html = html.split(long).join(short); replaced++; }
}
fs.writeFileSync('app/src/main/assets/index.html', html);
console.log('copy shortened:', replaced, '/', copy.length);

// ---------------------------------------------------------------- 2. 排版提密度 ------------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* density pass */')) {
  css += `
/* density pass: same information, less vertical space */
.fine-print{font-size:11.5px;line-height:1.5;margin:6px 0}
.muted{font-size:13px;line-height:1.5;margin:6px 0}
.card{padding:18px;margin-bottom:14px;border-radius:20px}
.card-heading{margin-bottom:12px}
.card h2{font-size:15.5px}
.form-grid{gap:0 10px}
label{font-size:12.5px}
.button-row{gap:8px}
.list-stack{gap:10px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  density pass');
}

// ---------------------------------------------------------------- 3. 快捷记录：不弹键盘 ------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'revealField can scroll without focusing',
    `  function revealField(id) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;
    switchRecordPanel(recordPanelForField(id));
    const details = field.closest('details');
    if (details && !details.open) details.open = true;
    field.scrollIntoView({block: 'center', behavior: 'smooth'});
    field.focus({preventScroll: true});
  }`,
    `  /** Briefly outline the card so the eye lands there even when we do not focus a field. */
  function flashTarget(node) {
    if (!node) return;
    node.classList.add('quick-target');
    setTimeout(() => node.classList.remove('quick-target'), 1600);
  }
  /**
   * Scrolls to a form field. focus:false keeps the soft keyboard closed, which is what a quick-entry
   * chip wants — the user should see the form, not be pushed into typing.
   */
  function revealField(id, options = {}) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;
    switchRecordPanel(recordPanelForField(id));
    const details = field.closest('details');
    if (details && !details.open) details.open = true;
    const block = options.block || 'center';
    field.scrollIntoView({block, behavior: 'smooth'});
    if (options.focus === false) { flashTarget(field.closest('.card') || field); return; }
    field.focus({preventScroll: true});
  }`,
  ],
  [
    'quick chips land on the form without the keyboard',
    `        if (focus === 'training-form') {
          const form = $('#training-form');
          if (form) $('[data-training-preset]', form)?.focus();
          return;
        }
        revealField(focus);`,
    `        if (focus === 'training-form') {
          const form = $('#training-form');
          if (form) { form.closest('.card')?.scrollIntoView({block: 'start', behavior: 'smooth'}); flashTarget(form.closest('.card')); }
          return;
        }
        // No focus: the keyboard used to cover the very form the user wanted to see.
        revealField(focus, {focus: false, block: 'start'});`,
  ],
]);

// ---------------------------------------------------------------- 4. 下周计划并入训练段 ------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the plan card belongs to the training segment',
    `    {key: 'training', label: '训练', headings: ['训练日志'], trainingOnly: true},`,
    `    {key: 'training', label: '训练', headings: ['下周计划', '训练日志'], trainingOnly: true},`,
  ],
]);

// ---------------------------------------------------------------- 5. 今天练什么 ------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'the plan says what to train today',
    `    if (tag) tag.textContent = plan.deload ? '减载周' : '按上周 +2.5%';
    box.innerHTML = '<p class="fine-print">' + esc(plan.note) + '</p>'`,
    `    if (tag) tag.textContent = plan.deload ? '减载周' : '按上周 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    const todayPlan = plan.days.find(day => day.date === activeDate);
    const nextPlan = plan.days.find(day => day.date > activeDate);
    const logged = exercisesFor(activeDate);
    const todayText = logged.length
      ? '今天已记录 ' + logged.length + ' 个动作'
      : todayPlan
        ? '今天按计划：' + (TRAINING_TEMPLATES[todayPlan.template] || todayPlan.template) + (todayPlan.exercises.length ? ' · ' + todayPlan.exercises.map(item => item.name).slice(0, 3).join('、') : '（动作待定）')
        : nextPlan
          ? '今天休息；下一个训练日 ' + nextPlan.date.slice(5) + ' · ' + (TRAINING_TEMPLATES[nextPlan.template] || nextPlan.template) + (nextPlan.exercises.length ? ' · ' + nextPlan.exercises[0].name : '')
          : '今天休息。';
    box.innerHTML = '<p class="plan-today"><strong>' + esc(todayText) + '</strong></p>'
      + '<p class="fine-print">' + esc(plan.note) + '</p>'`,
  ],
]);

let extra = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!extra.includes('.quick-target{')) {
  extra += `
/* A brief outline tells the eye where the form is, without opening the keyboard. */
.quick-target{animation:quickFlash 1.6s ease-out 1}
@keyframes quickFlash{0%{box-shadow:0 0 0 3px #9dbb9b}70%{box-shadow:0 0 0 3px #9dbb9b}100%{box-shadow:var(--shadow)}}
.plan-today{margin:0 0 6px;padding:8px 10px;border-radius:10px;background:#eef4ea;font-size:13.5px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', extra);
  console.log('ok  quick-target styles');
}

console.log('polish pass wired');
