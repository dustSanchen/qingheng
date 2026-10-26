import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/50-onboarding.fragment.js', [
  ['visible probe at the top of obNext',
   "  function obNext() {\n    const message = $('#ob-feedback');",
   "  function obNext() {\n    const message = $('#ob-feedback');\n    // TEMP PROBE: show the internal step so a dead tap can be told apart from a no-op transition.\n    feedback(message, `ob:${onboarding.step}->${onboarding.step + 1} hidden=${onboarding.step === onboarding.total}`);"],
]);
console.log('probe added');
