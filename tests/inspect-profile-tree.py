import re, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = pathlib.Path(r"D:\AI\health-android\app\src\main\assets\index.html").read_text(encoding="utf-8")
start = s.index('<section id="view-profile"')
end = s.index('</section>', start) + len('</section>')
seg = s[start:end]
# Print a readable skeleton: only tags + short text, one per line.
out = []
for m in re.finditer(r'<[^>]+>|[^<]+', seg):
    token = m.group(0)
    if token.startswith('<'):
        name = re.match(r'</?([a-zA-Z0-9]+)', token)
        tag = name.group(1) if name else '?'
        if token.startswith('</'):
            out.append('  ' + token)
        else:
            keep = ' '.join(a for a in re.findall(r'(?:id|class|name|type)="[^"]*"', token))
            out.append('  <' + tag + (' ' + keep if keep else '') + '>')
    else:
        text = token.strip()
        if text:
            out.append('    "' + text[:60] + '"')
print('\n'.join(out))
