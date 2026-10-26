import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const anchor = '  function closeTerm() { const sheet = $("#term-sheet"); if (sheet) sheet.hidden = true; }';
if (!t.includes(anchor)) { console.log('MISS closeTerm'); process.exit(1); }

const add = [
  anchor,
  '  /** 三条关闭路径：按钮、遮罩、Esc。之前只绑了「点外部」。 */',
  '  function installTermSheet() {',
  '    const sheet = $("#term-sheet"), close = $("#term-close");',
  '    if (close && !close.dataset.wired) {',
  '      close.dataset.wired = "1";',
  '      close.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); closeTerm(); });',
  '    }',
  '    if (sheet && !sheet.dataset.wired) {',
  '      sheet.dataset.wired = "1";',
  '      sheet.addEventListener("click", event => { if (event.target === sheet) closeTerm(); });',
  '      document.addEventListener("keydown", event => { if (event.keyCode === 27) closeTerm(); });',
  '    }',
  '    const weightClose = $("#weight-close");',
  '    if (weightClose && !weightClose.dataset.wired) {',
  '      weightClose.dataset.wired = "1";',
  '      weightClose.addEventListener("click", () => { const box = $("#weight-sheet"); if (box) box.hidden = true; });',
  '    }',
  '  }',
  '  installTermSheet();'
].join('\n');

fs.writeFileSync(f, t.replace(anchor, add));
console.log('term sheet close wired');
