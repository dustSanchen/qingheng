"""
批量：B 站视频 → 音频 → 本地 ASR（faster-whisper small int8）。
仅用于个人学习，转写结果不对外分发。

用法：
  python tools\\bili_asr_batch.py BV1Ehn7zmEHN BV1utntzhE9a BV1ncdUBGEbS
输出：
  build\\asr\\<bvid>.txt   （带时间戳的转写）
"""
import os
import subprocess
import sys
import json
import time
import urllib.request

# The console here is GBK; titles contain emoji, so force UTF-8 with replacement.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:  # noqa: BLE001
    pass

os.environ.setdefault('HF_ENDPOINT', 'https://hf-mirror.com')
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')

FFMPEG = r'D:\AI\_tools\ffmpeg\bin\ffmpeg.exe'
OUT_DIR = os.path.join('build', 'asr')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://www.bilibili.com/',
}


def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def fetch_view(bvid):
    data = get_json('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid)
    if data.get('code') != 0:
        raise RuntimeError('view failed: ' + str(data.get('message')))
    info = data['data']
    return {
        'bvid': bvid,
        'aid': info['aid'],
        'cid': info['cid'],
        'title': info['title'],
        'duration': info['duration'],
        'owner': info['owner']['name'],
    }


def fetch_audio_url(bvid, cid):
    url = ('https://api.bilibili.com/x/player/playurl?bvid=%s&cid=%s&fnval=16&fnver=0&fourk=1' % (bvid, cid))
    data = get_json(url)
    if data.get('code') != 0:
        raise RuntimeError('playurl failed: ' + str(data.get('message')))
    audios = data['data']['dash']['audio']
    audios.sort(key=lambda a: a.get('bandwidth', 0), reverse=True)
    return audios[0]['baseUrl']


def download(url, dest):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, 'wb') as fh:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    return os.path.getsize(dest)


def to_wav(src, dest):
    subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000',
                    '-c:a', 'pcm_s16le', dest], check=True)
    return dest


def transcribe(wav, out_txt, model):
    segments, info = model.transcribe(
        wav, language='zh', beam_size=5, vad_filter=True,
        vad_parameters={'min_silence_duration_ms': 500},
        initial_prompt='健身训练讲解：动作名称、组数、次数、RPE、训练计划、饮食与减脂。',
    )
    lines = []
    for seg in segments:
        text = seg.text.strip()
        if text:
            lines.append('[%02d:%02d] %s' % (int(seg.start // 60), int(seg.start % 60), text))
    with open(out_txt, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    return len(lines), info.duration


def main(argv):
    bvids = argv[1:] or ['BV1Ehn7zmEHN']
    os.makedirs(OUT_DIR, exist_ok=True)

    from faster_whisper import WhisperModel
    model_dir = os.environ.get('FW_MODEL_DIR', r'D:\AI\_tools\asr\fw-small')
    model = WhisperModel(model_dir, device='cpu', compute_type='int8', num_workers=4)

    for bvid in bvids:
        out_txt = os.path.join(OUT_DIR, bvid + '.txt')
        if os.path.exists(out_txt) and os.path.getsize(out_txt) > 200:
            print('[skip] %s already transcribed' % bvid, flush=True)
            continue
        started = time.time()
        try:
            info = fetch_view(bvid)
            print('[view] %s | %s | %s | %ds' % (bvid, info['owner'], info['title'], info['duration']), flush=True)
            m4s = os.path.join(OUT_DIR, bvid + '.m4s')
            # reuse the downloaded audio when a previous run was interrupted
            if os.path.exists(m4s) and os.path.getsize(m4s) > (1 << 20):
                size = os.path.getsize(m4s)
                print('[reuse] %s (%d MB)' % (bvid, size >> 20), flush=True)
            else:
                audio_url = fetch_audio_url(bvid, info['cid'])
                size = download(audio_url, m4s)
            # PyAV (bundled with faster-whisper) decodes the m4s directly; ffmpeg is blocked by the
            # sandbox from writing files, so it is not used here.
            count, duration = transcribe(m4s, out_txt, model)
            try:
                os.remove(m4s)
            except OSError:
                pass
            print('[done] %s -> %s (%d lines, %.0fs audio, %.0fs wall)' % (
                bvid, out_txt, count, duration, time.time() - started), flush=True)
        except Exception as exc:  # noqa: BLE001
            print('[fail] %s: %s' % (bvid, exc), flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
