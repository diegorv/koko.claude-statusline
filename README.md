# claude-statusline

A rich terminal status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Displays session info, git status, rate limits, tool usage, agents, todos, and config counts as a flat, terminal-width-adaptive layout.

## Features

- Model name, context window usage with gradient bar, cost, and session duration
- Git branch, dirty state, staged/modified/untracked counts, ahead/behind
- Rate limits (5h and 7d) with gradient bars and reset countdowns
- Running and completed tool usage from the session transcript
- Agent execution tracking with elapsed time
- Todo progress from TodoWrite calls
- MCP server health status (ok/errored)
- CLAUDE.md, rules, hooks, and MCP counts
- Worktree name, vim mode, line changes

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
```

Configure in `~/.claude/settings.json`:

```json
{
  "statusLine": "bun /path/to/claude-statusline/src/index.ts"
}
```

Claude Code pipes session JSON to stdin. The script writes a header row (model, context bar, cost, duration, config counts), a horizontal rule, and one or more body rows (git, rate limits, tools, agents, todos) to stdout. Rows wrap at separator boundaries to fit the terminal width.

### Tuning

- `CLAUDE_STATUSLINE_RIGHT_MARGIN` (default `16`): columns reserved on the right for Claude Code's overlay indicators (e.g. `0 tokens`, `@model /effort`). Lower it to use more width, raise it if the output collides with the overlays.

## Test

```bash
bun test
```

CI runs automatically on push and PR via GitHub Actions.

Manual test:

```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":0.05,"total_duration_ms":120000}}' | bun src/index.ts
```

## Project structure

```
src/
  index.ts                        entry point (orchestration only)
  parsing/
    stdin.ts                      parse Claude Code JSON from stdin
    transcript.ts                 parse session transcript JSONL
  collection/
    git.ts                        git repo info via Bun.spawnSync
    config.ts                     count CLAUDE.md, MCPs, hooks, rules
  ui/
    format.ts                     ANSI colors, gradient bar, duration formatting
    render.ts                     compositor (assembles components)
    lines.ts                      flat-line layout (header + rule + body rows, wrap)
    terminal.ts                   terminal width detection (stdout/stderr/env/dev-tty)
    constants.ts                  icons, separators, spinner
    components/
      index.ts                    barrel export for all components
      git-status.ts               branch, dirty, staged/modified/untracked
      workspace-info.ts           worktree, line changes, vim mode
      rate-limit.ts               gradient bar + percentage + reset countdown
      running-tools.ts            spinner + tool name/target
      completed-tools.ts          checkmark + tool name + count
      agents.ts                   agent status + elapsed time
      todos.ts                    todo progress bar
      activity-title.ts           config counts + session name
tests/                            mirrors src/ structure
.github/workflows/ci.yml          CI (bun test on push & PR)
```

## Dependencies

Zero runtime dependencies. Layout is rendered as plain ANSI rows with a horizontal rule between header and body — no box-drawing dependency.

Dev dependency: `@types/bun` for TypeScript types.

## License

MIT
