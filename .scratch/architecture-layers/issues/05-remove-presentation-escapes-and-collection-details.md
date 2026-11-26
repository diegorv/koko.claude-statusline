# 05: Keep the shared snapshot free of ANSI and collection internals

**What to build:** Adapters provide session facts and structured annotations to the panel while keeping provider-specific formats and sources within their integrations. The Caveman badge and pane-header export retain their existing appearance and behavior.

**Files:** src/core/, src/cli/, src/agents/claude/, src/agents/antigravity/adapter.ts, src/agents/opencode/, src/ui/, src/export/pane-header.ts, integrations/opencode/mapping/, integrations/opencode/tui.tsx, integrations/opencode/tests/, tests/agents/, tests/architecture.test.ts, tests/cli.test.ts, tests/cli/, tests/ui/, tests/export/

**Blocked by:** 03

**Status:** needs-info

## Acceptance criteria

- [ ] The shared snapshot is independent of the stdin selection and reading contract. The CLI retains its small adapter interface, and OpenCode can produce a snapshot without implementing a command protocol.
- [ ] Header annotations contain structured content and styling without ANSI escapes. Claude still decides when to display Caveman and what it says; the renderer applies its visual representation.
- [ ] The Claude module no longer imports UI utilities to generate the badge. Its icon, colors, mode, absence behavior, and savings text preserve the previous output.
- [ ] Transcript paths and raw model identifiers used only to collect configuration remain with the code that reads them. Command width measurement receives its opaque key separately; shared consumers do not depend on those internals.
- [ ] Configuration, transcript parsing, permission detection, and Caveman remain Claude-specific, while the Antigravity adapter stays compact. No universal parsers or shared directories without real consumers are introduced.
- [ ] The exporter consumes normalized data, and its tests do not depend on the Claude parser. Schema, aliases, filenames, permissions, atomic writes, and each host's export timing remain unchanged.
- [ ] Architecture rules cover the new separation. Both packages' typechecks and suites pass, including Claude assembly scenarios and shared panel and exporter behavior.

## Scope

Separate shared facts from internal details without deleting observable information merely because only one host provides it. Preserve current token, quota, MCP, and unknown-value semantics; document differences for separate investigation. Declared paths include both locations of OpenCode mapping and tests because ticket 04 may land before or after this ticket.

## Comments

- Draft awaiting approval of ticket granularity and dependencies. After approval, change the status to ready-for-agent.
