import fs from 'node:fs';

const file = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
let t = fs.readFileSync(file, 'utf8');
let edits = 0;
const swap = (from, to, label) => {
  if (!t.includes(from)) { console.log('MISS ' + label); return; }
  t = t.replace(from, to); edits++; console.log('ok   ' + label);
};

// 1) 5.2 / 5.3：外部作品实证
const SEC = [
  '---',
  '',
  '## 5.2 外部作品实证：Opus 5.5 产出的共同特征（B/C 级）',
  '',
  '### 语料',
  '',
  '| 语料 | 规模 | 采集方法 | 可信度 |',
  '| --- | --- | --- | --- |',
  '| [Claude Opus 5.5 · 100 HTML Files](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files) | 100 个自包含单文件页面 + 各自原始 prompt | 20 个并行 Opus agent，每个 5 页；每页在 1440×900 与 390×844 下截图复核；自动检查 JS 报错、网络请求、390px 横向溢出、HTML 结构 | B（有明确方法与验收清单） |',
  '| [Muzli：Opus 5.5 builds Muzli Picks-level websites](https://feed.muz.li/claude-opus-5-5-for-designers/) | 3 个工作室级 brief（产品站 / 片头动画 / 手势原型）+ 完整 prompt | 单 prompt、无参考图、无 Figma；作者逐项记录模型自检与失败 | B（过程记录详实） |',
  '| [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos)、[awesome-opus-5.5-video](https://github.com/zhuyansen/awesome-opus-5.5-video) | 视频 / 动态图形 / 3D 场景合集 | 社区汇总，附原始 prompt | C |',
  '',
  '### 反复出现的做法（不是个别现象）',
  '',
  '| 特征 | 证据 | 设计含义 |',
  '| --- | --- | --- |',
  '| **自检闭环**：写完自己截图、发现→修复→再截图 | 100 页面语料每页都在 1440/390 两个宽度复核；Muzli 案例 80 分钟无人值守、4 轮截图修复 | 这是「质量」的真正来源，不是模型审美 |',
  '| **先做设计决定，再写代码** | 未被要求，却先排了 8 组字体搭配，看完才选 Spectral（「衬线像盐结晶」） | 模型会自发做「选型」这一步，前提是 brief 给了方向 |',
  '| **把「一个记忆点」集中花掉** | 盐场站把全部大胆放在 WebGL 水面与潮位；片头把大胆放在「印刷套版」概念 | 与 Anthropic frontend-design skill 的说法一致：一个编排好的瞬间胜过满屏效果 |',
  '| **命名缓动曲线并写意图** | 输出里直接给出 rail / shunt / crank / cut 四条曲线与语义注释 | 动效变成可交接的规格，而非「让它弹一点」 |',
  '| **用可变字体轴做形变** | 网格拉伸时移动 Anybody 的宽度轴，而不是压扁字形 | 细节工艺：变形不牺牲字形结构 |',
  '| **可中断的物理** | 播放器用阻尼弹簧（0.52s / 0.76 damping，约 2.5% 过冲），拖拽中可冻结 | 交互模型比视觉更接近「用起来对」 |',
  '| **自包含交付** | 100 页全部单文件、零外部请求、零字体外链 | 交付形态就是「能直接跑的东西」 |',
  '',
  '### 官方承认的「默认制服」（关键）',
  '',
  'Anthropic 自己的文档提醒：没有设计方向时，模型会「退回少数几种默认风格」。Muzli 引述的**当前默认制服**是：',
  '',
  '> 奶油底 + 衬线 + 陶土色强调 · 标题里一个斜体单词 · 每个区块上方 01 / 02 / 03 · 药丸形按钮',
  '',
  '更早一版的制服是：Inter 字体、白底紫色渐变、极简动画。**制服在换，习惯没换。**',
  '',
  '### 这条发现对我们不利，必须直说',
  '',
  '轻衡现在的视觉（**暖米纸底 + 衬线标题 + 单一强调色**）**正好命中这份默认制服的前两项**。虽然我们用的是绿色而非陶土色、也没有 01/02/03 与药丸按钮，但仅凭「奶油 + 衬线」这两项，在 2026 年的观感里已经不足以区分于 AI 生成界面。',
  '',
  '**应对（下一轮优先级）**：',
  '1. 保留暖纸与衬线（它们确实好读），但把**区分度放在数据密度与信息结构**上——这是健康记录工具的真本事，也是默认制服最缺的地方；',
  '2. 明确禁用清单：不用 01/02/03 区块编号、不用满屏药丸按钮、不做「每段都淡入」；',
  '3. 把一个记忆点留给**数据可视化**（体重曲线、宏量环），而不是首屏大字。',
  '',
  '## 5.3 能力边界：它擅长「看起来对」，不擅长「对你对」',
  '',
  'Muzli 引用 Every 的实测：用 Every 自己的模板做幻灯片，模型**用错了 logo、把品牌绿换成深紫、还加了自创的背景插画**。结论一句：',
  '',
  '> 它更擅长「看起来对」，而不是「对你的品牌对」。',
  '',
  'Anthropic 系统卡里也写了：Opus 5.5 在「幽默与创意驾驭」这类指标上「略落后于其他模型」。也就是说，**创意判断本来就不是它的强项**。',
  '',
  '这正好解释了 §5.1 的产品设计：Claude Design 之所以要「**读你的代码库与设计文件、建出你的设计系统**」，是因为不这么做，模型只能退回制服。**设计系统的存在，就是为了让模型不必靠猜。**',
  ''
].join('\n');

swap('## 6. 动效与交互（B 级）', SEC + '\n## 6. 动效与交互（B 级）', 'section 5.2/5.3 corpus');

// 2) §9 对照表补一行：默认制服风险
swap(
  '**一句话总结取舍**：**照搬它的「秩序」，不搬它的「体温」**——奶油纸底与单一强调可以学，但绿→橙、正文衬线→无衬线这两处不学，因为健康类产品与中文小字阅读的约束不同。',
  '**一句话总结取舍**：**照搬它的「秩序」，不搬它的「体温」**——奶油纸底与单一强调可以学，但绿→橙、正文衬线→无衬线这两处不学，因为健康类产品与中文小字阅读的约束不同。\n\n**但要注意（见 §5.2）**：奶油纸底 + 衬线标题已经是 2026 年 AI 生成界面的「默认制服」，仅靠这两项不足以区分。轻衡的区分度必须来自**信息结构**（四层字号、数据等宽、发丝线分层、空状态统一）与**数据可视化**，而不是配色。',
  'section 9 uniform risk'
);

// 3) 参考来源补三条
swap(
  '| **Anthropic 站点地图** | **A** | [anthropic.com/sitemap.xml](https://www.anthropic.com/sitemap.xml) | 证明官方无公开 design-system 页 |',
  [
    '| **Anthropic 站点地图** | **A** | [anthropic.com/sitemap.xml](https://www.anthropic.com/sitemap.xml) | 证明官方无公开 design-system 页 |',
    '| **Claude Design 产品页** | **A** | [claude.com/product/design](https://claude.com/product/design) | 产品原话：读你的代码库/设计文件建系统；/design-sync 与 /design；可导出 PDF/PPTX/HTML |',
    '| **Opus 5.5 · 100 HTML Files** | **B** | [GitHub](https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files) | 100 个单文件作品的共同特征（§5.2） |',
    '| **Muzli：Opus 5.5 评测** | **B** | [feed.muz.li](https://feed.muz.li/claude-opus-5-5-for-designers/) | 3 个工作室 brief 的过程记录、官方默认制服清单、能力边界（§5.2/5.3） |',
    '| **awesome-opus5-5-videos** | **C** | [GitHub](https://github.com/yihui-dev/awesome-opus5-5-videos) | 视频/动效类产出的社区合集 |'
  ].join('\n'),
  'sources corpus rows'
);

// 4) 局限补一条
swap(
  '- **Claude Design 是研究预览**：官方页面没有给出它的设计令牌或组件规范，本报告只能提炼其**产品哲学**，不能提炼其 UI 细节；',
  '- **Claude Design 是研究预览**：官方页面没有给出它的设计令牌或组件规范，本报告只能提炼其**产品哲学**，不能提炼其 UI 细节；\n- **作品语料有选择偏差**：100 页语料与 Muzli 三个 demo 都是「被挑出来展示」的样本，不代表平均产出；失败样本没有公开统计；\n- **默认制服的清单来自二手引述**（Muzli 转述 Anthropic 文档），原始文档页面未直接抓取核对；',
  'limitations corpus'
);

if (edits) fs.writeFileSync(file, t);
console.log('edits:', edits, '| length:', t.length);
