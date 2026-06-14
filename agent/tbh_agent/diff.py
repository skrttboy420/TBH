"""Derive loot + activity events by diffing two consecutive parsed saves.

int64 ids stay strings: loot rows set itemUniqueId=None and carry the real id in
metadata.uniqueId so the server's JSON parse can't lose precision above 2^53.
"""

from __future__ import annotations

from typing import Any

from .game import GOLD_CURRENCY_KEY, decode_stage, stage_full_label_th

GOLD_MILESTONE_STEP = 1_000_000


# ── loot ──────────────────────────────────────────────────────────────────────
def _items_by_id(save: dict) -> dict[str, dict]:
    return {
        str(it["uniqueId"]): it
        for it in save.get("inventory", []) + save.get("stash", [])
    }


def _owned_ids(save: dict) -> set[str]:
    ids = {str(it["uniqueId"]) for it in save.get("inventory", []) + save.get("stash", [])}
    for h in save.get("heroes", []):
        for eid in h.get("equippedItemIds", []):
            if eid and eid != "0":
                ids.add(str(eid))
    return ids


def _loot_equipment(prev: dict, curr: dict, stage_key: int) -> list[dict]:
    new_ids = _owned_ids(curr) - _owned_ids(prev)
    if not new_ids:
        return []
    items = _items_by_id(curr)
    events: list[dict] = []
    for uid in new_ids:
        item = items.get(uid)
        meta: dict[str, Any] = {"uniqueId": uid}
        if item is not None:
            meta.update(
                {
                    "itemKey": item.get("itemKey"),
                    "enchantCount": item.get("enchantCount"),
                    "enchants": item.get("enchants"),
                }
            )
        events.append(
            {
                "kind": "equipment",
                "itemKey": item.get("itemKey") if item else None,
                "itemUniqueId": None,  # int64 kept as string in metadata
                "rarity": "chaotic" if (item and item.get("isChaotic")) else None,
                "isChaotic": bool(item.get("isChaotic")) if item else False,
                "quantity": 1,
                "stageKey": stage_key,
                "metadata": meta,
            }
        )
    return events


def _currency_map(save: dict) -> dict[int, float]:
    return {int(c["key"]): float(c["quantity"]) for c in save.get("currencies", [])}


def _loot_currency(prev: dict, curr: dict, stage_key: int) -> list[dict]:
    pm, cm = _currency_map(prev), _currency_map(curr)
    events: list[dict] = []
    for key, qty in cm.items():
        if key == GOLD_CURRENCY_KEY:
            continue  # gold lives in snapshots + milestones, not the loot feed
        delta = qty - pm.get(key, 0)
        if delta > 0:
            events.append(
                {
                    "kind": "currency",
                    "itemKey": key,
                    "quantity": int(delta),
                    "stageKey": stage_key,
                    "metadata": {"key": key, "delta": delta, "total": qty},
                }
            )
    return events


def _box_totals(save: dict) -> dict[int, int]:
    out: dict[int, int] = {}
    for b in save.get("boxes", []):
        t = int(b["type"])
        out[t] = out.get(t, 0) + int(b["quantity"])
    return out


def _loot_boxes(prev: dict, curr: dict, stage_key: int) -> list[dict]:
    pm, cm = _box_totals(prev), _box_totals(curr)
    events: list[dict] = []
    for t, total in cm.items():
        delta = total - pm.get(t, 0)
        if delta > 0:
            events.append(
                {
                    "kind": "box",
                    "quantity": int(delta),
                    "stageKey": stage_key,
                    "metadata": {"type": t, "delta": delta, "total": total},
                }
            )
    return events


def _rune_map(save: dict) -> dict[int, int]:
    return {int(r["runeKey"]): int(r["level"]) for r in save.get("runes", [])}


def _loot_runes(prev: dict, curr: dict, stage_key: int) -> list[dict]:
    pm, cm = _rune_map(prev), _rune_map(curr)
    events: list[dict] = []
    for key, level in cm.items():
        before = pm.get(key, 0)
        if level > before:
            events.append(
                {
                    "kind": "rune",
                    "itemKey": key,
                    "quantity": level - before,
                    "stageKey": stage_key,
                    "metadata": {"runeKey": key, "from": before, "to": level},
                }
            )
    return events


def _pet_unlocks(prev: dict, curr: dict) -> list[int]:
    pm = {int(p["petKey"]): bool(p["isUnlock"]) for p in prev.get("pets", [])}
    return [
        int(p["petKey"])
        for p in curr.get("pets", [])
        if bool(p["isUnlock"]) and not pm.get(int(p["petKey"]), False)
    ]


# ── activity ──────────────────────────────────────────────────────────────────
def _activity_stage(prev: dict, curr: dict) -> list[dict]:
    before = int(prev.get("maxCompletedStage", 0) or 0)
    after = int(curr.get("maxCompletedStage", 0) or 0)
    if after <= before:
        return []
    d = decode_stage(after)
    is_boss = bool(d and d["isBoss"])
    label = stage_full_label_th(after)
    return [
        {
            "type": "boss_cleared" if is_boss else "stage_cleared",
            "title": f"ผ่านบอส {label}" if is_boss else f"ผ่านด่าน {label}",
            "description": None,
            "data": {"from": before, "to": after, "stageKey": after},
        }
    ]


def _activity_clears(prev: dict, curr: dict) -> list[dict]:
    """Count stage clears from the lifetime ``stageClears`` counter (aggregate
    Type 15) — every clear, even farm re-clears that ``maxCompletedStage`` and
    the (rarely-written) wave never reveal.

    Why a cumulative counter instead of a wave reset: the save file is persisted
    only every ~30–80s, NOT per wave, so watching ``currentStageWave`` drop
    misses most rounds (live proof: wave read 0→9 across two saves while the
    stage was actually cleared twice). ``stageClears`` is lossless — the delta
    between two saves is the exact number of clears in between, however many
    saves were skipped.

    Emits a single event carrying ``count`` (how many clears) and an approximate
    ``secondsPerRound`` (playTime delta ÷ clears; runtime per-run times aren't in
    the save). ``maxCompletedStage`` bumps are owned by ``_activity_stage`` so we
    drop one clear from the count when a new highest stage was reached this diff,
    to avoid showing the milestone twice.

    The ``farm`` flag (which the web uses to bump a farm-loop's round counter) is
    only set when ``currentStageKey`` is unchanged across the diff: the global
    counter can't attribute clears to a stage, so a moving stage means the delta
    spans several stages and must not all land on one loop step.
    """
    prev_c = int(prev.get("stageClears", 0) or 0)
    curr_c = int(curr.get("stageClears", 0) or 0)
    clears = curr_c - prev_c
    # prev_c <= 0 ⇒ first diff after upgrade (old state.json lacks stageClears);
    # treat as baseline rather than reporting the whole lifetime total.
    if clears <= 0 or prev_c <= 0:
        return []

    # The new-highest-stage clear is already announced by _activity_stage.
    if int(curr.get("maxCompletedStage", 0) or 0) > int(prev.get("maxCompletedStage", 0) or 0):
        clears -= 1
    if clears <= 0:
        return []

    key = int(curr.get("currentStageKey", 0) or 0)
    if key <= 0:
        return []
    d = decode_stage(key)
    is_boss = bool(d and d["isBoss"])
    label = stage_full_label_th(key)

    # Plain title; the web feed composes "×N" and the approx seconds from
    # `data` (so it can also merge clears across several polls and average).
    dt = int(curr.get("playTime", 0) or 0) - int(prev.get("playTime", 0) or 0)
    sec = round(dt / clears) if dt > 0 else None

    # Only drive farm-loop auto-counting (data.farm) when the player sat on the
    # SAME stage across this diff. stageClears is one global lifetime counter — it
    # never says *which* stage was cleared — so if currentStageKey moved between
    # two saves the delta is spread over several stages, and pinning all of it on
    # whatever stage we happen to land on is wrong (it made a freshly-entered
    # "1-4" jump to ×3). The clear still shows in the feed; it just won't bump a
    # loop's round count unless we're confident it's a genuine re-farm.
    stable = key == int(prev.get("currentStageKey", 0) or 0)

    data: dict[str, Any] = {"stageKey": key, "count": clears}
    if stable:
        data["farm"] = True
    if sec:
        data["secondsPerRound"] = sec
    return [
        {
            "type": "boss_cleared" if is_boss else "stage_cleared",
            "title": f"เคลียร์บอส {label}" if is_boss else f"เคลียร์ {label}",
            "description": None,
            "data": data,
        }
    ]


def _activity_levelups(prev: dict, curr: dict) -> list[dict]:
    pm = {int(h["heroKey"]): int(h["level"]) for h in prev.get("heroes", [])}
    events: list[dict] = []
    for h in curr.get("heroes", []):
        key = int(h["heroKey"])
        before = pm.get(key, 0)
        after = int(h["level"])
        if after > before and before > 0:  # skip first-seen baseline
            events.append(
                {
                    "type": "level_up",
                    "title": f"ฮีโร่ #{key} เลเวล {after}",
                    "description": None,
                    "data": {"heroKey": key, "from": before, "to": after},
                }
            )
    return events


def _activity_gold(prev: dict, curr: dict) -> list[dict]:
    before = int(prev.get("gold", 0) or 0)
    after = int(curr.get("gold", 0) or 0)
    if after // GOLD_MILESTONE_STEP > before // GOLD_MILESTONE_STEP:
        milestone = (after // GOLD_MILESTONE_STEP) * GOLD_MILESTONE_STEP
        return [
            {
                "type": "gold_milestone",
                "title": f"ทองสะสมทะลุ {milestone:,}",
                "description": None,
                "data": {"gold": after, "milestone": milestone},
            }
        ]
    return []


def _activity_pets(pet_keys: list[int]) -> list[dict]:
    return [
        {
            "type": "item_found",
            "title": f"ปลดล็อกเพ็ทใหม่ #{key}",
            "description": None,
            "data": {"petKey": key},
        }
        for key in pet_keys
    ]


def diff_saves(prev: dict | None, curr: dict) -> tuple[list[dict], list[dict]]:
    """Return (loot_events, activity_events). First run (prev None) → ([], [])."""
    if prev is None:
        return [], []

    stage_key = int(curr.get("currentStageKey", 0) or 0)
    pet_keys = _pet_unlocks(prev, curr)

    loot = (
        _loot_equipment(prev, curr, stage_key)
        + _loot_currency(prev, curr, stage_key)
        + _loot_boxes(prev, curr, stage_key)
        + _loot_runes(prev, curr, stage_key)
        + [
            {"kind": "pet", "stageKey": stage_key, "metadata": {"petKey": k}}
            for k in pet_keys
        ]
    )
    activity = (
        _activity_stage(prev, curr)
        + _activity_clears(prev, curr)
        + _activity_levelups(prev, curr)
        + _activity_gold(prev, curr)
        + _activity_pets(pet_keys)
    )
    return loot, activity
