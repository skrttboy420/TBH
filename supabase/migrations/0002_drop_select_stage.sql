-- ============================================================================
-- TBH Companion — drop the SELECT_STAGE command
--
-- Auto stage-selection was removed: the Unity game reads the real hardware
-- cursor (GetCursorPos), not the WM_ message queue, so background PostMessage
-- clicks do nothing — verified empirically. The feature is replaced by
-- user-defined "farm loop sets" (see 0003). This migration tightens the
-- commands.command check constraint so the dead command can't be issued.
-- ============================================================================

-- Remove any historical SELECT_STAGE rows so the new constraint applies cleanly.
delete from public.commands where command = 'SELECT_STAGE';

alter table public.commands drop constraint if exists commands_command_check;
alter table public.commands add constraint commands_command_check
  check (command in ('START_FARM','STOP_FARM','TAKE_SCREENSHOT','GET_STATUS','READ_SAVE'));
