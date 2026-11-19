/**
 * 建议输出契约（2026-11-19，1.4.64）。
 * 用户选 B：输出改成 {verdict, actions} JSON，本地校验 + 本地渲染，不合格不回模型重试。
 * 这里只钉「契约与本地兜底」的结构，不钉模型文案。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

check('the advice prompt asks for strict JSON', prompts.includes('输出必须是严格 JSON') && prompts.includes('决策') === false);
check('the schema names verdict and actions', prompts.includes('\\"verdict\\"') && prompts.includes('\\"actions\\"'));
check('the prompt forbids markdown and code fences', prompts.includes('不要代码块') && prompts.includes('不要 Markdown'));
check('verdict and action lengths are stated', prompts.includes('不超过 40 个汉字') && prompts.includes('不超过 30 个汉字'));

check('the reply is parsed with a local validator', main.includes('private static JSONArray adviceFromReply') && main.includes('private static String clipAdvice'));
check('a malformed reply falls back to the prose parser', /adviceFromReply[\s\S]{0,1200}?adviceMessages\(text\)/.test(main));
check('verdict is clipped to 60 characters', main.includes('obj.optString("verdict", ""), 60'));
check('actions are clipped to 40 characters and capped at two', main.includes('), 40') && main.includes('actions.size() < 2'));
check('the stored summary is plain text, not raw JSON', main.includes('saveAdviceHistory(day, output, "api")') && main.includes('advicePlainText(output)'));
check('the JSON is extracted tolerantly (braces, not whole string)', main.includes('text.substring(start, end + 1)'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
