/*
 * AI-side upgrades:
 *  1. reasoning models: stream their thinking as a separate "think" event instead of dropping it (or,
 *     worse, saving the word "null");
 *  2. retrieval: rewrite the question into up to three queries, merge + dedupe the hits, then rank them
 *     against the original question — better recall, same relevance gate;
 *  3. context: the goal mode and the 薄肌 plan travel with the question so answers quote the app's own
 *     numbers instead of inventing targets.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) { console.log(`skip (already applied)  ${label}`); continue; }
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

// --- ChatCompletion: expose reasoning_content separately ------------------------------------------
patch('app/src/main/java/cn/qingheng/health/ChatCompletion.java', [
  [
    'stream overload with a thinking sink',
    `    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages, Delta onDelta) throws Exception {`,
    `    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages, Delta onDelta) throws Exception {
        return stream(config, apiKey, model, messages, onDelta, null);
    }

    /**
     * @param onThink receives the model's reasoning fragments when it exposes them (reasoning_content);
     *                they are never mixed into the answer, because thinking is not an answer.
     */
    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages,
                                Delta onDelta, Delta onThink) throws Exception {`,
  ],
  [
    'emit thinking fragments',
    `                            if (piece != null) delta = text(piece, "content");`,
    `                            if (piece != null) {
                                delta = text(piece, "content");
                                String thinking = text(piece, "reasoning_content");
                                if (thinking.isEmpty()) thinking = text(piece, "reasoning");
                                if (!thinking.isEmpty() && onThink != null) onThink.onDelta(thinking);
                            }`,
  ],
]);

// --- MainActivity: thinking sink, multi-query retrieval, richer context ---------------------------
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'pass a thinking sink into the stream',
    `                JSONObject result = chatReply(body, text -> pushChatEvent("delta", id, text, null));`,
    `                JSONObject result = chatReply(body,
                        text -> pushChatEvent("delta", id, text, null),
                        text -> pushChatEvent("think", id, text, null));`,
  ],
  [
    'chatReply overloads',
    `    /** @param sink when non-null the answer is streamed through it instead of being returned whole. */
    private JSONObject chatReply(JSONObject b, ChatCompletion.Delta sink) throws Exception {`,
    `    /** @param sink when non-null the answer is streamed through it instead of being returned whole. */
    private JSONObject chatReply(JSONObject b, ChatCompletion.Delta sink) throws Exception {
        return chatReply(b, sink, null);
    }

    /** @param think receives reasoning fragments from reasoning models; never part of the answer. */
    private JSONObject chatReply(JSONObject b, ChatCompletion.Delta sink, ChatCompletion.Delta think) throws Exception {`,
  ],
  [
    'multi-query retrieval',
    `        boolean wantWeb = b.optBoolean("webSearch", false) && !question.isEmpty();
        String searchWords = wantWeb ? searchQuery(c, c.getString("model").trim(), question) : "";
        JSONObject web = wantWeb ? WebSearch.search(searchWords) : null;`,
    `        boolean wantWeb = b.optBoolean("webSearch", false) && !question.isEmpty();
        // Rewrite once into up to three queries: the question itself, the entity, and an English key.
        JSONArray queries = wantWeb ? searchQueries(c, c.getString("model").trim(), question) : new JSONArray();
        String searchWords = queries.length() > 0 ? queries.optString(0, "") : "";
        JSONObject web = wantWeb ? searchAll(queries, question) : null;`,
  ],
  [
    'use the thinking sink when streaming',
    `                : ChatCompletion.stream(c, apiKey(c.optString("provider", provider())), model, messages, sink).trim();`,
    `                : ChatCompletion.stream(c, apiKey(c.optString("provider", provider())), model, messages, sink, think).trim();`,
  ],
  [
    'report the queries used',
    `        out.put("webSearch", new JSONObject().put("connected", web.optBoolean("connected")).put("via", web.optString("via")).put("query", searchWords).put("tried", web.optJSONArray("tried")));`,
    `        out.put("webSearch", new JSONObject().put("connected", web.optBoolean("connected")).put("via", web.optString("via"))
                .put("query", searchWords).put("queries", queries).put("tried", web.optJSONArray("tried")));`,
  ],
  [
    'searchQueries + searchAll helpers',
    `    /**
     * Turns a chatty question into a few search keywords.`,
    `    /**
     * Rewrites a question into up to three short queries: a focused keyword query, the concrete entity
     * the user named, and an English term for nutrition lookups. One small model call; any failure falls
     * back to the question itself so a lookup still happens.
     */
    private JSONArray searchQueries(JSONObject c, String model, String question) {
        String fallback = question.length() > 80 ? question.substring(0, 80) : question;
        JSONArray out = new JSONArray().put(fallback);
        try {
            JSONArray messages = new JSONArray()
                    .put(new JSONObject().put("role", "system").put("content",
                            "把用户问题改写成 1 到 3 条用于网页检索的短查询，只输出 JSON 数组，不要解释："
                            + "[\\"中文关键词\\",\\"包含具体品牌或菜名的查询\\",\\"英文术语（营养或训练类才需要）\\"]。"
                            + "每条不超过 20 个字，保留品牌、菜名、数字；不要引号套引号，不要换行。"))
                    .put(new JSONObject().put("role", "user").put("content", question));
            String raw = chat(c, model, messages).trim();
            int start = raw.indexOf('['), end = raw.lastIndexOf(']');
            if (start < 0 || end <= start) return out;
            JSONArray parsed = new JSONArray(raw.substring(start, end + 1));
            JSONArray cleaned = new JSONArray();
            for (int i = 0; i < parsed.length() && cleaned.length() < 3; i++) {
                String piece = parsed.optString(i, "").trim();
                if (piece.length() < 2 || piece.length() > 40) continue;
                if (!cleaned.toString().contains(piece)) cleaned.put(piece);
            }
            return cleaned.length() > 0 ? cleaned : out;
        } catch (Exception e) {
            return out;
        }
    }

    /**
     * Runs the lookup for each query, merges and de-duplicates the hits by URL, then keeps only what
     * matches the question. More than one query is how a vague question ("汉堡王的大皇堡多少热量")
     * still finds the brand's own nutrition page.
     */
    private JSONObject searchAll(JSONArray queries, String question) throws Exception {
        JSONArray merged = new JSONArray();
        JSONObject tried = new JSONArray();
        java.util.Set<String> seen = new java.util.HashSet<>();
        String via = "";
        boolean connected = false;
        for (int i = 0; i < queries.length() && i < 3; i++) {
            String q = queries.optString(i, "").trim();
            if (q.isEmpty()) continue;
            JSONObject one = WebSearch.search(q);
            JSONArray rows = one.optJSONArray("results");
            if (one.optBoolean("connected") && rows != null && rows.length() > 0) {
                connected = true;
                if (via.isEmpty()) via = one.optString("via", "");
            }
            JSONArray steps = one.optJSONArray("tried");
            if (steps != null) for (int s = 0; s < steps.length(); s++) tried.put(steps.get(s));
            if (rows == null) continue;
            for (int r = 0; r < rows.length(); r++) {
                JSONObject row = rows.optJSONObject(r);
                if (row == null) continue;
                String url = ChatCompletion.text(row, "url");
                if (url.isEmpty() || !seen.add(url)) continue;
                merged.put(row);
            }
        }
        return new JSONObject().put("connected", connected).put("via", via).put("results", merged).put("tried", tried);
    }

    /**
     * Turns a chatty question into a few search keywords.`,
  ],
  [
    'goal mode in the chat context',
    `        // The user's own anchor table rides along so answers reuse the same numbers as the estimate.`,
    `        // Which goal the user picked, so an answer never argues against the mode it was asked under.
        String goal = optionalText(profile, "goal").trim();
        if (!goal.isEmpty()) context.put("goal", goal).put("goalLabel", goalText(profile));
        // The user's own anchor table rides along so answers reuse the same numbers as the estimate.`,
  ],
]);

console.log('ai upgrades wired');
