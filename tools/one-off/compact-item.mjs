import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 克重移到右侧，和热量一起不换行，名字单独一行。
patch('app/src/fragments/50-onboarding.fragment.js', [
  ['grams move to the value column',
   "`<div class=\"meal-item\"><span>${esc(item.name || '未命名')}${number(item.grams) !== null ? ` · ${fmt(item.grams, 0)} g` : ''}</span><b>${fmt(number(item.calories) ?? 0, 0)} kcal</b></div>`",
   "`<div class=\"meal-item\"><span>${esc(item.name || '未命名')}</span><b>${number(item.grams) !== null ? `${fmt(item.grams, 0)} g · ` : ''}${fmt(number(item.calories) ?? 0, 0)} kcal</b></div>`"],
]);
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.40';", "const APP_VERSION = '1.0.41';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.40',[int]$VersionCode=41)", "param([switch]$Clean,[string]$Version='1.0.41',[int]$VersionCode=42)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.40'", "const APP_VERSION = '1.0.41'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('meal item compacted, bumped to 1.0.41');
