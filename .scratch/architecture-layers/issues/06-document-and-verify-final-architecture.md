# 06: Document the final architecture and verify installation compatibility

**What to build:** Maintainers can locate shared and host-specific code, and users continue running the statusline through their existing installation configuration. Documentation describes both runtimes and the integrations actually implemented.

**Files:** README.md, docs/DEVELOPMENT.md, docs/INSTALL.md, docs/LAYOUT.md, docs/TUNING.md

**Blocked by:** 04, 05

**Status:** resolved

## Acceptance criteria

- [x] The responsibility map matches the final organization: shared contracts, presentation, pane-header output, stdin command, and OpenCode plugin package. Allowed dependency directions are documented and enforced.
- [x] The host matrix distinguishes Claude and Antigravity stdin integration, the OpenCode plugin, and Codex's native footer without a custom integration in this project. Documentation no longer promises one entry point for every host.
- [x] The contributor guide explains where a new agent format, workspace source, or presentation change belongs using the existing modules, without proposing another plugin framework.
- [x] Installation and release commands remain valid for direct TypeScript execution, the distributed bundle, and the plugin's public path. Existing Node matrix smoke checks remain green, and a smoke test of a locally generated bundle is recorded.
- [x] Both packages' typechecks and suites pass after all tickets are integrated. Layout defaults, environment aliases, stdin handling, exported snapshots, and OpenCode resizing are verified through automated scenarios.
- [x] No temporary contracts, stale executable imports, or shared fixtures that unnecessarily depend on a provider-specific parser remain.
- [x] Cross-host differences in metric meaning are documented accurately without changing calculations in this ticket. Any limitations of live-host manual validation are explicit in the delivery record.

## Scope

Complete documentation and integration verification without adding Codex support, renaming the product, or redesigning widgets. The declared files cover documentation changes; running checks does not reserve the source files they read. If verification reveals a defect requiring a source change, update Files with the affected paths before making that change, keeping it small, justified, and verified. New features remain outside this reorganization.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/06-document-and-verify-final-architecture`: docs: record final architecture verification plan; docs: describe the command, shared renderer and OpenCode plugin; docs: record installation and runtime verification; docs: record independent final architecture review. Deliver: Independent Codex review approved without findings. Final architecture and host semantics documented; both typechecks, targeted checks, public ./tui resolution and 16 isolated source/bundle smokes passed on Bun and Node 22/24/26. No interactive host sessions, font inspection or live remote OpenCode server validation; details in work/06/validation.md. Tests: exit=0 at 19f873d (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/06-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/06/review.md, by Codex).
