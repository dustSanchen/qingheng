// 解释性文本的分类与排版契约（1.4.07）。口径见 docs/design/28-explanatory-text.md。
import {readFileSync} from 'node:fs';

const root = 'D:/AI/health-android/';
const html = readFileSync(root + 'app/src/main/assets/index.html', 'utf8');
const css = readFileSync(root + 'app/src/main/assets/styles.css', 'utf8');
const app = readFileSync(root + 'app/src/main/assets/app.js', 'utf8');

let pass = 0;
const fails = [];
function check(name, ok) {
  if (ok) { pass++; return; }
  fails.push(name);
}

// ① 说明文本只有一个字号口径，且选择器要比 .card p 更具体 ----------------------------
// 否则卡片里的 <p class="fine-print"> 会被 .card p 的 text-md 抢走字号（11px → 13.5px）。
check('a specific rule owns fine-print typography',
  css.includes('.card p.fine-print,p.fine-print,details p.fine-print{'));
const fontSizes = (css.match(/\.fine-print[^{]*\{[^}]*font-size/g) || []).length;
check('fine-print declares font-size in exactly one rule', fontSizes === 1);
check('the losing .card p does not list fine-print', !css.includes('.card p,.fine-print,'));

// ② 相邻两条说明不再各带一个空行 ------------------------------------------------------
check('adjacent notes sit tight', css.includes('.fine-print + .fine-print{margin-top:2px}'));

// ③ 边界句有独立视觉，且真的被用上 ----------------------------------------------------
check('safe-boundary class exists', css.includes('.note-safe{'));
const safeUses = (html.match(/note-safe/g) || []).length;
check('safe-boundary class is used at least 3 times', safeUses >= 3);

// ④ 指路文案必须指向存在的入口 --------------------------------------------------------
check('no pointer to the removed settings entry', !html.includes('数据、外观与说明') && !app.includes('数据、外观与说明'));
check('consent pointer names the real path', app.includes('我的 → 更多设置 → 数据管理'));
check('key pointer names AI 模型与密钥', app.includes('我的 → AI 模型与密钥'));
check('no pointer to the sub-heading as an entry', !app.includes('我的 → 模型连接'));

// ⑤ 外发授权开关与「数据管理」同页 ----------------------------------------------------
const dataPage = html.indexOf('<div class="subpage" id="subpage-data"');
const consent = html.indexOf('id="settings-consent"');
const nextPage = html.indexOf('</section>', dataPage);
check('consent switch lives inside the data subpage', dataPage > -1 && consent > dataPage && consent < nextPage);
check('consent row keeps its id', html.includes('id="external-consent-row"'));

// ⑥ 删掉的重复文案不再回来 ------------------------------------------------------------
check('browser-demo sentence is gone', !html.includes('浏览器演示只把记录存在本机'));
// 1.4.47：复制一餐卡已删，解释句随之消失；「复制」来源标签仍由数据层写入。
check('copied meals are still tagged at the data layer', app.includes("copy.source = 'quick-copy'") && !html.includes('id="copy-meal-note"'));
check('credits no longer repeat the medical disclaimer', !html.includes('本应用不提供诊断与处方，所有建议只作为你记录的参考'));

// ⑦ 问答页的免责独立成一条边界句 ------------------------------------------------------
check('chat disclaimer is its own boundary line', html.includes('<p class="fine-print note-safe">答案仅供参考，不替代医疗诊断。'));

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  fails.forEach(f => console.log('FAIL ' + f));
  process.exit(1);
}
