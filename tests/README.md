# 测试套件

2026-11-23 起，原来 114 个单文件回归合并成 **10 个套件**（保留 `food-models` 的 `node:test` 独立运行）：
每个原文件还在自己的 `async` 函数作用域里跑，一个文件抛错只记一条 FAIL，不会中断同组其他文件；
`check()` 断言总数不变（2,191）。

| 套件 | 原文件 |
|---|---|
| `suite-training.test.mjs` | training-*、plan-*、week-*、effort-feedback、rest-timer |
| `suite-food.test.mjs` | meal-*、food-*、nutrition-*、oil-*、anchors-*、intake-*、local-food-estimate、malformed-estimate |
| `suite-today.test.mjs` | today-*、main-action、daily-three-copy、p0-p1-round、p1-answers-phase-collapse、body-quick、weekly-review* |
| `suite-records.test.mjs` | records-*、layout-*、ui-state-matrix、structure-phase、habit-*、body-* |
| `suite-chat.test.mjs` | chat-*、ai-*、advice-*、answer-table、web-search、stream-bubble、analysis-layer |
| `suite-trends.test.mjs` | trends-ui、weight、target-*、lean-targets、goal-requirements、tdee-calibration、body-quick |
| `suite-profile.test.mjs` | onboarding-*、preference-*、profile、skin、hub、wizard、privacy、usage-billing、alarm、camera、gallery、voice |
| `suite-infra.test.mjs` | adapter、apk-*、boot-*、vendor、ci-and-versions、key-hygiene、secret-store、offline、sync-version、symbol、icon、motion、accessibility、swipe、perf、data-flow、render-guard、token-ratchet、graded-colors、interaction-finish、modularization |
| `suite-misc.test.mjs` | 其余未归类的少量文件 |
| `food-models.test.mjs` | 保持独立：用 `node:test` 跑 11 个用例 |

新增回归时：优先加进对应套件里（同一文件内的 `check` 段），别再新建单文件；用 `node tools/test-all.mjs` 跑全量。
