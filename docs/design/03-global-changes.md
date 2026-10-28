# 阶段 3 · 全局波及清单（token 改值 → 回归点）

> 来源：`03-components-a.md`、`03-components-b.md` 定下的改值，加上它们连带删除/合并的全局规则。
> 「影响处数」= `styles.css` 中**声明数**（一条声明里出现 2 次按 2 计；`:root` / `[data-skin]` 的定义本身不计）。行号是现行 `styles.css`。
> 「涉及页面」按选择器最后一个类/ID 在 `index.html` 中所在的 `view-*` 定位；只在 `app.js` 里拼出来的类记「JS 渲染」并写出生成函数；`全局` = 元素选择器、弹层、底部导航等跨页内容。
> 阶段 5 回归：每一行至少截两张（纸感 + 账本），「涉及页面」逐页过。行内标 ★ 的是对比度从不达标变达标的项，回归时要实测数值。

## 1. 颜色 token 改值

| token | 旧值 | 新值 | 影响处数 | 涉及页面 |
|---|---|---|---|---|
| `--muted`（纸感）★ | #7c897f | #667169 | 73 处 `var(--muted)` | 今日 / 记录 / 问答 / 趋势 / 我的 / 全局；JS 渲染的餐行 `.meal-row`、`.row-meta`、搜索结果 `searchFoods`、权限行 `permissionRow` |
| `--ring-focus-color` ★ | #78a992（L51 硬写） | #5b8e76 | 1 条硬写 + **5 个 `:focus` 选择器 + 1 条 `:focus-visible`**，见 §3；作用于全部可聚焦元素：HTML 83 个 `<button>` + JS 35 处 `<button>` 模板、73 个文本输入、19 个 `select`、3 个 `textarea`、15 个勾选框 | 全部页面（键盘 / 开关控制下逐页 Tab 走一遍） |
| `--ink-soft` | #5c6e5f（目标值）；现状 11 处硬写：#5c6e5f ×3、#59725e、#5e715e、#67766c、#647a67、#4f6456、#4c6353 ×2、#4d6355 | #506053 | 11 处（L51 ×4、L53、L163、L172、L175、L188、L193、L219）+ B 组新用 `label`、`.icon-button`、`.term-close` | 全局（`label` 全部表单、`.app-dialog-panel p`、`.sheet-title`）、我的、今日 |
| `--line-strong`（新）★ | `--line` #e4e9df / #dfe3e8、`#e0e6db`、`#e3e7e2`、`#e3e9dd`、`#eddcd7` | 纸感 #858e83 / 账本 #848b95 | 输入框 L97（作用于 73 + 19 + 3 个控件）、`.subtle` L51（53 个次按钮）、`.check-row` L260、`.hub-row` L235、`.icon-button.danger` L151 | 全局表单；今日（`#daily-check` 打卡行、`.hub-row`）；我的（`.hub-row`、连接检查）；所有次按钮所在页 |
| `--warn`（纸感） | #a8622c | #9e5c29 | 4 处 `var(--warn)`（L200、L266、L617、L671）+ `.tone-fat` | 我的；JS 渲染（`answerSection` 问答回答段的 `tone-fat`、`.check-row` 待办态） |
| `--accent-press`（新） | #2f5340（L51 `.primary:active` 硬写） | #2f5340（值不变，收编） | 1 | 全部主按钮（HTML 22 + JS 6） |
| `--overlay` ★ | #293c3280 ×2（L123、L216）、#293c3260（L49）、#293c3270（L53）、`rgba(20,20,19,.28)`（L663） | `rgb(var(--shadow-rgb)/.56)` | 5 | 全局弹层：`#action-sheet`（`showRowActions`、`chooseFromSelect` 调起，记录 / 今日 / 我的）、`#voice-sheet`（记录、问答）、`#term-sheet`/`#weight-sheet`（今日、记录训练）、`.app-dialog`（确认框，全部删除操作）、原生 `dialog` |
| `--tone-water` ★ | #3f7c95 | #3c768e | 1（L201） | 问答（JS `answerSection`，`tone-water` 段） |
| `--tone-tip` ★ | #b08430 | #8e6a27 | 1（L202） | 问答（同上） |
| `--tone-neutral` ★ | #7f9184 | #647468 | 1（L202） | 问答（同上） |
| `--tone-protein/carb/training/sleep/weight` | 硬写 #8a5a2b / #6b6191 / #3f6c8a / #5c6a9c / #44755d | 同值，改引用 | 5 | 问答（同上） |
| `--ok`（引用替换） | `var(--mint-dark)` / 硬写 #44755d ×4（L127、L201、L202、L261） | `var(--ok)` #4f7a52 / 账本 #3f6b52 | 4 硬写 + `.form-feedback.success` 1 | 问答（`tone-ok`、`tone-weight`）；今日（`.check-row.ok`）；全局表单成功提示（16 个 `.form-feedback`） |
| `--macro-protein` ★ | #8ca790 | #719276 | 1（L51） | 今日（`#macro-summary`，JS `renderBody`） |
| `--macro-fat` ★ | #c5b58f | #9e8852 | 1（L51） | 今日（同上） |
| `--macro-carb` ★ | #a4b7bd | #728f99 | 1（L51） | 今日（同上） |
| `--accent`（替换 `--mint-dark`） | `var(--mint-dark)` #44755d | `var(--accent)` #3f6b4a（账本同 token 值） | **23 处 `var(--mint-dark)`**：`.primary`、`.text-button`、`.check-label input`、`.form-feedback.success`（→`--ok`）、底部导航当前项、`.step-dot.done`、`.goal-card`、页脚链接、`.food-result strong`、`.collapse-toggle`、`details.advanced`、`.recalc-item`、`.mic-button`、`.voice-text`、`.row-toggle`、`.answer-list li::before`、`.fav-badge`、`.chip-toggle`、`.sheet-option-icon`、`.sheet-option.is-current` ×2、`.hub-icon`、`.quick-chip-icon` | 全部页面 + 引导页（`.goal-card`、`.step-dot`）+ 弹层 |
| `--accent-soft`（替换 `--mint` / `--sage-soft` / 浅绿硬写） | `var(--mint)` #e6f0e6 ×4、`var(--sage-soft,#e8f0e9)` ×2、浅绿硬写 40 处（mapping 并入 `--accent-soft` 的 30 个值） | `--accent-soft` #eef4ea / 账本 #eef3f0 | 4 + 2 + 40 = 46 | 全部页面；`--sage-soft` 两处是分段控件（记录 `installRecordPanels`、趋势 `installTrendPanels`） |
| `--surface`（替换 `var(--card,#fff)`） | #ffffff（回退恒生效） | #fffdf7 / 账本 #ffffff | 2（L260、L285） | 今日（`permissionRow` 打卡行）、记录（`renderTrainingLog` 训练行） |
| `--paper`（替换 `--cream` 及半透明） | `var(--cream)` #f7f8f2 ×2（L54、L302）、`rgba(255,254,251,.72)`（L503）、账本 #f4f6f4（L585） | `--paper` | 4 | 引导页 `.onboarding`；记录 / 趋势分段栏吸顶区 |
| `--paper`（底部导航 / 渐隐） | `rgba(255,254,250,.96)`、`rgba(255,254,250,0)` | 不透明 `--paper`、`transparent→var(--paper)` | 2 | 全局底部导航；问答 `.answer.is-clamped` 折叠渐隐 |

## 2. 形状、尺寸、投影 token

| token | 旧值 | 新值 | 影响处数 | 涉及页面 |
|---|---|---|---|---|
| 控件最小高度（删 L518） | `button,.button,select,input{min-height:40px}` 覆盖 `--btn-h` | `--btn-h` 48px（按钮 / 输入）；幽灵、图标按钮 44px | 1 条规则，作用于全部按钮与输入（同 `--ring-focus-color` 行的控件数）；另 3 条局部 `min-height:40px`（L81、L86、L149） | 全部页面。**版面变高最多的一项**，重点看今日卡片按钮行、记录表单、`.app-dialog-actions` 是否换行 |
| `.icon-button` 尺寸 | 40×40 | 44×44 | 1（L149），9 个图标按钮 | 我的（5 个子页面返回键）、记录（行删除 `row-delete`）、其余 JS 渲染 3 个 |
| `.term-close` 尺寸 | 32×32 | 44×44 | 1（L667） | 今日 / 记录（术语、杠铃重量说明弹层） |
| `.check-label` 行高 | ≈36px | `min-height:44px` | 1，14 个勾选行 | 今日 / 记录 / 问答 / 我的 / 引导页 |
| `.segment` 行高 | ≈41px | `min-height:44px` | 1 | 记录、趋势 |
| `.date-picker input` / `.estimate-item input` | 38px / 36px | `--btn-h` | 2 | 今日（日期选择）；记录（JS 渲染的估算条目） |
| `--shape-ctrl-radius`（替换 `--btn-radius` 等） | `var(--btn-radius)` ×3、`border-radius:12px` 硬写 | `--shape-ctrl-radius` 12px / 账本 4px | 3 + L813 已有 | 全局表单与按钮 |
| `--shape-card-radius`（弹层上角） | `26px 26px 0 0` ×2、`--radius-lg`（`.term-panel`） | `--shape-card-radius` 16px / 账本 5px | 3（L124、L217、L665） | 全局弹层 |
| `--elev-1`（卡片） | `--shape-card-shadow` L806；`var(--shadow)` ×3 | `--elev-1` / 账本 `none` | 1 + 3 | 今日 / 记录 / 问答 / 趋势 / 我的（全部 `.card`：HTML 33 + JS 58 处） |
| `--elev-2`（主按钮、分段栏） | `rgba(68,117,93,.26/.22)`、`#3146310a` | `--elev-2` / 账本 `none` | 3 | 全部主按钮；记录、趋势分段栏 |
| `--elev-3`（底部弹层） | `#293c3226` ×2、`rgba(20,20,19,.5)` | `--elev-3` / 账本 `none` | 3（L124、L217、L665） | 全局弹层 |

## 3. 全局规则的增删（不是 token，但改一处动全站）

| 规则 | 旧 | 新 | 影响处数 | 涉及页面 |
|---|---|---|---|---|
| `:focus` → `:focus-visible` ★ | L51 `.skip-link:focus`；L102 `input…:focus`、`select:focus`、`textarea:focus`；L484 `button:focus:not(:focus-visible)`、`a:focus:not(:focus-visible)` | L51 → `:focus-visible`；L102 3 个 → `:focus-visible` + `--ring-focus`；L484 2 个删除 | **6 个选择器**，3 条规则 | 全部页面；跳转链接只在键盘 Tab 首次时出现 |
| 两条全局焦点规则合一 | L51 `button:focus-visible,a:…,input:…,textarea:…,select:…{outline:3px solid #78a992;outline-offset:3px}`（0,1,1，实际胜出）+ L483 `:focus-visible{outline:2px solid var(--accent)}` | 单条 `:focus-visible{outline:2px solid var(--ring-focus-color);outline-offset:2px}` | 2 → 1 | 全部页面；按钮焦点环由 3px 变 2px、offset 由 3 变 2 |
| `.button.is-now` | `outline:2px solid var(--accent)` | `box-shadow:inset 0 0 0 2px var(--accent)` | 1（L624） | 今日（饮食建议时段按钮） |
| `button:disabled` 外观 | `opacity:.55;cursor:wait` | 灰底 + `--muted` 字；加载中另用 `[aria-busy]` | 1，影响 JS 中 20 处 `button.disabled = true` | 我的（连接检查、密钥检查、导出等）、记录（保存）、问答（发送） |
| `.button:hover` / `.primary:hover` 删除 | `translateY(-1px)` / `#365e4a` | 无 | 2 | 全部按钮（WebView 粘滞 hover 消失） |
| L51 旧输入框规则删除 | `#e0e6db` 边、`#fbfcf8` 底（已被 L97 覆盖，死值） | 合入 L97 | 1 | 无可见变化，回归确认无差即可 |
| placeholder ★ | `#a0aaa0`（2.38:1） | `--muted` | 1 | 全局表单 |
| 弹层 `max-height` + 内部滚动 | 无 | `85vh / 85dvh` + `overscroll-behavior:contain` | 3 | 全局弹层；要测横屏、长选项列表、键盘弹起 |
| `.term-panel` 改为贴底 | 浮在底部、四角圆、`padding:var(--space-3)` 外边距 | 与 `.sheet-panel` 同形 | 2（L663、L665） | 今日 / 记录 说明弹层 |
| `opacity` 叠在 `--muted` 上 ★ | `.row-meta` 等 8 处 `opacity:.8/.85`（L265、L274、L287、L293、L345、L687、L723、L737） | 删除 opacity | 8 | 今日（打卡行）、记录（训练行、餐行）、问答、趋势、我的 |
| `.hub-arrow` ★ | `#b3bdb2` | `--muted` | 1（L242） | 今日 / 我的 |
| 底部导航未选项 ★ | `#97a08f`（2.69:1） | `--muted` | 1（L51） | 全局底部导航（**不在 A/B 组范围，C 组定；列此防漏**） |
| 被覆盖的 L3–L47 token 定义 | `--paper/--ink/--muted/--line` 历史值 | 删除 | 4 | 无可见变化 |

## 4. 回归口径

- **合计**：颜色 20 行、形状尺寸 11 行、全局规则 13 行，共 44 项。处数最大的四项是 `--line`（81，**本轮未改值**，不列入）、`--muted` 73、`--accent-soft` 合并 46、`--mint-dark` → `--accent` 23；这四项 + L518 删除 + 焦点合一，应在两套皮肤下把 5 个 tab + 引导页 + 4 种弹层全部截一遍。
- `--accent #3f6b4a`、`--line`、`--ink`、`--paper` 本身的值**未改**，不列行；它们只在上表「替换引用」时出现。
- 交互层改动（`aria-invalid`、`aria-busy`、弹层焦点与返回键、分段控件方向键、`.meal-row` 替代入口）不改样式 token，不在本表，回归时按 A/B 组文档的「未达标」条目逐条验证。
- 「涉及页面」由静态 HTML 树 + JS 生成函数推断；`未定位` 的选择器（如 `--muted` 中 8 处、`--line` 中 5 处）是选择器在两份文件里都找不到实例，**需截图才能判断**是否为死代码。

## 5. 测试断言约定（2026-10-26 定）

改令牌时已经两次被测试绊住（`meal-date-context` 的输入框边框、`frontend-audit` 的按钮圆角），
两次都不是改坏了，而是测试写死了旧值。从此按下述规则：

1. **组件测试只验证「引用了哪个 token」**，不验证「token 等于多少」。
   例：`assert.match(css, /border-radius:var\(--shape-ctrl-radius\)/)` ✅
   反例：`assert.match(css, /--btn-radius:14px/)` ❌
2. 需要锁死具体数值的，**集中到一个 `tests/tokens-snapshot.test.mjs`**，
   把全部 token 的名称与值一次断言完；改令牌时只改这一个文件。
3. 测试失败先判断属于哪一类：
   - 断言引用了已删除的 token → **测试过期，改测试**
   - 断言引用了正确 token 但值不达标 → **实现有问题，改样式**
   两者都不许「改测试来通过」，除非先在本节登记原因。
4. 新增 token 必须同时登记到 `02-tokens.md` 的 token 表，否则 `tokens-snapshot` 会漏锁。

### 5.1 已登记的原因

| 日期 | 文件 | 断言变更 | 原因 |
|---|---|---|---|
| 2026-10-26 | `tests/training-log.test.mjs` | 「整表单一次性拒绝」→ 逐字段 `aria-invalid` + 聚焦第一个缺失项 | 1.1.33 实现由整表单拒绝改为逐字段标记，校验语义未变，断言跟到现役实现 |
| 2026-10-26 | 无断言变更 | 1.1.34 修 `invalid` 事件未 `preventDefault`，并新增 `fieldMessage()` 把 `validity` 译成中文 | `reportValidity()` 有 6 处调用，原生气泡和 `.field-error` 会同时出现；`validationMessage` 跟系统语言走，非中文系统会冒英文 |
| 2026-10-26 | `tests/p0-p1-round.test.mjs` | 「蛋白缺口换算成食物克数」→「缺口给出下一餐指引」 | 用户判定「白灼虾 155 g（或水煮蛋 5 个）」这类等价换算无意义，1.1.37 删除；断言改为检查 `下一餐先吃蛋白质` |
| 2026-10-26 | `tests/anchors-oil.test.mjs` ×3 | `宁可略高不要低报`／`照片识别系统性低估热量`／预览提示语 → `不要系统性往高报`／`两者要抵消`／`不必刻意往高报` | 用户要求「不要过分高估脂肪摄入，保证尽量准确」；1.1.39 把提示词与预览文案统一改成中位值口径，断言跟到新口径而非删除意图 |
| 2026-10-26 | `tests/ci-and-versions.test.mjs`、`tests/modularization.test.mjs` | `PROMPT_VERSION = 2` → `= 3` | 提示词口径改动必须升版本，版本号断言同步 |
| 2026-10-26 | `tests/trends-ui.test.mjs` ×2 | 「作者署名与邮箱存在」→「页面里不再有 mailto」+「免责声明保留」；`.page-author` 样式断言改为「样式随元素一起删除」 | 用户要求删除个人邮箱；隐私处理，footer 只保留免责声明 |
| 2026-10-26 | 无断言变更 | 新增 token `--ring-green` 已登记到 `02-tokens.md` | 按本节第 4 条，新增 token 必须入表，否则 `tokens-snapshot` 漏锁 |
| 2026-10-29 | `tests/p0-p1-round.test.mjs` | 「下一餐先吃蛋白质」→「下一餐吃 一掌心鸡胸 / 两个鸡蛋」 | B 节要求缺口落到一份可执行食材；同时守住 1.1.37 的决定——只用生活量词（掌心/个），不做克数等价换算 |
| 2026-10-29 | `tests/meal-date-context.test.mjs` | `.stats-good{color:#3f7a5e}` → `color:var(--tone-weight)` | 1.1.84 把该字面量归入令牌；颜色值不变，改断言跟随令牌 |
| 2026-10-29 | `tests/training-day-budget.test.mjs` | 「hero 显示区间」→「显示目标单值 + 依据 + ±2%」 | C 节把区间降级成单值 + 容差 + 依据，依据与数字必须同源同步 |


