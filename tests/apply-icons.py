from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\index.html')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# Navigation uses the same drawn icon family as the camera/gallery buttons instead of font glyphs.
rep('<button type="button" data-tab="today" aria-current="page"><span class="nav-icon" aria-hidden="true">☀</span><span>今天</span></button>',
    '<button type="button" data-tab="today" aria-current="page"><span class="nav-icon" aria-hidden="true"><img src="./icon-nav-today.svg" alt="" width="23" height="23"></span><span>今天</span></button>')
rep('<button type="button" data-tab="records"><span class="nav-icon" aria-hidden="true">＋</span><span>记录</span></button>',
    '<button type="button" data-tab="records"><span class="nav-icon" aria-hidden="true"><img src="./icon-nav-record.svg" alt="" width="23" height="23"></span><span>记录</span></button>')
rep('<button type="button" data-tab="chat"><span class="nav-icon" aria-hidden="true">✎</span><span>问答</span></button>',
    '<button type="button" data-tab="chat"><span class="nav-icon" aria-hidden="true"><img src="./icon-nav-chat.svg" alt="" width="23" height="23"></span><span>问答</span></button>')
rep('<button type="button" data-tab="trends"><span class="nav-icon" aria-hidden="true">↗</span><span>趋势</span></button>',
    '<button type="button" data-tab="trends"><span class="nav-icon" aria-hidden="true"><img src="./icon-nav-trends.svg" alt="" width="23" height="23"></span><span>趋势</span></button>')
rep('<button type="button" data-tab="profile"><span class="nav-icon" aria-hidden="true">○</span><span>我的</span></button>',
    '<button type="button" data-tab="profile"><span class="nav-icon" aria-hidden="true"><img src="./icon-nav-profile.svg" alt="" width="23" height="23"></span><span>我的</span></button>')

# The microphone joins the same family.
rep('<span class="mic-icon" aria-hidden="true">🎙</span>',
    '<span class="mic-icon" aria-hidden="true"><img src="./icon-mic.svg" alt="" width="20" height="20"></span>')

# Advice refresh and the body-measurement sparkle use the same line icons.
rep('<button type="button" class="text-button" id="refresh-advice">获取建议 ↻</button>',
    '<button type="button" class="text-button icon-text-button" id="refresh-advice"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span>获取建议</button>')
rep('<span class="leaf" aria-hidden="true">✧</span>',
    '<span class="leaf inline-icon" aria-hidden="true"><img src="./icon-sparkle.svg" alt="" width="17" height="17"></span>')

p.write_text(s, encoding='utf-8')
print('index.html patched: unified SVG icons for navigation, microphone, refresh and sparkle')
