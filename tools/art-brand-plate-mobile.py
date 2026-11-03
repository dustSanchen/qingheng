"""轻衡视觉档案 · 移动端版（900x1150）

同一套技术档案语汇，但字号按「卡片实际显示约 380dp 宽」重新定：
正文标注 26–30px（缩到 1/2.4 后仍有 11–12px），只留两处引线，避免小字糊成噪点。
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = Path(r"D:\AI\build-skills\anthropic-skills\skills\canvas-design\canvas-fonts")
CN = r"C:\Windows\Fonts\simsun.ttc"
ASSETS = Path(r"D:\AI\health-android\app\src\main\assets")

W, H = 900, 1150
PAPER = (245, 247, 236)
INK = (32, 58, 45)
MOSS = (105, 143, 109)
PALE = (196, 213, 184)
GRID = (212, 224, 200)
SIGNAL = (176, 108, 62)

mo = ImageFont.truetype(str(FONT / "GeistMono-Regular.ttf"), 24)
mo_s = ImageFont.truetype(str(FONT / "GeistMono-Regular.ttf"), 19)
cn = ImageFont.truetype(CN, 46)
cn_m = ImageFont.truetype(CN, 26)
cn_s = ImageFont.truetype(CN, 24)

random.seed(3)
img = Image.new("RGB", (W, H), PAPER)
px = img.load()
for y in range(H):
    for x in range(W):
        n = random.randint(-2, 2)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
d = ImageDraw.Draw(img, "RGBA")

for x in range(0, W, 26):
    d.line([(x, 0), (x, H)], fill=(*GRID, 44), width=1)
for y in range(0, H, 26):
    d.line([(0, y), (W, y)], fill=(*GRID, 44), width=1)

def corner(x, y, dx, dy, size=52, w=3):
    d.line([(x, y), (x + dx * size, y)], fill=(*INK, 195), width=w)
    d.line([(x, y), (x, y + dy * size)], fill=(*INK, 195), width=w)

M = 40
corner(M, M, 1, 1); corner(W - M, M, -1, 1); corner(M, H - M, 1, -1); corner(W - M, H - M, -1, -1)

cx, cy = 545, 560
tilt = math.radians(-20)


def leaf(scale, samples=420):
    pts = []
    for k in range(samples):
        t = k / (samples - 1)
        u = 2 * t - 1
        half = (1 - u * u) ** 0.66 * (0.58 + 0.42 * (1 - u))
        x = u * 285 * scale
        y = -half * 195 * scale
        y += math.sin(u * math.pi * 1.6) * 6 * scale
        pts.append((x, y))
    return pts + [(x, -y) for x, y in reversed(pts)]


for i in range(34, -1, -1):
    s = 1 - i * 0.02
    if s <= 0.12:
        continue
    poly = []
    for x, y in leaf(s):
        rx = x * math.cos(tilt) - y * math.sin(tilt)
        ry = x * math.sin(tilt) + y * math.cos(tilt)
        poly.append((cx + rx, cy + ry))
    fade = i / 34
    col = (
        int(MOSS[0] * (1 - fade) + PALE[0] * fade),
        int(MOSS[1] * (1 - fade) + PALE[1] * fade),
        int(MOSS[2] * (1 - fade) + PALE[2] * fade),
        int(190 * (1 - fade) + 45),
    )
    d.line(poly + [poly[0]], fill=col, width=2 if i < 3 else 1)

for k in range(100):
    t = k / 99
    sx = -285 + 570 * t
    sy = math.sin((t - 0.5) * math.pi) * 9
    rx = sx * math.cos(tilt) - sy * math.sin(tilt)
    ry = sx * math.sin(tilt) + sy * math.cos(tilt)
    w = max(2, int(4 * (1 - abs(t - 0.44) * 1.7)))
    d.line([(cx + rx, cy + ry), (cx + rx + 3, cy + ry + 2)], fill=INK, width=w)

def leader(x1, y1, x2, y2, label, sub):
    d.line([(x1, y1), (x2, y2), (x2 + 30, y2)], fill=(*INK, 150), width=2)
    d.ellipse([x1 - 3, y1 - 3, x1 + 3, y1 + 3], fill=(*SIGNAL, 240))
    d.text((x2 + 38, y2 - 26), label, font=cn_s, fill=(*INK, 230))
    d.text((x2 + 38, y2 + 4), sub, font=mo_s, fill=(*MOSS, 215))

leader(452, 398, 250, 316, "叶形轮廓 ×34", "CONTOUR / 34 RINGS")
leader(690, 700, 610, 786, "纸纹 0.6", "PAPER GRAIN")

for i in range(11):
    y = 330 + i * 52
    long = i % 5 == 0
    d.line([(M + 8, y), (M + (34 if long else 20), y)], fill=(*INK, 125 if long else 85), width=2)
    if long:
        d.text((M + 44, y - 12), f"{(i + 3) * 25:03d}", font=mo_s, fill=(*INK, 130))

d.text((116, 132), "轻衡 · 视觉档案", font=cn, fill=(*INK, 240))
d.text((118, 192), "L I G H T   L E D G E R", font=mo_s, fill=(*MOSS, 220))
d.text((118, 226), "PLATE 03 / SYSTEM VISUAL", font=mo, fill=(*INK, 150))

d.text((W - 330, 132), "GRID", font=mo_s, fill=(*INK, 130))
d.text((W - 250, 132), "24 / 1.5", font=mo_s, fill=(*INK, 200))
d.text((W - 330, 164), "SKIN", font=mo_s, fill=(*INK, 130))
d.text((W - 250, 164), "3 TONES", font=mo_s, fill=(*INK, 200))

bar0, bar1 = H - 168, H - 112
d.rectangle([M, bar0, W - M, bar1], fill=(*INK, 238))
d.text((M + 18, bar0 + 12), "24 网格 · 1.5 描边 · 单一墨色", font=cn_s, fill=(247, 249, 241))
d.text((M, H - 96), "叶形 = 生长，账本横线 = 记录，克制 = 少即是多。", font=cn_s, fill=(*INK, 190))

out = ASSETS / "brand-plate.webp"
img.save(out, "WEBP", quality=86, method=6)
print("mobile plate", out, out.stat().st_size)
