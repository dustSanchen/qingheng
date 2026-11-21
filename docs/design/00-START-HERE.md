# 从这里开始（新会话交接）

你在一台**没有任何历史上下文**的新会话里。本目录下所有文件都是自解释的，
不需要读取旧对话、不需要我复述需求。

## 这是什么

轻衡（cn.qingheng.health）的**设计语言改版**，分五阶段推进。
最终产物是可执行的 CSS diff 与组件规范，不是一份改版提案。

## Keep 优化的三份文件

当前 `1.5.02 / 502` 的 Keep 对照优化，按以下顺序阅读：

1. `32-keep-current-vs-target.md`：Keep 原则、轻衡现状与缺口。
2. `31-keep-phased-plan.md`：阶段、版本与执行结果。
3. `30-deepseek-optimization-checklist.md`：逐项任务与实施状态。

旧的设计语言五阶段材料仍见本文件下方；不要把两套任务混在一起。

## 必读顺序（只读这四个，别读别的）

| 顺序 | 文件 | 作用 | 读完你应该知道 |
|---|---|---|---|
| 1 | `00-brief.md` | 事实基线：产品、硬约束、现有令牌、输出格式 | 哪些事**绝对不能做** |
| 2 | `01-audit.md` | 阶段 1 审计，11 条（P0/P1/P2） | 现在最疼的是什么 |
| 3 | `02-color-groups.md` | 颜色硬编码聚类成 10 组 | 190 处硬编码的分布与判断要点 |
| 4 | `02-task-tokens.md` | 阶段 2 任务卡 | 这一轮要交付什么 |

## 当前进度

- ✅ 阶段 1：审计完成，11 条写入 `01-audit.md`
- ✅ 机械提取：`styles.css` 扫描出 **209 处**硬编码色值 / **176 个不同值** → `02-hardcoded-raw.csv`
- ✅ 阶段 2：`02-tokens.md`（41 token）+ `02-mapping.csv`（176 值归类）+ `03-global-changes.md`（44 项波及面）
- ✅ 阶段 3 A/B 组：已落地、55/55 测试通过、装机截图验证
- ⏳ 阶段 3.5 / 3.6：`04-task-redesign.md`（记录页）、`05-task-today.md`（今日页）——只写文档
- ⬜ 交互补完（`06-task-interaction.md`，待建）→ 阶段 4 皮肤锚点 → 阶段 5 验收

**执行顺序见 `00-EXECUTION-PLAN.md`，不要跳步。**

## 模型与成本纪律（重要）

- 用 **Claude Sonnet 5.5（6 折）** 或 Haiku 5.5。**不要用 Opus**——上一轮 Opus 因反复重发 77KB CSS，89 秒烧掉 $15.4。
  事故详情与判断标准见 `INCIDENT-20261026-opus.md`。
- **不要读整份 `styles.css`**。要颜色类信息，读 `02-color-groups.csv`；要具体行号，grep `02-hardcoded-raw.csv`。
- 单轮输出**不超过 120 行**，写完立刻落盘，然后停。
- 需要更多内容时停下等指令，不要一次做完。

## 开场指令（直接复制发送）

```
读 docs/design/00-START-HERE.md，按里面的必读顺序读完 1-4，
然后只做阶段 2 的第一步：写 docs/design/02-tokens.md，不超过 120 行。
写完只回一行：done，N 个 token。
```

## 硬约束速查（详见 00-brief.md）

- 不做社交 / 扫码 / 打卡连续天数 / widget / 排行榜
- 无统一热量地板（2000 kcal 已删除）；目标区间按饮食目标算，仅保留性别安全下限提示（女 1200 / 男 1500）
- 不诊断、不开处方；文案不写「加油」「坚持！」
- 不出现第三方品牌名（Claude / Anthropic / Apple / Things）
- 不引入任何统计 SDK

## 材料索引

```
docs/design/     设计文档与产出
docs/shots/      真机截图（paper/ ledger/ scenes/ 共 13 张）
app/src/main/assets/styles.css     样式（77KB，按需 grep，不要整份读）
app/src/main/assets/index.html     结构
app/src/fragments/*.fragment.js    逻辑（按文件名读，不要全读）
```

## 截图清单

- `paper/` 纸感：today / record / trends / profile
- `ledger/` 账本：同上四页
- `scenes/` empty-today / empty-record / empty-trends / empty-profile / onboarding
- **缺**：`no-training`（不健身模式）、`bulking`（增肌目标）——涉及这两项的判断必须写「需要截图才能判断」
