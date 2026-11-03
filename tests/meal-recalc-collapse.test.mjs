import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const css = fs.readFileSync(new URL('styles.css', root), 'utf8');

const start = app.indexOf('  const nutritionKeys =');
const end = app.indexOf('  function openItemRecalc', start);
assert(start > 0 && end > start, 'gram scaling block is delimited');
const fields = {
  grams: {value: '100'},
  calories: {value: '200', dataset: {baseValue: '200'}},
  protein: {value: '10', dataset: {baseValue: '10'}},
  fat: {value: '5', dataset: {baseValue: '5'}},
  carbs: {value: '20', dataset: {baseValue: '20'}}
};
const row = {dataset: {baseGrams: '100'}, fields};
let totalsUpdates = 0;
const ctx = {
  number: value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null,
  updatePreviewTotals: () => { totalsUpdates++; },
  $: (selector, target) => target.fields[selector.match(/data-item-field="([^"]+)"/)[1]]
};
vm.createContext(ctx);
vm.runInContext(app.slice(start, end) + '\nglobalThis.scaleEstimateItem = scaleEstimateItem;', ctx);
ctx.scaleEstimateItem(row, 150);
assert.equal(fields.calories.value, 300);
assert.equal(fields.protein.value, 15);
assert.equal(fields.fat.value, 7.5);
assert.equal(fields.carbs.value, 30);
assert.equal(totalsUpdates, 1);
ctx.scaleEstimateItem(row, 75);
assert.equal(fields.calories.value, 150);
assert.equal(fields.fat.value, 3.75, 'each edit scales from the stable original baseline');

assert.match(app, /if\(input\.dataset\.itemField==='grams'\)/);
assert.match(app, /data-base-grams/);
assert.match(app, /data-base-value/);
assert.match(app, /per100\[key\]\*grams\/100/);
assert.match(app, /四项都填写时按补充值精确换算|每 100g 的热量、蛋白质、脂肪和碳水要一起填写/);
assert.match(html, /id="item-recalc-dialog"/);
assert.match(html, /id="item-recalc-grams"/);
for (const key of ['calories', 'protein', 'fat', 'carbs']) assert(html.includes(`id="item-recalc-${key}"`));

assert.match(app, /function setupCollapsibleSections\(\)/);
assert.match(app, /body\.hidden = collapsed/);
assert.match(app, /button\.setAttribute\('aria-expanded'/);
assert.match(app, /anchor:'#food-search'/);
assert.match(app, /anchor:'#manual-meal-form'/);
assert.match(app, /anchor:'#settings-form'/);
assert.match(app, /anchor:'#push-history'/);
assert.match(app, /anchor:'#export-data'/);
assert(!/anchor:'#estimate-form'|anchor:'#push-form'/.test(app), 'core meal and push forms are not hidden by default');
// 箭头统一到通用规则：方块 + 旋转 + 展开内容过渡（2026-11-04）
assert.match(css, /details:not\(\.day-more\)>summary::after\{[^}]*border-radius:8px/);
assert.match(css, /details:not\(\.day-more\)\[open\]>summary::after\{transform:rotate\(180deg\)\}/);
assert.match(css, /details::details-content\{[^}]*transition:height/);
assert.match(css, /\.collapse-toggle/);

console.log('PASS meal recalc/collapse: stable proportional scaling, per-100g dialog, totals refresh, and reversible arrow disclosures.');
