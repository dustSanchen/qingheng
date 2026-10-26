const fs=require('fs');
const t=fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines=t.split(/\r?\n/);
console.log('总行数', lines.length);
const marks=[/^\/\/ ---- /,/^  \/\/ ---- /,/^\(function/,/^}\)\(/,/^  \/\*\* The three things/,/^  \/\*\* "Today's three things"/,/^  const TARGET_RULES/,/^  function renderChat/,/^  \/\/ ---- Meals that carry/,/^  const onboarding/,/^  \$\(function/,/^  loadState\(\)\.then/,/^  switchTab\(restoreTab/];
lines.forEach((line,i)=>{ for(const m of marks){ if(m.test(line)){ console.log((i+1)+': '+line.trim().slice(0,80)); break; } } });
