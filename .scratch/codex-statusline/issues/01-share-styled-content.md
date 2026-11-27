# 01: Share styled content while preserving existing panel output

**What to build:** The existing Claude, Antigravity and OpenCode panels keep their appearance while presentation exposes reusable content that can also serve a native host renderer.

**Files:** src/ui/, tests/ui/, tests/architecture.test.ts, integrations/opencode/tests/, .scratch/codex-statusline/work/01/

**Blocked by:** none

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] A small shared content contract represents semantic groups, text and styles without Codex types, environment access, collection I/O or embedded ANSI escapes.
- [x] The existing public panel interface consumes the shared content and preserves colors, graphemes, spaces, wrapping and frames for controlled representative scenarios.
- [x] The command and OpenCode retain their distinct viewport policies, environment precedence, pane-header timing and reactive resize behavior.
- [x] Presentation calculations are shared rather than copied into a second set of widgets; no general-purpose UI framework is introduced.
- [x] Architecture rules enforce the new separation, and both existing packages' typechecks, targeted regressions and complete delivery checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/01-share-styled-content`: docs: record shared content discovery; test: capture existing public panel output at two widths; refactor: share styled session fields across renderers; docs: review shared content compatibility; fix: preserve visible labels from terminal control strings; docs: record terminal hyperlink review resolution; docs: approve shared content compatibility fix. Deliver: Fixed OSC hyperlink/control-string leakage; independent re-review approved; standalone Bun and Node 22/24/26 source and bundle smokes passed. Tests: exit=0 at 5e93ffd (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/01-deliver.log). Reviews: round 1: CHANGES_REQUESTED (.scratch/codex-statusline/work/01/review.md, native Codex reviewer); round 2: APPROVED (.scratch/codex-statusline/work/01/review-2.md, native Codex reviewer).
