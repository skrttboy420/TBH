// Known keys from the live save. Extend as more are mapped.

/** currenySaveDatas key for gold (Quantity observed: 722,464). */
export const GOLD_CURRENCY_KEY = 100001;

/** Bag / stash grid capacities (slot counts in the save). */
export const INVENTORY_CAPACITY = 260;
export const STASH_CAPACITY = 343;

/** .NET DateTime ticks → epoch. Ticks are 100ns since 0001-01-01. */
const TICKS_AT_UNIX_EPOCH = 621355968000000000n;

/** Convert a .NET `lastSavedTime` (ticks) to an ISO string, or null. */
export function dotnetTicksToIso(ticks: number | string | null | undefined): string | null {
  if (ticks == null) return null;
  try {
    const t = typeof ticks === "string" ? BigInt(ticks) : BigInt(Math.trunc(ticks));
    const ms = Number((t - TICKS_AT_UNIX_EPOCH) / 10000n);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}

export const AGENT_TOKEN_PREFIX = "tbh_";

/** A heartbeat older than this marks the agent offline. */
export const AGENT_OFFLINE_AFTER_MS = 30_000;
