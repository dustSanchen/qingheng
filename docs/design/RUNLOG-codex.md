| 2026-10-26 18:43 +08:00 | 预检 | PASS：pwd 与工具齐全；基线 55/55 通过；ADB 设备 3cba2bdc 在线 | node tools/test-all.mjs: 55 run / 0 failed / 0 timeout；all tests passed | 尚无 | A1 快照：backups/auto-20261026-1843/A1 |
| 2026-10-26 18:52 +08:00 | A1 | PASS：新增可重复静态审计脚本与报告；基线计数 a=56/80、b=0、c=0 | assemble passed；55/55；APK 打包与 verify-web-apk 通过；dev-loop 装机两次均因设备掉线失败 | 无：ADB 在预检后离线，未生成回归截图 | 快照 backups/auto-20261026-1843/A1；真机版本回读未验证 |
| 2026-10-26 18:57 +08:00 | A2 | BLOCKED：两次尝试失败后按协议停止；候选含动态类族，第一次规则替换误伤后已由快照恢复，第二次预写校验误拦；未保留 CSS 删除 | 快照恢复 SHA-256 一致；最终 55/55 | 无 | CSS 未改变；快照 backups/auto-20261026-1853/A2；候选未删除 |
| 2026-10-26 19:01 +08:00 | B2 | PASS：`.answer-eyebrow` 分组眉题改用 `--tracking-caps`；类名已在 fragment/app.js 确认 | assemble + node --check 通过；A1 复扫 a=56/80、b=0、c=0；55/55；APK verify-web-apk 通过 | 无：设备离线，未装机 | 快照 backups/auto-20261026-1859/B2；APK dist/qingheng-1.1.31.apk（1.1.31/132） |
| 2026-10-26 19:44 +08:00 | A1 装机补验 | PASS：连接恢复后以 adb install -r 覆盖更新，原有本机数据未清理 | installed 1.1.31；smoke js errors none；截图 PNG 有效（282365 bytes） | build/smoke-1793015051144.png | 仅做启动冒烟，未覆盖双皮肤和交互回归 |
| 2026-10-26 20:18 +08:00 | A3/T1 | PASS：通知权限明确拒绝时显示 `denied` 空状态，申请按钮保留；未知状态仍走原说明 | assemble + node --check 通过；55/55；dev-loop passed；APK verify-web-apk 通过 | build/A3-permission-denied.png；build/smoke-1793015475447.png | 已授权恢复态的视觉截图未验证；ADB 临时 grant 后已 revoke，手机恢复原 granted=false | 快照 backups/auto-20261026-1948/A3；版本 1.1.32/133 |
| 2026-10-26 23:20 +08:00 | 纸感诊断 | PASS（只取证未改码）：定位同屏三套线语言 + 两处叠加（L96/L130） | preflight PASS（55/55 未跑，--fast）；对比度实测：容器线 1.22:1、控件线 3.36:1、填充对纸底 1.08:1 | 四张既有截图（23:14–23:18） | 产出 docs/design/15-paper-skin-diagnosis.md；未改任何 CSS |
| 2026-10-26 23:23 +08:00 | 账本记录控件线条 | 进行中：仅账本记录页控件由 1px 调为 0.67px，颜色不变；APP_VERSION/build/test 同步至 1.1.44/145 | 基线 55/55；当前版本 1.1.43/144；像素抽样 3 device px，无 focus/error 叠线 | build/records-{ledger,paper}-{food,training,body}-before.png | 快照 backups/auto-20261026-2323/ledger-lines；仅对账本记录控件生效 |
| 2026-10-26 23:38 +08:00 | 快速记录对齐 | PASS：① 主操作行从 .energy-detail 右栏提升为卡片级 .energy-actions；② 弹窗「名称补充」麦克风改为嵌入输入框内部，右边线与其它字段对齐；③ 弹窗操作行改为表单内滚动 + 吸底，取消/保存不再被面板切断 | assemble + node --check 通过；55/55；dev-loop 装机 1.1.48 通过；截图对照 build/home-quickrecord-before.png / home-1146b.png、quickrecord-dialog.png / quickrecord-1148.png | build/quickrecord-1148.png | 快照 *.bak-r24；附带发现 APK 内打进了 .bak-r* 备份文件（约 300KB），建议打包排除 |
| 2026-10-26 23:43 +08:00 | 清理历史快照 | PASS：删除 71 个 .bak- 文件（3.29 MB），先整包归档到 backups/archive/bak-snapshots-20261026-2341.zip（1 MB），可在需要时单独取回 | assemble + 55/55；dev-loop 装机 1.1.49；APK 905 KB → 467 KB（-48%） | dist/qingheng-1.1.49.apk | preflight 新增「快照」检查：app/src 下出现 .bak- 会 WARN，避免再次打进包 |

| 2026-10-27 00:05 +08:00 | P0 清理（评估报告四项） | PASS：① 实现 renderLastChat 并接点击跳问答（此前调用点存在但函数从未定义，「上次 AI 回答」行恒为占位）；② /api/chat 增加 logToHistory 门禁，AI 排课与训练建议两条内部调用不再写入问答记录、不再混入后续 history；③ index.html 去掉 anchors.js 重复加载；④ 删除被覆盖的富版 parseTrainingDraft/draftSummary（约 80 行）与 renderTrainingPresets 双调，training-draft 测试改为执行运行时真实解析器（parseDraft+包装器）；另把 APP_VERSION/build.ps1 默认版本同步到 1.1.50/150 | assemble 后 node --check 通过；55/55 全绿；dev-loop 构建装机 1.1.50(versionCode 150) 成功，smoke 无 JS 错误，firstInstallTime 保持 2026-10-10 数据未动 | build/smoke-1793030708312.png | 快照 backups/auto-*；native-adapter.js 为手写文件直接修改，fragments 改后已 assemble | dist/qingheng-1.1.50.apk（467KB 级）|

| 2026-10-27 02:05 +08:00 | P2 产品体验四项 | PASS：① 账本暗色：@media(prefers-color-scheme:dark) 下仅 [data-skin=ledger] 令牌覆盖（纸感不动），auto 语义=深色系统全程账本、浅色趋势页账本其余纸感，皮肤持久化改存选择本身（修复 auto 退化），theme-color 跟随，matchMedia 翻转监听；浏览器真渲染验收四页（引导/今天/趋势/记录）对比度全部成立，CSSOM 确认 #141719 规则存在；② 迁移包：导出附 meta（appVersion/counts/fnv1a 校验和，键序无关 stableStringify），导入前校验完整性并在确认框提示，导入后按集合核对数量并报告差异；③ 问答搜索 180ms 防抖；④ HC 授权入口规范 action 优先（MANAGE_HEALTH_PERMISSIONS/HEALTH_HOME_SETTINGS），硬编码组件名降为末位兜底；版本同步 1.1.51/151 | assemble 后 55/55 全绿；dev-loop 装机 1.1.51(versionCode 151) 成功，smoke 无 JS 错误，firstInstallTime 保持 2026-10-10 | build/smoke-*.png、浏览器截图四张（会话产物） | 迁移 meta 只存在于备份文件，不入 state.json；HC 硬编码候选保留在末位（本机验证过的路径不删） | dist/qingheng-1.1.51.apk |

| 2026-10-27 02:55 +08:00 | P1 可靠性与数据一致性五项 | PASS：① 推送投递改为 Android 14+ 短时前台服务 PushService（shortService），模型调用不再受 goAsync 约 10 秒窗口限制，低版本/启动被拒自动回退原路径，清单新增两条 FOREGROUND_SERVICE 权限（aapt2 已核对编译后清单与 0x800 类型）；② /api/prefs：planPrefs 与最近 10 天 AI 排课写入 state.json 顶层 prefs，导出/迁移携带、导入整体带入、localStorage 保持即时缓存并在 loadState 水合（键复用 PLAN_PREFS_KEY/AI_PLAN_KEY，不触碰 adapter 测试的 localStorage 字面量清单）；③ 应用内自动备份：保存后最多每 12h 在 files/backups/ 轮换 3 份 auto-state-N.json，「关于」存储自检显示时间与份数；④ 必应/百科标注无官方接口合同，界面文案+类注释同步；⑤ README 口径修正：推送只发数字、问答含食物名与锚点，Brave 小节标为历史 | assemble 后 55/55 全绿；dev-loop 装机 1.1.52(versionCode 152) 成功，smoke 无 JS 错误，firstInstallTime 保持 2026-10-10；aapt2 dump 确认 PushService+shortService 已入包 | build/smoke-*.png；alarm-catchup/p0-p1-round/web-search 等源码断言全部保持 | dist/qingheng-1.1.52.apk |

| 2026-10-27 03:40 +08:00 | P3 工程与流程三项 | PASS：① git 入库：winget 安装 Git 2.56，git init + .gitignore 扩充（toolchain/dist/build/backups/artifacts/downloads/.signing/*.bak-r* 全部排除，签名密钥绝不入库），基线提交 cbe13ae（1182 文件/60794 行，含 one-off 历史归档——ci-and-versions 测试要求其存在）；AGENTS.md「本仓库没有 git」条目改写为每轮全绿后提交的工作流；② MainActivity 路由组继续拆分：新建 bridge/PushRoutes.java（/api/push、/api/push-history、/api/notification-test、/api/notification-permission，沿用 MetaRoutes 的窄 Host 接口 + null 透传模式），MainActivity implements PushRoutes.Host，六个 handler 转 @Override public，路由 if 链缩短；③ build.ps1 打包守卫：aapt2 link 后解包扫描 zip 条目，反斜杠条目与 .bak/.tmp 残留直接 fail，ci-and-versions 新增断言固化；web-search.test.mjs 的 /api/push-history 断言随路由迁家改为断言 PushRoutes.java + MainActivity 接线 | assemble 后 55/55 全绿；dev-loop 构建装机 1.1.53(versionCode 153) 成功（打包守卫首次实跑通过），smoke 无 JS 错误，firstInstallTime 保持 2026-10-10 | git log cbe13ae；dev-loop 日志 | dist/qingheng-1.1.53.apk |

| 2026-10-27 04:35 +08:00 | 引导页三处修复（用户截图指认） | PASS：① 文字溢出：最后三件事清单的 HC 描述横向溢出 63px——根因 styles.css:195 全局 .row-meta span{white-space:nowrap}，:307 的 overflow-wrap:anywhere 被 nowrap 压制；.check-row .row-meta span 增加 white-space:normal，浏览器实测溢出元素 5 个→0 个；② 删除引导默认数据：性别不再默认「男」（请选择 + 必选校验），目标不再默认「增肌同时减脂」（去掉 checked + obNext 门禁改为显式校验，原先目标未选时会以 recomp 兜底溜过），未选目标时测算面板显示中性提示而非偷偷测算，档案表单 sex 同步去默认，restart 预填去掉 || male；③ 第一步（填体重页）校验去重：去掉底部状态行与行内提示的重复报错，只留 markFieldInvalid 行内 + focus；fine-print「年龄可选」与年龄必填校验矛盾，改为如实文案；浏览器四步全流程验证：默认值空、单条行内错误、中性提示、门禁拦截、溢出 0 | assemble 后 55/55 全绿；dev-loop 装机 1.1.54(versionCode 154) 成功，smoke 无 JS 错误，firstInstallTime 保持 | 浏览器截图两张（第四步溢出修复对比） | git 提交随本轮 | dist/qingheng-1.1.54.apk |

| 2026-10-27 05:40 +08:00 | A3+A4（备份闭环收尾） | PASS：① A3：onDestroy 补 mirrorExecutor.shutdown()，修复 Activity 重建每次泄漏一条镜像线程；配套把 maybeAutoBackup 的 execute 包进 try/catch（拒绝执行只复位标记，不让一次 teardown 竞态把保存判失败）；② A4：新增 POST /api/backup-restore——读 backups/auto-state-1.json 经 cleanState 归一化后整体替换当前状态，恢复前自动把当前状态写为 backups/pre-restore.json 底档（恢复本身可撤销），缺备份/解析失败/内容不完整三类情况明确报错且不动数据；「关于 → 本机存储」新增「从应用内备份恢复」按钮，前端双重确认；③ perf-and-mirror 新增 8 项断言固化 | assemble 后 55/55 全绿；dev-loop 装机 1.1.55(versionCode 155) 成功，smoke 无 JS 错误，firstInstallTime 保持 | git 双推送（origin+localmirror）随本轮 | dist/qingheng-1.1.55.apk |

| 2026-10-27 06:30 +08:00 | 今天页按钮间距 + 夜间模式开箱（用户反馈） | PASS：① 记录一餐/快速记录按钮与宏量区分隔线贴死——实测间距 0px；.energy-actions 增加 margin-bottom 16px，浏览器实测 0→16px，前后截图对比确认；aesthetic-audit 无阻塞项；② 手机端夜间模式：暗色令牌只挂账本皮肤而皮肤默认值是纸感，从未选过皮肤的用户永远浅色——currentSkin 兜底从 paper 改为 auto（系统深色=全程账本暗色，浅色=趋势账本其余纸感），清空存储后实测 choice=auto、skin=ledger、背景 #141719、theme-color 跟随；外观皮肤选择器说明文案同步新语义 | assemble 后 55/55 全绿；dev-loop 装机 1.1.56(versionCode 156) 成功，smoke 无 JS 错误，firstInstallTime 保持 | 浏览器前后截图 | git 双推送随本轮 | dist/qingheng-1.1.56.apk |

| 2026-10-27 07:20 +08:00 | 今天页图标一致性与时间贴左（用户反馈） | PASS：① 快捷四宫格四图标墨迹占比不同（weight 18u/meal 15u/training、camera 12u 高）导致同排大小不一——chips 生成器加 data-quick-icon，CSS 按墨迹高度≈13px 做光学补偿（21/26/17/26px），实测渲染墨迹高度 13.1/13.0/12.8/13.0px（此前 13.8/11/16.5/11）；② 夜间时段提示时间贴左——styles.css 旧规则 .slot-hint[data-slot=night]{padding-left:0} 覆盖了新版带边框容器的内边距，删除该陈旧覆盖，实测时间距卡片边缘 0→15px，夜间提示与白天共用同一容器（仅左边色随时段）；assemble 后 55/55 全绿；dev-loop 装机 1.1.57(versionCode 157)，smoke 无 JS 错误，firstInstallTime 保持 | 浏览器截图 + 实测数据 | git 双推送随本轮 | dist/qingheng-1.1.57.apk |

| 2026-10-27 02:30 +08:00 | B6+B7 + 存储面板降低理解门槛 | PASS：① B7：mirrorAll 从「全表 DELETE+重建」改为按 (collection, record_id) 增量 diff——按主键查 payload+position 未变则跳过、新增/变更 REPLACE、消失的删除，单事务包裹；主键索引本就存在，无需 schema 迁移，实测保存只触碰变化行；② B6：新建 bridge/RecordsRoutes（/api/meals、/api/measurements、/api/habits、/api/chats、/api/profile、/api/prefs，窄 Host + null 透传），MainActivity implements RecordsRoutes.Host，collections/profile/prefs 三个 @Override 方法承接原内联路由体，route() 再缩短；③ 降低保存/读取理解门槛：关于页存储面板拆两层——可见主行改为用户语言（「记录都保存在这台手机上：餐食 N、身体 M…；应用内自动备份 X 份（最近 …），每 12 小时更新」），JSON/SQLite/一致性等术语整行移入「技术细节」折叠；浏览器实测两层文案均正确渲染；④ perf-and-mirror 新增 6 项断言（禁全表删除、按 id 更新、跳过未变行、RecordsRoutes 存在、summary 入口）；修正 meal-date-java 的 payload 断言随变量重命名同步；修复过程两处编译错（push 钩子重复声明、import 块 records 变量重名）与一处前端 parts 未定义，均已修复并复验 | assemble 后 55/55 全绿；dev-loop 装机 1.1.58(versionCode 158) 成功，smoke 无 JS 错误，firstInstallTime 保持 | git 双推送随本轮 | dist/qingheng-1.1.58.apk |

| 2026-10-27 03:20 +08:00 | 四宫格图标光学补偿二轮（用户拉线验收） | PASS：用户要求拉两条横线验证图标上下齐平与大小一致——用 getBBox+描边半径实测发现一轮补偿的墨迹比例估算有误（相机顶部取景凸起未计入，墨迹 15.8u 而非 13.8u），真实墨迹高度 14.7/15.0/14.0/17.1px 且中心漂移 2px；按实测重设渲染尺寸（20/24/17/21px），注入红/蓝双横线标尺+墨迹虚线框截图验收：墨迹高度 14/13.8/14/13.8px（±0.2px）、上下缘齐平、图标/文字墨迹比 0.99~1.08（≈1:1 无悬殊）；用户放大截图复核通过 | assemble 后 55/55 全绿；dev-loop 装机 1.1.59(versionCode 159) 成功，smoke 无 JS 错误，firstInstallTime 保持 | 拉线截图 + 放大验收截图 | git 双推送随本轮 | dist/qingheng-1.1.59.apk |

| 2026-10-27 22:26 +08:00 | B8+B9+B10 与「用 AI 排今天」训练改造 | PASS：① B8 问答记录分页——renderChat 默认只渲染最新 30 条，底部「更早的记录（还有 N 条）」，搜索/收藏变化时重置；② B9 三个 localStorage 键（chat.unhelpful / chat.web / training.consent）改用常量并同步 /api/prefs，hydratePrefsFromState 一并恢复；③ B10 新增 tests/token-ratchet.test.mjs——hex 与 rgb() 数量只减不增、令牌必须登记进 02-tokens.md（该断言当场逼出 18 个未登记令牌，已补）；④ 健身偏好从下拉改成芯片按钮，器械新增「综合」（mixed），prompt 传中文器械名并要求综合时混用多器材；⑤ AI 训练计划进入编辑态可改名称/组数/次数/负重，× 按钮删除单行，dose 改为派生值。测试 56/56 全过；adapter 那条「localStorage 字面量出现次数」的脆弱断言改成「裸键只允许 qingheng.tab + 三个常量必须有字面量」。

| 2026-10-27 22:31 +08:00 | 1.1.62 修复：AI 排今天崩 + 偏好不可见 | PASS：① `renderAiPlan` 里我写成了 `list.classList.contains("editing")`，该作用域只有 `box`，一点「用 AI 排今天」就抛 `list is not defined`——改回 `box`；② 偏好表单带 `hidden` 且「修改偏好」按钮在表单**内部**，等于入口自己也藏起来了；改成表单常驻显示、删掉该按钮，改一个芯片就能重排。装机后用「综合/杠铃」等芯片生成了 5 个动作，覆盖杠铃卧推、杠铃推举、哑铃侧平举、绳索下压多种器材。

| 2026-10-27 22:36 +08:00 | 1.1.63 AI 计划一键加入当天训练记录 | PASS：新增 addExercisesToToday(items)——读当天 habitRow 的 exercises、同名跳过、只追加不覆盖、写回 /api/habits 后 quiet 重载；「今日顺序」每行加行尾「加入」按钮、底部加「全部加入今天的训练记录」；「今日训练建议」回答下方加「把回答里的动作加入今天的训练」，用保守正则从散文里挑「动作名 3组×8次 60kg」，**解析结果先经确认框列出再写库**——从散文猜的动作猜错比不做更糟，识别不到时提示改用训练日志手动记。

| 2026-10-27 22:44 +08:00 | 1.1.64 修编辑态布局崩坏 | PASS：截图显示进入编辑态后输入框撑满整行、页面溢出——根因是全局 `input:not([type=checkbox]):not([type=radio])` 的 `width:100%` 特异性 (0,2,1) 高于 `.ai-plan-nums .ai-plan-input` (0,2,0)，把 5.5em 盖掉了。修法：编辑态三条规则都加 `.ai-plan-row.is-editing` 前缀提特异性；同时删掉过时的「点此行移除」::after 提示（现已改为点 × 删除）。

| 2026-10-28 00:10 +08:00 | WebSearch 来源顺序 + C3 硅基流动服务商 | PASS：① WebSearch 检索顺序改为「有合同优先」：百度百科 → PubMed（失败落 Europe PMC）→ 全部落空才走必应（无合同网页解析只能影响兜底），类注释与降级语义同步；② 问答页联网检索的来源枚举描述文本删除，保留隐私句（只发送问题文字）；③ C3：新增硅基流动服务商（OpenAI 兼容，https://api.siliconflow.cn/v1）——两处服务商下拉、默认地址注册表（defaultBaseUrl/isKnownProvider 抽取）、保存白名单、publicSettings providers 映射、adapter defaults 与归一化、ChatCompletion 401 文案与视觉模型提示通用化、AlarmReceiver.activeProvider 白名单归一化；④ 基于 1.1.64 基线（另一会话已交付 B8 分页/B9 三键收编/B10 令牌棘轮 + AI 计划改进）| assemble 后 56/56 全绿（B 轮新增 token-ratchet 测试）；构建通过；装机未完成——手机 adb 掉线（已知坑），APK 已就绪待重连安装 | dist/qingheng-1.1.65.apk（552KB，badging 已核对 165/1.1.65） | git 双推送随本轮 | dist/qingheng-1.1.65.apk |

| 2026-10-29 00:26 +08:00 | 1.1.67 三项优化（按性价比排序） | ① consent 收敛：训练建议与 AI 排课共用 TRAINING_CONSENT_KEY，在 installAiPlan 里初始化读取并回写 prefs，同意过一次两边都不再问；② ACWR 进训练建议卡：trainingInsights 直接调 acwrFromDailyLoads(dailyLoads(28))，负荷偏高/偏低各给一条，与趋势页共用同一判定，不再各算一套；③ 周计划落库：新增 WEEK_PLAN_KEY/readWeekPlanCache/writeWeekPlanCache + weekPlanFingerprint（偏好 + 各动作最近组次重量的 djb2），指纹一致就沿用上次结果（计划成为约定，回看不漂移），指纹变了才重算并在卡里显示「记录有更新，本周安排已按最新数据重算」。

| 2026-10-29 00:31 +08:00 | 1.1.68–1.1.70 训练建议逻辑统一 | ① 今日页「用 AI 排今天」就地排课（已同意过直接排，没同意先弹一次确认并记住），不再跳记录页点第二次；排完同时刷新今日清单与记录页，两页读同一份数据。② 今日清单补两态：周计划今天有安排→显示「本周计划今天 · 推」+「采纳到今日清单」；本周计划存在但今天是休息日→直说「今天按本周安排是休息日」，不再用「还没有训练清单」暗示漏排。③ 周计划缓存为空时今日页现算一次（weekPlanToday），避免记录页排得满满、今日页却说没有。④ 采纳逻辑抽成 adoptWeekDay()，今日页与记录页共用。

| 2026-10-29 00:40 +08:00 | 1.1.71 补齐清单里未完成与未完全完成项 | ① 采纳周计划覆盖前先确认（adoptWeekDay 改 async，已有清单时弹「要用本周安排替换它吗」）；② aiPlan 条目加 source（ai/week），为以后区分来源与优先级留钩子；③ 跑步对位改按记录 id：exercisesFor 保留 id、训练行带 data-exercise-id、readTrainingExercises 先按 id 再退回动作名，新行生成 uuid；④ 有氧排课：prompt 允许 {name,distanceKm,durationMin} 形态、解析保留该字段、aiPlanDose 显示「5 km · 30 分钟」、加入训练记录时一并写入 distanceKm/durationMin。


## r24 · 2026-10-29 · 1.1.72
- 修：训练/身体分段互斥失效——`hideTrainingTabs` 里 `node.hidden = !on` 在 on=true 时会把训练面板强制揭开，
  覆盖 switchRecordPanel 的可见性。改为「关时强制隐藏、开时回读当前分段再应用」。
- 改：问答页「分析日期」标签与下方「分析日期：…」摘要重复，标签改为「选择日期」。
- 验：56 测试全绿；装机后 uiautomator 复核两个分段只显示各自卡片。
- 记：清空问答记录**本来就有** danger 确认框，之前评审只看截图误判，已在 docs/design/15 更正。


## r25 · 2026-10-29 · 1.1.74
- C 节：目标行从「2,000~2,040」改成单值 `2,040 kcal` + `按休息日 · ±2%`，依据与数字同源同步（`10-rich-answer`）。
- 刻度：环体不再 `rotate(-90deg)`（起点回到 12 点），进度改走 0–300°、超出走 300–360°，300° 处加 1.1° 刻度线。
- B 节：蛋白缺口给出可执行份量，用生活量词（两个鸡蛋 / 一掌心鸡胸 / 两掌心鸡胸），不做克数等价换算（守住 1.1.37）。
- D 节：宏量三格字号分层（值 18px、单位与目标行降一档），目标行单独 class。
- 断言：`p0-p1-round`、`training-day-budget` 两条按新契约更新，已在 03-global-changes §5.1 登记。
- 验：56 测试全绿；1.1.74 装机后截图核对目标行、刻度位置与宏量分层。


## r26 · 2026-10-29 · 1.1.75
- chips 改等宽网格（auto-fill 88px），末行不再只剩一项、宽窄不齐。
- 触控补尺寸：`.pref-chip`/`.segment` ≥44px，皮肤选项 ≥48px（原 36–42）。
- 每个 `.view` 加底部留白 `84px + safe-area`，最后一个主按钮不再被导航压住。
- 短文案 `text-wrap:pretty`，减少孤字成行；`.tag` 不折行。
- 未做：卡中卡（需改卡片 DOM）、授权勾选合并（状态机）、趋势 y 轴/x 轴（图表 JS）、sticky CTA。


## r27 · 2026-10-29 · 1.1.76
- 卡中卡：.plan-prefs 只有 border-top 却继承了卡片圆角，顶边两端上翘成浮空圆角框；改为 border-radius:0。
- 新发现（未修）：今日体检 5 个格子在这个宽度下把「未记录」挤成竖排两行，需要降字号或改 3+2 布局。

## r28 · 2026-10-29 · 1.1.77
- 今日体检 5 格改 3+2：420dp 下 5 等分只有 78dp，「未记录」被挤成竖排；改 3 列 × 2 行，末行左对齐。
- 值加 white-space:nowrap，短文案 text-wrap:balance。

## r29 · 2026-10-29 · 1.1.78
- 趋势 y 轴改 nice ticks：原来 low/high 由数据极值加 padding 插值，刻度读出 63.3/63.9/64.4 这类假精度；
  现在 4 条网格线对齐 0.1/0.2/0.25/0.5/1/2/5 步长，low 向下取整、high 向上取整。

## r30 · 2026-10-29 · 1.1.79
- 授权合并：`#advice-ai` 成为唯一可见开关，文案合并成「用 AI 生成建议：同意把所选日期的健康记录发给…（不含密钥与身份信息）」；
  `#advice-consent` 退为隐藏状态位，发送前由 JS 同步，不再让用户以为要勾两次。
- 守卫同步去掉对 consent.hidden 的判断（隐藏后该条件恒真，原来的保护会失效）。

## r31 · 2026-10-29 · 1.1.80
- 删除体检卡的「依据：…」行（60-training-copy 里 check-rule 模板置空），页面不再出现来源标注。
- 问答页两个授权勾选收进 `<details id="chat-consent-panel">授权设置</details>`，默认收起。
- 今日体检去描边：`.check-item` 改无边框无底色，相邻格用 1px 内阴影分隔，减少表格感。

## r32 · 2026-10-29 · 1.1.81
- 美术收敛第一步：静态卡片阴影全部置 0（`.card{box-shadow:none}`），阴影预算只留给 dialog / toast / bottom-nav / 下拉。
- 依据：aesthetic-audit 报 4 处 .card 带 box-shadow，与「静态卡片不加阴影」的既有规则冲突；纸感皮肤靠底色与发丝线分层即可。

## r33 · 2026-10-29 · 1.1.82 → 1.1.83
- 字号阶梯收敛：18 档里只削"离格"的 6 个值（12.5→13、13.5→13、14.5→14、19→18、22→21、30→32），共改 29 处声明，
  档位从 18 降到 12。刻意没动 12/13/14/15/16/17/18/20/21/24/26/28/32——正文与标题的现有比例保持不变，只削掉肉眼分不出的半档。
- 1.1.82 在 training-library 的「最小字号」棘轮上翻红：该断言禁止 ≤12px。把映射目标从 12 改成 13（16 处），1.1.83 全绿。
- 教训：字号收敛要先把守卫断言读一遍，棘轮的下界就是映射的下界。

## r34 · 2026-10-29 · 1.1.84
- 8 组硬编码色归令牌（只动选择器声明，跳过令牌定义，杜绝自引用）：
  #e3e7e2→--line、#c9dcc9/#cbd8c8→--ok-line、#e0c79a→--diet-low、#9dbb9b→--diet-in、
  #44755d/#3f7a5e→--tone-weight、#b8cfb6→--line-strong。
- 硬编码计数 93 → 85（aesthetic-audit）。
- Δ≤12 的自动匹配被否：它把 .eyebrow 墨色接到 --line-strong、图表线接到 --macro-protein，语义错位；改用人工对表。
- 断言跟随：meal-date-context 的 .stats-good 字面量改为 var(--tone-weight)，已登记 §5.1。

## r35 · 2026-10-29 · 1.1.85
- 扩表（只加令牌、不做替换）：`--warn-ink:#8f6a39`、`--danger-ink:#7d2a22` 进 base :root；ledger 作用域同名定义（#8a6435 / #7a2b23）。
- 02-tokens.md 登记两行，token-ratchet 与 training-library 的「两套皮肤同集」均通过。
- 用花括号配对定位 :root / ledger 块尾插入，避免上次插进内层规则导致的块损坏。

## r36 · 2026-10-29 · 1.1.99
- 今日日期与趋势范围并入各自标题行；记录页标题单独成型，与记录区共享左侧内容轨。
- 餐食模板把蛋白/脂肪/碳水改为具名数值列；纸感用松散行距与浅分隔，账本用紧凑网格、右对齐数字和列线。
- 高频入口复用叶/天平/环并补齐问答、趋势、训练、相机 glyph；图标合同从 21 项扩到 28 项，仍验证平铺、引用与 <900 字节。
- 验证：`node tools/test-all.mjs` 56/56；`dev-loop.ps1 -Version 1.1.99 -VersionCode 199 -SkipBackup` 安装及 smoke 成功；四页截图在 `build/visual-after/structure-*-1199.png`。

## r37 · 2026-10-31 · 1.2.27
- Today 餐食与训练、睡眠、体重记录合并到「今日记录」；移除记录页重复流水卡，保留原 meal / habit / measurement 字段与操作。
- 折叠区、账本表格控件、餐食 / 训练行和 Today 空态收敛为单边分隔；皮肤选择提前，皮肤选择器实机展开可见。
- 验证：`1.2.24/224` 至 `1.2.27/227` 四轮 dev-loop 均 56/56、安装成功、smoke `js errors : none`；`aesthetic-audit.mjs` 返回 `OK（无阻塞项）`，67 色值、6 阴影、11 强调色警告仍在；纸感、夜间、账本截图在 `artifacts/brand-after-1.2.27-*.png`。
- 源码提交 `4ce6bb6`；回滚：`git revert 4ce6bb6`；完整分档见 `21-brand-audit-implementation-2026-10-31.md`。

## r38 · 2026-10-31 · 1.2.28 → 1.2.30
- 边框结构按皮肤分工：纸感卡片无闭合外框，导航项改直线底部分隔；账本保留单层卡框与表格格线，卡片标题不再重复画横线；折叠区统一为章节分隔。
- 未改数据字段、历史含义、评分口径或颜色令牌；草稿虚线、输入边界、焦点和可操作控件边界保留。
- 验收：三轮 `dev-loop.ps1` 均 56/56、APK 安装成功、smoke `js errors : none`；最终 `aesthetic-audit.mjs` 无阻塞，67 色值 / 7 卡片阴影 / 11 强调色警告保留。
- 实机截图：纸感 `artifacts/border-after-paper-today.png`、`artifacts/border-after-paper-records.png`；账本 `artifacts/border-after-ledger-today.png`、`artifacts/border-after-ledger-records.png`；夜间 `artifacts/border-after-night-profile.png`。最终皮肤恢复 ledger。
- 源码提交 `bb41ef2`；回滚：`git revert bb41ef2c56a7b2a7bb1b581969b43eb2818c0a30`。

## r39 · 2026-11-03 · 1.2.30（美术审批三条阻断项收尾）
- 记录页与问答页删除「勾选本次同意」残留文案（`estimate-mode` 说明、照片就绪提示）：1.2.20 外发授权集中到 `qingheng.consent.external` 后，这两句指向的勾选框已不存在，属于死文案。改后 `app.js` 中该短语出现次数为 0。
- 账本皮肤数字族从等宽 `ui-monospace` 改为 `var(--font-ui)`：等宽字体的逗号与单位缝隙在「2,088」「129.7 g」上被读成断裂，改后数字跟随 UI 字族，仍靠 `font-variant-numeric:tabular-nums` 保持列对齐。
- `.quick-chip-primary .quick-chip-icon` 补 `color:var(--on-accent)`：主芯片（记一餐）图标在深绿底上原先继承墨色，与右侧三格不同构。
- 验收：`node tools/test-all.mjs` 56/56；`aesthetic-audit.mjs` 返回 `OK（无阻塞项）`（67 色值 / 7 卡片阴影 / 11 强调色警告沿用 r38 基线）；`dev-loop` 重装 1.2.30（versionCode 230，2026-11-03 19:21），smoke 无 JS 错误，实机截图 `build/verify-1.2.30.png`。
- APK 与源码一致性：解包 `dist/qingheng-1.2.30.apk` 内 `assets/app.js`、`styles.css`、`index.html` 与工作区逐字节 SHA-256 相同，说明装机版本就是当前源码。

## r40 · 2026-11-03 · 1.2.31（快速记录：餐次可选、入口升级）
- 用户报「快速记录无法修改餐次」。复现：打开快速记录点「餐次」，实机只弹出一条底部「取消」，四个选项一个都不出现——WebView 把原生 `<select>` 的弹层画在 `.app-dialog` 遮罩之后。改成弹窗内四枚 44px chip（`role="radiogroup"` + `aria-checked`），与「复制哪一餐」同一套自绘选择；提交时 `mealType` 读 `quickRecordType`，不再读 DOM 里的 select。
- 入口视觉加重：`#quick-record` 从 header 绿色文字链改为 `button subtle quick-record-action` + 复制图标，44px 高、`--space-3` 内距，与左侧四格 `.quick-chip` 同一层权重，仍低于「记一餐」主芯片。
- AGENTS.md 硬约束删掉「热量下限 2,000 kcal 是硬底线」，替换为 1.2.15 之后的真实口径（区间由目标预设与缺口上限决定，低于女 1200 / 男 1500 只提示不抬数），避免下一轮把地板加回来。
- 验收：`test-all.mjs` 56/56；`dev-loop.ps1 -Version 1.2.31 -VersionCode 231` 安装 + smoke 无 JS 错误；实机把餐次从默认「加餐」改为「午餐」保存后，记录标为「午餐」（`build/v231-records2.png`），随后删除该测试记录（`build/v231-after-delete.png`），当日热量回到 1,807 kcal。
- 双皮肤：纸感 `build/v231-qr-open.png`、账本 `build/v231-ledger-qr.png`；chip 与按钮均随令牌适配，验证后皮肤已还原为 paper（`build/v231-restore2.png`）。
- 断言变更登记在 `03-global-changes.md §5.1`（新增「餐次是 chip 行、无原生 select」守卫）。
- 源码提交 `69cef26`；回滚：`git revert 69cef26`。

## r41 · 2026-11-03 · 1.2.32（默认餐次按时间 + 我的低频块改子页）
- 默认餐次：新增 `readMealWindow` / `saveMealWindow` / `defaultMealTypeFor`，按本机时钟给默认——早于 11:20 早餐、11:20 起午餐、22:00 起加餐；两个阈值可改，存 `qingheng.mealWindow`。快速记录打开时按规则选中；记录页「轻松记一餐」在用户没手动改过时同步。
- 「我的 → 数据、外观与说明」不再在列表里展开 `<details>`，改为第六个 sub-page `#subpage-appearance`：与「模型连接」同一个 `.subpage` 外壳、同样的返回头与 21px hub 图标，窗口尺寸由同一套样式决定。外观皮肤、默认餐次、数据管理、关于轻衡、重新设置档案、问答说明都在这一页。
- 新增「默认餐次」卡：午餐起 / 加餐起两个 `time` 输入 + 保存 + 恢复默认；保存后卡片标签（现在默认午餐/加餐）与我的页摘要立刻反映新阈值。
- 删掉 `.profile-more` 一族死样式；判定断言同步（`layout-four`、`records-panels`、`meal-date-java`）。
- 验收：`test-all` 56/56；`dev-loop.ps1 -Version 1.2.32 -VersionCode 232` 安装 + smoke 无 JS 错误；实机 20:33 打开快速记录默认「午餐」（`build/v232-qr-default.png`）；把加餐起改为 20:00 保存后默认「加餐」（`build/v232-qr-snack.png`），再恢复 11:20 / 22:00（`build/v232-reset-done.png`）；子页与「模型连接」同尺寸同返回头（`build/v232-appearance.png` vs `build/v232-model.png`）。
- 断言变更登记在 `03-global-changes.md §5.1`。
- 源码提交 `b3508d8`；回滚：`git revert b3508d8`。

## r42 · 2026-11-03 · 1.2.33 → 1.2.34（问答按天查看 + 界面评审）
- 问答记录加日期条：`‹ [全部日期 / MM-DD] ›`。点 chip 起原生日历选一天，两侧箭头只在「有记录的日期」之间走；从最新一天再按一次 `›` 回到全部。翻页与按天查询是同一个动作，不新增第二种浏览模型。
- 过滤收成单一出口 `chatRowsInScope()`（搜索 × 只看收藏 × 按天），分页仍在 30 条；空态分「无记录 / 无收藏 / 某天无记录」三种说法。
- 1.2.33 装上去后发现方向写反：`dates` 是从新到旧，我却把「更晚」当成索引 +1，实机点 ‹ 不动、点 › 反而更早。1.2.34 改成 `target = index - dir`，并把「全部日期」定义为最新一端（`next` 在全部时禁用）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.34 / 234 安装 + smoke 无 JS 错误；实机四步——全部 → ‹ 11-03（2 条）→ ‹ 11-01（1 条）→ › 11-03 → › 全部（`build/v234-prev1.png`、`build/v234-prev2.png`、`build/v234-next2.png`）。
- 同期产出一份问答界面评审（美术 / 可用性 / 动画），清单给到用户，本轮只落地按天翻页，其余未动。
- 断言变更登记在 `03-global-changes.md §5.1`。
- 源码提交 `c47f296`；回滚：`git revert c47f296`。

## r43 · 2026-11-03 · 1.2.33 → 1.2.37（问答界面清单全量落地）
- 按用户「全部落地」执行上一轮列出的问答优化清单：联网检索归位到工具行；历史行去掉重复日期与两颗常驻按钮（重新生成 / 这条没用 进长按菜单）；截断改文字链并补 0.22s 展开过渡；流式回答按帧合批；位移统一 --rise-1/2/3。
- 两个真机 bug：① 点「提问」页面不滚到回答——流式气泡插入后没滚，完成后也没滚；现在气泡出现即 scrollIntoView，完成后按行位置滚两次（立刻 + 260ms 校正）。② 今天页「问训练建议」没有思考动画——原来直接调 `/api/chat` 一次性返回；改成先用 `/api/chat/stream`（原生 `chatReply` 支持 `focus:training`），失败再退回。
- 一处方案被实机否掉：`position:sticky` 底部吸附提交按钮在键盘弹起时仍被压住，改为「输入框聚焦 320ms 后把按钮滚进可视区」。
- 验收：`test-all` 56/56；`dev-loop` 逐版 1.2.35/36/37 安装 + smoke 无 JS 错误；实机截图 `build/v236-focus.png`（键盘上方可见提问）、`build/v237-done.png`（停在回答上）、`build/v237-tr-stream.png` / `build/v237-tr-done.png`（训练建议流式）。
- 已知未验证：长按菜单在 Android 17 上会先弹系统「图片识别」浮条，需再点一次才到自绘菜单（待观察是否要压 contextmenu）。
- 断言变更登记在 `03-global-changes.md §5.1`。
- 源码提交 `8e7b993`；回滚：`git revert 8e7b993`。

## r44 · 2026-11-03 · 1.2.38 → 1.2.39（估算/建议提速：先量后改）
- 用户报「估算预览慢」。先给非流式调用加耗时日志，再量：设备上 `estimate 24180ms chars=507 cap=0`——单次 24 秒，输出只有 507 字符。说明等待几乎全在服务商，不在提示词或上下文。
- 变更：估算 900 / 建议 320 / 检索改写 140 / 检索关键词 80 / 非流式问答 900 的 `max_tokens` 上限；删掉 dailyAdvice 开头从估算提示串过来的死文本；锚点注入 4000 → 1200 字；`PROMPT_VERSION` 3 → 4。
- 结论（写给下一轮）：上限关掉的是「模型可能写长」这条不确定性，没有解决 20 秒量级的等待。真要继续提速，只能动服务侧或交互形态：①换更快服务商/模型（当前 deepseek-flash）；②估算也走流式，先把识别过程显示出来，减少「卡住」的感知；③把 notes/totals 等非必要字段从 JSON 契约里删掉，再压一截输出。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.38（基准版）与 1.2.39 均安装 + smoke 无 JS 错误。基准版仅用于测量，未单独提交说明。
- 断言变更登记在 `03-global-changes.md §5.1`（PROMPT_VERSION 3 → 4）。
- 源码提交 `6394cb7`；回滚：`git revert 6394cb7`。

## r45 · 2026-11-03 · 1.2.40 → 1.2.42（提速 A + C 落地）
- A 减输出：估算 JSON 契约删掉 totals（服务端按 items + oilGrams 重算，模型抄一遍只是多写四个数字），解析改为 totals 可缺省；PROMPT_VERSION 4 → 5。
- C 感知提速：新增 `/api/estimate/stream`（后台线程复用 `estimate()`，delta/done/error 三类事件推到 `window.__qinghengEstimate`），页面优先从 JSON 片段里抽 `"name"` 显示「正在识别：白米饭…」，服务商不发 delta 时用计时器兜底「已等 Ns」；流式失败自动回退 `/api/estimate`。
- 实测（3cba2bdc，deepseek-flash，文字「rice」）：改前 24,180 ms / 507 字符；改后 2,808 ms / 188 字符、8,559 ms / 229 字符。等待期可见「正在识别…已等 3s」。
- 教训：`adb shell input text` 在 WebView 里会卡在 IME 组词态，只有第一个词落地、空格变「跟」；测速要一个词一个词 `input text` + `keyevent 62`，或先切英文输入法。这一轮大半时间花在这上面。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.40 / 1.2.41 / 1.2.42 安装 + smoke 无 JS 错误。
- 断言变更登记在 `03-global-changes.md §5.1`。
- 源码提交 `fdd277d`；回滚：`git revert fdd277d`。

## r46 · 2026-11-03 · 1.2.43 → 1.2.45（单项重算按名称 + 克重重估）
- 用户要求：预览里每项右侧的 ↻ 不要只按克重缩放，要按「改过的名称 + 克重」重新算这一项的四项营养。
- 改法：对话框改「重新估算这一项」，加可编辑「食物名称」；每 100g 四项留空时按 `${name} ${grams} g` 调一次估算，用返回的每克值 × 用户克重写回；返回克重不同时按比例折算。每 100g 仍保留为手算通道（离线/未授权/想精确覆盖）。
- 两处细节：① 对话框不再预填每 100g，否则永远走手算分支；② 服务端加 `noDraft`，单项重算不在草稿队列留痕。
- 实测：白米饭 175 g / 228 kcal → 改名 banana 重算 2,612 ms → 155.75 kcal / 1.91 g 蛋白 / 0.58 g 脂肪（与香蕉 89 kcal/100g 一致）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.43/44/45 安装 + smoke 无 JS 错误；实机截图 `build/v245-result.png`。
- 断言新增（`tests/anchors-oil.test.mjs`）：按名称+克重重估、noDraft、离线手算兜底三条。
- 源码提交 `eab1c77`；回滚：`git revert eab1c77`。

## r47 · 2026-11-03 · 1.2.46（默认餐次加晚餐档）
- 用户要求：默认餐次加晚餐时间段，16:30 起算晚餐。现在四档：< 11:20 早餐 → 11:20 午餐 → 16:30 晚餐 → 22:00 加餐。
- 落点：`DEFAULT_MEAL_WINDOW` 加 `dinnerFrom:'16:30'`；`readMealWindow`/`saveMealWindow` 与 `defaultMealTypeFor` 同步；「我的 → 数据、外观与说明 → 默认餐次」加第三个 `time` 输入，校验改成「午餐起 < 晚餐起 < 加餐起」，重置语与摘要文案一起更新。
- 旧用户兼容：localStorage 里只有 lunchFrom/snackFrom 的旧值，dinnerFrom 缺省时回落到 16:30，不会丢设置。
- 验收：实机 21:56 打开快速记录默认「晚餐」；设置页显示三个阈值与「现在默认晚餐」。`test-all` 56/56（新增三条：默认窗口含晚餐、规则先判晚餐、页面有该输入）；`dev-loop` 1.2.46/246 安装 + smoke 无 JS 错误。
- 交付：`dist/qingheng-1.2.46.apk`（511,004 字节，sha256 404f4fab…031a）。
- 断言变更登记在 `03-global-changes.md §5.1`。
- 源码提交 `78b1867`；回滚：`git revert 78b1867`。

## r48 · 2026-11-03 · 1.2.47 → 1.2.49（账本训练栏 + 今天「更多」行）
- 账本训练栏：偏好 chip 从「auto-fill 等宽网格」改成「按内容定宽 + 换行」，4/3/5 项不再出现孤行；每组加一条发丝分隔与小号分组标签；选中项用 inset 描边而不是整块浅绿；`组数/每组次数/负重` 从两列（第二行空半格）改成三列一行；训练模板 select 与训练行输入收紧到 40–44px。
- 今天「更多」行：原来用 body 字号 + 浏览器原生 ▶，且 `更多：` 与正文黏在一起。改成 `caret + 更多 + 副标题` 三段式：13px、muted、48px 命中区、自绘三角（展开时旋转 90°）、副标题 ellipsis。
- 顺手去掉账本里 `.plan-prefs` 的圆角顶边（那条 `border-top` 带 8px 圆角，在卡片里渲染成一段上翘的弧线）。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.47/48/49 安装 + smoke 无 JS 错误。截图 `build/v249-training.png`、`build/v249-more2.png`。
- 已知未解决：训练行里每个单元格仍偏高（label 18dp + 输入 48dp + 内距，约 78dp），因为账本给表单加了单元格内距；要再瘦只能把 label 挪进 placeholder，属于结构改动，未做。
- 源码提交 `c7dfe5c`；回滚：`git revert c7dfe5c`。

## r49 · 2026-11-03 · 1.2.50 → 1.2.51（今天「更多」收纳 + 身体近况）
- 结构 bug：`<details id="day-more">` 开在 `.dashboard-grid` 内部，网格的 `</div>` 又写在了 details 里面——HTML 非法，浏览器把 details 提前闭合，于是「今天的小习惯」「给今天的一点建议」实际露在外面，标题写的三样只折了一样。修法：把 `</div>` 移到 details 之前，details 变成网格的兄弟节点，三张卡（身体近况 / 小习惯 / 建议）都在它里面。
- 身体近况重做：原来是四格「标签 + 大数字 + 各自一个 ISO 日期」，读起来四个日期互相干扰、没有趋势。现在每格 = 标签 + 数值 + 「较上次 ±x 单位」（无历史时写「首次记录」），日期只在底部出现一次：「最近测量 2026-11-02（1 天前）」；缺数据时显示小号 muted 破折号而不是 26px 长横。
- 顺手：折进「更多」以后建议卡不再用整块浅绿底，改由发丝分隔线分组（两套皮肤一致）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.50/51 安装 + smoke 无 JS 错误。截图 `build/v250-more2.png`（折叠：小习惯/建议不再外露）、`build/v251-stats.png`（展开：变化量 + 单日期）。
- 源码提交 `31ace34`；回滚：`git revert 31ace34`。

## r50 · 2026-11-03 · 1.2.52（回退折叠嵌套）
- 用户判定：1.2.51 把「小习惯」「建议」折进 `#day-more` 之后，纸感皮肤又变成「框套框」。按要求回退。
- 做两件事：① `index.html` 还原结构——details 只包身体近况，`</div>` 回到 details 之前，两张卡恢复成并列卡片；② 同时拍平 details 自身的框：全局 `details{border:1px solid var(--line)}` 会给 `#day-more` 留下左右两条竖线，`.day-more` 只写了 `border-block` 没清左右，现在改成 `border:0;border-block:1px solid`，并让折叠内的 `.card` 背景透明（去掉 soft-card 底色叠出来的第二层框）。
- 保留 1.2.51 的内容改进：身体近况仍是「数值 + 较上次变化 + 单行最近测量」。
- 验收：`test-all` 56/56；`dev-loop` 1.2.52/252 安装 + smoke 无 JS 错误；纸感截图 `build/v252-paper2.png`（三块之间只剩发丝线，没有外框）。
- 源码提交 `c37bd92`；回滚：`git revert c37bd92`。

## r51 · 2026-11-03 · 1.2.53（保留折叠、只去框；今日三样记满即收纳）
- 用户澄清：要的是「保留折叠、只是不要框」。1.2.52 的回退把结构也拆了，这次重新把「小习惯」「给今天的一点建议」折回 `#day-more`，但保留 1.2.52 的拍平 CSS（`border:0;border-block:1px`、折叠内 `.card` 背景透明），所以折叠区只有上下两条发丝线，没有盒框。
- 今日三样：记满三样后自动收成一列只读摘要（训练 / 睡眠 / 体重 + 「修改」），展开态只在未记满时出现——这张卡在首屏占地大，展开态是最容易误触的地方。`dailyThreeEditing` 记住当天是否手动点过「修改」，点过就保持展开。
- 上一个 1.2.52 的隐患也一并修掉：当时 `</div>` 与 `<details>` 的相对位置又错了一次（details 在网格里、网格先关闭），浏览器容错解析把小习惯/建议甩到折叠外；这次先用脚本核对 details 区间再改，`今日记录` 确认在折叠之外。
- 验收：`test-all` 56/56（新增三条断言：摘要块与 body 包裹存在、折叠判断在 app 里、小习惯/建议在 day-more 区间内）；`dev-loop` 1.2.53/253 安装 + smoke 无 JS 错误；纸感截图 `build/v253-fold.png`（折叠、无框）。
- 未验证：三样记满后的折叠态没有实机截图——当天只记了体重，要凑满三样就得往用户数据里写训练/睡眠，没敢写。
- 源码提交 `2dfc310`；回滚：`git revert 2dfc310`。

## r52 · 2026-11-03 · 1.2.54 → 1.2.55（今日三样保存即收纳 + 日常习惯默认折叠）
- 今日三样：原来只有「三样都记满」才折叠，用户填了两样就以为该收起来——判断条件改成「当天保存过一次（localStorage 标记 `qingheng.dailyThree.<日期>`，走 `DAILY_THREE_KEY(date)` 常量）**或** 三样齐全」即折叠；「修改」仍可展开。顺带修了摘要里「训练」未填时显示成「休息」的错标，改为「未记录」。
- 记录-身体的「日常习惯」：`installCardCollapse()` 创建 details 时没有显式关闭，实机上是展开态。加 `details.open = false` 后默认折叠，只剩一行「▶ 日常习惯（步数 · 睡眠 · 饮水，可选）」。
- 存储键规矩：`tests/adapter.test.mjs` 要求除 `qingheng.tab` 外所有 localStorage 键必须是常量调用，新键第一次写死字面量时测试立刻红——改为 `const DAILY_THREE_KEY = date => \`qingheng.dailyThree.${date}\``。
- 验收：`test-all` 56/56；`dev-loop` 1.2.54/254、1.2.55/255 安装 + smoke 无 JS 错误；实机截图 `build/v255-collapsed3.png`（保存后收成「训练 未记录 / 睡眠 5 小时 / 体重 64.5 kg / 修改」）、`build/v254-body.png`（日常习惯默认折叠）。保存用的是当天已有的相同数值，未写入新数据。
- 源码提交 `1fa02cc`；回滚：`git revert 1fa02cc`。

## r53 · 2026-11-03 · 1.2.56 → 1.2.57（今日体检评分重做）
- 用户要求：按科学健康视角重排今日体检各项占比，训练不计分，并给一句基于当前数据的评价。
- 新评分：四项加权——热量 30 / 蛋白质 30 / 脂肪 20 / 睡眠 20（合计 100）。理由：总摄入是体重管理的主变量；蛋白是保肌第一优先级且目标带由目标预设决定；脂肪是最容易超的一项；睡眠影响恢复与食欲调节。训练移出评分与网格（训练记录仍在今日三样/训练建议里）。
- 计分细节：热量按「偏离最近端点的百分比」给分（≤3% 满分、5% 0.9、10% 0.75、20% 0.5、35% 0.25），不再用固定 200 kcal 窗口——原来 184 kcal 缺口会被判成接近 0 分；蛋白按达成比例；脂肪按超出/不足距离；睡眠 7h 满分、6–7 线性 0.7→1、4–6 线性 0.25→0.7、<4 记 0.1。
- 缺数据不再拉低分数：未记录的项不计入分母，标签显示「已评 n/4」，全天无记录时不显示分数（「待记录」）。四格改 2×2。
- 一句评价（verdict）：总体档位（≥85 基本达标 / ≥70 大体在轨 / ≥50 略有偏差 / 其余明显偏了）+ 最强项 + 短板与缺口数字。
- 顺带修掉旧 action 里的食物等价换算（「≈ 鸡胸 x g 或蛋白粉 n 勺」），与「不做食物换算」的规则冲突。
- 验收：`test-all` 56/56（更新 analysis-layer：四项、无 training、权重表、verdict、缺睡眠不计分、无记录无分数）；`aesthetic-audit` OK；`dev-loop` 1.2.56/257 安装 + smoke 无 JS 错误。实机截图 `build/v257-check.png`：达标 79/100 · 已评 4/4，评价「总体大体在轨：脂肪已到位，但睡眠只有 5 小时，偏短。」，优先项是睡眠。
- 源码提交 `a1878e4`；回滚：`git revert a1878e4`。

## r54 · 2026-11-03 · 1.2.58 → 1.2.59（今日体检三档配色 + 口语化评价）
- 配色按用户要求分三档：区间内绿（`--ok-soft` 底 + `--ok-line` 边）、接近青（新增 `--near` / `--near-soft` / `--near-line`）、差得多淡红（`--danger-soft` / `--danger-line`）；没记录的保持中性。分档按单项得分：≥0.95 绿、≥0.6 青、其余红。
- 新增令牌三处登记：纸感 `#3d7d84/#eef7f7/#c9e2e2`、账本 `#2f6f76/#edf5f5/#cfe3e4`、账本暗色 `#7fc0c6/#182a2c/#315055`，并补进 `docs/design/02-tokens.md`（token-ratchet 测试会拦未登记的令牌）。
- 评价改成口语：「今天整体还不错：脂肪在区间内，睡眠只有 5 小时（建议 7 小时以上），先补这一项。」档位词换成「整体到位 / 整体还不错 / 有几项没跟上 / 缺口比较大」，缺项补一句「还有 N 项没记录，记了才评得准」。
- 验收：`test-all` 56/56（新增三档类名断言，verdict 断言改为「含数字 + 口语词」）；`aesthetic-audit` OK；`dev-loop` 1.2.58/259 安装 + smoke 无 JS 错误。实机截图 `build/v259-check.png`：脂肪绿、热量与蛋白青、睡眠淡红。
- 源码提交 `0ac49a6`；回滚：`git revert 0ac49a6`。

## r55 · 2026-11-03 · 1.2.60 → 1.2.63（今天-更多内边距、小习惯合成一行、取消习惯收纳）
- 账本「更多」里卡片内容贴着侧边：`.day-more` 只有上下发丝线，左右内距是 0，卡片自己又是 `padding: 12px 0`。加 `[data-skin="ledger"] .day-more{padding-inline:14px}`，文字不再压着边框。
- 「记录身体数据」原来是 `.button subtle`（浅绿大按钮），在折叠区里太抢眼。改成 `text-button body-record-link`：右对齐、muted、36px 命中区，附 `data-no-keyboard`。
- 「今天的小习惯」四个格子合成一行：`#habit-summary` 从 `.habit-grid`（两列网格）改成 `.habit-list`，渲染成一行 `hub-row`（日常习惯 / 已记录的项 / ›）；未记录的不再逐个列，全部为空时显示「点这里补步数、睡眠、饮水」。点它跳「记录 → 身体 → 日常习惯」，用 `revealField(id, {focus:false})` 只滚动不聚焦，实测 `mInputShown=false`。
- 取消「日常习惯」的收纳：从 `installCardCollapse` 的分组里删掉 `#habit-form` 一项，记录页里恢复为默认展开。
- 导航坑：今天页这一行是运行时渲染的，初始 `$$('[data-go]')` 绑定抓不到，改为 document 上代理 `[data-habit-jump]`。
- 验收：`test-all` 56/56；`dev-loop` 1.2.60/61/62/63 安装 + smoke 无 JS 错误；截图 `build/v263-b.png`（更多区留白 + 一行习惯 + 文字链）、`build/v263-jump.png`（跳转落到日常习惯、键盘未弹起）、`build/v263-records.png`（习惯卡恢复展开）。
- 源码提交 `af1a28a`；回滚：`git revert af1a28a`。

## r56 · 2026-11-03 · 1.2.64 → 1.2.65（建议卡修复 + 偏好与记忆）
- 建议卡「无法给出答复」根因：`CAP_ADVICE=320` 是输出上限，模型把预算花在思考过程上时 `content` 为空，客户端按「模型这次没有给出回答内容」抛出。修法三层：①上限提到 700；②`advice()` 捕获这条特定错误后放宽到 4 倍重试一次；③页面兜底——AI 路径失败时用本地规则建议顶上并标注「模型暂时不可用，以下是本地建议」。实机 23:08 拿到两条建议（补蛋白 12 g / 按趋势校准），耗时约 30 s。
- 偏好与记忆（原待办项落地）：
  - 存储：`qingheng.preferences`（`PREFERENCES_KEY`），一句话一条、去重、最多 20 条，读写走 `readPreferences()` / `writePreferences()`。
  - 入口：「我的」新增第 5 行「偏好与记忆」→ `#subpage-prefs`（SUBPAGES 增加 `prefs`，共 7 个子页）：列表 + 删除、输入框 + 「记住这条」、空态说明。
  - 长按问答行菜单新增「记为偏好」，把问题前 80 字存进去。
  - 注入：页面在 `/api/advice`、`/api/estimate`、`/api/estimate/stream`、训练问答的请求里带 `preferences`；Java `preferenceSuffix(body)` 拼到估算与建议的 system 提示词末尾（总长封顶 700 字，每条截 60 字）。
- 验收：`test-all` 56/56（meal-date-java 的两条断言从「六个子页」改到七个并登记）；`dev-loop` 1.2.64/265 安装 + smoke 无 JS 错误；截图 `build/v264-advice2.png`（建议正常）、`build/v265-prefs7.png`（偏好新增成功）、`build/v265-clean.png`（测试条目已删，0 条）。
- 遗留：「已记住。」这句反馈在删空后不会自己消失；训练问答目前只带偏好、未在 Java 侧单独拼（chat 走 prompt 内嵌，未验证是否生效）。
- 源码提交 `c0ab1cb`；回滚：`git revert c0ab1cb`。

## r57 · 2026-11-03 · 1.2.66 → 1.2.67（建议提速 + 只给动作 + 加载动画 + 偏好可见）
- 速度：实测从上一版约 30 s 降到 **4,414 ms**（日志 `advice 4414ms chars=56`）。三个来源：①`adviceInput` 近 14 天 → 7 天、`recentMeals` 封顶 25 条（新增 `cappedWindow`），prompt 从上千行餐食缩到几十行；②输出上限 `CAP_ADVICE` 320 → 700 后不再空回答；③输出限定 1~2 句、40 字以内，模型不再写长文。
- 内容：原提示词要求复述数字、给「依据」，结果和界面上看到的卡一模一样。新版只许给动作：「不要复述用户界面上已经显示的热量、蛋白质、脂肪数字」「两条要针对不同方面」。实机输出变成「现在补一份希腊酸奶或两个水煮蛋白」「明天早餐加一个水煮蛋和 300 毫升无糖豆浆」。
- 记忆接入：请求已带 `preferences`（1.2.65），这次把它**显性化**——加载态下方显示「已带上 N 条偏好」；用户自己已写入「我的目标是尽快实现薄肌」，实机显示「已带上 1 条偏好」。
- 加载动画：复用 `.inline-busy`（转圈 + 扫光），文案「正在读今天的记录…已等 3s」按 800 ms 刷新，请求结束清除定时器；失败仍有本地建议兜底。
- 验收：`test-all` 56/56；`dev-loop` 1.2.66/267 安装 + smoke 无 JS 错误；截图 `build/v266-busy.png`（加载态 + 偏好提示）、`build/v266-advice.png`（两条动作）、日志 4414 ms。
- 提示：改这段 Java 时踩过「按 trim()==='}' 找函数结尾」的老坑，dailyCheck 那次也栽过，见 lesson 记忆。
- 源码提交 `4bec31f`；回滚：`git revert 4bec31f`。

## r58 · 2026-11-03 · 1.2.68 → 1.2.69（建议改成「先评价后动作」+ 偏好上移配图标）
- 用户决定：不做逐字流式，保持「全部生成后一次性渲染」。
- 建议提示词按用户要求的优先级重写：①先看身材目标与目标区间的执行情况 ②今天摄入与区间的关系 ③用户长期偏好（不许推荐冲突食材）；然后 2~3 句——第一句必须给明确评价，达标或接近要写一句肯定（并要求不要用「接近达标」这种中性词），后 1~2 句是今天/明天可执行的动作，40 字内。仍要求不复述界面上已有的数字。
- 实机验证（1.2.68）：输出为「体重近两周小幅下降、节奏稳，今天总摄入接近目标，脂肪在区间内，蛋白只差一点到下限，整体很接近达标。补一小杯无糖酸奶或一个水煮蛋……选清蒸鱼虾替代炸虾……」，耗时 16,197 ms（同日另一次 4,414 ms，波动来自服务商负载，不是代码）。
- 「偏好与记忆」：补了 note 图标（描边 1.8 的便签 + 两行文字，和其它 hub 图标同风格），位置从「数据、外观与说明」下面挪到**上面**（顺序：档案与目标 / 模型连接 / 每日推送 / 偏好与记忆 / 数据外观与说明）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.68/269 安装 + smoke 无 JS 错误；截图 `build/v268-profile.png`（顺序与图标）、`build/v268-advice2.png`（评价 + 动作）。
- 源码提交 `4b8ba45`；回滚：`git revert 4b8ba45`。

## r59 · 2026-11-03 · 1.2.70（今日记录只列餐食）
- 现象：今日记录卡片最下方出现「睡眠 已记录 / 5 小时」「体重 已记录 / 64.5 kg」，看着像误记进餐食流。
- 根因：`renderTodayTimeline()` 把训练/睡眠/体重当作「当日事件」塞进同一列表，priority 2/3/4 排在餐食（0/1）之后，于是永远吊在末尾；计数标签也因此变成「5 餐 · 2 项」。
- 修法：时间轴只保留餐食，计数改回「N 餐」；空态换成「今天还没有记录。记一餐，时间轴就会出现在这里。」这三项数据仍在「今日三样」摘要与「更多 → 身体近况」里有位置，不丢信息。
- 动手时又踩了「按 trim()==='}' 找函数结尾」的老坑（旧函数体残留 15 行），已按 lesson 里的做法改用精确缩进 `'  }'` 截断。
- 验收：`test-all` 56/56；`dev-loop` 1.2.70/270 安装 + smoke 无 JS 错误；截图 `build/v270-records3.png`（标签为「5 餐」）、`build/v270-records.png`（列表末尾停在最后一餐）。
- 源码提交 `8015d54`；回滚：`git revert 8015d54`。

## r60 · 2026-11-03 · 1.2.71 → 1.2.72（我的页拆分与合并）
- 现状问题：`installProfileMore()` 把「数据管理」「关于轻衡」两行、`#restart-onboarding` 按钮和「问答说明」全部塞进 `#subpage-appearance`，于是「数据、外观与说明」越堆越长，标题也就越写越泛。
- 拆法（用户要求：拆出来 + 不常用的合并到同一选项）：
  - 「数据、外观与说明」→ 改名 **外观与默认餐次**（`#subpage-appearance`），只留外观皮肤卡 + 默认餐次卡。
  - 新增 **更多**（hub 第 6 行 → `#subpage-more`）：数据管理行、关于轻衡行（两行从 hub 移到 `#more-hub` 列表）、重新设置档案（进 `#more-restart-slot` 卡片，附「谨慎操作」标签与说明）、问答说明（`#view-chat .card-notes` 进 `#more-notes-slot`）。
  - hub 终态 6 行：健康档案与目标 / 模型连接 / 每日推送与建议 / 偏好与记忆 / 外观与默认餐次 / 更多。
- 顺手：外观行的摘要不再写「外观与说明」，只留三个餐次时间。
- 验收：`test-all` 56/56（子页断言 7→8、`layout-four` 改成检查两个子页 + html 标题；`$('#id')` 与 `$("#id")` 的引号差异把断言坑了一次，已改成不含引号的 `#subpage-more` 判定）；`dev-loop` 1.2.71/272 安装 + smoke 无 JS 错误；截图 `build/v271-hub.png`（6 行）、`build/v272-more.png`（更多页）、`build/v272-appearance.png`（外观页只剩两卡）。
- 源码提交 `d2fd145`；回滚：`git revert d2fd145`。

## r61 · 2026-11-03 · 1.2.73 → 1.2.75（重新设置归位、文案直白、建议入历史）
- 重新设置档案：从「更多」卡片搬进 **身体档案与目标** 子页底部（新增 `#targets-restart-card` + `#targets-restart-slot`），与「按目标重新测算」同处一页，语义上是一类事。
- 按钮文案改成一眼能看懂：健康档案与目标 → **身体档案与目标**；模型连接 → **AI 模型与密钥**；每日推送与建议 → **提醒与每日建议**；外观与默认餐次 → **外观与餐次时间**；更多 → **更多设置**（摘要「数据备份 · 关于与说明」）。子页标题同步。
- 手动「获取建议」也写入历史建议：Java 新增 `saveAdviceHistory(day, messages, source)`，与推送共用 `adviceHistory`（slot=manual、id=`<日期>-manual`、同日覆盖、最多 60 条）；页面 `slotNames` 增加 `manual:'手动获取'`。
- 说明不再进「更多」：`#view-chat .card-notes` 改为搬进 **关于轻衡**（`#about-notes-slot`），并把它自己的 summary 改成「问答说明」，避免关于页出现两个「说明」。
- 顺手清掉「更多」里那张空壳的重新设置卡（按钮搬走后只剩空卡片）。
- 踩坑：`saveAdviceHistory` 里的 `next.put(record)` 抛受检 JSONException 没被捕获，javac 报「未报告的异常」，构建失败；改成方法 `throws Exception`（`advice()` 本来就 throws）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.73/74/75 安装 + smoke 无 JS 错误；截图 `build/v273-hub.png`（新文案）、`build/v273-targets.png`（重新设置卡片在档案页）、`build/v275-more.png`（更多只剩两项）、`build/v275-about.png`（问答说明在关于页）。
- 未验证：手动建议写入历史建议这条链路，需要先点一次「获取建议」再查历史；本轮没截到。
- 源码提交 `1140f04`；回滚：`git revert 1140f04`。

## r62 · 2026-11-04 · 1.2.76 → 1.2.77（统一展开按钮 + 去蓝色点击高亮）
- 展开按钮统一：把「模型连接」右侧那枚 32×32 圆角方块箭头抽成通用规则 `details:not(.day-more) > summary::after`——accent-soft 底色、1px 线、展开时 `rotate(180deg)` 过渡、按下 `scale(.92)` + 底色加深。`口径与手动调整`、`说明`、`技术细节`、`参考与致谢`、`问答说明`、`为什么这样排` 等全部跟着变；`.day-more` 保留自己的左侧小三角，避免和「更多」那行打架。
- 蓝色长条点击效果：Android WebView 的 tap highlight。处理两处——`html{-webkit-tap-highlight-color:transparent}` 全局关掉；`summary` 额外加 `-webkit-user-select:none`，长按不再出现文字选中蓝条（之前长按「更多」出现过一次）。`:focus-visible` 焦点环保留。
- 统一了 `summary::-webkit-details-marker{display:none}`，避免个别浏览器再画一个原生小三角。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.76/277 安装 + smoke 无 JS 错误；截图 `build/v276-model.png`（AI 模型页方块箭头）、`build/v276-targets.png`（口径与手动调整同款）。
- 未验证：其他几处（关于页四个折叠、训练页「为什么这样排」）只做了静态推断，没逐个点开截图；蓝色高亮是否彻底消失要看真机点击手感。
- 源码提交 `227c23f`；回滚：`git revert 227c23f`。

## r63 · 2026-11-04 · 1.2.78（展开动画真正生效）
- 用户反馈：箭头没有过渡，点一下内容瞬间全出来。
- 根因两条：
  1. **箭头**：旧规则 `details.advanced[open] summary::after{content:'▴'}` 在展开时把字符从 ▾ 换成 ▴，而我上一版加的 `[open]{transform:rotate(180deg)}` 又把 ▴ 转回 ▾——两者互相抵消，看起来完全没动。修法：删掉换字符那两条规则，只保留旋转。
  2. **内容**：`<details>` 展开时高度是瞬间跳变的，浏览器默认没有任何过渡。修法：`html{interpolate-size:allow-keywords}` + `@supports` 下用 `details::details-content{height:0→auto; opacity; content-visibility:allow-discrete}` 做高度过渡；不支持的内核退回 `details[open]>:not(summary)` 淡入上移。
- 断言：`tests/meal-recalc-collapse.test.mjs` 原本钉着旧的换字符规则（等于把 bug 固化成契约），改成断言新规则（方块 + rotate + details-content 过渡），并按规矩登记到 `03-global-changes.md §5.1`。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.78/278 安装 + smoke 无 JS 错误；截图 `build/v278-open2.png`（展开后箭头朝上、内容出现）。
- 源码提交 `30d7bdb`；回滚：`git revert 30d7bdb`。

## r64 · 2026-11-04 · 1.2.79（图标重绘）
- 问题：「我的」里 appearance / more / data 三行共用 `icon-copy.svg`，看上去像同一个功能；其余几个是早期的通用图形。
- 「我的」八枚图标改成按功能画的内联 SVG（描边 1.8、currentColor）：身体档案 = 人像 + 靶心；AI 模型 = 双圆角方块 + 火花；提醒 = 铃铛；偏好与记忆 = 便签 + 两行字；外观与餐次 = 半明暗圆 + 时钟指针；更多设置 = 齿轮；数据管理 = 数据库圆柱；关于 = 叶子 + 小星。实现上把 `installProfileMore()` 里的 `[id, icon 文件名]` 映射换成 `PROFILE_ICONS` 内联 SVG 表，不再依赖 icon-*.svg 文件。
- 今日体检四项改内联 SVG（18px、描边 1.6）：热量 = 火焰 + 外弧、蛋白质 = 斜置蛋 + 高光弧、脂肪 = 水滴 + 反光、睡眠 = 月亮 + 星、训练 = 哑铃、饮水 = 杯子 + 水位线。原来 蛋白质 是纯椭圆、脂肪 是水滴，两者在 16px 下轮廓接近。
- 断言：`habit-and-training-mode` 里「体检图标指向已发布资源」改成「体检图标为内联 SVG」，并登记 `03-global-changes §5.1`。
- 验收：`test-all` 56/56；`dev-loop` 1.2.79/279 安装 + smoke 无 JS 错误；截图 `build/v279-hub.png`（我的八枚）、`build/v279-check2.png`（体检四项）。
- 源码提交 `5e31bf8`；回滚：`git revert 5e31bf8`。

## r65 · 2026-11-04 · 1.2.80（装绘画技能 + 重绘品牌标记）
- 找插件：GitHub 上「绘画 / 插画」类高星来源里，选了官方的 `anthropics/skills`（仓库自带 skills 目录，全部是纯文本 + 字体）。按「下载仓库 → 只拷文本文件」的老规矩：`git clone --depth 1` 到 `D:\AI\build-skills`，只把 `skills/canvas-design/{SKILL.md,LICENSE.txt}` 复制到 `~/.dsh/skills/canvas-design/`；`canvas-fonts/` 里 20+ 个 ttf 属于二进制资产，没有装进技能目录，需要画字时从克隆目录按路径引用。没有跑任何 npx 安装器。
- 用技能产出一件作品：按 canvas-design 的两步法先写哲学（`docs/design/art/light-ledger.md`，「轻盈档案 / Light Ledger：可测量的温柔」），再把哲学画到 1240×1650 的画布上（`docs/design/art/light-ledger.png`，生成脚本 `tools/art-light-ledger.py`，Pillow 直绘）。构成：纸面噪点 + 从下往上累积的账本横线 + 一束 26 层同形轮廓长出的叶子 + 中脉 + 左侧刻度 + 三处极简文字（标题、PLATE 编号与体重/睡眠、落款）。
- 「重绘」落到产品：`app/src/main/assets/icon.svg` 重画成同源语言——纸底渐变、只在叶子下半部的账本横线、更尖的叶形与三条叶脉、右下角一枚苔绿点；顶部 28px 与启动器都用这一版。
- 产出体积：PNG 1.3 MB，只进仓库文档目录，**不进 APK**（APK 仍 512 KB）。
- 验收：`test-all` 56/56；`dev-loop` 1.2.80/280 安装 + smoke 无 JS 错误；截图 `build/v280-header.png`（页眉新标记）。
- 源码提交 `6fa8f1e`；回滚：`git revert 6fa8f1e`。

## r66 · 2026-11-04 · 1.2.80 → 1.2.81（换回 logo、插画入库、体检图标换 Tabler）
- 换回 logo：`git show 3ce54e6:app/src/main/assets/icon.svg` 取回 1.2.79 那一版（用户判定 1.2.80 的新标记太丑），1.2.80 的图标文件作废。
- 插画作为品牌插图进产品：`docs/design/art/light-ledger.png`（1.3 MB）缩到 760×1012、WEBP q82 → `assets/art-light-ledger.webp` **23 KB**；放在「关于轻衡」页，配 `.brand-art` 样式（max-width 340px、1px 边框、lazy）与图注「轻盈档案 · Light Ledger」。APK 从 512 KB 涨到 548 KB，换来一张品牌插图。
- 体检图标换专业图源：`git clone --depth 1 --filter=blob:none --sparse https://github.com/tabler/tabler-icons`（MIT，Paweł Kuna），`sparse-checkout` 只拉 `icons/outline`；把 flame / egg / droplet / wheat / barbell / moon-stars / cup 的官方 path 内联进 `metricIcon()`，统一 24 网格、`stroke-width 1.7`、`currentColor`；关于页「参考与致谢」补一条图标来源。
- 断言：`habit-and-training-mode` 的图标断言从「`训练: \`<g`」这类手绘写法改成「路径表 + 具体 path 片段」。
- 验收：`test-all` 56/56；`dev-loop` 1.2.81/281 安装 + smoke 无 JS 错误；截图 `build/v281-header.png`（体检四项已换 Tabler）、`build/v281-about.png`（品牌插画在关于页）。
- 源码提交 `efa1b2d`；回滚：`git revert efa1b2d`。

## r67 · 2026-11-04 · 1.2.82 → 1.2.83（图标统一到 Lucide）
- 换图源：`tabler/tabler-icons` → `lucide-icons/lucide`（MIT，社区最大的一档，24 网格 / stroke 2 / round caps，两套图标风格一致）。同样用 `--depth 1 --filter=blob:none --sparse` + `sparse-checkout set icons`，只取需要的目录（4040 个 svg，不拉整仓的 png/sprite）。
- 统一范围：「我的」八枚（user-round / bot / bell / notebook-pen / palette / settings / database / leaf）+ 今日体检七类（flame / drumstick / droplet / wheat / dumbbell / moon-star / glass-water）全部内联 Lucide 官方 path，24 网格、1.8（我的）/1.7（体检）描边、currentColor。
- 差异化：蛋白质改用 **drumstick（鸡腿）**，脂肪保持 **droplet（水滴）**——两者轮廓彻底不同（原来蛋 vs 水滴在小尺寸下仍偏像）；热量火焰、睡眠月亮+星、碳水麦穗、训练哑铃、饮水水杯。
- 踩坑：第一版内联 `<svg>` 没写 width/height，在 `.check-icon{height:16px}` 里被压成 0 高 → 图标整排消失（页面只剩文字）。修法是给 `.metric-glyph svg` 显式 16×16。另：脚本里 `[...arr.map(...).join()]` 会把字符串拆成单字符插进源码，已改成先 map 成行数组再 join 后作为单行写入。
- 断言：`habit-and-training-mode` 的图标断言改为「`const glyphs` + Lucide + `metric-glyph`」。
- 验收：`test-all` 56/56；`dev-loop` 1.2.82/283 安装 + smoke 无 JS 错误；真机截图 `build/v282-hub.png`（我的八枚）、`build/v283-metrics.png`（体检四项 + 鸡腿/水滴差异）。APK 548 KB 不变。
- 源码提交 `285ec97`；回滚：`git revert 285ec97`。

## r68 · 2026-11-04 · 1.2.84 → 1.2.85（我的图标加入自有图形语言）
- 用户判定：上一版直接套 Lucide 线条图标「过于中庸」，要求加入 App 自身风格。
- 定义了一套轻衡图形语言（写进代码注释，后续图标都按它画）：
  1. **1.7 圆头描边**（与正文细线同一笔触，不用 2.0 的通用粗细）；
  2. **每枚恰好一块实心「墨块」**（`fill:currentColor`）——把该入口最重要的那个语义实心化，其余留线；
  3. **右下角一枚 1.1r 的小墨点**（opacity .55），呼应账本里「已记录」的那个点，作为跨图标的品牌签名；
  4. **半墨圆**只在「外观」用（右半实心），对应纸感/账本/夜间三档切换的隐喻。
- 八枚按此重画：身体档案（人像 + 实心靶点）、AI 模型（芯片 + 实心内核 + 火花）、提醒（铃铛 + 实心铃舌）、偏好（笔记本 + 实心横带）、外观（半墨圆 + 指针）、更多（齿轮 + 实心轴）、数据（数据库 + 半透明墨带）、关于（叶 + 实心叶心）。
- 踩坑：第一版只写了 `stroke="none"` 没写 `fill="currentColor"`，而外层 `<svg fill="none">` 会继承给子元素 → 墨块与墨点全部不可见，整排图标退回纯线条。修法是给实心元素显式加 fill。
- 验收：`test-all` 56/56；`dev-loop` 1.2.84/285 安装 + smoke 无 JS 错误；真机截图 `build/v285-hub.png`（前四枚 + 更多）、`build/v285-hub2.png`（六枚全貌，墨块与小墨点都可见）。
- 源码提交 `546df4e`；回滚：`git revert 546df4e`。

## r69 · 2026-11-04 · 1.2.86（按既有标准审核图标并收口）
- 审核依据：`docs/design/13-aesthetic-claude.md`（八原则 + 交付前十条自检）与 `docs/design/20-audit-visual.md`（原文写死「24 viewBox、**1.5 描边**、只描边不填充」）。对照 v285 的图标，查出六条问题：
  1. **描边漂移**：v285 用 1.7，与文档的 1.5 冲突（细线是这套设计的核心，改图不改文档）；
  2. **实心越界**：「每枚一块实心墨块」违反「只描边不填充」的克制原则——品牌感要有，但不能靠填充堆；
  3. **两套语言**：我的图标带墨点、体检图标是原样 Lucide，看上去像两个来源；
  4. **圆角不统一**：rect 用了 2.8 / 2.6 / 1.2 三种；
  5. **语义偏技术**：「数据管理」画数据库圆柱，用户关心的是导出/备份，不是数据库；
  6. **对比度**：图标用 `--muted`，在浅底上接近但不能稳定 ≥3:1（图形边界要求）。
- 修改（1.2.86）：
  - 全部回到 **1.5 描边**（我的 24px / 体检 16px 一致）；
  - 实心收敛为「**每枚最多一个微型记号**」（点 ≤1.1r 或 ≤2.4 宽短带），不再整块填充；
  - 体检七类补上同一枚微型记号（火焰内焰点、鸡腿旁点、水滴高光点、月旁星点），与我的图标同语言；
  - rect 圆角统一 **2.5**；
  - 「数据管理」改为**档案盒 + 向下箭头**（备份/导出语义）；
  - 规格写进 `20-audit-visual.md`，断言与登记同步进 `03-global-changes §5.1`。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；`dev-loop` 1.2.86/286 安装 + smoke 无 JS 错误；截图 `build/v286-hub.png`、`build/v286-metrics.png`。
- 源码提交 `0a01afe`；回滚：`git revert 0a01afe`。

## r70 · 2026-11-04 · 1.2.87 → 1.2.95（品牌插画重做 + 更多设置位）
- 判位置：先试「整页半透明水印」——在「更多设置」用 `#subpage-more::before` 铺底（v287–v291 调了三版透明度/位置）。结果两条：①纸感底本身很浅，水印要开到 40% 才看得见，一开就压到两行设置的文字区；②插画自带的标题字透出来，和页面标题打架。于是放弃水印路线。
- 定方案：改成「技术档案板」——在「更多设置」标题下方放一张完整的插画卡片（3:2 竖版），下面才是 数据管理 / 关于轻衡。用户要求「表现效果佳优先」，卡片化比水印更能展示，也不压正文。
- 美术参考《明日方舟：终末地》的档案语汇，叠到轻衡的纸墨上：5mm 细网格、四角括号、左侧 075/200/325 刻度尺（唯一信号色锈橙只用在刻度端点）、两处引线标注（叶形轮廓 ×34 / 纸纹 0.6）、底部实心墨条 + 反白小字。保证「有信息量」但不抢主线。
- 两次返工：①1400×930 的大图缩到 380dp 后标注只有 3–4px，重做成 900×1150 竖版并把字号提到 24–30px；②刻度尺与标题重叠，把刻度起点下移到 y=330，只留 075/200/325 三个数字。
- 关于页同步换成 `brand-field.webp`（无文字版，做背景更干净）；两张图都压过：`brand-field` 25 KB、`brand-plate` 47 KB，APK 从 662 KB 回到 **597 KB**。
- 验收：`test-all` 56/56；`dev-loop` 1.2.87–1.2.95 多次安装 + smoke 无 JS 错误；截图 `build/v293-more.png`、`build/v294-more.png`（最终版：档案板 + 两行设置首屏可见）。
- 源码提交 `e686e8b`；回滚：`git revert e686e8b`。

## r71 · 2026-11-04 · 1.2.96 → 1.3.04（删插画 + 展开过渡 0.28s）
- 删除关于轻衡里的插画：去掉 `<figure class="brand-art">`、`.brand-art` 三条样式、以及不再引用的 `assets/brand-field.webp`（-53 KB）。APK 597 → 572 KB。
- 展开过渡：试了三种实现，全部走过真机——
  1. CSS `::details-content` + `interpolate-size`（1.2.78 起）：真机无过渡，判定该 WebView 不支持；
  2. `summary` 上 `preventDefault` + WAAPI 动 `details` 高度：真机仍瞬开，怀疑内容被 innerHTML 重写后包裹/动画失效；
  3. 最终版：`installDisclosureAnimation()` 把每个 details 的内容包进 `.disclosure-body > .disclosure-inner`，靠 `grid-template-rows: 0fr → 1fr` 过渡（`--dur-slow` = 0.28s），并用 MutationObserver 在 innerHTML 重写后重新包裹（从变更目标往上找 details）。
- **验证局限（必须说清）**：没能抓到动画中间帧。`adb screencap` 从点击到出图约 0.4–0.6 s，比 0.28 s 长；把过渡临时调到 1.2 s 后再抓，截图仍是完全展开——说明要么包裹没生效，要么抓图时机仍晚于动画；试图用 `screenrecord` 取证，设备上录出的 mp4 只有 28 KB、ffmpeg 抽帧为 0。**结论：代码改到位，但“手感”未经我证实，需要手指验证。**
- 断言：`meal-recalc-collapse` 增加 `installDisclosureAnimation` / `.disclosure-body{grid-template-rows:0fr}` / `details[open]>.disclosure-body{1fr}` 三条。
- 验收：`test-all` 56/56；`dev-loop` 1.3.04/304 安装 + smoke 无 JS 错误；截图 `build/v303-probe.png`（探测用，展开后状态）。
- 源码提交见本轮 commit；回滚：`git revert`。

## r72 · 2026-11-04 · 1.3.05（展开过渡放慢）
- 用户反馈：1.3.04 的展开「过快，什么都看不清，不够美」。说明动画确实在跑（推翻了我上轮「无法证实」的结论），只是 0.28s + 线性感的缓动在手机上有「闪一下」的感觉。
- 改法：新增 `--dur-disclose: .46s`，展开与收起**不对称**——展开 0.46s（`cubic-bezier(.22,.8,.3,1)`，先快后缓，收尾有停顿感），收起 0.32s（`cubic-bezier(.4,0,1,1)`，不拖泥带水）；内容再叠一层 `disclosureIn`：透明度 0→1 + 上移 6px，与高度过渡同一条曲线；箭头旋转从 `--dur-fast` 改为 `--dur-disclose`，避免「内容还在动、箭头已经翻完」。
- 断言：`meal-recalc-collapse` 里关于 `details[open]>.disclosure-body{grid-template-rows:1fr...}` 的正则放宽为允许后续 `transition`（原来要求 `}` 紧跟，规则加了时长后失配）。
- 验收：`test-all` 56/56；`aesthetic-audit` OK；dev-loop 1.3.05/305 安装成功，`dumpsys` 读到 `versionName=1.3.05`；截图 `build/v305-open.png`。
- 源码提交 `d89fcc8`；回滚：`git revert d89fcc8`。

## r73 · 2026-11-04 · 1.3.06（放松日）
- 需求：按每日记录判断「本周有一天热量/脂肪远高于目标」，把那天当作放松日——不判失败、给鼓励，并让后续饮食与训练安排知道这件事。
- 判据（纯推导，不落库）：当日 ≥2 餐、热量 ≥ 区间上限 ×1.12 或脂肪 ≥ 上限 ×1.2，且不是吃太少（热量 ≥ 下限）；同一自然周（周一~周日）只认一天——更早已有符合日，则今天算第二次超量，不享受放松日。
  - 用 `relaxDayInfoFor(date)` 实现，排在 `dailyCheck` 之前；周起点用 `shiftDay(date, -((weekdayIndex(date)+6)%7))`。
- 表现：今日体检标签变成「放松日 · 本周 1/1」（`.tag.is-relax`，ok-soft 底 + ok 字），四格转中性（不再红/青判定），评价固定为「今天是本周的放松日：吃得比目标多一些，属于计划内，不算失败。」，优先行动改成「明后两天照常吃就行，不要用少吃或加练去『补回来』」。
- 建议链路：页面请求带 `relaxDay:true`；Java 在 system 提示词后追加「今天是用户本周的放松日……不要说教、不要建议第二天节食或加练去补偿」。
- 兼容：`dailyCheck({relax:true})` 只放宽热量与脂肪两项的 state 与话术，其余（蛋白/睡眠）照常评分，所以「放松日」不等于「这天不看体检」。
- 验收：`test-all` 56/56（新增 4 条断言：放松日不被说教、行动不提补偿、检测函数存在、`is-relax` 样式）；`aesthetic-audit` OK；dev-loop 1.3.06/306 安装，dumpsys 读到 1.3.06；截图 `build/v306-check.png`（当日 1769 kcal 未达放松日阈值 → 仍按常规评分，属预期）。
- 踩坑：把 Java 字符串里的 `\n\n` 直接写成了真实换行，javac 报「未结束的字符串字面量/非法字符」，已改为显式转义。
- 源码提交 `400f8b2`；回滚：`git revert 400f8b2`。

## r74 · 2026-11-06 · 1.3.07（摄入公式核查 + 烹调用油口径）
- 需求：核查当前版本热量/蛋白质/碳水摄入公式是否正确，结合当天饮食记录看是否存在少算，有问题就优化。
- 结论一：**公式没错**。三层口径一致（`NutritionMath.caloriesFromMacros` 4/4/9、`reconciledKcal` 对账、`inferredCarbs` 补碳水），实测最近两天全部自洽——11-05 记录 1,370 kcal vs 宏量推算 1,368.9 kcal（差 1 kcal）；11-04 早餐 441 vs 443.8、午餐 468（+10 g 油）内部一致。11 月 5 日三餐蛋白 87.1 g、脂肪 56.9 g、碳水 127.1 g 逐项核算无偏。
- 结论二：**存在少算，但不在公式，在输入层的烹调用油**。证据：
  1. 估算提示词只给「1 勺≈10 g」这一个意象，没有要求按菜累加，于是整餐一个固定值——11-05 晚餐三道炒菜（宫保鸡丁 / 虾仁玉米炒蛋 / 西兰花炒肉片）整餐仍只记 **15 g** 油，11-05 午餐两道炒菜也是 15 g，11-04 午餐一道炒杂蔬 10 g。
  2. 同一餐 594 kcal / 脂肪 22.8 g：扣掉 15 g 烹调油后三道菜加蛋只剩 7.8 g 脂肪，明显低于家常中餐的实际量。
  3. 这类偏低**逃过现有校验**：`reconciledKcal` 只比对「声称热量 vs 宏量推算」，两者同源自 items，所以内部永远自洽，抓不到绝对值低估。
- 改动：
  1. `Prompts.mealEstimate()`：oilGrams 改为按菜累加并给出量化阶梯（家常小炒每道 8~18 g，红烧·干锅·油淋·煎炸每道 15~30 g，蒸煮炖凉拌白灼不计，三道菜按三道算）；把「脂肪尤其不要往上顶」这种鼓励低报油脂的表述去掉，改成「不要为了防高估而系统性压低烹调油与可见脂肪」。
  2. 补回被我一次编辑误删的「不要输出 totals 字段」，并把 `两者要抵消` 原句语义保留（测试断言依赖）。
  3. **修掉纤维死代码**：提示词 items 里新增可选 `fiber`；`MainActivity.estimate` 解析白名单原来只取 calories/protein/carbs/fat，模型给的 fiber 一律丢弃，导致 `NutritionMath` 的 2 kcal/g 分支与 `reconciledKcal` 的 fiber 重载**从未生效**（文档 `tools/one-off/doc-update.mjs` 早有承诺但未接上）。现在 fiber 保留在 item 上并 clamp 到 [0, carbs]。
- 验收：`test-all` 56/56（含 `estimator prompt explains why` 等既有断言）；dev-loop **1.3.07/307** 全绿（assemble 3.3s / 测试 15.9s / 打包 18.3s / 装机 10.7s），Java 侧 fiber 分支已随 javac 编译通过。
- 未验证：新口径油量**未在实机重跑同一餐对比**（需要外部模型调用 + 中文输入操作，本轮未做）；数字变化待下一次拍照估算时看。
- APK：`dist/qingheng-1.3.07.apk`，572,512 B，sha256 `f02fed1879db86de55b0cdbab71a8ccfccf27e6958e47be5e558230470722883`。

## 估算体验回顾 · 2026-11-06
- 改了什么：提示词优先国内熟重、用户锚点与常见份量中位值；按菜累加烹调油，油脂不重复计，油酱糖取常见中位并说明不确定性。为什么：减少份量低估、调味夸大和重复计算。用户能感知到：条目克重与用油更可核对，仍能看到估算区间。
- 改了什么：匹配到的食物用本地参考值校准，未匹配项保留原值并标注；草稿按 ID 幂等确认，预览需人工检查后才保存。为什么：保留未知信息并避免重复提交。用户能感知到：来源清楚、先见进度、失败可重试，未确认预览不计入饮食。

## r75 · 2026-11-07 · 1.3.09（「用 AI 排今天」修复 + 排程埋点）
- 需求原话：「当前版本"用 AI 排今天"出现报错，请修复并优化该功能」。
- 根因：`native-adapter.js` 的 `chatNativeBody` 用固定白名单重建请求体，漏掉 `focus`（连带 `tier` / `library` / 缓冲路径的 `anchors`）→ 原生 `planFocus` 恒 false → 清单请求走通用问答提示词（「最多 3 句」），与用户消息「只输出 JSON 数组」互斥 → 空清单或「模型这次没有给出回答内容」。
- 修复：白名单补回四个字段（stream 与 buffered 共用）；空回答在原生侧放大到 `CAP_PLAN * 4` 重试一次；新增 `plan ms / chars / rows` 日志。
- 优化：提示词按可用时长定量（30 / 45 / 60 分钟 → 4 / 5 / 6 个动作），排除平板支撑这类按秒计、记不进组次表的动作；12 秒慢提示改为「一般要半分钟左右…」。
- 验收：`test-all` 57/57（新增 `tests/ai-plan-focus.test.mjs` 29 条）；dev-loop 1.3.09/309 全绿 34.9s（测试 10.7 / 打包 11.8 / 装机 9.7）；真机点一次成功「已按顺序排好今天的 4 个动作」（深蹲 / 哑铃卧推 / 坐姿划船 / 跑步），logcat `plan ms 31910 chars 348 rows 4`。
- 样本说明：同一轮第一次点击在 90 秒内无产出、也无 `plan ms`（走空回答守卫，日志在其后），重试 31.9s 成功——单次耗时只能记作样本，不能当稳定值。
- 踩坑一：`dev-loop.ps1` 的子步骤用 `Process.Start` 起新进程，继承的是**进程 cwd**；在 pwsh 里 `cd` 只改 PowerShell 位置，不改进程 cwd，于是从 `D:\AI` 启动会去找 `D:\AI\tools\sync-version.mjs`。调用时必须把工作目录设成仓库根。
- 踩坑二：测试断言钉了整句文案，文案一改就假红灯。改为钉语义（`模型还在排` + `12000` 兜底），不再钉整句。
- 踩坑三：`uiautomator` 对被裁到视口外的 WebView 元素返回零高度 bounds（`y1==y2==144`），必须滚动到可见处再 dump，点前重新取坐标。
- 说明：编辑工具把片段里 199 行 LF 统一成 CRLF（仓库原本混用），`70-rest.fragment.js` / `app.js` 的 diff 因此比实际改动大。
- APK：`dist/qingheng-1.3.09.apk`，580,703 B，sha256 `bab21c783df70933d37ae62601de5d322b5766a1b826465d7328507c50aa0c67`。
- 源码提交 `c7d5b6d`；回滚：`git revert c7d5b6d`。

## r76 · 2026-11-07 · 1.3.10（训练计划收纳 + 动作说明）
- 需求原话：「为训练计划添加收纳（如用户已确认计划各项需求），或填写后添加至我的--身材档案与目标中。为用ai排出的动作，每个动作名新增点击选项，点击会提示该动作的实际含义，以及注意要点（参考注释功能）。同时检视记录-训练中各个功能排版、分布，能否进一步优化页面信息量？」
- 收纳：训练偏好保存后收成一行摘要（每周 4 天 · 全身 · 综合 · 每次 30 分钟）+「修改」，展开才显示四组芯片，保存后自动收起。踩坑：`renderWeekPlan()` 里原有一句「偏好芯片常驻」直接 `#plan-prefs.hidden = false`，会把刚收起的又撑开——已删。
- 动作说明：AI 清单每个动作名改成按钮（右侧一个问号），点开复用术语注释的底部面板（`#exercise-guide`，与 `#term-sheet` 同套 `.term-*` 样式），显示「练什么 + 3 条要点」；新片段 `65-exercise-guide.fragment.js` 收录 30 个常见动作，按最长关键词匹配（「颈前深蹲」不会被「深蹲」抢走），未收录时明确说没收录。点击用 `preventDefault() + stopPropagation()`，避免 label 顺带勾选「已做完」。
- 排版：训练分段按 headings 数组重建，原来把「训练日志」排在「训练计划」前面；改成计划 → 日志 → 下周计划，首屏不再先看到录入表单。
- 踩坑（构建）：`build.ps1` 哈希行直接 `Get-FileHash`，一次 cmdlet 未加载就让整条 dev-loop 失败——已加 try/catch 退回 .NET SHA256；同一处注释最初写成中文，Windows PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 解析，报「意外的标记 }」，注释改回英文才通过。以后 `build.ps1` 只写 ASCII，或存成带 BOM 的 UTF-8。
- 踩坑（验证）：`uiautomator` 对被裁到视口外的元素返回零高度 bounds，必须滚到可见处重新 dump 才有真实坐标。
- 验收：`test-all` 57/57（`records-panels` 的顺序断言改写并登记 `03-global-changes §5.1`）；dev-loop 1.3.10/310 全绿 31.3s（测试 10.5 / 打包 9.0 / 装机 9.3）；真机：计划卡居首、摘要行 + 修改可展开、哑铃卧推点开出「胸 · 两侧独立发力」与三条要点。
- 未做：没有把训练偏好搬进「我的 → 身体档案与目标」（选了收纳这条；那页仍写「训练天数取自记录 → 训练计划」）。
- APK：`dist/qingheng-1.3.10.apk`，584,799 B，sha256 `e08d5f5f482480f15b0c2abfe6d44034c90f82fefa780b42fdd9894100509516`。
- 源码提交 `c07bfb0`；回滚：`git revert c07bfb0`。

## r77 · 2026-11-07 · 1.3.11（训练页三处收口 + 周要点跟今天走）
- 需求原话：「完成以上三点优化，并确认为什么训练框中灰色框会提示侧平举放下，该提示相对突兀，是否可替换或优化？」
- 灰框的根因：它不是警告，是 `plan.cue` —— `libraryCues(plan.days[0].template)` 固定取本周第一天（周一，推），所以休息日也会弹「侧平举下放只到全程 2/3」；既没有标题，也和今天无关。
- 改法：`cueDay` 按「今天 → 下一个训练日 → 本周第一天」取；标题写「今天（推）的动作要点 / 下一个训练日（推）的动作要点」，不是今天就默认折叠（details），是今天才展开。
- 三处收口：① 今日顺序从训练计划卡拆成独立卡片（分段顺序 计划 → 今日顺序 → 日志，断言与 §5.1 同步）；② 去掉每行「加入」，只留底部「全部加入今天的训练记录」；③ 负重两行说明收进「算一下负重」弹层，按钮移到表单按钮组。
- 顺带修：弹层里 `.weight-row` 只有 `display:flex`，被全局 `label{flex-direction:column}` 压成纵向、被 `input:not([type=checkbox])` 的 `width:100%` 撑满，导致「杆重 · kg」换行、复选框孤零零居中。补 `flex-direction:row`，并把宽度规则提到与全局同权重（`.weight-row input:not(...)`）；复选框改 20px + `accent-color:var(--accent)`。
- 验收：`test-all` 57/57；dev-loop 1.3.11/311 全绿 31.7s（测试 10.7 / 打包 8.9 / 装机 9.4）；真机确认：今日顺序独立成卡、动作行无「加入」、算一下弹层三行横向、要点标题为「下一个训练日（推）的动作要点」且折叠。
- APK：`dist/qingheng-1.3.11.apk`，584,801 B，sha256 `bb10745bdad666635eaa6dcf4714766aba5970e00869004d2b69656968793c40`。
- 源码提交 `b3c12cc`；回滚：`git revert b3c12cc`。

## r78 · 2026-11-07 · 1.3.12（补食材与动作说明，数据源评估）
- 需求原话：「填充健身、饮食数据库，可从github上确认是否有相关可利用项目」。
- 数据源结论（详见 `docs/design/23-data-sources.md`）：
  - 采用 USDA FoodData Central SR Legacy（公有领域，逐条 fdcId）；
  - ODbL 的 Open Food Facts 只在线查询、不批量入库；
  - `Sanotsu/china-food-composition-data`（中国食物成分表，1677 条）**无 LICENSE 且源自受版权书籍截图**，不复制；
  - `yuhonas/free-exercise-db`（Unlicense，876 动作）字段够用但需中文翻译，留作下一轮备选；
  - `hasaneyldrm/exercises-dataset`（1,324 动作）许可 NOASSERTION、媒体 © Gym visual，不用。
- 食材：`tools/usda-catalogue.json` 新增 27 条（肉类 7、水产 8、蛋奶补充 1、谷物豆类 7、蔬果坚果等 4），参考库 125 → 150 条（130 食材 + 20 示例菜）。踩坑：新增别名与旧条目冲突两次（`虾仁`、`全脂牛奶`/`低脂酸奶`），构建脚本的重复别名检查直接把构建拦下，按检查结果删别名/删重复行后通过。
- 动作说明：`65-exercise-guide.fragment.js` 30 → 61 条，补推、拉、腿、核心与有氧常用动作；仍按最长关键词匹配，未收录直说。
- 验收：`test-all` 57/57（food-models 条目数断言 `120–130` → `145–160`，登记 `03-global-changes §5.1`）；dev-loop 1.3.12/312 全绿 30.8s（测试 10.5 / 打包 8.1 / 装机 9.6）；离线校验 `search('三文鱼') → 208 kcal`、`黑巧克力 → 598 kcal`、条目数 150。
- APK：`dist/qingheng-1.3.12.apk`，588,898 B，sha256 `f0cd8d2ec40f0742a07557aed8cea2ce1ea31d7aff670003344c5b5e709ead6d`。
- 源码提交 `3c239ee`；回滚：`git revert 3c239ee`。

## r79 · 2026-11-07 · 1.3.13（训练页去框化 + 动作说明 91 条 + 去出处）
- 需求原话：「用 free-exercise-db 继续扩充常见健身运动项目。当前训练栏中一堆窗口堆叠，很丑，请优化页面审美设计，同时删除提示中的来源、出处，优化文字布局」。
- 去框化：训练计划内部原来有 5 个带框块（要点框、状态绿块、负荷框、为什么这样排、参考处方）。现在状态区、负荷条、三个 details 全部改成发丝线（`border:0; border-block:1px`），details 的 32px 方块箭头改为小号 ▾；负荷偏高保留警示色文字，但不再铺底色。一屏只剩「全部加入」一处强调按钮。
- 动作：按 free-exercise-db（Unlicense）的覆盖补 30 条——史密斯机深蹲/卧推、髋内收、坐姿绳索划船、反手引体、坐姿提踵、早安式、集中/斜托/绳索弯举、仰卧臂屈伸、反向飞鸟、耸肩、腕弯举、仰卧举腿、空中自行车、反向卷腹、绳索卷腹、登山跑、跳箱、药球砸地、器械夹胸、直臂下拉、相扑硬拉、泽奇深蹲、单腿臀桥、反向划船、杠铃臀推、器械推肩、绳索拉臀；中文名与要点自写，不复制其英文或媒体。
- 去出处：`plan.reasons` 不再拼 `reason.source`；参考处方标题「整理图参考处方」→「参考处方」并删掉「课代表/C 级」说明；技术档案的「按部位查要点」去掉「口述 02:08」；`Prompts.dailyAdvice` 删掉「附 BV 号与时长」；`librarySummary` 只给规则正文。
- 断言：training-library 两条改写（不再要求 BV；标题改「参考处方」），登记 §5.1。
- 验收：`test-all` 57/57；dev-loop 1.3.13/313 全绿 32.9s（测试 10.8 / 打包 9.7 / 装机 9.9）；真机截图 `build/v313-plan2.png`、`build/v313-plan3.png`（三段均为发丝线，无方框堆叠）。
- APK：`dist/qingheng-1.3.13.apk`，592,992 B，sha256 `f4eccc9680333413306cd4a9772a02ddaaf7c874be06905a0d6cc674e1109873`。
- 源码提交 `167b7cb`；回滚：`git revert 167b7cb`。

## r80 · 2026-11-07 · 1.3.14（分区标注 + 删参考处方 + 术语与做法）
- 需求原话：「参考处方一行对用户使用app没有用处，反而会产生疑问。当前训练功能中各个功能区分效果不明显，优化界面易读性。同时为未注释的专有名词补充注释。为各个动作补充简易描述（让新手知道是什么动作，要怎么做）」。
- 删块：训练计划里的「参考处方」（日模板 3 天处方 + 课代表说明）整块移除，`dayTemplates` 仍留在训练库里供计划生成；断言改为「块已删除」与「cues 只在数据层」。
- 分区：新增 `.plan-label` 小标题——本周安排 / 今天的状态 / 训练负荷 / 动作要点；配合上一轮的发丝线，几段内容不再连成一片。
- 术语：`TERMS` 补 分化、推拉腿、急慢性负荷比、复合动作、孤立动作、容量、组间休息；点词出 sheet（真机验证「分化」）。
- 做法：新增 `EXERCISE_HOW`（91 条一句话），动作弹层顺序改为「练什么 → 怎么做 → 要点」；未收录时不显示这一行。
- 验收：`test-all` 57/57；dev-loop 1.3.14/314 全绿 31.2s（测试 10.8 / 打包 8.2 / 装机 9.6）；真机截图 `build/v314-plan.png`（分区小标题）、`build/v314-guide.png`（深蹲含「怎么做」）。
- APK：`dist/qingheng-1.3.14.apk`，592,992 B，sha256 `0667ec4e4210c827d84cfd5b8c5f93ecf3463f6712a9f016f83f03443bd63697`。
- 源码提交 `8854f6c`；回滚：`git revert 8854f6c`。

## r81 · 2026-11-07 · 1.3.15（用量账本 + DeepSeek 余额 + 充值入口）
- 需求原话：「为当天APP制作消耗token功能，计算APP累计消耗金额与api key关联账户剩余余额，是否可提供对应充值入口？」；用户补一句「优先为deepseek模型实现」。
- 采集：缓冲响应读 `usage`；流式请求对 DeepSeek 加 `stream_options.include_usage`，读最后一帧的 `usage`；`recordUsage()` 只写 `{t, model, in, out}`，上限 800 条，存 SharedPreferences `usageLog`。
- 展示：`我的 → AI 模型与密钥` 新增「用量与余额」：今天/本月 tokens、按可改单价估算的金额、DeepSeek 余额；单价默认 2/8 元每百万 tokens（输入/输出），存 `qingheng.usagePrice`。
- 余额：`GET {baseUrl 去掉 /v1}/user/balance`，Bearer 用已保存 key；返回 `balance_infos[0]` 的 total/granted/topped；非 DeepSeek 直接提示不支持。
- 充值：不在应用内收款，只允许 `openExternal` 打开 `platform.deepseek.com`（白名单），其余外链仍被 WebView 拦截。
- 踩坑：`model` 在方法里可能被重新赋值，流式回调捕获它编译不过，先拷成 `final usageModel/estimateModel`；`usageLog()` 的 catch 里再 `new JSONObject().put()` 会抛未捕获的 JSONException，改成先建对象再填。
- 验收：`test-all` 58/58（新增 `tests/usage-billing.test.mjs` 14 条）；dev-loop 1.3.15/315 全绿 31.3s；真机一次排程调用后显示 3.3k tokens / ¥0.02 / 1 次，余额 18.67 CNY（调用前 19.00）。
- 已知边界：只统计本机此后发生的调用；历史调用没有 usage 数据，不回溯；价格是估算值，DeepSeek 调价后需在页面改单价。
- APK：`dist/qingheng-1.3.15.apk`，597,088 B，sha256 `a22920257b989ebef1fb273e9500d1819eecb3f1fa90ea4ce84e6807c5696e5d`。
- 源码提交 `e9db4d1`；回滚：`git revert e9db4d1`。

## r82 · 2026-11-07 · 1.3.17（排今天提速 + 行布局收紧）
- 需求原话：「优化用ai排今天出结果速度」；紧接着「优化用ai排今天的页面布局或输出内容，当前存在空间浪费。同时保留冗余，确保其他品牌设备也能正常展示」。1.3.16 的流式改动与 1.3.17 的布局改动一起提交（1.3.16 未单独发版）。
- 提速：排程从一次性 `/api/chat` 改成 `/api/chat/stream`，前端每收到一个已闭合的 `{...}` 就先渲染一行；全屏遮罩换成卡片内的 `#plan-busy` 行内提示；提示词把 reason 压到 ≤12 字，baselines 8→6、librarySummary 6→4。解析失败/流不可用时退回一次性接口，并把原清单放回去。
- 实测（单次样本，不是中位数）：改前 `plan ms 30138 chars 319`；改后两次 `13686 chars 263`、`9928 chars 275`。
- 布局：名字与剂量同一行（`.ai-plan-head` + flex-wrap，剂量 `margin-left:auto` 右对齐），原因独占一行；行上下留白 8→4px，行高下限 48→44。窄屏剂量自动换行，不写死宽度。
- 踩坑：清空计划后按旧坐标再点，按钮位置已因列表高度变化而移动，第一次「测速」实际没发起请求；流式期间 uiautomator dump 有滞后，轮询两次才看到中间态。
- 验收：`test-all` 58/58（training-log 的行结构断言改写并登记 §5.1）；dev-loop 1.3.17/317 全绿 31.3s；真机截图 `build/v317-rows2.png`。
- APK：`dist/qingheng-1.3.17.apk`，601,184 B，sha256 `1414c4c7cd42cc45f67e179ab0a311801cc3f54cd0259cb5276cb9cf1c838e13`。
- 源码提交 `7a5e8a9`；回滚：`git revert 7a5e8a9`。

## r83 · 2026-11-10 · 1.3.18（临时目标落到区间 + 估算等待去跳字）
- 需求原话：「当前app如果前面一天脂肪、热量超标，会弹窗提醒是否修改第二天的热量目标，但实际第二天目标未正常修改，请修复。并优化app生成估算时的动画表现，如在计算具体食品热量时，文字会随之跳动，而不是集中在最后时刻出现文字变化」。
- 根因：`saveTemporaryTargets` 存了临时 `calorieTarget`，但「今天」页与 AI 提示词都读 `intakeRange`（trainingDay/restDay 区间）；`effectiveProfileForDate` 先算区间、再把 temporary 赋给 `calorieTarget`，随后界面又用 `range.max`，临时值被区间覆盖。原生 `effectiveProfile` 也只改 `calorieTarget`，同样被四个区间键盖住。
- 修法：客户端先把 temporary 并进 profile 再算区间，并把当日上下限、训练/休息日边界统一设成临时值（basis 写「临时调整，明天恢复」）；原生 `effectiveProfile` 同样覆盖 `trainingDayMin/Max`、`restDayMin/Max`。弹窗结果改用服务端返回的 `temporary` 回话。
- 估算动画：删掉 1.4s 定时轮换的假进度条（"正在核算 X"），文字稳定为「正在估算这份餐食（N 项）…」，只有流里真的解析出新的食物名才更新行；动效只留在骨架 shimmer。
- 验收：`test-all` 59/59（新增 `tests/target-adjustment.test.mjs` 8 条契约）；dev-loop 1.3.18/318 全绿。临时目标只做了代码路径核对与静态契约，没有实机模拟超支日。
- APK：`dist/qingheng-1.3.18.apk`，601,183 B，sha256 `468274333a675efcfaebe40506ba82b846345d024241fb650a2aa7e7af52d4d7`。
- 源码提交 `a536e18`；回滚：`git revert a536e18`。

## r84 · 2026-11-10 · 1.3.19（P1–P3 + 估算思考流）
- 需求原话：「实现p1到p3优化，确保估算动画会正确显示当前ai实际在计算的思考的内容，动画效果可参考dsh思考动画，千问等ai产品的思考动画。并非最后将所有结果一次性输出」。
- P1 单一计划来源：周计划列表原来按 `trainingDays(prefs.days)` + 轮换自己算，和 `plan.days` 生成的「今天的状态」各说各话（出现过 11-07「今天·全身」与「今天 休息」并存）。改为两边都读 `plan.days`；`weekTodaySession()` 直接 `return weekPlanToday().day`。真机核对：列表「今天 · 休息」、状态「今天 休息」。
- P2 配置注册表：`CONFIG_REGISTRY`（planPrefs / aiPlans）集中声明 localStorage 与 state.prefs 的映射；`loadState` 末尾 `verifyConfigSync()` 对齐并回写漂移项。
- P3 等待反馈收敛：删掉 `#busy-layer` 全屏遮罩与 `showBusy` 的无 target 分支，只剩行内提示与 notice 两类。
- 估算思考流：`estimate()` 增加 `think` 形参，`startEstimateStream` 把 `reasoning_content` 以 `kind: think` 推给页面；native-adapter 转发 `sink.onThink`；页面新增 `.estimate-think`，显示模型真实思考的尾部 220 字，食物名从流里解析出来后更新「正在核对」，不再有 1.4s 假进度；最终预览仍在完成后一次出现（严格 JSON 无法安全边写边渲染）。
- 验收：`test-all` 60/60（新增 `tests/structure-phase.test.mjs`）；dev-loop 1.3.19/319 全绿 29.1s（测试 9.7 / 打包 7.7 / 装机 9.4），smoke 无 JS 错误。
- 未验证：估算思考流的真机可视验证 —— adb `input text` 被本机中文输入法改写（输入的英文变成「100rice个100」），提交按钮没被点到，只做了代码契约与编译验证；下次用系统键盘手动输入再截一次等待态。
- APK：`dist/qingheng-1.3.19.apk`，601,183 B，sha256 `8dd6059a101efbdfb48624f92292d7b0651b89417ea77ddb80f25d147942ab04`。
- 源码提交 `200762a`；回滚：`git revert 200762a`。

## r85 · 2026-11-10 · 1.3.20（P4 迁移 + P5 行为测试 + 等待文案）
- 需求原话：「生成预览文字内容格式保证“正在动词名词”即可（如正在分析食品营养），不要显示具体快速的信息流内容。可参考截图健康app。实现P4和P5」。
- P4：`STATE_VERSION = 2` + `migrateState()`（v2 规范 prefs、把 temporaryTargets 收敛到已知字段）；迁移前把原文件存成 `state.pre-v{n}.json`（同版本只写一次）；`version > 2` 直接拒绝打开；`cleanState` 不再硬写 version=1。
- P5：目标下调与临时覆盖抽到 `assets/calc.js`（`adjustedTargets` / `applyTemporaryRange`），`behavior-calcs.test.mjs` 直接跑 vm 断言 8 条：男性 2000→1800、女性 Floor、已达下限拒绝、缺目标拒绝、fatMax −10%、覆盖四处边界、不改入参、null 原样返回；弹窗与 `effectiveProfileForDate` 改用同一实现。
- 估算等待：删掉 `.estimate-think` 的信息流正文，只留「正在分析食品营养…」→「正在核算份量与热量…」两句「正在+动词+名词」。
- 验收：`test-all` 61/61；dev-loop 1.3.20/320 全绿 29.7s，装机 + smoke 无 JS 错误。
- 未验证：包不可 `run-as`，迁移备份文件与 version=2 未能直接读取；估算等待态仍受 adb 中文输入法改写影响，未跑通真机可视验证。
- APK：`dist/qingheng-1.3.20.apk`，601,243 B，sha256 `825c13fb630ff62ada135572117a334d16daea90b4c1e1e990c91a0fc611faee`。
- 源码提交 `3295403`；回滚：`git revert 3295403`。

## r86 · 2026-11-10 · 1.3.21（估算关思考 + 提示词压缩）
- 需求原话：「当前思考估算热量还是过慢了，是不是思考的内容过多，限制条件过多导致?确认分析食品热量实际所需要的思考等级，以及具体的提示词，能否进一步优化」。
- 根因：DeepSeek 新版 API 的思考模式**默认开启**、`reasoning_effort` 默认 `high`（[官方文档](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/)）。估算仍按默认请求，等于每次先写一整段思维链再做查表任务；提示词里重复的口径解释又把这部分拉长。
- 修法：`ChatCompletion` 增加 `thinking` 开关，只在 baseUrl 含 `deepseek` 时下发 `{"thinking":{"type":"disabled"}}`；估算的缓冲与流式两条路径都传 `false`，聊天/建议保持默认。`PROMPT_VERSION` 升到 6，估算提示词从 800 余字压到约 520 字（三步：认食物 → 估份量 → 套数据；保留数据优先级、油按道累加、纤维口径、notes 一句）。
- 实测：真机输入（adb 输入被 IME 改写为 `100rice个chicken100`）→ `estimate 1512ms chars=303 cap=900`。同一台机器改动前是数十秒级，差距来自整段思维链。
- 验收：`test-all` 61/61；dev-loop 1.3.21/321 全绿 29.0s（测试 9.7 / 打包 7.6 / 装机 9.4），smoke 无 JS 错误。
- APK：`dist/qingheng-1.3.21.apk`，601,245 B，sha256 `0bcf1b849cf908e1c3b51db483c534ecc1e6713a72296d0ae3766b6ad954ea84`。
- 源码提交 `64e4fe0`；回滚：`git revert 64e4fe0`。

## r87 · 2026-11-10 · 1.3.22（油价可改 + 提示词 v7）
- 需求原话：「请与当前估算的油算法交叉分析，优化算法。优化app各处利用到ai回答时的提示词，能否迭代？」
- 交叉分析：阿福把脂肪拆成「食材自带 + 烹饪油」，并明确油是最虚的一环（±5 g ≈45 kcal）；我们早已拆开（油单列按 9 kcal/g，可见脂肪进 item fat），但预览里油只能看不能改，用户发现「炒菜只记 5 g」也无从修正。
- 算法改动：`renderPreview` 增加「烹调用油 · g」输入（`#estimate-oil-input`），改数写入 `draft.oilGrams` 并立即重算合计；保存仍走 `oilGrams/oilIncluded`，不加字段、不改记录结构。
- 提示词 v7：要求「先逐道写油量再相加，不要先给整餐一个数」，写明「每 5 g 约 45 kcal」，拿不准在 notes 给油量区间；`PROMPT_VERSION = 7`。
- 迭代边界：聊天、建议、排今天、周复盘的提示词本轮不动——没有证据显示它们被提示词拖慢，先避免无谓回归。
- 验收：`test-all` 61/61（anchors-oil 新增 2 条：油敏感度、油价可改）；dev-loop 1.3.22/322 全绿 30.1s，smoke 无 JS 错误。
- 未验证：改油后合计重算只做了代码契约与静态断言，没有跑一次真机外部估算再改数。
- APK：`dist/qingheng-1.3.22.apk`，601,244 B，sha256 `e2f0d86edec9ed2728d9619679c9e0003dfede5a10645603f13112898096a9d4`。
- 源码提交 `8a61a52`；回滚：`git revert 8a61a52`。

## r88 · 2026-11-10 · 1.3.24（建议卡：评价 + 动作）
- 需求原话：「建议卡优化」。
- 提示词 v8：`dailyAdvice` 固定结构——第一句必须是明确评价（达标或接近要肯定，差就说清差什么），后面一句给今天/明天动作，动词开头、≤40 字；不复述界面已有的热量/蛋白/脂肪数字；保留区间口径、items 点名具体食物、锚点优先、不做食物等价换算、最多 2 条要点 / 通知栏一行。删掉重复的数据说明与口头禅。
- 卡片：第一句单独成行加重（`.advice-verdict`），动作留 `.advice-actions`；模型把两句塞进一条消息时按句号再拆一次（只改显示）；生成完成后仍显示「已带上 N 条偏好」。
- 验收：`test-all` 61/61（更新 habit-and-training-mode 的训练提示断言，登记 §5.1）；dev-loop 1.3.24/324 全绿 29.0s，smoke 无 JS 错误。
- 真机：生成一次建议，确认评价段与「已带上 1 条偏好」都在；第二次尝试时误点到问答页，未再补截图。
- APK：`dist/qingheng-1.3.24.apk`，601,244 B，sha256 `c02010350dd112606171b3822b00fc765e0abc467f1a08aa826483c5d60bcb35`。
- 源码提交 `08f3f5c`；回滚：`git revert 08f3f5c`。

## r89 · 2026-11-10 · 1.3.26（排课不进问答历史）
- 需求原话：「当前用ai排训练计划也会被保存至问答历史记录中，请优化」。
- 根因：`native-adapter.js` 的流式 `/api/chat/stream` 在 `done` 后**无条件**写 `/api/chatlog`，把调用方的 `logToHistory:false` 丢了；缓冲路径 `/api/chat` 本来就有 `body?.logToHistory!==false` 判断。于是「AI 排今天」和训练问答这两个工具调用被当成问答记录存下来。
- 修复：流式路径补同样的判断。
- 清理：启动后一次性删除 question 以「请为今天排一个按顺序执行的训练清单」开头的旧记录（固定机器提示才删，用户问题不动），localStorage 标记只跑一次，删完提示「已清理 N 条」。
- 验收：`test-all` 61/61（structure-phase 新增 2 条契约）；dev-loop 1.3.26/326 全绿 29.0s；装机后问答页 dump 已无「排一个按顺序」条目。
- APK：`dist/qingheng-1.3.26.apk`，601,243 B，sha256 `14b9b2d3f38f96e2507e4f9723b34e873d6ba3b44d18611ec7b4316db35f0717`。
- 源码提交 `cf8325b`；回滚：`git revert cf8325b`。

## r90 · 2026-11-11 · 1.3.27（训练：一键记录 + 照上次练）
- 需求原话：「优化APP训练功能，参考主流健康健身app，使该功能使用更符合用户操作直觉」。
- 诊断：清单与执行之间断着——看完「今日清单/AI 顺序」要跳到训练日志重新输入动作名；每天的动作又高度重复。主流 App 是「看清单 → 点动作 → 记实际组次」+「重复上次训练」。
- 改动：① `aiPlanRowHtml` 与今日清单每行加「记录」，`startLoggingFromPlan()` 把动作并入今天（已存在则跳过）、切到记录→训练、滚到该行并聚焦负重；② `renderTrainingLog(rowsOverride)` 支持预填，训练日志加「照上次练」，取最近一次训练预填动作/组/次/负重（只改草稿，不落库）。
- 验收：`test-all` 61/61（structure-phase +2、training-presets 断言改签名并登记 §5.1）；dev-loop 1.3.27/327 全绿 36.3s，smoke 无 JS 错误；真机点「照上次练」，表单填出深蹲 4/6/40、卧推 4/6/45。
- 观察未修：训练页在「为什么这样排」与「今日顺序」之间仍有一段空白（约 200px），原因未查明，下轮先查 disclosure 折叠后的高度占位。
- APK：`dist/qingheng-1.3.27.apk`，605,339 B，sha256 `8b1fd4bbe2a3700fc6eadbbca936b3d353b062d6620333ccbe980ce83d4ce631`。
- 源码提交 `bce43f6`；回滚：`git revert bce43f6`。

## r91 · 2026-11-11 · 1.3.28（配片重量 + 训练概览）
- 需求原话：「杠铃类健身项目两边加片，没法每次加2.5kg重量，请优化渐进式负荷ai建议训练算法，使推荐的动作重量用户可实现可照做。同时优化界面布局，使健身项目可视化，让健身数据与饮食数据打通。」
- 诊断：`generateWeekPlan` 按 `×1.025` 四舍五入到 0.5 kg，100 kg 会给出 102.5、60 kg 给 61.5——健身房里不一定有 1.25 kg 片，建议不可执行。
- 算法：新增 `loadableWeightKg(name, kg)`——杠铃 = 20 kg 空杆 + 每侧 2.5 kg 的整数倍（60→65），哑铃 2 kg、器械 5 kg 递增，自重返回 null；若 +2.5% 落回同一档则至少进一档。`planItemFromRow` 与 `generateWeekPlan` 都过这一层；AI 排课提示词同步写死规则。
- 界面：训练页顶部新增「训练概览」卡——本周训练次数、本周容量、今日蛋白 + 7 天容量柱 + 「今天摄入 X / 目标 kcal · 蛋白 Y g」；数据来自 habits/exercises 与 meals/effectiveProfileForDate，训练与饮食同屏。
- 验收：`test-all` 61/61（新增 2 条契约；改 analysis-layer 65/55、records-panels headings、render-guard 正则，均登记 §5.1）；dev-loop 1.3.28/328 全绿 29.8s；真机截图确认概览渲染（本周 1 次 / 4,560 kg / 蛋白 —/142 g）。
- 未修：概览卡与训练计划卡之间仍有约 90px 空白，未查明来源，继续留在下轮观察。
- APK：`dist/qingheng-1.3.28.apk`，605,339 B，sha256 `a8a0759ecddfd19682a2d1b64b61e7582fcdcfb37e045f29ae0f7453a38f8db9`。
- 源码提交 `0ed96d9`；回滚：`git revert 0ed96d9`。

## r92 · 2026-11-11 · 1.3.29（重新生成本周 + 问答数据面）
- 需求原话：「生成本周安排功能与保存设置功能重叠，无法重新生成本周计划，并确认是否可根据用户需求调整训练计划？该如何实现？同时让问答功能可正常获取用户饮食健身数据」。
- 诊断：`pref-save` 只做 savePlanPrefs + renderWeekPlan；缓存指纹（偏好 + 基线 + 周数）没变就复用旧计划，等于「保存了但没生成」。计划卡也没有单独的重新生成入口。
- 修复：`regenerateWeekPlan()` 清本周缓存 + 置 `forceWeekPlan` 后重算；`pref-save` 改为保存并强制重排；计划卡标题栏加「重新生成」（偏好不变也能换一版），真机点击后出现「已按当前偏好重新生成本周安排」。
- 问答：`chatDataContextCompact` 增加最近 7 天训练（动作/容量）与最近 3 天餐食明细（cap 10 条）；前端 `deepIntent` 加入训练/饮食/身体关键词，短问题不再一律走只带三天汇总的快速档。
- 调研：新增 `docs/design/24-fitness-app-research.md`——跟练 / 力量记录 / 自动排课 / 饮食一体四类对照；Keep 的核心是减少决策；轻衡 P1–P5 缺口：逐组记录+休息计时、只换今天一个动作、跳过/顺延、训练饮食双向入口、课后总结。
- 验收：`test-all` 61/61（structure-phase +2）；dev-loop 1.3.29/329 全绿 29.2s，smoke 无 JS 错误。
- 未验证：问答仍没在真机用一个中文短问题实测（adb 输入受输入法影响），只做了代码与上下文路径核对。
- APK：`dist/qingheng-1.3.29.apk`，605,339 B，sha256 `cdfbe9f63da1ab01b11058795645ad7f92a845d05afbc38fa0fe18f245d541dd`。
- 源码提交 `c1593a9`；回滚：`git revert c1593a9`。

## r93 · 2026-11-11 · 1.3.30（逐组模型 + P1–P5）
- 需求原话：「强调可视化与美观性，并为APP提供流畅的过渡动画（效果参考opus5.5模型）。实现P1-P5优化。主要方向为热量与训练一体，自动排课，用户可修改重量组数。当前训练记录功能过于简陋，实现数据模型改动。」
- 数据模型：`exercises[].setDetails[]` 每组 `{reps, weight}`；`sets/reps/weight` 保留为摘要（组数/首组/最大负重），旧记录按原值展开；后端校验 ≤30 组、次数 0~200、负重 0~500。
- P1：记录行改成逐组（次/kg/删除），「+ 加一组」复制上一组；「组间休息」90s 倒计时，再点取消。
- P2：AI 清单每行「换」，从同模板预设换一个未使用动作；P3：「顺延到明天」复制清单到明日并清空今天。
- P4：今日能量卡加「今天训练 N 个动作 · 容量 X kg」入口；P5：保存后课后总结（容量/组数/对比上次/下次建议），0.32s 入场动画，reduced-motion 关闭。
- 验收：`test-all` 61/61；dev-loop 1.3.30/330 全绿；真机逐组行、休息 1:26 倒计时、保存后「本次训练」总结均出现；测试写入已用「清空今天的训练」清除，概览回到 1 次 / 4,560 kg。
- 未做：逐组勾选与自动进入下一组、换动作后重量按器械重算、训练消耗并入热量收支（当前只同屏展示）。
- APK：`dist/qingheng-1.3.30.apk`，609,436 B，sha256 `d86b0cb8c8bfd896fe2c7c54d358bab50071864f8a313fd18245cc682c7c9870`。
- 源码提交 `6b89e2a`；回滚：`git revert 6b89e2a`。

## r94 · 2026-11-11 · 1.3.31（逐组完成 + README 同步）
- 承接 r93：每组加完成圆点，勾选即实心并自动开 90s 组间休息；换动作后按新器械重算配片负重。
- README 同步：version 1.3.17→1.3.31、tests 58→61、APK 587→595 KB、dev-loop 示例改 1.3.31/331，功能地图补逐组/休息/课后总结。
- 验收：`test-all` 61/61；dev-loop 1.3.31/331 全绿 29.4s；真机勾选一组后圆点变实心、按钮显示「休息 1:26」。未保存测试数据。
- GitHub：origin 推送连续 TLS 握手失败（schannel 与 openssl 后端都失败），localmirror 已推；待网络恢复后补推。
- APK：`dist/qingheng-1.3.31.apk`，609,436 B，sha256 `8afe5f75e4d60400b3197bc611a97607b9795b776919a05f604849d773f1cdc9`。
- 源码提交 `93bf095`；回滚：`git revert 93bf095`。

## r95 · 2026-11-11 · 1.3.39（记录-训练页美术重做）
- 需求原话：「审视APP轻衡的美术设计，模仿opus5.5模型的审美去判断记录-训练功能各个选项按钮含义是否明确，页面布局是否合理，美术风格是否足够凝练，选项框便签堆叠是否美观？列出清单并逐一实现优化，并按opus5.5模型的美术要求验收。」
- 诊断（像素级）：记录页字段是「灰底 + 只留深色底边 + 12px 圆角」，在 480dpi 上底边圆角端点悬在填充外 10 设备像素（填充止于 y≈1352、深线在 y≈1363），所以每个输入框像两张叠着的便签——这就是「选项框便签堆叠」。另有 6 个 48px 同权重按钮、3 个 accent 角标、两个「主行动」互抢，以及训练日志里一组「已标记训练」标签配空白表单。
- 另发现功能缺陷：「添加动作」仍在生成 1.3.30 之前的旧三字段行（组数/次数/负重），没有 [data-set-row]，保存必被判「每组都要填次数与负重」。
- 美术：字段改为浅底 + 一圈发丝线；动作名改成行标题（平时无框，聚焦才长框）；组表头只出现一次；组删除 26px 幽灵 ×，动作删除移入行尾「移除」；预设动作降为 34px 描边胶囊并加小标题；主行动只留「保存训练」实心，「添加动作」退成描边；工具行改「杠铃总重 / 休息 90s / 清空今天的训练」（危险项红字靠右）；记录页角标统一降为中性色。
- 结构：周计划把连续休息日合并成「11-12 → 15 · 休息 4 天」，删掉重复的「今天的状态」三行块（只留「下一训练日」一行小注）；今日顺序改成三行式，有清单时「用 AI 排今天」降级为「重排今天」，主行动变成「全部加入今天的训练记录」；概览把本周容量升为主数字、柱顶标值、空态给「去记一餐」入口。
- 文案：已标记训练→已练·动作未填；重新生成/修改→换一版/调整偏好；按上周 +2.5%→负重 +2.5%；急慢性负荷比→负荷比（附 0.8–1.3 口径）；算一下负重→杠铃总重；组间休息→休息 90s；改成 30 分钟→改单次时长。
- 补一拍：容量原来只在增删组时重算，填完「10 次 × 60 kg」仍挂着「—」。给 #training-exercises 加 input 委托，改数即重算（真机确认 600 kg）。
- 再补一拍：概览三格的基线由 `align-items:end` 改 `start`——26/19/19 三种字号下，原来的标签会各差 4px；现在三个标签严格同一条线。
- 验收：test-all 61/61；dev-loop 1.3.39/339 全绿（测试 12.3s / 打包 12.9s / 装机 9.6s）；真机 1156×2510 四屏截图（docs/design/art/training-20261111-{1..4}.png）确认字段无双线、点「添加动作」出现带 1 组的新行并聚焦、点完成圆点变实心并起 1:29 倒计时；账本与夜间用 Chrome DPR3 静态对照（build/harness-{ledger,night}*.png）。
- 断言更新已登记：tests/training-log.test.mjs ×3（动作行字段改 data-set、12 上限 return null、剂量距离窗口 300→600）。
- 未做：周条（7 格 + 点开当天）、今日顺序拖拽排序、组间休息按动作区分、空态块替换空白行——理由见 docs/design/26-record-training-art-review.md 第五节。
- GitHub：origin 在 r95 期间连续 TLS 握手失败；1.3.44 收尾时一次推送成功（04c1ac7..29c8746），两处远端已同步。
- APK：dist/qingheng-1.3.39.apk（599 KB，sha256 0F36584C70A5C79A9199ACA0D44291D43D327C1BE18CC45BE4F79775006FD1A7）

## r96 · 2026-11-11 · 1.3.44（训练页第二轮：手账式记组 + 7 格周条）
- 需求原话：「继续，美术效果优先于表格结构」。
- 判断：第一轮把「组/次/kg」做成对齐小表，读起来先读列再读这一组；改成一整行话「◯ 1 10 次 × 60 kg」。
- 训练日志：删表头；数字放大到 20px、单位 11px 跟数字；输入框 width:auto + field-sizing:content 按内容伸缩（@supports 回落固定宽）；聚焦只长 2px 下划线；完成态圆点实心 + 数字转灰；删除钮降为 17px 幽灵 ×。
- 周计划：7 行文本 → 7 格周条（星期 + 日号 + 3px 短线：计划日半透明绿、已练实心、今天加深），点某格在下方换一行详情。
- 顺手修语义错位：标题写「本周安排」但 startDate 是下一个周一，周条按今天所在周画，导致计划日一根线都画不出来。现在周条与标题都用计划所在周（「下周安排 · 11-16 起」），并删掉重复的「每周 N 练」与「下一训练日」小注。
- 验收：test-all 61/61；dev-loop 1.3.44/344 全绿（打包 8.5s / 装机 9.1s）；真机确认 10 次 × 60 kg → 容量 600 kg、点圆点变实心起休息、点 18 号详情切到「拉 · 高位下拉…」；账本/夜间 DPR3 对照。
- APK：dist/qingheng-1.3.44.apk（599 KB，sha256 7F4CEA674C36AE9CDB5B7EE4BF32C76EA0EF71019B2A8ADAB48D1C34190FC799）。。

## r97 · 2026-11-13 · 1.3.45（动效层 v2：数字归位 + 卡片错帧）
- 需求：「落地到轻衡APP」——把上一轮选定的 Opus 味动效栈落进现有界面，不是只交清单。
- 约束裁决：AGENTS 明令不引依赖与构建步骤，所以 Motion / Number Flow 不装包，改为手写等价语义（320ms 缓出数字归位、6px 卡片错帧、页面纯淡入），零依赖、零新构建。
- 数字：`[data-count]` + MutationObserver，只挂今日能量主数字；首帧（— → 0）不滚，reduced-motion 直接落终值，tabular-nums 防抖动；数值由渲染代码整体替换时不会从 0 重滚。
- 页面：`.view` 由「translateY 4px + 淡入」改为纯淡入 220ms；卡片起 6px 归位，28ms 一档、封顶 140ms；from-left/from-right 的推入转场保持原样，不叠加第二套位移。
- 令牌：`--dur-1/2/3 = 140/220/320ms`、`--ease-opus: cubic-bezier(.2,0,0,1)`；位移上限 6px，scale 不参与。
- 验收：test-all 62/62（新增 tests/motion.test.mjs）；aesthetic-audit 无阻塞项；dev-loop 1.3.45/345 全绿（打包 13.7s / 装机 11.0s，js errors none）；真机截图 build/motion-home.png 确认 430 kcal、目标 1,848 kcal、三格营养与底栏布局均未变。
- 未验：错帧与数字滚动的逐帧手感（截图只能证明静止态），时长是否偏快需真机连点几个 tab 才判断得准。
- APK：dist/qingheng-1.3.45.apk（599 KB，sha256 23CB1506A825FF3C0FB8A3F23EB54CF1D090B9A74A8DB63D6182A411A9DB38C8）。

## r98 · 2026-11-13 · 1.3.46（第一次引入依赖：vendor 缝 + motion/mini）
- 需求原话：「在确保结构稳定的，模块化的情况下，可引入依赖 / 构建步骤」。
- 结构：新增 `vendor/`（只放 package.json、src/motion-entry.js、manifest.json）与 `tools/build-vendor.mjs`（esbuild 0.28.2 → IIFE，全局 `MotionLib`）。`assets/` 保持扁平这条不变量没破，产物是 `assets/motion.min.js`（13,718 B），`--check` 用 sha256 校验，`tests/vendor.test.mjs` 守版本/哈希/体积预算/无 eval/加载顺序/不落 node_modules。
- 采用边界（实测得出）：`motion/mini` 只导出 `animate`，且只接受元素——对普通对象会抛 `No valid elements`。所以数字归位继续用自写 rAF（含 watchdog），把「卡片错帧」交给 Motion：按真实 `.card` 顺序、6px、28ms 一档、最多 5 张、首帧不表演；CSS 里删掉 nth-child 错帧与 `cardRise`，不留两套动画。
- 降级：库缺失或动画抛错 → 卡片保持静止（先清掉内联 opacity/transform）；reduced-motion 直接不入场。
- 验收：test-all 63/63（新增 vendor.test.mjs）；dev-loop 1.3.46/346 全绿（打包 10.9s / 装机 10.6s，js errors none）；APK 599 → 607 KB（+8 KB 压缩后）；真机截图 build/motion-v2-{home,records}.png 卡片全亮，无半透明残留。
- 未验：错帧的逐帧观感、快速连点 tab 时的中断表现。
- 事故：用 PowerShell `Get-Content/Set-Content` 改 index.html 触发 GBK 二次编码并写入 BOM，已用 `git cat-file blob HEAD:...` 还原；以后改 UTF-8 源文件只用编辑工具，不经 PowerShell 文本管道。
- APK：dist/qingheng-1.3.46.apk（607 KB，sha256 F56339B250EFAE658B2B3966D369CCC168776B5F0B9DDBEC74ACEF47B43807DA）。

## r99 · 2026-11-13 · 1.3.47（左右滑动切换 tab）
- 需求：「为APP新增左右滑动切换功能」。
- 决定：不跟手。跟手要常驻 transform + 滚动锁，会和内置滚动、长按选行、输入焦点抢手势；改成松手判定，复用 switchTab 已有的 from-left/from-right 滑入，方向与 TAB_ORDER 一致（左滑 → 下一屏）。
- 阈值：水平位移 ≥56px、时长 ≤600ms、|dx| ≥ 1.6|dy|；到头不回绕。
- 排除区：input/textarea/select/contenteditable、.app-dialog、.sheet-panel、.pref-chips/.chips/.segmented/.table-wrap（横向滚动）、「我的」二层页打开时不切（避免把未保存编辑留在背后）。
- 验收：test-all 64/64（新增 tests/swipe.test.mjs）；dev-loop 1.3.47/347 全绿；真机验证 —— 左滑 今天→记录（build/swipe-1-next.png）、右滑 记录→今天（swipe-2-back.png）、纵向拖动仍在记录页滚动且不切页（swipe-3-vertical.png）。
- 未验：滑动与长按选行同时发生时的边界、平板/横屏。
- APK：dist/qingheng-1.3.47.apk（607 KB，sha256 5DCBDD59544398DFA9C37B8147B4BFF84FD82657621AE63D1E969A6942D7D0D5）。
- 在线更新可行性取证（同一轮）：设备侧 `curl https://api.github.com` 返回 200（网络通）；`GET /repos/dustSanchen/qingheng`、`/releases/latest`、`/tags` 均 404（仓库私有，匿名读不到）；manifest 无 REQUEST_INSTALL_PACKAGES、无 FileProvider；设备 Android 17 / targetSdk 35 → 安装需用户点确认，做不到静默。

## r100 · 2026-11-17 · 1.3.58（要点跟动作、理由跟 AI、休息药丸、概览动效）
- 需求原话：「完善下一个训练日（不同动作）的动作要点功能，完善为什么这样排功能（根据用户排训练动作时ai生成的内容确认），使显示要点内容与实际用户需注意点匹配。让休息时间按钮出现在用户当前训练动作视野内（调整功能位置，且优化时间变动动效）。优化训练概览视觉动画效果，以及下方文字说明。」
- 要点：旧版每模板两条固定要点（推日永远是侧平举+RPE），与当天动作无关。改为逐动作取：模板要点里点名它的那条 → 以动作名开头的规则 → 同分化标签且提到它的规则 → 兜底「接近力竭前停」；名称右对齐成 6em 一列，三条读成一张清单。
- 理由：先读 aiPlanStore(day)，逐条列出 AI 排那天时给的理由（plan-why-ai），再放本周规则依据并标清来源；AI 清单与规则并列展示，不做裁决。
- 休息：从卡片底部搬到固定药丸（底栏上方 76px），24px 环形进度 + 剩余时间；只在「记组视野内且保存按钮不在视野」或计时中出现；rootMargin 去掉底栏遮挡区，避免保存按钮被误判为可见。
- 动效：环形 1s 线性收缩、秒数每秒 0.3s 小归位（reduced-motion 全关）；概览柱状图在这周数据变化时从 0 长到目标（40ms 错帧），三个数字接 [data-count]（首帧不滚）。
- 说明文字：两行——「本周 N 练 · 容量 X kg，比上周 ±Y%」「今天摄入 … / 蛋白 100 / 142 g」；没练时写「本周还没训练（上周 9,920 kg）」。
- 顺手修 bug：①appendExerciseRow 多包了一层 .training-row，导致每加一个动作多一行空白、编号跳号（1、3、4）——改为临时容器取 firstElementChild，并在增删后统一 renumberExerciseRows；②药丸观察器把被底栏盖住的保存按钮算作可见，加 rootMargin -96px。
- 验收：test-all 64/64（新增 5 条断言：要点跟动作、清单列名、AI 理由、柱状图错帧、浮动药丸）；dev-loop 1.3.58/358 全绿（js errors none）；真机截图 docs/design/art/training-20261117-{1,2,3}-*.png；浏览器 mock（DPR3）确认 plan-why-ai 三条理由与上斜动作命中。
- 未验：真机上「为什么这样排」的 AI 分支（本地今天没有 AI 清单，只在 mock 里种了一份验证）；药丸与极短列表的避让。
- APK：dist/qingheng-1.3.58.apk（615 KB，sha256 1D6730B21B9D0D7243B227F7D7AE61F0CBD7E3C6BBDDB4A08943B9109E34D055）。

## r101 · 2026-11-17 · 1.3.60（跑步记录、训练建议迁问答、建议移出更多）
- 需求原话：「让应用可正常记录跑步数据。将今天中的“今日训练建议”功能移至问答中或问答中新增训练提问选项卡，以你为准。把今天的建议从更多收纳中移出至今天中」
- 团队协作：按用户要求启用 Agent Teams，建了 task-1/2/3 并各派一个 codex 子代理（跑步记录 / 建议迁移）；两次都在 transport 阶段 429 失败、没落任何改动，改由主代理直接执行并保留任务板记录。
- 跑步：数据层本来就有 distanceKm/durationMin，缺的是表单。日志行按动作名前缀识别有氧，切成「距离 km × 时长 分钟」+ 实时配速；读/存/校验按行区分，力量行仍要每组次数与负重，有氧行只要距离或时长；AI 计划「记录」加入后聚焦距离；课后总结与概览都补有氧口径（本周 1 练 · 有氧 2 km · 10 分钟，容量 0 时不再打 −100% 假跌幅）；Java 补 distanceKm ≤ 200、durationMin ≤ 600。
- 问答：加「问答 / 训练建议」分段，两个 record-panel 分别装聊天卡与迁入的 #training-advice；新片段 72-chat-panels.fragment.js 负责切换与 localStorage 记忆，默认问答。
- 今天：advice-card 从 day-more 剪出放回主流程（今日三样之后），更多摘要改为「身体近况 · 小习惯」。
- 测试：4 条断言按新语义更新并登记 03-global-changes §5.1（layout-four 建议位置、advice-and-training-window 位置、training-draft 跑步输入、training-log 有氧输入）；test-all 64/64。
- 真机 1.3.60：跑步 2 km/10 分钟保存成功、重启仍在、概览显示有氧口径；问答分段可切；今天建议卡在更多之前。截图 docs/design/art/training-20261117-{4,5,6}-*.png。
- 未验：有氧空值保存的提示路径、输入「跑步」触发切换，均未在真机逐步走；概览柱状图未画 km。
- APK：dist/qingheng-1.3.60.apk（615 KB，sha256 D4F9F66E07A6AEE71E45E20DD7A8F63062E7A7EC23BDD8E0C811A3AF96A6760A）。

## r102 · 2026-11-17 · 1.3.61（用油并入每道菜）
- 需求原话：「优化当前图片识别计算热量功能的精准度，把用油一点放入识别过程对应菜品部分中，不再单独需要用户去填写修改计算」
- 提示词：每道菜新增 oilGrams（已算进该菜热量与脂肪），顶层只写各菜之和、仅展示；方法档 8~18/15~30/0 g。
- 原生：逐菜解析并限 300 g；合计只在旧格式（菜里没油）时补一次整餐油，避免重复计入；mismatchNote 跟补进去的油。
- 预览：删掉「烹调用油 · g」输入框；每道菜下写「这道菜的用油 X g，已含在热量与脂肪里」；合计备注改「用油已按菜计入 N g」。
- 保存：逐菜 oilGrams 随 items 入库；meal 行仍显示总用油。
- 验收：test-all 64/64（6 条断言更新并登记 §5.1）；dev-loop 1.3.61/361 全绿。未做真机端到端估算（无可用照片/中文输入）。
- APK：dist/qingheng-1.3.61.apk（615 KB，sha256 46D8E4720632CC7C976A14A8E83A0F206CBCE863875D27B8EEEE6F3B83363D14）。

## r103 · 2026-11-17 · 1.3.62（蛋白缺口不再点名鸡胸，改中性提醒）
- 需求原话：「将两掌心鸡胸此类修饰替换为中国用户生活中更容易接触达成的食品，或仅提醒用户注意饮食」
- 原来按缺口给食物阶梯：两个鸡蛋 / 一掌心鸡胸 / 两掌心鸡胸 / 两掌心鸡胸分两餐；健身语境浓、对普通用户是额外门槛。
- 改法：只说方向——「下一餐补一份蛋白质（蛋、豆制品、奶或瘦肉）」；缺口 >30 g 时「接下来两餐各补一份」。不点名具体食物，也不回到克数等价换算（1.1.37 已删过一次）。
- 同步：p0-p1-round 断言改为守中性文案，并登记 03-global-changes §5.1；test-all 64/64；dev-loop 1.3.62/362 全绿；真机今日能量卡已显示新文案。
- APK：dist/qingheng-1.3.62.apk（615 KB，sha256 DCDF16AACCE061541AE6F22E05291EF95B601C51F09406ED55870D9C22F7A695）。

## r104 · 2026-11-17 · 1.3.63（按设计逻辑评审顺序：建议入口互通 + 数字来源脚注）
- 背景：产品设计逻辑评审的 9 条建议，按顺序先做前两条。
- ① 建议入口互通：今天页「给今天的一点建议」加一句「这里谈吃与恢复；训练怎么排见 问答 · 训练建议」，链接直达问答并选中训练分段（72-chat-panels 监听 data-go="chat" + data-chat-panel）；训练建议卡加回链「这里只谈训练安排；吃与恢复见 今天页的建议」。
- ④ 数字来源脚注：训练概览卡补一行「容量 = 组数 × 次数 × 负重（本机计算）；蛋白来自已确认餐食；估算项在记录里标「模型估算」」。
- 验证：test-all 64/64（新增 1 条断言：两处建议互相指路）；dev-loop 1.3.63/363 全绿；真机点今天页链接 → 问答页已选中训练建议，回链也在。
- 未做：第 ⑦ 条五态模板与其余 6 条留待后续轮次（需逐页改样式，单独一轮）。
- APK：dist/qingheng-1.3.63.apk（615 KB，sha256 待补）。

## r105 · 2026-11-17 · 1.3.64（撤数字来源脚注与互链；建议卡也谈训练）
- 用户要求：删除数字来源脚注；删除建议入口互通的文字与链接；让「给今天的一点建议」除了吃与恢复，也谈训练（简要点评或建议）。
- 撤销 1.3.63 的三处新增：概览来源脚注、今天页/训练建议卡互链（含 72-chat-panels 的跨页监听、对应测试断言）。
- 建议卡：adviceBody 增加 trainingToday（动作数/名称/容量/有氧距离时长）；adviceSystemPrompt 要求有训练上下文时用一句点评或建议，并要求不点名具体食材与量词。
- 验证：真机点「获取建议」返回「加20分钟快走或力量训练，今天跑步强度偏轻」——训练句已出现；test-all 64/64；dev-loop 1.3.64/364 全绿。
- ⑦ 五态模板起底（codex 子代理协作）：新增 stateBlock({kind,title,body,action}) 与 .state-block 五态样式，迁移今日时间轴、记录列表、体重趋势三处空态；
- 待办：剩余设计逻辑项（五态、记录页隐喻、计划解释合并、口径、收纳规则、首屏顺序）继续按顺序推进，皮肤暂不做。
- APK：dist/qingheng-1.3.64.apk（615 KB）。

## r106 · 2026-11-17 · 1.3.66（口径统一走了一半；计划解释合并回退）
- ⑥ 概览口径：70-rest 抽出 `weekTrainingStats(weekStart)`，本周与上周容量都走 `trainingVolumeOf`（有 setDetails 按逐组、否则 sets×reps×weight、有氧不计容量），概览不再用旧的整条汇总公式。
- ⑤ 计划解释合并：codex 子代理把「要点 / 为什么这样排」合并成一个 details，但真机验证发现两块解释整段消失（只剩动作列表），已用 `git stash` 回退该文件，保留在 stash「plan-merge-revert」里待重做。
- ⑦ 五态模板：1.3.64 已落 stateBlock + 三处空态迁移。
- 待续：⑤ 重做（带真机折叠验证）、⑥ 趋势 weeklyVolume 还走旧公式（在 50-onboarding，改动需连带 deload 判断）、③⑨②。
- 验证：test-all 64/64；dev-loop 1.3.66/366 全绿。

## r107 · 2026-11-17 · 1.3.67（计划解释合并重做完成；趋势与概览同口径）
- ⑤ 重做：把「下一个训练日的动作要点」与「为什么这样排」合成一个 details（class 同时保留 plan-cue-block 与 plan-why），展开顺序为要点 → AI 理由 → 「为什么这样排：」框架依据；不再有两个折叠块。
- ⑥ 收尾：weeklyVolume 改用 trainingVolumeOf（有 setDetails 按逐组，旧记录退回 sets×reps×weight），趋势页与概览同口径。
- 验证：真机展开合并块，要点列表、AI 理由、框架依据都在（build/v367-c.png）；test-all 64/64；dev-loop 1.3.67/367 全绿。
- 备注：合并块里 cueDay 是下一个训练日、AI 理由可能来自今天，文案已分别写「今天这份顺序…」「这一周的框架…」；若要进一步分清，可给两块各加日期标签。

## r108 · 2026-11-17 · 1.3.68（收纳规则落地：今日记录提到「更多」之前）
- ⑨「更多」收纳规则：定一条可执行规则——每天要看的留在主流程，「更多」只放低频查看/编辑入口；按此把「今日记录」从「更多」之后移到之前，order 变为 建议 → 今日记录 → 更多。
- 验证：真机今天页顺序已是记录在前、「更多（身体近况 · 小习惯）」在后；test-all 64/64；dev-loop 1.3.68/368 全绿。
- 剩余：③ 记录页三种隐喻统一、② 今天页首屏顺序（皮肤不做）。

## r109 · 2026-11-17 · 1.3.70（记录页三种表单：统一「日期在最前」）
- ③ 第一刀：训练日志原来没有日期输入，只能靠页面顶部全局日期；饮食/身体都有各自的日期字段。给训练表单加上日期行（data-default-date，随 activeDate 同步，改动即切换当前日期），三段表单从此都是「日期在最前、保存在最后」。
- 样式：日期标签不换行（.log-date .log-template span），日期输入自适应宽度；不再出现「日/期」竖排。
- 验证：真机训练日志顶部已是「日期 2026/11/17 → 模板」；test-all 64/64；dev-loop 1.3.70/370 全绿。
- 剩余：③ 的「输入节奏」层（饮食两步预览 vs 训练/身体直存）与 ② 今天页首屏顺序。

## r110 · 2026-11-17 · 1.3.71（训练保存前加核对；身体保持直存）
- ③ 输入节奏：按用户定夺——身体直存，训练新增核对步骤。点「保存训练」先弹核对：动作数 / 组数 / 容量 / 有氧距离时长（有氧不再显示 0 组），确认后才落库，取消则留在表单。
- 饮食的两步预览保持不变（核对份量是必要步骤）。
- 验证：test-all 64/64；dev-loop 1.3.71/371 全绿（js errors none）。**真机核对弹窗未走通**：测试过程中误触导致页面切换（还启动了休息计时），未截到弹窗；代码路径为 saveTrainingLog 校验后 → askConfirm → api，待下次真机手动点一次确认文案与取消行为。
- 剩余：② 今天页首屏顺序；⑧ 皮肤不做。

## r111 · 2026-11-18 · 1.3.73（首屏顺序：状态 → 今天做什么 → 数字）
- 参考 Oura / Whoop 的「状态先行」：首屏先给一句今天的结论，再给要做的事，最后才展开数字。
- 结构：在页眉与卡片之间加 `#today-brief`（今天 N 餐 · 蛋白 X / Y g · 训练 N 个动作；没记录就写「今天还没记录 · 训练未记」）；「今日三样」提到「今日能量」之前，能量环与体检下沉到第二屏。
- 样式：状态句用 ink-soft、tabular-nums、下边一条发丝线与表单分隔；不做卡片、不加色块。
- 验证：真机首屏已是「状态句 → 今日三样 → 今日能量」；test-all 64/64；dev-loop 1.3.73/373 全绿。
- 取舍：未记录时首屏是一张表单（行动优先）；若嫌重，下一步可把空态三样折叠成一行摘要 + 「开始记录」，但那会让首次记录多一步。
- 剩余：⑧ 皮肤不做；设计逻辑 9 条至此全部收口。

## r112 · 2026-11-18 · 1.3.75（首屏不再直接铺表单：三样收成摘要，一步展开）
- 用户反馈：首屏是表单太丑，美术优先，多一步没关系。
- 改法：「今日三样」默认收成三格摘要（训练 / 睡眠 / 体重 + 状态值），下面一个「记录三样」按钮；点开才展开原表单，保存后自动收回（dailyThreeEditing 清空）。
- 样式：三格用 ink + tabular-nums，标签小字；按钮用 subtle 全宽；摘要不再重复「每天 30 秒」那句（原来重复了两次，已删）。
- 验证：真机首屏为 状态句 → 三样摘要 → 今日能量；点「记录三样」展开表单正常；test-all 64/64；dev-loop 1.3.75/375 全绿。

## r113 · 2026-11-18 · 1.3.78（首屏去噪：去掉重复状态句、三样按钮点名缺项、空能量卡收起来）
- 用户反馈：填写后首屏信息仍过多、没有重点，要求从美学与操作逻辑再优化。
- 去重：删掉 1.3.73 新增的独立状态句（与手记条、三样 tag 重复，且训练状态判断还不准）。
- 操作逻辑：三样摘要的按钮按缺口命名——2/3 时写「补 体重」，不再笼统写「记录三样」；全部记完写「修改」。
- 美学：没记饮食时能量卡进入 is-empty——隐藏空环与宏量格，只留「每日目标 2,041 kcal」和「还没有餐食记录」，四个入口紧接着；卡内两栏留白同时去掉。
- 验证：真机首屏为 手记条 → 三样（2/3，补体重）→ 能量（空态紧凑）→ 体检；test-all 64/64；dev-loop 1.3.78/378 全绿。

## r114 · 2026-11-18 · 1.3.83（今日三样并入体检；体检四格去框）
- 判断：三样与体检语义重叠——睡眠同时出现在两处，训练已有日志，体重属于身体记录；三样卡是多余的一层。
- 合并：删除独立的「今日三样」卡；训练/睡眠/体重改为体检卡底部一行「补记：训练、睡眠、体重」文字入口（带 data-go=records，体重落到 measurement-weight）。记录页表单原样保留，休息日仍可在习惯表单里标。
- 体检：未记录项显示「—」而不是 0（0 会被读成「记了但为零」）；四格去掉独立边框与底色，改发丝线网格 + 状态色，减少方框感。
- 断言：daily-three-copy 与 layout-four 中「三样卡存在/收起」改为「三样并入体检」，已登记 03-global-changes §5.1；test-all 64/64。
- 验证：真机首屏为 手记条 → 今日能量（空态紧凑）→ 今日体检（发丝线四格 + 补记行），无三样卡；dev-loop 1.3.83/383 全绿。
- 说明：1.3.80/1.3.81 曾因把 `chr(8212)` 字面写进 JS 导致整屏报错（chr is not defined），1.3.82 修正为字符串。

## r115 · 2026-11-18 · 1.3.84（体检只留一行分数；补记换成带图标的胶囊）
- 体检 tag：从「达标 100/100 · 已评 1/4」改成只显示「N 分」，去掉与四格重复的已评计数；待记录时仍显示「待记录」。
- 补记：从一行纯文字改成带图标的胶囊——训练用 icon-glyph-training、睡眠用 icon-habit-sleep、体重用 icon-glyph-balance；行首写「还差」。
- 快速记录：习惯表单补了 `id="habit-training"` / `id="habit-sleep"`，胶囊带 data-focus，点到就落到对应字段；体重仍落 measurement-weight。
- 断言：daily-three-copy / layout-four 的类名从 check-missing 改为 check-fix-row；test-all 64/64。
- 验证：真机体检显示「29 分」，补记行是「还差 秤 补体重」胶囊；dev-loop 1.3.84/384 全绿。

## r116 · 2026-11-18 · 1.3.90（体检改成完成度条；补记胶囊可跳转已验证）
- 去重：体检四格不再复述热量/蛋白/脂肪数字（能量卡已有环与宏量格），改成四根竖向完成度条 + 图标 + 标签；右上角只留「N 分」。
- 低值可见：完成度条最小高度 6%，避免 170/2041 这类低比例看起来像没记；未测项用虚线空轨。
- 图标复用：热量/蛋白/脂肪/睡眠四个 metric 图标直接放在条上方，与补记胶囊的 训练/睡眠/体重 图标同一套。
- 跳转：补记胶囊改成 `href="#records"` 的锚点（走 hash 路由，不依赖运行时绑定），点击后聚焦字段；真机点「补体重」→ 记录·身体、体重输入框聚焦并弹数字键盘（build/v390-jump3.png）。
- 教训：连续 adb 点击时页面滚动会改变控件位置，y 坐标必须每次重新截图确认；前两次「点了没反应」是坐标落在空白处，不是功能坏了。
- 验收：test-all 64/64；dev-loop 1.3.90/390 全绿。

## r117 · 2026-11-18 · 1.3.92（快速记录去重后缀；首页去拍照；体检一行点评；身体两样一次记）
- 用户四条原话：「快速记录餐品时会记录两个快速记录」「首页拍照功能多余」「今日体检可视化图像下方有两行点评，请优化整合」「优化记录-身体中的布局和按钮排版，使用户可快速记录当天睡眠体重」。
- 快速记录：名字后面不再补「（快速记录）」。原来 `source.name + （快速记录）`，而源餐名本身可能已经是复制来的，于是叠成两层；餐食行本来就有「复制」标签，后缀完全多余。新增 `stripQuickTag()`，复制/列表/行渲染都过一遍，老记录显示时一并清掉（真机：复制「去皮鸭腿（酱香味，包装即食）」保存后行名干净，无后缀，`build/v391-name.png`）。
- 首页：删掉「拍照」胶囊。它跳到记录页再合成点击隐藏的 file input，「记一餐」进去就是同一张卡、同一个「添加照片」入口，多一步且容易误触拍照；快捷操作改 3 列。
- 体检：评价与「今天优先」合成一行。两行说同一件事，动作句还把评价里的数字重复一遍。现在一句 = 结论 + 差多少 + 一个动作（如「今天整体到位 · 睡眠在区间内，保持就好。」），动作按「哪一项 + 偏哪边」取（热量低 = 加主食、热量高 = 晚餐只吃蛋白和蔬菜）。顺带修掉一处自相矛盾：没有任何记录时原第二行会说「记录都在区间内，保持就好」。
- 记录·身体：新增「今天两样」卡（体重 + 睡眠并排、一个「保存今天」主按钮），面板打开第一张就是它。体重与睡眠字段从「身体数据」「日常习惯」两张长表里移走（各只留一个家），两张表的保存按钮降为次按钮，一个面板只有一个主按钮。
- 顺手修的隐患：同一天重复记体重会新增测量行，而「身体近况」按日期取第一条 → 显示旧值。新增 `measurementRowFor(date)`，快速卡、身体数据表、对话草稿写入都带当天那行的 id 更新；空着的格不再写成 null（避免只改腰围把体重冲掉）。
- 减法：删掉 1.3.83 之后就已经不存在的「今日三样」卡残留代码（renderDailyThree / submit 处理器 / DAILY_THREE_KEY）。
- 断言：改 daily-three-copy（三样 → 今天两样）、layout-four（去拍照胶囊 + 3 列）、advice-and-training-window（习惯预设只留步数/饮水）、records-panels（身体面板多一张卡）；新增 `tests/body-quick.test.mjs`。全部登记 `03-global-changes.md §5.1`。
- 验收：test-all 65/65；aesthetic-audit 无阻塞项；dev-loop 1.3.92/392 装机 + smoke 无 JS 错误；真机截图 `build/v391-today.png`（三个胶囊 + 一行体检结论）、`build/v391-body2.png`（今天两样：体重/睡眠并排 + 保存今天）、`build/v391-saved.png`（已记录：睡眠 7 小时）。
- 未验证：体重分支的写库只做了代码与断言核对——真机没有输入体重（那会往真实记录里写一条假测量，且 app 没有删除测量行的入口）；只提交了「睡眠」这一支，走的是同一个处理器与同一个 upsert 助手。
- 护栏修复（顺带）：`tools/dev-loop.ps1` 是无 BOM 的 UTF-8，Windows PowerShell 按 GBK 解码，把第 31 行中文注释和紧随其后的 `if ($Version -match ...) { $VersionCode = ... }` 并成了一行——于是 `$VersionCode` 一直是 0，「version sync」这步静默空转（0.0s、无输出），本轮就出现了「装机 1.3.91 / 关于页 1.3.90、versionCode 还是 390」。给脚本加 UTF-8 BOM 并把 sync 改成直接调用 node（跳过原因会打印），实测重新输出 `version synced to 1.3.92/392`。
- APK：`dist/qingheng-1.3.92.apk`；回滚：`git revert <本轮提交>`。

## r118 · 2026-11-18 · 1.3.95（训练日看动作；删训练情况；图标链接去下划线；计划从今天起）
- 用户四条原话：「训练情况根据用户当天是否保存训练动作判断，不需要让用户主动填写」「删除日常习惯中的训练情况选项」「删除功能图标中的下划线」（补充：指图标入口里的跳转超链接文字）「将训练中的下周安排调整为本周安排，日期显示当日起后续日期训练计划安排」。
- 训练日推导：新增 `trainedOn(date)`（当天有带名字的动作即训练日），取代手填的 `habit.training`。前端四处（热量区间 `intakeRangeForDate`、体检补记胶囊、今日小习惯、训练洞察）与原生两处（`MainActivity.trainedOn`、`AlarmReceiver` 的周报载荷）都改成读动作；训练日志的状态标签不再有「已练 · 动作未填」这一态。真机验证：保存跑步 2km/10min 后每日目标 1,848 按休息日 → **2,041 按训练日**，补训练胶囊消失（`build/v395-today.png`）；随后「清空今天的训练」把测试记录清掉，数据复原。
- 删选项：「日常习惯」只剩日期 / 步数 / 饮水，并写明「训练日按当天保存的训练动作判断，不用在这里填」。手动填的 `training` 不再写入，旧数据里的 true 不再被认作练过。
- 去下划线：体检补记胶囊是 `<a class="check-fix">`，浏览器默认下划线一直挂着（用户看到「补体重」下面有横线）。`.check-fix{text-decoration:none}`，图标入口里的链接文字不再带线；正文里的行内链接（如「去记一餐」）保持原样。
- 计划从今天起：`planStartDate()` = 正在看的这一天，`renderWeekPlan` / `weekPlanToday` / 「换一版」共用；周条 7 格从今天排到 +6 天，标题回到「本周安排 · 11-18 起」。
- 顺带修的两个洞：① 1.3.44 把 7 行表格换成周条时，「一键排课」按钮连同 handler 一起被留在了一段死表达式（`box.innerHTML = …; + '<div…'`）里，按钮从此不渲染——本轮删掉死表达式并把按钮接回来（`build/v393-plan2.png`）；② 能量卡「按训练日 / 按休息日」原本靠 `basis` 文本里找「训练」二字，有目标预设时 basis 讲的是口径，于是 2,041（训练日上限）会标成「按休息日」。改成读 `range.trained` 布尔值。
- 断言：新增 `tests/plan-from-today.test.mjs`；改 training-day-budget（推导式取代手填标记）、training-library（RPE/「建议」跟着周条详情走）、records-panels（训练段标题少一条）；登记 §5.1。
- 验收：test-all 66/66；aesthetic-audit 无阻塞项；dev-loop 1.3.95/395 装机 + smoke 无 JS 错误。真机截图：`build/v393-habit.png`（习惯表无训练情况）、`build/v393-plan3.png`（本周安排 · 11-18 起，7 格从今天）、`build/v395-today.png`（按训练日）、`build/v395-nav.png`（一键排课）。
- 未验证：`trainedOn` 在原生侧（周报/推送）只做了代码核对与断言，没有真跑一次带训练的推送；计划与旧的「下周一」缓存键不同，旧缓存不会被读到，也没有清理（localStorage 里会留一条旧 key）。
- APK：`dist/qingheng-1.3.95.apk`（623 KB）；回滚：`git revert <本轮提交>`。

## r119 · 2026-11-18 · 1.3.98（器械卧推独立收录；自重动作可记可分析）
- 用户原话：「进一步迭代APP的健身数据库，区分训练中的卧推与器械卧推，确保一些没有配重的健身项目也可正常记录和纳入分析考量」。
- 数据库：动作说明库里「坐姿推胸」升级成「器械卧推」（keys：器械卧推 / 坐姿推胸 / 器械推胸 / 坐姿推举机），要点改成固定轨迹 + 器械档位，不再借用杠铃卧推的肩胛/落点说明；「推」模板的常用动作胶囊加入「器械卧推」，一格就能选到。名字匹配按最长关键词，`卧推`、`器械卧推`、`史密斯机卧推` 各自落到自己的说明。
- 配重档位也分开了：`loadableWeightKg` 改成先过 `isBodyweightMove`，自重动作一律 null；杠铃卧推保 20 kg 空杆 + 5 kg 阶梯（8→20、63→65），器械卧推按 5 kg 档位（8→10、62→60）。
- 自重可记：新增 `isBodyweightMove(name)`（引体向上/俯卧撑/双杠臂屈伸/双臂杠屈伸/平板支撑/卷腹/悬垂举腿/山羊挺身/臀桥；带负重/哑铃/杠铃/壶铃/配重/史密斯/器械前缀的变体不算）。保存校验从「每组都要次数与负重」改成「每组要次数；配重动作才要负重」，负重格占位写成「自重」，动作脚注从「容量 —」变成「容量 N 次」。模型常把自重写成 0 kg，落库前与显示时都归一成空（不再出现「6 次 × 0 kg」）。
- 纳入分析：新增 `trainingStatsOf()` 给三个口径（kg 容量 / 组数 / 自重次数）。课后总结多一行「自重 N 次（按次数计，不折算成 kg）」，自重课的下一步建议改成「每组 +1 次」；训练概览在整周没有 kg 容量时把主数字换成「本周自重 N 次」，柱状图按同一单位绘制（不混 kg 与次），说明行加「自重 N 次」。
- 计划：`generateWeekPlan` 对自重动作不加重量，改成下次每组 +1 次（减载周不加），note 写明这条口径；AI 排今天的提示词加两句——器械与自由重量要写清是哪种（卧推 / 器械卧推 / 史密斯机卧推 是三个不同动作），自重动作不要编造重量。提示词版本 8 → 9。
- 别名兜底：模型把「双杠臂屈伸」写成「双臂杠屈伸」时，说明库与自重判定都认这个写法（真机上就是这么一条数据，一开始被当成配重动作显示 0 kg）。
- 断言：新增 `tests/training-bodyweight.test.mjs`（19 条，含行为断言：自重判定、档位取整、三口径统计、说明匹配、别名）；改 training-log（校验文案）、ci-and-versions / modularization（提示词版本 9）；登记 §5.1。
- 验收：test-all 67/67；aesthetic-audit 无阻塞项；dev-loop 1.3.98/398 装机 + smoke 无 JS 错误。真机：`build/v398-log.png`（引体/双臂杠屈伸显示「自重」、容量按次）、`build/v398-confirm.png`（核对框「5 个动作 · 15 组 · 容量 2,720 kg · 自重 30 次」）、`build/top.png`（本周 2 练 · 容量 2,815 kg · 自重 24 次）。测试记录已用「清空今天的训练」还原（`build/clear3.png`）。
- 未解释：真机这次「核对框 30 次自重 → 概览 24 次」对不上 6 次；数据是我在表单里反复加/删组次的测试记录，静态断言覆盖了统计函数，但没有在真机复现出一个干净的对照。
- APK：`dist/qingheng-1.3.98.apk`（623 KB）；回滚：`git revert <本轮提交>`。

## r120 · 2026-11-18 · 1.3.99（目标要求接上证据表：组数/RIR/速率，训练与饮食同一张表）
- 用户原话：「请结合全网优质数据库或视频拆解，为健身编排提供更权威有效的数据库，且针对用户当前的身材目标提高或降低相应要求。饮食摄入同理。」
- 证据表：新增 `docs/design/27-evidence-requirements.md`，把「每个目标练多少组、每组多少次、离力竭留几次、每周涨/掉多少」写成一张可查的表，每个数字都带来源：
  Schoenfeld 2017 剂量-反应元回归（10+ 组/周）[DOI](https://doi.org/10.1080/02640414.2016.1210197)、Baz-Valle 2022 容量系统综述（约 18~20 组略优但更疲劳）[PMID](https://europepmc.org/article/MED/35291645)、ACSM 2026 立场声明（接近力竭比绝对重量更关键）[PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)、Morton 2018 蛋白元回归（1.6 g/kg 平台、上界 2.2）[DOI](https://doi.org/10.1136/bjsports-2017-097608)、Iraki 2019 off-season（10~20% 盈余、每周 +0.25~0.5%）[DOI](https://doi.org/10.3390/sports7070154)。
- 目标要求：`GOAL_PRESETS` 每个目标新增 `muscleSetsPerWeek / reps / rir / ratePctPerWeek`，并按证据改了三处旧数字：增肌盈余 −8% → −10%（落进 10~20% 区间）、蛋白带 gain 1.6~2.2、recomp 2.0~2.4、cut 2.3~2.6、lean 2.2~2.6（缺口期按去脂体重口径折算）。
- 用到的地方：训练计划卡多一行「本周要求（目标）：每个大肌群 x~y 组 · 每组 a~b 次 · RIR c~d」；AI 排今天的请求里带同一行要求；「身体档案与目标」的测算结果多两行（训练要求 / 体重速率，含按当前区间的实际速率，超带只提示不改数）；非 AI 周计划在增肌期给当天第一个动作 +1 组（上限 5 组），减脂/薄肌不加量。
- 数据库：`training-principles.js` 末尾追加 5 条证据规则 + 5 个新来源（带 url），priority 排在中文三分化之后、社区口述之前；`training-library` 的「13 个来源」改成「至少 13」。
- 版本：`RULES_VERSION` 1 → 2（口径表变了，关于页现在显示 口径 v2）；`PROMPT_VERSION` 仍为 9。
- 断言：新增 `tests/goal-requirements.test.mjs`（文档表格与 `GOAL_PRESETS` 逐格比对、方向性检查、引用链接、提示词与页面用到同一张表）；改 lean-targets / targets（蛋白带上界与两行新文案）、training-library（来源数）。
- 验收：test-all 68/68；aesthetic-audit 无阻塞项；dev-loop 1.3.99/399 装机 + smoke 无 JS 错误。真机 `build/v399-req.png`：计划卡显示「本周要求（薄肌（线条））：每个大肌群 12~18 组 · 每组 8~15 次 · RIR 1~2」。
- 未验证：真机上没有重新点「按目标重新测算」，所以「训练要求 / 体重速率」两行只有断言与文档核对，没截到图；证据规则目前只进「建议库/计划要点」的引用池，没有在真机点开逐条看。
- APK：`dist/qingheng-1.3.99.apk`；回滚：`git revert <本轮提交>`。

## r121 · 2026-11-18 · 1.4.00（组间休息：到点提示音 + 时长按动作与目标）
- 用户原话：「为倒计时结束添加清脆的音效（例如dsh单次任务执行完毕时的音效），提醒用户计时结束，同时确认计时能否根据健身项目不同而不同。」
- 音效：Web Audio 合成的两枚正弦音（E6 1318.5 Hz → A6 1760 Hz，间隔 150 ms，各约 0.4 s），不打包音频文件、不调用系统音量；有振动马达时再轻碰 120 ms。自动播放策略要求手势：标记「组完成」那一下先 `primeRestAudio()` 解锁，否则到点 AudioContext 仍是 suspended、一声不响。缺 AudioContext 时安静地不响（返回 false），不抛错。
- 时长：`restSecondsFor(name)` 按动作与目标给——复合/大重量 120~150 s、孤立 60~90 s、自重 75~90 s、有氧不计时；增肌与保持用长档，减脂/薄肌用短档（缺口期恢复更慢）。`startRestTimer(restart, seconds)` 接受时长，环形进度与 aria-label 都跟实际时长走（以前写死 90）。
- 证据：新增 `docs/design/27-evidence-requirements.md` 第 4 节，引 Grgic 2018 休息间隔系统综述（Sports Med, DOI 10.1007/s40279-017-0788-x）与 ACSM 2026 综述；标注「长休息优于 1 分钟」的适用范围。
- 断言：新增 `tests/rest-timer.test.mjs`（含行为断言：用假 AudioContext 跑 `playRestChime`，确认排了 2 个 sine 振荡器、起停与包络、振动一次、无 AudioContext 时返回 false）；改 `structure-phase`（`restEnd` 不再是写死的 90000、点组完成要带 `restSecondsFor(name)`）。
- 验收：test-all 69/69；aesthetic-audit 无阻塞项；dev-loop 1.4.00/400 装机 + smoke 无 JS 错误。真机：`build/v400-rest.png`（卧推标记完成后药丸显示「休息 1:59」，即 120 s 复合档）、`build/v400-iso2.png`（空白/短档动作 60 s）、`build/v400-done.png`（计时归零后药丸回到「休息 60s」，长度记住上一次）。
- 未验证：**我听不到声音**，所以「到点真的响」只做了两件事——用假 AudioContext 断言音频图正确、真机确认计时归零时应用进程（pid 10191）有 48 kHz 立体声 AudioTrack 在跑；没有录音或频谱证据。另外页面切后台时 WebView 会节流定时器，声音可能晚几秒（已写进文档）。
- APK：`dist/qingheng-1.4.00.apk`（627 KB）；回滚：`git revert <本轮提交>`。

## r122 · 2026-11-19 · 1.4.00 → 1.4.01（排今天：收空态、接上周计划轮换、记录后从清单移除）
- 起因：追问「用 AI 排今天」的请求到底缺什么数据。这轮先查清口径，再只改有证据支持的部分。
- 结论（不改的部分）：排今天**不需要** `anchors` 与 `preferences`。清单请求走 `focus=plan`，后端 `planFocus` 分支跳过 `chatDataContext`——锚点只在那份深上下文里注入；`tests/meal-date-java.test.mjs` 与 `tests/ai-plan-focus.test.mjs` 各自钉住了这条设计，plan 分支也不读 `body.anchors` / `body.preferences`。清单素材本来就在用户消息里（目标 / 体重 / 分化 / 器械 / 时长 / 基线 / 训练库规则）。两处试改（补字段、放开深上下文）都被断言拦下并回滚，等于又验证了一次设计。
- 空态：今日顺序为空时不再渲染「今天还没有排训练顺序」的 `stateBlock`，只清空容器；「全部加入」按钮照旧隐藏。
- 轮换：`askAiPlan` 读 `readWeekPlanCache(activeDate)`，取当天的 `template` 写进提示词「今天按周计划应练：推日（push）」；没有缓存就不加这句。此前模型不知道今天是推还是拉——问答说练腿、排今天却排推，分歧就在这里。
- 记录后同步：`addExercisesToToday` 保存成功后，把已进训练记录的动作从 `aiPlanStore` 过滤掉（未进记录的保留），不再出现「练完还挂在清单里」。
- 验收：test-all 69/69；aesthetic-audit 无阻塞项；dev-loop 1.4.01/401 装机 + smoke 无 JS 错误。真机 `build/r122-02.png`（本周安排 11-19 起 ·「今天 · 推 · 卧推、杠铃卧推、上斜哑铃卧推」）、`build/r122-05.png`（点周六格显示「11-21 · 拉 · 哑铃单臂划船、引体向上… 等 4 个」，说明轮换数据当天可取）。
- 未验证：①空态没截到图——今天已有 5 个动作的清单，点本周格只切详情、不改 `activeDate`，没有「既空又不破坏用户清单」的入口；②轮换提示要一次真实模型调用才看得见，本轮没花这次调用；③记录后从清单移除会写入真实训练记录，未在真机跑。三条都只有代码与断言层面的证据。
- 断言变更登记 `03-global-changes.md §5.1`（版本字面量同步 + 本轮回滚说明）。
- APK：`dist/qingheng-1.4.01.apk`（631 KB）；回滚：`git revert <本轮提交>`。

## r123 · 2026-11-19 · 1.4.01 → 1.4.02（本周安排切日期：动作要点与训练日志跟着走）
- 用户原话：「确保训练计划下方切换日期时，能回显对应的今天动作要点，以及当天记录的训练日志，并支持修改。」
- 起因：点周条只改 `#week-detail` 那一行预览，`cueDay` 仍按 `activeDate` 取。于是切到 11-21（拉）时，详情行写拉日，下面却还挂着「今天（推）的动作要点」，训练日志表单也还是 19 号——同一块屏幕上三处读的不是同一个日期。
- 改法：点周条不再只是预览，直接 `setActiveDate(day)`。动作要点、训练日志表单、今日顺序都读 `activeDate`，切过去一起跟；训练保存本来就写 `date: activeDate`，所以改完直接落到那一天。
- 「今天」只留给日历上的今天：详情行前缀、周条加深、要点标签都改用 `localDate()` 判定。切到别的一天时标签写「11-21（推）的动作要点」，那天是休息日则写「下一个训练日（11-22）…」并默认收起。
- 选中格恒等于正在看的那天（`weekDetailDay = activeDate`）；删掉随改动失效的 `weekEndPlan` / `firstPlanDay` / `cueToday`，不让它们变成死变量。
- 已知副作用：周条窗口从「正在看的那天」起算（1.3.95 的决定），所以切到 21 号后窗口变成 11-21 起、原来 19 号那版不再显示；缓存键（`qingheng.weekPlan.<起始日>`）也跟着换一条。
- 断言：新增 `tests/week-switch.test.mjs`（11 条：切日期而非预览、旧手动高亮已删、选中=activeDate、三处「今天」按 localDate、要点标签日期化、无死变量、训练日志读/写 activeDate、生成物同步）。
- 验收：test-all 70/70；dev-loop 1.4.02/402 装机 + smoke 无 JS 错误。真机：`build/r123-03.png`（点周六后标题变「本周安排 · 11-21 起」、详情「11-21 · 推 · 卧推…」、概览与蛋白随日期变）、`build/r123-04.png`（训练日志「未记录」+ 日期 2026/11/21 + 模板 推；今日顺序「未生成」，且 r122 删掉的空态提示块确认不再出现）、`build/r123-05.png`（「11-21（推）的动作要点」）。
- 未修（同类残留，需单独一轮统一文案）：「把今天这节采纳到今日清单」「一键排课 · 写入今天起 N 次」「今天还没记饮食 · 去记一餐」在切到别的一天后仍写「今天」；面板标题「今日顺序」本身也是固定名。
- 断言变更登记 `03-global-changes.md §5.1`。
- APK：`dist/qingheng-1.4.02.apk`（631 KB）；回滚：`git revert <本轮提交>`。

## r124 · 2026-11-19 · 1.4.02 → 1.4.03（P0–P2：部位单一来源、时长含组间休息、文案与关系说明）
- 用户原话：「完成上文P0-P2问题修复，并确保训练时间安排中包含了组间休息」。
- P0 部位单一来源：60 片段新增 `dayTemplateSlot` / `dayLabel` / `dayTemplateNote`，排今天的提示词与问答的训练建议都用同一句「今天按周计划应练：推日（push）」。问答侧不再自己猜部位，「排今天排推、问答建议练腿」的分歧就此消掉。没有周计划时返回空串，不编一个部位出来。
- P1 时长含休息：新增 `planItemMinutes` / `planMinutes`，每组按 45 秒执行 + `restSecondsFor(name)` 的同一档位休息（复合 120~150 / 孤立 60~90 / 自重 75~90 秒），有氧按它自己的时长。删掉固定的 `AI_PLAN_MINUTES_PER_SET = 2.5`：同为 12 组，以前显示「约需 30 分钟」，现在显示「含休息约需 45 分钟」，正好等于用户设的 45 分钟——上一轮判定的「装不满 45 分钟」其实是估算器漏算组间休息，不是模型排少了。
- P1 组数上限：`planSystemPrompt()` 里「30 分钟排 4 个动作」这类数动作个数的规则，改成按组数折算的档位（30 分钟 5~7 组、45 分钟 8~10 组、60 分钟 11~14 组），并写死单次课正式组 6~10 组（60 分钟以上才放宽到 14）。排今天的用户消息同步加「时长预算（必须满足）」「单次课正式组 6~10 组」两条。
- P2 文案：采纳按钮、一键排课、能量卡的「还没记饮食 / 摄入」都改用 `dayLabel(activeDate)`，切到别的一天写日期而不是「今天」。
- P2 关系说明：本周安排下加一句「上面按偏好与最近记录排周框架，下面的「今日顺序」是模型照它排的执行顺序；两者不一致时以今日顺序为准」。
- 断言：新增 `tests/plan-shared-template.test.mjs`（17 条，覆盖 P0/P1/P2 各自的机械契约）；改 `tests/plan-from-today.test.mjs` 的排课按钮断言（文案改成按日期拼接，不再是整句字面量）。
- 验收：test-all 71/71；aesthetic-audit 无阻塞项；dev-loop 1.4.03/403 装机 + smoke 无 JS 错误。真机：`build/r124-01.png`（今日顺序「共 12 组 · 含休息约需 45 分钟　你设的是 45 分钟」）、`build/r124-03.png`（本周要求下的关系说明、一键排课「写入今天起 3 次训练」）。
- 未验证：P0 那句共享文本只进到提示词里，没有真跑一次模型调用去比两边的部位；`planMinutes` 的真机数值没有逐项手算核对（只核到「12 组合乎 45 分钟」这一层）。
- 观察到但本轮没动：force-stop 重启后「训练偏好」摘要从「3 练 · 推拉腿」变成「4 练 · 全身」。机制像是 `00-head.fragment.js` 第 796 行启动时用 state.json 的 `prefs.planPrefs` 回写 localStorage，把本地较新的值盖掉了；这属于恢复逻辑，另开一轮核对。
- 断言变更登记 `03-global-changes.md §5.1`。
- APK：`dist/qingheng-1.4.03.apk`（631 KB）；回滚：`git revert <本轮提交>`。

## r125 · 2026-11-19 · 1.4.03 → 1.4.04（周条点日期只换预览日：不跳页，要点跟那天的动作）
- 用户原话（否掉上一轮做法）：「我要求的效果是训练计划-本周安排下方，如点击对应日期（21）后页面不跳转（可点回19号），下方显示周六 练什么动作，今天（对应动作）的动作要点，动作要点内容根据生成的本周安排具体健身项目内容变动。」
- 上一轮被否的点：点周条直接 `setActiveDate(day)`，于是周条窗口从 21 起算、整页重渲染，用户回不到 19 号那一段上下文。本轮改回「预览日」——`weekDetailDay` 只表示看哪天，`activeDate` 不动，周条窗口仍从原来那天起算，页面不跳、也不整页重渲染。
- 新增 `weekCueHtml(day, plan)`：按那天周计划里的 `exercises` 调 `libraryCuesFor(planDay)` 点名给要点，所以计划换一版、动作变了，要点内容跟着变。真机 11-21（拉）给出「哑铃单臂划船 / 高位下拉 / 引体向上」三条；休息日直接写「是休息日，不排动作要点」，不硬凑。
- 版面拆开：原来「要点 + 这份计划怎么来的」挤在同一个 details 里，切日期时没法只换要点。现在要点是独立的 `#week-cues`（默认展开），「这份计划怎么来的」单独一个 details（默认收起）。点日期只替换 `#week-cues-host` 的内容，避免整页闪一下、滚动位置丢失。
- 断言：`tests/week-switch.test.mjs` 按新契约整篇重写（15 条：不切 `activeDate`、窗口起点不受点击影响、预览日越界才复位、详情行按预览日、要点由预览日计算且点名该天动作、要点有稳定宿主、休息日不给要点、旧路径与死变量归零）。
- 验收：test-all 71/71；aesthetic-audit 无阻塞项；dev-loop 1.4.04/404 装机 + smoke 无 JS 错误。真机：`build/r125-07.png`（点 六21 后窗口仍「11-19 起」、详情「11-21 · 拉 · 哑铃单臂划船…」、要点「11-21（拉）的动作要点」含高位下拉）、`build/r125-08.png`（点 五20 →「11-20 · 休息」+「是休息日，不排动作要点」）、`build/r125-09.png`（点回 四19 → 恢复「今天（推）」）、`build/r125-11.png`（全新渲染下要点展开、理由是收起的 ▾）。
- 取舍说明：本轮不再改 `activeDate`，所以训练日志表单仍跟着 `activeDate`（今天）。若要「就在这一屏直接改 21 号的记录」，得另给一个显式入口（点了才切日期），否则必然又变回整页跳转。这一条留待用户决定。
- 断言变更登记 `03-global-changes.md §5.1`。
- APK：`dist/qingheng-1.4.04.apk`（631 KB）；回滚：`git revert <本轮提交>`。

## r127 · 2026-11-19 · 1.4.05 → 1.4.06（「这份计划怎么来的」：删掉按天的 AI 动作清单）
- 用户原话：「这份计划怎么来的中会展示当天动作安排，而切换预览日期该内容不变，会误导用户，请删除或根据每天不同动作给出不同提醒。」
- 先按「按天不同」改了一版（`aiEntries` 只认 `weekDetailDay`），真机一看还是错的：`build/r126-04.png` 切到 21 号后，块里仍是「今天这份顺序是用 AI 排的」+ 19 号的卧推/引体向上/哑铃单臂划船。根因不在取值而在结构——点日期只就地更新 `#week-detail` 与 `#week-cues-host`，这个折叠块是初次渲染时就写死的，改取值只改首屏、改不动点击后。要么给它也开个宿主并重渲染，要么把按天的内容拿掉。
- 选后者（用户给的第一条路），因为 AI 给单个动作的理由本来就逐条显示在「今日顺序」每行下面（`70-rest` 的 `ai-plan-reason`），在这个块里再列一遍纯属重复，还天然和「当前预览哪一天」脱节。
- 改动：折叠块只讲周口径（框架按训练库与最近两周记录生成 + `plan.note` + `plan.reasons`），标题从「这份计划怎么来的」改为「这周怎么排的」，明确它跟选中哪天无关；删除只为它存在的 `aiPlanEntries`（`60-training-copy` 约 682–689 行）与 `plan-why-ai` 列表。
- 断言：`tests/week-switch.test.mjs` 新增 5 条（不再含 AI 逐动作理由、标题是「这周怎么排的」、理由仍在今日顺序每行、`aiPlanEntries` 已删、`previewDay`/`aiEntries` 残骸归零）；`tests/training-library.test.mjs` 的 `the why block reflects the AI order` 按新契约改写为 `the AI order reasons live on the order rows`。两处均登记 §5.1。
- 验收：assemble 通过；test-all 71/71；aesthetic-audit `OK（无阻塞项）`，仅 WARN「强调色收敛 11 处 accent token 声明」（既有，非本轮引入）；dev-loop 1.4.06/406 装机、smoke 无 JS 错误；logcat 无 `Uncaught/SyntaxError/ReferenceError`。真机：`build/r127-04.png`（19 号展开「这周怎么排的」只有周口径三段，无动作清单）、`build/r127-05.png`（切到六 21 后要点变「11-21（拉）」三条、该块内容不变且不再提 19 号的动作）。
- 教训：改「某块内容要跟选中项变」之前，先确认这块在点击时有没有被重渲染——只改取值不改宿主，等于只改了首屏。
- APK：`dist/qingheng-1.4.06.apk`（631 KB）；回滚：`git revert <本轮提交>`。

## r128 · 2026-11-19 · 1.4.06 → 1.4.07（解释性文本：分类成册，修失效指路与字号漂移）
- 用户原话：「整理并分类APP中的解释性文本，并尝试优化或删除不影响用户使用的解释性文本，优化文本布局排版。」
- 先盘点：`index.html` 67 处 `fine-print`、123 个 `<p>`；`fragments` 里 32 处 `fine-print`、46 处 `hint`。用一次性脚本把静态段落按 view 抽成清单（`build/text-inventory.md`、`build/view-*.html.txt`，均在 gitignore 内），再逐条判处置。
- 分类落到 `docs/design/28-explanatory-text.md`：口径 `why` / 边界 `safe` / 隐私 `privacy` / 操作 `how` / 状态 `state` / 来源 `src` 六类，每类给「写什么、长度上限、放哪、什么样式」；三条硬规则：一段一件事、同一事实不写第二遍、指路必须指向存在的入口。
- 四个真问题（都不是长短问题）：
  1. **指路指向不存在的入口**：6 处文案写「我的 → 数据、外观与说明」，运行时该 hub 已被拆开，`installSubpageLayout` 把 `data`/`about` 两行搬进「更多设置」子页——用户照做找不到。统一改成「我的 → 更多设置 → 数据管理」；问答页那句「我的 → 模型连接」也改「AI 模型与密钥」（`模型连接` 只是子页小标题）。
  2. **外发授权开关放错页**：`#settings-consent` 物理上在「外观皮肤」卡片里，而皮肤卡会被搬进「外观与餐次时间」子页。移到「数据管理」子页介绍句下方（只保留 id，JS 按 id 绑定，无需改逻辑）。
  3. **说明文本字号随容器漂移**：`.card p`（0,1,1）压过 `.fine-print`（0,1,0），于是同一个类在卡片内是 13.5px、卡片外是 11px；另外 `styles.css` 第 91 行还藏着第二处 `.fine-print{…line-height:1.8}`。收成一条 `.card p.fine-print,p.fine-print,details p.fine-print{…}`，并删掉散落声明。
  4. **同屏重复**：记录页「会标记为「复制」。」与上句重复（并入引导句）；数据管理页「浏览器演示只把记录存在本机、不保存密钥。」对 APK 用户无意义（删）；致谢里的免责与同页「说明」重复（删一句，免责在应用里原本出现 6 次）。
- 排版：相邻两条说明 `.fine-print + .fine-print{margin-top:2px}`；新增 `.note-safe`（左侧 2px 发丝线）标记「边界句」，用在 BMI/体脂、问答免责、训练要点三处，让「提醒」与「数据」在视觉上分开。
- 断言：新增 `tests/explain-text.test.mjs`（14 条，守字号单一口径、收距、`.note-safe` 用法、指路只指向存在的入口、开关在 data 子页内、三条重复文案不回来）；`tests/p0-p1-round.test.mjs` 的旧断言（守「数据、外观与说明」这个失效文案）按新契约改写。两处登记 §5.1。
- 验收：assemble 通过；test-all 72/72；aesthetic-audit `OK（无阻塞项）`，3 条 WARN 均为既有（卡片阴影 6 处、字号 10 级、accent 11 处）；dev-loop 1.4.07/407 装机、smoke 无 JS 错误。真机：`build/r128-13.png`（数据管理页——外发开关就在这里，「浏览器演示」句已消失，说明文字比正文小一号）、`build/r128-15.png`（问答说明里免责句带左侧竖线）、`build/r128-11.png`+`r128-12.png`（路径 我的 → 更多设置 → 数据管理）。
- 未验证：记录页「复制一餐」卡的合并句只由断言守（该卡默认折叠，没截到）；`.note-safe` 在账本/夜间皮肤下的观感未单独截图。
- APK：`dist/qingheng-1.4.07.apk`；回滚：`git revert <本轮提交>`。


## r129 · 2026-11-19 · 1.4.08
- 改：移动端密度 CSS 优化。在 `@media (max-width: 640px)` 中收紧变量与模块间距（`--card-pad`/`--card-gap`/`--btn-h`/`--space-4` 下调，圆角统一为 10px），并将 `360px` 以下再收一轮；具体覆盖 `.app-shell` 左右内边距（16px→12px）、`.app-header`/`page-heading` 上下留白、`h1` 与卡片标题字号、`.list-row` 行间距、底部导航高度与内边距、按钮与输入框内边距，保持触控目标 ≥44px。
- 改：进一步压缩解释性文本。`30-voice` Health Connect 授权提示、`40-targets` 体脂跑道说明、`50-onboarding` 重新设置确认、`20-permissions-backup` 健康数据未授权影响句均精简；同步恢复因上一轮压缩被测试拦截的 00-head/10-rich-answer 必要文案，确保 `tests/onboarding-backup.test.mjs` 等断言命中原句。
- 验：assemble + `node --check` 通过；`node tools/test-all.mjs` 72/72；`node tools/aesthetic-audit.mjs` OK（无阻塞项，WARN 为既有）；dev-loop 构建 1.4.08/408 成功，手动 `adb install -r` 覆盖后 `versionName=1.4.08 / versionCode=408`；smoke 阶段未见 JS 错误。真机截图：`build/shot-today-408.png`、`build/shot-records-408.png`、`build/shot-profile-408.png`、`build/shot-chat-408.png`。
- 未验证：截图已保存，但当前模型无法读取图片，故未对视觉密度效果做人工复核；建议下轮打开截图检查 360–420px 宽度下卡片留白与字体是否仍显拥挤或过松。
- APK：`dist/qingheng-1.4.08.apk`；回滚：`git revert <本轮提交>`。


## r130 · 2026-11-19 · 1.4.09（开源展示页：源码可见、禁止转售、安装包进 GitHub）
- 用户原话：「优化当前APP的github展示页，利用先前生成的展示网页，确保APP不会被轻易复刻的情况下开源，并放入最新版本安装包至github中」；随后补充「并在APP中添加作者信息与github网址，严禁二次转售」。
- 许可是这轮的取舍核心：MIT / AGPL 都允许转售，与「严禁二次转售」直接冲突。于是 LICENSE 改为自写的「轻衡软件许可 1.0（源码可见，禁止转售）」——允许个人非商业阅读/修改/自建；禁止二次转售、再分发安装包、商业利用、品牌冒用；商业使用需书面许可。
- README.md 重写为对外门户：徽章更新到 1.4.09 / 72 测试 / 631 KB / 「源码可见·禁止转售」；新增下载表（版本、包名、SHA-256、签名证书指纹）、展示页与 Release 链接；「作者与许可」段写清允许与禁止各四条；构建命令同步到 1.4.09/409。
- site/index.html（既有展示网页）更新：期号 1.4.09、安装包 631 KB、测试 72 项、工程表同步、导航与 CTA 加下载按钮（指向 releases/latest）、页脚补作者与 GitHub 地址、许可文案改为「源码公开 · 禁止二次转售」；新增 1.4.06 与 1.4.09 两条设计台账。
- APP 内补作者与许可：index.html 关于页新增「作者与许可」段（作者 散尘、GitHub 地址、禁止二次转售），页脚补一行作者与仓库链接；70-rest 的关于摘要改为「vX · 作者与许可」。
- 开源前的清理：删除仓库根散落文件  )counts.pushHistory++；把 docs/design/01-audit.md 与两个 one-off 脚本里的个人邮箱替换为「<已删除>」。仓库不含 .signing、API Key 或健康记录。
- 断言：	ests/ci-and-versions.test.mjs 新增 3 条（关于页写作者与仓库地址、页面与许可都写「严禁二次转售」、README 保留当前版本、签名指纹与许可），已登记  3-global-changes.md §5.1。
- 验收：assemble 14 片段；
ode tools/test-all.mjs 72/72；dev-loop 1.4.09/409 装机成功、smoke 无 JS 错误；design-audit.mjs site/index.html 18/18 PASS；esthetic-audit 仅既有 WARN（卡片阴影 6 处、字号 10 级、token 外硬编码）。
- 未验证：关于页/页脚在真机上的排版未截图核对（导入链接与新增两行说明只由断言守）。
- APK：dist/qingheng-1.4.09.apk（646365 B，sha256 78cde93a99754119f95b2f7bdc83f15d53d6eed6dc21fdb0975842b5247f952）。
### r130 附：GitHub 侧动作（2026-11-19）
- 仓库由私有转公开（PATCH /repos private=false），简介改为「源码可见，禁止二次转售」，homepage 指向 Pages。
- 展示页发布：新建 gh-pages 分支（根目录 index.html + .nojekyll，内容镜像 site/index.html），启用 Pages，地址 https://dustsanchen.github.io/qingheng/ （200，424945 B，与仓库内文件一致）。
- 发版：创建 Release 1.4.09，上传 qingheng-1.4.09.apk（646365 B）作为 asset；releases/latest 已指向该 tag，asset 下载 200。
- 公开前清理：删除根目录散落文件、替换 3 处个人邮箱；仓库仍不含 .signing、key 与健康记录。历史提交未改写（git 历史里仍可检索到旧邮箱，如需彻底清除要 filter-repo 重写，本轮未做）。
- 教训：PowerShell 直接给 Invoke-RestMethod -Body 传字符串会把中文写成 ?，必须 [System.Text.Encoding]::UTF8.GetBytes() + pplication/json; charset=utf-8；本轮仓库简介第一次就这样被写成问号，第二次重发才修好。

## r131 · 2026-11-19 · 1.4.11（收紧开源范围：公开仓只剩安装包与展示页）
- 用户原话：「删除github上的源码跳转选项，未避免APP被直接简单修改成他人项目，请尝试修改开源内容范围，修改作者与许可中的内容」；随后「作者名从中文改为拼音 Sanchen」。
- 应用：关于页与「我的」页脚删除 GitHub 链接，改为「作者 Sanchen · 不提供源码」与「禁止二次转售、反编译改造、重新打包、上架」；关于摘要留「vX · 作者与许可」。
- 许可：LICENSE 从「源码可见」改成「仅二进制分发」——可安装自用；禁止反编译/反汇编/提取资源、重打包、转售、冒名、把界面文案用于训练再发布；明确不授予源码与改编权。
- 公开内容范围：新增 	ools/publish-public.ps1，用 whitelist（README.md、LICENSE、site/index.html）构造孤立提交并 force push 到 public，同时刷新 gh-pages；**不发** app/tests/tools/docs。仓库远端拆成 localmirror（C 盘全量）、source（GitHub 私有 qingheng-source，全量）、public（只发作附件）；AGENTS.md 已写死这条规矩。
- 公开仓重写：public master 由源码历史改为 3 文件孤立提交（旧提交只能按 SHA 访问，无法从分支/标签浏览）；删掉 v1.4.09 release 与 tag（它们指向旧源码提交）；新建 v1.4.11 release 并上传 APK。
- README 重写为发行说明：不提供源码、只保留安装包/更新记录/许可；移除源码链接与构建命令；「展示页」保留 Pages 地址；校验指纹保留。
- 展示页：期号 1.4.11、下载 CTA、去掉「打开仓库」、页脚作者改 Sanchen、许可改为仅二进制分发。
- 断言：	ests/ci-and-versions.test.mjs 改为守新边界（作者 Sanchen、不提供源码、应用内无源码链接、反编译与转售条款、发布脚本白名单），登记 §5.1。
- 验收：test-all 72/72；dev-loop 1.4.11/411 装机成功、smoke 无 JS 错误；APK 内 index.html 含「作者 Sanchen」「不提供源码」且不含 github 链接；design-audit site 18/18。
- 未验证：公开仓旧的源码提交仍可能按 SHA 访问（GitHub 不会立即 GC 不可达对象）；要彻底清除需删除重建仓库或联系 GitHub 支持。
- APK：dist/qingheng-1.4.11.apk（646366 B，sha256 106ff8110aa1a04f91267037e0b26df9bbff818231a723b1ba14f798f57e9378）。

## r132 · 2026-11-19 · 1.4.11（主页改成产品页：截图、功能、用途与实现路径）
- 用户反馈：许可段「本仓库只发布…目的是让应用不被直接改造成他人项目」写得太直白；并要「在主页用展示页的结果布局优化显示，优先美观推销 APP 的构成功能、用途与实现路径」。
- README 重做为产品主页：首屏 4 张真机截图横排（今天/训练/问答/趋势）→「它解决什么问题」→ 五页功能地图 → 四个每天会用的细节（各配图）→「怎么实现的」数据流图（原生层 / WebView / 本地数据 / 可选 AI）→ 设计取向 → 隐私 → 模型接入 → 下载安装 → 版本验证 → 关于许可 → 已知限制 → 反馈。
- 许可段改为中性表述：先讲「可以自由下载、安装与分享体验」，再一句「界面、文案与安装包的修改与再发布不在授权范围内，见 LICENSE」，不再解释「防止被改造成他人项目」。
- 截图来源：从 site/index.html 的 base64 抽出 12 张到 site/shots/*.jpg（约 294 KB），README 以相对路径引用；展示页仍是单文件内联，不改。
- 工具：	ools/publish-public.ps1 白名单加入 site/shots/*.jpg；	ools/README.md 同步说明。
- 断言：ci-and-versions 的 README 检查改为「引用截图 + 有 LICENSE + 版本徽章 + 签名指纹」，并新增「截图文件在盘上（≥8 张）」；已登记 §5.1。
- 验收：test-all 72/72；公开发布成功，public master 现为 README/LICENSE/site/index.html + 12 张截图；raw README 200（6821 B）、截图 200；Pages 仍为 1.4.11。
- 未验证：GitHub 页面的实际排版未做像素级核对（本模型无法读图），已截 uild/gh-readme.png 供人工复核。
### r132 附：许可措辞统一
- 展示页 CTA 与页脚同步中性化（「个人作品…自由下载安装…修改与再发布不在授权范围内」），页脚只留「作者 Sanchen · 个人作品 · 禁止转售」；断言与发布脚本同步，Pages 缓存约 1 分钟后生效（复核 neutral=True）。

## r133 · 2026-11-19 · 1.4.12（删手表同步与 Health Connect，源码重新公开）
- 用户原话：「暂时删除APP中的同步手表数据，health connect权限功能，并开源代码」。
- 功能移除（整条链路，不留半截）：
  - 前端：删除 30-voice 的 installHealthConnectControls / waitHealthResult（同步按钮、权限按钮、30 天同步与提示语）；20-permissions-backup 的权限项从三项减到两项（通知、精确闹钟），去掉 health 行、health 状态、健康未授权说明与授权分支；index.html 引导提示去掉「手表数据」，数据管理摘要「导出、导入与手表同步」改为「导出、导入与本机备份」。
  - 原生：删除 HealthConnectSync.java；MainActivity 删除权限引导屏、onResume 回读、
otifyHealthResult、两个桥方法、/api/health-connect/* 路由、healthConnectStatus/healthConnectSync/pplyHealthConnectRecords/externalKey、权限回调分支、REQUEST_HEALTH 与 healthRequestPending、rationale 弹窗；AndroidManifest 删除 5 个 ndroid.permission.health.* 与 .HealthPermissionsRationale 别名。
- 开源恢复：LICENSE 回到「源码可见、禁止转售」；应用关于页与页脚改「源码公开」；README 与展示页同步；远端策略回到三处全量（localmirror / source / public）；	ools/publish-public.ps1 删除，新增 	ools/publish-pages.ps1 只刷 gh-pages。
- 断言：meal-date-java 的 15 条 HC 正向断言改为 4 条「已移除」守护（文件不存在、无 health 权限、无 HC 路由/桥、无 rationale）；onboarding-backup 改为两项且无 health；wizard-action-bar 的权限上限断言去掉 HC；ci-and-versions 改「作者 + 源码公开」「无源码链接」「禁止转售」「pages 脚本只碰 gh-pages」。全部登记 §5.1。
- 验收：assemble 14 片段；test-all 72/72；dev-loop 1.4.12/412 装机成功、smoke 无 JS 错误；aapt2 dump 确认 APK 无 health.* 权限；design-audit site 18/18。APK 631 KB → 623 KB（638174 B）。
- 未验证：真机权限卡只剩两项的实际排版未截图；以后要恢复 HC 需从 git 历史取回 HealthConnectSync.java 与对应桥接代码。
- APK：dist/qingheng-1.4.12.apk（sha256 82e057d28c1cacd1387697041143f6e606c62306362aa40fd1c22a61c37b2216）。- 发布：public master 用 --force-with-lease 从发行版孤儿提交切回全量源码历史（1264 个文件，含 app/ tests/ tools/ docs/，无 HealthConnectSync）；publish-pages.ps1 刷新 gh-pages；Release 1.4.12 上传 qingheng-1.4.12.apk（638174 B）。GitHub Pages 约 1 分钟后生效（复核 1.4.12 / 623 KB / 源码公开）。