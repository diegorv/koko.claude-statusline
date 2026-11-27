VERDICT: APPROVED

## Acceptance criteria

- [met] Normalized session token totals no longer require tool or transcript activity. Existing adapters and consumers migrate in the same delivery without temporary competing sources of truth. — The four adapters supply the nullable AgentSnapshot.tokenTotals field. The former activity field is removed. Searching all TypeScript call sites showed the transcript parser returns its single accumulator alongside activity and the CLI panel and native footer read the new field.
- [met] Codex's uncached input and cache-read/write counts map without double counting cache-inclusive total input. Session totals remain distinct from current-context occupancy. — Compared the released TokenUsage and Context definitions with the mapping. The provider fixture sends 1,000 inclusive input, 100 uncached, 800 cache reads, 100 cache writes and 7 occupied tokens. The response asserts each value in its respective group.
- [met] Missing usage and cost remain absent, while reported zero retains its meaning. Credits are not treated as USD and no pricing estimator is introduced. — My independent probe exercised all 16 combinations of missing and reported-zero token categories with credits and a fixed context observation. The adapter preserved each zero, returned null for absent categories and omitted USD in all cases. The stdio regression verifies the zero USD display and positive reported cost.
- [met] The native footer renders the reported consumption through the shared presentation contract without manufacturing tools, assistant timing samples or output-speed measurements. — The native renderer serializes tokenContent and costContent groups. The Codex mapper leaves activity and duration null, including when counters are available. Speed still consumes actual assistant samples on the panel path.
- [met] Existing host token calculations and output remain equivalent under controlled regression fixtures; the exporter keeps its existing schema and timing. — Claude accumulates once per request and preserves its assistant samples. OpenCode adds reasoning to output as before. Antigravity retains the legacy panel display for partial counters. The record covers deduplication, panel bytes, the shared cache marker, pane-header export and the OpenCode resize scenario. The exporter and its call sites have no diff.
- [met] End-to-end resource tests cover partial usage, cache-inclusive totals, zero cost and absent activity; all packages' required checks pass. — The provider test keeps a real stdio process open across the four consumption scenarios and asserts the group text returned for each resources/read. All three independent typechecks passed. Targeted tests and the standalone matrix passed on this tree. The complete suites are the delivery gate.

## Checks

Reviewed main...9b3783e on the declared issue branch. All changed paths are reserved. Both independent package mappings and the shared rendering changes are covered by the scoped checks below.

Eighteen files passed at this tree, relay records:

- Root: `bun test tests/architecture.test.ts tests/agents/claude/transcript.test.ts tests/agents/claude/adapter.test.ts tests/agents/antigravity/adapter.test.ts tests/ui/components/token-breakdown.test.ts tests/ui/components/output-speed.test.ts tests/ui/render.test.ts tests/ui/content.test.ts tests/ui/panel-compatibility.test.ts tests/cli.test.ts tests/export/pane-header.test.ts`.
- OpenCode: `bun test tests/adapter.test.ts tests/sdk-contract.test.ts tests/panel.test.ts` in integrations/opencode.
- Codex: `bun test tests/adapter.test.ts tests/provider.test.ts tests/metrics.test.ts tests/footer.test.ts` in integrations/codex.
- Standalone smoke: `python3 /tmp/koko-standalone-smoke.py .` exited zero for both stdin hosts, source and generated bundle under Bun and Node 22, 24 and 26.

I ran the root, OpenCode and Codex typechecks under the bounded runner. I ran three additional test files covering formatting and panel lines (57 tests) and OpenCode context selection (3 tests). The independent 16-case partial-counter probe also passed.

## Findings

None.
