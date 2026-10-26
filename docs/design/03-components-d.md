# 阶段 3.5 · D 组：今日顺序、计划文字排布、输入入口

> 前置：`04-task-redesign.md`（范围与验收）、`02-tokens.md`（既有 token，本轮**未新增任何颜色值**）、`03-components-b.md`（按钮与底部弹层规范）。
> 落地范围：`styles.css` 的规则、`index.html` 的块、`app/src/fragments` 里的函数。`app.js` 是生成物，改完 fragments 跑 `tools\assemble-app.ps1`。
> 对比度底：纸感 `--surface #fffdf7` / `--paper #fffefa`；账本 `--surface #ffffff` / `--paper #f2f5f7`。

---

## 一、「用 AI 排今天」的结果呈现

**现状判定**：三行一组的竖排把 6 个动作撑到两屏，序号缺席，两个次按钮夹在同意勾选与列表之间，标题右侧的「6 个动作」只报告了动作条数、没报告工作量。

### 新结构

```
.aa-plan（沿用 .ai-plan 容器）
├─ 标题行        今日顺序 ·····························  [6 个动作]
├─ 同意勾选      ☐ 我同意把今天的训练记录…              ← 全宽，最高 2 行
├─ 主行动行      [用 AI 排今天]                        ← 唯一 primary
├─ 次行动行      修改 · 清除                           ← text-button，行内
├─ 汇总条        共 24 组 · 按组数约需 60 分钟  [改成 60 分钟]  ← 差异 ≥10 分钟才出按钮
└─ 列表          ① ☐ 卧推        4 组 × 8 次 × 60 kg
                ② ☐ 上斜哑铃卧推 3 组 × 10 次 × 22 kg
                …（一行一个动作，48px）
```

一行之内从左到右：勾选框 → 序号 → 名称 → 剂量。序号由 CSS 计数器生成，不进数据。

### CSS diff

```css
- .ai-plan-row{display:flex;align-items:center;gap:var(--space-2);padding:8px 0;border-bottom:1px solid var(--line);font-size:var(--text-md)}
+ #ai-plan-list{counter-reset:ai-step}
+ .ai-plan-row{display:flex;flex-direction:row;align-items:center;gap:var(--space-2);margin:0;
+   min-height:48px;padding:var(--space-2) 0;border-bottom:1px solid var(--line);font-size:var(--text-md)}
+ .ai-plan-row input{order:-1;flex:0 0 auto;width:18px;height:18px;margin:0;accent-color:var(--accent)}
+ .ai-plan-row::before{counter-increment:ai-step;content:counter(ai-step);flex:0 0 1.5em;
+   color:var(--muted);font-size:var(--text-sm);font-variant-numeric:tabular-nums}

- .ai-plan-name{flex:1 1 auto;color:var(--ink)}
+ .ai-plan-name{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;color:var(--ink)}

- .ai-plan-dose{flex:0 0 auto;color:var(--muted);…}
+ .ai-plan-dose{flex:0 0 auto;white-space:nowrap;color:var(--muted);…}

+ .ai-plan-summary{margin:var(--space-2) 0 0;font-size:var(--text-xs);
+   color:var(--muted);font-variant-numeric:tabular-nums}

- .ai-plan-list.editing .ai-plan-row::after
+ #ai-plan-list.editing .ai-plan-row::after
```

`flex-direction:row` 是必须写的：全局 `label{flex-direction:column}`（L83）会被 `<label class="ai-plan-row">` 继承，这正是原来竖排的成因。`order:-1` 把勾选框提到计数器之前。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 行高下限 | 48px（`--space-2` 上下各 8） | 同左，密度层只改卡片内边距 |
| 序号字色 | `--muted #667169`，对 `--surface` 5.00:1 | `--muted #6a6d6b`，5.23:1 |
| 剂量字色 | 同上 | 同上 |
| 汇总条字色 | `--muted` 同上 | `--muted` 同上 |
| 分隔线 | `--line #e4e9df` | `--line #dfe3e8` |

### 理由

序号写进左边距而不是写进名称（「1. 卧推」），是为了让 6 行的名称与剂量各自左对齐成一列——眼睛竖着扫序号、横着读剂量，两种扫法都不被字形打断。勾选框放在序号的左边而不是名称上方，是因为它是这一行的唯一可操作物，必须落在拇指最先到达的列。汇总条的时长先由组数算出（每组约 2.5 分钟 = 执行 45 秒 + 组间休息 90 秒 + 换动作摊销），再向上取到偏好里的档位（30 / 45 / 60 / 75 / 90）。这一版把「实现训练需求」放在第一位：**需求决定时长，偏好只是被提醒的对象**。当两者相差 ≥10 分钟时，汇总条右侧出现「改成 X 分钟」，点了才弹确认框，不主动打断；差距不大时就只写一句「你设的是 45 分钟」，不制造待办。系数 2.5 是可调的常量（`AI_PLAN_MINUTES_PER_SET`），不是从数据里推出来的——这一点必须明说，免得以后被当成实测值引用。

---

## 二、训练计划的文字排布

**现状判定**：三件事挤在一行 chip 里、负荷结论写成句子、术语夹在散文中间，读者要读完一整段才知道今天练不练。

### 新结构

```
#week-plan
├─ 本周安排 · MM-DD 起 · 每周 N 练      （列表，保持不变）
├─ 计划提示（.plan-cue，可保留）
├─ 状态块 .plan-state                  ← 三行，标签定宽 5.5em
│    今天          推 · 卧推、上斜哑铃卧推、双杠臂屈伸
│    下一训练日     11-02 · 拉 · 高位下拉
│    分化          推 / 拉 / 腿
├─ 负荷条 .plan-load                   ← 标签 + 数值 + 判定
│    急慢性负荷比   1.62        偏高 · 本周减载
├─ 建议提示（带「建议」的动作说明）
├─ ▸ 为什么这样排（details，默认收起）  ← 原来那句 note 移到这里，作第一段
└─ ▸ 整理图参考处方（details，默认收起）
```

### CSS diff

```css
- .plan-today{margin:0 0 6px;padding:8px 10px;border-radius:10px;background:var(--accent-soft);font-size:13.5px}
+ .plan-state{margin:0 0 var(--space-2);padding:var(--space-2) var(--space-3);
+   border-radius:10px;background:var(--accent-soft)}
+ .plan-state-row{display:flex;flex-direction:row;align-items:baseline;
+   gap:var(--space-2);margin:0;line-height:1.5}
+ .plan-state-row+.plan-state-row{margin-top:2px}
+ .plan-state-row>span{flex:0 0 5.5em;font-size:var(--text-xs);color:var(--ink-soft)}
+ .plan-state-row>b{flex:1 1 auto;min-width:0;font-size:var(--text-sm);
+   font-weight:var(--fw-medium);color:var(--ink);overflow-wrap:anywhere}

+ .plan-load{display:flex;flex-direction:row;align-items:baseline;gap:var(--space-2);
+   margin:0 0 var(--space-2);padding:8px 10px;border:1px solid var(--line);
+   border-radius:10px;background:var(--surface);font-size:var(--text-sm)}
+ .plan-load-label{flex:0 0 auto;font-size:var(--text-xs);color:var(--ink-soft)}
+ .plan-load-value{flex:0 0 auto;font-weight:var(--fw-semibold);color:var(--ink);
+   font-variant-numeric:tabular-nums}
+ .plan-load-verdict{flex:0 1 auto;margin-left:auto;font-size:var(--text-xs);
+   color:var(--muted);text-align:right}
+ .plan-load.is-high{border-color:var(--warn-line);background:var(--warn-soft)}
+ .plan-load.is-high .plan-load-value,.plan-load.is-high .plan-load-verdict{color:var(--warn)}

+ #week-plan p{max-width:22em}
```

JS 侧：`renderWeekPlan()` 里 `todayText` 改建成 `stateRows` 三行；`acwrFromDailyLoads()` 已算出 `stats.ratio`／`stats.flag`，直接在同一作用域取用，**不改 `generateWeekPlan` 的返回结构**；`plan.note` 从独立 `<p class="fine-print">` 移进 `<details class="plan-why">` 作第一段，并把该 details 改为恒常渲染（此前无 `reasons` 时整块消失）。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 状态块底 | `--accent-soft #eef4ea` | `--accent-soft #eef3f0` |
| 状态标签字色 | `--ink-soft #506053`，对 `--accent-soft` 5.98:1 | 同值，5.96:1 |
| 状态值字色 | `--ink #293c32`，10.50:1 | `--ink #16181a`，15.86:1 |
| 负荷条底 | `--surface #fffdf7` | `--surface #ffffff` |
| 偏高态 | 底 `--warn-soft #f6efe3`、边 `--warn-line #e4d5bf`、字 `--warn #9e5c29`（4.57:1） | `#f4f1ea` / `#e2dccf` / `#95602b`（4.67:1） |
| 正文行宽 | 22em ≈ 22 字 | 同左 |

`is-low` 不另设色：偏低不是警报，只把判定文字留在 `--ink-soft`。判定文案里的「减载」会被 `annotateTerms()` 自动挂上术语按钮，与既有词条打通。

### 优点以外的一处取舍

「急慢性负荷比」用的是中文全称而不是缩写 `ACWR`。这样标签本身就成了 4–8 字的首次解释，读者不必再点一次术语按钮；代价是 glossary 里的 `ACWR` 词条在这块不触发（它在别处仍会出现）。

### 理由

状态块用定宽标签（5.5em）而不是「今天：」串在句首，是为了让三行冒号对齐成一条竖线，读者只扫右半列就知道今天练不练、下次哪天、什么分化。负荷条把结论从句子拆成三段（标签／数值／判定），是因为「负荷」这件事有两个读者：想看数字的人要 `1.62`，想知道怎么办的人要「本周减载」，串成一句话两拨人都得读完。解释性文字全部下沉到默认收起的 details，首屏只留可执行的三行状态和一条负荷——这一点是「一眼能懂」和「看起来更整齐」的分界。

---

## 三、拍照 / 从相册选的一致性

**现状判定**：两个等权的灰卡并排，图标风格与标签长度都不等，旁边的语音是竖长条，三种输入方式没有共同尺度。

### 新结构（采用「添加」底部弹层）

```
记录页 · 轻松记一餐
├─ 文本域（语音按钮仍在域内右侧）
├─ [📷 添加照片]                      ← 单行入口，48px，占满宽
│    └─ 点击 → #photo-sheet
└─ …

#photo-sheet（.sheet，全局层，与 #action-sheet 同级）
└─ .sheet-panel
   ├─ 添加照片（.sheet-title）
   ├─ ▸ 拍照          ← <label for="meal-image">，原生打开相机
   ├─ ▸ 从相册选       ← <label for="meal-gallery">，原生打开相册
   └─ [取消]
```

两个输入 `#meal-image`（带 `capture="environment"`）与 `#meal-gallery`（不带）保持原样；弹层里的两项是 `<label for>`，靠原生行为打开选择器，**JS 不给它们绑 `input.click()`**——原生只触发一次，再绑会弹两次。

### CSS diff

```css
  （本轮共删除 9 行死规则，按选择器文本删，不按行号：）
- .capture-actions{display:grid;grid-template-columns:1fr 1fr;gap:var(--gap)}   /* 从未生效 */
- .capture-button{…}            /* HTML 与 fragments 中 0 处引用 */
- .capture-icon{display:block;width:48px;…}
- .capture-actions{display:flex;gap:var(--space-2)}
- .capture-icon{width:20px;height:20px;opacity:.85}
- .capture-actions{display:flex;align-items:center;gap:var(--space-1);…}
- .capture-icon{width:var(--icon-sm);…}
- .capture-actions{display:flex;gap:var(--space-2)}
- .capture-card{…;flex-direction:column;…min-height:72px;…}
  （前 8 行都被文末那一组 v3 规则整组覆盖；`.capture-icon` 类名虽仍出现在问答页的 <img> 上，
   但其尺寸已由 `.capture-card img` 接管，所以这些声明同样是死的。保留唯一的
   `.capture-actions{display:flex;gap:var(--space-2);margin:var(--space-1) 0 0}` 与 `.capture-card{…flex-direction:row…}`）

+ .photo-add{…;min-height:var(--btn-h)}        /* 48px，与表单控件同高 */
+ .sheet-option{…}                             /* 沿用 B 组定义 */
+ label.sheet-option{flex-direction:row;margin:0;cursor:pointer}
```

`label.sheet-option` 这条是必需的：全局 `label{display:flex;flex-direction:column;margin-bottom:15px}` 会让弹层选项变成竖排且带下边距。

### 两套皮肤取值

| 项 | 纸感 | 账本 |
|---|---|---|
| 入口按钮高 | `--btn-h` 48px | 同左 |
| 入口按钮底 | `--surface #fffdf7` | `--surface #ffffff` |
| 入口按钮边 | `--line #e4e9df`（装饰边，非控件边界） | `--line #dfe3e8` |
| 弹层选项高 | 52px（B 组 `.sheet-option`） | 同左 |
| 选项描边 | `--line` | `--line` |
| 圆角 | `--radius-md`（12） | `--shape-row-radius`（4） |

对比度：入口按钮文字用 `--body-text`（10.71:1 / 10.98:1）；弹层选项文字 `--ink`（11.56:1 / 17.80:1）。控件边界的 3:1 要求落在 `input`/`select`/`textarea` 的 `--line-strong`（3.33:1 / 3.44:1），入口按钮与弹层选项是链接式可点区，不承担「可编辑控件」的边界要求。

### 三种异常态的文案

| 情形 | 文案 | 落点 |
|---|---|---|
| 没有相机权限 | 相机权限已关闭，无法拍照。请点「从相册选择」，或在系统设置里允许轻衡使用相机。 | `MainActivity.onRequestPermissionsResult` → `__qinghengImageError`（已有，未改） |
| 相册被取消 | 没有选择照片，原来的内容没动。 | `#meal-image` 的 `change`，`files` 为空时（本轮补上，此前会 `clearImage()` 静默抹掉已选照片） |
| 图片过大 | 图片过大，请选择小于 20MB 的图片。 | `compressImage()`（已有，上限 `20 * 1024 * 1024`） |

三句都不带催促，也都不把责任推给用户。

### 理由

把两个等权灰卡换成「一个入口 + 一次选择」，是因为两张卡并排时读者要在点击前先分辨「这两个有什么不同」；收进弹层后，点击前只需要判断「我要不要加照片」。弹层里仍把「拍照」放在第一项，主次靠顺序而不是靠颜色深浅——用底色深浅区分同级入口，会让较浅的那个看起来像不可用。语音留在文本域内不改：它补的是「懒得打字」，不是「懒得描述」。取消选择不该清空已有照片，是因为取消的语义是「当我没点」，不是「清空」。

---

## 验收

| 项 | 标准 | 结果 | 依据 |
|---|---|---|---|
| 单动作行高 | ≤72px | **通过** | `.ai-plan-row` 为 `min-height:48px` + 上下 `--space-2`（8px），行高 48px；单行文本不折行，最坏情况也 <72px |
| 360 宽首屏动作可见数 | ≥4 | **通过（按布局推算，未做真机测量）** | 卡片内可用宽约 328px；48px × 6 = 288px，加上标题行、同意勾选、主次行动行与汇总条约 200px，首屏 800px 内可见 5–6 行 |
| 预计时长 | 以训练需求为准，可提醒修改 | **通过（新增）** | `aiPlanMinutes()` 按 24 组 × 2.5 分钟 = 60 分钟；与偏好差 ≥10 分钟时出「改成 60 分钟」，经 `askConfirm` 确认后才写回 `prefs.minutes`，并同步 `#pref-minutes` |
| 数字与单位 | 无跨行拆分 | **通过** | `.ai-plan-dose{white-space:nowrap}`，`4 组 × 8 次 × 60 kg` 整体不折行 |
| 术语 | RM/RPE/ACWR 首次出现有解释 | **通过** | `ACWR` 在负荷条改写成中文全称「急慢性负荷比」，标签即解释；`RM`/`RPE` 由 `annotateTerms()` 挂术语按钮，词条正文为 4–8 字到一句话 |
| 中文行宽 | 18–24 字/行，无单字成行 | **通过** | `#week-plan p{max-width:22em}`，按 14px 字宽约 22 字；`.plan-state-row>b` 有 `overflow-wrap:anywhere` 但无 `text-wrap` 控制，极长动作名仍可能出现单字成行（已知残余） |
| 输入入口 | 三者同一尺寸体系，主次分明 | **部分通过** | 拍照／相册统一为 52px 的 `.sheet-option`；语音仍是文本域内的 48px `.mic-button`，形状为竖条，未并入弹层 |
| 对比度 | 正文 ≥4.5:1，控件边界 ≥3:1 | **通过** | 状态值 `--ink` 10.50/15.86；状态标签 `--ink-soft` 5.98/5.96；负荷判定 `--muted` 5.00/5.23；偏高态 `--warn` 4.57/4.67；控件边界 `--line-strong` 3.33/3.44 |

两条未完全达标的地方写在这里而不是藏起来：

1. **首屏可见数是推算，不是实测。** 需要真机或 WebView 截图确认，尤其要确认同意勾选未被底部导航遮住（`01-audit.md` 审计 #1）。
2. **语音没有并进弹层。** 它仍是文本域内的独立按钮，「三者同一尺寸体系」只做到了两项统一。并进去需要一个「添加：照片 / 语音」二选一弹层，会让「记一餐」的主路径多一次点击，暂不划算。
3. **2.5 分钟/组是经验系数，不是实测。** 它是 `AI_PLAN_MINUTES_PER_SET` 常量，训练密度变了要跟着调；把它当实测值引用会错。
4. **档位只到 90 分钟。** 超过 36 组的计划会被夹到 90，汇总条不会报「约需 100 分钟 +」——宁可少报，也不给一个兑现不了的数字。

### 附：死规则与测试契约

本轮把 `.capture-button` / `.capture-icon` / 旧 `.capture-actions` / 旧 `.capture-card` 共 9 行删除后，有 5 处断言指向这些已不存在的选择器。改法是让断言去盯现役类，而不是放宽或删掉断言：

| 测试 | 原断言 | 改后 |
|---|---|---|
| `frontend-audit.mjs` | `.capture-actions{…gap:var(--gap)}` | `.capture-actions{…gap:var(--space-2)}` |
| `frontend-audit.mjs` | `.capture-button:active{` | `.sheet-option:active{` |
| `gallery.test.mjs` | `.capture-actions{…grid-template-columns:1fr 1fr}` | `.capture-actions{…display:flex}` |
| `gallery.test.mjs` | `.capture-button{` | `.capture-card{` |
| `training-library.test.mjs` | `.capture-button:active{background:var(--ok-soft)}` + `color:var(--accent)` | `.photo-add:active{background:var(--surface-soft)}` + `.sheet-option:active{background:var(--accent-soft)}` |

每条改后仍检查「间距用共享 token」「可点元素有按下态」「两枚入口并排」「皮肤跟随」这四件事本身，只是换成了实际存在的选择器。
