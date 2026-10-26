import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
t = t.replace("check('new anatomy rules exist', ['joint-mobility-first','beginner-framework','diet-template-first','canteen-takeout','fatloss-playbook'].every(id => ids.has(id)));",
  "const earlyIds = new Set(lib.rules.map(r => r.id));\ncheck('new anatomy rules exist', ['joint-mobility-first','beginner-framework','diet-template-first','canteen-takeout','fatloss-playbook'].every(id => earlyIds.has(id)));");
t = t.replace("check('new movement rules exist', ['arm-isolation','shoulder-two-parts','abs-two-moves','breathing-recovery','solo-training'].every(id => ids.has(id)));",
  "check('new movement rules exist', ['arm-isolation','shoulder-two-parts','abs-two-moves','breathing-recovery','solo-training'].every(id => earlyIds.has(id)));");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('ids scoped');
