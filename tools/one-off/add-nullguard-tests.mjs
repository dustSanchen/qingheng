import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let t=fs.readFileSync(file,'utf8');
const marker="check('already-saved null answers are repaired'";
if(!t.includes('the page hides a null-only answer')){
  const addition = [
    "",
    "// --- a null-only answer is hidden even if the stored record was never repaired ----------------------",
    "check('the page hides a null-only answer', app.includes('const answer = /^(?:[\\\\s\\\\u200b-\\\\u200f\\\\u2060\\\\ufeff]*null)+') || /null\\)\\+\\[\\\\s/.test(app));",
    "check('the page note explains what to do', app.includes('这次回答没有正确返回') && app.includes('换一个非推理模型'));",
    "check('blank detection also strips invisible characters', completionText.includes('[\\\\s\\\\p{C}\\\\p{Z}]+'));",
    "check('the versions route reports the repair count', main.includes('put(\"chatAnswersRepaired\"'));",
    "",
  ].join('\n');
  const anchor = "check('already-saved null answers are repaired'";
  t = t.replace(anchor, addition + anchor);
  const decl = "const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');";
  t = t.replace("// --- JSON nulls must never become the literal word \"null\" (the \"nullnull…\" answer) --------------------",
    "// --- JSON nulls must never become the literal word \"null\" (the \"nullnull…\" answer) --------------------\n" + decl + "\nconst completionText = completion;");
  fs.writeFileSync(file, t);
  console.log('added page-guard assertions');
} else console.log('already present');
