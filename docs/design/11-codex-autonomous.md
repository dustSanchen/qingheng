# 11 · Codex 无人值守执行协议

> 用途：用户离开电脑，Codex 自主 debug + 优化，直到用完队列或触发停机条件。
> 前置：`09-codex-handoff.md`（现状与约定）、`10-codex-prompt.md`（任务与红线）、`03-global-changes.md`（§5 断言约定）。

---

## 零、粘贴用指令块

```text
你是本仓库的执行工程师，现在进入无人值守模式：用户离开屏幕，你要自主 debug 与优化，
直到完成下列队列或触发停机条件。全程不向用户提问，除非命中「必须停机」的三种情形。

【开工前 5 分钟：预检，任一不满足就停下并写报告】
1. pwd 应为 D:\AI\health-android；存在 tools\dev-loop.ps1、tools\test-all.mjs、tools\device.mjs
2. node tools\test-all.mjs 必须 all tests passed。若基线本来就是红的 → 立刻停止，只写报告，不动代码
3. adb devices 必须有 1 台 device（不是 offline）。设备不在 → 只做静态检查任务（A 组），跳过装机组
4. 读 docs/design/09-codex-handoff.md §三（约定）与 §六（禁做），10-codex-prompt.md 的 8 条红线

【快照协议：每个任务开工前必须做】
- 建目录 backups\auto-YYYYMMDD-HHmm\<task-id>\
- 复制 app\src 与 tests 进去（不含 build\、dist\、toolchain\）
- 任务失败或回滚时用这份快照还原，不要手工逐文件改回来
- 任务成功后保留快照（供用户事后 diff），不要删

【主循环：按队列顺序，一条做完再下一条】
对每个任务执行：
  S1 快照 → S2 读相关文件（先 read，再改）→ S3 改 → S4 assemble → S5 test-all
  S6 通过 → dev-loop 装机 → 真机截图 → S7 写 RUNLOG → 下一条
  失败 → 用快照还原 → 重试一次（只允许改一处、换个思路）
  连续两次失败 → 标记 BLOCKED，写清原因，跳到下一条（不要死磕）

【任务队列（A 组静态优先，B 组需设备；顺序即优先级）】

A1 静态体检：写 tools\one-off\audit-static.mjs，输出三类问题到 build\audit-static.txt
   a) styles.css 里出现、但 index.html 与 app.js 里都不存在的类（死 CSS）
   b) 使用了未声明的 var(--x)（应为 0）
   c) 自引用令牌 --x: … var(--x)（应为 0）
   验收：脚本可重复运行；报告三类计数；不自动删任何东西（删除放 A2）

A2 处理 A1 查出的死选择器
   规则：只删「确认在任何文件里都不出现」的类；每批 ≤10 条；删完跑测试
   若某类被测试引用 → 不改测试，改用 A2b：把该类在 CSS 里的规则保留并备注「测试引用」，跳过
   验收：测试全绿 + build\audit-static.txt 的 a) 计数下降；RUNLOG 记录删了哪些类

A3 T1（denied 空状态接权限行）：见 10-codex-prompt.md · T1
A4 T2.1 aria-invalid / A5 T2.2 弹层返回键 / A6 T2.3 分段方向键 / A7 T2.4 aria-busy
   每项独立提交、独立验证；弹层返回键若涉及原生返回拦截，先确认 MainActivity 是否已有 onBackPressed 钩子

B1 双皮肤抽查回归（不必全量 44 项）
   必做：★ 对比度项 11 行 × 2 皮肤；外加「今日 / 记录 / 趋势 / 我的」各 1 张 × 2 皮肤
   截图存 build\regression\<item>-<skin>.png；对比度用相对亮度公式实算，数值写进报告
   验收：不合格的项回改样式（不是回改断言）

B2 T4.1 tracking-caps 覆盖核对（纯静态，可与 B1 并行）

【必须停机并写报告的三种情形】
1. 需要改产品行为（不是样式/交互/可访问性）而文档没写，例如「训练计划是否允许默认给一套」
2. 测试失败属于「断言与实现都合理但互相冲突」，且无法通过保留二者语义解决
3. 需要动 state.json / SQLite / 权限 API 语义 / 版本号跨越 0.1.0 以上的变更

【记录格式：每完成一个任务，追加到 docs\design\RUNLOG-codex.md】
| 时间 | 任务 | 结果 | 测试 | 截图 | 未验证/备注 |
（保持 append-only，不要重写历史行）

【最终报告：写到 docs\design\REPORT-codex.md，必含五节】
1. 基线 vs 结束：版本号、测试数、APK 路径
2. 已完成任务清单（含每条的证据：截图路径 / 测试输出摘要）
3. BLOCKED 任务与原因
4. A1 体检三类问题的前后计数
5. 未做与建议下一步（诚实写清哪些只是代码层验证、哪些真机验证过）

【绝对禁止（命中任意一条即视为事故）】
- 改 assets\app.js（生成物）
- 改 install / uninstall 设备上的 App、清数据、改包名
- 改 data 目录、state.json、SQLite、任何用户记录
- 为让测试通过而放宽或删除断言
- 一次提交超过 10 条同类改动（无法二分定位）
- 未经快照就改文件
- 把「没验证」写成「已完成」

现在开始：先做预检，把结果写进 RUNLOG 第一行，然后进入 A1。
```

---

## 一、为什么这样设计

| 机制 | 解决什么问题 |
|---|---|
| 预检 + 基线必须绿 | 无人值守最怕「基线本来就红，却以为是自己改坏的」，会浪费全部预算 |
| 每任务快照 | 仓库没有 git，回滚只能靠文件快照；这是唯一可靠的回退手段 |
| 两次失败即 BLOCKED | 防止在一个坏点上烧完全部时间；留证据比硬修更有价值 |
| A 组（静态）优先 | 设备掉线时仍能推进；A1/A2 收益确定、风险可控 |
| 只抽 11 个 ★ 项回归 | 全量 44 项 × 2 皮肤成本过高，抽最可能回归的对比度项性价比最高 |
| RUNLOG append-only | 用户回来能按时间轴复盘；避免它「改写历史」掩盖失败 |
| 三类停机 | 产品决策不该由执行者拍板，尤其涉及「是否给默认方案」这类用户明确表过态的点 |

---

## 二、用户回来后的检查点

1. `docs/design/REPORT-codex.md` 是否存在，五节是否齐全
2. `docs/design/RUNLOG-codex.md` 里 BLOCKED 有几条，原因是否合理
3. `backups/auto-*` 快照是否齐全（每任务一份）
4. `build/audit-static.txt` 的 a) 计数是否下降
5. APK 版本号是否只递增了预期次数（每条任务 +1 个 versionCode）
6. 抽查一张 `build/regression/*.png`，确认改动可见

---

## 三、可选：把它跑成一个循环

如果希望它「自己排下一轮」，在报告末尾加一句：

```text
若 REPORT-codex.md 里 BLOCKED ≤1 且测试全绿，则从任务队列里挑下一个未完成项继续，
否则停下等用户。每轮结束时更新 RUNLOG 与 REPORT，不要新开文件。
```
