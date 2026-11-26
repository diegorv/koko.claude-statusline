# 04: Consolidate OpenCode implementation inside the plugin package

**What to build:** OpenCode maintainers find mapping, host access, remote queries, native presentation, and tests together in the plugin package while existing installations and standalone command independence remain intact.

**Files:** src/agents/opencode/, tests/agents/opencode/, integrations/opencode/mapping/, integrations/opencode/host.ts, integrations/opencode/panel.ts, integrations/opencode/workspace.ts, integrations/opencode/tui.tsx, integrations/opencode/tests/, tests/architecture.test.ts, docs/DEVELOPMENT.md

**Blocked by:** 02

**Status:** resolved

## Acceptance criteria

- [x] OpenCode-specific session mapping, context selection, input shapes, and VCS translation belong to the plugin package, with no OpenCode implementation remaining among the stdin adapters.
- [x] Normalization remains isolated from SDK execution, reactive lifecycle, filesystem access, and subprocesses. Host code owns SDK and cache access; data shapes and type-only references do not introduce runtime dependencies.
- [x] Mapping tests move with the implementation and run in the plugin suite. Comparisons against the pinned SDK continue covering compaction, undo, model changes, and context capacity.
- [x] The installable plugin directory and public export continue working without changes to users' configuration. The package remains private and consumes shared code from the checkout.
- [x] Lockfiles, typechecks, and test suites remain separate. The root suite and standalone command smoke tests do not require installing SDK, Solid, or OpenTUI dependencies.
- [x] The recursive import guard still covers moved files. The plugin preserves remote refreshes, cleanup, span colors, pane-header export, and the resize behavior present on the implementation base.
- [x] Development documentation describing OpenCode's location is updated with the move, and both packages' checks pass.

## Scope

This delivery primarily moves files and updates imports, tests, and documentation. Preserve token, MCP, activity, and polling algorithms. Do not introduce a published shared package. Ticket 03 is not a functional prerequisite; if already delivered, preserve its new rendering interface.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/04-consolidate-opencode-integration`: docs: record OpenCode mapping discovery; docs: reserve panel imports for OpenCode consolidation; refactor: consolidate OpenCode mapping and tests in the plugin; docs: review OpenCode integration consolidation. Deliver: Independent Codex review approved without findings. Pure OpenCode mapping and tests moved into plugin; pinned SDK parity, public ./tui export, reactive behavior and eight dependency-free runtime smokes passed. Tests: exit=0 at 2e3048f (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/04-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/04/review.md, by Codex).
