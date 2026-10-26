# 10 · Codex 执行指令（可直接粘贴）

> 用法：把本文「零、粘贴用指令块」整段复制给 Codex，它按 T1→T4 顺序执行。
> 依据文档：`09-codex-handoff.md`（现状与约定）、`03-global-changes.md`（44 项波及点）、`03-components-a/b/d.md`（组件规范）。

---

## 零、粘贴用指令块

```text
你是本仓库的执行工程师。目标：按顺序完成 docs/design/09-codex-handoff.md §四 的 T1–T4，
把轻衡的组件规范与交互细节补齐到文档要求的水平。

【第一步必做】
先读这三份文档，读完再动手：
1. docs/design/09-codex-handoff.md  —— 现状、执行约定、已踩过的 6 个坑
2. docs/design/03-global-changes.md  —— 44 项波及点与测试断言约定（§5 是硬规则）
3. docs/design/03-components-a.md / -b.md / -d.md —— 组件规范与「未达标」条目

【固定执行循环，每条任务都走一遍】
a. powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\assemble-app.ps1 -Quiet
b. node tools\test-all.mjs                      （必须 55/55 或更多，0 失败）
c. powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version X.Y.Z -VersionCode N -SkipBackup
d. node tools\device.mjs shot build\<task-id>.png   （真机截图，至少一张；涉及双皮肤的任务要两张）
e. 记录本任务改了什么、验证方式、未验证部分

【任务顺序与验收】严格按 T1 → T2 → T3 → T4，一条做完再开下一条。

T1 把 denied 空状态接到权限行
- 文件：app/src/fragments/20-permissions-backup.fragment.js，「我的 → 权限检查」渲染处
- 做法：必需权限被拒时，用 empty(标题, 说明, 'denied') 渲染说明块；保留原有「申请通知权限」按钮
- 验收：关掉系统通知权限 → 出现琥珀底 ⊘ 块并说明后果；重新打开 → 恢复；测试全绿；真机截图

T2 补齐交互类条目（逐个提交，每项独立验证）
- T2.1 aria-invalid：表单校验失败时给对应输入加 aria-invalid="true"，并在下次输入清掉
- T2.2 弹层返回键：为 #action-sheet / #voice-sheet / #term-sheet / #weight-sheet 接通返回键关闭（ESC 已有）
- T2.3 分段控件方向键：.segment-bar[role=tablist] 内按 ←/→ 切换选中项并移动焦点
- T2.4 aria-busy：等待动画出现时给发起按钮加 aria-busy="true"，结束后移除
- 验收：每项单独跑测试 + 真机操作一遍（键盘/返回键）

T3 双皮肤回归（体力活）
- 按 03-global-changes.md 的表格逐行过，重点是处数最大的四项：
  --muted(73)、--accent-soft(46)、--mint-dark→--accent(23)、删 L518 的 min-height:40px
- 每项截两张（纸感 + 账本），5 个 tab + 4 种弹层全过
- 标 ★ 的行（对比度从不达标变达标）必须实测数值，写回 03-global-changes.md 表格
- 验收：截图目录 build\regression\<item>.paper.png / .ledger.png；数据不合格的项回改样式

T4 收尾
- T4.1 --tracking-caps 覆盖率核对：所有「分组小标题」是否都用它
- T4.2 删除 03-components-*.md 标「未定位」的死选择器（--muted 8 处、--line 5 处）——直接删，不留死代码
- T4.3 删选择器后把相关断言改到现役类上（见 03-global-changes.md §5 第 3 条：先登记原因）
- 验收：测试全绿；styles.css 无未被 index.html/app.js 引用的类

【红线，违反即回滚】
1. 只改 app/src/fragments/*.fragment.js 与 assets/*.css|html；绝不改生成的 assets/app.js
2. 版本号三处同步：70-rest.fragment.js 的 APP_VERSION、build.ps1 的 Version/VersionCode、tests/meal-date-java.test.mjs
3. 不许为让测试通过而放宽断言；确属「断言引用了已删除 token」的，先在本任务说明里登记原因
4. 写 CSS 前先确认类名在 index.html 或 app.js 中存在（曾给不存在的 .tab-bar 写过死规则）
5. 批量替换颜色前保护 `--token: …;` 声明段（曾产生 49 个自引用令牌，页面变裸样式）
6. 十六进制替换必须加边界 (?<![0-9a-fA-F])#值(?![0-9a-fA-F])（曾产出 var(--line)80 废值）
7. 改卡片 h2 文案前，先搜该文案是否被 RECORD_PANELS / trend panels 的 headings 数组引用
8. 调后端接口前先读 Java 里的 consent(b) / boundNumber(...)，不要猜字段名

【每轮结束的回报格式，固定四行】
done, <task-id>, <改了什么一句话>, <测试 x/x>, <截图路径 + 哪部分未真机验证>
例：done, T1, 权限行接入 denied 空状态, 55/55, build/T1.png（双皮肤未截）

【遇到这几种情况停下问我，不要自作主张】
- 需要改产品行为（不是样式/交互）而文档没写
- 测试失败原因属于「断言与实现都合理但互相冲突」
- 某处文档与代码现状矛盾（如文档写的 token 在代码里不存在）
```

---

## 一、任务台账（复制到 issue / TODO 里跟踪）

| ID | 任务 | 风险 | 依赖 | 状态 |
|---|---|---|---|---|
| T1 | denied 空状态接权限行 | 低 | — | 待做 |
| T2.1 | aria-invalid | 低 | — | 待做 |
| T2.2 | 弹层返回键关闭 | 中 | — | 待做 |
| T2.3 | 分段方向键 | 中 | — | 待做 |
| T2.4 | aria-busy | 低 | 等待层已有 | 待做 |
| T3 | 双皮肤回归 44 项 | 低但体力 | T1/T2 完成后 | 待做 |
| T4.1 | tracking-caps 覆盖 | 低 | — | 待做 |
| T4.2 | 删死选择器 | 中 | 先跑 T3 截图留证 | 待做 |
| T4.3 | 测试断言迁移 | 中 | T4.2 | 待做 |

---

## 二、为什么这样排序

1. **T1 先做**：denied 是目前唯一「写了样式却没用起来」的分支，属于明显的半成品；改动 20 行、风险最低。
2. **T2 逐项提交**：四项互不依赖，逐项验证能精确定位回归；一次提交四项出问题时无法二分。
3. **T3 放中间**：T1/T2 都会动到表单与弹层，等它们稳定后再做全量截图，避免重复劳动。
4. **T4 最后**：删死选择器会牵动断言，必须等回归截图留证后再删，否则出问题无法对比。

---

## 三、给 Codex 的补充：如何判断「做完了」

| 维度 | 判定标准 |
|---|---|
| 代码 | 改动只落在 fragment / assets/css / assets/html；`git diff --stat` 里没有 `assets/app.js` |
| 测试 | `node tools\test-all.mjs` 输出 `all tests passed`，失败数为 0 |
| 装机 | `dev-loop.ps1` 输出 `dev loop passed`，`adb shell dumpsys package cn.qingheng.health \| grep versionName` 显示新版本 |
| 视觉 | `build\<task-id>*.png` 存在且能在截图里指出改动位置 |
| 说明 | 回报四行里必须写清「哪部分没真机验证」 |

---

## 四、常见卡点与对策

| 现象 | 原因 | 对策 |
|---|---|---|
| `assemble-app.ps1` 后测试仍报 fragment 漂移 | 改了 fragment 没重新拼装 | 每次都先跑 assemble，再跑 test |
| 测试挂 `app-fragments.test.mjs` | `assets/app.js` 与 fragment 不一致 | 同上；或误改了 app.js，需要还原 |
| 测试挂 `meal-date-java.test.mjs` | 版本号三处不同步 | 按 §零 红线 2 检查三处 |
| 页面卡在「正在加载本地记录」 | HTML 结构被改坏（多余或缺失 `</div>`） | 用区块映射校验：每个 section 的起止长度 + 内部 div 平衡 |
| 样式整片失效、卡片透明 | 令牌自引用 | 自检：`--x: … var(--x)` 出现次数必须为 0 |
| 点分段无反应 | 卡片标题改名导致 headings 匹配失败 | 全局搜标题文案 |
