import fs from 'node:fs';

const f = 'D:/AI/health-android/app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 1) 训练计划：没有足够记录时用「无数据」态（显式 kind，语义清楚）
const a1 = "empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。')";
const b1 = "empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty')";
if (t.includes(a1)) { t = t.replace(a1, b1); n++; }

// 2) 权限行 / 加载失败：接三态
const a2 = "if (!box) return;";
// 不盲改；改为在 renderError 处使用 error 态（见下）

// 3) 渲染出错时，用 error 态空状态替代空白
const a3 = "$('#render-error').hidden = false;";
if (t.includes(a3)) {
  t = t.replace(a3, "$('#render-error').hidden = false;\n    const errBody = $('#render-error-body');\n    if (errBody) errBody.innerHTML = empty('这一屏没能加载出来', '记录都在本机，刷新一次通常就好；反复出现请在「关于轻衡」留错误码。', 'error');");
  n++;
}

fs.writeFileSync(f, t);
console.log('三态接线:', n);

// 4) index.html 给渲染错误容器加一个 body 挂载点
const h = 'D:/AI/health-android/app/src/main/assets/index.html';
let html = fs.readFileSync(h, 'utf8');
if (!html.includes('id="render-error-body"')) {
  html = html.replace('<span id="render-error-text">页面渲染出错</span>', '<span id="render-error-text">页面渲染出错</span><div id="render-error-body"></div>');
  fs.writeFileSync(h, html);
  console.log('render-error-body 已加');
}
