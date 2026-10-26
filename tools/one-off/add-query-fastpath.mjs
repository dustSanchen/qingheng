/**
 * Latency win: skip the query-rewrite model call for short, entity-shaped questions.
 * Uses tools/lib/patch.mjs so CRLF handling and idempotency are solved once.
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'skip rewrite for short entity questions',
    `    private JSONArray searchQueries(JSONObject c, String model, String question) {
        String fallback = question.length() > 80 ? question.substring(0, 80) : question;`,
    `    private JSONArray searchQueries(JSONObject c, String model, String question) {
        String fallback = question.length() > 80 ? question.substring(0, 80) : question;
        // Latency: a short entity ("皇堡 热量") is already a good query, so the rewrite call is skipped.
        if (isSingleQueryCandidate(question)) return new JSONArray().put(fallback);`,
  ],
  [
    'candidate heuristic',
    `    /**
     * Runs the lookup for each query, merges and de-duplicates the hits by URL, then keeps only what`,
    `    /**
     * True when a question is short and already entity-shaped, so a rewrite call would only add latency.
     * Long or interrogative sentences still get rewritten.
     */
    private static boolean isSingleQueryCandidate(String text) {
        String question = text == null ? "" : text.trim();
        if (question.isEmpty() || question.length() > 14) return false;
        for (String word : new String[]{"吗", "多少", "怎么", "如何", "为什么", "要不要", "请问", "帮我", "该"})
            if (question.contains(word)) return false;
        return true;
    }

    /**
     * Runs the lookup for each query, merges and de-duplicates the hits by URL, then keeps only what`,
  ],
]);

const assertions = [
  "check('a short entity question skips the rewrite call', main.includes('if (isSingleQueryCandidate(question)) return new JSONArray().put(fallback);'));",
  "check('the heuristic refuses long questions', main.includes('question.length() > 14) return false;'));",
  "check('the heuristic refuses interrogatives', main.includes('\"多少\", \"怎么\", \"如何\"'));",
].join('\n');

patch('tests/ai-upgrade.test.mjs', [
  [
    'latency fast path assertions',
    "console.log('\\nFAIL total: '",
    assertions + "\n\nconsole.log('\\nFAIL total: '",
  ],
]);

console.log('query fast path wired');
