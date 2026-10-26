import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['function trainingLibrary','function planWhy','libraryMoves(template)','suggestedNote','plan-why','plan-suggest']) console.log((app.includes(k)?'ok  ':'MISS'), k);
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
console.log('lib script tag:', html.includes('training-principles.js'));
