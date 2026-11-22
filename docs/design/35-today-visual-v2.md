# 轻衡「今天」页视觉方针 v2 · 温润现代的生活健康美学

> 状态：**已实装 1.5.18**（versionCode 518）
> 定稿依据：`C:\Users\admin\Downloads\发给 DeepSeek 的统一视觉与交互升级指令.md`（用户指定以此为准）
> 适用范围：仅「今天」页；记录 / 趋势 / 问答三页维持原规范，待下一轮评估
> 生成物：改完必须 `tools\assemble-app.ps1`，再 `node tools/test-all.mjs`（基线 111 项）

---

## 0. 本轮与旧规范的冲突处理

旧文档 §2.3 的三条禁令 **正式作废**：

| 旧禁令 | 现状 | 替代规则 |
|---|---|---|
| 不用 `box-shadow` 做卡片浮起 | 解除 | 今天页卡片改用暖绿低饱和弥散阴影，**不再用 1px 实线边框** |
| 不用渐变 | 解除 | 渐变**只允许**在进度类（能量环、宏量条）与行动罗盘上，不做装饰性铺底 |
| 不用 `backdrop-filter`（毛玻璃） | 部分解除 | **仅** Sheet / 浮层可用 `blur(12px)`；卡片与正文区仍禁用 |

保留不变：暖米白底 `#fffefa`、莫兰迪绿 `#293c32`、字号六级、4 基间距、圆角 ≤ 20、`prefers-reduced-motion` 全量降级。

---

## 1. 设计目标

**85% 温润有机质感 + 15% 克制的 AI 灵动微光。**

- 85%：纸面 → 陶瓷的层级由「底色阶梯 + 弥散阴影」建立，界面安静、低压力。
- 15%：只有「下一步」行动罗盘带一点光泽与微渐变，作为 AI 主动推荐的唯一视觉特权；其余区域保持素净。

---

## 2. 材质与层级

### 2.1 三层表面

| 层 | 用途 | 实现 |
|---|---|---|
| 纸底 | 页面 | `--paper #fffefa` |
| 面 | 主卡 | `--surface`，带 `--shadow-soft` |
| 淡面 | 胶囊、次级块 | `--surface-soft`，无阴影 |

### 2.2 阴影令牌（替代边框）

```css
--shadow-soft: 0 8px 24px -6px color-mix(in srgb, var(--ink) 6%, transparent);
--shadow-lift: 0 12px 32px -10px color-mix(in srgb, var(--ink) 10%, transparent);
```

- 颜色必须由 `color-mix(var(--ink) …)` 派生，**不写 rgba 字面量**（token-ratchet 基线锁定 12 处，超出即失败）。
- 阴影只出现在：今天页主卡、行动罗盘、Sheet 浮层。正文段落、列表行不加。

### 2.3 渐变范围

| 元素 | 渐变 |
|---|---|
| 能量环 | `conic-gradient(from 300deg, var(--ring-fill-soft) 0, var(--ring-fill) var(--progress), var(--accent-soft) var(--progress))` |
| 宏量进度条 | 双层：本色底 + `linear-gradient(90deg, color-mix(var(--paper) 55%, transparent), transparent)` 高光扫过 |
| 行动罗盘 | `linear-gradient(160deg, color-mix(var(--accent) 12%, transparent), transparent 72%)` + `inset 0 1px 0 color-mix(var(--paper) 70%, transparent)` 光泽描边 |
| 其他 | 无渐变 |

`--ring-fill-soft: color-mix(in srgb, var(--ring-green) 40%, var(--paper))`，即环的起点色由终点色向纸底提亮 40%，保证同色系。

---

## 3. 微交互

| 交互 | 规则 |
|---|---|
| 按压跟手 | 小习惯格、罗盘、快捷芯片 `:active{transform:scale(.98)}`，`transition:transform 140ms var(--ease-out-soft)` |
| 曲线 | `--ease-out-soft: cubic-bezier(.22, 1, .36, 1)` |
| 胶囊轮播 | 换文案时加 `.is-swap`，`stripSwap 180ms`：`opacity 0→1` + `translateY(2px)→0` |
| 数据过渡 | 进度条 `width` 220ms 缓动；环不加 `transition`（`conic-gradient` 角度不可过渡，靠数字滚动承担反馈） |
| 无障碍 | `prefers-reduced-motion: reduce` 下：动画 `none`、按压不缩放、进度条不过渡 |

---

## 4. 信息架构（不变）

单主卡 → 状态胶囊 → 行动罗盘 → 今日体检；页眉「换一天」与标题行「⋯」分别负责日期切换与低频设置，**间距与层级必须可区分**（换一天靠右、⋯ 在标题行右端，不并在同一行挤压）。

小习惯网格 `grid-template-columns: repeat(auto-fit, minmax(96px, 1fr))`：用户隐藏某项后，剩余格子自动等分铺满，不留空列。

---

## 5. 代码落点

| 文件 | 改动 |
|---|---|
| `app/src/main/assets/styles.css` | 末尾新增「视觉方针 v2」块：`--shadow-soft/--shadow-lift/--ease-out-soft/--ring-fill-soft`、`#view-today .card{border:0;box-shadow:…}`、`.status-strip{border:0}`、环与宏量条渐变、罗盘光泽、按压与轮播动画、`.habit-grid` 自适应、reduced-motion 降级；`换一天`/`复制一餐` 恢复可见 |
| `app/src/fragments/00-head.fragment.js` | `paintTodayStatus()` 增加 `.is-swap` 重放（`classList.remove → 强制回流 → add`） |
| `tests/today-status-strip.test.mjs` | 新增 6 条断言：阴影令牌、渐变范围、罗盘微渐变、`.is-swap` 动画、按压 `scale(.98)`、高频入口可见；旧「隐藏换一天/复制一餐」两条断言翻转 |

关键片段：

```css
#view-today .card{border:0;box-shadow:var(--shadow-soft);background:var(--surface)}
#view-today .energy-card{background:linear-gradient(180deg,var(--surface),color-mix(in srgb,var(--accent) 3%,var(--surface)))}
.status-strip{border:0}
#view-today .energy-card .slot-hint.is-next{
  border-color:var(--accent-line);
  background-image:linear-gradient(160deg,color-mix(in srgb,var(--accent) 12%,transparent),transparent 72%);
  box-shadow:inset 0 1px 0 color-mix(in srgb,var(--paper) 70%,transparent),var(--shadow-soft)}
#view-today .habit-cell:active,#view-today .slot-hint:active,#view-today .quick-chip:active{transform:scale(.98)}
.status-strip-text.is-swap{animation:stripSwap 180ms var(--ease-out-soft)}
@keyframes stripSwap{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
.habit-grid{grid-template-columns:repeat(auto-fit,minmax(96px,1fr))}
```

```js
    const textNode = $('#status-strip-text');
    if (textNode) {
      textNode.textContent = item.text;
      textNode.classList.remove('is-swap');
      void textNode.offsetWidth;   // 强制回流，保证同一条也能重播动画
      textNode.classList.add('is-swap');
    }
```

---

## 6. 验收

1. `node tools/test-all.mjs` → **111 项全绿**（含 `token-ratchet`：rgba 字面量不增长）。
2. `node tools/aesthetic-audit.mjs` → 无阻塞项（`强调色收敛` 仍为 WARN，历史遗留，非本轮引入）。
3. `node tools/entry-budget-audit.mjs` → 今天页卡片 ≤ 2。
4. 真机：卡片无 1px 实线边框、有弥散阴影；环为浅→深同色渐变；罗盘有光泽与微渐变；「换一天」「复制一餐」可见可点；点胶囊有轻微上浮淡入；按住格子有 0.98 缩放。
5. 保留隐藏节点：`#calorie-action` 与 `.check-verdict` 仍在 DOM 中（断言与导出脚本依赖）。

---

## 7. 回滚

本页只动 `styles.css`、`00-head.fragment.js` 与一个测试文件；`git revert <commit>` 即回到 v1（线框 + 无阴影）。不涉及 Java、不涉及状态 schema，用户数据零迁移。
