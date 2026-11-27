import { mapCodexSnapshot, object } from "./adapter.ts"
import { renderFooter } from "./footer.ts"

export const serverName = "koko-statusline"
export const toolName = "statusline"
export const resourceUri = "ui://koko-statusline/footer"
const mimeType = "application/json"
const tool = {
  name: toolName,
  title: "Koko",
  description: "Display the current Codex thread in the Koko footer.",
  inputSchema: { type: "object", properties: {} },
  _meta: { "openai/ui": { entrypoints: [{ type: "statusline", resourceUri }] } },
}

type Id = number | string | null
export function error(id: Id, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

export function reply(line: string) {
  let request: Record<string, unknown> | undefined
  try {
    request = object(JSON.parse(line))
  } catch {
    return error(null, -32700, "Parse error")
  }
  if (request?.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return error(null, -32600, "Invalid request")
  }
  if (!Object.hasOwn(request, "id")) return null
  const id = request.id
  if (typeof id !== "string" && !(typeof id === "number" && Number.isSafeInteger(id))) {
    return error(null, -32600, "Invalid request id")
  }
  const params = request.params === undefined ? {} : object(request.params)
  if (!params) return error(id, -32602, "Expected named parameters")
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result })

  switch (request.method) {
    case "initialize":
      return ok({ protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {} },
        serverInfo: { name: serverName, version: "0.1.0" } })
    case "ping": return ok({})
    case "tools/list": return ok({ tools: [tool] })
    case "tools/call": return params.name === toolName
      ? ok({ content: [{ type: "text", text: `The Koko statusline resource is ${resourceUri}.` }] })
      : error(id, -32602, "Unknown tool")
    case "resources/list": return ok({ resources: [{ name: "footer", uri: resourceUri, mimeType }] })
    case "resources/templates/list": return ok({ resourceTemplates: [] })
    case "resources/read": {
      if (params.uri !== resourceUri) return error(id, -32602, "Unknown resource URI")
      const state = object(params._meta)?.["com.openai/codex-statusline-state"]
      const snapshot = mapCodexSnapshot(state)
      return ok({ contents: [{ uri: resourceUri, mimeType, text: renderFooter(snapshot) }] })
    }
    default: return error(id, -32601, "Method not found")
  }
}
