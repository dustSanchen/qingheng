from pathlib import Path
import shutil, datetime

root = Path(r'D:\AI\health-android')
bak = root / 'backups' / ('gallery-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/java/cn/qingheng/health/MainActivity.java', 'app/src/main/assets/index.html',
            'app/src/main/assets/app.js', 'app/src/main/assets/styles.css']:
    dest = bak / rel; dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / rel, dest)

def sub(text, old, new, label):
    assert text.count(old) == 1, 'anchor not unique/found: ' + label
    return text.replace(old, new)

# ---------------- Java ----------------
p = root / 'app/src/main/java/cn/qingheng/health/MainActivity.java'
j = p.read_text(encoding='utf-8')

j = sub(j, '    private String pendingImageData;',
        '    private String pendingImageData;\n    /** True only for files this app created (camera captures); a gallery pick is never deleted. */\n    private boolean pendingImageOwned;', 'owned field')

j = sub(j, '''                if (isImageChooser(params)) {
                    launchCameraOrPicker();
                } else {
                    launchFilePicker();
                }''',
        '''                // capture="environment" means the page asked for the camera; anything else opens
                // the system picker so the user can choose an existing photo from the gallery.
                if (isImageChooser(params) && params != null && params.isCaptureEnabled()) {
                    launchCameraOrPicker();
                } else {
                    launchFilePicker(isImageChooser(params));
                }''', 'chooser routing')

j = sub(j, '            if (pendingCameraUri == null) throw new Exception("无法创建照片临时位置");\n            rememberPendingImage();',
        '            if (pendingCameraUri == null) throw new Exception("无法创建照片临时位置");\n            pendingImageOwned = true;\n            rememberPendingImage();', 'camera owned')

j = sub(j, '''            cameraInFlight = false;
            deleteCameraTemp();
            clearPendingImage();
            launchFilePicker();''',
        '''            cameraInFlight = false;
            deleteCameraTemp();
            clearPendingImage();
            launchFilePicker(true);''', 'camera fallback to gallery')

j = sub(j, '''    private void launchFilePicker() {
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp", "application/json", "text/plain"});
        pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivityForResult(Intent.createChooser(pick, "选择图片或 JSON"), PICK); }
        catch (Exception e) { if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; } }
    }''',
        '''    /** imagesOnly picks a photo from the gallery; otherwise the picker also offers JSON backups. */
    private void launchFilePicker(boolean imagesOnly) {
        prefs.edit().putBoolean("pick_is_image", imagesOnly).commit();
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType(imagesOnly ? "image/*" : "*/*");
        pick.putExtra(Intent.EXTRA_MIME_TYPES, imagesOnly
                ? new String[]{"image/jpeg", "image/png", "image/webp"}
                : new String[]{"image/jpeg", "image/png", "image/webp", "application/json", "text/plain"});
        pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivityForResult(Intent.createChooser(pick, imagesOnly ? "选择照片" : "选择图片或 JSON"), PICK); }
        catch (Exception e) {
            prefs.edit().putBoolean("pick_is_image", false).apply();
            if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        }
    }''', 'picker signature')

j = sub(j, '.putString("pending_image_target", imageTargetName).putBoolean("pending_image_ready", false).commit();',
        '.putString("pending_image_target", imageTargetName).putBoolean("pending_image_ready", false)\n                .putBoolean("pending_image_owned", pendingImageOwned).commit();', 'remember owned')

j = sub(j, '.remove("pending_image_target").remove("pending_image_ready").apply();',
        '.remove("pending_image_target").remove("pending_image_ready").remove("pending_image_owned").apply();', 'clear owned')

j = sub(j, '''    private void discardPendingCapture(String uri) {
        if (!uri.equals(prefs.getString("pending_image_uri", ""))) return;
        try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }
        pendingCameraUri = null;
        clearPendingImage();
    }''',
        '''    private void discardPendingCapture(String uri) {
        if (!uri.equals(prefs.getString("pending_image_uri", ""))) return;
        // Only delete a file this app created. A gallery pick belongs to the user's own album.
        if (prefs.getBoolean("pending_image_owned", false)) {
            try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }
        }
        pendingCameraUri = null;
        clearPendingImage();
    }''', 'safe discard')

j = sub(j, '            pendingCameraUri = target;\n            prefs.edit().putBoolean("pending_image_ready", true).commit();',
        '            pendingCameraUri = target;\n            pendingImageOwned = true;\n            prefs.edit().putBoolean("pending_image_ready", true).putBoolean("pending_image_owned", true).commit();', 'camera ready owned')

j = sub(j, '''        } else if (request == PICK && fileCallback != null) {
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (uri != null && !isPhotoResult(uri)) uri = null;
            fileCallback.onReceiveValue(uri == null ? null : new Uri[]{uri}); fileCallback = null;''',
        '''        } else if (request == PICK) {
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (uri != null && !isPhotoResult(uri)) uri = null;
            boolean imagePick = prefs.getBoolean("pick_is_image", false);
            prefs.edit().putBoolean("pick_is_image", false).apply();
            if (uri != null && imagePick) {
                // Same delivery path as the camera: survives a WebView reload and converts
                // HEIC/PNG/WebP locally. The URI stays owned by the user, so it is never deleted.
                pendingCameraUri = uri;
                pendingImageOwned = false;
                prefs.edit().putString("pending_image_uri", uri.toString())
                        .putString("pending_image_target", imageTargetName)
                        .putBoolean("pending_image_ready", true)
                        .putBoolean("pending_image_owned", false).commit();
                if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
                deliverPendingImage();
            } else if (fileCallback != null) {
                fileCallback.onReceiveValue(uri == null ? null : new Uri[]{uri}); fileCallback = null;
            }''', 'gallery result path')
p.write_text(j, encoding='utf-8')

# ---------------- HTML ----------------
p = root / 'app/src/main/assets/index.html'
h = p.read_text(encoding='utf-8')

h = sub(h, '<div class="upload-area"><label for="meal-image" class="upload-label"><span aria-hidden="true">⊕</span><strong>拍照记录这一餐</strong><small>点这里直接用后置相机拍照；系统也会提供相册等其他入口</small></label><input type="file" id="meal-image" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only">',
        '<div class="upload-area"><div class="capture-actions"><label for="meal-image" class="capture-button"><span aria-hidden="true">⊕</span><strong>拍照</strong><small>用后置相机</small></label><label for="meal-gallery" class="capture-button"><span aria-hidden="true">▣</span><strong>从相册选择</strong><small>用已有照片</small></label></div><input type="file" id="meal-image" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only"><input type="file" id="meal-gallery" accept="image/jpeg,image/png,image/webp" class="sr-only">', 'meal capture row')

h = sub(h, '<div class="upload-area compact"><label for="chat-image" class="upload-label"><span aria-hidden="true">⊕</span><strong>拍照提问</strong><small>可选：拍下食物或包装上的营养成分表，随问题一起发送</small></label><input type="file" id="chat-image" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only">',
        '<div class="upload-area compact"><div class="capture-actions"><label for="chat-image" class="capture-button"><span aria-hidden="true">⊕</span><strong>拍照提问</strong><small>用后置相机</small></label><label for="chat-gallery" class="capture-button"><span aria-hidden="true">▣</span><strong>从相册选择</strong><small>用已有照片</small></label></div><input type="file" id="chat-image" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only"><input type="file" id="chat-gallery" accept="image/jpeg,image/png,image/webp" class="sr-only">', 'chat capture row')
p.write_text(h, encoding='utf-8')

# ---------------- app.js ----------------
p = root / 'app/src/main/assets/app.js'
a = p.read_text(encoding='utf-8')
a = sub(a, "function clearImage() {imageVersion++;imageData=null;imageBusy=false;$('#meal-image').value='';",
        "function clearImage() {imageVersion++;imageData=null;imageBusy=false;$('#meal-image').value='';$('#meal-gallery').value='';", 'clear meal')
a = sub(a, "function clearChatImage() {chatImageVersion++;chatImage=null;chatImageBusy=false;$('#chat-image').value='';",
        "function clearChatImage() {chatImageVersion++;chatImage=null;chatImageBusy=false;$('#chat-image').value='';$('#chat-gallery').value='';", 'clear chat')
a = sub(a, "  $('#meal-image').addEventListener('click',()=>declareImageTarget('meal'));\n  $('#chat-image').addEventListener('click',()=>declareImageTarget('chat'));",
        "  ['#meal-image','#meal-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('meal')));\n  ['#chat-image','#chat-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('chat')));", 'targets')
p.write_text(a, encoding='utf-8')

# ---------------- styles.css ----------------
p = root / 'app/src/main/assets/styles.css'
c = p.read_text(encoding='utf-8')
c = c.rstrip() + ('\n.capture-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n'
                  '.capture-button{display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid var(--line);'
                  'border-radius:14px;padding:14px 10px;background:#fbfcf8;cursor:pointer;text-align:center}\n'
                  '.capture-button>span{font-size:20px;color:#6e906c}\n'
                  '.capture-button strong{font-size:13.5px;font-weight:650}\n'
                  '.capture-button small{font-size:10.5px;color:var(--muted)}\n')
p.write_text(c, encoding='utf-8')

print('BACKUP:', bak)
print('Added gallery pickers for meal and chat, capture-aware routing, and owner-guarded cleanup.')
