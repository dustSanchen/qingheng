"""轻衡品牌插画 · 轻盈档案（Light Ledger）。

按 canvas-design 技能的执行规范：先用哲学定义形态，再把哲学画到画布上。
输出 1240x1650 PNG（A4 比例 150dpi），放进 docs/design/art/。
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = Path(r"D:\AI\build-skills\anthropic-skills\skills\canvas-design\canvas-fonts")
OUT = Path(r"D:\AI\health-android\docs\design\art\light-ledger.png")

W, H = 1240, 1650
PAPER = (244, 246, 238)
INK = (47, 83, 64)
MOSS = (120, 154, 120)
PALE = (183, 203, 165)
RULE = (216, 227, 207)

random.seed(20261104)

# 1) 纸：极细噪点 + 纤维方向（几乎不可见）
img = Image.new("RGB", (W, H), PAPER)
px = img.load()
for y in range(H):
    for x in range(0, W, 1):
        n = random.randint(-3, 3)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

draw = ImageDraw.Draw(img, "RGBA")

# 2) 账本横线：从 y=560 开始向下累积，越靠上越浅（未来的格子）
first, last, step = 560, 1562, 14
for i, y in enumerate(range(first, last, step)):
    depth = i / max(1, (last - first) // step)
    alpha = int(70 + 90 * depth)
    draw.line([(120, y), (W - 120, y)], fill=(RULE[0], RULE[1], RULE[2], alpha), width=1)

# 3) 从纸里长出来的叶：用一束同形轮廓线累积（等距偏移 = 患者记录般的重复）
cx, cy = 620, 800
tilt = math.radians(-21)
rings = 26


def leaf_points(scale, samples=420):
    """一片叶的轮廓：两条对称的贝塞尔近似，尖端在两端，最宽处偏下。"""
    pts = []
    for k in range(samples):
        t = k / (samples - 1)
        u = 2 * t - 1  # -1..1
        half = (1 - u * u) ** 0.62 * (0.62 + 0.38 * (1 - u))
        x = u * 300 * scale
        y = -half * 210 * scale
        # 轻微不对称，让轮廓像长出来的而不是算出来的
        y += math.sin(u * math.pi * 1.7) * 6 * scale
        pts.append((x, y))
    lower = [(x, -y) for x, y in reversed(pts)]
    return pts + lower


for i in range(rings, -1, -1):
    s = 1 - i * 0.028
    if s <= 0.1:
        continue
    poly = []
    for x, y in leaf_points(s):
        rx = x * math.cos(tilt) - y * math.sin(tilt)
        ry = x * math.sin(tilt) + y * math.cos(tilt)
        poly.append((cx + rx, cy + ry))
    fade = i / rings
    color = (
        int(MOSS[0] * (1 - fade) + PALE[0] * fade),
        int(MOSS[1] * (1 - fade) + PALE[1] * fade),
        int(MOSS[2] * (1 - fade) + PALE[2] * fade),
        int(210 * (1 - fade) + 70),
    )
    draw.line(poly + [poly[0]], fill=color, width=1 if i else 2)

# 4) 中脉：一条精确的弧线，末端渐细（用多段短线模拟）
for k in range(90):
    t = k / 89
    sx = -290 + 580 * t
    sy = math.sin((t - 0.5) * math.pi) * 10
    rx = sx * math.cos(tilt) - sy * math.sin(tilt)
    ry = sx * math.sin(tilt) + sy * math.cos(tilt)
    w = max(1, int(3.2 * (1 - abs(t - 0.45) * 1.6)))
    draw.line([(cx + rx, cy + ry), (cx + rx + 3, cy + ry + 2)], fill=INK, width=w)

# 5) 刻度：横向小刻度贴在左侧留白，像仪器的标尺
for i in range(24):
    y = 566 + i * 42
    draw.line([(96, y), (112, y)], fill=(INK[0], INK[1], INK[2], 90), width=1)

# 6) 极简文字：一处标题、一处坐标、一处落款
mono = ImageFont.truetype(str(FONT_DIR / "GeistMono-Regular.ttf"), 15)
mono_s = ImageFont.truetype(str(FONT_DIR / "GeistMono-Regular.ttf"), 12)
serif_cn = ImageFont.truetype(r"C:\Windows\Fonts\simsun.ttc", 27)
serif_cn_s = ImageFont.truetype(r"C:\Windows\Fonts\simsun.ttc", 19)

draw.text((120, 96), "轻 盈 档 案", font=serif_cn, fill=INK)
draw.text((120, 140), "L I G H T   L E D G E R", font=mono_s, fill=(MOSS[0], MOSS[1], MOSS[2], 220))
draw.text((W - 300, 100), "PLATE 01 — 2026.11.04", font=mono_s, fill=(INK[0], INK[1], INK[2], 150))
draw.text((W - 300, 124), "MASS / 64.5 kg    SLEEP / 5.0 h", font=mono_s, fill=(INK[0], INK[1], INK[2], 110))

draw.text((120, 1596), "记录本身，就是一种照顾。", font=serif_cn_s, fill=(INK[0], INK[1], INK[2], 210))
draw.text((W - 262, 1600), "31.14N  121.29E", font=mono_s, fill=(INK[0], INK[1], INK[2], 110))

# 7) 一条压在图上的极细横线（把画面钉在纸面上）
draw.line([(120, 1552), (W - 120, 1552)], fill=(INK[0], INK[1], INK[2], 60), width=1)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print("saved", OUT, img.size, OUT.stat().st_size)
