import fs from 'node:fs';
const f = 'tools/bili_asr_batch.py';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('reconfigure(encoding')) {
  t = t.replace("import urllib.request\n", "import urllib.request\n\n# The console here is GBK; titles contain emoji, so force UTF-8 with replacement.\ntry:\n    sys.stdout.reconfigure(encoding='utf-8', errors='replace')\n    sys.stderr.reconfigure(encoding='utf-8', errors='replace')\nexcept Exception:  # noqa: BLE001\n    pass\n");
  fs.writeFileSync(f, t);
}
console.log('utf8 stdout:', fs.readFileSync(f,'utf8').includes('reconfigure(encoding'));
