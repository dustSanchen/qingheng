import fs from 'node:fs';
const f='tests/ai-upgrade.test.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace('check(\'the goal is in the chat context\', main.includes(\'context.put("goal", goal)\') && main.includes(\'context.put("goalLabel", goalText(profile))\') );',
            'check(\'the goal is in the chat context\', main.includes(\'context.put("goal", goal)\') && main.includes(\'".put("goalLabel", goalText(profile))\'));');
t=t.replace('check(\'the goal is in the chat context\', main.includes(\'context.put("goal", goal)\') && main.includes(\'context.put("goalLabel", goalText(profile))\') );'.replace(' );', '));'),
            'check(\'the goal is in the chat context\', main.includes(\'context.put("goal", goal)\') && main.includes(\'".put("goalLabel", goalText(profile))\'));');
fs.writeFileSync(f,t);
const line = t.split('\n').find(l => l.includes('the goal is in the chat context'));
console.log(line);
