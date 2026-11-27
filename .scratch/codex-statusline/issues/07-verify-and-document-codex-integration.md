# 07: Verify and document the complete Codex integration

**What to build:** Users can install the completed integration with accurate expectations, and maintainers can reproduce its compatibility and failure checks.

**Blocked by:** 03, 04, 05, 06

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] Documentation describes the three runtime lifecycles, the native provider's entry point, shared presentation responsibilities and the effective dependency directions.
- [ ] Documentation accurately states experimental support, versioned UI capabilities, viewport limits, missing host fields and the distinction between context, consumption, quotas and optional cost.
- [ ] The three packages' typechecks and complete suites pass. Automated scenarios cover provider lifecycle, malformed input, missing/zero metrics, multiple sessions, responsive Git and bounded UI output.
- [ ] Direct standalone execution and a locally generated release bundle pass the existing Bun/Node compatibility checks without installing integration dependencies; the OpenCode installation path still resolves.
- [ ] A reproducible isolated native-CLI smoke procedure and an evidence record name the exact versions, platforms, display modes, outcomes and remaining manual checks. No fixture-only result is presented as a live rendering result.
- [ ] Existing command behavior, OpenCode resizing and remote workspace protection, and existing pane-header schema/timing retain their regression coverage. No temporary contracts or stale imports remain.

## Manual checks

- Select Koko in the supported native CLI and verify model/state and usage refreshes, including initial missing values.
- Inspect narrow/wide resize and hints in the applicable display modes; verify important content remains first when the host clips the footer.
- Switch displayed threads and workspaces during a slow refresh; verify timeout fallback and recovery by reselection.
- Exercise registration and removal against an isolated configuration. Record other platforms as unverified unless actually tested.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
