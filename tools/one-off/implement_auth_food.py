from pathlib import Path
import shutil, datetime
r=Path(r'D:\AI\health-android'); b=r/'backups'/('auth-food-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/java/cn/qingheng/health/ChatCompletion.java','app/src/main/java/cn/qingheng/health/MainActivity.java','app/src/main/assets/index.html','app/src/main/assets/app.js','app/src/main/assets/native-adapter.js','app/src/main/assets/styles.css']:
 p=r/rel; d=b/rel; d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,d)
print('BACKUP:',b)
# Icon resources: no fonts or external assets.
icons=r/'app/src/main/assets/icons';icons.mkdir(exist_ok=True)
start='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect x="1" y="1" width="46" height="46" rx="14" fill="#e6f0e6"/><g stroke="#44755d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
(icons/'camera.svg').write_text(start+'<path d="M12 16h6l2-4h8l2 4h6a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z"/><circle cx="24" cy="26" r="7"/><path d="M33 20h1"/></g></svg>',encoding='utf-8')
(icons/'gallery.svg').write_text(start+'<rect x="11" y="10" width="28" height="27" rx="4"/><path d="M7 17v20a4 4 0 0 0 4 4h21"/><circle cx="20" cy="19" r="3"/><path d="m12 31 8-7 6 5 5-6 7 8"/></g></svg>',encoding='utf-8')
p=r/'app/src/main/java/cn/qingheng/health/ChatCompletion.java';s=p.read_text(encoding='utf-8')
a=s.index('            // 3xx is rejected');z=s.index('            String text;',a)
s=s[:a]+'''            checkStatus(code);
'''+s[z:]
pos=s.index('    /** Convenience accessor')
s=s[:pos]+'''    /** Only GET /models: validates the stored key without sending health data or buying a completion. */
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
        if (code == 401) throw new PublicError("HTTP 401：API Key 认证失败。请在所选服务商后台重新生成密钥并保存；DeepSeek 密钥不能用于 B.AI，反之亦然。不是相机权限问题。");
        if (code == 403) throw new PublicError("HTTP 403：服务商拒绝访问。请核对模型权限、账号限制与访问策略；不要反复拍照重试。");
        if (code == 402) throw new PublicError("HTTP 402：API 账户余额不足，请到所选服务商充值或检查额度。");
        if (code == 429) throw new PublicError("HTTP 429：API 限流或额度限制，请稍后再试并检查服务商配额。");
        if (code == 400 || code == 422) throw new PublicError("HTTP " + code + "：模型名或请求参数不被接受。请核对文字/视觉模型及图片输入支持；并非一定是密钥错误。");
        if (code == 404) throw new PublicError("HTTP 404：API 路径或模型不存在，请核对 HTTPS 基础地址和模型名称。");
        if (code < 200 || code >= 300) throw new PublicError("API 服务请求失败（HTTP " + code + "），请稍后再试。");
    }

'''+s[pos:];p.write_text(s,encoding='utf-8')
p=r/'app/src/main/java/cn/qingheng/health/MainActivity.java';s=p.read_text(encoding='utf-8')
s=s.replace('        if (path.equals("/api/settings")) {','''        if (post && path.equals("/api/connection-check")) {
            if (!b.optBoolean("allowExternal", false)) throw fail("请确认连接检查会向服务商发送已保存的密钥（不发送健康数据）");
            String p = provider();
            return ChatCompletion.checkConnection(config(p), SecretStore.decrypt(this, p));
        }
        if (path.equals("/api/settings")) {''',1)
s=s.replace('String key = patch.getString("apiKey").trim();','''String key = patch.getString("apiKey").trim();
            if (key.regionMatches(true, 0, "Bearer ", 0, 7)) key = key.substring(7).trim();
            if (!key.isEmpty() && key.matches(".*\\\\s+.*")) throw fail("API Key 不能包含空白，请只粘贴密钥本身");''')
s=s.replace('        JSONObject c = config(provider());\n        if (!b.optBoolean','        String p = provider();\n        JSONObject c = config(p);\n        c.put("provider", p);\n        if (!b.optBoolean',1)
s=s.replace('SecretStore.decrypt(this, provider()), model, messages','SecretStore.decrypt(this, c.optString("provider", provider())), model, messages')
p.write_text(s,encoding='utf-8')
p=r/'app/src/main/assets/index.html';s=p.read_text(encoding='utf-8')
s=s.replace('<script src="./native-adapter.js" defer>','<script src="./food-models.js" defer></script><script src="./native-adapter.js" defer>',1)
s=s.replace('<span aria-hidden="true">⊕</span>','<img class="capture-icon" src="./icons/camera.svg" alt="" width="48" height="48">')
s=s.replace('<span aria-hidden="true">▣</span>','<img class="capture-icon" src="./icons/gallery.svg" alt="" width="48" height="48">')
s=s.replace('保存连接设置</button>','保存连接设置</button><button class="button subtle" id="connection-check" type="button">检查已保存的连接</button><p id="connection-check-feedback" class="form-feedback" role="status" aria-live="polite"></p>',1)
s=s.replace('placeholder="留空保留此服务商在手机上的密钥"','placeholder="粘贴本服务商密钥；留空保留原密钥"')
s=s.replace('<article class="card manual-card">','''<article class="card manual-card"><div class="card-heading"><h2>食品热量参考库</h2><span class="tag">本地 · 不消耗 token</span></div><p class="fine-print">独立编写的简化模型，不是薄荷官方数据库。每 100g 可食部参考；菜品含示例烹饪油，实际配方可能不同。</p><label>搜索食品或菜品<input id="food-search" placeholder="例如：米饭、鸡胸肉、番茄炒蛋" maxlength="80"></label><div id="food-search-results"></div><p class="fine-print">选中后可把食品名填入上方描述；请补充实际克重。图片仍需视觉模型识别名称与份量。</p></article><article class="card manual-card">''',1)
s=s.replace('调整克重不会自动换算营养；请同时修正相关数值。','可点击「按食品模型校核」用本地模型换算；份量与油量仍需确认。')
s=s.replace('<div id="estimate-items"></div>','<button id="calibrate-foods" type="button" class="button subtle">按食品模型校核</button><div id="estimate-items"></div>',1)
p.write_text(s,encoding='utf-8')
p=r/'app/src/main/assets/styles.css';s=p.read_text(encoding='utf-8');s+='\n.capture-icon{display:block;width:48px;height:48px;margin:2px auto 6px}.food-result{display:flex;width:100%;justify-content:space-between;align-items:center;text-align:left;gap:12px;border:1px solid var(--line);border-radius:12px;background:var(--paper);padding:12px;margin-top:8px;min-height:48px}.food-result small{display:block;color:var(--muted);font-size:11px}.food-result strong{color:var(--mint-dark);white-space:nowrap}#connection-check{margin-top:10px}\n';p.write_text(s,encoding='utf-8')
print('Patched diagnostics and icons; food module integration follows.')
