# Native Codex statusline integration

**Status:** proposed — breakdown awaiting approval through `/to-tickets`.

## Objective

Display a compact Koko footer inside the official Codex CLI through its experimental stdio MCP statusline provider. Preserve the existing Claude, Antigravity and OpenCode installations and output.

The source investigation is [research.md](research.md). The proposed implementation slices and acceptance criteria are in [breakdown.md](breakdown.md). These documents are proposals, not authorization to implement or modify the user's Codex configuration.

## Product behavior

- The selected provider follows the thread currently displayed by Codex. Its initial view shows model, effort, run state and available session identity.
- Context usage, account quotas and reset countdowns update from the snapshot supplied by Codex. Missing observations remain unknown; reported zero remains distinct.
- Session input/output/cache totals and host-reported USD cost remain distinct from current context occupancy. No pricing calculation or currency conversion is introduced.
- Git details enrich the footer asynchronously when the provider can access the actual workspace on its host. A cold cache or failed query does not prevent session information from rendering.
- The footer uses native structured text, explicit gaps and host wrapping. Important fields precede optional details so clipping degrades predictably.
- Installation and removal preserve unrelated user settings and allow restoration of the previous provider when it is still safe to do so.

## Architecture decisions

The Codex provider belongs to `integrations/codex/`, with its own persistent process and package checks. It does not become another one-shot stdin adapter or require the standalone command to install integration dependencies.

Introduce a small shared presentation contract for semantic text/style groups. Keep Codex's `UiTree` types in its integration. Existing consumers retain the public ANSI rendering interface and their current layout policies. Avoid introducing a general component framework or duplicating widget calculations in the Codex backend.

Add Codex to the normalized host identity when the native provider is introduced. Move session token totals out of their exclusive ownership by activity data when implementing the consumption slice; migrate all existing consumers in that delivery. Do not manufacture empty tool histories to carry reported usage.

Shared core remains independent of integration SDKs and process I/O. When local workspace acquisition gains a second consumer, introduce a named acquisition module or shared pure parser at that real seam. Classify every new production directory in the architecture guard. The OpenCode integration continues obtaining VCS from its server.

## Released protocol and runtime constraints

Target the published 0.171.0 and 0.172.0 provider contracts. The local runtime observed during research was 0.172.0. Do not use newer `main`-only tree elements as a baseline capability.

- Discover the provider through a stable MCP server/tool identity and exactly one advertised statusline resource.
- Accept the displayed thread snapshot on resource reads and return exactly one JSON text resource at the requested URI. Keep protocol stdout separate from diagnostics.
- Support the released row/text/link and text-style vocabulary. Apply the upstream JSON, text, node-count and depth limits before returning content.
- Resource reads have a one-second host deadline; successful reads are followed by a one-second wait. Optional work must stay outside the response path. Provider lookup's separate five-second deadline does not increase the render budget.
- The snapshot does not expose usable footer dimensions. Do not infer them from console width, add padding to fill the terminal, or promise full-panel frame parity. Height depends on display mode, hints and available space.
- Register the provider at user level on the connected app-server host. Project-level MCP or plugin overrides may disqualify it. Stable server/tool names are the persisted identity.
- Keep thread-specific facts isolated by thread identity and workspace data isolated by the actual accessible cwd/worktree. The newest local log is not evidence of the displayed session.

## Scope and exclusions

The first release includes native model/state/context/quota/consumption display, asynchronous local Git enrichment, reversible registration and verification. Host-reported cost is optional. Credits are not converted to USD. Approval and permission fields must not be conflated with Claude's skip-permissions flag; extending the view to these fields requires explicit semantic mapping.

Rollout parsing, tools, subagents, plans, output-speed inference, historical daily cost, pricing estimates, tmux launchers, patched Codex binaries and provider chaining are outside this breakdown. Codex pane-header export is also deferred: the existing hosts' export schema and timing remain compatibility obligations.

## Validation and delivery

Every production slice lands with green checks. The first provider slice adds its package to CI and relay validation immediately; the final documentation slice is not responsible for discovering an unvalidated package.

Use targeted tests during implementation, then the configured complete delivery suite. Once Codex exists, validation covers the root package and both integrations, with frozen lockfiles wherever a package has dependencies. Preserve the standalone Bun/Node smoke matrix and locally generated bundle checks.

Use fixed clocks and explicit environments for byte-level regressions. Cover missing fields versus zero, quota windows in either slot, usage over 100%, cache-inclusive token totals, changing threads in one cwd, directory switches during slow Git, bounded failures, malformed protocol requests and UI limits.

Native CLI validation must distinguish executable harness results from actual interactive observations. Use an isolated configuration and explicit test evidence; do not overwrite the user's live setup or label a fixture-only check as an interactive test. Record unavailable live-host checks as release limitations, never as passing tests. The final record names the exact releases, platforms and display modes exercised.

## Dependency graph

01 has no blockers. 02 depends on 01. 03, 04, 05 and 06 each depend only on 02. 07 depends on 03, 04, 05 and 06. Shared file reservations may require serial execution without adding functional blocking edges.

## Planning state

The user requested `/to-tickets`. Approval of this breakdown has not yet been recorded. After approval, publish one English issue file per slice under `issues/`, using the repository's tracker and triage conventions. Do not create an implementation ledger or claim work during ticket drafting.
