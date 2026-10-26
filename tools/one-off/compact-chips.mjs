/**
 * The habit chips worked but ate nine rows. Compact them so they read as a quick picker, and put the
 * copy-yesterday action in its own place rather than as a tenth chip.
 */
import {patch} from '../lib/patch.mjs';

const css = `
/* Quick pickers: dense chips instead of full-width buttons, so a six-field form does not grow taller. */
#habit-chips,#training-advice-chips,#chat-chips{display:flex;flex-wrap:wrap;gap:6px}
#habit-chips .button,#training-advice-chips .button,#chat-chips .button{padding:6px 10px;font-size:12.5px;min-height:0;line-height:1.3;flex:0 1 auto}
`;

let styles = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!styles.includes('#habit-chips .button')) {
  fs.writeFileSync('app/src/main/assets/styles.css', styles + css);
  console.log('ok  compact chip styles appended');
} else {
  console.log('skip (already applied)  compact chip styles');
}

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'copy-yesterday moves next to the save button',
    `      + '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';`,
    `      ;
    const copyRow = $('#habit-copy-row');
    if (copyRow) copyRow.innerHTML = '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';`,
  ],
]);

console.log('habit layout tightened');
