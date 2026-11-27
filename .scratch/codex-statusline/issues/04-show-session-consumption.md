# 04: Show session consumption without conflating it with context

**What to build:** The Codex footer can show reported input, output and cache totals, plus available host-reported USD cost, even when no tool activity is supplied.

**Blocked by:** 02

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] Normalized session token totals no longer require tool or transcript activity. Existing adapters and consumers migrate in the same delivery without temporary competing sources of truth.
- [ ] Codex's uncached input and cache-read/write counts map without double counting cache-inclusive total input. Session totals remain distinct from current-context occupancy.
- [ ] Missing usage and cost remain absent, while reported zero retains its meaning. Credits are not treated as USD and no pricing estimator is introduced.
- [ ] The native footer renders the reported consumption through the shared presentation contract without manufacturing tools, assistant timing samples or output-speed measurements.
- [ ] Existing host token calculations and output remain equivalent under controlled regression fixtures; the exporter keeps its existing schema and timing.
- [ ] End-to-end resource tests cover partial usage, cache-inclusive totals, zero cost and absent activity; all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
