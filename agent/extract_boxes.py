"""สร้างไอคอนหีบสมบัติ -> public/boxes/<type>.png
    type 0 = หีบสมบัติธรรมดา  (สีทอง)
    type 1 = หีบสมบัติด่าน     (สีฟ้า  = "กล่องฟ้า")
    type 2 = หีบสมบัติบอสแอค   (สีแดง)

เกมเก็บ sprite หีบจริงไว้เป็นชุดเฟรมอนิเมชัน:
    Chest_NormalBoss_0  -> หีบฟ้า  (บอสจบด่าน = หีบด่าน)   = type 1
    Chest_ActBoss_0     -> หีบแดง  (บอสจบแอค)               = type 2
เฟรม 0 = หีบปิด ใช้เป็นไอคอนได้สวยที่สุด

หีบธรรมดา (type 0) ไม่มี sprite ตัวหีบในไฟล์เกม (มีแต่ไอคอน "สเตตัส %ดรอป"
ซึ่งเป็นทองแต่มีพื้นกรอบติดมาด้วย) จึงรีคัลเลอร์หีบฟ้าเป็นสีทองให้เข้าชุดกัน
สไตล์เดียวกัน พื้นโปร่งใสเหมือนกันทั้งสามใบ

เคยพลาด: เวอร์ชันก่อนไปดึง DropChance*/MaxAmount* ซึ่งเป็น "ไอคอนสเตตัส"
ทำให้ type 1 ออกมาเป็นทอง และ type 2 เป็นม่วง (ผิด)

รัน: PYTHONUTF8=1 python extract_boxes.py
"""
from __future__ import annotations

import colorsys
import os

import UnityPy
from PIL import Image

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
WEB = r"C:\Users\Admin\tbh-companion"
BOX_DIR = os.path.join(WEB, "public", "boxes")
os.makedirs(BOX_DIR, exist_ok=True)

# sprite ตัวหีบจริง (เฟรม 0 = ปิด)
BLUE = "Chest_NormalBoss_0"  # หีบฟ้า  -> type 1
RED = "Chest_ActBoss_0"      # หีบแดง  -> type 2
WANT = {BLUE, RED}


def trim(im: Image.Image) -> Image.Image:
    """ตัดขอบโปร่งใสออกให้เหลือเฉพาะตัวหีบ (เฟรมอนิเมชันวางไม่ตรงกลาง)."""
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def goldify(im: Image.Image) -> Image.Image:
    """รีคัลเลอร์หีบฟ้า -> ทอง โดยคงน้ำหนักแสงเงา (value) เดิมไว้."""
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nh = 0.11  # โทนทอง (~40°)
            ns = s if s < 0.18 else min(1.0, max(0.55, s * 1.15))
            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, v)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def square(im: Image.Image, side: int) -> Image.Image:
    """วางหีบไว้กลางผืนสี่เหลี่ยมจัตุรัสโปร่งใส ให้สัดส่วนทุกใบเท่ากัน."""
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    return canvas


print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))
found: dict[str, Image.Image] = {}
for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        nm = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    if nm in WANT:
        found[nm] = sp.image.convert("RGBA")

missing = WANT - set(found)
if missing:
    raise SystemExit(f"sprite หีบหาย: {missing}")

blue = trim(found[BLUE])
red = trim(found[RED])
gold = goldify(blue)

side = max(blue.width, blue.height, red.width, red.height) + 2
outputs = {0: square(gold, side), 1: square(blue, side), 2: square(red, side)}
for t, im in outputs.items():
    path = os.path.join(BOX_DIR, f"{t}.png")
    im.save(path)
    print(f"box {t} -> {path}  ({im.width}x{im.height})")
print("done.")
