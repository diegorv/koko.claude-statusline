# koko.claude-statusline

[![CI](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml/badge.svg)](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-f9f1e1?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-success)](./package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A rich terminal statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Single entry point, zero runtime dependencies, built with Bun and TypeScript.

100% AI-generated — code, tests, and docs were written entirely with [Claude Code](https://claude.com/claude-code).

Built and tested on macOS. CI builds and tests pass on Linux, but it has not been manually tested there.

Works on any terminal with true-color support (iTerm2, Ghostty, Kitty, Alacritty, WezTerm...).

## Goals

- **Small and simple.** A single entry point, one flat UI layer, no build step. The whole thing is ~20 TypeScript files.
- **Zero runtime dependencies.** No color library, no box-drawing library, no argument parser. Plain ANSI strings and the standard library (via Bun).
- **100% local and private.** No network I/O, no telemetry, no analytics, no tracking. The statusline only reads Claude Code's stdin, your local git state, your transcript file, and a couple of `~/.claude` config files. Nothing ever leaves your machine.

## Quick install

Requires [Bun](https://bun.sh) `>= 1.0`.

```sh
git clone https://github.com/diegorv/koko.claude-statusline.git
cd koko.claude-statusline
bun install
pwd                         # copy this absolute path for the next step
```

Add to `~/.claude/settings.json`:

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

Smoke-test outside Claude Code:

```sh
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":0.05,"total_duration_ms":120000}}' | bun src/index.ts
```

Restart Claude Code (or open a new session). For prerequisites, the absolute-path lookup, the verify step, update instructions, and troubleshooting, see **[docs/INSTALL.md](docs/INSTALL.md)**.

## Documentation

| Doc | Contents |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Full installation: prerequisites, clone, configure, verify, update, troubleshoot |
| [docs/LAYOUT.md](docs/LAYOUT.md) | What the statusline shows — header, body rows, and the full feature list |
| [docs/TUNING.md](docs/TUNING.md) | Environment variables (`CLAUDE_STATUSLINE_RIGHT_MARGIN`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_STATUSLINE_DEBUG_LOG`) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Testing, project structure, dependencies, inspiration & attribution |

## License

MIT
