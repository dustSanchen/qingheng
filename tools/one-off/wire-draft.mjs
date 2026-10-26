import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['parse the question into a training draft',
   "    if (question.length > 2000) {feedback(message,'问题请控制在 2000 字以内。',true); return;}",
   "    if (question.length > 2000) {feedback(message,'问题请控制在 2000 字以内。',true); return;}\n    // A sentence describing finished training becomes a draft card; nothing is written until confirmed.\n    if (typeof parseTrainingDraft === 'function') {\n      const draft = parseTrainingDraft(question, activeDate);\n      if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);\n    }"],
]);
console.log('sendChat parses drafts');
