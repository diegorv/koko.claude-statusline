# 05: Enrich the footer with asynchronous workspace details

**What to build:** Git information appears for an accessible local workspace while session data remains responsive during cold, slow or failing workspace queries.

**Files:** src/cli/, src/workspace/, src/ui/, tests/ui/, src/core/workspace.ts, tests/cli/workspace/, tests/workspace/, tests/architecture.test.ts, integrations/codex/, integrations/opencode/tests/, .scratch/codex-statusline/work/05/

**Blocked by:** 02

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] The provider obtains normalized workspace data only on the host that can access the supplied cwd. It never substitutes the provider process's current repository for an unavailable or remote workspace.
- [ ] Git and any supported linked-worktree enrichment run outside the resource-read response path, with bounded work, a bounded cache and at most one refresh in flight per workspace key.
- [ ] Cold-cache and failed-query reads still return useful session content. Cached results are reused only for the matching workspace and are refreshed under an explicit freshness policy.
- [ ] Switching directory or thread while a query is pending cannot publish a previous selection's workspace into the new view; process shutdown cleans up outstanding work.
- [ ] Sharing acquisition with the command respects the architecture rules and preserves the existing local collector's values and linked-worktree policy. OpenCode remains server-only for VCS.
- [ ] Slow/failing Git, non-repositories, linked worktrees, eviction and selection races are tested through the actual provider path; all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
