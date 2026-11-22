/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---------------------------------------------------------------------------------------------
  // 训练领域层（零 DOM）：动作规则、容量与负荷、重量记忆与渐进、周计划生成、训练库文案
  // 只做纯计算与本地存储读写；不碰 DOM、不发请求。视图与绑定在 60 / 68 / 70。
  // ---------------------------------------------------------------------------------------------

  const TRAINING_TEMPLATES = {push: '推', pull: '拉', legs: '腿', other: '其他'};

  /**
   * 自重动作（2026-11-18）：没有外部配重也能记，负重留空不算缺项。
   * 只按动作名判断，且带「负重 / 哑铃 / 杠铃 / 壶铃 / 配重 / 史密斯」的变体不算自重
   * （负重引体向上、杠铃臀桥还是要填重量）。
   */
  const BODYWEIGHT_MOVES = /(引体向上|俯卧撑|双杠臂屈伸|双臂杠屈伸|平板支撑|卷腹|悬垂举腿|山羊挺身|臀桥|自重|空手)/;

  const USER_BODYWEIGHT = new Set(readBodyweightMarks());

  /**
   * 复合动作（多关节、能上大重量）：组间休息要长一些。孤立动作（弯举、侧平举、下压…）短一些。
   * 只用于「休息多久」这一个判断，不参与容量与进阶（2026-11-18）。
   */
  const COMPOUND_MOVES = /(卧推|深蹲|硬拉|划船|推举|肩推|引体|下拉|腿举|臀推|臀桥|分腿蹲|保加利亚|罗马尼亚|早安式|双杠|臂屈伸|推胸|推肩|农夫|壶铃|高脚杯|硬拉)/;

  const ISOLATION_MOVES = /(侧平举|前平举|飞鸟|夹胸|弯举|下压|提踵|卷腹|平板支撑|腿屈伸|腿弯举|后束|面拉|直臂)/;

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

  function loadUserBodyweightMarks() {
    USER_BODYWEIGHT.clear();
    for (const name of readBodyweightMarks()) USER_BODYWEIGHT.add(name);
  }

  function isUserBodyweight(name) {
    return USER_BODYWEIGHT.has(String(name || '').trim());
  }

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

  function isBodyweightMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    // 用户标过的名字优先：他比正则更知道自己练的是什么。
    if (USER_BODYWEIGHT.has(text)) return true;
    if (/(负重|加片|哑铃|杠铃|壶铃|配重|史密斯|器械)/.test(text)) return false;
    return BODYWEIGHT_MOVES.test(text);
  }

  function isCompoundMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    if (ISOLATION_MOVES.test(text)) return false;
    return COMPOUND_MOVES.test(text);
  }

  /**
   * 一个动作 = 一张手账：编号 + 动作名（行标题，不套框）→ 每一组一行「次 × kg」→ 加一组 / 容量。
   * 删除放在动作名行右端与组行末尾，避免 44px 危险按钮压在标题行上方。
   */
  /** 有氧动作（跑步 / 骑行 / 椭圆…）：没有组次负重，记距离与时长。只认前缀，别把「杠铃划船」当下肢有氧。 */
  function isCardioName(name) {
    const text = String(name || '').trim();
    return /^(跑步|慢跑|快跑|快走|走路|散步|骑行|单车|椭圆|划船机|跳绳|爬楼|爬坡|有氧)/.test(text);
  }

  function isCardioItem(item) {
    return isCardioName(item && item.name) || number(item && item.distanceKm) !== null || number(item && item.durationMin) !== null;
  }

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

  const WEIGHT_EQUIP = [
    ['barbell', /杠铃|史密斯/],
    ['dumbbell', /哑铃|壶铃/],
    ['machine', /器械|龙门|绳索|滑轮|固定/],
    ['body', /自重|空手/]
  ];

  /**
   * 起步重量 = 体重 × 系数（按能做 8~10 次、RIR 2~3 估），取偏保守的中位：
   * 第一组轻一点、第二组再加，比第一次就做不动更好。
   */
  const WEIGHT_RATIOS = {
    卧推: {barbell: 0.5, dumbbell: 0.18, machine: 0.4},
    肩推: {barbell: 0.3, dumbbell: 0.12, machine: 0.25},
    深蹲: {barbell: 0.6, dumbbell: 0.15, machine: 0.75},
    硬拉: {barbell: 0.7, dumbbell: 0.25, machine: 0.6},
    划船: {barbell: 0.45, dumbbell: 0.2, machine: 0.4},
    弯举: {barbell: 0.2, dumbbell: 0.08, machine: 0.15},
    臂屈伸: {barbell: 0.2, dumbbell: 0.08, machine: 0.2},
    飞鸟: {barbell: 0.15, dumbbell: 0.08, machine: 0.2},
    侧平举: {barbell: 0.1, dumbbell: 0.05, machine: 0.06},
    提踵: {barbell: 0.5, dumbbell: 0.2, machine: 0.6},
    臀推: {barbell: 0.6, dumbbell: 0.2, machine: 0.6},
    核心: {}
  };

  // 下肢一次加 5 kg，上肢 2.5 kg。
  const LOWER_BODY = /深蹲|硬拉|腿|臀|提踵|哈克/;

  const WEIGHT_SOURCE_RANK = {inferred: 0, plan: 1, model: 1, log: 2};

  let weightMemoryCache = null;

  let weightMemorySeedKey = '';

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

  /** The habit row for a date; older builds could append duplicates, so keep the fullest one. */
  function habitRowFor(date) {
    const rows = (state.habits || []).filter(row => row && row.date === date);
    if (rows.length <= 1) return rows[0] || null;
    return rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  }

  /**
   * 当天算不算训练日：只看「有没有保存训练动作」（2026-11-18 用户要求：训练情况由动作判断，
   * 不再让用户在「日常习惯」里手填）。动作删空就自动回落成休息日。
   */
  function trainedOn(date) {
    return exercisesFor(date).some(item => item && String(item.name || '').trim());
  }

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

  /** Most recent recorded values for one exercise, so a repeat is one tap instead of retyping. */
  function latestExerciseValues(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return null;
    const rows = (state.habits || []).filter(row => row && Array.isArray(row.exercises) && validDate(row.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    for (const row of rows) {
      for (const item of row.exercises) {
        if (!item || String(item.name || '').trim() !== wanted) continue;
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        if (sets === null || reps === null || weight === null) continue;
        return {sets, reps, weight, date: row.date};
      }
    }
    return null;
  }

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

  function exerciseKey(name) {
    return String(name || '').replace(/[\s·・\-_/（）()]/g, '').toLowerCase();
  }

  function exerciseFamily(name) {
    const text = String(name || '');
    for (const [family, re] of WEIGHT_FAMILIES) if (re.test(text)) return family;
    return '';
  }

  function exerciseEquip(name) {
    const text = String(name || '');
    for (const [equip, re] of WEIGHT_EQUIP) if (re.test(text)) return equip;
    return '';
  }

  /** 动作所属部位（推 / 拉 / 腿 / 其他）。周组数自检与 AI 排课基线筛选共用这一处，别各写一套正则。 */
  const BODY_PART_RULES = [
    ['legs', /深蹲|硬拉|腿举|提踵|臀|保加利亚|分腿蹲/],
    ['pull', /引体|划船|下拉|弯举|面拉|直臂/],
    ['push', /卧推|肩推|侧平举|下压|臂屈伸|飞鸟/]
  ];
  function exerciseBodyPart(name) {
    const text = String(name || '');
    for (const [part, re] of BODY_PART_RULES) if (re.test(text)) return part;
    return 'other';
  }

  /** 按部位取动作名正则：AI 排课要「只给该部位相关的基线」，与 BODY_PART_RULES 同一张表。 */
  const PLAN_PART_PATTERNS = {
    legs: /深蹲|硬拉|腿|臀|提踵/,
    pull: /划船|引体|下拉|弯举|面拉/,
    push: /卧推|肩推|飞鸟|下压|臂屈伸|侧平举/,
    other: /.*/
  };
  /** 从「今天按周计划应练：推日」这类整句里认出部位。 */
  function planPartFor(text) {
    const s = String(text || '');
    if (/腿|蹲|硬拉|臀|提踵/.test(s)) return 'legs';
    if (/拉|背/.test(s)) return 'pull';
    if (/推|胸|肩/.test(s)) return 'push';
    return 'other';
  }

  function readWeightMemory() {
    if (weightMemoryCache) return weightMemoryCache;
    try {
      const raw = localStorage.getItem(WEIGHT_MEMORY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      weightMemoryCache = map && typeof map === 'object' ? map : {};
    } catch { weightMemoryCache = {}; }
    return weightMemoryCache;
  }

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

  /** 排完保存时把重量写进记忆；推断值记 plan，模型给的值记 model。 */
  function rememberPlanWeights(plan) {
    for (const item of Array.isArray(plan) ? plan : []) {
      if (!item || !item.name || !(number(item.weight) > 0)) continue;
      const inferred = item.weightSource === 'inferred' || item.weightSource === 'family';
      rememberExerciseWeight(item.name, item, {source: inferred ? 'plan' : 'model', date: activeDate});
    }
  }

  /** 训练落库后把真实负重写进记忆（下一次排课按它渐进）。 */
  function rememberExerciseLogs(exercises, date) {
    for (const item of Array.isArray(exercises) ? exercises : []) {
      if (!item || !item.name || !(number(item.weight) > 0)) continue;
      rememberExerciseWeight(item.name, {weight: number(item.weight), reps: number(item.reps), sets: number(item.sets)}, {source: 'log', date: date || activeDate});
    }
  }

  /** 14 天内每个动作最近一次的组/次/负重，供渐进参考；跑步与计时类不参与排课。 */
  function recentExerciseBaselines(days = 14) {
    const lastByExercise = {};
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      for (const item of exercisesFor(day)) {
        if (!item.name || lastByExercise[item.name]) continue;
        if (item.sets === null || item.reps === null) continue; // runs and timed work are not scheduled
        lastByExercise[item.name] = {sets: item.sets, reps: item.reps, weight: item.weight, date: day};
      }
    }
    return lastByExercise;
  }

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

  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */
  function dailyLoads(days) {
    const out = [];
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      let load = 0;
      for (const item of exercisesFor(day)) {
        // 逐组口径：金字塔组（10×40 / 8×60 / 5×80）真实 1280 kg，用外层汇总（sets=3、reps=10、weight=80）
        // 会被算成 2400 kg，把 ACWR 负荷比和减载判定一起带偏。旧记录由 trainingVolumeOf 自己回退。
        load += trainingVolumeOf([item]);
        const minutes = number(item.durationMin);
        if (minutes !== null) load += minutes * 6;
      }
      out.push({date: day, load});
    }
    return out;
  }

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

    const pickDay = template => {
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
      const shape = (PLAN_SHAPES[template] || []).slice(0, Math.max(1, moves));
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
      for (const item of exercises) item.sets = Math.min(setCap, item.sets);
      return {exercises, suggested: !exercises.some(item => history.has(item.name))};
    };

    const days = [];
    rotation(sessions).forEach((template, index) => {
      const date = new Date(start + 'T00:00:00');
      date.setDate(date.getDate() + slots[index]);
      const picked = pickDay(template);
      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises: picked.exercises, suggested: picked.suggested,
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
      prescription: {reps: repsRange, rir: rirRange},
      note: deload
        ? '本周负荷偏高（ACWR > 1.5），按减载周安排：负重 ×0.9、组数 −1。'
        : '按上周重量 +2.5% 安排；自重动作不加重，按次数进阶（下次每组 +1 次）；'
          + (approxCount ? approxCount + ' 个动作没有历史，重量是按体重推算的起步值（带「约」），练完一次按实际校准。' : '重量按你最近 14 天的记录安排。')};
  }

  function trainingLibrary() {
    const lib = window.TRAINING_PRINCIPLES;
    return lib && Array.isArray(lib.rules) ? lib : null;
  }

  function libraryRule(id) {
    const lib = trainingLibrary();
    return lib ? lib.rules.find(rule => rule.id === id) || null : null;
  }

  function libraryDayTemplate(template) {
    const lib = trainingLibrary();
    const day = lib && lib.dayTemplates ? lib.dayTemplates[template] : null;
    return day && Array.isArray(day.exercises) ? day : null;
  }

  function libraryMoves(template) {
    const lib = trainingLibrary();
    return lib && lib.moves && Array.isArray(lib.moves[template]) ? lib.moves[template] : [];
  }

  function librarySourceLabel(sourceId) {
    const lib = trainingLibrary();
    const source = lib && lib.sources ? lib.sources.find(row => row.id === sourceId) : null;
    return source ? source.label + (source.level ? '（' + source.level + ' 级）' : '') : sourceId;
  }

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

  /** 去掉器械/姿态前缀，留下动作本体（卧推 / 硬拉 / 划船…），用来和训练库对名。 */
  function exerciseCore(name) {
    let text = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    for (let i = 0; i < 2; i += 1) text = text.replace(prefix, '');
    return text.length >= 2 ? text : String(name || '').replace(/\s+/g, '');
  }

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

  /** 一条要点别超过两行：到句号或 46 字为止。 */
  function trimCue(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const first = clean.split('。')[0].split('；')[0].trim();
    if (first.length <= 46) return first;
    return first.slice(0, 46).replace(/[，、：]$/, '') + '…';
  }

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

  /** Which library rule answers the weakest metric of the day. */
  function libraryRuleForMetric(key) {
    const map = {calories: 'weekly-rate', protein: 'protein-preserve', fat: 'protein-preserve',
      training: 'split-3-rationale', sleep: 'sleep-deficit'};
    return libraryRule(map[key] || '');
  }

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
