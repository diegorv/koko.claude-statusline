# 05: Keep the shared snapshot free of ANSI and collection internals

**What to build:** Adapters provide session facts and structured annotations to the panel while keeping provider-specific formats and sources within their integrations. The Caveman badge and pane-header export retain their existing appearance and behavior.

**Files:** src/core/, src/cli/, src/agents/claude/, src/agents/antigravity/adapter.ts, src/agents/opencode/, src/ui/, src/export/pane-header.ts, integrations/opencode/mapping/, integrations/opencode/tui.tsx, integrations/opencode/panel.ts, integrations/opencode/host.ts, integrations/opencode/tests/, tests/agents/, tests/architecture.test.ts, tests/cli.test.ts, tests/cli/, tests/ui/, tests/export/

**Blocked by:** 03

**Status:** resolved

## Acceptance criteria

- [x] The shared snapshot is independent of the stdin selection and reading contract. The CLI retains its small adapter interface, and OpenCode can produce a snapshot without implementing a command protocol.
- [x] Header annotations contain structured content and styling without ANSI escapes. Claude still decides when to display Caveman and what it says; the renderer applies its visual representation.
- [x] The Claude module no longer imports UI utilities to generate the badge. Its icon, colors, mode, absence behavior, and savings text preserve the previous output.
- [x] Transcript paths and raw model identifiers used only to collect configuration remain with the code that reads them. Command width measurement receives its opaque key separately; shared consumers do not depend on those internals.
- [x] Configuration, transcript parsing, permission detection, and Caveman remain Claude-specific, while the Antigravity adapter stays compact. No universal parsers or shared directories without real consumers are introduced.
- [x] The exporter consumes normalized data, and its tests do not depend on the Claude parser. Schema, aliases, filenames, permissions, atomic writes, and each host's export timing remain unchanged.
- [x] Architecture rules cover the new separation. Both packages' typechecks and suites pass, including Claude assembly scenarios and shared panel and exporter behavior.

## Scope

Separate shared facts from internal details without deleting observable information merely because only one host provides it. Preserve current token, quota, MCP, and unknown-value semantics; document differences for separate investigation. Declared paths include both locations of OpenCode mapping and tests because ticket 04 may land before or after this ticket.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/05-remove-presentation-escapes-and-collection-details`: docs: record shared snapshot migration discovery; docs: reserve the reactive panel for its mapping update; docs: reserve the host projection for removing the unused model id; refactor: separate shared snapshots from stdin collection; docs: review shared snapshot separation. Deliver: Independent Codex review approved without findings. Structured annotations, independent snapshot/CLI contracts, opaque width keys and normalized export fixtures verified; complete Caveman output matched base byte-for-byte in Bun and Node 22/24/26. Tests: exit=0 at 6dd101f (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/05-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/05/review.md, by Codex).
