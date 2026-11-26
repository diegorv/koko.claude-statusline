# Development

## Testing

Run these from the checkout root for changes to shared or plugin code. The two packages have separate manifests, lockfiles, typechecks and test suites.

```sh
bun install --frozen-lockfile
bun install --cwd integrations/opencode --frozen-lockfile
bun run typecheck
bun test
bun run --cwd integrations/opencode typecheck
bun run --cwd integrations/opencode test
```

For a focused run, use `bun test tests/cli.test.ts` from the root or `bun test tests/panel.test.ts` from the plugin directory. CI also runs the TypeScript command in Node 22, 24 and 26 without installing dependencies.

## Project structure

| Path | Responsibility |
|---|---|
| `src/index.ts`, `src/cli/run.ts` | Public command entry and its runner. The runner validates arguments, selects a stdin adapter, resolves layout, renders, exports and optionally logs diagnostics. |
| Files in `src/cli/`: `adapter.ts`, `agents.ts`, `stdin.ts` | The command's `StdinAdapter` interface, explicit or automatic agent selection, and JSON transport |
| `src/cli/terminal-width.ts`, `src/cli/workspace/` | Local terminal measurement and stabilization, Git collection and Worktrunk lookup for linked worktrees |
| `src/core/` | Normalized session and activity data in `model.ts`, session snapshot and structured header annotations in `snapshot.ts`, and Git/Worktrunk contracts in `workspace.ts` |
| `src/agents/claude/` | Claude payload, configuration, transcript, parent process and Caveman state |
| `src/agents/antigravity/` | Antigravity CLI payload, quotas and reported width |
| `src/ui/` | The public `render(snapshot, workspace, layout)` function. `layout.ts` resolves explicit host options, `rows.ts` composes widgets from `components/`, and `lines.ts` wraps and frames the result. |
| `src/export/pane-header.ts` | Maps normalized session data to the Kitty/Herdr JSON schema and writes it atomically |
| `integrations/opencode/` | `tui.tsx` registers and cleans up the slots. `host.ts` reads SDK caches, `workspace.ts` queries server VCS, `panel.ts` manages reactive rendering and export, and `ansi.ts` converts ANSI to native spans. |
| `integrations/opencode/mapping/` | Input shapes, session normalization, context/model selection and translation of server VCS data |
| `tests/`, `integrations/opencode/tests/` | Command, agent and shared-module regression tests at the root. OpenCode mapping, SDK parity, resource lifecycle and native span tests in the plugin. |

## Agent adapters

The CLI combines a session snapshot, a local workspace snapshot and layout options for each stdin invocation. A stdin adapter returns the session snapshot and a separate opaque key for width stabilization. Claude uses the raw model ID and transcript path during collection and supplies Caveman text and styling as structured annotations. The renderer applies ANSI styling.

The OpenCode plugin maps its cached host data directly to the same session snapshot. Its workspace comes from the connected server. Measuring a slot again changes the layout without rereading messages or scheduling another pane-header write. An initial session snapshot can be exported before the slot is measured.

### Dependency rules

Core imports only its own contracts. Each stdin adapter, local workspace collection, shared UI, exporter and OpenCode mapping can import its own layer and core. The CLI composes stdin adapters, local collection, UI and export. The plugin composes host access, remote acquisition, mapping, UI and export. Both runtime entry points are invoked by their hosts. Other production modules cannot import them. Only UI modules may import the internal row and line compositors.

`tests/architecture.test.ts` recursively checks production TypeScript and TSX, including reexports and literal dynamic imports. Classify new production directories there. Host SDK and reactive dependencies belong in the plugin. Its `tests/runtime-imports.test.ts` checks executed imports against the host package allowlist. Development SDK helpers are available to its tests.

### Where to make a change

- For a new stdin format, add its payload mapping and private sources under `src/agents/<agent>/`, implement the shape in `src/cli/adapter.ts`, and register it in `src/cli/agents.ts`. Exercise both the mapping and command selection. Changes to OpenCode host data belong in `host.ts` and its pure `mapping/` functions.
- For a workspace source, return the Git and Worktrunk fields defined in `src/core/workspace.ts`. Keep local reads under `src/cli/workspace/` and server queries in `integrations/opencode/workspace.ts`. Map unavailable server counts to `null`.
- For a visual change, edit the widget in `src/ui/components/`, row order in `rows.ts`, or wrapping and frames in `lines.ts`. Test `render` with normalized inputs and explicit layout. Plugin-only changes to native colors or attributes belong in `integrations/opencode/ansi.ts`.

See the [layout guide](LAYOUT.md#agent-specific-availability) for the meanings of context usage, quotas and MCP indicators across hosts.

## OpenCode plugin development

OpenCode's dependencies are isolated in `integrations/opencode/package.json` and its own lockfile. The root package remains free of runtime dependencies. The plugin uses SDK 2.4.2 types and the host's OpenTUI/Solid runtime. Its source entry point imports the shared code from this checkout. The plugin is installed by directory path.

The plugin mounts above the session composer and before the home footer. `prompt.footer` is a horizontal host layout and is deliberately not used for the multiline panel. The host bridge reads cached reactive session/model/message data; VCS refreshes use asynchronous server calls every five seconds, with timeout and cancellation. Component cleanup removes timers and pending export writes. The plugin never probes a remote directory on the local filesystem.

Native spans are produced from the shared renderer's ANSI colors; this avoids copying layout and formatting logic into a second renderer. SDK types are checked separately so a host SDK upgrade cannot silently alter the standalone command's dependency graph. CI runs both suites as separate jobs.

## Dependencies

The standalone command has zero runtime dependencies and runs on Bun, Node or tsx. It uses `node:` builtins for local filesystem/process access. The OpenCode integration uses runtime APIs provided by its host; the client/schema SDKs are development-only dependencies used to verify its local mapping against the native contracts.

## Inspiration & Attribution

This project was inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud) by Jarrod Watts. No code was copied — everything was written from scratch in Bun + TypeScript, with a different layout (flat per-row output sized to the terminal width) and a different feature set.

The technique for displaying the current `/effort` level — which is not exposed in the Claude Code stdin payload — came from [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine) by Daniel Gomes. Reading `effortLevel` from `~/.claude/settings.json` (with an optional `CLAUDE_CODE_EFFORT_LEVEL` env-var override) is his approach; our implementation is independent and adds project-level cascade plus the full `low`/`medium`/`high`/`xhigh`/`max` enum.
