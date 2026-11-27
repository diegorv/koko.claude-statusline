# Proposed tickets: native Codex statusline

**Status:** draft — awaiting breakdown approval; these are not published issues.

Based on [the feature specification](spec.md) and [the source investigation](research.md). Ticket 01 is the intentional prefactoring step. Each later slice delivers an independently verifiable path through the provider and visible footer. All artifacts and eventual issue files use English.

## 01: Share styled content while preserving existing panel output

**What to build:** The existing Claude, Antigravity and OpenCode panels keep their appearance while presentation exposes reusable content that can also serve a native host renderer.

**Blocked by:** none

- [ ] A small shared content contract represents semantic groups, text and styles without Codex types, environment access, collection I/O or embedded ANSI escapes.
- [ ] The existing public panel interface consumes the shared content and preserves colors, graphemes, spaces, wrapping and frames for controlled representative scenarios.
- [ ] The command and OpenCode retain their distinct viewport policies, environment precedence, pane-header timing and reactive resize behavior.
- [ ] Presentation calculations are shared rather than copied into a second set of widgets; no general-purpose UI framework is introduced.
- [ ] Architecture rules enforce the new separation, and both existing packages' typechecks, targeted regressions and complete delivery checks pass.

## 02: Display a minimal Koko footer through Codex's native provider

**What to build:** A stock supported Codex CLI can discover and select Koko, then display the current thread's model, effort and run state through a persistent stdio MCP provider.

**Blocked by:** 01

- [ ] A separate integration entry point implements initialization, discovery and resource reads using the released provider contract and stable server/tool/resource identities.
- [ ] A pure adapter maps the supplied thread identity, model, effort, cwd and state into shared data; absent fields are handled without inventing activity or displaying another thread's values.
- [ ] The provider produces supported structured rows and text from shared content, uses explicit gaps and host wrapping, and does not forward ANSI escapes or probe terminal width.
- [ ] Protocol stdout contains only responses. Notifications, malformed requests, wrong resources, partial input and output-size limits have meaningful automated coverage.
- [ ] Repeated reads and two threads sharing a cwd remain isolated; resource responses require no filesystem scan or model call and complete within the host deadline in the bounded harness.
- [ ] A usable native setup recipe and isolated smoke procedure accompany the minimal footer. Evidence distinguishes protocol fixtures from any actual CLI observations.
- [ ] CI and relay validation install and check the new package alongside the two existing packages. The standalone command, bundle and OpenCode public entry point retain their existing dependency requirements.

## 03: Show current context, quotas and reset countdowns

**What to build:** The Codex footer shows the displayed thread's context and available account usage windows with Koko's indicators and reset countdowns.

**Blocked by:** 02

- [ ] Context percentage, occupied tokens and capacity map independently from the host; missing data is not replaced with measured zero or cumulative session usage.
- [ ] Quotas preserve their limit identity and distinguish the five-hour and weekly windows by their reported duration even when the slots are reversed. Other buckets are not silently mislabeled as those windows.
- [ ] Missing reset times remain unknown. Countdown output is deterministic under a controlled clock and updates through the normal host polling cycle.
- [ ] Quota values above 100% remain visible numerically while a finite-width bar saturates safely; consumed usage is not mislabeled as remaining allowance.
- [ ] Shared formatting renders compact native groups with a predictable field priority and no assumed footer width or full-width background padding.
- [ ] Automated resource-read scenarios cover missing/zero values, window order, multiple buckets and thread switches; all packages' required checks pass with existing hosts' metric behavior preserved.

## 04: Show session consumption without conflating it with context

**What to build:** The Codex footer can show reported input, output and cache totals, plus available host-reported USD cost, even when no tool activity is supplied.

**Blocked by:** 02

- [ ] Normalized session token totals no longer require tool or transcript activity. Existing adapters and consumers migrate in the same delivery without temporary competing sources of truth.
- [ ] Codex's uncached input and cache-read/write counts map without double counting cache-inclusive total input. Session totals remain distinct from current-context occupancy.
- [ ] Missing usage and cost remain absent, while reported zero retains its meaning. Credits are not treated as USD and no pricing estimator is introduced.
- [ ] The native footer renders the reported consumption through the shared presentation contract without manufacturing tools, assistant timing samples or output-speed measurements.
- [ ] Existing host token calculations and output remain equivalent under controlled regression fixtures; the exporter keeps its existing schema and timing.
- [ ] End-to-end resource tests cover partial usage, cache-inclusive totals, zero cost and absent activity; all packages' required checks pass.

## 05: Enrich the footer with asynchronous workspace details

**What to build:** Git information appears for an accessible local workspace while session data remains responsive during cold, slow or failing workspace queries.

**Blocked by:** 02

- [ ] The provider obtains normalized workspace data only on the host that can access the supplied cwd. It never substitutes the provider process's current repository for an unavailable or remote workspace.
- [ ] Git and any supported linked-worktree enrichment run outside the resource-read response path, with bounded work, a bounded cache and at most one refresh in flight per workspace key.
- [ ] Cold-cache and failed-query reads still return useful session content. Cached results are reused only for the matching workspace and are refreshed under an explicit freshness policy.
- [ ] Switching directory or thread while a query is pending cannot publish a previous selection's workspace into the new view; process shutdown cleans up outstanding work.
- [ ] Sharing acquisition with the command respects the architecture rules and preserves the existing local collector's values and linked-worktree policy. OpenCode remains server-only for VCS.
- [ ] Slow/failing Git, non-repositories, linked worktrees, eviction and selection races are tested through the actual provider path; all packages' required checks pass.

## 06: Register and remove the provider without losing user configuration

**What to build:** Users can register Koko in the correct Codex configuration, diagnose setup problems and remove it while preserving their previous settings.

**Blocked by:** 02

- [ ] Installation targets user-level configuration on the app-server host and registers the stable stdio provider, feature flag and selection needed by supported releases.
- [ ] A preview explains the proposed changes; repeated installation is idempotent, and unrelated settings and comments are preserved.
- [ ] A conflicting server identity is reported without overwriting it. The previous provider and any installer-owned changes are recorded so removal can restore them when the current configuration is still owned by Koko.
- [ ] Removal preserves intervening user edits and unrelated providers; configuration writes are atomic and recoverable after interruption.
- [ ] Diagnostics identify unsupported versions, a disabled feature, the wrong configuration scope, an unavailable executable and incomplete registration without modifying configuration.
- [ ] Tests use temporary homes and cover custom Codex homes, quoted executable paths, previous providers, conflicts and interrupted writes. Instructions explain restart, picker selection and recovery after a failed read.
- [ ] The provider and installer remain independent of the standalone command's runtime dependencies, and all packages' required checks pass.

## 07: Verify and document the complete Codex integration

**What to build:** Users can install the completed integration with accurate expectations, and maintainers can reproduce its compatibility and failure checks.

**Blocked by:** 03, 04, 05, 06

- [ ] Documentation describes the three runtime lifecycles, the native provider's entry point, shared presentation responsibilities and the effective dependency directions.
- [ ] Documentation accurately states experimental support, versioned UI capabilities, viewport limits, missing host fields and the distinction between context, consumption, quotas and optional cost.
- [ ] The three packages' typechecks and complete suites pass. Automated scenarios cover provider lifecycle, malformed input, missing/zero metrics, multiple sessions, responsive Git and bounded UI output.
- [ ] Direct standalone execution and a locally generated release bundle pass the existing Bun/Node compatibility checks without installing integration dependencies; the OpenCode installation path still resolves.
- [ ] A reproducible isolated native-CLI smoke procedure and an evidence record name the exact versions, platforms, display modes, outcomes and remaining manual checks. No fixture-only result is presented as a live rendering result.
- [ ] Existing command behavior, OpenCode resizing and remote workspace protection, and existing pane-header schema/timing retain their regression coverage. No temporary contracts or stale imports remain.

### Manual checks for the delivery record

- Select Koko in the supported native CLI and verify model/state and usage refreshes, including initial missing values.
- Inspect narrow/wide resize and hints in the applicable display modes; verify important content remains first when the host clips the footer.
- Switch displayed threads and workspaces during a slow refresh; verify timeout fallback and recovery by reselection.
- Exercise registration and removal against an isolated configuration. Record other platforms as unverified unless actually tested.

## Approval questions

Does this granularity fit one fresh implementation context per slice? Are any functional blockers missing or unnecessary? Should any slices be merged or split? Publishing the seven individual issue files waits for approval of this breakdown.
