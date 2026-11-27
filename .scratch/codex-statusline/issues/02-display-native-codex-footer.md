# 02: Display a minimal Koko footer through Codex's native provider

**What to build:** A stock supported Codex CLI can discover and select Koko, then display the current thread's model, effort and run state through a persistent stdio MCP provider.

**Blocked by:** 01

**Status:** ready-for-agent

**Context:** [Specification](../spec.md) and [source investigation](../research.md).

## Acceptance criteria

- [ ] A separate integration entry point implements initialization, discovery and resource reads using the released provider contract and stable server/tool/resource identities.
- [ ] A pure adapter maps the supplied thread identity, model, effort, cwd and state into shared data; absent fields are handled without inventing activity or displaying another thread's values.
- [ ] The provider produces supported structured rows and text from shared content, uses explicit gaps and host wrapping, and does not forward ANSI escapes or probe terminal width.
- [ ] Protocol stdout contains only responses. Notifications, malformed requests, wrong resources, partial input and output-size limits have meaningful automated coverage.
- [ ] Repeated reads and two threads sharing a cwd remain isolated; resource responses require no filesystem scan or model call and complete within the host deadline in the bounded harness.
- [ ] A usable native setup recipe and isolated smoke procedure accompany the minimal footer. Evidence distinguishes protocol fixtures from any actual CLI observations.
- [ ] CI and relay validation install and check the new package alongside the two existing packages. The standalone command, bundle and OpenCode public entry point retain their existing dependency requirements.

## Comments

- 2026-11-26: The user approved the seven-ticket breakdown and its dependency graph for publication through `/to-tickets`.
