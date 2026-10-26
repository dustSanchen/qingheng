import fs from 'node:fs';

const p = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync(p, 'utf8');
const before = css;
let nFw = 0, nDur = 0;

// ── 1) 字重字面量 → 令牌（700/750 → bold；650/600/550 → semibold、medium 分档）
const fwMap = { '400': '--fw-regular', '500': '--fw-medium', '550': '--fw-medium', '600': '--fw-semibold', '650': '--fw-semibold', '700': '--fw-bold', '750': '--fw-bold' };
css = css.replace(/font-weight:\s*(400|500|550|600|650|700|750)\b/g, (m, v) => {
  nFw++;
  return `font-weight:var(${fwMap[v]})`;
});

// ── 2) 动效时长 → 令牌（.15→fast；.2/.22/.24→base；.26/.28/.3→slow；.75/.8→spin；1/1.1/1.6→pulse）
const durMap = { '.15': '--dur-fast', '.2': '--dur-base', '.22': '--dur-base', '.24': '--dur-base', '.26': '--dur-slow', '.28': '--dur-slow', '.3': '--dur-slow', '.75': '--dur-spin', '.8': '--dur-spin', '1': '--dur-pulse', '1.1': '--dur-pulse', '1.6': '--dur-pulse' };
css = css.replace(/((?:transition|animation)(?:-duration)?:[^;}]*?)(?<![\w-])(\.\d+|\d+\.?\d*)s\b/g, (m, head, num) => {
  const key = num.replace(/\.?0+$/, '') || num;
  const token = durMap[key] || durMap[num];
  if (!token) return m;
  nDur++;
  return m.replace(new RegExp('(?<![\\w-])' + num.replace('.', '\\.') + 's\\b'), `var(${token})`);
});

fs.writeFileSync(p, css);
console.log('字重替换:', nFw, '| 时长替换:', nDur);
console.log('剩余 font-weight 字面量:', (css.match(/font-weight:\s*\d{3}/g) || []).length);
console.log('var(--dur-) 使用:', (css.match(/var\(--dur-/g) || []).length, '| var(--fw-) 使用:', (css.match(/var\(--fw-/g) || []).length);
