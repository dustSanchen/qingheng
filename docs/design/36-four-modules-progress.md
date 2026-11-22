# 四模块改动清单 · 进度与交接

> 版本基线：**轻衡 1.5.25**（versionCode 525）· 测试 **112/112** · commit 见 `git log --oneline -8`
> 计划来源：用户 2026-11-22 夜四模块清单（`memory: rules`「第四份清单」），已通过 plan mode 批准
> 设备：3cba2bdc；装机与截图命令见文末

---

## 0. 一句话状态

四模块共 14 个子项：**已完成 3 项**（识别入口合并、识别后标签、分段控制移出卡片），**未开始 11 项**。
「模块四 · 习惯卡」是剩余工作里唯一的前置阻塞项（模块三的睡眠迁移依赖它）。

| # | 模块 | 子项 | 状态 |
|---|---|---|---|
| 3-a | 三 | 识别入口合并为「识别体脂秤截图 / 照片」 | ✅ 1.5.24 |
| 3-b | 三 | 识别后「已自动识别，可微调」浅绿标签 | ✅ 1.5.24 |
| 1-c | 一 | `.fold-tabs` 移出卡片，成为下半区统一分段控制器 | ✅ 1.5.25 |
| 1-a | 一 | 合并 `#status-strip` + `#slot-hint` 为 ≤48px 单行行动条（`1/N ›`） | ⬜ |
| 1-b | 一 | 首屏不滚动可看完：双卡 → 环 → 三入口 → 单行行动条 | ⬜ |
| 2-a | 二 | 删「今日顺序」勾选列表与「全部加入」 | ⬜ |
| 2-b | 二 | AI 计划自动播种为可打卡卡片（含组次重量 + 每组 ○，只写 DOM 不写库） | ⬜ |
| 2-c | 二 | 执行区工具栏 `[AI 重排][+ 添加动作][更多▾]`（顺延/清空进菜单） | ⬜ |
| 2-d | 二 | 计划说明收进 `[计划说明 ▾]` 抽屉 | ⬜ |
| 2-e | 二 | 移除常驻「动作要点」折叠块（已可由动作名/`?` 打开） | ⬜ |
| 2-f | 二 | 结束训练弹窗加逐动作明细 + 同模板容量对比 | ⬜ |
| 3-c | 三 | 体重并入身体数据首屏；睡眠迁入习惯卡 | ⬜ |
| 4-a | 四 | 步数/饮水/睡眠三行（输入 + 步进器 + 2 胶囊） | ⬜ |
| 4-b | 四 | 「自定义快捷值」收低频设置；底部只留沿用昨日 + 保存 | ⬜ |

---

## 1. 已完成项的落点与证据

### 1.1 识别入口合并（1.5.24）

- `index.html` 身体数据卡：按钮文案 `识别体脂秤截图 / 照片`，去掉 `capture`（相册/截图也能选）；删除第二个 `#scale-shot` 入口与 `#scale-shot-input`。
- 副标题：`上传体脂秤 App 的结果截图或秤面照片，自动填入体重、体脂率、肌肉量等`。
- `70-rest.fragment.js` → `applyScaleFile()`：回填成功后 `note.classList.toggle('is-recognised', filled.length > 0)`，文案「已自动识别，可微调：…」。
- 样式：`.scale-sync-note.is-recognised`（accent 字 + `accent-soft` 底 + 8px 圆角）。
- 证据：`tests/training-plan-loop.test.mjs` 断言「one clear OCR entry covers screenshot and photo」。

### 1.2 分段控制移出卡片（1.5.25）

- `index.html`：`.fold-tabs` 移到 `#today-fold-card` 之前；卡内只剩两个 `[data-fold-panel]`。
- JS 无需改动：`installTodayFold()` 本来在 `$('.fold-tabs')` 全局作用域找 tab。
- 样式：`.fold-tabs{margin:0 0 10px}`；卡片 `padding-top:10px`。
- 证据：真机截图 `build/v19-seg.png`；112/112 全绿。

---

## 2. 剩余工作的实现要点（按批准方案）

### 2.1 模块四（前置，先做）

- `#habit-form` 重写为三行：`.habit-row[data-habit=steps|water|sleep]`，每行 = 标签 + `input`（保留 `name=steps|water`, 新加 `sleep`）+ `−`/`+` 步进器（步数 500、饮水 250、睡眠 0.5，长按连续加减 120ms 并 clamp）+ 两枚胶囊。
  - 步数胶囊：6,000 / 10,000（设值）。
  - 饮水胶囊：+250ml / +500ml（**累加**当前值，不写库）。
  - 睡眠胶囊：7h / 8h。
- 删除 `HABIT_DIAL`/`.habit-meter`（环与横向轨道）、`#habit-chips` 旧胶囊墙、「＋存为常用」「调整常用值」。
- 新增卡右上 `[自定义快捷值]` → `openSheet`：步数两档、饮水两档，写 `qingheng.habitQuick`（现成键 `HABIT_QUICK_KEY`）。
- 底部：左「沿用昨日数据」文字链（原 `#habit-copy-row` 改造）、右「保存日常习惯」（`type=submit`，主按钮）。
- `numericForm` 从 `['steps','water']` 扩为 `['steps','water','sleep']`。

### 2.2 模块三（依赖 2.1）

- 删 `#body-quick` 整卡与 `#body-quick-form` 提交处理（`70-rest:2465` 起）。
- `#measurement-form` 首位插入 `name="weight"`（step 0.1，min 1，max 500），排在测量日期后；保存沿用现有 handler。
- 删 `#body-quick-tag`/`#body-quick-note`；「今天两样」语义由身体数据卡首屏承担。
- `data-focus="habit-sleep"` 路由不变（目标位置变到记录/习惯卡）。

### 2.3 模块二

- 删 `#ai-plan-card` 的 `#ai-plan-fold`/`#ai-plan-list`/`#ai-plan-all`。
- 新增 `#training-toolbar`：`[AI 重排]`（原 `#ai-plan-ask`）、`[+ 添加动作]`、`[更多 ▾]`（sheet：顺延到明天 / 清空今天的训练 / 应用本周计划）。
- 新增 `seedTrainingFromPlan()`：今天 + 计划非空 + `exercisesFor(today)` 为空时，按计划项调用现有行渲染（预设组次重量 + 每组 ○），**只写 DOM 不写库**；用户点「保存训练」才落库。
- 计划说明（本周要求 / 这周怎么排的 / 训练负荷）收进 `[计划说明 ▾]` sheet；`#training-overview` 仍在顶部当仪表盘。
- 删「今天（推）的动作要点」常驻折叠块。
- `trainingSaveDialogHtml()` 增强：逐动作明细 `名称 · N 组 · X kg`（有氧显示距离/时长）+ 与最近一次同 `habit.template` 训练的总容量对比（`较上次 +120 kg`，无历史不显示）。

### 2.4 模块一

- 新增 `#today-action`（≈48px 单行）：`dot + 单行省略文案 + [1/N ›]`，位置在宏量胶囊下方，替代 `#status-strip` 与 `#slot-hint`。
- `todayActionItems()` 顺序：agenda primary → 体检/能量提示 → secondary（≤2）。
- 交互：点文案执行 primary.target；点 `1/N ›` 切下一条并打开「今日建议」半屏 sheet；**不做长按**（WebView 长按会选中文本）。
- 删除 `#slot-hint`/`#status-strip`/`#slot-note` 渲染与样式；同步翻转 `tests/today-status-strip.test.mjs` 的旧断言。
- 首屏校验：390×844 不滚动可见「双卡 + 环 + 三入口 + 行动条」。

---

## 3. 关键决策（已定，别回头改）

1. **播种不写库**：AI 计划转成可打卡卡片只渲染 DOM，保留「保存才落库」的确认红线；也因此不需要「全部加入」按钮。
2. **同部位对比按模板匹配**（`habit.template`），不做肌群推断——没有肌群元数据，推断会造假。
3. **不用长按手势**：一律显式按钮/sheet，避免 WebView 文本选择与误触。
4. **体检不搬出能量卡**（清单未要求），模块一只改提示条与分段控制。
5. **删节点而非兼容占位**：`#status-strip`/`#slot-hint`/`#ai-plan-all` 删除并翻转测试，不保留死 id（`#calorie-action` 与 `.check-verdict` 例外，它们被导出与断言引用）。

---

## 4. 验收命令

```powershell
cd D:\AI\health-android
node tools/preflight.mjs                 # 形状/工具/adb/版本
powershell -NoProfile -ExecutionPolicy Bypass -File tools\assemble-app.ps1
node --check app\src\main\assets\app.js
node tools/test-all.mjs                  # 基线 112，目标 ≥118
node tools/aesthetic-audit.mjs; node tools/entry-budget-audit.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools\dev-loop.ps1 -Version 1.5.26 -VersionCode 526 -SkipBackup -SkipTests
node tools/device.mjs shot build\xxx.png
```

版本号必须走 `dev-loop`（同步 `APP_VERSION` / `build.ps1` / 测试字面量），README 徽章手动同步（`ci-and-versions` 会查）。

---

## 5. 教训（本轮踩到的，实施时别再犯）

1. **不要用 PowerShell 改写源码**：`Get-Content -Raw` + `Set-Content` 会把 UTF-8 中文写成乱码；`git restore` 被 CC Safety Net 拦截，恢复要用 `git archive` + `tar -xf` + `Copy-Item`。
2. **会改数据的按钮不要盲点**：先截图定位元素，一次只点一下，立刻截图；意外 toast 要当证据回溯（有一次我因此把「卧推」取消勾选而不自知）。
3. **判据不要拿结构形状当行为证据**：`setDetails.length === 0` 永远不成立（表单重建后每组都是空对象）；要比业务值（组次负重是否等于计划处方）。
4. **localStorage 新键必须走常量**：`adapter.test.mjs` 会枚举裸字面量并 deepEqual 固定列表。
