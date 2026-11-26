import type { Message, Usage } from "./input.ts"

/**
 * OpenCode 2.4 context contract: last assistant usage before undo and after
 * completed compaction. Kept local because the host does not provide the
 * @opencode/client runtime; integration tests compare this with its SDK helper.
 */
export function contextStep(messages: readonly Message[], boundary?: string): { tokens: Usage; model: { id: string; providerID: string } } | undefined {
  const end = boundary ? messages.findIndex(message => message.id === boundary) : messages.length
  if (end < 0) return undefined
  for (let i = end - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.type === "compaction" && message.status === "completed") return undefined
    if (message.type === "assistant" && message.tokens && message.model) {
      return { tokens: message.tokens, model: message.model }
    }
  }
  return undefined
}
