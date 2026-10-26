import fs from 'node:fs';

const f = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let t = fs.readFileSync(f, 'utf8');
const plain = 'try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }';
const guarded = 'if (!KEEP_CAPTURE_ORIGINAL) try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }';
const count = t.split(plain).length - 1;
console.log('裸删除点位:', count);
t = t.split(plain).join(guarded);
fs.writeFileSync(f, t);

// 送达成功后提示一次「原图已保存在系统相册」
const target = 'private void discardPendingCapture(String uri) {';
const i = t.indexOf(target);
const head = t.slice(0, i);
const rest = t.slice(i);
if (!rest.slice(0, 600).includes('原图已保存在系统相册')) {
  const insertAt = rest.indexOf('{') + 1;
  const note = '\n        if (KEEP_CAPTURE_ORIGINAL && prefs.getBoolean("pending_image_owned", false)) {\n            try { android.widget.Toast.makeText(this, "原图已保存在系统相册", android.widget.Toast.LENGTH_SHORT).show(); } catch (Exception ignored) { }\n        }';
  t = head + rest.slice(0, insertAt) + note + rest.slice(insertAt);
  fs.writeFileSync(f, t);
  console.log('提示已加入 discardPendingCapture');
}
console.log('done');
