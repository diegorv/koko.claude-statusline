# Tuning

Environment variables that adjust runtime behavior. Set them in the shell that launches Claude Code, or — for persistent defaults — in your shell rc.

| Env var | Description | Default |
|---|---|---|
| `CLAUDE_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if output collides with the overlays. | `16` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Overrides the `/effort` level shown on the header. Accepts `low`, `medium`, `high`, `xhigh`, `max`. When unset, the value is read from `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json` (first valid wins). | — |
| `CLAUDE_STATUSLINE_DEBUG_LOG` | When set to a file path, the statusline appends one JSON line per invocation describing what it rendered (`rows`, `maxW`, `termW`, `overflow`, tool/agent counts, session id). Useful for diagnosing layout/width issues. Leave unset for normal use. | — |
| `AGENT_BAR_DIR` | When set to a directory and Claude Code runs inside a kitty window (`KITTY_WINDOW_ID`), each invocation writes `<dir>/<KITTY_WINDOW_ID>.json` with a small session snapshot (`agent`, `model`, `effort`, `context_pct`, `context_tokens`, `cost_usd`, `session_name`, `updated_at`) for a terminal-side agent bar to read. The directory is created `0700` and the file `0600`; writes are atomic (temp file + rename). | — |
