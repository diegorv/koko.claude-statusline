# 03: Show current context, quotas and reset countdowns

**What to build:** The Codex footer shows the displayed thread's context and available account usage windows with Koko's indicators and reset countdowns.

**Files:** integrations/codex/, src/core/model.ts, src/ui/, tests/ui/, tests/architecture.test.ts, .scratch/codex-statusline/work/03/

**Blocked by:** 02

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] Context percentage, occupied tokens and capacity map independently from the host; missing data is not replaced with measured zero or cumulative session usage.
- [ ] Quotas preserve their limit identity and distinguish the five-hour and weekly windows by their reported duration even when the slots are reversed. Other buckets are not silently mislabeled as those windows.
- [ ] Missing reset times remain unknown. Countdown output is deterministic under a controlled clock and updates through the normal host polling cycle.
- [ ] Quota values above 100% remain visible numerically while a finite-width bar saturates safely; consumed usage is not mislabeled as remaining allowance.
- [ ] Shared formatting renders compact native groups with a predictable field priority and no assumed footer width or full-width background padding.
- [ ] Automated resource-read scenarios cover missing/zero values, window order, multiple buckets and thread switches; all packages' required checks pass with existing hosts' metric behavior preserved.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
