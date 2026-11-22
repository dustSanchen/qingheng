# 四模块改动清单 · 进度与交接

> 版本基线：**轻衡 1.5.27**（versionCode 527）· 测试 **112/112** · commit 见 `git log --oneline -6`
> 计划来源：用户 2026-11-22 夜四模块清单（`memory: rules`「第四份清单」），plan mode 批准
> 设计基线：`docs/design/37-style-and-modules.html`（确认稿；实现以它第 4 节右侧那版为准）
> 设备：3cba2bdc（装机验证**已完成**：1.5.27 / 527，五张真机截图见 §5）

---

## 0. 一句话状态

四模块 14 个子项 **全部实装**，另加用户当晚追加的今天页三条优化（行动面合并 / 三入口胶囊 / 概况卡信息化）。
代码侧 112/112 全绿，`assemble-app` 通过，**真机截图待补**。

| # | 模块 | 子项 | 状态 |
|---|---|---|---|
| 3-a | 三 | 识别入口合并为「识别体脂秤截图 / 照片」 | ✅ 1.5.24 |
| 3-b | 三 | 识别后「已自动识别，可微调」浅绿标签 | ✅ 1.5.24 |
| 1-c | 一 | `.fold-tabs` 移出卡片，成为下半区统一分段控制器 | ✅ 1.5.25 |
| 4-a | 四 | 步数/饮水/睡眠三张刻度卡（可输入大数字 + 步进器 + 轨道 + 两胶囊） | ✅ 1.5.27 |
| 4-b | 四 | 「自定义快捷值」两步 sheet；底部只留沿用昨日 + 保存 | ✅ 1.5.27 |
| 3-c | 三 | 「今天两样」→「今天体重」单栏；睡眠迁入习惯卡；体重唯一可编辑处在身体数据 | ✅ 1.5.27 |
| 2-a | 二 | 删「今日顺序」勾选列表与「全部加入」 | ✅ 1.5.27 |
| 2-b | 二 | 计划自动播种为可打卡行（组次重量 + 每组 ○，只写 DOM） | ✅ 1.5.27 |
| 2-c | 二 | 执行区工具栏 `[AI 重排][＋添加动作][更多▾]` | ✅ 1.5.27 |
| 2-d | 二 | 计划说明收进 `[计划说明 ▾]` sheet | ✅ 1.5.27 |
| 2-e | 二 | 移除常驻「动作要点」折叠块 | ✅ 1.5.27 |
| 2-f | 二 | 结束训练弹窗逐动作明细 + 同模板容量对比 | ✅ 1.5.27 |
| 1-a | 一 | `#status-strip` + `#slot-hint` 合并为 `#today-action`（48px，1/N 切换，点开半屏状态轮播） | ✅ 1.5.27 |
| 1-b | 一 | 首屏不滚动可看完（预算 ≈458px / 可用 724px） | ✅ 1.5.27（待真机确认） |
| 追加 | 一 | 三入口胶囊精致化（48px 同族、微渐变 + 内高光） | ✅ 1.5.27 |
| 追加 | 一 | 概况卡每个数字带基准（本周 3/4 次、距目标 1.7 kg、7 日 Δ） | ✅ 1.5.27 |

---

## 1. 落点与证据

### 1.1 模块四 · 习惯卡（在原版刻度卡上增量）

- `index.html`：`#habit-form` 内三张 `.habit-meter`（`data-habit=steps|water|sleep`），每张 = 名称/单位 → `<input class="habit-meter-value">`（20px 半粗等宽）+ −/＋ 圆钮 → `.habit-meter-track` 轨道 → `.habit-meter-chips` 两枚胶囊；卡右上 `#habit-quick-edit`；底栏 `沿用昨日数据` + `保存日常习惯`（primary）。
- `70-rest`：`installHabitChips()` 重写——`HABIT_DIAL` 加睡眠（`--tone-sleep`）、`readHabitQuick` 只认候选档位（淘汰旧「饮水总量」）、长按连加 120ms、轨道点/拖/键盘、`renderChips()` 两枚、`#habit-quick-edit` 两步 `openSheet`。
- 能力口径：步数/睡眠=设值，饮水=**每次加量**（+250/+500）；`numericForm(form,['steps','water','sleep'])`；`rememberHabitQuick` 删除（快捷值只由显式设置改）。
- 样式：`.habit-rows/.habit-meter*/.habit-chip/.habit-foot`；旧胶囊墙、`＋存为常用`、`调整常用值`、`.habit-dials` 全部退场。

### 1.2 模块三 · 身体（一套口径）

- 「今天两样」→「今天体重」：`#body-quick` 只显示当天体重胶囊 + `#body-weight-jump`（点它 `revealField('measurement-weight')`），`renderBodyWeight()` 维护数值与 tag。
- 睡眠迁进习惯卡（`#habit-sleep`），`#body-quick-form` 提交处理删除。
- 体重唯一可编辑处：`#measurement-form` 的 `name="weight"`（`numericForm` 已加 `weight`，`BODY_METRICS` 首项加体重以显示「上次」）；`bodyOutlierLines` 的体重差 ≥2kg 风控自然生效。
- 分段标题：`headings: ['今天体重', '身体数据', '日常习惯']`。

### 1.3 模块二 · 训练执行流

- 删 `#ai-plan-card` 整卡（含 `#ai-plan-fold/list/tag/summary/all/edit`）；`renderAiPlan` 只同步入口文案与计数，清单不再渲染。
- `#training-log` 卡头加 `#training-toolbar`：`#ai-plan-ask`（AI 重排/排今天）、`#training-add`（＋添加动作，从底部搬上来）、`#training-more`（更多）。
- 新增两张静态 sheet：`#plan-sheet`（计划说明 + `#plan-request` 今日要求 + 顺延/清空隐藏按钮）、`#training-more-sheet`（顺延到明天 / 清空今天的训练）。
- 播种：`seedExercisesFromPlan(date)`（未完成 AI 计划优先，否则本周计划当天动作）→ `renderTrainingLog` 的 rows 计算里直接播（DOM only），行上标 `data-plan-index`；`syncPlanDoneFromRow()` 在每组 ○ 变化时回写 `aiPlanStore.done` 并刷行动行；`#training-clear` 置 `seedMuted` 抑制再播。
- 删常驻要点块：`#week-cues` 宿主与其 handler 分支移除，`weekCueHtml()` 保留未调用（清理债）。
- 计划说明：`#plan-explain-open` → `#plan-sheet`；`renderWeekPlan` 把 `.plan-why/.plan-why-lead/.acwr-line/.drift-line` 克隆进 `#plan-explain-body`。
- 结束训练弹窗：`trainingSaveDialogHtml` 加逐动作明细 `<ul class="dialog-items">` 与 `.dialog-compare`（同 `template` 上一次的容量 ±）。

### 1.4 模块一 · 今天页（一条行动行 + 一圈胶囊 + 有基准的概况卡）

- `index.html`：删 `#status-strip` 与 `#slot-hint`；`#today-action`（`.today-action-main` 左热区执行 / `.today-action-more` 右热区 1/N ›）插在 `#macro-summary` 之后；新增 `#day-brief-sheet`（`#brief-strip` 手动轮播 + `#brief-list` 建议）。
- `00-head`：删 `paintTodayStatus`/`renderTodayStatusStrip`/`installTodayStatusStrip`/`statusTimer`；`renderSlotHint` → `renderTodayAction()` + `todayActionItems()` + `openDayBrief()` + `installTodayAction()`；`todayStatusList()` 保留作数据源。
- `installTodayQuickActions()` 不再搬 slot-hint；`installTodayAction()` 进 boot。
- 胶囊：`#today-quick-actions` 3 枚同宽 48px、图标+两字标签同一行、accent 8%→2% 微渐变 + `inset 0 1px 0` 内高光。
- 概况卡：`renderTodayPeek` 每卡 = 主数 + 基准 + 进度/缺口（训练 本周 3/4 次、容量较上周；身体 体重、距目标区间、7 日 Δ）。

---

## 2. 关键决策（已定，别回头改）

1. **视觉一律在原版上增量**：刻度卡 / 色条 / 轨道 / 胶囊 / 20px 等宽数字不换。
2. **行动面允许多个**（用户当晚放开），但收成同一形态；最终落成「一条行动行 + 一个半屏」，状态轮播进 sheet 且**不自动转**。
3. **播种不写库**：计划只变 DOM，保存才落库；`done` 由每组 ○ 反推回 `aiPlanStore`。
4. **体重只有一处可编辑**（身体数据卡），「今天体重」是只读跳转卡。
5. **饮水胶囊是「再加」**，不是总量定格。
6. 状态轮播的 6s 定时器删除（进 sheet 后手动翻），避免背后自转抢注意力。

---

## 3. 验收命令

```powershell
cd D:\AI\health-android
node tools/preflight.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools\assemble-app.ps1
node --check app\src\main\assets\app.js
node tools/test-all.mjs                 # 112/112
node tools/aesthetic-audit.mjs; node tools/entry-budget-audit.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools\dev-loop.ps1 -Version 1.5.27 -VersionCode 527 -SkipBackup
node tools/device.mjs shot build\xxx.png
```

---

## 4. 清理债（下一轮处理，不影响功能）

- `.slot-hint*` / `.status-strip*` 历史样式仍留在 `styles.css`（约 60 行，DOM 已删，无视觉影响）。
- `weekCueHtml()` 已无调用方。
- `#slot-note` 空节点样式 `.slot-note` 同步残留。

---

## 5. 本轮事故与教训

1. **片段不能单独 `node --check`**：`00-head.fragment.js` 只是 app.js 的一片（IIFE 的关闭在 80-boot），单独检查必然报 `Unexpected end of input`；判据只有「assemble + `node --check app.js`」。
2. **adb 在实施中途掉线**（`adb devices` 空，重连/重启 server 均无效）；设备回来后已补：`dev-loop -Version 1.5.27 -VersionCode 527` 装机成功，`dumpsys` 确认 versionName=1.5.27 / versionCode=527；真机截图 `build/v27-today4.png`（今天页首屏）、`v27-body3.png`（今天体重）、`v27-habit4.png`（三张刻度卡）、`v27-quicksheet.png`（自定义快捷值）、`v27-train5.png` + `v27-plansheet2.png`（工具栏/播种行/计划说明 sheet）。
3. 真机验收后又修了三处：`.plan-label/.plan-load/.plan-load-note` 未搬进抽屉（卡里残留负荷块）；习惯数值改左对齐并压缩卡高（10→8 padding、轨道 28→22）；「今日顺序」作废后的关系文案改为「以训练日志里确认的为准」。
3. 改 `index.html` 的大行（单行 4.5k 字符）时，用 Node 按 `indexOf` 切片替换比手写 `edit` 的 old_string 稳。
