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
| 2026-10-29 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.1.71'` → `'1.1.91'`（常量字面量与 build.ps1 默认值同步） | 关于页显示 1.1.71 而装机是 1.1.91：dev-loop 用 `-Version` 覆盖了 build.ps1 参数，但片段里的常量没人改。本次把三处（片段常量、build.ps1 默认值、测试字面量）对齐到装机版本 |
| 2026-10-29 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.1.96'` → `'1.1.97'`（发布版本同步） | 1.1.97 装机与关于页版本必须一致；dev-loop 按仓库护栏同步片段常量、build.ps1 默认值和测试字面量 |
| 2026-10-26 | 无断言变更 | 新增 token `--ring-green` 已登记到 `02-tokens.md` | 按本节第 4 条，新增 token 必须入表，否则 `tokens-snapshot` 漏锁 |
| 2026-10-29 | `tests/p0-p1-round.test.mjs` | 「下一餐先吃蛋白质」→「下一餐吃 一掌心鸡胸 / 两个鸡蛋」 | B 节要求缺口落到一份可执行食材；同时守住 1.1.37 的决定——只用生活量词（掌心/个），不做克数等价换算 |
| 2026-10-29 | `tests/meal-date-context.test.mjs` | `.stats-bad{color:#a8622c}` → `var(--warn-ink)` | 令牌化替换，颜色值不变（1.1.86） |
| 2026-10-29 | `tests/meal-date-context.test.mjs` | `.stats-good{color:#3f7a5e}` → `color:var(--tone-weight)` | 1.1.84 把该字面量归入令牌；颜色值不变，改断言跟随令牌 |
| 2026-10-29 | `tests/training-day-budget.test.mjs` | 「hero 显示区间」→「显示目标单值 + 依据 + ±2%」 | C 节把区间降级成单值 + 容差 + 依据，依据与数字必须同源同步 |
| 2026-10-29 | `tests/icon-style.test.mjs` | `REQUIRED` 扩充 `BRAND_GLYPHS`（7 个品牌 glyph，共 28 个，共享 `stroke="#44755d"` 校验） | 1.1.99–1.1.100 把底部导航、今日四宫格与拍照/相册入口全部收进 24×24、1.8px 圆头单色几何语言 |
| 2026-10-30 | `tests/habit-and-training-mode.test.mjs` | 新增今日体检指标图标映射断言 | 训练/睡眠图标资产合并后，守住 `metricIcon()` 的动态拼接引用，防止回退到已删除文件名 |
| 2026-10-29 | `tests/icons-motion.test.mjs`、`tests/meal-date-context.test.mjs` | 底部导航图标断言由 `icon-nav-*.svg` 改为 `icon-glyph-*.svg`，餐食行营养数值断言改为 `.meal-numbers` 命名数值列 | 1.1.99 底部导航复用品牌 glyph 家族；餐食行抽出 `.meal-numbers` 供纸感与账本皮肤分别应用阅读流与三列网格 |
| 2026-11-11 | `tests/training-log.test.mjs` ×2 | 「动作行有 sets/reps/weight 三字段」→「动作行有 data-exercise=name + data-set=reps/weight」；12 个上限断言的 `return;` → `return null;` | 逐组模型（1.3.30 起）让「组数」变成组行数，旧的三字段 markup 已不存在；编辑「添加动作」时发现它仍在生成旧三字段行，保存必失败，本轮统一走 `appendExerciseRow`，断言跟到现役实现 |
| 2026-11-11 | `tests/training-log.test.mjs` | 「剂量在名字与理由之间」的距离窗口 300 → 600 | 今日顺序改成三行式：名字 / 组次重量 + 记录·换一个 / 理由。剂量与理由之间隔了两个行内按钮，顺序语义未变 |
| 2026-10-29 | `tests/meal-date-java.test.mjs` | `APP_VERSION` 随版本同步（`1.1.98` → `1.1.99` → `1.1.100`） | dev-loop 同步片段常量、build.ps1 默认值与测试字面量 |
| 2026-10-29 | `tests/icon-style.test.mjs`、`tests/icons-motion.test.mjs`、`tests/layout-four.test.mjs`、`tests/records-panels.test.mjs`、`tests/apk-food-assets.test.mjs`、`tests/auth-food-integration.test.mjs`、`tests/habit-and-training-mode.test.mjs`、`tests/meal-date-context.test.mjs` | 图标固定 28 名单 / 1.8 描边改为目录全量 / 24 格 / 1.5 单色圆头；入口断言跟到任务操作条、分段默认、低频折叠、复用 glyph 与快捷操作文流防遮挡 | 用户取消图标数量上限并要求重复符号合并；14 个未用或重复 SVG 删除后，27 个实际图标均受同一守卫检查，快捷操作紧随能量摘要且不覆盖页面内容，页面与 APK 引用同步跟随 |
| 2026-10-30 | `tests/layout-four.test.mjs` | 新增跨页面共享品牌页头断言 | 当前今天页与其他页分别使用 38px/28px logo、显示/隐藏副标题；统一品牌标志尺寸、文字字号、间距和分隔线，避免回归页面专属页头分叉 |
| 2026-10-30 | `tests/layout-four.test.mjs` | 新增能量摘要双列结构断言，守住环、目标信息、记录操作同区及窄屏响应式布局 | 现有纵向堆叠使“为什么是这个数”独占整行并把营养数据压出首屏；摘要改为环旁信息列，数值口径不变 |
| 2026-10-30 | `tests/training-log.test.mjs`、`tests/chat-quality.test.mjs` | 新增 AI 计划行「名字/建议/组数同栏、组数垫底」结构断言与推送提示词「不暴露字段名、无区间退回 calorieTarget」断言 | 训练计划行被长建议挤成竖排名字且组数与建议文字重叠；晚间分析把 intakeFloor/日型区间写成「无法核算」，用户判定为报错 |
| 2026-10-30 | `tests/training-log.test.mjs` | 新增编辑态断言：输入框中文 aria-label、`添加一个动作` 入口、编辑时保留原建议 | 修改模式原来只有英文 aria-label（sets/reps/weight），且不能手动加动作、看不到原建议；补齐可达性与可操作性 |
| 2026-10-30 | `tests/targets.test.mjs`、`tests/lean-targets.test.mjs`、`tests/training-day-budget.test.mjs`、`tests/layout-and-autorecalc.test.mjs`、`tests/advice-targets.test.mjs`、`tests/advice-and-training-window.test.mjs`、`tests/weekly-review.test.mjs`、`tests/ai-upgrade.test.mjs`、`tests/tdee-calibration.test.mjs`、`tests/habit-and-training-mode.test.mjs` | 断言从「2000 kcal 地板/训练次数下拉」改为「无统一地板、按目标蛋白带、训练天数来自 planPrefs」；明日目标调整改用性别安全下限 1200/1500 | 用户要求删除 2000 kcal 硬底线、删去档案与向导里的训练次数选项；蛋白带改为目标直接决定（maintain 1.6~2.0 不再被全局 2.0 抬回），训练天数统一取「记录→训练计划」，减少死配置 |
| 2026-10-30 | `tests/targets.test.mjs` | 新增每个目标的说明文案断言（缺口/蛋白带/节奏）与向导、档案的提示位 | 五个目标原来只有「温和缺口」「高蛋白」这类笼统描述，用户要优化各模式说明；补 `GOAL_HINTS` 单一来源，数字与 computeTargets 同源 |
| 2026-10-30 | `tests/targets.test.mjs`、`tests/training-day-budget.test.mjs` | 改为断言手填日区间被忽略、档案回写计算区间、状态条读计算区间 | 1.2.17 移除第二套日区间口径：训练日/休息日区间只由目标预设算，档案保存时把计算值写回，原生层上下文与页面同源 |
| 2026-10-30 | `tests/p0-p1-round.test.mjs` | 新增今日清单行保持横向、训练洞察改用带标签的行的断言 | 全局 `label{flex-direction:column}` 让今日清单的复选框/名称/剂量各占一行；洞察是裸「· 文本」。改为横向行 + 负荷/停滞/容量/状态标签 |
| 2026-10-30 | `tests/p0-p1-round.test.mjs` | 新增「上次建议只读训练问答、点击留在卡内」的断言 | 训练卡底部「上次回答」原来绑全局最后一条问答，可能显示饮食评分；训练问答本就不写全局历史，改为单独存 `qingheng.lastTrainingAdvice` 并在卡内回看 |
| 2026-10-30 | `tests/adapter.test.mjs`、`tests/advice-and-training-window.test.mjs`、`tests/p1-answers-phase-collapse.test.mjs`、`tests/training-library.test.mjs`、`tests/p0-p1-round.test.mjs` | 外发同意从各处复选框改为「向导勾一次 + 我的设置里一个开关」；隐藏数据预览；快速记录收藏优先 | 用户要求同意集中在初次使用与「数据、外观与说明」，不再在提问/建议框下方重复勾选；同时把收藏的饮食记录纳入快速复制的候选 |
| 2026-10-30 | `tests/meal-date-context.test.mjs`、`tests/p0-p1-round.test.mjs` | 问答页日期选择器删除后的断言；数据/外观/说明摘要图标、联网检索开关、说明收纳的断言 | 用户要求问答不再单独选日期（跟随当前分析日）、联网检索做成开关按钮、问答说明收进「数据、外观与说明」 |
| 2026-10-31 | `tests/meal-date-context.test.mjs` | 问答恢复历史日期入口的断言（chip + 隐藏 date input） | 用户要求问答可以调取历史日期数据；改成「分析日期 · 今天」chip，点开原生日期选择器，选择后切换 activeDate |
| 2026-10-31 | `tests/layout-four.test.mjs`、`tests/records-panels.test.mjs` | 新增 Today 单时间线、餐食 / 日常事件单底线、空态无内框、账本表格控件去重框和共享分段栏断言 | 2026-10-31 品牌审计落地：组件边界改为单一发丝线，保留现有数据字段、历史含义及账本表格布局；无新增 token |
| 2026-10-31 | `tests/records-panels.test.mjs` | 新增纸感开放内容区、账本单层卡片框、导航行皮肤分工、折叠章节线与草稿虚线状态断言 | 纸感从闭合卡片改为留白与内容分隔，账本保留数据面板外框但去掉标题重复线；验证结构取舍而非新增令牌 |
| 2026-11-03 | `tests/layout-four.test.mjs` | 「快速记录是 header 文字按钮」→「header 次按钮（`button subtle` + 复制图标）」；新增「餐次是弹窗内 chip 行、且不再有原生 select」断言 | 用户报「快速记录无法修改餐次」：WebView 把原生 `<select>` 的弹层画在遮罩之后，实机只剩一条取消条、选不中；餐次改四枚 44px chip（与「复制哪一餐」同一套弹窗内选择方案），并把文字链升级为带图标的次按钮，拉平与四格芯片的视觉权重 |
| 2026-11-03 | `tests/layout-four.test.mjs`、`tests/records-panels.test.mjs` | 「低频设置折叠在 details 里」→「低频设置开自己的 sub-page」；顺带删掉 `.profile-more*` 死样式断言 | 用户要求「我的 → 数据、外观与说明」这一行与「模型连接」同步格式：同一个 `.subpage` 外壳、同样的 21px hub 图标与返回头，不再在列表里嵌第二层折叠 |
| 2026-11-03 | `tests/meal-date-java.test.mjs` | `SUBPAGES` 增加 `appearance`；入口计数 5 → 6；`#subpage-appearance` 进入 id 清单 | 同上：低频块升级为第六个子页，路由与 back 行为跟其它子页一致 |
| 2026-11-04 | `tests/habit-and-training-mode.test.mjs` | 「体检图标指向已发布资源」改为「体检图标为内联 SVG」 | 图标从 `<img src=icon-*.svg>` 改成内联 SVG（提高区分度），原断言锁的是文件名 |
| 2026-11-04 | `tests/habit-and-training-mode.test.mjs` | 图标断言认「`const glyphs` + Lucide + metric-glyph」；同期登记 `20-audit-visual.md` 的图标规格（24/1.5/微型记号） | 图标先换 Lucide 再按规格收口，断言与文档一起更新 |
| 2026-11-04 | `tests/meal-recalc-collapse.test.mjs` | 箭头断言从 `.advanced summary::after{content:'▾'}` 改为通用规则 `details:not(.day-more)>summary::after` + `[open] rotate(180deg)` + `details::details-content` 高度过渡 | 旧规则用换字符（▾/▴）实现展开态，抵消了新加的旋转动画，用户报「箭头没有过渡」；统一后断言锁住新写法 |
| 2026-11-03 | `tests/meal-date-context.test.mjs` | 「收藏筛选写在 renderChat 里」→「收进 `chatRowsInScope()` 一个入口」；新增问答按天浏览的 7 条断言（chip、两侧箭头、`chatDayFilter` 状态、只走有记录的日期、「全部日期」在最新一端） | 问答记录加了按天翻页：过滤要对搜索、收藏、按天三种条件叠加生效，写在 renderChat 里会分叉；断言跟着改成单一出口，并锁住翻页边界（从最新一天再往后回到全部） |
| 2026-11-03 | `tests/chat-streaming.test.mjs`、`tests/stream-bubble.test.mjs` | 「逐 token 直接写 DOM」→「写进 `box.pending`，按帧 flush」；片段测试沙箱补 `nextFrame/cancelFrame` 同步桩 | 问答界面落地清单第 7 条：长回答逐 token 写 textContent 会让 WebView 抖，改成每帧最多一次；沙箱没有 rAF，用同步桩代替 |
| 2026-11-03 | `tests/meal-date-context.test.mjs` | 新增「默认餐次窗口含 16:30 晚餐档」「规则先判晚餐」「外观页有 meal-window-dinner 输入」三条断言 | 用户要求默认餐次增加晚餐时间段（16:30 起）；四档判定与设置页同步，断言锁住阈值与判定顺序 |
| 2026-11-03 | `tests/ci-and-versions.test.mjs`、`tests/modularization.test.mjs`、`tests/anchors-oil.test.mjs` | `PROMPT_VERSION = 4` → `= 5`；新增「估算契约不再要 totals」「估算可流式且失败回退」「页面显示识别进度」三条断言 | 提速 A/C：估算 JSON 去掉 totals（服务端按明细+油重算），并新增 `/api/estimate/stream` 让等待期显示「正在识别…已等 Ns」；提示词一改即升版本 |
| 2026-11-03 | `tests/ci-and-versions.test.mjs`、`tests/modularization.test.mjs` | `PROMPT_VERSION = 3` → `= 4` | 提速轮改了两处提示词：删掉 dailyAdvice 开头串进来的估算字段行（死文本），锚点注入上限 4000 → 1200 字；按仓库规矩，提示词文本一改就升版本 |
| 2026-11-03 | `tests/meal-date-context.test.mjs`、`tests/p1-answers-phase-collapse.test.mjs` | 「行内日期 + 行内 重新生成/这条没用」→「日期只在分组头、两个动作进长按菜单」；展开按钮断言改成 `row-toggle-inline` | 问答界面落地清单第 3、4、5 条：一屏 6 颗按钮压过了内容，改成结构减法；截断去掉渐变遮罩，展开改成文字链 |
| 2026-11-07 | `tests/records-panels.test.mjs` | 「训练日志先于训练计划」→「训练计划先于训练日志」 | 记录→训练原先先看到录入表单，训练计划与今日顺序掉到下方；1.3.10 把计划卡提到日志卡前面，断言跟随新的阅读顺序 |
| 2026-11-07 | `tests/records-panels.test.mjs` | 训练分段顺序再改为 `计划 → 今日顺序 → 日志` | 1.3.11 把「今日顺序」从训练计划卡里拆成独立卡片，分段列表必须同步，否则新卡落不进任何分段 |
| 2026-11-07 | `tests/food-models.test.mjs` | 条目数 `120–130` → `145–160`；USDA 行下限 100 → 125 | 1.3.12 用 USDA SR Legacy 补 27 条食材（合计 150 条 = 130 食材 + 20 示例菜），断言跟随新体量；数据仍逐条带 fdcId |
| 2026-11-07 | `tests/training-library.test.mjs` | 「提示词要求 BV 号」→「提示词不再要求 BV 引用」 | 用户要求删除提示里的来源与出处；1.3.13 去掉 dailyAdvice 的 BV 指令，界面也不再有「口述 / C 级 / 课代表」 |
| 2026-11-07 | `tests/training-library.test.mjs` | 标题「整理图参考处方」→「参考处方」 | 同上：标题里不再点明来源；断言跟随新文案 |
| 2026-11-07 | `tests/training-library.test.mjs` | 「卡片显示参考处方」→「参考处方块已删除」 | 用户判定该行对使用没帮助、只会带来疑问；1.3.14 整块移除，断言改为守着它不再回来 |
| 2026-11-07 | `tests/training-library.test.mjs` | 「参考处方渲染 day.cues」→「day.cues 仍作为数据存在、不再上屏」 | 块删除后，日模板要点只在数据层供计划生成使用，断言改为检查数据仍在、UI 不再渲染 |
| 2026-11-07 | `tests/ai-plan-focus.test.mjs` ×3、`tests/training-log.test.mjs` | 快照窗口 4000→6000；`showBusy(...)` → `showBusy(..., "plan-busy")`；`slice(0,12).map(row=>...)` → `map(planItemFromRow)`；计划提示的 `librarySummary(6)` → `(4)` | 1.3.16 把排程改成流式逐条渲染并压短 reason，函数变长、提示词体量下调，断言跟随现役实现 |
| 2026-11-07 | `tests/training-log.test.mjs` | 「剂量在建议下方」→「剂量与名字同一行」 | 1.3.17 把剂量挪进 `.ai-plan-head` 与名字同行，窄屏自动换行，减少每行一行高度 |
| 2026-11-10 | `tests/training-day-budget.test.mjs` | `intakeRangeForDate(date = activeDate)` → 带 `profileOverride` 的新签名 | 1.3.18 修临时目标：区间函数需要接收合并后的档案，否则临时值被区间覆盖 |
| 2026-11-10 | `tests/habit-and-training-mode.test.mjs` | 「另加一句健身提示」→「训练记录缺失就不提训练」 | 1.3.23 建议卡提示词改成两句结构，训练提示并入第二条，不再单独一句 |
| 2026-11-10 | `tests/chat-quality.test.mjs` / `anchors-oil.test.mjs` | 估算提示词旧措辞 → 三步结构措辞 | 1.3.21/1.3.22 压缩提示词并加逐道油量，语义未变 |
| 2026-11-11 | `tests/training-presets.test.mjs` | `renderTrainingLog()` → 带可选 rows 参数的签名 | 1.3.27 「照上次练」需要复用同一渲染器预填表单 |
| 2026-11-11 | `tests/analysis-layer.test.mjs` | 卧推 61.5 → 65；减载 54 → 55 | 1.3.28 渐进重量改为「20kg 空杆 + 每侧 2.5kg 整数倍」，装不出的中间值被替换 |
| 2026-11-11 | `tests/records-panels.test.mjs` | 训练 headings 前置「训练概览」 | 1.3.28 训练页新增概览卡，需归入训练面板 |
| 2026-11-11 | `tests/render-guard.test.mjs` | render() 正则允许附加调用 | 1.3.28 renderBody 后追加 renderTrainingOverview，异常仍在同一 try 内 |
| 2026-11-11 | `tests/training-log.test.mjs` / `training-presets.test.mjs` | 动作级校验文案 → 逐组校验；预填断言改 `setDetails` | 1.3.30 记录模型从「组数一个数」改为 `setDetails[]`，校验与预填都按组 |
| 2026-11-17 | `tests/layout-four.test.mjs` | 「小习惯与建议都在 more 内」→「小习惯在 more 内、建议回到主流程」 | 用户要求「把今天的建议从更多收纳中移出至今天中」；1.3.59 把建议卡移到 更多 之前，断言跟到新位置 |
| 2026-11-17 | `tests/advice-and-training-window.test.mjs` | 「训练建议卡在今天页」→「位于问答页 #view-chat 内且有 #chat-tabs 分段」 | 用户要求「将今日训练建议移至问答中」；1.3.59 把卡迁到问答页并加「问答 / 训练建议」分段 |
| 2026-11-17 | `tests/anchors-oil.test.mjs` ×3 | 「预览可改油量」→「油按菜归属、无单独输入」；用油上限断言改 `topOil`；预览提示语改为「请核对份量与克重」「照片看不到锅底积油」 | 用油并入每道菜的识别结果（每道菜自带 oilGrams 并已算进该菜热量），去掉单独填写，断言跟到新交互 |
| 2026-11-17 | `tests/nutrition-math.test.mjs` ×2 | `NutritionMath.totals(…, oilGrams)` → `(…, oilToAdd)`；`mismatchNote(oilGrams)` → `(oilToAdd)` | 新格式下油已包含在各菜里，只对旧格式（顶层 oilGrams、菜里没有油）补一次油，避免重复计入 |
| 2026-11-17 | `tests/training-draft.test.mjs` | 「跑步靠对位继承 distanceKm」→「跑步有自己的距离/时长输入框」 | 1.3.59 有氧动作有了 data-cardio 输入，旧的 previous.distanceKm 继承逻辑连同断言一起移除，改守新表单 |
| 2026-11-17 | `tests/p0-p1-round.test.mjs` | 「下一餐吃 一掌心鸡胸 / 两个鸡蛋」→「下一餐补一份蛋白质（蛋、豆制品、奶或瘦肉）」 | 用户要求把「两掌心鸡胸」这类健身语境的食物例子换成更容易接触的说法，或只提醒注意饮食；1.3.62 去掉食物阶梯，断言改为守中性提示 |
| 2026-11-17 | `tests/training-log.test.mjs` | 「runsByName 按名字继承」→「km/分钟来自有氧输入，且 runsByName 已删」 | 同上：有氧不再靠上一条记录猜距离，断言改为守着输入框而不是旧 hack |



| 2026-11-18 | `tests/daily-three-copy.test.mjs`、`tests/layout-four.test.mjs` | 「三样卡存在 / 收起」改为「三样并入体检」：断言 today 不再有 `id="daily-three"`，且 app 含 `check-missing` | 用户要求今日三样与今日体检合并、减少卡片堆砌；训练/睡眠/体重入口改为体检卡的「补记」行与记录页表单 |
| 2026-11-18 | `tests/daily-three-copy.test.mjs`、`tests/layout-four.test.mjs`、`tests/advice-and-training-window.test.mjs`、`tests/records-panels.test.mjs` | 三样卡 → 「今天两样」卡（体重 + 睡眠一次保存）；快捷胶囊 4 枚 → 3 枚（删「拍照」）；习惯预设只留步数与饮水；身体面板标题追加「今天两样」 | 用户 2026-11-18 四条反馈：快速记录餐名叠后缀、首页拍照多余、体检两行点评重复、记录·身体要能一次记下当天睡眠体重。三样卡的旧断言指向已被 1.3.83 删除的 DOM，本轮顺势清掉死代码并跟到现役实现 |
| 2026-11-18 | 新增 `tests/body-quick.test.mjs` | 快速记录餐名去后缀（生成端 + 显示端）、首页无拍照胶囊、体检只有一行点评（含 `dailyCheck` 行为断言）、今天两样一次保存且同一天只留一行测量 | 同上；四条反馈各留一组断言，防止回退到叠后缀、双按钮、重复行 |
| 2026-11-18 | `tests/training-day-budget.test.mjs` ×5、`tests/training-library.test.mjs` ×2、`tests/records-panels.test.mjs` | 「训练日读 habit.training」→「读当天是否有带名字的动作」（`trainedOn`）；能量卡训练日/休息日改读 `range.trained`；RPE 与「建议」从已删除的 7 行表格断言改为「计划数据带 RPE + 周条详情带（训练库建议）」；训练段标题去掉不存在的「下周计划」 | 用户要求训练情况由动作判断、不再手填；1.3.44 的周条让旧表格断言守的是死代码，本轮一并跟到现役实现 |
| 2026-11-18 | 新增 `tests/plan-from-today.test.mjs` | 训练日推导（前端 4 处 + 原生 2 处）、习惯表无训练情况、图标链接 `text-decoration:none`、七天窗口从今天起算且标题为「本周安排」、一键排课按钮重新渲染 | 同上四条；另防止「一键排课」再次被死表达式吞掉 |
| 2026-11-18 | `tests/training-log.test.mjs` | 保存校验文案「每组都要填次数与负重；自重动作负重填 0」→「每组填次数；配重动作还要填负重，自重动作负重留空即可」 | 自重动作不再要求填重量（1.3.98），校验文案必须跟实现一致 |
| 2026-11-18 | `tests/ci-and-versions.test.mjs`、`tests/modularization.test.mjs` | `PROMPT_VERSION = 8` → `= 9` | AI 排今天的提示词新增「器械动作写清是哪种」「自重不要编重量」两句，版本号随提示词一起升 |
| 2026-11-18 | 新增 `tests/training-bodyweight.test.mjs` | 自重判定（含负重变体与别名）、`loadableWeightKg` 的杠铃/器械档位、`trainingStatsOf` 三口径、器械卧推说明匹配、记录与分析文案 | 用户要求区分卧推与器械卧推、让无配重项目可记录并进分析；行为断言从产物抽函数跑，不靠字符串冒充验证 |
| 2026-11-18 | `tests/lean-targets.test.mjs` ×3、`tests/targets.test.mjs` ×2、`tests/training-library.test.mjs` | 蛋白带 upper 2.2/2.4/2.5 → 2.4/2.6/2.6；三件套行数 5 → 7（新增训练要求、体重速率）；「13 个来源」→「至少 13 个来源」 | 用户要求按目标接上权威要求：增肌盈余改为 −10%（10~20% 区间，Iraki 2019）；缺口期蛋白上限按 Helms/Morton 口径放到 2.6；证据补录新增 5 个来源，来源数不再是固定 13 |
| 2026-11-18 | 新增 `tests/goal-requirements.test.mjs` | 文档表格与 `GOAL_PRESETS` 逐格比对（组数/次数/RIR/速率）、方向性（减脂比增肌掉得快、增肌量最大、缺口期蛋白更高）、5 条引用链接、页面与 AI 请求用到同一张表 | 目标要求表是新的单一来源，必须能被脚本校验；数字改了文档没改就失败 |
| 2026-11-18 | `tests/structure-phase.test.mjs` ×2、新增 `tests/rest-timer.test.mjs` | `restEnd = Date.now() + 90000` → `+ length * 1000`；`startRestTimer(true)` → `startRestTimer(true, seconds)` | 组间休息不再固定 90 秒：复合/孤立/自重/有氧各不同，且到点要响一声；断言跟到新签名与新时长来源 |
| 2026-11-19 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.4.00'` → `'1.4.01'`（片段常量、build.ps1 默认值、测试字面量三处同步） | 发布版本同步；dev-loop 按仓库护栏一次对齐三处，不手改版本号 |
| 2026-11-19 | 无断言变更 | 排今天（`focus=plan`）确认不带 `anchors`/`preferences`，也不放开 `chatDataContext` | 本轮曾两处都改过，被 `ai-plan-focus` 与 `meal-date-java` 的既有断言拦下并回滚：plan 分支不读这两个字段，深上下文只是拉长首字延迟。断言未变，记录在此防止下一轮再试一遍 |
| 2026-11-19 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.4.01'` → `'1.4.02'` | 发布版本同步，dev-loop 一次对齐片段常量、build.ps1 与测试字面量 |
| 2026-11-19 | 新增 `tests/week-switch.test.mjs` | 周条点击走 `setActiveDate` 而非只改 `#week-detail`；详情行/周条加深/要点标签的「今天」改按 `localDate()` 判定；选中格=`activeDate`；死变量 `weekEndPlan`/`firstPlanDay`/`cueToday` 不再出现；训练日志读与写都用 `activeDate` | 用户要求「切日期时回显那天的动作要点与当天训练日志，并支持修改」；旧实现在同一屏上让详情行按选中日、要点按 activeDate 走，读起来自相矛盾 |
| 2026-11-19 | `tests/plan-from-today.test.mjs` | 「一键排课 · 写入今天起 N 次」整句字面量 → `一键排课 · 写入' + esc(dayLabel(activeDate)) + '起 ` | 按钮文案改成跟着所看日期走（今天 / MM-DD），整句字面量不再存在于源码 |
| 2026-11-19 | 新增 `tests/plan-shared-template.test.mjs` | 部位唯一的来源函数、排今天与问答共用同一句；每组分时取自 `restSecondsFor` 且固定 2.5 分钟/组已删；时长预算与单次课 6~10 组进了两处提示词；采纳/排课/能量卡文案按 `dayLabel`；两套清单的关系说明存在 | P0–P2 落地：部位分歧、时长漏算组间休息、日期文案仍写「今天」、两套清单没有关系说明 |
| 2026-11-19 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.4.03'` → `'1.4.04'` | 发布版本同步 |
| 2026-11-19 | `tests/week-switch.test.mjs` | 整篇重写：「点周条 = 切 `activeDate`」→「点周条只换预览日，不动 `activeDate`」；新增要点块契约（`weekCueHtml` 按该天动作、`#week-cues-host` 就地替换、休息日不给要点） | 用户明确要求「点 21 号页面不跳转、可点回 19 号」；切 `activeDate` 会让周条窗口从 21 起算，用户回不到原来那段上下文 |
| 2026-11-19 | `tests/week-switch.test.mjs` | 新增 5 条：折叠块不再列 AI 的逐动作理由、标题改为「这周怎么排的」、理由仍在今日顺序每行、`aiPlanEntries` 已删、`previewDay`/`aiEntries` 残骸归零 | 用户反馈「会展示当天动作安排，切预览日期不变会误导」；块里的按天内容要么跟着预览日走，要么删掉——选了删 |
| 2026-11-19 | `tests/training-library.test.mjs` | `the why block reflects the AI order`（断言 `aiPlanEntries` 存在 + `plan-why-ai` 存在）→ `the AI order reasons live on the order rows`（断言 `ai-plan-reason` 存在且 `plan-why-ai` 已消失） | 折叠块不再重复 AI 的逐动作理由：它只讲一周口径，按天的理由留在「今日顺序」每行；旧断言保护的正是被删的行为 |
| 2026-11-19 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.4.05'` → `'1.4.06'` | 发布版本同步 |
| 2026-11-19 | 新增 `tests/explain-text.test.mjs` | 说明文本只有一个字号口径（`.card p.fine-print` 等比 `.card p` 更具体）、相邻说明收距、`.note-safe` 存在且≥3 处、指路只指向存在的入口、外发开关在 `subpage-data` 内、三条重复文案不再回来 | 1.4.07 解释性文本收口：旧文案把入口写成「数据、外观与说明」，运行时该 hub 已被拆成「更多设置 → 数据管理」 |
| 2026-11-19 | `tests/p0-p1-round.test.mjs` | `the data/appearance summary has an icon`（断言 app 含「数据、外观与说明」）→ `settings pointers name entries that exist`（断言含「我的 → 更多设置 → 数据管理」且不再含旧名） | 旧断言守的正是失效指路文案；入口在 `installSubpageLayout` 里被搬走 |
| 2026-11-19 | `tests/meal-date-java.test.mjs` | `APP_VERSION = '1.4.06'` → `'1.4.07'` | 发布版本同步 |
| 2026-11-19 | `tests/ci-and-versions.test.mjs` | 新增 3 条：关于页写作者与仓库地址、页面/许可都写「严禁二次转售」、README 保留 631 KB 与签名指纹 | 1.4.09 开源化：关于页与页脚补作者信息与 GitHub 地址，许可证改为「源码可见 + 禁止转售」；README 成为对外展示页，下载与签名事实必须可核对 |
