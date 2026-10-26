import fs from 'node:fs';
import assert from 'node:assert/strict';
const java=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');

// 1. Denied camera permission must tell the user, not fail silently.
const perm=java.slice(java.indexOf('public void onRequestPermissionsResult'),java.indexOf('if (request != REQUEST_NOTIFICATIONS)'));
assert(/notifyImageError\(/.test(perm),'denied camera permission is reported');
assert(/shouldShowRequestPermissionRationale\("android\.permission\.CAMERA"\)/.test(perm),'permanent denial is detected');
assert(/launchCameraOrPicker\(\); return;/.test(perm),'granted permission still launches the camera');
assert(/fileCallback\.onReceiveValue\(null\)/.test(perm),'the pending chooser callback is released on denial');

// 2. Camera launch failure is reported before the gallery fallback.
const launch=java.slice(java.indexOf('private void launchCameraOrPicker'),java.indexOf('private void launchFilePicker'));
assert(launch.indexOf('notifyImageError')>launch.indexOf('catch (Exception e)'),'launch failure is reported');
assert(launch.indexOf('notifyImageError')<launch.indexOf('launchFilePicker(true)'),'report comes before the fallback');

// 3. The error helper only talks to a live, ready page.
const helper=java.slice(java.indexOf('private void notifyImageError'),java.indexOf('private void deleteCameraTemp'));
assert(/!alive \|\| web == null \|\| !pageReady/.test(helper),'helper guards a dead or unready page');
assert(/JSONObject\.quote\(message\)/.test(helper),'message is JS-escaped');

// 4. The meal/chat target survives a process restart.
assert(/putString\("image_target_last", imageTargetName\)/.test(java),'target is persisted');
assert(/prefs\.getString\("image_target_last", "meal"\)/.test(java),'target is restored on start');

// 5. Re-picking the same photo after removing it must not be swallowed as a duplicate.
assert(/function clearChatImage\(\) \{lastCaptureId='';/.test(js),'chat clear resets the duplicate guard');
assert(/function clearImage\(\) \{lastCaptureId='';/.test(js),'meal clear resets the duplicate guard');
assert((js.match(/let lastCaptureId/g)||[]).length===1,'guard is declared exactly once, before use');
assert(js.indexOf('let lastCaptureId')<js.indexOf('function clearChatImage'),'guard is declared before its first use');

// 6. The system picker offers HEIC/HEIF; they are decoded natively, never by the page canvas.
assert(/"image\/heic", "image\/heif"/.test(java),'picker offers HEIC/HEIF');
assert(/BitmapFactory\.decodeStream/.test(java),'native decode path present');
console.log('PASS camera-bugfix: permission feedback, launch failure notice, target persistence, duplicate guard, HEIC picker');