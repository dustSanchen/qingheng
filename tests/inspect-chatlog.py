import pathlib
p = pathlib.Path(r"D:\AI\health-android\app\src\main\assets\index.html")
s = p.read_text(encoding="utf-8")
i = s.index('id="chat-log"')
print(repr(s[i-300:i+120]))
