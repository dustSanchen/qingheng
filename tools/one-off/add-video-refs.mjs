import fs from 'node:fs';
const file = 'app/src/main/assets/training-principles.js';
let t = fs.readFileSync(file, 'utf8');
// 给关键规则挂上可引用的视频（bvid + 标题 + 时长），来自已核验的合集清单
const map = {
  'split-3-rationale': {bvid: 'BV1FcdZBNEm3', title: '凯圣王-谭成义三分化①——训练计划', seconds: 1290},
  'main-lift-rpe8': {bvid: 'BV1FcdZBNEm3', title: '三分化①——训练计划（RPE 与力竭部分）', seconds: 1290},
  'isolation-failure': {bvid: 'BV1CSoKBaEgK', title: '三分化②——跟练胸肩三头', seconds: 5051},
  'progress-ladder': {bvid: 'BV1FcdZBNEm3', title: '三分化①——训练计划（进阶阶梯）', seconds: 1290},
  'pull-trap-balance': {bvid: 'BV1v5opBhEDc', title: '三分化④——跟练背三角肩后束二头', seconds: 5049},
  'leg-front-squat': {bvid: 'BV17aovBqEdg', title: '三分化⑤——跟练腿股四头肌腘绳肌', seconds: 3489},
  'joint-mobility-first': {bvid: 'BV1mM6JY6Ei9', title: '健身解剖完全手册 第1集：关节活动', seconds: 3098},
  'beginner-framework': {bvid: 'BV1Hk4y187jF', title: '健身新手的训练完全手册', seconds: 3394},
  'diet-template-first': {bvid: 'BV1yX4y1q7LP', title: '健身新手的饮食完全手册', seconds: 6646},
  'fatloss-playbook': {bvid: 'BV1AM411r7z3', title: '健身新手的减肥减脂完全手册', seconds: 3284},
  'canteen-takeout': {bvid: 'BV1794y1a7y4', title: '生活化减脂：从理论到案例 就吃食堂外卖', seconds: 2847},
  'arm-isolation': {bvid: 'BV1hyWwzeETh', title: '手臂纯享版教学', seconds: 565},
  'shoulder-two-parts': {bvid: 'BV1utntzhE9a', title: '非常详细的肩部教学', seconds: 389},
  'abs-two-moves': {bvid: 'BV1Ehn7zmEHN', title: '最推荐的两个腹肌动作', seconds: 473},
  'breathing-recovery': {bvid: 'BV1czHuzPExA', title: '训练中的呼吸与恢复、神经的作用', seconds: 450},
  'stretch-after-training': {bvid: 'BV1rh4Ne3Evt', title: '12分钟全身拉伸｜缓解酸痛', seconds: 742},
  'foam-roll-legs': {bvid: 'BV1MFzhBwE1B', title: '泡沫轴滚腿：正确臀腿放松教学', seconds: 422},
  'warmup-legs': {bvid: 'BV1ncdUBGEbS', title: '练腿前千万别直接上重量！这套热身太关键了', seconds: 324}
};
let added = 0;
for (const [id, video] of Object.entries(map)) {
  const re = new RegExp("(id: '" + id + "',[\\s\\S]*?\\n      confidence: '[^']*',)");
  if (!re.test(t)) { console.log('MISS rule', id); continue; }
  t = t.replace(re, "$1\n      video: " + JSON.stringify(video) + ',');
  added++;
}
fs.writeFileSync(file, t);
const lib = new Function('window', fs.readFileSync(file,'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('video refs added:', added, 'rules with video:', lib.rules.filter(r => r.video).length);
