import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/50-onboarding.fragment.js', [
  ['pointer probe',
   "    // TEMP PROBE: show the internal step so a dead tap can be told apart from a no-op transition.\n    feedback(message, `ob:${onboarding.step}->${onboarding.step + 1} hidden=${onboarding.step === onboarding.total}`);",
   "    feedback(message, `ob hit ${onboarding.step}`);"],
  ['log what the tap actually hits',
   "  $('#ob-next').addEventListener('click', obNext);",
   "  // TEMP PROBE: which element actually receives a tap in the action row?\n  document.addEventListener('pointerdown', event => {\n    const box = $('#ob-feedback');\n    if (!box || !onboarding || $('#view-onboarding')?.hidden) return;\n    const node = document.elementFromPoint(event.clientX, event.clientY);\n    box.textContent = `tap ${Math.round(event.clientX)},${Math.round(event.clientY)} -> ${node ? (node.id || node.className || node.tagName) : 'null'}`;\n  }, true);\n  $('#ob-next').addEventListener('click', obNext);"],
]);
console.log('pointer probe added');
