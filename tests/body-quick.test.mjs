/**
 * 2026-11-18 用户四条反馈的断言：
 *  1. 快速记录把「（快速记录）」写进餐名，复制一次叠一层；
 *  2. 首页「拍照」胶囊与「记一餐」重复；
 *  3. 今日体检下方两行点评（评价 + 今天优先）说的是同一件事；
 *  4. 记录·身体要能一次记下当天的体重与睡眠。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}

// --- 1. 快速记录不再叠加后缀 -------------------------------------------------------------------------
check('one helper strips the tag, both ends', app.includes('const stripQuickTag = value => String(value ?? \'\').replace(/(?:（快速记录）|\\(快速记录\\))+$/, \'\').trim();'));
check('creating a quick record no longer appends the tag', !app.includes("`${source.name || '未命名餐食'}（快速记录）`") && app.includes('const name = $(\'#quick-record-text\').value.trim() || stripQuickTag(source.name) || \'未命名餐食\';'));
check('copying a meal cleans the source name too', app.includes("copy.name = stripQuickTag(source.name) || '未命名餐食';"));
check('the meal row prints the cleaned name', app.includes("esc(stripQuickTag(meal.name) || '未命名餐食')"));
check('the copy list and quick source list use it', app.includes('${stripQuickTag(row.name) || \'未命名\'}') && app.includes('stripQuickTag(String(meal.name || \'未命名餐食\'))'));

// --- 2. 首页不再有拍照胶囊 ---------------------------------------------------------------------------
check('the camera chip is gone from today', !app.includes("['icon-glyph-camera.svg', '拍照', 'photo']") && !app.includes("focus === 'photo'"));
check('three chips remain', app.includes("['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary']") && app.includes("['icon-glyph-balance.svg', '身体', 'measurement-weight', '']"));
check('the chip row is a three-column grid', css.includes('.quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
check('adding a photo still lives on the meal card', html.includes('id="photo-add"') && html.includes('id="photo-sheet"') && html.includes('id="meal-image"'));

// --- 3. 体检只有一行点评 -----------------------------------------------------------------------------
check('the second line is gone', !app.includes('check-action') && !css.includes('.check-action'));
check('the verdict is one paragraph', app.includes('+ `<p class="check-verdict">${esc(check.verdict)}</p>`;'));
const checkSource = grab('const DAILY_CHECK_WEIGHTS', ['function relaxDayInfoFor'])
  + grab('function dailyCheck(', ['function acwrFromDailyLoads'])
  + 'return {dailyCheck};';
const { dailyCheck } = new Function(checkSource)();
const range = { min: 2160, max: 2314 };
const macros = { proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70 };
const low = dailyCheck({ meals: [{ totals: { calories: 1500, protein: 90, fat: 40 } }], habit: { sleep: 5 }, range, ...macros });
check('a low day states the gap and the step in one line', /·/.test(low.verdict) && /还差/.test(low.verdict) && /[0-9]/.test(low.verdict) && /主食|蛋白|加组/.test(low.verdict), low.verdict);
check('the merged line does not repeat the priority label', !/今天优先/.test(low.verdict));
check('a low day gets a "eat more" step', /加一份主食|下一餐先吃一份蛋白质|今天训练别加组/.test(low.verdict), low.verdict);
const high = dailyCheck({ meals: [{ totals: { calories: 2600, protein: 150, fat: 90 } }], habit: { sleep: 8 }, range, ...macros });
check('an over day gets the "less at dinner" step', high.worst && high.worst.key === 'calories' && /·/.test(high.verdict) && /晚餐只吃蛋白和蔬菜/.test(high.verdict), high.verdict);
const fine = dailyCheck({ meals: [{ totals: { calories: 2200, protein: 150, fat: 60 } }], habit: { sleep: 8 }, range, ...macros });
check('a good day keeps one calm line', /保持就好/.test(fine.verdict) && !/今天优先/.test(fine.verdict), fine.verdict);
const relaxed = dailyCheck({ meals: [{ totals: { calories: 2600, protein: 150, fat: 90 } }], habit: { sleep: 8 }, range, ...macros, relax: true });
check('the relax day still explains itself in one line', /放松日/.test(relaxed.verdict) && /不用少吃/.test(relaxed.verdict) && /照常/.test(relaxed.action), relaxed.verdict);

// --- 4. 记录·身体：今天体重（2026-11-22 由「今天两样」收窄）-----------------------------------------
check('the body panel opens with today\'s weight', html.includes('id="body-quick"') && html.includes('id="body-weight-jump"') && !html.includes('id="body-quick-form"'));
check('the weight card is a read-only jump, not a second form', html.includes('data-focus="measurement-weight"') && !/<form id="body-quick-form"/.test(html));
check('sleep lives in the habit form only', html.slice(html.indexOf('id="habit-form"')).includes('name="sleep"') && !html.slice(html.indexOf('id="body-quick"'), html.indexOf('id="body-data-card"')).includes('name="sleep"'));
check('the weight card follows the viewed day', app.includes('function renderBodyWeight()') && app.includes("$('#body-weight-jump')") && app.includes("tag.textContent = weight === null ? '待记录' : '已记录'"));
check('the jump lands on the measurement field', app.includes("revealField('measurement-weight', {focus: false, block: 'start'})"));
check('the body form saves weight with the rest', app.includes("numericForm(f, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr'])"));
check('the same-day measurement row is reused', app.includes('function measurementRowFor(date)') && app.includes('measurementRowFor(f.elements.date.value)'));
check('the outlier guard still compares weight', app.includes('Math.abs(weight - prevWeight) >= 2'));
check('the body panel lists the weight card first', app.includes("headings: ['今天体重', '身体数据', '日常习惯']"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
