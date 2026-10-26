import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const k of ['function libraryRuleForMetric','function librarySummary','check-rule','library:librarySummary(6)','TRAINING_PRINCIPLES.version']) console.log((app.includes(k)?'ok  ':'MISS'), k);
console.log('lib in html:', html.includes('training-principles.js'));
console.log('rules count:', (fs.readFileSync('app/src/main/assets/training-principles.js','utf8').match(/id: '/g)||[]).length);
