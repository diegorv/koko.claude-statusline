# koko.claude-statusline

[![CI](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml/badge.svg)](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-f9f1e1?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-success)](./package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A rich terminal statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Single entry point, zero runtime dependencies, built with Bun and TypeScript.

100% AI-generated — code, tests, and docs were written entirely with [Claude Code](https://claude.com/claude-code).

Built and tested on macOS. CI builds and tests pass on Linux, but it hasn't been manually tested there.

Works on any terminal with true-color support (iTerm2, Ghostty, Kitty, Alacritty, WezTerm...).

## Goals

- **Small and simple.** A single entry point, one flat UI layer, no build step. The whole thing is ~20 TypeScript files.
- **Zero runtime dependencies.** No color library, no box-drawing library, no argument parser. Plain ANSI strings and the standard library (via Bun).
- **100% local and private.** No network I/O, no telemetry, no analytics, no tracking. The statusline only reads Claude Code's stdin, your local git state, your transcript file, and a couple of `~/.claude` config files. Nothing ever leaves your machine.

## Install

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/diegorv/koko.claude-statusline.git
cd koko.claude-statusline
bun install
```

Configure in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /absolute/path/to/koko.claude-statusline/src/index.ts",
    "padding": 0,
    "refreshInterval": 10
  }
}
```

- **`padding: 0`** (recommended) — removes the default whitespace Claude Code wraps around the statusline, letting the layout use the full terminal width. The project already reserves space for Claude Code's overlay indicators via `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](#tuning)).
- **`refreshInterval`** — how often (in seconds, minimum `1`) Claude Code re-runs the command. Useful for time-based fields (cost, duration, rate-limit countdowns) that change without an explicit Claude Code event. Omit it to refresh only on events.

Claude Code pipes session JSON to stdin. The script writes a header row (model, context bar, cost, duration, config counts) followed by a framed body containing one or more rows (git state, session consumption, tools history, agents). When both the session-state rows and the activity rows are populated, a `├──` tee divides them inside the same box. Rows wrap at separator boundaries to fit the terminal width.

## Quick start

Manual test with mock input:

```sh
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":0.05,"total_duration_ms":120000}}' | bun src/index.ts
```

## What it shows

The layout is split into a persistent header and conditional body rows. Rows that have no data are simply not emitted — the statusline shrinks to just the header when you're outside a git repo and before any tools, agents, or todos appear.

### Header (always shown)

A single line with content pinned to both edges and dashes filling the middle.

| Side | Content |
|---|---|
| Left | Repo name (when inside a git repo) · model (with an `effort: <level>` chip when `/effort` is set) · context window gradient bar + `%` + tokens used |
| Right | Session cost (`¢` below `$0.10`, otherwise `$`) · session duration (shown when `≥ 1s`) · activity title (dim: `⚡` when launched with `--dangerously-skip-permissions` · `CLAUDE.md` / MCP / hook / rule counts · non-default `output_style` · session name) |

### Body rows (rendered only when the underlying data exists)

Each row starts with a domain-colored Nerd Font icon as its gutter, so the row is self-labeling at a glance. The body is wrapped in a single box; when both the session-state rows and the activity rows are populated, a `├──` tee divides them inside.

| Gutter | Row | Content |
|---|---|---|
|  green | **Git** | branch · dirty marker · staged / modified / untracked · ahead / behind · short SHA · `⑂` when origin and upstream owners differ · worktree name · vim mode |
|  yellow | **Consumption** | 5h and 7d gradient bars with reset countdowns · live output speed (`tok/s`) · `+added` / `-removed` lines for the session · token breakdown (`↑input ↓output ◆cache`) |
|  cyan | **Tools** | running tools with spinner · completed tools with counts |
|  magenta | **Agents + Todos** | spawned subagents with elapsed time · current in-progress todo + overall progress |

The consumption row is ordered most-stable to most-variable in width (rate limits first, growing tallies last) so the anchored items don't shift as token totals grow over a long session. The box's right edge aligns with the column where the header's right-side stats begin — everything to the left of that column is framed; cost, duration, and activity title sit outside as floating annotations. Any row wider than the box is wrapped at separator boundaries; the available width is shrunk by `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](#tuning)) to leave room for Claude Code's overlay indicators.

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

## Tuning

| Env var | Description | Default |
|---|---|---|
| `CLAUDE_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if output collides with the overlays. | `16` |
| `CLAUDE_CODE_EFFORT_LEVEL` | Overrides the `/effort` level shown on the header. Accepts `low`, `medium`, `high`, `xhigh`, `max`. When unset, the value is read from `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json` (first valid wins). | — |
| `CLAUDE_STATUSLINE_DEBUG_LOG` | When set to a file path, the statusline appends one JSON line per invocation describing what it rendered (`rows`, `maxW`, `termW`, `overflow`, tool/agent counts, session id). Useful for diagnosing layout/width issues. Leave unset for normal use. | — |

## Development

### Testing

```sh
bun test                    # run all tests
bun test path/to/file       # run a single test file
```

CI runs on push and PR via GitHub Actions.

### Project structure

| Path | Responsibility |
|---|---|
| `src/index.ts` | Entry point, orchestration only |
| `src/parsing/stdin.ts` | Parse Claude Code JSON from stdin |
| `src/parsing/transcript.ts` | Parse session transcript JSONL — tool/agent tracking, per-turn token usage, assistant samples for rate math |
| `src/collection/git.ts` | Git repo info via `Bun.spawnSync` (branch, dirty, SHA, fork detection) |
| `src/collection/config.ts` | Count `CLAUDE.md`, MCPs, hooks, rules |
| `src/collection/parent-process.ts` | Inspect parent process cmdline for `--dangerously-skip-permissions` |
| `src/ui/terminal.ts` | Terminal width detection (stdout / stderr / env / `/dev/tty`) with per-session cache to defuse transient glitches |
| `src/ui/format.ts` | ANSI colors, gradient bar, `Intl.Segmenter`-based grapheme width, duration formatting |
| `src/ui/render.ts` | Compositor — assembles per-row components and assigns domain gutters |
| `src/ui/lines.ts` | Layout (header + boxed body with optional `├──` tee divider, wrap) |
| `src/ui/constants.ts` | Icons, separators, spinner |
| `src/ui/components/` | Per-row components (git, workspace, rate limits, token breakdown, output speed, session diff, tools, agents, todos, activity title, effort) |
| `tests/` | Mirrors `src/` structure |

## Dependencies

Zero runtime dependencies. Layout is rendered as plain ANSI rows with a horizontal rule between header and body — no box-drawing or color library. Git and terminal size are queried via `Bun.spawnSync`.

Dev dependency: `@types/bun` for TypeScript types.

## Inspiration & Attribution

This project was inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud) by Jarrod Watts. No code was copied — everything was written from scratch in Bun + TypeScript, with a different layout (flat per-row output sized to the terminal width) and a different feature set.

The technique for displaying the current `/effort` level — which is not exposed in the Claude Code stdin payload — came from [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine) by Daniel Gomes. Reading `effortLevel` from `~/.claude/settings.json` (with an optional `CLAUDE_CODE_EFFORT_LEVEL` env-var override) is his approach; our implementation is independent and adds project-level cascade plus the full `low`/`medium`/`high`/`xhigh`/`max` enum.

## License

MIT
