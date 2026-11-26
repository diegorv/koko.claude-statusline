import type { Plugin } from "@opencode/plugin/tui"
import { activeContext, resolveModel } from "./mapping/context.ts"
import type { OpenCodeInput } from "./mapping/input.ts"

/** Only this integration knows the OpenCode SDK. The adapter consumes plain data. */
export function readHost(context: Plugin.Context, sessionID: string | undefined): OpenCodeInput {
  const session = sessionID ? context.data.session.get(sessionID) : undefined
  const location = session?.location ?? context.location ?? context.data.location.default()
  const selected = context.ui.model.current() ?? (session?.model ? {
    modelID: session.model.id, providerID: session.model.providerID, variant: session.model.variant,
  } : undefined)
  const models = context.data.location.model.list(location) ?? []
  const model = resolveModel(selected, models)
  const messages = sessionID ? context.data.session.message.list(sessionID) : []
  return {
    directory: session?.location.directory ?? location.directory,
    model: selected ? { id: selected.modelID, name: model?.name ?? selected.modelID, variant: selected.variant } : undefined,
    session,
    cost: session ? context.data.session.cost(session.id) : undefined,
    status: sessionID ? context.data.session.status(sessionID) : undefined,
    context: activeContext(messages, selected, models, session?.revert?.messageID),
    messages,
    revertMessageID: session?.revert?.messageID,
    children: sessionID ? context.data.session.list().filter(child => child.parentID === sessionID).map(child => ({
      id: child.id, title: child.title, agent: child.agent, outcome: child.outcome, running: context.data.session.status(child.id) === "running",
    })) : [],
    mcps: context.data.location.mcp.server.list(location),
  }
}
