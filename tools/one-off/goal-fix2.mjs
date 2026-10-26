import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf("const plan = profile.goal === 'lean'");
if (start < 0) throw new Error('plan start not found');
// 找到该语句结尾（分号 + 换行）
const semi = t.indexOf(';', t.indexOf('rules: profile', start));
if (semi < 0) throw new Error('plan end not found');

const replacement = [
  'const plan = computeTargets({',
  "          sex: profile.sex || 'male',",
  '          weight: number(profile.weight) ?? latestWeight(),',
  '          height: profile.height,',
  '          age: profile.age,',
  "          goal: profile.goal || 'recomp',",
  '          training: profile.training,',
  '          rules: profile',
  '        });'
].join('\n');

t = t.slice(0, start) + replacement + t.slice(semi + 1);
fs.writeFileSync(f, t);
console.log('intake plan computed for every goal now');
