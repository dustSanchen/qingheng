import fs from 'node:fs';
const file = 'app/src/main/assets/index.html';
let t = fs.readFileSync(file, 'utf8');
const chip = '<div class="button-row" id="training-presets" aria-label="常见动作，点一下添加"></div>';
const count = t.split(chip).length - 1;
if (count !== 2) throw new Error('expected 2 chips containers, found ' + count);
t = t.replace(chip + chip, chip);
fs.writeFileSync(file, t);
console.log('training-presets containers:', (fs.readFileSync(file,'utf8').split(chip).length - 1));
