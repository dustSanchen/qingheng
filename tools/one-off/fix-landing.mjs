import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['land on the card, not deep inside it',
   `    const block = options.block || 'center';
    field.scrollIntoView({block, behavior: 'smooth'});
    if (options.focus === false) { flashTarget(field.closest('.card') || field); return; }
    field.focus({preventScroll: true});`,
   `    const block = options.block || 'center';
    if (options.focus === false) {
      // Show the whole card (title included) instead of landing mid-form.
      const card = field.closest('.card') || field;
      card.scrollIntoView({block: 'start', behavior: 'smooth'});
      flashTarget(card);
      return;
    }
    field.scrollIntoView({block, behavior: 'smooth'});
    field.focus({preventScroll: true});`],
]);
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.45';", "const APP_VERSION = '1.0.46';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.45',[int]$VersionCode=46)", "param([switch]$Clean,[string]$Version='1.0.46',[int]$VersionCode=47)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.45'", "const APP_VERSION = '1.0.46'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('landing fixed, bumped to 1.0.46');
