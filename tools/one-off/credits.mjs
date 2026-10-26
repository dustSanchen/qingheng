import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');

const block = [
  '<details class="card-notes" id="credits"><summary>参考与致谢</summary>',
  '<h3>判断依据（文献与指南）</h3>',
  '<p class="fine-print">训练与营养的判断规则标注了来源等级，主要依据：Canadian 24-Hour Movement Guidelines (2022)、ISSN Position Stand: Protein and Exercise (2017)、Helms et al. 关于能量平衡与减脂速率 (2014)、AASM 睡眠时长共识 (2015)、中国居民膳食指南 (2023)。App 内每条建议旁的「依据」即指向这些来源，等级 A~C 表示证据强度。</p>',
  '<h3>内容参考（视频频道）</h3>',
  '<p class="fine-print">动作要点、训练编排与解剖提示，参考了以下创作者公开内容，仅作为理解参考，不代表其本人观点或背书：</p>',
  '<ul class="credit-list">',
  '<li><strong>凯圣王</strong> · <a href="https://space.bilibili.com/2100737396" target="_blank" rel="noopener">哔哩哔哩主页</a> · <a href="https://www.douyin.com/search/%E5%87%AF%E5%9C%A3%E7%8E%8B" target="_blank" rel="noopener">抖音搜索</a></li>',
  '<li><strong>谭成义</strong> · <a href="https://space.bilibili.com/521903482" target="_blank" rel="noopener">哔哩哔哩主页</a> · <a href="https://www.douyin.com/search/%E8%B0%AD%E6%88%90%E4%B9%89" target="_blank" rel="noopener">抖音搜索</a></li>',
  '<li><strong>好人松松</strong> · <a href="https://space.bilibili.com/2078781964" target="_blank" rel="noopener">哔哩哔哩主页</a> · <a href="https://www.douyin.com/search/%E5%A5%BD%E4%BA%BA%E6%9D%BE%E6%9D%BE" target="_blank" rel="noopener">抖音搜索</a></li>',
  '</ul>',
  '<h3>食材数据</h3>',
  '<p class="fine-print">食材营养值来自 USDA FoodData Central（公有领域）；在线查询使用 Open Food Facts（ODbL 许可，需署名）。家常菜为示例估算，按每 100g 可食部计。</p>',
  '<h3>致谢与声明</h3>',
  '<p class="fine-print">感谢上述创作者与公开数据集的作者。轻衡与上述个人和机构无隶属、合作或代言关系；本应用不提供诊断与处方，所有建议只作为你记录的参考，具体方案请咨询专业人士。</p>',
  '</details>'
].join('');

// 插到「关于轻衡」卡的说明折叠之后（卡内）
const anchor = '</details></article>';
const cardStart = html.indexOf('<h2>关于轻衡</h2>');
const cardEnd = html.indexOf(anchor, cardStart);
if (cardEnd < 0) throw new Error('about card end not found');
if (!html.includes('id="credits"')) {
  const insertAt = cardEnd + '</details>'.length;
  html = html.slice(0, insertAt) + block + html.slice(insertAt);
  console.log('credits block inserted');
}
fs.writeFileSync(f, html);

// 样式：致谢列表
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.credit-list')) {
  css += '\n/* 致谢列表：紧凑、可点、不抢正文。 */\n' +
    '.credit-list{margin:var(--space-1) 0 var(--space-2);padding-left:1.1em;font-size:var(--text-sm);color:var(--body-text);line-height:1.8}\n' +
    '.credit-list a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--ok-line)}\n' +
    '#credits h3{margin:var(--space-3) 0 var(--space-1);font-size:var(--text-sm);color:var(--ink)}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('credits styles added');
}
