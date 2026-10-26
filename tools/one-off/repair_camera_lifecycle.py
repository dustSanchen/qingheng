from pathlib import Path
import shutil, datetime
root=Path(r'D:\AI\health-android')
bak=root/'backups'/('bugfix-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
bak.mkdir(parents=True)
paths=['app/src/main/java/cn/qingheng/health/MainActivity.java','app/src/main/assets/app.js','app/src/main/assets/styles.css','build.ps1','README.md','dist/qingheng-1.0.0.apk']
for rel in paths:
 p=root/rel; dest=bak/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
p=root/paths[0];s=p.read_text(encoding='utf-8')
s=s.replace('    private String imageTargetName = "meal";', '    private volatile String imageTargetName = "meal";\n    private boolean pageReady, imageDeliveryBusy;')
s=s.replace('            @Override public void onPageFinished(WebView view, String url) {\n                deliverPendingImage();\n            }','            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) { pageReady = false; }\n            @Override public void onPageFinished(WebView view, String url) {\n                pageReady = true;\n                deliverPendingImage();\n            }')
s=s.replace('            rememberPendingImage();','            rememberPendingImage();\n            camera.putExtra("unused", false);') if False else s
s=s.replace('            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);','            camera.setClipData(android.content.ClipData.newRawUri("餐食照片", pendingCameraUri));\n            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);')
s=s.replace('        } catch (Exception e) {\n            pendingCameraUri = null;\n            launchFilePicker();\n        }','        } catch (Exception e) {\n            cameraInFlight = false;\n            deleteCameraTemp();\n            clearPendingImage();\n            launchFilePicker();\n        }',1)
a=s.index('    private void completeCamera(Uri uri) {');b=s.index('    private void deleteCameraTemp()',a)
s=s[:a]+s[b:] # Keep capture pending/private until consumed; no publishing to gallery.
s=s.replace('.putString("pending_image_target", imageTargetName).apply();','.putString("pending_image_target", imageTargetName).putBoolean("pending_image_ready", false).commit();')
s=s.replace('.remove("pending_image_target").apply();','.remove("pending_image_target").remove("pending_image_ready").apply();')
a=s.index('    /** Runs on every page load:');b=s.index('    /** Downscales and re-encodes',a)
s=s[:a]+'''    /** Deliver only confirmed captures, off the UI thread, and clear only after JS acknowledges this URI. */
    private void deliverPendingImage() {
        if (!alive || web == null || !pageReady || imageDeliveryBusy || !prefs.getBoolean("pending_image_ready", false)) return;
        final String uri = prefs.getString("pending_image_uri", "");
        final String target = prefs.getString("pending_image_target", "meal");
        if (uri == null || uri.isEmpty()) return;
        imageDeliveryBusy = true;
        worker.execute(() -> {
            final String data = readImageAsDataUri(Uri.parse(uri), 1280, 85);
            runOnUiThread(() -> {
                imageDeliveryBusy = false;
                if (!alive || web == null || !uri.equals(prefs.getString("pending_image_uri", ""))) return;
                if (data == null) {
                    discardPendingCapture(uri);
                    web.evaluateJavascript("window.__qinghengImageError && window.__qinghengImageError('照片读取失败，请重新拍照或使用文字描述。');", null);
                    return;
                }
                if (!pageReady) return; // Next onPageFinished retries; pending URI remains intact.
                try {
                    JSONObject payload = new JSONObject().put("id", uri).put("target", target).put("data", data);
                    String script = "Boolean(window.__qinghengPendingImage && window.__qinghengPendingImage(" + JSONObject.quote(payload.toString()) + "))";
                    web.evaluateJavascript(script, result -> {
                        if ("true".equals(result) && uri.equals(prefs.getString("pending_image_uri", ""))) discardPendingCapture(uri);
                    });
                } catch (Exception ignored) { }
            });
        });
    }
    private void discardPendingCapture(String uri) {
        if (!uri.equals(prefs.getString("pending_image_uri", ""))) return;
        try { getContentResolver().delete(Uri.parse(uri), null, null); } catch (Exception ignored) { }
        pendingCameraUri = null;
        clearPendingImage();
    }
''' +s[b:]
# Preserve orientation before re-encoding strips EXIF.
s=s.replace('            int w = bitmap.getWidth(), h = bitmap.getHeight(), longSide = Math.max(w, h);','''            int orientation = android.media.ExifInterface.ORIENTATION_NORMAL;
            try (InputStream exifIn = getContentResolver().openInputStream(uri)) {
                if (exifIn != null) orientation = new android.media.ExifInterface(exifIn).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, orientation);
            } catch (Exception ignored) { }
            android.graphics.Matrix matrix = new android.graphics.Matrix();
            switch (orientation) {
                case 2: matrix.setScale(-1, 1); break;
                case 3: matrix.setRotate(180); break;
                case 4: matrix.setScale(1, -1); break;
                case 5: matrix.setRotate(90); matrix.postScale(-1, 1); break;
                case 6: matrix.setRotate(90); break;
                case 7: matrix.setRotate(-90); matrix.postScale(-1, 1); break;
                case 8: matrix.setRotate(-90); break;
            }
            if (!matrix.isIdentity()) {
                android.graphics.Bitmap rotated = android.graphics.Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
                if (rotated != bitmap) bitmap.recycle();
                bitmap = rotated;
            }
            int w = bitmap.getWidth(), h = bitmap.getHeight(), longSide = Math.max(w, h);''')
s=s.replace('        } catch (Exception e) {\n            return null;\n        } finally {','        } catch (Exception | OutOfMemoryError e) {\n            return null;\n        } finally {',1)
# Remove unsafe unscoped bridge acknowledgement.
a=s.index('        /** Acknowledges that the recovered photo');b=s.index('        @JavascriptInterface public void request(',a)
s=s[:a]+s[b:]
a=s.index('            completeCamera(target);');b=s.index('        } else if (request == PICK',a)
s=s[:a]+'''            // Always use the same delivery path: a WebView reload cannot lose its file callback.
            pendingCameraUri = target;
            prefs.edit().putBoolean("pending_image_ready", true).commit();
            if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
            deliverPendingImage();
''' +s[b:]
s=s.replace('        if (!cameraInFlight) deleteCameraTemp();','        // Keep a pending capture across Activity teardown; cancel/JS acknowledgement performs cleanup.')
# Profile values come from context, never hardcode former demo user's nutrition targets.
a=s.index('                + "涉及目标时使用本应用已核对的口径：');b=s.index('                + "回答要短',a)
s=s[:a]+'                + "营养目标只使用本次上下文提供的个人目标；未提供时说明缺失，不套用固定热量或蛋白质数值。"\n'+s[b:]
p.write_text(s,encoding='utf-8')
p=root/'app/src/main/assets/app.js';s=p.read_text(encoding='utf-8')
a=s.index('  window.__qinghengPendingImage =');b=s.index('  async function sendChat()',a)
s=s[:a]+'''  let lastCaptureId = '';
  window.__qinghengPendingImage = payload => {
    let parsed;
    try {parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;} catch {return false;}
    if (!parsed || !['chat','meal'].includes(parsed.target) || typeof parsed.data !== 'string' || !/^data:image\\/(jpeg|png|webp);base64,/.test(parsed.data)) return false;
    if (parsed.id && parsed.id === lastCaptureId) return true;
    if (parsed.target === 'chat') {
      chatImageVersion++; chatImageBusy = false; chatImage = parsed.data;
      $('#chat-image-view').src = parsed.data; $('#chat-image-preview').hidden = false;
      switchTab('chat');
      feedback($('#chat-feedback'),'照片已就绪，已压缩并移除元数据。勾选本次同意后即可提问。');
      $('#chat-image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    } else {
      imageVersion++; imageBusy = false; imageData = parsed.data;
      $('#meal-image-preview').src = parsed.data; $('#image-preview').hidden = false;
      switchTab('records');
      feedback($('#estimate-feedback'),'照片已就绪，已压缩并移除元数据。确认同意后可生成估算预览。');
      $('#image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    }
    lastCaptureId = parsed.id || '';
    return true;
  };
  window.__qinghengImageError = message => notice(String(message), true);
''' +s[b:]
# Snapshot submitted attachment; changing/removing it while API is running cannot alter bookkeeping.
s=s.replace("    button.disabled = true; feedback(message, chatImage ?", "    const submittedImage = chatImage;\n    button.disabled = true; feedback(message, submittedImage ?")
s=s.replace("...(chatImage?{image:chatImage}:{})", "...(submittedImage?{image:submittedImage}:{})")
s=s.replace("const stored = chatImage ?", "const stored = submittedImage ?")
p.write_text(s,encoding='utf-8')
p=root/'build.ps1';s=p.read_text(encoding='utf-8');s=s.replace('function Run($exe,$arglist){ & $exe @arglist; if($LASTEXITCODE -ne 0){throw "Build step failed: $exe ($LASTEXITCODE)"} }','function Run($exe,$arglist){ $ErrorActionPreference="Continue"; & $exe @arglist; $code=$LASTEXITCODE; if($code -ne 0){throw "Build step failed: $exe ($code)"} }');p.write_text(s,encoding='utf-8')
print('BACKUP:',bak)
print('Patched camera lifecycle, async orientation-aware decoding, acknowledgement, chat snapshot and build exit handling.')
