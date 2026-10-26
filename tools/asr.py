"""
本地 ASR：faster-whisper small + int8，纯 CPU。
用法：python tools\\asr.py <音频文件> [输出txt]
说明：只做个人学习用途的音频转写，不做分发。
"""
import sys
import os
import json
import time

os.environ.setdefault('HF_ENDPOINT', 'https://hf-mirror.com')

from faster_whisper import WhisperModel  # noqa: E402

def main():
    if len(sys.argv) < 2:
        print('usage: python tools/asr.py <audio> [out.txt]')
        return 1
    audio = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(audio)[0] + '.txt'
    started = time.time()
    model = WhisperModel('small', device='cpu', compute_type='int8', num_workers=4)
    segments, info = model.transcribe(
        audio,
        language='zh',
        beam_size=5,
        vad_filter=True,
        vad_parameters={'min_silence_duration_ms': 500},
        initial_prompt='以下是健身训练讲解，包含动作名称、组数、次数、RPE、训练计划。',
    )
    lines = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        lines.append('[%02d:%02d] %s' % (int(seg.start // 60), int(seg.start % 60), text))
        print(lines[-1], flush=True)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    print('---')
    print('segments: %d, duration: %.1fs, elapsed: %.1fs, saved: %s' % (
        len(lines), info.duration, time.time() - started, out))
    return 0

if __name__ == '__main__':
    sys.exit(main())
