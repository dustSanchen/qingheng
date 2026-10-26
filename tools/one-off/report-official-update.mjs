import fs from 'node:fs';

const file = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
let t = fs.readFileSync(file, 'utf8');
let edits = 0;

const swap = (from, to, label) => {
  if (!t.includes(from)) { console.log('MISS ' + label); return; }
  t = t.replace(from, to);
  edits++;
  console.log('ok   ' + label);
};

// 1) 修正第 0 节：Opus 5.5 存在，且官方有 Claude Design 产品
swap(
`你问的是「**opus 模型的**设计语言」。严格说：

- **模型本身没有界面**。Opus 是 LLM，不存在「Opus 的视觉设计」这一实体；
- 有设计语言的是 **Anthropic 的品牌站（anthropic.com）** 与 **Claude 的产品界面（claude.ai / Claude Code）**；
- 互联网上常被混称为「Claude 风格」的，多指前者（营销站）的奶油色 + 衬线排版。`,
`你问的是「**opus 模型的**设计语言」。这里有两个必须分开的东西，混在一起会得出错误结论：

- **模型本身没有界面**。Opus 是 LLM，不存在「Opus 的视觉设计」这一实体；
- 但 Anthropic **确实有官方设计产品**——**Claude Design**（Anthropic Labs，由 **Claude Opus 4.7** 驱动），2026 年发布，做原型、幻灯片、一页纸与前端原型；
- 而互联网上常被混称为「Claude 风格」的，是 **Anthropic 品牌站**的奶油色 + 衬线排版。

**先纠正一条**：本报告初稿写的「opus 5.5 不存在」是错的。一手核实：**Claude Opus 5.5 于 2026-09-22 发布**（官网首页与 `/claude-opus-5-5` 页均可查）。它是**模型升级**，不是设计语言升级——这一点很关键，见 §5.1。` ,
  'section 0 reframe'
);

// 2) 新增 0.1：一手核实的四个事实
swap(
`## 1. 方法与来源分级`,
`## 0.1 一手核实（2026-10-26，A 级）

在官方站点做了四项可直接复核的检查：

| 检查 | 结果 | 对报告的影响 |
| --- | --- | --- |
| \`anthropic.com/brand\` | **404**（重新确认） | 官方设计令牌**不公开**；所有色值只能来自测量 |
| \`sitemap.xml\` 全量 | 无 brand / press-kit / design-system 页面 | 同上，不是「我没找到」，是「官方没发布」 |
| **Claude Design 发布页** | 存在：\`/news/claude-design-anthropic-labs\`，由 **Opus 4.7** 驱动 | 官方确实有「设计」产品，但它做的是**应用你的设计系统**，不是输出一种固定风格（§5.1） |
| \`/legal/trademark-guidelines\` | 明确禁止改动商标的**颜色、字体、比例**，禁止暗示关联或背书 | 「学风格」有合规边界：不能复制品牌资产，也不能暗示与 Anthropic 有关联（§10.1） |

## 1. 方法与来源分级` ,
  'section 0.1 facts'
);

// 3) 来源分级表补 A 级行
swap(
`| **A** | 官方一手（Anthropic 自己发布的设计规范/品牌资产） | **未取得**：\`anthropic.com/brand\` 返回 404（2026-10-25 实测） |`,
`| **A** | 官方一手（Anthropic 自己发布的页面/规范/产品说明） | ✅ \`/news/claude-design-anthropic-labs\`（设计产品说明）、\`/legal/trademark-guidelines\`（品牌使用规则）、\`/sitemap.xml\`（页面清单，用于证明「无 design-system 页」）；❌ \`/brand\` 为 404，**无公开设计令牌** |`,
  'source table A row'
);

// 4) 新增 5.1：Claude Design 暴露的设计哲学
swap(
`**关键结论**：**不要整站照搬品牌站**。营销站可以花 0.8 秒揭示一段内容，工具界面不行。可迁移的是**色彩体系、发丝线结构、字体分工、动效克制**，不是「慢」。`,
`**关键结论**：**不要整站照搬品牌站**。营销站可以花 0.8 秒揭示一段内容，工具界面不行。可迁移的是**色彩体系、发丝线结构、字体分工、动效克制**，不是「慢」。

---

## 5.1 Claude Design：官方产品暴露的「设计哲学」（A 级）

这是本报告最重要的一手材料。官方原文（\`/news/claude-design-anthropic-labs\`）里，**Opus 驱动的设计产品**是这样定义自己的：

| 官方原话（要点） | 含义 |
| --- | --- |
| 「During onboarding, Claude builds a design system for your team by reading your codebase and design files.」 | **先读你的设计系统**，而不是套用 Anthropic 的视觉 |
| 「Every project after that uses your colors, typography, and components automatically.」 | 输出必须**符合你的**色彩、字体、组件 |
| 「refine through conversation, inline comments, direct edits, or custom sliders」 | 细化靠**对话 + 行内批注 + 直接改 + 滑杆**，不是「重生成一次」 |
| 「Export anywhere … Canva, PDF, PPTX, or standalone HTML」 / 「Handoff to Claude Code」 | 设计**以可交付物为终点**，不是以截图为止 |
| 「Frontier design: code-powered prototypes with voice, video, shaders, 3D」 | 表达的上限是**能跑的原型**，不是静态视觉稿 |

**由此可以下一个结论，并且它推翻了「学一种 Claude 风格」这个前提**：

> Opus 这类模型在设计上的表达**不是某种配色或字体**，而是**「把你的设计系统读懂、并稳定地执行」**的能力。它越强，越应该收敛到你的规范，而不是露出自己的味道。

这也解释了为什么「用 AI 生成的界面看起来都像 AI」——那不是模型审美，而是**没有给它设计系统**，它只能退回默认的流行风格（圆角、渐变、居中大字）。

**对「轻衡」的直接推论**：与其不断模仿某个外部风格，不如把**自己的令牌与四层字号**写清楚（我们已做到 1.0.69），让模型有据可依——这才是让 AI 产出「像轻衡」的正确路径。`,
  'section 5.1 claude design'
);

// 5) 新增 10.1：合规边界
swap(
`## 11. 局限与待验证`,
`## 10.1 合规边界（官方商标规范，A 级）

官方 \`/legal/trademark-guidelines\` 明确：

- 不得改动商标的**颜色、字体、比例**或任何形态；
- 不得用于暗示 **Anthropic 的赞助、背书或关联**；
- 商标需事先获批，且需保持足够留白、不得加注商标符号。

**对本项目的要求**（已执行）：
1. 轻衡的界面**不复制** Anthropic 的 logo、插画、文案与品牌资产；
2. 模仿的只是**通用设计原则**（色阶分层、发丝线、单一强调色、字体分工），这些不具商标性；
3. 任何对外文案**不写**「Claude 风格」「Anthropic 同款」之类暗示关联的表述；本报告仅作比较研究。

## 11. 局限与待验证`,
  'section 10.1 compliance'
);

// 6) 局限里补充：官方无令牌已被证实
swap(
`- **无官方令牌**：\`/brand\` 404，所有色值来自第三方测量或观察，误差可能在小数级；`,
`- **无官方令牌（已证实而非推测）**：\`/brand\` 404，且 \`sitemap.xml\` 全量页面里没有 design-system / brand 页；所有色值来自第三方测量或观察，误差可能在小数级；
- **Claude Design 是研究预览**：官方页面没有给出它的设计令牌或组件规范，本报告只能提炼其**产品哲学**，不能提炼其 UI 细节；`,
  'limitations update'
);

// 7) 参考来源补 A 级
swap(
`| Anthropic 品牌页 | A（不可用） | \`anthropic.com/brand\` → **404** | 试图取官方令牌，失败 |`,
`| Anthropic 品牌页 | A（不可用） | \`anthropic.com/brand\` → **404** | 试图取官方令牌，失败 |
| **Claude Design 发布说明** | **A** | [anthropic.com/news/claude-design-anthropic-labs](https://www.anthropic.com/news/claude-design-anthropic-labs) | 官方设计产品的定位与工作方式（§5.1） |
| **Anthropic 商标规范** | **A** | [anthropic.com/legal/trademark-guidelines](https://www.anthropic.com/legal/trademark-guidelines) | 合规边界（§10.1） |
| **Anthropic 站点地图** | **A** | [anthropic.com/sitemap.xml](https://www.anthropic.com/sitemap.xml) | 证明官方无公开 design-system 页 |`,
  'sources A rows'
);

if (edits) fs.writeFileSync(file, t);
console.log('edits applied:', edits, '| new length:', t.length);
