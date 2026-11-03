"""轻衡品牌插画 · 背景板专用（无任何文字，供页面半透明铺底）。

构图只为「当背景」服务：叶形压在右下、出血裁切，左上整片留白；
账本横线只在下三分之一。输出 900x1125 WEBP，供 CSS 低透明度铺底。
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(r"D:\AI\health-android\app\src\main\assets")
W, H = 900, 1125
TOP, BOT = (250, 251, 244), (238, 243, 229)
INK = (47, 83, 64)
MOSS = (111, 149, 115)
PALE = (200, 217, 188)
RULE = (206, 221, 194)

random.seed(11)
img = Image.new("RGB", (W, H), TOP)
top, bottom = Image.new("RGB", (W, H), TOP), Image.new("RGB", (W, H), BOT)
mask = Image.new("L", (W, H))
md = ImageDraw.Draw(mask)
for y in range(H):
    md.line([(0, y), (W, y)], fill=int(255 * (y / H)))
img = Image.composite(bottom, top, mask)

px = img.load()
for y in range(H):
    for x in range(W):
        n = random.randint(-2, 2)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

draw = ImageDraw.Draw(img, "RGBA")
for i, y in enumerate(range(700, 1100, 11)):
    draw.line([(40, y), (W - 40, y)], fill=(*RULE, int(45 + 55 * (i / 36))), width=1)

cx, cy = 690, 700
tilt = math.radians(-26)


def leaf(scale, samples=460):
    pts = []
    for k in range(samples):
        t = k / (samples - 1)
        u = 2 * t - 1
        half = (1 - u * u) ** 0.66 * (0.58 + 0.42 * (1 - u))
        x = u * 330 * scale
        y = -half * 230 * scale
        y += math.sin(u * math.pi * 1.6) * 7 * scale
        pts.append((x, y))
    return pts + [(x, -y) for x, y in reversed(pts)]


for i in range(34, -1, -1):
    s = 1 - i * 0.023
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
    draw.line(poly + [poly[0]], fill=col, width=1 if i else 2)

for k in range(110):
    t = k / 109
    sx = -320 + 640 * t
    sy = math.sin((t - 0.5) * math.pi) * 12
    rx = sx * math.cos(tilt) - sy * math.sin(tilt)
    ry = sx * math.sin(tilt) + sy * math.cos(tilt)
    w = max(1, int(3 * (1 - abs(t - 0.44) * 1.7)))
    draw.line([(cx + rx, cy + ry), (cx + rx + 3, cy + ry + 2)], fill=INK, width=w)

draw.ellipse([760, 960, 776, 976], fill=(*MOSS, 220))

out = ASSETS / "brand-field.webp"
img.save(out, "WEBP", quality=84, method=6)
print("bg", out, out.stat().st_size)
