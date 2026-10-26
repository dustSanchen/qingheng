/**
 * ② 推送建议带一句简要健身提示。
 *
 * 只加一句、且只在「当天还没有训练记录」或「训练日缺口偏大」时给具体动作，
 * 避免把推送从 2 条要点撑成一段；weekly/meal 槽位不加，防止重复。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/ai/Prompts.java', [
  [
    'one training line in the daily push',
    `                + "食物建议写明大致份量，但不要声称份量是精确测量。"`,
    `                + "食物建议写明大致份量，但不要声称份量是精确测量。"
                // One training sentence, not a section: the push is still two bullets.
                + "另加一句健身提示（不超过 20 个汉字），按这样选：trainsToday 为 true 时给恢复或补蛋白的安排；"
                + "trainsToday 为 false 且当天还没练时给一个最小可执行的训练动作（例如「今天补 20 分钟推」）；"
                + "训练相关的记录缺失就不要提训练，也不要劝人加练。"
                + "这句健身提示算作两条要点之一，总数仍然不超过 2 条。"`,
  ],
]);

patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  [
    'tell the model whether today is a training day',
    `        if (data != null && !data.has(today)) user.put("note", "今天没有任何已记录的餐食，摄入数据缺失，不要按 0 计算。");`,
    `        if (data != null && !data.has(today)) user.put("note", "今天没有任何已记录的餐食，摄入数据缺失，不要按 0 计算。");
        // Whether the day is a training day decides both the intake range and the training sentence.
        Boolean trainedToday = data == null ? null : data.trainedOn(today);
        if (data != null) user.put("trainsToday", trainedToday == null ? JSONObject.NULL : trainedToday);`,
  ],
]);

console.log('training line in the push wired');
