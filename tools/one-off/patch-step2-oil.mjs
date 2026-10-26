/*
 * One-off patch for step 2:
 *  1. manual meal form gets a 用油 field (spoons / grams, 1 spoon = 10 g = 90 kcal);
 *  2. meal rows show the recorded oil;
 *  3. estimate previews show the ±interval and the "photo estimates under-report" warning;
 *  4. the estimate view carries oilGrams + uncertaintyPercent through to the record.
 * Fails loudly when an anchor is missing, and reports every replacement count.
 */
import fs from 'node:fs';

const htmlFile = 'app/src/main/assets/index.html';
const jsFile = 'app/src/main/assets/app.js';

const edits = [
  {
    file: htmlFile,
    label: 'manual meal 用油 field',
    from: '<label>碳水 · g<input name="carbs" type="number"',
    to: '<label>用油 · 勺（1 勺≈10 g≈90 kcal）<input name="oilSpoons" type="number" min="0" max="30" step="0.5" placeholder="炒菜可填，可留空"></label><label>碳水 · g<input name="carbs" type="number"',
  },
  {
    file: jsFile,
    label: 'manual submit adds oil once',
    from: "return {date:form.elements.date.value,mealType:form.elements.mealType.value,mealTime:manualTime,name:form.elements.name.value.trim(),mealTimeSource:'manual',...numericForm(form,['calories','protein','fat','carbs']),source:'manual',items:[]};});});",
    to: `const values=numericForm(form,['calories','protein','fat','carbs']);
      // Cooking oil is its own line: 1 spoon = 10 g = 90 kcal and 10 g fat. It is added exactly once,
      // at creation, and the amount is stored so the record stays explainable (and re-editable).
      const spoons=number(form.elements.oilSpoons.value) ?? 0;
      const oilGrams=Math.round(spoons*10);
      const oilKcal=Math.round(oilGrams*9);
      const extra=oilGrams>0?{oilGrams,oilSpoons:spoons,oilAddedKcal:oilKcal,oilAddedFat:oilGrams,
        calories:(values.calories ?? 0)+oilKcal, fat:(values.fat ?? 0)+oilGrams}:{};
      return {date:form.elements.date.value,mealType:form.elements.mealType.value,mealTime:manualTime,name:form.elements.name.value.trim(),mealTimeSource:'manual',...values,...extra,source:'manual',items:[]};});});`,
  },
  {
    file: jsFile,
    label: 'meal row shows oil',
    from: "        + `${photo ? `<span>${photo}</span>` : ''}</div></div>`",
    to: `        + \`\${oilLabel(meal)}\`
        + \`\${photo ? \`<span>\${photo}</span>\` : ''}</div></div>\``,
  },
  {
    file: jsFile,
    label: 'oilLabel helper',
    from: '  function renderMeals(container, meals, showDate) {',
    to: `  /** "用油 1 勺" when the record carries an explicit oil amount; empty otherwise. */
  function oilLabel(meal) {
    const grams = number(meal?.oilGrams);
    if (grams === null || grams <= 0) return '';
    const spoons = number(meal?.oilSpoons);
    return \`<span>用油 <b>\${spoons !== null ? fmt(spoons, 1) + ' 勺/' : ''}\${fmt(grams, 0)} g</b></span>\`;
  }
  function renderMeals(container, meals, showDate) {`,
  },
  {
    file: jsFile,
    label: 'preview carries oil + uncertainty',
    from: "      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',",
    to: `      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',
      oilGrams:number(data.oilGrams) ?? 0,uncertaintyPercent:number(data.uncertaintyPercent) ?? 15,`,
  },
  {
    file: jsFile,
    label: 'preview shows interval and under-report warning',
    from: "    $('#estimate-notes').innerHTML=(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');",
    to: `    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    const totalCalories=totalsFor(view.items).calories;
    const interval=\`估算区间：约 \${fmt(totalCalories*(1-uncertainty/100),0)}–\${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±\${fmt(uncertainty,0)}%）\`;
    const oilNote=draft.oilGrams>0?\`已计入烹调用油 \${fmt(draft.oilGrams,0)} g（约 \${fmt(draft.oilGrams*9,0)} kcal）\`:'照片无法判断用油量；如果这餐是炒菜，请补上后用油量，否则热量会偏低。';
    const lowNote='识别结果偏向低估热量，请核对份量与用油；油、酱料、主食按偏高的合理值估计更接近真实摄入。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>\`<li>\${esc(note)}</li>\`).join('');`,
  },
];

for (const edit of edits) {
  let text = fs.readFileSync(edit.file, 'utf8');
  const count = text.split(edit.from).length - 1;
  if (count !== 1) throw new Error(`${edit.label}: expected 1 anchor, found ${count}`);
  text = text.replace(edit.from, edit.to);
  fs.writeFileSync(edit.file, text);
  console.log(`ok  ${edit.label}`);
}
console.log('step-2 patch applied');
