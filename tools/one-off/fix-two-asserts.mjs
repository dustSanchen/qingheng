import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
const NL = '\n';
// 1) 把 renderLastChat 挪到 applyTrainingVisibility 之后，保持原有相邻关系
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['move last chat call after visibility',
   '    renderTrainingInsights();' + NL + '    if (typeof renderLastChat === "function") renderLastChat();',
   '    renderTrainingInsights();'],
]);
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['render last chat at the end of renderBody',
   '    applyTrainingVisibility();',
   '    applyTrainingVisibility();' + NL + '    if (typeof renderLastChat === "function") renderLastChat();'],
]);
// 2) 断言跟随新的两步过滤
let t = fs.readFileSync('tests/meal-date-context.test.mjs','utf8');
t = t.replace(
  "assert.match(app, /const shown = favoriteOnlyChats \\? chats\\.filter\\(row => row\\.favorite === true\\) : chats;/, 'the chat filter really filters');",
  "assert.match(app, /const baseRows = favoriteOnlyChats \\? chats\\.filter\\(row => row\\.favorite === true\\) : chats;[\\s\\S]{0,120}const shown = baseRows\\.filter\\(row => chatMatches\\(row, chatQuery\\)\\);/, 'the chat filter really filters');");
fs.writeFileSync('tests/meal-date-context.test.mjs', t);
console.log('fixed');
