import fs from 'node:fs';
const csv = fs.readFileSync('D:/AI/health-android/docs/design/02-mapping.csv','utf8').split(/\r?\n/).filter(Boolean);
console.log('mapping rows:', csv.length);
console.log(csv.slice(0, 6).join('\n'));
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
console.log('remaining hex in css:', hex.length);
const uniq = [...new Set(hex.map(h => h.toLowerCase()))];
console.log('distinct:', uniq.length);
