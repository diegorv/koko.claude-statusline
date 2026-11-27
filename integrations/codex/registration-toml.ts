// Edit only tokens belonging to the managed key. Re-serializing the whole config
// would lose comments and could round unrelated 64-bit TOML integers.
import { getStaticTOMLValue, parseTOML, type AST } from "toml-eslint-parser"
import { isDeepStrictEqual } from "node:util"

export const settings = {
  server: ["mcp_servers", "koko-statusline"],
  flag: ["features", "tui_extensions_statusline"],
  selection: ["tui", "status_line_provider"],
} as const
export type Key = keyof typeof settings
type Path = readonly string[]
type Span = [number, number]

export function valueAt(source: string, path: Path): unknown {
  let value: unknown = getStaticTOMLValue(parseTOML(source))
  for (const key of path) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

function literal(value: unknown): string {
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (Array.isArray(value)) return "[" + value.map(literal).join(", ") + "]"
  if (value && typeof value === "object") {
    return "{ " + Object.entries(value).map(([k, v]) => JSON.stringify(k) + " = " + literal(v)).join(", ") + " }"
  }
  throw new Error("Unexpected managed setting value")
}

function pathOf(key: AST.TOMLKey): string[] {
  return key.keys.map(k => k.type === "TOMLBare" ? k.name : k.value)
}
function splice(source: string, [start, end]: Span, replacement: string) {
  return source.slice(0, start) + replacement + source.slice(end)
}

// Comments after a removed statement stay on their line.
function removeStatement(source: string, start: number, end: number) {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1
  const rest = source.slice(end).match(/^([ \t]*(?:\r?\n|$))/)
  if (rest && !source.slice(lineStart, start).trim()) return splice(source, [lineStart, end + rest[0].length], "")
  return splice(source, [start, end], "")
}

function edit(source: string, path: Path, value: unknown): string {
  const ast = parseTOML(source)
  const entries = new Map<string, AST.TOMLKeyValue>()
  const tables = new Map<string, AST.TOMLTable>()
  function index(entry: AST.TOMLKeyValue, parent: string[]) {
    const address = [...parent, ...pathOf(entry.key)]
    entries.set(JSON.stringify(address), entry)
    if (entry.value.type === "TOMLInlineTable") entry.value.body.forEach(child => index(child, address))
  }
  for (const item of ast.body[0].body) {
    if (item.type === "TOMLKeyValue") index(item, [])
    else if (item.kind === "standard" && item.resolvedKey.every(k => typeof k === "string")) {
      tables.set(JSON.stringify(item.resolvedKey), item)
      item.body.forEach(child => index(child, item.resolvedKey as string[]))
    }
  }
  const addr = JSON.stringify(path)
  const existing = entries.get(addr)
  const table = tables.get(addr)
  const current = valueAt(source, path)
  if (isDeepStrictEqual(current, value)) return source
  if (current && typeof current === "object" && !Array.isArray(current) && value && typeof value === "object") {
    // A previous provider can be an explicit table, dotted keys or an inline table.
    let changed = source
    for (const [k, v] of Object.entries(value)) changed = edit(changed, [...path, k], v)
    return changed
  }
  if (existing) {
    if (value !== undefined) return splice(source, existing.value.range, literal(value))
    if (existing.parent.type !== "TOMLInlineTable") return removeStatement(source, ...existing.range)
    const siblings = existing.parent.body
    const position = siblings.indexOf(existing)
    if (position + 1 < siblings.length) return splice(source, [existing.range[0], siblings[position + 1].range[0]], "")
    const start = position ? siblings[position - 1].range[1] : existing.range[0]
    return splice(source, [start, existing.range[1]], "")
  }
  if (current !== undefined) {
    // The host can expand an inline object into a table when saving a selection.
    // Retain comments while removing its keys and (when present) its header.
    if (!current || typeof current !== "object") throw new Error("Unsupported setting layout: " + path.join("."))
    let changed = source
    if (table) {
      const endToken = ast.tokens.find(t => t.range[0] >= table.key.range[1] && t.value === "]")!
      // Removing the header last avoids changing the table of its child assignments.
      for (const item of [...table.body].reverse()) changed = removeStatement(changed, ...item.range)
      changed = removeStatement(changed, table.range[0], endToken.range[1])
    } else {
      for (const key of Object.keys(current)) changed = edit(changed, [...path, key], undefined)
    }
    return value === undefined ? changed : edit(changed, path, value)
  }
  if (value === undefined) return source
  const eol = source.includes("\r\n") ? "\r\n" : "\n"
  for (let n = path.length - 1; n >= 0; n--) {
    const prefix = JSON.stringify(path.slice(0, n))
    const key = path.slice(n).join(".")
    const pair = key + " = " + literal(value)
    const parent = entries.get(prefix)
    if (parent?.value.type === "TOMLInlineTable") {
      const pos = parent.value.range[1] - 1
      return splice(source, [pos, pos], (parent.value.body.length ? ", " : "") + pair)
    }
    const section = tables.get(prefix)
    if (section) {
      const nl = source.indexOf("\n", section.key.range[1])
      if (nl < 0) return source + eol + pair + eol
      return splice(source, [nl + 1, nl + 1], pair + eol)
    }
  }
  return path.join(".") + " = " + literal(value) + eol + source
}

export function setValue(source: string, key: Key, value: unknown) {
  const changed = edit(source, settings[key], value)
  if (!isDeepStrictEqual(valueAt(changed, settings[key]), value)) {
    throw new Error("Unsupported TOML layout for " + settings[key].join(".") + ". Configuration was preserved.")
  }
  return changed
}

/** A user may add a comment inside a multiline value without changing its value. */
export function commentsPreserved(before: string, after: string) {
  const comments = (source: string) => parseTOML(source).comments.map(c => source.slice(...c.range))
  return isDeepStrictEqual(comments(before), comments(after))
}
