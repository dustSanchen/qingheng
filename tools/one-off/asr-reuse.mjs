import fs from 'node:fs';
const f = 'tools/bili_asr_batch.py';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('reuse the downloaded audio')) {
  t = t.replace(`            audio_url = fetch_audio_url(bvid, info['cid'])
            m4s = os.path.join(OUT_DIR, bvid + '.m4s')
            size = download(audio_url, m4s)`,
`            m4s = os.path.join(OUT_DIR, bvid + '.m4s')
            # reuse the downloaded audio when a previous run was interrupted
            if os.path.exists(m4s) and os.path.getsize(m4s) > (1 << 20):
                size = os.path.getsize(m4s)
                print('[reuse] %s (%d MB)' % (bvid, size >> 20), flush=True)
            else:
                audio_url = fetch_audio_url(bvid, info['cid'])
                size = download(audio_url, m4s)`);
  fs.writeFileSync(f, t);
}
console.log('reuse enabled:', fs.readFileSync(f,'utf8').includes('reuse the downloaded audio'));
