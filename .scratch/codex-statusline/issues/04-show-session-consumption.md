# 04: Show session consumption without conflating it with context

**What to build:** The Codex footer can show reported input, output and cache totals, plus available host-reported USD cost, even when no tool activity is supplied.

**Files:** src/core/, src/agents/, src/cli/, src/ui/, src/export/, tests/, integrations/opencode/, integrations/codex/, .scratch/codex-statusline/work/04/

**Blocked by:** 02

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] Normalized session token totals no longer require tool or transcript activity. Existing adapters and consumers migrate in the same delivery without temporary competing sources of truth.
- [x] Codex's uncached input and cache-read/write counts map without double counting cache-inclusive total input. Session totals remain distinct from current-context occupancy.
- [x] Missing usage and cost remain absent, while reported zero retains its meaning. Credits are not treated as USD and no pricing estimator is introduced.
- [x] The native footer renders the reported consumption through the shared presentation contract without manufacturing tools, assistant timing samples or output-speed measurements.
- [x] Existing host token calculations and output remain equivalent under controlled regression fixtures; the exporter keeps its existing schema and timing.
- [x] End-to-end resource tests cover partial usage, cache-inclusive totals, zero cost and absent activity; all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/04-show-session-consumption`: docs: record session consumption discovery; feat: report session consumption independently of activity; docs: record independent session consumption review. Deliver: Independent native Codex review approved without findings; all hosts migrated to independent session totals; missing/zero/cache/USD scenarios and standalone compatibility passed. Tests: exit=0 at 470ea34 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/04-deliver.log). Reviews: round 1: APPROVED (.scratch/codex-statusline/work/04/review.md, native Codex reviewer).
