"""轻衡品牌插画 v2 · 「归档的叶子」

为「更多设置」做半透明背景板用：主体偏右、出血裁切，左侧与上方留大片空白给页面内容；
账本横线只在下半部累积，叶形用 40 层同形轮廓叠出「被记录过很多次」的时间感。
输出 1600x2000 PNG（文档用）与 1000x1250 WEBP（App 内做背景板）。
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = Path(r"D:\AI\build-skills\anthropic-skills\skills\canvas-design\canvas-fonts")
ART_DIR = Path(r"D:\AI\health-android\docs\design\art")
ASSETS = Path(r"D:\AI\health-android\app\src\main\assets")

W, H = 1600, 2000
PAPER_TOP = (247, 249, 240)
PAPER_BOT = (236, 242, 226)
INK = (47, 83, 64)
MOSS = (111, 149, 115)
PALE = (196, 214, 184)
RULE = (208, 222, 195)

random.seed(20261104)

img = Image.new("RGB", (W, H), PAPER_TOP)
top = Image.new("RGB", (W, H), PAPER_TOP)
bottom = Image.new("RGB", (W, H), PAPER_BOT)
mask = Image.new("L", (W, H))
md = ImageDraw.Draw(mask)
for y in range(H):
    md.line([(0, y), (W, y)], fill=int(255 * (y / H)))
img = Image.composite(bottom, top, mask)

# 纸纹
px = img.load()
for y in range(0, H, 1):
    for x in range(0, W, 1):
        n = random.randint(-2, 2)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

draw = ImageDraw.Draw(img, "RGBA")

# 账本横线（下半部）
first, last, step = 1180, 1960, 18
for i, y in enumerate(range(first, last, step)):
    t = i / max(1, (last - first) // step)
    draw.line([(120, y), (W - 120, y)], fill=(*RULE, int(50 + 70 * t)), width=1)

# 叶：偏右、出血
cx, cy = 1130, 1080
tilt = math.radians(-24)
rings = 40


def leaf(scale, samples=520):
    pts = []
    for k in range(samples):
        t = k / (samples - 1)
        u = 2 * t - 1
        half = (1 - u * u) ** 0.66 * (0.58 + 0.42 * (1 - u))
        x = u * 430 * scale
        y = -half * 300 * scale
        y += math.sin(u * math.pi * 1.6) * 9 * scale
        pts.append((x, y))
    return pts + [(x, -y) for x, y in reversed(pts)]


for i in range(rings, -1, -1):
    s = 1 - i * 0.021
    if s <= 0.12:
        continue
    poly = []
    for x, y in leaf(s):
        rx = x * math.cos(tilt) - y * math.sin(tilt)
        ry = x * math.sin(tilt) + y * math.cos(tilt)
        poly.append((cx + rx, cy + ry))
    fade = i / rings
    col = (
        int(MOSS[0] * (1 - fade) + PALE[0] * fade),
        int(MOSS[1] * (1 - fade) + PALE[1] * fade),
        int(MOSS[2] * (1 - fade) + PALE[2] * fade),
        int(200 * (1 - fade) + 55),
    )
    draw.line(poly + [poly[0]], fill=col, width=1 if i else 2)

# 中脉：实线 + 渐细
for k in range(120):
    t = k / 119
    sx = -420 + 840 * t
    sy = math.sin((t - 0.5) * math.pi) * 14
    rx = sx * math.cos(tilt) - sy * math.sin(tilt)
    ry = sx * math.sin(tilt) + sy * math.cos(tilt)
    w = max(1, int(3.6 * (1 - abs(t - 0.44) * 1.7)))
    draw.line([(cx + rx, cy + ry), (cx + rx + 4, cy + ry + 3)], fill=INK, width=w)

# 刻度（左侧留白里的仪器感）
for i in range(18):
    y = 240 + i * 52
    draw.line([(120, y), (140, y)], fill=(*INK, 70), width=1)

# 记号：一枚实心点、一枚小十字、一条短线
draw.ellipse([1310, 1560, 1330, 1580], fill=(*MOSS, 235))
draw.line([(146, 1760), (176, 1760)], fill=(*INK, 120), width=2)
draw.line([(161, 1745), (161, 1775)], fill=(*INK, 120), width=2)

# 极简文字
mono = ImageFont.truetype(str(FONT_DIR / "GeistMono-Regular.ttf"), 20)
mono_s = ImageFont.truetype(str(FONT_DIR / "GeistMono-Regular.ttf"), 16)
cn = ImageFont.truetype(r"C:\Windows\Fonts\simsun.ttc", 34)
cn_s = ImageFont.truetype(r"C:\Windows\Fonts\simsun.ttc", 24)

draw.text((124, 150), "轻 衡", font=cn, fill=(*INK, 235))
draw.text((124, 206), "L I G H T   L E D G E R", font=mono_s, fill=(*MOSS, 220))
draw.text((124, 1872), "把日常，一格一格地记下来。", font=cn_s, fill=(*INK, 210))
draw.text((W - 470, 150), "PLATE 02 — BRAND FIELD", font=mono, fill=(*INK, 130))
draw.text((W - 470, 184), "1600 x 2000 · INK / PAPER", font=mono_s, fill=(*INK, 100))

ART_DIR.mkdir(parents=True, exist_ok=True)
plate = ART_DIR / "brand-field.png"
img.save(plate, "PNG", optimize=True)

# App 背景板用的 WEBP：缩到 1000 宽，压到肉眼无差
small = img.resize((1000, 1250), Image.LANCZOS)
bg = ASSETS / "brand-field.webp"
small.save(bg, "WEBP", quality=80, method=6)

print("plate", plate, plate.stat().st_size)
print("webp ", bg, bg.stat().st_size)
