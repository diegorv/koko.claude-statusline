# 04: Consolidate OpenCode implementation inside the plugin package

**What to build:** OpenCode maintainers find mapping, host access, remote queries, native presentation, and tests together in the plugin package while existing installations and standalone command independence remain intact.

**Files:** src/agents/opencode/, tests/agents/opencode/, integrations/opencode/mapping/, integrations/opencode/host.ts, integrations/opencode/workspace.ts, integrations/opencode/tui.tsx, integrations/opencode/tests/, tests/architecture.test.ts, docs/DEVELOPMENT.md

**Blocked by:** 02

**Status:** needs-info

## Acceptance criteria

- [ ] OpenCode-specific session mapping, context selection, input shapes, and VCS translation belong to the plugin package, with no OpenCode implementation remaining among the stdin adapters.
- [ ] Normalization remains isolated from SDK execution, reactive lifecycle, filesystem access, and subprocesses. Host code owns SDK and cache access; data shapes and type-only references do not introduce runtime dependencies.
- [ ] Mapping tests move with the implementation and run in the plugin suite. Comparisons against the pinned SDK continue covering compaction, undo, model changes, and context capacity.
- [ ] The installable plugin directory and public export continue working without changes to users' configuration. The package remains private and consumes shared code from the checkout.
- [ ] Lockfiles, typechecks, and test suites remain separate. The root suite and standalone command smoke tests do not require installing SDK, Solid, or OpenTUI dependencies.
- [ ] The recursive import guard still covers moved files. The plugin preserves remote refreshes, cleanup, span colors, pane-header export, and the resize behavior present on the implementation base.
- [ ] Development documentation describing OpenCode's location is updated with the move, and both packages' checks pass.

## Scope

This delivery primarily moves files and updates imports, tests, and documentation. Preserve token, MCP, activity, and polling algorithms. Do not introduce a published shared package. Ticket 03 is not a functional prerequisite; if already delivered, preserve its new rendering interface.

## Comments

- Draft awaiting approval of ticket granularity and dependencies. After approval, change the status to ready-for-agent.
