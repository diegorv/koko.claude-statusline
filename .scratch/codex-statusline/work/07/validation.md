# Native footer verification, 2026-11-27

The final implementation from issues 01–06 ran on macOS 26.6.2 (25G83), Darwin 25.6.0 arm64, with Bun 1.4.5. The delivery runner records issue 07's complete suites separately in the issue comment and suite log.

## Stock CLI observations

We used the installed stock `codex-cli 0.172.0` and a temporary copy of the official 0.171.0 arm64 macOS executable. The [0.171.0 release archive](https://github.com/openai/codex/releases/tag/rust-v0.171.0) was `codex-aarch64-apple-darwin.tar.gz`, SHA-256 `9414c8c967f110b11e8324c0cfa2b20f012094ef890110a561c92ee535a2681a`, verified against GitHub release metadata before extraction. Both executables reported the expected version with `codex --version`.

The [isolated smoke procedure](../../../../docs/CODEX.md#isolated-smoke-check) reproduces the registration and TUI steps. The runs used separate temporary directories for HOME, CODEX_HOME and the workspace, an environment allowlist (PATH, TERM, LANG and those two home variables), and a placeholder API key supplied to `codex login --with-api-key`. We skipped model turns. The test workspace contained an empty commit on branch `native-smoke`. Its temporary user config selected `gpt-6-sol`, disabled animations and tooltips, and trusted this workspace. From that directory we ran the checkout's `register.ts preview`, `install`, `install`, `doctor`, then `remove` after exiting. The preview preserved the original config bytes. Reinstall preserved the installed bytes. Removal kept the original model, TUI and trust settings as well as the host's new screen-reader-detection setting.

Each child ran under a real controlling PTY. Fullscreen used `codex --no-daemon -C "$workspace"`, inline used `codex --no-daemon --no-alt-screen -C "$workspace"`. We changed its size with TIOCSWINSZ and SIGWINCH, typed slash commands in the TUI and inspected the real terminal output.

| Release and mode | Action | Observed result |
|---|---|---|
| 0.172.0 inline and fullscreen | Resize 120×30 → 42×16 → 120×30, with shortcut hints visible | At wide size, model, ready state, thread ID, branch and short SHA appeared. At narrow size the inline footer retained model/state with an ellipsis. Fullscreen retained model/state and the thread ID with an ellipsis on the next line. Widening restored the branch and SHA in both modes. |
| 0.172.0 fullscreen | Open `/new` and select **Use current Git worktree** | The footer changed from thread `01a21cd5-2567-70d2-9638-447d38caec2e` to `01a21cd5-3cce-72c3-a448-ce36a7a75757`. The new thread displayed starting, then ready. Branch and short SHA still matched the fixture repository. |
| 0.171.0 fullscreen | Repeat the same fresh-thread selection, then redraw at 112×28 | The footer changed from `01a21cd5-8152-7ec0-a5cb-507c2cbbae83` to `01a21cd5-9899-7191-aa3b-1c4c2d92839f`. The wide row displayed GPT-6-Sol, ready, the new ID, `native-smoke` and the fixture SHA. |
| 0.172.0 inline | Suspend the fixture's live Koko process for four seconds, resume it, then reselect Koko in `/statusline` | The TUI displayed `Status line timed out · /statusline`. Its picker discovered `Koko (current)` under `koko-statusline / statusline`. Enter followed by Escape restored the footer for the same thread, branch and SHA. |

For the timeout experiment only, a temporary launcher recorded its own PID and immediately executed the checkout's Bun provider. We verified that the recorded live PID ran the fixture's `server.ts` before using SIGSTOP and SIGCONT. An initial attempt recorded a discovery process that had already exited. It produced no timeout observation. Repeating with the live serving process produced the result above. Numeric usage, account quotas and cost were absent in the idle sessions. Earlier picker selection and effort display are recorded in [the 0.172.0 inline observation](../02/native-smoke.md).

Raw terminal bytes are in the sibling directory `<repo>.worktrees/test-logs/codex-statusline/`. SHA-256 identifies each capture.

| Capture | SHA-256 |
|---|---|
| 07-native-0172-inline.log | faba8116aa904d2288a5353e2c30d3616d6992492aa3391bee3d1b9f18cec6e8 |
| 07-native-0172-fullscreen.log | b62bedadb479c434a6d01660f85a471c48662b75030644faa30945936e16e4ad |
| 07-thread-0172.log | af346e4ffce2a9783cc6d494b0e6ea9e95867ba2cd5cdd5300e767aa7670e429 |
| 07-thread-0171.log | b30dffcf47c5bd7b07069a85993beab045894df10874b645dab9aa82d9688890 |
| 07-timeout-0172.log | fc2bccd6c5beace6a7bac8f59b611ef0fce46b56d9ef7da3c7ea5e54ad30097e |

The live user's config.toml SHA-256 was `1ec29a71ec031424fd5563699436170dc14a4866a2eb763e2a8bdc3463ecd246` before and after the run. The provider was registered only in temporary homes.

## Local automated checks

All three installs used `bun install --frozen-lockfile` in the respective packages. All three `bun run typecheck` commands passed. The following targeted checks ran through the relay bounded runner.

| Directory | Command | Result |
|---|---|---|
| Root | `bun test tests/architecture.test.ts tests/cli.test.ts tests/ui/panel-compatibility.test.ts tests/export/pane-header.test.ts` | 27 passed, including command selection, frame and ANSI snapshots, pane-header schema, locations and permissions. |
| integrations/opencode | `bun test tests/panel.test.ts tests/workspace.test.ts tests/runtime-imports.test.ts` | 7 passed, including resize without extra aggregation/export, server VCS selection, cancellation, and import boundaries. |
| integrations/codex | `bun test tests/provider.test.ts tests/footer.test.ts tests/metrics.test.ts tests/workspace.test.ts` | 7 passed. Resource reads cover malformed/partial input, multiple threads, missing/zero usage, cache categories, reversed quota windows and bounded output. Real provider processes exercise slow and failed Git, selection changes, eviction and process cleanup. |

A relative-import scan covered 106 production/test TypeScript files, excluding dependencies and the architecture test's synthetic invalid imports. Every static relative import checked resolved. Source/test searches found no former `activity.tokenTotals` consumers or imports from the retired collection and adapter paths. The OpenCode package's public export resolved to its checkout `tui.tsx` with Node's `import.meta.resolve("@koko/opencode-statusline/tui")` run from the plugin directory.

From the checkout root, `python3 scripts/smoke-standalone.py bun /path/to/node22 /path/to/node24 /path/to/node26` built the release bundle from an isolated copy of the source. Bun bundled 42 modules into a 53.31 KB ES module. On Bun 1.4.5 and Node 22.23.1, 24.22.2 and 26.13.1, source and bundle emitted identical bytes for the Claude and Antigravity fixtures. All 16 executions passed without installed integration packages.

## CI and remaining manual checks

The [Ubuntu CI run for the complete production implementation](https://github.com/diegorv/koko.claude-statusline/actions/runs/45992932892) passed on commit `03d716c`. It covers the root, OpenCode and Codex package jobs and Node 22/24/26 standalone smokes.

A dedicated account is still needed to observe quota, consumption and USD updates during a real model turn. Slow-Git directory switches were exercised through the stdio provider with fixtures. A simultaneous native workspace switch during a slow query remains a manual check. Linux and Windows interactive rendering, Windows process-tree cancellation, and a remote app-server installation were not exercised here.
