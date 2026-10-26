import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  ['declare the tier before it is used',
   `        messages.put(new JSONObject().put("role", "system").put("content", fastTier ? chatDataContextCompact(selectedDate) : chatDataContext(selectedDate)));`,
   `        // Tier decides cost: a fast answer is short, never searches the web, and skips the deep context.
        boolean fastTier = "fast".equals(b.optString("tier", "deep"));
        if (fastTier) {
            messages.put(new JSONObject().put("role", "system").put("content",
                    "本次是快速回答：最多 3 句，先给结论再给一个动作，不要复述数据，不解释推理过程。"));
        }
        messages.put(new JSONObject().put("role", "system").put("content", fastTier ? chatDataContextCompact(selectedDate) : chatDataContext(selectedDate)));`],
  ['drop the duplicated tier block',
   `        // Tier decides cost: a fast answer is short, never searches the web, and skips the deep context.
        boolean fastTier = "fast".equals(b.optString("tier", "deep"));
        if (fastTier) {
            messages.put(new JSONObject().put("role", "system").put("content",
                    "本次是快速回答：最多 3 句，先给结论再给一个动作，不要复述数据，不解释推理过程。"));
        }
        // Lookup runs before the model call.`,
   `        // Lookup runs before the model call.`],
]);
console.log('tier declaration moved up');
