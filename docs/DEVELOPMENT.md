# Development

## Testing

```sh
bun test                    # run all tests
bun test path/to/file       # run a single test file
bun run typecheck           # tsc --noEmit
```

CI runs on push and PR via GitHub Actions.

## Project structure

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
