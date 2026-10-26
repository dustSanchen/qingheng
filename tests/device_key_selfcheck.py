from pathlib import Path
import subprocess, xml.etree.ElementTree as ET, re, time

root = Path(r'D:\AI\health-android')
adb = str(root / 'toolchain/platform-tools/adb.exe')
SAFE_X = '578'          # centre column only: edge swipes trigger MIUI gestures

def run(*args):
    p = subprocess.run([adb, *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode:
        raise RuntimeError('ADB failed: ' + ' '.join(args))
    return p.stdout

def front():
    m = re.search(r'mCurrentFocus=.*', run('shell', 'dumpsys', 'window'))
    return m.group(0) if m else ''

def nodes():
    run('shell', 'uiautomator', 'dump', '/sdcard/qh-selfcheck.xml')
    run('pull', '/sdcard/qh-selfcheck.xml', str(root / 'artifacts/device/selfcheck-ui.xml'))
    return list(ET.parse(root / 'artifacts/device/selfcheck-ui.xml').getroot().iter('node'))

def center(n):
    nums = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
    if len(nums) != 4 or nums[3] - nums[1] < 5 or nums[3] > 2320:
        return None
    return ((nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2)

def text_of(predicate):
    for n in nodes():
        if predicate(n.get('text') or ''):
            return n.get('text')
    return None

if 'cn.qingheng.health/' not in front():
    run('shell', 'am', 'start', '-n', 'cn.qingheng.health/.MainActivity')
    time.sleep(6)

run('shell', 'input', 'tap', '1002', '2412')   # 我的
time.sleep(3)

target = None
for _ in range(10):
    if 'cn.qingheng.health/' not in front():
        raise RuntimeError('Foreground changed; stopping without further input')
    for n in nodes():
        if (n.get('text') or '') == '密钥自检':
            c = center(n)
            if c:
                target = c
                break
    if target:
        break
    run('shell', 'input', 'swipe', SAFE_X, '1900', SAFE_X, '700', '350')
    time.sleep(1)

if not target:
    raise RuntimeError('Self-check button not reachable within the scroll budget; nothing was tapped')

run('shell', 'input', 'tap', str(target[0]), str(target[1]))
time.sleep(4)

result = text_of(lambda t: '模型密钥' in t or '正在读取本机保存的配置' in t or '密钥无法解密' in t)
print('SELF CHECK RESULT:', result if result else '(not captured)')
if result and '模型密钥：长度' in result:
    print('VERDICT:', 'STORED KEY WAS CONTAMINATED' if '不可见字符' in result else 'stored key looks clean -> 401 is a real credential problem')
