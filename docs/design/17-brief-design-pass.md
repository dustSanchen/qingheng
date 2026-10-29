# 轻衡：设计语言收敛任务（1.1.91）

仓库 D:\AI\health-android｜不改业务逻辑｜不改 app.js（生成物）

## 0. 你要做的只有三件
1. 把「token 外硬编码」从 67 处降到 ≤40（口径见 §3）
2. 把 6 处 .card 带 box-shadow 逐条判定：该留的移到 .is-floating，该删的删
3. 把 11 处 accent token 声明收敛到 3 处以内

## 1. 现状（已核对，不必重查）
- 字号 6 档：13/15/17/20/26/32（已封顶，不要再加档）
- 圆角 3 档：8/12/20（--shape-* / --radius-* 已收敛）
- 线语言：L1 --line（分区）/ L2 --line-strong（控件，3.36:1）/ L3 focus-visible 3px
- 新增令牌 --warn-ink / --danger-ink 已入库并在两套皮肤定义
- 测试 56/56；审计当前 3 条 WARN（见 §3）

## 2. 只读两处（≤10 分钟）
- docs/design/02-tokens.md：令牌表，改动必须回写
- docs/design/03-global-changes.md §5.1：断言变更登记规则

## 3. 口径（最容易搞错的一条）
audit 报的「67 处 token 外硬编码」包含两套皮肤的令牌定义本身（:root 与 [data-skin=ledger]）。
真实散落在选择器里的只有约 22 处。**不要追求归零**，目标是 ≤40 且新增令牌合规。

## 4. 硬约束（违反即红）
| 约束 | 后果 |
|---|---|
| 源码改 app/src/fragments/*.js，改完 assemble | 忘 assemble → app.js 落后 |
| 新增颜色令牌：02-tokens 登记 + ledger 同名 + 两套皮肤集相等 | 缺一 → token-ratchet / training-library 红 |
| 改测试断言 → 先登记 §5.1 | 否则算「改测试来通过」 |
| 恢复文件用 git show HEAD:\<path> 经 node 写 Buffer | checkout/restore 被拦；PS 重定向毁编码 |
| 只动 [data-skin=ledger] 内做账本改动 | 否则纸感受污染 |

## 5. 每件事的交付格式（固定，别写长文）
```
任务: <编号>
改动: <文件:行> 
归因: <一句话，引用证据行号>
设计理由: <一句话>
验证: assemble=<ok/fail> tests=<n>/56 audit WARN=<before→after>
```

## 6. 允许放宽的边界（前提是更优）
- 强调色可一屏多次：第二次起必须写「为什么这里也需要」
- 动效上限 0.4s（叙事可 0.6s），必须保留 prefers-reduced-motion
- 字体/图表库/新页面允许引入，但交付必须写代价与回退方式，否则不算通过

## 7. 失败处理
同一目标尝试 2 次仍红 → 停止，输出 `BLOCKED: <根因一句话> + <需要什么>`，不要继续试。
