# 品牌审计落地报告（2026-10-31）

## 1. 结论先行
纸感已改为开放内容流、账本保留单层数据框格；实机版本 `1.2.30 / 230`，评分、字段及历史含义未改。

## 2. 改动表

##
| 报告建议 | 分档 | 理由 / 与原建议的差别 |
|---|---|---|
| P0：今日三样与今日训练建议在 Today 消失 | 拒绝 | 报告自己的 `03-today-second-paper.png` 可见「今日三样」，源码也保留两个模块；不重建已有入口。 |
| P1：Today 餐食与流水重复 | 修正 | 改成一张「今日记录」时间线，保留餐食行原有长按操作，并纳入训练、睡眠、体重；不是保留两张列表再去重。 |
| P1：paper / ledger 截图同质 | 修正 | 原标注 paper 的截图实际为 ledger；重新实拍三种皮肤，不据此改全局底色或字体。 |
| P1：我的页皮肤选择被裁切 | 采纳 | 把皮肤选择移到低频设置前，并剥离内层卡框；实机展开后选择项完整可见。 |
| P2：今日体检低分及指标可点击性 | 拒绝 | 调分、改分值标签或改变点击语义会触及评分口径；本轮保持原样，待产品决策。 |
| P2：训练日志被训练偏好压后 | 拒绝 | `RECORD_PANELS` 与报告引用的 `04b` 均显示训练日志在训练计划前；不重复调序。 |
| 结构 #1：拍平嵌套卡并合并 Today 列表 | 修正 | 采纳折叠区去内框与列表合并；只把当天流水放进 Today，不额外改其他页面的信息层级。 |
| 结构 #2：恢复缺失卡片并收敛快速记录入口 | 修正 | 卡片本已存在，只把「快速记录」移到能量卡标题栏作为次级文字动作，主操作不变。 |
| 结构 #3：训练日志优先、偏好摘要折叠 | 拒绝 | 现有顺序已是训练日志优先，改动会制造无证据的重复结构。 |
| 组件 #1：账本表格格线内去输入框边框 | 采纳 | 表格格线保留，格内控件去边框、透明底，避免单元格与控件双重描边。 |
| 组件 #2：餐食 / 训练行改为底线列表 | 采纳 | 训练行与餐食行只留单条底线，去掉继承的顶部重复线，末行不留分隔线。 |
| 组件 #3：分段栏去账本闭合外框 | 采纳 | 删除账本专属外框覆盖，两种浅色皮肤共用现有底线式分段栏。 |
| 样式 #1：折叠区及内部卡片去框 | 采纳 | `profile-more`、`panel-more` 和直接子卡片只保留章节分隔，不再卡中套卡。 |
| 样式 #2：把纸底改为 `#f6f4ee` | 拒绝 | 不改全局底色令牌；纸感改用开放内容流与留白，不依赖扩大背景色差。 |
| 样式 #3：删除全部 ledger 结构覆盖 | 修正 | 去掉重复覆盖，同时明确纸感开放、账本保留面板与表格框线；两种皮肤不强求同一边框结构。 |

### 文件改动
| 文件 | 改动与理由 |
|---|---|
| `app/src/main/assets/index.html` | 今日卡改名为「今日记录」；移除重复的记录页「今日流水」卡。 |
| `app/src/fragments/50-onboarding.fragment.js` | 渲染单一当日时间线；餐食按有效时间排序，体重读取同日测量记录，不迁移或改写数据。 |
| `app/src/fragments/10-rich-answer.fragment.js` | Today 刷新时调用新时间线渲染器，移除旧餐食计数写入。 |
| `app/src/fragments/70-rest.fragment.js` | 删除重复流水渲染器；将皮肤选择提前；版本由 dev-loop 同步。 |
| `app/src/fragments/20-permissions-backup.fragment.js` | 「快速记录」改为能量卡标题栏次级动作，避免与主快捷入口竞争。 |
| `app/src/main/assets/styles.css` | 1.2.27 收敛折叠区与表格内框；1.2.28/29 让纸感卡片/导航成为开放直线分隔，账本保留单层面板与表格格线并去掉标题重复线；无新 token。 |
| `app/src/main/assets/app.js` | 由 `assemble-app.ps1` 从 fragments 生成，未手改。 |
| `build.ps1` | dev-loop 同步默认版本至 `1.2.30 / 230`；未改签名材料。 |
| `tests/layout-four.test.mjs`、`tests/records-panels.test.mjs`、`tests/meal-date-java.test.mjs` | 锁定时间线、单分隔线、皮肤边框分工、表格控件和版本行为。 |
| `docs/design/03-global-changes.md` | §5.1 登记边框结构断言及其设计取舍。 |
| `docs/design/RUNLOG-codex.md` | 追加 r38 实施与验收记录。 |
| 本报告 | 记录逐项分档、证据、不做项与回滚方式；`build/brand-audit-2026-10-31/` 未修改。 |

假设：当天时间线只呈现餐食、训练、睡眠与体重；继续沿用现有 meal / habit / measurement 字段和当天筛选口径，不把饮水、步数或旧记录解释为新增事件。

## 3. 验收证据
- 本轮三次命令：`powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version '1.2.28' -VersionCode 228 -SkipBackup`、同命令使用 `1.2.29 / 229`、最终使用 `1.2.30 / 230`。三轮均 `56 run / 0 failed / 0 timeout`、打包和安装成功、smoke `js errors : none`；最终 APK `dist/qingheng-1.2.30.apk`，SHA-256 `89ABC1D9BDC19222AAB636FB5B31637E07E50944A8A94F94AFDA8C65D00B2529`。
- 最终 `node tools/aesthetic-audit.mjs`：`OK（无阻塞项）`；发丝线、7 档字号、数字、焦点、动效和账本作用域 PASS；67 处 token 外色值、7 处 `.card` 阴影、11 处强调色为 WARN，未绕过。
- 设备样张：纸感 `artifacts/border-after-paper-today.png`、`artifacts/border-after-paper-records.png`；账本 `artifacts/border-after-ledger-today.png`、`artifacts/border-after-ledger-records.png`；夜间 `artifacts/border-after-night-profile.png`。最终版本皮肤恢复 ledger，见 `artifacts/border-after-1.2.29-profile-ledger.png`。
- 四个可编译单元的命令：
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version '1.2.24' -VersionCode 224 -SkipBackup
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version '1.2.25' -VersionCode 225 -SkipBackup
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version '1.2.26' -VersionCode 226 -SkipBackup
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version '1.2.27' -VersionCode 227 -SkipBackup
  ```
  关键输出：每轮 `56 run / 0 failed / 0 timeout`，APK 校验与安装成功，smoke 均为 `js errors : none`；日志依次为 `logs/dev-loop-20261031-0138.log`、`logs/dev-loop-20261031-0145.log`、`logs/dev-loop-20261031-0158.log`、`logs/dev-loop-20261031-0208.log`。
- 最终命令 `node tools/aesthetic-audit.mjs` 返回 `OK（无阻塞项）`；脚本仍报告 67 处 token 外色值、6 处 `.card` 阴影、11 处强调色声明，作为未清警告保留；字号 7 档、发丝线、焦点、动效降级、ledger 作用域均 PASS。
- 实机截图由 `node tools/device.mjs shot <路径>` 生成：`artifacts/brand-after-1.2.27-today-records-ledger.png`、`artifacts/brand-after-1.2.27-today-records-paper.png`、`artifacts/brand-after-1.2.27-today-night.png`、`artifacts/brand-after-1.2.27-profile-open.png`、`artifacts/brand-after-1.2.27-profile-ledger-restored.png`。三种皮肤的「今日记录」空态均无内层虚线；我的页展开后皮肤按钮完整可见，设备已恢复 ledger。
- `git -c core.whitespace=cr-at-eol diff --check` 无输出；无新增依赖；新增 CSS 仅用既有令牌。

## 4. 未验证清单
- 设备当天没有餐食或已记录训练 / 睡眠 / 体重，故混合数据的排序、计数和长按编辑 / 删除尚未实点；验证方法是在测试账号录入不同时间的餐食及日常记录，检查顺序、计数和原操作后清除测试记录。
- 多动作训练行与表单错误态没有实机数据可触发；验证方法是在测试记录中添加两项训练动作，并分别提交缺失字段检查分隔线、错误提示与焦点。

## 5. 不做清单
- 不重建已存在的「今日三样 / 今日训练建议」，也不把训练日志再次提前。
- 不改今日体检评分、分值说明或指标点击语义；这些会改变评分口径或行为，需先由产品确认。
- 不改 `--paper` 等全局颜色，不新增令牌；边框层级由结构和留白区分。
- 不删账本表格格线或可操作控件边界；只移除卡片标题重复线与无意义的闭合外框。

## 6. 回滚
源码提交：`bb41ef2c56a7b2a7bb1b581969b43eb2818c0a30`。回滚命令：`git revert bb41ef2c56a7b2a7bb1b581969b43eb2818c0a30`。
