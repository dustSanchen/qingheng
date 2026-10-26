# 交给 opencode 的开场文本

复制下面整段发给 opencode（工作目录设为 `D:\AI\health-android`）。

---

## 第 1 轮（记录页重设计）

```
你在 D:\AI\health-android 工作。这是「轻衡」——Android 本地优先的个人健康记录 app
（单 Activity + WebView，无服务端、无账号、无云同步）。

先做三件事，先不要写代码：
1. 读 docs/design/00-EXECUTION-PLAN.md —— 六步顺序，不要跳步
2. 读 docs/design/00-START-HERE.md —— 当前进度、成本纪律、硬约束速查
3. 读 docs/design/04-task-redesign.md —— 本轮任务卡

当前状态：
- 阶段 1 审计、阶段 2 令牌收敛、阶段 3 A/B 组已完成并装机验证
- 全套测试 55 个，当前全绿
- 没有 git，回滚靠 backups/ 下的快照

本轮只做一件事：按 04-task-redesign.md 产出 docs/design/03-components-d.md。
只写文档，不改 styles.css、不改 app.js、不改 fragments。

硬规则：
- app.js 是生成物，由 app/src/fragments/*.fragment.js 拼接而来，永远不要手改
- 读 styles.css 用 grep 定位，不要整份读入上下文（77KB，很贵）
- 不要引入依赖、不用 CSS 框架、不加构建步骤
- 不出现第三方品牌名；文案温和克制，不写「加油」「坚持！」
- 热量下限 2,000 kcal 是硬底线
- 不诊断、不开处方

每节必须包含：现状判定 / 新结构（文字线框）/ CSS diff（改前改后各几行）/ 两套皮肤取值 / 理由。

完成后回一行：done，三节 N 行。
```

## 第 2 轮（今日页重设计）

```
继续。读 docs/design/05-task-today.md，按它的四节做。

同样只写 docs/design/03-components-e.md，不动 styles.css、不动 app.js。
涉及 JS 才能实现的部分（如圆环目标标记、建议文案生成）单独列一节「需 JS 配合」，
写清需要什么数据、什么接口，不要自己实现。

完成后回一行：done，四节 N 行，需 JS 配合 M 项。
```

## 第 3 轮（合并应用）

先等人类确认 D/E 两个文档，再发：

```
两份文档已确认。现在落地。

1. 先备份：把 app/src/main/assets/styles.css 复制成 styles.css.bak-apply-d-e-<日期>
2. 按 03-components-d.md 与 03-components-e.md 的 CSS diff 修改 styles.css
3. 不要动 app.js / fragments
4. 改完执行：
   Get-ChildItem tests\*.test.mjs | ForEach-Object { node $_.FullName }
   报告 PASS / FAIL 数，失败的测试文件名与失败项

若某个测试失败，先判断：是断言引用了旧 token（改测试），还是样式真的不达标（改样式）。
不要为了让测试变绿而改测试，除非能在 03-global-changes.md §5 找到依据。
```

---

## 给人类的提示

- **模型选择**：用 Sonnet 级别即可，不要用 Opus。上一轮 Opus 因为反复重发 77KB CSS，89 秒烧掉 $15.4（见 `INCIDENT-20261026-opus.md`）。
- **工作目录**必须设成 `D:\AI\health-android`，否则 `docs/design/...` 全部找不到。
- **别让它一次干完**：一轮一个文档。opencode 和 DSH 一样有输出上限，一次要太多会被截断，而且截断后什么都没落盘。
- **验收前先看它读没读对文件**：如果它回复里引用了 `00-brief.md` 里根本不存在的规则，说明它没真读，只是编。
