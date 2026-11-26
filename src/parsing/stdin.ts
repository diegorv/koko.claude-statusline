// Read the transport once. Agent adapters interpret the JSON object.
import { readFileSync } from "node:fs"

export function parseStdin(): Record<string, unknown> | null {
  try {
    const raw: unknown = JSON.parse(readFileSync(0, "utf8"))
    return raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown> : null
  } catch {
    return null
  }
}
