/**
 * 连续配色断言：越接近目标越绿，而不是简单的三档。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const targets = read('app/src/fragments/40-targets.fragment.js');

// --- the shared colour ramp --------------------------------------------------------------------------
// goalColor 曾在全文件只有声明、没有调用；颜色现在由下面的 dietBarColor/rateGoalColor 各自负责。
check('the unused colour ramp is gone', !app.includes('function goalColor(ratio)'));

// --- diet bars --------------------------------------------------------------------------------------
check('diet bars pick a colour by state', app.includes('function dietBarColor(kcal, min, max)') && app.includes('if (kcal > max) return overColor(kcal, max);'));
check('in-range stays green', app.includes('function rangeColor(kcal, min, max)') && app.includes('132 + 8 * t'));
check('over the cap turns red quickly', app.includes('function overColor(kcal, max)') && app.includes('max * 0.08'));
check('below the floor turns amber', app.includes('function underColor(kcal, min)'));
check('the bar paints that colour', app.includes('background:${barColor}'));
check('a band marks the acceptable range', app.includes('class="diet-band" style="left:') && app.includes('const bandLeft = unset ? 0 : Math.max(0, Math.min(100, (range.min / scaleMax) * 100));'));
check('the scale leaves headroom above the cap', app.includes('const scaleMax = Math.max((unset ? Math.max(kcal, 1) : range.max) * 1.08, 1);'));
check('the band is explained in the caption', app.includes('浅绿带 = 当天目标区间'));
check('the band sits under the fill', read('app/src/main/assets/styles.css').includes('.diet-band{position:absolute') && read('app/src/main/assets/styles.css').includes('.diet-bar i{z-index:1') && !read('app/src/main/assets/styles.css').includes('.diet-bar i{position:relative'));
check('unrecorded days stay transparent', app.includes("recorded && !unset ? dietBarColor(kcal, range.min, range.max) : 'transparent'"));
check('state classes are kept for accessibility', app.includes('class="${stateKey}"'));

// --- weight delta graded against the plan -----------------------------------------------------------
check('the plan states an expected weekly rate', targets.includes('expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100'));
check('the range exposes it', app.includes('expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg)'));
check('the weight delta compares planned vs observed', app.includes('Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5)'));
check('it colours the delta value', app.includes('stats[1].style.color = rateColor'));
check('the rate uses its own ramp', app.includes('function rateGoalColor(observed, planned)') && app.includes('rateGoalColor(observedRate, plannedRate)'));
check('the plan rate is shown on hover', app.includes('计划每周 ') && app.includes('实际每周 '));

// --- training volume graded -------------------------------------------------------------------------
check('volume deltas use their own ramp', app.includes('function volumeColor(delta, previous)') && app.includes('volumeColor(row.delta, row.prevVolume)'));
check('growth is measured as a share of last volume', app.includes('const pct = previous > 0 ? delta / previous : 0;'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
