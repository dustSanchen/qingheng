# 阶段 3 · 组件规范 A 组：卡片、列表行、分段控件

> 前置：`02-tokens.md`（本轮补登记后 56 个 token；B 组后为 57）、`02-mapping.csv`。只给规范与 diff 片段，**未改 `styles.css`**。
> 对比度底色：纸感 `--surface #fffdf7` / `--paper #fffefa`；账本 `--surface #ffffff` / `--paper #f2f5f7`。

## 0. 先解决的三处遗留（已回写 `02-tokens.md` §0）

| # | 问题 | 处理 | 结果 |
|---|---|---|---|
| 1 | L3–L47 的 `--paper/--ink/--muted/--line` 被 L50 `:root` 覆盖 | 现值一律取**实际生效值**：纸感 `--paper #fffefa`、`--ink #293c32`、`--muted #7c897f`、`--line #e4e9df`；L3–L47 原值标「未生效/历史」，建议删除 | 表内所有「现值」已换口径 |
| 2 | `var(--card,#fff)` 回退恒生效（`--card` 未定义） | 实际是 2 处背景（`.check-row` L260、`.training-row` L285），另 5 处是 `--card-pad/--card-gap`，不受影响。统一改为 `var(--surface)` | 纸感由纯白 → `#fffdf7`（ΔE00 1.6，与卡片同底）；账本 `--surface` 本就是 `#ffffff`，**无变化，成立** |
| 3 | `--ink-soft` 与账本 `--muted` 同深 | 目标由 `#5c6e5f` 调深为 **`#506053`**（L\* 39.1），两皮肤同值 | 账本 ΔL\* = 6.7、纸感 ΔL\* = 7.5（对修正后的 `--muted`），均 ≥6；对比度最低 5.96:1 |

连带修正（约束「正文 ≥4.5」所迫，不是新增需求）：

- 纸感 `--muted #7c897f` 在 `#fffdf7` 上只有 **3.60:1**，全站 73 处 `var(--muted)` 不达标 → 改为 **`#667169`**（4.54:1，色相不变）。账本 `#6a6d6b` 已 4.77:1，不动。
- 焦点色 `#78a992` 只有 2.64:1 → **`--ring-focus-color: #5b8e76`**，在 8 种底色（两皮肤 paper/surface/soft）上最低 3.36:1。`--ring-focus-color-soft #a9c6b3` 只作输入框静态描边加深，不再承担焦点指示。
- `--accent` 不动（`#3f6b4a`）。

## 1. 卡片 `.card`

**何时用**：内容需要标题 + 独立操作、且同屏 ≤3 个同类块时用卡片；同类块超过 3 个、或块内只有一行信息，改用列表行。卡片内不再嵌卡片（`.advice-card`、`.soft-card` 只换底色，不加第二层边框）。

**token 取值**

| 属性 | 纸感 | 账本 |
|---|---|---|
| 背景 | `--surface` #fffdf7 | `--surface` #ffffff |
| 强调卡背景（`.soft-card`/`.advice-card`） | `--accent-soft` #eef4ea | `--accent-soft` #eef3f0 |
| 描边 | `1px solid var(--line)` #e4e9df（装饰，豁免 3:1） | 同左 #dfe3e8 |
| 圆角 | `--shape-card-radius` 16px | 5px |
| 内边距 / 卡间距 | `--card-pad` 16px / `--card-gap` 12px | 13px / 9px |
| 投影 | `--elev-1`（1px 发丝影） | `none` |
| 标题 | `--font-display`、`--text-lg`、`--fw-regular`、`--ink` | `--font-ui`、`--text-md`、`--fw-semibold`、`--ink` |
| 正文 / 次要文字 | `--body-text` / `--muted` | 同左 |

**CSS diff**（只列变动行）

```diff
- .card{…;border-radius:var(--radius-lg);padding:var(--card-pad);margin-bottom:var(--card-gap)}      /* L51 */
- .card{padding:var(--space-4);margin-bottom:var(--space-3);border-radius:var(--radius-lg)}           /* L435 */
- .card{border-color:var(--line);box-shadow:0 1px 0 rgba(30,30,26,.035),0 8px 24px -18px rgba(30,30,26,.18)}  /* L497 死代码 */
- .card{background:var(--surface);border:1px solid var(--line);box-shadow:none}                      /* L510 */
- .card{padding:var(--card-pad);margin-bottom:var(--card-gap)}                                       /* L594 */
- .card{border-radius:var(--shape-card-radius);box-shadow:var(--shape-card-shadow)}                  /* L806 */
+ .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--shape-card-radius);
+       padding:var(--card-pad);margin-bottom:var(--card-gap);box-shadow:var(--elev-1)}
- .soft-card{background:linear-gradient(140deg,#e9f1e5,#eff4e9)}
+ .soft-card{background:var(--accent-soft)}
- .advice-card{background:#f3f4e9}
+ .advice-card{background:var(--accent-soft)}
- [data-skin="ledger"] .card{border-radius:var(--radius-lg)}       /* L582，被 L806 覆盖，删 */
- [data-skin="ledger"] .card{border-width:1px}                     /* L822，与 L821 重复，删 */
```

`.card` 现有 6 条同名规则，合并成 1 条；`.card-heading` 的 5 条（L51/L436/L487/L709/L831）同理，只保留 `margin-bottom:var(--space-3)`，账本覆盖为 `var(--space-2)`。

**可访问性**

- 卡片本身不可点，无触达要求；卡内按钮另见 B 组。
- 文字对比：标题 `--ink` 11.56:1（纸感）/ 17.80:1（账本）；次要文字 `--muted` 修正后 4.54:1 / 4.77:1；强调卡上 `--muted` 4.54:1 / 4.66:1。**达标。**
- 描边 1.21:1 / 1.29:1：卡片边界不是交互控件，按决定豁免。
- `.soft-card` 渐变两端与 `--accent-soft` 的 ΔE00 为 1.5 / 0.6，改纯色肉眼无差。

## 2. 列表行 `.list-row` / `.meal-row` / `.check-row` / `.hub-row`

**何时用**：同类条目 >3 条、每条 1–2 行文字时用列表行；要整行点进详情用 `.hub-row`（带箭头、有边框）；只展示、靠长按出菜单用 `.meal-row`；带状态（已开/未开/待办）用 `.check-row`。行与行之间只用分隔线，不再每行加边框——**`.check-row` 例外**，因为它的边框承担状态指示。

**token 取值**

| 属性 | 纸感 | 账本 |
|---|---|---|
| 行高下限（可点行） | `--btn-h` 48px | 48px |
| 内边距（上下） | `--space-3` 12px | `--space-2` 8px |
| 分隔线 | `1px solid var(--line)`（装饰，豁免） | 同左 |
| 圆角（独立行） | `--shape-row-radius` 12px | 4px |
| 背景（`.check-row`、`.training-row`） | `--surface` #fffdf7 | `--surface` #ffffff |
| 可点行边框（`.hub-row`） | `--line-strong` #858e83 | `--line-strong` #878e97 |
| 悬停 / 按下底 | `--accent-soft` #eef4ea | `--accent-soft` #eef3f0 |
| 主文字 / 次要文字 | `--ink` / `--muted` | 同左 |
| 行内标签、数值强调 | `--ink-soft` #506053 | `--ink-soft` #506053 |
| 状态：完成 / 未完成 | 边框 `--ok` / 虚线 `--line-strong` | 同左 |
| 末尾箭头 | `--muted` | 同左 |

**CSS diff**

```diff
- .check-row{…;border:1px solid var(--line,#e3e7e2);…;background:var(--card,#fff)}
+ .check-row{…;border:1px solid var(--line-strong);…;background:var(--surface)}
- .check-row.ok{border-color:var(--accent,#44755d)}
+ .check-row.ok{border-color:var(--ok)}
- .check-row.todo{border-style:dashed}
+ .check-row.todo{border-style:dashed}                                  /* 不变，颜色随 --line-strong */
- .check-row .row-meta{…;opacity:.8}
+ .check-row .row-meta{…}                                              /* 去 opacity，见可访问性 */
- .training-row{…;border:1px solid var(--line,#e3e7e2);…;background:var(--card,#fff);…}
+ .training-row{…;border:1px solid var(--line);…;background:var(--surface);…}
- .training-row .row-meta{…;opacity:.85}
+ .training-row .row-meta{…}
- .hub-row{…;border:1px solid var(--line);border-radius:18px;background:var(--paper);…;box-shadow:var(--shadow)}
+ .hub-row{…;min-height:var(--btn-h);border:1px solid var(--line-strong);background:var(--surface);box-shadow:var(--elev-1)}
- .hub-row:active{background:#f4f8f2}
+ .hub-row:active{background:var(--accent-soft)}
- .hub-arrow{…;color:#b3bdb2;…}
+ .hub-arrow{…;color:var(--muted);…}
- button.food-result.list-row:hover{background:#f2f7f1}
+ button.food-result.list-row:hover,button.food-result.list-row:active{background:var(--accent-soft)}
- .row-meta b{font-weight:600;color:#5c6e5f}
+ .row-meta b{font-weight:var(--fw-semibold);color:var(--ink-soft)}
- .meal-row strong{font-size:14px;font-weight:550;…}
+ .meal-row strong{font-size:var(--text-md);font-weight:var(--fw-medium);…}
- .meal-row{…;padding:16px 0;…}
+ .meal-row{…;padding:var(--space-3) 0;…}
```

`.hub-row` 的 `border-radius:18px` 已被 L810 的 `--shape-row-radius` 覆盖，删掉死值。

**可访问性**

- 触达：`button.food-result.list-row` 已有 `min-height:var(--btn-h)`（48px）。`.hub-row` 目前靠内边距撑到约 54px，补 `min-height` 防字号变小时塌陷。`.meal-row` 只支持长按，**未达标**：长按是唯一入口，没有可见按钮替代，读屏与开关控制用户无法操作；需在 B 组或交互层补一个「更多」按钮，本组只记录。
- 对比：`.check-row .row-meta` 的 `opacity:.8` 叠在 `--muted` 上，纸感降到 **2.66:1**、账本 3.47:1，**未达标** → diff 中去掉 opacity，层级改用字号区分。`--ink-soft` 5.96:1 起。`.hub-arrow` 原 `#b3bdb2` 1.92:1 → `--muted` 4.54:1（箭头是唯一的「可进入」提示，按非文本 3:1 计也需更深）。
- 控件边界：`.hub-row` 是 `<button>`、`.check-row` 承载状态，按决定 1 属**交互控件边界**，原 `--line` 1.21:1 不达标 → 新增 `--line-strong`（纸感 #858e83 3.33:1，账本 #848b95 3.44:1；B 组为满足 `--accent-soft` 底由 #878e97 加深）。`.training-row` 是表单分组容器，边界不承担操作，豁免，用 `--line`。`.check-row.ok` 的 `--ok` 4.87:1 / 6.11:1。
- 焦点：可点行走全局 `:focus-visible`，`outline:2px solid var(--ring-focus-color)` + `outline-offset:2px`，3.36:1 起。L51 的 `button:focus-visible…{outline:3px solid #78a992}`（特异性 0,1,1）压过 L483 的 `:focus-visible{outline:2px solid var(--accent)}`（0,1,0），可点行实际是 **3px #78a992**（2.64:1）；两条合一为 `--ring-focus-color`，见 B 组 §2。

## 3. 分段控件 `.segment-bar` / `.segment`

**何时用**：同一页里 2–5 个**互斥且同级**的视图切换时用（记录页分类、趋势页分类）；选项会改变数据而不是切视图时用表单单选；超过 5 项用列表行进入子页。

**token 取值**

| 属性 | 纸感 | 账本 |
|---|---|---|
| 容器背景 | `--paper` #fffefa（不透明） | `--paper` #f2f5f7 |
| 容器描边 | `1px solid var(--line)`（装饰，豁免） | 同左 |
| 容器圆角 / 内边距 | `--shape-row-radius` 12px / `--space-1` 4px | 4px / 4px |
| 容器投影 | `--elev-2` | `none` |
| 段：最小高度 | 44px | 44px |
| 段：未选文字 | `--muted` #667169 | `--muted` #6a6d6b |
| 段：已选背景 | `--accent-soft` #eef4ea | `--accent-soft` #eef3f0 |
| 段：已选文字 | `--ink`、`--fw-semibold` | 同左 |
| 段：已选指示 | `--accent-soft` 填色 + 字重 600（`--fw-semibold`），无边框、无底线 | 同左 |
| 段：圆角 | `--shape-ctrl-radius` 12px | 4px |

**CSS diff**

```diff
- .segment-bar{…;margin:0 0 14px;padding:6px;border:1px solid var(--line);border-radius:16px;background:var(--paper);box-shadow:0 4px 14px #3146310a}
+ .segment-bar{…;margin:0 0 var(--space-3);padding:var(--space-1);border:1px solid var(--line);background:var(--paper);box-shadow:var(--elev-2)}
- .segment-bar,.records-tabs{background:rgba(255,254,251,.72)}                                   /* L503 */
- [data-skin="ledger"] .segment-bar,[data-skin="ledger"] .records-tabs{background:#f4f6f4}          /* L585 */
- .segment{flex:1 1 0;padding:9px 10px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-size:14px;font-weight:600}
+ .segment{flex:1 1 0;min-height:44px;padding:var(--space-2) var(--space-3);border:0;border-radius:var(--shape-ctrl-radius);
+          background:transparent;color:var(--muted);font-size:var(--text-md);font-weight:var(--fw-medium)}
- .segment[aria-selected="true"]{background:var(--sage-soft, #e8f0e9);color:var(--ink)}
+ .segment[aria-selected="true"]{background:var(--accent-soft);color:var(--ink);font-weight:var(--fw-semibold);
+                                border:0;box-shadow:none}
```

- L503 的 72% 半透明白删除：吸顶后下层内容透上来，最坏情况（压在深色文字上）未选文字对比降到 2.99:1；改为不透明 `--paper`。这也是 mapping 里 `rgba(255,254,251,.72)` 待人工行的结论。
- L585 账本 `#f4f6f4` 与账本 `--paper` ΔE00 2.1，并入 `--paper`。
- `--sage-soft` 全文件未定义，回退 `#e8f0e9` 恒生效；它与 `--accent-soft` ΔE00 1.7，并入。

**可访问性**

- 触达：原 `padding:9px` + 14px 字 ≈ 41px，**未达 44px** → 补 `min-height:44px`。
- 对比：未选文字 4.54:1（纸感）/ 4.82:1（账本 `#f2f5f7`）；已选文字 `--ink` 在 `--accent-soft` 上 10.50:1。
- 状态指示（实施后修订）：采用「容器 `--line` 边框 + 选中项 `--accent-soft` 填色 + 字重 600，无边框无底线」。原定的 2px `--accent` 底线与容器边框叠成「框中框」，截图评审后撤掉。代价：选中态与容器底色仅 **1.10:1**（账本 1.07:1），区分靠填色、字重与文字色（`--muted` → `--ink`）三者叠加，不满足 1.4.11 的 3:1；**阶段 5 需在弱视条件（模糊 / 低对比度模拟、强光户外）下验证选中项能否识别**，不能识别则恢复底线或改用 `--accent` 文字色。
- 焦点：走全局 `:focus-visible`，`--ring-focus-color` 3.36:1 起；`outline-offset` 在段内改为 `-2px`，防止被容器 `overflow` 或相邻段遮住。
- 键盘：已有 `role="tablist"/"tab"` 与 `aria-selected`，但 JS 中**无方向键切换、无 `aria-controls`、未管理 `tabindex`**，**未达标**（WAI-ARIA tabs 模式要求方向键移动）。属交互层改动，记入阶段 3 待办，不在本文件给 JS。

## 4. 本轮定下的其余细节（原「待人工」与新登记）

**新登记 token（已写入 `02-tokens.md`）**：`--line-strong`、`--ring-focus-color`（改值）、`--tone-protein/carb/training/sleep/water/tip/neutral/weight` 8 个、`--macro-protein/fat/carb` 3 个、`--overlay-weak`。`--ink-soft`、`--muted`（纸感）改值。

**`--tone-*` 色值**：纸感/账本同值，不参与换肤。三个原值不达 4.5:1，按约束换色（色相不变）：

| token | 原值 → 新值 | 最低对比 |
|---|---|---|
| `--tone-water` | #3f7c95 → **#3c768e** | 4.24 → 4.5 |
| `--tone-tip` | #b08430 → **#8e6a27** | 3.10 → 4.5 |
| `--tone-neutral` | #7f9184 → **#647468** | 3.05 → 4.5 |
| 其余 5 个 | 沿用 | 4.80–5.36 |

`--warn #a8622c` 在账本 `#f2f5f7` 上 4.31:1，不属 A 组，留 B 组表单错误态一并处理。

**阴影分档**：沿用 mapping 的几何分档。`--elev-1` 卡片、`--elev-2` 浮起（分段栏、主按钮）、`--elev-3` 向上（底部面板/导航）、`--elev-4` 弹层；账本全部 `none`，只留 `--elev-4`。`rgba(20,20,19,…)` 的 3 处在纸感改用 `--shadow-rgb`（偏绿），接受色调变化。

**待人工 7 行的结论**：

| 值 | 结论 |
|---|---|
| `#c5b58f`、`#a4b7bd` | 查 `app.js`：`#macro-summary` 按 蛋白质/脂肪/碳水 顺序渲染，第 2、3 格 = **脂肪、碳水**。登记为 `--macro-protein/fat/carb`，不参与换肤。进度条是图形，对轨道 `#eef1e8` 需 ≥3:1，三色全不达标（2.28 / 1.77 / 1.82）→ 同色相加深：蛋白 `#8ca790`→**`#719276`**、脂肪→**`#9e8852`**、碳水→**`#728f99`**（均 3.01–3.03:1） |
| `rgba(68,117,93,.26/.22)` | `.primary` 光晕基色取自旧主色。`--accent` 不动 → 改为 `rgb(var(--shadow-rgb)/.26)`，即并入 `--elev-2`；按下态 `.22` 用同档。B 组按钮落地 |
| `rgba(255,254,250,.96)`（底部导航）、`rgba(255,254,250,0)`（`.answer` 渐隐） | 账本下会错色。导航改不透明 `--paper` + 保留 `backdrop-filter`；渐隐改 `linear-gradient(transparent,var(--paper))`。不新增 `--paper-rgb` |
| `rgba(255,254,251,.72)` | 见 §3，删除，改不透明 `--paper` |

## 5. 留给 B/C 组与阶段 3 待办

- 6 处 `:focus` → `:focus-visible`（阶段 2 已记）；L51 与 L483 两条全局焦点规则合一。
- `.meal-row` 长按无替代入口；分段控件方向键与 `aria-controls`。
- L3–L47 被覆盖的 4 个 token 定义删除；`--mint`/`--mint-dark`/`--cream` 引用清点后废弃（`var(--mint)` 4 处、`var(--mint-dark)` 23 处、`var(--cream)` 3 处引用，不能直接删）。





