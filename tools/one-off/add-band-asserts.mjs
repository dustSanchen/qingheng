import fs from 'node:fs';
let t = fs.readFileSync('tests/graded-colors.test.mjs','utf8');
t = t.replace("check('the bar paints that colour', app.includes('background:${barColor}'));",
"check('the bar paints that colour', app.includes('background:${barColor}'));\ncheck('a band marks the acceptable range', app.includes('class=\"diet-band\" style=\"left:') && app.includes('const bandLeft = Math.max(0, Math.min(100, (range.min / scaleMax) * 100));'));\ncheck('the scale leaves headroom above the cap', app.includes('const scaleMax = Math.max(range.max * 1.08, 1);'));\ncheck('the band is explained in the caption', app.includes('浅绿带 = 当天目标区间'));\ncheck('the band sits under the fill', read('app/src/main/assets/styles.css').includes('.diet-band{position:absolute') && read('app/src/main/assets/styles.css').includes('.diet-bar i{position:relative;z-index:1'));");
fs.writeFileSync('tests/graded-colors.test.mjs', t);
console.log('band assertions added');
