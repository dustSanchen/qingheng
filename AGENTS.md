# AGENTS.md · 轻衡（health-android）

Android 本地优先的健康记录 app：单 Activity + WebView，无服务端、无账号、无云同步。
包名 `cn.qingheng.health`。本文件是**工具与路径的权威说明**，动手前先读它，能省掉一半试错。

## 权威路径（不要猜）

| 东西 | 真实路径 | 常见错误写法 |
|---|---|---|
| 逻辑源码（片段） | `app/src/fragments/*.fragment.js` | ~~`app/src/main/assets/fragments`~~（不存在） |
| 生成物 | `app/src/main/assets/app.js` | 手改它（**禁止**，由 assemble 生成） |
| 样式 | `app/src/main/assets/styles.css` | 整份读入上下文（81KB，贵） |
| 结构 | `app/src/main/assets/index.html` | — |
| 测试 | `tests/*.test.mjs`、`tools/test-all.mjs` | — |
| 装机/截图 | `tools/device.mjs`、`tools/dev-loop.ps1` | — |
| 打包 | `tools/assemble-app.ps1` | — |
| 设计文档 | `docs/design/` | — |

## 命令清单

```powershell
# 开工第一步：形状/工具/adb/测试/版本 一次校验（--fast 跳过测试）
node tools/preflight.mjs

# 审美静态审计（改完样式跑一次；只报告不修改）
node tools/aesthetic-audit.mjs

# 全量测试（基线必须 55/55）
node tools/test-all.mjs

# 片段 → app.js
tools\assemble-app.ps1

# 装机（版本号 +1）
tools\dev-loop.ps1 -Version 1.1.44 -VersionCode 144 -SkipBackup

# 设备交互（adb 已在 PATH：D:\Tools\platform-tools\adb.exe）
adb devices
node tools/device.mjs tap <x> <y>          # 设备像素
node tools/device.mjs tap <x> <y> --preview # 截图预览像素（877x1904）换算
node tools/device.mjs shot build\xxx.png
adb shell dumpsys package cn.qingheng.health | Select-String 'versionName'
```

## 工具陷阱（踩过的）

1. **别给 `rg` 传 PowerShell 通配符**。`rg ... app\src\fragments\*.fragment.js` 会把 `*` 当字面量，
   报 `os error 123`。正确：`rg -n "pattern" app/src/fragments -g '*.fragment.js'`。
2. **别把多个 `&` 命令 + 管道塞进一行**。`& node ...; & .\toolchain\...\adb.exe shell ... | Select-String`
   在某些 PowerShell 包装下会把 exe 当文本读出来（满屏 `MZx`）。拆成多条命令，或只用 `adb`（PATH 里就有），
   或先 `adb ... > build\tmp.txt` 再 grep。
3. **`--preview` 只接受预览像素**（≤877x1904）。设备像素 348,2320 配 `--preview` 会被脚本拒绝，
   这是**正确行为**，不是 bug。
4. **仓库已有 git（2026-10-27 起）**：`.gitignore` 排除 toolchain/dist/build/backups/artifacts/downloads/.signing；签名密钥绝不入库。每轮改动在 assemble + `node tools/test-all.mjs` 全绿后提交一次，消息格式 `轻衡 <版本>：<摘要>`（中文，用 `git commit -F <文件>` 避免 cmd 转码），提交后 `git push localmirror master`（C 盘 bare）与 `git push origin master`（GitHub 私仓 dustSanchen/qingheng，凭据已由 GCM 缓存）双推送；OneDrive `qingheng-backup/` 的 bundle 与密钥副本为云冷备。回滚优先 `git checkout -- <文件>` / `git revert`；`backups/auto-*` 快照与文件旁 `.bak-rNN` 降级为补充手段，不再需要每个新会话重建基线。

## 已装护栏（2026-10-29，防复发）

这几类问题已经发生过不止一次，现在由工具兜底，别再靠记忆：

1. **版本号漂移**（关于页写 1.1.71、装机是 1.1.91）。现在 `dev-loop.ps1` 第一步就是
   `node tools/sync-version.mjs <版本> <versionCode>`，一次对齐三处：`70-rest.fragment.js` 的
   `APP_VERSION`、`build.ps1` 的默认 `$Version/$VersionCode`、`tests/meal-date-java.test.mjs` 的字面量。
   **不要手改版本号**，只跑 `dev-loop -Version X -VersionCode N`。
2. **`.bak` 备份被打进 APK**（体积 467 KB → 668 KB）。`build.ps1` 现在先把 assets 复制到
   `build/assets-stage` 并排除 `*.bak/.tmp`（含 `-rNN` 这类后缀）再交给 aapt2；打包 guard 的正则也覆盖了后缀。
   备份请放 `backups/`，不要留在 `app/src/main/assets`。
3. **报告里写「已完成」但其实没做**。规矩：总结里每条「已完成」都必须能指向一次具体的工具调用或一个文件证据；
   写总结前对着待办逐项核对，不拿「我打算做」的记忆冒充「我已经做」。

## 双皮肤约束

- 两套皮肤：`paper`（暖纸感、衬线标题）与 `ledger`（数据优先、无衬线标题）。
- 账本改动**只能**写在 `[data-skin="ledger"]` 作用域或账本专属 token 下，不得回流纸感。
- 线看起来「粗」先归因：宽度 / 颜色 / 叠加（描边+阴影+伪元素）；1x 屏 1px 已是物理最小。

## 硬约束

- `app.js` 是生成物，永远不要手改；改 `app/src/fragments/*` 后必须跑 assemble。
- 不引入依赖 / CSS 框架 / 构建步骤。
- 文案：不出现第三方品牌名；不写「加油」「坚持！」；热量下限 2,000 kcal 是硬底线；不诊断、不开处方。
- 单轮输出别整份读 `styles.css`；用 `grep` 定位或读 `docs/design/02-color-groups.csv`。

## 文档索引

- `docs/design/00-START-HERE.md` 交接入口与必读顺序
- `docs/design/12-handoff-20261026-2310.md` 最近一次交接（含 r19–r23 缺记说明）
- `docs/design/13-aesthetic-claude.md` 审美执行清单与交付前十项自检
- `docs/design/14-design-thinking.md` 设计思考的表达模板与评审四问
- `docs/design/RUNLOG-codex.md` 迭代日志（**每轮必须追加**）

## 交付格式

改完回三行：改了哪些文件 / 诊断结论 / 设计理由。
