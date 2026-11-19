package cn.qingheng.health;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import javax.net.ssl.HttpsURLConnection;

/**
 * Single HTTPS implementation for every chat-completions call in the app.
 *
 * Security contract:
 *  - only HTTPS, only a bare host root or /v1 base (no userinfo, query, fragment, extra path);
 *  - redirects are never followed, so the Authorization header cannot leak to another host;
 *  - the API key is written only into the Authorization request header. It is never put into
 *    the payload, never returned, never logged, and never part of an error message;
 *  - the response body is capped at 8 MB and the assistant text at 65536 characters.
 */
public final class ChatCompletion {
    private static final int LIMIT = 8 * 1024 * 1024;
    private static final int MAX_CONTENT = 65536;

    private ChatCompletion() { }

    /**
     * POST {baseUrl}/chat/completions and return choices[0].message.content.
     * Throws {@link PublicError} with user-facing Chinese text on every expected failure.
     */
    public static JSONObject complete(JSONObject config, String apiKey, String model, JSONArray messages) throws Exception {
        return completeMessage(config, apiKey, model, messages, null, 0);
    }

    /**
     * Same call with an explicit output ceiling. Estimates, advice and query rewrites have a known
     * maximum length: letting the model decide how long to write is pure tail latency, and a runaway
     * `notes`/prose field is the usual cause of a slow 估算预览.
     */
    public static JSONObject complete(JSONObject config, String apiKey, String model, JSONArray messages, int maxTokens) throws Exception {
        return completeMessage(config, apiKey, model, messages, null, maxTokens);
    }

    /** 短文本、结构化输出这类任务不需要思考：显式传 false 可把 20 秒级降到 1~2 秒（1.4.63）。 */
    public static JSONObject complete(JSONObject config, String apiKey, String model, JSONArray messages,
                                      int maxTokens, boolean thinking) throws Exception {
        return completeMessage(config, apiKey, model, messages, null, maxTokens, thinking);
    }

    /**
     * Same call, but optionally advertises tools and returns the whole assistant message so the
     * caller can run the tool loop. The API never executes a tool itself.
     */
    public static JSONObject completeMessage(JSONObject config, String apiKey, String model, JSONArray messages, JSONArray tools) throws Exception {
        return completeMessage(config, apiKey, model, messages, tools, 0);
    }

    public static JSONObject completeMessage(JSONObject config, String apiKey, String model, JSONArray messages, JSONArray tools, int maxTokens) throws Exception {
        return completeMessage(config, apiKey, model, messages, tools, maxTokens, true);
    }

    public static JSONObject completeMessage(JSONObject config, String apiKey, String model, JSONArray messages, JSONArray tools, int maxTokens, boolean thinking) throws Exception {
        if (model == null || model.trim().isEmpty()) throw new PublicError("请配置文本或视觉模型名称");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("未配置 API 密钥，可使用前端离线估算");
        if (messages == null || messages.length() < 1) throw new PublicError("请提供对话内容");
        URL destination = endpoint(config.getString("baseUrl"));
        JSONObject payload = new JSONObject().put("model", model).put("temperature", 0.2)
                .put("messages", messages).put("stream", false);
        if (maxTokens > 0) payload.put("max_tokens", maxTokens);
        if (tools != null && tools.length() > 0) payload.put("tools", tools);
        if (!thinking) disableThinking(payload, config);
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection)destination.openConnection();
            conn.setConnectTimeout(60000); conn.setReadTimeout(60000); conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST"); conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream out = conn.getOutputStream()) { out.write(bytes); }
            int code = conn.getResponseCode();
            checkStatus(code);
            String text;
            try (InputStream in = conn.getInputStream()) { text = readText(in, LIMIT); }
            JSONObject response = new JSONObject(text);
            JSONObject message = response.getJSONArray("choices").getJSONObject(0).getJSONObject("message");
            String content = text(message, "content");
            if (content == null) content = "";
            if (content.length() > MAX_CONTENT) throw new PublicError("API 返回内容过长");
            // A response whose content is JSON null would otherwise be the literal string "null".
            if (isBlank(content)) throw new PublicError("模型这次没有给出回答内容，请重新提问或换一个模型");
            JSONObject out = new JSONObject().put("content", content).put("message", message);
            JSONObject usage = response.optJSONObject("usage");
            if (usage != null) out.put("usage", usage);
            return out;
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            // Deliberately generic to the user: the cause may embed request details but never the key.
            // The cause is still logged (class + message only) so a failure can be diagnosed from logcat.
            android.util.Log.w("qingheng", "chat failed " + e.getClass().getSimpleName() + ": " + e.getMessage());
            throw new PublicError("API 请求失败或响应格式不正确，请检查网络与配置");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** DeepSeek's Search / Fetch endpoints share the configured host and bearer key. */
    static JSONObject postToolApi(JSONObject config, String apiKey, String tool, JSONObject body) throws Exception {
        if (!"search".equals(tool) && !"fetch".equals(tool))
            throw new PublicError("不支持的 DeepSeek 工具接口");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("未配置 API 密钥");
        URL chat = endpoint(config.getString("baseUrl"));
        URL destination = new URL(chat.getProtocol(), chat.getHost(), chat.getPort(), "/v1/tools/" + tool);
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection)destination.openConnection();
            conn.setConnectTimeout(15000); conn.setReadTimeout(45000); conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST"); conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream out = conn.getOutputStream()) { out.write(bytes); }
            checkStatus(conn.getResponseCode());
            try (InputStream in = conn.getInputStream()) { return new JSONObject(readText(in, LIMIT)); }
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            throw new PublicError("DeepSeek 搜索或抓取失败，请稍后重试");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /**
     * Streaming variant: POST with {@code stream:true} and hand every text delta to {@code onDelta}
     * as it arrives, so the answer can be typed out in the UI instead of appearing all at once.
     *
     * Same security contract as {@link #completeMessage}. Server-sent events are parsed leniently:
     * a chunk that is not JSON is ignored rather than failing the whole answer, because providers
     * differ in keep-alive and comment lines.
     *
     * @return the concatenated answer text
     */
    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages, Delta onDelta) throws Exception {
        return stream(config, apiKey, model, messages, onDelta, null);
    }

    /**
     * @param onThink receives the model's reasoning fragments when it exposes them (reasoning_content);
     *                they are never mixed into the answer, because thinking is not an answer.
     */
    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages,
                                Delta onDelta, Delta onThink) throws Exception {
        return stream(config, apiKey, model, messages, onDelta, onThink, null);
    }

    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages,
                                Delta onDelta, Delta onThink, UsageSink onUsage) throws Exception {
        return stream(config, apiKey, model, messages, onDelta, onThink, onUsage, true);
    }

    /** Same as above, plus a usage sink (DeepSeek reports token usage on the last stream chunk). */
    public static String stream(JSONObject config, String apiKey, String model, JSONArray messages,
                                Delta onDelta, Delta onThink, UsageSink onUsage, boolean thinking) throws Exception {
        if (model == null || model.trim().isEmpty()) throw new PublicError("请配置文本或视觉模型名称");
        if (apiKey == null || apiKey.trim().isEmpty()) throw new PublicError("未配置 API 密钥，可使用前端离线估算");
        if (messages == null || messages.length() < 1) throw new PublicError("请提供对话内容");
        URL destination = endpoint(config.getString("baseUrl"));
        JSONObject payload = new JSONObject().put("model", model).put("temperature", 0.2)
                .put("messages", messages).put("stream", true);
        // DeepSeek 支持在流式末尾带 usage；别的服务商可能不认这个字段，所以只对 DeepSeek 加。
        String base = config.optString("baseUrl", "");
        if (base.toLowerCase(Locale.ROOT).contains("deepseek")) {
            payload.put("stream_options", new JSONObject().put("include_usage", true));
        }
        if (!thinking) disableThinking(payload, config);
        HttpsURLConnection conn = null;
        StringBuilder answer = new StringBuilder();
        // 1.4.60 诊断：拆开「连接/状态」「第一块（可能只有思考）」「第一段正文」「总耗时」，定位是谁在等。
        final long streamStarted = System.currentTimeMillis();
        long statusAt = 0, firstChunkAt = 0, firstContentAt = 0;
        int chunks = 0, thinkChars = 0;
        try {
            conn = (HttpsURLConnection) destination.openConnection();
            conn.setConnectTimeout(60000); conn.setReadTimeout(120000); conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST"); conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream out = conn.getOutputStream()) { out.write(bytes); }
            checkStatus(conn.getResponseCode());
            statusAt = System.currentTimeMillis() - streamStarted;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith(":")) continue;
                    if (trimmed.startsWith("data:")) trimmed = trimmed.substring(5).trim();
                    if (trimmed.isEmpty() || "[DONE]".equals(trimmed)) continue;
                    if (firstChunkAt == 0) firstChunkAt = System.currentTimeMillis() - streamStarted;
                    chunks += 1;
                    String delta = null;
                    try {
                        JSONObject chunk = new JSONObject(trimmed);
                        JSONArray choices = chunk.optJSONArray("choices");
                        if (choices != null && choices.length() > 0) {
                            JSONObject choice = choices.optJSONObject(0);
                            JSONObject piece = choice == null ? null : choice.optJSONObject("delta");
                            if (piece == null) piece = choice == null ? null : choice.optJSONObject("message");
                            if (piece != null) {
                                delta = text(piece, "content");
                                String reasoning = text(piece, "reasoning_content");
                                if (reasoning.isEmpty()) reasoning = text(piece, "reasoning");
                                if (!reasoning.isEmpty() && onThink != null) { thinkChars += reasoning.length(); onThink.onDelta(reasoning); }
                            }
                        }
                        JSONObject usageObj = chunk.optJSONObject("usage");
                        if (usageObj != null && onUsage != null) onUsage.onUsage(usageObj);
                        // Some providers report an error inside the stream instead of via HTTP status.
                        JSONObject error = chunk.optJSONObject("error");
                        if (error != null && answer.length() == 0) {
                            String message = error.optString("message", "");
                            throw new PublicError(message.isEmpty() ? "API 返回了流式错误" : "API 错误：" + message);
                        }
                    } catch (PublicError e) {
                        throw e;
                    } catch (Exception ignored) {
                        // A keep-alive or vendor-specific line: skip it, the answer is still valid.
                    }
                    if (delta == null || delta.isEmpty()) continue;
                    if (answer.length() + delta.length() > MAX_CONTENT) throw new PublicError("API 返回内容过长");
                    answer.append(delta);
                    if (firstContentAt == 0) firstContentAt = System.currentTimeMillis() - streamStarted;
                    if (onDelta != null) onDelta.onDelta(delta);
                }
            }
            String streamed = answer.toString();
            android.util.Log.i("qingheng", "stream model=" + model + " status=" + statusAt + "ms firstChunk=" + firstChunkAt
                    + "ms firstContent=" + firstContentAt + "ms total=" + (System.currentTimeMillis() - streamStarted)
                    + "ms chunks=" + chunks + " thinkChars=" + thinkChars + " chars=" + streamed.length());
            // A reasoning model can send a whole stream of null-content chunks (its thinking arrives in
            // another field). That is not an answer, so it is reported instead of being displayed.
            if (isBlank(streamed)) throw new PublicError("模型这次只返回了思考过程，没有给出回答，请重新提问或换一个模型");
            return streamed;
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            // A partial answer is still worth keeping: report it instead of losing what arrived.
            if (answer.length() > 0) throw new PublicError("回答中断，已显示收到的部分内容");
            android.util.Log.w("qingheng", "chat stream failed " + e.getClass().getSimpleName() + ": " + e.getMessage());
            throw new PublicError("API 请求失败或响应格式不正确，请检查网络与配置");
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /**
     * Reads a string field, treating a JSON null as absent.
     *
     * org.json's optString() renders JSONObject.NULL as the four-character string "null", which is
     * how a reasoning model's null-content deltas (the answer arrives later, in content) turned into
     * an answer made of "nullnullnull…". Nothing that reaches the UI may go through optString raw.
     */
    public static String text(JSONObject object, String key) {
        if (object == null || key == null) return "";
        Object raw = object.opt(key);
        if (raw == null || raw == JSONObject.NULL) return "";
        if (raw instanceof String) return (String) raw;
        return String.valueOf(raw);
    }

    /**
     * True when a string carries no real content: empty, whitespace, the literal "null" that org.json
     * produces for a JSON null, or such text separated by punctuation and invisible characters.
     *
     * The punctuation step matters: an answer that reached the log as a JSON array of nulls renders as
     * "[null,null,…]" (or "null,null,…" once JavaScript stringifies it), and a check that only removed
     * the word "null" left the separators behind, so the repair never matched.
     */
    public static boolean isBlank(String value) {
        if (value == null) return true;
        String stripped = value.replace("null", "")
                .replaceAll("[\\s\\p{C}\\p{Z}]+", "")
                .replaceAll("[\\[\\]{}\"',;:]+", "");
        return stripped.isEmpty();
    }

    /** How a stored answer is shaped; used for the audit line and by the repair pass. */
    public static String shape(String value) {
        if (value == null) return "missing";
        if (value.trim().isEmpty()) return "empty";
        if (hasNullPrefix(value)) return "nullPrefix";
        if (isBlank(value)) return "blank";
        return "text";
    }

    /**
     * True when an answer BEGINS with a run of JSON nulls before any real content.
     *
     * This is the shape the bug actually produced: the streamed answer was "nullnullnull…" and the app
     * then appended its own reference list, so the stored text was neither empty nor purely nulls — a
     * whole-string check (or a check that only looked at letters) reported it as a normal answer. Three
     * nulls in a row is already impossible as the start of a real Chinese answer.
     */
    public static boolean hasNullPrefix(String value) {
        if (value == null) return false;
        int i = 0, run = 0, length = value.length();
        while (i < length) {
            if (value.startsWith("null", i)) { i += 4; run++; continue; }
            char c = value.charAt(i);
            int type = Character.getType(c);
            if (Character.isWhitespace(c) || type == Character.FORMAT || type == Character.CONTROL
                    || type == Character.LINE_SEPARATOR || type == Character.PARAGRAPH_SEPARATOR
                    || type == Character.SPACE_SEPARATOR) { i++; continue; }
            break;
        }
        return run >= 3;
    }

    /** Receives each streamed text fragment as it arrives. */
    public interface Delta {
        void onDelta(String text);
    }

    /** Streaming providers report usage on the final chunk; callers record it for cost accounting. */
    public interface UsageSink {
        void onUsage(JSONObject usage);
    }

    /** Only GET /models: validates the stored key without sending health data or buying a completion. */
    /**
     * DeepSeek 的思考模式默认开启、effort 默认 high；估算这类「认食物→套数据」的任务不需要长思考，
     * 显式关掉可省掉整段思维链。其他服务商不认这个字段，不能发。
     */
    private static void disableThinking(JSONObject payload, JSONObject config) throws Exception {
        String base = config.optString("baseUrl", "").toLowerCase(Locale.ROOT);
        if (!base.contains("deepseek")) return;
        payload.put("thinking", new JSONObject().put("type", "disabled"));
    }

    public static JSONObject checkConnection(JSONObject config, String key) throws Exception {
        if (key == null || key.trim().isEmpty()) throw new PublicError("尚未保存此服务商的 API Key");
        URL completion = endpoint(config.getString("baseUrl"));
        URL destination = new URL(completion.toString().replace("/chat/completions", "/models"));
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) destination.openConnection();
            conn.setConnectTimeout(15000); conn.setReadTimeout(15000); conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + key);
            conn.setRequestProperty("Accept", "application/json");
            checkStatus(conn.getResponseCode());
            JSONObject data;
            try (InputStream in = conn.getInputStream()) { data = new JSONObject(readText(in, LIMIT)); }
            JSONArray list = data.optJSONArray("data"), names = new JSONArray();
            if (list == null) throw new PublicError("服务已响应，但 /models 返回格式不兼容；这不能证明视觉模型可用");
            boolean listed = false;
            for (int i = 0; i < list.length() && i < 1000; i++) {
                JSONObject row = list.optJSONObject(i);
                String id = row == null ? "" : row.optString("id", "");
                if (id.length() == 0 || id.length() > 160 || !id.matches("[A-Za-z0-9._:/-]+")) continue;
                if (id.equals(config.optString("visionModel"))) listed = true;
                if (names.length() < 30) names.put(id);
            }
            return new JSONObject().put("authenticated", true).put("models", names).put("visionModelListed", listed)
                .put("message", "密钥通过 /models 验证；模型列表不等于图片能力验证，本次没有发送图片或健康数据。");
        } catch (PublicError e) { throw e; }
        catch (Exception e) { throw new PublicError("连接检查失败，请检查 HTTPS 地址、网络及服务商是否提供 /models 接口"); }
        finally { if (conn != null) conn.disconnect(); }
    }
    private static void checkStatus(int code) throws PublicError {
        if (code >= 300 && code < 400) throw new PublicError("API 重定向已拒绝，密钥不会转发");
        if (code == 401) throw new PublicError("HTTP 401：API Key 认证失败。请在所选服务商后台重新生成密钥并保存；密钥只属于对应服务商，不能跨服务商使用。不是相机权限问题。");
        if (code == 403) throw new PublicError("HTTP 403：服务商拒绝访问。请核对模型权限、账号限制与访问策略；不要反复拍照重试。");
        if (code == 402) throw new PublicError("HTTP 402：API 账户余额不足，请到所选服务商充值或检查额度。");
        if (code == 429) throw new PublicError("HTTP 429：API 限流或额度限制，请稍后再试并检查服务商配额。");
        if (code == 400 || code == 422) throw new PublicError("HTTP " + code + "：模型名或请求参数不被接受。请核对文字/视觉模型及图片输入支持；并非一定是密钥错误。");
        if (code == 404) throw new PublicError("HTTP 404：API 路径或模型不存在，请核对 HTTPS 基础地址和模型名称。");
        if (code < 200 || code >= 300) throw new PublicError("API 服务请求失败（HTTP " + code + "），请稍后再试。");
    }

    /** Convenience accessor so callers do not need to remember the wrapper shape. */
    public static String content(JSONObject result) throws Exception {
        return result.getString("content");
    }

    /**
     * Validate an API base URL and return the resolved /chat/completions endpoint.
     * Shared with settings validation so stored and called URLs follow one rule.
     */
    public static URL endpoint(String base) throws PublicError {
        try {
            URI uri = new URI(base);
            String path = uri.getRawPath();
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
                    || uri.getRawQuery() != null || uri.getRawFragment() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || path == null || !(path.equals("") || path.equals("/") || path.equals("/v1") || path.equals("/v1/")))
                throw new PublicError("API 地址必须是 HTTPS 根地址或 /v1，不允许账号、参数、片段或其他路径");
            String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
            return new URL(normalized + "/chat/completions");
        } catch (PublicError e) {
            throw e;
        } catch (Exception e) {
            throw new PublicError("API 地址格式不正确");
        }
    }

    private static String readText(InputStream in, int limit) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192]; int n;
        while ((n = in.read(buffer)) != -1) {
            if (bytes.size() + n > limit) throw new PublicError("数据超过 8 MB 上限");
            bytes.write(buffer, 0, n);
        }
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }
}
