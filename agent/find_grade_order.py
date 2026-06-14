"""หาลำดับเกรด (enum ItemGrade) จาก global-metadata.dat โดยดู byte offset ของชื่อเกรด

string literals ใน metadata มักเรียงตามลำดับการประกาศ → ใช้เดาลำดับ enum ได้
ชื่อเกรดจริงเป็นตัวพิมพ์ใหญ่ (จาก StringTable keys: Grade_COMMON ฯลฯ)
"""
from __future__ import annotations

import re

PATH = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\il2cpp_data\Metadata\global-metadata.dat"
data = open(PATH, "rb").read()

# ผู้สมัครชื่อเกรดทั้งหมดที่เคยเจอ + เผื่อที่ยังไม่เจอ
names = [
    "NONE", "ALL",
    "COMMON", "UNCOMMON", "RARE", "EPIC", "UNIQUE", "LEGENDARY", "MYTHIC",
    "MYTHICAL", "ARCANA", "CELESTIAL", "DIVINE", "COSMIC", "IMMORTAL",
    "BEYOND", "CHAOS", "CHAOTIC", "ETERNAL", "TRANSCENDENT", "PRIMORDIAL",
]
print("byte offset ของแต่ละชื่อ (เรียงตาม offset = น่าจะลำดับ enum):")
found = []
for n in names:
    # ลองหาแบบ null-terminated literal ก่อน
    m = re.search(rb"\x00" + n.encode() + rb"\x00", data)
    if m:
        found.append((m.start() + 1, n))
for off, n in sorted(found):
    print(f"  {off:>10}  {n}")

print("\nชื่อที่ 'ไม่เจอ':", [n for n in names if n not in {x[1] for x in found}])

# ค้น key 'Grade_' และ 'ItemGrade' เผื่อมีพรุ๊ฟลำดับใกล้ๆ กัน
print("\nบริบทรอบ ๆ 'Grade_' (12 แรก):")
for m in list(re.finditer(rb"Grade_[A-Z]+", data))[:12]:
    s = m.start()
    snippet = data[s : s + 24]
    printable = bytes(c if 32 <= c < 127 else 0x7C for c in snippet)
    print(f"  @{s}: {printable.decode(errors='replace')}")
