from pathlib import Path
import shutil, datetime
r=Path(r'D:\AI\health-android'); b=r/'backups'/('search-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/java/cn/qingheng/health/ChatCompletion.java','app/src/main/java/cn/qingheng/health/MainActivity.java']:
    p=r/rel; d=b/rel; d.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,d)
print('BACKUP:',b)

(r/'app/src/main/java/cn/qingheng/health/BraveSearch.java').write_text('''package cn.qingheng.health;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;

/**
 * Brave Web Search client.
 *
 * Contract verified against three independent sources on 2026-10-11 because Brave's own
 * documentation host was unreachable from this environment:
 *  - dltHub: base https://api.search.brave.com/res/v1, auth header X-Subscription-Token;
 *  - pub.dev mcp_browser source: GET /res/v1/web/search with q, count(1..20), offset,
 *    search_lang, country and headers Accept + X-Subscription-Token;
 *  - Microsoft Learn Brave connector: response web.results[] with title, url, description, page_age.
 * The host is hard-coded: the app never sends the user's search key to a caller-supplied address.
 */
public final class BraveSearch {
    private static final String HOST = "api.search.brave.com";
    private static final int LIMIT = 1024 * 1024;
    private static final int MAX_RESULTS = 8;

    private BraveSearch() { }

    public static JSONObject search(String query, String apiKey, int wanted) throws Exception {
        String text = query == null ? "" : query.trim();
        if (text.isEmpty()) throw new PublicError("检索词不能为空");
        if (text.length() > 200) throw new PublicError("检索词最多 200 字符");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("尚未保存 Brave 检索密钥");
        int count = Math.max(1, Math.min(wanted <= 0 ? 5 : wanted, MAX_RESULTS));
        URL url = new URL("https://" + HOST + "/res/v1/web/search?q=" + URLEncoder.encode(text, "UTF-8")
                + "&count=" + count + "&safesearch=moderate");
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(15000); conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("X-Subscription-Token", apiKey.trim());
            int code = conn.getResponseCode();
            if (code == 401 || code == 403) throw new PublicError("Brave 检索密钥无效或未被接受（HTTP " + code + "），请在「我的 → 联网检索」重新填写");
            if (code == 402) throw new PublicError("Brave 检索额度不足（HTTP 402），请检查订阅计划");
            if (code == 429) throw new PublicError("Brave 检索触发限流（HTTP 429），免费档约每秒 1 次，请稍后再试");
            if (code == 422) throw new PublicError("Brave 检索参数被拒绝（HTTP 422）");
            if (code < 200 || code >= 300) throw new PublicError("Brave 检索失败（HTTP " + code + "）");
            JSONObject body;
            try (InputStream in = conn.getInputStream()) { body = new JSONObject(readText(in, LIMIT)); }
            JSONObject web = body.optJSONObject("web");
            JSONArray rows = web == null ? null : web.optJSONArray("results");
            JSONArray results = new JSONArray();
            if (rows != null) {
                for (int i = 0; i < rows.length() && results.length() < count; i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null) continue;
                    String link = row.optString("url", "").trim();
                    if (!link.startsWith("https://") || link.length() > 2048) continue;
                    String title = clip(row.optString("title", ""), 200);
                    String snippet = clip(row.optString("description", ""), 500);
                    String age = clip(row.optString("page_age", row.optString("age", "")), 40);
                    results.put(new JSONObject().put("title", title).put("url", link)
                            .put("snippet", snippet).put("age", age));
                }
            }
            return new JSONObject().put("query", text).put("results", results).put("count", results.length());
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            throw new PublicError("无法连接 Brave 检索服务，请检查网络后重试");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String clip(String value, int max) {
        String text = value == null ? "" : value.trim();
        return text.length() <= max ? text : text.substring(0, max);
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
''',encoding='utf-8')

# --- ChatCompletion: accept tools and return the full assistant message so a tool loop is possible ---
p=r/'app/src/main/java/cn/qingheng/health/ChatCompletion.java'; s=p.read_text(encoding='utf-8')
old='''    public static JSONObject complete(JSONObject config, String apiKey, String model, JSONArray messages) throws Exception {
        if (model == null || model.trim().isEmpty()) throw new PublicError("请配置文本或视觉模型名称");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("未配置 API 密钥，可使用前端离线估算");
        if (messages == null || messages.length() < 1) throw new PublicError("请提供对话内容");
        URL destination = endpoint(config.getString("baseUrl"));
        JSONObject payload = new JSONObject().put("model", model).put("temperature", 0.2)
                .put("messages", messages).put("stream", false);'''
new='''    public static JSONObject complete(JSONObject config, String apiKey, String model, JSONArray messages) throws Exception {
        return completeMessage(config, apiKey, model, messages, null);
    }

    /**
     * Same call, but optionally advertises tools and returns the whole assistant message so the
     * caller can run the tool loop. The API never executes a tool itself.
     */
    public static JSONObject completeMessage(JSONObject config, String apiKey, String model, JSONArray messages, JSONArray tools) throws Exception {
        if (model == null || model.trim().isEmpty()) throw new PublicError("请配置文本或视觉模型名称");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("未配置 API 密钥，可使用前端离线估算");
        if (messages == null || messages.length() < 1) throw new PublicError("请提供对话内容");
        URL destination = endpoint(config.getString("baseUrl"));
        JSONObject payload = new JSONObject().put("model", model).put("temperature", 0.2)
                .put("messages", messages).put("stream", false);
        if (tools != null && tools.length() > 0) payload.put("tools", tools);'''
assert s.count(old)==1
s=s.replace(old,new,1)

old='''            JSONObject response = new JSONObject(text);
            String content = response.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content");
            if (content.length() > MAX_CONTENT) throw new PublicError("API 返回内容过长");
            return new JSONObject().put("content", content);'''
new='''            JSONObject response = new JSONObject(text);
            JSONObject message = response.getJSONArray("choices").getJSONObject(0).getJSONObject("message");
            String content = message.optString("content", "");
            if (content == null) content = "";
            if (content.length() > MAX_CONTENT) throw new PublicError("API 返回内容过长");
            return new JSONObject().put("content", content).put("message", message);'''
assert s.count(old)==1
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('BraveSearch added; ChatCompletion can now advertise tools and return the raw message')
