# 09 · 交接与下一步（给 Codex）

> 生成时间：2026-10-26 18:40 · 当前版本 **1.1.31 / versionCode 132** · 测试 **55/55 通过**
> 本文是执行入口。设计依据在 `01-audit.md` → `02-tokens.md` → `03-components-*.md` → `03-global-changes.md`，本文只讲「现在在哪、接下来按什么顺序做、怎么验收」。

---

## 一、项目事实（不要质疑，也不要重写）

| 项 | 值 |
|---|---|
| 产品 | 轻衡（qingheng），Android 本地优先健康记录工具，包名 `cn.qingheng.health` |
| 架构 | 单 Activity + WebView，加载 `file:///android_asset` 下的 `index.html` / `styles.css` / `app.js`；无服务端、无账号、无云同步 |
| 前端拼装 | `app/src/fragments/*.fragment.js` 按文件名顺序拼接成 `app/src/main/assets/app.js`（**只改 fragment，不改 app.js**） |
| 数据 | `state.json` 唯一权威，SQLite 只是镜像；用户勾选同意才会把当次数字发给模型 |
| 用户 | 作者本人 + 一小群朋友，每人本机独立数据，无社交/排行/共享 |
| 硬约束 | 不做社交/扫码/打卡连击/widget/排行；热量下限 2,000 kcal 是硬底线；不提供诊断处方；文案温和克制（禁「加油」「坚持！」）；不出现第三方品牌名；不引统计 SDK |

---

## 二、已经落地的（不用重做）

### 2.1 三层令牌（`styles.css` 顶部 + 追加块）

- **颜色层**：`--paper/--surface/--ink/--muted/--ink-soft/--line/--line-strong/--accent/--accent-soft/--accent-line/--accent-deep/--accent-press/--on-accent`；语义色 `--warn/--danger/--ok` 各带 `-soft`/`-line`；`--tone-*` 指标色不参与换肤。
- **形状层**：`--shape-card-radius`(16/5)、`--shape-row-radius`(12/4)、`--shape-ctrl-radius`(12/4)、`--elev-1~4`、`--overlay`/`--overlay-weak`、`--shadow-rgb`。
- **密度层**：`--body-leading`(1.55/1.5)、`--card-pad`(16/13)、`--card-gap`(10/9)。
- **图标**：`--icon-sm/md/lg/xl` = 16/20/24/28。
- **动效**：`--dur-fast/base/slow/spin/pulse`、`--ease-out/inout`。
- **字重字距**：`--fw-regular/medium/semibold/bold/display`、`--tracking-display/label/caps`。
- **间距**：`--space-0~5`。
- **层级**：`--z-sticky:8 / --z-tabbar:60 / --z-overlay:80 / --z-dialog:90 / --z-sheet:120 / --z-toast:180 / --z-busy:200`。
- **底部安全区**：`--tabbar-safe:96px`，`.app-shell` 已加 padding-bottom，`html` 已加 `scroll-padding-bottom`。

**统计口径**：令牌 111 个；`var()` 引用 773+ 处；`font-weight` 字面量 0；`var(--fw-*)` 70 处、`var(--dur-*)` 19 处；剩余 hex 99 处**全部属于「必须保留」**（G10 图表辅助色、食材类目色、令牌自身取值）。

### 2.2 两套皮肤

`[data-skin="paper"]`（暖米底 + 衬线标题 + 大圆角 + 极轻阴影）与 `[data-skin="ledger"]`（近白底 + 无衬线 + 小圆角 5px + 无阴影 + 更紧行距）。切换在「我的 → 外观皮肤」，支持 `paper / ledger / auto`（auto = 趋势页 ledger，其余 paper），持久化键 `qingheng.skin`。

### 2.3 空状态三态（本版新增）

```js
empty(text, hint, kind)   // kind: "empty"（默认）/ "denied" / "error"
```

| kind | 图标 | 外观 | 已接入 |
|---|---|---|---|
| `empty` | ✧ | 虚线框 | 训练计划记录不足、体重无数据等 11 处 |
| `denied` | ⊘ | 实线 + 琥珀左条 + 琥珀底 | **尚未接入（见 §四 T1）** |
| `error` | ! | 实线 + 危险色左条 + 危险色底 + `role=alert` | 渲染错误条 `showRenderError` |

### 2.4 功能面（近期）

- 训练偏好表单（每周 3/4/5/6 练 × 分化 × 器械 × 时长）→ 生成本周七天安排；**不选择就不出方案**。
- 「今日顺序」AI 计划：勾选同意 → `POST /api/chat`（`question/date/webSearch:false/tier:"fast"/allowExternal:true`）→ 解析回复中第一个 `[` 到最后一个 `]` → `localStorage["qingheng.aiPlan.<日期>"]` → 编号行 + 汇总条（总组数 / 预计分钟 / 改成 N 分钟）；编辑态点行即删除。
- 等待动画：行内胶囊（`#estimate-busy`，贴在「生成估算预览」按钮下方），成功/失败/25 秒超时三路都会收起。
- 不健身模式：`profile.training === "none"` 时隐藏训练卡片、选项卡、面板；`body.no-training` + CSS `display:none` 兜底。

---

## 三、执行约定（必须先读）

### 3.1 构建与验证

```powershell
# 拼装 fragment → app.js（改完 fragment 必做）
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\assemble-app.ps1 -Quiet

# 跑全部测试（约 8s）
node tools\test-all.mjs

# 一次跑完 测试 → 构建 → 装机 → 冒烟（约 27s）
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version X.Y.Z -VersionCode N -SkipBackup

# 真机操作（预览坐标 877×1904 → 设备 1156×2510）
node tools\device.mjs shot build\shot.png
node tools\device.mjs tap <x> <y> --preview
```

**版本号必须三处同步**，否则测试挂：
1. `app/src/fragments/70-rest.fragment.js` 的 `const APP_VERSION`
2. `build.ps1` 的 `-Version` / `-VersionCode`
3. `tests/meal-date-java.test.mjs` 里的 `APP_VERSION`

### 3.2 测试断言约定（`03-global-changes.md` §5，硬规则）

1. 组件测试**只验证引用了哪个 token**，不验证 token 等于多少。
2. 需要锁死数值的，集中到 `tests/tokens-snapshot.test.mjs`。
3. 测试失败先分类：断言引用了已删除 token → 改测试；断言引用了正确 token 但值不达标 → 改样式。**不许「改测试来通过」**，除非登记原因。
4. 新增 token 必须同步登记到 `02-tokens.md`。

### 3.3 血泪坑（已踩过，别再踩）

| 坑 | 后果 | 正确做法 |
|---|---|---|
| 批量把 hex 换成 `var()` 时没保护 `--token: …;` 声明 | `--ink:var(--ink)` 自引用，49 个令牌失效，页面变「透明卡片 + 黑图标」 | 先收集已声明集合 → 占位符守护声明段 → 替换规则 → 还原 → 自检自引用数与未声明 `var` 数 |
| 十六进制替换没加边界 | `#e6dfd8` 命中 `#e6dfd880`，产出 `var(--line)80` 废声明，背景整片消失 | `(?<![0-9a-fA-F])#值(?![0-9a-fA-F])` |
| 凭空写选择器 | 给不存在的 `.tab-bar` 写规则（真实是 `.bottom-nav`），多一条死 CSS | 改样式前先 grep 类名在 `index.html` / `app.js` 中是否存在 |
| 改卡片 `h2` 文案 | `RECORD_PANELS` 按标题文字匹配卡片，改名后分段点不动 | 改标题前全局搜该文案是否被 `headings` 数组引用 |
| 猜后端字段名 | `consent` / `training:"none"` 均被拒，连试三次 | 先读 Java 里的 `consent(b)`、`boundNumber(...)` 调用点 |
| 正则大范围删 HTML | 删掉 `#chat-image` 等必需节点，页面卡在「正在加载本地记录」 | 用区块映射（section 起止长度 + div 平衡）逐步校验，一次只改一处 |

---

## 四、接下来的任务（按顺序，每条含验收）

### T1 · 把 `denied` 空状态接到权限行（约 20 行，低风险）

- 位置：`app/src/fragments/20-permissions-backup.fragment.js` 的 `PERMISSION_ITEMS` 渲染处；「我的 → 权限检查」。
- 做法：当某个必需权限被拒时，用 `empty('通知权限没有打开', '到系统设置 → 应用 → 轻衡 → 通知开启；否则到点提醒不会出现。', 'denied')` 渲染说明块，保留原有的「申请通知权限」按钮。
- **验收**：真机把通知权限关掉 → 「权限检查」出现琥珀底 ⊘ 块；重新打开 → 恢复原样；`node tools\test-all.mjs` 55/55。

### T2 · 补齐 `03-components-a/b/d.md` 的交互类条目（中风险）

逐条对照文档，只做**文档里标注「未达标」且属于交互**的项：

1. `aria-invalid`：表单校验失败时给对应输入加 `aria-invalid="true"`（当前只有 `.form-feedback` 文案）。
2. 弹层返回键关闭：`#action-sheet` / `#voice-sheet` / `#term-sheet` / `#weight-sheet` 监听 `popstate` 或 Android 返回，ESC 已有。
3. 分段控件方向键：`.segment-bar` 内按 ←/→ 移动选中项（`role="tablist"` 已有）。
4. `aria-busy`：等待动画出现时给发起按钮加 `aria-busy="true"`。
- **验收**：每项单独提交，`node tools\test-all.mjs` 全绿；键盘/返回键真机走一遍。

### T3 · 阶段 5 回归（体力活，但必做）

`03-global-changes.md` 列了 44 项波及点，其中处数最大的四项是 `--muted`(73)、`--accent-soft`(46)、`--mint-dark→--accent`(23)、删 L518 的 `min-height:40px`。

- **验收**：纸感 + 账本 × 5 个 tab + 4 种弹层，各截一张；`★` 标注项（对比度从不达标变达标）需实测数值并记录在 `03-global-changes.md` 表格里。

### T4 · 收尾杂项（低风险）

1. `--tracking-caps` 目前只覆盖少数全大写小标题，逐个确认「分组小标题」是否都用了。
2. `03-components-*.md` 里标「未定位」的死选择器（`--muted` 8 处、`--line` 5 处）——按用户要求**直接删**，不要保留死代码。
3. 若删除死选择器，同步把相关测试断言改到现役类上（参见 §3.2 第 3 条）。

---

## 五、文件地图

| 路径 | 作用 |
|---|---|
| `app/src/main/assets/styles.css` | 全部样式与令牌（960 行） |
| `app/src/main/assets/index.html` | 页面骨架（5 个 view + 弹层 + 底部导航 `.bottom-nav`） |
| `app/src/fragments/00-head.fragment.js` | 令牌消费、`empty()`、`applyTrainingVisibility()`、`intakeRangeForDate()` |
| `app/src/fragments/40-targets.fragment.js` | `GOAL_PRESETS`、`computeTargets()`、`proteinBandFor()`、`surplusForYears()` |
| `app/src/fragments/50-onboarding.fragment.js` | 体重图、趋势表、记录分段安装器 |
| `app/src/fragments/70-rest.fragment.js` | `APP_VERSION`、皮肤、AI 计划、负重计算器、`RECORD_PANELS` |
| `app/src/main/java/cn/qingheng/health/MainActivity.java` | 原生桥、`/api/*` 端点、`consent()`、`boundNumber()` |
| `docs/design/` | 审计 → 令牌 → 组件 → 全局波及，全部结论 |

---

## 六、绝对不要做的事

1. 不要改 `app.js`（生成物），只改 fragment。
2. 不要为「让测试通过」而放宽断言（登记原因除外）。
3. 不要保留死代码 / 死选择器。
4. 不要在没确认选择器存在的情况下写 CSS。
5. 不要在没读后端校验函数的情况下拼请求体。
6. 不要把「未验证」说成「已完成」——交付说明里必须写清哪部分是代码层证据、哪部分真机验证过。
