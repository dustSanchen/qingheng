import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const has = (s) => app.includes(s);
console.log('installTermSheet 定义:', has('function installTermSheet'));
console.log('启动调用 installTermSheet():', has('installTermSheet();'));
console.log('绑定 term-close:', has('$("#term-close")'));
console.log('遮罩点击:', has('event.target === sheet'));
console.log('Esc 关闭:', has('keyCode === 27'));
console.log('weight-close 绑定:', has('$("#weight-close")'));
