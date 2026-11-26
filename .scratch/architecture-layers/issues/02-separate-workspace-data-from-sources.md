# 02: Separate workspace data from local and remote sources

**What to build:** The panel consumes the same workspace contract whether its data comes from local Git and Worktrunk or the OpenCode server. Each runtime keeps its acquisition model, and users continue seeing the information available from the correct source.

**Files:** src/core/workspace.ts, src/collection/, src/cli/workspace/, src/index.ts, src/agents/opencode/git.ts, src/ui/render.ts, src/ui/components/git-status.ts, integrations/opencode/tui.tsx, integrations/opencode/workspace.ts, integrations/opencode/tests/workspace.test.ts, tests/architecture.test.ts, tests/collection/, tests/cli/workspace/, tests/ui/render.test.ts, tests/ui/components/git-status.test.ts, tests/agents/antigravity/adapter.test.ts, tests/agents/opencode/adapter.test.ts, docs/DEVELOPMENT.md

**Blocked by:** 01

**Status:** resolved

## Acceptance criteria

- [x] Git and Worktrunk contracts belong to the shared model. The renderer, widgets, and remote mapper do not import types from modules that execute local commands.
- [x] A workspace snapshot groups Git and Worktrunk data and is consumed by both rendering paths. Consumers and tests migrate in this ticket, keeping both packages type-correct.
- [x] Local acquisition is organized with the command and encapsulates the rule that Worktrunk is queried only for linked worktrees. Existing values and behavior outside repositories are preserved.
- [x] The plugin continues using server-side VCS, preserves unknown counts as unknown, and never probes the local filesystem to resolve remote directories.
- [x] Switching sessions or directories cannot display workspace data from an earlier request. Cancellation, timeouts, and repository names for sessions opened in subdirectories remain covered.
- [x] Widgets produce equivalent output from equivalent normalized inputs regardless of their source. Both packages' typechecks and test suites pass.

## Scope

Share the result shape while keeping synchronous and reactive acquisition in their respective runtimes. Do not introduce a workspace registry, shared scheduler, or local fallback for OpenCode queries. Update development documentation that names moved collectors or their dependency rules.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/02-separate-workspace-data-from-sources`: docs: record workspace migration discovery; refactor: separate workspace data from local and remote acquisition; docs: record independent workspace contract review. Deliver: Independent Codex review approved without findings. Shared workspace contracts, command-local collectors, and server-only cancellable VCS validated; Solid stale-response probe and eight runtime smoke checks passed. Tests: exit=0 at c8ccf00 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/02-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/02/review.md, by Codex).
