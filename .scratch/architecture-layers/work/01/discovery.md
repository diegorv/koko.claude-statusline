# Issue 01 discovery

- tests/architecture.test.ts:6 scans only src and TS. Classify production directories explicitly and check the import specifiers collected by the pinned TypeScript compiler, including type-only references, reexports and literal dynamic imports. Keep only the exceptions required by the current tree.
- integrations/opencode/tests/runtime-imports.test.ts:8 scans only the package root. Walk production TS/TSX recursively and use Bun's import scanner for executed dependencies.
- tests/cli.test.ts:16 lacks a Claude command combining real project settings and transcript data. Run an isolated temporary project and check the displayed effort and tool count.
- tests/agents/antigravity/adapter.test.ts already covers payloads, quotas, narrow frames and overrides. Preserve the existing ANSI span tests. Pin the clock and margin inputs for visual comparisons.
- .agent-relay-lite/config.json:6 installs and checks only the root. Chain both frozen installs, both typechecks and both complete suites with failure propagation.
- The worktree passed Claude and Antigravity stdin smoke checks under Bun 1.4.5 and Nodes 22.23.1, 24.22.2 and 26.13.1 before either package's dependencies were installed.
- No production changes or new package dependencies are needed. Full suites run at delivery.
