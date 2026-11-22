import fs from 'node:fs';
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');
const sched = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', 'utf8');
const push = fs.readFileSync('app/src/main/java/cn/qingheng/health/PushNotify.java', 'utf8');
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// --- The chat/advice context must let the model tell which day a record belongs to --------------
check('chat takes the analysed day from the request', main.includes('String selectedDate = analysisDate(b.opt("date"), dayOffset(0));'));
check('a bad analysed day is refused instead of silently replaced', /private static String analysisDate\(Object raw, String today\)[\s\S]{0,400}throw fail\("请选择有效的 YYYY-MM-DD 日期"\)/.test(main));
check('chat context is appended after the history', /for \(int i = 0; i < history\.length\(\); i\+\+\) messages\.put\(history\.get\(i\)\);[\s\S]{0,1200}if \(!planFocus\) messages\.put\([\s\S]{0,160}chatDataContext\(selectedDate\)/.test(main));
for (const field of ['"today"', '"timezone"', '"selectedDate"', '"mealCount"', '"dailyNutrition"', '"recordPolicy"']) {
  check('chat context carries ' + field, main.includes(`.put(${field}`));
}
check('the context states that capture time is not the meal date', main.includes('拍摄时间不等于进餐日期'));
check('the context states that mealCount 0 is not zero intake', main.includes('mealCount=0表示未记录'));
check('per-day counts come from every record, not the capped list', main.includes('mealCount(selectedDate)') && main.includes('private int mealCount(String day)'));
check('daily nutrition reports completeness per day', main.includes('nutritionComplete'));
check('the meal window is anchored on the analysed day', main.includes('dayOffsetFrom(selectedDate, -13)'));
check('advice anchors its window on the analysed day too', main.includes('dayOffsetFrom(day, -13)'));
check('the meal window keeps dates and sorts newest first', /matching\.sort\(\(a, b\) -> recordDate\(b\)\.compareTo\(recordDate\(a\)\)\)/.test(main));
check('a meal row keeps its date even without macros', main.includes('Date and existence remain meaningful even if every macro is missing'));
check('the old fixed 24k JSON cut is gone', !main.includes('json.substring(0, 24000)'));
check('the chat cap is documented and bounded', main.includes('if (out.length() >= 200) break;'));
check('meal rows carry a whitelisted meal type', main.includes('new HashSet<>(java.util.Arrays.asList("breakfast", "lunch", "dinner", "snack")).contains(type)'));
check('meal rows never carry names, notes or ids', !/datedMeal\([\s\S]{0,300}optString\("name"/.test(main));

// --- Photo provenance: kept when real, declared unknown otherwise -------------------------------
check('photo provenance is whitelisted', main.includes('new HashSet<>(java.util.Arrays.asList("camera", "exif", "exif-local"))'));
check('an unusable timestamp falls back to unknown', /return new JSONObject\(\)\.put\("photoTakenAt", JSONObject\.NULL\)\.put\("photoTimeSource", "unknown"\);/.test(main));
check('the camera capture is stamped before launch', main.includes('.putString("pending_photo_time_source", "camera")'));
check('gallery picks drop a stale camera stamp', main.includes('.remove("pending_photo_taken_at").putString("pending_photo_time_source", "unknown")'));
check('EXIF DateTimeOriginal is read', main.includes('TAG_DATETIME_ORIGINAL'));
check('an EXIF offset is used when present', main.includes('TAG_OFFSET_TIME_ORIGINAL') && main.includes('"exif"'));
check('an offset-less EXIF time is marked exif-local', main.includes('"exif-local"'));
check('a future capture time is rejected', main.includes('isAfter(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))'));
check('the pending photo metadata helper exists', main.includes('private JSONObject pendingPhotoMetadata(String uri)'));
check('the delivered payload carries the photo time', main.includes('.put("photoTakenAt", photoTime.opt("photoTakenAt"))'));
check('pending photo time is cleared with the capture', main.includes('.remove("pending_photo_taken_at").remove("pending_photo_time_source")'));

// --- The daily push must treat only meals as meals ---------------------------------------------
check('the receiver reads meals only', alarm.includes('data.mealsOn(today)'));
check('no collection loop mixes weight and habits into meals', !alarm.includes('new String[]{"meals", "measurements", "habits"}'));
check('the receiver counts meals from raw records', alarm.includes('int mealCount(String day)'));
check('push rows keep date and meal type', alarm.includes('row.put("mealType", safeMealType(record))') && alarm.includes('if (date.length() == 10) row.put("date", date);'));
check('a meal without macros is still reported', alarm.includes('A meal with missing macros is still evidence that it was eaten'));
check('the push prompt is never cut mid-JSON', !alarm.includes('content.substring(0, PROMPT_LIMIT)') && alarm.includes('private static JSONArray buildPrompt(String system, JSONObject user)'));
check('trimming drops rows before optional blocks', /if \(rows != null && rows\.length\(\) > 0\)[\s\S]{0,400}if \(user\.has\("body"\)\)/.test(alarm));
check('an unfit prompt fails loudly instead of sending broken JSON', alarm.includes('throw new PublicError("今日记录过多，无法生成推送分析")'));
check('the push prompt separates capture time from the meal date', prompts.includes('拍摄时间只是照片证据，不等于进餐时间'));
check('the push reports how many meals exist today', alarm.includes('.put("mealCount"'));

// --- A meal with no usable date is repaired or surfaced, never silently lost -------------------
check('invalid meal dates are refused on write', main.includes('if (collection.equals("meals")) requireMealFields(record);') && main.includes('请选择有效的饮食日期（YYYY-MM-DD）后再保存'));
check('the repair runs inside the shared normaliser', /ensureChatIds\(out\);\s*\n\s*migrateSeedData\(out\);\s*\n\s*repairMealDates\(out\);/.test(main));
check('the repair is gated by a marker', main.includes('!(root.opt("mealDateRepaired") instanceof Number)') && main.includes('root.put("mealDateRepaired", 1)'));
check('the repair prefers the capture time', /inferMealDate[\s\S]{0,300}photoTakenAt[\s\S]{0,200}OffsetDateTime\.parse/.test(main));
check('the repair falls back to the creation time', /inferMealDate[\s\S]{0,600}createdAt[\s\S]{0,200}ofEpochMilli/.test(main));
check('a record with no evidence is flagged, not dated', main.includes('meal.put("needsDate", true)') && main.includes('is invented: a record with no usable evidence is flagged'));
check('the count of still-undated meals is reported', main.includes('root.put("undatedMeals", undated)'));
check('a repaired count is reported once', main.includes('root.put("mealDateRepair", new JSONObject().put("count", repaired)'));
check('a valid date clears the flag', main.includes('if (validDay(recordDate(meal))) { meal.remove("needsDate"); continue; }'));

// --- Draft box and payload preview -------------------------------------------------------------
check('the draft box route exists', main.includes('path.equals("/api/drafts")') && main.includes('path.startsWith("/api/drafts/")'));
check('drafts are capped', main.includes('private static final int DRAFT_LIMIT = 5;'));
check('a stored draft re-arms its id for confirmation', main.includes('!storedDraftExists(draftId)'));
check('confirming a meal clears its draft atomically', main.includes('next.put(DRAFTS, withoutDraft(next.optJSONArray(DRAFTS), draftId));'));
check('drafts are scrubbed before storage', /saveStoredDraft[\s\S]{0,500}scrub\(draft\)/.test(main));
check('the preview route exists and shares the builders', main.includes('private JSONObject contextPreview(JSONObject b)') && main.includes('.put("system", adviceSystemPrompt() + preferenceSuffix(b)).put("user", adviceInput(day))'));
check('chat and advice share one system prompt each', main.includes('private static String adviceSystemPrompt()') && main.includes('chatSystemPrompt()'));
check('the advice request uses the shared payload builder', /JSONObject input = adviceInput\(day\);/.test(main));
check('the preview never calls a provider', !/contextPreview[\s\S]{0,600}chat\(c,/.test(main));

// --- Meal time: taken from the photo by default, editable, and sent to the model ---------------
check('a malformed meal time is refused', main.includes('if (!time.isEmpty() && !validClock(time)) throw fail("进餐时间格式应为 HH:mm")'));
check('the clock format is validated in one place', main.includes('private static boolean validClock(String value)'));
check('only a real clock time reaches the model', main.includes('private static String safeMealTime(JSONObject record)') && main.includes('if (!mealTime.isEmpty()) row.put("mealTime", mealTime);'));
check('the context explains mealTime versus photo time', main.includes('mealTime 是进餐时刻') && main.includes('photoTakenAt 只是照片证据'));
check('the push payload carries the meal time', alarm.includes('if (mealTime.matches("^([01]\\\\d|2[0-3]):[0-5]\\\\d$")) row.put("mealTime", mealTime);'));

// --- Records-triggered push ---------------------------------------------------------------------
check('a records-triggered slot exists', sched.includes('SLOT_MEAL = "meal"') && sched.includes('REQUEST_MEAL = 7003'));
check('the follow-up is armed once per day', main.includes('!AlarmScheduler.ran(this, AlarmScheduler.today(), AlarmScheduler.SLOT_MEAL)') && main.includes('AlarmScheduler.scheduleMealFeedback(this, MEAL_FEEDBACK_DELAY_MS)'));
check('disabling push cancels the follow-up', sched.includes('manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL))'));
check('the receiver accepts the follow-up slot', alarm.includes('!AlarmScheduler.SLOT_MEAL.equals(slot)'));
check('an empty day does not call the model', alarm.includes('boolean worthCalling = consent') && alarm.includes('&& hasData;'));
check('the follow-up has its own prompt wording', alarm.includes('刚记录完一餐，给出这一餐的即时反馈'));
check('the follow-up gets its own notification identity', push.includes('ID_MEAL = 7304') && push.includes('"meal".equals(slot)'));

// --- In-app voice recognition -------------------------------------------------------------------
check('the app runs its own recogniser', main.includes('android.speech.SpeechRecognizer.createSpeechRecognizer(this)') && main.includes('private final class VoiceListener'));
check('partial results are forwarded to the page', main.includes('onPartialResults') && main.includes('window.__qinghengVoicePartial'));
check('listening state is forwarded to the page', main.includes('window.__qinghengVoiceState'));
check('availability decides between the custom sheet and the system one', main.includes('inAppVoiceAvailable()') && main.includes('private boolean startInAppVoiceIfPossible(String target)'));
check('the recogniser is released with the activity', main.includes('if (recognizer != null) { try { recognizer.destroy(); }'));
check('the bridge exposes start/stop/cancel and readiness', main.includes('public void startVoice(String target)') && main.includes('public void stopVoice()') && main.includes('public void cancelVoice()') && main.includes('public boolean inAppVoiceReady()'));

// --- Version is owned in one place --------------------------------------------------------------
const build = fs.readFileSync('build.ps1', 'utf8');
check('build.ps1 takes the version as a parameter', /\$Version='\d+\.\d+\.\d+'/.test(build) && /\$VersionCode=\d+/.test(build));
check('build.ps1 uses the parameter everywhere', build.includes("'--version-code',\"$VersionCode\"") && build.includes("'--version-name',$Version") && build.includes('$apkName="qingheng-$Version.apk"'));
check('build.ps1 rejects a malformed version', build.includes("Version must look like"));

// --- SQLite mirror (write-through, JSON stays authoritative) ------------------------------------
const sync = fs.readFileSync('app/src/main/java/cn/qingheng/health/SyncDatabase.java', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the database version was raised for the mirror', sync.includes('private static final int VERSION = 2;'));
check('an upgrade creates the mirror without dropping data', /if \(oldVersion < 1\) onCreate\(db\);\s*else if \(oldVersion < 2\) createMirror\(db\);/.test(sync));
check('the mirror keeps one row per record', sync.includes('PRIMARY KEY(collection, record_id)'));
check('the mirror stores the whole record as payload', sync.includes('String payload = record.toString();') && sync.includes('values.put("payload", payload);'));
check('the mirror rewrites inside one transaction', /db\.beginTransaction\(\);[\s\S]{0,2500}db\.setTransactionSuccessful\(\);/.test(sync));
check('the mirror records when it last ran', sync.includes('"lastMirroredAt"') && sync.includes('public long lastMirroredAt()'));
check('per-collection counts come from the mirror table', sync.includes('public org.json.JSONObject mirrorCounts()'));
check('every write mirrors after the JSON save', /persist\(\); \} catch \(Exception e\) \{ state = previous; throw e; \}\s*mirrorToDatabase\(\);/.test(main));
check('a mirror failure never blocks the save', /catch \(Exception e\) \{[\s\S]{0,200}lastMirrorError = "SQLite 镜像写入失败";/.test(main));
check('the mirror error carries no record content', !/lastMirrorError = [^"]*\+/.test(main));
check('the status route reports both stores and parity', main.includes('private JSONObject storageStatus(boolean remirror)') && main.includes('path.equals("/api/storage-status") && get') && main.includes('path.equals("/api/storage-remirror")'));
check('parity is a real comparison, not a constant', main.includes('boolean parity = json.length() > 0 && json.toString().equals(sqlite.toString());'));
check('the status states the authority and the window limit', main.includes('JSON 为权威来源；SQLite 为同步镜像') && main.includes('.put("windowLimit", 200)'));
check('the first load establishes a baseline mirror', main.includes('if (syncDatabase.lastMirroredAt() == 0L) mirrorToDatabase();'));

// --- Profile hub with sub-pages -----------------------------------------------------------------
for (const id of ['profile-hub', 'subpage-targets', 'subpage-model', 'subpage-appearance', 'subpage-data', 'storage-status', 'storage-refresh', 'storage-remirror', 'about-version']) {
  check('the page defines #' + id, html.includes(`id="${id}"`));
}
check('four merged entries are present', (html.match(/data-subpage-open=/g) || []).length === 4);
check('moved cards keep their ids', ['profile-form', 'settings-form', 'push-form', 'export-data'].every(id => html.includes(`id="${id}"`)));
check('the footer stays inside the profile view', html.indexOf('<footer class="page-footer">') > html.indexOf('id="view-profile"'));
check('the router knows every sub-page', /const SUBPAGES = \['targets', 'model', 'appearance', 'data'\];/.test(app));
check('the hash is parsed as tab/sub', app.includes('function parseHash()') && app.includes("const sub = SUBPAGES.includes(parts[1]) ? parts[1] : '';"));
check('entering a sub-page pushes history for the system back button', app.includes('history.pushState(null, \'\', `#profile/${id}`)'));
check('restoring the tab ignores the sub-page', /function restoreTab\(\) \{\s*const fromHash = parseHash\(\)\.tab;/.test(app));
check('hub summaries are refreshed from state', app.includes('function renderHub()') && app.includes('renderHub();'));
check('the storage panel is driven by the new route', app.includes("api(remirror ? '/api/storage-remirror' : '/api/storage-status'"));
check('the app version is a single constant', app.includes("const APP_VERSION = '1.5.29'"));
check('the shown version matches the build script', (() => {
  const shown = /const APP_VERSION = '([0-9.]+)'/.exec(app);
  const built = /\$Version='([0-9.]+)'/.exec(fs.readFileSync('build.ps1', 'utf8'));
  return !!shown && !!built && shown[1] === built[1];
})(), 'APP_VERSION and build.ps1 must agree');

// --- Health Connect was removed on purpose: watch sync is out of scope for now ----------------------
const manifest = fs.readFileSync('app/src/main/AndroidManifest.xml', 'utf8');
check('the Health Connect bridge file is back', fs.existsSync('app/src/main/java/cn/qingheng/health/HealthConnectSync.java'));
check('the five health read permissions are declared', ['READ_SLEEP', 'READ_STEPS', 'READ_EXERCISE', 'READ_ACTIVE_CALORIES_BURNED', 'READ_DISTANCE'].every(name => manifest.includes('android.permission.health.' + name)));
check('the Health Connect route and bridge method are back', /healthConnectStatus|health-connect\/status/.test(main) && /requestHealthConnectPermissions/.test(main) && /health-connect\/sync/.test(app));
check('the rationale entry is back too', manifest.includes('ACTION_SHOW_PERMISSIONS_RATIONALE'));

// --- Reminders: on time, never two in one window, short enough for the shade ---------------------
check('the alarm-clock permission is declared for on-time delivery', manifest.includes('android.permission.USE_EXACT_ALARM'));
check('exact scheduling is still attempted first', sched.includes('manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)'));
check('a minimum gap between reminders is defined', sched.includes('public static final long MIN_GAP_MS = 3 * 60 * 60 * 1000L;'));
check('catch-up returns at most one slot', sched.includes('public static String catchUpSlot(Context context)') && sched.includes('String latest = eveningMissed ? SLOT_EVENING : SLOT_MORNING;'));
check('catch-up is refused only after a reminder already went out today', sched.includes('postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS'));
check('a silent day still gets its catch-up reminder', sched.includes('public static boolean postedToday(Context context)') && sched.includes('KEY_LAST_POSTED_DAY'));
check('a skipped slot is marked so it cannot fire later with stale content', /catchUpSlot[\s\S]{0,1200}markRan\(context, today, slot\);[\s\S]{0,200}recordSkip\(context, today, slot\);/.test(sched));
check('a later missed slot supersedes an earlier one', sched.includes('if (eveningMissed) {') && sched.includes('markRan(context, today, SLOT_MORNING);'));
check('a posted reminder records its time', sched.includes('public static void markPosted(Context context)') && sched.includes('public static boolean tooSoonAfterLastPost(Context context)'));
check('the receiver refuses a second reminder only after one was posted', alarm.includes('if (AlarmScheduler.tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)) {') && alarm.includes('AlarmScheduler.markPosted(context);'));
check('the startup catch-up uses the single-slot decision', main.includes('String slot = AlarmScheduler.catchUpSlot(this);') && !main.includes('if (AlarmScheduler.missedToday(this, slot)) AlarmReceiver.catchUp(this, slot);'));
check('the notification body is condensed for the shade', alarm.includes('private static final int NOTIFY_TEXT_LIMIT = 58;') && alarm.includes('static String condense(String text)'));
check('condensing prefers a sentence ending inside the limit', alarm.includes("if (c == '。' || c == '！' || c == '？' || c == '；') {cut = i + 1; break;}"));
check('the short text and the full text are both posted', push.includes('public static boolean post(Context context, String slot, String shortBody, String fullBody)') && push.includes('new Notification.BigTextStyle().bigText(expanded)') && alarm.includes('PushNotify.post(context, slot, condense(body), body)'));
check('the model is asked for a very short reply', prompts.includes('每条不超过 30 个汉字') && prompts.includes('actions'));
check('a skip is written to the history', alarm.includes('static void recordSkip(Context context, String today, String slot)') && alarm.includes('本次提醒已跳过'));
check('the app labels a skipped reminder', app.includes("row.source === 'skipped' ? '<span class=\"row-tag\">已跳过</span>'"));
check('the push panel explains the gap and the one-line body', app.includes('两次之间至少间隔 3 小时') && app.includes('通知正文会自动精简到一行'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;


// 不健身是一个答案，不是一个非法值：training = "none" 必须能保存。
{
  const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');
  check('training accepts the literal none', java.includes('"none".equals(String.valueOf(trainingRaw))'));
}
