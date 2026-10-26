/**
 * 第四轮审美：按公开的 Claude 设计解析（第三方拆解文档）校准结构与排版。
 *
 * 依据：VoltAgent/awesome-design-md 的 claude/DESIGN.md（第三方分析，非 Anthropic 官方）。
 * 采纳的是「结构性语言」，不是照搬品牌色：
 *   - 暖纸底 #faf9f5、墨 #141413、正文 #3d3d3a、次要 #6c6a64、发丝线 #e6dfd8
 *   - 卡片用「色块」而不是阴影（color-block first, shadow rare）
 *   - 圆角层级 8 / 12 / 16
 *   - 显示级标题用衬线、字重 400（不加粗）、大字号配轻微负字距
 *   - 控件最小高度 40px
 * 刻意不采纳：把强调色换成珊瑚 #cc785c —— 这是健康类 App，绿色语义更合适；
 * 结构照做，品牌电压不换，避免「看起来像 Claude 但不像轻衡」。
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;

const setToken = (name, value) => {
  const re = new RegExp('(' + name + '\\s*:\\s*)([^;]+);');
  if (!re.test(css)) { console.log('skip token', name); return; }
  const current = css.match(re)[2].trim();
  if (current === value) { console.log('same token', name); return; }
  css = css.replace(re, '$1' + value + ';');
  changed++;
  console.log('ok  ', name, current, '->', value);
};

setToken('--ink', '#141413');
setToken('--muted', '#6c6a64');
setToken('--line', '#e6dfd8');
setToken('--paper', '#faf9f5');
setToken('--surface', '#fdfcf8');
setToken('--radius-sm', '8px');
setToken('--radius-md', '12px');
setToken('--radius-lg', '16px');

if (!css.includes('--body-text')) {
  css = css.replace('  --ink: #141413;', '  --ink: #141413;\n  --body-text: #3d3d3a;\n  --surface-soft: #efe9de;');
  changed++;
  console.log('ok   body + soft surface tokens');
}

const add = (needle, block) => {
  if (css.includes(needle)) { console.log('same', needle); return; }
  css += '\n' + block + '\n';
  changed++;
  console.log('ok  ', needle);
};

add('/* editorial body colour */', `/* editorial body colour — running text is body, not headline ink. */
body,p,li,td,.muted{color:var(--body-text)}
h1,h2,h3,.card h2,.page-title,.hero-title{color:var(--ink)}`);

add('/* color-block cards */', `/* color-block cards — depth from surface tone and a hairline, not from shadow. */
.card{background:var(--surface);border:1px solid var(--line);box-shadow:none}
.diet-audit,.plan-cue,.notice,details summary{background:var(--surface-soft)}`);

add('/* display weight 400 */', `/* display weight: regular, never bold — bold serif reads as shouting. */
.page-title,.hero-title,h1{font-weight:400;letter-spacing:-.2px;line-height:1.25}
.card h2{font-weight:400;letter-spacing:0;color:var(--ink)}`);

add('/* 40px controls */', `/* 40px controls — one height for buttons and inputs. */
button,.button,select,input:not([type=checkbox]):not([type=radio]){min-height:40px}`);

if (changed) fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('changed:', changed);
