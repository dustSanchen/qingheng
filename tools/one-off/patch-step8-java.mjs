/*
 * Step 8 (Java slice): the prompts move into cn.qingheng.health.ai.Prompts and the numeric helpers of
 * AlarmReceiver's weekly payload delegate to cn.qingheng.health.store.RecordMath, so both the wording
 * and the aggregation rules have exactly one home.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    // Regex anchors cover multi-line blocks; string anchors cover exact single lines (CRLF-normalised).
    const isRegex = fromRaw instanceof RegExp;
    const from = isRegex ? fromRaw : (crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw);
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    if (isRegex) {
      const matches = text.match(new RegExp(from, from.flags.includes('g') ? from.flags : from.flags + 'g'));
      if (!matches) {
        if (text.includes(to.trim().slice(0, 40))) { console.log(`skip (already applied)  ${label}`); continue; }
        throw new Error(`${file} :: ${label}: regex anchor not found`);
      }
      if (matches.length !== 1) throw new Error(`${file} :: ${label}: regex matched ${matches.length} times`);
      text = text.replace(from, () => to);
    } else {
      const count = text.split(from).length - 1;
      if (count === 0 && text.includes(to)) { console.log(`skip (already applied)  ${label}`); continue; }
      if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
      text = text.replace(from, to);
    }
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

// --- MainActivity: delegate the chat prompt, the estimator prompt and the versions ----------------
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'chat prompt delegates',
    /    private static String chatSystemPrompt\(\) \{[\s\S]*?\n    \}\n/,
    `    /** Wording lives in ai.Prompts so the prompt version and the text change together. */
    private static String chatSystemPrompt() {
        return cn.qingheng.health.ai.Prompts.chat();
    }
`,
  ],
  [
    'versions read from Prompts',
    `    static final int PROMPT_VERSION = 2;   // v2: 口径 hard limits + anchors + no-under-reporting
    static final int RULES_VERSION = 1;    // v1: intakeFloor/deficitCap/训练日·休息日区间/macros`,
    `    static final int PROMPT_VERSION = cn.qingheng.health.ai.Prompts.PROMPT_VERSION;
    static final int RULES_VERSION = cn.qingheng.health.ai.Prompts.RULES_VERSION;`,
  ],
  [
    'estimator prompt delegates',
    /\.put\(new JSONObject\(\)\.put\("role", "system"\)\.put\("content", "你是谨慎的餐食营养估算助手。[\s\S]*?uncertaintyPercent 写上你估计的不确定度（默认 15）。notes 里写明份量假设与不确定区间。"\s*\+?\s*anchorInstruction\(b\.optString\("anchors", ""\)\)\)\)/,
    `.put(new JSONObject().put("role", "system").put("content",
                        cn.qingheng.health.ai.Prompts.withAnchors(cn.qingheng.health.ai.Prompts.mealEstimate(), b.optString("anchors", "")))))`,
  ],
]);

// --- AlarmReceiver: the push and weekly prompts come from Prompts --------------------------------
patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  [
    'daily prompt delegates',
    /        String system = "你是谨慎的饮食营养助手[\s\S]*?"不要列表符号、不要标题、不要 Markdown、不要换行、不要开场白与免责声明。";\n/,
    `        String system = cn.qingheng.health.ai.Prompts.dailyAdvice(mealSlot);\n`,
  ],
  [
    'weekly prompt delegates',
    /        String system = "你是谨慎的个人健康助手，正在写每周复盘[\s\S]*?"通知栏只显示一行：先给最重要的结论与一条调整，其余留到应用内；不要列表符号、不要标题、不要 Markdown、不要换行、不要免责声明。";\n/,
    `        String system = cn.qingheng.health.ai.Prompts.weeklyReview();\n`,
  ],
  [
    'week sums use RecordMath',
    /                double calories = 0, protein = 0, fat = 0, carbs = 0;\n                boolean anyNutrition = false;\n                for \(int i = 0; i < rows\.length\(\); i\+\+\) \{\n                    JSONObject row = rows\.optJSONObject\(i\);\n                    if \(row == null\) continue;\n                    Double kcal = finite\(row, "calories"\), p = finite\(row, "protein"\), f = finite\(row, "fat"\), c = finite\(row, "carbs"\);\n                    if \(kcal != null \|\| p != null \|\| f != null \|\| c != null\) anyNutrition = true;\n                    calories \+= kcal == null \? 0 : kcal;\n                    protein \+= p == null \? 0 : p;\n                    fat \+= f == null \? 0 : f;\n                    carbs \+= c == null \? 0 : c;\n                \}\n                if \(anyNutrition\) entry\.put\("calories", Math\.round\(calories\)\)\.put\("protein", Math\.round\(protein\)\)\n                        \.put\("fat", Math\.round\(fat\)\)\.put\("carbs", Math\.round\(carbs\)\);\n/,
    `                // Aggregation rules live in store.RecordMath: a field nobody recorded stays missing.
                boolean anyNutrition = cn.qingheng.health.store.RecordMath.hasAnyOf(rows, "calories", "protein", "fat", "carbs");
                if (anyNutrition) {
                    entry.put("calories", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "calories")))
                            .put("protein", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "protein")))
                            .put("fat", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "fat")))
                            .put("carbs", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "carbs")));
                }
`,
  ],
  [
    'orZero helper',
    '        /** Per-day totals and training flag for the last N days, oldest first. */',
    `        /** A component nobody recorded counts as 0 only when another component of the same day exists. */
        private static double orZero(Double value) {
            return value == null ? 0 : value;
        }

        /** Per-day totals and training flag for the last N days, oldest first. */`,
  ],
]);

console.log('step 8 java slice wired');
