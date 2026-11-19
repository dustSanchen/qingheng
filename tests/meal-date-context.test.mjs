import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const adapter = fs.readFileSync(new URL('native-adapter.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');
const mainJava = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');

// --- Behavior: the photo-time helpers must never invent a capture time -------------------------
const start = app.indexOf('  function photoMeta(value) {');
const end = app.indexOf('  let activeDate = localDate();', start);
assert(start > 0 && end > start, 'photo metadata helpers are delimited');
const timeNodes = [];
const ctx = {
  $: selector => ({textContent: '', selector, set value(v) {}, get value() { return ''; }}),
  document: {getElementById: () => null},
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(app.slice(start, end) + '\nglobalThis.photoMeta = photoMeta; globalThis.photoTimeLabel = photoTimeLabel;', ctx);
const meta = ctx.photoMeta;
assert.deepEqual({...meta(null)}, {photoTakenAt: null, photoTimeSource: 'unknown'}, 'no payload means an unknown time');
assert.deepEqual({...meta({})}, {photoTakenAt: null, photoTimeSource: 'unknown'}, 'missing fields stay unknown');
// A gallery picture without EXIF must not inherit the import moment.
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'import'})},
  {photoTakenAt: null, photoTimeSource: 'unknown'}, 'an unvetted time source is rejected');
assert.deepEqual({...meta({photoTakenAt: 'not-a-time', photoTimeSource: 'camera'})},
  {photoTakenAt: null, photoTimeSource: 'unknown'}, 'an unparsable timestamp is rejected');
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'camera'})},
  {photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'camera'}, 'a camera timestamp is kept with its offset');
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00Z', photoTimeSource: 'exif'})},
  {photoTakenAt: '2026-10-16T12:00:00Z', photoTimeSource: 'exif'}, 'an EXIF timestamp with an offset is kept');
assert.equal(meta({photoTakenAt: '2026-10-16T12:00:00', photoTimeSource: 'exif'}).photoTakenAt, null,
  'a timestamp without an offset is refused rather than guessed');
assert.match(ctx.photoTimeLabel(meta({photoTimeSource: 'unknown'})), /拍摄时间未知/,
  'the unknown case is stated in the UI instead of a fabricated date');
assert.match(ctx.photoTimeLabel(meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'exif-local'})), /未注明时区/,
  'an offset-less EXIF time is labelled as a local reinterpretation');

// --- Source: which date a record and a request belongs to -------------------------------------
assert.match(app, /function syncCalendarDay\(\)/, 'the app can notice a new calendar day');
assert.match(app, /if \(activeDate === lastObservedToday\)/, 'a new day follows the clock only when the old day was being viewed');
assert.match(app, /addEventListener\('focus',syncCalendarDay\)/);
assert.match(app, /visibilitychange',\(\)=>\{if\(!document\.hidden\)syncCalendarDay\(\);\}/);
assert.match(app, /id="estimate-date"|#estimate-date|'#estimate-date'/, 'the preview exposes an editable meal date');
assert.match(app, /#estimate-meal-type/, 'the preview exposes an editable meal type');
assert.match(app, /请核对有效的饮食日期/, 'an invalid preview date is refused before saving');
assert.match(app, /photoMeta\(draft\)/, 'the confirmed meal keeps the verified photo metadata');
assert.match(app, /photoMeta\(form\.photo\)/, 'the draft carries the metadata captured at submit time');
assert.match(app, /const submittedImage = chatImage, submittedPhotoMeta = photoMeta\(chatPhotoMeta\), submittedDate = activeDate;/,
  'chat freezes the question date and photo metadata at send time');
assert.match(app, /date:submittedDate/, 'the chat request carries the analysed date');
assert.match(app, /\.\.\.submittedPhotoMeta/, 'the chat request carries the verified photo time');
assert.match(html, /id="estimate-date"/);
assert.match(html, /id="estimate-meal-type"/);
assert.match(html, /id="estimate-photo-time"/);
assert.match(html, /id="meal-photo-time"/);
assert.match(html, /id="chat-photo-time"/);
assert.match(html, /id="chat-data-context"/, 'the chat card states which day will be analysed');
assert.match(html, /id="advice-data-context"/, 'the advice card states which day will be analysed');
assert.match(app, /分析日期：\$\{activeDate\} · 已保存 \$\{count\} 条餐食/, 'both cards show the analysed day and record count');
assert.match(html, /拍摄时间 ≠ 进餐日期/, 'the UI separates capture time from the meal date');

// --- Adapter: the native layer must receive the date and the photo provenance ------------------
// 2026-11-07: both chat routes now build one shared body, so the assertions pin that single source.
const chatBody = adapter.slice(adapter.indexOf('const chatNativeBody='), adapter.indexOf('const chatNativeBody=') + 1200);
assert.match(chatBody, /date:body\?\.date \|\| localDate\(\)/, 'the adapter passes the analysed date to the native layer');
assert.match(chatBody, /photoTakenAt:body\.photoTakenAt/, 'only the vetted provenance fields cross the bridge');
assert.match(chatBody, /photoTimeSource:body\.photoTimeSource/, 'only the vetted provenance fields cross the bridge');
assert.match(adapter, /chatNativeBody\(body,image\)/, 'both chat routes go through that shared body');

// --- HTML integrity: the new controls must exist exactly once ---------------------------------
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicated, [], 'no element id may be duplicated');
for (const id of ['estimate-date', 'estimate-meal-type', 'estimate-photo-time', 'meal-photo-time', 'chat-photo-time', 'chat-data-context', 'advice-data-context']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function setActiveDate\(value\)/, 'one helper owns the analysed day');
assert.match(app, /chat-date-toggle/, 'the chat page can pick a historical analysis date');
assert.match(app, /#chat-date-input'\)\?\.addEventListener\('change'/, 'the picked date becomes the active date');

// --- Unconfirmed draft box ---------------------------------------------------------------------
for (const id of ['draft-box', 'draft-box-text', 'draft-list']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function renderPreview\(view, restored\)/, 'a stored draft reuses the same renderer as a fresh estimate');
assert.match(app, /renderPreview\(view, false\);[\s\S]{0,80}saveToDraftBox\(view\)/, 'a fresh estimate is stored in the draft box');
assert.match(app, /async function saveToDraftBox\(view\)/, 'the draft box has an explicit save path');
assert.match(app, /dropDraft\(id\)/, 'giving up a preview also clears its draft');
assert.match(app, /loadDrafts\(\)/, 'the draft box is loaded with the app');
assert.match(app, /notes:view\.notes,items:view\.items,name:view\.name/, 'the stored draft keeps the numbers and labels');
assert(!/saveToDraftBox[\s\S]{0,400}imageData/.test(app), 'the draft never stores the photo itself');

// --- Meals with no usable date -----------------------------------------------------------------
for (const id of ['undated-meals', 'undated-meals-text', 'undated-meals-date', 'undated-meals-apply']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function undatedMeals\(\)/, 'undated meals are collected in one place');
assert.match(app, /row\.needsDate === true \|\| !validDate\(row\.date\)/, 'both a flag and a malformed date count as undated');
assert.match(app, /async function applyUndatedDate\(\)/, 'the user can assign the missing date');
assert.match(app, /const \{needsDate, \.\.\.rest\} = row; await api\('\/api\/meals', \{\.\.\.rest, date:value\}\)/, 'assigning a date rewrites only that field');

// --- What would be sent ------------------------------------------------------------------------
for (const id of ['chat-data-preview-panel', 'chat-data-preview', 'advice-data-preview-panel', 'advice-data-preview']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /api\('\/api\/context-preview', \{date, kind\}\)/, 'the preview asks the app what it would send');
assert.match(app, /if \(!window\.QinghengAdapter\.hasNative\(\)\)/, 'the browser demo states that it never sends anything');
assert.match(css, /\.data-preview-panel pre\.data-preview\{/, 'the preview block is styled for long JSON');
assert.match(adapter, /path==='\/api\/drafts'/, 'the browser demo keeps a draft box');
assert.match(adapter, /estimateDrafts:copy\(data\.estimateDrafts\)/, 'the demo keeps drafts across reloads');
assert.match(adapter, /path==='\/api\/context-preview'\) throw/, 'the demo refuses a preview it cannot build');

// --- Meal time: the photo's own clock first, then the description, then the record moment ------
const clockBlock = app.slice(app.indexOf('  const clockPattern ='), app.indexOf('  let activeDate = localDate();'));
assert(clockBlock.length > 200, 'the meal-time helpers are delimited');
const clockCtx = {Date};
clockCtx.globalThis = clockCtx;
vm.createContext(clockCtx);
vm.runInContext(clockBlock + '\nglobalThis.defaultMealTime = defaultMealTime; globalThis.clockFromText = clockFromText; globalThis.photoWallClock = photoWallClock; globalThis.mealTimeNote = mealTimeNote; globalThis.nowClock = nowClock;', clockCtx);
const wall = clockCtx.photoWallClock;
const text = clockCtx.clockFromText;
assert.equal(wall({photoTakenAt: '2026-10-16T12:34:56+08:00'}), '12:34', 'the photo wall clock is read from the timestamp itself');
assert.equal(wall({photoTakenAt: '2026-10-16T23:05:00Z'}), '23:05', 'the camera timezone is kept, not converted to the phone zone');
assert.equal(wall({photoTakenAt: null}), null, 'a missing capture time yields no clock');
assert.equal(wall({photoTakenAt: 'not-a-time'}), null, 'a malformed capture time yields no clock');
assert.equal(text('12:30 吃了米饭'), '12:30');
assert.equal(text('晚上7点吃的'), '19:00', 'an evening qualifier shifts the hour');
assert.equal(text('早上七点'), '07:00', 'the 点 form is understood');
assert.equal(text('中午随便吃了点'), '12:30', 'a meal word alone gives a typical time');
assert.equal(text('夜宵'), '22:00');
assert.equal(text('就是米饭和鸡胸肉'), null, 'no time in the text stays unknown');
assert.deepEqual({...clockCtx.defaultMealTime({photoTakenAt: '2026-10-16T08:15:00+08:00'}, '中午吃的', 'lunch')},
  {mealTime: '08:15', mealTimeSource: 'photo'}, 'the photo outranks the description');
assert.deepEqual({...clockCtx.defaultMealTime({photoTakenAt: null}, '中午 12 点吃的', 'lunch')},
  {mealTime: '12:00', mealTimeSource: 'text'}, 'the description is used when there is no photo');
const fallback = clockCtx.defaultMealTime({photoTakenAt: null}, '', 'dinner');
assert.equal(fallback.mealTimeSource, 'now', 'with no evidence the record moment is used');
assert.match(fallback.mealTime, /^\d{2}:\d{2}$/);
assert.match(clockCtx.mealTimeNote({mealTimeSource: 'photo'}), /拍摄时刻/);
assert.match(clockCtx.mealTimeNote({mealTimeSource: 'now'}), /记录时刻/);
for (const id of ['estimate-meal-time', 'estimate-meal-time-note']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /mealTime=\$\('#estimate-meal-time'\)\.value/, 'the confirmed meal time is read from the field');
assert.match(app, /draft\.mealTime=mealTime; draft\.mealTimeSource='manual';/, 'a confirmed time is no longer a guess');
assert.match(app, /mealTime:draft\.mealTime,/, 'the saved meal carries the confirmed time');
assert.match(app, /mealTime:quickTime, mealTimeSource:'manual'/, 'a quick copy also records when it was eaten');
// Step 2 changed the manual submit shape: values are read first so cooking oil can be added once.
assert.doesNotMatch(app, /mealTimeSource:'manual',\.\.\.values/, 'the manual entry path is gone (1.4.46 entry budget)');
assert.match(app, /esc\(meal\.mealTime\)/, 'the meal list shows the meal time');
assert.match(html, /id="estimate-meal-time"/, 'the estimate card still asks for the time');

// --- Voice: own listening sheet, with the system screen only as a fallback ----------------------
for (const id of ['voice-sheet', 'voice-bars', 'voice-status', 'voice-text', 'voice-cancel', 'voice-done']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(html, /data-voice-target="meal"/, 'the microphone sits inside the description field');
assert.match(app, /data-voice-target="quick"/, 'the quick-record dialog gets its own microphone');
assert.match(app, /function openVoiceSheet\(target\)/, 'one entry point opens the listening sheet');
assert.match(app, /try \{bridge\.startVoice\(voice\.target \|\| 'meal'\);\}/, 'the in-app recogniser is tried first');
assert.match(app, /function systemVoiceFallback\(bridge\)/, 'the system recogniser stays as the fallback');
assert.match(app, /else if \(state === 'unavailable'\) systemVoiceFallback\(voiceBridge\(\)\);/, 'an unavailable in-app recogniser hands over instead of failing');
assert.match(fs.readFileSync(new URL('../app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'), /android\.speech\.RecognitionService/, 'the manifest declares the recognition service query needed on Android 11+');
assert.match(app, /window\.__qinghengVoicePartial = payload =>/, 'partial results drive the live text');
assert.match(app, /window\.__qinghengVoiceState = payload =>/, 'listening state drives the status line');
assert.match(app, /voice\.retry = true; voiceButton\(true\);/, 'a failed attempt offers a retry instead of a dead end');
assert.match(app, /document\.addEventListener\('click', event => \{\s*const button = event\.target\.closest\('\[data-voice-target\]'\)/, 'mic buttons are wired by delegation');
assert.match(css, /@keyframes voice-level/, 'the listening sheet animates a level meter');
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\.voice-bars span\{animation:none\}/, 'the animation respects reduced motion');

// --- One visual language for lists and dropdowns ------------------------------------------------
assert.match(css, /select\{appearance:none;-webkit-appearance:none;padding-right:44px;background-image:url\("data:image\/svg\+xml/, 'selects share one custom chevron');
assert.match(css, /input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),select,textarea\{width:100%;border:1px solid var\(--line-strong\);border-radius:var\(--shape-ctrl-radius\)/, 'fields and selects share one shell');
assert.match(css, /\.list-row\{display:flex;align-items:flex-start;gap:12px;/, 'every row list shares one row shell');
assert.match(css, /button\.food-result\.list-row\{/, 'the food library uses the same row shell');
assert.match(app, /class="meal-row list-row"/, 'meal and chat rows adopt the shared shell');
assert.doesNotMatch(app, /class="food-result list-row"/, 'the food-library renderer is gone (1.4.46)');
assert.equal((app.match(/class="meal-row list-row"/g) || []).length, 4, 'today, records, push history and today-advice all use it');
assert.match(app, /role="listitem"/, 'rows keep list semantics');
assert.match(html, /id="record-meals" role="list" aria-label=/, 'list containers keep accessible names');
assert.match(html, /id="draft-list" role="list"/, 'the draft box is a list too');
assert.match(app, /data-draft-restore=|data-draft-restore="/, 'each stored draft can be restored on its own');
assert.match(app, /data-draft-drop="/, 'each stored draft can be dropped on its own');

// --- Rows, rich answers and the local comparison table -----------------------------------------
assert.match(app, /<div class="row-body">/, 'a row is split into a body and a side column');
assert.match(app, /<span class="row-kcal">/, 'energy is right-aligned and separated from the numbers');
assert.match(app, /class="icon-button danger row-delete" data-delete-meal=/, 'the meal delete action is a compact icon in the title row');
assert.match(app, /class="row-side"><span class="row-kcal">/, 'the calorie column holds only the number now');
assert(!app.includes('data-delete-chat'), 'the chat list no longer carries an inline delete control');
assert.match(app, /data-long-press="chat:\$\{esc\(id\)\}"/, 'a chat row is deleted from its long-press sheet instead');
assert(!/data-long-press="chat:[\s\S]{0,700}?row-date/.test(app), 'the chat date is no longer repeated inside every row');
assert.match(app, /class="row-toggle-inline" data-chat-toggle=/, 'a long answer offers an inline 展开全文');
assert.match(app, /row\.question \|\| ''\)\.includes\('含照片'\) \? \['含照片'\]/, 'a photo question is tagged on the head line');
assert.match(app, /联网检索\|参考来源\|来源（联网\/\.test\(answer\) \? \['联网检索'\]/, 'a searched answer is tagged as well');
assert.match(app, /const expandedChats = new Set\(\);/, 'an expanded answer is remembered per record');
assert.match(app, /answer\.length > 140/, 'only long answers get a preview and a toggle');
assert.match(app, /class="row-toggle-inline" data-chat-toggle=/, 'a long answer offers 展开全文');
assert.match(css, /\.answer\.is-clamped\{max-height:5\.4em;overflow:hidden/, 'the preview is clamped to a few lines');
assert.match(css, /\.row-date\{margin-left:auto/, 'the date is pushed to the end of the head line');
assert.match(app, /<span class="row-tag subtle-tag">\$\{esc\(source\)\}<\/span>/, 'meal source and item count are head-line tags, keeping the number line short');
assert.match(app, /class="meal-numbers" aria-label="营养数值"/, 'meal metrics have a dedicated value group');
assert.match(app, /<span><small>蛋白<\/small><b>\$\{fmt\(meal\.protein\)\} g<\/b><\/span>/, 'protein is a named, unit-bearing numeric column');
assert(!/delete-meal">删除</.test(app), 'the old text delete button is gone');
assert.match(app, /<span class="row-tag">\$\{type\}<\/span>/, 'the meal type is a tag beside the name');
assert.match(app, /共 \$\{meal\.items\.length\} 项/, 'the row states how many items the meal has');
assert.match(app, /const source = \(\{manual:'手动'/, 'the row states where the record came from');
assert.match(app, /<span><small>脂肪<\/small><b>\$\{fmt\(meal\.fat\)\} g<\/b><\/span>/, 'fat is a named, unit-bearing numeric column');

assert.match(app, /function answerHtml\(text\)/, 'answers go through one rich renderer');
assert.match(app, /function answerIcon\(text\)/, 'a section picks a coloured icon from its topic');
assert.match(app, /function answerEyebrow\(text\)/, 'uppercase Latin runs become a label');
assert.match(css, /\.answer-eyebrow\{[^}]*text-transform:uppercase/, 'the label is styled as uppercase');
assert.match(app, /function answerTable\(rows\)/, 'pipe tables are recognised');
assert.match(app, /function answerSpaceTable\(rows\)/, 'a whitespace-separated table is recognised too');
assert.match(app, /if \(head\.some\(answerNumericCell\)\) return '';/, 'a numeric header line is not treated as a table');
assert.match(app, /if \(!body\.every\(cells => cells\.slice\(1\)\.every\(answerNumericCell\)\)\) return '';/, 'every remaining column must be numeric, so prose never matches');
// Prompt wording now lives in cn.qingheng.health.ai.Prompts (step 8 moved it out of the activity).
const promptsJava = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/ai/Prompts.java', import.meta.url), 'utf8');
assert.match(promptsJava, /管道表格写法：第一行表头/, 'the chat prompt asks for a pipe table when comparing numbers');
assert.match(promptsJava, /只有真的在对比多个数值时才用表格/, 'the advice prompt asks for the same');
assert.match(app, /split\(\/\\n\\s\*\\n\/\)/, 'the answer is parsed block by block');
assert.match(app, /<table class="answer-table">/, 'a table is rendered as real table markup');
assert.match(app, /answerInline = text => esc\(text\)/, 'answer text is escaped before any markup is added');
assert.match(css, /\.answer-table th,\.answer-table td\{border:1px solid var\(--line\)/, 'answer tables share the app table style');
for (const id of ['stats-table']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /function statsTableHtml\(\)/, 'the comparison table is computed locally, without a model');
assert.match(app, /function median\(values\)/, 'medians are used so one odd reading cannot move the table');
assert.match(app, /按中位数比较「30~60 天前」与「最近 30 天」/, 'the table states its own basis and limits');
assert.match(app, /不是健康或医疗结论/, 'the table explicitly refuses a medical reading');
assert.match(css, /\.stats-table tbody tr:last-child td\{border-bottom:none\}/, 'the comparison table is styled');
assert.match(css, /\.stats-good\{color:var\(--tone-weight\)\}\.stats-bad\{color:var\(--warn-ink\)\}/, 'direction colours are defined');

assert.match(css, /\.app-dialog-panel\{width:min\(560px,100%\)/, 'dialogs are wider than before');
assert.match(css, /\.voice-panel\{width:min\(560px,100%\)/, 'the listening sheet matches the dialog width');
assert.match(html, /icon-glyph-ring\.svg/, 'navigation reuses the ring glyph family');
for (const [tab, icon] of [['today','icon-glyph-ring.svg'],['records','icon-glyph-balance.svg'],['chat','icon-glyph-chat.svg'],['trends','icon-glyph-trends.svg'],['profile','icon-nav-profile.svg']]) {
  const block = html.slice(html.indexOf(`data-tab="${tab}"`));
  assert(block.slice(0, 260).includes(icon), `the ${tab} tab uses ${icon}`);
}
assert.match(html, /icon-mic\.svg/, 'the microphone uses the shared icon family');
assert(!/nav-icon" aria-hidden="true">☀/.test(html), 'the old font glyph is gone');
assert(!html.includes('🎙'), 'no emoji remains in the microphone button');

// --- One sheet for pickers and long-press actions ----------------------------------------------
for (const id of ['action-sheet', 'action-sheet-title', 'action-sheet-list', 'action-sheet-cancel']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /function openSheet\(config\)/, 'one sheet component serves pickers and actions');
assert.match(app, /function chooseFromSelect\(select\)/, 'every select is answered by the custom sheet');
assert.match(app, /document\.addEventListener\('touchstart', event => \{\s*const select = event\.target\.closest\?\.\('select'\);[\s\S]{0,120}event\.preventDefault\(\);/, 'the platform select dialog is suppressed on touch');
assert.match(app, /select\.dispatchEvent\(new Event\('change', \{bubbles: true\}\)\)/, 'choosing an option still fires change, so existing handlers keep working');
assert.match(app, /function fieldLabelFor\(control\)/, 'the sheet is titled by the field it belongs to');
assert.match(css, /\.sheet-option\{display:flex;align-items:center;gap:12px/, 'sheet rows follow the app list style');
assert.match(css, /\.sheet-option\.is-danger\{color:var\(--danger\)\}/, 'a destructive action is visually distinct');
assert.match(html, /id="action-sheet" hidden role="presentation"/, 'the sheet ships hidden');

assert.match(app, /data-long-press="meal:\$\{esc\(meal\.id \?\? ''\)\}"/, 'a meal row can be long-pressed');
assert.match(app, /const LONG_PRESS_MS = 520;/, 'long press has an explicit threshold');
assert.match(app, /\{label: '复制文本', icon: 'icon-copy\.svg'\}/, 'the action sheet offers copy');
assert.match(app, /\{label: '选择文字', icon: 'icon-select\.svg'\}/, 'the action sheet offers text selection');
assert.match(app, /\{label: favorite \? '取消收藏' : '收藏', icon: 'icon-bookmark\.svg'\}/, 'the action sheet offers a favourite toggle');
assert.match(app, /\{label: '删除', icon: 'icon-trash\.svg', danger: true\}/, 'the action sheet offers delete');
assert.match(app, /function selectRowText\(row\)/, 'selection hands the row to the platform handles');
assert.match(app, /range\.selectNodeContents\(body\);/, 'the whole row body is selected');
assert.match(app, /bridge\.copyText\(value\) === true/, 'copy prefers the native clipboard bridge');
assert.match(app, /navigator\.clipboard\.writeText\(value\)/, 'with a browser fallback');
assert.match(mainJava, /public boolean copyText\(String text\)/, 'the native bridge writes the clipboard without reading it');
assert.match(mainJava, /manager\.setPrimaryClip\(android\.content\.ClipData\.newPlainText/, 'the clipboard write is a plain text clip');
assert.match(css, /\.meal-row,\.meal-row \*,\.answer,\.answer \*,\.list-row,\.list-row \*\{user-select:none/, 'rows and answers opt out of native selection, so a long press shows app actions only');
assert.match(css, /\.is-selecting,\.is-selecting \.row-body[^{]*\{user-select:text/, 'selection mode re-enables it on demand');

assert.match(app, /function toggleFavorite\(kind, record\)/, 'favourites are persisted through the existing record routes');
assert.match(app, /favorite: record\.favorite !== true/, 'the flag is toggled rather than set twice');
assert.match(app, /class="fav-badge"/, 'a favourite row is marked');
assert.match(app, /bindFavoriteFilter\('chat-favorites-only'/, 'the chat list can show favourites only');
assert.match(app, /bindFavoriteFilter\('meal-favorites-only'/, 'the meal list can show favourites only');
assert.match(html, /id="chat-favorites-only" aria-pressed="false"/, 'the filter is a pressed-state chip');
assert.match(html, /id="meal-favorites-only" aria-pressed="false"/, 'the meal filter is a pressed-state chip');
assert.match(app, /function chatRowsInScope\(\) \{[\s\S]{0,220}const base = favoriteOnlyChats \? chats\.filter\(row => row\.favorite === true\) : chats;[\s\S]{0,140}return base\.filter\(row => chatMatches\(row, chatQuery\)\);/, 'the chat filter really filters');
assert.match(app, /const shown = chatRowsInScope\(\);/, 'renderChat reads the filtered rows from one place');

// --- 问答记录：按天查看 + 日期翻页 ------------------------------------------------------------
assert.match(html, /id="chat-day-toggle" aria-pressed="false"/, 'the history has a day chip');
assert.match(html, /id="chat-day-prev"[\s\S]{0,260}id="chat-day-next"/, 'the day chip is flanked by step buttons');
assert.match(app, /DEFAULT_MEAL_WINDOW = {lunchFrom:'11:20', dinnerFrom:'16:30', snackFrom:'22:00'}/, 'the default meal window has lunch, dinner and snack turn-over points');
assert.match(app, /if \(value >= dinnerFrom\) return 'dinner';/, 'the default slot reaches dinner before snack');
assert.match(html, /id="meal-window-dinner"/, 'the appearance sub-page can edit the dinner turn-over');
assert.match(app, /let chatDayFilter = '';/, 'the day filter keeps a session state');
assert.match(app, /function chatDates\(\)/, 'the pager walks the dates that actually have records');
assert.match(app, /const dayRows = chatDayFilter \? shown\.filter\(row => String\(row\.date \|\| ''\) === chatDayFilter\) : shown;/, 'renderChat honours the day filter');
assert.match(app, /if \(!chatDayFilter\) \{ if \(dir < 0\) setChatDayFilter\(dates\[0\]\); return; \}/, 'the arrows start from the newest day and clear back to all');
assert.match(app, /installChatDayFilter\(\);/, 'the day filter is wired at boot');

// --- Advice is invalidated when the records change ---------------------------------------------
assert.match(app, /function mealsFingerprint\(date\)/, 'the advice is tied to a record fingerprint');
assert.match(app, /container\.dataset\.fingerprint = validDate\(date\) \? mealsFingerprint\(date\) : '';/, 'the fingerprint is stored with the advice');
assert.match(app, /const isStale=!!baked && shown===activeDate && baked!==mealsFingerprint\(activeDate\);/, 'a changed day marks the advice as stale');
for (const id of ['advice-stale']) assert(ids.includes(id), `the page defines #${id}`);

console.log('PASS meal date context: capture time is kept or declared unknown, never fabricated; the analysed day is explicit and editable in the photo, chat and advice paths.');
