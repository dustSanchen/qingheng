import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const name of ['exercisesFor','habitRowFor','weeklyVolume','latestWeight','intakeRangeForDate','totalsFor','shiftDay','mealsForDate']) {
  const re = new RegExp('(?:function ' + name + '|const ' + name + '\\s*=)', 'g');
  const m = re.exec(app);
  console.log(name.padEnd(20), m ? 'found@' + m.index : 'MISSING');
}
console.log('--- exercisesFor ---');
const i = app.indexOf('function exercisesFor');
console.log(app.slice(i, i + 420));
console.log('--- weeklyVolume ---');
const j = app.indexOf('function weeklyVolume');
console.log(app.slice(j, j + 700));
