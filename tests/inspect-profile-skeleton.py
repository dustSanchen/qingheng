import re, pathlib
s = pathlib.Path(r"D:\AI\health-android\app\src\main\assets\index.html").read_text(encoding="utf-8")
start = s.index('<section id="view-profile"')
end = s.index('</section>', start) + len('</section>')
seg = s[start:end]
print('profile section bytes:', len(seg))
# top-level element scan inside profile-grid
gi = seg.index('<div class="profile-grid">')
depth = 0
i = gi + len('<div class="profile-grid">')
children = []
buf_start = i
tag_re = re.compile(r'<(/?)(article|div|section)\b[^>]*>')
while i < len(seg):
    m = tag_re.search(seg, i)
    if not m:
        break
    tag = m.group(2)
    if m.group(1) == '':
        if depth == 0:
            buf_start = m.start()
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            children.append(seg[buf_start:m.end()])
    i = m.end()
print('top-level children in profile-grid:', len(children))
for n, child in enumerate(children):
    ids = re.findall(r'id="([^"]+)"', child)
    head = re.search(r'<h2[^>]*>(.*?)</h2>', child)
    print(f'--- child {n}: bytes={len(child)} title={head.group(1) if head else "(none)"}')
    print('    ids:', ', '.join(ids[:14]))
print('--- outside the grid (after it):')
tail = seg[seg.index('<div class="profile-grid">') + sum(len(c) for c in children):]
print(tail[:700].replace('\n', ' '))
