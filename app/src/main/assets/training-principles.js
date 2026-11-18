/**
 * 轻衡本地知识库 v2：健身 + 减脂建议数据库（离线，不联网、不花 token）。
 *
 * 由三位创作者公开内容的拆解摘要构成，并补充与 App 口径一致的减脂/饮食规则。
 * 每条带来源、优先级、置信度与可执行参数；冲突时按 priority 与 conflictPolicy 决定。
 *
 * 等级：A 原始/官方 · B 专业整理 · C 社区/自媒体 · P 推广
 * 重要限制：本地没有视频文件/字幕，条目按「创作者公开说法」记录，未逐字核验。
 */
window.TRAINING_PRINCIPLES = {
  version: '2026-10-24.2',
  /** 界面审美依据（非训练内容）：令牌化排版、数据等宽数字、单一圆角尺度、动效降级、可见焦点环。 */
  designNotes: {
    basis: '公开可查的产品设计系统通用做法（令牌化字阶/间距、tabular-nums、prefers-reduced-motion、focus-visible）',
    appliedIn: '1.0.62 令牌化，1.0.63 数据排版与可访问性',
    limit: '无法浏览所谓「opus 作品集」（不存在公开语料），因此以公开设计系统为依据，不冒充某位作者风格。'
  },
  note: '本地健身/减脂知识库：供计划生成、体检建议与问答引用；不做医疗建议。',

  /**
   * 冲突时的先后顺序（数字越小越优先）：
   *   P1 凯圣王 × 谭成义三分化 —— 训练结构、强度、力竭、渐进、动作选择
   *   P2 凯圣王频道 —— 力量优先与新老流派取舍
   *   P3 ALEX健身频道 —— 有氧执行与热身细节
   *   饮食/热量/蛋白口径始终以 App 规则为准，不被建议库覆盖。
   */
  priority: ['cdg-2022', 'cswz-2024', 'issn-2017', 'helms-2014', 'aasm-2015', 'csr-2023', 'asr-transcript', 'ksw-tcy-3split', 'acsm-2026', 'schoenfeld-2017', 'baz-valle-2022', 'morton-2018', 'iraki-2019', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],
  conflictPolicy: '营养与睡眠的口径以学会立场声明（ISSN / AASM）优先；训练计划与强度听三分化；解剖与动作细节听好人松松与谭成义；有氧与拉伸听 ALEX；热量、蛋白、缺口硬底线始终由 App 规则兜底，任何来源都不得下调。',

  sources: [
    {
      id: 'ksw-tcy-3split',
      label: '凯圣王 × 谭成义《三分化①——训练计划》',
      kind: '视频',
      ref: 'Bilibili BV1FcdZBNEm3',
      via: '第三方整理稿（含黑板板书与讲授要点）',
      level: 'A（标题/时长/简介来自 B 站公开接口）',
      priority: 1,
      season: '凯圣王-谭成义三分化（season 7937371，7 集）',
      episodes: [
        {bvid: 'BV1FcdZBNEm3', title: '①训练计划', seconds: 1290},
        {bvid: 'BV1CSoKBaEgK', title: '②跟练胸肩三头', seconds: 5051},
        {bvid: 'BV1hCdSBaEvw', title: '③名词释义', seconds: 1195},
        {bvid: 'BV1v5opBhEDc', title: '④跟练背三角肩后束二头', seconds: 5049},
        {bvid: 'BV17ooLBUEqS', title: '合集', seconds: 16071},
        {bvid: 'BV17aovBqEdg', title: '⑤跟练腿股四头肌腘绳肌', seconds: 3489},
        {bvid: 'BV1SEorB6Ekj', title: '⑥约练背vlog', seconds: 3810}
      ],
      url: 'https://smallsmartao.github.io/2026/08/30/2026-08-30-Kaishengwang-TanChengyi-3Split-Strength-Training-Guide/',
      note: '本次可核验到的最详细二手整理；未逐条回看视频原文。'
    },
    {
      id: 'ksw-channel',
      label: '凯圣王（B 站频道）',
      kind: '视频合集',
      ref: 'space 2100737396',
      via: '频道页与视频标题',
      level: 'B',
      priority: 2,
      url: 'https://space.bilibili.com/2100737396',
      note: '力量举主项哲学与「功能性训练 or 力量训练」讨论。'
    },
    {
      id: 'hrss-channel',
      label: '好人松松（B 站）',
      kind: '视频合集',
      ref: 'space 2078781964',
      via: 'B 站公开接口：3 个合集共 10 个视频的标题/时长',
      level: 'A（标题/时长/播放量）',
      priority: 2,
      url: 'https://space.bilibili.com/2078781964',
      note: '体系最完整：解剖手册（关节活动/胸/肩/背/手臂腹肌）、新手训练手册（56 分钟，播放 542 万）、饮食手册（110 分钟）、减脂手册（54 分钟）+ 生活化减脂案例。',
      seasons: [
        {season_id: 4695468, title: '健身中手看这个✔', total: 5},
        {season_id: 4695507, title: '新手健身看这个✔', total: 3},
        {season_id: 4695560, title: '科学减脂看这个✔', total: 2}
      ],
      episodes: [
        {bvid: 'BV1mM6JY6Ei9', title: '健身解剖完全手册 第1集：关节活动', seconds: 3098, views: 1185360},
        {bvid: 'BV1YgcdeqE7y', title: '第2集：练胸', seconds: 3887, views: 1032027},
        {bvid: 'BV167LAzaE14', title: '第3集：练肩', seconds: 3955, views: 870661},
        {bvid: 'BV1jEnuz9ESc', title: '第4集：练背', seconds: 5652, views: 1378585},
        {bvid: 'BV1X1Lj66ENe', title: '第5集：练手臂&腹肌', seconds: 5057, views: 447573},
        {bvid: 'BV1Hk4y187jF', title: '健身新手的训练完全手册', seconds: 3394, views: 5421680},
        {bvid: 'BV1zu4m1N76R', title: '免费工具：生活化减脂增肌 饮食方案+训练计划', seconds: 2503, views: 1434501},
        {bvid: 'BV1yX4y1q7LP', title: '健身新手的饮食完全手册', seconds: 6646, views: 2680597},
        {bvid: 'BV1794y1a7y4', title: '生活化减脂：从理论到案例 就吃食堂外卖', seconds: 2847, views: 1978600},
        {bvid: 'BV1AM411r7z3', title: '健身新手的减肥减脂完全手册', seconds: 3284, views: 2388385}
      ]
    },
    {
      id: 'tcy-channel',
      label: '谭成义（B 站）',
      kind: '视频合集',
      ref: 'space 521903482',
      via: 'B 站公开接口：教学合集（共 21 集，接口仅返回最近 6 集的标题/时长）',
      level: 'A（标题/时长）+ C（细节）',
      priority: 3,
      url: 'https://space.bilibili.com/521903482',
      note: '教学合集 6516587 共 21 集；可见条目集中在手臂、肩、腹肌与呼吸/恢复/神经。',
      seasons: [{season_id: 6516587, title: '教学合集', total: 21}],
      episodes: [
        {bvid: 'BV1hjWgzREJn', title: '一个人偷偷练就完了', seconds: 177},
        {bvid: 'BV1hyWwzeETh', title: '手臂纯享版教学', seconds: 565},
        {bvid: 'BV1LqJCz1EcE', title: '肩部教学', seconds: 325},
        {bvid: 'BV1utntzhE9a', title: '非常详细的肩部教学', seconds: 389},
        {bvid: 'BV1Ehn7zmEHN', title: '最推荐的两个腹肌动作', seconds: 473},
        {bvid: 'BV1czHuzPExA', title: '训练中的呼吸与恢复、神经的作用', seconds: 450}
      ]
    },
    {
      id: 'asr-transcript',
      label: '四位 UP 视频口述（本地 ASR 转写）',
      kind: '视频口述',
      ref: 'faster-whisper small int8 本地转写（个人学习用途）',
      via: 'B 站公开接口取音频 → 本地 ASR → 人工摘录',
      level: 'A（创作者本人口述，含时间戳）',
      priority: 1,
      url: 'https://www.bilibili.com/video/BV1FcdZBNEm3',
      note: '本轮转写 5 个高价值视频（合计 44 分钟）：三分化①训练计划、谭成义腹肌/肩部/手臂、ALEX 练腿前热身。口述是创作者本人说的，比标题级证据高一级；ASR 有少量同音字（体脂率→踢直低、肌肥大→机肥大），摘录时已按上下文校正。',
      episodes: [
        {bvid: 'BV1FcdZBNEm3', title: '凯圣王-谭成义三分化①训练计划', seconds: 1290, lines: 724},
        {bvid: 'BV1Ehn7zmEHN', title: '谭成义：最推荐的两个腹肌动作', seconds: 473, lines: 128},
        {bvid: 'BV1utntzhE9a', title: '谭成义：非常详细的肩部教学', seconds: 389, lines: 90},
        {bvid: 'BV1hyWwzeETh', title: '谭成义：手臂纯享版教学', seconds: 565, lines: 250},
        {bvid: 'BV1ncdUBGEbS', title: 'ALEX：练腿前千万别直接上重量', seconds: 324, lines: 96}
      ]
    },
    {
      id: 'issn-2017',
      label: 'ISSN 蛋白质与运动立场声明（2017）',
      kind: '学术立场声明',
      ref: 'J Int Soc Sports Nutr 2017;14:20',
      via: 'PMC 全文（已核对原文数值）',
      level: 'A（学会立场声明）',
      priority: 2,
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/',
      note: '原文数值：日常 1.4~2.0 g/kg/d；热量缺口期 2.3~3.1 g/kg/d 以保住瘦体重；单餐 0.25 g/kg 或 20~40 g，每 3~4 小时一次；睡前酪蛋白 30~40 g。'
    },
    {
      id: 'helms-2014',
      label: 'Helms 等：自然健美备赛营养与补剂建议（2014）',
      kind: '综述',
      ref: 'J Int Soc Sports Nutr 2014;11:20',
      via: '开放获取全文（要点级引用）',
      level: 'A（系统综述）',
      priority: 2,
      url: 'https://www.tandfonline.com/doi/full/10.1186/1550-2783-11-20',
      note: '减脂期的通识：缺口要缓、蛋白要上调、抗阻训练要保留；具体数字以 App 口径为准。'
    },
    {
      id: 'aasm-2015',
      label: 'AASM/SRS 成人睡眠时长共识（2015）',
      kind: '指南共识',
      ref: 'Sleep 2015;38(6):843-844',
      via: '共识结论（未逐页核验原文）',
      level: 'A/B（学会共识，条目按公开结论记录）',
      priority: 2,
      url: 'https://jcsm.aasm.org/doi/10.5664/jcsm.4758',
      note: '成人推荐每晚 7 小时以上；长期不足与食欲、代谢和训练表现相关。'
    },
    {
      id: 'cdg-2022',
      label: '《中国居民膳食指南（2022）》平衡膳食八准则',
      kind: '官方指南',
      ref: '中国营养学会 · 2022',
      via: '官网全文（八准则与核心推荐，已逐条核对数值）',
      level: 'A（国家级膳食指南）',
      priority: 2,
      url: 'http://dg.cnsoc.org/article/04/J4-AsD_DR3OLQMnHG0-jZA.html',
      note: '八准则：食物多样、吃动平衡、多吃蔬果奶类全谷大豆、适量鱼禽蛋瘦肉、少盐少油控糖限酒、规律进餐足量饮水、会烹会选会看标签、公筷分餐。数值已按原文录入。'
    },
    {
      id: 'csr-2023',
      label: '《中国睡眠研究报告2023》',
      kind: '调查报告',
      ref: '中国睡眠研究会等 · 2023',
      via: '公开报道数据（央视网/光明网）',
      level: 'B（抽样调查报告）',
      priority: 3,
      url: 'https://m.gmw.cn/2023-03/19/content_1303312753.htm',
      note: '2022 年中国民众平均每晚睡眠 7.40 小时；47.55% 不足 8 小时、16.79% 不足 7 小时；睡眠指数 67.77。'
    },
    {
      id: 'cswz-2024',
      label: '《成人肥胖食养指南（2024年版）》',
      kind: '国家卫健委指南',
      ref: '国家卫生健康委员会 · 2024',
      via: '官方摘登全文（中国医药报转载）',
      level: 'A（国家部委指南）',
      priority: 2,
      url: 'http://bk.cnpharm.com/zgyyb/2025/03/29/320317.html',
      note: '适用人群是 BMI≥24 的超重与肥胖患者。能量下限（男 1200~1500、女 1000~1200 kcal）只适用于这一人群；本 App 的用户体重 64.6 kg、BMI 正常，因此仍以 2,000 kcal 硬底线为准，不能套用该下限。'
    },
    {
      id: 'community-digest',
      label: 'B 站评论区「课代表」整理图',
      kind: '网友整理',
      ref: '评论区图片（凯圣王×谭成义三分化：推/拉/腿各一张）',
      via: 'x/v2/reply 接口 + 图片阅读',
      level: 'C（与 P1 视频结构互证）',
      priority: 2,
      url: 'https://www.bilibili.com/video/BV1FcdZBNEm3',
      note: '按视频整理的处方图：三天各 5 个动作、组数/次数/RPE 与进阶路线写得很具体，比正片标题细一个量级。读者也指出视频口误：开肘划船应为中下斜方而非上斜方。'
    },
    {
      id: 'alex-channel',
      label: 'ALEX健身频道（B 站）',
      kind: '视频合集',
      ref: 'space 1681952786',
      via: 'B 站公开接口：频道 season 与视频标题',
      level: 'A（标题/时长）/ C（内容细节）',
      priority: 3,
      url: 'https://space.bilibili.com/1681952786',
      note: '频道主打拉伸与热身：season 3806101「每日拉伸跟练，全身放松！」共 16 集（全身/臀腿/肩颈/泡沫轴/练腿日动态拉伸，7~14 分钟）。「跟着 ALEX 有氧减脂」40 分钟系列是第三方 up 主跟练其视频的再上传，只能作为其有氧内容存在性的 C 级证据。',
      episodes: [
        {bvid: 'BV1ncdUBGEbS', title: '练腿前千万别直接上重量！这套热身太关键了', seconds: 324},
        {bvid: 'BV1rh4Ne3Evt', title: '12分钟全身拉伸｜缓解酸痛｜提高灵活性', seconds: 742},
        {bvid: 'BV1MFzhBwE1B', title: '泡沫轴滚腿：正确臀腿放松教学+跟练', seconds: 422},
        {bvid: 'BV1Qxhv6cEgj', title: '腿部深度拉伸｜练后放松·睡前舒缓', seconds: 572},
        {bvid: 'BV1hE421w7qF', title: '8分钟肩颈放松｜久坐腰酸背痛', seconds: 491}
      ],
    }
  ],

  /**
   * 评论区「课代表」整理的训练处方（图片，C 级证据）。三个 UP 的视频没有字幕，
   * 但评论区有读者按视频整理的推/拉/腿完整处方，具体到组数、次数、RPE 与进阶路线。
   * 与 P1 视频标题/结构互证，因此可用；仍按 C 级标注，不当作医学建议。
   */
  dayTemplates: {
    push: {
      label: '推日 · 胸 / 三角肌中束 / 肱三头肌',
      source: 'community-digest',
      cues: [
        '卧推握距略窄于肩 → 大臂偏矢状面，吃前束与上胸；宽握 → 水平内收，更偏胸',
        '想练上胸要开肘更大（接近水平），开肘不够大就落回中胸',
        '别把屁股往前挪、别狠狠挺胸——那是人造下斜板，会把上斜练成中下胸'
      ],
      warmup: ['转肩/弹力带活动', '俯卧撑或空杆热身 15 次 RPE8'],
      exercises: [
        {name: '杠铃卧推', role: '胸（主项）', sets: 3, reps: '12/10/8', rpe: 8, progression: '四组 8 次 RPE8 熟练后 → 热身外两组 6 次 → 三组 6 次 → 四组 6 次，再降容量加重量'},
        {name: '哑铃上斜卧推', role: '胸', sets: 4, reps: 12, rpe: 8, progression: '第4组提到 RPE9.5 → 两级后第3、4组力竭；最多两组力竭'},
        {name: '双杠臂屈伸', role: '下胸/三头', sets: 4, reps: 12, rpe: 10, progression: '做不到就先做支撑退阶或换下胸替代动作'},
        {name: '仰卧臂屈伸', role: '三头', sets: 4, reps: 15, rpe: 8, progression: '4×12 RPE8 → 后两组力竭 → 加组间歇/加重量'},
        {name: 'Y 字侧平举', role: '三角肌中束', sets: 3, reps: '10+10', rpe: 10, progression: '每组 10 次 → 组内歇 5 秒 → 再 10 次到力竭'}
      ]
    },
    pull: {
      label: '拉日 · 背 / 三角肌后束 / 肱二头肌',
      source: 'community-digest',
      cues: [
        '开肘划船练后束必须近乎水平开肘，半开肘、假肘都练不到',
        '别用过度肩胛后缩代替发力，可刻意做一点肩胛前引来抑制',
        '下拉/划船第一个动作第 4 组做到力竭，其余留 1~2 次余量'
      ],
      warmup: ['伟大者伸展', '弹力带热身', '胸椎本体感受激活', '胸椎屈曲激活', '三头拉伸'],
      exercises: [
        {name: '单手钢线下拉', role: '背', sets: 4, reps: '12', rpe: 8, progression: '前3组12次RPE8，第4组10次RPE10，歇5秒再做5次；之后主要加重量'},
        {name: '对握高位下拉', role: '背/后束', sets: 4, reps: '8~12', rpe: 10, progression: '保证动作质量前提下尽量加重量'},
        {name: '单手器械划船', role: '背', sets: 4, reps: 10, rpe: 8, progression: '第4组力竭；之后减组数、加重量，保持 RPE8 进入循环'},
        {name: '坐姿开肘划船', role: '三角肌后束/中下斜方', sets: 4, reps: '15~12', rpe: 8, progression: '先做满 15 次，再逐步加重量降到 12 次'},
        {name: '钢线弯举', role: '肱二头', sets: 3, reps: 12, rpe: 8, progression: '加重量即可'}
      ]
    },
    legs: {
      label: '腿日 · 臀 / 股四头肌 / 腘绳肌',
      source: 'community-digest',
      cues: [
        '热身 6 个动作、每边 45 秒：髋开合 / 内收肌 / 前脚踝+后侧链 / 髋激活 / 踝+大腿内侧 / 踝背屈',
        '深蹲时脚跟容易抬高的人，重点做最后一个踝背屈动作',
        '单腿动作以骨盆稳定为前提，加旋转前先把大腿固定住'
      ],
      warmup: ['动态青蛙趴', '髋关节 90/90', '脚踝激活（闭眼单侧平衡）', '泡沫轴松解胫骨前肌/小腿后侧/大腿前后/臀/阔筋膜张肌', '伟大者伸展'],
      exercises: [
        {name: '单腿硬拉', role: '臀/腘绳', sets: 3, reps: 12, rpe: 9, progression: '加重量；髋为轴转动，全掌踩死抓地'},
        {name: '单腿保加利亚蹲', role: '臀/股四', sets: 3, reps: 10, rpe: 9, progression: '前腿屈膝张力拉满；足背屈不足则降低坐幅'},
        {name: '高脚杯深蹲', role: '股四头', sets: 3, reps: 15, rpe: 9, progression: '动作连贯、张力在腿上；足背屈受限则降低坐幅'},
        {name: '杠铃罗马尼亚硬拉', role: '腘绳/臀', sets: 3, reps: 15, rpe: 9, progression: '杠铃只放到膝盖位，瓦式呼吸，杠铃贴腿'},
        {name: '山羊挺身', role: '竖脊肌', sets: 3, reps: 8, rpe: 9, progression: '膝盖不锁死，上身保持一体'}
      ]
    }
  },

  /** 每个模板的建议动作（P1 板书），用户没有历史时用它给出可执行建议。 */
  moves: {
    push: [
      {name: '平板杠铃卧推', role: '主项', reps: 6, sets: 3},
      {name: '哑铃上斜卧推', role: '上胸', reps: 10, sets: 3},
      {name: '双杠臂屈伸', role: '下胸/三头', reps: 8, sets: 3},
      {name: '仰卧曲柄臂屈伸', role: '三头长头', reps: 10, sets: 3},
      {name: 'Y 字侧平举', role: '中束', reps: 15, sets: 3}
    ],
    pull: [
      {name: '单手钢线下拉', role: '背阔', reps: 10, sets: 3},
      {name: '对握高位下拉', role: '背阔上部', reps: 8, sets: 3},
      {name: '单手器械划船', role: '水平拉', reps: 10, sets: 3},
      {name: '海豹划船', role: '中下斜方', reps: 12, sets: 3},
      {name: '坐姿钢线弯举', role: '二头', reps: 12, sets: 3}
    ],
    legs: [
      {name: '单腿哑铃硬拉', role: '单侧髋稳定', reps: 8, sets: 3},
      {name: '保加利亚分腿蹲', role: '单腿超负荷', reps: 10, sets: 3},
      {name: '颈前深蹲', role: '股四头', reps: 8, sets: 3},
      {name: '罗马尼亚硬拉', role: '后侧链', reps: 8, sets: 3},
      {name: '山羊挺身', role: '竖脊肌', reps: 12, sets: 3}
    ],
    other: []
  },

  /** 主题索引，供「建议库」界面分组。 */
  topics: ['训练结构', '强度控制', '渐进方式', '恢复节奏', '动作选择', '有氧', '减脂执行', '饮食配合'],

  rules: [
    // ---------------- 拉伸与热身（P3，已核验标题/时长） ----------------
    {
      id: 'stretch-after-training',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'stretch'],
      claim: '训练后做 8~12 分钟全身拉伸（每部位 30~45 秒），缓解酸痛、恢复活动度；ALEX 频道有 12 分钟全身拉伸与腿部深度拉伸两套跟练。',
      source: 'alex-channel',
      confidence: '中高（标题/时长已核验）',
      video: {"bvid":"BV1rh4Ne3Evt","title":"12分钟全身拉伸｜缓解酸痛","seconds":742},
      plan: {minutes: [8, 12], perStretchSec: [30, 45]}
    },
    {
      id: 'foam-roll-legs',
      topic: '恢复节奏',
      tags: ['legs', 'recovery', 'stretch'],
      claim: '臀腿用泡沫轴放松约 7 分钟，重点在臀中肌、股四头外侧与腘绳肌；滚错位置（直接滚膝窝、腰椎）反而有害。',
      source: 'alex-channel',
      confidence: '中（标题已核验，细节未逐字）',
      video: {"bvid":"BV1MFzhBwE1B","title":"泡沫轴滚腿：正确臀腿放松教学","seconds":422},
      plan: {minutes: [5, 8]}
    },
    {
      id: 'desk-neck-release',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'desk'],
      claim: '久坐者每天 8 分钟肩颈放松（含胸小肌、上斜方与胸椎伸展），能缓解圆肩与久坐腰背不适。',
      source: 'alex-channel',
      confidence: '中低（标题已核验，细节未逐字）',
      plan: {minutes: [8, 9]}
    },

    // ---------------- 训练结构（P1） ----------------
    {
      id: 'split-3-rationale',
      topic: '训练结构',
      tags: ['general', 'frequency'],
      claim: '自然训练者单次肌蛋白合成窗口约 24~48 小时，五分化让每个部位空转 6~7 天；三分化把每部位频率提到每周 1.5~2 次，单次只需 6~10 组高质量正式组。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      video: {"bvid":"BV1FcdZBNEm3","title":"凯圣王-谭成义三分化①——训练计划","seconds":1290},
      plan: {sessionsPerWeek: [3, 6], setsPerSessionPerMuscle: [6, 10]}
    },
    {
      id: 'volume-cap',
      topic: '训练结构',
      tags: ['general', 'volume'],
      claim: '单次单部位 20+ 组的大容量容易堆积神经疲劳与软组织慢性炎症；6~10 组高质量正式组就够。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      plan: {maxSetsPerMusclePerSession: 12}
    },
    {
      id: 'beginner-order',
      topic: '训练结构',
      tags: ['general', 'beginner'],
      claim: '新手先练动作质量与频率（每周 3 次全身或直接三分化），把加重留到动作稳定之后。',
      source: 'ksw-channel',
      confidence: '中',
      plan: {sessionsPerWeek: [3, 3]}
    },

    // ---------------- 强度控制（P1） ----------------
    {
      id: 'main-lift-rpe8',
      topic: '强度控制',
      tags: ['push', 'pull', 'legs', 'main'],
      claim: '大重量复合主项（卧推/深蹲/硬拉）守 RPE 8、留约 2 次余量，严禁力竭：大负荷首下已募集全部快肌，力竭只会让中枢神经需要数天恢复。',
      source: 'ksw-tcy-3split',
      confidence: '高',
      video: {"bvid":"BV1FcdZBNEm3","title":"三分化①——训练计划（RPE 与力竭部分）","seconds":1290},
      plan: {rpe: 8, repsLeft: 2}
    },
    {
      id: 'isolation-failure',
      topic: '强度控制',
      tags: ['push', 'pull', 'legs', 'isolation'],
      claim: '轻负荷单关节（侧平举、下压、弯举，约 30%~50% 1RM）应接近或达到力竭，可用休息停顿（如 10+10、10+5），否则高门槛运动单位不参与。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      video: {"bvid":"BV1CSoKBaEgK","title":"三分化②——跟练胸肩三头","seconds":5051},
      plan: {isolationToFailure: true}
    },
    {
      id: 'rest-heavy',
      topic: '强度控制',
      tags: ['main'],
      claim: '大重量主项组间休息 3~5 分钟，保证下一组在最高神经募集度下完成。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      plan: {restSec: [180, 300]}
    },

    // ---------------- 渐进（P1） ----------------
    {
      id: 'progress-ladder',
      topic: '渐进方式',
      tags: ['main', 'progression'],
      claim: '主项用「容量→强度」阶梯：15/12/10/8（RPE 8）→ 15/8/8/8 → 4×8 → 2×6 → 3×6 → 4×6 → 2×5 → 3×5 → 4×5；每周只动一个变量。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      video: {"bvid":"BV1FcdZBNEm3","title":"三分化①——训练计划（进阶阶梯）","seconds":1290},
      plan: {ladder: [[15, 12, 10, 8], [15, 8, 8, 8], [8, 8, 8, 8], [6, 6], [6, 6, 6], [6, 6, 6, 6], [5, 5], [5, 5, 5], [5, 5, 5, 5]]}
    },
    {
      id: 'deload-rule',
      topic: '渐进方式',
      tags: ['general', 'deload'],
      claim: '连续 4~6 周或负荷比（ACWR）超过 1.5 时减载一周：负重 ×0.9、组数 −1，主项仍守 RPE 8。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      plan: {loadFactor: 0.9, setDelta: -1}
    },

    // ---------------- 恢复（P1） ----------------
    {
      id: 'no-four-days',
      topic: '恢复节奏',
      tags: ['general', 'recovery'],
      claim: '不推荐连练 4 天；工作压力大、睡眠差时「练 2 休 1」完全合理，休息不是偷懒。',
      source: 'ksw-tcy-3split',
      confidence: '中',
      plan: {maxConsecutiveDays: 3}
    },
    {
      id: 'fatigue-monitor',
      topic: '恢复节奏',
      tags: ['general', 'recovery'],
      claim: '晨脉比个人基线高 5~10 bpm，或握力明显低于基线，提示神经/身体未恢复，应减载或休息。',
      source: 'ksw-tcy-3split',
      confidence: '中',
      plan: {signals: ['晨脉 +5~10 bpm', '握力低于基线']}
    },

    // ---------------- 动作选择（P1） ----------------
    {
      id: 'push-no-overhead',
      topic: '动作选择',
      tags: ['push'],
      claim: '推日已有卧推、上斜、双杠对前束与肘的压迫，不再叠加大量推肩；改 Y 字侧平举在肩胛冈平面练中束。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      plan: {avoid: ['大重量推肩']}
    },
    {
      id: 'pull-trap-balance',
      topic: '动作选择',
      tags: ['pull'],
      claim: '推日多了容易含胸；拉日用海豹划船、坐姿开肘划船专练中下斜方与菱形肌，拮抗推日的胸椎屈曲。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      video: {"bvid":"BV1v5opBhEDc","title":"三分化④——跟练背三角肩后束二头","seconds":5049},
      plan: {prefer: ['海豹划船', '坐姿开肘划船']}
    },
    {
      id: 'leg-front-squat',
      topic: '动作选择',
      tags: ['legs'],
      claim: '踝背屈受限者做后蹲容易弓背、骨盆眨眼；颈前深蹲强制躯干直立，更安全地练股四头。',
      source: 'ksw-tcy-3split',
      confidence: '中高',
      video: {"bvid":"BV17aovBqEdg","title":"三分化⑤——跟练腿股四头肌腘绳肌","seconds":3489},
      plan: {prefer: ['颈前深蹲']}
    },
    {
      id: 'bench-screen',
      topic: '动作选择',
      tags: ['push'],
      claim: '卧推不只练力量，也是筛查：做不到触胸、触胸前肩前扣，往往暴露胸椎活动度、肩胛后缩或肱骨前顶问题。',
      source: 'ksw-tcy-3split',
      confidence: '中',
      plan: {screening: true}
    },

    // ---------------- 解剖基础（A 级，好人松松第 1 集 ASR） ----------------
    {
      id: 'joint-motion-map',
      topic: '解剖基础',
      tags: ['general', 'anatomy', 'warmup'],
      claim: '健身只涉及 6 个关节（肩、肘、髋、膝、踝、肩胛胸壁）和 3 个运动面；动作↔关节活动↔肌肉是一一映射，几十上百个动作实质是十来种关节活动的组合。',
      source: 'asr-transcript',
      confidence: '高（本人口述 05:28~06:40）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '05:28'},
      plan: {joints: 6, planes: 3}
    },
    {
      id: 'judge-by-resistance-phase',
      topic: '解剖基础',
      tags: ['general', 'anatomy'],
      claim: '判断一个动作属于哪种关节活动，要看「克服阻力」的阶段（通常是抬起阶段），不是下落阶段——下落时配重反而在帮大臂加速。',
      source: 'asr-transcript',
      confidence: '高（本人口述 08:06~08:36）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '08:06'},
      plan: {phase: 'concentric'}
    },
    {
      id: 'bench-grip-decides-motion',
      topic: '动作细节',
      tags: ['push', 'anatomy'],
      claim: '卧推握距决定它练的是哪种关节活动：窄握（大臂在矢状面）= 肩屈，主要前束+上胸；宽握 = 大臂外展位/水平内收，更偏胸；所以「卧推练多少肩屈」取决于握距与开肘大小。',
      source: 'asr-transcript',
      confidence: '高（本人口述 08:42~09:12）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '08:42'},
      plan: {narrow: 'shoulder-flexion', wide: 'horizontal-adduction'}
    },
    {
      id: 'shoulder-flexion-muscles',
      topic: '解剖基础',
      tags: ['push', 'anatomy'],
      claim: '肩屈的主要贡献者是前束（拉力线最接近矢状面），上胸次之；肱二头肌虽在矢状面但属双关节肌，受「节约法则」影响参与有限；不要以为整块胸大肌都参与肩屈，只有上胸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 09:19~10:13）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '09:19'},
      plan: {primary: ['前束'], secondary: ['上胸'], limited: ['肱二头肌']}
    },

    // ---------------- 练胸（A 级，好人松松第 2 集 ASR） ----------------
    {
      id: 'elbow-angle-selects-chest',
      topic: '动作细节',
      tags: ['push', 'anatomy'],
      claim: '开肘角度决定推胸/夹胸练上胸还是中胸：开肘越大，胸的受力指点越高、水平拉力线越高，越偏上胸；开肘越小，受力点下移落到中胸——很多人以为在上斜板练上胸，其实开肘不够大，练的还是中胸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 15:45~16:25）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '15:45'},
      plan: {moreElbowFlare: 'upper-chest', lessElbowFlare: 'mid-chest'}
    },
    {
      id: 'fake-decline-habit',
      topic: '动作细节',
      tags: ['push'],
      claim: '「人造下斜板」：坐姿动作把屁股往前挪、或刻意狠狠挺胸，会让躯干下斜化，大臂变成斜下运动，训练部位整体下移——这是上斜变成中下胸最常见的原因。',
      source: 'asr-transcript',
      confidence: '高（本人口述 16:25~16:51）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '16:25'},
      plan: {avoid: ['屁股前移', '过度挺胸']}
    },
    {
      id: 'dips-serratus',
      topic: '动作细节',
      tags: ['push'],
      claim: '双杠臂屈伸是推类动作里最能练前锯肌的：它没有靠背限制肩胛，推出阶段肩胛前移最明显；但难度大，新手不必执着。',
      source: 'asr-transcript',
      confidence: '高（本人口述 57:19~58:02）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '57:19'},
      plan: {target: '前锯肌', beginnerFriendly: false}
    },

    // ---------------- 练肩（A 级，好人松松第 3 集 ASR） ----------------
    {
      id: 'lateral-raise-elbow-bend',
      topic: '动作细节',
      tags: ['shoulder'],
      claim: '侧平举可以曲肘：曲肘能缩短力臂、降低肩关节力矩，是「举不动」时最直接的调整，比甩腰借力安全。',
      source: 'asr-transcript',
      confidence: '高（本人口述 32:08~32:26）',
      evidence: {bvid: 'BV167LAzaE14', at: '32:08'},
      plan: {cue: '曲肘缩短力臂'}
    },
    {
      id: 'upper-trap-participates',
      topic: '动作细节',
      tags: ['shoulder'],
      claim: '正确的侧平举一定有上斜方参与，练完上斜方酸痛不代表动作错；中束最大力臂出现在肩外展 0~90° 区间。',
      source: 'asr-transcript',
      confidence: '高（本人口述 29:20~29:42、36:54）',
      evidence: {bvid: 'BV167LAzaE14', at: '29:20'},
      plan: {abductionRange: [0, 90]}
    },
    {
      id: 'rear-delt-row-must-flare',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '用开肘划船练后束必须开肘到近乎水平，半开肘甚至假肘都练不到：水平外展才是后束的关节活动。',
      source: 'asr-transcript',
      confidence: '高（本人口述 54:11~56:19）',
      evidence: {bvid: 'BV167LAzaE14', at: '54:11'},
      plan: {elbowFlare: 'horizontal'}
    },
    {
      id: 'scapular-retraction-error',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '划船时过度肩胛后缩是常见错误——它把「肩胛骨后缩」当成了发力，掩盖了肩水平外展；可以刻意做一点肩胛前引来抑制过度后缩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:02~50:40）',
      evidence: {bvid: 'BV167LAzaE14', at: '50:02'},
      plan: {avoid: '过度肩胛后缩', cue: '肩胛前引抑制'}
    },

    // ---------------- 练背（A 级，好人松松第 4 集 ASR） ----------------
    {
      id: 'traps-grow-by-retraction',
      topic: '动作细节',
      tags: ['pull', 'anatomy'],
      claim: '中斜方与下斜方都要靠「肩胛骨后缩」来练肌肥大：下斜方虽然也能让肩胛下沉（引体/下拉的起始），但那只算激活、不算肌肥大动作；真正的动作是大开手划船配合刻意的前伸→后缩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:22~51:43）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '50:22'},
      plan: {movement: 'scapular-retraction', example: '大开手划船'}
    },
    {
      id: 'row-scapula-depends-on-goal',
      topic: '动作细节',
      tags: ['pull'],
      claim: '开手划船要不要刻意动肩胛，取决于目标：只练背阔与大圆肌就保持肩胛稳定；想兼练中下斜方就做前伸→后缩——两种说法都对，看你要什么。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:39~51:00）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '50:39'},
      plan: {stable: 'lats', retract: 'mid-lower-traps'}
    },
    {
      id: 'teres-major-is-small-lat',
      topic: '解剖基础',
      tags: ['pull', 'anatomy'],
      claim: '大圆肌又被称作「小背阔肌」：关节活动与背阔一样，肩伸前半程对它有利、后半程不利，所以仰卧上拉这类前半程肩伸动作对大圆肌更有效。',
      source: 'asr-transcript',
      confidence: '高（本人口述 15:01~15:26、23:41~24:54）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '15:01'},
      plan: {alias: '小背阔肌', effectiveRange: 'early-shoulder-extension'}
    },
    {
      id: 'scapular-depression-before-pull',
      topic: '动作细节',
      tags: ['pull', 'warmup'],
      claim: '引体/下拉在克服阻力阶段先让肩胛骨下沉，再拉大臂；这一步主要激活下斜方，是热身与动作启动的要点，但不能替代中下斜方的增肌训练。',
      source: 'asr-transcript',
      confidence: '高（本人口述 51:02~51:22）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '51:02'},
      plan: {step: 'scapular-depression-first'}
    },

    // ---------------- 手臂与腹肌（A 级，好人松松第 5 集 ASR） ----------------
    {
      id: 'biceps-long-head-dual-joint',
      topic: '动作细节',
      tags: ['isolation', 'arm'],
      claim: '肱二头长头是跨越肩与肘的双关节肌：只有上臂处在身体前方时，长头才有前后关系、才能在屈肘之外参与肩伸；上臂贴在体侧时它不参与肩伸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 33:13~33:55）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '33:13'},
      plan: {joints: ['肩', '肘'], position: 'arm-in-front'}
    },
    {
      id: 'long-head-stretch-myth',
      topic: '强度控制',
      tags: ['isolation', 'arm'],
      claim: '「在过头位或身后位拉长三头长头、让它继续收缩就能更好增肌」——作者本人明确表示存疑：缺乏循证研究，很可能不成立，不应作为训练依据。',
      source: 'asr-transcript',
      confidence: '高（本人口述 40:23~41:11，作者存疑）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '40:23'},
      plan: {status: 'unproven'}
    },
    {
      id: 'triceps-heads-crossing',
      topic: '解剖基础',
      tags: ['isolation', 'arm', 'anatomy'],
      claim: '肱三头分长头、外侧头、内侧头：长头起于肩胛骨、跨肩与肘，外侧头与内侧头只跨肘——所以只做体侧下压，长头的肩伸部分基本不参与。',
      source: 'asr-transcript',
      confidence: '高（本人口述 35:27~36:23、41:00）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '35:27'},
      plan: {heads: 3, crossing: ['long']}
    },
    {
      id: 'abs-blocks-are-genetic',
      topic: '解剖基础',
      tags: ['abs', 'anatomy'],
      claim: '腹直肌的腱划有 2 条、3 条或 4 条，取决于基因，决定了你是四块、六块还是八块腹肌——训练只能让腹肌变厚、变清晰，不能增加块数。',
      source: 'asr-transcript',
      confidence: '高（本人口述 63:32~63:40）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '63:32'},
      plan: {blocks: 'genetic'}
    },

    // ---------------- 成人肥胖食养指南（A 级，国家卫健委 2024） ----------------
    {
      id: 'cswz-energy-deficit',
      topic: '减脂执行',
      tags: ['general', 'fatloss', 'deficit'],
      claim: '肥胖食养指南的缺口口径：每日能量比需要量降低 30%~50%，或降 500~1000 kcal；限能量平衡膳食为男 1200~1500、女 1000~1200 kcal；也可按理想体重 ×15~35 kcal/kg 计算。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则一'},
      plan: {deficitPercent: [30, 50], deficitKcal: [500, 1000], floorKcal: {male: [1200, 1500], female: [1000, 1200]}}
    },
    {
      id: 'cswz-scope-vs-app-floor',
      topic: '减脂执行',
      tags: ['general', 'fatloss', 'rules'],
      claim: '那条 1000~1500 kcal 的下限只针对 BMI≥24 的超重/肥胖患者；体重 64.6 kg、BMI 正常的薄肌用户套用它会把摄入压到基础代谢以下。本 App 因此保留 2,000 kcal 底线，并靠「提高维持热量」而不是降底线来加快进度。',
      source: 'cswz-2024',
      confidence: '高（指南适用人群 + App 口径）',
      citation: {org: '国家卫健委', year: 2024, section: '适用人群'},
      plan: {appliesTo: 'BMI>=24', appFloor: 2000}
    },
    {
      id: 'cswz-macro-split',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '三大营养素供能比：脂肪 20%~30%、蛋白 15%~20%、碳水 50%~60%；三餐按 3:4:3 分配。对 64.6 kg 的人，蛋白 15%~20% 约等于 108~144 g，与本 App 的 142~155 g 基本对齐。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则一'},
      plan: {fatPercent: [20, 30], proteinPercent: [15, 20], carbPercent: [50, 60], meals: '3:4:3'}
    },
    {
      id: 'cswz-loss-rate',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '理想减重目标：6 个月内减当前体重的 5%~10%；合理速度每月 2~4 kg；平稳下降每周 0.5~1 kg；起始目标建议每周约 0.5 kg。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则六'},
      plan: {sixMonthPercent: [5, 10], monthlyKg: [2, 4], weeklyKg: [0.5, 1], startWeeklyKg: 0.5}
    },
    {
      id: 'cswz-activity-dose',
      topic: '有氧',
      tags: ['general', 'cardio', 'frequency'],
      claim: '减重运动处方：每周 150~300 分钟中等强度有氧、5~7 天、至少隔天一次；抗阻每周 2~3 天、隔天一次、每次 10~20 分钟；每周运动消耗目标 ≥2000 kcal；静坐时间控制在每天 2~4 小时内。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则四'},
      plan: {cardioMinutes: [150, 300], resistanceDays: [2, 3], weeksKcal: 2000, sittingHours: [2, 4]}
    },
    {
      id: 'cswz-sleep-seven-23',
      topic: '恢复节奏',
      tags: ['general', 'sleep', 'fatloss'],
      claim: '经常熬夜、睡眠不足会引起内分泌紊乱与脂肪代谢异常，增加「过劳肥」风险；建议每日约 7 小时睡眠、尽量在 23 点前上床。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则四'},
      plan: {hours: 7, bedtime: '23:00'}
    },
    {
      id: 'cswz-food-portions',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: '减重期食物份量：谷薯 150~300 g（全谷杂豆 50~150、薯 50~100）；蔬菜 300~500 g（深色 ≥1/2）；水果约 200 g；水产每周 2 次或 280~525 g；畜禽每周 ≤500 g；蛋每周 280~350 g；低脂奶 300~500 ml；大豆 15~25 g；坚果每日约 10 g。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食物选择'},
      plan: {grainG: [150, 300], vegG: [300, 500], fruitG: 200, fishWeeklyG: [280, 525], meatWeeklyMaxG: 500, eggWeeklyG: [280, 350], dairyMl: [300, 500], soyG: [15, 25], nutsDailyG: 10}
    },
    {
      id: 'cswz-meal-order',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '进餐顺序按「蔬菜 → 肉类 → 主食」有助于减少高能量食物摄入；细嚼慢咽、定时定量、晚餐 17:00~19:00、晚餐后不再进食（可饮水）。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则三'},
      plan: {order: ['蔬菜', '肉类', '主食'], dinnerWindow: ['17:00', '19:00']}
    },
    {
      id: 'cswz-oil-salt-tight',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '减重期比一般人群更严：烹调油 ≤20~25 g/天、盐 ≤5 g/天、添加糖最好 <25 g/天；蒸煮熘与水滑优先，少油煎炸。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则二'},
      plan: {oilG: [20, 25], saltG: 5, addedSugarG: 25}
    },
    {
      id: 'cswz-alcohol-cost',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '酒精约 7 kcal/g，且几乎不含其他营养素；减重期应严格限制饮酒——一顿酒很容易吃掉几百千卡而不带来饱腹感。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则二'},
      plan: {kcalPerGram: 7}
    },

    // ---------------- 中国居民膳食指南（A 级，官方八准则） ----------------
    {
      id: 'cdg-salt-oil-sugar',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: 'CDG 2022：盐 ≤5 g/天、烹调油 25~30 g/天、添加糖 ≤50 g（最好 <25 g）、反式脂肪 ≤2 g、酒精 ≤15 g。这组数字比「少吃油盐」更可执行，可直接当每日上限。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则五'},
      plan: {saltG: 5, oilG: [25, 30], addedSugarG: [0, 50], transFatG: 2, alcoholG: 15}
    },
    {
      id: 'cdg-veg-fruit-dairy',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: 'CDG 2022：蔬菜 ≥300 g/天（深色占一半）、水果 200~350 g/天、奶及奶制品 ≥300 ml/天；果汁不能替代鲜果。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则三'},
      plan: {vegG: 300, darkVegHalf: true, fruitG: [200, 350], dairyMl: 300}
    },
    {
      id: 'cdg-protein-foods',
      topic: '饮食配合',
      tags: ['general', 'protein', 'diet'],
      claim: 'CDG 2022：鱼禽蛋瘦肉平均每天 120~200 g；每周鱼 2 次或 300~500 g、蛋 300~350 g、畜禽肉 300~500 g；鸡蛋不要弃蛋黄，少吃深加工肉制品。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则四'},
      plan: {dailyG: [120, 200], fishWeeklyG: [300, 500], eggWeeklyG: [300, 350]}
    },
    {
      id: 'cdg-staple-variety',
      topic: '饮食配合',
      tags: ['general', 'carb', 'diet'],
      claim: 'CDG 2022：谷类 200~300 g/天（全谷物与杂豆 50~150 g、薯类 50~100 g）；平均每天 12 种以上食物、每周 25 种以上。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则一'},
      plan: {grainG: [200, 300], wholeGrainG: [50, 150], tuberG: [50, 100], dailyFoods: 12, weeklyFoods: 25}
    },
    {
      id: 'cdg-activity-week',
      topic: '训练结构',
      tags: ['general', 'cardio', 'frequency'],
      claim: 'CDG 2022：每周至少 5 天中等强度活动、累计 ≥150 分钟；抗阻训练每周 2~3 天；主动身体活动最好每天 6000 步。这与「每周 3~5 练」并不冲突——150 分钟是底线，不是上限。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则二'},
      plan: {moderateMinutes: 150, resistanceDays: [2, 3], steps: 6000}
    },
    {
      id: 'cdg-water',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: 'CDG 2022：温和气候、低活动水平下，成年男性每天饮水 1700 ml、女性 1500 ml；少量多次，白水或茶优先，不用含糖饮料代替水。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则六'},
      plan: {waterMl: {male: 1700, female: 1500}}
    },
    {
      id: 'cdg-eating-out',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: 'CDG 2022 明确「在外就餐不忘适量与平衡」：食堂与外卖场景不是例外，先定份量与蛋白质，再选烹调方式（蒸煮炖优先、少油炸）。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则七'},
      plan: {contexts: ['canteen', 'takeout']}
    },
    {
      id: 'cdg-oil-fits-fat-floor',
      topic: '饮食配合',
      tags: ['general', 'fat', 'rules'],
      claim: 'CDG 的 25~30 g 烹调油本身已占本 App 脂肪下限（55 g）的一半左右，剩下由蛋、奶、肉、坚果补足——所以「脂肪 55~70 g」在膳食指南框架内是自洽的，不需要再压低。',
      source: 'cdg-2022',
      confidence: '高（据指南准则五推算）',
      citation: {org: '中国营养学会', year: 2022, section: '准则五'},
      plan: {oilG: [25, 30], fatFloorG: 55}
    },
    {
      id: 'csr-average-seven-four',
      topic: '恢复节奏',
      tags: ['general', 'sleep'],
      claim: '《中国睡眠研究报告2023》：2022 年国人平均每晚睡 7.40 小时，47.55% 不足 8 小时、16.79% 不足 7 小时——也就是说「7 小时」对近两成人已是上限，App 把 7 小时设为提醒下限是贴合现实的。',
      source: 'csr-2023',
      confidence: '中高（抽样调查公开数据）',
      citation: {org: '中国睡眠研究会', year: 2023},
      plan: {meanHours: 7.4, under8Percent: 47.55, under7Percent: 16.79}
    },

    // ---------------- 指南考据（A 级：ISSN / Helms / AASM） ----------------
    {
      id: 'protein-general-range',
      topic: '饮食配合',
      tags: ['general', 'protein'],
      claim: 'ISSN 立场声明：多数训练者的日常蛋白 1.4~2.0 g/kg 已足够增肌与维持；本 App 薄肌模式的 2.2~2.4 g/kg 落在更高一档，属于「减脂期保肌」而不是超标。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #2'},
      plan: {generalRange: [1.4, 2.0], appRange: [2.2, 2.4]}
    },
    {
      id: 'protein-deficit-range',
      topic: '饮食配合',
      tags: ['general', 'protein', 'deficit'],
      claim: '热量缺口期，抗阻训练者把蛋白提到 2.3~3.1 g/kg/d 更有利于保住瘦体重；缺口越大、训练年限越长，越应靠近上限。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #3'},
      plan: {deficitRange: [2.3, 3.1]}
    },
    {
      id: 'protein-per-meal',
      topic: '饮食配合',
      tags: ['general', 'protein'],
      claim: '单餐蛋白目标：0.25 g/kg 体重，或绝对量 20~40 g；一天分 3~4 餐、每 3~4 小时一次，比集中一餐更利于合成。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #5, #7'},
      plan: {perMealPerKg: 0.25, perMealG: [20, 40], spreadHours: [3, 4]}
    },
    {
      id: 'pre-sleep-protein',
      topic: '饮食配合',
      tags: ['general', 'protein', 'sleep'],
      claim: '睡前 30~40 g 缓释蛋白（酪蛋白）可提高夜间合成，且不影响脂肪分解；睡前那餐可以留给它。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #14'},
      plan: {grams: [30, 40], type: 'casein'}
    },
    {
      id: 'sleep-duration-consensus',
      topic: '恢复节奏',
      tags: ['general', 'sleep', 'recovery'],
      claim: '成人每晚 7 小时以上是共识下限；长期不足与食欲上升、代谢变差和训练表现下降相关，减脂期尤其不该拿睡眠换时间。',
      source: 'aasm-2015',
      confidence: '中高（学会共识结论）',
      citation: {org: 'AASM/SRS', year: 2015},
      plan: {minHours: 7, targetHours: [7, 9]}
    },
    {
      id: 'sleep-drives-appetite',
      topic: '减脂执行',
      tags: ['general', 'sleep', 'fatloss'],
      claim: '睡眠不足会让饥饿感与食欲上升，缺口很容易被无意识进食吃掉；此时先修睡眠，比再砍 100 kcal 更有效。',
      source: 'aasm-2015',
      confidence: '中（共识结论的方向性表述）',
      citation: {org: 'AASM/SRS', year: 2015},
      plan: {fixSleepFirst: true}
    },
    {
      id: 'tdee-formula-error',
      topic: '减脂执行',
      tags: ['general', 'deficit', 'rules'],
      claim: '用公式预测维持热量天生有误差（个体差异可达 10%~20%），所以不要迷信算出来的数字：用连续 2 周体重均值反推真实维持热量，再决定缺口。',
      source: 'helms-2014',
      confidence: '中高（综述通识 + App 口径）',
      citation: {org: 'Helms et al.', year: 2014},
      plan: {formulaErrorPercent: [10, 20], calibrateWeeks: 2}
    },
    {
      id: 'deficit-preserves-lean',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '保住瘦体重的三件事：缺口别太大、蛋白拉高、抗阻训练保留；三者缺一，掉的就可能不只是脂肪。',
      source: 'helms-2014',
      confidence: '中高（综述要点）',
      citation: {org: 'Helms et al.', year: 2014},
      plan: {keep: ['moderate-deficit', 'high-protein', 'resistance-training']}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------
    {
      id: 'abs-endurance-training',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌是耐力型肌群，一周练 4~5 次都没问题；体脂低但腹肌薄、浅说明只减脂没练腹肌，必须刻意练。',
      source: 'asr-transcript',
      confidence: '高（本人口述 00:31）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '00:31'},
      plan: {sessionsPerWeek: [4, 5]}
    },
    {
      id: 'abs-two-moves-detail',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌只安排两个动作：悬垂举腿（身体撑起让腹肌预收缩，下放不要到底，抬得高，可加旋转）与反向山羊挺身（反过来面朝上，大腿后侧用力抵垫子保持骨盆稳定，只做上下不卷腹）；不推荐卷腹，对结构影响大、前侧易紧张。',
      source: 'asr-transcript',
      confidence: '高（本人口述 03:26~07:41）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '03:26'},
      plan: {moves: ['悬垂举腿', '反向山羊挺身'], avoid: ['卷腹']}
    },
    {
      id: 'abs-stretch-before',
      topic: '动作细节',
      tags: ['general', 'abs', 'warmup'],
      claim: '练腹前先做海豹式拉伸 4 组、每组约 20 秒：双手撑在肋骨两侧，深吸气把气维持在腹腔再后仰，用呼吸对抗；气一松腰的压力就大了。',
      source: 'asr-transcript',
      confidence: '高（本人口述 01:07~02:50）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '01:07'},
      plan: {sets: 4, seconds: 20}
    },
    {
      id: 'lateral-raise-partial',
      topic: '动作细节',
      tags: ['push', 'shoulder'],
      claim: '侧平举下放只到全程的 2/3，不要放到底——放到底张力就松了；同时肋骨收住、腰背贴凳、头颈稳定，否则练的是腰不是肩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 02:08~02:19）',
      evidence: {bvid: 'BV1utntzhE9a', at: '02:08'},
      plan: {rangeOfMotion: '2/3'}
    },
    {
      id: 'rear-delt-neutral-grip',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '俯身哑铃飞鸟用对握、重量偏轻，从外展位开始、胸口抵凳：对握能保住中束与后束之间的形态完整性，正握虽然更孤立但会让那个「坑」变大。',
      source: 'asr-transcript',
      confidence: '高（本人口述 03:16~03:44）',
      evidence: {bvid: 'BV1utntzhE9a', at: '03:16'},
      plan: {grip: 'neutral', start: 'abducted'}
    },
    {
      id: 'leg-warmup-six-moves',
      topic: '恢复节奏',
      tags: ['legs', 'warmup'],
      claim: '练腿前做 6 个激活动作、每边 45 秒：髋关节开合（膝盖尽量贴地）、内收肌（脚面相对）、前脚踝+后侧链（脚跟不离地）、髋激活（手指尖朝侧或后、膝盖伸直）、踝+大腿内侧（膝盖伸直、扭转到底）、踝背屈（身体前倾压脚踝、脚跟踩实）；深蹲时脚跟易抬高的人尤其要做最后一个。',
      source: 'asr-transcript',
      confidence: '高（本人逐动作讲解 00:25~04:56）',
      evidence: {bvid: 'BV1ncdUBGEbS', at: '00:25'},
      plan: {moves: 6, secondsPerSide: 45}
    },
    {
      id: 'rpe8-is-not-rm',
      topic: '强度控制',
      tags: ['main', 'progression'],
      claim: '计划里的 12/10/8 次不是 RM（力竭次数），而是每组留约 2 次余量（RPE 8）；递进顺序是 10 次改 8 次 → 12 次也改 8 次 → 3 组 8 次 → 4 组 8 次 → 2 组 6 次 → 3 组 6 次 → 4 组 6 次 → 2/3/4 组 5 次，全程 RPE 8。',
      source: 'asr-transcript',
      confidence: '高（本人口述 06:03~09:12）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '06:03'},
      plan: {rpe: 8, ladder: ['12→8', '3×8', '4×8', '2×6', '3×6', '4×6', '2×5', '3×5', '4×5']}
    },
    {
      id: 'compound-deload-not-failure',
      topic: '强度控制',
      tags: ['main'],
      claim: '强度大（约 75%~80% 1RM）的复合主项不做到力竭：第一下就募集到足够快肌纤维，力竭只会让神经「披露」（恢复不过来）；只有低强度、孤立动作才做到力竭。',
      source: 'asr-transcript',
      confidence: '高（本人口述 19:27~19:58）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '19:27'},
      plan: {failureOnlyForIsolation: true}
    },
    {
      id: 'no-five-day-split',
      topic: '训练结构',
      tags: ['general', 'beginner', 'frequency'],
      claim: '五分化不适合新手：频率太慢（同一部位隔 6~7 天），却要求单次强度很大，一般人做不到；三分化频率高、强度适中、可持续渐进。',
      source: 'asr-transcript',
      confidence: '高（本人口述 20:04~20:31）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '20:04'},
      plan: {avoid: 'five-day-split'}
    },
    {
      id: 'rest-by-signal-not-calendar',
      topic: '恢复节奏',
      tags: ['general', 'recovery'],
      claim: '三分化不等于「练三休一」：用晨脉、握力等信号监测，发现疲劳时哪怕只练了两天也休息；不推荐连练四天。',
      source: 'asr-transcript',
      confidence: '高（本人口述 20:34~21:12）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '20:34'},
      plan: {signals: ['晨脉', '握力']}
    },

    // ---------------- 日模板（P1 视频 + C 级整理图互证） ----------------
    {
      id: 'push-day-template',
      topic: '训练结构',
      tags: ['push'],
      claim: '推日按「杠铃卧推 → 哑铃上斜卧推 → 双杠臂屈伸 → 仰卧臂屈伸 → Y 字侧平举」排序：主项卧推守 RPE8（12/10/8），上斜 4×12 起，双杠与仰卧臂屈伸做力竭，侧平举用 10+10 休息停顿。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['卧推', '上斜哑铃卧推', '双杠臂屈伸', '仰卧臂屈伸', 'Y 字侧平举'], cuesFrom: 'BV1YgcdeqE7y'},
      video: {bvid: 'BV1CSoKBaEgK', title: '三分化②——跟练胸肩三头', seconds: 5051}
    },
    {
      id: 'pull-day-template',
      topic: '训练结构',
      tags: ['pull'],
      claim: '拉日按「单手钢线下拉 → 对握高位下拉 → 单手器械划船 → 坐姿开肘划船 → 钢线弯举」排序：前三个动作第 4 组做到力竭（RPE10），开肘划船练中下斜方与后束，弯举 3×12 收尾。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['单手钢线下拉', '对握高位下拉', '单手器械划船', '坐姿开肘划船', '钢线弯举'], cuesFrom: 'BV167LAzaE14'},
      video: {bvid: 'BV1v5opBhEDc', title: '三分化④——跟练背三角肩后束二头', seconds: 5049}
    },
    {
      id: 'legs-day-template',
      topic: '训练结构',
      tags: ['legs'],
      claim: '腿日按「单腿硬拉 → 单腿保加利亚蹲 → 高脚杯深蹲 → 杠铃罗马尼亚硬拉 → 山羊挺身」排序，全部 3 组、RPE9，以单侧稳定性与后侧链为主；热身先做动态青蛙趴、髋 90/90、脚踝激活与泡沫轴松解。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['单腿硬拉', '单腿保加利亚蹲', '高脚杯深蹲', '杠铃罗马尼亚硬拉', '山羊挺身'], cuesFrom: 'BV1ncdUBGEbS'},
      video: {bvid: 'BV17aovBqEdg', title: '三分化⑤——跟练腿股四头肌腘绳肌', seconds: 3489}
    },
    {
      id: 'rest-pause-isolation',
      topic: '强度控制',
      tags: ['push', 'pull', 'isolation'],
      claim: '单关节动作用「10+10 休息停顿」：做 10 次 → 组内歇 5 秒 → 再做到接近力竭；侧平举、下拉、划船都适合这种收尾方式。',
      source: 'community-digest',
      confidence: '中（整理图 + P1 力竭分区一致）',
      plan: {pattern: '10+10', intraRestSec: 5}
    },
    {
      id: 'warmup-legs-detailed',
      topic: '恢复节奏',
      tags: ['legs', 'warmup'],
      claim: '腿日热身按顺序做：动态青蛙趴（骨盆前倾/后倾对抗）→ 髋关节 90/90 → 脚踝激活（闭眼单侧平衡）→ 泡沫轴松解（胫骨前肌、小腿后侧、大腿前后、臀、阔筋膜张肌）→ 伟大者伸展；共 5 步，再上重量。',
      source: 'community-digest',
      confidence: '中（整理图）',
      plan: {steps: 5}
    },

    // ---------------- 解剖与框架（P2 好人松松，主题级证据） ----------------
    {
      id: 'joint-mobility-first',
      topic: '解剖基础',
      tags: ['general', 'anatomy'],
      claim: '先理解关节活动度再谈动作：《健身解剖完全手册》第1集讲关节活动，之后按胸/肩/背/手臂腹肌分集（单集 51~94 分钟），顺序本身就是「先关节、后部位」。',
      source: 'hrss-channel',
      confidence: '中（标题/时长已核验，内容未逐字）',
      video: {"bvid":"BV1mM6JY6Ei9","title":"健身解剖完全手册 第1集：关节活动","seconds":3098},
      plan: {order: ['关节活动', '胸', '肩', '背', '手臂腹肌']}
    },
    {
      id: 'beginner-framework',
      topic: '训练结构',
      tags: ['general', 'beginner'],
      claim: '新手先拿框架再抠细节：训练手册 56 分钟讲训练框架，饮食手册 110 分钟讲饮食框架，两者合计覆盖新手 90% 的问题。',
      source: 'hrss-channel',
      confidence: '中（标题/时长/播放量已核验）',
      video: {"bvid":"BV1Hk4y187jF","title":"健身新手的训练完全手册","seconds":3394},
      plan: {frameworkFirst: true}
    },
    {
      id: 'diet-template-first',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '饮食先有底表（热量与三大营养素的框架表），再谈具体食物；有了底表才能自己算方案，而不是照抄别人的餐单。',
      source: 'hrss-channel',
      confidence: '中（标题已核验）',
      video: {"bvid":"BV1yX4y1q7LP","title":"健身新手的饮食完全手册","seconds":6646},
      plan: {templateFirst: true}
    },
    {
      id: 'canteen-takeout',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '减脂可以吃食堂与外卖：关键是先定总热量与蛋白，再在可选范围里挑（少油版、加蛋白质、主食定量），不是只能吃水煮。',
      source: 'hrss-channel',
      confidence: '中（标题已核验）',
      video: {"bvid":"BV1794y1a7y4","title":"生活化减脂：从理论到案例 就吃食堂外卖","seconds":2847},
      plan: {contexts: ['canteen', 'takeout']}
    },
    {
      id: 'fatloss-playbook',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '减脂有完整处理顺序：先算维持热量与缺口，再定蛋白，再排训练，最后处理平台与依从性；《减肥减脂完全手册》54 分钟按这个顺序讲。',
      source: 'hrss-channel',
      confidence: '中（标题/时长已核验）',
      video: {"bvid":"BV1AM411r7z3","title":"健身新手的减肥减脂完全手册","seconds":3284},
      plan: {order: ['maintenance', 'deficit', 'protein', 'training', 'plateau']}
    },

    // ---------------- 单动作细节（P3 谭成义，主题级证据） ----------------
    {
      id: 'arm-isolation',
      topic: '动作细节',
      tags: ['pull', 'isolation'],
      claim: '手臂单独安排一集（9 分钟）：二头与三头分开练，用孤立动作补足复合动作的刺激缺口。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      video: {"bvid":"BV1hyWwzeETh","title":"手臂纯享版教学","seconds":565},
      plan: {split: ['biceps', 'triceps']}
    },
    {
      id: 'shoulder-two-parts',
      topic: '动作细节',
      tags: ['push', 'shoulder'],
      claim: '肩部分两集讲（5~6 分钟各一集），说明中束与后束需要单独安排，靠推举练不全。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      video: {"bvid":"BV1utntzhE9a","title":"非常详细的肩部教学","seconds":389},
      plan: {parts: ['lateral', 'rear']}
    },
    {
      id: 'abs-two-moves',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌只推荐两个动作（8 分钟）：与其堆十种花式，不如把两个动作做到有负荷、可渐进。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      video: {"bvid":"BV1Ehn7zmEHN","title":"最推荐的两个腹肌动作","seconds":473},
      plan: {moves: 2}
    },
    {
      id: 'breathing-recovery',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'breathing'],
      claim: '呼吸与恢复、神经状态直接决定训练表现：睡眠差或神经疲劳时，先调呼吸与休息，而不是加量。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      video: {"bvid":"BV1czHuzPExA","title":"训练中的呼吸与恢复、神经的作用","seconds":450},
      plan: {focus: ['breathing', 'recovery', 'cns']}
    },
    {
      id: 'solo-training',
      topic: '训练结构',
      tags: ['general', 'adherence'],
      claim: '一个人也能练：不需要搭子或社交压力，把计划拆成可独立完成的动作组即可长期坚持。',
      source: 'tcy-channel',
      confidence: '低（标题级）',
      plan: {solo: true}
    },

    // ---------------- 拉伸与热身（P5，标题/时长已用 B 站接口核验） ----------------

    // ---------------- 有氧（P3 + 通用） ----------------
    {
      id: 'warmup-legs',
      topic: '有氧',
      tags: ['legs', 'warmup'],
      claim: '练腿前先做 6~8 分钟动态拉伸与髋、踝、臀中肌激活，再上重量；ALEX 有专门一期「练腿前千万别直接上重量」（5 分 24 秒）。',
      source: 'alex-channel',
      confidence: '中高（标题/时长已核验）',
      video: {"bvid":"BV1ncdUBGEbS","title":"练腿前千万别直接上重量！这套热身太关键了","seconds":324},
      plan: {warmupMinutes: [6, 8]}
    },
    {
      id: 'cardio-supplement',
      topic: '有氧',
      tags: ['general', 'cardio'],
      claim: '减脂期的跟练有氧（30~40 分钟）是补充，不替代力量训练；力量优先保住肌肉，有氧只放大缺口。',
      source: 'alex-channel',
      confidence: '中低',
      plan: {cardioMinutes: [30, 40]}
    },
    {
      id: 'cardio-dose',
      topic: '有氧',
      tags: ['general', 'cardio'],
      claim: '有氧以每周 2~3 次、每次 30~40 分钟为起步，放在力量训练之后或非训练日；不空腹拉长有氧。',
      source: 'alex-channel',
      confidence: '中低',
      plan: {sessionsPerWeek: [2, 3], minutes: [30, 40]}
    },
    {
      id: 'neat-first',
      topic: '有氧',
      tags: ['general', 'cardio', 'deficit'],
      claim: '缺口不够时先提高日常活动（步数、通勤走动），再多砍热量会先掉训练表现与肌肉。',
      source: 'alex-channel',
      confidence: '中低',
      plan: {stepsTarget: [7000, 10000]}
    },

    // ---------------- 减脂执行（App 口径优先） ----------------
    {
      id: 'deficit-cap',
      topic: '减脂执行',
      tags: ['general', 'deficit', 'rules'],
      claim: '缺口不超过维持热量的 20%，摄入不得低于硬底线；这是 App 的硬口径，任何建议库内容都不得突破。',
      source: 'ksw-tcy-3split',
      confidence: '高（App 口径）',
      plan: {maxDeficitPercent: 20, floor: 2000}
    },
    {
      id: 'protein-preserve',
      topic: '减脂执行',
      tags: ['general', 'protein', 'rules'],
      claim: '减脂期蛋白保持 2.0~2.2 g/kg（薄肌模式 2.2~2.4），脂肪不低于下限；热量缺口只从碳水与油脂里让。',
      source: 'ksw-tcy-3split',
      confidence: '高（App 口径）',
      plan: {proteinPerKg: [2.0, 2.4], fatFloorG: 50}
    },
    {
      id: 'weekly-rate',
      topic: '减脂执行',
      tags: ['general', 'deficit'],
      claim: '每周下降约 0.4%~0.7% 体重（60~70 kg 约 0.3~0.5 kg）是可持续区间；更快通常意味着掉水和肌肉。',
      source: 'ksw-channel',
      confidence: '中',
      plan: {weeklyPercent: [0.4, 0.7]}
    },
    {
      id: 'plateau-check',
      topic: '减脂执行',
      tags: ['general', 'plateau'],
      claim: '平台期先查记录完整性（漏记、周末未记），再谈调整；确有平台再降 100~150 kcal 或加 1 次有氧，不要一次砍 500。',
      source: 'ksw-channel',
      confidence: '中',
      plan: {adjustKcal: [100, 150]}
    },
    {
      id: 'sleep-deficit',
      topic: '减脂执行',
      tags: ['general', 'sleep', 'deficit'],
      claim: '睡眠不足时饥饿感上升、训练表现下降；长期 <6 小时先修睡眠，再动热量，否则缺口会被无意识进食吃掉。',
      source: 'ksw-channel',
      confidence: '中',
      plan: {sleepTarget: [7, 9]}
    },

    // ---------------- 饮食配合（App 口径优先） ----------------
    {
      id: 'training-day-carb',
      topic: '饮食配合',
      tags: ['general', 'carb', 'rules'],
      claim: '训练日把碳水放在训练前后两餐，用当天上限（而非下限）安排；休息日收回碳水、蛋白不变。',
      source: 'ksw-tcy-3split',
      confidence: '高（App 口径）',
      plan: {trainingDay: 'upper-bound', restDay: 'lower-carb'}
    },
    {
      id: 'refeed-day',
      topic: '饮食配合',
      tags: ['general', 'refeed'],
      claim: '每 4~6 周安排 1 天回到维持热量（不是暴食），用于心理恢复与训练状态回升。',
      source: 'ksw-channel',
      confidence: '中低',
      plan: {everyWeeks: [4, 6]}
    },
    {
      id: 'meal-protein-spread',
      topic: '饮食配合',
      tags: ['general', 'protein'],
      claim: '蛋白分到 3~4 餐、每餐 30~40 g，比集中在一餐更利于保留肌肉。',
      source: 'ksw-channel',
      confidence: '中',
      plan: {perMealG: [30, 40]}
    }
  ]
};

/**
 * 2026-11-18 证据补录：训练编排与饮食要求的数字要有出处。
 * 追加在数据对象之后，不改原有条目（原有条目带社区口述来源，这批是期刊/学会立场）。
 * 与 docs/design/27-evidence-requirements.md 一一对应。
 */
window.TRAINING_PRINCIPLES.sources.push(
  {id: 'schoenfeld-2017', label: 'Schoenfeld, Ogborn & Krieger. Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis.', kind: '论文', ref: 'J Sports Sci 2017;35(11):1073-1082', via: 'DOI 10.1080/02640414.2016.1210197', url: 'https://doi.org/10.1080/02640414.2016.1210197', level: 'A（系统综述+元回归）', priority: 1},
  {id: 'baz-valle-2022', label: 'Baz-Valle et al. A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy.', kind: '论文', ref: 'J Hum Kinet 2022', via: 'PMID 35291645', url: 'https://europepmc.org/article/MED/35291645', level: 'A（系统综述）', priority: 1},
  {id: 'morton-2018', label: 'Morton et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength.', kind: '论文', ref: 'Br J Sports Med 2018;52:376-384', via: 'DOI 10.1136/bjsports-2017-097608', url: 'https://doi.org/10.1136/bjsports-2017-097608', level: 'A（系统综述+元回归）', priority: 1},
  {id: 'iraki-2019', label: 'Iraki, Fitschen, Espinar & Helms. Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review.', kind: '论文', ref: 'Sports (Basel) 2019;7(7):154', via: 'DOI 10.3390/sports7070154', url: 'https://doi.org/10.3390/sports7070154', level: 'B（叙述性综述）', priority: 1},
  {id: 'acsm-2026', label: 'ACSM Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.', kind: '立场声明', ref: 'Med Sci Sports Exerc（综述总览）', via: 'PMC12965823', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/', level: 'A（学会立场）', priority: 0}
);

window.TRAINING_PRINCIPLES.rules.push(
  {id: 'volume-dose-response', topic: '训练结构', tags: ['general', 'volume', 'hypertrophy'],
   claim: '每周每个肌群的正式组与肌肥大是剂量-反应关系：10 组/周以上优于更低量，20 组/周以内收益递减但有上限证据仍不明确；新手从 10~12 组起步，进阶再到 16~20 组。',
   source: 'schoenfeld-2017', confidence: '中高（元回归）', plan: {setsPerMusclePerWeek: [10, 20]}},
  {id: 'volume-high-vs-moderate', topic: '训练结构', tags: ['general', 'volume', 'hypertrophy'],
   claim: '高容量（约 18~20 组/周/肌群）在训练满一年以上的人群里，肌肥大略优于中等容量（约 12 组），但差异不大、疲劳更大；先把动作质量与恢复稳住再加量。',
   source: 'baz-valle-2022', confidence: '中（系统综述）', plan: {setsPerMusclePerWeek: [12, 20]}},
  {id: 'proximity-to-failure', topic: '强度控制', tags: ['general', 'intensity', 'rir'],
   claim: '增肌的关键是离力竭足够近（RIR 0~3），而不是绝对重量：同一次数范围内，越接近力竭刺激越足，但所有组都到力竭会拖慢恢复、影响后续训练量。',
   source: 'acsm-2026', confidence: '中高（综述总览）', plan: {rir: [0, 3], rirMainLift: [1, 2]}},
  {id: 'protein-in-deficit', topic: '饮食配合', tags: ['general', 'protein', 'cut'],
   claim: '热量缺口期蛋白要更高：按去脂体重 2.3~3.1 g/kg（多数人折算约 2.0~2.6 g/kg 体重），比维持期的 1.6~2.2 g/kg 更能保住肌肉。',
   source: 'morton-2018', confidence: '中高（元回归，缺口期结论部分外推）', plan: {proteinPerKg: [2.0, 2.6]}},
  {id: 'off-season-surplus', topic: '饮食配合', tags: ['general', 'gain', 'surplus'],
   claim: '增肌期用 10~20% 的温和盈余，体重每周涨 0.25~0.5%；涨得更快多半是多出来的脂肪，之后还要还。',
   source: 'iraki-2019', confidence: '中（叙述性综述）', plan: {surplusPercent: [10, 20], ratePctPerWeek: [0.25, 0.5]}}
);
