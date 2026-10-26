import fs from 'node:fs';
for (const f of ['meal-date-context.test.mjs','icon-style.test.mjs','auth-food-integration.test.mjs']) {
  const t = fs.readFileSync('tests/' + f, 'utf8');
  for (const line of t.split(/\r?\n/)) if (/#[0-9a-fA-F]{6}/.test(line)) console.log(f + ': ' + line.trim().slice(0, 170));
}
