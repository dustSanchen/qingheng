import re, pathlib
s = pathlib.Path(r'D:\AI\health-android\app\src\main\assets\index.html').read_text(encoding='utf-8')
i = s.index('id="view-profile"')
seg = s[i:i+12000]
print('ids:', ', '.join(re.findall(r'id="([^"]+)"', seg)))
print('cards:', seg.count('<article class="card'))
print('selects with id:', re.findall(r'<select[^>]*id="([^"]*)"', s))
print('selects total:', len(re.findall(r'<select', s)))
print('--- profile head ---')
print(seg[:600])
