/**
 * P0–P2（2026-11-19，用户：「完成上文P0-P2问题修复，并确保训练时间安排中包含了组间休息」）
 *
 * P0 部位只有一个来源：周计划当天的 template，排今天与问答的训练建议共用一句话。
 * P1 时长按「组数 ×（每组执行 + 该动作的组间休息）」算，提示词与界面同一口径；单次课正式组 6~10 组。
 * P2 日期文案与两套清单的关系说明。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

// --- P0 部位单一来源 -----------------------------------------------------------------------------
check('部位来源只有一个函数', training.includes('function dayTemplateSlot(date = activeDate)')
  && training.includes('function dayTemplateNote(date = activeDate)'));
check('排今天用共享那一句', rest.includes("const rotationText = typeof dayTemplateNote === \"function\" ? dayTemplateNote(activeDate) : \"\";"));
check('问答的训练建议也用同一句', rest.includes("const templateNote = typeof dayTemplateNote === 'function' ? dayTemplateNote(localDate()) : '';")
  && rest.includes("const questionWithNote = templateNote ? templateNote + '\\n' + question : question;"));
check('两处都不再各自硬编码部位名', !rest.includes("const TEMPLATE_LABEL = {push: \"推\", pull: \"拉\", legs: \"腿\"};"));

// --- P1 时长含组间休息 ---------------------------------------------------------------------------
check('每组时间取自 restSecondsFor 而不是固定值',
  rest.includes('function planItemMinutes(item)') && rest.includes('const rest = typeof restSecondsFor === "function" ? restSecondsFor(name) : 90;'));
check('旧的固定 2.5 分钟/组已移除', !rest.includes('AI_PLAN_MINUTES_PER_SET'));
check('整份清单用含休息的折算', rest.includes('const need = planMinutes(plan);'));
check('界面写明含组间休息', rest.includes('含组间休息约需 ') && rest.includes('含休息约需 '));
check('改时长按钮给的是档位而不是原始分钟', rest.includes("data-plan-minutes=\"' + planMinutesStep(need) + '\""));
check('有氧按自己的时长算，不套组次', rest.includes('const cardio = number(item && item.durationMin);'));

// --- P1 单次课组数口径 ---------------------------------------------------------------------------
check('排今天的上下文卡按部位给组数，不卡整节课',
  rest.includes('function compilePlanContext') && rest.includes('每部位组数：') && rest.includes('总组数按这个时长装'));
check('计划理由也说清是每个部位', training.includes('单次每个部位 6~10 组正式组'));
check('原生提示词也按休息折算，不再数动作个数',
  main.includes('组数按时长算，且必须把组间休息算进去') && !main.includes('动作数量按时长定：30 分钟排 4 个'));

// --- P2 日期文案与两套清单的关系 -----------------------------------------------------------------
check('今天加入按钮按所看日期取名', training.includes("这节加入"));
check('应用本周计划按所看日期取名', training.includes("应用本周计划 · 写入' + esc(dayLabel(activeDate)) + '起 "));
check('能量卡按所看日期取名', rest.includes('const noteDay = typeof dayLabel === "function" ? dayLabel(activeDate) : "今天";'));
check('两套清单有了关系说明', training.includes('两者不一致时以日志为准'));

// --- 生成物同步 ---------------------------------------------------------------------------------
check('app.js 与片段同步',
  app.includes('function dayTemplateNote(date = activeDate)')
  && app.includes('function planMinutes(items)')
  && app.includes('含组间休息约需 '));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
