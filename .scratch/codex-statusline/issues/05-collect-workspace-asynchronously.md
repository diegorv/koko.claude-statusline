# 05: Enrich the footer with asynchronous workspace details

**What to build:** Git information appears for an accessible local workspace while session data remains responsive during cold, slow or failing workspace queries.

**Files:** src/cli/, src/workspace/, src/ui/, tests/ui/, src/core/workspace.ts, tests/cli/workspace/, tests/workspace/, tests/architecture.test.ts, integrations/codex/, integrations/opencode/tests/, .scratch/codex-statusline/work/05/

**Blocked by:** 02

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] The provider obtains normalized workspace data only on the host that can access the supplied cwd. It never substitutes the provider process's current repository for an unavailable or remote workspace.
- [x] Git and any supported linked-worktree enrichment run outside the resource-read response path, with bounded work, a bounded cache and at most one refresh in flight per workspace key.
- [x] Cold-cache and failed-query reads still return useful session content. Cached results are reused only for the matching workspace and are refreshed under an explicit freshness policy.
- [x] Switching directory or thread while a query is pending cannot publish a previous selection's workspace into the new view; process shutdown cleans up outstanding work.
- [x] Sharing acquisition with the command respects the architecture rules and preserves the existing local collector's values and linked-worktree policy. OpenCode remains server-only for VCS.
- [x] Slow/failing Git, non-repositories, linked worktrees, eviction and selection races are tested through the actual provider path; all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/05-collect-workspace-asynchronously`: docs: record asynchronous workspace discovery; docs: reserve shared workspace presentation for Codex issue 05; refactor: share Git and Worktrunk query parsing; refactor: share styled Git workspace content; feat: refresh Codex workspace details asynchronously; docs: review asynchronous Codex workspace collection. Deliver: Independent native Codex review approved; shared parsers and Git presentation preserve command behavior; actual stdio cache/race/timeout/child-cleanup tests and standalone smokes passed; Windows cancellation remains unexercised. Tests: exit=0 at 60103f5 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/05-deliver.log). Reviews: round 1: APPROVED (.scratch/codex-statusline/work/05/review.md, native Codex reviewer).
