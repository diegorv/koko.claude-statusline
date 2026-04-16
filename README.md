# claude-statusline

A rich terminal status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Displays session info, git status, rate limits, tool usage, agents, todos, and config counts in styled ANSI boxes.

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

Claude Code pipes session JSON to stdin. The script renders two styled boxes to stdout.

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
    boxes.ts                      title bar assembly + box rendering
    box.ts                        minimal box drawing (replaces boxen)
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

Zero runtime dependencies. Box drawing is handled by a minimal inline implementation inspired by [boxen](https://github.com/sindresorhus/boxen), using only the subset needed: round borders, dim style, fixed width, and padding.

Dev dependency: `@types/bun` for TypeScript types.

## License

MIT
