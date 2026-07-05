# koko.claude-statusline

[![CI](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml/badge.svg)](https://github.com/diegorv/koko.claude-statusline/actions/workflows/ci.yml)
[![Runtimes](https://img.shields.io/badge/runtimes-Bun%20%C2%B7%20Node%20%C2%B7%20tsx-blue)](docs/INSTALL.md#other-runtimes)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-success)](./package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A rich terminal statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Single entry point, zero runtime dependencies, plain TypeScript that runs on Bun, Node, or tsx.

100% AI-generated — code, tests, and docs were written entirely with [Claude Code](https://claude.com/claude-code).

Built and tested on macOS. CI builds and tests pass on Linux, but it has not been manually tested there.

Works on any terminal with true-color support (iTerm2, Ghostty, Kitty, Alacritty, WezTerm...).

## Goals

- **Small and simple.** A single entry point, one flat UI layer, no build step. The whole thing is ~20 TypeScript files.
- **Zero runtime dependencies.** No color library, no box-drawing library, no argument parser. Plain ANSI strings and the standard library (via `node:` modules).
- **100% local and private.** No network I/O, no telemetry, no analytics, no tracking. The statusline only reads Claude Code's stdin, your local git state, your transcript file, and a couple of `~/.claude` config files. Nothing ever leaves your machine.

## Quick install

Recommended runtime: [Bun](https://bun.sh) `>= 1.0` — runs the TypeScript entry point directly, no build step.

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

### Run it with any runtime

The entry point is plain TypeScript with no build step and zero `Bun.*` calls — every system call goes through `node:` modules, and internal imports carry explicit `.ts` extensions. So you pick the runtime: swap the leading `bun` in the `command` above (and in the smoke test) for any of these.

| Runtime | `command` | Notes |
|---|---|---|
| **[Bun](https://bun.sh)** `>= 1.0` _(recommended)_ | `bun /abs/…/src/index.ts` | No extra install; honors the supply-chain cooldown in `bunfig.toml`. |
| **[Node](https://nodejs.org)** `>= 22.18` / `>= 23.6` | `node /abs/…/src/index.ts` | Built-in TypeScript type stripping — no flags, no build. Nothing to install: zero runtime deps. |
| **[tsx](https://tsx.is)** | `tsx /abs/…/src/index.ts` | Any bundler-style TS runner works; tsx is the common one. |

Every option runs the same source — you are never locked in. Full details and version caveats in **[docs/INSTALL.md](docs/INSTALL.md)**.

### Or grab a prebuilt bundle (no clone)

Don't want to clone? Every [release](https://github.com/diegorv/koko.claude-statusline/releases) ships `statusline.mjs` — the whole thing bundled into one self-contained file you run with `node` or `bun`, no repo and no build:

```sh
curl -fL -o ~/.claude-statusline.mjs \
  https://github.com/diegorv/koko.claude-statusline/releases/latest/download/statusline.mjs
```

Point your `command` at it — `node /Users/<you>/.claude-statusline.mjs`. Checksum verification and the full walkthrough are in **[docs/INSTALL.md](docs/INSTALL.md#install-from-a-prebuilt-bundle-no-clone)**.

## Documentation

| Doc | Contents |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Full installation: clone or prebuilt bundle, configure, verify, update, other runtimes, troubleshoot |
| [docs/LAYOUT.md](docs/LAYOUT.md) | What the statusline shows — header, body rows, and the full feature list |
| [docs/TUNING.md](docs/TUNING.md) | Environment variables (`CLAUDE_STATUSLINE_RIGHT_MARGIN`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_STATUSLINE_DEBUG_LOG`) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Testing, project structure, dependencies, inspiration & attribution |

## License

MIT
