import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const show = (label, needle, span = 700) => {
  const i = t.indexOf(needle);
  console.log('=== ' + label + ' @' + i);
  if (i >= 0) console.log(t.slice(i, i + span));
};
show('requireMealFields', 'requireMealFields(JSONObject record)');
show('dietSection meal line', 'md.append("- ").append(cell(optionalText(meal, "mealType")))', 900);
show('chat meals payload', '"meals", dayMeals', 400);
const k = t.indexOf('chatReply');
console.log('=== chatReply mentions:', (t.match(/chatReply/g)||[]).length);
