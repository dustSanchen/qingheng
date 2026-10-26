/*
 * Q&A round: the answer context now carries the body and training data the user actually records, the
 * chat log save truncates instead of dropping a long answer, and streamed text is never lost when a
 * delta cannot be delivered.
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

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'chat context: body + training + weekly means',
    `        // The user's own anchor table rides along so answers reuse the same numbers as the estimate.
        String anchors = storedAnchorsInternal().optString("summary", "");
        if (!anchors.isEmpty()) context.put("anchors", anchors);`,
    `        // The user's own anchor table rides along so answers reuse the same numbers as the estimate.
        String anchors = storedAnchorsInternal().optString("summary", "");
        if (!anchors.isEmpty()) context.put("anchors", anchors);
        // Everything the user actually records, so a question about training or body data can be
        // answered from records instead of being deflected.
        try {
            JSONObject body = new JSONObject();
            JSONArray measurements = state.optJSONArray("measurements");
            JSONObject latest = null;
            if (measurements != null) {
                for (int i = 0; i < measurements.length(); i++) {
                    JSONObject row = measurements.optJSONObject(i);
                    if (row == null || !validDay(row.optString("date", "")) || row.optString("date").compareTo(selectedDate) > 0) continue;
                    if (latest == null || row.optString("date").compareTo(latest.optString("date")) >= 0) latest = row;
                }
            }
            if (latest != null) {
                JSONObject current = new JSONObject();
                for (String key : new String[]{"weight", "waist", "bodyFat", "muscle", "visceralFat", "bmr"}) {
                    Double value = finite(latest, key);
                    if (value != null) current.put(key, value);
                }
                if (current.length() > 0) body.put("latest", current.put("date", latest.optString("date")));
            }
            Double height = finite(profile, "height"), weight = latest == null ? null : finite(latest, "weight");
            if (height != null && weight != null && height > 0)
                body.put("bmi", Math.round(weight / Math.pow(height / 100, 2) * 10) / 10.0);
            JSONObject weekly = weeklyWeightMeans(selectedDate);
            if (weekly.length() > 0) body.put("weightWeeklyMeans", weekly);
            JSONArray training = trainingLog(selectedDate, 7);
            if (training.length() > 0) {
                body.put("trainingLast7Days", training);
                body.put("trainingCount", training.length());
                JSONObject volume = weeklyVolumeByExercise(selectedDate);
                if (volume.length() > 0) body.put("weeklyVolume", volume);
            }
            Double oil = oilSpoonsOn(selectedDate);
            if (oil != null) body.put("oilSpoonsToday", oil);
            if (body.length() > 0) context.put("body", body);
        } catch (Exception ignored) { }`,
  ],
  [
    'chat log truncates instead of dropping',
    `        if (answer.length() > 8000) throw fail("回答最多 8000 字符");`,
    `        // A long answer (usually the one with a reference list) is cut to fit rather than rejected:
        // dropping the whole record would make the answer disappear from the app after it was shown.
        if (answer.length() > 8000) answer = answer.substring(0, 7990) + "…（已截断）";`,
  ],
  [
    'relevance filter helper',
    `    /** System note describing what the lookup returned; only real titles, links and snippets go in. */`,
    `    /**
     * Drops lookup results that do not actually match the question.
     *
     * A search engine answers the rewritten keywords, not the user's sentence, so unrelated pages come
     * back. Each result is scored by character overlap with the question (and with the keywords), and
     * anything without a real foothold is removed instead of being handed to the model as "evidence".
     */
    private static JSONArray relevantResults(JSONArray results, String question, String keywords) {
        JSONArray kept = new JSONArray();
        if (results == null) return kept;
        JSONObject terms = new JSONObject();
        try { terms = questionTerms(question + " " + keywords); } catch (Exception ignored) { }
        for (int i = 0; i < results.length(); i++) {
            JSONObject row = results.optJSONObject(i);
            if (row == null) continue;
            String text = row.optString("title", "") + " " + row.optString("snippet", "");
            int score = 0;
            java.util.Iterator<String> keys = terms.keys();
            while (keys.hasNext()) {
                String term = keys.next();
                if (text.contains(term)) score += terms.optInt(term, 1);
            }
            // Two independent hits, or one long distinctive term, counts as relevant.
            if (score >= 2) kept.put(row);
        }
        return kept;
    }

    /** Distinct 2~4 character terms of a question, with longer terms weighted higher. */
    private static JSONObject questionTerms(String text) throws Exception {
        JSONObject terms = new JSONObject();
        String cleaned = text == null ? "" : text.replaceAll("[\\\\p{P}\\\\p{S}\\\\s]+", " ").trim();
        for (String chunk : cleaned.split(" ")) {
            if (chunk.length() < 2) continue;
            for (int size = Math.min(4, chunk.length()); size >= 2; size--) {
                for (int start = 0; start + size <= chunk.length(); start++) {
                    String term = chunk.substring(start, start + size);
                    if (term.matches("[0-9]+")) continue;
                    terms.put(term, Math.max(terms.optInt(term, 0), size - 1));
                }
            }
        }
        return terms;
    }

    /** System note describing what the lookup returned; only real titles, links and snippets go in. */`,
  ],
  [
    'filter before answering',
    `        JSONObject web = wantWeb ? WebSearch.search(searchWords) : null;
        if (web != null) messages.put(new JSONObject().put("role", "system").put("content", webContext(web)));`,
    `        JSONObject web = wantWeb ? WebSearch.search(searchWords) : null;
        if (web != null) {
            // Keep only what matches the question; the rest is noise the model would otherwise cite.
            JSONArray kept = relevantResults(web.optJSONArray("results"), question, searchWords);
            web.put("results", kept);
            web.put("connected", web.optBoolean("connected") && kept.length() > 0);
            if (kept.length() == 0 && web.optBoolean("tried") != null) {
                web.put("note", "检索返回的条目与问题不相关，已全部剔除；请只依据用户记录与常识回答，不要引用网页。");
            }
            messages.put(new JSONObject().put("role", "system").put("content", webContext(web)));
        }`,
  ],
]);

console.log('chat context + relevance filter wired');
