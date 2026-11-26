# 01: Protect both runtime contracts before reorganizing the code

**What to build:** Make the reorganization verifiable: dependency rules continue to cover moved files, and the validation workflow checks both the standalone command and the OpenCode plugin before accepting a change.

**Files:** .agent-relay-lite/config.json, tests/architecture.test.ts, tests/cli.test.ts, tests/agents/antigravity/adapter.test.ts, tests/ui/lines.test.ts, tests/ui/render.test.ts, integrations/opencode/tests/runtime-imports.test.ts, integrations/opencode/tests/ansi.test.ts

**Blocked by:** none

**Status:** resolved

## Acceptance criteria

- [x] The architecture check recursively inspects all production TypeScript and TSX modules, excluding tests and installed dependencies; every new production directory must have an explicit responsibility classification.
- [x] The rules detect prohibited imports of runtime entry points, other agents, and host SDKs, including direct imports, reexports, and literal dynamic imports. Small representative cases demonstrate that violations are detected.
- [x] The plugin import guard covers nested directories and distinguishes type-only imports from executed dependencies. Host-provided runtime packages remain allowed; development-only SDK helpers cannot enter the runtime import graph.
- [x] Existing regressions and only the additional scenarios needed for this migration cover the Claude command with configuration and transcript data, the Antigravity payload, representative panel widths, and OpenCode span conversion. Time and environment inputs used for output comparisons are controlled.
- [x] The relay-lite validation configuration installs and checks both packages while retaining separate lockfiles and running both typechecks and complete test suites. A plugin failure makes the aggregate check fail.
- [x] The standalone command remains executable without installing plugin dependencies, and the architecture rules and existing CI checks pass before production code is moved.

## Scope

This ticket prepares verifiable migration safeguards. Reuse existing coverage rather than duplicating every widget test, and preserve the calculations displayed to users. Do not start other implementation tickets as part of this delivery.

## Comments

- 2026-11-26: The user approved starting the issues. The breakdown and dependencies are approved; this ticket is ready for execution when its blockers are resolved.

- 2026-11-26, branch `issue/01-protect-contracts-and-validation`: docs: record runtime safeguard discovery; test: enforce layer imports and validate both packages; test: inspect source imports before JSX runtime injection; test: pin command assembly and exact panel output; docs: record independent runtime contract review. Deliver: Independent Codex review approved with no findings. Both typechecks and targeted tests passed; Bun and Node 22/24/26 standalone smoke checks passed without dependencies. Tests: exit=0 at ba36de9 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/architecture-layers/01-deliver.log). Reviews: round 1: APPROVED (.scratch/architecture-layers/work/01/review.md, by Codex).
