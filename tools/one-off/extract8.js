const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const i=html.indexOf('id="onboarding"');
const t=html.slice(i-60, html.indexOf('id="view-profile"'));
console.log('=== onboarding 结构（去标签）===');
console.log(t.replace(/<[^>]+>/g,'|').replace(/\|+/g,'|').slice(0,1200));
console.log('=== onboarding 步骤与要点 ===');
console.log([...t.matchAll(/data-step="(\d+)"|id="(ob-[a-z-]+)"/g)].map(m=>m[1]||m[2]).join(' '));
