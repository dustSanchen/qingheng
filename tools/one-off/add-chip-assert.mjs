import fs from 'node:fs';
let t = fs.readFileSync('tests/training-draft.test.mjs','utf8');
t = t.replace("check('runs keep distance when the log is edited', app.includes('item.distanceKm = number(previous.distanceKm);'));",
"check('runs keep distance when the log is edited', app.includes('item.distanceKm = number(previous.distanceKm);'));\ncheck('a one-tap training chip exists', app.includes('data-chat-train'));\ncheck('the chip shows the draft immediately', app.includes('showTrainingDraft(parseTrainingDraft(sample, activeDate));'));");
fs.writeFileSync('tests/training-draft.test.mjs', t);
console.log('assertions added');
