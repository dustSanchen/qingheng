package cn.qingheng.health;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;

/**
 * Open Food Facts product search. Open data under the ODbL licence, free to reuse with attribution.
 *
 * Contract verified on 2026-10-11 from the project's own OpenAPI document
 * (https://search.openfoodfacts.org/openapi.json) plus a live request:
 *   GET https://search.openfoodfacts.org/search?q=&langs=zh,en&page_size=&fields=
 *   -> { hits: [ { code, product_name, brands:[], quantity, nutriments:{ *_100g } } ], count, page, ... }
 * Read access needs no API key; the project asks for an identifying User-Agent instead.
 * Documented limits: 10 search requests per minute per IP, and search-as-you-type is discouraged —
 * so the UI only searches when the user presses a button.
 */
public final class OpenFoodFacts {
    private static final String HOST = "search.openfoodfacts.org";
    private static final int LIMIT = 1024 * 1024;
    private static final int MAX_RESULTS = 20;
    private static final String FIELDS = "code,product_name,brands,quantity,nutriments,serving_size";
    /** The project asks every client to identify itself. */
    private static final String AGENT = "Qingheng/1.0 (personal health journal)";

    private OpenFoodFacts() { }

    public static JSONObject search(String query, int wanted) throws Exception {
        String text = query == null ? "" : query.trim();
        if (text.isEmpty()) throw new PublicError("请输入食品名称或品牌");
        if (text.length() > 100) throw new PublicError("搜索词最多 100 字符");
        int size = Math.max(1, Math.min(wanted <= 0 ? 8 : wanted, MAX_RESULTS));
        URL url = new URL("https://" + HOST + "/search?q=" + URLEncoder.encode(text, "UTF-8")
                + "&langs=" + URLEncoder.encode("zh,en", "UTF-8")
                + "&page_size=" + size
                + "&fields=" + URLEncoder.encode(FIELDS, "UTF-8"));
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(15000); conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", AGENT);
            int code = conn.getResponseCode();
            if (code == 429) throw new PublicError("Open Food Facts 限流（每分钟约 10 次搜索），请稍后再试");
            if (code == 503) throw new PublicError("Open Food Facts 暂时不可用（HTTP 503），请稍后再试");
            if (code < 200 || code >= 300) throw new PublicError("Open Food Facts 请求失败（HTTP " + code + "）");
            JSONObject body;
            try (InputStream in = conn.getInputStream()) { body = new JSONObject(readText(in, LIMIT)); }
            JSONArray hits = body.optJSONArray("hits");
            JSONArray results = new JSONArray();
            for (int i = 0; hits != null && i < hits.length() && results.length() < size; i++) {
                JSONObject hit = hits.optJSONObject(i);
                if (hit == null) continue;
                String name = text(hit.opt("product_name"));
                if (name.isEmpty()) continue;
                JSONObject nutriments = hit.optJSONObject("nutriments");
                Double kcal = number(nutriments, "energy-kcal_100g", "energy-kcal");
                JSONObject per100 = new JSONObject();
                per100.put("calories", kcal == null ? JSONObject.NULL : kcal);
                per100.put("protein", nullable(number(nutriments, "proteins_100g", "protein_100g")));
                per100.put("fat", nullable(number(nutriments, "fat_100g")));
                per100.put("carbs", nullable(number(nutriments, "carbohydrates_100g", "carbohydrates_100g")));
                results.put(new JSONObject()
                        .put("name", clip(name, 120))
                        .put("brand", clip(joined(hit.opt("brands")), 80))
                        .put("code", clip(hit.optString("code", ""), 40))
                        .put("quantity", clip(hit.optString("quantity", ""), 40))
                        .put("serving", clip(hit.optString("serving_size", ""), 40))
                        .put("per100", per100));
            }
            return new JSONObject().put("query", text).put("results", results).put("count", results.length())
                    .put("source", "Open Food Facts").put("licence", "ODbL");
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            throw new PublicError("无法连接 Open Food Facts，请检查网络后重试");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Missing values stay null so the UI can show "—" instead of a false zero. */
    private static Object nullable(Double value) { return value == null ? JSONObject.NULL : value; }

    private static Double number(JSONObject source, String... keys) {
        if (source == null) return null;
        for (String key : keys) {
            Object raw = source.opt(key);
            if (raw instanceof Number) {
                double value = ((Number) raw).doubleValue();
                if (Double.isFinite(value) && value >= 0 && value <= 100000) return value;
            }
        }
        return null;
    }

    /** OFF returns names either as a string or as an object keyed by language. */
    private static String text(Object raw) {
        if (raw instanceof String) return ((String) raw).trim();
        if (raw instanceof JSONObject) {
            JSONObject map = (JSONObject) raw;
            for (String key : new String[]{"zh", "en"}) {
                String value = map.optString(key, "").trim();
                if (!value.isEmpty()) return value;
            }
            JSONArray names = map.names();
            for (int i = 0; names != null && i < names.length(); i++) {
                String value = map.optString(names.optString(i), "").trim();
                if (!value.isEmpty()) return value;
            }
        }
        return "";
    }

    private static String joined(Object raw) {
        if (raw instanceof JSONArray) {
            JSONArray list = (JSONArray) raw;
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < list.length(); i++) {
                String value = list.optString(i, "").trim();
                if (value.isEmpty()) continue;
                if (out.length() > 0) out.append('、');
                out.append(value);
            }
            return out.toString();
        }
        return raw instanceof String ? ((String) raw).trim() : "";
    }

    private static String clip(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String readText(InputStream in, int limit) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192]; int n;
        while ((n = in.read(buffer)) != -1) {
            if (bytes.size() + n > limit) break;
            bytes.write(buffer, 0, n);
        }
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }
}
