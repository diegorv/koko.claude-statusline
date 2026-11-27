# 02: Display a minimal Koko footer through Codex's native provider

**What to build:** A stock supported Codex CLI can discover and select Koko, then display the current thread's model, effort and run state through a persistent stdio MCP provider.

**Files:** integrations/codex/, src/core/model.ts, src/ui/, tests/ui/, tests/architecture.test.ts, .github/workflows/ci.yml, .agent-relay-lite/config.json, docs/CODEX.md, .scratch/codex-statusline/work/02/

**Blocked by:** 01

**Status:** resolved

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [x] A separate integration entry point implements initialization, discovery and resource reads using the released provider contract and stable server/tool/resource identities.
- [x] A pure adapter maps the supplied thread identity, model, effort, cwd and state into shared data; absent fields are handled without inventing activity or displaying another thread's values.
- [x] The provider produces supported structured rows and text from shared content, uses explicit gaps and host wrapping, and does not forward ANSI escapes or probe terminal width.
- [x] Protocol stdout contains only responses. Notifications, malformed requests, wrong resources, partial input and output-size limits have meaningful automated coverage.
- [x] Repeated reads and two threads sharing a cwd remain isolated; resource responses require no filesystem scan or model call and complete within the host deadline in the bounded harness.
- [x] A usable native setup recipe and isolated smoke procedure accompany the minimal footer. Evidence distinguishes protocol fixtures from any actual CLI observations.
- [x] CI and relay validation install and check the new package alongside the two existing packages. The standalone command, bundle and OpenCode public entry point retain their existing dependency requirements.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.

- 2026-11-27, branch `issue/02-display-native-codex-footer`: docs: record native footer provider discovery; feat: add persistent Codex statusline provider and package checks; docs: record isolated stock CLI footer observation; docs: record independent native footer review. Deliver: Independent native Codex review approved without findings; three-package CI and validation enabled; isolated native 0.172.0 inline rendering and picker observed; Bun/Node standalone compatibility passed. Tests: exit=0 at 84b4815 (log /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/test-logs/codex-statusline/02-deliver.log). Reviews: round 1: APPROVED (.scratch/codex-statusline/work/02/review.md, native Codex reviewer).
