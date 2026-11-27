# 06: Register and remove the provider without losing user configuration

**What to build:** Users can register Koko in the correct Codex configuration, diagnose setup problems and remove it while preserving their previous settings.

**Files:** integrations/codex/, tests/architecture.test.ts, docs/CODEX.md, .scratch/codex-statusline/work/06/

**Blocked by:** 02

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] Installation targets user-level configuration on the app-server host and registers the stable stdio provider, feature flag and selection needed by supported releases.
- [ ] A preview explains the proposed changes; repeated installation is idempotent, and unrelated settings and comments are preserved.
- [ ] A conflicting server identity is reported without overwriting it. The previous provider and any installer-owned changes are recorded so removal can restore them when the current configuration is still owned by Koko.
- [ ] Removal preserves intervening user edits and unrelated providers; configuration writes are atomic and recoverable after interruption.
- [ ] Diagnostics identify unsupported versions, a disabled feature, the wrong configuration scope, an unavailable executable and incomplete registration without modifying configuration.
- [ ] Tests use temporary homes and cover custom Codex homes, quoted executable paths, previous providers, conflicts and interrupted writes. Instructions explain restart, picker selection and recovery after a failed read.
- [ ] The provider and installer remain independent of the standalone command's runtime dependencies, and all packages' required checks pass.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
