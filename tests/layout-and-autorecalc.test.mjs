/**
 * 本轮断言：删除按钮位置、自动重算、以及相关样式。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const meals = read('app/src/fragments/50-onboarding.fragment.js');
const targets = read('app/src/fragments/40-targets.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');

// --- the delete action moved out of the calorie column ------------------------------------------------
const rowBlock = meals.slice(meals.indexOf('return `<div class="meal-row list-row"'), meals.indexOf('}).join(\'\') : empty('));
check('the delete button is in the title row', rowBlock.indexOf('row-delete') < rowBlock.indexOf('</div>`') && rowBlock.includes('class="icon-button danger row-delete"'));
check('the calorie column no longer holds a delete button', !/row-side[\s\S]{0,200}data-delete-meal/.test(rowBlock), 'row-side keeps only the kcal');
check('the button keeps an accessible label', rowBlock.includes('aria-label="删除'));
check('it is compact and self-aligned', css.includes('.row-delete{width:32px;height:32px') && css.includes('margin-left:auto'));

// --- auto recalculation -------------------------------------------------------------------------------
check('a change listener is installed', targets.includes('function installProfileAutoRecalc()'));
check('goal, weight, height and age all trigger it', targets.includes("const fields = ['goal', 'weight', 'height', 'age'];"));
check('it recalculates without saving', targets.includes('recalcProfileTargets({saveMeasurement: false, auto: true})'));
check('the status says it is unsaved', targets.includes('已按当前选择自动重算（未保存，点「保存档案」生效）：'));
check('it is wired at boot', rest.includes('installProfileAutoRecalc();'));

// --- the derived numbers come from the same function ---------------------------------------------------
check('calorie ranges come from the goal plan', targets.includes('trainingDay = {min: Math.round(centre * 0.98), max: Math.round(centre * 1.04)}'));
check('protein follows the goal preset', targets.includes('const proteinPerKgMin = preset.proteinPerKgMin;'));
check('the weekly average is reported', targets.includes('weeklyAverage'));
check('the training-frequency lever is still shown', targets.includes('训练频率杠杆'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
