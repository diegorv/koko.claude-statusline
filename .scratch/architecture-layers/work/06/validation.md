# Final architecture verification

The checks below ran on macOS against the integrated code from issues 01–05. Issue 06 changes documentation and verification records. The review and ship steps record their own results.

## Public installation paths

Before installing either package, copied `src/` and its root `package.json` into a temporary checkout. Built the same artifact as the release workflow, then copied only the resulting ES module to a second temporary directory. Both directories had no installed packages.

```sh
mkdir -p dist
bun build src/index.ts --target=node --outfile=dist/statusline.mjs
```

Bun bundled 36 modules into `statusline.mjs` (49.66 KB). For each runtime below, the probe passed the CI payloads on stdin to four invocations from the isolated directory:

```sh
"$runtime" "$checkout/src/index.ts"                       # Claude
"$runtime" "$checkout/src/index.ts" --agent antigravity   # Antigravity
"$runtime" "$standalone/statusline.mjs"                   # Claude
"$runtime" "$standalone/statusline.mjs" --agent antigravity
```

The Claude payload contained `Opus 4.7 (1M context)`, 42% context and $1.50 cost over one minute. The Antigravity payload contained `Gemini`, estimated $0.42 cost and 120 columns. The probe set `COLUMNS=120`, used a temporary home/config location and left debug/export disabled. It asserted exit zero and the correct model name for both hosts, the estimated cost label `~$0.42` for Antigravity, and exact stdout equality between source and bundle for each host.

| Runtime | Direct TypeScript | Isolated bundle | Source vs. bundle |
|---|---|---|---|
| Bun 1.4.5 | Both passed | Both passed | Identical bytes |
| Node 22.23.1 | Both passed | Both passed | Identical bytes |
| Node 24.22.2 | Both passed | Both passed | Identical bytes |
| Node 26.13.1 | Both passed | Both passed | Identical bytes |

All 16 invocations passed. From `integrations/opencode/`, Node's `import.meta.resolve("@koko/opencode-statusline/tui")` resolved to the checkout's `tui.tsx`. The plugin's private package and public export still support the installation path in the guide.

## Package checks and module boundaries

The frozen installs passed for both packages. Both `bun run typecheck` and `bun run --cwd integrations/opencode typecheck` passed. Targeted commands used relay's bounded runner.

| Working directory | Command | Result |
|---|---|---|
| Repository root | `bun test tests/architecture.test.ts tests/cli.test.ts tests/cli/agents.test.ts tests/ui/lines.test.ts tests/export/pane-header.test.ts` | 50 passed, 0 failed |
| `integrations/opencode/` | `bun test tests/panel.test.ts tests/workspace.test.ts tests/sdk-contract.test.ts tests/adapter.test.ts tests/runtime-imports.test.ts` | 16 passed, 0 failed |

These cases exercise stdin selection and error handling, margin defaults and aliases, width diagnostics, ANSI wrapping, pane-header schema/permissions, SDK mapping and remote workspace selection. The client Solid runtime test checks that a resize leaves message aggregation and export counts unchanged and that session export precedes the first measurement. The final ship runner executes both complete suites with the worktree's current configuration.

A separate relative-import scan found no missing targets in the production and test source trees (the architecture test includes synthetic negative examples). The former `src/collection/`, `src/agents/opencode/`, `src/core/adapter.ts`, `src/ui/terminal.ts` and their former collector/OpenCode test directories are absent. Shared UI and pane-header test fixtures use normalized data and have no import from `src/agents/`.

## Live-host limits

Verification exercised the public command, locally built bundle, package export, pinned SDK, server test doubles and client Solid runtime. No interactive Claude Code, Antigravity CLI or OpenCode TUI session was launched, and no live remote OpenCode server was contacted. Font appearance and installation into a user's actual terminal configuration were outside these checks.
