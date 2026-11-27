VERDICT: APPROVED

## Acceptance criteria

- [met] Context percentage, occupied tokens and capacity map independently from the host; missing data is not replaced with measured zero or cumulative session usage. — `mapCodexSnapshot` independently validates each optional number under `thread.usage.context`. The resource test supplies only cumulative usage, then occupied tokens alone, capacity alone, and three measured zeros. Its returned groups distinguish all four cases.
- [met] Quotas preserve their limit identity and distinguish the five-hour and weekly windows by their reported duration even when the slots are reversed. Other buckets are not silently mislabeled as those windows. — The adapter carries the released `limit_id` and nullable `window_minutes` for each window. Sorting and labeling use duration. The resource test compares swapped slots and retains distinct IDs for two buckets even when their display names coincide. Its 45-minute and unknown-duration windows retain appropriate labels.
- [met] Missing reset times remain unknown. Countdown output is deterministic under a controlled clock and updates through the normal host polling cycle. — The adapter retains null for an unknown reset. Each resource read supplies its current clock to the shared countdown, and the controlled clock test advances it one minute and observes the countdown change from 2m to 1m. An unknown reset adds no countdown.
- [met] Quota values above 100% remain visible numerically while a finite-width bar saturates safely; consumed usage is not mislabeled as remaining allowance. — `filledCells` clamps the shaded cells to the supplied width. `quotaContent` renders the original percentage beside the four-cell meter and labels it used. The `103.5% used` fixture retains that value with all four cells filled.
- [met] Shared formatting renders compact native groups with a predictable field priority and no assumed footer width or full-width background padding. — The backend requests model, effort, context, quota, state and session groups in that order. Shared code owns the percentage thresholds, meter fill, token formatting and countdown. The existing native row uses explicit gap and wrap with the host determining layout.
- [met] Automated resource-read scenarios cover missing/zero values, window order, multiple buckets and thread switches; all packages' required checks pass with existing hosts' metric behavior preserved. — The JSON-RPC metrics tests exercise independent partial observations, multiple buckets, slot reversal, and repeated reads from threads sharing a directory. Root byte-level fixtures and legacy adapter checks cover the existing hosts. All three independent typechecks passed. The three complete suites are the subsequent relay delivery gate.

## Checks

Reviewed `main...0ff8246`, including the declared write scope, released statusline types and shared ANSI calculations. All changed paths are within the ticket reservations. The recorded exit-zero checks below cover sixteen files at this tree. The reviewer independently ran four uncovered adapter and SDK test files, totaling 30 passing tests, and each of the three package typechecks through relay timeout.

- Root relay record: `bun test tests/architecture.test.ts tests/ui/format.test.ts tests/ui/components/rate-limit.test.ts tests/ui/components/token-breakdown.test.ts tests/ui/content.test.ts tests/ui/lines.test.ts tests/ui/panel-compatibility.test.ts tests/ui/render.test.ts tests/export/pane-header.test.ts`.
- OpenCode relay record: `bun test tests/panel.test.ts tests/context.test.ts tests/ansi.test.ts` in `integrations/opencode/`.
- Codex relay record: `bun test tests/metrics.test.ts tests/adapter.test.ts tests/footer.test.ts tests/provider.test.ts` in `integrations/codex/`.
- Additional relay record: `python3 /tmp/koko-standalone-smoke.py .` exited zero. Its bundle and standalone script checks cover Bun and Node 22, 24 and 26.
- Reviewer tests: `tests/agents/claude/adapter.test.ts`, `tests/agents/antigravity/adapter.test.ts`, `integrations/opencode/tests/adapter.test.ts` and `integrations/opencode/tests/sdk-contract.test.ts`.

## Findings

None.
