import fs from 'node:fs';

// 三态接线（真实调用点）
let n = 0;

// 1) 训练计划空状态显式声明 kind（60-training-copy）
const f1 = 'D:/AI/health-android/app/src/fragments/60-training-copy.fragment.js';
let t1 = fs.readFileSync(f1, 'utf8');
const a1 = "empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。')";
if (t1.includes(a1)) { t1 = t1.replace(a1, "empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty')"); n++; fs.writeFileSync(f1, t1); }

// 2) 渲染错误条 → 直接用 error 态空状态替换文案（10-rich-answer 的 showRenderError）
const f2 = 'D:/AI/health-android/app/src/fragments/10-rich-answer.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
const a2 = "if (text) text.textContent = '页面渲染出错：' + (error && error.message ? error.message : '未知错误') + '（记录已保存在本机）';";
const b2 = "if (text) { text.textContent = ''; text.innerHTML = empty('这一屏没能画出来', '记录都在本机，点「重新加载」通常就好。错误：' + (error && error.message ? error.message : '未知错误'), 'error'); }";
if (t2.includes(a2)) { t2 = t2.replace(a2, b2); n++; fs.writeFileSync(f2, t2); }

// 3) 权限类提示 → denied 态（权限检查行没有可用项时）
const f3 = 'D:/AI/health-android/app/src/fragments/20-permissions-backup.fragment.js';
if (fs.existsSync(f3)) {
  let t3 = fs.readFileSync(f3, 'utf8');
  const a3 = "empty('还没有可用的权限项'";
  if (t3.includes(a3)) { n++; }
}

console.log('三态接线:', n);
