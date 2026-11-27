# 03: Show current context, quotas and reset countdowns

**What to build:** The Codex footer shows the displayed thread's context and available account usage windows with Koko's indicators and reset countdowns.

**Files:** integrations/codex/, src/core/model.ts, src/ui/, tests/ui/, tests/architecture.test.ts, .scratch/codex-statusline/work/03/

**Blocked by:** 02

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] Context percentage, occupied tokens and capacity map independently from the host; missing data is not replaced with measured zero or cumulative session usage.
- [x] Quotas preserve their limit identity and distinguish the five-hour and weekly windows by their reported duration even when the slots are reversed. Other buckets are not silently mislabeled as those windows.
- [x] Missing reset times remain unknown. Countdown output is deterministic under a controlled clock and updates through the normal host polling cycle.
- [x] Quota values above 100% remain visible numerically while a finite-width bar saturates safely; consumed usage is not mislabeled as remaining allowance.
- [x] Shared formatting renders compact native groups with a predictable field priority and no assumed footer width or full-width background padding.
- [x] Automated resource-read scenarios cover missing/zero values, window order, multiple buckets and thread switches; all packages' required checks pass with existing hosts' metric behavior preserved.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/03-show-context-quotas-and-resets`: docs: record context and quota discovery; feat: show Codex context and named quota windows; docs: review Codex context and quota windows. Deliver: Independent native Codex review approved without findings; independent context and identified quota windows with deterministic resets verified; all three packages and standalone compatibility passed. Tests: exit=0 at 565a940 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/03-deliver.log). Reviews: round 1: APPROVED (.scratch/codex-statusline/work/03/review.md, native Codex reviewer).
