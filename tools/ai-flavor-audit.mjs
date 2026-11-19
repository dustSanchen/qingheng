#!/usr/bin/env node
/**
 * "AI 味" 静态审计：只看可量化的形状、层级、装饰与文案，不评价审美高下。
 *
 * 用法：node tools/ai-flavor-audit.mjs
 * 输出：每项 PASS / WARN 与计数；WARN 不阻塞构建，用来决定下一批改哪里。
 *
 * 判定口径（与 docs/design/29-de-ai-pass.md 一致）：
 *  - 渐变只允许出现在数据可视化（能量环、进度条、目标带）里，装饰性高光算 WARN；
 *  - 阴影是「AI 味」最明显的来源：卡片层级应靠三档近底色 + 发丝线，超过 12 条就 WARN；
 *  - 全圆角胶囊（>20px）超过 8 处 WARN；
 *  - chip/tag 是同级小控件，超过 20 处就说明页面在靠徽章撑信息量；
 *  - 营销词（一键/轻松/赋能…）出现即 WARN。
 */
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const count = (text, re) => (text.match(re) || []).length;

let warn = 0;
const line = (level, label, detail) => {
  if (level === 'WARN') warn++;
  console.log(`${level.padEnd(4)} ${label}${detail === undefined ? '' : '  -> ' + detail}`);
};

const css = read('app/src/main/assets/styles.css');
const html = read('app/src/main/assets/index.html');
const app = read('app/src/main/assets/app.js');

// 1) 装饰性渐变：去掉数据可视化用的 conic/进度渐变后，剩下的才是装饰。
const gradients = count(css, /gradient\(/g);
const dataVizGradients = count(css, /conic-gradient/g);
line('PASS', '渐变总数已盘点', `${gradients}（其中数据可视化 ${dataVizGradients}）`);
line(gradients - dataVizGradients > 2 ? 'WARN' : 'PASS', '装饰性渐变不超过 2 处', String(gradients - dataVizGradients));

// 2) 阴影：卡片层级优先用底色与发丝线。
const shadows = count(css, /box-shadow/g);
line(shadows > 12 ? 'WARN' : 'PASS', '阴影声明不超过 12 条', String(shadows));

// 3) 大圆角：胶囊化越少，越不像模板。
const bigRadii = (css.match(/border-radius:\s*(2[1-9]|[3-9][0-9])px/g) || []).length;
line(bigRadii > 8 ? 'WARN' : 'PASS', '大于 20px 的圆角不超过 8 处', String(bigRadii));

// 4) 同级小控件：chip/tag 越多，页面越像仪表盘。
const chips = count(html, /class="[^"]*(chip|tag)/g);
line(chips > 20 ? 'WARN' : 'PASS', 'chip/tag 不超过 20 处', String(chips));

// 5) 毛玻璃：只允许在弹层遮罩上。
const blur = count(css, /backdrop-filter/g);
line(blur > 5 ? 'WARN' : 'PASS', '背景模糊不超过 5 处（弹层遮罩）', String(blur));

// 6) 居中堆叠：空态与对话框之外不应大面积居中。
const centered = count(css, /text-align:center/g);
line(centered > 14 ? 'WARN' : 'PASS', '居中声明不超过 14 处', String(centered));

// 7) 营销词。
const words = ['一键', '赋能', '让我们一起', '智能', '极致', '无与伦比'];
const htmlText = html.replace(/<!--[\s\S]*?-->/g, '');
const appText = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const hits = words.map(word => [word, count(htmlText, new RegExp(word, 'g')) + count(appText, new RegExp(word, 'g'))]).filter(([, n]) => n > 0);
line(hits.length ? 'WARN' : 'PASS', '没有营销词', hits.map(([w, n]) => `${w}×${n}`).join(' '));

// 8) 文案感叹号：健康产品不需要喊。
const bangs = count(html, /！/g) + count(app, /！/g);
line(bangs > 3 ? 'WARN' : 'PASS', '感叹号不超过 3 处', String(bangs));

console.log(`\nWARN total: ${warn}`);
process.exitCode = 0;
