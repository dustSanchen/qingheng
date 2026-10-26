import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
const css = `
/* Quick pickers: dense chips instead of full-width buttons, so a six-field form does not grow taller. */
#habit-chips,#training-advice-chips,#chat-chips{display:flex;flex-wrap:wrap;gap:6px}
#habit-chips .button,#training-advice-chips .button,#chat-chips .button{padding:6px 10px;font-size:12.5px;min-height:0;line-height:1.3;flex:0 1 auto}
`;
let styles = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!styles.includes('#habit-chips .button')) { fs.writeFileSync('app/src/main/assets/styles.css', styles + css); console.log('ok compact css'); }
else console.log('skip compact css');
patch('app/src/fragments/70-rest.fragment.js', [
  ['copy-yesterday row',
   `      + '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';`,
   `      ;
    const copyRow = $('#habit-copy-row');
    if (copyRow) copyRow.innerHTML = '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';`],
]);
