# OpenCode mapping

- Move the four modules under src/agents/opencode/ and tests/agents/opencode/adapter.test.ts into the plugin. Fix imports in host.ts:3, workspace.ts:3, panel.ts:2, and tests/sdk-contract.test.ts:5. Reserve panel.ts before editing it.
- Keep host.ts:24 responsible for SDK cache reads. Group its pure model matching and context selection with mapping/context.ts:8. Keep the existing selection, token, activity, and VCS algorithms.
- Classify integrations/opencode/mapping/ explicitly in tests/architecture.test.ts:14. Exercise a forbidden SDK, lifecycle, or filesystem dependency at its new location.
- Extend the SDK comparison in integrations/opencode/tests/sdk-contract.test.ts:13 to cover selection changes and capacity. Reuse the host, workspace, and panel tests from work/02 and work/03.
- Update the paths under docs/DEVELOPMENT.md:22. Verify the root checks and standalone command before installing plugin dependencies, then check the plugin with its own frozen lockfile.
