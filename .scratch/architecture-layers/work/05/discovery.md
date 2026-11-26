# Shared snapshot boundaries

- Split src/core/adapter.ts:3 into the shared snapshot and a CLI-owned reading interface. Let both stdin readers return a snapshot plus a separate width key. Preserve the Claude raw transcript path and the Antigravity sanitized path used by src/cli/run.ts:32.
- Keep sessionId fallback and the model-specific settings lookup in src/agents/claude/adapter.ts:16. Remove the collection-only fields from SessionData and all three producers.
- Replace the escapes in src/agents/claude/caveman-badge.ts:10 with an annotation carrying the badge text and color. Render each colored part separately, keeping the uncolored space before the savings suffix.
- Convert integrations/opencode/mapping/adapter.ts:65 to a pure snapshot function. The reactive panel added in issue 03 needs a reserved import/call update, as in work/04.
- Use normalized test input for tests/export/pane-header.test.ts:10 and remove the last migration exception at tests/architecture.test.ts:36.
- Exercise the actual Claude command with absent, active, and savings-suppressed Caveman states, alongside the existing model/config/transcript scenario. Preserve OpenCode's separate context-token and MCP meanings.
