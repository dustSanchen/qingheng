# tools/one-off

历史一次性补丁与诊断脚本，**不要在新流程里执行**。

- `*.py`：早期用 Python 直接改写 assets 的补丁（已被 tests 与正规补丁脚本取代）。
- `patch-*.mjs`：1.0.16 迭代中按步骤改代码的补丁脚本（例如 `patch-step2-oil.mjs`、
  `patch-weekly-slot.mjs`）。它们记录了每一步「改了什么、锚点在哪」，可作为变更说明阅读，
  但**重复执行会重复插入内容**，只应作为历史参考。
- `extract*.js` / `dupcheck*.js` / `dedup*.js` / `verify-form.js`：当时用于定位锚点、
  检查重复 id、还原误插入内容的临时脚本。

日常验证请用仓库根的 `tools\verify-all.ps1`（测试 → 构建 → 打包校验 → SHA）。
