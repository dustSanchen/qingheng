import re, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = pathlib.Path(r"D:\AI\health-android\app\src\main\assets\index.html").read_text(encoding="utf-8")
TAG = re.compile(r'<(/?)(article|div|footer|section)\b[^>]*>')

def close_index(html, open_at):
    depth, pos = 0, open_at
    while True:
        m = TAG.search(html, pos)
        if not m:
            raise SystemExit('unbalanced markup')
        depth += 1 if m.group(1) == '' else -1
        if depth == 0:
            return m.end()
        pos = m.end()

i = s.index('<section id="view-profile"')
g = s.index('<div class="profile-grid">', i)
gc = close_index(s, g)
print('grid span', g, gc)
inner = s[g + len('<div class="profile-grid">'): gc - len('</div>')]
print('grid inner len', len(inner))
blocks, depth, start, pos = [], 0, 0, 0
while True:
    m = TAG.search(inner, pos)
    if not m:
        break
    if m.group(1) == '':
        if depth == 0:
            start = m.start()
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            blocks.append(inner[start:m.end()])
    pos = m.end()
print('grid depth-0 blocks:', len(blocks))
for n, b in enumerate(blocks):
    head = re.search(r'<h2[^>]*>(.*?)</h2>', b)
    cls = re.match(r'<[a-z]+ class="([^"]*)"', b)
    print('  block', n, 'bytes', len(b), 'h2', head.group(1) if head else '(none)', 'class', cls.group(1) if cls else '')
stack = [b for b in blocks if b.startswith('<div class="stack">')][0]
s_inner = stack[len('<div class="stack">'): -len('</div>')]
sb, depth, start, pos = [], 0, 0, 0
while True:
    m = TAG.search(s_inner, pos)
    if not m:
        break
    if m.group(1) == '':
        if depth == 0:
            start = m.start()
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            sb.append(s_inner[start:m.end()])
    pos = m.end()
print('stack depth-0 blocks:', len(sb))
for n, b in enumerate(sb):
    head = re.search(r'<h2[^>]*>(.*?)</h2>', b)
    print(f'  stack {n}: bytes={len(b)} h2={head.group(1) if head else "(none)"} ids={re.findall(r"id=.([a-z0-9-]+)", b)[:6]}')
print('after grid, before section close:', repr(s[gc:s.index('</section>', i)][:160]))
