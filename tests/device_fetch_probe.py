from pathlib import Path
import subprocess, xml.etree.ElementTree as ET, re, time

root = Path(r'D:\AI\health-android')
adb = str(root / 'toolchain/platform-tools/adb.exe')

def run(*args):
    p = subprocess.run([adb, *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode:
        raise RuntimeError('ADB failed: ' + ' '.join(args))
    return p.stdout

def front():
    m = re.search(r'mCurrentFocus=.*', run('shell', 'dumpsys', 'window'))
    return m.group(0) if m else ''

def nodes(tag='probe'):
    run('shell', 'uiautomator', 'dump', '/sdcard/qh-%s.xml' % tag)
    run('pull', '/sdcard/qh-%s.xml' % tag, str(root / ('artifacts/device/%s.xml' % tag)))
    return list(ET.parse(root / ('artifacts/device/%s.xml' % tag)).getroot().iter('node'))

def center(n):
    nums = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
    if len(nums) != 4 or nums[3] - nums[1] < 5 or nums[3] > 2320:
        return None
    return ((nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2)

def find(predicate):
    for n in nodes():
        if predicate(n):
            c = center(n)
            if c:
                return n, c
    return None, None

if 'cn.qingheng.health/' not in front():
    run('shell', 'am', 'start', '-n', 'cn.qingheng.health/.MainActivity')
    time.sleep(6)
run('shell', 'input', 'tap', '578', '2412')      # 问答 tab, mid column
time.sleep(4)

url_node, url_at = find(lambda n: 'example.com' in (n.get('text') or ''))
if not url_at:
    url_node, url_at = find(lambda n: n.get('class') == 'android.widget.EditText')
if not url_at:
    print('URL field not found; visible labelled nodes follow')
    for n in nodes():
        t = (n.get('text') or '').strip()
        if t and center(n):
            print('  ', t, center(n))
    raise SystemExit('ABORTED: no input tapped')

print('URL field at', url_at)
run('shell', 'input', 'tap', str(url_at[0]), str(url_at[1]))
time.sleep(1)
# Clear any value left from an earlier attempt, then type the URL.
run('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
for _ in range(60):
    run('shell', 'input', 'keyevent', 'KEYCODE_DEL')
run('shell', 'input', 'text', 'https://en.wikipedia.org/wiki/Oat')
time.sleep(1)
run('shell', 'input', 'keyevent', '4')           # dismiss the keyboard
time.sleep(1)

btn, btn_at = find(lambda n: (n.get('text') or '') == '抓取网页正文')
for _ in range(6):
    if btn_at:
        break
    if 'cn.qingheng.health/' not in front():
        raise SystemExit('ABORTED: foreground changed during scrolling')
    run('shell', 'input', 'swipe', '578', '1900', '578', '800', '350')
    time.sleep(1)
    btn, btn_at = find(lambda n: (n.get('text') or '') == '抓取网页正文')
if not btn_at:
    raise SystemExit('ABORTED: fetch button not visible')
print('fetch button at', btn_at)
run('shell', 'input', 'tap', str(btn_at[0]), str(btn_at[1]))
time.sleep(2)

# The page asks for confirmation before contacting the site; accept it.
ok, ok_at = find(lambda n: (n.get('text') or '').strip() in ('确定', 'OK', '继续', '是') and 'cn.qingheng.health' in (n.get('package') or ''))
if ok_at:
    print('confirming fetch consent at', ok_at)
    run('shell', 'input', 'tap', str(ok_at[0]), str(ok_at[1]))
else:
    print('no confirmation dialog captured')

time.sleep(12)
status = None
for n in nodes('after'):
    t = (n.get('text') or '')
    if '已引用' in t or '抓取' in t or '无法' in t or '没有' in t or '只支持' in t:
        status = t
print('STATUS:', status)
