import fs from 'node:fs';

const f = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 1) 新增开关常量：拍照原图保留在系统相册
if (!t.includes('KEEP_CAPTURE_ORIGINAL')) {
  const anchor = '    private Uri pendingCameraUri;';
  if (!t.includes(anchor)) throw new Error('anchor 1 missing');
  t = t.replace(anchor, anchor + '\n    /** 拍照后把原图保留在系统相册，方便用户之后再用；关掉则沿用「送达即删」。 */\n    private static final boolean KEEP_CAPTURE_ORIGINAL = true;');
  n++; console.log('ok  KEEP_CAPTURE_ORIGINAL');
}

// 2) discardPendingCapture：保留原图 + 提示一次
const discardFrom = [
  '    private void discardPendingCapture(String uri) {',
  '        if (!uri.equals(prefs.getString("pending_image_uri", ""))) return;',
  '        // Only delete a file this app created. A gallery pick belongs to the user\'s own album.',
  '        if (prefs.getBoolean("pending_image_owned", false)) {',
  '            try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }',
  '        }',
  '        pendingCameraUri = null;',
  '        clearPendingImage();',
  '    }'
].join('\n');
const discardTo = [
  '    private void discardPendingCapture(String uri) {',
  '        if (!uri.equals(prefs.getString("pending_image_uri", ""))) return;',
  '        // Only touch a file this app created. A gallery pick belongs to the user\'s own album.',
  '        if (prefs.getBoolean("pending_image_owned", false)) {',
  '            if (KEEP_CAPTURE_ORIGINAL) {',
  '                try {',
  '                    android.widget.Toast.makeText(this, "原图已保存在系统相册", android.widget.Toast.LENGTH_SHORT).show();',
  '                } catch (Exception ignored) { }',
  '            } else {',
  '                try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }',
  '            }',
  '        }',
  '        pendingCameraUri = null;',
  '        clearPendingImage();',
  '    }'
].join('\n');
if (t.includes(discardFrom)) { t = t.replace(discardFrom, discardTo); n++; console.log('ok  discard keeps the original'); }

// 3) 进程重建后的清理：同样保留
const teardownFrom = '            if (uri != null && prefs.getBoolean("pending_image_owned", false)) {\n                try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }';
const teardownTo = '            if (uri != null && prefs.getBoolean("pending_image_owned", false) && !KEEP_CAPTURE_ORIGINAL) {\n                try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }';
if (t.includes(teardownFrom)) { t = t.replace(teardownFrom, teardownTo); n++; console.log('ok  teardown keeps the original'); }

fs.writeFileSync(f, t);
console.log('changed:', n);
