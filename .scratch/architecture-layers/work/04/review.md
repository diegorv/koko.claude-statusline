VERDICT: APPROVED

- [met] OpenCode-specific session mapping, context selection, input shapes, and VCS translation belong to the plugin package, with no OpenCode implementation remaining among the stdin adapters. — The diff moves adapter.ts, input.ts and git.ts to integrations/opencode/mapping/. Its context.ts joins the previous selector with the two model-selection functions from host.ts. Only Claude and Antigravity remain under src/agents/.
- [met] Normalization remains isolated from SDK execution, reactive lifecycle, filesystem access, and subprocesses. Host code owns SDK and cache access; data shapes and type-only references do not introduce runtime dependencies. — mapping/context.ts accepts plain message and model values. The moved adapter and VCS mapper have only type imports. host.ts still owns all session, model, message and MCP cache reads. I compared the token, activity, MCP, context and VCS function bodies with main and found no calculation changes.
- [met] Mapping tests move with the implementation and run in the plugin suite. Comparisons against the pinned SDK continue covering compaction, undo, model changes, and context capacity. — The adapter and context tests now import the local mapping modules. sdk-contract.test.ts compares selected usage to the 2.4.2 SDK helper across undo and compaction and exercises two models with different capacities before and after an undo. All three files passed at this tree in the relay record below.
- [met] The installable plugin directory and public export continue working without changes to users' configuration. The package remains private and consumes shared code from the checkout. — The manifest and tui.tsx have no diff from main. The relay's package-resolution probe at this tree verified the private flag and resolved the package's own /tui subpath to tui.tsx. panel.ts imports the checkout's shared layout and renderer.
- [met] Lockfiles, typechecks, and test suites remain separate. The root suite and standalone command smoke tests do not require installing SDK, Solid, or OpenTUI dependencies. — Both manifests and lockfiles are unchanged. The root bunfig selects ./tests, and the plugin package runs its own tests. I ran both typechecks and exercised Claude and Antigravity with Bun and Node 22/24/26 in a temporary copy containing only src and package.json. All eight smoke checks passed.
- [met] The recursive import guard still covers moved files. The plugin preserves remote refreshes, cleanup, span colors, pane-header export, and the resize behavior present on the implementation base. — The architecture test classifies the mapping directory and rejects host, Solid, filesystem and SDK imports there. The plugin's recursive runtime scan passed. The TUI lifecycle and ANSI implementation have no diff. panel.ts and workspace.ts change only their mapping imports. The panel and workspace tests passed at this tree, and my ANSI test passed.
- [met] Development documentation describing OpenCode's location is updated with the move, and both packages' checks pass. — docs/DEVELOPMENT.md maps the host bridge, mapping modules and plugin tests to the new paths. Both typechecks and targeted tests passed. The relay ship gate runs both complete suites before delivery.

## Verification

I reviewed main...01ed318. The panel import was reserved in d10902a before its edit. All changed files are within the issue's declaration or its workflow records.

I ran three test files. From the root, `bun test tests/architecture.test.ts tests/cli.test.ts` passed 11 tests. In integrations/opencode, `bun test tests/ansi.test.ts` passed one. I also ran `bun run typecheck` and `bun run --cwd integrations/opencode typecheck`, both with exit zero.

Six additional plugin test files passed at this tree, relay record from integrations/opencode: `bun test tests/adapter.test.ts tests/context.test.ts tests/sdk-contract.test.ts tests/panel.test.ts tests/workspace.test.ts tests/runtime-imports.test.ts`. I used the successful record from the plugin directory. The earlier invocation from the root exited 1 and provided no passing evidence.

## Findings

None.
