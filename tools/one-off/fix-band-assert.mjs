import fs from 'node:fs';
let t = fs.readFileSync('tests/graded-colors.test.mjs','utf8');
t = t.replace("read('app/src/main/assets/styles.css').includes('.diet-bar i{position:relative;z-index:1')", "read('app/src/main/assets/styles.css').includes('.diet-bar i{z-index:1') && !read('app/src/main/assets/styles.css').includes('.diet-bar i{position:relative')");
fs.writeFileSync('tests/graded-colors.test.mjs', t);
console.log('assertion updated');
