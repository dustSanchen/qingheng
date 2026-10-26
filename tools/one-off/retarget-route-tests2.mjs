import fs from 'node:fs';
const edits = {
 'tests/ci-and-versions.test.mjs': [
  ["check('a versions route exists', main.includes('if (get && path.equals(\"/api/versions\")) return versions();'));",
   "check('a versions route exists', routes.includes('path.equals(\"/api/versions\")') && main.includes('MetaRoutes.handle(path, get, post, b, this)'));"],
  ["check('versions never include keys or records', /private JSONObject versions\\(\\) throws Exception \\{[\\s\\S]{0,900}?\\}/.test(main) && !/versions\\(\\)[\\s\\S]{0,900}apiKey/.test(main));",
   "check('versions never include keys or records', /private JSONObject versionsInternal\\(\\) throws Exception \\{[\\s\\S]{0,900}?\\}/.test(main) && !/versionsInternal\\(\\)[\\s\\S]{0,900}apiKey/.test(main));"],
  ["check('versions report the anchors and last backup', main.includes('.put(\"anchorsPresent\"') && main.includes('.put(\"backupAt\", backupStatus().optLong(\"at\", 0L))'));",
   "check('versions report the anchors and last backup', main.includes('.put(\"anchorsPresent\"') && /backupAt\", backupStatusInternal\\(\\)\\.optLong\\(\"at\", 0L\\)/.test(main));"],
 ],
 'tests/onboarding-backup.test.mjs': [
  ["check('native exposes backup bookkeeping', main.includes('if (path.equals(\"/api/backup\"))'));",
   "check('native exposes backup bookkeeping', routes.includes('path.equals(\"/api/backup\")') && main.includes('public JSONObject recordBackup(int records)'));"],
 ],
};
for (const [file, pairs] of Object.entries(edits)) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) continue;
    if (count !== 1) throw new Error(`${file}: anchor ${count}x -> ${from.slice(0, 60)}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log('retargeted ' + file);
}
