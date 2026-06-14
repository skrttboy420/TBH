"""ดูชื่อสไปรท์ใน SpriteAtlas 'ItemIcon'/'RuneIcon' และสไปรท์ทั่วไปใน resources.assets

เพื่อตัดสินใจว่าไอคอนไอเทมตั้งชื่อด้วยอะไร (itemKey? ชื่อประเภท?)
"""
from __future__ import annotations

import os

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"


def atlas_names(env, want: str) -> list[str]:
    for o in env.objects:
        if o.type.name != "SpriteAtlas":
            continue
        d = o.read_typetree()
        if str(d.get("m_Name")) == want:
            idx = d.get("m_PackedSpriteNamesToIndex", []) or []
            return [str(x) for x in idx]
    return []


shared = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))
for atlas in ("ItemIcon", "RuneIcon", "CubeUI", "KnightClassSpriteAtlas"):
    names = atlas_names(shared, atlas)
    print(f"\n=== atlas {atlas!r}: {len(names)} sprites ===")
    print(sorted(names)[:120])

res = UnityPy.load(os.path.join(DATA, "resources.assets"))
res_sprites = sorted(
    str((o.read().m_Name)) for o in res.objects if o.type.name == "Sprite"
)
print(f"\n=== resources.assets sprites ({len(res_sprites)}) ===")
print(res_sprites)
