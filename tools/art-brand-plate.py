"""轻衡视觉档案 · PLATE 03（终末地式的技术标注 + 轻衡的纸墨）

参考《明日方舟：终末地》的技术档案语汇：角标括号、细网格、刻度、引线标注、
实心墨条 + 反白小字、以及一处信号色；但基底仍是轻衡的纸感米白与墨绿。
产出：docs/design/art/brand-plate.png（1400x930）与 app 内 assets/brand-plate.webp。
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = Path(r"D:\AI\build-skills\anthropic-skills\skills\canvas-design\canvas-fonts")
CN = r"C:\Windows\Fonts\simsun.ttc"
ART = Path(r"D:\AI\health-android\docs\design\art")
ASSETS = Path(r"D:\AI\health-android\app\src\main\assets")

W, H = 1400, 930
PAPER = (245, 247, 236)
INK = (32, 58, 45)
MOSS = (111, 149, 115)
PALE = (198, 214, 186)
GRID = (214, 226, 202)
SIGNAL = (176, 108, 62)  # 唯一的信号色：锈橙，只用在刻度端点

mo = ImageFont.truetype(str(FONT / "GeistMono-Regular.ttf"), 15)
mo_s = ImageFont.truetype(str(FONT / "GeistMono-Regular.ttf"), 12)
cn = ImageFont.truetype(CN, 30)
cn_m = ImageFont.truetype(CN, 18)
cn_s = ImageFont.truetype(CN, 15)

random.seed(7)
img = Image.new("RGB", (W, H), PAPER)
px = img.load()
for y in range(H):
    for x in range(W):
        n = random.randint(-2, 2)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
d = ImageDraw.Draw(img, "RGBA")

# 1) 5mm 细网格（技术图纸底）
for x in range(0, W, 28):
    d.line([(x, 0), (x, H)], fill=(*GRID, 46), width=1)
for y in range(0, H, 28):
    d.line([(0, y), (W, y)], fill=(*GRID, 46), width=1)

# 2) 四角括号（0.5 单位粗的短折线）
def corner(x, y, dx, dy, size=46, w=2):
    d.line([(x, y), (x + dx * size, y)], fill=(*INK, 190), width=w)
    d.line([(x, y), (x, y + dy * size)], fill=(*INK, 190), width=w)

M = 44
corner(M, M, 1, 1); corner(W - M, M, -1, 1); corner(M, H - M, 1, -1); corner(W - M, H - M, -1, -1)

# 3) 叶形轮廓场（40 层）
cx, cy = 900, 470
tilt = math.radians(-22)


def leaf(scale, samples=460):
    pts = []
    for k in range(samples):
        t = k / (samples - 1)
        u = 2 * t - 1
        half = (1 - u * u) ** 0.66 * (0.58 + 0.42 * (1 - u))
        x = u * 300 * scale
        y = -half * 210 * scale
        y += math.sin(u * math.pi * 1.6) * 7 * scale
        pts.append((x, y))
    return pts + [(x, -y) for x, y in reversed(pts)]


for i in range(40, -1, -1):
    s = 1 - i * 0.019
    if s <= 0.12:
        continue
    poly = []
    for x, y in leaf(s):
        rx = x * math.cos(tilt) - y * math.sin(tilt)
        ry = x * math.sin(tilt) + y * math.cos(tilt)
        poly.append((cx + rx, cy + ry))
    fade = i / 40
    col = (
        int(MOSS[0] * (1 - fade) + PALE[0] * fade),
        int(MOSS[1] * (1 - fade) + PALE[1] * fade),
        int(MOSS[2] * (1 - fade) + PALE[2] * fade),
        int(186 * (1 - fade) + 40),
    )
    d.line(poly + [poly[0]], fill=col, width=1 if i else 2)

# 中脉
for k in range(120):
    t = k / 119
    sx = -300 + 600 * t
    sy = math.sin((t - 0.5) * math.pi) * 10
    rx = sx * math.cos(tilt) - sy * math.sin(tilt)
    ry = sx * math.sin(tilt) + sy * math.cos(tilt)
    w = max(1, int(3 * (1 - abs(t - 0.44) * 1.7)))
    d.line([(cx + rx, cy + ry), (cx + rx + 3, cy + ry + 2)], fill=INK, width=w)

# 4) 引线标注（三处，指向轮廓场）
def leader(x1, y1, x2, y2, label, sub):
    d.line([(x1, y1), (x2, y2), (x2 + 34, y2)], fill=(*INK, 150), width=1)
    d.ellipse([x1 - 2, y1 - 2, x1 + 2, y1 + 2], fill=(*SIGNAL, 235))
    d.text((x2 + 40, y2 - 18), label, font=cn_s, fill=(*INK, 225))
    d.text((x2 + 40, y2 + 1), sub, font=mo_s, fill=(*MOSS, 210))

leader(796, 300, 560, 232, "叶形轮廓 × 40", "CONTOUR FIELD / 40 RINGS")
leader(742, 690, 588, 706, "纸纹 0.6", "PAPER GRAIN / 0.6 OPACITY")
leader(1188, 372, 1058, 268, "单一墨色", "SINGLE INK / MOSS")

# 5) 左侧刻度尺
for i in range(21):
    y = 150 + i * 32
    long = i % 5 == 0
    d.line([(M + 6, y), (M + (26 if long else 16), y)], fill=(*INK, 120 if long else 80), width=1)
    if long:
        d.text((M + 34, y - 8), f"{i * 5:02d}", font=mo_s, fill=(*INK, 120))
d.ellipse([M + 4, 150 + 20 * 32 - 3, M + 10, 150 + 20 * 32 + 3], fill=(*SIGNAL, 240))

# 6) 标题区
d.text((132, 118), "轻衡 · 视觉档案", font=cn, fill=(*INK, 240))
d.text((132, 168), "L I G H T   L E D G E R", font=mo_s, fill=(*MOSS, 215))
d.text((132, 196), "PLATE 03 — SYSTEM VISUAL", font=mo, fill=(*INK, 140))

# 7) 右上参数块
for i, (k, v) in enumerate([("GRID", "24 / 1.5"), ("SKIN", "PAPER · LEDGER · NIGHT"), ("INK", "MOSS 111·149·115")]):
    y = 120 + i * 26
    d.text((W - 420, y), k, font=mo_s, fill=(*INK, 130))
    d.text((W - 360, y), v, font=mo_s, fill=(*INK, 190))

# 8) 底部实心墨条 + 反白小字（终末地式标签条）
bar_y0, bar_y1 = H - 150, H - 106
d.rectangle([M, bar_y0, W - M, bar_y1], fill=(*INK, 235))
d.text((M + 22, bar_y0 + 12), "视觉规范", font=cn_s, fill=(248, 250, 242))
d.text((M + 120, bar_y0 + 15), "24 GRID / 1.5 STROKE / ONE MICRO MARK / CURRENT COLOR", font=mo_s, fill=(236, 242, 228))

# 9) 底部注记
d.text((M + 4, H - 84), "叶形 = 生长；账本横线 = 记录；单一墨色 = 克制。三者构成本项目的图形基因。", font=cn_s, fill=(*INK, 185))
d.text((W - 256, H - 84), "FIG. 03 / 2026.11", font=mo_s, fill=(*INK, 120))

ART.mkdir(parents=True, exist_ok=True)
plate = ART / "brand-plate.png"
img.save(plate, "PNG", optimize=True)
small = img.resize((1000, 664), Image.LANCZOS)
bg = ASSETS / "brand-plate.webp"
small.save(bg, "WEBP", quality=84, method=6)
print("plate", plate, plate.stat().st_size)
print("webp ", bg, bg.stat().st_size)
