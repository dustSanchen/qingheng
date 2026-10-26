# 阶段 3.6 · E 组：今日页四处（A 圆环 / B 蛋白 / C 区间 / D 数字密度）

> 前置：`00-brief.md`、`01-audit.md`（#3 #4 #5 #6 #7 #8）、`02-tokens.md`、`03-components-a/b.md`。
> 本卡授予设计裁量权：只定「必须解决什么」与验收，做法自定，每个决定附一句理由。
> 证据：`docs/shots/after/today.png`、`scenes/empty-today.png`，以及 2026-10-26 22:12 真机截图（1.1.34，纸感）。
> 只写文档：**未改 `styles.css`、`app.js`、fragments**。

## 先看两个实现事实（否则下面的 diff 无从谈起）

1. `.energy-ring` 的进度色是**硬编码** `#729780`，不在任何 token 表里：

   ```css
   .energy-ring{background:conic-gradient(#729780 var(--progress),var(--accent-soft) 0);transform:rotate(-90deg)}
   ```

   这是本轮 diff 里顺带清掉的一处裸色值。

2. JS 把比例截断在 1：

   ```js
   const ratio = totals.calories !== null && number(p.calorieTarget) > 0
     ? Math.min(1, totals.calories / p.calorieTarget) : 0;
   ```

   **超量信息在进入 CSS 之前就丢了**——环永远走满即止，多吃了多少看不出来。A 的核心问题不是"缺刻度"，是这条 `Math.min`。

3. `#calorie-caption` 里"超出区间上限"的差值是用 `p.calorieTarget` 算的，而显示的上限是 `range.max`：

   ```js
   `超出区间上限 ${fmt(totals.calories - p.calorieTarget, 0)} kcal`
   ```

   目标 2,000 / 上限 2,040 时，差值是按 2,000 算出来的，比真实超出多 40。**这是口径错误，不是排版问题**，C 节一并处理。

---

## A. 能量圆环（审计 #3、#6）

**现状判定**：环只能表达"走到多少"，不能表达"目标在哪、超了多少"，且超量被 `Math.min(1, …)` 提前抹平。

### 新结构

```
.energy-body
├─ .energy-ring               112×112（窄屏）
│    进度弧（from -90deg 起）
│    ├─ 0 → 目标：--accent
│    └─ 超目标：整环转 --warn，弧保持满
│    ├─ 目标标记：12 点方向、环外 3px 处一条 2×10 的短线（--ink-soft）
│    └─ 环心：<strong>2,253</strong>          ← 只留主值
│          <span>已记录</span>              ← 单位降为辅助，不再占两行
└─ .energy-detail
     ├─ 目标行：每日目标 2,000 kcal  · 按休息日       ← 见 C 节
     ├─ 差额行：还差 132 kcal / 已超 213 kcal        ← 新，从 caption 提炼
     ├─ [＋ 记录一餐]
     └─ 空态时：环心「—」+ 一句为什么空
```

### CSS diff

```css
- .energy-ring{--progress:0deg;flex-shrink:0;width:112px;height:112px;border-radius:50%;
-   display:grid;place-items:center;
-   background:conic-gradient(#729780 var(--progress),var(--accent-soft) 0);
-   transform:rotate(-90deg)}
- .energy-ring>div{…;transform:rotate(90deg)}

+ .energy-ring{--progress:0deg;--ring-fill:var(--accent);position:relative;flex-shrink:0;
+   width:112px;height:112px;border-radius:50%;display:grid;place-items:center;
+   background:conic-gradient(from -90deg,var(--ring-fill) var(--progress),var(--accent-soft) 0)}
+ /* 目标标记：12 点方向一条径向短线，压在环的起始点上 */
+ .energy-ring::after{content:"";position:absolute;top:-4px;left:50%;width:2px;height:10px;
+   margin-left:-1px;border-radius:2px;background:var(--ink-soft)}
+ /* 超量：整环转警示色，弧已满，靠下方的差额行说明超了多少 */
+ .energy-ring.is-over{--ring-fill:var(--warn)}

- .energy-ring span{font-size:var(--text-xs);color:var(--muted);margin-top:5px}
+ .energy-ring span{font-size:var(--text-xs);color:var(--muted);margin-top:2px}
```

用 `conic-gradient(from -90deg, …)` 取代 `transform:rotate(-90deg)`，是因为旋转会把目标标记一起转走；起点参数能让环和标记各自就位，不必再给 `::after` 反向旋转。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 环直径 / 内圈 | 112 / 94（窄屏 115 / 97） | 同左，尺寸不随皮肤变 |
| 进度弧 | `--accent #3f6b4a`，对 `--paper` 6.10:1 | `#3f6b4a`，5.62:1 |
| 环底 | `--accent-soft #eef4ea` | `--accent-soft #eef3f0` |
| 超量弧 | `--warn #9e5c29` | `--warn #95602b` |
| 目标标记 | `--ink-soft #506053`（对 `--accent-soft` 5.98:1） | `#506053`，5.96:1 |
| 环心数字 | `--ink #293c32`，11.56:1 | `--ink #16181a`，17.80:1 |

### 理由

目标标记只在 12 点放一条短线，而不是给环加十道刻度：刻度回答"走到几成"，而这个环真正要回答的是"到没到、超没超"——只有一个位置需要被标记，就是终点。超量用整环变色而不是加第二段弧：两段弧要在 112px 里再分颜色，视觉上会糊成一团；而"环变橙"是一个不需要读文字就能接收的信号，具体超了多少交给下方一行数字。环心去掉「已记录 kcal」的 `kcal`，是因为它和"目标多少 kcal"重复出现两次，而环本身就是"已记录"的意思。

---

## B. 蛋白缺口：从数学等价改成一餐建议（审计 #4、#7）

**现状判定**：`还差 29 g ≈ 白灼虾 155 g（或水煮蛋 5 个）` 是一次单位换算题，不是一个建议——没有哪顿晚餐是 155 g 白灼虾。

### 新结构

```
.energy-action
├─ 主建议（≤2 行，22em 断行）
│   今天还差 29 g 蛋白，晚饭加一份 150 g 鸡胸或 3 个蛋就够。
├─ ▸ 更多提示（details，默认收起）
│   脂肪已超 44 g：剩下的菜改白灼或清蒸。
│   热量已超上限 213 kcal：不再加餐。
```

### CSS diff

```css
+ .energy-action{display:flex;flex-direction:column;gap:var(--space-1);margin:var(--space-2) 0 0}
+ .energy-action p{margin:0;max-width:22em;font-size:var(--text-sm);line-height:1.55;color:var(--body-text)}
+ .energy-action b{font-weight:var(--fw-semibold);color:var(--ink);font-variant-numeric:tabular-nums}
+ .energy-more{margin:var(--space-2) 0 0;padding-top:var(--space-2);border-top:1px dashed var(--line)}
+ .energy-more summary{cursor:pointer;font-size:var(--text-xs);color:var(--muted)}
+ .energy-more p{margin:var(--space-1) 0 0;max-width:22em;font-size:var(--text-xs);color:var(--muted)}
```

`max-width:22em` 与 D 组第二节的行宽规则一致（18–24 字/行）；这一行之前在 1440 宽下会拉成 30 字以上。

### 建议份量的上限依据

- **单一食材 ≤300 g**：按常见一餐蛋白主食的份量，鸡胸 150–200 g、鱼虾 150–200 g、蛋 2–3 个都是"一顿能吃完"的量级；300 g 是这条线之上还不会让人皱眉的上限。
- **蛋白 20–40 g / 餐**：按 0.4 g/kg 体重 × 50–100 kg 的区间取整，也和"每餐 20–40 g 蛋白"的通行建议吻合。
- 缺口超过 40 g 时**不再给单份建议**，改为"分两餐补"或引导先补记录，避免又变成 624 g 那种数字。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 主建议正文 | `--body-text #3d3d3a`，10.71:1 | `#3a3d3c`，10.98:1 |
| 关键数字 | `--ink #293c32` | `#16181a` |
| 折叠提示 | `--muted #667169`，5.00:1 | `#6a6d6b`，5.23:1 |
| 分隔虚线 | `--line #e4e9df` | `--line #dfe3e8` |

### 理由

把"换算"换成"一餐"，是因为前者要求用户做一次心算再换算成购买量，后者只要求他打开冰箱。同时满足"≤2 种食物、≤300 g"这条验收，就必须放弃"或"字结构——"或"意味着选择，而读者在这一步最不想做的就是选择。脂肪与热量那两条仍然保留，但下沉到 details：它们和蛋白建议是三个方向的指令，同时摆在正文里，用户只会记得最后读到的那一条。

---

## C. 目标区间：一个数、标明依据、去掉假精度（审计 #5、#8）

**现状判定**：同屏一个 `2,000~2,040` 的区间，既没说按训练日还是休息日，40 kcal 的带宽又造出估算根本达不到的精度；且"超出多少"是按目标值而非上限算的。

### 新结构

```
目标行（.energy-target，单行，可换行）
  每日目标      2,000 kcal      按休息日 ±2%
  └ 标签        └ 主值(唯一)    └ 依据 + 容差，字小一档
差额行（.energy-delta）
  还差 132 kcal  /  已超 213 kcal     ← 与目标行同一口径
```

- 带宽不再写成两个数相加，改成「目标值 + 容差标识」：`2,000 kcal` 后面跟 `±2%`，把 40 kcal 的来历说清楚。
- 依据标签跟着日期走：该日标记为训练 → `按训练日`，否则 `按休息日`，不标则 `按默认`。

### CSS diff

```css
- .energy-detail p{font-size:var(--text-sm)}

+ .energy-target{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--space-1) var(--space-2);margin:0}
+ .energy-target>span{font-size:var(--text-xs);color:var(--muted)}
+ .energy-target strong{font-size:var(--text-lg);font-weight:var(--fw-semibold);
+   font-variant-numeric:tabular-nums;color:var(--ink)}
+ .energy-target small{font-size:var(--text-xs);color:var(--ink-soft)}
+ .energy-delta{margin:var(--space-1) 0 0;font-size:var(--text-sm);
+   font-variant-numeric:tabular-nums;color:var(--body-text)}
+ .energy-delta.is-over{color:var(--warn)}
```

`.energy-detail p{font-size:var(--text-sm)}` 这条整条删掉：它现在同时压着目标行、差额行和建议行，三行都该有自己的字号。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 目标主值 | `--ink #293c32`，11.56:1 | `#16181a`，17.80:1 |
| 标签 / 容差 | `--muted` 5.00:1 / `--ink-soft` 5.98:1 | `--muted` 5.23:1 / `--ink-soft` 5.96:1 |
| 差额（未超） | `--body-text #3d3d3a` | `#3a3d3c` |
| 差额（超过） | `--warn #9e5c29` 对 `--surface` 5.14:1 | `#95602b`，5.27:1 |

### 理由

把区间降级成"目标 + 容差"，等于承认这个数字是估算——`±2%` 明确说了"我们知道它不准，误差大概这么大"，比两个精确到 10 kcal 的端点更可信。依据标签必须与数字同时出现且成对更新，是因为审计 #5 的成因就是"数字变了、依据没变"：用户看到 2,000~2,150 和 2,000~2,040，无法判断是数据不同还是口径不同。差额行独立出来，是为了让"还差多少 / 超了多少"成为可扫的一行，而不是埋在 60 字的一句话里。

---

## D. 数字密度（贯穿 A/B/C）

**现状判定**：一张能量卡里出现 2,253 / 2,000~2,040 / 3 餐 / 132 kcal / 29 g / 155 g / 5 个 / 44 g / 213 kcal —— 九组数字，读者只会记住最后一个。

### 新结构

| 卡片 | 改后保留的数字 | 数量 |
|---|---|---|
| 今日能量 · 环 + 目标行 | 摄入、目标、差额 | 3 |
| 今日能量 · 建议 | 一个蛋白缺口（其余进 details） | 1 |
| 宏量三格 | 蛋白 / 脂肪 / 碳水各一 | 3（彼此独立成格，不叠加阅读） |

规则：

1. 每张卡片**主数字只留 1 个**（能量卡 = 环心摄入值），其余降一档字号。
2. 正文里**不超过 3 组**数字；超出的进 `details`。
3. 数字与单位间加 `white-space:nowrap`（`.energy-target strong`、`.energy-delta`、`.energy-action b` 都已带 `font-variant-numeric:tabular-nums`）。

### CSS diff

```css
+ /* 主值 / 辅助值只差一档字号，靠字重和颜色分主次，不靠再加字号 */
+ .energy-ring strong{font-size:21px}          /* 保持，主值 */
+ .energy-target strong{font-size:var(--text-lg)}   /* 辅助，小一档 */
+ .energy-delta{font-size:var(--text-sm)}           /* 再小一档 */
+ .energy-action b{font-size:inherit}               /* 建议里的数字不放大 */
```

### 两套皮肤取值

字号与层级两套皮肤**完全相同**；账本只换颜色与圆角，不改字号（`--text-*` 两套同值，见 `02-tokens.md`）。

### 理由

数字密度的病根不是"数字太多"，而是**所有数字一样大**。压数量会丢信息（用户确实想知道脂肪超了多少），压层级只丢注意力——所以先做字号分层，再把次要的两条下沉到 details。宏量三格不动：它们是三个并列指标，各自一个数字，读者不会把 `148 g / 62 g / 210 g` 累加成九个数。

---

## 需 JS 配合（4 项，均未改动代码）

| # | 需要什么 | 现有数据/接口 | 要改的地方 |
|---|---|---|---|
| 1 | 不截断的超量比例 | `10-rich-answer.fragment.js` L172 `Math.min(1, totals.calories / p.calorieTarget)` | 改传原始 `ratio`，并在 `ratio >= 1` 时给 `#energy-ring` 加 `is-over`；`--progress` 仍按 `min(1, …)` 算角度 |
| 2 | 目标行的单值 + 容差 + 依据 | `p.intakeRange{min,max,basis}`、`p.calorieTarget` | `#calorie-target` 只输出单值；`basis` 需要映射成「训练日 / 休息日 / 默认」三个词，现在靠 `basis.startsWith('当天标记为训练')` 猜，建议由 `effectiveProfileForDate` 直接给出 `basisLabel` |
| 3 | 差额行的口径修正 | 同上 | `#calorie-caption` 的「超出」差值必须用 `range.max` 而非 `p.calorieTarget`；同时把 caption 拆成「差额行」与「为什么空」两段 |
| 4 | 一餐建议与折叠分组 | 食物库 `_dishes.js` / `food-models.js`、`p.proteinMin` | 新增按蛋白缺口选一份 ≤300 g 食材的逻辑；把脂肪/热量两条移入 `.energy-more` details；缺口 >40 g 时改为"分两餐补" |

四项都不改 `app.js`，按第 4 步交互轮统一落地。

---

## 验收对照

| 任务卡条目 | 标准 | 本方案如何满足 |
|---|---|---|
| A-1 环上有目标标记 | 一眼看出差多少 / 有没有超 | 12 点径向短线标终点；超量整环转 `--warn` |
| A-2 中心只留主值 | 说明文字降到环下 | 环心只留数字 + 「已记录」，`kcal` 与目标行合并 |
| A-3 空数据给原因 | 不只留「—」 | 环心「—」+ caption 首句「还没有餐食记录，摄入量未知。」 |
| A-4 超量语义色写清 | 用 `--warn` 还是 `--danger`、阈值多少 | 用 `--warn`；阈值 `ratio >= 1`；`--danger` 留给真实错误，超吃不是错误 |
| B-1 可执行的一餐建议 | 不是数学等价 | 改成「150 g 鸡胸或 3 个蛋」 |
| B-2 不叠加「≈」与括号 | 一条 ≤2 行 | 单句、无括号、22em 断行 |
| B-3 单食材 ≤ 合理一餐份量 | 上限自定并说明依据 | ≤300 g，依据见 B 节 |
| B-4 数据不足时引导补齐 | 不硬算 | 缺口 >40 g 或蛋白未记录时不进入建议分支 |
| C-1 同屏一个区间且标依据 | — | 单值 + `按休息日`，label 与数字同步更新 |
| C-2 消除假精度 | 目标值 + 容差或取整到 50 | `2,000 kcal ±2%` |
| C-3 切换时数字与标签成对变 | — | 由同一个 `basisLabel` 驱动 |
| D-1 每卡主数字 1 个 | 其余降级或折叠 | 能量卡主值 = 环心摄入 |
| D-2 每卡 ≤3 组数字 | — | 环 + 目标 + 差额 = 3；建议 1；其余进 details |
| D-3 数字与单位不拆行 | — | `tabular-nums` + `white-space:nowrap` |

## 未覆盖 / 需要真机判断

1. **账本皮肤下环的对比**：超量时 `--warn` 弧与 `--accent-soft` 底的对比只有 4.67:1（文字级达标，图形级富余），但视觉上橙绿相邻是否刺眼，需截图判断。
2. **112px 环里放目标标记**：短线在 112px 直径下只有 10px 长，小屏上是否可见需实测；若不可见，退到 120px 环。
3. **缺口 >40 g 的分两餐文案**：需要食物库配合，文案在 JS 落地时才能定稿。
4. **空态与有数据态的目标行**：空态也用「目标 + 容差」还是只写「先记录一餐」——本方案取后者，需与 `scenes/empty-today.png` 对照确认。

## 修复记录（1.1.35）

开头那三条实现事实已修，不再是待办：

| # | 原问题 | 改法 | 验证 |
|---|---|---|---|
| 1 | `Math.min(1, …)` 截断超量 | 拆成 `rawRatio` 与 `ratio`；**改两段式**（1.1.36）：环的 0–300° 是目标、300–360° 留给超出，绿色段不变，超出部分才用 `--warn` 棕红，超出越多那段越长（满 60° 封顶） | 2,253 / 2,000 时绿 300° + 棕红 45.5°（真机截图确认） |
| 2 | `.energy-ring` 硬编码 `#729780` | 改 `var(--ring-fill)`，默认 `--accent`，`.energy-ring.is-over` 切 `--warn` | 全表已无 `#729780` |
| 3 | 「超出区间上限」的差值用 `calorieTarget` | 提前解出 `floor` / `cap`（有区间时取 `range.min` / `range.max`），差额统一按 `cap` 算 | 2,253 / 上限 2,040 显示「超出 213」；旧口径会算成 253，差 40 |

连带改动：`#calorie-action` 里原本也叫 `cap` 的局部量改名 `actionCap`，避免与新的 `cap` 撞名后被覆盖。

**1.1.36 把「整环变色」改成两段式**（原 A 节写的是整环转 `--warn`）：用户要求超出部分才变棕红。现在 `--progress` 满打满算只到 300°，`--over` 从 300° 起按超出的比例延伸到 360°。代价是**达标时绿环也停在 5/6 处**，右侧留 60° 底色——没有目标刻度线的话，容易被读成「还没吃够」。补一条目标标记（A 节原本就规划的 12 点径向短线，改到 300° 位置）可以消掉这个歧义，但需要把 `transform:rotate(-90deg)` 换成 `conic-gradient(from …)` 才能给标记精确定位。这条留到交互轮和 A 节一起做。

「需 JS 配合」4 项里，第 1、3 项随之完成；第 2 项（目标单值 + 容差 + 依据标签）与第 4 项（一餐建议 + 折叠分组）仍待交互轮，属于设计落地而非缺陷修复。
