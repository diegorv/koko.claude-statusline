# Layout & Features

Claude Code pipes session JSON to stdin. The script writes a header row followed by a framed body containing one or more rows. Rows that have no data are simply not emitted — the statusline shrinks to just the header when you are outside a git repo and before any tools, agents, or todos appear.

## Layout overview

- **Header (always shown)** — a single line with content pinned to both edges and dashes filling the middle.
- **Body (conditional)** — wrapped in a single box. When both the session-state rows and the activity rows are populated, a `├──` tee divides them inside the same box. Rows wrap at separator boundaries to fit the terminal width.

The box's right edge aligns with the column where the header's right-side stats begin — everything to the left of that column is framed; cost, duration, and activity title sit outside as floating annotations. Any row wider than the box is wrapped at separator boundaries; the available width is shrunk by `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](TUNING.md)) to leave room for Claude Code's overlay indicators.

### Header

| Side | Content |
|---|---|
| Left | Repo name (when inside a git repo) · model (with an `effort: <level>` chip when `/effort` is set) · context window gradient bar + `%` + tokens used |
| Right | Session cost (`¢` below `$0.10`, otherwise `$`) · session duration (shown when `≥ 1s`) · activity title (dim: `⚡` when launched with `--dangerously-skip-permissions` · `CLAUDE.md` / MCP / hook / rule counts · non-default `output_style` · session name) |

### Body rows

Each row starts with a domain-colored Nerd Font icon as its gutter, so the row is self-labeling at a glance.

| Gutter | Row | Content |
|---|---|---|
|  green | **Git** | branch · dirty marker · staged / modified / untracked · ahead / behind · short SHA · `⑂` when origin and upstream owners differ · worktree name · vim mode |
|  yellow | **Consumption** | 5h and 7d gradient bars with reset countdowns · live output speed (`tok/s`) · `+added` / `-removed` lines for the session · token breakdown (`↑input ↓output ◆cache`) |
|  cyan | **Tools** | running tools with spinner · completed tools with counts |
|  magenta | **Agents + Todos** | spawned subagents with elapsed time · current in-progress todo + overall progress |

The consumption row is ordered most-stable to most-variable in width (rate limits first, growing tallies last) so the anchored items don't shift as token totals grow over a long session.

## Features

- Model name, current `/effort` level (`low` / `medium` / `high` / `xhigh` / `max`), context window usage with gradient bar + total tokens, cost, and session duration
- Git branch, dirty state, staged/modified/untracked counts, ahead/behind, short SHA, fork indicator (when `origin` and `upstream` owners diverge)
- Rate limits (5h and 7d) with gradient bars and reset countdowns
- Live output speed (`tok/s`), gated against stale / near-zero samples
- Session-level token breakdown (input / output / cache)
- Running and completed tool usage from the session transcript
- Agent execution tracking with elapsed time
- Todo progress from `TodoWrite` calls
- MCP server health status (ok / errored)
- `CLAUDE.md`, rules, hooks, and MCP counts
- Non-default `output_style` indicator
- `⚡` warning when Claude Code was launched with `--dangerously-skip-permissions`
- Worktree name, vim mode, `+added` / `-removed` line tally for the session
- Self-healing terminal-width detection (cached + validated to suppress transient `/dev/tty` glitches that previously leaked content into the scrollback)
