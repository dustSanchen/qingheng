import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['install auto recalc',
   `  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();`,
   `  installProfileAutoRecalc();
  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();`],
]);
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.row-delete{')) {
  css += `
/* The delete action sits at the end of the title row: away from the calorie number, small enough to
   keep the row height. */
.row-delete{width:32px;height:32px;min-width:32px;min-height:32px;border-radius:10px;margin-left:auto}
.row-delete .inline-icon img{width:16px;height:16px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  row delete styles');
} else console.log('skip row delete styles');
