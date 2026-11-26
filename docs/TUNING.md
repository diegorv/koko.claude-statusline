# Tuning

Set these variables in the environment that starts the command or plugin. For margin and diagnostic logging, the `KOKO_STATUSLINE_` name takes precedence over its `CLAUDE_STATUSLINE_` alias.

| Setting | Applies to | Behavior |
|---|---|---|
| `KOKO_STATUSLINE_RIGHT_MARGIN` (alias `CLAUDE_STATUSLINE_RIGHT_MARGIN`) | Claude, Antigravity and OpenCode | Reserves columns on the right. Claude defaults to 16 columns for overlay indicators. Antigravity and OpenCode default to zero. An invalid or negative override uses the host default. |
| `KOKO_STATUSLINE_DEBUG_LOG` (alias `CLAUDE_STATUSLINE_DEBUG_LOG`) | Standalone command | Appends one JSON line per invocation that renders a panel. `termW` is the selected width (zero if unknown). `rows`, `maxW` and `overflow` describe the resulting output. The record includes the agent, tool/agent counts and first eight characters of the session ID. Claude can derive that ID from the transcript filename. |
| `CLAUDE_CODE_EFFORT_LEVEL` | Claude | Overrides the effort chip. Accepts `low`, `medium`, `high`, `xhigh` and `max`. Without the override, Claude reads the first valid effort setting from project-local, project and user configuration. |
| `PANE_HEADER_DIR` | Claude, Antigravity and OpenCode | Writes a normalized JSON snapshot for each applicable terminal identifier below. |

Antigravity's reported width takes precedence over terminal probing. OpenCode uses the actual slot width. The margin override applies to that selected width in each host. See [Layout](LAYOUT.md#agent-specific-availability).

## Pane-header output

The exporter creates the directory with mode `0700`, writes each file with mode `0600`, and renames a temporary file into place so readers see complete JSON. The command writes after rendering. OpenCode batches session updates over 250 ms and can export before the first slot measurement. Resizing alone does not trigger a write.

| Terminal identifier | File in `PANE_HEADER_DIR` |
|---|---|
| Numeric `KITTY_WINDOW_ID` | `<KITTY_WINDOW_ID>.json` |
| `HERDR_PANE_ID` | `herdr-<HERDR_PANE_ID>.json` with colons replaced by underscores |
| Local `HC_TERMINAL_ID` | `hc-<HC_TERMINAL_ID>.json` |

The schema contains `agent`, `model`, `effort`, `context_pct`, `context_tokens`, `cost_usd`, `session_name` and `updated_at` (Unix milliseconds). Missing costs use `null`. Antigravity adds `cost_estimated` and reports `context_tokens: null`. OpenCode can report unknown context usage as `null`. Consumers should preserve the distinction between a JSON null and a measured zero.
