/** 快速核对本轮四项改动的关键点。 */
import fs from 'node:fs';

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

const checks = {
  'sleep field exists': html.includes('name="sleep"'),
  'oil field left only in the manual form': (html.match(/name="oilSpoons"/g) || []).length === 1,
  'close button exists': html.includes('id="global-notice-close"'),
  'notice text span exists': html.includes('id="global-notice-text"'),
  'energy card above daily three': html.indexOf('energy-card') > 0 && html.indexOf('energy-card') < html.indexOf('id="daily-three"'),
  'notice auto hides in 10s': app.includes('setTimeout(hideNotice, 10000)'),
  'hideNotice clears text': app.includes('if (text) text.textContent = \'\';'),
  'close button wired': app.includes("$('#global-notice-close')?.addEventListener('click', () => hideNotice())"),
  'daily three reads sleep': app.includes('form.elements.sleep.value = number(habit.sleep)'),
  'daily three submits sleep': app.includes('...(sleep === null ? {} : {sleep})'),
  'notice styles': css.includes('.notice-close{') && css.includes('.notice[hidden]{display:none}'),
};
for (const [label, ok] of Object.entries(checks)) console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
