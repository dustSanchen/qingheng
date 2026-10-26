import fs from 'node:fs';
const f = 'tools/bili_asr_batch.py';
let t = fs.readFileSync(f, 'utf8');
t = t.replace("    model = WhisperModel('small', device='cpu', compute_type='int8', num_workers=4)",
"    model_dir = os.environ.get('FW_MODEL_DIR', r'D:\\AI\\_tools\\asr\\fw-small')\n    model = WhisperModel(model_dir, device='cpu', compute_type='int8', num_workers=4)");
fs.writeFileSync(f, t);
console.log('model dir pinned:', t.includes('FW_MODEL_DIR'));
