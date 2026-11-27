VERDICT: APPROVED

## Acceptance criteria

- [met] A separate integration entry point implements initialization, discovery and resource reads using the released provider contract and stable server/tool/resource identities. — Compared protocol.ts with the published 0.171 starter and the 0.171/0.172 declarations. The long-lived server advertises one entrypoint for koko-statusline/statusline and returns exactly one application/json text resource at ui://koko-statusline/footer. The discovery fixture and the real picker exercise those identities.
- [met] A pure adapter maps the supplied thread identity, model, effort, cwd and state into shared data; absent fields are handled without inventing activity or displaying another thread's values. — mapCodexSnapshot builds new normalized data from each request, picks display name or model ID, carries known reasoning levels, preserves cwd and session identity, and leaves activity absent. Adapter and open-stream fixtures cover missing and changed thread data.
- [met] The provider produces supported structured rows and text from shared content, uses explicit gaps and host wrapping, and does not forward ANSI escapes or probe terminal width. — footer.ts translates shared model, effort, state and session spans into a wrapping row with gap 1. Only the integration emits Codex elements. Shared text sanitization and the provider fixture cover embedded styling. The renderer has no width input or terminal query.
- [met] Protocol stdout contains only responses. Notifications, malformed requests, wrong resources, partial input and output-size limits have meaningful automated coverage. — server.ts buffers partial UTF-8 frames with a fixed cap, suppresses notifications, handles output backpressure and sends diagnostics to stderr. The provider tests cover fragmented emoji, bad JSON, invalid request shapes, unknown methods/resources, recovery following an oversized frame and clean EOF. footer.test.ts measures escaped JSON, UTF-8 text, node count and depth.
- [met] Repeated reads and two threads sharing a cwd remain isolated; resource responses require no filesystem scan or model call and complete within the host deadline in the bounded harness. — The open-stream harness alternates red/blue/red in the same cwd, checks exact groups, verifies the next thread omits missing values and measures each read after completing its frame. The response path calls only the mapper and renderer and holds no mutable per-thread facts.
- [met] A usable native setup recipe and isolated smoke procedure accompany the minimal footer. Evidence distinguishes protocol fixtures from any actual CLI observations. — docs/CODEX.md provides host-level registration, isolated configuration and recovery. I independently checked the recorded inline terminal capture from codex-cli 0.172.0 on macOS arm64. It contains the Koko picker entry, expected model, effort and state, and the session ID reported on exit. work/02/native-smoke.md specifies the limits of that observation.
- [met] CI and relay validation install and check the new package alongside the two existing packages. The standalone command, bundle and OpenCode public entry point retain their existing dependency requirements. — The aggregate CI gate requires the new Codex job with its own frozen install, typecheck and tests. Relay setup, typecheck and complete suite include all three packages. The Codex package has only development dependencies. Standalone source and bundle checks passed at this tree and existing OpenCode runtime-import regressions passed. The full suites remain the delivery gate.

## Checks

Reviewed main...b877974. All changed paths are reserved. Compared the advertised tool, resource and UI structure against the published sample and declarations. The architecture guard prohibits imports of the application entry points, private renderer and OpenCode package from Codex.

Six targeted test files passed at this tree, relay record:

- Root: `bun test tests/architecture.test.ts tests/ui/content.test.ts tests/ui/components/effort.test.ts`.
- integrations/codex: `bun test tests/adapter.test.ts tests/footer.test.ts tests/provider.test.ts`.

I independently ran the required root, OpenCode and Codex typechecks. I ran four additional files under the bounded runner: root panel-compatibility and CLI agents (6 tests), and OpenCode runtime-imports and adapter (8 tests). All passed. Relay also lists the passing isolated source/bundle probe for Bun and Node 22, 24 and 26 at this tree.

## Findings

None.
