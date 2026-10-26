/*
 * One-off patch: load anchors.js in the page (before app.js), send the anchor summary with estimate
 * and chat requests, and push it to the native side once per session so background prompts reuse it.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [label, from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/assets/index.html', [
  ['load anchors.js', '<script src="./food-models.js" defer></script>', '<script src="./food-models.js" defer></script><script src="./anchors.js" defer></script>'],
]);

patch('app/src/main/assets/app.js', [
  [
    'estimate sends anchors',
    "const data=await api('/api/estimate',{text,allowExternal:$('#estimate-consent').checked && navigator.onLine,...(imageData?{image:imageData}:{})});",
    "const data=await api('/api/estimate',{text,allowExternal:$('#estimate-consent').checked && navigator.onLine,anchors:anchorSummary(),...(imageData?{image:imageData}:{})});",
  ],
  [
    'chat sends anchors',
    "      const data = await api('/api/chat',{question,history,date:submittedDate,allowExternal:true,webSearch:",
    "      const data = await api('/api/chat',{question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),webSearch:",
  ],
  [
    'anchorSummary helper',
    '  function previewDraft(data, form) {',
    `  /** The user's own anchor table, sent along so the model reuses the same numbers (rules.md 第五节). */
  function anchorSummary() {
    try {return window.QinghengAnchors?.summary?.() || '';} catch {return '';}
  }
  /** Stores the anchor block natively once per session so push/advice prompts can reuse it too. */
  async function syncAnchors() {
    const summary = anchorSummary();
    if (!summary) return;
    try {
      const current = await api('/api/anchors');
      if (current?.summary === summary) return;
      await api('/api/anchors', {summary});
    } catch { /* Anchors are an optimisation; never block the app on them. */ }
  }
  function previewDraft(data, form) {`,
  ],
]);

// Kick off the native sync together with the other startup work.
patch('app/src/main/assets/app.js', [
  [
    'startup syncs anchors',
    '  switchTab(restoreTab());render();connection();',
    '  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});',
  ],
]);

console.log('anchor wiring applied');
