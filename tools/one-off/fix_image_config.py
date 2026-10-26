from pathlib import Path
import shutil, datetime

root = Path(r'D:\AI\health-android')
bak = root / 'backups' / ('image-fix-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/assets/app.js', 'app/src/main/java/cn/qingheng/health/ChatCompletion.java']:
    dest = bak / rel; dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / rel, dest)

js = root / 'app/src/main/assets/app.js'
s = js.read_text(encoding='utf-8')

# 1. Root cause: /api/state has no settings, so the model config was wiped on every reload.
old = '      state = {...data, settings:data.settings || {}}; loaded = true;'
assert s.count(old) == 1, 'loadState assignment changed'
new = ('      // /api/state carries records only. Replacing settings with {} here used to erase the\n'
       '      // saved model config, which silently disabled photo analysis until the app restarted.\n'
       '      const keptSettings = (state && typeof state.settings === \'object\' && state.settings) || {};\n'
       '      state = {...data, settings: (data.settings && typeof data.settings === \'object\') ? data.settings : keptSettings}; loaded = true;')
s = s.replace(old, new)

# 2. Dedicated settings refresh, independent of record loading.
old = '  function applySettings(data) {showProvider(data.provider || selectedProvider);}'
assert s.count(old) == 1
new = old + ('\n  /** Re-read the stored model config. Separate from loadState so records never clear it. */\n'
             '  async function refreshSettings() {\n'
             '    try {\n'
             "      const data = await api('/api/settings');\n"
             "      if (!data || typeof data !== 'object') return;\n"
             '      state.settings = {...(state.settings || {}), ...data};\n'
             "      if (typeof data.apiConfigured === 'boolean') settingsKnown = true;\n"
             '      applySettings(data); render();\n'
             '    } catch { /* offline: keep the last known config */ }\n'
             '  }')
s = s.replace(old, new)

# 3. Saving the model config must refresh it, otherwise a fresh key still blocks photos.
old = "      try {await loadState({quiet:true});} catch {feedback(message,'保存成功，但刷新失败。请检查连接后重新加载；不要重复提交。',true);}"
assert s.count(old) == 1
s = s.replace(old, old + "\n      if (path === '/api/settings') await refreshSettings();")

# 4. Startup uses the shared refresh path.
old = "  api('/api/settings').then(data=>{if(!data || typeof data!=='object')return;state.settings={...state.settings,...data};if(typeof data.apiConfigured==='boolean')settingsKnown=true;applySettings(data);render();}).catch(()=>{});"
assert s.count(old) == 1
s = s.replace(old, '  refreshSettings();')
js.write_text(s, encoding='utf-8')

java = root / 'app/src/main/java/cn/qingheng/health/ChatCompletion.java'
j = java.read_text(encoding='utf-8')
old = '            if (code < 200 || code >= 300) throw new PublicError("API 服务请求失败（HTTP " + code + "）");'
assert j.count(old) == 1
new = ('            // A 400 on a photo request almost always means the chosen model takes no image input.\n'
       '            if (code == 400) throw new PublicError("API 拒绝了本次请求（HTTP 400）：请确认「视觉模型」名称正确，且该模型确实支持图片输入");\n'
       + old)
j = j.replace(old, new)
java.write_text(j, encoding='utf-8')

print('BACKUP:', bak)
print('Fixed settings persistence across loadState, added refreshSettings, clearer HTTP 400 hint.')
