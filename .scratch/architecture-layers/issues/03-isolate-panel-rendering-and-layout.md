# 03: Render the panel through a shared interface with explicit layout

**What to build:** Claude, Antigravity, and OpenCode render the panel through one shared interface. Each host resolves its viewport and presentation preferences; resizing OpenCode recalculates presentation without reprocessing session data or scheduling an export solely because the width changed.

**Files:** src/index.ts, src/core/, src/cli/, src/agents/claude/adapter.ts, src/agents/antigravity/adapter.ts, src/agents/opencode/, src/ui/render.ts, src/ui/rows.ts, src/ui/lines.ts, src/ui/layout.ts, src/ui/terminal.ts, integrations/opencode/tui.tsx, integrations/opencode/host.ts, integrations/opencode/panel.ts, integrations/opencode/mapping/, integrations/opencode/tests/, tests/cli.test.ts, tests/cli/, tests/architecture.test.ts, tests/agents/, tests/ui/

**Blocked by:** 02

**Status:** resolved

## Acceptance criteria

- [x] Both runtimes call one public rendering interface that accepts a session snapshot, workspace snapshot, and explicit layout options. Content composition, wrapping, and frame construction are internal to the renderer.
- [x] Width, right margin, and frame sizing are no longer session facts. Layout does not read environment variables implicitly, execute processes, access files, or interpret transcript paths.
- [x] Claude retains terminal probing and width stabilization; Antigravity prioritizes its reported width and probes only as a fallback; OpenCode uses the actual slot width. The stabilization key retains its previous derivation while remaining opaque to the width probe.
- [x] Margin overrides preserve the precedence of current environment variable names over legacy aliases in both runtimes, with unchanged default policies and behavior when width is unknown.
- [x] The installed command entry point remains stable and delegates to the CLI runner. Argument handling, stdin, local acquisition, stdout, and diagnostics are organized within that module; explicit agent errors are still validated before stdin is consumed.
- [x] Diagnostics use the width actually selected for rendering. Additional per-line width calculations still run only when debug logging is enabled.
- [x] An automated OpenCode resize scenario demonstrates that changing only the viewport width does not reread or aggregate messages or schedule a pane-header write. Session export remains possible before the first slot measurement.
- [x] Colors, graphemes, spaces, lines, and frames remain equivalent in regression scenarios, and layout tests use explicit options. Both packages' typechecks and suites, plus the available command smoke tests, pass.

## Scope

Retain the existing widgets and ANSI renderer; native span conversion remains in the plugin. Migrate the rendering contract and both consumers in this delivery. The transcript path may temporarily remain in the snapshot for acquisition until ticket 05, but the renderer must stop using it. Declared paths cover OpenCode before and after ticket 04, which may be delivered first.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/03-isolate-panel-rendering-and-layout`: docs: record panel layout discovery; docs: reserve the reactive panel composition module; refactor: render both hosts with explicit panel layout; test: verify explicit layouts and reactive resize behavior; docs: review panel rendering and layout. Deliver: Independent Codex review approved without findings. Explicit shared rendering and CLI composition validated, including real Solid resize/premeasurement export, environment precedence, eight runtime smokes and byte-for-byte ANSI comparisons. Tests: exit=0 at 950fdce (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/03-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/03/review.md, by Codex).
