# Tuning

Environment variables that adjust runtime behavior. Set them in the shell that launches Claude Code, or — for persistent defaults — in your shell rc.

| Env var | Description | Default |
|---|---|---|
| `CLAUDE_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if output collides with the overlays. | `16` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Overrides the `/effort` level shown on the header. Accepts `low`, `medium`, `high`, `xhigh`, `max`. When unset, the value is read from `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json` (first valid wins). | — |
| `CLAUDE_STATUSLINE_DEBUG_LOG` | When set to a file path, the statusline appends one JSON line per invocation describing what it rendered (`rows`, `maxW`, `termW`, `overflow`, tool/agent counts, session id). Useful for diagnosing layout/width issues. Leave unset for normal use. | — |
