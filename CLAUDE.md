# TBH Companion — project guide for Claude

> **Personal side project.** This is **not** part of the user's main `pacred-web`
> work. Keep all context inside `C:\Users\Admin\tbh-companion`. **Never** write
> TBH notes into the pacred auto-memory store
> (`C:\Users\Admin\.claude\projects\C--Users-Admin-pacred-web\memory\`). The user
> speaks Thai — respond in Thai, and all UI labels + agent logs are Thai.

## What it is

A companion platform for the Unity idle game **“TBH: Taskbar Hero”** (studio
`TesseractStudio`, product folder `TaskbarHero`). It lets the player remotely:

- monitor farming progress, gold, stages, heroes/pets/runes,
- **browse their in-game bag & stash remotely** (headline feature),
- see a loot feed and activity timeline,
- control the game (start/stop farm, pick a stage, take a screenshot).

Two parts: a **Next.js web app** (deployed to Vercel) and a **Python desktop
agent** that runs on the gaming PC.

## Architecture

- **Read-side data** (inventory, gold, heroes, equipment, stage, pets, runes,
  boxes) comes from **parsing the decrypted `.es3` save** — no OCR.
- **Loot / activity** is derived by the agent **diffing successive saves**.
- **Control** (start/stop/stage/screenshot) uses **Win32** automation.
- Web ↔ agent talk over a small REST API; the browser stays live via **Supabase
  Realtime** (`components/realtime/realtime-refresh.tsx` debounces
  `router.refresh()` on row changes).

## Stack

Next.js 14.2.15 (app router), TypeScript, TailwindCSS, shadcn/ui, Supabase
(Postgres + Auth + Realtime + Storage), Python 3.11+ agent, Vercel.
**React 18.3.1** — use `useFormState`/`useFormStatus` from `react-dom`, *not*
`useActionState`.

## Layout

```
app/                       # routes: (auth) login/register, (app) dashboard…settings, api/v1/*
components/                # ui/, layout/, dashboard/, inventory/, agents/, control/, loot/, realtime/
lib/                       # types/, game/ (stages,items,constants), data/ (queries,save), api/ (response,validation,agent-auth,helpers), supabase/
supabase/migrations/0001_initial_schema.sql
agent/                     # Python desktop agent (see agent section)
.env.local                 # real Supabase creds (gitignored)
```

## Key technical facts (verified against the live save)

- **ES3 decryption**: AES-128-CBC. `key = PBKDF2-HMAC-SHA1(password, salt=IV,
  iterations=100, dkLen=16)` where the 16-byte IV is the first 16 bytes of the
  file (and doubles as the salt). PKCS7 padding; occasionally gzipped. Password
  ships in the clear: `emuMqG3bLYJ938ZDCfieWJ`.
- **Double decode**: the ES3 root has 3 entries; game state is in
  `PlayerSaveData`, whose `value` is itself a **JSON string parsed a second
  time**. (`SystemInfo.value` is base64 — skip it.)
- **Save path**: `%USERPROFILE%/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3`
  (note lowercase `b` in “Taskbar”). Backups: `SaveFile_Live_backup_<BE-date>_<time>.es3`.
- **int64 ids** (item `UniqueId`, equipped ids, box ids, `lastSavedTime`) exceed
  JS `2^53`. The agent **stringifies all ids**; loot rows set
  `itemUniqueId: null` and carry the id in `metadata.uniqueId` so the server’s
  `JSON.parse` can’t lose precision.
- **Stage key**: `difficulty*1000 + act*100 + stage`; `stage == 10` is the act
  boss. Live save: `1304` → “3-4”. Only difficulty 1 (ปกติ/Normal) is unlocked.
- **Gold** currency key is `100001`.

## API (agent ↔ web)

Envelope: `{ success: true, data }` or `{ success: false, error: { code, message, details? } }`.
Agent auth: **`Agent-Token`** header (token starts with `tbh_`). User routes use
Supabase session cookies + RLS.

- `POST /api/v1/agent/heartbeat` `{status?, agentVersion?, hostname?, platform?, metadata?, activity?[]}` → `{serverTime, agent, commands[]}` (status enum: `online|farming|error` — **no `offline`**; server derives offline from stale `last_seen_at`).
- `POST /api/v1/agent/save-state` `{save: ParsedSave, loot?[], activity?[]}` → `{changed, snapshotId, serverTime}` (dedupes by `save.saveHash`).
- `GET /api/v1/agent/commands` → `{commands[]}`; `PATCH /api/v1/agent/commands/[id]` `{status: acknowledged|completed|failed, result?, error?}`.
- `POST /api/v1/agent/screenshots` multipart, field `file` (+ `commandId/width/height`).
- User-managed: `POST/PATCH/DELETE /api/v1/agents`, `…/[id]/rotate`, `…/[id]/commands`.

Commands: `START_FARM STOP_FARM TAKE_SCREENSHOT GET_STATUS READ_SAVE`.
Lifecycle: `pending → sent → acknowledged → completed | failed | expired`.

## Web — commands & quirks (Windows)

- Package manager is **pnpm**. `pnpm install`, `pnpm dev`, `pnpm build`.
- Typecheck flakes on a stale build-info file: delete `tsconfig.tsbuildinfo`
  first, then `pnpm typecheck` (or `node node_modules/typescript/bin/tsc --noEmit`).
- The lone build warning about `@supabase/supabase-js` `process.version` under
  the Edge runtime (from middleware) is **harmless**.
- Env (`.env.local`, mirror in `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Deployment checklist

1. **Apply the DB migration** — open `supabase/migrations/0001_initial_schema.sql`
   in the Supabase dashboard SQL editor and run it. *(Not yet applied — the DB
   password isn’t available to the CLI.)* It also sets RLS + the Realtime
   publication (agents, save_state, loot_events, activity_events, commands).
2. Set the three env vars in Vercel (Production + Preview).
3. Deploy (push to the connected git remote, or `vercel`).
4. In the app, register, create an agent under **/agents**, copy its one-time
   token, and configure the desktop agent with it.

## Agent

Python package `agent/tbh_agent/`, entry `agent/run.py`.

- `es3.py` decrypt + outer parse · `save_reader.py` → `ParsedSave` (matches
  `lib/types/save.ts`) · `game.py` stage helpers · `diff.py` loot+activity from
  two saves · `api.py` HTTP client · `control.py` Win32 window/screenshot/hotkeys
  · `config.py` `config.json` load/save + save auto-detect · `runner.py` main
  loop · `setup_wizard.py` interactive setup.
- Run: `cd agent` → `pip install -r requirements.txt` → `python run.py setup` →
  `python run.py`. State persists in `agent/state.json` (last save, for diffing
  across restarts).
- Farm start/stop are **configurable hotkeys** (`config.json` → `controls`)
  because the in-game binding varies. Screenshot needs no hotkey. (Auto
  stage-selection was removed — Unity ignores injected/background input; the
  player navigates stages in-game and tracks loops via "farm loop sets".)
- The decrypt/parse/diff layers are verified against the live save. The Win32
  control + screenshot paths require the deps installed and the game running, so
  they can’t be exercised headlessly.
