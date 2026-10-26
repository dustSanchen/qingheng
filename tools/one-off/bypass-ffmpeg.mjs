import fs from 'node:fs';
const f = 'tools/bili_asr_batch.py';
let t = fs.readFileSync(f, 'utf8');
t = t.replace(`            wav = os.path.join(OUT_DIR, bvid + '.wav')
            to_wav(m4s, wav)
            count, duration = transcribe(wav, out_txt, model)
            for path in (m4s, wav):
                try:
                    os.remove(path)
                except OSError:
                    pass`,
`            # PyAV (bundled with faster-whisper) decodes the m4s directly; ffmpeg is blocked by the
            # sandbox from writing files, so it is not used here.
            count, duration = transcribe(m4s, out_txt, model)
            try:
                os.remove(m4s)
            except OSError:
                pass`);
fs.writeFileSync(f, t);
console.log('ffmpeg bypassed:', !t.includes('to_wav(m4s, wav)'));
