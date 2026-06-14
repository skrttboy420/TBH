"""Project the raw PlayerSaveData dict into the web API's ParsedSave shape.

Field names mirror lib/types/save.ts. All 64-bit ids (item UniqueId, equipped
ids, box ids) are emitted as **strings** so they survive JSON round-trips through
JavaScript, whose numbers lose precision above 2^53.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

GOLD_CURRENCY_KEY = 100001
TICKS_AT_UNIX_EPOCH = 621355968000000000  # .NET ticks at 1970-01-01


def _get(d: dict[str, Any], *names: str, default: Any = None) -> Any:
    """First present key among `names` (tolerates PascalCase/camelCase drift)."""
    for n in names:
        if n in d:
            return d[n]
    return default


def ticks_to_iso(ticks: Any) -> str | None:
    try:
        ms = (int(ticks) - TICKS_AT_UNIX_EPOCH) // 10_000
        if ms <= 0:
            return None
        dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        return None


def _map_enchant(e: dict[str, Any]) -> dict[str, Any]:
    return {
        "statModKey": int(_get(e, "StatModKey", default=0)),
        "tier": int(_get(e, "Tier", default=0)),
        "value": float(_get(e, "Value", default=0)),
        "recipeType": int(_get(e, "RecipeType", default=0)),
        "modType": int(_get(e, "ModType", default=0)),
        "materialKey": int(_get(e, "MaterialKey", default=0)),
        "statType": int(_get(e, "StatType", default=0)),
    }


def _build_item(slot_index: int, item: dict[str, Any]) -> dict[str, Any]:
    enchant_data = _get(item, "EnchantData", default=[]) or []
    enchants = [_map_enchant(e) for e in enchant_data if int(_get(e, "StatModKey", default=0)) != 0]
    return {
        "index": int(slot_index),
        "uniqueId": str(_get(item, "UniqueId", default=0)),
        "itemKey": int(_get(item, "ItemKey", default=0)),
        "isChaotic": bool(_get(item, "IsChaotic", default=False)),
        "isBlocked": bool(_get(item, "IsBlocked", default=False)),
        "enchantCount": list(_get(item, "EnchantCount", default=[]) or []),
        "enchants": enchants,
    }


def _slots_to_items(slots: list[dict[str, Any]], items_by_id: dict[int, dict]) -> list[dict]:
    out: list[dict[str, Any]] = []
    for slot in slots:
        uid = _get(slot, "ItemUniqueId", default=0)
        if not uid:  # 0 == empty slot
            continue
        item = items_by_id.get(int(uid))
        if item is None:
            continue
        out.append(_build_item(_get(slot, "Index", default=len(out)), item))
    return out


def _map_settings(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "language": _get(s, "language"),
        "isAlwaysOnTop": _get(s, "isAlwaysOnTop"),
        "maxFps": _get(s, "maxFps"),
        "isAutoStart": _get(s, "isAutoStart"),
        "stageRepeatStageFailed": _get(s, "StageRepeatStageFailed"),
        "repeatActBossDuringConsumeAllStone": _get(s, "RepeatActBossDuringConsumeAllStone"),
    }


def _save_hash(payload: dict[str, Any]) -> str:
    """Stable hash over meaningful content (excludes volatile timestamps)."""
    canonical = {
        "gold": payload["gold"],
        "currentStageKey": payload["currentStageKey"],
        "maxCompletedStage": payload["maxCompletedStage"],
        "currentStageWave": payload["currentStageWave"],
        "currencies": payload["currencies"],
        "inventory": payload["inventory"],
        "stash": payload["stash"],
        "heroes": payload["heroes"],
        "pets": payload["pets"],
        "runes": payload["runes"],
        "boxes": payload["boxes"],
    }
    blob = json.dumps(canonical, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def parse_save(player: dict[str, Any]) -> dict[str, Any]:
    """PlayerSaveData dict → ParsedSave dict ready for /api/v1/agent/save-state."""
    common = player.get("commonSaveData", {})
    item_list = player.get("itemSaveDatas", []) or []
    items_by_id = {int(_get(it, "UniqueId", default=0)): it for it in item_list}

    inv_slots = player.get("inventorySaveDatas", []) or []
    stash_slots = player.get("stashSaveDatas", []) or []
    inventory = _slots_to_items(inv_slots, items_by_id)
    stash = _slots_to_items(stash_slots, items_by_id)

    heroes = [
        {
            "heroKey": int(_get(h, "heroKey", "HeroKey", default=0)),
            "level": int(_get(h, "HeroLevel", default=0)),
            "exp": float(_get(h, "HeroExp", default=0)),
            "isUnlock": bool(_get(h, "IsUnLock", "IsUnlock", default=False)),
            "abilityPoint": int(_get(h, "AbilityPoint", default=0)),
            "allocatedAbilityPoint": int(_get(h, "AllocatedHeroAbilityPoint", default=0)),
            "equippedItemIds": [str(x) for x in _get(h, "equippedItemIds", default=[]) or []],
            "skills": [int(x) for x in _get(h, "equippedSKillKey", default=[]) or []],
            "unlockedAttributeGroups": [
                int(x) for x in _get(h, "unlockedAttributeGroupKeys", default=[]) or []
            ],
        }
        for h in player.get("heroSaveDatas", []) or []
    ]

    pets = [
        {
            "petKey": int(_get(p, "PetKey", default=0)),
            "isUnlock": bool(_get(p, "IsUnlock", "IsUnLock", default=False)),
            "isViewed": bool(_get(p, "IsViewed", default=False)),
        }
        for p in player.get("PetSaveData", []) or []
    ]

    runes = [
        {"runeKey": int(_get(r, "RuneKey", default=0)), "level": int(_get(r, "Level", default=0))}
        for r in player.get("RuneSaveData", []) or []
    ]

    currencies = [
        {"key": int(_get(c, "Key", default=0)), "quantity": float(_get(c, "Quantity", default=0))}
        for c in player.get("currenySaveDatas", player.get("currencySaveDatas", [])) or []
    ]
    gold = next((c["quantity"] for c in currencies if c["key"] == GOLD_CURRENCY_KEY), 0)

    box = player.get("BoxData", {}) or {}
    box_types = box.get("BoxTypes", []) or []
    box_ids = box.get("BoxUniqueId", []) or []
    box_qty = box.get("BoxQuantity", []) or []
    boxes = [
        {"type": int(t), "uniqueId": str(u), "quantity": int(q)}
        for t, u, q in zip(box_types, box_ids, box_qty)
    ]

    heroes_unlocked = sum(1 for h in heroes if h["isUnlock"])
    pets_unlocked = sum(1 for p in pets if p["isUnlock"])

    payload: dict[str, Any] = {
        "version": str(_get(common, "version", default="")),
        "capturedAt": ticks_to_iso(_get(common, "lastSavedTime")),
        "saveHash": "",  # filled below
        "playTime": int(_get(common, "playTime", default=0)),
        "gold": int(gold),
        "maxCompletedStage": int(_get(common, "maxCompletedStage", default=0)),
        "currentStageKey": int(_get(common, "currentStageKey", default=0)),
        "currentStageWave": int(_get(common, "currentStageWave", default=0)),
        "arrangedHeroKeys": [int(x) for x in _get(common, "arrangedHeroKey", default=[]) or []],
        "arrangedPetKey": (
            int(_get(common, "ArrangedPetKey")) if _get(common, "ArrangedPetKey") is not None else None
        ),
        "currencies": currencies,
        "heroes": heroes,
        "pets": pets,
        "runes": runes,
        "inventory": inventory,
        "stash": stash,
        "boxes": boxes,
        "settings": _map_settings(player.get("settingSaveData", {}) or {}),
        "summary": {
            "heroesUnlocked": heroes_unlocked,
            "heroesTotal": len(heroes),
            "petsUnlocked": pets_unlocked,
            "petsTotal": len(pets),
            "runesCount": len(runes),
            "itemsTotal": len(item_list),
            "inventoryUsed": len(inventory),
            "inventoryCapacity": len(inv_slots),
            "stashUsed": len(stash),
            "stashCapacity": len(stash_slots),
        },
    }
    payload["saveHash"] = _save_hash(payload)
    return payload
