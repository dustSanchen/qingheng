/** 快速核对：档案保存的 payload 修复是否进了打包产物。 */
import fs from 'node:fs';

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const checks = {
  'payload carries goal': app.includes('const payload={sex:form.elements.sex.value,goal,...values'),
  'training none is preserved': app.includes("rawTraining==='none'"),
  '口径 overrides are sent': app.includes('...ruleOverridesFrom(form)'),
  'lean phase start is stamped': app.includes("payload.leanPhaseStartedAt=localDate()"),
};
for (const [label, ok] of Object.entries(checks)) console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
