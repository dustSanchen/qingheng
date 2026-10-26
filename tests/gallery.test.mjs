import fs from 'node:fs';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');

// Both intake routes must exist for meal and chat: camera keeps capture, gallery must not.
const inputs = Object.fromEntries([...html.matchAll(/<input type="file" id="([^"]+)"([^>]*)>/g)].map(m => [m[1], m[2]]));
for (const id of ['meal-image', 'meal-gallery', 'chat-image', 'chat-gallery']) {
  assert(inputs[id] !== undefined, `${id} exists`);
  assert(/accept="image\/jpeg,image\/png,image\/webp"/.test(inputs[id]), `${id} accepts the supported image types`);
}
assert(/capture="environment"/.test(inputs['meal-image']), 'meal camera input asks for the rear camera');
assert(/capture="environment"/.test(inputs['chat-image']), 'chat camera input asks for the rear camera');
assert(!/capture=/.test(inputs['meal-gallery']), 'meal gallery input must not request the camera');
assert(!/capture=/.test(inputs['chat-gallery']), 'chat gallery input must not request the camera');

const labels = [...html.matchAll(/<label for="(meal|chat)-(image|gallery)"[^>]*>([\s\S]*?)<\/label>/g)]
  .map(m => ({ for: `${m[1]}-${m[2]}`, text: m[3].replace(/<[^>]+>/g, '') }));
assert.equal(labels.length, 4, 'every file input has a visible label');
assert(labels.some(l => l.for === 'meal-gallery' && l.text.includes('相册')), 'the records page offers a gallery option');
assert(labels.some(l => l.for === 'chat-gallery' && l.text.includes('相册')), 'the chat page offers a gallery option');
assert(/\.capture-actions\{[^}]*display:flex/.test(css), 'the two capture entries sit side by side');
assert(/\.capture-card\{/.test(css), 'capture entries are styled');

// Routing must follow the capture hint, not the MIME type.
assert(/params\.isCaptureEnabled\(\)/.test(java), 'the camera is only opened when the page requests capture');
assert(/launchFilePicker\(isImageChooser\(params\)\)/.test(java), 'non-capture image inputs go to the gallery picker');
assert(/private void launchFilePicker\(boolean imagesOnly\)/.test(java), 'the picker distinguishes photos from JSON');
assert(/pick\.setType\(imagesOnly \? "image\/\*" : "\*\/\*"\)/.test(java), 'the gallery picker is restricted to images');
assert(/putBoolean\("pick_is_image", imagesOnly\)/.test(java), 'the picker intent is remembered across recreation');

// Gallery results reuse the resilient delivery path instead of the file callback.
const pick = java.slice(java.indexOf('} else if (request == PICK)'), java.indexOf('} else if (request == SAVE'));
assert(/boolean imagePick = prefs\.getBoolean\("pick_is_image", false\)/.test(pick), 'the pick result knows it was an image');
assert(/deliverPendingImage\(\)/.test(pick), 'gallery photos use the same delivery path as the camera');
assert(/putBoolean\("pending_image_owned", false\)/.test(pick), 'a gallery photo is recorded as user-owned');
const imageBranch = pick.slice(pick.indexOf('if (uri != null && imagePick)'), pick.indexOf('} else if (fileCallback != null)'));
assert(imageBranch.length > 0, 'the image branch of the pick result is present');
assert(!/new Uri\[\]\{uri\}/.test(imageBranch), 'image picks do not depend on the live file callback');

// Never delete something the user picked from their own album.
assert(/if \(prefs\.getBoolean\("pending_image_owned", false\)\)/.test(java), 'cleanup only deletes app-owned captures');
assert(/putBoolean\("pending_image_owned", true\)/.test(java), 'camera captures are marked app-owned');
assert(/private boolean pendingImageOwned/.test(java), 'ownership is tracked across the request');

// Front end must reset and route both inputs.
assert(/\$\('#meal-gallery'\)\.value=''/.test(app), 'clearing the meal photo resets the gallery input');
assert(/\$\('#chat-gallery'\)\.value=''/.test(app), 'clearing the chat photo resets the gallery input');
assert(/\['#meal-image','#meal-gallery'\]\.forEach/.test(app), 'both meal inputs declare the meal target');
assert(/\['#chat-image','#chat-gallery'\]\.forEach/.test(app), 'both chat inputs declare the chat target');

console.log('PASS gallery: camera vs gallery routing, image-only picker, shared delivery path, album-safe cleanup');
