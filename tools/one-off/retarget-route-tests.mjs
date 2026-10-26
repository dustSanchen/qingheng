/*
 * Step 8 follow-up: the meta routes moved from MainActivity into bridge/MetaRoutes, so the tests that
 * assert "this route exists with this rule" must read the route class. Same requirements, new home.
 */
import fs from 'node:fs';

const routesVar = "const routes = fs.readFileSync('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java', 'utf8');";

const edits = [
  ['tests/anchors-oil.test.mjs', [
    ["const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');",
      "const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');\n" + routesVar],
    ["check('native route stores the anchor block', main.includes('if (path.equals(\"/api/anchors\"))') && main.includes('foodAnchors'));",
      "check('native route stores the anchor block', routes.includes('path.equals(\"/api/anchors\")') && main.includes('foodAnchors'));"],
    ["check('native bounds the anchor block', main.includes('锚点文本过长（上限 4000 字符）'));",
      "check('native bounds the anchor block', routes.includes('锚点文本过长（上限 4000 字符）'));"],
  ]],
  ['tests/ci-and-versions.test.mjs', [
    ["const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');",
      "const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');\nconst routes = read('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java');"],
    ["check('a versions route exists', main.includes('if (get && path.equals(\"/api/versions\")) return versions();'));",
      "check('a versions route exists', routes.includes('path.equals(\"/api/versions\")') && main.includes('MetaRoutes.handle(path, get, post, b, this)'));"],
    ["check('versions never include keys or records', /private JSONObject versions\\(\\) throws Exception \\{[\\s\\S]{0,900}?\\}/.test(main) && !/versions\\(\\)[\\s\\S]{0,900}apiKey/.test(main));",
      "check('versions never include keys or records', /private JSONObject versionsInternal\\(\\) throws Exception \\{[\\s\\S]{0,900}?\\}/.test(main) && !/versionsInternal\\(\\)[\\s\\S]{0,900}apiKey/.test(main));"],
    ["check('versions report the anchors and last backup', main.includes('.put(\"anchorsPresent\"') && main.includes('.put(\"backupAt\", backupStatusInternal().optLong(\"at\", 0L))'));",
      "check('versions report the anchors and last backup', main.includes('.put(\"anchorsPresent\"') && /backupAt\", backupStatusInternal\\(\\)\\.optLong\\(\"at\", 0L\\)/.test(main));"],
  ]],
  ['tests/onboarding-backup.test.mjs', [
    ["const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');",
      "const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');\n" + routesVar],
    ["check('native exposes backup bookkeeping', main.includes('if (path.equals(\"/api/backup\"))'));",
      "check('native exposes backup bookkeeping', routes.includes('path.equals(\"/api/backup\")') && main.includes('public JSONObject recordBackup(int records)'));"],
    ["check('native records when the export happened', main.includes('next.put(\"backup\", new JSONObject().put(\"at\", System.currentTimeMillis())'));",
      "check('native records when the export happened', main.includes('next.put(\"backup\", new JSONObject().put(\"at\", System.currentTimeMillis())'));"],
    ["check('native counts records across all collections', /for \\(String key : new String\\[\\]\\{\"meals\", \"measurements\", \"habits\", \"chats\"\\}\\)/.test(main));",
      "check('native counts records across all collections', /for \\(String key : new String\\[\\]\\{\"meals\", \"measurements\", \"habits\", \"chats\"\\}\\)/.test(main));"],
  ]],
];

for (const [file, pairs] of edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) continue;
    if (count !== 1) throw new Error(`${file}: anchor ${count}x -> ${from.slice(0, 70)}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log(`retargeted ${file}`);
}
