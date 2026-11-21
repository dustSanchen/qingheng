/**
 * Optional target-weight band: it exists only when both bounds are real numbers,
 * is clamped to the plot, and never invents a default target.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const java = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}

const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const fmt = value => String(value);
const band = new Function('number', 'fmt', extractFunction(app, 'trendTargetBand') + '\nreturn trendTargetBand;')(number, fmt);
const y = value => (70 - value) * 10;

let markup = band({weightTargetMin: 60, weightTargetMax: 65}, y, 10, 100, 0, 100);
check('a valid target range draws one band', markup.includes('data-target-band="1"') && markup.includes('width="90"'), markup);
check('the band uses the two bounds', markup.includes('y="50.00"') && markup.includes('height="50.00"'), markup);
check('no fields means no band', band({}, y, 10, 100, 0, 100) === '');
check('an inverted range means no band', band({weightTargetMin: 65, weightTargetMax: 60}, y, 10, 100, 0, 100) === '');
check('the band is clamped to the plot', band({weightTargetMin: 50, weightTargetMax: 90}, y, 10, 100, 20, 80).includes('y="20.00"') && band({weightTargetMin: 50, weightTargetMax: 90}, y, 10, 100, 20, 80).includes('height="60.00"'));
check('the form exposes optional target bounds', html.includes('name="weightTargetMin"') && html.includes('name="weightTargetMax"'));
check('the profile payload carries target bounds', app.includes("'weightTargetMin','weightTargetMax'") || app.includes("'weightTargetMin', 'weightTargetMax'"));
check('Java validates the target range', java.includes('{"weightTargetMin", "weightTargetMax", "目标体重区间"}'));
check('the trend chart injects the band behind the data', app.includes('${grid}${targetBand}${points.length>1'));
check('the band style is a 12% accent fill', css.includes('.chart-target-band{fill:var(--accent);fill-opacity:.12'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
