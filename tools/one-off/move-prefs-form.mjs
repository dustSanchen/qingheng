import fs from 'node:fs';
const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const s = html.indexOf('<div class="plan-prefs" id="plan-prefs"');
if (s < 0) { console.log('form not found'); process.exit(1); }
const e = html.indexOf('<div class="button-row"><button type="button" class="button primary" id="pref-save">');
const endTag = html.indexOf('</div>', html.indexOf('</button>', html.indexOf('pref-edit'))) + 6;
const end = html.indexOf('</div>', endTag) + 6;
const form = html.slice(s, end);
html = html.slice(0, s) + html.slice(end);
const anchor = 'id="week-plan-card"><div class="card-heading"><h2>训练计划</h2><span class="tag" id="week-plan-tag">按上周表现生成</span></div>';
if (!html.includes(anchor)) { console.log('anchor missing'); process.exit(1); }
html = html.replace(anchor, anchor + form);
fs.writeFileSync(f, html);
const open = (html.match(/<div\b/g)||[]).length, close = (html.match(/<\/div>/g)||[]).length;
console.log('moved form above week-plan | div:', open, close, open===close?'OK':'MISMATCH');
