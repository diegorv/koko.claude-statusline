# Development

## Testing

Run these from the checkout root for changes to shared or plugin code. The three packages have separate manifests, lockfiles, typechecks and test suites.

```sh
bun install --frozen-lockfile
bun install --cwd integrations/opencode --frozen-lockfile
bun install --cwd integrations/codex --frozen-lockfile
bun run typecheck
bun test
bun run --cwd integrations/opencode typecheck
bun run --cwd integrations/opencode test
bun run --cwd integrations/codex typecheck
bun run --cwd integrations/codex test
```

For a focused run, use `bun test tests/cli.test.ts` from the root or `bun test tests/panel.test.ts` from the plugin directory. CI also runs the TypeScript command in Node 22, 24 and 26 without installing dependencies.

To compare the standalone TypeScript entry with a freshly built release bundle, run `python3 scripts/smoke-standalone.py bun /path/to/node22 /path/to/node24 /path/to/node26`. The script copies only standalone sources to a temporary directory, checks both stdin hosts and compares output bytes on each supplied runtime.

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
| `src/ui/content/` | Pure groups of text and styles for model, effort, context, quota, consumption, session and Git details. The panel serializes them to ANSI. Codex encodes them as native text. |
| `src/workspace/` | Shared Git command arguments and pure Git/Worktrunk parsers used by the two local collectors. |
| `src/export/pane-header.ts` | Maps normalized session data to the Kitty/Herdr JSON schema and writes it atomically |
| `integrations/opencode/` | `tui.tsx` registers and cleans up the slots. `host.ts` reads SDK caches, `workspace.ts` queries server VCS, `panel.ts` manages reactive rendering and export, and `ansi.ts` converts ANSI to native spans. |
| `integrations/opencode/mapping/` | Input shapes, session normalization, context/model selection and translation of server VCS data |
| `integrations/codex/` | `server.ts` serves MCP over stdio. `protocol.ts` dispatches resource reads, `adapter.ts` maps each snapshot, `footer.ts` encodes structured UI and `workspace.ts` schedules Git. The separate `register.ts` command manages the user configuration. |
| `integrations/codex/tests/` | Stdio lifecycle, UI bounds, metrics, workspace isolation and registration recovery. |
| `tests/`, `integrations/opencode/tests/` | Command, agent and shared-module regression tests at the root. OpenCode mapping, SDK parity, resource lifecycle and native span tests in the plugin. |

## Agent adapters

The CLI combines a session snapshot, a local workspace snapshot and layout options for each stdin invocation. A stdin adapter returns the session snapshot and a separate opaque key for width stabilization. Claude uses the raw model ID and transcript path during collection and supplies Caveman text and styling as structured annotations. The renderer applies ANSI styling.

The OpenCode plugin maps its cached host data directly to the same session snapshot. Its workspace comes from the connected server. Measuring a slot again changes the layout without rereading messages or scheduling another pane-header write. An initial session snapshot can be exported before the slot is measured.

Codex keeps a provider process alive across reads. Its adapter uses the snapshot supplied with each read. Only the workspace cache survives between reads, keyed by the supplied local directory. Session token totals live on `AgentSnapshot`, independently of activity.

### Dependency rules

Core imports only its own contracts. Each stdin adapter, local workspace collection, shared UI, exporter and OpenCode mapping can import its own layer and core. The CLI composes stdin adapters, local collection, UI and export. The plugin composes host access, remote acquisition, mapping, UI and export. Shared content and workspace parsers depend only on core and their own layer. The command collector and Codex may import the workspace parsers. Codex imports core and content for presentation and owns its transport and UI types. Each runtime entry point is invoked by its host. Other production modules cannot import them. Only UI modules may import the internal row and line compositors.

`tests/architecture.test.ts` recursively checks production TypeScript and TSX, including reexports and literal dynamic imports. Classify new production directories there. Host SDK and reactive dependencies belong in the plugin. Its `tests/runtime-imports.test.ts` checks executed imports against the host package allowlist. Development SDK helpers are available to its tests.

### Where to make a change

- For a new stdin format, add its payload mapping and private sources under `src/agents/<agent>/`, implement the shape in `src/cli/adapter.ts`, and register it in `src/cli/agents.ts`. Exercise both the mapping and command selection. Changes to OpenCode host data belong in `host.ts` and its pure `mapping/` functions.
- For a workspace source, return the Git and Worktrunk fields defined in `src/core/workspace.ts`. Keep command reads under `src/cli/workspace/`, background provider reads in `integrations/codex/workspace.ts`, and server queries in `integrations/opencode/workspace.ts`. Share local parsers under `src/workspace/`. Map unavailable server counts to `null`.
- For a shared label or metric, edit its pure builder in `src/ui/content/`. For a panel-specific visual change, edit the widget in `src/ui/components/`, row order in `rows.ts`, or wrapping and frames in `lines.ts`. Test `render` with normalized inputs and explicit layout. Plugin-only changes to native colors or attributes belong in `integrations/opencode/ansi.ts`.

See the [layout guide](LAYOUT.md#agent-specific-availability) for the meanings of context usage, quotas and MCP indicators across hosts.

## OpenCode plugin development

OpenCode's dependencies are isolated in `integrations/opencode/package.json` and its own lockfile. The root package remains free of runtime dependencies. The plugin uses SDK 2.4.2 types and the host's OpenTUI/Solid runtime. Its source entry point imports the shared code from this checkout. The plugin is installed by directory path.

The plugin mounts above the session composer and before the home footer. `prompt.footer` is a horizontal host layout and is deliberately not used for the multiline panel. The host bridge reads cached reactive session/model/message data; VCS refreshes use asynchronous server calls every five seconds, with timeout and cancellation. Component cleanup removes timers and pending export writes. The plugin never probes a remote directory on the local filesystem.

Native spans are produced from the shared renderer's ANSI colors; this avoids copying layout and formatting logic into a second renderer. SDK types are checked separately so a host SDK upgrade cannot silently alter the standalone command's dependency graph. CI checks the root package and each integration in separate jobs.

## Dependencies

The standalone command has zero runtime dependencies and runs on Bun, Node or tsx. It uses `node:` builtins for local filesystem/process access. The OpenCode integration uses runtime APIs provided by its host; the client/schema SDKs are development-only dependencies used to verify its local mapping against the native contracts.

Only the Codex registration command loads the TOML parser from the Codex package. The persistent server and standalone command run without that dependency.

## Inspiration & Attribution

This project was inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud) by Jarrod Watts. No code was copied — everything was written from scratch in Bun + TypeScript, with a different layout (flat per-row output sized to the terminal width) and a different feature set.

The technique for displaying the current `/effort` level — which is not exposed in the Claude Code stdin payload — came from [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine) by Daniel Gomes. Reading `effortLevel` from `~/.claude/settings.json` (with an optional `CLAUDE_CODE_EFFORT_LEVEL` env-var override) is his approach; our implementation is independent and adds project-level cascade plus the full `low`/`medium`/`high`/`xhigh`/`max` enum.
