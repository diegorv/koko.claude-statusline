# 01: Share styled content while preserving existing panel output

**What to build:** The existing Claude, Antigravity and OpenCode panels keep their appearance while presentation exposes reusable content that can also serve a native host renderer.

**Blocked by:** none

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] A small shared content contract represents semantic groups, text and styles without Codex types, environment access, collection I/O or embedded ANSI escapes.
- [ ] The existing public panel interface consumes the shared content and preserves colors, graphemes, spaces, wrapping and frames for controlled representative scenarios.
- [ ] The command and OpenCode retain their distinct viewport policies, environment precedence, pane-header timing and reactive resize behavior.
- [ ] Presentation calculations are shared rather than copied into a second set of widgets; no general-purpose UI framework is introduced.
- [ ] Architecture rules enforce the new separation, and both existing packages' typechecks, targeted regressions and complete delivery checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
