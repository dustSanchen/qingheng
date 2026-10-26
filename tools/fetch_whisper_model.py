"""直接下载 faster-whisper 的 CTranslate2 模型文件（绕过 huggingface_hub）。"""
import os
import sys
import urllib.request

BASE = 'https://hf-mirror.com/Systran/faster-whisper-{name}/resolve/main/{file}'
FILES = ['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'small'
    dest = os.path.join(r'D:\AI\_tools\asr', 'fw-' + name)
    os.makedirs(dest, exist_ok=True)
    for fname in FILES:
        path = os.path.join(dest, fname)
        if os.path.exists(path) and os.path.getsize(path) > 1024:
            print('[skip] %s (%d bytes)' % (fname, os.path.getsize(path)), flush=True)
            continue
        url = BASE.format(name=name, file=fname)
        print('[get ] %s' % url, flush=True)
        tmp = path + '.part'
        with urllib.request.urlopen(url, timeout=600) as resp, open(tmp, 'wb') as fh:
            total = int(resp.headers.get('Content-Length') or 0)
            done = 0
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                fh.write(chunk)
                done += len(chunk)
                if total and done % (50 << 20) < (1 << 20):
                    print('       %d%% (%d MB)' % (done * 100 // total, done >> 20), flush=True)
        os.replace(tmp, path)
        print('[ok  ] %s (%d MB)' % (fname, os.path.getsize(path) >> 20), flush=True)
    print('model dir:', dest)
    return 0


if __name__ == '__main__':
    sys.exit(main())
