# 阶段 3 · 组件规范 B 组：表单控件、按钮、底部弹层

> 沿用 `03-components-a.md` §0/§4 的 token 与对比度口径，不另起一套。对比度底色同 A 组：纸感 `--surface #fffdf7` / `--paper #fffefa`；账本 `--surface #ffffff` / `--paper #f2f5f7`。
> 正文 ≥4.5:1；交互控件边界与焦点指示 ≥3:1；装饰线豁免。只给规范与 diff，**未改 `styles.css`**。

## 0. 本组新定 / 修正的 token（已回写 `02-tokens.md` §0）

| token | 纸感 | 账本 | 原因 |
|---|---|---|---|
| `--line-strong`（账本改值） | #858e83（不变） | #878e97 → **#848b95** | A 组只验了 paper/surface；账本 `--accent-soft #eef3f0` 上仅 2.95:1，加深后最低 3.06:1 |
| `--warn`（纸感改值） | #a8622c → **#9e5c29** | #95602b（不变） | 纸感在 `--warn-soft #f6efe3` 上 4.13:1；改后最低 4.57:1。账本最低 4.67:1 |
| `--accent-press`（新增） | **#2f5340** | 同左 | 主按钮按下底色，白字 8.63:1；原 `.primary:active` 硬写值收编 |
| `--field-bg`：**不新增**，输入框底直接用 `--paper` | — | — | L51 的 `#fbfcf8` 已被 L97 `var(--paper)` 覆盖，是死值 |

**最小高度的实际生效值**：L51 `.button{min-height:var(--btn-h)}`、L97 输入框 `min-height:var(--btn-h)` 都被 **L518** `button,.button,select,input…{min-height:40px}` 覆盖（同特异性、后写），全站按钮与输入框实际只有 **40px**，不是 48px。B 组所有触达结论以此为准。

## 1. 表单控件 `input` / `select` / `textarea` / `.check-label`

**何时用**：用户要输入或修改一个会被保存的值时用；只是筛选当前视图（不保存）用 A 组分段控件；2–5 个互斥选项且需要一眼看全时用单选或分段，不用 `select`（下拉要多点一次才看得到选项）。

**token 取值**

| 属性 | 纸感 | 账本 |
|---|---|---|
| 最小高度 | `--btn-h` 48px | 48px |
| 底色 | `--paper` #fffefa | `--paper` #f2f5f7 |
| 描边（控件边界） | `1px solid var(--line-strong)` #858e83 | #848b95 |
| 圆角 | `--shape-ctrl-radius` 12px | 4px |
| 输入文字 | `--ink`、`--text-md` | 同左 |
| 标签文字 | `--ink-soft` #506053、`--text-sm` | 同左 |
| placeholder | `--muted` #667169 | `--muted` #6a6d6b |
| `:focus-visible` | 描边 `--ring-focus-color` + `box-shadow:var(--ring-focus)` | 同左 |
| 错误态 | 描边 `--danger` 2px（1px 描边 + 1px inset）+ 下方错误文字 `--danger` | 同左（账本 `--danger #9c4a3e`） |
| 只读态 | 底 `--surface-soft`、描边 `1px dashed var(--line-strong)`、文字 `--ink` | 同左 |
| 禁用态 | 底 `--surface-soft`、描边 `--line`、文字 `--muted` | 同左 |
| 勾选框 | `accent-color:var(--accent)`，整行可点，行高 ≥44px | 同左 |

**CSS diff**

```diff
- input,textarea,select{…;min-height:44px;border:1px solid #e0e6db;background:#fbfcf8;border-radius:12px;…;font-size:13px}   /* L51，被 L97 覆盖 */
+ /* 删除，合并进 L97 */
- input:not([type=checkbox]):not([type=radio]),select,textarea{…;border:1px solid var(--line);border-radius:var(--btn-radius);…;font-size:14px;…}
+ input:not([type=checkbox]):not([type=radio]),select,textarea{…;border:1px solid var(--line-strong);border-radius:var(--shape-ctrl-radius);…;font-size:var(--text-md);…}
- button,.button,select,input:not([type=checkbox]):not([type=radio]){min-height:40px}          /* L518 */
+ /* 删除；高度回到 --btn-h */
- label{…;color:#5c6e5f}
+ label{…;color:var(--ink-soft)}
- input::placeholder,textarea::placeholder{color:#a0aaa0;…}
+ input::placeholder,textarea::placeholder{color:var(--muted);…}
- input:not([type=checkbox]):not([type=radio]):focus,select:focus,textarea:focus{border-color:#a9c6b3;outline:none;box-shadow:0 0 0 3px #cfe3d67a}
+ input:not([type=checkbox]):not([type=radio]):focus-visible,select:focus-visible,textarea:focus-visible{
+   border-color:var(--ring-focus-color);outline:none;box-shadow:var(--ring-focus)}
+ :is(input,select,textarea)[aria-invalid="true"]{border-color:var(--danger);box-shadow:inset 0 0 0 1px var(--danger)}
+ :is(input,select,textarea)[aria-invalid="true"]:focus-visible{box-shadow:inset 0 0 0 1px var(--danger),var(--ring-focus)}
+ .field-error{margin:var(--space-1) 0 0;font-size:var(--text-sm);color:var(--danger)}
+ .field-error::before{content:"! ";font-weight:var(--fw-semibold)}
+ :is(input,textarea)[readonly]{background:var(--surface-soft);border-style:dashed}
+ :is(input,select,textarea):disabled{background:var(--surface-soft);border-color:var(--line);color:var(--muted);cursor:not-allowed}
- .check-label input{…;accent-color:var(--mint-dark)}
+ .check-label input{…;accent-color:var(--accent)}
+ .check-label{min-height:44px;align-items:center}
- .date-picker input{min-height:38px;…}
+ .date-picker input{…}                                         /* 回到 --btn-h */
- .estimate-item input{min-height:36px;…;padding:7px 9px}
+ .estimate-item input{…;padding:var(--space-2) var(--space-3)}  /* 回到 --btn-h */
- .form-feedback.success{color:var(--mint-dark)}
+ .form-feedback.success{color:var(--ok)}
  select{…;background-image:url("…stroke='%2344755d'…")}
+ select{…;background-image:url("…stroke='%233f6b4a'…")}        /* data URI 不能引用 var()，硬写 --accent 值，两皮肤同值，例外登记 */
```

`:focus` → `:focus-visible`：文本类输入在任何聚焦方式下都匹配 `:focus-visible`，触屏用户看到的效果不变；只有 `select` 在鼠标点开时不再显示焦点环。这是 6 处 `:focus` 里的 3 处（L102 一条规则 3 个选择器）。

**可访问性**

- 触达：目标 48px；现状 40px（L518），**未达标**，删 L518 即达标。`.date-picker`（38px）、`.estimate-item`（36px）同。`.check-label` 勾选框只有 16px，整行 `<label>` 可点，但行高约 36px，**未达标** → 补 `min-height:44px`。
- 对比：输入文字 `--ink` 11.5:1 起；标签 `--ink-soft` 6.63:1；placeholder 原 `#a0aaa0` **2.38:1** → `--muted` 5.04:1（纸感 `--paper`）/ 4.78:1（账本 `--paper`）。错误文字 `--danger` 5.82 / 5.36:1。只读 `--ink` 在 `--surface-soft` 上 10.49 / 16.23:1。
- 边界：原 `--line` 1.22:1，**未达 3:1** → `--line-strong` 3.36:1（纸感对 `--paper`）/ 3.14:1（账本对 `--paper`）；对外部卡片底 `--surface` 3.33 / 3.44:1。错误态描边 `--danger` 5.82 / 5.54:1，并用 2px 线宽 + 「!」前缀，**不只靠颜色**。只读用虚线区分，禁用态按 WCAG 豁免对比度。
- 焦点：`--ring-focus-color` #5b8e76 对 `--paper` 3.73:1、对两皮肤 `--accent-soft` 3.36:1 起。错误态下焦点环叠在红色描边外侧，两种信号同时可见。
- 错误关联：JS 现在只用 `reportValidity()`（7 处）弹浏览器原生气泡，**全站 0 处 `aria-invalid`、0 处字段级错误文字**，表单级 `.form-feedback.error` 没有和字段关联，**未达标**。阶段 3 交互层需：校验失败时给字段设 `aria-invalid="true"`，插入 `.field-error` 并用 `aria-describedby` 关联。本组只给样式。
- 只读：全站 0 处 `readonly`，样式先备着，供「已同步、不可改」的字段（如自动算出的 BMI）使用。

## 2. 按钮：主 `.button.primary` / 次 `.button.subtle` / 幽灵 `.text-button`、`.icon-button.subtle`

**何时用**：一屏（或一个弹层）只放 **1 个主按钮**，给「完成这一屏目的」的动作（保存、记一餐）；同屏其余可执行动作用次按钮；不改数据、只导航或展开（「查看全部」「换一种说法」「返回」）用幽灵按钮。删除等不可撤销动作用主按钮的 `.danger` 变体，且必须经确认弹窗。现状统计：`button primary` 25 处、`button subtle` 44 处、`text-button` 9 处，**全站没有 `.secondary`/`.ghost` 类**，次 = `subtle`，幽灵 = `text-button`，不改类名。

**token 取值（三档 × 四态）**

| 档 / 态 | 属性 | 纸感 | 账本 |
|---|---|---|---|
| 公共 | 最小高度 | `--btn-h` 48px | 48px |
| 公共 | 圆角 | `--shape-ctrl-radius` 12px | 4px |
| 公共 | 字号 / 字重 / 字距 | `--text-md` / `--fw-semibold` / `--tracking-label` | 同左 |
| 主·默认 | 底 / 字 / 影 | `--accent` #3f6b4a / `--on-accent` #fff / `--elev-2` | 同左 / 同左 / `none` |
| 主·按下 | 底 / 影 / 形变 | `--accent-press` #2f5340 / `--elev-1` / `scale(.98)` | 同左 / `none` / 同左 |
| 主·danger | 底 | `--danger` #a74638 | `--danger` #9c4a3e |
| 次·默认 | 底 / 字 / 边 | `--accent-soft` #eef4ea / `--accent` / `1px solid var(--line-strong)` | #eef3f0 / 同左 / #848b95 |
| 次·按下 | 边 / 形变 | `--accent` / `scale(.98)` | 同左 |
| 幽灵·默认 | 底 / 字 / 边 | `transparent` / `--accent` / 无 | 同左 |
| 幽灵·按下 | 底 | `--accent-soft` | 同左 |
| 三档·禁用 | 底 / 字 / 边 / 影 | 主、次：`--surface-soft` / `--muted` / `1px solid var(--line)` / `none`；幽灵：`transparent` / `--muted` | 同左 |
| 三档·加载中 | 外观 | **保持本档默认色**，文字前加 `--icon-sm` 转圈（`currentColor`，`--dur-spin`），文案改「…中」 | 同左 |
| 三档·焦点 | 外环 | `outline:2px solid var(--ring-focus-color)`，`outline-offset:2px` | 同左 |

**CSS diff**

```diff
- .button{…;min-height:var(--btn-h);border-radius:var(--btn-radius);…;padding:12px 20px;…;font-size:13px;font-weight:650;letter-spacing:.3px;transition:background .15s,transform .15s,box-shadow .15s}
+ .button{…;min-height:var(--btn-h);…;padding:var(--space-3) var(--space-4);…;font-size:var(--text-md);font-weight:var(--fw-semibold);
+         letter-spacing:var(--tracking-label);transition:background var(--dur-fast),transform var(--dur-fast),box-shadow var(--dur-fast)}
- .button:hover{transform:translateY(-1px)}
+ /* 删除：触屏无 hover，WebView 里会"粘"在最后一次点过的按钮上 */
- .button:active{transform:scale(.97)}
+ .button:active{transform:scale(.98)}
- .button.primary{border-radius:var(--shape-ctrl-radius)}        /* L814，与 L813 重复，删 */
- button,.button,select,input:not([type=checkbox]):not([type=radio]){min-height:40px}   /* L518，删，见 §1 */

  /* 主 */
- .primary{background:var(--mint-dark);color:#fff;box-shadow:0 4px 14px rgba(68,117,93,.26)}
+ .primary{background:var(--accent);color:var(--on-accent);box-shadow:var(--elev-2)}
- .primary:hover{background:#365e4a}
+ /* 删除 */
- .primary:active{background:#2f5340;box-shadow:0 2px 8px rgba(68,117,93,.22)}
+ .primary:active{background:var(--accent-press);box-shadow:var(--elev-1)}
- .app-dialog-panel.danger #app-dialog-ok{background:#a74638}
+ .button.primary.danger,.app-dialog-panel.danger #app-dialog-ok{background:var(--danger)}

  /* 次 */
- .subtle{background:#f0f3eb;color:#516d57;border-color:#e3e9dd}
+ .subtle{background:var(--accent-soft);color:var(--accent);border-color:var(--line-strong)}
- .subtle:active{background:#e3eadf}
+ .subtle:active{border-color:var(--accent)}

  /* 幽灵 */
- .text-button{background:none;border:0;padding:10px 4px;color:var(--mint-dark);font-size:12.5px;min-height:44px}
+ .text-button{background:none;border:0;padding:var(--space-2) var(--space-2);color:var(--accent);font-size:var(--text-sm);min-height:44px}
- .text-button:active{opacity:.65}
+ .text-button:active,.icon-button.subtle:active{background:var(--accent-soft)}
- .icon-button{…;width:40px;height:40px;min-width:40px;min-height:40px;…;border-radius:13px;…;color:var(--muted)}
+ .icon-button{…;width:44px;height:44px;min-width:44px;min-height:44px;…;color:var(--ink-soft)}
- .icon-button.danger{color:var(--danger);border-color:#eddcd7}
+ .icon-button.danger{color:var(--danger);border-color:var(--danger)}
- .icon-button:active{background:#f4f7f2}
+ .icon-button:active{background:var(--accent-soft)}

  /* 禁用：与"加载中"拆开 */
- button:disabled{cursor:wait;opacity:.55}
+ :is(.button,.text-button,.icon-button):disabled{opacity:1;cursor:not-allowed;background:var(--surface-soft);
+          color:var(--muted);border-color:var(--line);box-shadow:none;transform:none}
+ :is(.text-button,.icon-button.subtle):disabled{background:transparent}

  /* 加载中：保留本档颜色，只加转圈 */
+ :is(.button,.text-button)[aria-busy="true"]{cursor:progress;pointer-events:none}
+ .button.primary[aria-busy="true"]{background:var(--accent);color:var(--on-accent)}
+ .button.subtle[aria-busy="true"]{background:var(--accent-soft);color:var(--accent);border-color:var(--line-strong)}
+ .text-button[aria-busy="true"]{background:transparent;color:var(--accent)}
+ :is(.button,.text-button)[aria-busy="true"]::before{content:"";width:var(--icon-sm);height:var(--icon-sm);border-radius:50%;
+          border:2px solid currentColor;border-right-color:transparent;animation:busy-spin var(--dur-spin) linear infinite}
+ @media (prefers-reduced-motion:reduce){:is(.button,.text-button)[aria-busy="true"]::before{animation:none;border-right-color:currentColor;opacity:.6}}

  /* 焦点：两条全局规则合一 */
- button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #78a992;outline-offset:3px}  /* L51 */
- :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:var(--radius-sm)}                                               /* L483 */
+ :focus-visible{outline:2px solid var(--ring-focus-color);outline-offset:2px}
- .button.is-now{outline:2px solid var(--accent);outline-offset:2px}
+ .button.is-now{box-shadow:inset 0 0 0 2px var(--accent)}         /* 「当前」标记不能长得像焦点环 */
```

加载中的 JS 约定（交互层落地，本组只定外观）：异步开始时 `button.disabled = true` + `aria-busy="true"` + 文案改「保存中…」，结束后三者同时还原。现有 20 处 `button.disabled = true` 只做了第一步，所以现在加载中看起来和禁用一样（55% 透明 + `cursor:wait`），用户分不清「在跑」还是「点不了」。

`#habit-chips/#training-advice-chips/#chat-chips .button{min-height:0;padding:6px 10px}` 是建议 chip，不属三档按钮，归 C 组 chip 处理。

**可访问性**

- 触达：目标 48px（主/次）、44px（幽灵、图标按钮）。现状因 L518 只有 **40px**，`.icon-button` 40px，**均未达标**，按 diff 修正后达标。建议 chip 约 30px，**未达标**，C 组处理。
- 对比（文字）：主 白/`--accent` 6.15:1，按下白/`--accent-press` 8.63:1，danger 白/`--danger` 5.87 / 6.06:1；次 `--accent`/`--accent-soft` 5.50 / 5.48:1；幽灵 `--accent` 对 `--surface` 6.05:1、对账本 `--paper` 5.62:1。原次按钮 `#516d57`/`#f0f3eb` 5.10:1 也达标，换 token 只为收敛。
- 对比（边界）：主按钮底 `--accent` 对卡片 6.05 / 5.62:1；次按钮底 `--accent-soft` 对 `--surface` 仅 1.10:1，**原边框 `#e3e9dd` 1.22:1 未达标** → `--line-strong` 3.33 / 3.44:1。幽灵按钮无边界，靠文字颜色与位置识别（WCAG 1.4.11 不要求文字按钮有边界）。`.icon-button.danger` 原边框 `#eddcd7` 1.35:1 → `--danger` 5.82:1。
- 禁用：WCAG 豁免对比度，但原「55% 透明」把主按钮白字压到 1.68:1，读不清按钮是什么；改为 `--muted` 字（4.54 / 4.77:1），**仍可读**，靠灰底 + 无投影区分。
- 加载中：保持原色与可读文字，转圈用 `currentColor`（白/`--accent`），对底 ≥5.5:1；`aria-busy` 让读屏报「忙」。减少动态效果时停转。
- 焦点：**纠正 A 组 §2 的判断**：L51 `button:focus-visible`（特异性 0,1,1）比 L483 `:focus-visible`（0,1,0）高，按钮、链接、输入框实际生效的是 L51 的 **3px #78a992**（2.64:1，不达标），L483 只管 `summary`、`[tabindex]` 等其余元素。合一后统一 `--ring-focus-color` 2px、offset 2px：环画在按钮外侧的卡片底上，3.73:1（纸感 `--paper`）/ 3.36:1 起；**不画在主按钮底上**（对 `--accent` 仅 1.63:1），所以 `outline-offset` 不能为 0 或负值。`.button.is-now` 原来用和焦点一样的 outline，键盘用户无法区分，改 inset 描边。

## 3. 底部弹层 `.sheet` / `.voice-sheet` / `.term-sheet`

**何时用**：从当前屏发起、**不离开当前上下文**的短任务用底部弹层：2–6 个动作选项（`#action-sheet`）、一段补充说明（`.term-sheet`）、一次语音输入（`#voice-sheet`）。需要用户确认一个不可撤销操作用居中确认框 `.app-dialog`（不在本组）；内容超过一屏或含 3 个以上输入框，改走子页面，不塞进弹层。

**行为规范（三种弹层共用）**

| 项 | 规定 | 现状 |
|---|---|---|
| 最大高度 | `max-height:85vh; max-height:85dvh`（前一行兜底旧 WebView），超出时**面板内部滚动**，`overscroll-behavior:contain`，标题与取消按钮不随内容滚走 | 三者都没有 `max-height`，选项多或横屏时顶出屏幕，**未达标** |
| 安全区 | Android 原生层已处理：`MainActivity` 用 `WindowInsets` 把 systemBars + IME 的 inset 设为 WebView 容器 padding，WebView 不会画到手势条下，`env(safe-area-inset-bottom)` 在本 App 内恒为 0。CSS 仍保留 `padding-bottom:calc(var(--space-4) + env(safe-area-inset-bottom))` 作防御（零成本，换容器实现时不出事） | `.sheet-panel`/`.voice-panel` 已有 env()，`.term-panel` 没有，补齐 |
| 键盘弹起 | 同上，IME inset 由原生层让出，面板随 WebView 高度收缩；85dvh 保证输入框不被盖住 | 依赖 dvh，**需真机截图才能判断**旧 WebView（<108）下是否被盖 |
| 点遮罩关闭 | **弹层内没有未提交输入时关闭；有输入时不关闭**。`#action-sheet` 关（等同取消，返回 `null`）；`.term-sheet` 关；`#voice-sheet` **不关**（正在录音，误触会丢掉已识别的文字），只能点「取消」/「完成」 | 与规定一致（`voice-sheet` 未绑遮罩点击），保持 |
| Esc / 系统返回 | 关闭最上层弹层，不导航 | Esc 已绑。**系统返回键未达标**：`onBackPressed` 直接 `web.goBack()`，弹层开着时会让下层页面后退（或弹出「退出轻衡？」），弹层还留在屏幕上。需在打开弹层时 `history.pushState`，`popstate` 时关闭；交互层落地 |
| 焦点 | 打开时焦点移到面板第一个可操作项，Tab 在面板内循环，关闭时还给触发按钮；背景加 `inert` | `openSheet` 不移动焦点，全站 0 处 `inert`，**未达标**（读屏会继续读弹层背后的页面）；交互层落地 |
| 拖拽把手 | **不加**。把手暗示可下滑关闭，而 JS 没有实现手势；加了只会误导 | 无，保持 |
| 层级 | `.term-sheet` 120 > `.app-dialog` 90 > `.sheet` 80 > `.voice-sheet` 60 > `.bottom-nav` 20，保持 | — |

**token 取值**

| 属性 | 纸感 | 账本 |
|---|---|---|
| 遮罩 | `--overlay` = `rgb(var(--shadow-rgb)/.56)` | 同式（`--shadow-rgb 20 20 19`） |
| 遮罩模糊 | `backdrop-filter:blur(3px)` | 同左 |
| 面板底 | `--paper` #fffefa | `--paper` #f2f5f7 |
| 面板圆角 | 上两角 `--shape-card-radius` 16px，下两角 0（贴底） | 5px |
| 面板投影 | `--elev-3` | `none` |
| 内边距 | `--space-4` 16px；底部 `calc(var(--space-4) + env(safe-area-inset-bottom))` | 同左 |
| 宽度 | `min(560px,100%)` | 同左 |
| 标题 | `--text-sm`、`--fw-semibold`、`--ink-soft` | 同左 |
| 选项行 | 最小高度 52px，分隔 `--line`，按下底 `--accent-soft` | 同左 |
| 当前项 | 字 `--accent` + 勾选图标 | 同左 |
| 危险项 | 字与图标 `--danger` | 同左 |
| 取消按钮 | 次按钮 `.button.subtle.full-width` | 同左 |
| 进场 | `sheet-rise`，`--dur-base` + `--ease-out`；减少动态效果时关闭（已有） | 同左 |

**CSS diff**

```diff
- .sheet{…;background:#293c3280;…}
+ .sheet{…;background:var(--overlay);…}
- .voice-sheet{…;background:#293c3280;…}
+ .voice-sheet{…;background:var(--overlay);…}
- .term-sheet{…;background:rgba(20,20,19,.28);padding:var(--space-3)}
+ .term-sheet{…;background:var(--overlay);padding:0;backdrop-filter:blur(3px)}
- .sheet-panel{width:min(560px,100%);background:var(--paper);border-radius:26px 26px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -14px 44px #293c3226;animation:sheet-rise .2s ease-out}
+ .sheet-panel,.voice-panel,.term-panel{width:min(560px,100%);max-height:85vh;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;
+   background:var(--paper);border:0;border-radius:var(--shape-card-radius) var(--shape-card-radius) 0 0;
+   padding:var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));box-shadow:var(--elev-3)}
+ .sheet-panel{animation:sheet-rise var(--dur-base) var(--ease-out)}
- .voice-panel{width:min(520px,100%);background:var(--paper);border-radius:26px 26px 0 0;padding:24px 22px calc(28px + env(safe-area-inset-bottom));box-shadow:0 -14px 44px #293c3226;animation:voice-rise .22s ease-out}
+ .voice-panel{animation:voice-rise var(--dur-base) var(--ease-out)}
- .voice-panel{width:min(560px,100%)}                                   /* L141，并入上式 */
- .term-panel{width:100%;max-width:520px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:var(--space-4);box-shadow:0 -8px 32px -24px rgba(20,20,19,.5)}
+ /* 并入上式：term 面板改为贴底，与另两种一致 */
- .term-panel,.card-notes{border-radius:var(--shape-card-radius)}      /* L807 中 .term-panel 移出 */
+ .card-notes{border-radius:var(--shape-card-radius)}
+ .sheet-title{position:sticky;top:calc(-1 * var(--space-4));background:var(--paper)}   /* 内部滚动时标题不走 */
+ #action-sheet-cancel{position:sticky;bottom:0}
- .sheet-title{margin:2px 0 12px;font-size:13px;font-weight:650;color:#4d6355;letter-spacing:.3px}
+ .sheet-title{margin:0 0 var(--space-3);font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--ink-soft);letter-spacing:var(--tracking-label)}
- .sheet-option:active{background:#f4f8f2}
+ .sheet-option:active{background:var(--accent-soft)}
- .sheet-option-icon{…;color:var(--mint-dark);…}
+ .sheet-option-icon{…;color:var(--accent);…}
- .sheet-option.is-current{color:var(--mint-dark);font-weight:600}
+ .sheet-option.is-current{color:var(--accent);font-weight:var(--fw-semibold)}
- .sheet-option.is-current .sheet-option-icon{color:var(--mint-dark)}
+ /* 删除，与 .sheet-option-icon 同值 */
```

`--overlay` 由 `.5` 定为 `.56`：面板没有描边，靠与遮罩的明度差辨认边缘；纸感 `.5` 时面板对遮罩仅 2.77:1，`.56` 时 3.23:1（账本 4.10:1）。`.term-sheet` 原用 `.28`（面板对遮罩 1.67:1，面板只能靠 1px `--line` 描边辨认），一并改用 `--overlay`；`--overlay-weak` 只剩 `.busy-card` 加载层使用。

**可访问性**

- 触达：选项行 52px、取消按钮 48px（删 L518 后）、`.term-close` 现为 **32×32px，未达标** → 改为 `width:44px;height:44px`（L667），作幽灵图标按钮处理，颜色 `--muted` → `--ink-soft`。
- 对比：标题 `--ink-soft` 6.63 / 6.11:1；选项 `--ink` 11.5:1 起；当前项 `--accent` 6.05 / 5.62:1，并有勾选图标，不只靠颜色；危险项 `--danger` 5.82 / 5.36:1。
- 边界：面板对遮罩 3.23:1（纸感）/ 4.10:1（账本），按 `--overlay .56` 计。
- 焦点：选项行与取消按钮走全局 `:focus-visible`（`--ring-focus-color`，对 `--paper` 3.73:1 起）。焦点不进面板、不受困、不归还，**未达标**，见行为规范表。
- 读屏：`role="dialog"` + `aria-modal="true"` + `aria-labelledby` 已有；`#action-sheet-list` 用 `role="menu"`、选项 `role="menuitem"`，但没有方向键支持，`menu` 角色会让读屏提示「用方向键」——**未达标**，建议改为普通按钮列表（去掉 `role="menu/menuitem"`），比补键盘逻辑便宜。

## 4. 本组回写与遗留

- `02-tokens.md` §0 增改：`--line-strong` 账本 #848b95、`--warn` 纸感 #9e5c29、`--accent-press` #2f5340、`--overlay` = `rgb(var(--shadow-rgb)/.56)`。
- 6 处 `:focus` 的去向：L102 的 3 个选择器 → `:focus-visible`（§1）；L484 `button:focus:not(:focus-visible)`、`a:focus:not(:focus-visible)` 2 个 → 删除（合一后 `:focus-visible` 不会在点按时出现，这条兜底不再需要）；L51 `.skip-link:focus` → `.skip-link:focus-visible`。
- 交互层待办（阶段 3，不在 CSS）：字段级 `aria-invalid` + `.field-error`；按钮 `aria-busy`；弹层焦点管理、`inert`、系统返回键关闭弹层；`#action-sheet` 去掉 `menu` 角色。
- 全局波及清单见 `03-global-changes.md`。

