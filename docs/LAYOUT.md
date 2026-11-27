# Layout & Features

Claude Code and Antigravity CLI pipe session JSON to the standalone command. OpenCode updates its plugin from reactive session data. Both runtimes use the same panel renderer to produce a header and an optional framed body. Codex renders a compact native row using the [footer layout](CODEX.md#reading-the-footer). Rows of the framed panel that have no data are simply not emitted — the statusline shrinks to just the header when you are outside a git repo and before any tools, agents, or todos appear.

## Layout overview

- **Header (always shown)** — a single line with content pinned to both edges and dashes filling the middle.
- **Body (conditional)** — wrapped in a single box. When both the session-state rows and the activity rows are populated, a `├──` tee divides them inside the same box. Rows wrap at separator or activity-item boundaries to fit the terminal width. Individual items longer than the available width are left to terminal wrapping.

In Claude, the box's right edge aligns with the column where the header's right-side stats begin — everything to the left of that column is framed; cost, duration, and activity title sit outside as floating annotations. Rows wider than the box wrap between items; the minimum frame width never exceeds the reported terminal width. Available width is shrunk by `KOKO_STATUSLINE_RIGHT_MARGIN` (or the legacy `CLAUDE_STATUSLINE_RIGHT_MARGIN`) (see [Tuning](TUNING.md)) to leave room for Claude Code's overlay indicators.

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
- MCP tool results observed in the Claude transcript (successful / errored)
- `CLAUDE.md`, rules, hooks, and MCP counts
- Non-default `output_style` indicator
- `⚡` warning when Claude Code was launched with `--dangerously-skip-permissions`
- Worktree name, vim mode, `+added` / `-removed` line tally for the session
- Self-healing terminal-width detection (cached + validated to suppress transient `/dev/tty` glitches that previously leaked content into the scrollback)

## Agent-specific availability

The feature list above describes Claude Code. Each host supplies its own viewport and metrics.

| Host | Width and frame | Context usage | MCP indicator |
|---|---|---|---|
| Claude Code | Local terminal probe with per-session stabilization when a key is available. The default right margin is 16 columns. | The payload supplies the percentage, with a fallback of zero. Occupied tokens sum current input, cache creation and cache reads when usage is present. | Configured server count plus servers seen in the transcript. The check and cross reflect successful and errored MCP tool results. |
| Antigravity CLI | Payload width first, then local probing. The frame spans the available width with a default margin of zero. | The payload supplies the percentage, with a fallback of zero. Aggregate input and output are shown separately. Occupied context tokens are unknown. | The payload supplies no MCP status. |
| Codex CLI | A native wrapping row. The host controls the available height and width. | Percentage, occupancy and capacity are independent optional observations. | No tool activity in the released snapshot. |
| OpenCode | The measured slot width sets the frame, with a default margin of zero. Resizing changes presentation only. | The active model's context sample includes input, visible output, reasoning, cache reads and cache writes. A known capacity is required for a percentage. Missing usage or capacity leaves the percentage unknown. | The host supplies connected and failed server states. |

Antigravity displays native quota buckets, agent state and subagent status. Claude shows its reported five-hour and seven-day limits. OpenCode shows session token totals separately from the current context sample and adds reasoning to visible output in the output total. Model selection, compaction and undo boundaries determine which sample can supply current context.

Missing costs stay hidden and a reported zero stays visible. Antigravity prefixes estimated costs with `~`. An omitted context percentage in a stdin payload can look like a measured zero. OpenCode can leave that percentage unknown.
