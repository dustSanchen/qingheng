import fs from 'node:fs';
const p = 'C:\\Users\\admin\\AppData\\Local\\Temp\\dsh-spill-s43M86\\session-aeb7a3dd3f04\\e8b4798ccb32-web_fetch.txt';
const text = fs.readFileSync(p, 'utf8');
const jsonText = text.slice(text.indexOf('{"code"'));
let data;
try { data = JSON.parse(jsonText); } catch { console.log('parse failed, raw len', jsonText.length); }
if (!data) process.exit(0);
const rows = (data.data || []).map(v => ({owner: v.owner && v.owner.name, mid: v.owner && v.owner.mid, title: v.title, bvid: v.bvid, sec: v.duration, view: v.stat && v.stat.view}));
console.log('related total:', rows.length);
for (const r of rows) if (r.mid === 521903482) console.log('TCY', r.bvid, r.sec, r.view, r.title);
const others = rows.filter(r => r.mid !== 521903482).slice(0, 8);
console.log('--- other UPs ---');
for (const r of others) console.log(r.owner, '|', r.title.slice(0, 40));
