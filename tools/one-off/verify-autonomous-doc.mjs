import fs from 'node:fs';
const p = 'docs/design/11-codex-autonomous.md';
const t = fs.readFileSync(p, 'utf8');
console.log('lines:', t.split(/\r?\n/).length);
// 校验文档里点名的工具与文件真实存在
const must = ['tools/dev-loop.ps1','tools/test-all.mjs','tools/device.mjs','docs/design/09-codex-handoff.md','docs/design/10-codex-prompt.md','docs/design/03-global-changes.md','app/src/fragments/20-permissions-backup.fragment.js'];
for (const m of must) console.log(m.padEnd(52), fs.existsSync(m));
console.log('backups dir exists:', fs.existsSync('backups'));
