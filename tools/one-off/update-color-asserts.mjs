import fs from 'node:fs';
let t = fs.readFileSync('tests/graded-colors.test.mjs','utf8');
t = t.replace("check('diet bars compute a distance ratio', app.includes('const ratio = kcal > range.max') && app.includes('0.4 * (Math.abs(kcal - mid) / half)'));",
  "check('diet bars pick a colour by state', app.includes('function dietBarColor(kcal, min, max)') && app.includes('if (kcal > max) return overColor(kcal, max);'));\ncheck('in-range stays green', app.includes('function rangeColor(kcal, min, max)') && app.includes('132 + 8 * t'));\ncheck('over the cap turns red quickly', app.includes('function overColor(kcal, max)') && app.includes('max * 0.08'));\ncheck('below the floor turns amber', app.includes('function underColor(kcal, min)'));");
t = t.replace("check('volume deltas use the ramp', app.includes('goalColor(row.delta >= 0'));", "check('volume deltas use their own ramp', app.includes('function volumeColor(delta, previous)') && app.includes('volumeColor(row.delta, row.prevVolume)'));");
t = t.replace("check('it colours the delta value', app.includes('stats[1].style.color = rateColor'));", "check('it colours the delta value', app.includes('stats[1].style.color = rateColor'));\ncheck('the rate uses its own ramp', app.includes('function rateGoalColor(observed, planned)') && app.includes('rateGoalColor(observedRate, plannedRate)'));");
fs.writeFileSync('tests/graded-colors.test.mjs', t);
console.log('assertions updated');
