# 06: Register and remove the provider without losing user configuration

**What to build:** Users can register Koko in the correct Codex configuration, diagnose setup problems and remove it while preserving their previous settings.

**Files:** integrations/codex/, tests/architecture.test.ts, docs/CODEX.md, .scratch/codex-statusline/work/06/

**Blocked by:** 02

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] Installation targets user-level configuration on the app-server host and registers the stable stdio provider, feature flag and selection needed by supported releases.
- [x] A preview explains the proposed changes; repeated installation is idempotent, and unrelated settings and comments are preserved.
- [x] A conflicting server identity is reported without overwriting it. The previous provider and any installer-owned changes are recorded so removal can restore them when the current configuration is still owned by Koko.
- [x] Removal preserves intervening user edits and unrelated providers; configuration writes are atomic and recoverable after interruption.
- [x] Diagnostics identify unsupported versions, a disabled feature, the wrong configuration scope, an unavailable executable and incomplete registration without modifying configuration.
- [x] Tests use temporary homes and cover custom Codex homes, quoted executable paths, previous providers, conflicts and interrupted writes. Instructions explain restart, picker selection and recovery after a failed read.
- [x] The provider and installer remain independent of the standalone command's runtime dependencies, and all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/06-manage-provider-registration`: docs: record Codex registration discovery; feat: manage reversible user-level Codex registration; docs: review reversible Codex registration; fix: protect project scope and user comments during registration; docs: record resolution of registration review findings; docs: approve corrected Codex registration. Deliver: Fixed cross-project destination scope, effective project override diagnostics and preservation of user-added TOML comments; independent re-review approved; all three suites and standalone smokes passed; actual 0.172.0 registration verified in temporary homes. Tests: exit=0 at adc48b2 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/06-deliver.log). Reviews: round 1: CHANGES_REQUESTED (.scratch/codex-statusline/work/06/review.md, native Codex reviewer); round 2: APPROVED (.scratch/codex-statusline/work/06/review-2.md, native Codex reviewer).
