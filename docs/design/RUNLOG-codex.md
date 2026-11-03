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
