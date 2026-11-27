# Tickets: native Codex statusline

**Status:** completed — seven issues delivered on 2026-11-27.

The user approved the breakdown and dependency graph through `/to-tickets`. The [specification](spec.md) defines scope and compatibility; the [research](research.md) records the source evidence. Each linked ticket owns its acceptance criteria and comments.

| Issue | Blocked by | Status |
| --- | --- | --- |
| [01: Share styled content while preserving existing panel output](issues/01-share-styled-content.md) | none | resolved |
| [02: Display a minimal Koko footer through Codex's native provider](issues/02-display-native-codex-footer.md) | 01 | resolved |
| [03: Show current context, quotas and reset countdowns](issues/03-show-context-quotas-and-resets.md) | 02 | resolved |
| [04: Show session consumption without conflating it with context](issues/04-show-session-consumption.md) | 02 | resolved |
| [05: Enrich the footer with asynchronous workspace details](issues/05-collect-workspace-asynchronously.md) | 02 | resolved |
| [06: Register and remove the provider without losing user configuration](issues/06-manage-provider-registration.md) | 02 | resolved |
| [07: Verify and document the complete Codex integration](issues/07-verify-and-document-codex-integration.md) | 03, 04, 05, 06 | resolved |

Ticket 01 is the prefactoring step. After 02, tickets 03–06 are functionally independent. Shared edit reservations may still require serial execution; file overlap does not add a functional dependency.

All seven issues were delivered through isolated native Codex implementation, independent review, complete validation and verified merge/push. See the [ledger](ledger.md) for delivery commits and the [verification record](work/07/validation.md) for native observations and remaining manual checks. The user's live Codex configuration was not changed.
