import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/50-onboarding.fragment.js', 'utf8');
const i = t.indexOf('function markFieldInvalid');
console.log('markFieldInvalid def:', i > 0 ? t.slice(i, i + 320).replace(/\s+/g, ' ') : 'MISSING');
console.log('usages:', (t.match(/markFieldInvalid/g) || []).length);
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
console.log('aria-invalid in app:', (app.match(/aria-invalid/g) || []).length);
