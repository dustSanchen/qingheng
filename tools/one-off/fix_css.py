from pathlib import Path
p=Path(r'D:\AI\health-android\app\src\main\assets\styles.css')
s=p.read_text(encoding='utf-8')
needle=chr(92)+'n'
print('before', s.count(needle))
s=s.replace(needle, chr(10))
p.write_text(s, encoding='utf-8')
print('after', s.count(needle), 'newline chars', s.count(chr(10)))
