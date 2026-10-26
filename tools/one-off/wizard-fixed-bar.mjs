import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 1) 移除两处探针
patch('app/src/fragments/50-onboarding.fragment.js', [
  ['drop the step probe', "    const message = $('#ob-feedback');\n    feedback(message, `ob hit ${onboarding.step}`);", "    const message = $('#ob-feedback');"],
  ['drop the pointer probe',
   "  // TEMP PROBE: which element actually receives a tap in the action row?\n  document.addEventListener('pointerdown', event => {\n    const box = $('#ob-feedback');\n    if (!box || !onboarding || $('#view-onboarding')?.hidden) return;\n    const node = document.elementFromPoint(event.clientX, event.clientY);\n    box.textContent = `tap ${Math.round(event.clientX)},${Math.round(event.clientY)} -> ${node ? (node.id || node.className || node.tagName) : 'null'}`;\n  }, true);\n  $('#ob-next').addEventListener('click', obNext);",
   "  $('#ob-next').addEventListener('click', obNext);"],
]);
// 2) 固定底栏：按钮永远贴在底部、独立层、不随内容滚动
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.onboarding-actions{position:fixed')) {
  css += `
/* The wizard's actions live in their own fixed bar: whatever the page height, 下一步 is always on
   screen, never scrolled into a region that can swallow the tap. */
.onboarding{padding-bottom:calc(112px + env(safe-area-inset-bottom))}
.onboarding-actions{position:fixed;left:0;right:0;bottom:0;z-index:90;margin:0;background:var(--cream);border-top:1px solid var(--line);box-shadow:0 -6px 18px #3146310f;padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
.onboarding-actions .button{flex:1 1 auto}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  fixed action bar styles');
} else console.log('skip fixed action bar');
