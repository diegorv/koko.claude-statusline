# Tuning

Environment variables that adjust runtime behavior. Set them in the shell that launches your agent, or — for persistent defaults — in your shell rc. The `KOKO_` variables work for both supported agents and take precedence over their legacy `CLAUDE_` aliases.

| Env var | Description | Default |
|---|---|---|
| `KOKO_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right. Overrides `CLAUDE_STATUSLINE_RIGHT_MARGIN`. Antigravity's reported terminal width is used before stream/environment probing. | `16` |
| `KOKO_STATUSLINE_DEBUG_LOG` | Debug log path; overrides `CLAUDE_STATUSLINE_DEBUG_LOG`. Records include the selected `agent`. | — |
| `CLAUDE_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if output collides with the overlays. | `16` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Overrides the `/effort` level shown on the header. Accepts `low`, `medium`, `high`, `xhigh`, `max`. When unset, the value is read from `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json` (first valid wins). | — |
| `CLAUDE_STATUSLINE_DEBUG_LOG` | When set to a file path, the statusline appends one JSON line per invocation describing what it rendered (`rows`, `maxW`, `termW`, `overflow`, tool/agent counts, session id). Useful for diagnosing layout/width issues. Leave unset for normal use. | — |
| `PANE_HEADER_DIR` | When set to a directory, each invocation writes a small session snapshot to `<dir>/<KITTY_WINDOW_ID>.json` when Claude Code runs inside a kitty window and to `<dir>/herdr-<HERDR_PANE_ID>.json` (`:` replaced by `_`) when it runs inside a herdr pane. The snapshot has `agent`, `model`, `effort`, `context_pct`, `context_tokens`, `cost_usd`, `session_name`, `updated_at`, for a terminal-side pane header to read. The directory is created `0700` and the file `0600`; writes are atomic (temp file + rename). | — |

Pane-header export works for both agents, including `hc-<HC_TERMINAL_ID>.json` for herdr-core terminals. Claude snapshots retain their existing shape. Antigravity snapshots identify `agent: "antigravity"`, include `cost_estimated`, and use `cost_usd: null` when no cost is reported; consumers must accept that null value. `CLAUDE_CODE_EFFORT_LEVEL` applies only to Claude; Antigravity supplies its effort level in the payload.
