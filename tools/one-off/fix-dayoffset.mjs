import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/assets/app.js','utf8');
// A local date-shift helper: the module has localDate/validDate/dayTime but no day arithmetic.
const from='  const dayTime = value => validDate(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;';
if(t.split(from).length-1!==1) throw new Error('anchor missing');
const to = from + "\n  /** Calendar-day shift used by the copy-a-meal and daily-three helpers. */\n  const shiftDay = (value, days) => {const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return localDate(date);};";
t=t.replace(from,to);
const before=(t.split('dayOffset(-1)').length-1);
t=t.split('dayOffset(-1)').join('shiftDay(activeDate,-1)');
fs.writeFileSync('app/src/main/assets/app.js', t);
console.log('added shiftDay, replaced dayOffset(-1) x'+before);
