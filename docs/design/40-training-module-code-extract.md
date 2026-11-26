# 轻衡 · 训练（Training）模块代码提取

> 用途：给外部评审用的**完整代码底稿**。本文档只做提取与索引，不做重构判断。
>
> - 仓库：`D:\AI\health-android`（app `cn.qingheng.health`，版本 **1.5.42**）
> - 提取日期：2026/11/27 01:20:40；以工作区 `master` 当时内容为准
> - 快照：`075929a` 轻衡 1.5.42：架构收口第二节（70-rest 拆分 / 委托收敛 / boot 改名）（2026-11-26T17:20:40.441Z UTC）；行号以该快照为准
> - 取代：1.5.30 版（2026-11-23，训练还在 50/60/70 三片）——本版按 55 领域层 / 68 日志层拆分重排，函数所属片段与行号全部重新定位
> - 生成方式：脚本按「函数名 / 常量锚点 + 括号配对」从快照逐字截取，未手改任何一行代码；行号即快照源文件行号
> - 未包含：样式文件 `styles.css`（训练相关选择器未贴）、`assets/app.js`（由 fragments 拼装生成，禁止手改）
> - 三段生成物：结构层（index.html 原样，只在标签之间插入换行）、逻辑层（fragments 整函数）、原生层（Java 关键函数）
> - 一共 200 段代码；索引表在 §0

## 0. 训练模块文件与函数索引表

层级说明：**数据/状态**＝读写与缓存；**生成/计算**＝纯计算；**文案**＝可读解释；**表单编辑**＝DOM 构建与读回；**视图**＝渲染；**校验**＝落库前检查；**绑定**＝事件与交互；**消费**＝今天页/趋势页读取训练数据。

### 00-head.fragment.js —— 全局状态、训练开关与配置同步（数据 / 消费层的开关）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `collectedAiPlans` | 00-head.fragment.js:877–886 | 10 | 数据 | Collects the per-date AI plans (newest 10) from localStorage into one portable object. |
| `schedulePrefsSync` | 00-head.fragment.js:887–895 | 9 | 数据 | Debounced fire-and-forget write; a failed sync must never interrupt the user's action. |
| `hydratePrefsFromState` | 00-head.fragment.js:896–948 | 53 | 数据 | Restores localStorage from state.prefs on load, so a fresh phone regains its preferences. Uses the shared key constants (PLAN_PREFS_KEY / AI_PLAN_KEY) instead of new literals. |
| `verifyConfigSync` | 00-head.fragment.js:966–976 | 11 | 数据 | 启动时对齐一次：本地缓存是当前事实，state.prefs 是随备份走的那份；漂移时以本地为准回写。 |
| `loadState` | 00-head.fragment.js:997–1033 | 37 | 数据 | （无注释） |
| `todayActionItems` | 00-head.fragment.js:1209–1227 | 19 | 数据 | 左半执行当前那条 primary，右半 1/N › 打开「今天的状况」半屏—— 原来分居两处的 #slot-hint（下一步）与 #status-strip（状态轮播）在这里合一。 |
| `renderTodayAction` | 00-head.fragment.js:1228–1259 | 32 | 数据 | （无注释） |
| `trainingEnabled` | 00-head.fragment.js:1370–1374 | 5 | 数据 | True when the user told us they do not train, so training UI should not be shown at all. |
| `trainingStateFor` | 00-head.fragment.js:1375–1391 | 17 | 数据 | `trained` wins over an old rest marker so a contradictory row can never hide real work. A missing `training` field means "not recorded", not "rest". |
| `hideTrainingTabs` | 00-head.fragment.js:1416–1434 | 19 | 数据 | （无注释） |
| `applyTrainingVisibility` | 00-head.fragment.js:1435–1458 | 24 | 数据 | （无注释） |

### 10-rich-answer.fragment.js —— 今天页「本周训练」概况与上次训练建议（消费层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `renderTodayPeek` | 10-rich-answer.fragment.js:458–524 | 67 | 消费 | 顶部横滑概况（2026-11-22 第七轮）：每枚卡 = 主数 + 基准 + 进度/缺口。 硬约束：数字旁边必须有一个比较对象（计划次数 / 上周容量 / 目标区间 / 7 日变化），带不出基准的不上卡。 |

### 25-today-hub.fragment.js —— 今天页刷新中枢与快捷动作（消费层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `scheduleTodayRefresh` | 25-today-hub.fragment.js:33–51 | 19 | 消费 | 把同一帧里的多次保存合并成一次刷新。 @param {string|string[]} sections 需要刷新的区域，超出白名单的值忽略。 |
| `installTodayQuickActions` | 25-today-hub.fragment.js:72–101 | 30 | 消费 | Place common actions below the calorie summary, in reach without covering page content. |
| `loadTodayAdvice` | 25-today-hub.fragment.js:103–125 | 23 | 消费 | Today's advice, grouped by slot. The page used to open on an empty query form, which read as "there is no advice" even when this morning's push had already written one. |

### 40-targets.fragment.js —— 训练天数进入目标计算（数据层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `plannedSessions` | 40-targets.fragment.js:32–42 | 11 | 数据 | 每周训练天数只认「记录→训练计划」的偏好；老档案里的 training 仅作兜底。 |

### 55-training-domain.fragment.js —— **训练领域层（纯计算，零 DOM）**：容量口径、ACWR、周计划生成、重量记忆、要点检索

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| TRAINING_TEMPLATES 模板码 | 55-training-domain.fragment.js:8–8 | 1 | 数据 | 模板码 → 中文名：push/pull/legs/upper/lower/full/other。 |
| `readBodyweightMarks` | 55-training-domain.fragment.js:27–37 | 11 | 领域 | 以后识别到同名动作直接按自重处理——不填负重也合法。 名字表存 localStorage 并随 prefs 进 state.json，换机也带着走。 |
| `loadUserBodyweightMarks` | 55-training-domain.fragment.js:39–42 | 4 | 领域 | （无注释） |
| `isUserBodyweight` | 55-training-domain.fragment.js:44–46 | 3 | 领域 | （无注释） |
| `setUserBodyweight` | 55-training-domain.fragment.js:48–59 | 12 | 领域 | （无注释） |
| `isBodyweightMove` | 55-training-domain.fragment.js:61–68 | 8 | 领域 | （无注释） |
| `isCompoundMove` | 55-training-domain.fragment.js:70–75 | 6 | 领域 | （无注释） |
| `isCardioName` | 55-training-domain.fragment.js:77–85 | 9 | 领域 | 删除放在动作名行右端与组行末尾，避免 44px 危险按钮压在标题行上方。 有氧动作（跑步 / 骑行 / 椭圆…）：没有组次负重，记距离与时长。只认前缀，别把「杠铃划船」当下肢有氧。 |
| `isCardioItem` | 55-training-domain.fragment.js:87–89 | 3 | 领域 | （无注释） |
| ACWR_HIGH / ACWR_LOW 阈值 | 55-training-domain.fragment.js:91–119 | 29 | 规则 | 负荷比 1.5 / 0.8：高于即判定冲高、低于判定停滞。 |
| WEIGHT_MEMORY_KEY / WEIGHT_MEMORY_DAYS / WEIGHT_MEMORY_MAX | 55-training-domain.fragment.js:99–119 | 21 | 数据 | 重量记忆的键、保留天数与条目上限。 |
| WEIGHT_FAMILIES / WEIGHT_EQUIP / WEIGHT_RATIOS | 55-training-domain.fragment.js:105–119 | 15 | 数据 | 重量记忆的动作族、器械系数与递增比例表。 |
| LIBRARY_ROUTES 部位路由表 | 55-training-domain.fragment.js:156–169 | 14 | 数据 | 模板 / 名称 → 训练库路由。 |
| `habitRowFor` | 55-training-domain.fragment.js:171–176 | 6 | 领域 | The habit row for a date; older builds could append duplicates, so keep the fullest one. |
| `trainedOn` | 55-training-domain.fragment.js:178–184 | 7 | 领域 | 当天算不算训练日：只看「有没有保存训练动作」（2026-11-18 用户要求：训练情况由动作判断， 不再让用户在「日常习惯」里手填）。动作删空就自动回落成休息日。 |
| `exercisesFor` | 55-training-domain.fragment.js:186–196 | 11 | 领域 | Normalised exercise list of one day: [{name, sets, reps, weight}]. |
| `trainingStatsOf` | 55-training-domain.fragment.js:198–228 | 31 | 领域 | 一次训练的三个口径：kg 容量、总组数、自重次数。 自重的次数单独计数，不乘一个假想体重去冒充 kg 容量——缺什么就报什么，但组次要进分析。 |
| `trainingVolumeOf` | 55-training-domain.fragment.js:230–244 | 15 | 领域 | （无注释） |
| `latestExerciseValues` | 55-training-domain.fragment.js:246–262 | 17 | 领域 | Most recent recorded values for one exercise, so a repeat is one tap instead of retyping. |
| `topSetSummary` | 55-training-domain.fragment.js:264–284 | 21 | 领域 | 顶组摘要：基准重量与「那个重量做了几次」。金字塔组（10×40 / 8×60 / 5×80）不能拿第一组的次数 配最大重量——那会让渐进规则和基线一起失真。旧记录没有 setDetails 时退回外层三字段。 |
| `weeklyVolume` | 55-training-domain.fragment.js:286–315 | 30 | 领域 | Weekly volume per exercise, newest week first, using ISO weeks (Monday start). |
| `exerciseKey` | 55-training-domain.fragment.js:317–319 | 3 | 领域 | （无注释） |
| `exerciseFamily` | 55-training-domain.fragment.js:321–325 | 5 | 领域 | （无注释） |
| `exerciseEquip` | 55-training-domain.fragment.js:327–331 | 5 | 领域 | （无注释） |
| `exerciseBodyPart` | 55-training-domain.fragment.js:339–343 | 5 | 领域 | （无注释） |
| `planPartFor` | 55-training-domain.fragment.js:352–359 | 8 | 领域 | 从「今天按周计划应练：推日」这类整句里认出部位。 |
| `dominantTemplateFor` | 55-training-domain.fragment.js:361–382 | 22 | 领域 | 播种、照上次练、周计划带进来的动作决定模板，别再让顶部一直停在默认的「推」。 混练（第二部位占比 ≥1/3，如全身日/上肢日）归 other，不硬塞成单分化。 |
| `readWeightMemory` | 55-training-domain.fragment.js:384–392 | 9 | 领域 | （无注释） |
| `writeWeightMemory` | 55-training-domain.fragment.js:394–404 | 11 | 领域 | （无注释） |
| `rememberExerciseWeight` | 55-training-domain.fragment.js:406–423 | 18 | 领域 | 只在不比已有记录更旧、且来源不更弱时覆盖：log > model/plan > inferred。 |
| `seedWeightMemoryFromHistory` | 55-training-domain.fragment.js:425–447 | 23 | 领域 | 把历史记录里的真实负重灌进记忆（只读历史，不改记录本身）；同一天只扫一次。 |
| `loadableWeightKg` | 55-training-domain.fragment.js:449–468 | 20 | 领域 | 把建议重量落到健身房里装得出来的数：杠铃按 20 kg 空杆 + 每侧 2.5 kg 的整数倍， 哑铃按 2 kg、器械按 5 kg 递增。装不出的数字（如 62.5 kg）比偏轻更伤执行。 |
| `reduceLoadableWeightKg` | 55-training-domain.fragment.js:470–486 | 17 | 领域 | 需要「减」的时候必须向下取：可装重量会把 47.5 抬回 50、把 15.2 抬回 16，等于没减。 大步退到真能装出来且低于原重量为止。 |
| `progressiveWeightKg` | 55-training-domain.fragment.js:488–508 | 21 | 领域 | 这次该做多少：上次 ≥8 次且 21 天内练过 → 进一档；6~7 次 → 持平；≤5 次 → 退一档； 超过 21 天没练持平，超过 60 天退 5%。不冲、也不原地躺着。 |
| `startingWeightKg` | 55-training-domain.fragment.js:510–521 | 12 | 领域 | 完全没有记录的第一次：按体重比例给一个偏保守的起步重量。 |
| `plannedWeightFor` | 55-training-domain.fragment.js:523–545 | 23 | 领域 | 排课时给每个动作一个重量：同名记忆 → 同族迁移（打 85 折）→ 体重比例起步。 自重与推断不出来的返回 null（界面留空），source 供界面标注「约」。 |
| `rememberPlanWeights` | 55-training-domain.fragment.js:547–554 | 8 | 领域 | 排完保存时把重量写进记忆；推断值记 plan，模型给的值记 model。 |
| `rememberExerciseLogs` | 55-training-domain.fragment.js:556–565 | 10 | 领域 | 训练落库后把真实负重写进记忆（下一次排课按它渐进）。 |
| `recentExerciseBaselines` | 55-training-domain.fragment.js:567–585 | 19 | 领域 | 14 天内每个动作最近一次的组/次/负重，供渐进参考；跑步与计时类不参与排课。 |
| `acwrFromDailyLoads` | 55-training-domain.fragment.js:587–604 | 18 | 领域 | Acute:chronic workload ratio from daily loads. ratio > 1.5 = spike, < 0.8 = detraining. loads: [{date:'YYYY-MM-DD', load:number}] (load = 组×次×负重, or run minutes×6). |
| `dailyLoads` | 55-training-domain.fragment.js:606–626 | 21 | 领域 | Daily training load (sets × reps × weight; runs count as minutes × 6). |
| `generateWeekPlan` | 55-training-domain.fragment.js:628–930 | 303 | 领域 | 重量：有历史 ×1.025（减载 ×0.9）、无历史按体重推算并标「约」、自重留空按次数进阶。 选动作五规则：器械匹配 → 部位覆盖 → 同角度不重复 → 可加重优先 → 有历史先继承。 |
| `trainingLibrary` | 55-training-domain.fragment.js:932–935 | 4 | 领域 | （无注释） |
| `libraryRule` | 55-training-domain.fragment.js:937–940 | 4 | 领域 | （无注释） |
| `libraryDayTemplate` | 55-training-domain.fragment.js:942–946 | 5 | 领域 | （无注释） |
| `libraryMoves` | 55-training-domain.fragment.js:948–951 | 4 | 领域 | （无注释） |
| `librarySourceLabel` | 55-training-domain.fragment.js:953–957 | 5 | 领域 | （无注释） |
| `planWhy` | 55-training-domain.fragment.js:959–974 | 16 | 领域 | Why this week looks like this: the rules actually used, each carrying its source. |
| `libraryLookup` | 55-training-domain.fragment.js:976–994 | 19 | 领域 | （无注释） |
| `libraryCues` | 55-training-domain.fragment.js:996–1009 | 14 | 领域 | Two short cues for today's template, taken from the transcript-level rules. |
| `exerciseCore` | 55-training-domain.fragment.js:1011–1017 | 7 | 领域 | 去掉器械/姿态前缀，留下动作本体（卧推 / 硬拉 / 划船…），用来和训练库对名。 |
| `cueTokens` | 55-training-domain.fragment.js:1019–1034 | 16 | 领域 | 对名用的候选词：全名、逐层去掉器械/姿态前缀后的形态，以及被去掉的修饰词本身 （哑铃上斜卧推 → 上斜卧推 / 卧推 / 上斜 / 哑铃），这样「上斜」这类线索也能命中。 |
| `trimCue` | 55-training-domain.fragment.js:1036–1042 | 7 | 领域 | 一条要点别超过两行：到句号或 46 字为止。 |
| `pickCueClause` | 55-training-domain.fragment.js:1044–1053 | 10 | 领域 | 从一条规则里挑「能照做」的那半句：先挑提到这个动作的分句，再挑有动作要求的，最后用第一句。 |
| `cueForExercise` | 55-training-domain.fragment.js:1055–1123 | 69 | 领域 | ③ 规则里提到它、且标签与今天的分化对得上； ④ 都没有就返回 null，由调用方补通用提醒。 |
| `libraryCuesFor` | 55-training-domain.fragment.js:1125–1147 | 23 | 领域 | 计划某一天的要点：最多 3 条，每条点名对应的动作；命中不足时补通用提醒。 |
| `libraryRuleForMetric` | 55-training-domain.fragment.js:1149–1154 | 6 | 领域 | Which library rule answers the weakest metric of the day. |
| `librarySummary` | 55-training-domain.fragment.js:1156–1172 | 17 | 领域 | Compact digest for the question payload: priority order, one line per rule. |

### 60-training-copy.fragment.js —— 周计划文案、训练建议拼装与复制（消费 / 文案层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `renderTrainingDraft` | 60-training-copy.fragment.js:9–28 | 20 | 文案 | （无注释） |
| `parseDraft` | 60-training-copy.fragment.js:34–121 | 88 | 文案 | One sentence -> one draft. Recognises training, weight, sleep, steps and water. Returns {kind, date, rows, missing, payload} or null. Pure: no DOM, no state. |
| `parseTrainingDraft` | 60-training-copy.fragment.js:123–127 | 5 | 文案 | The one live parser: a training-only view over parseDraft; call sites and tests rely on the {payload:{exercises}} shape. |
| `draftSummary` | 60-training-copy.fragment.js:130–133 | 4 | 文案 | （无注释） |
| `plateauFromWeekly` | 60-training-copy.fragment.js:136–147 | 12 | 文案 | Plateau: three weekly means and the last two barely differ. weekly: [{week:'YYYY-MM-DD', mean:number}] sorted oldest first. |
| `localCoachLine` | 60-training-copy.fragment.js:149–153 | 5 | 文案 | The model-free one-liner used when a request does not need an LLM at all. |
| `weeklyWeightMeans` | 60-training-copy.fragment.js:155–174 | 20 | 文案 | Weekly mean weights, oldest first, for plateau detection. |
| `weekdayIndex` | 60-training-copy.fragment.js:175–179 | 5 | 文案 | 0 = Monday … 6 = Sunday. |
| `weekDetailHtml` | 60-training-copy.fragment.js:186–206 | 21 | 文案 | 周条下方的一行详情：那天记录了什么、计划是什么。 |
| `planPrefs` | 60-training-copy.fragment.js:213–216 | 4 | 文案 | 用户偏好：没有设置就不生成方案。 |
| `savePlanPrefs` | 60-training-copy.fragment.js:217–221 | 5 | 文案 | （无注释） |
| `planPrefsSummary` | 60-training-copy.fragment.js:225–232 | 8 | 文案 | （无注释） |
| `installPlanPrefs` | 60-training-copy.fragment.js:234–347 | 114 | 文案 | （无注释） |
| `weekPlanToday` | 60-training-copy.fragment.js:349–376 | 28 | 文案 | 都没有：给「用 AI 排今天 / 看本周安排」两个入口。 本周计划整体是否存在、今天那一节是什么——休息日与「还没排」是两件事，不能混成一句话。 |
| `weekTodaySession` | 60-training-copy.fragment.js:377–380 | 4 | 文案 | 本周计划里「今天」那一节：与 weekPlanToday 共用同一个来源，不再各算一遍。 |
| `cachedWeekPlan` | 60-training-copy.fragment.js:381–385 | 5 | 文案 | 今天页只读已有缓存，不为了显示「今天该练」临时生成一份新计划。 |
| `buildTodayAgenda` | 60-training-copy.fragment.js:386–466 | 81 | 文案 | 今天页的单一行动模型：只读、无网络、无写库。最多一个 primary 加两个 secondary。 休息/未记录/不训练都不在这里被当成「漏练」；计划只来自已存在的周计划缓存。 |
| `todayAgendaState` | 60-training-copy.fragment.js:467–500 | 34 | 文案 | Current-page adapter: gathers state, cache and today's clock for the pure builder. |
| `adoptWeekDay` | 60-training-copy.fragment.js:501–528 | 28 | 文案 | 把周计划今天那一节写进今日清单，两处入口（今日页 / 记录页）共用。 |
| `renderAdviceOrder` | 60-training-copy.fragment.js:529–644 | 116 | 文案 | （无注释） |
| `prefsForPlan` | 60-training-copy.fragment.js:652–656 | 5 | 文案 | 指纹 = 偏好 + 每个动作最近一次的组/次/重量；任一项变才重算，避免回看时清单悄悄变。 指纹只关心影响排课的那几个输入；没有偏好时留空，仍能稳定比较。 |
| `weekPlanFingerprint` | 60-training-copy.fragment.js:657–667 | 11 | 文案 | （无注释） |
| `readWeekPlanCache` | 60-training-copy.fragment.js:668–670 | 3 | 文案 | （无注释） |
| `writeWeekPlanCache` | 60-training-copy.fragment.js:671–673 | 3 | 文案 | （无注释） |
| `planStartDate` | 60-training-copy.fragment.js:679–682 | 4 | 文案 | 七天窗口的起点：就是正在看的这一天，不再跳到下周一。 |
| `dayTemplateSlot` | 60-training-copy.fragment.js:683–691 | 9 | 文案 | 「那天该练哪一类」的唯一来源：本周安排（周计划）里当天的 template。 排今天的提示词与问答的训练建议都读这一处，两边才不会一边排推、一边建议练腿。 |
| `dayLabel` | 60-training-copy.fragment.js:692–695 | 4 | 文案 | 所看那天的名字：日历上的今天写「今天」，其余写 MM-DD。 |
| `dayTemplateNote` | 60-training-copy.fragment.js:696–702 | 7 | 文案 | 喂给两个 AI 入口的同一句话；没有周计划就直接给空串，不编一个部位出来。 |
| `nextStartTemplate` | 60-training-copy.fragment.js:703–721 | 19 | 文案 | 起始部位＝接上一次训练的下一个（2026-11-22 用户拍板）。ppl 按推→拉→腿轮转；上下肢按上下交替；全身固定。 extra：用户点「换一套」时往前推一格——同一套偏好下也能拿到不同的排法，否则生成器是确定性的，按了等于没按。 |
| `regenerateWeekPlan` | 60-training-copy.fragment.js:722–731 | 10 | 文案 | （无注释） |
| `scheduleWeekPlan` | 60-training-copy.fragment.js:732–768 | 37 | 文案 | 「把这周写进训练记录」：只追加、不覆盖——每天原有记录整条保留，同名动作跳过； 一天都没新增就不写，也不改 training 标记。2026-11-23 Phase 3 从 70 的独立监听器收进来。 |
| `planQualityLine` | 60-training-copy.fragment.js:769–792 | 24 | 文案 | 生成之后的「这一版长什么样」自检：几练、部位顺序、每次几个动作、周组数是否压在上限内、 有多少动作的重量是按体重推算的。只报事实，不报耗时——用户要的是排得对，不是排得快。 |
| `planDayLabels` | 60-training-copy.fragment.js:793–804 | 12 | 文案 | 一周的部位顺序：连续相同合并成「全身 ×4」，轻量日单独标「（轻）」。 |
| `planWhyBadgeHtml` | 60-training-copy.fragment.js:805–821 | 17 | 文案 | 「为什么这样排？」：把生成时真正用上的参数摊开——时长上限、动作数、器械、起始部位、 被排除的要求、是否减载。默认收起，挂在计划标题下面，不占首屏。 |
| `openPlanSheet` | 60-training-copy.fragment.js:822–825 | 4 | 文案 | （无注释） |
| `showCoachSummary` | 60-training-copy.fragment.js:826–849 | 24 | 文案 | 「这周这样排」——生成后必须先看的一屏：把这次改的偏好逐条落到结果上（排了几练、时长怎么折算、 器械、训练要求是否被读取/排除、周组数是否压在上限内）。返回 true 表示用户想去看看详细说明。 |
| `renderWeekPlan` | 60-training-copy.fragment.js:850–1006 | 157 | 文案 | （无注释） |
| `renderTrendWarnings` | 60-training-copy.fragment.js:1008–1022 | 15 | 文案 | Load and plateau warnings shown above the weight chart. |
| `renderBodyWeight` | 60-training-copy.fragment.js:1024–1041 | 18 | 文案 | 记录·身体 的「今天体重」（2026-11-22 由「今天两样」收窄）：卡片只报当天这一条， 点它跳到身体数据卡的体重格——体重只有一个可编辑处，不出现两套口径。 |
| `copyCandidates` | 60-training-copy.fragment.js:1042–1062 | 21 | 文案 | 「昨天优先 + 同名去重」口径，所以保留实现，只把它标注为无 UI 入口。 One-tap copies: yesterday's meals first, then the most recent ones. |
| `renderCopyMeals` | 60-training-copy.fragment.js:1063–1073 | 11 | 文案 | （无注释） |
| `copyMeal` | 60-training-copy.fragment.js:1074–1098 | 25 | 文案 | 「复制后如何打标」的语义；点击委托也已用可选链兜住。 Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. |
| `numericForm` | 60-training-copy.fragment.js:1099–1099 | 1 | 文案 | （无注释） |
| `submitForm` | 60-training-copy.fragment.js:1100–1121 | 22 | 文案 | （无注释） |
| `adviceBusy` | 60-training-copy.fragment.js:1123–1128 | 6 | 文案 | （无注释） |
| `refreshAdvice` | 60-training-copy.fragment.js:1129–1152 | 24 | 文案 | （无注释） |
| `clearImage` | 60-training-copy.fragment.js:1153–1153 | 1 | 文案 | （无注释） |
| `compressImage` | 60-training-copy.fragment.js:1154–1168 | 15 | 文案 | （无注释） |
| `anchorSummary` | 60-training-copy.fragment.js:1170–1173 | 4 | 文案 | The user's own anchor table, sent along so the model reuses the same numbers (rules.md 第五节). |
| `syncAnchors` | 60-training-copy.fragment.js:1174–1183 | 10 | 文案 | Stores the anchor block natively once per session so push/advice prompts can reuse it too. |
| `beginMealEdit` | 60-training-copy.fragment.js:1187–1195 | 9 | 文案 | （无注释） |
| `metricIcon` | 60-training-copy.fragment.js:1197–1214 | 18 | 文案 | 体检格图标：文字已经够多，用图标替代那个无意义的灰点（2026-10-29）。 只映射已有资源，不新增文件；未知指标回退成空，保持排版不塌。 |

### 65-exercise-guide.fragment.js —— 动作要点表、做法与要点检索（数据层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| EXERCISE_GUIDES 动作要点表 | 65-exercise-guide.fragment.js:1–193 | 193 | 数据 | 每个动作的角色、要点与安全提示（本地数据，不联网）。 |
| EXERCISE_HOW 怎么做 | 65-exercise-guide.fragment.js:195–290 | 96 | 数据 | 动作的分步做法。 |
| `normalizeExerciseName` | 65-exercise-guide.fragment.js:291–294 | 4 | 数据 | 去掉空白与括号补充，名字里常见的「（器械版）」不影响匹配。 |
| `exerciseGuideFor` | 65-exercise-guide.fragment.js:295–314 | 20 | 数据 | 精确优先、其次取最长关键词：这样「颈前深蹲」不会被「深蹲」抢走。 |
| `closeExerciseGuide` | 65-exercise-guide.fragment.js:315–318 | 4 | 数据 | （无注释） |
| `showExerciseGuide` | 65-exercise-guide.fragment.js:319–333 | 15 | 数据 | （无注释） |
| `installExerciseGuide` | 65-exercise-guide.fragment.js:334–344 | 11 | 数据 | （无注释） |

### 68-training-log.fragment.js —— **训练日志视图与写库**：动作行、组次、草稿、保存弹窗、课后总结、QH.training 契约

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| `seedMutedKey` | 68-training-log.fragment.js:24–29 | 6 | 视图 | 清空训练后重新打开又会把计划动作播回来。现在按日存一份「当时那份清单的动作名」， 只有清单没变时才抑制播种——换了新清单（重排今天 / 采纳周计划）就照常播。 |
| `seedMutedFor` | 68-training-log.fragment.js:31–39 | 9 | 视图 | （无注释） |
| `markSeedMuted` | 68-training-log.fragment.js:41–46 | 6 | 视图 | （无注释） |
| `clearSeedMuted` | 68-training-log.fragment.js:47–50 | 4 | 视图 | 撤销清空时把「今天不按计划走」也撤回，让计划动作重新播种。 |
| `setDraftState` | 68-training-log.fragment.js:52–56 | 5 | 视图 | 卡面右上角的极轻状态：草稿暂存 / 已记录（2026-11-23）。 |
| `hideTrainingUndo` | 68-training-log.fragment.js:60–66 | 7 | 视图 | （无注释） |
| `showTrainingUndo` | 68-training-log.fragment.js:67–76 | 10 | 视图 | （无注释） |
| `undoClearTraining` | 68-training-log.fragment.js:77–88 | 12 | 视图 | （无注释） |
| `trainingSetDetails` | 68-training-log.fragment.js:90–102 | 13 | 视图 | 一组一条：旧记录没有 setDetails 时，用 sets/次/负重复制出同样多组。 |
| `setRowHtml` | 68-training-log.fragment.js:104–117 | 14 | 视图 | （无注释） |
| `fmtPace` | 68-training-log.fragment.js:119–123 | 5 | 视图 | 配速按「分钟 / 公里」算，显示成 6'00"。 |
| `cardioRowHtml` | 68-training-log.fragment.js:125–132 | 8 | 视图 | （无注释） |
| `refreshCardioPace` | 68-training-log.fragment.js:134–144 | 11 | 视图 | 有氧行右侧的配速跟着两个输入走；容器可以是整行也可以是有氧行本身。 |
| `syncExerciseMode` | 68-training-log.fragment.js:146–162 | 17 | 视图 | 动作名改成「跑步」时当场换成有氧表单，改回力量动作再换回来。 |
| `exerciseRowHtml` | 68-training-log.fragment.js:164–184 | 21 | 视图 | （无注释） |
| `refreshSetRow` | 68-training-log.fragment.js:186–216 | 31 | 视图 | 一组增删后重排序号、重算该动作容量；只改 UI，保存时才落库。 |
| `refreshCompletionState` | 68-training-log.fragment.js:218–242 | 25 | 视图 | 全部组勾完后把动作收成一行「✓ 名称 · N 组 · 容量 X kg」；点「展开」或改动任一组就展开。 收起只是 CSS 收起——组次输入仍在 DOM 里，保存与草稿照常读得到。 |
| `renumberExerciseRows` | 68-training-log.fragment.js:244–257 | 14 | 视图 | 增删动作后统一重排序号：行前的数字、移除按钮与输入框的 aria-label 都跟着行序走。 |
| `appendExerciseRow` | 68-training-log.fragment.js:259–280 | 22 | 视图 | Adds one exercise row, optionally pre-filled; shared by the 添加动作 button and the preset chips. |
| `renderTrainingPresets` | 68-training-log.fragment.js:282–289 | 8 | 视图 | Chips for the selected template. 小号胶囊：它们是「快捷方式」，不该和主行动一样重。 |
| `seedExercisesFromPlan` | 68-training-log.fragment.js:291–315 | 25 | 视图 | 计划 → 执行区预填（2026-11-22 四模块清单之二）：只产数据、不写库， 用户核对后点「保存训练」才落。优先用今天 AI 排的未完成动作，其次用本周计划当天的动作。 |
| `draftRowsFromForm` | 68-training-log.fragment.js:317–342 | 26 | 视图 | （无注释） |
| `rememberTrainingDraft` | 68-training-log.fragment.js:344–349 | 6 | 视图 | （无注释） |
| `forgetTrainingDraft` | 68-training-log.fragment.js:351–351 | 1 | 视图 | （无注释） |
| `renderTrainingLog` | 68-training-log.fragment.js:353–414 | 62 | 视图 | （无注释） |
| `repeatLastTraining` | 68-training-log.fragment.js:416–427 | 12 | 视图 | 照上一次训练预填表单（只改草稿，不落库）；主流健身 App 都靠这一下省掉重复输入。 |
| `readTrainingExercises` | 68-training-log.fragment.js:429–460 | 32 | 视图 | （无注释） |
| `renderTrainingSummary` | 68-training-log.fragment.js:462–491 | 30 | 视图 | 保存后的课后总结：容量、组数、和上次比、下次怎么做；不打断操作，放在表单下方。 |
| `sessionStartKey` | 68-training-log.fragment.js:493–497 | 5 | 视图 | 训练计时（2026-11-22）：第一次把某组标记完成时记下起点，「结束训练」时给出实际耗时的默认值。 只存本机、按日覆盖；保存成功后清掉，第二天不会沿用昨天的起点。 |
| `sessionStartedAt` | 68-training-log.fragment.js:499–501 | 3 | 视图 | （无注释） |
| `markSessionStart` | 68-training-log.fragment.js:503–506 | 4 | 视图 | （无注释） |
| `clearSessionStart` | 68-training-log.fragment.js:508–510 | 3 | 视图 | （无注释） |
| `sessionMinutesEstimate` | 68-training-log.fragment.js:512–517 | 6 | 视图 | 默认耗时（分钟）：有起点按实际、夹在 5–300 之间；没有起点就留空，不编一个数。 |
| `trainingSaveDialogHtml` | 68-training-log.fragment.js:519–562 | 44 | 视图 | 「结束训练」弹窗内容：汇总 + 实际耗时 + 疲劳度 + 先补记录。只拼本地数字，不接后端字符串。 |
| `wireTrainingSaveDialog` | 68-training-log.fragment.js:564–581 | 18 | 视图 | 弹窗内的交互：疲劳度单选、先补记录（关弹窗并把焦点送回第一个没填完的组）。 |
| `saveTrainingLog` | 68-training-log.fragment.js:583–664 | 82 | 视图 | Saves the log onto the day's habit row, preserving every other field it already carries. |
| `renderVolumeTable` | 68-training-log.fragment.js:666–678 | 13 | 视图 | （无注释） |
| `weekTrainingStats` | 68-training-log.fragment.js:680–704 | 25 | 视图 | 训练周统计的唯一口径（概览卡复用）：容量按 kg 逐日取整后求和；有 setDetails 用逐组 reps×weight， 没有 setDetails 的旧记录用 sets×reps×weight；有氧（只有距离/时长）不计容量。次数 = 当周有动作的天数。 |
| `renderTrainingOverview` | 68-training-log.fragment.js:706–808 | 103 | 视图 | （无注释） |
| `installTrainingLog` | 68-training-log.fragment.js:810–1045 | 236 | 视图 | 训练日志的全部事件绑定（幂等）：从 70 收回来，和它服务的 DOM 放在一起。 休息计时器仍留在 70，这里只是在勾组时调用它。 |
| `bodyPartHints` | 68-training-log.fragment.js:1107–1133 | 27 | 视图 | 「按部位查解剖要点」：每个部位取 2~3 条最相关的规则，带口述时间戳。 |
| `addExercisesToToday` | 68-training-log.fragment.js:1135–1190 | 56 | 视图 | 把一批动作并入当天训练记录：同名跳过，只追加不覆盖。 训练日志与 AI 计划是两份数据，这里是唯一把它们接起来的入口。 |
| `removeExerciseFromToday` | 68-training-log.fragment.js:1192–1203 | 12 | 视图 | 勾选即记录（2026-11-22 第七轮）：清单勾一个就落一条训练记录，不再要求二次导入。 只对今天生效、只在有组次时写库；取消勾选只回收「自己加进来且没动过」的行。 |
| `togglePlanDone` | 68-training-log.fragment.js:1205–1246 | 42 | 视图 | （无注释） |
| `startLoggingFromPlan` | 68-training-log.fragment.js:1248–1266 | 19 | 视图 | 从「今日清单」直接进入记录：把动作并进今天，跳到训练日志并聚焦负重。 主流健身 App 的路径都是「看清单 → 点这个动作 → 记实际组次」，不要求重新打字。 |
| `parseExercisesFromText` | 68-training-log.fragment.js:1268–1285 | 18 | 视图 | 从 AI 回答的纯文本里挑出「动作名 3组×8次 60kg」这类片段；认不出就返回空。 |
| EFFORT_LABELS / EFFORT_LEVELS | 68-training-log.fragment.js:1287–1287 | 1 | 数据 | 疲劳度四档：太轻 / 刚好 / 有点累 / 太累。 |
| `effortFor` | 68-training-log.fragment.js:1289–1293 | 5 | 视图 | （无注释） |
| `applyEffortSignalToPlan` | 68-training-log.fragment.js:1295–1314 | 20 | 视图 | 强度信号落到清单：降载时每个配重动作少一组、重量退 5%；加量时第一个复合动作多一组。 |
| `saveTrainingEffort` | 68-training-log.fragment.js:1316–1323 | 8 | 视图 | 体感只落在结束训练弹窗里（2026-11-23 删掉卡片底部那一行），这里不再有可刷新的行内 UI。 |
| `planNoteKey` | 68-training-log.fragment.js:1325–1326 | 2 | 视图 | 教练说明只留在本机：它解释「为什么没完全照要求办」，不进导出数据。 |
| `readPlanNote` | 68-training-log.fragment.js:1328–1330 | 3 | 视图 | （无注释） |
| `writePlanNote` | 68-training-log.fragment.js:1332–1337 | 6 | 视图 | （无注释） |
| `renderPlanNote` | 68-training-log.fragment.js:1339–1345 | 7 | 视图 | （无注释） |
| `renderPlanTiming` | 68-training-log.fragment.js:1347–1357 | 11 | 视图 | 只把「上一次没排成」的原因贴在清单上方：toast 只活 10 秒，失败原因要留得住。 成功时不报耗时（2026-11-23 用户：不追求生成速度，追求排得对）。 |
| `syncPlanDoneFromRow` | 68-training-log.fragment.js:1359–1376 | 18 | 视图 | 播种行的每组 ○ 反过来决定计划项的 done（2026-11-22）： 计划清单不再单独渲染，但 agenda 的「N 个动作还没完成」必须仍然说真话。 |
| `installWeightCalc` | 68-training-log.fragment.js:1378–1416 | 39 | 视图 | 杠铃总重计算器：杆重 + 2 × 每侧片重。 |
| `installTrainingSheets` | 68-training-log.fragment.js:1418–1445 | 28 | 视图 | 顺延与清空已从「其他」里搬出来，直接挂在训练日志的操作行（2026-11-23 用户要求）—— 这两件低频动作不再需要一个折叠层，也少一个「其他」按钮。 |
| `showTrainingDraft` | 68-training-log.fragment.js:1447–1450 | 4 | 视图 | （无注释） |

### 70-rest.fragment.js —— 组间休息引擎与记录页面板装配（视图 / 绑定层）

| 函数 / 代码段 | 位置（行） | 行数 | 层 | 一句话说明 |
|---|---|---|---|---|
| AI_PLAN_KEY 按日清单键 | 70-rest.fragment.js:33–40 | 8 | 数据 | 按日 AI 清单的 localStorage 键生成器（qingheng.aiPlan.<date>）。 |
| `installRecordPanels` | 70-rest.fragment.js:162–213 | 52 | 视图 | （无注释） |
| `attachRestLine` | 70-rest.fragment.js:345–367 | 23 | 视图 | 组间休息就长在那一组上：一条走完的线 + 就地倒计时（2026-11-22 第三轮）。 点倒计时即取消；线滚出视野后由底部药丸接手，两处同一份 restEnd。 |
| REST_SECONDS / REST_RING_C | 70-rest.fragment.js:368–384 | 17 | 规则 | 默认 90 秒与休息环周长。 |
| `paintRest` | 70-rest.fragment.js:442–478 | 37 | 视图 | 计时与药丸一起画：剩余时间、环形进度、aria-label 同源。 |
| `restLeftNow` | 70-rest.fragment.js:479–482 | 4 | 视图 | 剩余秒数只按绝对目标时间算：切后台/锁屏期间 setInterval 会被节流甚至暂停，不能靠递减。 |
| `tickRest` | 70-rest.fragment.js:483–494 | 12 | 视图 | 一帧的绘制：校准剩余时间 → 画 → 到点收尾（清计时器、响一次）。 |
| `installRestDock` | 70-rest.fragment.js:514–541 | 28 | 视图 | （无注释） |

## 1. 数据与状态结构

### 1.1 state.json 里与训练有关的形状

原生侧 `state.json`（AtomicFile）是权威数据，`STATE_VERSION = 4`；前端只通过 `/api/state`、`/api/habits`、`/api/prefs` 读写。训练相关的字段如下（`—` 表示该字段可能不存在）：

```jsonc
{
  "version": 4,
  "profile": {
    "training": 4,                 // 每周训练天数；"none" = 不健身（隐藏全部训练 UI）
    "trainingDayMin": 1800, "trainingDayMax": 2200,
    "restDayMin": 1600, "restDayMax": 1900
  },
  "habits": [{                     // 一天一条；训练日志就写在这条上
    "id": "uuid",
    "date": "2026-11-22",
    "steps": 8000, "water": 2000, "sleep": 7.5, "oilSpoons": 2,
    "template": "push|pull|legs|other",   // 训练模板（Java 侧白名单校验）
    "training": true,                     // false = 用户明确「记为休息」；缺字段 = 未记录
    "durationMin": 52,                    // 「结束训练」弹窗填的实际耗时
    "effort": "tooLight|justRight|tired|tooMuch",  // 疲劳度，下一次排课据此加减档
    "exercises": [{
      "id": "uuid",
      "name": "卧推",
      "sets": 4, "reps": 8, "weight": 60,  // 旧口径的汇总值；新记录里由 setDetails 派生
      "setDetails": [                      // 逐组（最多 30 组）；自重动作 weight 可为 null
        {"reps": 8, "weight": 60, "done": true},
        {"reps": 8, "weight": 60, "done": false}
      ],
      "distanceKm": 5.2, "durationMin": 30, // 有氧项（无组次）
      "fromPlan": true,                     // 勾选计划加进来的行，取消勾选时只回收这类
      "weightApprox": true                  // 重量是按体重/器械推算的起步值，行内显示「约」
    }]
  }],
  "prefs": {                       // 随备份走；localStorage 只是即时缓存
    "planPrefs": {"days": 4, "split": "ppl|ul|fb", "gear": "mixed|barbell|dumbbell|machine|body", "minutes": 45, "request": "只有 40 分钟…"},
    "aiPlans": {                   // 按日「今日 AI 清单」（最多同步最近 10 天）
      "2026-11-22": [{"name": "卧推", "sets": 4, "reps": 8, "weight": 60,
                      "weightSource": "log|plan|model|inferred|family", "reason": "…",
                      "done": false, "source": "ai|week", "distanceKm": 0, "durationMin": 0}]
    },
    "bodyweightMoves": ["引体向上"],   // 用户手工标记的自重动作名
    "trainingConsent": true,           // 训练建议外发授权
    "preferences": [], "chatWeb": true, "unhelpfulChats": []
  }
}

```

### 1.2 localStorage 键与 state.prefs 的对应关系

| localStorage 键 | 内容 | 写入点 | 是否随备份（state.prefs） |
|---|---|---|---|
| `qingheng.planPrefs` | 周计划偏好 days/split/gear/minutes/request | `savePlanPrefs` | 是（`planPrefs`） |
| `qingheng.aiPlan.<date>` | 当天 AI 清单 | `aiPlanStore` | 是（`aiPlans`，最近 10 天） |
| `qingheng.weekPlan.<startDate>` | 本周计划缓存 + 指纹 | `writeWeekPlanCache` | **否**（本机缓存） |
| `qingheng.exerciseWeights` | 重量记忆（动作 → 日期/重量，180 天/120 条上限） | `rememberExerciseWeight` / `rememberPlanWeights` / `rememberExerciseLogs` | **否**（本机缓存） |
| `qingheng.sessionStart.<date>` | 训练计时起点时间戳 | `markSessionStart` | **否** |
| `qingheng.bodyweightMoves` | 用户自定义自重动作名（≤200） | `setUserBodyweight` | 是（`bodyweightMoves`） |
| `qingheng.training.consent` | 训练建议外发授权 | 授权入口 | 是（`trainingConsent`） |
| `qingheng.barWeight` | 杠铃杆重（总重计算器） | `installWeightCalc` | **否** |

### 1.3 三个「训练状态源」与各自的写入点

| 状态源 | 载体 | 谁写 | 谁读 |
|---|---|---|---|
| ① 本周安排（周计划） | `qingheng.weekPlan.<startDate>` 缓存 → `lastWeekPlan` 内存 | `renderWeekPlan` 生成后写缓存；`regenerateWeekPlan` 清缓存；`adoptWeekDay`/`week-plan` 点击只读 | 周计划卡、`dayTemplateSlot`、`seedExercisesFromPlan`、`weekPlanToday`、`buildTodayAgenda`（`hasPlan`/`planDay`） |
| ② 今日清单（AI 排今天 / 周计划采纳） | `qingheng.aiPlan.<date>` + `state.prefs.aiPlans` | `aiPlanStore`（被 `askAiPlan`、`adoptWeekDay`、`togglePlanDone`、`collectAiPlanEdits`、`applyEffortSignalToPlan`、清空按钮调用） | `renderAiPlan`、`renderAdviceOrder`、`buildTodayAgenda`、`seedExercisesFromPlan`、`compilePlanContext` |
| ③ 训练日志（实际记录） | `state.habits[].exercises / template / training / effort / durationMin` | `saveTrainingLog`、`addExercisesToToday`、`removeExerciseFromToday`、清空/记为休息按钮、`week-plan` 写入、`applyDraft` | 容量/概览/趋势、`exerciseRowHtml`、`latestExerciseValues`、`seedWeightMemoryFromHistory`、原生 `trainingLog()` / `adviceBody()` |

### 1.4 训练数据流向今天页（与容量 / 次数 / 蛋白联动）

```mermaid
flowchart TD
  H["state.habits[]<br/>exercises / template / training / effort"] -->|exercisesFor| EF["exercisesFor(date)"]
  EF -->|训练日判定| TO["trainedOn(date)"]
  TO --> IR["intakeRangeForDate(date)<br/>训练日 → trainingDayMin~Max"]
  IR --> TGT["今天页能量区间 / 蛋白带"]
  EF -->|trainingStatsOf| TS["容量 kg / 组数 / 自重次数"]
  TS --> OV["renderTrainingOverview<br/>周容量 / 部位分布"]
  TS --> PK["renderTodayPeek<br/>本周次数 N/M · 容量 · 较上周 %"]
  TS --> SUM["renderTrainingSummary<br/>对比上次 +N kg"]
  W["weekPlan 缓存"] --> BA["buildTodayAgenda<br/>hasPlan / planDay"]
  A["aiPlans[date]"] --> BA
  EF --> BA
  BA --> TA["今天页行动条 #today-action"]
```

### 1.5 关键口径（写死在代码里的约定，评审时别当成 bug）

- 训练日只看「有没有保存动作」（`trainedOn` / Java `trainedOn`），手填的训练情况字段已废弃；动作删空即回落休息日。
- 容量 = 逐组 `reps × weight` 求和；旧记录退回 `sets × reps × weight`；自重动作单独记「次数」，不折算 kg，也不与上次比 kg。
- 组间休息按动作给：复合 120–150s、孤立 60–90s、自重 75–90s、有氧 0s；目标为增肌/保持时取长档。
- 周计划重量永不留给用户空着：历史 ×1.025（减载 ×0.9）→ 无历史按体重推算 → 仍无则按器械给保守起步值，全部标 `weightApprox` 并在行内显示「约」。

## 2. 结构层：index.html 的训练相关结构

> 说明：`index.html` 是「最少行数」排版（一个卡片一整行）。为便于评审，下面只在标签之间插入换行，**标签、属性、层级顺序与源文件完全一致**。行号指源文件行号。

### 训练计划卡 #week-plan-card（含偏好 chips、本周安排、采纳/写入入口）

源文件行：`app/src/main/assets/index.html:33`（整行）

```html
<article class="card" id="week-plan-card">
<div class="card-heading">
<h2>训练计划</h2>
<button type="button" class="text-button" id="plan-explain-open" aria-haspopup="dialog" aria-controls="plan-sheet">计划说明 ▾</button>
</div>
<div class="plan-prefs-bar">
<p class="plan-prefs-summary" id="plan-prefs-summary" hidden>
</p>
<span class="plan-bar-actions">
<button type="button" class="text-button" id="pref-regen" title="按当前偏好重新排一遍，偏好不变" hidden>换一套</button>
<button type="button" class="text-button" id="pref-edit" hidden aria-expanded="false" aria-controls="plan-prefs">改偏好</button>
</span>
</div>
<div class="plan-prefs" id="plan-prefs">
<div class="pref-group">
<span class="pref-label">每周训练</span>
<div class="pref-chips" data-pref="days" role="group" aria-label="每周训练次数">
<button type="button" class="pref-chip" data-value="3">3 次</button>
<button type="button" class="pref-chip" data-value="4">4 次</button>
<button type="button" class="pref-chip" data-value="5">5 次</button>
<button type="button" class="pref-chip" data-value="6">6 次</button>
</div>
</div>
  <div class="pref-group">
<span class="pref-label">分化</span>
<div class="pref-chips" data-pref="split" role="group" aria-label="训练分化">
<button type="button" class="pref-chip" data-value="ppl">推拉腿</button>
<button type="button" class="pref-chip" data-value="ul">上下肢</button>
<button type="button" class="pref-chip" data-value="fb">全身</button>
</div>
</div>
  <div class="pref-group">
<span class="pref-label">器械</span>
<div class="pref-chips" data-pref="gear" role="group" aria-label="可用器械">
<button type="button" class="pref-chip" data-value="mixed">综合</button>
<button type="button" class="pref-chip" data-value="barbell">杠铃</button>
<button type="button" class="pref-chip" data-value="dumbbell">哑铃</button>
<button type="button" class="pref-chip" data-value="machine">固定器械</button>
<button type="button" class="pref-chip" data-value="body">自重</button>
</div>
</div>
  <div class="pref-group">
<span class="pref-label">单次时长</span>
<div class="pref-chips" data-pref="minutes" role="group" aria-label="单次训练时长">
<button type="button" class="pref-chip" data-value="30">30 分钟</button>
<button type="button" class="pref-chip" data-value="45">45 分钟</button>
<button type="button" class="pref-chip" data-value="60">60 分钟</button>
<button type="button" class="pref-chip" data-value="75">75 分钟</button>
<button type="button" class="pref-chip" data-value="90">90 分钟</button>
</div>
</div>
<div class="pref-group">
<span class="pref-label">训练要求（可选）</span>
<textarea id="plan-request" rows="2" maxlength="200" placeholder="例如：只有 40 分钟，想把腿练完；右肩不舒服，别安排过头推举">
</textarea>
<p class="fine-print">用在「换一套 / 生成本周计划」和「重排今天」：会改时长、排除不适合的动作，不合理时说明原因并给替代。</p>
</div>
<div class="button-row">
<button type="button" class="button subtle" id="pref-save" title="按当前偏好生成一周训练计划，并检查时长与周组数">生成本周计划</button>
</div>
</div>
<div id="week-plan">
<p class="muted">还没有足够的训练记录来自动生成；先记两周训练。</p>
</div>
</article>
```

### 训练概览 #training-overview（折叠块，内容由 renderTrainingOverview 写入）

源文件行：`app/src/main/assets/index.html:36`（整行）

```html
<section class="train-overview" id="training-overview">
<h3 class="train-overview-head">训练概览</h3>
<div class="overview-grid" id="training-overview-grid">
</div>
<div class="overview-bars" id="training-overview-bars" aria-hidden="true">
</div>
<p class="fine-print" id="training-overview-note">
</p>
</section>
```

### 训练日志卡 #training-log（工具栏 + 表单 + 记录/清空/休息 + 疲劳度 + 课后总结）

源文件行：`app/src/main/assets/index.html:36`（整行）

```html
<article class="card" id="training-log">
<div class="card-heading">
<h2>训练日志</h2>
<span class="tag" id="training-tag">未记录</span>
<span class="draft-state" id="training-draft-state" aria-live="polite">
</span>
</div>
<div class="training-toolbar" id="training-toolbar">
<button type="button" class="button subtle" id="ai-plan-ask" title="用 AI 按器械与时长重排今天">重排今天</button>
<button class="button subtle" type="button" id="training-add">＋ 添加动作</button>
</div>
<p class="ai-plan-note" id="ai-plan-note" hidden>
</p>
<p class="fine-print ai-plan-timing" id="ai-plan-timing" hidden>
</p>
<div class="inline-busy" id="plan-busy" hidden role="status" aria-live="polite">
<span class="busy-ring" aria-hidden="true">
</span>
<span class="inline-busy-text">正在排今天的动作顺序…</span>
</div>
<form id="training-form">
<div class="log-bar log-date">
<label class="log-template">
<span>日期</span>
<input type="date" id="training-date" name="date" required data-default-date>
</label>
</div>
<div class="log-bar">
<label class="log-template">
<span>模板</span>
<select name="template" id="training-template">
<option value="push">推（胸肩三头）</option>
<option value="pull">拉（背二头）</option>
<option value="legs">腿（下肢核心）</option>
<option value="other">其他</option>
</select>
</label>
<button type="button" class="text-button" id="training-repeat">照上次练</button>
</div>
<div class="preset-block">
<span class="preset-label">常用动作 · 点一下加入</span>
<div class="button-row" id="training-presets" aria-label="常用动作，点一下添加">
</div>
</div>
<div id="training-exercises" class="list-stack">
</div>
<div class="log-actions">
<button class="button primary" type="submit">保存训练</button>
</div>
<div class="log-tools">
<button class="text-button" type="button" id="weight-calc">杠铃总重</button>
<button class="text-button" type="button" id="training-rest" hidden>记为休息</button>
<button class="text-button" type="button" id="ai-plan-postpone" hidden>顺延到明天</button>
<button class="text-button" type="button" id="training-clear">清空今天的训练</button>
</div>
<p class="form-feedback" role="status" aria-live="polite">
</p>
</form>
<section id="training-summary" class="training-summary" aria-live="polite" hidden>
</section>
</article>
```

### 趋势页训练容量卡 #training-volume-card（内容由 renderVolumeTable 写入）

源文件行：`app/src/main/assets/index.html:62`（整行）

```html
<article class="card" id="training-volume-card">
<div class="card-heading">
<h2>训练容量（渐进超负荷）</h2>
</div>
<div class="table-wrap" id="volume-table">
</div>
</article>
```

### 计划说明抽屉 #plan-sheet（本周要求/怎么排的/负荷由 renderWeekPlan 搬入）

源文件行：`app/src/main/assets/index.html:135`（整行）

```html
<div class="sheet" id="plan-sheet" hidden role="presentation">
<div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="plan-sheet-title">
<p class="sheet-title" id="plan-sheet-title">计划说明</p>
<div class="sheet-scroll" id="plan-explain-body">
</div>
<div class="sheet-note" id="plan-explain-notes">
</div>
<button type="button" class="button subtle full-width" id="plan-sheet-close">关闭</button>
</div>
</div>
```

### 动作要点半屏 #exercise-guide

源文件行：`app/src/main/assets/index.html:136`（整行）

```html
<div class="term-sheet" id="exercise-guide" hidden role="dialog" aria-modal="true" aria-labelledby="exercise-guide-title">
<div class="term-panel">
<div class="term-head">
<strong id="exercise-guide-title">动作</strong>
<button type="button" class="term-close" id="exercise-guide-ok" aria-label="关闭">×</button>
</div>
<p class="term-full" id="exercise-guide-role">
</p>
<p class="guide-how" id="exercise-guide-how" hidden>
</p>
<ul class="guide-points" id="exercise-guide-points">
</ul>
<p class="fine-print note-safe">通用动作要点，不替代教练指导；有疼痛就停下。</p>
</div>
</div>
```

### 杠铃总重半屏 #weight-sheet

源文件行：`app/src/main/assets/index.html:133`（整行）

```html
<div class="term-sheet" id="weight-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="weight-title">
<div class="term-panel">
<div class="term-head">
<strong id="weight-title">杠铃总重怎么算</strong>
<button type="button" class="term-close" id="weight-close" aria-label="关闭">×</button>
</div>
<label class="weight-row">杆重 · kg<input type="number" id="bar-weight" value="20" min="0" max="60" step="0.5" inputmode="decimal">
</label>
<label class="weight-row">每侧片重 · kg<input type="number" id="plate-weight" value="15" min="0" max="100" step="0.5" inputmode="decimal">
</label>
<label class="weight-row">按单侧输入<input type="checkbox" id="weight-per-side" checked>
</label>
<p class="term-line" id="weight-result">—</p>
<p class="fine-print">总重 = 杆重 + 2 × 每侧片重（例：20 kg 杆 + 15 kg×2 = 50 kg）。哑铃按单只，器械按配重片标示。</p>
<div class="button-row">
<button type="button" class="button primary" id="weight-fill">填入当前动作的负重</button>
</div>
</div>
</div>
```

### 组间休息药丸 #rest-dock

源文件行：`app/src/main/assets/index.html:138`（整行）

```html
<div class="rest-dock" id="rest-dock">
<button type="button" class="rest-pill" id="rest-timer" aria-label="开始 90 秒组间休息">
<span class="rest-ring" aria-hidden="true">
<svg viewBox="0 0 28 28" focusable="false">
<circle class="rest-ring-track" cx="14" cy="14" r="11.5">
</circle>
<circle class="rest-ring-fill" cx="14" cy="14" r="11.5">
</circle>
</svg>
</span>
<span class="rest-label">
<span data-rest-label>休息 90s</span>
</span>
</button>
</div>
```

### 今天页训练入口 #today-training-line（菜单位置的按钮，点击跳到记录·训练）

源文件行：`app/src/main/assets/index.html:16`（整行）

```html
<button type="button" class="today-training-line text-button" id="today-training-line" hidden>
</button>
```

### 问答页「训练建议」分区（含今日清单挂载点）

源文件行：`app/src/main/assets/index.html:59`（整行）

```html
<button type="button" class="segment" role="tab" data-chat-panel="training" aria-selected="false">训练建议</button>
```

### 训练弹窗/抽屉的宿主说明

| 结构 | 宿主 | 说明 |
|---|---|---|
| 结束训练弹窗 | `#app-dialog`（通用确认弹窗，`index.html:126`） | 内容由 `trainingSaveDialogHtml()` 拼出后塞进 `#app-dialog-body` |
| 计划说明 | `#plan-sheet` | 周计划卡里的说明节点由 `renderWeekPlan()` **move** 进 `#plan-explain-body` |
| 杠铃总重 | `#weight-sheet` | `installWeightCalc()` 绑定 |
| 动作要点 | `#exercise-guide` | 名字本身是按钮，点开走 `showExerciseGuide()` |
| 组间休息 | `#rest-dock`（常驻）+ 动作卡内的 `.rest-line` | 两处共用同一个 `restEnd` |

## 3. 逻辑层：fragments 里的训练代码（按源文件顺序，整函数截取）

> 每个代码块上方标注「文件:起–止（行数）」。函数上方的原注释一并保留，便于对照设计意图。带 `[range]` 的是事件绑定/常量等非函数段。

### 3.1 全局状态、训练开关与配置同步（数据 / 消费层的开关）

#### `collectedAiPlans` — 00-head.fragment.js:877–886（10 行）

```js
  /** Collects the per-date AI plans (newest 10) from localStorage into one portable object. */
  function collectedAiPlans() {
    const plans = {};
    try {
      const prefix = 'qingheng.aiPlan.';
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort().slice(-10);
      for (const key of keys) { try { plans[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key)); } catch { } }
    } catch { }
    return plans;
  }
```

#### `schedulePrefsSync` — 00-head.fragment.js:887–895（9 行）

```js
  /** Debounced fire-and-forget write; a failed sync must never interrupt the user's action. */
  function schedulePrefsSync(patch) {
    try { clearTimeout(prefsSyncTimer); } catch { }
    prefsSyncTimer = setTimeout(() => {
      api('/api/prefs', {prefs: patch})
        .then(() => { if (window.QH && QH.bus && QH.EVENTS) QH.bus.emit(QH.EVENTS.PREFS_CHANGED, {}); })
        .catch(() => { });
    }, 400);
  }
```

#### `hydratePrefsFromState` — 00-head.fragment.js:896–948（53 行）

```js
  /** Restores localStorage from state.prefs on load, so a fresh phone regains its preferences.
   *  Uses the shared key constants (PLAN_PREFS_KEY / AI_PLAN_KEY) instead of new literals. */
  function hydratePrefsFromState(data) {
    const prefs = data && typeof data.prefs === 'object' && data.prefs !== null ? data.prefs : null;
    if (!prefs) return;
    try { if (prefs.planPrefs !== undefined && prefs.planPrefs !== null) localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs.planPrefs)); } catch { }
    try {
      if (prefs.aiPlans && typeof prefs.aiPlans === 'object') {
        for (const [date, plan] of Object.entries(prefs.aiPlans)) localStorage.setItem(AI_PLAN_KEY(date), JSON.stringify(plan));
      }
    } catch { }
    try {
      if (Array.isArray(prefs.unhelpfulChats)) localStorage.setItem(CHAT_UNHELPFUL_KEY, JSON.stringify(prefs.unhelpfulChats));
      if (typeof prefs.chatWeb === 'boolean') localStorage.setItem(CHAT_WEB_KEY, prefs.chatWeb ? '1' : '0');
      if (prefs.trainingConsent === true) localStorage.setItem(TRAINING_CONSENT_KEY, '1');
      // 三餐/加餐划分时刻：随备份恢复，否则换机后回到默认 11:20 / 16:30 / 22:00。
      if (prefs.mealWindow && typeof prefs.mealWindow === 'object' && !Array.isArray(prefs.mealWindow)) {
        const saved = prefs.mealWindow;
        localStorage.setItem(MEAL_WINDOW_KEY, JSON.stringify({
          lunchFrom: clockPattern.test(saved.lunchFrom) ? saved.lunchFrom : DEFAULT_MEAL_WINDOW.lunchFrom,
          dinnerFrom: clockPattern.test(saved.dinnerFrom) ? saved.dinnerFrom : DEFAULT_MEAL_WINDOW.dinnerFrom,
          snackFrom: clockPattern.test(saved.snackFrom) ? saved.snackFrom : DEFAULT_MEAL_WINDOW.snackFrom
        }));
      }
    if (Array.isArray(prefs.bodyweightMoves)) {
      localStorage.setItem(BODYWEIGHT_MARK_KEY, JSON.stringify(prefs.bodyweightMoves));
      if (typeof loadUserBodyweightMarks === 'function') loadUserBodyweightMarks();
    }
      if (Array.isArray(prefs.preferences)) {
        const entries = normalizePreferenceEntries(prefs.preferences, prefs.preferenceMeta);
        const local = readPreferenceRows();
        const localByText = new Map(local.map(row => [row.text, row]));
        const merged = entries.map(row => {
          const old = localByText.get(row.text);
          if (!old) return row;
          return {
            ...row,
            source: row.source === 'legacy' && old.source !== 'legacy' ? old.source : row.source,
            createdAt: row.createdAt || old.createdAt,
            updatedAt: row.updatedAt || old.updatedAt
          };
        });
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
        localStorage.removeItem(PREFERENCE_META_KEY);
        const alreadyObjects = prefs.preferences.every(item => item && typeof item === 'object' && !Array.isArray(item) && typeof item.text === 'string');
        // Lift an old string/meta backup to the object array in state as well, not just in the cache.
        if ((!alreadyObjects || prefs.preferenceMeta || JSON.stringify(merged) !== JSON.stringify(entries)) && typeof schedulePrefsSync === 'function') {
          try {schedulePrefsSync({preferences: merged, preferenceMeta: null});} catch {}
        }
      }
    } catch { }
    if (typeof renderPreferences === 'function') renderPreferences();
  }
```

#### `verifyConfigSync` — 00-head.fragment.js:966–976（11 行）

```js
  /** 启动时对齐一次：本地缓存是当前事实，state.prefs 是随备份走的那份；漂移时以本地为准回写。 */
  function verifyConfigSync() {
    const stored = state && state.prefs && typeof state.prefs === 'object' ? state.prefs : {};
    const patch = {};
    for (const entry of CONFIG_REGISTRY) {
      if (JSON.stringify(entry.read()) === JSON.stringify(entry.fromState(stored))) continue;
      patch[entry.id] = entry.read();
    }
    if (Object.keys(patch).length) schedulePrefsSync(patch);
    return Object.keys(patch);
  }
```

#### `loadState` — 00-head.fragment.js:997–1033（37 行）

```js
  async function loadState(options = {}) {    const revision = ++requestRevision;
    try {
      const data = await api('/api/state');
      if (!data || !data.profile || !Array.isArray(data.measurements) || !Array.isArray(data.meals) || !Array.isArray(data.habits)) throw new Error('手机本地数据结构不完整，请检查备份或重新打开应用。');
      if (revision !== requestRevision) return;
      // /api/state carries records only. Replacing settings with {} here used to erase the
      // saved model config, which silently disabled photo analysis until the app restarted.
      const keptSettings = (state && typeof state.settings === 'object' && state.settings) || {};
      state = {...data, settings: (data.settings && typeof data.settings === 'object') ? data.settings : keptSettings}; loaded = true; loadFailed = false;
      settingsKnown = typeof state.settings.apiConfigured === 'boolean';
      hydratePrefsFromState(state);
      ensurePreferenceStorage();
      if (options.populate !== false) {populate($('#profile-form'), state.profile); applySettings(state.settings);
        const weightField = $('#profile-form').elements.weight;
        if (weightField && !weightField.value) weightField.value = latestWeight() || '';
      }
      render(); connection();
      renderUndatedMeals();
      if (!options.quiet) notice('');
      const repair = state.mealDateRepair;
      if (repair && number(repair.count) > 0) {
        const key = `qingheng.mealdate.${repair.at || repair.count}`;
        let seen = false;
        try {seen = localStorage.getItem(key) === '1';} catch {}
        if (!seen) {
          try {localStorage.setItem(key, '1');} catch {}
          notice(`已为 ${fmt(repair.count, 0)} 条缺少日期的餐食按拍摄时间或记录时间补上日期，请核对记录。`);
        }
      }
      if (!state.onboardingDone && number((state.profile || {}).height) === null && !options.skipOnboarding) showOnboarding(true);
      // 每次加载对齐一次本地缓存与 state.prefs，避免新增配置只存了一半。
      try { verifyConfigSync(); } catch { }
      // 一次性清掉旧版本把「AI 排今天」工具调用误存成问答的条目；只删这个固定开头的机器提示。
      setTimeout(() => { cleanupPlanChatEntries().catch(() => {}); }, 800);
      if (options.offerTargetAdjustment !== false) setTimeout(() => {maybeOfferTargetAdjustment().catch(() => {});}, 0);
    } catch (error) {loaded = false; loadFailed = true; connection(); if (typeof showRenderError === 'function') showRenderError(error); notice(error.message,true); throw error;}
  }
```

#### `todayActionItems` — 00-head.fragment.js:1209–1227（19 行）

```js
  /**
   * 今天页唯一的一条行动行（2026-11-22 四模块清单之一）：
   * 左半执行当前那条 primary，右半 1/N › 打开「今天的状况」半屏——
   * 原来分居两处的 #slot-hint（下一步）与 #status-strip（状态轮播）在这里合一。
   */
  function todayActionItems() {
    const agenda = typeof todayAgendaState === "function" ? todayAgendaState() : null;
    const items = [];
    if (agenda && agenda.primary) items.push({label: agenda.primary.label, target: agenda.primary.target, tone: "info"});
    if (agenda && Array.isArray(agenda.secondary)) {
      for (const item of agenda.secondary) {
        if (item && item.label) items.push({label: item.label, target: item.target || "", tone: "info"});
      }
    }
    const live = activeDate === localDate();
    const missing = live ? missingMealSlots(activeDate, new Date()) : [];
    for (const item of missing) items.push({label: "补记" + item.label, target: "meal-text", tone: "warn"});
    return items;
  }
```

#### `renderTodayAction` — 00-head.fragment.js:1228–1259（32 行）

```js
  function renderTodayAction() {
    const bar = $("#today-action");
    if (!bar) return;
    const items = todayActionItems();
    const main = $("#today-action-main"), text = $("#today-action-text"), count = $("#today-action-count");
    if (!items.length) {
      // 没有缺口也不藏起来：退回一行安静的当日状态，位置固定，避免首屏高度来回跳。
      bar.hidden = false;
      bar.classList.remove("is-warn");
      bar.dataset.target = "";
      if (text) text.textContent = "今天没有要补的缺口，按计划走就好";
      if (count) count.textContent = "";
      if (main) main.disabled = false;
      return;
    }
    if (todayActionCursor >= items.length) todayActionCursor = 0;
    const item = items[todayActionCursor];
    bar.hidden = false;
    bar.classList.toggle("is-warn", item.tone === "warn");
    bar.dataset.target = item.target || "";
    if (text) {
      text.textContent = item.label;
      // 换条时轻微上浮淡入（180ms，reduced-motion 下由 CSS 关掉）。
      text.classList.remove("is-swap");
      void text.offsetWidth;
      text.classList.add("is-swap");
    }
    if (count) count.textContent = items.length > 1 ? `${todayActionCursor + 1}/${items.length} ›` : "›";
    bar.setAttribute("aria-label", items.length > 1
      ? `下一步：${item.label}。右边可以看今天的状况，共 ${items.length} 条`
      : `下一步：${item.label}`);
  }
```

#### `trainingEnabled` — 00-head.fragment.js:1370–1374（5 行）

```js
  /** True when the user told us they do not train, so training UI should not be shown at all. */
  function trainingEnabled() {
    const raw = state && state.profile ? String(state.profile.training ?? '') : '';
    return raw !== 'none';
  }
```

#### `trainingStateFor` — 00-head.fragment.js:1375–1391（17 行）

```js
  /**
   * One day's training state, independent of the DOM.
   * `trained` wins over an old rest marker so a contradictory row can never hide real work.
   * A missing `training` field means "not recorded", not "rest".
   */
  function trainingStateFor(input) {
    const src = input || {};
    const exercises = Array.isArray(src.exercises) ? src.exercises : [];
    if (exercises.some(item => item && String(item.name || '').trim())) return 'trained';
    if (String(src.profileTraining ?? '') === 'none') return 'disabled';
    if (src.habitTraining === false || String(src.habitTraining ?? '') === 'false') return 'rest';
    if (src.hasPlan) {
      const planned = src.planDay && Array.isArray(src.planDay.exercises) ? src.planDay.exercises : [];
      return planned.some(item => item && String(item.name || '').trim()) ? 'planned' : 'plan-rest';
    }
    return 'unrecorded';
  }
```

#### `hideTrainingTabs` — 00-head.fragment.js:1416–1434（19 行）

```js
  function hideTrainingTabs(on) {
    // 状态类留给 CSS：即使分段按钮被 JS 重建，display:none 依然生效。
    if (document.body) document.body.classList.toggle("no-training", !on);
    const selector = '[data-records-panel="training"], [data-trends-panel="training"], [data-go="training"], [data-focus="training"]';
    for (const node of document.querySelectorAll(selector)) node.hidden = !on;
    for (const id of ['record-panel-training', 'trend-panel-training']) {
      const node = document.getElementById(id);
      if (!node) continue;
      if (!on) { node.hidden = true; continue; }
      // 开启训练时不要强制显示：可见性归 switchRecordPanel / switchTrendPanel。
      // 旧写法 node.hidden = false 会在每次 applyTrainingVisibility 时把训练面板揭开，
      // 导致「身体」分段下也能看到训练计划（2026-10-29 修）。
      const isRecord = id === 'record-panel-training';
      const switcher = isRecord ? (typeof switchRecordPanel === 'function' ? switchRecordPanel : null)
                               : (typeof switchTrendPanel === 'function' ? switchTrendPanel : null);
      const active = document.querySelector((isRecord ? '[data-records-panel]' : '[data-trends-panel]') + '.active');
      if (switcher && active) switcher(active.dataset[isRecord ? 'recordsPanel' : 'trendsPanel']);
    }
  }
```

#### `applyTrainingVisibility` — 00-head.fragment.js:1435–1458（24 行）

```js
function applyTrainingVisibility() {
    const on = trainingEnabled();
    for (const id of ['training-log', 'training-advice', 'training-volume-card', 'week-plan-card', 'training-advice-order']) {
      const node = document.getElementById(id);
      if (node) node.hidden = !on;
    }
    hideTrainingTabs(on);
    // 分段按钮由 JS 在渲染后创建，这里再补一次，避免第一次调用时还找不到节点。
    if (typeof setTimeout === "function") setTimeout(() => hideTrainingTabs(trainingEnabled()), 0);
    if (!on) {
      const recordActive = document.querySelector('[data-records-panel].active');
      if (recordActive && recordActive.dataset.recordsPanel === "training") {
        const food = document.querySelector('[data-records-panel="food"]');
        if (food) food.click();
      }
      const trendActive = document.querySelector('[data-trends-panel].active');
      if (trendActive && trendActive.dataset.trendsPanel === "training") {
        const weight = document.querySelector('[data-trends-panel="weight"]');
        if (weight) weight.click();
      }
      const prefs = document.getElementById("plan-prefs");
      if (prefs) prefs.hidden = true;
    }
  }
```

### 3.2 今天页「本周训练」概况与上次训练建议（消费层）

#### `renderTodayPeek` — 10-rich-answer.fragment.js:458–524（67 行）

```js
  /**
   * 顶部横滑概况（2026-11-22 第七轮）：每枚卡 = 主数 + 基准 + 进度/缺口。
   * 硬约束：数字旁边必须有一个比较对象（计划次数 / 上周容量 / 目标区间 / 7 日变化），带不出基准的不上卡。
   */
  function renderTodayPeek() {
    const box = $('#today-peek');
    if (!box) return;
    const end = new Date(activeDate + 'T00:00:00');
    if (Number.isNaN(end.getTime())) return;
    const windowOf = offset => {
      const to = new Date(end); to.setDate(end.getDate() + offset);
      const from = new Date(to); from.setDate(to.getDate() - 6);
      let volume = 0, sessions = 0;
      for (const row of (state.habits || [])) {
        if (!row || !Array.isArray(row.exercises) || !row.exercises.length || !validDate(row.date)) continue;
        const day = new Date(row.date + 'T00:00:00');
        if (Number.isNaN(day.getTime()) || day < from || day > to) continue;
        sessions++;
        volume += row.exercises.reduce((sum, item) => sum + (trainingVolumeOf([item]) || 0), 0);
      }
      return {volume, sessions};
    };
    const thisWeek = windowOf(0), lastWeek = windowOf(-7);
    const planDays = number(typeof planPrefs === 'function' ? planPrefs().days : null);
    const volumeDelta = lastWeek.volume > 0 && thisWeek.volume > 0
      ? Math.round((thisWeek.volume - lastWeek.volume) / lastWeek.volume * 100) : null;

    const measurements = (state.measurements || []).filter(item => validDate(item.date) && item.date <= activeDate).sort((a, b) => b.date.localeCompare(a.date));
    const weight = latestField(measurements, 'weight'), bodyFat = latestField(measurements, 'bodyFat');
    const profile = typeof effectiveProfileForDate === 'function' ? effectiveProfileForDate(activeDate) : {};
    const targetMin = number(profile.weightTargetMin), targetMax = number(profile.weightTargetMax);
    const currentWeight = weight ? number(weight.weight) : null;
    // 目标区间：报「还差多少」而不是「目标是多少」——差值才是可判断的信息。
    let targetLine = '';
    if (currentWeight !== null && targetMin !== null && targetMax !== null) {
      if (currentWeight > targetMax) targetLine = `距目标 ${fmt(targetMin, 1)}–${fmt(targetMax, 1)} 还差 ${fmt(currentWeight - targetMax, 1)} kg`;
      else if (currentWeight < targetMin) targetLine = `距目标 ${fmt(targetMin, 1)}–${fmt(targetMax, 1)} 还差 ${fmt(targetMin - currentWeight, 1)} kg`;
      else targetLine = `已在目标区间 ${fmt(targetMin, 1)}–${fmt(targetMax, 1)}`;
    }
    // 7 日变化：取 activeDate-7 当天或之前最近一条体重，和当前读数比。
    let weekDelta = null;
    if (currentWeight !== null) {
      const mark = new Date(end); mark.setDate(mark.getDate() - 7);
      const markDate = mark.toISOString().slice(0, 10);
      const past = measurements.find(row => row.date <= markDate && number(row.weight) !== null);
      if (past) weekDelta = currentWeight - number(past.weight);
    }
    const bodySub = [targetLine,
      weekDelta === null ? '' : `7 日 ${weekDelta >= 0 ? '+' : '−'}${fmt(Math.abs(weekDelta), 1)} kg`,
      !targetLine && bodyFat && number(bodyFat.bodyFat) !== null ? `体脂 ${fmt(bodyFat.bodyFat, 1)}%` : ''
    ].filter(Boolean).join(' · ');

    const cards = [
      {label: '本周训练', value: thisWeek.sessions ? `${fmt(thisWeek.sessions, 0)}${planDays ? ' / ' + fmt(planDays, 0) : ''} 次` : '还没练',
        sub: thisWeek.sessions ? `容量 ${fmt(thisWeek.volume, 0)} kg${volumeDelta === null ? '' : ` · 较上周 ${volumeDelta >= 0 ? '+' : '−'}${Math.abs(volumeDelta)}%`}` : '先记一节',
        progress: planDays ? Math.min(1, thisWeek.sessions / planDays) : null, focus: 'training-form'},
      {label: '身体', value: currentWeight !== null ? `${fmt(currentWeight, 1)} kg` : '—',
        sub: bodySub || '还没有体重记录', progress: null, focus: 'measurement-weight'}
    ];
    box.innerHTML = cards.map(card =>
      `<button type="button" class="peek-card" data-go="records" data-focus="${card.focus}" role="listitem">`
      + `<span class="peek-label">${esc(card.label)}</span><b class="peek-value">${esc(card.value)}</b>`
      + (card.sub ? `<span class="peek-sub">${esc(card.sub)}</span>` : '')
      + (card.progress === null ? '' : `<span class="peek-bar" aria-hidden="true"><i style="width:${(card.progress * 100).toFixed(0)}%"></i></span>`)
      + '</button>'
    ).join('');
  }
```

### 3.3 今天页刷新中枢与快捷动作（消费层）

#### `scheduleTodayRefresh` — 25-today-hub.fragment.js:33–51（19 行）

```js
  /**
   * 把同一帧里的多次保存合并成一次刷新。
   * @param {string|string[]} sections 需要刷新的区域，超出白名单的值忽略。
   */
  function scheduleTodayRefresh(sections) {
    const list = Array.isArray(sections) ? sections : [sections];
    for (const section of list) {
      if (TODAY_REFRESH_SECTIONS.includes(section)) todayRefreshPending.add(section);
    }
    if (!todayRefreshPending.size || todayRefreshFrame) return;
    const flush = () => {
      todayRefreshFrame = 0;
      const pending = [...todayRefreshPending];
      todayRefreshPending = new Set();
      if (pending.some(section => section !== 'timeline')) { runTodayRefresh('energy'); return; }
      runTodayRefresh('timeline');
    };
    todayRefreshFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(flush) : setTimeout(flush, 16);
  }
```

#### `installTodayQuickActions` — 25-today-hub.fragment.js:72–101（30 行）

```js
  /** Place common actions below the calorie summary, in reach without covering page content. */
  function installTodayQuickActions() {
    const view = $('#view-today');
    if (!view || $('#today-quick-actions')) return;
    const energyCard = $('.energy-card', view);
    if (!energyCard) return;
    const row = document.createElement('div');
    row.className = 'quick-actions';
    row.id = 'today-quick-actions';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '今日快捷操作');
    row.innerHTML = [
      ['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary'],
      ['icon-glyph-training.svg', '训练', 'training-form', ''],
      ['icon-glyph-balance.svg', '身体', 'measurement-weight', '']
    ].filter(([, , focus]) => focus !== 'training-form' || trainingEnabled()).map(([icon, label, focus, className = '']) => `<button type="button" class="quick-chip ${className}" data-quick-focus="${focus}" data-quick-icon="${icon}"><span class="quick-chip-icon" aria-hidden="true">${iconMarkup(icon)}</span>${label}</button>`).join('');
    // 动作组紧贴能量卡之下：先读数（环 → 宏量三列 → 补蛋白提示），再动作。
    // 不放进卡里——卡内动作条会把一张卡切成两半；也没挂在宏量后面，空态时环与宏量都是 hidden，锚点会消失。
    // 2026-11-22 第五轮：三个核心入口进卡，固定在能量环下方的黄金区；
    // 不再靠 ⋯ 菜单承载主操作，低频的「显示指标」移到小习惯卡标题。
    const anchor = $('.energy-body', energyCard);
    if (anchor && anchor.parentElement === energyCard) anchor.after(row);
    else energyCard.prepend(row);

    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      openRecordTarget(chip.dataset.quickFocus);
    });
  }
```

#### `loadTodayAdvice` — 25-today-hub.fragment.js:103–125（23 行）

```js
  /**
   * Today's advice, grouped by slot. The page used to open on an empty query form, which read as
   * "there is no advice" even when this morning's push had already written one.
   */
  async function loadTodayAdvice() {
    const box = $('#push-today'); if (!box) return;
    const tag = $('#push-today-tag');
    const today = localDate();
    if (tag) tag.textContent = today;
    try {
      const data = await api('/api/push-history');
      const order = {morning: 0, meal: 1, evening: 2, weekly: 3};
      const slotNames = {morning: '白天建议', meal: '餐后反馈', evening: '晚间复盘', weekly: '每周复盘'};
      const rows = (Array.isArray(data && data.records) ? data.records : [])
        .filter(row => row && String(row.date) === today)
        .sort((a, b) => (order[a.slot] ?? 9) - (order[b.slot] ?? 9) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
      box.innerHTML = rows.length
        ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(slotNames[row.slot] || row.slot || '建议')}</strong><span class="row-tag">${row.source === 'api' ? '外部模型' : row.source === 'skipped' ? '已跳过' : '提醒'}</span><span class="row-date">${esc(String(row.date || ''))}</span></div><div class="answer">${answerHtml(row.message || '')}</div></div></div>`).join('')
        : empty('今天还没有生成建议。开启每日推送后，07:30 与 20:30 的分析会出现在这里；也可以直接在问答页问一句。');
    } catch (error) {
      box.textContent = error.message;
    }
  }
```

### 3.4 训练天数进入目标计算（数据层）

#### `plannedSessions` — 40-targets.fragment.js:32–42（11 行）

```js
  /** 每周训练天数只认「记录→训练计划」的偏好；老档案里的 training 仅作兜底。 */
  function plannedSessions() {
    try {
      const raw = localStorage.getItem("qingheng.planPrefs");
      const prefs = raw ? JSON.parse(raw) : null;
      const days = number(prefs && prefs.days);
      if (days !== null && days > 0) return days;
    } catch { }
    const legacy = number(state && state.profile ? state.profile.training : null);
    return legacy !== null && legacy > 0 ? legacy : null;
  }
```

### 3.5 **训练领域层（纯计算，零 DOM）**：容量口径、ACWR、周计划生成、重量记忆、要点检索

#### TRAINING_TEMPLATES 模板码 — 55-training-domain.fragment.js:8–8（1 行）

```js
  const TRAINING_TEMPLATES = {push: '推', pull: '拉', legs: '腿', upper: '上肢', lower: '下肢', full: '全身', other: '其他'};
```

#### `readBodyweightMarks` — 55-training-domain.fragment.js:27–37（11 行）

```js
  /**
   * 用户自己认定的自重动作（2026-11-23）：训练行里点「自重」就把这个名字记下来，
   * 以后识别到同名动作直接按自重处理——不填负重也合法。
   * 名字表存 localStorage 并随 prefs 进 state.json，换机也带着走。
   */
  function readBodyweightMarks() {
    try {
      const raw = JSON.parse(localStorage.getItem(BODYWEIGHT_MARK_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(name => String(name || '').trim()).filter(Boolean) : [];
    } catch { return []; }
  }
```

#### `loadUserBodyweightMarks` — 55-training-domain.fragment.js:39–42（4 行）

```js
  function loadUserBodyweightMarks() {
    USER_BODYWEIGHT.clear();
    for (const name of readBodyweightMarks()) USER_BODYWEIGHT.add(name);
  }
```

#### `isUserBodyweight` — 55-training-domain.fragment.js:44–46（3 行）

```js
  function isUserBodyweight(name) {
    return USER_BODYWEIGHT.has(String(name || '').trim());
  }
```

#### `setUserBodyweight` — 55-training-domain.fragment.js:48–59（12 行）

```js
  function setUserBodyweight(name, on) {
    const key = String(name || '').trim();
    if (!key) return false;
    const names = new Set(readBodyweightMarks());
    if (on) names.add(key); else names.delete(key);
    const list = [...names].slice(-200);
    try { localStorage.setItem(BODYWEIGHT_MARK_KEY, JSON.stringify(list)); } catch { }
    USER_BODYWEIGHT.clear();
    for (const row of list) USER_BODYWEIGHT.add(row);
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({bodyweightMoves: list});
    return true;
  }
```

#### `isBodyweightMove` — 55-training-domain.fragment.js:61–68（8 行）

```js
  function isBodyweightMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    // 用户标过的名字优先：他比正则更知道自己练的是什么。
    if (USER_BODYWEIGHT.has(text)) return true;
    if (/(负重|加片|哑铃|杠铃|壶铃|配重|史密斯|器械)/.test(text)) return false;
    return BODYWEIGHT_MOVES.test(text);
  }
```

#### `isCompoundMove` — 55-training-domain.fragment.js:70–75（6 行）

```js
  function isCompoundMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    if (ISOLATION_MOVES.test(text)) return false;
    return COMPOUND_MOVES.test(text);
  }
```

#### `isCardioName` — 55-training-domain.fragment.js:77–85（9 行）

```js
  /**
   * 一个动作 = 一张手账：编号 + 动作名（行标题，不套框）→ 每一组一行「次 × kg」→ 加一组 / 容量。
   * 删除放在动作名行右端与组行末尾，避免 44px 危险按钮压在标题行上方。
   */
  /** 有氧动作（跑步 / 骑行 / 椭圆…）：没有组次负重，记距离与时长。只认前缀，别把「杠铃划船」当下肢有氧。 */
  function isCardioName(name) {
    const text = String(name || '').trim();
    return /^(跑步|慢跑|快跑|快走|走路|散步|骑行|单车|椭圆|划船机|跳绳|爬楼|爬坡|有氧)/.test(text);
  }
```

#### `isCardioItem` — 55-training-domain.fragment.js:87–89（3 行）

```js
  function isCardioItem(item) {
    return isCardioName(item && item.name) || number(item && item.distanceKm) !== null || number(item && item.durationMin) !== null;
  }
```

#### ACWR_HIGH / ACWR_LOW 阈值 — 55-training-domain.fragment.js:91–119（29 行）

```js
  // ---------------------------------------------------------------------------------------------
  // 纯函数：通用草稿、每日体检、负荷与平台期、周计划
  // ---------------------------------------------------------------------------------------------
  // 阈值集中在这里：提示词、文案与判定都引用同一组数，避免「代码改了文案没改」的漂移。
  const ACWR_HIGH = 1.5;

  const ACWR_LOW = 0.8;

  const WEIGHT_MEMORY_KEY = 'qingheng.exerciseWeights';

  const WEIGHT_MEMORY_DAYS = 180;

  const WEIGHT_MEMORY_MAX = 120;

  /** 动作族：只用于「同族迁移」与起步重量，不拿别族的重量直接照搬。 */
  const WEIGHT_FAMILIES = [
    ['卧推', /卧推|推胸/],
    ['肩推', /推肩|肩推|实力举|借力推/],
    ['深蹲', /深蹲|哈克|腿举|分腿蹲|保加利亚|箭步/],
    ['硬拉', /硬拉|罗马尼亚|早安/],
    ['划船', /划船|引体|下拉/],
    ['弯举', /弯举|锤式/],
    ['臂屈伸', /下压|臂屈伸/],
    ['飞鸟', /飞鸟|夹胸/],
    ['侧平举', /侧平举|前平举|后束|面拉/],
    ['提踵', /提踵/],
    ['臀推', /臀桥|臀推/],
    ['核心', /卷腹|举腿|平板|挺身/]
  ];
```

#### WEIGHT_MEMORY_KEY / WEIGHT_MEMORY_DAYS / WEIGHT_MEMORY_MAX — 55-training-domain.fragment.js:99–119（21 行）

```js
  const WEIGHT_MEMORY_KEY = 'qingheng.exerciseWeights';

  const WEIGHT_MEMORY_DAYS = 180;

  const WEIGHT_MEMORY_MAX = 120;

  /** 动作族：只用于「同族迁移」与起步重量，不拿别族的重量直接照搬。 */
  const WEIGHT_FAMILIES = [
    ['卧推', /卧推|推胸/],
    ['肩推', /推肩|肩推|实力举|借力推/],
    ['深蹲', /深蹲|哈克|腿举|分腿蹲|保加利亚|箭步/],
    ['硬拉', /硬拉|罗马尼亚|早安/],
    ['划船', /划船|引体|下拉/],
    ['弯举', /弯举|锤式/],
    ['臂屈伸', /下压|臂屈伸/],
    ['飞鸟', /飞鸟|夹胸/],
    ['侧平举', /侧平举|前平举|后束|面拉/],
    ['提踵', /提踵/],
    ['臀推', /臀桥|臀推/],
    ['核心', /卷腹|举腿|平板|挺身/]
  ];
```

#### WEIGHT_FAMILIES / WEIGHT_EQUIP / WEIGHT_RATIOS — 55-training-domain.fragment.js:105–119（15 行）

```js
  /** 动作族：只用于「同族迁移」与起步重量，不拿别族的重量直接照搬。 */
  const WEIGHT_FAMILIES = [
    ['卧推', /卧推|推胸/],
    ['肩推', /推肩|肩推|实力举|借力推/],
    ['深蹲', /深蹲|哈克|腿举|分腿蹲|保加利亚|箭步/],
    ['硬拉', /硬拉|罗马尼亚|早安/],
    ['划船', /划船|引体|下拉/],
    ['弯举', /弯举|锤式/],
    ['臂屈伸', /下压|臂屈伸/],
    ['飞鸟', /飞鸟|夹胸/],
    ['侧平举', /侧平举|前平举|后束|面拉/],
    ['提踵', /提踵/],
    ['臀推', /臀桥|臀推/],
    ['核心', /卷腹|举腿|平板|挺身/]
  ];
```

#### LIBRARY_ROUTES 部位路由表 — 55-training-domain.fragment.js:156–169（14 行）

```js
  /** Keyword → tag routing, so a question about 腹肌 gets the abs rules instead of the top 6 by priority. */
  const LIBRARY_ROUTES = [
    {match: /腹肌|核心|举腿|卷腹/, tags: ['abs']},
    {match: /肩|侧平举|后束|飞鸟/, tags: ['shoulder']},
    {match: /腿|深蹲|硬拉|保加利亚/, tags: ['legs']},
    {match: /背|划船|下拉|引体/, tags: ['pull']},
    {match: /胸|卧推|推日|上斜/, tags: ['push']},
    {match: /热身|激活|拉伸|放松|泡沫轴/, tags: ['warmup', 'stretch']},
    {match: /力竭|RPE|组数|次数|强度/, tags: ['intensity', 'main']},
    {match: /减脂|减肥|缺口|平台|体重不降/, tags: ['fatloss', 'deficit']},
    {match: /蛋白|蛋白质|吃多少/, tags: ['protein']},
    {match: /睡眠|熬夜|累|疲劳|恢复/, tags: ['sleep', 'recovery']},
    {match: /增肌|肌肉|围度/, tags: ['main', 'volume']}
  ];
```

#### `habitRowFor` — 55-training-domain.fragment.js:171–176（6 行）

```js
  /** The habit row for a date; older builds could append duplicates, so keep the fullest one. */
  function habitRowFor(date) {
    const rows = (state.habits || []).filter(row => row && row.date === date);
    if (rows.length <= 1) return rows[0] || null;
    return rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  }
```

#### `trainedOn` — 55-training-domain.fragment.js:178–184（7 行）

```js
  /**
   * 当天算不算训练日：只看「有没有保存训练动作」（2026-11-18 用户要求：训练情况由动作判断，
   * 不再让用户在「日常习惯」里手填）。动作删空就自动回落成休息日。
   */
  function trainedOn(date) {
    return exercisesFor(date).some(item => item && String(item.name || '').trim());
  }
```

#### `exercisesFor` — 55-training-domain.fragment.js:186–196（11 行）

```js
  /** Normalised exercise list of one day: [{name, sets, reps, weight}]. */
  function exercisesFor(date) {
    const row = habitRowFor(date);
    const list = Array.isArray(row?.exercises) ? row.exercises : [];
    return list.map(item => ({
      id: item && item.id ? String(item.id) : '',
      name: String(item?.name ?? '').slice(0, 60),
      sets: number(item?.sets), reps: number(item?.reps), weight: number(item?.weight),
      distanceKm: number(item?.distanceKm), durationMin: number(item?.durationMin)
    })).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null);
  }
```

#### `trainingStatsOf` — 55-training-domain.fragment.js:198–228（31 行）

```js
  /**
   * 一次训练的三个口径：kg 容量、总组数、自重次数。
   * 自重的次数单独计数，不乘一个假想体重去冒充 kg 容量——缺什么就报什么，但组次要进分析。
   */
  function trainingStatsOf(items) {
    const out = {volume: 0, sets: 0, bodyweightReps: 0};
    for (const item of (items || [])) {
      if (!item) continue;
      const hasDetails = Array.isArray(item.setDetails) && item.setDetails.length > 0;
      const bodyweight = isBodyweightMove(item.name);
      if (!hasDetails) {
        // 旧记录只有「组数 / 次数 / 重量」三个数：按 sets × reps × weight 计，别把它当成一组。
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        out.sets += Math.max(0, Math.round(sets || 0));
        if (!(sets > 0) || reps === null) continue;
        if (weight !== null && weight > 0) out.volume += sets * reps * weight;
        else if (bodyweight) out.bodyweightReps += sets * reps;
        continue;
      }
      out.sets += item.setDetails.length;
      for (const set of item.setDetails) {
        const reps = number(set && set.reps), weight = number(set && set.weight);
        if (reps === null) continue;
        if (weight !== null && weight > 0) out.volume += reps * weight;
        else if (bodyweight) out.bodyweightReps += reps;
      }
    }
    out.volume = Math.round(out.volume);
    out.bodyweightReps = Math.round(out.bodyweightReps);
    return out;
  }
```

#### `trainingVolumeOf` — 55-training-domain.fragment.js:230–244（15 行）

```js
  function trainingVolumeOf(items) {
    let volume = 0;
    for (const item of (items || [])) {
      if (Array.isArray(item.setDetails) && item.setDetails.length) {
        for (const set of item.setDetails) {
          const reps = number(set.reps), weight = number(set.weight);
          if (reps !== null && weight !== null && weight > 0) volume += reps * weight;
        }
      } else {
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        if (sets !== null && reps !== null && weight !== null && weight > 0) volume += sets * reps * weight;
      }
    }
    return Math.round(volume);
  }
```

#### `latestExerciseValues` — 55-training-domain.fragment.js:246–262（17 行）

```js
  /** Most recent recorded values for one exercise, so a repeat is one tap instead of retyping. */
  function latestExerciseValues(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return null;
    const rows = (state.habits || []).filter(row => row && Array.isArray(row.exercises) && validDate(row.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    for (const row of rows) {
      for (const item of row.exercises) {
        if (!item || String(item.name || '').trim() !== wanted) continue;
        // 顶组口径：金字塔组按「最重那组的次数」预填，不再拿第一组次数配最大重量。
        const top = topSetSummary(item);
        if (!(top.sets > 0) || top.reps === null || top.weight === null) continue;
        return {sets: top.sets, reps: top.reps, weight: top.weight, date: row.date};
      }
    }
    return null;
  }
```

#### `topSetSummary` — 55-training-domain.fragment.js:264–284（21 行）

```js
  /**
   * 顶组摘要：基准重量与「那个重量做了几次」。金字塔组（10×40 / 8×60 / 5×80）不能拿第一组的次数
   * 配最大重量——那会让渐进规则和基线一起失真。旧记录没有 setDetails 时退回外层三字段。
   */
  function topSetSummary(item) {
    if (!item) return {weight: null, reps: null, sets: 0};
    const details = Array.isArray(item.setDetails)
      ? item.setDetails.filter(set => set && number(set.reps) !== null)
      : [];
    if (!details.length) {
      return {weight: number(item.weight), reps: number(item.reps), sets: number(item.sets) || 0};
    }
    let best = null;
    for (const set of details) {
      const reps = number(set.reps), weight = number(set.weight);
      const kg = weight === null ? -1 : weight;
      const bestKg = best === null || best.weight === null ? -1 : best.weight;
      if (best === null || kg > bestKg || (kg === bestKg && reps > best.reps)) best = {reps, weight};
    }
    return {weight: best.weight, reps: best.reps, sets: details.length};
  }
```

#### `weeklyVolume` — 55-training-domain.fragment.js:286–315（30 行）

```js
  /** Weekly volume per exercise, newest week first, using ISO weeks (Monday start). */
  function weeklyVolume() {
    const byExercise = new Map();
    for (const row of (state.habits || [])) {
      if (!row || !Array.isArray(row.exercises) || !validDate(row.date)) continue;
      const date = new Date(`${row.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      for (const item of row.exercises) {
        const name = String(item?.name ?? '').trim();
        // 2026-11-17：与训练概览同口径——有 setDetails 按逐组算，旧记录退回 sets×reps×weight。
        const volume = trainingVolumeOf([item]);
        if (!name || volume === null) continue;
        if (!byExercise.has(name)) byExercise.set(name, new Map());
        const weeks = byExercise.get(name);
        weeks.set(week, (weeks.get(week) || 0) + volume);
      }
    }
    const out = [];
    for (const [name, weeks] of byExercise) {
      const ordered = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (ordered.length < 2) continue;
      const [lastWeek, lastVolume] = ordered[ordered.length - 1];
      const [prevWeek, prevVolume] = ordered[ordered.length - 2];
      out.push({name, lastWeek, lastVolume, prevWeek, prevVolume, delta: lastVolume - prevVolume});
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.lastVolume - a.lastVolume).slice(0, 6);
  }
```

#### `exerciseKey` — 55-training-domain.fragment.js:317–319（3 行）

```js
  function exerciseKey(name) {
    return String(name || '').replace(/[\s·・\-_/（）()]/g, '').toLowerCase();
  }
```

#### `exerciseFamily` — 55-training-domain.fragment.js:321–325（5 行）

```js
  function exerciseFamily(name) {
    const text = String(name || '');
    for (const [family, re] of WEIGHT_FAMILIES) if (re.test(text)) return family;
    return '';
  }
```

#### `exerciseEquip` — 55-training-domain.fragment.js:327–331（5 行）

```js
  function exerciseEquip(name) {
    const text = String(name || '');
    for (const [equip, re] of WEIGHT_EQUIP) if (re.test(text)) return equip;
    return '';
  }
```

#### `exerciseBodyPart` — 55-training-domain.fragment.js:339–343（5 行）

```js
  function exerciseBodyPart(name) {
    const text = String(name || '');
    for (const [part, re] of BODY_PART_RULES) if (re.test(text)) return part;
    return 'other';
  }
```

#### `planPartFor` — 55-training-domain.fragment.js:352–359（8 行）

```js
  /** 从「今天按周计划应练：推日」这类整句里认出部位。 */
  function planPartFor(text) {
    const s = String(text || '');
    if (/腿|蹲|硬拉|臀|提踵/.test(s)) return 'legs';
    if (/拉|背/.test(s)) return 'pull';
    if (/推|胸|肩/.test(s)) return 'push';
    return 'other';
  }
```

#### `dominantTemplateFor` — 55-training-domain.fragment.js:361–382（22 行）

```js
  /**
   * 从动作列表推断顶部模板（push/pull/legs/other）。
   * 播种、照上次练、周计划带进来的动作决定模板，别再让顶部一直停在默认的「推」。
   * 混练（第二部位占比 ≥1/3，如全身日/上肢日）归 other，不硬塞成单分化。
   */
  function dominantTemplateFor(names) {
    const counts = {push: 0, pull: 0, legs: 0};
    let total = 0;
    for (const raw of Array.isArray(names) ? names : []) {
      const text = String(raw || '').trim();
      if (!text) continue;
      total += 1;
      const part = exerciseBodyPart(text);
      if (counts[part] !== undefined) counts[part] += 1;
    }
    if (!total) return null;
    const order = ['push', 'pull', 'legs'].sort((a, b) => counts[b] - counts[a]);
    const [top, second] = order;
    if (!counts[top]) return 'other';
    if (counts[second] > 0 && counts[second] * 3 >= total) return 'other';
    return top;
  }
```

#### `readWeightMemory` — 55-training-domain.fragment.js:384–392（9 行）

```js
  function readWeightMemory() {
    if (weightMemoryCache) return weightMemoryCache;
    try {
      const raw = localStorage.getItem(WEIGHT_MEMORY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      weightMemoryCache = map && typeof map === 'object' ? map : {};
    } catch { weightMemoryCache = {}; }
    return weightMemoryCache;
  }
```

#### `writeWeightMemory` — 55-training-domain.fragment.js:394–404（11 行）

```js
  function writeWeightMemory(map) {
    weightMemoryCache = map || {};
    try {
      const keys = Object.keys(weightMemoryCache);
      if (keys.length > WEIGHT_MEMORY_MAX) {
        keys.sort((a, b) => String(weightMemoryCache[b].date || '').localeCompare(String(weightMemoryCache[a].date || '')));
        for (const key of keys.slice(WEIGHT_MEMORY_MAX)) delete weightMemoryCache[key];
      }
      localStorage.setItem(WEIGHT_MEMORY_KEY, JSON.stringify(weightMemoryCache));
    } catch {}
  }
```

#### `rememberExerciseWeight` — 55-training-domain.fragment.js:406–423（18 行）

```js
  /** 只在不比已有记录更旧、且来源不更弱时覆盖：log > model/plan > inferred。 */
  function rememberExerciseWeight(name, row, options = {}) {
    const kg = number(row && row.weight);
    const key = exerciseKey(name);
    if (!key || !(kg > 0)) return;
    const source = String(options.source || (row && row.source) || 'log');
    const date = String(options.date || (row && row.date) || activeDate || localDate());
    const map = readWeightMemory();
    const prev = map[key];
    const prevRank = WEIGHT_SOURCE_RANK[prev && prev.source];
    const nextRank = WEIGHT_SOURCE_RANK[source];
    if (prev && number(prev.weight) > 0) {
      if ((prevRank === undefined ? -1 : prevRank) > (nextRank === undefined ? 0 : nextRank)) return;
      if (String(prev.date || '') > date) return;
    }
    map[key] = {name: String(name || '').trim().slice(0, 24), weight: kg, reps: number(row && row.reps), sets: number(row && row.sets), date, source};
    writeWeightMemory(map);
  }
```

#### `seedWeightMemoryFromHistory` — 55-training-domain.fragment.js:425–447（23 行）

```js
  /** 把历史记录里的真实负重灌进记忆（只读历史，不改记录本身）；同一天只扫一次。 */
  function seedWeightMemoryFromHistory(days = WEIGHT_MEMORY_DAYS) {
    const seedKey = String(activeDate) + '|' + (state.habits || []).length;
    if (weightMemorySeedKey === seedKey) return readWeightMemory();
    const map = readWeightMemory();
    let changed = false;
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      for (const item of exercisesFor(day)) {
        const name = String((item && item.name) || '').trim();
        const kg = number(item && item.weight);
        if (!name || !(kg > 0)) continue;
        const key = exerciseKey(name);
        const prev = map[key];
        if (prev && number(prev.weight) > 0 && (WEIGHT_SOURCE_RANK[prev.source] >= 2 || String(prev.date || '') >= day)) continue;
        map[key] = {name, weight: kg, reps: number(item.reps), sets: number(item.sets), date: day, source: 'log'};
        changed = true;
      }
    }
    if (changed) writeWeightMemory(map);
    weightMemorySeedKey = seedKey;
    return map;
  }
```

#### `loadableWeightKg` — 55-training-domain.fragment.js:449–468（20 行）

```js
  /**
   * 把建议重量落到健身房里装得出来的数：杠铃按 20 kg 空杆 + 每侧 2.5 kg 的整数倍，
   * 哑铃按 2 kg、器械按 5 kg 递增。装不出的数字（如 62.5 kg）比偏轻更伤执行。
   */
  function loadableWeightKg(name, desired) {
    const kg = Number(desired);
    const text = String(name || '');
    if (!Number.isFinite(kg) || kg <= 0) return null;
    // 自重动作没有「装得出来的重量」这回事（负重引体这类带前缀的变体仍会走到下面的分支）。
    if (typeof isBodyweightMove === 'function' && isBodyweightMove(name)) return null;
    const barbell = /杠铃/.test(text) || (!/(哑铃|器械|绳索|史密斯|龙门)/.test(text)
      && /(卧推|深蹲|硬拉|划船|推举|肩推|罗马尼亚|臀推|臀桥|早安|箭步|实力举|借力推)/.test(text));
    if (barbell) {
      if (kg <= 20) return 20;
      return 20 + Math.max(5, Math.round((kg - 20) / 5) * 5);
    }
    if (/(哑铃|飞鸟|侧平举|前平举|锤式|弯举|保加利亚)/.test(text)) return Math.max(2, Math.round(kg / 2) * 2);
    if (/(器械|绳索|下拉|腿举|腿屈伸|腿弯举|夹胸|史密斯|龙门)/.test(text)) return Math.max(5, Math.round(kg / 5) * 5);
    return Math.round(kg * 2) / 2;
  }
```

#### `reduceLoadableWeightKg` — 55-training-domain.fragment.js:470–486（17 行）

```js
  /**
   * 需要「减」的时候必须向下取：可装重量会把 47.5 抬回 50、把 15.2 抬回 16，等于没减。
   * 大步退到真能装出来且低于原重量为止。
   */
  function reduceLoadableWeightKg(name, desired, original) {
    let target = number(desired);
    let kg = typeof loadableWeightKg === 'function' ? loadableWeightKg(name, target) : target;
    let guard = 0;
    // 按 1 kg 往下探，让可装重量自己找到下一个更低档（杠铃 5 kg 一档、哑铃 2 kg 一档都能落对）。
    while (kg !== null && number(original) > 0 && kg >= number(original) && guard < 8) {
      guard += 1;
      target = target - 1;
      if (!(target > 0)) break;
      kg = typeof loadableWeightKg === 'function' ? loadableWeightKg(name, target) : target;
    }
    return kg && kg > 0 ? kg : null;
  }
```

#### `progressiveWeightKg` — 55-training-domain.fragment.js:488–508（21 行）

```js
  /**
   * 这次该做多少：上次 ≥8 次且 21 天内练过 → 进一档；6~7 次 → 持平；≤5 次 → 退一档；
   * 超过 21 天没练持平，超过 60 天退 5%。不冲、也不原地躺着。
   */
  function progressiveWeightKg(name, row) {
    const last = number(row && row.weight);
    if (!(last > 0)) return null;
    const step = LOWER_BODY.test(String(name || '')) ? 5 : 2.5;
    const reps = number(row.reps);
    const lastDate = String(row.date || '');
    let gap = 0;
    if (validDate(lastDate) && validDate(activeDate)) {
      gap = Math.round((new Date(activeDate + 'T00:00:00') - new Date(lastDate + 'T00:00:00')) / 86400000);
    }
    if (gap > 60) return reduceLoadableWeightKg(name, last * 0.95, last);
    if (gap > 21) return typeof loadableWeightKg === 'function' ? loadableWeightKg(name, last) : last;
    if (reps !== null && reps > 0 && reps <= 5) return reduceLoadableWeightKg(name, last - step, last);
    const kg = reps !== null && reps >= 8 ? Math.min(last * 1.1, last + step) : last;
    const loadable = typeof loadableWeightKg === 'function' ? loadableWeightKg(name, kg) : Math.round(kg * 2) / 2;
    return loadable && loadable > 0 ? loadable : null;
  }
```

#### `startingWeightKg` — 55-training-domain.fragment.js:510–521（12 行）

```js
  /** 完全没有记录的第一次：按体重比例给一个偏保守的起步重量。 */
  function startingWeightKg(name) {
    const family = exerciseFamily(name);
    const ratio = family ? WEIGHT_RATIOS[family] : null;
    if (!ratio) return null;
    const equip = exerciseEquip(name) || 'barbell';
    const factor = number(ratio[equip] || ratio.barbell || 0);
    const bodyweight = number((state.profile || {}).weight);
    if (!(factor > 0) || !(bodyweight > 0)) return null;
    const loadable = typeof loadableWeightKg === 'function' ? loadableWeightKg(name, bodyweight * factor) : null;
    return loadable && loadable > 0 ? loadable : null;
  }
```

#### `plannedWeightFor` — 55-training-domain.fragment.js:523–545（23 行）

```js
  /**
   * 排课时给每个动作一个重量：同名记忆 → 同族迁移（打 85 折）→ 体重比例起步。
   * 自重与推断不出来的返回 null（界面留空），source 供界面标注「约」。
   */
  function plannedWeightFor(name) {
    if (typeof isBodyweightMove === 'function' && isBodyweightMove(name)) return {weight: null, source: 'bodyweight'};
    const map = seedWeightMemoryFromHistory();
    const exact = map[exerciseKey(name)];
    if (exact && number(exact.weight) > 0) return {weight: progressiveWeightKg(name, exact), source: exact.source || 'log'};
    const family = exerciseFamily(name), equip = exerciseEquip(name);
    if (family) {
      const peers = Object.values(map)
        .filter(row => row && number(row.weight) > 0 && exerciseFamily(row.name) === family
          && (!equip || !exerciseEquip(row.name) || exerciseEquip(row.name) === equip))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      if (peers.length) {
        const scaled = typeof loadableWeightKg === 'function' ? loadableWeightKg(name, number(peers[0].weight) * 0.85) : null;
        if (scaled > 0) return {weight: scaled, source: 'family'};
      }
    }
    const start = startingWeightKg(name);
    return start ? {weight: start, source: 'inferred'} : {weight: null, source: 'none'};
  }
```

#### `rememberPlanWeights` — 55-training-domain.fragment.js:547–554（8 行）

```js
  /** 排完保存时把重量写进记忆；推断值记 plan，模型给的值记 model。 */
  function rememberPlanWeights(plan) {
    for (const item of Array.isArray(plan) ? plan : []) {
      if (!item || !item.name || !(number(item.weight) > 0)) continue;
      const inferred = item.weightSource === 'inferred' || item.weightSource === 'family';
      rememberExerciseWeight(item.name, item, {source: inferred ? 'plan' : 'model', date: activeDate});
    }
  }
```

#### `rememberExerciseLogs` — 55-training-domain.fragment.js:556–565（10 行）

```js
  /** 训练落库后把真实负重写进记忆（下一次排课按它渐进）。 */
  function rememberExerciseLogs(exercises, date) {
    for (const item of Array.isArray(exercises) ? exercises : []) {
      if (!item || !item.name) continue;
      // 顶组口径：记忆必须是「最重那组的次数」，否则渐进规则会用热身组的次数判断要不要加重。
      const top = topSetSummary(item);
      if (!(top.weight > 0)) continue;
      rememberExerciseWeight(item.name, {weight: top.weight, reps: top.reps, sets: top.sets}, {source: 'log', date: date || activeDate});
    }
  }
```

#### `recentExerciseBaselines` — 55-training-domain.fragment.js:567–585（19 行）

```js
  /** 14 天内每个动作最近一次的组/次/负重，供渐进参考；跑步与计时类不参与排课。 */
  function recentExerciseBaselines(days = 14) {
    const lastByExercise = {};
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      // 用原始动作（含 setDetails）：exercisesFor 只留外层汇总，金字塔组会在这里被放大。
      const raw = typeof habitRowFor === 'function' ? habitRowFor(day) : null;
      const rows = raw && Array.isArray(raw.exercises) ? raw.exercises : [];
      for (const item of rows) {
        const name = String(item && item.name || '').trim();
        if (!name || lastByExercise[name]) continue;
        if (number(item.durationMin) !== null || number(item.distanceKm) !== null) continue; // runs and timed work are not scheduled
        const top = topSetSummary(item);
        if (!(top.sets > 0) || top.reps === null) continue;
        lastByExercise[name] = {sets: top.sets, reps: top.reps, weight: top.weight, date: day};
      }
    }
    return lastByExercise;
  }
```

#### `acwrFromDailyLoads` — 55-training-domain.fragment.js:587–604（18 行）

```js
  /**
   * Acute:chronic workload ratio from daily loads. ratio > 1.5 = spike, < 0.8 = detraining.
   * loads: [{date:'YYYY-MM-DD', load:number}] (load = 组×次×负重, or run minutes×6).
   */
  function acwrFromDailyLoads(loads, today) {
    const rows = (loads || []).filter(row => row && Number.isFinite(Number(row.load)));
    if (!rows.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return null;
    const dayTime = day => new Date(day + 'T00:00:00').getTime();
    const base = dayTime(today);
    const within = days => rows.filter(row => base - dayTime(row.date) < days * 86400000 && dayTime(row.date) <= base);
    const acute = within(7).reduce((acc, row) => acc + Number(row.load), 0);
    const chronicTotal = within(28).reduce((acc, row) => acc + Number(row.load), 0);
    const chronic = chronicTotal / 4;
    if (chronic <= 0) return {acute, chronic, ratio: null, flag: 'none', days: within(7).length};
    const ratio = acute / chronic;
    const flag = ratio > ACWR_HIGH ? 'high' : ratio < ACWR_LOW ? 'low' : 'ok';
    return {acute, chronic, ratio: Math.round(ratio * 100) / 100, flag, days: within(7).length};
  }
```

#### `dailyLoads` — 55-training-domain.fragment.js:606–626（21 行）

```js
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */
  function dailyLoads(days) {
    const out = [];
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      // 必须读原始行：exercisesFor 会把 setDetails 抹平成外层三字段，逐组明细一丢，
      // trainingVolumeOf 就只能按「组数 × 顶组次数 × 顶组重量」估算，ACWR 与减载判定一起被带偏。
      const raw = habitRowFor(day);
      const items = Array.isArray(raw && raw.exercises) ? raw.exercises : [];
      let load = 0;
      for (const item of items) {
        // 逐组口径：金字塔组（10×40 / 8×60 / 5×80）真实 1280 kg；只拿外层汇总（组数 × 顶组次数 × 顶组重量）
        // 估出来是 1200 kg 的近似值，日负荷与 ACWR 会跟着偏。旧记录没有 setDetails，由 trainingVolumeOf 回退。
        load += trainingVolumeOf([item]);
        const minutes = number(item && item.durationMin);
        if (minutes !== null) load += minutes * 6;
      }
      out.push({date: day, load});
    }
    return out;
  }
```

#### `generateWeekPlan` — 55-training-domain.fragment.js:628–930（303 行）

```js
  /**
   * 七天训练安排从「今天」起算（2026-11-18 用户要求：不再排下一周，日期显示当日起的后续安排）。
   * sessions from the last two weeks per exercise, with a graded progression.
   * lastByExercise: {name: {sets, reps, weight, date}}; acwr flag decides a deload.
   */
  /**
   * 38 号训练配套方案（docs/design/38-training-prescriptions.md）。
   * 每套模板的动作槽位固定：1 主复合 + 1 次复合 + 孤立/核心；组次与 RIR 取 GOAL_PRESETS；
   * 重量：有历史 ×1.025（减载 ×0.9）、无历史按体重推算并标「约」、自重留空按次数进阶。
   * 选动作五规则：器械匹配 → 部位覆盖 → 同角度不重复 → 可加重优先 → 有历史先继承。
   */
  function generateWeekPlan(input) {
    const src = input || {};
    const start = String(src.startDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
    const TRAINING_POOLS = {
      push: [
        {name: '卧推', role: 'main', gear: 'barbell', angle: 'horizontal-press'},
        {name: '器械卧推', role: 'compound', gear: 'machine', angle: 'horizontal-press'},
        {name: '上斜哑铃卧推', role: 'compound', gear: 'dumbbell', angle: 'incline-press'},
        {name: '哑铃肩推', role: 'isolate', gear: 'dumbbell', angle: 'vertical-press'},
        {name: '侧平举', role: 'isolate', gear: 'dumbbell', angle: 'lateral-raise'},
        {name: '绳索下压', role: 'isolate', gear: 'machine', angle: 'triceps'},
        {name: '双杠臂屈伸', role: 'isolate', gear: 'body', angle: 'triceps'}
      ],
      pull: [
        {name: '引体向上', role: 'main', gear: 'body', angle: 'vertical-pull'},
        {name: '高位下拉', role: 'main', gear: 'machine', angle: 'vertical-pull'},
        {name: '杠铃划船', role: 'compound', gear: 'barbell', angle: 'row'},
        {name: '器械划船', role: 'compound', gear: 'machine', angle: 'row'},
        {name: '面拉', role: 'isolate', gear: 'machine', angle: 'rear-delt'},
        {name: '哑铃弯举', role: 'isolate', gear: 'dumbbell', angle: 'biceps'},
        {name: '直臂下压', role: 'isolate', gear: 'machine', angle: 'lats'}
      ],
      legs: [
        {name: '深蹲', role: 'main', gear: 'barbell', angle: 'squat'},
        {name: '硬拉', role: 'compound', gear: 'barbell', angle: 'hinge'},
        {name: '罗马尼亚硬拉', role: 'compound', gear: 'barbell', angle: 'hinge'},
        {name: '腿举', role: 'isolate', gear: 'machine', angle: 'leg-press'},
        {name: '保加利亚分腿蹲', role: 'isolate', gear: 'dumbbell', angle: 'single-leg'},
        {name: '提踵', role: 'isolate', gear: 'machine', angle: 'calf'},
        {name: '平板支撑', role: 'core', gear: 'body', angle: 'core'}
      ],
      upper: [
        {name: '卧推', role: 'main', gear: 'barbell', angle: 'horizontal-press', family: 'push'},
        {name: '引体向上', role: 'main', gear: 'body', angle: 'vertical-pull', family: 'pull'},
        {name: '上斜哑铃卧推', role: 'compound', gear: 'dumbbell', angle: 'incline-press', family: 'push'},
        {name: '杠铃划船', role: 'compound', gear: 'barbell', angle: 'row', family: 'pull'},
        {name: '哑铃肩推', role: 'isolate', gear: 'dumbbell', angle: 'vertical-press', family: 'push'},
        {name: '面拉', role: 'isolate', gear: 'machine', angle: 'rear-delt', family: 'pull'},
        {name: '绳索下压', role: 'isolate', gear: 'machine', angle: 'triceps', family: 'push'}
      ],
      lower: [
        {name: '深蹲', role: 'main', gear: 'barbell', angle: 'squat'},
        {name: '罗马尼亚硬拉', role: 'compound', gear: 'barbell', angle: 'hinge'},
        {name: '腿举', role: 'isolate', gear: 'machine', angle: 'leg-press'},
        {name: '保加利亚分腿蹲', role: 'isolate', gear: 'dumbbell', angle: 'single-leg'},
        {name: '提踵', role: 'isolate', gear: 'machine', angle: 'calf'},
        {name: '平板支撑', role: 'core', gear: 'body', angle: 'core'}
      ],
      full: [
        {name: '深蹲', role: 'main', gear: 'barbell', angle: 'squat', family: 'legs'},
        {name: '卧推', role: 'compound', gear: 'barbell', angle: 'horizontal-press', family: 'push'},
        {name: '杠铃划船', role: 'compound', gear: 'barbell', angle: 'row', family: 'pull'},
        {name: '引体向上', role: 'isolate', gear: 'body', angle: 'vertical-pull', family: 'pull'},
        {name: '腿举', role: 'isolate', gear: 'machine', angle: 'leg-press', family: 'legs'},
        {name: '平板支撑', role: 'core', gear: 'body', angle: 'core', family: 'legs'}
      ]
    };
    /** 每天要填的槽位：上肢=推 2 + 拉 2；全身=推拉腿各 1 + 核心；其余=1 主 + 1 次 + 孤立。 */
    const PLAN_SHAPES = {
      push: [{role: 'main'}, {role: 'compound'}, {role: 'isolate'}, {role: 'isolate'}, {role: 'isolate'}],
      pull: [{role: 'main'}, {role: 'compound'}, {role: 'isolate'}, {role: 'isolate'}, {role: 'isolate'}],
      legs: [{role: 'main'}, {role: 'compound'}, {role: 'isolate'}, {role: 'isolate'}, {role: 'core'}],
      upper: [
        {role: 'main', family: 'push'}, {role: 'main', family: 'pull'},
        {role: 'compound', family: 'push'}, {role: 'compound', family: 'pull'},
        {role: 'isolate'}
      ],
      lower: [{role: 'main'}, {role: 'compound'}, {role: 'isolate'}, {role: 'isolate'}, {role: 'core'}],
      full: [
        {role: 'main', family: 'legs'}, {role: 'compound', family: 'push'},
        {role: 'compound', family: 'pull'}, {role: 'isolate', family: 'pull'}, {role: 'core'}
      ]
    };
    const pad2 = n => String(n).padStart(2, '0');
    const sessions = Math.max(1, Math.min(6, Number(src.sessions) || 3));
    const split = ['ppl', 'ul', 'fb'].includes(String(src.split)) ? String(src.split) : 'ppl';
    const templates = split === 'ul' ? ['upper', 'lower'] : split === 'fb' ? ['full'] : ['push', 'pull', 'legs'];
    const startAt = Math.max(0, templates.indexOf(String(src.startTemplate || '')));
    // 用户在偏好里写的训练要求（2026-11-23 从「计划说明」搬进改偏好）：本地生成器只做能确定的两件事——
    // 改这次时长、把明确说「别 / 不要 / 避免」的动作剔除；部位轮换与更复杂的要求交给「重排今天」的 AI。
    const request = String(src.request || '').slice(0, 200);
    const requestMinutes = (request.match(/(\d{2,3})\s*分钟/) || [])[1];
    const minutes = Math.max(20, Math.min(120, Number(requestMinutes) || Number(src.minutes) || 45));
    const bannedAngles = new Set(), bannedWords = [], bannedNameRe = [];
    for (const match of request.matchAll(/(?:别|不要|避免|不安排|避开)([^。；，,\n]{1,14})/g)) {
      const text = match[1];
      bannedWords.push(text);
      for (const [re, angles] of [
        [/过头|肩推|推举|侧平举/, ['vertical-press', 'lateral-raise']],
        [/卧推|推胸|飞鸟/, ['horizontal-press', 'incline-press']],
        [/深蹲|蹲|腿举/, ['squat', 'leg-press', 'single-leg']],
        [/硬拉/, ['hinge']],
        [/划船/, ['row']],
        [/引体|下拉/, ['vertical-pull']],
        [/弯举/, ['biceps']],
        [/下压|臂屈伸/, ['triceps']],
        [/卷腹|平板|核心/, ['core']]
      ]) if (re.test(text)) angles.forEach(angle => bannedAngles.add(angle));
      // 训练库里的动作 angle 直接用名字，角度表罩不住；按名字里的关键动作再补一层。
      for (const re of [/深蹲|蹲/, /硬拉/, /卧推|飞鸟/, /肩推|推举|侧平举/, /划船/, /引体|下拉/, /弯举/, /下压|臂屈伸/, /卷腹|平板/]) {
        if (re.test(text)) bannedNameRe.push(re);
      }
    }
    const excludedMove = item => !!item && (bannedAngles.has(item.angle)
      || bannedNameRe.some(re => re.test(item.name))
      || bannedWords.some(word => word && (item.name.includes(word) || word.includes(item.name))));
    const moves = minutes <= 30 ? 3 : minutes <= 45 ? 4 : minutes <= 60 ? 5 : 6;
    const setCap = minutes <= 30 ? 3 : minutes <= 60 ? 4 : 5;
    const budget = Math.max(8, Math.round(minutes / 3.5));
    const gearKey = String(src.gear || 'mixed');
    const rotation = n => {
      const plan = [];
      for (let i = 0; i < n; i++) plan.push(templates[(startAt + i) % templates.length]);
      return plan;
    };
    // Spread the sessions over the week: Mon/Tue/Thu/Fri/Sat pattern.
    const slots = [[0], [0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 6]][sessions - 1];
    const deload = src.acwrFlag === 'high';
    const goal = String(src.goal || '');
    // 组次与 RIR 只取这一张表，不另造数字（27 号证据表 §1）。
    const goalPreset = typeof GOAL_PRESETS === 'object' ? GOAL_PRESETS[goal] : null;
    const repsRange = goalPreset && Array.isArray(goalPreset.reps) ? goalPreset.reps : [8, 12];
    const rirRange = goalPreset && Array.isArray(goalPreset.rir) ? goalPreset.rir : [2, 3];
    const lastByExercise = src.lastByExercise || {};

    // 历史 → 处方重量：有历史按 +2.5%（减载 ×0.9）并落到可装载档；自重只按次数进阶。
    const history = new Map();
    for (const [name, row] of Object.entries(lastByExercise)) {
      if (!row || row.sets === null || !Number.isFinite(Number(row.sets))) continue;
      // A run has duration/distance instead of sets: it is not a lift and must not be scheduled as one.
      if (Number.isFinite(Number(row.durationMin)) || Number.isFinite(Number(row.distanceKm))) continue;
      const bodyweight = typeof isBodyweightMove === 'function' && isBodyweightMove(name);
      const weight = Number(row.weight);
      let next = !bodyweight && Number.isFinite(weight) && weight > 0
        ? Math.round((deload ? weight * 0.9 : weight * 1.025) * 2) / 2
        : null;
      if (next !== null && typeof loadableWeightKg === 'function') {
        next = loadableWeightKg(name, next);
        // +2.5% 对轻重量可能落回同一档，这时至少进一档，不能原地不动。
        if (!deload && next !== null && next <= weight) next = loadableWeightKg(name, weight + 2.5);
      }
      history.set(name, {sets: Number(row.sets), reps: Number(row.reps) || null, weight: next, bodyweight});
    }

    const isBodyweight = name => typeof isBodyweightMove === 'function' ? isBodyweightMove(name) : false;
    const weightFor = name => {
      if (isBodyweight(name)) return {weight: null, bodyweight: true};
      const past = history.get(name);
      if (past && past.weight !== null && past.weight > 0) return {weight: past.weight};
      // 没有历史也要给一个可执行的起步值：按体重与动作系数推算，界面上标「约」，练完一次自动校准。
      const guess = typeof plannedWeightFor === 'function' ? plannedWeightFor(name) : null;
      const value = guess && Number(guess.weight);
      if (Number.isFinite(value) && value > 0) return {weight: value, approx: true};
      return {weight: null};
    };
    const repsFor = (role, bodyweight) => {
      const base = role === 'main' ? repsRange[0] : Math.round((repsRange[0] + repsRange[1]) / 2);
      const reps = Math.max(repsRange[0], Math.min(repsRange[1], base));
      return bodyweight && !deload ? Math.min(repsRange[1] + 2, reps + 1) : reps;
    };
    const rirFor = role => role === 'main' ? rirRange[0] : rirRange[1];
    const setsFor = role => {
      const base = role === 'isolate' || role === 'core' ? 3 : 4;
      const gain = goal === 'gain' && role === 'main' && !deload ? 1 : 0;
      return Math.max(2, Math.min(5, base + gain - (deload ? 1 : 0)));
    };

    const pickDay = (template, opts = {}) => {
      // 2026-11-23：一周次数不是模板数的整数倍时（如推拉腿 4 练），第二次出现的那个部位按轻量排——
      // 否则同一部位一周被练两遍满量，胸/背/腿就永远 12 : 6 : 6。
      const light = opts.light === true;
      // 动作来源：训练库（training-principles.js）里有这套模板就用库里的动作，没有才用内置池。
      // 库是「数据库」，生成器不该自己编一份和它对不上的清单。
      let pool = (TRAINING_POOLS[template] || []).slice();
      const libDay = typeof libraryDayTemplate === 'function' ? libraryDayTemplate(template) : null;
      const libList = libDay && Array.isArray(libDay.exercises) && libDay.exercises.length
        ? libDay.exercises
        : (typeof libraryMoves === 'function' ? libraryMoves(template) : []);
      if (libList && libList.length) {
        const known = new Map(pool.map(item => [item.name, item]));
        pool = libList.map((item, index) => {
          const name = String(item.name || '').trim();
          if (known.has(name)) return {...known.get(name), rpe: item.rpe || null};
          const gear = /(杠铃|深蹲|硬拉|卧推|划船|推举)/.test(name) ? 'barbell'
            : /(哑铃)/.test(name) ? 'dumbbell'
              : /(引体|俯卧撑|双杠|平板|卷腹)/.test(name) ? 'body' : 'machine';
          return {name, role: index === 0 ? 'main' : index < 2 ? 'compound' : 'isolate', gear, angle: name, rpe: item.rpe || null};
        }).filter(item => item.name);
      }
      const shape = (PLAN_SHAPES[template] || []).slice(0, Math.max(1, light ? moves - 1 : moves));
      if (!pool.length || !shape.length) return {exercises: [], suggested: false};
      // 用户写了「别安排 X」就先把这些动作剔掉；剔完还有动作才生效，避免一句话把整天排空。
      const allowed = pool.filter(item => !excludedMove(item));
      if (allowed.length) pool = allowed;
      const taken = new Set(), usedAngles = new Set(), exercises = [];
      for (const slot of shape) {
        const candidates = pool.filter(item => !taken.has(item.name)
          && (item.role || 'isolate') === slot.role
          && (!slot.family || item.family === slot.family)
          && !usedAngles.has(item.angle));
        if (!candidates.length) continue;
        // 器械优先匹配 → 有历史先继承 → 可加重优先（barbell/dumbbell/machine 排在 body 前）。
        const score = item => (gearKey === 'mixed' || item.gear === gearKey ? 4 : 0)
          + (history.has(item.name) ? 2 : 0)
          + (item.gear === 'body' ? 0 : 1);
        candidates.sort((a, b) => score(b) - score(a));
        const picked = candidates[0];
        taken.add(picked.name);
        usedAngles.add(picked.angle);
        const {weight, bodyweight, approx} = weightFor(picked.name);
        // 推算不出来时按器械给一个保守起步值（空杆 40 / 哑铃 8 / 器械 20），同样是「约」。
        const GEAR_START = {barbell: 40, dumbbell: 8, machine: 20};
        const gearStart = bodyweight || Number(weight) > 0 ? null : (GEAR_START[picked.gear] || 10);
        exercises.push({
          name: picked.name,
          sets: setsFor(picked.role),
          reps: repsFor(picked.role, bodyweight),
          rir: rirFor(picked.role),
          weight: gearStart !== null ? gearStart : weight,
          ...((approx || gearStart !== null) ? {weightApprox: true} : {}),
          ...(bodyweight ? {bodyweight: true} : {}),
          role: picked.role,
          gear: picked.gear,
          ...(picked.rpe ? {rpe: picked.rpe} : {})
        });
      }
      // 总组数预算：超了先裁孤立/核心，不动主复合。
      const totalSets = () => exercises.reduce((sum, item) => sum + item.sets, 0);
      while (totalSets() > budget) {
        const at = exercises.map((item, i) => (item.role === 'isolate' || item.role === 'core') ? i : -1).filter(i => i >= 0).pop();
        if (at === undefined) break;
        exercises.splice(at, 1);
      }
      for (const item of exercises) {
        item.sets = Math.min(setCap, item.sets);
        if (light) item.sets = Math.min(2, item.sets);
      }
      return {exercises, suggested: !exercises.some(item => history.has(item.name))};
    };

    const days = [];
    rotation(sessions).forEach((template, index) => {
      const date = new Date(start + 'T00:00:00');
      date.setDate(date.getDate() + slots[index]);
      // 第 2 轮起的同模板日 = 轻量补充日；全身模板每天本来就一样，不算「重复」，不该有轻量日。
      const light = templates.length > 1 && index >= templates.length;
      const picked = pickDay(template, {light});
      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, light, deload, exercises: picked.exercises, suggested: picked.suggested,
        prescription: {reps: repsRange, rir: rirRange}});
    });
    // 38 号 §2 的周组数自检：按「部位」统计一周总组数（不是按训练日），超上限就削。
    // 先删整块孤立（动作数 > 3 时），剩下用减组数消化，主复合不取消。
    const weeklyCap = goalPreset && Array.isArray(goalPreset.muscleSetsPerWeek) ? goalPreset.muscleSetsPerWeek[1] : 20;
    // 部位分类只有 exerciseBodyPart 一处（Phase 2 去重）：原来这里另有一套 familyOf 正则。
    const familyOf = exerciseBodyPart;
    const weeklyFor = family => days.reduce((sum, day) => sum + day.exercises
      .filter(item => familyOf(item.name) === family)
      .reduce((inner, item) => inner + item.sets, 0), 0);
    for (const family of ['push', 'pull', 'legs']) {
      let guard = 0;
      while (weeklyFor(family) > weeklyCap && guard++ < 80) {
        const flat = [];
        for (const day of days) day.exercises.forEach((item, idx) => {
          if (familyOf(item.name) === family) flat.push({day, idx, item});
        });
        if (!flat.length) break;
        const drop = flat.find(row => ['isolate', 'core'].includes(row.item.role) && row.day.exercises.length > 3);
        if (drop) { drop.day.exercises.splice(drop.idx, 1); continue; }
        const shrink = flat.filter(row => row.item.sets > 2).sort((a, b) => b.item.sets - a.item.sets)[0];
        if (!shrink) break;
        shrink.item.sets -= 1;
      }
    }
    for (const day of days) {
      day.weeklySets = {cap: weeklyCap, total: day.exercises.reduce((sum, item) => sum + item.sets, 0)};
    }
    // The analysis layer is optional: the generator still works without the library loaded.
    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested),
      templateId: 'push-day-template'}) : [];
    const approxCount = days.reduce((sum, day) => sum + day.exercises.filter(item => item.weightApprox).length, 0);
    return {startDate: start, sessions, deload, days, reasons, goal: goal || null,
      // 生成时真正用上的参数：给「这周这样排」弹窗与「为什么这样排」用，避免界面再猜一遍。
      applied: {minutes, moves, setCap, gear: gearKey, split, startTemplate: templates[startAt] || templates[0],
        bannedWords: bannedWords.slice(0, 6)},
      prescription: {reps: repsRange, rir: rirRange},
      note: deload
        ? '本周负荷偏高（ACWR > 1.5），按减载周安排：负重 ×0.9、组数 −1。'
        : '按上周重量 +2.5% 安排；自重动作不加重，按次数进阶（下次每组 +1 次）；'
          + (approxCount ? approxCount + ' 个动作没有历史，重量是按体重推算的起步值（带「约」），练完一次按实际校准。' : '重量按你最近 14 天的记录安排。')};
  }
```

#### `trainingLibrary` — 55-training-domain.fragment.js:932–935（4 行）

```js
  function trainingLibrary() {
    const lib = window.TRAINING_PRINCIPLES;
    return lib && Array.isArray(lib.rules) ? lib : null;
  }
```

#### `libraryRule` — 55-training-domain.fragment.js:937–940（4 行）

```js
  function libraryRule(id) {
    const lib = trainingLibrary();
    return lib ? lib.rules.find(rule => rule.id === id) || null : null;
  }
```

#### `libraryDayTemplate` — 55-training-domain.fragment.js:942–946（5 行）

```js
  function libraryDayTemplate(template) {
    const lib = trainingLibrary();
    const day = lib && lib.dayTemplates ? lib.dayTemplates[template] : null;
    return day && Array.isArray(day.exercises) ? day : null;
  }
```

#### `libraryMoves` — 55-training-domain.fragment.js:948–951（4 行）

```js
  function libraryMoves(template) {
    const lib = trainingLibrary();
    return lib && lib.moves && Array.isArray(lib.moves[template]) ? lib.moves[template] : [];
  }
```

#### `librarySourceLabel` — 55-training-domain.fragment.js:953–957（5 行）

```js
  function librarySourceLabel(sourceId) {
    const lib = trainingLibrary();
    const source = lib && lib.sources ? lib.sources.find(row => row.id === sourceId) : null;
    return source ? source.label + (source.level ? '（' + source.level + ' 级）' : '') : sourceId;
  }
```

#### `planWhy` — 55-training-domain.fragment.js:959–974（16 行）

```js
  /** Why this week looks like this: the rules actually used, each carrying its source. */
  function planWhy(input) {
    const src = input || {};
    const reasons = [];
    const push = (id, text) => {
      const rule = libraryRule(id);
      reasons.push({id, text, source: rule ? librarySourceLabel(rule.source) : '', confidence: rule ? rule.confidence : ''});
    };
    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');
    else if (src.templateId) push(src.templateId, '动作顺序与组次来自三分化整理图（推/拉/腿各 5 个动作）');
    else push('split-3-rationale', '按三分化排：每部位每周约 1.5~2 次刺激，单次每个部位 6~10 组正式组');
    push('main-lift-rpe8', '主项守 RPE 8（留约 2 次余量），不做到力竭');
    push('isolation-failure', '单关节动作接近力竭，复合主项不追求力竭');
    if (src.suggested) push('volume-cap', '没有历史动作时用训练库建议动作，先按 3 组建立基线');
    return reasons;
  }
```

#### `libraryLookup` — 55-training-domain.fragment.js:976–994（19 行）

```js
  function libraryLookup(question, max = 8) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const text = String(question || '');
    const wanted = new Set();
    for (const route of LIBRARY_ROUTES) if (route.match.test(text)) route.tags.forEach(tag => wanted.add(tag));
    if (!wanted.size) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const index = order.indexOf(source);
      return index >= 0 ? index : 9;
    };
    const hits = lib.rules
      .filter(rule => (rule.tags || []).some(tag => wanted.has(tag)))
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max);
    // 只给规则本身，不带出处：模型不该在回答里报 BV 号或「口述 02:08」。
    return hits.map(rule => '[' + rule.topic + '] ' + rule.claim).join('\n');
  }
```

#### `libraryCues` — 55-training-domain.fragment.js:996–1009（14 行）

```js
  /** Two short cues for today's template, taken from the transcript-level rules. */
  function libraryCues(template) {
    const lib = trainingLibrary();
    if (!lib) return [];
    const byTemplate = {
      push: ['lateral-raise-partial', 'rpe8-is-not-rm'],
      pull: ['rear-delt-neutral-grip', 'compound-deload-not-failure'],
      legs: ['leg-warmup-six-moves', 'rest-by-signal-not-calendar']
    };
    return (byTemplate[template] || [])
      .map(id => lib.rules.find(rule => rule.id === id))
      .filter(Boolean)
      .map(rule => rule.claim.split('；')[0]);
  }
```

#### `exerciseCore` — 55-training-domain.fragment.js:1011–1017（7 行）

```js
  /** 去掉器械/姿态前缀，留下动作本体（卧推 / 硬拉 / 划船…），用来和训练库对名。 */
  function exerciseCore(name) {
    let text = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    for (let i = 0; i < 2; i += 1) text = text.replace(prefix, '');
    return text.length >= 2 ? text : String(name || '').replace(/\s+/g, '');
  }
```

#### `cueTokens` — 55-training-domain.fragment.js:1019–1034（16 行）

```js
  /** 对名用的候选词：全名、逐层去掉器械/姿态前缀后的形态，以及被去掉的修饰词本身
   *  （哑铃上斜卧推 → 上斜卧推 / 卧推 / 上斜 / 哑铃），这样「上斜」这类线索也能命中。 */
  function cueTokens(name) {
    const raw = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    const tokens = new Set([raw]);
    let text = raw;
    for (let i = 0; i < 3; i += 1) {
      const head = (text.match(prefix) || [])[0];
      if (!head || text.length - head.length < 2) break;
      tokens.add(head);
      text = text.slice(head.length);
      tokens.add(text);
    }
    return [...tokens].filter(token => token.length >= 2);
  }
```

#### `trimCue` — 55-training-domain.fragment.js:1036–1042（7 行）

```js
  /** 一条要点别超过两行：到句号或 46 字为止。 */
  function trimCue(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const first = clean.split('。')[0].split('；')[0].trim();
    if (first.length <= 46) return first;
    return first.slice(0, 46).replace(/[，、：]$/, '') + '…';
  }
```

#### `pickCueClause` — 55-training-domain.fragment.js:1044–1053（10 行）

```js
  /** 从一条规则里挑「能照做」的那半句：先挑提到这个动作的分句，再挑有动作要求的，最后用第一句。 */
  function pickCueClause(text, tokens) {
    const parts = String(text || '').split(/[；。]/).map(part => part.trim()).filter(Boolean);
    const named = (tokens || []).length
      ? parts.find(part => tokens.some(token => part.indexOf(token) >= 0))
      : null;
    if (named) return named;
    const actionable = parts.find(part => /(要|别|先|可以|守|留|建议|每组|每次|次数|组数|RPE|激活|热身|握距|开肘|幅度|退阶|曲肘)/.test(part));
    return actionable || parts[0] || '';
  }
```

#### `cueForExercise` — 55-training-domain.fragment.js:1055–1123（69 行）

```js
  /**
   * 动作要点跟着「那天实际要做的动作」走，命中顺序按「说得有多准」排：
   * ⓪ 带修饰的动作（上斜哑铃卧推）先用「上斜/上斜哑铃」这类词找，免得回落到泛泛的「卧推」；
   * ① 以这个动作开头的规则（「划船时过度肩胛后缩…」）；
   * ② 模板要点里点名这个动作的那条（上斜/深蹲/引体都覆盖得到）；
   * ③ 规则里提到它、且标签与今天的分化对得上；
   * ④ 都没有就返回 null，由调用方补通用提醒。
   */
  function cueForExercise(name, family) {
    const lib = trainingLibrary();
    if (!lib) return null;
    const raw = String(name || '').trim();
    if (!raw) return null;
    const core = exerciseCore(raw);
    const tokens = cueTokens(raw);
    const specific = raw.replace(/\s+/g, '') !== core ? tokens.filter(token => token !== core && token.indexOf(core) < 0) : [];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index < 0 ? 9 : index; };
    const rules = lib.rules || [];
    const startsWith = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) === 0);
    const mentions = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) >= 0);
    const bodyText = rule => trimCue(pickCueClause(rule.claim, [raw].concat(tokens)));
    // ⓪ 修饰词优先：长的先试（上斜卧推 > 上斜 > 哑铃），免得回落到泛泛的「卧推」
    if (specific.length) {
      const ordered = specific.slice().sort((a, b) => b.length - a.length);
      for (const token of ordered) {
        const head = rules
          .filter(rule => String(rule.claim || '').indexOf(token) === 0)
          .sort((a, b) => rank(a.source) - rank(b.source));
        if (head.length) {
          const text = bodyText(head[0]);
          if (text) return {name: raw, text};
        }
      }
      for (const token of ordered) {
        for (const key of Object.keys(lib.dayTemplates || {})) {
          const hit = (lib.dayTemplates[key].cues || []).find(cue => String(cue).indexOf(token) >= 0);
          if (hit) {
            const text = trimCue(hit);
            if (text) return {name: raw, text};
          }
        }
      }
    }
    // ① 以动作本体/全名开头的规则
    const heads = rules.filter(rule => startsWith(rule, tokens)).sort((a, b) => rank(a.source) - rank(b.source));
    if (heads.length) {
      const text = bodyText(heads[0]);
      if (text) return {name: raw, text};
    }
    // ② 模板要点里点名这个动作的
    const templates = lib.dayTemplates || {};
    for (const key of Object.keys(templates)) {
      const hit = (templates[key].cues || []).find(cue => mentions({claim: cue}, tokens));
      if (hit) {
        const text = trimCue(hit);
        if (text) return {name: raw, text};
      }
    }
    // ③ 规则里提到它、且标签与分化对得上
    const tagged = rules
      .filter(rule => (family || []).some(tag => (rule.tags || []).indexOf(tag) >= 0) && mentions(rule, tokens))
      .sort((a, b) => rank(a.source) - rank(b.source));
    if (tagged.length) {
      const text = bodyText(tagged[0]);
      if (text) return {name: raw, text};
    }
    return null;
  }
```

#### `libraryCuesFor` — 55-training-domain.fragment.js:1125–1147（23 行）

```js
  /** 计划某一天的要点：最多 3 条，每条点名对应的动作；命中不足时补通用提醒。 */
  function libraryCuesFor(day) {
    if (!day) return [];
    const family = {push: ['push', 'shoulder', 'main', 'intensity'], pull: ['pull', 'shoulder', 'main', 'intensity'], legs: ['legs', 'warmup', 'main', 'intensity']}[day.template] || [];
    const out = [];
    const seen = new Set();
    for (const item of (day.exercises || [])) {
      const cue = cueForExercise(item && item.name, family);
      if (!cue || !cue.text || seen.has(cue.text)) continue;
      seen.add(cue.text);
      out.push(cue);
      if (out.length >= 3) break;
    }
    if (out.length < 3) {
      for (const item of (day.exercises || [])) {
        if (out.length >= 3) break;
        const name = String(item && item.name || '').trim();
        if (!name || out.some(cue => cue.name === name)) continue;
        out.push({name, text: '做到接近力竭前停；动作变形就结束这一组'});
      }
    }
    return out;
  }
```

#### `libraryRuleForMetric` — 55-training-domain.fragment.js:1149–1154（6 行）

```js
  /** Which library rule answers the weakest metric of the day. */
  function libraryRuleForMetric(key) {
    const map = {calories: 'weekly-rate', protein: 'protein-preserve', fat: 'protein-preserve',
      training: 'split-3-rationale', sleep: 'sleep-deficit'};
    return libraryRule(map[key] || '');
  }
```

#### `librarySummary` — 55-training-domain.fragment.js:1156–1172（17 行）

```js
  /** Compact digest for the question payload: priority order, one line per rule. */
  function librarySummary(max = 6) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const row = lib.sources.find(item => item.id === source);
      const index = order.indexOf(source);
      return index >= 0 ? index : (row && Number.isFinite(row.priority) ? row.priority : 9);
    };
    return lib.rules.slice()
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max)
      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim
        + (rule.video ? '（视频 ' + rule.video.bvid + '，' + Math.round(rule.video.seconds / 60) + ' 分钟：' + rule.video.title + '）' : ''))
      .join('\n');
  }
```

### 3.6 周计划文案、训练建议拼装与复制（消费 / 文案层）

#### `renderTrainingDraft` — 60-training-copy.fragment.js:9–28（20 行）

```js
  function renderTrainingDraft(draft) {
    const box = $('#chat-training-draft');
    if (!box) return;
    if (!draft) { box.hidden = true; box.innerHTML = ''; return; }
    const isMeal = draft.kind === 'meal';
    // 问答框里的一句话可能落在六类记录上，标题跟着品类走（写入仍由 applyDraft 按 kind 分流）。
    const title = '识别到' + (DRAFT_KINDS[draft.kind] || '记录') + (isMeal || draft.kind === 'training' ? '草稿' : '记录');
    const missing = isMeal
      ? '<p class="fine-print">会带入现有餐食表单；生成估算预览并确认后才会写入，不会直接落库。</p>'
      : draft.kind === 'training'
        ? draft.missing.length
          ? '<p class="fine-print">还缺：' + esc(draft.missing.join('、')) + '。可以先写入，稍后在训练日志里补；也可以点「补充信息」再改这句描述。</p>'
          : '<p class="fine-print">信息齐全，确认后会写入当天的训练记录。</p>'
        : '<p class="fine-print">确认后会写入当天的记录；写错了可以在卡片上撤销。</p>';
    box.hidden = false;
    box.innerHTML = `<div class="card training-draft"><div class="card-heading"><h2>${title}</h2><span class="tag">待确认</span></div>`
      + `<p><strong>${esc(draft.date)}</strong> · ${esc(draftSummary(draft))}</p>` + missing
      + `<div class="button-row"><button type="button" class="button primary" data-draft-confirm="1">${isMeal ? '去确认餐食' : '写入记录'}</button>`
      + `<button type="button" class="button subtle" data-draft-cancel="1">取消</button></div></div>`;
  }
```

#### `parseDraft` — 60-training-copy.fragment.js:34–121（88 行）

```js
  /**
   * One sentence -> one draft. Recognises training, weight, sleep, steps and water.
   * Returns {kind, date, rows, missing, payload} or null. Pure: no DOM, no state.
   */
  function parseDraft(text, baseDate) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const shift = (day, delta) => {
      const [y, m, d] = String(day).split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    };
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = today;
    const explicit = raw.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/) || raw.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    if (explicit) {
      const year = explicit[3] ? Number(explicit[1]) : Number(today.slice(0, 4));
      const month = explicit[3] ? Number(explicit[2]) : Number(explicit[1]);
      const day = explicit[3] ? Number(explicit[3]) : Number(explicit[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) date = year + '-' + pad2(month) + '-' + pad2(day);
    } else if (/大前天/.test(raw)) date = shift(today, -3);
    else if (/前天/.test(raw)) date = shift(today, -2);
    else if (/昨天|昨晚|昨日/.test(raw)) date = shift(today, -1);

    const planned = /(打算|计划|准备|明天|后天|下周|要不要|该不该|想做)/.test(raw);

    // --- plain measurements ---------------------------------------------------------------------
    const weight = raw.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|公斤|千克)/);
    if (weight && /(体重|称了|称重|重量)/.test(raw) && !/(跑了|跑步|卧推|深蹲|硬拉|引体)/.test(raw)) {
      const value = Number(weight[1]);
      if (value >= 20 && value <= 400) return {kind: 'weight', date, rows: [{label: '体重', value: value + ' kg'}], missing: [], payload: {weight: value}};
    }
    const sleep = raw.match(/(\d+(?:\.\d+)?)\s*(?:个)?(?:小时|h|H)/);
    if (sleep && /(睡|睡眠)/.test(raw)) {
      const value = Number(sleep[1]);
      if (value > 0 && value <= 24) return {kind: 'sleep', date, rows: [{label: '睡眠', value: value + ' 小时'}], missing: [], payload: {sleep: value}};
    }
    const steps = raw.match(/(\d{3,6})\s*步/);
    if (steps) return {kind: 'steps', date, rows: [{label: '步数', value: Number(steps[1]).toLocaleString() + ' 步'}], missing: [], payload: {steps: Number(steps[1])}};
    const water = raw.match(/(\d+(?:\.\d+)?)\s*(?:升|L|l|毫升|ml|ML)/);
    if (water && /(喝|饮水|水)/.test(raw)) {
      const isMl = /毫升|ml|ML/.test(water[0]);
      const value = isMl ? Number(water[1]) / 1000 : Number(water[1]);
      if (value > 0 && value <= 10) return {kind: 'water', date, rows: [{label: '饮水', value: value.toFixed(1) + ' L'}], missing: [], payload: {water: Math.round(value * 1000)}};
    }

    // --- training -------------------------------------------------------------------------------
    const runWord = /(跑步|慢跑|跑了|晨跑|夜跑|快走|跑完)/.test(raw);
    const moveHit = DRAFT_MOVES.find(name => raw.includes(name)) || '';
    const strengthWord = /(组|次|kg|公斤|千克|举|推|拉|蹲)/.test(raw);
    if (!runWord && !moveHit && !/(练了|训练了|做了)/.test(raw)) {
      if (!(strengthWord && /组|kg|公斤/.test(raw))) return null;
    }
    const exercises = [];
    const rows = [];
    const missing = [];
    if (runWord) {
      const distance = raw.match(/(\d+(?:\.\d+)?)\s*(?:km|KM|Km|公里|千米)/);
      const minutes = raw.match(/(\d+)\s*(?:分钟|min)/);
      const clock = raw.match(/(\d{1,2}):(\d{2})/);
      const item = {name: '跑步', sets: null, reps: null, weight: null, distanceKm: distance ? Number(distance[1]) : null,
        durationMin: minutes ? Number(minutes[1]) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : null};
      exercises.push(item);
      if (item.distanceKm === null) missing.push('距离（km）');
      if (item.durationMin === null) missing.push('时长（分钟）');
      rows.push({label: '跑步', value: [item.distanceKm !== null ? item.distanceKm + ' km' : '待补距离', item.durationMin !== null ? item.durationMin + ' 分钟' : '待补时长'].join(' · ')});
    }
    if (moveHit) {
      const clauses = raw.split(/[，,；;。、]/).filter(Boolean);
      for (const clause of clauses) {
        const name = DRAFT_MOVES.find(move => clause.includes(move));
        if (!name) continue;
        const sets = clause.match(/(\d+)\s*组/);
        const reps = clause.match(/(\d+)\s*[次下个]/);
        const weightHit = clause.match(/(\d+(?:\.\d+)?)\s*(?:kg|KG|Kg|公斤|千克)/);
        const item = {name, sets: sets ? Number(sets[1]) : null, reps: reps ? Number(reps[1]) : null,
          weight: weightHit ? Number(weightHit[1]) : null, distanceKm: null, durationMin: null};
        exercises.push(item);
        if (!sets || !reps) missing.push(name + ' 的组数/次数');
        rows.push({label: name, value: [item.sets !== null ? item.sets + ' 组' : '待补组数', item.reps !== null ? '× ' + item.reps + ' 次' : '待补次数', item.weight !== null ? item.weight + ' kg' : ''].filter(Boolean).join(' ')});
      }
    }
    if (!exercises.length) return null;
    if (planned && !/今天|昨天|前天|\d/.test(raw)) return null;
    const template = /(腿|深蹲|硬拉|提踵|腿举)/.test(raw) ? 'legs' : /(拉|划船|引体|下拉|弯举)/.test(raw) ? 'pull' : /(推|卧推|肩推|侧平举)/.test(raw) ? 'push' : 'other';
    return {kind: 'training', date, rows, missing, payload: {template, exercises}};
  }
```

#### `parseTrainingDraft` — 60-training-copy.fragment.js:123–127（5 行）

```js
  /** The one live parser: a training-only view over parseDraft; call sites and tests rely on the {payload:{exercises}} shape. */
  function parseTrainingDraft(text, baseDate) {
    const draft = parseDraft(text, baseDate);
    return draft && draft.kind === 'training' ? draft : null;
  }
```

#### `draftSummary` — 60-training-copy.fragment.js:130–133（4 行）

```js
  function draftSummary(draft) {
    if (!draft) return '';
    return (draft.rows || []).map(row => row.label + ' ' + row.value).join('；');
  }
```

#### `plateauFromWeekly` — 60-training-copy.fragment.js:136–147（12 行）

```js
  /**
   * Plateau: three weekly means and the last two barely differ.
   * weekly: [{week:'YYYY-MM-DD', mean:number}] sorted oldest first.
   */
  function plateauFromWeekly(weekly) {
    const rows = (weekly || []).filter(row => row && Number.isFinite(Number(row.mean)));
    if (rows.length < 3) return null;
    const last3 = rows.slice(-3);
    const span = Math.abs(last3[2].mean - last3[0].mean);
    return {weeks: 3, span: Math.round(span * 100) / 100, plateau: span < PLATEAU_SPAN_KG,
      from: last3[0].week, to: last3[2].week, mean: last3[2].mean};
  }
```

#### `localCoachLine` — 60-training-copy.fragment.js:149–153（5 行）

```js
  /** The model-free one-liner used when a request does not need an LLM at all. */
  function localCoachLine(check) {
    if (!check) return '';
    return check.action || '';
  }
```

#### `weeklyWeightMeans` — 60-training-copy.fragment.js:155–174（20 行）

```js
  /** Weekly mean weights, oldest first, for plateau detection. */
  function weeklyWeightMeans() {
    const byWeek = new Map();
    for (const row of (state.measurements || [])) {
      if (!row || !validDate(row.date)) continue;
      // 未来日期的体重（错录/补记）不能进平台期：看的是截至 activeDate 的历史。
      if (row.date > activeDate) continue;
      const weight = number(row.weight);
      if (weight === null || weight <= 0) continue;
      const date = new Date(row.date + 'T00:00:00');
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push(weight);
    }
    return [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, values]) => ({week, mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10}));
  }
```

#### `weekdayIndex` — 60-training-copy.fragment.js:175–179（5 行）

```js
  /** 0 = Monday … 6 = Sunday. */
  function weekdayIndex(day) {
    const date = new Date(day + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? 0 : (date.getDay() + 6) % 7;
  }
```

#### `weekDetailHtml` — 60-training-copy.fragment.js:186–206（21 行）

```js
  /** 周条下方的一行详情：那天记录了什么、计划是什么。 */
  function weekDetailHtml(day, plan) {
    if (!day) return '';
    // 「今天」只留给日历上的今天：周条已经能切到别的一天，这里再无条件写「今天」就会自相矛盾。
    const prefix = (day === localDate() ? '今天' : day.slice(5)) + ' · ';
    const items = exercisesFor(day).filter(item => item && item.name);
    const planDay = (plan && Array.isArray(plan.days) ? plan.days : []).find(item => item.date === day) || null;
    if (items.length) {
      return prefix + '已记录 ' + items.length + ' 个动作 · '
        + items.slice(0, 3).map(item => item.name).join('、') + (items.length > 3 ? ' 等' : '');
    }
    if (planDay) {
      const label = TRAINING_TEMPLATES[planDay.template] || planDay.template;
      const all = planDay.exercises || [];
      const names = all.slice(0, 3).map(item => item.name).join('、');
      // 「建议」跟着走进周条详情：这些动作来自训练库（那天还没有记录），别让用户以为是自己的历史。
      const hint = planDay.suggested ? '（训练库建议）' : '';
      return prefix + label + hint + (names ? ' · ' + names + (all.length > 3 ? ' 等 ' + all.length + ' 个' : '') : ' · 动作待定');
    }
    return prefix + '休息';
  }
```

#### `planPrefs` — 60-training-copy.fragment.js:213–216（4 行）

```js
  /** 用户偏好：没有设置就不生成方案。 */
  function planPrefs() {
    try { const raw = localStorage.getItem(PLAN_PREFS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
```

#### `savePlanPrefs` — 60-training-copy.fragment.js:217–221（5 行）

```js
  function savePlanPrefs(prefs) {
    try { localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs)); } catch { }
    // 收进 state.json：换新手机导入备份后周计划偏好还在；localStorage 此时是空的。
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({planPrefs: prefs ?? null, aiPlans: collectedAiPlans()});
  }
```

#### `planPrefsSummary` — 60-training-copy.fragment.js:225–232（8 行）

```js
  function planPrefsSummary(prefs) {
    if (!prefs) return "";
    const days = Number(prefs.days) > 0 ? Number(prefs.days) : 3;
    const split = PLAN_SPLIT_LABELS[prefs.split] || "推拉腿";
    const gear = PLAN_GEAR_LABELS[prefs.gear] || "综合";
    const minutes = Number(prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
    return "每周 " + days + " 练 · " + split + " · " + gear + " · " + minutes + " 分钟";
  }
```

#### `installPlanPrefs` — 60-training-copy.fragment.js:234–347（114 行）

```js
  function installPlanPrefs() {
    const box = $("#plan-prefs");
    if (!box) return;
    const chipsOf = name => $$(`[data-pref="${name}"] .pref-chip`);
    const mark = (name, value) => chipsOf(name).forEach(chip => {
      chip.setAttribute("aria-pressed", String(chip.dataset.value) === String(value) ? "true" : "false");
    });
    const read = name => {
      const on = chipsOf(name).find(chip => chip.getAttribute("aria-pressed") === "true");
      return on ? on.dataset.value : null;
    };
    // 器械默认「综合」：不限单一器材，交给模型混用。
    const markSaved = saved => {
      mark("days", saved && saved.days ? saved.days : 3);
      mark("split", (saved && saved.split) || "ppl");
      mark("gear", (saved && saved.gear) || "mixed");
      mark("minutes", (saved && saved.minutes) || 45);
    };
    markSaved(planPrefs());
    const summary = $("#plan-prefs-summary"), edit = $("#pref-edit");
    const regen = $("#pref-regen"), save = $("#pref-save"), requestBox = $("#plan-request");
    // 训练要求跟着偏好一起存：换手机、切日期都还在；取消编辑时也要还原成已保存的那句。
    const readRequest = () => String((requestBox && requestBox.value) || "").trim().slice(0, 200);
    const paintRequest = () => {
      if (requestBox) requestBox.value = String((planPrefs() || {}).request || "");
    };
    paintRequest();
    // 摘要跟着 chips 走：展开改选项时上方摘要也换成新值，收起时才不会「看着没变」。
    const paintSummary = () => {
      const saved = planPrefs();
      if (!summary) return;
      if (!saved) { summary.hidden = true; summary.textContent = ""; return; }
      summary.textContent = planPrefsSummary({
        days: Number(read("days")) || saved.days,
        split: read("split") || saved.split,
        gear: read("gear") || saved.gear,
        minutes: Number(read("minutes")) || saved.minutes
      });
    };
    /** 收起 = 放弃这次改动：chips 与要求都回到已保存的偏好。 */
    const restoreSaved = () => {
      markSaved(planPrefs());
      paintRequest();
      paintSummary();
    };
    for (const name of ["days", "split", "gear", "minutes"]) {
      chipsOf(name).forEach(chip => {
        if (chip.dataset.wired) return;
        chip.dataset.wired = "1";
        chip.addEventListener("click", () => { mark(name, chip.dataset.value); paintSummary(); });
      });
    }
    // 收起时是一行摘要 + 两个动作；展开后同一位置变成「取消」——不再出现「点进来就出不去」。
    const setCollapsed = collapsed => {
      box.hidden = collapsed;
      const has = !!planPrefs();
      if (summary) { summary.hidden = !has; paintSummary(); }
      if (edit) {
        edit.hidden = !has;
        edit.textContent = collapsed ? "改偏好" : "取消";
        edit.setAttribute("aria-expanded", String(!collapsed));
        edit.setAttribute("aria-label", collapsed ? "改训练偏好" : "取消训练偏好编辑，改动不保存");
        edit.setAttribute("title", collapsed ? "改频率 / 分化 / 器械 / 时长" : "取消编辑，改动不保存");
      }
      // 「换一套」只在收起时出现：展开时它和「生成本周计划」太像，会分不清。
      // 全身模板每天一样，轮换不出新排法，此时干脆不显示这个按钮。
      if (regen) regen.hidden = !has || !collapsed || String((planPrefs() || {}).split) === "fb";
    };
    setCollapsed(!!planPrefs());
    if (edit && !edit.dataset.wired) {
      edit.dataset.wired = "1";
      edit.addEventListener("click", () => {
        if (box.hidden) {
          setCollapsed(false);
          // preventScroll：展开时卡片会变高，再把焦点抢到第一排按钮会把整页往上顶，
          // 用户刚点的位置就跑了（2026-11-23 真机复验踩到）。焦点给键盘用户，但别动滚动位置。
          const first = $("#plan-prefs .pref-chip");
          if (first) first.focus({preventScroll: true});
          return;
        }
        // 没点「保存」就收起，等于放弃改动：先把 chips 还原到已保存的偏好。
        restoreSaved();
        setCollapsed(true);
      });
    }
    if (regen && !regen.dataset.wired) {
      regen.dataset.wired = "1";
      regen.addEventListener("click", () => {
        regenerateWeekPlan({vary: true});
        const split = (planPrefs() || {}).split;
        const label = {push: "推", pull: "拉", legs: "腿", upper: "上肢", lower: "下肢", full: "全身"}[nextStartTemplate(split, weekVariation)] || "";
        notice("已换一套：本周从「" + label + "日」起排，之后的日期跟着轮换。偏好没变。");
      });
    }
    if (save && !save.dataset.wired) {
      save.dataset.wired = "1";
      save.addEventListener("click", async () => {
        const prefs = {
          days: Number(read("days")) || 3,
          split: read("split") || "ppl",
          gear: read("gear") || "mixed",
          minutes: Number(read("minutes")) || 45,
          request: readRequest()
        };
        savePlanPrefs(prefs);
        // 保存偏好与生成本周安排是同一次动作：以前指纹没变就复用缓存，看起来像「点了没反应」。
        regenerateWeekPlan({fresh: true});
        setCollapsed(true);
        // 2026-11-24：生成不再只弹一句 toast——先给一屏「这周这样排」，把参数怎么落地说清再收工。
        const more = await showCoachSummary(prefs, lastWeekPlan);
        if (more) openPlanSheet();
      });
    }
  }
```

#### `weekPlanToday` — 60-training-copy.fragment.js:349–376（28 行）

```js
  /**
   * 今天页的「今日训练清单」：计划语义的唯一入口。三态——
   * 有 AI 清单：可勾选的镜像 + 完成度 + 一键加入训练记录；
   * 无清单但有记录：列出已记录动作（只报记录，不伪装成排好的顺序）；
   * 都没有：给「用 AI 排今天 / 看本周安排」两个入口。
   */
  /** 本周计划整体是否存在、今天那一节是什么——休息日与「还没排」是两件事，不能混成一句话。 */
  function weekPlanToday() {
    const weekStart = planStartDate();
    let plan = (lastWeekPlan && lastWeekPlan.days) ? lastWeekPlan : null;
    if (!plan) {
      const cached = readWeekPlanCache(weekStart);
      plan = cached && cached.plan ? cached.plan : null;
    }
    if (!plan) {
      try {
        const baselines = recentExerciseBaselines(14);
        const pref = prefsForPlan() || {};
        const sessions = Math.max(1, Math.min(6, Math.round(number(pref.days) || number(effectiveProfileForDate(activeDate).training) || 3)));
        const flag = (acwrFromDailyLoads(dailyLoads(28), activeDate) || {}).flag || "ok";
        plan = generateWeekPlan({startDate: weekStart, sessions, lastByExercise: baselines, acwrFlag: flag,
          goal: (state.profile || {}).goal, split: pref.split, gear: pref.gear, minutes: pref.minutes,
          request: pref.request, startTemplate: typeof nextStartTemplate === "function" ? nextStartTemplate(pref.split) : ""});
        if (plan) writeWeekPlanCache(weekStart, {plan, fingerprint: weekPlanFingerprint(prefsForPlan(), baselines, sessions), savedAt: Date.now()});
      } catch { plan = null; }
    }
    return {hasPlan: !!(plan && plan.days), day: plan && plan.days ? plan.days.find(item => item.date === activeDate) || null : null};
  }
```

#### `weekTodaySession` — 60-training-copy.fragment.js:377–380（4 行）

```js
  /** 本周计划里「今天」那一节：与 weekPlanToday 共用同一个来源，不再各算一遍。 */
  function weekTodaySession() {
    return weekPlanToday().day;
  }
```

#### `cachedWeekPlan` — 60-training-copy.fragment.js:381–385（5 行）

```js
  /** 今天页只读已有缓存，不为了显示「今天该练」临时生成一份新计划。 */
  function cachedWeekPlan() {
    const cached = readWeekPlanCache(planStartDate());
    return cached && cached.plan && Array.isArray(cached.plan.days) ? cached.plan : null;
  }
```

#### `buildTodayAgenda` — 60-training-copy.fragment.js:386–466（81 行）

```js
  /**
   * 今天页的单一行动模型：只读、无网络、无写库。最多一个 primary 加两个 secondary。
   * 休息/未记录/不训练都不在这里被当成「漏练」；计划只来自已存在的周计划缓存。
   */
  function buildTodayAgenda(input) {
    const src = input || {};
    const meals = Array.isArray(src.meals) ? src.meals : [];
    const aiPlan = Array.isArray(src.aiPlan) ? src.aiPlan : [];
    const trainingState = trainingStateFor({
      exercises: src.exercises,
      habitTraining: src.habitTraining,
      profileTraining: src.profileTraining,
      hasPlan: src.hasPlan,
      planDay: src.planDay
    });
    const secondary = [];
    const addSecondary = item => {
      if (!item || secondary.length >= 2) return;
      if (secondary.some(row => row.id === item.id)) return;
      secondary.push(item);
    };
    let primary = null;

    if (src.isToday === false) {
      if (!meals.length) {
        primary = {
          id: 'meal', kind: 'meal', label: '补记一餐', target: 'meal-text',
          mealSlot: src.mealSlot || 'lunch', reason: '这一天还没有餐食记录'
        };
      }
      if (src.sleepMissing) addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'});
      if (src.weightMissing) addSecondary({id: 'weight', kind: 'weight', label: '补体重', target: 'measurement-weight'});
      return {primary, secondary, state: trainingState};
    }

    const trainingAvailable = trainingState !== 'disabled';
    if (trainingAvailable) {
      const pending = aiPlan.filter(item => item && !item.done);
      if (pending.length) {
        const started = aiPlan.some(item => item && item.done);
        primary = {
          id: 'training-next', kind: 'training',
          label: started ? '继续今天的训练' : '按今天的顺序开始训练',
          target: 'ai-plan', reason: `${pending.length} 个动作还没完成`
        };
      }
    }

    const missing = Array.isArray(src.missingMeals) ? src.missingMeals : [];
    if (!primary && missing.length) {
      const names = missing.map(item => item.label).join('、');
      primary = {
        id: 'meal-missing', kind: 'meal', label: `补记${names}`,
        target: 'meal-text', mealSlot: missing[0].key, reason: '按现在的时段还没有看到记录'
      };
    }
    if (!primary && trainingAvailable && trainingState === 'planned') {
      primary = {
        id: 'training-plan', kind: 'training', label: '记录今天的训练',
        target: 'training-form', reason: '今天有安排，还没有动作记录'
      };
    }
    if (!primary && !meals.length) {
      primary = {
        id: 'meal-first', kind: 'meal', label: '记下今天的一餐',
        target: 'meal-text', mealSlot: src.mealSlot || 'lunch', reason: '今天还没有餐食记录'
      };
    }
    if (!primary && src.proteinGap > 0) {
      primary = {
        id: 'protein-gap', kind: 'meal',
        label: `下一餐补蛋白（还差 ${Math.round(src.proteinGap)} g）`,
        target: 'meal-text', mealSlot: src.mealSlot || 'lunch',
        reason: '蛋白质还没到目标'
      };
    }

    if (src.sleepMissing) addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'});
    if (src.weightMissing) addSecondary({id: 'weight', kind: 'weight', label: '补体重', target: 'measurement-weight'});
    return {primary, secondary, state: trainingState};
  }
```

#### `todayAgendaState` — 60-training-copy.fragment.js:467–500（34 行）

```js
  /** Current-page adapter: gathers state, cache and today's clock for the pure builder. */
  function todayAgendaState() {
    const today = localDate();
    const plan = cachedWeekPlan();
    const planDay = plan && Array.isArray(plan.days) ? plan.days.find(item => item && item.date === activeDate) || null : null;
    const habit = habitRowFor(activeDate) || {};
    const exercises = exercisesFor(activeDate);
    const meals = (state && Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === activeDate);
    const measurement = measurementRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const totals = totalsFor(meals);
    const proteinMin = number(profile.proteinMin);
    const protein = number(totals.protein);
    const proteinGap = proteinMin !== null && protein !== null && protein < proteinMin ? Math.round((proteinMin - protein) * 10) / 10 : 0;
    const currentMealSlot = typeof defaultMealTypeFor === 'function' ? defaultMealTypeFor(nowClock()) : 'lunch';
    let aiPlan = [];
    if (activeDate === today && typeof aiPlanStore === 'function') {
      try {aiPlan = aiPlanStore(activeDate) || [];} catch {aiPlan = [];}
    }
    return buildTodayAgenda({
      isToday: activeDate === today,
      meals, exercises,
      habitTraining: habit.training,
      profileTraining: state && state.profile ? state.profile.training : '',
      hasPlan: !!plan,
      planDay,
      missingMeals: activeDate === today ? missingMealSlots(activeDate, new Date()) : [],
      aiPlan,
      mealSlot: currentMealSlot,
      sleepMissing: number(habit.sleep) === null,
      weightMissing: number(measurement.weight) === null,
      proteinGap
    });
  }
```

#### `adoptWeekDay` — 60-training-copy.fragment.js:501–528（28 行）

```js
  /** 把周计划今天那一节写进今日清单，两处入口（今日页 / 记录页）共用。 */
  async function adoptWeekDay() {
    const day = weekTodaySession();
    if (!day || !day.exercises.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    // 覆盖前先问：用户可能刚用 AI 排过一份，替换掉要他自己点头。
    const existing = aiPlanStore(activeDate) || [];
    if (existing.length) {
      const go = await askConfirm("今天已有一份清单（" + existing.length + " 个动作）。要用本周安排替换它吗？",
        {title: "替换今日清单", ok: "替换", cancel: "保留原来的"});
      if (!go) return;
    }
    const plan = day.exercises.map(item => ({
      name: String(item.name || "").slice(0, 60),
      sets: number(item.sets) > 0 ? number(item.sets) : 0,
      reps: number(item.reps) > 0 ? number(item.reps) : 0,
      weight: number(item.weight) > 0 ? number(item.weight) : null,
      ...(item.weightApprox ? {weightApprox: true} : {}),
      reason: "",
      source: "week",
      done: false
    })).filter(item => item.name);
    if (!plan.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    aiPlanStore(activeDate, plan);
    if (typeof renderAiPlan === "function") renderAiPlan();
    renderAdviceOrder();
    renderWeekPlan();
    notice("已把今天这节采纳到今日清单，可以逐项勾选执行。");
  }
```

#### `renderAdviceOrder` — 60-training-copy.fragment.js:529–644（116 行）

```js
  function renderAdviceOrder() {
    const box = $("#training-advice-order");
    if (!box) return;
    if (!box.dataset.todayWired) {
      box.dataset.todayWired = "1";
      box.addEventListener("click", event => {
        const log = event.target.closest("[data-today-log]");
        if (log) {
          event.preventDefault();
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          if (typeof startLoggingFromPlan === "function") startLoggingFromPlan(plan[Number(log.dataset.todayLog)]).catch(() => {});
          return;
        }
        const done = event.target.closest("[data-today-done]");
        if (done) {
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          const index = Number(done.dataset.todayDone);
          if (!plan[index]) return;
          // 勾选即记录（1.5.21）走 togglePlanDone 的唯一入口：它会写一条训练记录、回写 done、重绘表单。
          // 2026-11-23 Phase 2 修：这里曾直接改 aiPlanStore 绕过了写库，勾了却什么都没记上。
          Promise.resolve(typeof togglePlanDone === "function" ? togglePlanDone(index, done.checked) : null)
            .then(() => renderAdviceOrder())
            .catch(error => {
              // 写库失败：把勾选框退回原状态，不留半条记录。
              done.checked = !done.checked;
              renderAdviceOrder();
              if (typeof notice === "function") notice(error && error.message ? error.message : "这次没记上，请重试。", true);
            });
          return;
        }
        const adopt = event.target.closest("[data-today-adopt]");
        if (adopt) { event.preventDefault(); adoptWeekDay(); return; }
        const addAll = event.target.closest("[data-today-add-all]");
        if (addAll) {
          const pending = (typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : []).filter(item => !item.done);
          if (typeof addExercisesToToday === "function") addExercisesToToday(pending).catch(() => {});
          return;
        }
        const jump = event.target.closest("[data-today-plan]");
        if (jump) {
          // 「用 AI 排今天」就地排：跳页再让用户点第二次，是最伤直觉的一步。
          if (jump.dataset.todayPlan === "ai" && typeof askAiPlan === "function") {
            if (!externalConsent()) { notice("请先到「我的 → 数据与关于」开启外部模型授权。"); return; }
            askAiPlan(jump);
            return;
          }
          // 本周安排长在「训练」分段里：先切分段，再等卡片真的渲染出来再滚。
          // 原来只 switchTab + 80ms 后 scrollIntoView，记录页此刻还停在饮食分段，滚动打空。
          // 2026-11-27：#ai-plan 卡片 11-22 已删除，AI 清单直接播进执行区，跳转目标改为 #training-log。
          const wantAi = jump.dataset.todayPlan === "ai";
          switchTab("records", true);
          const jumpToPlan = (attempt = 0) => {
            if (typeof switchRecordPanel === "function") switchRecordPanel("training");
            const target = $(wantAi ? "#training-log" : "#week-plan-card");
            if (target) {
              target.scrollIntoView({block: "start", behavior: "smooth"});
              if (typeof flashTarget === "function") flashTarget(target);
              return;
            }
            if (attempt < 12) setTimeout(() => jumpToPlan(attempt + 1), 100);
          };
          setTimeout(() => jumpToPlan(), 60);
        }
      });
    }
    const plan = typeof aiPlanStore === "function" ? aiPlanStore(activeDate) : null;
    const items = exercisesFor(activeDate).filter(item => item && item.name);
    if (plan && plan.length) {
      const doneCount = plan.filter(item => item.done).length;
      const pending = plan.length - doneCount;
      const rows = plan.map((item, index) => {
        const dose = [item.sets ? item.sets + " 组" : "", item.reps ? item.reps + " 次" : "", item.weight ? item.weight + " kg" : ""].filter(Boolean).join(" × ");
        return "<li class=\"adv-plan-li\"><label class=\"adv-plan-item\"><input type=\"checkbox\" data-today-done=\"" + index + "\"" + (item.done ? " checked" : "") + ">"
          + "<span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</label>"
          + "<button type=\"button\" class=\"text-button adv-plan-log\" data-today-log=\"" + index + "\" aria-label=\"记录" + esc(item.name) + "\">记录</button></li>";
      }).join("");
      box.hidden = false;
      box.innerHTML = "<h3 class=\"plan-sub\">今日清单 · " + doneCount + "/" + plan.length + " 完成</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
        + (pending ? "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-add-all>把未完成的加入训练记录</button></div>" : "<p class=\"fine-print\">清单已全部完成。</p>")
        + "<p class=\"fine-print\">编辑清单请到「记录 → 训练计划」。</p>";
      return;
    }
    if (!items.length) {
      const weekInfo = weekPlanToday();
      const weekDay = weekInfo.day;
      if (weekInfo.hasPlan && (!weekDay || !weekDay.exercises.length)) {
        // 排过周计划、今天就是休息日——直说休息，别用「还没有训练清单」这种暗示漏排的说法。
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">今天按本周安排是休息日</h3>"
          + "<p class=\"fine-print\">想练也可以临时排一份，不会改动本周安排。</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">临时用 AI 排今天</button>"
          + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
        return;
      }
      if (weekDay && weekDay.exercises.length) {
        const names = weekDay.exercises.map(item => item.name).slice(0, 4).join("、");
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">本周计划今天 · " + esc(TRAINING_TEMPLATES[weekDay.template] || weekDay.template) + "</h3>"
          + "<p class=\"fine-print\">" + esc(names) + (weekDay.exercises.length > 4 ? " 等 " + weekDay.exercises.length + " 个动作" : "") + "</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button primary\" data-today-adopt>把今天加入清单</button></div>";
        return;
      }
      box.hidden = false;
      box.innerHTML = "<p class=\"muted\">今天还没有训练清单；想练的时候再排也来得及。</p>"
        + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">用 AI 排今天</button>"
        + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
      return;
    }
    const rows = items.map((item, index) => {
      const dose = [item.sets && item.sets + " 组", item.reps && item.reps + " 次", item.weight && item.weight + " kg"].filter(Boolean).join(" × ");
      return "<li><span class=\"adv-order\">" + (index + 1) + "</span><span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</li>";
    }).join("");
    box.hidden = false;
    box.innerHTML = "<h3 class=\"plan-sub\">已记录 " + items.length + " 个动作</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
      + "<p class=\"fine-print\">想要一份按顺序的清单？用 AI 排今天，或按本周安排练。</p>";
  }
```

#### `prefsForPlan` — 60-training-copy.fragment.js:652–656（5 行）

```js
  /** 指纹 = 偏好 + 每个动作最近一次的组/次/重量；任一项变才重算，避免回看时清单悄悄变。 */
  /** 指纹只关心影响排课的那几个输入；没有偏好时留空，仍能稳定比较。 */
  function prefsForPlan() {
    return typeof planPrefs === "function" ? planPrefs() : null;
  }
```

#### `weekPlanFingerprint` — 60-training-copy.fragment.js:657–667（11 行）

```js
  function weekPlanFingerprint(prefs, lastByExercise, sessions) {
    const parts = [sessions, prefs ? prefs.days : "", prefs ? prefs.split : "", prefs ? prefs.gear : "", prefs ? prefs.minutes : "", prefs ? prefs.request : ""];
    for (const name of Object.keys(lastByExercise || {}).sort()) {
      const row = lastByExercise[name];
      parts.push(name + ":" + row.sets + "x" + row.reps + "x" + row.weight);
    }
    const text = parts.join("|");
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    return String(hash >>> 0);
  }
```

#### `readWeekPlanCache` — 60-training-copy.fragment.js:668–670（3 行）

```js
  function readWeekPlanCache(week) {
    try { const raw = localStorage.getItem(WEEK_PLAN_KEY(week)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
```

#### `writeWeekPlanCache` — 60-training-copy.fragment.js:671–673（3 行）

```js
  function writeWeekPlanCache(week, value) {
    try { localStorage.setItem(WEEK_PLAN_KEY(week), JSON.stringify(value)); } catch {}
  }
```

#### `planStartDate` — 60-training-copy.fragment.js:679–682（4 行）

```js
  /** 七天窗口的起点：就是正在看的这一天，不再跳到下周一。 */
  function planStartDate() {
    return validDate(activeDate) ? activeDate : localDate();
  }
```

#### `dayTemplateSlot` — 60-training-copy.fragment.js:683–691（9 行）

```js
  /**
   * 「那天该练哪一类」的唯一来源：本周安排（周计划）里当天的 template。
   * 排今天的提示词与问答的训练建议都读这一处，两边才不会一边排推、一边建议练腿。
   */
  function dayTemplateSlot(date = activeDate) {
    const cache = readWeekPlanCache(planStartDate());
    const days = cache && cache.plan && Array.isArray(cache.plan.days) ? cache.plan.days : [];
    return days.find(day => day && day.date === date) || null;
  }
```

#### `dayLabel` — 60-training-copy.fragment.js:692–695（4 行）

```js
  /** 所看那天的名字：日历上的今天写「今天」，其余写 MM-DD。 */
  function dayLabel(date = activeDate) {
    return date === localDate() ? "今天" : String(date || "").slice(5);
  }
```

#### `dayTemplateNote` — 60-training-copy.fragment.js:696–702（7 行）

```js
  /** 喂给两个 AI 入口的同一句话；没有周计划就直接给空串，不编一个部位出来。 */
  function dayTemplateNote(date = activeDate) {
    const slot = dayTemplateSlot(date);
    if (!slot || !slot.template) return "";
    const label = TRAINING_TEMPLATES[slot.template] || slot.template;
    return dayLabel(date) + "按周计划应练：" + label + "日（" + slot.template + "）；动作与建议都围绕这一类。";
  }
```

#### `nextStartTemplate` — 60-training-copy.fragment.js:703–721（19 行）

```js
  /** 明确「重新生成」：清掉本窗口缓存并强制重算，偏好不变也能换一版。 */
  /** 起始部位＝接上一次训练的下一个（2026-11-22 用户拍板）。ppl 按推→拉→腿轮转；上下肢按上下交替；全身固定。
   *  extra：用户点「换一套」时往前推一格——同一套偏好下也能拿到不同的排法，否则生成器是确定性的，按了等于没按。 */
  function nextStartTemplate(split, extra = 0) {
    const key = ['ppl', 'ul', 'fb'].includes(String(split)) ? String(split) : 'ppl';
    const rows = (state.habits || [])
      .filter(row => row && validDate(row.date) && row.date < activeDate && row.template && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const last = rows[0] ? String(rows[0].template) : '';
    if (key === 'fb') return 'full';
    if (key === 'ul') {
      const base = ['legs', 'lower'].includes(last) ? 0 : 1;
      return ['upper', 'lower'][(base + extra) % 2];
    }
    const order = ['push', 'pull', 'legs'];
    const at = order.indexOf(last);
    const base = at >= 0 ? (at + 1) % 3 : 0;
    return order[(base + extra) % 3];
  }
```

#### `regenerateWeekPlan` — 60-training-copy.fragment.js:722–731（10 行）

```js
  function regenerateWeekPlan(opts = {}) {
    // 换一套 = 起始部位往前一格（生成器确定性，不推一格按了等于没按）；保存偏好 = 回到基准起点。
    weekVariation = opts.vary ? (weekVariation + 1) % 12 : 0;
    planFresh = opts.fresh === true || opts.vary === true;
    const startDate = planStartDate();
    try { localStorage.removeItem(WEEK_PLAN_KEY(startDate)); } catch { }
    lastWeekPlan = null;
    forceWeekPlan = true;
    renderWeekPlan();
  }
```

#### `scheduleWeekPlan` — 60-training-copy.fragment.js:732–768（37 行）

```js
  /**
   * 「把这周写进训练记录」：只追加、不覆盖——每天原有记录整条保留，同名动作跳过；
   * 一天都没新增就不写，也不改 training 标记。2026-11-23 Phase 3 从 70 的独立监听器收进来。
   */
  async function scheduleWeekPlan(button) {
    const plan = lastWeekPlan;
    if (!plan) return;
    const ok = await askConfirm('将把 ' + plan.days.length + ' 次训练写入 ' + plan.startDate + ' 起的一周（每天一条训练记录）。已记录的动作会保留，只补充缺的动作。', {title: '排进本周'});
    if (!ok) return;
    button.disabled = true;
    try {
      let written = 0, kept = 0, addedTotal = 0;
      for (const day of plan.days) {
        const habit = habitRowFor(day.date) || {date: day.date};
        const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
        const have = new Set(existing.map(row => String(row && row.name || '').trim()));
        const additions = [];
        for (const item of day.exercises) {
          const name = String(item && item.name || '').trim();
          if (!name || have.has(name)) continue;
          have.add(name);
          additions.push({name, sets: item.sets, reps: item.reps, weight: item.weight});
        }
        if (!additions.length) { kept++; continue; }
        await api('/api/habits', {...habit, date: day.date, training: true, exercises: [...existing, ...additions]});
        written++;
        addedTotal += additions.length;
      }
      await loadState({quiet: true});
      const tail = kept ? '；' + kept + ' 天已排过，未改动' : '';
      notice('已排好 ' + written + ' 次训练（新增 ' + addedTotal + ' 个动作）' + tail + '，可在「记录 · 训练」逐日调整。');
    } catch (error) {
      notice(error.message, true);
    } finally {
      button.disabled = false;
    }
  }
```

#### `planQualityLine` — 60-training-copy.fragment.js:769–792（24 行）

```js
  /**
   * 生成之后的「这一版长什么样」自检：几练、部位顺序、每次几个动作、周组数是否压在上限内、
   * 有多少动作的重量是按体重推算的。只报事实，不报耗时——用户要的是排得对，不是排得快。
   */
  function planQualityLine(plan) {
    if (!plan || !Array.isArray(plan.days) || !plan.days.length) return '';
    const labels = planDayLabels(plan.days);
    const counts = plan.days.map(day => (day.exercises || []).length);
    const span = counts.length && Math.min(...counts) === Math.max(...counts)
      ? `每次 ${counts[0]} 个动作`
      : `每次 ${Math.min(...counts)}–${Math.max(...counts)} 个动作`;
    const cap = plan.days[0]?.weeklySets?.cap || null;
    const part = family => plan.days.reduce((sum, day) => sum + (day.exercises || [])
      .filter(item => typeof exerciseBodyPart === 'function' && exerciseBodyPart(item.name) === family)
      .reduce((inner, item) => inner + (Number(item.sets) || 0), 0), 0);
    const sets = cap ? ` · 周组数 胸 ${part('push')} / 背 ${part('pull')} / 腿 ${part('legs')}（上限 ${cap}）` : '';
    // 4 练的推拉腿必然有一类练两次（胸 12 / 背 6 / 腿 6 这种）：把差距说出来，并给出不改动作的解法。
    const fams = [part('push'), part('pull'), part('legs')];
    const imbalanced = cap && Math.max(...fams) - Math.min(...fams) >= 6;
    const approx = plan.days.reduce((n, day) => n + (day.exercises || []).filter(item => item.weightApprox).length, 0);
    return '<p class="fine-print plan-quality">已生成 ' + plan.days.length + ' 练 · ' + labels + ' · ' + span + sets
      + (approx ? ' · ' + approx + ' 个动作按体重推算起步' : '')
      + (imbalanced ? ' · 想练得更匀，可把每周改成 3 或 6 练' : '') + '</p>';
  }
```

#### `planDayLabels` — 60-training-copy.fragment.js:793–804（12 行）

```js
  /** 一周的部位顺序：连续相同合并成「全身 ×4」，轻量日单独标「（轻）」。 */
  function planDayLabels(days) {
    const tpl = name => (typeof TRAINING_TEMPLATES === 'object' && TRAINING_TEMPLATES[name]) || name;
    const runs = [];
    for (const day of days || []) {
      const label = tpl(day.template) + (day.light ? '（轻）' : '');
      const last = runs[runs.length - 1];
      if (last && last.label === label) last.count += 1;
      else runs.push({label, count: 1});
    }
    return runs.map(run => run.count > 1 ? `${run.label} ×${run.count}` : run.label).join(' / ');
  }
```

#### `planWhyBadgeHtml` — 60-training-copy.fragment.js:805–821（17 行）

```js
  /**
   * 「为什么这样排？」：把生成时真正用上的参数摊开——时长上限、动作数、器械、起始部位、
   * 被排除的要求、是否减载。默认收起，挂在计划标题下面，不占首屏。
   */
  function planWhyBadgeHtml(plan) {
    const a = (plan && plan.applied) || {};
    const tpl = n => TRAINING_TEMPLATES[n] || n;
    const first = plan && plan.days && plan.days[0] ? tpl(plan.days[0].template) : '';
    const bits = [];
    if (a.minutes) bits.push(`单次按 ${a.minutes} 分钟排，每次 ${a.moves} 个动作、每组最多 ${a.setCap} 组`);
    if (a.gear) bits.push(`器械：${PLAN_GEAR_LABELS[a.gear] || a.gear}`);
    if (first) bits.push(`起始接上一次训练之后：从${first}日开始轮换`);
    if (Array.isArray(a.bannedWords) && a.bannedWords.length) bits.push(`已按你的要求排除：${a.bannedWords.join('、')}`);
    if (plan && plan.deload) bits.push('本周判定为减载周：负重 ×0.9、组数 −1');
    if (!bits.length) return '';
    return `<details class="plan-why-badge"><summary>为什么这样排？</summary><p>${esc(bits.join('；'))}。</p></details>`;
  }
```

#### `openPlanSheet` — 60-training-copy.fragment.js:822–825（4 行）

```js
  function openPlanSheet() {
    const trigger = $("#plan-explain-open");
    if (trigger) trigger.click();
  }
```

#### `showCoachSummary` — 60-training-copy.fragment.js:826–849（24 行）

```js
  /**
   * 「这周这样排」——生成后必须先看的一屏：把这次改的偏好逐条落到结果上（排了几练、时长怎么折算、
   * 器械、训练要求是否被读取/排除、周组数是否压在上限内）。返回 true 表示用户想去看看详细说明。
   */
  function showCoachSummary(prefs, plan) {
    const a = (plan && plan.applied) || {};
    const tpl = n => TRAINING_TEMPLATES[n] || n;
    const days = (plan && plan.days) || [];
    const labels = planDayLabels(days);
    const rows = [];
    rows.push(`每周 ${prefs.days} 练 → 实际排了 ${days.length} 练：${labels || '—'}`);
    rows.push(`单次 ${prefs.minutes} 分钟上限 → 每次 ${a.moves || '—'} 个动作、每组最多 ${a.setCap || '—'} 组`);
    rows.push(`器械：${PLAN_GEAR_LABELS[prefs.gear] || prefs.gear || '综合'}`);
    const request = String(prefs.request || '').trim();
    rows.push(request
      ? `训练要求：${request}${Array.isArray(a.bannedWords) && a.bannedWords.length ? ` → 已排除：${a.bannedWords.join('、')}` : ' → 已读取，没有命中要排除的动作'}`
      : '训练要求：未填写');
    const cap = days[0] && days[0].weeklySets ? days[0].weeklySets.cap : null;
    if (cap) rows.push(`周组数：压在每部位 ${cap} 组上限内`);
    if (plan && plan.deload) rows.push('负荷判定偏高 → 按减载周排：负重 ×0.9、组数 −1');
    const bodyHtml = `<ul class="dialog-items coach-summary">${rows.map(row => `<li><span>${esc(row)}</span></li>`).join('')}</ul>`;
    return askConfirm('这一版是按你刚改的偏好重排的。', {title: '这周这样排', ok: '知道了', cancel: '看详细说明', bodyHtml})
      .then(ok => ok === false);
  }
```

#### `renderWeekPlan` — 60-training-copy.fragment.js:850–1006（157 行）

```js
  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = recentExerciseBaselines(14);
    const planPref = prefsForPlan() || {};
    // 以「计划偏好里的每周训练次数」为准，档案次数只做兜底——否则改了 chip 也不生效。
    const sessions = Math.max(1, Math.min(6, Math.round(number(planPref.days) || number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = planStartDate();
    const fingerprint = weekPlanFingerprint(prefsForPlan(), lastByExercise, sessions);
    const cached = forceWeekPlan ? null : readWeekPlanCache(startDate);
    let plan, drifted = false;
    if (cached && cached.plan && cached.fingerprint === fingerprint) {
      plan = cached.plan; // 指纹没变：照用上次的结果，计划是被「约定」过的
    } else {
      plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok',
        goal: (state.profile || {}).goal, split: planPref.split, gear: planPref.gear, minutes: planPref.minutes,
        // 训练要求（排除动作 / 改时长）必须一起传：漏传会让「保存并重排」生成的计划完全不执行 excludedMove。
        request: planPref.request,
        startTemplate: nextStartTemplate(planPref.split, weekVariation)});
      drifted = !!(cached && cached.plan);
      if (plan) writeWeekPlanCache(startDate, {plan, fingerprint, savedAt: Date.now()});
    }
    forceWeekPlan = false;
    lastWeekPlan = plan;
    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty'); return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '负重 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    // 2026-11-23 四模块之四：卡面不再提供「把今天这节加入清单」——计划当天已自动播种成日志行。
    // 负荷：标签 + 数值 + 判定，不写成一句话。「急慢性比」第一次看不知道是谁比谁，改成「负荷比」+ 一行口径。
    const acwrHtml = (() => {
      if (!stats || !Number.isFinite(stats.ratio)) return '';
      const level = stats.flag === 'high' ? 'high' : stats.flag === 'low' ? 'low' : 'ok';
      const verdict = level === 'high' ? '偏高 · 本周减载' : level === 'low' ? '偏低 · 按记录安排' : '维持';
      return '<p class="plan-label">训练负荷</p><div class="plan-load is-' + level + '"><span class="plan-load-label">负荷比</span>'
        + '<span class="plan-load-value">' + stats.ratio.toFixed(2) + '</span>'
        + '<span class="plan-load-verdict">' + verdict + '</span></div>'
        + '<p class="fine-print plan-load-note">负荷比 = 近 7 天 ÷ 近 4 周平均负荷；0.8–1.3 为维持区。</p>';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    // 预览日：点周条只换「看哪天」，不动 activeDate——页面不跳、周条窗口也不挪，随时能点回今天。
    const previewStart = startDate;
    const previewEnd = shiftDay(previewStart, 7);
    if (!weekDetailDay || weekDetailDay < previewStart || weekDetailDay >= previewEnd) weekDetailDay = activeDate;
    // 只讲「这一周怎么排的」。AI 给单个动作的理由已经在「今日顺序」每行下面，这里再列一遍
    // 会与预览日期脱节（切到 21 号还挂着 19 号的清单），所以不重复。
    const whyBody = '<p class="plan-why-lead">为什么这样排：这一周的框架按训练库与你最近两周的记录生成。</p>'
      + '<p>' + esc(plan.note) + '</p>'
      + (Array.isArray(plan.reasons) ? plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + '</p>').join('') : '');
    // 2026-11-22：常驻的「动作要点」折叠块撤掉——动作名旁的 ? 已是唯一入口。
    // 「怎么来的」是这一周的口径，与哪天选中无关，所以单独折叠、切日期也不动它。
    const whyHtml = '<details class="plan-why"><summary>这周怎么排的</summary>' + whyBody + '</details>';
    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。
    const planBox = $("#week-plan");
    if (planBox && !planBox.dataset.adoptWired) {
      planBox.dataset.adoptWired = "1";
      planBox.addEventListener("click", event => {
        const cell = event.target.closest("[data-week-day]");
        if (cell) {
          // 2026-11-19（用户：点 21 号页面不要跳，能点回 19；下方显示那天练什么 + 那天的动作要点）：
          // 只换「看哪天」，不动 activeDate——周条窗口还从原来那天起算，页面也不跳。
          const day = cell.dataset.weekDay || "";
          if (!day) return;
          weekDetailDay = day;
          for (const node of planBox.querySelectorAll("[data-week-day]")) {
            const on = node.dataset.weekDay === day;
            node.classList.toggle("is-selected", on);
            node.setAttribute("aria-pressed", String(on));
          }
          const detail = $("#week-detail");
          if (detail) detail.textContent = weekDetailHtml(day, lastWeekPlan);
          // 2026-11-22：常驻「动作要点」块已撤掉，点日期只换这一行明细；
          // 单个动作的要点走动作名旁的 ?（showExerciseGuide），不再占卡面。
          return;
        }
        // 2026-11-23 四模块之四：卡面上的「加入今日清单」已删除（计划当天自动播种，不需要中间步骤）；
        // 今日页那份 [data-today-adopt] 入口仍保留，走 adoptWeekDay()。
        // 2026-11-23 Phase 3：把这周的写入也收进同一个委托，#week-plan 上不再有第二个监听器。
        const schedule = event.target.closest("[data-plan-schedule]");
        if (schedule) scheduleWeekPlan(schedule);
      });
    }
    const prefs = planPrefs();
    // 收起/展开由 installPlanPrefs 统一管：这里别再强行显示，否则「修改」刚收起又会被撑开。
    let thisWeekHtml;
    if (!prefs) {
      thisWeekHtml = "<p class=\"muted\">先选一下训练偏好（频率 / 分化 / 器械 / 时长），再按它安排本周。</p>";
    } else {
      // 2026-11-11 晚（用户：美术效果优先于表格结构）：本周安排不再是一张 7 行表格，
      // 而是一条 7 格周条——训练日一根绿短线、已练实心、今天加深；点某格在下面换一行详情。
      // 2026-11-18：周条改成「从今天起的 7 天」，与计划同日出发，标题也从「下周安排」改回「本周安排」。
      const weekStartPlan = startDate;
      const cells = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = shiftDay(weekStartPlan, offset);
        const planDay = plan.days.find(item => item.date === day) || null;
        const logged = exercisesFor(day).filter(item => item && item.name).length > 0;
        // 加深只给日历上的今天：切到别的那天时，窗口里没有真正今天，就谁都不加深。
        const isToday = day === localDate();
        const selected = day === weekDetailDay;
        const dow = "日一二三四五六"[new Date(day + "T00:00:00").getDay()];
        const label = planDay ? (TRAINING_TEMPLATES[planDay.template] || planDay.template) : "休息";
        cells.push('<button type="button" class="week-cell'
          + (planDay ? " is-plan" : "") + (logged ? " is-done" : "") + (isToday ? " is-today" : "") + (selected ? " is-selected" : "")
          + '" data-week-day="' + day + '" aria-pressed="' + (selected ? "true" : "false") + '" aria-label="' + esc(day.slice(5)) + " " + esc(label) + '">'
          + '<span class="week-dow">' + dow + '</span>'
          + '<span class="week-num">' + esc(day.slice(8)) + '</span>'
          + '<span class="week-bar" aria-hidden="true"></span></button>');
      }
      thisWeekHtml = '<h3 class="plan-sub">本周安排 · ' + esc(weekStartPlan.slice(5)) + ' 起</h3>'
        + '<div class="week-strip" role="group" aria-label="从今天起的训练安排，点一天看安排">' + cells.join("") + '</div>'
        + '<p class="week-detail" id="week-detail">' + weekDetailHtml(weekDetailDay, plan) + '</p>';
    }
    const driftHtml = drifted ? '<p class="fine-print">记录有更新，本周安排已按最新数据重算。</p>' : '';
    // 目标对应的训练要求（组数 / 次数 / RIR）：和 docs/design/27-evidence-requirements.md 同一张表，
    // 增肌与减脂的要求不同，页面上直接写出来，别让用户自己猜「这次该练几组」。
    const goalPreset = typeof GOAL_PRESETS === 'object' ? GOAL_PRESETS[(state.profile || {}).goal] : null;
    const goalRequirementHtml = goalPreset && goalPreset.muscleSetsPerWeek
      ? '<p class="fine-print plan-requirement">' + esc('本周要求（' + goalLabelOf((state.profile || {}).goal) + '）：每个大肌群 '
        + goalPreset.muscleSetsPerWeek[0] + '~' + goalPreset.muscleSetsPerWeek[1] + ' 组 · 每组 '
        + goalPreset.reps[0] + '~' + goalPreset.reps[1] + ' 次 · RIR '
        + goalPreset.rir[0] + '~' + goalPreset.rir[1]) + '</p>'
      : '';
    // 一键排课（2026-11-23 四模块之四）：从卡面降级进「计划说明」抽屉——计划当天已自动播种成日志行，
    // 「先点加入 / 先写入」这种中间步骤不再需要；批量补过去几天仍有人要，留在抽屉里当低频动作。
    const scheduleHtml = plan.days.length
      ? '<details class="plan-schedule-more" id="plan-schedule-more"><summary>把这周写进训练记录</summary><p class="fine-print">今天这节已经在下面的日志里了；这里会把这周剩下的 ' + plan.days.length + ' 次训练直接写成记录，之后还能在日志里改。</p><button type="button" class="button subtle full-width" data-plan-schedule="1">写入' + esc(dayLabel(activeDate)) + '起 ' + plan.days.length + ' 次训练</button></details>'
      : '';
    // 「计划 vs 日志」是同屏最容易混的一对：这句话只在抽屉里解释了，卡面不再复述。
    const scopeHtml = plan.days.length
      ? '<p class="fine-print plan-scope">周条只写「练什么」；真正记录的是下面「训练日志」，两者不一致时以日志为准。</p>'
      : '';
    // 两套清单同屏容易混：先说清谁是谁、冲突时听谁的，再让用户读数据。
    const relationHtml = plan.days.length
      ? '<p class="fine-print plan-relation">上面按偏好与最近记录排周框架；实际执行顺序以你在训练日志里确认的那份为准，两者不一致时以日志为准。</p>'
      : '';
    // 卡面只剩本周安排与「记录有更新」一行；其余说明一次性渲染进抽屉，不再靠 move 搬家。
    box.innerHTML = annotateTerms(thisWeekHtml + planQualityLine(plan) + planWhyBadgeHtml(plan) + driftHtml);
    // 徽记默认收起（重画后显式关一次，避免浏览器把新插入的 details 当展开态）。
    box.querySelectorAll('details.plan-why-badge').forEach(node => { node.open = false; });
    // 2026-11-24：刚生成的那一版，标题与说明各播一次 220ms 上浮淡入，再平稳滚到卡头——
    // 「列表已经按新偏好重算过」这件事要有可见动作，而不只是数字变了。
    if (planFresh) {
      planFresh = false;
      const detail = box.querySelector('#week-detail');
      const sub = box.querySelector('.plan-sub');
      if (sub) sub.classList.add('is-fresh');
      if (detail) detail.classList.add('is-fresh');
      $('#week-plan-card')?.scrollIntoView({block: 'start', behavior: 'smooth'});
    }
    const explainHost = $('#plan-explain-body');
    if (explainHost) {
      explainHost.innerHTML = annotateTerms(goalRequirementHtml + relationHtml + whyHtml + acwrHtml + scopeHtml + suggestedNote + scheduleHtml);
    }
  }
```

#### `renderTrendWarnings` — 60-training-copy.fragment.js:1008–1022（15 行）

```js
  /** Load and plateau warnings shown above the weight chart. */
  function renderTrendWarnings() {
    const box = $('#trend-warnings');
    if (!box) return;
    const notes = [];
    const stats = acwrFromDailyLoads(dailyLoads(28), activeDate);
    if (stats && stats.flag === 'high') notes.push('训练负荷急增：近 7 天是近 4 周均值的 ' + stats.ratio + ' 倍，建议本周减载或休息一天。');
    if (stats && stats.flag === 'low' && stats.days >= 3) notes.push('训练量偏低：近 7 天只有均值的 ' + stats.ratio + ' 倍，若在减脂期注意保住肌肉量。');
    const weekly = weeklyWeightMeans();
    const plateau = plateauFromWeekly(weekly);
    if (plateau && plateau.plateau) notes.push('体重平台期：最近三周周均在 ' + plateau.mean + ' kg 上下浮动不到 0.2 kg，可以重算维持热量或调整缺口。');
    if (!notes.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = annotateTerms(notes.map(note => `<p class="warn-line">${esc(note)}</p>`).join(''));
  }
```

#### `renderBodyWeight` — 60-training-copy.fragment.js:1024–1041（18 行）

```js
  /**
   * 记录·身体 的「今天体重」（2026-11-22 由「今天两样」收窄）：卡片只报当天这一条，
   * 点它跳到身体数据卡的体重格——体重只有一个可编辑处，不出现两套口径。
   */
  function renderBodyWeight() {
    const box = $('#body-weight-jump');
    if (!box) return;
    const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};
    const weight = number(measurement.weight);
    const value = $('#body-weight-value'), note = $('#body-weight-hint'), tag = $('#body-quick-tag');
    // 空值时「—」按小字 muted 排，不要拿 32px 半粗画成一条黑杠。
    box.classList.toggle('is-empty', weight === null);
    if (value) value.textContent = weight === null ? '—' : fmt(weight, 1);
    if (note) note.textContent = weight === null ? '点一下填今天的体重' : `已记 ${activeDate.slice(5).replace('-', '/')} · 点一下可修改`;
    if (tag) tag.textContent = weight === null ? '待记录' : '已记录';
    // 折叠态标题的常用指标也要跟着数据走，别等用户展开才补。
    if (typeof paintBodyDataHints === 'function') paintBodyDataHints();
  }
```

#### `copyCandidates` — 60-training-copy.fragment.js:1042–1062（21 行）

```js
  /**
   * 复制上一餐的手机端入口在 1.5.41 已随入口预算移除（index.html 里没有 #copy-meal-buttons），
   * 但这段候选排序 / 去重 / 空态仍被 suite-today 的回归断言直接引用，且快速记录弹窗复用同一套
   * 「昨天优先 + 同名去重」口径，所以保留实现，只把它标注为无 UI 入口。
   */
  /** One-tap copies: yesterday's meals first, then the most recent ones. */
  function copyCandidates() {
    const rows = (state.meals || []).filter(row => row && validDate(row.date) && !row.needsDate);
    const yesterday = shiftDay(activeDate,-1);
    const rank = row => (row.date === yesterday ? 0 : 1);
    const key = row => `${row.date}|${row.mealType || ''}|${row.name || ''}|${fmt(row.calories, 0)}`;
    const seen = new Set();
    return rows.slice().sort((a, b) => rank(a) - rank(b) || String(b.date).localeCompare(String(a.date)))
      .filter(row => {
        const id = key(row);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 5);
  }
```

#### `renderCopyMeals` — 60-training-copy.fragment.js:1063–1073（11 行）

```js
  function renderCopyMeals() {
    const box = $('#copy-meal-buttons');
    if (!box) return;
    const rows = copyCandidates();
    const tag = $('#copy-meal-tag');
    if (tag) tag.textContent = rows.length ? `最近 ${rows.length} 餐` : '暂无可复制记录';
    box.innerHTML = rows.length ? rows.map(row => {
      const label = `${row.date === shiftDay(activeDate,-1) ? '昨天' : String(row.date).slice(5)} · ${mealNames[row.mealType] || '餐食'} · ${stripQuickTag(row.name) || '未命名'}`;
      return `<button type="button" class="button subtle" data-copy-meal="${esc(row.id ?? '')}">${esc(label)}</button>`;
    }).join('') : empty('还没有可复制的餐食记录', '记下一餐后，这里会列出来可直接复制。');
  }
```

#### `copyMeal` — 60-training-copy.fragment.js:1074–1098（25 行）

```js
  /**
   * 复制一条餐食到当前日（新 id、当前时刻、来源标 quick-copy）。
   * 注：1.5.41 起没有页面入口（见 renderCopyMeals 的说明），保留它是因为数据层仍需要这一段
   * 「复制后如何打标」的语义；点击委托也已用可选链兜住。
   */
  /** Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. */
  async function copyMeal(id) {
    const source = (state.meals || []).find(row => row && String(row.id ?? '') === String(id));
    if (!source) {notice('这条记录已经不存在了。', true); renderCopyMeals(); return;}
    const copy = {...source};
    delete copy.id;
    copy.date = activeDate;
    copy.source = 'quick-copy';
    copy.name = stripQuickTag(source.name) || '未命名餐食';
    copy.mealTime = nowClock();
    copy.mealTimeSource = 'manual';
    delete copy.estimateId;
    delete copy.draftId;
    if (!await askConfirm(`把「${source.name || '这一餐'}」复制到 ${activeDate}？复制后可以再改份量。`, {title: '复制这一餐', ok: '复制'})) return;
    try {
      await api('/api/meals', copy);
      await loadState({quiet: true});
      notice(`已复制到 ${activeDate}，请核对份量。`);
    } catch (error) {notice(error.message, true);}
  }
```

#### `numericForm` — 60-training-copy.fragment.js:1099–1099（1 行）

```js
  function numericForm(form, fields) {return Object.fromEntries(fields.map(key => [key, number(form.elements.namedItem(key).value)]));}
```

#### `submitForm` — 60-training-copy.fragment.js:1100–1121（22 行）

```js
  async function submitForm(form, path, build) {
    const button=$('button[type=submit]',form), message=$('.form-feedback',form);
    if (button.disabled || !form.reportValidity()) return;
    button.disabled=true; feedback(message,'正在保存…');
    try {
      const payload=build(form); if (payload===null) return;
      await api(path,payload);
      feedback(message,'已保存。');
      // 领域事件：今天页由 25-today-hub 订阅后按帧合并刷新，保存路径不再各自硬编码重画。
      if (window.QH && QH.bus && QH.EVENTS) {
        const savedEvent = path === '/api/measurements' ? QH.EVENTS.WEIGHT_SAVED
          : path === '/api/habits' ? QH.EVENTS.HABIT_UPDATED
          : path === '/api/profile' ? QH.EVENTS.PREFS_CHANGED : null;
        if (savedEvent) QH.bus.emit(savedEvent, {date: activeDate});
      }
      // 快捷值不再由「保存过什么」自动改写：它现在由「自定义快捷值」显式设定，卡底两枚要可预期。
      if (path === '/api/meals') {form.reset();setDefaultDates();}
      if (path === '/api/settings') {delete providerDrafts[selectedProvider];form.elements.apiKey.value='';form.elements.clearKey.checked=false;}
      try {await loadState({quiet:true});} catch {feedback(message,'保存成功，但刷新失败。请检查连接后重新加载；不要重复提交。',true);}
      if (path === '/api/settings') await refreshSettings();
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled=false;}
  }
```

#### `adviceBusy` — 60-training-copy.fragment.js:1123–1128（6 行）

```js
  function adviceBusy(container) {
    const count = readPreferences().length;
    container.innerHTML = '<div class="inline-busy"><span class="busy-ring" aria-hidden="true"></span>'
      + '<span class="inline-busy-text" data-advice-wait>正在读今天的记录…</span></div>'
      + `<p class="fine-print advice-pref-note">${count ? `已带上 ${count} 条偏好` : '在「我的 → 偏好与记忆」写一条，建议会更贴合你的习惯'}</p>`;
  }
```

#### `refreshAdvice` — 60-training-copy.fragment.js:1129–1152（24 行）

```js
  async function refreshAdvice() {
    const button=$('#refresh-advice'), container=$('#advice-content');
    button.disabled=true; container.removeAttribute('data-date');
    syncCalendarDay();
    const date=activeDate,useAI=externalConsent();
    adviceBusy(container);
    adviceStartedAt=Date.now();
    clearInterval(adviceTicker);
    adviceTicker=setInterval(() => {
      const line=container.querySelector('[data-advice-wait]');
      if (line) line.textContent=`正在读今天的记录…已等 ${Math.round((Date.now()-adviceStartedAt)/1000)}s`;
    },800);
    try {const relax=relaxDayInfoFor(date); const data=await api('/api/advice',{date,relaxDay:!!relax.relax,preferences:readPreferences(),...(useAI?{useAI:true,allowExternal:true}:{})}); if(date!==activeDate) return; if(!Array.isArray(data?.messages)) throw new Error('建议数据格式不正确。'); renderAdvice(data.messages,date,data.actionItems);}
    catch(error) {
      // 模型不可用时退回本地建议：这张卡空着比给一条本地结论更糟。
      try {
        const local=await api('/api/advice',{date});
        if(date!==activeDate) return;
        if(Array.isArray(local?.messages) && local.messages.length) {renderAdvice(local.messages,date,local.actionItems); container.dataset.fallback='1'; container.setAttribute('data-note','模型暂时不可用，以下是本地建议。'); return;}
      } catch {}
      container.textContent=error.message;
    }
    finally {clearInterval(adviceTicker); button.disabled=false;}
  }
```

#### `clearImage` — 60-training-copy.fragment.js:1153–1153（1 行）

```js
  function clearImage() {lastCaptureId='';mealPhotoMeta=photoMeta(null);imageVersion++;imageData=null;imageBusy=false;$('#meal-image').value='';$('#meal-gallery').value='';$('#image-preview').hidden=true;$('#meal-image-preview').removeAttribute('src');}
```

#### `compressImage` — 60-training-copy.fragment.js:1154–1168（15 行）

```js
  async function compressImage(file) {
    if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) throw new Error('暂不支持 HEIC / HEIF。请先在相册导出为 JPEG，再上传。');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片；暂不支持此格式。');
    if (file.size>20*1024*1024) throw new Error('图片过大，请选择小于 20MB 的图片。');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject) => {const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(new Error('无法解码这张图片，请换一张 JPEG / PNG 图片。'));node.src=url;});
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片尺寸无效。');
      const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context) throw new Error('此浏览器不支持图片压缩，请使用餐食文字描述。');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',.82);
    } finally {URL.revokeObjectURL(url);}
  }
```

#### `anchorSummary` — 60-training-copy.fragment.js:1170–1173（4 行）

```js
  /** The user's own anchor table, sent along so the model reuses the same numbers (rules.md 第五节). */
  function anchorSummary() {
    try {return window.QinghengAnchors?.summary?.() || '';} catch {return '';}
  }
```

#### `syncAnchors` — 60-training-copy.fragment.js:1174–1183（10 行）

```js
  /** Stores the anchor block natively once per session so push/advice prompts can reuse it too. */
  async function syncAnchors() {
    const summary = anchorSummary();
    if (!summary) return;
    try {
      const current = await api('/api/anchors');
      if (current?.summary === summary) return;
      await api('/api/anchors', {summary});
    } catch { /* Anchors are an optimisation; never block the app on them. */ }
  }
```

#### `beginMealEdit` — 60-training-copy.fragment.js:1187–1195（9 行）

```js
  function beginMealEdit(record) {
    const view = mealEditView(record);
    if (!view) {notice('这条餐食没有可编辑的明细，请先重新估算。', true); return;}
    switchTab('records', true);
    if (typeof switchRecordPanel === 'function') switchRecordPanel('food');
    setTimeout(() => {
      try {renderPreview(view, true);} catch (error) {notice(error.message, true);}
    }, 60);
  }
```

#### `metricIcon` — 60-training-copy.fragment.js:1197–1214（18 行）

```js
/**
 * 体检格图标：文字已经够多，用图标替代那个无意义的灰点（2026-10-29）。
 * 只映射已有资源，不新增文件；未知指标回退成空，保持排版不塌。
 */
function metricIcon(label) {
  // 取自 Lucide（MIT）：蛋白用鸡腿、脂肪用水滴，两类轮廓差异最大；其余同样 24 网格、1.7 描边。
  const glyphs = {
    热量: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" /></svg>',
    蛋白质: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" /><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" /><circle cx="18.2" cy="6.4" r="1" fill="currentColor" stroke="none" /></svg>',
    脂肪: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /><circle cx="10.6" cy="16.2" r="1" fill="currentColor" stroke="none" /></svg>',
    碳水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /></svg>',
    训练: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>',
    睡眠: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5h4" /><circle cx="16.6" cy="16.4" r="1" fill="currentColor" stroke="none" /><path d="M20 3v4" /><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>',
    饮水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" /><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" /></svg>'
  };
  const markup = glyphs[label];
  return markup ? `<span class="metric-glyph">${markup}</span>` : '';
}
```

### 3.7 动作要点表、做法与要点检索（数据层）

#### EXERCISE_GUIDES 动作要点表 — 65-exercise-guide.fragment.js:1–193（193 行）

```js
/**
 * 动作说明：AI 排出的动作点开名字要能看懂「练什么、注意什么」。
 *
 * 这里只放通用要点（公开训练常识），不做个性化处方，也不判断能不能练；
 * 名字匹配不上时明确说没收录，不拿别的动作糊弄。
 */
  const EXERCISE_GUIDES = [
    {keys: ['颈前深蹲', '前蹲'], name: '颈前深蹲', role: '股四头为主 · 躯干更直立',
      points: ['杠贴锁骨与前束，肘高抬，别让杠往下滑。', '全程躯干直立，膝盖前移是正常的。', '核心收紧，起身不要先抬臀。']},
    {keys: ['高脚杯深蹲', '高脚杯'], name: '高脚杯深蹲', role: '学深蹲模式 · 股四头与核心',
      points: ['抱铃贴胸，手肘在膝盖内侧。', '脚跟不离地，蹲到大腿低于水平（量力而行）。', '起身时胸口先起，别先撅臀。']},
    {keys: ['保加利亚', '分腿蹲'], name: '保加利亚分腿蹲', role: '单腿 · 股四头与臀',
      points: ['后脚搭凳，前脚踩稳，重心留在前脚。', '垂直下蹲，膝盖跟脚尖同向。', '躯干微前倾更偏臀，直立更偏股四头。']},
    {keys: ['深蹲', '背蹲'], name: '深蹲', role: '下肢整体 · 股四头、臀、髋伸链',
      points: ['脚掌三点踩实，膝盖方向跟脚尖一致，不内扣。', '蹲到蹲得住背中立的深度即可，活动度不够不必硬压。', '起身先顶髋再伸膝，腰不塌不弓。']},
    {keys: ['罗马尼亚硬拉', '直腿硬拉', 'RDL'], name: '罗马尼亚硬拉', role: '腘绳与臀',
      points: ['膝盖微屈并固定，靠髋往后移下放。', '杠贴腿走，感到腘绳被拉长就返回。', '背保持中立，别用腰往下压。']},
    {keys: ['硬拉'], name: '硬拉', role: '后链 · 臀、腘绳、竖脊',
      points: ['杠贴小腿，肩在杠正上方，背保持中立。', '先蹬地再顶髋，杠贴身走直线。', '顶端站直即可，不后仰、不耸肩。']},
    {keys: ['腿举', '倒蹬'], name: '腿举', role: '股四头与臀',
      points: ['脚掌全踩踏板，腰臀贴住靠垫。', '下放到膝约 90°，别让腰离开靠垫。', '顶端不锁死膝盖。']},
    {keys: ['提踵'], name: '提踵', role: '小腿',
      points: ['全幅度：脚跟降到最低，再顶到最高。', '顶端停 1 秒，回落要慢。', '别用弹震借力。']},
    {keys: ['上斜哑铃卧推', '上斜卧推', '上斜杠铃卧推'], name: '上斜卧推', role: '上胸',
      points: ['凳面 30~45°，角度太高会变成肩推。', '肘约 45° 打开，下放到底再推。', '肩胛始终后收，别耸肩。']},
    {keys: ['哑铃卧推'], name: '哑铃卧推', role: '胸 · 两侧独立发力',
      points: ['两只哑铃同步，别一高一低。', '下放到胸侧，肘不外翻。', '推起时想象把哑铃往中间合。']},
    {keys: ['卧推', '平板卧推'], name: '卧推', role: '胸、三头、前束',
      points: ['肩胛后收下沉，脚踩实，臀不离凳。', '杠落到乳线附近，前臂接近垂直。', '手腕保持中立，别向后折。']},
    {keys: ['哑铃肩推', '肩上推举', '推举'], name: '哑铃肩推', role: '三角肌前中束',
      points: ['核心收紧，肋骨不外翻，别塌腰。', '从耳侧推到头顶上方，肘微屈。', '下放到上臂约与地面平行。']},
    {keys: ['侧平举'], name: '侧平举', role: '三角肌中束',
      points: ['重量小一点，肘略屈并固定角度。', '抬到肩高即可，别耸肩、别甩。', '下放比上举更值得控制。']},
    {keys: ['绳索下压', '三头下压'], name: '绳索下压', role: '三头',
      points: ['肘固定在身体两侧，只动前臂。', '底端稍停，感受三头收紧。', '别用体重往下压。']},
    // 模型偶尔把「双杠臂屈伸」写成「双臂杠屈伸」，别名一起收：同一动作不该因为一个字就查不到说明。
    {keys: ['双杠臂屈伸', '双臂杠屈伸', '双臂屈伸', '臂屈伸', '双杠'], name: '双杠臂屈伸', role: '下胸与三头',
      points: ['身体前倾偏胸，直立更偏三头。', '肩别耸，下放到肩略低于肘。', '有肩痛就缩小幅度或换动作。']},
    {keys: ['俯卧撑'], name: '俯卧撑', role: '胸、三头、核心',
      points: ['身体成一条线，臀不塌不翘。', '手略宽于肩，肘朝后约 45°。', '撑不起来先做跪姿或上斜版本。']},
    {keys: ['引体'], name: '引体向上', role: '背阔与二头',
      points: ['先沉肩再拉，别一上来就屈肘。', '胸往杠上找，腿别甩。', '拉不上去用弹力带或辅助器械。']},
    {keys: ['高位下拉', '下拉'], name: '高位下拉', role: '背阔',
      points: ['先做肩胛下沉，再拉向锁骨。', '躯干微后仰即可，不后倒。', '回放控制，别让重量把手臂拽直。']},
    {keys: ['杠铃划船'], name: '杠铃划船', role: '中背与背阔',
      points: ['髋屈背平，别弓腰。', '杠拉向肚脐，肘贴近身体。', '别用身体起伏甩重量。']},
    {keys: ['坐姿划船', '器械划船', '划船'], name: '坐姿划船', role: '中背',
      points: ['胸挺起来，肩胛先收再拉。', '肘贴着身体往后。', '别用腰前后晃。']},
    {keys: ['面拉'], name: '面拉', role: '后束、中下斜方、肩袖',
      points: ['绳拉到眉心高度，肘高于手。', '末端做一点外旋，掌心朝上。', '重量轻、次数多，别甩。']},
    {keys: ['弯举'], name: '哑铃弯举', role: '二头',
      points: ['肘固定在身体两侧，别往前送。', '下放慢，别靠甩起来。', '手腕保持中立。']},
    {keys: ['直臂下压'], name: '直臂下压', role: '背阔 · 孤立',
      points: ['手臂接近伸直，以肩为轴往下压。', '肩胛下沉，别耸肩。', '躯干别前后晃。']},
    {keys: ['平板支撑', '平板'], name: '平板支撑', role: '核心抗伸展',
      points: ['肘在肩正下方，身体一条线。', '臀不塌不翘，正常呼吸。', '撑不住就缩短时间，别塌腰硬撑。']},
    {keys: ['卷腹'], name: '卷腹', role: '腹直肌',
      points: ['下巴微收，肩胛离地就够。', '别用手拉头，也别用惯性甩。', '呼气时卷起，回落控制。']},
    {keys: ['农夫行走', '农夫'], name: '农夫行走', role: '握力、核心、斜方',
      points: ['肩下沉，身体直立，别歪。', '小步快走，别憋气。', '重量以能走稳为准。']},
    {keys: ['壶铃'], name: '壶铃摇摆', role: '髋铰链 · 爆发',
      points: ['发力来自顶髋，不是手臂往上抬。', '顶端臀收紧，背保持中立。', '摆到胸口高度即可。']},
    {keys: ['跑步', '慢跑'], name: '跑步', role: '心肺训练',
      points: ['落地在重心正下方，别跨大步。', '步频偏快、身体微前倾。', '加跑量先慢后快，别一上来冲。']},
    {keys: ['有氧', '快走', '骑车', '骑行', '椭圆机', '跳绳'], name: '有氧', role: '心肺训练',
      points: ['强度以能说短句但唱不了歌为准。', '从 15~20 分钟起步，每周加 5 分钟左右。', '膝踝不适时优先低冲击的快走或椭圆机。']},
    {keys: ['拉伸'], name: '拉伸', role: '放松与活动度',
      points: ['拉到有牵拉感即可，不要疼。', '每个位置停 20~30 秒，正常呼吸。', '训练后做，别在冷身时硬压。']},
    {keys: ['杠铃肩推', '站姿推举', '站姿杠铃推举'], name: '杠铃肩推', role: '三角肌前中束与三头',
      points: ['杠从锁骨前推到头顶，肘在手腕正下方。', '核心与臀收紧，别靠后仰把杠推起来。', '下放到下巴附近即可，不追求触胸。']},
    {keys: ['阿诺德推举'], name: '阿诺德推举', role: '三角肌前中束',
      points: ['从掌心朝自己开始，推到顶时转成掌心朝前。', '重量比常规肩推轻一档。', '腰别塌，肘别完全锁死。']},
    {keys: ['俯身飞鸟', '俯身哑铃飞鸟'], name: '俯身飞鸟', role: '三角肌后束与中背',
      points: ['髋屈背平，胸口接近与地面平行。', '肘微屈固定，用肩把手肘往两侧抬。', '重量轻、次数多，别甩。']},
    {keys: ['前平举'], name: '前平举', role: '三角肌前束',
      points: ['抬到肩高即可，别超过眼睛。', '躯干别后仰借力。', '掌心朝下或相对都行，一次只选一种。']},
    {keys: ['绳索夹胸', '龙门架夹胸'], name: '绳索夹胸', role: '胸（内侧收缩）',
      points: ['肘微屈固定，双手在胸前合拢。', '身体前倾一小步，重心稳住。', '末端停一下再回放，别让配重拉着走。']},
    // 器械卧推 / 坐姿推胸 / 器械推胸是同一个动作，与杠铃卧推分开收录（2026-11-18）：
    // 名字比「卧推」长，按最长关键词匹配不会被杠铃那份要点抢走；配重也按器械档位算。
    {keys: ['器械卧推', '坐姿推胸', '器械推胸', '坐姿推举机'], name: '器械卧推', role: '胸与三头 · 固定轨迹',
      points: ['座椅高度让握把与胸线齐平，肩胛贴住靠背。', '推到肘微屈即可，不要锁死；回落让胸有拉伸感。', '配重按器械档位加（常见 5 kg 一档），动作稳了再加。']},
    {keys: ['哑铃划船', '单臂哑铃划船'], name: '单臂哑铃划船', role: '背阔与中背',
      points: ['一手一膝撑凳，背保持平直。', '肘贴着身体往后拉向髋部。', '别用躯干旋转借力。']},
    {keys: ['T杠划船', 'T 杠划船'], name: 'T 杠划船', role: '中背与背阔',
      points: ['髋屈背平，胸口朝下。', '杠拉向肚脐下方，肘贴近身体。', '顶端挤一下肩胛，回落控制。']},
    {keys: ['直腿硬拉'], name: '直腿硬拉', role: '腘绳与臀',
      points: ['膝几乎伸直但不锁死，靠髋后移。', '杠贴腿走，感到腘绳拉长就返回。', '背保持中立，别用手臂去够地面。']},
    {keys: ['臀桥', '臀推'], name: '臀桥 / 臀推', role: '臀大肌',
      points: ['顶端髋伸到躯干与大腿成一条线，别过度顶腰。', '脚跟发力，臀先收紧再起。', '停 1 秒再落，别用腰代偿。']},
    {keys: ['腿弯举'], name: '腿弯举', role: '腘绳',
      points: ['膝盖对准转轴，垫子压住脚踝上方。', '只动小腿，别抬臀借力。', '回落慢，别让配重把腿拽直。']},
    {keys: ['腿屈伸'], name: '腿屈伸', role: '股四头',
      points: ['背贴靠背，膝盖对准转轴。', '伸到接近直即可，别猛踢。', '顶端停一下，回落控制。']},
    {keys: ['箭步蹲', '弓步蹲'], name: '箭步蹲', role: '下肢单腿',
      points: ['前脚踩稳，后膝垂直下落到接近地面。', '膝盖跟脚尖同向，别内扣。', '起身用前脚发力，别靠后脚蹬。']},
    {keys: ['侧弓步'], name: '侧弓步', role: '内收肌与股四头',
      points: ['向侧跨一大步，屈髋向后坐。', '支撑脚全掌踩地，膝盖跟脚尖同向。', '幅度以能保持背中立为准。']},
    {keys: ['台阶'], name: '台阶', role: '下肢单腿与臀',
      points: ['台阶高度以踩上去膝盖不超过 90° 为准。', '整只脚踩实，别只用前脚掌。', '起身靠踩台阶那条腿，不靠后脚蹬地。']},
    {keys: ['悬垂举腿'], name: '悬垂举腿', role: '下腹与髋屈肌',
      points: ['先沉肩再抬腿，别晃。', '骨盆后倾把腿卷起来，不是单纯抬腿。', '控制下落，别摆荡。']},
    {keys: ['俄罗斯转体'], name: '俄罗斯转体', role: '腹斜肌',
      points: ['转的是胸廓，不是手臂左右甩。', '背保持中立，别弓腰。', '有腰不适就改成双脚踩地。']},
    {keys: ['死虫'], name: '死虫', role: '核心抗伸展',
      points: ['腰始终贴地，肋骨收住。', '对侧手脚缓慢伸出，呼气。', '腰离地就缩小幅度。']},
    {keys: ['鸟狗', '鸟狗式'], name: '鸟狗', role: '核心稳定与背部',
      points: ['对侧手脚伸直，骨盆保持水平。', '别抬手抬腿过高导致塌腰。', '慢起慢落，配合呼吸。']},
    {keys: ['侧平板', '侧支撑'], name: '侧平板', role: '腹斜肌与髋外侧',
      points: ['肘在肩正下方，身体一条线。', '髋别下沉，也别向上顶。', '撑不住就改成屈膝版本。']},
    {keys: ['山羊挺身', '背屈伸'], name: '山羊挺身', role: '竖脊与臀',
      points: ['髋部支点在垫子边缘，别压在腰上。', '下到躯干接近垂直即可，别过度后仰。', '用臀和竖脊发力，不是甩起来。']},
    {keys: ['锤式弯举'], name: '锤式弯举', role: '二头与肱肌',
      points: ['掌心相对，肘固定在体侧。', '别用肩前后晃。', '下放慢，手腕保持中立。']},
    {keys: ['窄距卧推'], name: '窄距卧推', role: '三头与胸内侧',
      points: ['握距略窄于肩，肘贴近身体。', '杠落到下胸，前臂接近垂直。', '推起时别让肘外翻。']},
    {keys: ['上斜飞鸟', '哑铃飞鸟'], name: '上斜飞鸟', role: '上胸（拉伸位）',
      points: ['肘微屈固定，像抱树一样打开。', '下放到胸侧有牵拉感即可，别过深。', '重量轻，肩不适就换成夹胸。']},
    {keys: ['波比跳'], name: '波比跳', role: '全身心肺',
      points: ['撑地时肩在手腕上方，背别塌。', '落地屈膝缓冲，别直腿砸地。', '累了就改成走步版，别硬追次数。']},
    {keys: ['开合跳'], name: '开合跳', role: '心肺热身',
      points: ['落地轻，膝盖微屈缓冲。', '手臂到头顶即可，别耸肩。', '膝踝不适改做低冲击版本。']},
    {keys: ['跳绳'], name: '跳绳', role: '心肺与小腿',
      points: ['手腕摇绳，跳起 2~3 cm 即可。', '落地前脚掌，膝盖微屈。', '从 30 秒一组起步，别一上来猛跳。']},
    {keys: ['划船机'], name: '划船机', role: '心肺与全身后链',
      points: ['顺序是腿 → 髋 → 手，回来反过来。', '背保持中立，别弓腰拉。', '阻力和桨频先稳，再谈速度。']},
    {keys: ['椭圆机'], name: '椭圆机', role: '低冲击心肺',
      points: ['脚掌全踩踏板，别踮脚。', '手推拉与腿同步，躯干别晃。', '阻力以能说短句为准。']},
    {keys: ['动感单车', '单车', '骑行台'], name: '动感单车', role: '心肺与股四头',
      points: ['座椅高度让踩到底膝盖微屈。', '踏频 70~90 转/分，别只靠重阻力。', '腰别弓，肩放松。']},
    {keys: ['游泳'], name: '游泳', role: '全身低冲击心肺',
      points: ['先热身肩与踝，再下水。', '呼吸节奏比速度重要。', '抽筋或耳不适就停，不硬撑。']},
    {keys: ['史密斯机深蹲', '史密斯深蹲'], name: '史密斯机深蹲', role: '股四头与臀 · 固定轨迹',
      points: ['脚位比自由深蹲略前一点，膝盖仍在脚尖上方。', '起身沿轨道走，别把重量全压在膝上。', '活动度不够就先减小幅度。']},
    {keys: ['史密斯机卧推', '史密斯卧推'], name: '史密斯机卧推', role: '胸与三头',
      points: ['凳位调到杠落到乳线附近。', '肩胛后收下沉，别为了触胸而耸肩。', '轨迹固定，推起时肘别外翻。']},
    {keys: ['髋内收', '内收肌'], name: '髋内收', role: '大腿内收肌',
      points: ['坐稳贴住靠垫，双腿在挡板内合拢。', '幅度以不疼为准，别硬压。', '回落慢，别让配重把腿弹开。']},
    {keys: ['坐姿绳索划船', '坐姿划船机'], name: '坐姿绳索划船', role: '中背与背阔',
      points: ['胸挺直，膝微屈，脚踩稳。', '先收肩胛，再把手拉向腹部。', '回放慢，别让配重把背拉弯。']},
    {keys: ['反手引体', '反手引体向上', 'chin-up'], name: '反手引体向上', role: '背阔与二头',
      points: ['反握与肩同宽，先沉肩再拉。', '胸往杠上找，腿别甩。', '下放控制，拉不上去用辅助带。']},
    {keys: ['坐姿提踵'], name: '坐姿提踵', role: '小腿（比目鱼肌）',
      points: ['膝上压住垫子，脚跟降到最低再顶起。', '顶端停 1 秒，回落要慢。', '别用弹震借力。']},
    {keys: ['早安式', '早安式体前屈'], name: '早安式', role: '腘绳与竖脊',
      points: ['杠放斜方，膝微屈固定。', '髋往后移，背保持中立。', '下到躯干接近水平即可，别弓腰。']},
    {keys: ['集中弯举'], name: '集中弯举', role: '二头（单侧）',
      points: ['肘抵住大腿内侧固定。', '只动前臂，别抬肩。', '下放慢，顶端略停。']},
    {keys: ['斜托弯举', '牧师凳弯举', 'preacher'], name: '斜托弯举', role: '二头',
      points: ['腋下贴住斜托，肩别前移。', '下放到手臂接近伸直但不锁死。', '别用肩把重量抬起来。']},
    {keys: ['仰卧臂屈伸', '碎颅者', 'skullcrusher'], name: '仰卧臂屈伸', role: '三头',
      points: ['肘指向天花板，只动前臂。', '杠落到额头上方即可，别砸头。', '肘别向外张。']},
    {keys: ['反向飞鸟'], name: '反向飞鸟', role: '三角肌后束',
      points: ['俯身或坐姿前倾，肘微屈固定。', '用肩把手肘往两侧抬，不是用手甩。', '重量轻、次数多。']},
    {keys: ['耸肩'], name: '耸肩', role: '斜方肌上部',
      points: ['只做上下，不要绕圈。', '顶端停一下再放。', '别用屈膝或甩身体借力。']},
    {keys: ['腕弯举'], name: '腕弯举', role: '前臂屈肌',
      points: ['前臂贴凳或大腿，只动手腕。', '全幅度慢速，顶端停一下。', '重量小一点，手腕别酸到发麻。']},
    {keys: ['仰卧举腿'], name: '仰卧举腿', role: '下腹与髋屈肌',
      points: ['腰始终贴地，腿伸到接近地面再收回。', '别用惯性摆腿。', '腰一离地就缩小幅度。']},
    {keys: ['空中自行车', '自行车卷腹'], name: '空中自行车', role: '腹直肌与腹斜肌',
      points: ['对侧肘膝相触，转的是胸廓。', '腰贴地，别把脖子拉起来。', '慢比快更有效。']},
    {keys: ['反向卷腹'], name: '反向卷腹', role: '下腹',
      points: ['骨盆后倾，把膝盖卷向胸口。', '别用腿甩起来。', '回落控制，腰别离地太多。']},
    {keys: ['绳索卷腹', '跪姿绳索卷腹'], name: '绳索卷腹', role: '腹直肌',
      points: ['跪姿，绳在头侧。', '用腹肌把胸廓卷向骨盆。', '髋别前后晃。']},
    {keys: ['登山跑', '登山者'], name: '登山跑', role: '核心与心肺',
      points: ['手在肩正下方，背保持平。', '膝盖交替向胸口收。', '臀别抬高，别塌腰。']},
    {keys: ['跳箱'], name: '跳箱', role: '下肢爆发',
      points: ['箱高以落地能稳住为准。', '轻落地、屈膝缓冲。', '跳不上去就走上去，别硬冲。']},
    {keys: ['药球砸地', '药球'], name: '药球砸地', role: '核心爆发',
      points: ['举过头顶，用核心往下砸。', '砸完接住或让球弹一次。', '别弓腰去够地面。']},
    {keys: ['器械夹胸', '蝴蝶机', '夹胸机'], name: '器械夹胸', role: '胸（内侧收缩）',
      points: ['背贴靠垫，肘微屈。', '双手在胸前合拢，停一下。', '回放别过深，肩别前移。']},
    {keys: ['绳索弯举'], name: '绳索弯举', role: '二头',
      points: ['肘固定在体侧，别往前送。', '底端不放松，顶端挤一下。', '别后仰借力。']},
    {keys: ['直臂下拉'], name: '直臂下拉', role: '背阔（孤立）',
      points: ['手臂接近伸直，以肩为轴往下压。', '肩胛下沉，别耸肩。', '躯干别前后晃。']},
    {keys: ['相扑硬拉', '相扑式硬拉'], name: '相扑硬拉', role: '臀与大腿内侧',
      points: ['站距宽、脚尖外展，膝对着脚尖。', '杠贴腿，先蹬地再顶髋。', '背保持中立，别弓。']},
    {keys: ['泽奇深蹲'], name: '泽奇深蹲', role: '股四头与核心',
      points: ['杠抱在肘弯里，贴紧躯干。', '肘抬高防滑，核心绷紧。', '躯干更直立，别前倾。']},
    {keys: ['单腿臀桥'], name: '单腿臀桥', role: '臀大肌（单侧）',
      points: ['一腿伸直抬起，另一脚踩地。', '顶端臀收紧，髋伸到一条线。', '别用顶腰代替伸髋。']},
    {keys: ['反向划船', 'inverted row'], name: '反向划船', role: '中背与背阔',
      points: ['杠在腰高，身体保持一条线。', '先收肩胛，再拉胸向杠。', '脚越往前越难，量力调整。']},
    {keys: ['杠铃臀推'], name: '杠铃臀推', role: '臀大肌',
      points: ['上背靠凳，杠压在髋部（垫个护垫）。', '顶端臀收紧停 1 秒。', '下巴微收，别用顶腰代替伸髋。']},
    {keys: ['器械推肩', '坐姿推肩'], name: '器械推肩', role: '三角肌与三头',
      points: ['座椅让握把与肩同高。', '肩胛下沉，背贴靠垫。', '推到肘微屈即可，别锁死。']},
    {keys: ['绳索拉臀', 'pull through'], name: '绳索拉臀', role: '臀与腘绳',
      points: ['背对绳索，绳从胯下穿过。', '先髋后移，再顶髋站直。', '别用手臂拉，也别弓腰。']}
  ];
```

#### EXERCISE_HOW 怎么做 — 65-exercise-guide.fragment.js:195–290（96 行）

```js
  /** 新手向的一句话「怎么做」：只描述动作过程，不讲训练安排。 */
  const EXERCISE_HOW = {
    '颈前深蹲': '杠放锁骨前、肘抬高，直上直下蹲起。',
    '高脚杯深蹲': '抱哑铃贴胸，屈髋下蹲再站起。',
    '保加利亚分腿蹲': '后脚搭凳，前腿屈膝下蹲再站起。',
    '深蹲': '双脚与肩同宽，屈髋下蹲再站起。',
    '罗马尼亚硬拉': '膝微屈，髋后移把杠下放再顶髋。',
    '硬拉': '杠贴小腿，蹬地顶髋把杠拉起。',
    '腿举': '坐靠垫，双脚蹬板伸腿再屈膝。',
    '提踵': '前脚掌踩高，脚跟抬起再落下。',
    '上斜卧推': '凳调 30~45°，把杠从胸上方推起。',
    '哑铃卧推': '仰卧，两只哑铃从胸侧推起。',
    '卧推': '仰卧，杠从乳线推到手臂伸直。',
    '哑铃肩推': '坐姿，哑铃从耳侧推到头顶。',
    '侧平举': '双臂微屈，从体侧抬到肩高。',
    '绳索下压': '站绳索前，肘固定，把绳往下压到伸直。',
    '双杠臂屈伸': '撑双杠，屈肘下放再撑起。',
    '俯卧撑': '手撑地，身体一条线，屈肘下放再撑起。',
    '引体向上': '握杠悬垂，把身体拉到下巴过杠。',
    '高位下拉': '坐姿，把横杆拉到锁骨前。',
    '杠铃划船': '俯身握杠，把杠拉向肚脐。',
    '坐姿划船': '坐姿拉把手到腹部，先收肩胛。',
    '面拉': '把绳拉向眉心，肘高于手。',
    '哑铃弯举': '站姿，屈肘把哑铃举到肩前。',
    '直臂下压': '手臂近直，以肩为轴把杆压向大腿。',
    '平板支撑': '肘撑地，身体一条线保持不动。',
    '卷腹': '仰卧屈膝，肩胛离地卷起上背。',
    '农夫行走': '两手提重物，小步走稳。',
    '壶铃摇摆': '屈髋后摆，再顶髋把壶铃甩到胸前。',
    '跑步': '保持步频，落地在重心下方。',
    '有氧': '快走、骑车或椭圆机，持续 15~30 分钟。',
    '拉伸': '把肌肉拉到有牵拉感，停 20~30 秒。',
    '杠铃肩推': '站姿把杠从锁骨推到头顶。',
    '阿诺德推举': '掌心朝内起推，推到顶转成掌心朝前。',
    '俯身飞鸟': '俯身，双臂向两侧打开再合。',
    '前平举': '手臂伸直，把哑铃抬到肩高。',
    '绳索夹胸': '站龙门架中间，双臂向前合拢。',
    '坐姿推胸': '坐器械前，把把手推到手臂近直。',
    '器械卧推': '坐器械前，把把手推到手臂近直。',
    '单臂哑铃划船': '一手撑凳，另一手把哑铃拉向髋。',
    'T 杠划船': '俯身握 T 杠，拉向胸腹。',
    '直腿硬拉': '膝近直，髋后移把杠下放。',
    '臀桥 / 臀推': '上背靠地或凳，顶髋把臀收紧。',
    '腿弯举': '俯卧或坐姿，屈膝把垫子勾起。',
    '腿屈伸': '坐器械，伸膝把小腿抬起。',
    '箭步蹲': '向前跨一步，双膝弯曲下蹲再起。',
    '侧弓步': '向侧跨大步，屈髋下蹲再回。',
    '台阶': '单脚踩上台阶，蹬起再退下。',
    '悬垂举腿': '悬垂，屈髋把腿抬向胸口。',
    '俄罗斯转体': '坐姿后仰，胸廓左右转。',
    '死虫': '仰卧，对侧手脚缓慢伸直再收回。',
    '鸟狗': '四点支撑，对侧手脚伸直保持。',
    '侧平板': '侧撑，髋抬起让身体成一条线。',
    '山羊挺身': '俯卧器械，屈髋下放再挺身。',
    '锤式弯举': '掌心相对，屈肘举起哑铃。',
    '窄距卧推': '窄握杠，屈肘下放到下胸再推起。',
    '上斜飞鸟': '上斜凳，双臂打开再合拢。',
    '波比跳': '下蹲撑地跳成平板，再收腿跳起。',
    '开合跳': '跳起分腿同时双手上举，再并回。',
    '跳绳': '手腕摇绳，前脚掌轻跳。',
    '划船机': '腿蹬、髋伸、手拉，回程反过来。',
    '椭圆机': '双脚踩踏板，手脚同步前后摆。',
    '动感单车': '坐稳蹬踏，保持 70~90 转/分。',
    '游泳': '在水中用自由泳或蛙泳连续游。',
    '史密斯机深蹲': '杠在轨道上，屈髋下蹲再站起。',
    '史密斯机卧推': '仰卧，把杠沿轨道推到顶。',
    '器械卧推': '坐稳，双手推把手到手臂伸直再回落。',
    '髋内收': '坐器械，双腿从外向内合拢。',
    '坐姿绳索划船': '坐姿把绳索把手拉向腹部。',
    '反手引体向上': '反握杠，把身体拉到下巴过杠。',
    '坐姿提踵': '坐姿膝上压垫，脚跟抬起再落下。',
    '早安式': '杠放斜方，屈髋前倾再起身。',
    '集中弯举': '肘抵大腿，单手屈肘举起。',
    '斜托弯举': '腋下贴斜托，屈肘举起再放下。',
    '仰卧臂屈伸': '仰卧，屈肘把杠下放到额头再伸直。',
    '反向飞鸟': '俯身，双臂向两侧打开。',
    '耸肩': '站直，把肩膀耸到耳旁再落下。',
    '腕弯举': '前臂固定，只动手腕卷起重量。',
    '仰卧举腿': '仰卧，双腿伸直抬到垂直再慢落。',
    '空中自行车': '仰卧，对侧肘膝相碰，交替蹬腿。',
    '反向卷腹': '仰卧，屈膝把骨盆卷向胸口。',
    '绳索卷腹': '跪姿握绳，卷腹把肘拉向膝。',
    '登山跑': '平板撑，双膝交替向胸口收。',
    '跳箱': '屈膝摆臂跳上箱，再轻落。',
    '药球砸地': '举球过顶，用力向地面砸。',
    '器械夹胸': '坐蝴蝶机，双臂向中间合拢。',
    '绳索弯举': '站绳索前，屈肘把绳拉起。',
    '直臂下拉': '站高位下拉前，手臂伸直往下压。',
    '相扑硬拉': '宽站距，蹬地顶髋拉起杠。',
    '泽奇深蹲': '杠抱肘弯，屈髋下蹲再站起。',
    '单腿臀桥': '单脚踩地，顶髋把臀抬起。',
    '反向划船': '握低杠，身体后仰把胸拉向杠。',
    '杠铃臀推': '上背靠凳，杠压髋部顶起。',
    '器械推肩': '坐器械，把把手从肩高推到头顶。',
    '绳索拉臀': '背对绳索，髋后移再顶髋。'
  };
```

#### `normalizeExerciseName` — 65-exercise-guide.fragment.js:291–294（4 行）

```js
  /** 去掉空白与括号补充，名字里常见的「（器械版）」不影响匹配。 */
  function normalizeExerciseName(value) {
    return String(value || '').replace(/\s+/g, '').replace(/[（(][^）)]*[）)]/g, '');
  }
```

#### `exerciseGuideFor` — 65-exercise-guide.fragment.js:295–314（20 行）

```js
  /** 精确优先、其次取最长关键词：这样「颈前深蹲」不会被「深蹲」抢走。 */
  function exerciseGuideFor(name) {
    const raw = String(name || '').trim();
    const text = normalizeExerciseName(raw);
    let best = null, bestLen = 0;
    if (text) {
      for (const guide of EXERCISE_GUIDES) {
        for (const key of guide.keys) {
          if (text.includes(key) && key.length > bestLen) { best = guide; bestLen = key.length; }
        }
      }
    }
    if (best) return best;
    return {
      name: raw || '这个动作',
      role: '本地还没有收录这个动作',
      points: ['先把动作名记准；下次记录沿用同一个名字，才能对上次的组次与负重。',
        '不确定器械或发力位置时，先问教练或看一遍示范，不要直接上大重量。']
    };
  }
```

#### `closeExerciseGuide` — 65-exercise-guide.fragment.js:315–318（4 行）

```js
  function closeExerciseGuide() {
    const root = $('#exercise-guide');
    if (root) root.hidden = true;
  }
```

#### `showExerciseGuide` — 65-exercise-guide.fragment.js:319–333（15 行）

```js
  function showExerciseGuide(name) {
    const root = $('#exercise-guide');
    if (!root) { notice('动作说明暂时打不开。', true); return; }
    const guide = exerciseGuideFor(name);
    $('#exercise-guide-title').textContent = guide.name;
    $('#exercise-guide-role').textContent = guide.role;
    // 新手先看「怎么做」，再看要点；没有收录时这行不出现，不留空白。
    const how = EXERCISE_HOW[guide.name] || '';
    const howNode = $('#exercise-guide-how');
    if (howNode) { howNode.hidden = !how; howNode.textContent = how ? '怎么做：' + how : ''; }
    $('#exercise-guide-points').innerHTML = guide.points.map(point => '<li>' + esc(point) + '</li>').join('');
    root.hidden = false;
    const ok = $('#exercise-guide-ok');
    if (ok) ok.focus();
  }
```

#### `installExerciseGuide` — 65-exercise-guide.fragment.js:334–344（11 行）

```js
  function installExerciseGuide() {
    const root = $('#exercise-guide');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';
    const ok = $('#exercise-guide-ok');
    if (ok) ok.addEventListener('click', closeExerciseGuide);
    root.addEventListener('click', event => { if (event.target === root) closeExerciseGuide(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !root.hidden) closeExerciseGuide();
    });
  }
```

### 3.8 **训练日志视图与写库**：动作行、组次、草稿、保存弹窗、课后总结、QH.training 契约

#### `seedMutedKey` — 68-training-log.fragment.js:24–29（6 行）

```js
  /**
   * 「今天不再按计划播种」的标记：以前只写在 DOM（form.dataset.seedMuted），刷新就丢，
   * 清空训练后重新打开又会把计划动作播回来。现在按日存一份「当时那份清单的动作名」，
   * 只有清单没变时才抑制播种——换了新清单（重排今天 / 采纳周计划）就照常播。
   */
  function seedMutedKey(date = activeDate) { return 'qingheng.seedMuted.' + date; }
```

#### `seedMutedFor` — 68-training-log.fragment.js:31–39（9 行）

```js
  function seedMutedFor(plan) {
    try {
      const raw = localStorage.getItem(seedMutedKey());
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const names = (Array.isArray(plan) ? plan : []).filter(item => item && item.name).map(item => String(item.name));
      return Array.isArray(saved) && saved.length === names.length && saved.every((name, index) => name === names[index]);
    } catch { return false; }
  }
```

#### `markSeedMuted` — 68-training-log.fragment.js:41–46（6 行）

```js
  function markSeedMuted(plan) {
    try {
      const names = (Array.isArray(plan) ? plan : []).filter(item => item && item.name).map(item => String(item.name));
      localStorage.setItem(seedMutedKey(), JSON.stringify(names));
    } catch {}
  }
```

#### `clearSeedMuted` — 68-training-log.fragment.js:47–50（4 行）

```js
  /** 撤销清空时把「今天不按计划走」也撤回，让计划动作重新播种。 */
  function clearSeedMuted(date = activeDate) {
    try { localStorage.removeItem(seedMutedKey(date)); } catch {}
  }
```

#### `setDraftState` — 68-training-log.fragment.js:52–56（5 行）

```js
  /** 卡面右上角的极轻状态：草稿暂存 / 已记录（2026-11-23）。 */
  function setDraftState(text) {
    const node = $('#training-draft-state');
    if (node) node.textContent = text || '';
  }
```

#### `hideTrainingUndo` — 68-training-log.fragment.js:60–66（7 行）

```js
  function hideTrainingUndo() {
    const node = $('#training-undo');
    if (node) node.hidden = true;
    if (undoClearTimer) { clearTimeout(undoClearTimer); undoClearTimer = 0; }
    undoClearRow = null;
    undoClearDate = '';
  }
```

#### `showTrainingUndo` — 68-training-log.fragment.js:67–76（10 行）

```js
  function showTrainingUndo(row) {
    const node = $('#training-undo');
    if (!node) return;
    undoClearRow = row || null;
    undoClearDate = activeDate;
    node.hidden = false;
    if (undoClearTimer) clearTimeout(undoClearTimer);
    // 4 秒后自动收起；期间不做别的事情的渲染不会打断它。
    undoClearTimer = setTimeout(hideTrainingUndo, 4000);
  }
```

#### `undoClearTraining` — 68-training-log.fragment.js:77–88（12 行）

```js
  async function undoClearTraining() {
    const row = undoClearRow;
    hideTrainingUndo();
    if (!row) { notice('没有可恢复的训练记录。'); return; }
    try {
      await api('/api/habits', {...row, date: activeDate});
      await loadState({quiet: true});
      clearSeedMuted();
      renderTrainingLog();
      notice('已恢复清空前的训练记录。');
    } catch (error) { notice(error.message, true); }
  }
```

#### `trainingSetDetails` — 68-training-log.fragment.js:90–102（13 行）

```js
  /** 一组一条：旧记录没有 setDetails 时，用 sets/次/负重复制出同样多组。 */
  function trainingSetDetails(item) {
    const bodyweight = isBodyweightMove(item && item.name);
    // 自重动作的 0 kg 只是「没配重」的另一种写法：显示成空，别让用户看到「0 kg」以为填漏了。
    const normWeight = value => {
      const weight = number(value);
      return bodyweight && weight !== null && weight <= 0 ? null : weight;
    };
    const details = Array.isArray(item && item.setDetails) ? item.setDetails : null;
    if (details && details.length) return details.slice(0, 30).map(set => ({reps: number(set.reps), weight: normWeight(set.weight), done: set.done === true}));
    const count = Math.max(1, Math.min(30, Math.round(number(item && item.sets) || 1)));
    return Array.from({length: count}, () => ({reps: number(item && item.reps), weight: normWeight(item && item.weight)}));
  }
```

#### `setRowHtml` — 68-training-log.fragment.js:104–117（14 行）

```js
  function setRowHtml(set, index) {
    const n = index + 1;
    const value = v => v === null || v === undefined ? '' : ` value="${Number(v)}"`;
    // 2026-11-11 晚：这里不再是一张表（表头 + 两个输入框），而是一行手账：
    // 「◯ 1  10 次 × 60 kg   ×」，数字本身就是主角，单位只跟一次，改数时只有一条下划线出现。
    return `<div class="set-row${set && set.done ? ' is-done' : ''}" data-set-row><button type="button" class="set-check" data-set-done aria-pressed="${set && set.done ? 'true' : 'false'}" aria-label="标记第 ${n} 组完成">✓</button>`
      + `<span class="set-no" aria-hidden="true">${n}</span>`
      + `<span class="set-values">`
      + `<label class="set-value"><input data-set="reps" type="number" inputmode="numeric" min="0" max="200" step="1" aria-label="第 ${n} 组次数" placeholder="—"${value(set.reps)}><small>次</small></label>`
      + `<span class="set-times" aria-hidden="true">×</span>`
      + `<label class="set-value is-kg"><input data-set="weight" type="number" inputmode="decimal" min="0" max="500" step="0.5" aria-label="第 ${n} 组负重公斤" placeholder="—"${value(set.weight)}><small>kg</small></label>`
      + `</span>`
      + `<button type="button" class="set-remove" data-set-remove aria-label="移除第 ${n} 组">×</button></div>`;
  }
```

#### `fmtPace` — 68-training-log.fragment.js:119–123（5 行）

```js
  /** 配速按「分钟 / 公里」算，显示成 6'00"。 */
  function fmtPace(minutesPerKm) {
    const total = Math.round(minutesPerKm * 60);
    return Math.floor(total / 60) + "'" + String(total % 60).padStart(2, '0') + '"';
  }
```

#### `cardioRowHtml` — 68-training-log.fragment.js:125–132（8 行）

```js
  function cardioRowHtml(item) {
    const value = v => v === null || v === undefined ? '' : ` value="${Number(v)}"`;
    return `<div class="cardio-row" data-cardio-row><span class="cardio-mark" aria-hidden="true">跑</span>`
      + `<span class="set-values"><label class="set-value"><input data-cardio="distance" type="number" inputmode="decimal" min="0" max="200" step="0.1" placeholder="—" aria-label="距离公里"${value(item.distanceKm)}><small>km</small></label>`
      + `<span class="set-times" aria-hidden="true">×</span>`
      + `<label class="set-value is-kg"><input data-cardio="minutes" type="number" inputmode="numeric" min="0" max="600" step="1" placeholder="—" aria-label="时长分钟"${value(item.durationMin)}><small>分钟</small></label></span>`
      + `<span class="cardio-pace" data-cardio-pace>配速 —</span></div>`;
  }
```

#### `refreshCardioPace` — 68-training-log.fragment.js:134–144（11 行）

```js
  /** 有氧行右侧的配速跟着两个输入走；容器可以是整行也可以是有氧行本身。 */
  function refreshCardioPace(container) {
    if (!container) return;
    const row = container.matches?.('[data-cardio-row]') ? container : $('[data-cardio-row]', container);
    if (!row) return;
    const out = $('[data-cardio-pace]', row);
    if (!out) return;
    const km = number($('[data-cardio="distance"]', row)?.value);
    const min = number($('[data-cardio="minutes"]', row)?.value);
    out.textContent = km && min ? '配速 ' + fmtPace(min / km) : '配速 —';
  }
```

#### `syncExerciseMode` — 68-training-log.fragment.js:146–162（17 行）

```js
  /** 动作名改成「跑步」时当场换成有氧表单，改回力量动作再换回来。 */
  function syncExerciseMode(row) {
    if (!row) return;
    const want = isCardioName($('[data-exercise="name"]', row)?.value) ? '1' : '0';
    if ((row.dataset.cardio || '0') === want) {refreshSetRow(row); return;}
    row.dataset.cardio = want;
    const list = $('[data-set-list]', row), foot = $('.set-foot', row);
    if (want === '1') {
      if (list) list.innerHTML = cardioRowHtml({name: $('[data-exercise="name"]', row)?.value});
      if (foot) foot.innerHTML = '<span class="row-meta">有氧记录</span>';
    } else {
      if (list) list.innerHTML = setRowHtml({reps: null, weight: null}, 0);
      if (foot) foot.innerHTML = '<button type="button" class="text-button" data-set-add>＋ 加一组</button><span class="row-meta">容量 <b data-set-volume>—</b></span>';
      refreshSetRow(row);
    }
    refreshCardioPace(row);
  }
```

#### `exerciseRowHtml` — 68-training-log.fragment.js:164–184（21 行）

```js
  function exerciseRowHtml(item, index) {
    const n = index + 1;
    const cardio = isCardioItem(item);
    const body = cardio ? cardioRowHtml(item) : trainingSetDetails(item).map(setRowHtml).join('');
    const foot = cardio
      ? '<span class="row-meta">有氧记录</span>'
      : '<button type="button" class="text-button" data-set-add>＋ 加一组</button><span class="row-meta">容量 <b data-set-volume>—</b></span>';
    // 行的身份要写回 DOM：planIndex 决定勾组后回写哪一条今日清单，fromPlan 决定取消勾选时能不能回收。
    // 缺了这两个属性，表单一旦重建（切日期 / 切页）就再也认不出这行，清单完成度永远停在原地。
    const planAttr = item.planIndex === null || item.planIndex === undefined ? '' : ` data-plan-index="${Number(item.planIndex)}"`;
    const fromAttr = item.fromPlan ? ' data-from-plan="1"' : '';
    return `<div class="training-row" data-exercise-row="${index}" data-exercise-id="${esc(item.id || '')}" data-cardio="${cardio ? 1 : 0}"${planAttr}${fromAttr}>`
      + `<div class="exercise-row-head"><span class="exercise-no" aria-hidden="true">${n}</span>`
      + `<div class="exercise-name-row${item.name ? ' is-locked' : ''}">${item.weightApprox ? '<span class="exercise-approx" title="重量是按体重推算的起步值，练完一次按实际校准">约</span>' : ''}<input data-exercise="name" value="${esc(item.name || '')}" maxlength="60" placeholder="动作名，例如卧推" aria-label="第 ${n} 个动作名称"${item.name ? ' readonly' : ''}><button type="button" class="exercise-name-open" data-exercise-open aria-haspopup="dialog" aria-label="查看动作说明：${esc(item.name || '')}">${esc(item.name || '')}</button><button type="button" class="exercise-name-edit" data-exercise-edit aria-label="修改动作名称">改</button><button type="button" class="exercise-bodyweight" data-exercise-bodyweight aria-pressed="${isBodyweightMove(item.name) ? 'true' : 'false'}" title="标为自重动作：不填负重也算完整">${isBodyweightMove(item.name) ? '自重 ✓' : '自重'}</button></div>`
      + `<button type="button" class="text-button exercise-remove" data-exercise-remove="${index}" aria-label="移除这个动作">移除</button></div>`
      + `<div class="set-list" data-set-list>${body}</div>`
      + `<div class="set-foot">${foot}</div>`
      // 练完的动作收成一行成就摘要（2026-11-23）：只在全部组勾完且不止一个动作时显示。
      + `<div class="exercise-done-line" data-done-line><span class="exercise-done-mark" aria-hidden="true">✓</span><span data-done-text></span>`
      + `<button type="button" class="text-button" data-done-expand aria-label="展开这个动作的组次">展开</button></div></div>`;
  }
```

#### `refreshSetRow` — 68-training-log.fragment.js:186–216（31 行）

```js
  /** 一组增删后重排序号、重算该动作容量；只改 UI，保存时才落库。 */
  function refreshSetRow(row) {
    const sets = $$('[data-set-row]', row);
    const bodyweight = isBodyweightMove($('[data-exercise="name"]', row)?.value);
    let repsTotal = 0;
    sets.forEach((set, index) => {
      const n = index + 1;
      const no = $('.set-no', set); if (no) no.textContent = String(n);
      const remove = $('[data-set-remove]', set);
      if (remove) { remove.disabled = sets.length <= 1; remove.setAttribute('aria-label', '移除第 ' + n + ' 组'); }
      const done = $('[data-set-done]', set);
      if (done) done.setAttribute('aria-label', '标记第 ' + n + ' 组完成');
      const reps = $('[data-set="reps"]', set);
      if (reps) reps.setAttribute('aria-label', '第 ' + n + ' 组次数');
      const weight = $('[data-set="weight"]', set);
      if (weight) {
        weight.setAttribute('aria-label', '第 ' + n + ' 组负重公斤');
        // 自重动作的负重格写「自重」：不是漏填，而是这个动作本来就没有配重（也可填负重引体用的片重）。
        weight.placeholder = bodyweight ? '自重' : '—';
        weight.closest('.set-value')?.classList.toggle('is-bodyweight', bodyweight);
      }
      repsTotal += number($('[data-set="reps"]', set)?.value) || 0;
    });
    const volume = sets.reduce((sum, set) => {
      const reps = number($('[data-set="reps"]', set)?.value), weight = number($('[data-set="weight"]', set)?.value);
      return reps !== null && weight !== null ? sum + reps * weight : sum;
    }, 0);
    const out = $('[data-set-volume]', row);
    if (out) out.textContent = volume > 0 ? fmt(volume, 0) + ' kg' : bodyweight && repsTotal > 0 ? fmt(repsTotal, 0) + ' 次' : '—';
    refreshCompletionState();
  }
```

#### `refreshCompletionState` — 68-training-log.fragment.js:218–242（25 行）

```js
  /**
   * 全部组勾完后把动作收成一行「✓ 名称 · N 组 · 容量 X kg」；点「展开」或改动任一组就展开。
   * 收起只是 CSS 收起——组次输入仍在 DOM 里，保存与草稿照常读得到。
   */
  function refreshCompletionState() {
    const box = $('#training-exercises');
    if (!box) return;
    const rows = $$('[data-exercise-row]', box);
    rows.forEach(row => {
      if (row.dataset.cardio === '1') { row.classList.remove('is-complete'); return; }
      const sets = $$('[data-set-row]', row);
      const name = String($('[data-exercise="name"]', row)?.value || '').trim();
      const allDone = sets.length > 0
        && sets.every(set => $('[data-set-done]', set)?.getAttribute('aria-pressed') === 'true');
      // 只有一个动作时不收：刚练完就消失会让人以为记录丢了。
      const collapse = allDone && rows.length >= 2 && !!name && row.dataset.expanded !== '1';
      const line = $('[data-done-line]', row);
      if (line) {
        const volume = $('[data-set-volume]', row)?.textContent || '—';
        const text = $('[data-done-text]', line);
        if (text) text.textContent = `${name} · ${sets.length} 组 · 容量 ${volume}`;
      }
      row.classList.toggle('is-complete', collapse);
    });
  }
```

#### `renumberExerciseRows` — 68-training-log.fragment.js:244–257（14 行）

```js
  /** 增删动作后统一重排序号：行前的数字、移除按钮与输入框的 aria-label 都跟着行序走。 */
  function renumberExerciseRows() {
    const box = $('#training-exercises');
    if (!box) return;
    $$('[data-exercise-row]', box).forEach((row, index) => {
      row.dataset.exerciseRow = String(index);
      const no = $('.exercise-no', row);
      if (no) no.textContent = String(index + 1);
      const remove = $('[data-exercise-remove]', row);
      if (remove) { remove.dataset.exerciseRemove = String(index); remove.setAttribute('aria-label', '移除第 ' + (index + 1) + ' 个动作'); }
      const name = $('[data-exercise="name"]', row);
      if (name) name.setAttribute('aria-label', '第 ' + (index + 1) + ' 个动作名称');
    });
  }
```

#### `appendExerciseRow` — 68-training-log.fragment.js:259–280（22 行）

```js
  /** Adds one exercise row, optionally pre-filled; shared by the 添加动作 button and the preset chips. */
  function appendExerciseRow(name, values) {
    const box = $('#training-exercises');
    if (!box) return null;
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}
    // exerciseRowHtml 自己就带 .training-row 外壳：这里只做临时容器，取出那一行再加进列表。
    // （1.3.44 起这里多包了一层 .training-row，导致每加一个动作多出一行空白、编号跳号。）
    const holder = document.createElement('div');
    holder.innerHTML = exerciseRowHtml({
      name: name || '',
      id: '',
      sets: values && values.sets,
      reps: values && values.reps,
      weight: values && values.weight
    }, index);
    const row = holder.firstElementChild;
    if (!row) return null;
    box.append(row);
    renumberExerciseRows();
    return row;
  }
```

#### `renderTrainingPresets` — 68-training-log.fragment.js:282–289（8 行）

```js
  /** Chips for the selected template. 小号胶囊：它们是「快捷方式」，不该和主行动一样重。 */
  function renderTrainingPresets() {
    const box = $('#training-presets'), form = $('#training-form');
    if (!box || !form) return;
    const template = TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push';
    box.innerHTML = (EXERCISE_PRESETS[template] || []).map(name => `<button type="button" class="preset-chip" data-training-preset="${esc(name)}">${esc(name)}</button>`).join('');
    box.dataset.template = template;
  }
```

#### `seedExercisesFromPlan` — 68-training-log.fragment.js:291–315（25 行）

```js
  /**
   * 计划 → 执行区预填（2026-11-22 四模块清单之二）：只产数据、不写库，
   * 用户核对后点「保存训练」才落。优先用今天 AI 排的未完成动作，其次用本周计划当天的动作。
   */
  function seedExercisesFromPlan(date) {
    if (typeof trainingEnabled === 'function' && !trainingEnabled()) return [];
    let plan = [];
    if (typeof aiPlanStore === 'function') {
      try { plan = aiPlanStore(date) || []; } catch { plan = []; }
    }
    const pending = plan.map((item, index) => ({item, index}))
      .filter(row => row.item && row.item.name && row.item.done !== true);
    if (pending.length) {
      // planIndex 指向 aiPlanStore 里的原始下标：清单里已有做完的动作时，播种行的序号不等于清单下标。
      return pending.map(({item, index}) => ({name: item.name, planIndex: index, sets: item.sets || 1, reps: item.reps || null, weight: item.weight ?? null,
        ...(item.weightApprox ? {weightApprox: true} : {})}));
    }
    const week = typeof cachedWeekPlan === 'function' ? cachedWeekPlan() : null;
    const day = week && Array.isArray(week.days) ? week.days.find(row => row && row.date === date) : null;
    if (day && Array.isArray(day.exercises) && day.exercises.length) {
      return day.exercises.map(item => ({name: item.name, sets: item.sets || 1, reps: item.reps || null, weight: item.weight ?? null,
        ...(item.weightApprox ? {weightApprox: true} : {})}));
    }
    return [];
  }
```

#### `draftRowsFromForm` — 68-training-log.fragment.js:317–342（26 行）

```js
  function draftRowsFromForm() {
    const box = $('#training-exercises');
    if (!box) return null;
    const rows = [...box.querySelectorAll('[data-exercise-row]')].map(row => {
      const name = ($('[data-exercise="name"]', row)?.value || '').trim();
      if (!name) return null;
      // 草稿必须带住行的身份：id 用于对位、planIndex 用于回写今日清单、weightApprox 决定要不要显示「约」、
      // fromPlan 决定取消勾选时能不能回收。以前只存 name + setDetails，重渲染后这四样全丢。
      const meta = {
        id: row.dataset.exerciseId || '',
        ...(row.dataset.planIndex === undefined || row.dataset.planIndex === '' ? {} : {planIndex: Number(row.dataset.planIndex)}),
        ...(row.dataset.fromPlan === '1' ? {fromPlan: true} : {}),
        ...($('.exercise-approx', row) ? {weightApprox: true} : {})
      };
      if (row.dataset.cardio === '1') {
        return {...meta, name, distanceKm: number($('[data-cardio="distance"]', row)?.value), durationMin: number($('[data-cardio="minutes"]', row)?.value)};
      }
      const setDetails = [...row.querySelectorAll('[data-set-row]')].map(set => ({
        reps: number($('[data-set="reps"]', set)?.value),
        weight: number($('[data-set="weight"]', set)?.value),
        done: $('[data-set-done]', set)?.getAttribute('aria-pressed') === 'true'
      }));
      return {...meta, name, setDetails};
    }).filter(Boolean);
    return rows.length ? rows : null;
  }
```

#### `rememberTrainingDraft` — 68-training-log.fragment.js:344–349（6 行）

```js
  function rememberTrainingDraft() {
    const rows = draftRowsFromForm();
    if (rows) trainingDrafts.set(activeDate, rows);
    else trainingDrafts.delete(activeDate);
    setDraftState(rows ? '已暂存' : '');
  }
```

#### `forgetTrainingDraft` — 68-training-log.fragment.js:351–351（1 行）

```js
  function forgetTrainingDraft() { trainingDrafts.delete(activeDate); }
```

#### `renderTrainingLog` — 68-training-log.fragment.js:353–414（62 行）

```js
  function renderTrainingLog(rowsOverride = null) {
    const form = $('#training-form');
    if (!form) return;
    // 强度反馈只在结束训练弹窗里问一次（2026-11-23 删掉卡片底部那一行），这里不再刷新行内档位。
    const row = habitRowFor(activeDate);
    const exercises = exercisesFor(activeDate);
    const box = $('#training-exercises');
    // 2026-11-22：今天还没记动作时，把计划播成可打卡的行（每组带 ○）。清空或保存后不再自动播。
    // 2026-11-23 Phase 2：抑制标记按「清单快照」持久化，刷新后不会把清掉的动作又播回来。
    const planNow = typeof aiPlanStore === 'function' ? (aiPlanStore(activeDate) || []) : [];
    const muted = seedMutedFor(planNow);
    const seeds = exercises.length || muted ? [] : seedExercisesFromPlan(activeDate);
    const draft = trainingDrafts.get(activeDate);
    const rows = Array.isArray(rowsOverride) ? rowsOverride
      : (draft && draft.length ? draft : (exercises.length ? exercises : (seeds.length ? seeds : [{name: '', sets: 1, reps: null, weight: null}])));
    // 换一天就收起上一天残留的「撤销」条。
    if (undoClearRow && undoClearDate !== activeDate) hideTrainingUndo();
    // 模板跟着动作走（2026-11-23）：播种 / 照上次练 / 周计划带进来的动作决定顶部模板；
    // 用户在当天手选过模板就不再覆盖（form.dataset.templateTouched = 当天日期）。
    const touched = form.dataset.templateTouched === activeDate;
    const storedTemplate = TRAINING_TEMPLATES[row?.template] ? row.template : null;
    const autoTemplate = typeof dominantTemplateFor === 'function'
      ? dominantTemplateFor(rows.map(item => String(item && item.name || '').trim())) : null;
    const template = touched
      ? (TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push')
      : (storedTemplate || autoTemplate || 'push');
    if (!touched && document.activeElement !== form.elements.template) form.elements.template.value = template;
    box.innerHTML = rows.map(exerciseRowHtml).join('');
    // planIndex 由 exerciseRowHtml 直接写在行上（来自种子或草稿），不再按渲染序号补写：
    // 草稿里用户可能加过行、删过行，按序号补写会把勾组回写到错误的清单项。
    if (!box.dataset.draftWired) {
      box.dataset.draftWired = '1';
      const remember = () => rememberTrainingDraft();
      box.addEventListener('input', remember);
      box.addEventListener('change', remember);
      box.addEventListener('focusout', remember);
      // 勾组 / 加组 / 删组走 click，等 DOM 更新完再记一份。
      box.addEventListener('click', event => {
        if (event.target.closest('[data-set-done], [data-set-add], [data-exercise-remove]')) setTimeout(remember, 0);
      });
    }
    $$('[data-exercise-row]', box).forEach(refreshSetRow);
    $$('[data-exercise-row]', box).filter(node => node.dataset.cardio === '1').forEach(node => refreshCardioPace(node));
    renderTrainingPresets();
    const tag = $('#training-tag');
    // 训练状态只认动作（2026-11-18）；rest 是用户明确记下的「今天休息」，缺失才是「未记录」。
    const restMarked = !!row && (row.training === false || String(row.training) === 'false') && !exercises.length;
    if (tag) {
      // 播种行（只写 DOM、未落库）与已存记录要分开说：三行动作配「未记录」会让人以为播种失败。
      const seeded = !exercises.length && seeds.length > 0;
      tag.textContent = exercises.length ? `${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作`
        : seeded ? `已排入 · ${seeds.length} 个动作`
        : restMarked ? '休息日' : '未记录';
    }
    const restButton = $('#training-rest');
    if (restButton) {
      restButton.hidden = !trainingEnabled() || exercises.length > 0;
      restButton.textContent = restMarked ? '取消休息' : '记为休息';
    }
    // 换一天时，草稿状态跟着那天走（有草稿=已暂存）；保存后会再覆盖成「✓ 已记录」。
    setDraftState(trainingDrafts.get(activeDate) ? '已暂存' : '');
  }
```

#### `repeatLastTraining` — 68-training-log.fragment.js:416–427（12 行）

```js
  /** 照上一次训练预填表单（只改草稿，不落库）；主流健身 App 都靠这一下省掉重复输入。 */
  function repeatLastTraining() {
    const sessions = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!sessions.length) { notice('还没有可照抄的训练记录，先记一次。'); return; }
    const last = sessions[0];
    renderTrainingLog(last.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight, distanceKm: item.distanceKm, durationMin: item.durationMin})));
    if (typeof rememberTrainingDraft === 'function') rememberTrainingDraft();
    notice(`已照 ${last.date.slice(5)} 的训练填好；核对实际组次后点「保存训练」。`);
    $('#training-form')?.scrollIntoView({block: 'start', behavior: 'smooth'});
  }
```

#### `readTrainingExercises` — 68-training-log.fragment.js:429–460（32 行）

```js
  function readTrainingExercises() {
    const box = $('#training-exercises');
    // 2026-11-17：有氧动作终于有输入框了（距离 / 时长），不再靠「与上次记录对位继承」。
    return [...box.querySelectorAll('[data-exercise-row]')].map(row => {
      const name = $('[data-exercise="name"]', row).value.trim().slice(0, 60);
      // 没有 id 说明是新加的一行，给它一个，后续对位就靠它。
      const id = row.dataset.exerciseId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'ex-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
      // 表单按 DOM 重建时要把「这条是勾选计划加进来的」带过去，否则取消勾选就再也认不出它。
      const carried = (typeof exercisesFor === 'function' ? exercisesFor(activeDate) : [])
        .find(item => item && (item.id === id || String(item.name || '').trim() === name));
      // 行上的 data-from-plan 是草稿恢复后的唯一线索；能查回记录时以记录为准。
      const fromPlan = (row.dataset.fromPlan === '1' || (carried && carried.fromPlan === true)) ? {fromPlan: true} : {};
      if (row.dataset.cardio === '1') {
        return {...fromPlan, id, name, cardio: true, distanceKm: number($('[data-cardio="distance"]', row)?.value), durationMin: number($('[data-cardio="minutes"]', row)?.value), sets: 0, reps: null, weight: null, setDetails: []};
      }
      const setDetails = $$('[data-set-row]', row).map(set => ({
        reps: number($('[data-set="reps"]', set).value),
        weight: number($('[data-set="weight"]', set).value)
      }));
      // 外层汇总是「顶组」口径：sets = 组数、reps = 最重那组的次数、weight = 最重组的重量。
      // 容量与基线都看 setDetails，这三个数只给旧读取路径与显示用；以前是「第一组次数 × 最大重量」。
      const topSet = setDetails.reduce((best, set) => {
        if (!best) return set;
        const kg = set.weight === null ? -1 : set.weight;
        const bestKg = best.weight === null ? -1 : best.weight;
        const better = kg > bestKg || (kg === bestKg && (set.reps || 0) > (best.reps || 0));
        return better ? set : best;
      }, null);
      return {...fromPlan, id, name, setDetails, sets: setDetails.length,
        reps: topSet ? topSet.reps : null, weight: topSet ? topSet.weight : null};
    }).filter(item => item.name || item.distanceKm !== null || item.durationMin !== null || item.setDetails.some(set => set.reps !== null || set.weight !== null));
  }
```

#### `renderTrainingSummary` — 68-training-log.fragment.js:462–491（30 行）

```js
  /** 保存后的课后总结：容量、组数、和上次比、下次怎么做；不打断操作，放在表单下方。 */
  function renderTrainingSummary(items) {
    const box = $('#training-summary');
    if (!box) return;
    const stats = typeof trainingStatsOf === 'function' ? trainingStatsOf(items) : {volume: trainingVolumeOf(items), sets: 0, bodyweightReps: 0};
    const volume = stats.volume;
    const sets = stats.sets || (items || []).reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const previous = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const before = previous ? trainingVolumeOf(previous.exercises) : null;
    const delta = before === null ? null : volume - before;
    // 自重课没有 kg 容量：不拿「容量 0」去和上次比，改成比次数。
    const bodyweightOnly = volume === 0 && stats.bodyweightReps > 0;
    const next = bodyweightOnly
      ? '自重动作：下次同动作每组 +1 次，或最后一组加 1 组。'
      : delta === null ? '下次同动作先持平，把每组次数做满。'
      : delta >= 0 ? '下次同动作试 +2.5 kg，或最后一组 +1 次。'
      : '这次容量低于上次；下次先把动作做满，不急着加重。';
    const runs = (items || []).filter(item => item && item.cardio);
    const runKm = runs.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = runs.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    box.innerHTML = `<p class="plan-label">本次训练</p><div class="overview-grid"><div class="overview-stat"><small>容量</small><strong>${bodyweightOnly ? '—' : fmt(volume, 0)}<span>${bodyweightOnly ? ' 自重课' : ' kg'}</span></strong></div>`
      + `<div class="overview-stat"><small>组数</small><strong>${sets}<span> 组</span></strong></div>`
      + `<div class="overview-stat"><small>对比上次</small><strong>${bodyweightOnly ? '首次' : delta === null ? '首次' : (delta >= 0 ? '+' : '') + fmt(delta, 0)}<span>${bodyweightOnly ? '' : delta === null ? '' : ' kg'}</span></strong></div></div>`
      + (stats.bodyweightReps > 0 ? `<p class="fine-print">自重 ${fmt(stats.bodyweightReps, 0)} 次（按次数计，不折算成 kg）。</p>` : '')
      + (runs.length ? `<p class="fine-print">有氧：${runKm ? fmt(runKm, 1) + ' km' : ''}${runKm && runMin ? ' · ' : ''}${runMin ? fmt(runMin, 0) + ' 分钟' : ''}</p>` : '')
      + `<p class="fine-print">${next}</p>`;
    box.hidden = false;
  }
```

#### `sessionStartKey` — 68-training-log.fragment.js:493–497（5 行）

```js
  /**
   * 训练计时（2026-11-22）：第一次把某组标记完成时记下起点，「结束训练」时给出实际耗时的默认值。
   * 只存本机、按日覆盖；保存成功后清掉，第二天不会沿用昨天的起点。
   */
  function sessionStartKey(date = activeDate) { return 'qingheng.sessionStart.' + date; }
```

#### `sessionStartedAt` — 68-training-log.fragment.js:499–501（3 行）

```js
  function sessionStartedAt(date = activeDate) {
    try { const raw = Number(localStorage.getItem(sessionStartKey(date))); return Number.isFinite(raw) && raw > 0 ? raw : null; } catch { return null; }
  }
```

#### `markSessionStart` — 68-training-log.fragment.js:503–506（4 行）

```js
  function markSessionStart(date = activeDate) {
    if (sessionStartedAt(date)) return;
    try { localStorage.setItem(sessionStartKey(date), String(Date.now())); } catch {}
  }
```

#### `clearSessionStart` — 68-training-log.fragment.js:508–510（3 行）

```js
  function clearSessionStart(date = activeDate) {
    try { localStorage.removeItem(sessionStartKey(date)); } catch {}
  }
```

#### `sessionMinutesEstimate` — 68-training-log.fragment.js:512–517（6 行）

```js
  /** 默认耗时（分钟）：有起点按实际、夹在 5–300 之间；没有起点就留空，不编一个数。 */
  function sessionMinutesEstimate(date = activeDate) {
    const start = sessionStartedAt(date);
    if (!start) return '';
    return String(Math.min(300, Math.max(5, Math.round((Date.now() - start) / 60000))));
  }
```

#### `trainingSaveDialogHtml` — 68-training-log.fragment.js:519–562（44 行）

```js
  /** 「结束训练」弹窗内容：汇总 + 实际耗时 + 疲劳度 + 先补记录。只拼本地数字，不接后端字符串。 */
  function trainingSaveDialogHtml(exercises) {
    const setsCount = exercises.reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const stats = trainingStatsOf(exercises);
    const runKm = exercises.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = exercises.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    const parts = [fmt(exercises.length, 0) + ' 个动作'];
    if (setsCount) parts.push(setsCount + ' 组');
    if (stats.volume > 0) parts.push('容量 ' + fmt(stats.volume, 0) + ' kg');
    if (stats.bodyweightReps > 0) parts.push('自重 ' + fmt(stats.bodyweightReps, 0) + ' 次');
    if (runKm > 0 || runMin > 0) parts.push('有氧 ' + [runKm > 0 ? fmt(runKm, 1) + ' km' : '', runMin > 0 ? fmt(runMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · '));
    const current = typeof effortFor === 'function' ? effortFor(activeDate) : null;
    const levels = typeof EFFORT_LEVELS !== 'undefined' ? EFFORT_LEVELS : [];
    const chips = levels.map(level =>
      `<button type="button" class="effort-chip" data-effort="${level}" aria-pressed="${current === level}">${EFFORT_LABELS[level]}</button>`).join('');
    // 2026-11-22：逐动作明细 + 与上次同模板训练的总容量对比——存之前先看清这一次练了什么、比上次多还是少。
    const lines = exercises.map(item => {
      const sets = Array.isArray(item.setDetails) && item.setDetails.length
        ? item.setDetails.length : (number(item.sets) || 0);
      if (item.cardio) {
        const cardio = [number(item.distanceKm) > 0 ? fmt(item.distanceKm, 1) + ' km' : '', number(item.durationMin) > 0 ? fmt(item.durationMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ');
        return {name: item.name, detail: cardio || '有氧'};
      }
      const weights = (Array.isArray(item.setDetails) ? item.setDetails : []).map(set => number(set.weight)).filter(value => value !== null && value > 0);
      const kg = weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : number(item.weight);
      return {name: item.name, detail: sets + ' 组' + (kg !== null && kg > 0 ? ' · ' + fmt(kg, 1) + ' kg' : '')};
    });
    const template = String(document.querySelector('#training-template')?.value || habitRowFor(activeDate)?.template || 'push');
    const previous = (state.habits || [])
      .filter(row => row && row.date < activeDate && String(row.template) === template && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
    const previousVolume = previous ? trainingStatsOf(previous.exercises).volume : 0;
    const delta = previous && previousVolume > 0 && stats.volume > 0 ? stats.volume - previousVolume : null;
    const compare = delta === null ? ''
      : `<p class="dialog-compare">同模板上次（${esc(String(previous.date).slice(5).replace('-', '/'))}）容量 ${fmt(previousVolume, 0)} kg · 这次 ${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 0)} kg</p>`;
    return `<p class="dialog-summary">${esc(parts.join(' · '))}</p>`
      + `<ul class="dialog-items" aria-label="这次练了什么">${lines.map(line =>
        `<li><span>${esc(line.name)}</span><b>${esc(line.detail)}</b></li>`).join('')}</ul>`
      + compare
      + '<div class="dialog-field"><span>耗时</span><input type="number" inputmode="numeric" min="0" max="600" step="1" name="durationMin" value="' + sessionMinutesEstimate() + '" placeholder="—" aria-label="实际耗时（分钟）"><span>分钟</span></div>'
      + '<p class="dialog-field-label">今天练下来感觉如何？</p>'
      + `<div class="dialog-effort" role="group" aria-label="今天练下来感觉如何">${chips}</div>`
      + '<button type="button" class="text-button" data-dialog-fill>先补记录</button>';
  }
```

#### `wireTrainingSaveDialog` — 68-training-log.fragment.js:564–581（18 行）

```js
  /** 弹窗内的交互：疲劳度单选、先补记录（关弹窗并把焦点送回第一个没填完的组）。 */
  function wireTrainingSaveDialog() {
    const body = $('#app-dialog-body');
    if (!body) return;
    body.querySelectorAll('.effort-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        body.querySelectorAll('.effort-chip').forEach(other => other.setAttribute('aria-pressed', String(other === chip)));
      });
    });
    body.querySelector('[data-dialog-fill]')?.addEventListener('click', () => {
      closeDialog(false);
      const rows = $$('[data-set-row]');
      const empty = rows.find(row => number($('[data-set="reps"]', row)?.value) === null)
        || rows.find(row => number($('[data-set="weight"]', row)?.value) === null);
      const target = empty || $('[data-exercise="name"]') || $('#training-exercises');
      if (target && typeof target.focus === 'function') { target.scrollIntoView({block: 'center'}); target.focus({preventScroll: true}); }
    });
  }
```

#### `saveTrainingLog` — 68-training-log.fragment.js:583–664（82 行）

```js
  /** Saves the log onto the day's habit row, preserving every other field it already carries. */
  async function saveTrainingLog() {
    const form = $('#training-form'), message = $('.form-feedback', form), button = $('button[type=submit]', form);
    const exercises = readTrainingExercises();
    // 力量行要求每组「次数」；负重只有配重动作才必填——自重动作（引体、俯卧撑、平板支撑…）留空即可。
    const invalid = exercises.find(item => {
      if (!item.name) return true;
      if (item.cardio) return !(number(item.distanceKm) > 0 || number(item.durationMin) > 0);
      const bodyweight = isBodyweightMove(item.name);
      return !item.setDetails.length || item.setDetails.some(set => set.reps === null || (!bodyweight && set.weight === null));
    });
    if (invalid) {
      const row = $$('[data-exercise-row]', form).find(node => {
        const name = $('[data-exercise="name"]', node).value.trim();
        if (!name) return true;
        if (node.dataset.cardio === '1') {
          return !(number($('[data-cardio="distance"]', node)?.value) > 0 || number($('[data-cardio="minutes"]', node)?.value) > 0);
        }
        const sets = $$('[data-set-row]', node);
        const bodyweight = isBodyweightMove(name);
        return !sets.length || sets.some(set => number($('[data-set="reps"]', set).value) === null || (!bodyweight && number($('[data-set="weight"]', set).value) === null));
      });
      const cardio = row?.dataset.cardio === '1';
      const bodyweightRow = !cardio && row ? isBodyweightMove($('[data-exercise="name"]', row)?.value) : false;
      const missing = !row ? []
        : cardio
          ? $$('[data-cardio="distance"], [data-cardio="minutes"]', row).filter(field => !(number(field.value) > 0))
          : $$(bodyweightRow ? '[data-set="reps"]' : '[data-set="reps"], [data-set="weight"]', row).filter(field => number(field.value) === null);
      if (cardio) missing.forEach(field => markFieldInvalid(field, '至少填距离或时长。'));
      else missing.forEach(field => markFieldInvalid(field, '请补全这一组。'));
      feedback(message, cardio
        ? '有氧动作至少填距离或时长；不想记的动作请先移除。'
        : '每个动作至少一组、每组填次数；配重动作还要填负重，自重动作负重留空即可。', true);
      missing[0]?.focus();
      return;
    }
    if (!exercises.length) {feedback(message, '还没有动作可保存；可以先用「清空今天的训练」。', true); return;}
    // 2026-11-17：训练也加一步核对（身体保持直存）。先把这次会存进去的内容说清，再落库。
    const setsCount = exercises.reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const stats = trainingStatsOf(exercises);
    const volume = stats.volume;
    const runKm = exercises.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = exercises.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    const summary = exercises.length + ' 个动作'
      + (setsCount > 0 ? ' · ' + setsCount + ' 组' : '')
      + (volume > 0 ? ' · 容量 ' + fmt(volume, 0) + ' kg' : '')
      + (stats.bodyweightReps > 0 ? ' · 自重 ' + fmt(stats.bodyweightReps, 0) + ' 次' : '')
      + (runKm > 0 || runMin > 0 ? ' · 有氧 ' + [runKm > 0 ? fmt(runKm, 1) + ' km' : '', runMin > 0 ? fmt(runMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ') : '');
    // 2026-11-22：保存变成「结束训练」——汇总 + 实际耗时 + 疲劳度一次核对，补记录入口在弹窗里。
    const confirmPromise = askConfirm('确认后写入今天的训练记录。', {title: '结束训练', ok: '确认保存', bodyHtml: trainingSaveDialogHtml(exercises)});
    wireTrainingSaveDialog();
    if (!await confirmPromise) return;
    const dialogBody = $('#app-dialog-body');
    const durationMin = dialogBody ? number($('input[name="durationMin"]', dialogBody)?.value) : null;
    const chosenEffort = dialogBody ? $('.effort-chip[aria-pressed="true"]', dialogBody)?.dataset.effort || null : null;
    if (button.disabled) return;
    button.disabled = true;
    feedback(message, '正在保存训练…');
    try {
      const existing = habitRowFor(activeDate) || {};
      await api('/api/habits', {...existing, date: activeDate, training: true, template: form.elements.template.value, exercises,
        ...(number(durationMin) > 0 ? {durationMin: Math.round(number(durationMin))} : {})});
      // 疲劳度与日志同一次确认提交：先写日志再补 effort，失败时日志已经落地，不会丢。
      if (chosenEffort && typeof saveTrainingEffort === 'function' && effortFor(activeDate) !== chosenEffort) {
        try { await saveTrainingEffort(chosenEffort); } catch { notice('训练已保存，疲劳度没记上；下次保存时再选一次。', true); }
      }
      await loadState({quiet: true});
      clearSessionStart();
      // 真实负重写进本地重量记忆：下一次「用 AI 排今天」按它渐进（不用再靠 14 天窗口撞运气）。
      if (typeof rememberExerciseLogs === 'function') rememberExerciseLogs(exercises, activeDate);
      feedback(message, `已保存：${summary}。`);
      // 疲劳度只在结束训练弹窗里问一次（2026-11-23 删掉卡片底部那一行）：没选就不追问，不拿 toast 催。
      forgetTrainingDraft();
      renderTrainingLog();
      renderTrainingSummary(exercises);
      // 卡片右上角的微反馈：草稿变「已记录」，让人知道这次真的落库了。
      setDraftState('✓ 已记录');
      // 落库 + 界面刷新之后才广播：订阅方（今天页 / 趋势页 / AI 问答）读到的 state 已是新数据。
      QH.bus.emit(QH.EVENTS.TRAINING_SAVED, {date: activeDate});
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
  }
```

#### `renderVolumeTable` — 68-training-log.fragment.js:666–678（13 行）

```js
  function renderVolumeTable() {
    const box = $('#volume-table');
    if (!box) return;
    const rows = weeklyVolume();
    if (!rows.length) {
      box.innerHTML = '<p class="fine-print">还不足以比较：同一动作至少需要两周的训练记录（趋势页按周一为一周起点）。</p>';
      return;
    }
    box.innerHTML = '<table class="stats-table"><caption class="fine-print">容量 = 组数 × 次数 × 负重；只比较你自己记录过的同一动作。</caption>'
      + '<thead><tr><th scope="col">动作</th><th scope="col">' + esc(String(rows[0].prevWeek).slice(5)) + ' 周</th><th scope="col">' + esc(String(rows[0].lastWeek).slice(5)) + ' 周</th><th scope="col">变化</th></tr></thead><tbody>'
      + rows.map(row => `<tr><td>${esc(row.name)}</td><td class="num">${fmt(row.prevVolume, 0)} <small>kg</small></td><td class="num">${fmt(row.lastVolume, 0)} <small>kg</small></td><td><span class="stats-trend" style="color:${volumeColor(row.delta, row.prevVolume)}">${row.delta >= 0 ? '+' : ''}${fmt(row.delta, 0)} <small>kg</small></span></td></tr>`).join('')
      + '</tbody></table>';
  }
```

#### `weekTrainingStats` — 68-training-log.fragment.js:680–704（25 行）

```js
  /**
   * 训练周统计的唯一口径（概览卡复用）：容量按 kg 逐日取整后求和；有 setDetails 用逐组 reps×weight，
   * 没有 setDetails 的旧记录用 sets×reps×weight；有氧（只有距离/时长）不计容量。次数 = 当周有动作的天数。
   */
  function weekTrainingStats(weekStart) {
    const days = [];
    for (let offset = 0; offset < 7; offset++) {
      const date = shiftDay(weekStart, offset);
      const rows = exercisesFor(date);
      const raw = habitRowFor(date);
      const stats = trainingStatsOf(Array.isArray(raw?.exercises) ? raw.exercises : []);
      const volume = stats.volume;
      const km = rows.reduce((sum, item) => sum + (Number(item.distanceKm) || 0), 0);
      const min = rows.reduce((sum, item) => sum + (Number(item.durationMin) || 0), 0);
      days.push({date, count: rows.length, volume, bwReps: stats.bodyweightReps, km, min});
    }
    return {
      days,
      sessions: days.filter(day => day.count > 0).length,
      totalVolume: Math.round(days.reduce((sum, day) => sum + day.volume, 0)),
      totalBwReps: Math.round(days.reduce((sum, day) => sum + day.bwReps, 0)),
      totalKm: days.reduce((sum, day) => sum + day.km, 0),
      totalMin: days.reduce((sum, day) => sum + day.min, 0)
    };
  }
```

#### `renderTrainingOverview` — 68-training-log.fragment.js:706–808（103 行）

```js
  function renderTrainingOverview() {
    const grid = $('#training-overview-grid');
    if (!grid) return;
    const weekStart = shiftDay(activeDate, -((new Date(activeDate + 'T00:00:00').getDay() + 6) % 7));
    const {days, sessions, totalVolume, totalBwReps, totalKm, totalMin} = weekTrainingStats(weekStart);
    // 上周同口径的容量：说明文字给「比上周」一个真参照，而不是只列数字。
    const prevWeek = weekTrainingStats(shiftDay(weekStart, -7));
    const prevVolume = prevWeek.totalVolume, prevBwReps = prevWeek.totalBwReps;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const totals = totalsFor(meals), p = effectiveProfileForDate(activeDate);
    const kcal = number(totals.calories), protein = number(totals.protein);
    const target = number(p.intakeRange ? p.intakeRange.max : p.calorieTarget);
    const proteinMin = number(p.proteinMin);
    // 三个数不再同字号：容量是这张卡的主数字，次数是注脚，蛋白是跨域的副指标。
    // 节点只建一次，之后只改数字：这样 data-count 能把旧值缓到新值（首帧仍是直接落值）。
    if (!grid.dataset.wired) {
      grid.dataset.wired = '1';
      grid.innerHTML = '<div class="overview-stat is-lead"><small>本周容量</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>'
        + '<div class="overview-stat"><small>本周训练</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>'
        + '<div class="overview-stat is-cross"><small>今日蛋白</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>';
      if (typeof installCountRoll === 'function') installCountRoll(grid);
    }
    const setStat = (index, value, unit) => {
      const stat = grid.children[index];
      if (!stat) return;
      // 空值不摆一条 26px 的黑杠：交给 .is-empty 退成 muted 小字。
      stat.classList.toggle('is-empty', value === null);
      const number = stat.querySelector('b.ov-num'), label = stat.querySelector('[data-unit]');
      if (label) label.textContent = unit || '';
      if (number) number.textContent = value === null ? '—' : fmt(value, 0);
    };
    // 只有自重动作的一周没有 kg 容量：主数字换成「自重 N 次」，不留一个像没练的破折号。
    const leadLabel = grid.children[0]?.querySelector('small');
    if (leadLabel) leadLabel.textContent = totalVolume > 0 ? '本周容量' : totalBwReps > 0 ? '本周自重' : '本周容量';
    setStat(0, totalVolume > 0 ? totalVolume : totalBwReps > 0 ? totalBwReps : null,
      totalVolume > 0 ? ' kg' : totalBwReps > 0 ? ' 次' : '');
    setStat(1, sessions, ' 次');
    setStat(2, protein, protein === null
      ? (proteinMin ? '目标 ' + fmt(proteinMin, 0) + ' g' : '')
      : (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ''));
    // 一根柱子只能有一种单位：整周有 kg 容量就画容量，全是自重就画次数，不混着画。
    const barMetric = totalVolume > 0 ? 'volume' : totalBwReps > 0 ? 'bw' : 'volume';
    const barValue = day => barMetric === 'bw' ? day.bwReps : day.volume;
    const peak = Math.max(1, ...days.map(barValue));
    const bars = $('#training-overview-bars');
    // 只有这一周的训练数据真的变了才重播：切 tab、存一餐都重播一遍会显得吵。
    const motionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const barsSig = days.map(day => Math.round(barValue(day))).join(',') + '|' + sessions + '|' + barMetric;
    const animateBars = barsSig !== lastOverviewSig && !motionReduced;
    lastOverviewSig = barsSig;
    if (bars) {
      // 柱子只画「练了的天」，空天留一条基线；有数值的柱子头顶标数，图才读得出信息而不只是装饰。
      // 起手 0 高度、逐根 40ms 归位，让「这一周的形状」是长出来的，不是刷出来的。
      const pctOf = day => barValue(day) ? Math.max(8, Math.round(barValue(day) / peak * 100)) : 2;
      bars.innerHTML = days.map(day => '<div class="ov-bar' + (day.date === activeDate ? ' is-today' : '') + (day.count ? ' has-data' : '') + '">'
        + '<b class="ov-bar-value">' + (barValue(day) > 0 ? fmt(barValue(day), 0) : '') + '</b>'
        + '<span data-h="' + pctOf(day) + '" style="height:' + (animateBars ? 0 : pctOf(day)) + '%"></span>'
        + '<small>' + '日一二三四五六'[new Date(day.date + 'T00:00:00').getDay()] + '</small></div>').join('');
      if (animateBars) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          Array.prototype.forEach.call(bars.querySelectorAll('.ov-bar span'), (bar, index) => {
            bar.style.transitionDelay = (index * 40) + 'ms';
            bar.style.height = bar.dataset.h + '%';
          });
        }));
      }
    }
    // 说明分两行：第一行讲训练与对照，第二行讲饮食——不再把两件事挤成一句。
    const note = $('#training-overview-note');
    if (note) {
      const lines = [];
      if (sessions > 0) {
        let line = '本周 ' + sessions + ' 练';
        if (totalVolume > 0) line += ' · 容量 ' + fmt(totalVolume, 0) + ' kg';
        if (totalBwReps > 0) line += ' · 自重 ' + fmt(totalBwReps, 0) + ' 次';
        if (totalKm > 0 || totalMin > 0) {
          line += ' · 有氧 ' + [totalKm > 0 ? fmt(totalKm, 1) + ' km' : '', totalMin > 0 ? fmt(totalMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ');
        }
        if (prevVolume > 0 && totalVolume > 0) {
          const delta = totalVolume - prevVolume;
          const pct = Math.round(Math.abs(delta) / prevVolume * 100);
          line += '，比上周 ' + (delta >= 0 ? '+' : '−') + pct + '%';
        }
        lines.push(line);
      } else {
        const prevText = prevVolume > 0 ? '（上周 ' + fmt(prevVolume, 0) + ' kg）' : prevBwReps > 0 ? '（上周自重 ' + fmt(prevBwReps, 0) + ' 次）' : '';
        lines.push('本周还没训练' + prevText);
      }
      // 看的是哪一天就写哪一天：切到 11-21 还写「今天」读起来就是在说错日期。
      const noteDay = typeof dayLabel === "function" ? dayLabel(activeDate) : "今天";
      lines.push(kcal === null
        ? noteDay + '还没记饮食'
        : noteDay + '摄入 ' + fmt(kcal, 0) + (target ? ' / ' + fmt(target, 0) : '') + ' kcal · 蛋白 ' + fmt(protein || 0, 0) + (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ' g'));
      note.innerHTML = lines.map((line, index) => '<span class="overview-note-line' + (index ? ' is-muted' : '') + '">' + line + '</span>').join('');
      if (!note.dataset.wired) {
        note.dataset.wired = '1';
        note.addEventListener('click', event => {
          const go = event.target.closest?.('[data-panel-go]');
          if (go && typeof switchRecordPanel === 'function') switchRecordPanel(go.dataset.panelGo);
        });
      }
    }
  }
```

#### `installTrainingLog` — 68-training-log.fragment.js:810–1045（236 行）

```js
  /**
   * 训练日志的全部事件绑定（幂等）：从 70 收回来，和它服务的 DOM 放在一起。
   * 休息计时器仍留在 70，这里只是在勾组时调用它。
   */
  function installTrainingLog() {
    if (!document.body || document.body.dataset.trainingLogWired === "1") return;
    document.body.dataset.trainingLogWired = "1";
    // 记录页三种表单统一成「日期在最前、保存在最后」；训练日志原来没有日期输入，只能靠页面顶部的全局日期。
    $('#training-date')?.addEventListener('change', event => {
      const value = event.target.value;
      if (validDate(value)) setActiveDate(value);
      else event.target.value = activeDate;
    });
    // 2026-11-23：卡片底部的「练下来」一整行已删除，体感只留在结束训练弹窗里（保存时一次问清）。
    $('#training-add')?.addEventListener('click', () => {
      // 以前这里手写了一套「组数 / 每组次数 / 负重」旧字段，与逐组模型不兼容——
      // 点「添加动作」加出来的行没有 [data-set-row]，保存时会被判为「每组都要填次数与负重」。
      // 现在与预设 chip 走同一个构造函数，加出来的行立刻就有第 1 组。
      const row = appendExerciseRow('');
      if (!row) return;
      $('[data-exercise="name"]', row)?.focus();
    });
    $('#training-presets')?.addEventListener('click', event => {
      const chip = event.target.closest('[data-training-preset]');
      if (!chip) return;
      const name = chip.dataset.trainingPreset;
      const previous = latestExerciseValues(name);
      const row = appendExerciseRow(name, previous);
      if (!row) return;
      notice(previous
        ? `已添加 ${name}：沿用 ${previous.date} 的 ${previous.sets}×${previous.reps}×${previous.weight} kg，可修改。`
        : `已添加 ${name}，填好组次与负重后保存。`);
      $('[data-set="reps"]', row)?.focus();
    });
    $('#training-template')?.addEventListener('change', () => {
      // 手选过的模板当天不再被动作列表覆盖（按日期记，换一天重新自动匹配）。
      const form = $('#training-form');
      if (form) form.dataset.templateTouched = activeDate;
      renderTrainingPresets();
    });
    $('#training-repeat')?.addEventListener('click', () => repeatLastTraining());
    // 容量必须跟着输入走：以前只在增删组时重算，填完 10 次 × 60 kg 还挂着「—」，像没记上。
    // 有氧行跟着距离/时长算配速；动作名改成「跑步」时整行切到有氧表单（2026-11-17）。
    $('#training-exercises')?.addEventListener('input', event => {
      const field = event.target;
      if (field.matches?.('[data-exercise="name"]')) {
        if (typeof syncExerciseMode === 'function') syncExerciseMode(field.closest?.('[data-exercise-row]'));
        return;
      }
      if (field.matches?.('[data-cardio="distance"],[data-cardio="minutes"]')) {
        if (typeof refreshCardioPace === 'function') refreshCardioPace(field.closest?.('[data-cardio-row]'));
        return;
      }
      if (!field.matches?.('[data-set="reps"],[data-set="weight"]')) return;
      const row = field.closest?.('[data-exercise-row]');
      if (row) refreshSetRow(row);
    });
    // 名称改完失焦就锁回「可点看要点」的展示态；空名保持可编辑。
    // 2026-11-23 修：锁定会把「自重」按钮改成 display:none，而 focusout 早于 click——
    // 手指落在本行控件上时若在这里锁回去，按钮先消失、click 落到行容器上，表现成「点了没反应」。
    // 所以行内失焦一律让位，改由行外的 pointerdown 收口。
    const lockExerciseName = wrap => {
      const input = wrap ? $('[data-exercise="name"]', wrap) : null;
      if (!input) return;
      const name = String(input.value || '').trim();
      if (!name) return;
      wrap.classList.add('is-locked');
      input.readOnly = true;
      const open = $('[data-exercise-open]', wrap);
      if (open) { open.textContent = name; open.setAttribute('aria-label', '查看动作说明：' + name); }
    };
    $('#training-exercises')?.addEventListener('focusout', event => {
      const input = event.target.closest?.('[data-exercise="name"]');
      if (!input) return;
      const wrap = input.closest('.exercise-name-row');
      if (!wrap) return;
      // relatedTarget 指向本行按钮（桌面 Edge/Chrome）或为空（部分触屏）都不锁：交给下面的行外 pointerdown。
      const next = event.relatedTarget;
      if (!next || wrap.contains(next)) return;
      lockExerciseName(wrap);
    });
    // 只有按在行外才锁回展示态；行内（自重 / 改 / 名称输入）不锁，否则按钮会先被 display:none 掉、click 落空。
    document.addEventListener('pointerdown', event => {
      if (event.target.closest?.('.exercise-name-row')) return;
      $$('.exercise-name-row:not(.is-locked)').forEach(wrap => lockExerciseName(wrap));
    }, true);
    $('#training-exercises')?.addEventListener('click', event => {
      // 「练完自动收起」的行，点「展开」随时回到组次（修改后不会再自动收起，直到改动组次）。
      const expandDone = event.target.closest?.('[data-done-expand]');
      if (expandDone) {
        const row = expandDone.closest('[data-exercise-row]');
        if (row) {
          row.dataset.expanded = '1';
          row.classList.remove('is-complete');
        }
        return;
      }
      // 名称即入口（2026-11-22 第七轮）：点名字先看要点，点「改」才进编辑。
      const openName = event.target.closest?.('[data-exercise-open]');
      if (openName) {
        const row = openName.closest('[data-exercise-row]');
        const name = String($('[data-exercise="name"]', row)?.value || '').trim();
        if (name && typeof showExerciseGuide === 'function') showExerciseGuide(name);
        return;
      }
      const editName = event.target.closest?.('[data-exercise-edit]');
      if (editName) {
        const row = editName.closest('[data-exercise-row]');
        const wrap = $('.exercise-name-row', row), input = $('[data-exercise="name"]', row);
        wrap?.classList.remove('is-locked');
        if (input) { input.readOnly = false; input.focus(); if (input.select) input.select(); }
        return;
      }
      // 「自重」标记：点一下就把这个动作名记进用户的自重表，保存时不校验负重。
      const bw = event.target.closest?.('[data-exercise-bodyweight]');
      if (bw) {
        const row = bw.closest('[data-exercise-row]');
        const name = String($('[data-exercise="name"]', row)?.value || '').trim();
        if (!name) { notice('先填动作名称，再标自重。', true); return; }
        const on = bw.getAttribute('aria-pressed') !== 'true';
        if (typeof setUserBodyweight === 'function') setUserBodyweight(name, on);
        bw.setAttribute('aria-pressed', String(on));
        bw.textContent = on ? '自重 ✓' : '自重';
        // 该行的重量格随之变化：自重→占位「自重」，取消→占位「—」。
        if (typeof refreshSetRow === 'function') refreshSetRow(row);
        notice(on ? '已记为自重动作：' + name + '，以后同名动作都按自重处理。' : '已取消自重标记：' + name + '。');
        return;
      }
      const done = event.target.closest?.('[data-set-done]');
      if (!done) {
        // 2026-11-24：点整行也能勾——不再要求瞄准那个圆圈；落在输入框/按钮上时让位给它们自己的行为。
        const rowHit = event.target.closest?.('[data-set-row]');
        if (rowHit && !event.target.closest('input,select,textarea,button,a,label')) {
          const toggle = rowHit.querySelector('[data-set-done]');
          if (toggle) { toggle.click(); return; }
        }
      }
      if (done) {
        const set = done.closest('[data-set-row]');
        const on = set.classList.toggle('is-done');
        done.setAttribute('aria-pressed', String(on));
        syncPlanDoneFromRow(done.closest('[data-exercise-row]'));
        // 勾/取消都算「动过这一行」：之前手动展开的状态作废，全勾完可以再收成一行。
        const rowNode = done.closest('[data-exercise-row]');
        if (rowNode) delete rowNode.dataset.expanded;
        refreshCompletionState();
        if (on) {
          // 第一次勾组就是这一节的起点：结束训练时按它算「实际耗时」。
          if (typeof markSessionStart === 'function') markSessionStart();
          // 按这一行的动作决定休息多久（复合/孤立/自重不同）；有氧行不计时。
          const row = done.closest('[data-exercise-row]');
          const name = row ? String($('[data-exercise="name"]', row)?.value || '') : '';
          startRestTimer(true, restSecondsFor(name));
          // restLength 由 startRestTimer 按动作定下；0 秒（有氧）不挂线。
          if (restLength > 0) attachRestLine(row || set);
        } else {
          clearRestLine();
        }
        return;
      }
      const addSet = event.target.closest?.('[data-set-add]');
      if (addSet) {
        const row = addSet.closest('[data-exercise-row]');
        const list = $('[data-set-list]', row);
        const last = list ? list.lastElementChild : null;
        list?.insertAdjacentHTML('beforeend', setRowHtml({
          reps: last ? number($('[data-set="reps"]', last).value) : null,
          weight: last ? number($('[data-set="weight"]', last).value) : null
        }, list.children.length));
        refreshSetRow(row);
        // 展开态加组：把刚落下的那一组的「次数」聚焦起来，接着填。
        if (row) {
          delete row.dataset.expanded;
          row.classList.remove('is-complete');
          const added = list ? list.lastElementChild : null;
          added?.querySelector('[data-set="reps"]')?.focus({preventScroll: false});
        }
        return;
      }
      const removeSet = event.target.closest?.('[data-set-remove]');
      if (removeSet) {
        const row = removeSet.closest('[data-exercise-row]');
        if ($$('[data-set-row]', row).length <= 1) return;
        removeSet.closest('[data-set-row]')?.remove();
        refreshSetRow(row);
        if (row) delete row.dataset.expanded;
        return;
      }
      const button = event.target.closest?.('[data-exercise-remove]');
      if (!button) return;
      button.closest('[data-exercise-row]')?.remove();
      if (typeof renumberExerciseRows === 'function') renumberExerciseRows();
      refreshCompletionState();
    });
    $('#training-form')?.addEventListener('submit', event => {event.preventDefault(); saveTrainingLog().catch(error => notice(error.message, true));});
    $('#training-clear')?.addEventListener('click', async () => {
      if (!await askConfirm('清空今天的训练记录？习惯行的其他数据（步数、睡眠、饮水、用油）会保留。', {title: '清空训练', ok: '清空', danger: true})) return;
      // 清空前留一份当天整行快照：4 秒内点「撤销」原样写回（2026-11-23）。
      const snapshot = habitRowFor(activeDate);
      // 清空即「今天不按计划走了」：把当时那份清单记下来抑制自动播种，刷新后也不会播回来。
      if (typeof markSeedMuted === 'function') markSeedMuted(aiPlanStore(activeDate) || []);
      if (typeof forgetTrainingDraft === 'function') forgetTrainingDraft();
      setDraftState('');
      const existing = habitRowFor(activeDate);
      if (!existing) {renderTrainingLog(); return;}
      const next = {...existing};
      delete next.exercises;
      delete next.template;
      delete next.training;
      try {
        await api('/api/habits', next);
        await loadState({quiet: true});
        renderTrainingLog();
        // 底部轻提示 + 4 秒撤销；只有真的删掉了东西才给撤销入口。
        showTrainingUndo(snapshot);
      } catch (error) {notice(error.message, true);}
    });
    $('#training-undo-go')?.addEventListener('click', () => { undoClearTraining().catch(error => notice(error.message, true)); });
    $('#training-rest')?.addEventListener('click', async () => {
      const existing = habitRowFor(activeDate);
      const restMarked = !!existing && (existing.training === false || String(existing.training) === 'false') && !exercisesFor(activeDate).length;
      if (!restMarked && !await askConfirm('把今天记为休息日？已有的步数、睡眠和饮水会保留，之后仍可记录训练。', {title: '记为休息', ok: '记为休息'})) return;
      const next = {...(existing || {}), date: activeDate};
      if (restMarked) delete next.training; else next.training = false;
      try {
        await api('/api/habits', next);
        await loadState({quiet: true});
        renderTrainingLog();
        notice(restMarked ? '已取消休息标记。' : '已记为休息日。');
      } catch (error) {notice(error.message, true);}
    });
    $('#today-training-line')?.addEventListener('click', () => {
      switchTab('records', true);
      if (typeof switchRecordPanel === 'function') switchRecordPanel('training');
    });
  }
```

#### `bodyPartHints` — 68-training-log.fragment.js:1107–1133（27 行）

```js
  /** 「按部位查解剖要点」：每个部位取 2~3 条最相关的规则，带口述时间戳。 */
  function bodyPartHints() {
    const lib = window.TRAINING_PRINCIPLES;
    if (!lib || !Array.isArray(lib.rules)) return '';
    const parts = [
      {label: '关节活动度', tags: ['anatomy', 'warmup']},
      {label: '胸', tags: ['push']},
      {label: '肩', tags: ['shoulder']},
      {label: '背', tags: ['pull']},
      {label: '手臂', tags: ['isolation', 'arm']},
      {label: '腹肌 / 核心', tags: ['abs']},
      {label: '腿 / 臀', tags: ['legs']},
      {label: '减脂与恢复', tags: ['fatloss', 'recovery', 'sleep']}
    ];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index >= 0 ? index : 9; };
    const rows = parts.map(part => {
      const hits = lib.rules
        .filter(rule => (rule.tags || []).some(tag => part.tags.includes(tag)))
        .sort((a, b) => rank(a.source) - rank(b.source))
        .slice(0, 3);
      if (!hits.length) return '';
      const items = hits.map(rule => '<p>' + esc(rule.claim.split('；')[0]) + '</p>').join('');
      return '<p class="part-title">' + esc(part.label) + '</p>' + items;
    }).join('');
    return rows ? '<details class="body-parts"><summary>按部位查解剖要点</summary>' + rows + '</details>' : '';
  }
```

#### `addExercisesToToday` — 68-training-log.fragment.js:1135–1190（56 行）

```js
  /**
   * 把一批动作并入当天训练记录：同名跳过，只追加不覆盖。
   * 训练日志与 AI 计划是两份数据，这里是唯一把它们接起来的入口。
   */
  async function addExercisesToToday(items, options = {}) {
    const wanted = (items || []).filter(item => item && String(item.name || "").trim());
    if (!wanted.length) { notice("没有可加入的动作。"); return; }
    const existing = habitRowFor(activeDate) || {};
    const current = Array.isArray(existing.exercises) ? existing.exercises.map(item => ({...item})) : [];
    const names = new Set(current.map(item => String(item && item.name || "").trim()));
    const added = [];
    for (const item of wanted) {
      const name = String(item.name).trim().slice(0, 60);
      if (names.has(name)) continue;
      // 自重动作的 weight 0 归一成 null：模型常把「没有配重」写成 0，别让它变成一条 0 kg 记录。
      const rawWeight = number(item.weight);
      const weight = typeof isBodyweightMove === "function" && isBodyweightMove(name) && rawWeight !== null && rawWeight <= 0 ? null : rawWeight;
      const record = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : "ex-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        name,
        sets: number(item.sets) === null ? null : number(item.sets),
        reps: number(item.reps) === null ? null : number(item.reps),
        weight
      };
      // 有氧项没有组次重量，改记距离与时长，训练日志那边才有东西可显示。
      if (number(item.distanceKm) !== null) record.distanceKm = number(item.distanceKm);
      if (number(item.durationMin) !== null) record.durationMin = number(item.durationMin);
      // 勾选即记录写进来的行带标记：取消勾选时只回收「还没动过」的行。
      if (options.fromPlan === true) record.fromPlan = true;
      current.push(record);
      names.add(name);
      added.push(name);
    }
    if (!added.length) { notice("这些动作已经在今天的训练记录里了。"); return; }
    try {
      await api("/api/habits", {...existing, date: activeDate, exercises: current});
      await loadState({quiet: true});
      if (options.keepInPlan === true) {
        // 勾选路径：清单项要留着显示「已做完」，不能像批量导入那样从清单里消失。
        notice("已记入今天的训练：" + added.join("、") + "。");
        return;
      }
      // 已经进了训练记录的动作，从今日顺序里拿掉；没进记录的留着，避免清单凭空缩水。
      const addedSet = new Set(added);
      const planNow = aiPlanStore(activeDate) || [];
      const planRest = planNow.filter(row => !addedSet.has(String(row && row.name || "").trim()));
      if (planRest.length !== planNow.length) {
        aiPlanStore(activeDate, planRest);
        renderAiPlan();
        if (typeof renderAdviceOrder === "function") renderAdviceOrder();
      }
      notice("已加入今天的训练记录：" + added.join("、") + "。");
    } catch (error) {
      notice("加入训练记录失败：" + (error && error.message ? error.message : "未知错误"), true);
    }
  }
```

#### `removeExerciseFromToday` — 68-training-log.fragment.js:1192–1203（12 行）

```js
  /**
   * 勾选即记录（2026-11-22 第七轮）：清单勾一个就落一条训练记录，不再要求二次导入。
   * 只对今天生效、只在有组次时写库；取消勾选只回收「自己加进来且没动过」的行。
   */
  async function removeExerciseFromToday(target) {
    const existing = habitRowFor(activeDate) || {};
    const list = Array.isArray(existing.exercises) ? existing.exercises : [];
    const next = list.filter(row => !(row && target && row.id === target.id));
    if (next.length === list.length) return;
    await api("/api/habits", {...existing, date: activeDate, exercises: next});
    await loadState({quiet: true});
  }
```

#### `togglePlanDone` — 68-training-log.fragment.js:1205–1246（42 行）

```js
  async function togglePlanDone(index, checked) {
    const plan = aiPlanStore(activeDate) || [];
    const item = plan[index];
    if (!item || !String(item.name || "").trim()) return;
    const name = String(item.name).trim();
    const isToday = activeDate === localDate();
    const canRecord = isToday && (number(item.sets) !== null || number(item.reps) !== null);
    if (!canRecord) {
      // 历史日期或没填组次：只做勾选框标记，绝不写历史记录。
      item.done = checked === true;
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      return;
    }
    if (checked) {
      const existing = exercisesFor(activeDate).find(row => String(row && row.name || "").trim() === name);
      if (!existing) await addExercisesToToday([item], {fromPlan: true, keepInPlan: true});
      item.done = true;
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      if (typeof renderTrainingLog === "function") renderTrainingLog();
      return;
    }
    item.done = false;
    aiPlanStore(activeDate, plan);
    const current = exercisesFor(activeDate).find(row => String(row && row.name || "").trim() === name);
    // 「没动过」= 组次负重仍然全是计划里给的那组数字（或还没生成组明细）。
    // 只看「数组是否为空」会误判：表单重建后每组都是对象，而计划本来就带 5 组 × 5 次 × 60 kg。
    const sameAsPlan = !Array.isArray(current?.setDetails) || !current.setDetails.length
      || current.setDetails.every(set => set
        && (number(set.reps) ?? null) === (number(item.reps) ?? null)
        && (number(set.weight) ?? null) === (number(item.weight) ?? null));
    const untouched = current && current.fromPlan === true && sameAsPlan;
    if (untouched) {
      await removeExerciseFromToday(current);
      if (typeof renderTrainingLog === "function") renderTrainingLog();
      notice("已取消勾选，并从今天的训练记录里撤掉。");
    } else if (current) {
      notice("已保留这条记录（里面已经有改动）。");
    }
    renderAiPlan();
  }
```

#### `startLoggingFromPlan` — 68-training-log.fragment.js:1248–1266（19 行）

```js
  /**
   * 从「今日清单」直接进入记录：把动作并进今天，跳到训练日志并聚焦负重。
   * 主流健身 App 的路径都是「看清单 → 点这个动作 → 记实际组次」，不要求重新打字。
   */
  async function startLoggingFromPlan(item) {
    const name = String(item && item.name || "").trim();
    if (!name) return;
    const already = exercisesFor(activeDate).some(row => String(row && row.name || "").trim() === name);
    if (!already) await addExercisesToToday([item]);
    switchTab("records", true);
    if (typeof switchRecordPanel === "function") switchRecordPanel("training");
    setTimeout(() => {
      const row = [...document.querySelectorAll("#training-exercises [data-exercise-row]")]
        .find(node => String(($('[data-exercise="name"]', node) || {}).value || "").trim() === name);
      (row || $("#training-form"))?.scrollIntoView({block: "center", behavior: "smooth"});
      const target = row ? (row.querySelector('[data-cardio="distance"]') || row.querySelector('[data-exercise="weight"]')) : null;
      target?.focus();
    }, 220);
  }
```

#### `parseExercisesFromText` — 68-training-log.fragment.js:1268–1285（18 行）

```js
  /** 从 AI 回答的纯文本里挑出「动作名 3组×8次 60kg」这类片段；认不出就返回空。 */
  function parseExercisesFromText(text) {
    const cleaned = String(text || "").replace(/<[^>]+>/g, "\n");
    const pattern = /([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9·\- ]{1,19}?)\s*[:：]?\s*(\d{1,2})\s*组?\s*[×xX*]\s*(\d{1,3})\s*次?\s*(?:[×xX*]\s*)?(\d{1,3}(?:\.\d)?)?\s*(?:kg|公斤)?/g;
    const out = [];
    let hit;
    while ((hit = pattern.exec(cleaned))) {
      const name = hit[1].trim().replace(/[：:，,。]$/, "");
      if (!name || name.length < 2) continue;
      out.push({
        name: name.slice(0, 24),
        sets: Number(hit[2]) || null,
        reps: Number(hit[3]) || null,
        weight: hit[4] ? Number(hit[4]) : null
      });
    }
    return out;
  }
```

#### EFFORT_LABELS / EFFORT_LEVELS — 68-training-log.fragment.js:1287–1287（1 行）

```js
  const EFFORT_LABELS = {tooLight: "太轻", justRight: "刚好", tired: "有点累", tooMuch: "太累"};
```

#### `effortFor` — 68-training-log.fragment.js:1289–1293（5 行）

```js
  function effortFor(date) {
    const row = (state.habits || []).find(item => item && item.date === date);
    const value = row && row.effort;
    return EFFORT_LEVELS.includes(value) ? value : null;
  }
```

#### `applyEffortSignalToPlan` — 68-training-log.fragment.js:1295–1314（20 行）

```js
  /** 强度信号落到清单：降载时每个配重动作少一组、重量退 5%；加量时第一个复合动作多一组。 */
  function applyEffortSignalToPlan(plan) {
    const signal = effortSignal();
    if (!Array.isArray(plan) || !plan.length || signal.level === "keep") return plan;
    if (signal.level === "deload") {
      for (const item of plan) {
        if (!item || item.bodyweight || Number(item.distanceKm) > 0) continue;
        // 少一组，但别把只有 1 组的孤立动作「减」成 2 组（以前 Math.max(2, 0) 会越减越多）。
        item.sets = Math.max(1, (Number(item.sets) || 1) - 1);
        if (Number(item.weight) > 0 && typeof reduceLoadableWeightKg === "function") {
          const kg = reduceLoadableWeightKg(item.name, Number(item.weight) * 0.95, Number(item.weight));
          if (kg > 0) { item.weight = kg; item.weightSource = "deload"; }
        }
      }
    } else if (signal.level === "push") {
      const first = plan.find(item => item && !item.bodyweight && !(Number(item.distanceKm) > 0));
      if (first) first.sets = Math.min(5, (Number(first.sets) || 3) + 1);
    }
    return plan;
  }
```

#### `saveTrainingEffort` — 68-training-log.fragment.js:1316–1323（8 行）

```js
  /** 体感只落在结束训练弹窗里（2026-11-23 删掉卡片底部那一行），这里不再有可刷新的行内 UI。 */
  async function saveTrainingEffort(value) {
    if (!EFFORT_LEVELS.includes(value)) return;
    const existing = (state.habits || []).find(item => item && item.date === activeDate) || {};
    await api("/api/habits", {...existing, date: activeDate, effort: value, effortAt: new Date().toISOString()});
    await loadState({quiet: true});
    notice("已记下：练下来" + EFFORT_LABELS[value] + "。下次排课会参考。");
  }
```

#### `planNoteKey` — 68-training-log.fragment.js:1325–1326（2 行）

```js
  /** 教练说明只留在本机：它解释「为什么没完全照要求办」，不进导出数据。 */
  function planNoteKey(date) { return "qingheng.planNote." + date; }
```

#### `readPlanNote` — 68-training-log.fragment.js:1328–1330（3 行）

```js
  function readPlanNote(date) {
    try { return localStorage.getItem(planNoteKey(date)) || ""; } catch { return ""; }
  }
```

#### `writePlanNote` — 68-training-log.fragment.js:1332–1337（6 行）

```js
  function writePlanNote(date, text) {
    try {
      if (text) localStorage.setItem(planNoteKey(date), text);
      else localStorage.removeItem(planNoteKey(date));
    } catch {}
  }
```

#### `renderPlanNote` — 68-training-log.fragment.js:1339–1345（7 行）

```js
  function renderPlanNote() {
    const node = $("#ai-plan-note");
    if (!node) return;
    const text = readPlanNote(activeDate);
    node.hidden = !text;
    node.textContent = text || "";
  }
```

#### `renderPlanTiming` — 68-training-log.fragment.js:1347–1357（11 行）

```js
  /** 只把「上一次没排成」的原因贴在清单上方：toast 只活 10 秒，失败原因要留得住。
   *  成功时不报耗时（2026-11-23 用户：不追求生成速度，追求排得对）。 */
  function renderPlanTiming() {
    const node = $("#ai-plan-timing");
    if (!node) return;
    let timing = null;
    try { timing = JSON.parse(localStorage.getItem("qingheng.planTiming." + activeDate) || "null"); } catch { timing = null; }
    if (!timing || !timing.error) { node.hidden = true; node.textContent = ""; return; }
    node.hidden = false;
    node.textContent = "上次没排成：" + timing.error;
  }
```

#### `syncPlanDoneFromRow` — 68-training-log.fragment.js:1359–1376（18 行）

```js
  /**
   * 播种行的每组 ○ 反过来决定计划项的 done（2026-11-22）：
   * 计划清单不再单独渲染，但 agenda 的「N 个动作还没完成」必须仍然说真话。
   */
  function syncPlanDoneFromRow(row) {
    if (!row || row.dataset.planIndex == null) return;
    const index = Number(row.dataset.planIndex);
    const plan = aiPlanStore(activeDate) || [];
    const item = plan[index];
    if (!item) return;
    const sets = $$('[data-set-row]', row);
    const allDone = sets.length > 0 && sets.every(set => set.classList.contains('is-done'));
    if (item.done === allDone) return;
    item.done = allDone;
    aiPlanStore(activeDate, plan);
    renderAiPlan();
    if (typeof renderTodayAction === 'function') renderTodayAction();
  }
```

#### `installWeightCalc` — 68-training-log.fragment.js:1378–1416（39 行）

```js
  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */
  function installWeightCalc() {
    const open = $("#weight-calc"), sheet = $("#weight-sheet");
    if (!open || !sheet) return;
    const bar = $("#bar-weight"), plate = $("#plate-weight"), perSide = $("#weight-per-side"), out = $("#weight-result");
    const savedBar = Number(localStorage.getItem("qingheng.barWeight") || 0);
    if (savedBar > 0) bar.value = String(savedBar);
    const total = () => {
      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;
      return Math.round((b + (perSide.checked ? 2 * p : p)) * 10) / 10;
    };
    const update = () => {
      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;
      const sum = total();
      out.textContent = perSide.checked
        ? "总重 " + sum + " kg（杆 " + b + " + " + p + " × 2）——这个数填进负重。"
        : "总重 " + sum + " kg（杆 " + b + " + " + p + "）——这个数填进负重。";
    };
    open.addEventListener("click", () => { sheet.hidden = false; update(); });
    $("#weight-close").addEventListener("click", () => { sheet.hidden = true; });
    bar.addEventListener("input", () => { update(); localStorage.setItem("qingheng.barWeight", String(Number(bar.value) || 0)); });
    plate.addEventListener("input", update);
    perSide.addEventListener("change", update);
    const fill = $("#weight-fill");
    if (fill && !fill.dataset.wired) {
      fill.dataset.wired = "1";
      fill.addEventListener("click", () => {
        // 负重输入由 setRowHtml 渲染成 [data-set="weight"]，没有 name 属性；
        // 旧选择器 input[name="weight"] 一个都选不到，回填永远是「先添加一个动作」。
        const inputs = $$('#training-exercises [data-set="weight"]');
        const target = inputs.find(input => !input.value) || inputs[inputs.length - 1];
        if (!target) { notice("先添加一个动作，再回填负重。"); return; }
        target.value = String(total());
        target.dispatchEvent(new Event("input", {bubbles: true}));
        sheet.hidden = true;
        notice("已填入 " + total() + " kg。");
      });
    }
  }
```

#### `installTrainingSheets` — 68-training-log.fragment.js:1418–1445（28 行）

```js
  /**
   * 训练的两张静态 sheet：计划说明放本周要求 / 怎么排的 / 负荷；
   * 顺延与清空已从「其他」里搬出来，直接挂在训练日志的操作行（2026-11-23 用户要求）——
   * 这两件低频动作不再需要一个折叠层，也少一个「其他」按钮。
   */
  function installTrainingSheets() {
    const sheetOf = id => $(id);
    const open = id => {
      const node = sheetOf(id);
      if (!node) return;
      node.hidden = false;
      const first = node.querySelector('button, textarea, [data-sheet-focus]');
      if (first) first.focus({preventScroll: true});
    };
    const close = id => { const node = sheetOf(id); if (node) node.hidden = true; };
    const pairs = [['#plan-explain-open', '#plan-sheet', '#plan-sheet-close']];
    for (const [trigger, sheet, closer] of pairs) {
      $(trigger)?.addEventListener('click', () => open(sheet));
      $(closer)?.addEventListener('click', () => close(sheet));
      $(sheet)?.addEventListener('click', event => { if (event.target === sheetOf(sheet)) close(sheet); });
    }
    // 2026-11-23 Phase 3：教练说明与排课耗时不再搬进计划说明抽屉——它们留在训练日志工具栏下方，
    // 点「重排今天」之后抬头就能看到（搬走会让反馈藏在另一张卡里）。
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (sheetOf('#plan-sheet') && !sheetOf('#plan-sheet').hidden) close('#plan-sheet');
    });
  }
```

#### `showTrainingDraft` — 68-training-log.fragment.js:1447–1450（4 行）

```js
  function showTrainingDraft(draft) {
    pendingDraft = draft;
    renderTrainingDraft(draft);
  }
```

### 3.9 组间休息引擎与记录页面板装配（视图 / 绑定层）

#### AI_PLAN_KEY 按日清单键 — 70-rest.fragment.js:33–40（8 行）

```js
  /** 用模型按顺序排今天的训练：需要勾选同意，失败就明确报错，不伪造计划。 */
  const AI_PLAN_KEY = date => "qingheng.aiPlan." + date;
  /**
   * 一次课的时间：每组执行约 45 秒 + 该动作的组间休息（restSecondsFor 的同一档位），
   * 有氧按它自己的时长算。以前用固定的 2.5 分钟/组，复合动作休 120~150 秒时低估近一半。
   */
  const AI_PLAN_WORK_SECONDS = 45;
  const AI_PLAN_MINUTE_STEPS = [30, 45, 60, 75, 90];
```

#### `installRecordPanels` — 70-rest.fragment.js:162–213（52 行）

```js
  function installRecordPanels() {
    const view = $('#view-records');
    if (!view || $('#records-tabs')) return;
    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const bar = document.createElement('div');
    bar.className = 'segment-bar';
    bar.id = 'records-tabs';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', '记录分类');
    bar.innerHTML = RECORD_PANELS.map(panel =>
      `<button type="button" class="segment" role="tab" data-records-panel="${panel.key}">${panel.label}</button>`).join('');
    host.parentNode.insertBefore(bar, host);
    const panels = {};
    for (const panel of RECORD_PANELS) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'record-panel-' + panel.key;
      container.dataset.panel = panel.key;
      let more = null;
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (!card) continue;
        if (panel.foldedHeadings?.includes(heading)) {
          if (!more) {
            more = document.createElement('details');
            more.className = 'panel-more';
            const summary = document.createElement('summary');
            summary.textContent = panel.key === 'food' ? '更多记录工具' : '更多记录';
            more.append(summary);
            container.append(more);
          }
          more.append(card);
        } else {
          container.append(card);
        }
      }
      host.append(container);
      panels[panel.key] = container;
    }
    // 训练概览只属于训练段：以前它留在 .record-grid 里，饮食 / 身体两段也会看到（2026-11-23 用户要求收回训练下）。
    const overview = $('#training-overview'), logCard = $('#training-log');
    if (overview && logCard && panels.training) panels.training.insertBefore(overview, logCard);
    // Nothing left in the original grid: keep the element for its layout, it is now just a wrapper.
    const saved = (() => {try {return localStorage.getItem(RECORD_PANEL_STORAGE);} catch {return null;}})();
    switchRecordPanel(RECORD_PANELS.some(p => p.key === saved) ? saved : 'food');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-records-panel]');
      if (button) switchRecordPanel(button.dataset.recordsPanel);
    });
  }
```

#### `attachRestLine` — 70-rest.fragment.js:345–367（23 行）

```js
  /**
   * 组间休息就长在那一组上：一条走完的线 + 就地倒计时（2026-11-22 第三轮）。
   * 点倒计时即取消；线滚出视野后由底部药丸接手，两处同一份 restEnd。
   */
  function attachRestLine(exerciseRow) {
    clearRestLine();
    if (!exerciseRow) return;
    const line = document.createElement('div');
    line.className = 'rest-line';
    line.innerHTML = '<span class="rest-line-bar"><span></span></span>'
      + '<button type="button" class="rest-line-label" data-rest-inline aria-label="取消休息计时"></button>';
    // 挂在动作卡底部（.set-foot 之前），不再插在具体那一组下面：一张卡只有一条。
    const foot = $('.set-foot', exerciseRow);
    if (foot) foot.before(line);
    else exerciseRow.appendChild(line);
    restLine = line;
    const fill = line.querySelector('.rest-line-bar > span');
    if (fill) fill.style.transform = 'scaleX(1)';
    line.querySelector('[data-rest-inline]')?.addEventListener('click', () => {
      clearRestLine();
      startRestTimer(false, restLength);
    });
  }
```

#### REST_SECONDS / REST_RING_C — 70-rest.fragment.js:368–384（17 行）

```js
  /** 默认休息秒数（没选具体动作、直接点药丸时用）；具体动作按 restSecondsFor 决定。 */
  const REST_SECONDS = 90;
  let restLength = REST_SECONDS;
  const REST_RING_C = 2 * Math.PI * 11.5;
  /**
   * 组间休息时长按动作与目标给（证据见 docs/design/27-evidence-requirements.md）：
   * 复合/大重量 120~150s，孤立 60~90s，自重 75~90s，有氧没有组间休息。
   * 增肌与保持用长档，减脂/薄肌用短档——缺口期恢复更慢，不需要把休息拉得更长。
   */
  function restSecondsFor(name) {
    if (typeof isCardioName === 'function' && isCardioName(name)) return 0;
    const goal = (state.profile || {}).goal || '';
    const longGoal = goal === 'gain' || goal === 'maintain';
    if (typeof isCompoundMove === 'function' && isCompoundMove(name)) return longGoal ? 150 : 120;
    if (typeof isBodyweightMove === 'function' && isBodyweightMove(name)) return longGoal ? 90 : 75;
    return longGoal ? 90 : 60;
  }
```

#### `paintRest` — 70-rest.fragment.js:442–478（37 行）

```js
  /** 计时与药丸一起画：剩余时间、环形进度、aria-label 同源。 */
  function paintRest(left) {
    const button = $('#rest-timer');
    if (!button) return;
    const label = $('[data-rest-label]');
    const text = left > 0 ? `休息 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `休息 ${restLength}s`;
    if (label && label.textContent !== text) {
      label.textContent = text;
      // 每秒一次的小归位：只动秒数那一行，不做整块闪动；reduced-motion 下动画被媒体查询关掉。
      if (left > 0) {
        label.removeAttribute('data-tick');
        void label.offsetWidth;
        label.setAttribute('data-tick', '');
      }
    }
    button.classList.toggle('is-running', left > 0);
    button.setAttribute('aria-label', left > 0
      ? `组间休息还剩 ${Math.floor(left / 60)} 分 ${left % 60} 秒，点一下结束`
      : `开始 ${restLength} 秒组间休息`);
    const ring = $('#rest-timer .rest-ring-fill');
    if (ring) ring.style.strokeDashoffset = String(REST_RING_C * Math.max(0, Math.min(1, 1 - left / Math.max(1, restLength))));
    // 同一只真源同时画那根线与行内倒计时：计时结束把线收掉，行回到常态。
    if (restLine && !restLine.isConnected) restLine = null;
    if (restLine) {
      const fill = restLine.querySelector('.rest-line-bar > span');
      if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, left / Math.max(1, restLength))).toFixed(4)})`;
      const inline = restLine.querySelector('[data-rest-inline]');
      if (inline) {
        inline.textContent = left > 0
          ? `休息 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
          : `休息 ${restLength}s`;
      }
      if (!left) clearRestLine();
    }
    button.dataset.left = String(left);
    syncRestDock();
  }
```

#### `restLeftNow` — 70-rest.fragment.js:479–482（4 行）

```js
  /** 剩余秒数只按绝对目标时间算：切后台/锁屏期间 setInterval 会被节流甚至暂停，不能靠递减。 */
  function restLeftNow() {
    return Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  }
```

#### `tickRest` — 70-rest.fragment.js:483–494（12 行）

```js
  /** 一帧的绘制：校准剩余时间 → 画 → 到点收尾（清计时器、响一次）。 */
  function tickRest() {
    const left = restLeftNow();
    paintRest(left);
    if (!left) {
      if (restTick) { clearInterval(restTick); restTick = 0; }
      // 到点只响一次：先清掉计时器再播音，避免下一帧重复触发。
      playRestChime();
      return false;
    }
    return true;
  }
```

#### `installRestDock` — 70-rest.fragment.js:514–541（28 行）

```js
  function installRestDock() {
    const exercises = $('#training-exercises');
    const actions = $('#training-form .log-actions');
    const dock = $('#rest-dock');
    if (!exercises || !actions || !dock || restDockWired) return;
    restDockWired = true;
    paintRest(0);
    // 锁屏/切后台回来：立即按绝对时间校准一次；后台期间已到期就直接收尾并补一次提示音。
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !restTick) return;
      tickRest();
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const on = entry.isIntersecting;
          if (entry.target === exercises) restExercisesInView = on;
          if (entry.target === actions) restActionsInView = on;
          syncRestDock();
        });
      }, {threshold: 0.01, rootMargin: '0px 0px -96px 0px'});
      io.observe(exercises);
      io.observe(actions);
    } else {
      restExercisesInView = true;
      syncRestDock();
    }
  }
```

## 4. 原生层：Java 的校验、持久化与上下文

训练数据在原生侧有四个关键点：**字段范围校验**、**按 id 覆盖写**（前端必须整条传回，否则会丢字段）、**训练日判定**、**给 AI 的训练上下文**。

### 4.1 requireHabitFields —— 训练字段的范围校验

- 模板只允许 `push|pull|legs|other`；动作 ≤ 12 个，动作名 ≤ 60 字；`sets ≤ 30`、`reps ≤ 200`、`weight ≤ 500`、距离 ≤ 200 km、时长 ≤ 600 分。
- 逐组 `setDetails` ≤ 30 组；**每组只强制 reps，weight 允许为 null**（自重动作），填了才查 0~500。
- 注意：这里校验的是「单条记录内」的范围，不校验跨天/跨记录的一致性；前端 `saveTrainingLog` 还额外要求「配重动作每组必填重量」。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:1830–1850`

```java
            JSONObject record = null;
            if (post) {
                record = scrub(b); record.put("id", id); validateNutritionIfPresent(record);
                if (collection.equals("meals")) requireMealFields(record);
                if (collection.equals("habits")) requireHabitFields(record);
                replacement.put(record);
            }
            next.put(collection, replacement);
            // A confirmed or deleted meal must not stay in the draft box.
            if (post && collection.equals("meals") && !draftId.isEmpty())
                next.put(DRAFTS, withoutDraft(next.optJSONArray(DRAFTS), draftId));
            commit(next);
            // Records-triggered feedback: the first saved meal of the day arms one short follow-up.
            if (post && collection.equals("meals") && AlarmScheduler.enabled(this)
                    && AlarmScheduler.prefs(this).getBoolean(AlarmScheduler.KEY_ANALYSIS_ENABLED, false)
                    && !AlarmScheduler.ran(this, AlarmScheduler.today(), AlarmScheduler.SLOT_MEAL)) {
                AlarmScheduler.scheduleMealFeedback(this, MEAL_FEEDBACK_DELAY_MS);
            }
            if (post && collection.equals("meals") && !draftId.isEmpty()) {
                drafts.remove(draftId); confirmedDrafts.put(draftId, record);
            }
```

### 4.2 scrub —— 落盘前剔除疑似凭据字段

- 键名（不区分大小写）含 `apikey/api_key/password/token/secret` 的整条丢弃。训练相关字段名都不命中，因此原样落盘。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:1052–1072`

```java
     * adds) survives untouched; only version/profile/meals/measurements/habits/chats are then
     * normalized to a usable shape. Finally the idempotent demo-seed migration runs.
     */
    private static JSONObject cleanState(JSONObject source) throws Exception {
        JSONObject out = source == null ? new JSONObject() : scrub(source);
        migrateState(out);
        if (!(out.opt("profile") instanceof JSONObject)) out.put("profile", new JSONObject());
        for (String key : new String[]{"meals", "measurements", "habits", "chats"}) {
            if (!(out.opt(key) instanceof JSONArray)) out.put(key, new JSONArray());
        }
        ensureChatIds(out);
        migrateSeedData(out);
        repairMealDates(out);
        repairChatAnswers(out);
        return out;
    }

    /**
     * Replaces answers that are nothing but JSON nulls ("nullnull…") with a plain note.
     *
     * Those records came from a model that streamed its thinking with a null content field: the text
```

### 4.3 prefs 路由 —— 偏好块浅合并

- `state.prefs` 是训练偏好与 AI 清单的持久层；`POST` 只做**浅合并**，`null` 表示删除该键。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:1741–1761`

```java
        if ((post || get) && path.equals("/api/export-markdown")) return markdownExport();
        throw fail("不支持的 API 路径或方法");
    }
    /** /api/prefs — read, or shallow-merge the portable preferences block into state. */
    @Override public Object prefs(boolean get, JSONObject b) throws Exception {
        ensureState();
        if (get) {
            JSONObject prefs = state.optJSONObject("prefs");
            return prefs == null ? new JSONObject() : new JSONObject(prefs.toString());
        }
        // User preferences that must survive a phone swap ride in state.json (and thus in every
        // export); localStorage keeps its instant-read role and stays the day-to-day cache.
        JSONObject patch = b.optJSONObject("prefs");
        if (!(patch instanceof JSONObject)) patch = b;
        JSONObject prefs = state.optJSONObject("prefs") == null ? new JSONObject() : new JSONObject(state.optJSONObject("prefs").toString());
        Iterator<String> keys = patch.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = patch.opt(key);
            if (value == null || value == JSONObject.NULL) prefs.remove(key); else prefs.put(key, value);
        }
```

### 4.4 collections 路由 —— habits 按 id 整条覆盖

- `POST /api/habits` 先删同 id 旧记录再插入新记录：前端必须先 `{...existing}` 再改字段，否则未传字段会丢。
- 保存前调用 `requireHabitFields`（4.1）。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:1801–1821`

```java
        checkProfileRanges(profile);
        commit(next); return new JSONObject(profile.toString());
    }
    /** CRUD for the four collections; the body is the former inline route loop. */
    @Override public Object collections(String path, boolean get, boolean post, boolean del, JSONObject b) throws Exception {
        ensureState();
        for (String collection : new String[]{"meals", "measurements", "habits", "chats"}) {
            String base = "/api/" + collection;
            if (!path.equals(base) && !path.startsWith(base + "/")) continue;
            if (get && path.equals(base)) return new JSONArray(state.getJSONArray(collection).toString());
            if (!post && !del) return null;
            String id = b.optString("id", "");
            if (path.startsWith(base + "/")) id = path.substring(base.length() + 1);
            if (id.length() > 128) throw fail("记录 id 过长");
            String draftId = b.optString("estimateId", b.optString("draftId", ""));
            if (post && collection.equals("meals") && !draftId.isEmpty()) {
                if (confirmedDrafts.containsKey(draftId)) return confirmedDrafts.get(draftId);
                JSONArray savedMeals = state.getJSONArray("meals");
                for (int j=0;j<savedMeals.length();j++){JSONObject saved=savedMeals.optJSONObject(j);if(saved!=null && draftId.equals(saved.optString("estimateId",saved.optString("draftId",""))))return saved;}
                if (!draftId.startsWith("local-") && !drafts.contains(draftId) && !storedDraftExists(draftId)) throw fail("估算草稿已失效，请重新估算");
            }
```

### 4.5 trainedOn —— 原生侧的训练日判定

- 有名字动作 → `true`；有行无动作 → `false`；没有这一天的行 → `null`（「未记录」不能读成「已确认休息」）。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:2924–2944`

```java
     * Whether that date counts as a training day: yes when the day saved at least one named exercise
     * (2026-11-18 — the manual「训练情况」switch is gone, the actions decide). null when no row exists,
     * so "not recorded" never reads as "rest day confirmed".
     */
    private Boolean trainedOn(String day) {
        try {
            JSONArray habits = state == null ? null : state.optJSONArray("habits");
            if (habits == null) return null;
            for (int i = 0; i < habits.length(); i++) {
                JSONObject row = habits.optJSONObject(i);
                if (row == null || !day.equals(row.optString("date", ""))) continue;
                JSONArray list = row.optJSONArray("exercises");
                if (list == null) return false;
                for (int j = 0; j < list.length(); j++) {
                    JSONObject item = list.optJSONObject(j);
                    if (item != null && item.optString("name", "").trim().length() > 0) return true;
                }
                return false;
            }
        } catch (Exception ignored) { }
        return null;
```

### 4.6 trainingLog —— 给 AI 的最近 N 天训练摘要

- 只输出日期、模板、动作名与**汇总容量**；容量口径是 `sets × reps × weight`，**不读 `setDetails`**（与前端逐组口径不同，见附录 B）。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:2996–3016`

```java
        return sets * reps * weight;
    }

    /** Training sessions inside the window: template, exercise names and total volume per session. */
    private JSONArray trainingLog(String day, int days) throws Exception {
        JSONArray out = new JSONArray();
        JSONArray habits = state.optJSONArray("habits");
        if (habits == null) return out;
        String from = java.time.LocalDate.parse(day).minusDays(days - 1L).toString();
        for (int i = 0; i < habits.length(); i++) {
            JSONObject row = habits.optJSONObject(i);
            if (row == null) continue;
            String date = row.optString("date", "");
            if (!validDay(date) || date.compareTo(from) < 0 || date.compareTo(day) > 0) continue;
            JSONArray exercises = row.optJSONArray("exercises");
            if (exercises == null || exercises.length() == 0) continue;
            JSONObject entry = new JSONObject().put("date", date).put("template", row.optString("template", ""));
            JSONArray names = new JSONArray();
            double volume = 0;
            boolean anyVolume = false;
            for (int j = 0; j < exercises.length(); j++) {
```

### 4.7 weeklyVolumeByExercise —— 按动作按 ISO 周的容量

- 近 14 天、按周一为一周起点，同样用 `sets × reps × weight`。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:3029–3049`

```java
        return out;
    }

    /** Total volume per exercise per ISO week for the last two weeks, so progress is visible. */
    private JSONObject weeklyVolumeByExercise(String day) throws Exception {
        java.util.Map<String, java.util.Map<String, Double>> byExercise = new java.util.TreeMap<>();
        JSONArray habits = state.optJSONArray("habits");
        if (habits == null) return new JSONObject();
        String from = java.time.LocalDate.parse(day).minusDays(13).toString();
        for (int i = 0; i < habits.length(); i++) {
            JSONObject row = habits.optJSONObject(i);
            if (row == null) continue;
            String date = row.optString("date", "");
            JSONArray exercises = row.optJSONArray("exercises");
            if (!validDay(date) || exercises == null || date.compareTo(from) < 0 || date.compareTo(day) > 0) continue;
            String week = java.time.LocalDate.parse(date)
                    .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).toString();
            for (int j = 0; j < exercises.length(); j++) {
                JSONObject item = exercises.optJSONObject(j);
                if (item == null) continue;
                String name = item.optString("name", "").trim();
```

### 4.8 adviceBody 里的 trainingToday —— 今天这次训练的摘要

- 这里**优先读 `setDetails`**（逐组 sum reps×weight），没有才退回 `sets × reps × weight`；与 4.6 的口径不一致。

源文件行（节选）：`app/src/main/java/cn/qingheng/health/MainActivity.java:4167–4187`

```java
    private static String adviceSystemPrompt() {
        // 顺序按用户要求：先看身材目标执行情况与今天摄入，再参考偏好，最后给动作。
        return "按这个顺序判断：先看用户的身材目标与目标区间执行得怎样，再看今天已记录的摄入与区间的关系，最后参考用户长期偏好（不能推荐与偏好冲突的食材）。"
                + "接着输出 2~3 句：第一句必须是明确的评价——达标或接近就写一句肯定（例如「今天做得不错，蛋白只差一点」，不要只写「接近达标」这种中性词），差得多就说清差什么；后面 1~2 句给今天或明天能立刻执行的动作，以动词开头、不超过 40 字。"
                + "如果 body.trainingToday 存在，用其中一句点评或给一条训练建议（练得够不够、强度怎么调、要不要休息），不超过 30 字；没有训练记录时不要硬编训练，也不要因为没记录就下结论。"
                + "建议里不要点名具体食材或量词（不写「鸡胸」「两掌心」），用类别（蛋白质、主食、蔬菜、奶或豆制品）即可。"
                + "不要复述界面上已经显示的热量、蛋白质、脂肪数字——用户正看着；不要两条都说同一件事。"
                + "数据缺失就直说缺什么，不要当成 0；缺数据时不要凭空夸奖。不诊断、不处方、不推荐极端节食或断食。"
                + "只输出这几句，不要开场白、标题、免责声明、编号或 Markdown 列表符号。";
    }

    /** Keep the advice prompt small: only the newest N rows travel, the rest is summarised by recentDailyNutrition. */
    private static JSONArray cappedWindow(JSONArray rows, int limit) throws Exception {
        if (rows == null || rows.length() <= limit) return rows == null ? new JSONArray() : rows;
        JSONArray out = new JSONArray();
        for (int i = 0; i < limit; i++) out.put(rows.get(i));
        return out;
    }

    /** The exact advice payload for one day; the preview route shows it without any provider call. */
    private JSONObject adviceInput(String day) throws Exception {
```

### 4.9 训练相关的提示词约束（节选）

训练建议的提示词不在本文档全文引用，只列与训练口径有关的三条：

- 训练建议入口带 `focus: "training"`，服务端据此换成更窄的指令（`MainActivity.java` 的 chat 分支）。
- `body.trainingDisabled === true` 时不提训练、组数或渐进超负荷（`Prompts.java` 的训练建议约束）。
- 训练记录缺失就不提训练，不因缺记录而给结论（`Prompts.java:109`）。

## 5. 测试基线

`tests/` 已合并为 12 个测试文件（11 个 `suite-*` 套件 + 独立的 `food-models`），合计 2313 个 `check` 断言点，`node tools/test-all.mjs` 全绿）。训练行为集中在 `tests/suite-training.test.mjs`（710 个 `check` 调用点，28 个分组），其余套件只有零散引用。

| 套件 | 分组 | check 调用点 | 与训练的关系 |
|---|---|---|---|
| `suite-architecture.test.mjs` | 0 | 11 | 无关 |
| `suite-chat.test.mjs` | 12 | 301 | 训练建议入口与问答面板 |
| `suite-food.test.mjs` | 17 | 337 | 无关（版本字面量除外） |
| `suite-infra.test.mjs` | 23 | 218 | 片段拼装、架构守卫、版本号、入口预算 |
| `suite-misc.test.mjs` | 5 | 51 | 片段漂移与形状守卫 |
| `suite-modular.test.mjs` | 0 | 26 | 无关 |
| `suite-profile.test.mjs` | 10 | 131 | 目标计算里的训练天数 |
| `suite-records.test.mjs` | 6 | 138 | 记录页表单结构（训练表单的通用约定） |
| `suite-today.test.mjs` | 12 | 246 | 今天页行动条 / 概况卡消费训练状态 |
| `suite-training.test.mjs` | 28 | 710 | 主体：计划生成、排今天、保存、休息计时、自重、容量 |
| `suite-trends.test.mjs` | 8 | 144 | 趋势页容量表与警告 |

### 5.1 suite-training 的 28 个分组

| 分组 | 行 | check 调用点 |
|---|---|---|
| `advice-and-training-window` | 18–76 | 23 |
| `effort-feedback` | 77–120 | 19 |
| `habit-and-training-mode` | 121–167 | 20 |
| `plan-from-today` | 168–220 | 26 |
| `plan-reply-behavior` | 221–388 | 29 |
| `plan-shared-template` | 389–445 | 18 |
| `plan-timing` | 446–469 | 9 |
| `plan-weight` | 470–539 | 20 |
| `rest-timer` | 540–636 | 37 |
| `training-actions` | 637–665 | 7 |
| `training-advice-compose` | 666–692 | 7 |
| `training-bodyweight` | 693–839 | 57 |
| `training-day-budget` | 840–898 | 27 |
| `training-draft` | 899–970 | 24 |
| `training-hierarchy` | 971–994 | 5 |
| `training-integration` | 995–1061 | 22 |
| `training-library` | 1062–1344 | 173 |
| `training-log` | 1345–1422 | 37 |
| `training-plan-loop` | 1423–1471 | 16 |
| `training-prescription` | 1472–1649 | 25 |
| `training-presets` | 1650–1694 | 19 |
| `training-save-dialog` | 1695–1748 | 20 |
| `training-state` | 1749–1819 | 3 |
| `week-schedule-merge` | 1820–1849 | 8 |
| `week-switch` | 1850–1909 | 20 |
| `training-phase1` | 1910–1963 | 14 |
| `training-intuition` | 1964–2019 | 20 |
| `plan-labels` | 2020–2046 | 5 |

### 5.2 不可破坏的边界（自动筛出的含数字/边界词的断言，原文摘录）

**`habit-and-training-mode`**

- `the tiles render images, not characters`
- `it is capped at two bullets overall`
- `the profile no longer asks for training frequency`

**`plan-from-today`**

- `the generator spreads the sessions from day 0`
- `it counts named exercises only`
- `the habit submit no longer sends training`
- `the check card no longer invents a missed training chip`

**`plan-shared-template`**

- `旧的固定 2.5 分钟/组已移除`
- `改时长不再有死按钮（Phase 2 已移除 #ai-plan-summary）`

**`plan-weight`**

- `progression is step-based and capped at +10%`
- `a same-family transfer is discounted to 85%`
- `a weaker source never overwrites a stronger one`
- `the prompt no longer tells the model to leave weights empty`
- `bodyweight moves are still allowed to carry no kg`

**`rest-timer`**

- `it uses the Web Audio API, not an mp3`
- `the timer takes seconds, not a hardcoded 90`
- `it is primed on a user gesture so autoplay does not silence it`
- `cardio gets no rest timer`
- `the timer ticks through one helper, not a decrement counter`

**`training-actions`**

- `the plan card no longer carries an adoption button`
- `the advice page no longer carries a second AI button`

**`training-bodyweight`**

- `a barbell bench keeps the 20 kg bar floor`
- `a machine bench starts at 5 kg steps`
- `a machine bench rounds to the nearest 5 kg`
- `a barbell bench rounds in 5 kg jumps`
- `a stored 0 kg on a bodyweight move reads as empty`
- `plan hand-off normalises 0 kg too`
- `a machine bench is not bodyweight`
- `an empty name is not bodyweight`
- `a bodyweight move has no loadable weight`

**`training-day-budget`**

- `an intake range is derived per date`
- `a training day uses the training range`
- `a rest day uses the rest range`

**`training-log`**

- `at least two weeks are required before comparing`
- `the empty state explains what is missing`
- `an exercise name is required`

**`training-prescription`**

- `ppl 4 练只有第 2 轮那一天是轻量日`
- `3 练没有轻量日`
- `全身 4 练没有轻量日`
- `上下肢 4 练有 2 个轻量日`
- `§7-1 器械偏好为杠铃时主复合是杠铃动作`
- `§7-2 非自重动作都带重量`
- `§7-2 自重动作重量留空`
- `§7-2 推算出来的重量带 weightApprox 标记`

**`training-save-dialog`**

- `the overview is always expanded, not a collapsible`

**`training-state`**

- `real training is never hidden as rest`
- `a blank exercise does not count as training`

## 附录 A. 训练相关 DOM id ↔ 读写函数对照

| DOM id | 谁渲染 | 谁会写它的内容 | 事件绑定位置 |
|---|---|---|---|
| `#week-plan` | renderWeekPlan（innerHTML） | renderWeekPlan / regenerateWeekPlan | renderWeekPlan 内 `planBox.dataset.adoptWired` 一次性委托；`#week-plan` 另一处委托在 70-rest |
| `#plan-prefs` / `#plan-prefs-summary` / `#plan-request` | index.html + installPlanPrefs | installPlanPrefs | installPlanPrefs（chips / 改偏好 / 换一套 / 保存并重排） |
| `#training-overview*` | renderTrainingOverview | 同左 | 无（只读） |
| `#training-log` / `#training-form` | index.html | — | 70-rest、2167–2180、2409–2532 |
| `#training-exercises` | renderTrainingLog（innerHTML） | exerciseRowHtml / refreshSetRow / appendExerciseRow | `#training-exercises` 的 input / focusout / click 三个委托（70-rest/2424）；草稿监听在 renderTrainingLog 内 `draftWired` |
| `#training-tag` / `#training-rest` | renderTrainingLog | 同左 | `#training-rest` 点击（70-rest） |
| `#ai-plan-*` / `#ai-plan-note` / `#ai-plan-timing` | renderAiPlan / renderPlanNote / renderPlanTiming | 同左 | installAiPlan |
| `#ai-plan-ask` | renderAiPlan（改文案） | — | installAiPlan |
| `#training-advice-order` | renderAdviceOrder | 同左 | renderAdviceOrder 内 `todayWired` 一次性委托 |
| `#training-advice-insights` / `#training-advice-chips` | renderTrainingInsights | 同左 | installTrainingAdvice |
| `#training-advice-form` / 答案区 | installTrainingAdvice | 同左 | installTrainingAdvice |
| `#rest-dock` / `#rest-timer` / `.rest-line` | paintRest / attachRestLine | 同左 | `#rest-timer`（70-rest）+ 行内 `[data-rest-inline]` |
| `#plan-sheet` | index.html | renderWeekPlan 把说明节点 move 进去 | installTrainingSheets |
| `#exercise-guide` | showExerciseGuide | 同左 | installExerciseGuide |
| `#weight-sheet` | installWeightCalc | 同左 | installWeightCalc |
| `#app-dialog`（结束训练弹窗） | askConfirm + trainingSaveDialogHtml | trainingSaveDialogHtml | wireTrainingSaveDialog + `#app-dialog-ok`（50-onboarding） |
| `#volume-table` | renderVolumeTable | 同左 | 无 |
| `#today-training-line` | `renderBody`（10-rich-answer） | 同左 | 70-rest（跳记录·训练） |
| `#today-peek`（本周训练卡） | renderTodayPeek | 同左 | `[data-go]` 统一委托（70-rest） |

## 附录 B. 评审时值得先看的实现事实（只陈述，不评价）

1. **三套容量口径**：前端逐组 `setDetails`（`trainingStatsOf` / `trainingVolumeOf`）、周计划基线与重量记忆（`recentExerciseBaselines` 用 sets×reps×weight）、原生 `trainingLog`（sets×reps×weight）、原生 `adviceBody`（优先 setDetails）。同一份记录在不同位置可能得到不同容量。
2. **周计划生成有两个入口**：`renderWeekPlan()` 与 `weekPlanToday()` 都能在缓存缺失时现场生成；前者写缓存，后者也写缓存（同一指纹函数）。`cachedWeekPlan()` 明确只读。
3. **今日清单有两份渲染**：`renderAiPlan()` 只更新入口文案/计数/汇总（清单本体已播进执行区），`renderAdviceOrder()` 在训练建议区另渲染一份可勾选清单；两者都写 `aiPlanStore`。
4. **执行区播种依赖 DOM 标记**：`renderTrainingLog` 用 `form.dataset.seedMuted === activeDate` 抑制再播种，行与清单通过 `data-plan-index` 对齐；`syncPlanDoneFromRow` 靠这个索引回写 `done`。
5. **训练表单是「DOM 即草稿」**：`trainingDrafts` 是内存 Map（不落盘），`renderTrainingLog` 重建时优先还原；保存/清空后 `forgetTrainingDraft`。页面销毁（重启应用）草稿即丢。
6. **计划说明是 move 不是 clone**：`renderWeekPlan` 每次把 `.plan-requirement/.plan-why/.plan-load…` 从卡面搬进 `#plan-explain-body`，所以第二次渲染时这些节点已不在卡面里，靠重新 `innerHTML` 生成。
7. **事件绑定有三种寿命**：顶层一次性（`$("#training-add")` 等）、`dataset.wired` 幂等（`installPlanPrefs` / `installAiPlan` / `installTrainingSheets`）、每次渲染 `innerHTML` 后重新委托（`#training-exercises` 的 click 是容器级委托，innerHTML 重建不影响）。
8. **`training` 字段的三种取值**：`true`（保存过训练）、`false`（明确记为休息）、缺字段（未记录）；`renderTrainingLog` 与 `trainingStateFor` 都按这三态判断，不要合并成布尔。
9. **重量记忆与周计划缓存都不进备份**：换机后周计划会按指纹重算，重量记忆从历史记录重新 seed（`seedWeightMemoryFromHistory`）。
10. **`AI_PLAN_KEY` / `WEEK_PLAN_KEY` 由函数生成**，`CONFIG_REGISTRY` 只登记 `planPrefs/aiPlans/bodyweightMoves/preferences`，缓存类键刻意不同步。

---

生成脚本：`.tmp/training-extract/build.mjs`（一次性工具，未入库）。行号以本文档所述版本为准，改动代码后需重新生成。