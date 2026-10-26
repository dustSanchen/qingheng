import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
console.log('plan-prefs occurrences:', (html.match(/id="plan-prefs"/g)||[]).length);
console.log('week-plan:', html.includes('id="week-plan"'), '| pref-save:', html.includes('id="pref-save"'));
const i = html.indexOf('<h2>训练计划</h2>');
const cardStart = html.lastIndexOf('<article', i);
const cardEnd = html.indexOf('</article>', i) + 10;
console.log(html.slice(cardStart, cardEnd).replace(/\s+/g,' ').slice(0, 900));
