# koko.claude-statusline

[![CI](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml/badge.svg)](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-f9f1e1?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-success)](./package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

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
- **`refreshInterval`** — how often (in milliseconds) Claude Code re-runs the command. `10` gives a near-live feel; raise it if you want less churn.

Claude Code pipes session JSON to stdin. The script writes a header row (model, context bar, cost, duration, config counts), a horizontal rule, and one or more body rows (git, rate limits, tools, agents, todos) to stdout. Rows wrap at separator boundaries to fit the terminal width.

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
| Left | Repo name (when inside a git repo) · model · context window gradient bar + `%` |
| Right | Session cost (`¢` below `$0.10`, otherwise `$`) · session duration (shown when `≥ 1s`) · activity title (dim: `CLAUDE.md` / MCP / hook / rule counts + session name) |

### Body rows (rendered only when the underlying data exists)

Each row starts with a colored left gutter (`▎`) so categories stay visually distinct.

| Gutter | Row | Content |
|---|---|---|
| green | **Git + workspace** | branch, dirty state, staged / modified / untracked, ahead / behind · worktree name · `+added` / `-removed` lines · vim mode |
| yellow | **Rate limits** | 5h and 7d gradient bars with reset countdowns |
| cyan | **Tools** | running tools with spinner · completed tools with counts |
| magenta | **Agents** | spawned subagents with elapsed time |
| yellow | **Todos** | current in-progress task · overall progress |

Any row wider than the terminal is wrapped at separator boundaries; the available width is shrunk by `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](#tuning)) to leave room for Claude Code's overlay indicators.

## Features

- Model name, context window usage with gradient bar, cost, and session duration
- Git branch, dirty state, staged/modified/untracked counts, ahead/behind
- Rate limits (5h and 7d) with gradient bars and reset countdowns
- Running and completed tool usage from the session transcript
- Agent execution tracking with elapsed time
- Todo progress from `TodoWrite` calls
- MCP server health status (ok / errored)
- `CLAUDE.md`, rules, hooks, and MCP counts
- Worktree name, vim mode, line changes

## Tuning

| Env var | Description | Default |
|---|---|---|
| `CLAUDE_STATUSLINE_RIGHT_MARGIN` | Columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if output collides with the overlays. | `16` |

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
| `src/parsing/transcript.ts` | Parse session transcript JSONL |
| `src/collection/git.ts` | Git repo info via `Bun.spawnSync` |
| `src/collection/config.ts` | Count `CLAUDE.md`, MCPs, hooks, rules |
| `src/ui/terminal.ts` | Terminal width detection (stdout / stderr / env / `/dev/tty`) |
| `src/ui/format.ts` | ANSI colors, gradient bar, duration formatting |
| `src/ui/render.ts` | Compositor — assembles components |
| `src/ui/lines.ts` | Flat-line layout (header + rule + body rows, wrap) |
| `src/ui/constants.ts` | Icons, separators, spinner |
| `src/ui/components/` | Per-row components (git, rate limits, tools, agents, todos, workspace, activity title) |
| `tests/` | Mirrors `src/` structure |

## Dependencies

Zero runtime dependencies. Layout is rendered as plain ANSI rows with a horizontal rule between header and body — no box-drawing or color library. Git and terminal size are queried via `Bun.spawnSync`.

Dev dependency: `@types/bun` for TypeScript types.

## Inspiration & Attribution

This project was inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud) by Jarrod Watts. No code was copied — everything was written from scratch in Bun + TypeScript, with a different layout (flat per-row output sized to the terminal width) and a different feature set.

## License

MIT
