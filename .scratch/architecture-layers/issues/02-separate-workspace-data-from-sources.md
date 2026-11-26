# 02: Separate workspace data from local and remote sources

**What to build:** The panel consumes the same workspace contract whether its data comes from local Git and Worktrunk or the OpenCode server. Each runtime keeps its acquisition model, and users continue seeing the information available from the correct source.

**Files:** src/core/workspace.ts, src/collection/, src/cli/workspace/, src/index.ts, src/agents/opencode/git.ts, src/ui/render.ts, src/ui/components/git-status.ts, integrations/opencode/tui.tsx, integrations/opencode/workspace.ts, integrations/opencode/tests/workspace.test.ts, tests/architecture.test.ts, tests/collection/, tests/cli/workspace/, tests/ui/render.test.ts, tests/ui/components/git-status.test.ts, tests/agents/antigravity/adapter.test.ts, tests/agents/opencode/adapter.test.ts, docs/DEVELOPMENT.md

**Blocked by:** 01

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Git and Worktrunk contracts belong to the shared model. The renderer, widgets, and remote mapper do not import types from modules that execute local commands.
- [ ] A workspace snapshot groups Git and Worktrunk data and is consumed by both rendering paths. Consumers and tests migrate in this ticket, keeping both packages type-correct.
- [ ] Local acquisition is organized with the command and encapsulates the rule that Worktrunk is queried only for linked worktrees. Existing values and behavior outside repositories are preserved.
- [ ] The plugin continues using server-side VCS, preserves unknown counts as unknown, and never probes the local filesystem to resolve remote directories.
- [ ] Switching sessions or directories cannot display workspace data from an earlier request. Cancellation, timeouts, and repository names for sessions opened in subdirectories remain covered.
- [ ] Widgets produce equivalent output from equivalent normalized inputs regardless of their source. Both packages' typechecks and test suites pass.

## Scope

Share the result shape while keeping synchronous and reactive acquisition in their respective runtimes. Do not introduce a workspace registry, shared scheduler, or local fallback for OpenCode queries. Update development documentation that names moved collectors or their dependency rules.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.
