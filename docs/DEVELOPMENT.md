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
| `src/index.ts` | Stable command entry point for Claude and Antigravity |
| `src/cli/` | JSON stdin transport and selection of command-based adapters |
| `src/core/` | Shared session/activity model and the `AgentAdapter<Input>` / `AgentSnapshot` contracts |
| `src/agents/claude/` | Claude payload, local config, transcript, parent process and Caveman integration |
| `src/agents/antigravity/` | Antigravity CLI payload mapping |
| `src/agents/opencode/` | Typed OpenCode data and server VCS mapping; no SDK or UI lifecycle dependency |
| `src/collection/` | Shared local Git and Worktrunk collectors |
| `src/ui/` | Shared ANSI formatters, components, compositor and width-aware layout |
| `src/export/` | Shared pane-header export for Kitty/Herdr |
| `integrations/opencode/` | OpenCode 2.4 TUI entry point, host SDK bridge, native text conversion and lifecycle |
| `tests/` | Core, agent and CLI tests, including dependency-direction checks |
| `integrations/opencode/tests/` | SDK-specific tests, isolated from the standalone runtime |

## Agent adapters

Each adapter returns an `AgentSnapshot`: normalized `SessionData`, optional configuration counts and activity, a permission indicator and optional header annotations. The shared compositor takes that snapshot, plus workspace data. It never reads a provider's files or calls a host SDK.

The dependency direction is:

```text
Claude/Antigravity stdin -> cli -> agents/<agent> -> core snapshot
OpenCode host -> integrations/opencode -> agents/opencode -> core snapshot
core snapshot + workspace data -> ui -> ANSI output / native OpenCode spans
core snapshot -> export -> Kitty/Herdr pane header
```

`core/` imports only `core/`. Shared `ui/`, `collection/` and `export/` modules cannot import an agent or an integration. An agent cannot import another agent. No file under `src/` imports OpenCode, OpenTUI or Solid. `tests/architecture.test.ts` enforces these rules.

The Claude adapter owns all `~/.claude` reads and transcript parsing. Its optional Caveman annotation is formatted inside that agent, so other adapters and shared rendering do not depend on it. The Antigravity adapter uses its documented stdin payload directly. The OpenCode adapter consumes typed plain data from its host bridge; it does not pretend OpenCode has a Claude-style stdin callback.

Adapters choose their layout policy: Claude keeps a 16-column overlay reserve and a frame sized around its header annotations; Antigravity and OpenCode default to no reserve and use the full available width. Environment overrides still win. OpenCode measures its slot's actual width, including changes caused by sidebars and terminal resizing.

Unavailable measurements use `null`, including context percentage when the host cannot establish current usage. Known zero values stay distinct. Quotas carry provider-supplied labels, and reset timestamps use Unix seconds. OpenCode's adapter handles compaction and undo boundaries using a local selector tested against the pinned SDK helper; model changes cannot mix an old usage sample with a different model's capacity.

To add another agent, implement its adapter and a real transport in the appropriate directories. Register it in `src/cli/agents.ts` only if it actually receives stdin payloads. Do not create placeholder adapters or infer one provider's format from another. Codex currently uses its native configurable footer; no custom Codex integration is implemented.

## OpenCode plugin development

OpenCode's dependencies are isolated in `integrations/opencode/package.json` and its own lockfile. The root package remains free of runtime dependencies. The plugin uses SDK 2.4.2 types and the host's OpenTUI/Solid runtime. Its source entry point imports the shared code from this checkout; it is a local integration, not a standalone npm distribution.

```sh
bun install --cwd integrations/opencode --frozen-lockfile
bun run --cwd integrations/opencode typecheck
bun run --cwd integrations/opencode test
```

The plugin mounts above the session composer and before the home footer. `prompt.footer` is a horizontal host layout and is deliberately not used for the multiline panel. The host bridge reads cached reactive session/model/message data; VCS refreshes use asynchronous server calls every five seconds, with timeout and cancellation. Component cleanup removes timers and pending export writes. The plugin never probes a remote directory on the local filesystem.

Native spans are produced from the shared renderer's ANSI colors; this avoids copying layout and formatting logic into a second renderer. SDK types are checked separately so a host SDK upgrade cannot silently alter the standalone command's dependency graph. CI runs both suites as separate jobs.

## Dependencies

The standalone command has zero runtime dependencies and runs on Bun, Node or tsx. It uses `node:` builtins for local filesystem/process access. The OpenCode integration uses runtime APIs provided by its host; the client/schema SDKs are development-only dependencies used to verify its local mapping against the native contracts.

## Inspiration & Attribution

This project was inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud) by Jarrod Watts. No code was copied — everything was written from scratch in Bun + TypeScript, with a different layout (flat per-row output sized to the terminal width) and a different feature set.

The technique for displaying the current `/effort` level — which is not exposed in the Claude Code stdin payload — came from [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine) by Daniel Gomes. Reading `effortLevel` from `~/.claude/settings.json` (with an optional `CLAUDE_CODE_EFFORT_LEVEL` env-var override) is his approach; our implementation is independent and adds project-level cascade plus the full `low`/`medium`/`high`/`xhigh`/`max` enum.
