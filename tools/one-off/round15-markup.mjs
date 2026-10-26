/**
 * 第 15 轮：三项一起做
 *  1) 缺段检测：17 点后没记午餐、21 点后没记晚餐 → 顶部提示并可一键去补
 *  2) 记录页「今日流水」：把今天发生的事按时间排成一条流水
 *  3) 今天页卡片 9 → 5：上次问答并入训练建议；身体近况/小习惯/建议 收进一个「更多」折叠
 */
import fs from 'node:fs';

let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const before = html.length;
let n = 0;

// ── 3a) 上次问答 → 并入「今日训练建议」卡（取其 button 作为卡内第二行）
const lastChatStart = html.indexOf('<article class="card" id="last-chat-card"');
const lastChatEnd = html.indexOf('</article>', lastChatStart) + 10;
if (lastChatStart < 0) throw new Error('last-chat card not found');
const lastChatBlock = html.slice(lastChatStart, lastChatEnd);
html = html.slice(0, lastChatStart) + html.slice(lastChatEnd);
const lastChatButton = (lastChatBlock.match(/<button[\s\S]*?<\/button>/) || [''])[0];
n++;
console.log('3a 移出上次问答卡', lastChatBlock.length, 'chars');

// 把按钮塞进训练建议卡末尾（在 </article> 之前）
const trainCardStart = html.indexOf('id="today-training-advice"');
if (trainCardStart < 0) {
  // 用标题定位
  const idx = html.indexOf('<h2>今日训练建议</h2>');
  if (idx < 0) throw new Error('today training card not found');
  const articleStart = html.lastIndexOf('<article', idx);
  const articleEnd = html.indexOf('</article>', idx);
  html = html.slice(0, articleEnd) + lastChatButton.replace('id="last-chat-open"', 'id="last-chat-open"') + html.slice(articleEnd);
} else {
  const articleEnd = html.indexOf('</article>', trainCardStart);
  html = html.slice(0, articleEnd) + lastChatButton + html.slice(articleEnd);
}
n++;
console.log('3a 并入训练建议卡');

// ── 3b) 身体近况 / 小习惯 / 给今天的一点建议 → 一个折叠块
const collapseTargets = ['身体近况', '今天的小习惯', '给今天的一点建议'];
let firstStart = -1, lastEnd = -1;
for (const title of collapseTargets) {
  const idx = html.indexOf('<h2>' + title + '</h2>');
  if (idx < 0) { console.log('MISS block', title); continue; }
  const s = html.lastIndexOf('<article', idx);
  const e = html.indexOf('</article>', idx) + 10;
  if (firstStart < 0 || s < firstStart) firstStart = s;
  if (e > lastEnd) lastEnd = e;
}
if (firstStart > 0) {
  const inner = html.slice(firstStart, lastEnd);
  const wrapped = '<details class="day-more" id="day-more"><summary>更多：身体近况 · 小习惯 · 今天的建议</summary>' + inner + '</details>';
  html = html.slice(0, firstStart) + wrapped + html.slice(lastEnd);
  n++;
  console.log('3b 折叠三张卡', inner.length, 'chars');
}

// ── 2) 记录页加「今日流水」卡（放在轻松记一餐之后）
if (!html.includes('id="day-stream"')) {
  const anchor = '<article class="card"><div class="card-heading"><h2>最近的餐食记录</h2>';
  const alt = html.indexOf('<h2>最近的餐食记录</h2>');
  const cardStart = alt >= 0 ? html.lastIndexOf('<article', alt) : -1;
  if (cardStart < 0) throw new Error('recent meals card not found');
  const streamCard = '<article class="card" id="day-stream-card"><div class="card-heading"><h2>今日流水</h2><span class="tag" id="day-stream-tag">按时段</span></div><div id="day-stream"></div><p class="fine-print">记录按发生时间排列；未填时间的餐食排在当天最后。</p></article>';
  html = html.slice(0, cardStart) + streamCard + html.slice(cardStart);
  n++;
  console.log('2 插入今日流水卡');
}

// ── 1) 缺段提示容器（放在时段提示下方）
fs.writeFileSync('app/src/main/assets/index.html', html);
console.log('changed:', n, '| html length', before, '->', html.length);
