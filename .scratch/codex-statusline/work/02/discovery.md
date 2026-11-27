# Minimal native footer

The released 0.171.0 starter and generated types agree with the 0.172.0 types on newline-framed MCP, the resource metadata key, native row wrapping and aggregate output limits. The displayed thread supplies its own identity and workspace on each read.

- Extend the host identity at `src/core/model.ts:2`. Map optional fields in a pure Codex adapter to the existing shared snapshot and build the footer from the fields introduced in work/01 at `src/ui/content/session.ts:22`.
- Add a persistent stdio entry, protocol handler and native tree encoder in `integrations/codex/`. Use the stable global server `koko-statusline`, tool `statusline` and resource `ui://koko-statusline/footer`. Keep discovery independent of rendering and enforce bounded line and output sizes.
- Extend the architecture allowlist at `tests/architecture.test.ts:10`. Place package tests beside the integration, including an open-stream subprocess test, malformed inputs, Unicode limits and two displayed threads in the same directory.
- Include frozen installs, typechecks and package tests in `.agent-relay-lite/config.json:5` and the mandatory CI result in `.github/workflows/ci.yml`. Keep the standalone package dependency-free at runtime.
- Document setup and isolated smoke checks in `docs/CODEX.md`. Distinguish observations of the stock CLI from protocol fixtures. No polling code in the provider: the host owns refreshes.
