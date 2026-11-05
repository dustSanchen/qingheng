package cn.qingheng.health;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** DeepSeek Search / Fetch adapter. The user's health context is never sent to these endpoints. */
final class DeepSeekWebSearch {
    private static final int SEARCH_COUNT = 10;
    private static final int RESULT_LIMIT = 5;
    private static final int FETCH_FALLBACKS = 2;

    private DeepSeekWebSearch() { }

    static String queryFor(String question) {
        return limit(question == null ? "" : question.replaceAll("\\s+", " ").trim(), 128);
    }

    static JSONObject search(JSONObject config, String apiKey, String query, String question) throws Exception {
        if (!"deepseek".equals(config.optString("provider", "")))
            throw new PublicError("DeepSeek 搜索仅适用于 DeepSeek 服务商");
        String safeQuery = queryFor(query);
        if (safeQuery.isEmpty()) throw new PublicError("请先输入搜索问题");
        JSONObject request = new JSONObject().put("query", safeQuery).put("count", SEARCH_COUNT)
                .put("ori_question", queryFor(question)).put("need_content", true);
        JSONObject response = ChatCompletion.postToolApi(config, apiKey, "search", request);
        JSONArray input = response.optJSONArray("results");
        JSONArray results = new JSONArray();
        List<JSONObject> candidates = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        if (input != null) {
            for (int i = 0; i < input.length() && candidates.size() < SEARCH_COUNT; i++) {
                JSONObject row = input.optJSONObject(i);
                if (row == null) continue;
                String url = publicPageUrl(row.optString("url", ""));
                String identity = url.isEmpty() ? "" : canonicalUrl(url);
                if (identity.isEmpty() || !seen.add(identity)) continue;
                String source = text(row, "site_name");
                if (source.isEmpty()) source = host(url);
                JSONObject normalized = new JSONObject()
                        .put("title", limit(text(row, "title"), 180))
                        .put("url", url)
                        .put("source", limit(source, 100))
                        .put("snippet", limit(text(row, "snippet"), 500))
                        .put("summary", limit(text(row, "summary"), 1200))
                        .put("content", limit(text(row, "content"), 3000))
                        .put("date", limit(text(row, "date"), 60))
                        .put("rerankScore", row.has("rerank_score") ? row.optDouble("rerank_score", -1) : -1)
                        .put("authority", row.optInt("authority", -1));
                candidates.add(normalized);
            }
        }
        Collections.sort(candidates, (left, right) -> {
            int scoreOrder = Double.compare(right.optDouble("rerankScore", -1), left.optDouble("rerankScore", -1));
            return scoreOrder != 0 ? scoreOrder : Integer.compare(right.optInt("authority", -1), left.optInt("authority", -1));
        });
        boolean authoritativeFound = false;
        for (JSONObject row : candidates) {
            if (row.optDouble("rerankScore", -1) >= 1.5 && row.optInt("authority", -1) >= 3) authoritativeFound = true;
        }
        int resultLimit = authoritativeFound ? RESULT_LIMIT : Math.min(3, candidates.size());
        for (JSONObject row : candidates) {
            double score = row.optDouble("rerankScore", -1);
            if (score >= 0 && score < 1.5) continue;
            if (authoritativeFound && row.optInt("authority", -1) < 3) continue;
            results.put(row);
            if (results.length() >= resultLimit) break;
        }
        // A provider response can omit scoring fields; retain the best candidates but flag their source level.
        if (results.length() == 0) {
            for (int i = 0; i < candidates.size() && i < 3; i++) results.put(candidates.get(i));
        }

        // Search already fetches pages when need_content is true; retry only the first two gaps.
        int fetched = 0;
        for (int i = 0; i < results.length() && fetched < FETCH_FALLBACKS; i++) {
            JSONObject row = results.optJSONObject(i);
            if (row == null || !row.optString("content", "").isEmpty()) continue;
            fetched++;
            try {
                JSONObject page = fetch(config, apiKey, row.optString("url", ""));
                String content = limit(text(page, "content"), 3000);
                if (!content.isEmpty()) row.put("content", content);
                if (row.optString("title", "").isEmpty() && !text(page, "title").isEmpty())
                    row.put("title", limit(text(page, "title"), 180));
            } catch (Exception ignored) {
                // Keep the search snippet and summary when a publisher blocks page fetching.
            }
        }
        JSONArray tried = new JSONArray().put("DeepSeek Search API");
        if (fetched > 0) tried.put("DeepSeek Fetch API");
        return new JSONObject().put("connected", results.length() > 0)
                .put("via", "DeepSeek Search & Fetch").put("deepseekSearchApi", true)
                .put("authorityLimited", !authoritativeFound)
                .put("query", safeQuery).put("results", results).put("tried", tried);
    }

    static JSONObject fetch(JSONObject config, String apiKey, String url) throws Exception {
        String safeUrl = publicPageUrl(url);
        if (safeUrl.isEmpty()) throw new PublicError("只能抓取公开的 HTTP 或 HTTPS 网页");
        return ChatCompletion.postToolApi(config, apiKey, "fetch", new JSONObject().put("url", safeUrl));
    }

    private static String publicPageUrl(String raw) {
        try {
            String candidate = raw == null ? "" : raw.trim();
            if (candidate.length() > 8192) return "";
            URI uri = new URI(candidate);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            int port = uri.getPort();
            if (!("https".equals(scheme) || "http".equals(scheme)) || host.isEmpty() || !host.contains(".")
                    || (port != -1 && !(("https".equals(scheme) && port == 443) || ("http".equals(scheme) && port == 80)))
                    || uri.getRawUserInfo() != null || host.contains(":") || localHost(host) || privateIpv4(host)) return "";
            return uri.toASCIIString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static boolean localHost(String host) {
        return host.equals("localhost") || host.endsWith(".localhost") || host.endsWith(".local")
                || host.endsWith(".internal") || host.endsWith(".test") || host.endsWith(".invalid");
    }

    private static boolean privateIpv4(String host) {
        if (!host.matches("\\d{1,3}(?:\\.\\d{1,3}){3}")) return false;
        String[] parts = host.split("\\.");
        int a = Integer.parseInt(parts[0]), b = Integer.parseInt(parts[1]), c = Integer.parseInt(parts[2]), d = Integer.parseInt(parts[3]);
        if (a > 255 || b > 255 || c > 255 || d > 255) return true;
        return a == 0 || a == 10 || a == 127 || a >= 224
                || (a == 169 && b == 254) || (a == 172 && b >= 16 && b <= 31)
                || (a == 192 && (b == 168 || b == 0 || (b == 0 && c == 2)))
                || (a == 100 && b >= 64 && b <= 127)
                || (a == 198 && (b == 18 || b == 19 || b == 51))
                || (a == 203 && b == 0 && c == 113);
    }

    private static String canonicalUrl(String raw) {
        try {
            URI uri = new URI(raw);
            return new URI(uri.getScheme().toLowerCase(Locale.ROOT), null, uri.getHost().toLowerCase(Locale.ROOT),
                    uri.getPort(), uri.getPath(), uri.getQuery(), null).normalize().toASCIIString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String host(String raw) {
        try {return new URI(raw).getHost() == null ? "" : new URI(raw).getHost();}
        catch (Exception ignored) {return "";}
    }

    private static String text(JSONObject object, String key) {
        Object value = object == null ? null : object.opt(key);
        return value instanceof String ? ((String)value).trim() : "";
    }

    private static String limit(String value, int maxCodePoints) {
        if (value == null || value.isEmpty()) return "";
        int count = value.codePointCount(0, value.length());
        return count <= maxCodePoints ? value : value.substring(0, value.offsetByCodePoints(0, maxCodePoints));
    }
}
