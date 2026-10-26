from pathlib import Path
import shutil, datetime
r=Path(r'D:\AI\health-android'); b=r/'backups'/('keyfix-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/java/cn/qingheng/health/SecretStore.java','app/src/main/java/cn/qingheng/health/MainActivity.java','app/src/main/assets/app.js','app/src/main/assets/index.html']:
    p=r/rel; d=b/rel; d.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,d)
print('BACKUP:',b)

# 1. Sanitizer: keys copied from a web page often carry NBSP, BOM or zero-width characters.
p=r/'app/src/main/java/cn/qingheng/health/SecretStore.java'; s=p.read_text(encoding='utf-8')
anchor='    /** Decrypt the stored key for the given provider. Error text is user-facing and key-free. */'
assert s.count(anchor)==1
s=s.replace(anchor,'''    /**
     * Normalise a pasted key. Copying from a web page frequently brings invisible characters
     * (NO-BREAK SPACE U+00A0, BOM U+FEFF, zero-width joiners) or wrapping quotes. Java's \\s does
     * not match those, so an unclean key used to be stored and then rejected by the provider as
     * HTTP 401. Order matters: strip an optional "Bearer " prefix before removing spaces.
     */
    public static String sanitize(String raw) {
        if (raw == null) return "";
        String value = raw.replace("\\uFEFF", "").replace("\\u200B", "").replace("\\u200C", "").replace("\\u200D", "");
        value = value.replace("\\u00A0", " ").replace("\\u3000", " ").trim();
        if (value.regionMatches(true, 0, "Bearer", 0, 6)) value = value.substring(6).trim();
        if (value.length() >= 2) {
            char first = value.charAt(0), last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\\'' && last == '\\'')) value = value.substring(1, value.length() - 1);
        }
        StringBuilder out = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isWhitespace(c) || Character.isSpaceChar(c)) continue;
            out.append(c);
        }
        return out.toString();
    }

    /** True when the stored value still contains characters sanitize() would remove. */
    public static boolean needsCleaning(String raw) {
        return raw != null && !raw.isEmpty() && !raw.equals(sanitize(raw));
    }

'''+anchor,1)
p.write_text(s,encoding='utf-8')

# 2. Normalise at save time and at every use; expose a key-free self check.
p=r/'app/src/main/java/cn/qingheng/health/MainActivity.java'; s=p.read_text(encoding='utf-8')

s=s.replace('''            String key = patch.getString("apiKey").trim();
            if (key.regionMatches(true, 0, "Bearer ", 0, 7)) key = key.substring(7).trim();
            if (!key.isEmpty() && key.matches(".*\\s+.*")) throw fail("API Key 不能包含空白，请只粘贴密钥本身");''',
'''            String key = SecretStore.sanitize(patch.getString("apiKey"));
            if (!key.isEmpty() && key.length() < 8) throw fail("API Key 过短，请确认复制完整");''',1)

s=s.replace('''            String key = ((String)raw).trim();
            if (key.length() > 4096 || key.indexOf('\\r') >= 0 || key.indexOf('\\n') >= 0) throw fail("检索密钥格式不正确");''',
'''            String key = SecretStore.sanitize((String)raw);
            if (key.length() > 4096) throw fail("检索密钥格式不正确");
            if (!key.isEmpty() && key.length() < 8) throw fail("检索密钥过短，请确认复制完整");''',1)

anchor='    private String provider() { return prefs.getString("provider", "deepseek"); }'
assert s.count(anchor)==1
s=s.replace(anchor,anchor+'''

    /** Single place that produces a key for a request, so a legacy unclean value is fixed on use. */
    private String apiKey(String provider) throws Exception {
        return SecretStore.sanitize(SecretStore.decrypt(this, provider));
    }

    /** Key-free self check: length and a masked preview only, never the key itself. */
    private JSONObject keyInfo(String provider) {
        JSONObject info = new JSONObject();
        try {
            String stored = prefs.getString("key." + provider, "");
            if (stored == null || stored.isEmpty()) return info.put("configured", false);
            String raw = SecretStore.decrypt(this, provider);
            String clean = SecretStore.sanitize(raw);
            String preview = clean.length() <= 6 ? "" : clean.substring(0, 3) + "…" + clean.substring(clean.length() - 2);
            return info.put("configured", true).put("length", clean.length()).put("preview", preview)
                    .put("cleaned", SecretStore.needsCleaning(raw));
        } catch (Exception e) {
            return info.put("configured", true).put("unreadable", true);
        }
    }''',1)

anchor='        if (post && path.equals("/api/search-test")) {'
assert s.count(anchor)==1
s=s.replace(anchor,'''        if (get && path.equals("/api/key-info")) {
            // Local only: no network call, no key material leaves the device.
            return new JSONObject().put("provider", provider())
                    .put("model", keyInfo(provider())).put("brave", keyInfo("brave"));
        }
'''+anchor,1)

for old,new in [
    ('BraveSearch.search(query, SecretStore.decrypt(this, "brave"), 5)','BraveSearch.search(query, apiKey("brave"), 5)'),
    ('ChatCompletion.checkConnection(config(p), SecretStore.decrypt(this, p))','ChatCompletion.checkConnection(config(p), apiKey(p))'),
    ('c, SecretStore.decrypt(this, c.optString("provider", provider())), model, messages, tools);','c, apiKey(c.optString("provider", provider())), model, messages, tools);'),
    ('return ChatCompletion.complete(c, SecretStore.decrypt(this, c.optString("provider", provider())), model, messages).getString("content");','return ChatCompletion.complete(c, apiKey(c.optString("provider", provider())), model, messages).getString("content");'),
]:
    assert s.count(old)>=1, 'missing call site: '+old[:40]
    s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('key sanitising wired; key-info self check added')
