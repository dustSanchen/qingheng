import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
const NL = '\n';
// 搜索框接线放进 installSkinPicker（启动时必被调用）
patch('app/src/fragments/70-rest.fragment.js', [
  ['wire chat search in installSkinPicker',
   '  function installSkinPicker() {',
   ['  function installSkinPicker() {',
    '    const chatSearch = $("#chat-search");',
    '    if (chatSearch && !chatSearch.dataset.wired) {',
    '      chatSearch.dataset.wired = "1";',
    '      chatSearch.addEventListener("input", () => { chatQuery = chatSearch.value.trim(); renderChat(); });',
    '    }',
    '    if (typeof renderLastChat === "function") renderLastChat();'].join(NL)],
]);
// 每次整页渲染时刷新「上次问答」
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['refresh last chat on render',
   '    renderTrainingInsights();',
   '    renderTrainingInsights();' + NL + '    if (typeof renderLastChat === "function") renderLastChat();'],
]);
console.log('wired');
