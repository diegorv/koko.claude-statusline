// This module is loaded by the registration command only.
import { closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs"
import { createHash, randomUUID } from "node:crypto"
import { join } from "node:path"
import { isDeepStrictEqual as same } from "node:util"
import { commentsPreserved, setValue, settings, valueAt, type Key } from "./registration-toml.ts"
import { serverName, toolName } from "./protocol.ts"

export type Action = "install" | "remove" | "preview"
type Change = { key: Key; before?: unknown; after: unknown }
type Receipt = {
  version: 1
  stage: "installing" | "installed" | "removing"
  base: string
  target: string
  absent: boolean
  changes: Change[]
}

const selection = { server: serverName, tool: toolName }
const sha = (value: string | null) => createHash("sha256").update(value === null ? "-" : "+" + value).digest("hex")

export function readText(file: string): string | null {
  try {
    if (!lstatSync(file).isFile()) throw new Error("Expected a regular file at " + file)
    return readFileSync(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

function writeAtomic(file: string, content: string) {
  const tmp = file + "." + randomUUID() + ".tmp"
  const mode = existsSync(file) ? lstatSync(file).mode & 0o777 : 0o600
  const fd = openSync(tmp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, mode)
  try {
    try {
      writeFileSync(fd, content)
      fsyncSync(fd)
    } finally { closeSync(fd) }
    renameSync(tmp, file)
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp)
  }
}

function receiptFrom(raw: string | null): Receipt | null {
  if (raw === null) return null
  const r = JSON.parse(raw) as Receipt
  if (r?.version !== 1 || !["installing", "installed", "removing"].includes(r.stage)
    || typeof r.base !== "string" || typeof r.target !== "string" || typeof r.absent !== "boolean"
    || !Array.isArray(r.changes) || !r.changes.every(c => c && Object.hasOwn(settings, c.key) && c.after !== undefined)) {
    throw new Error("Unrecognized Koko registration receipt. Preserve it for recovery.")
  }
  return r
}

export function desiredServer(runtime: string, entry: string) { return { command: runtime, args: [entry] } }

export function registration(action: Action, home: string, runtime: string, entry: string, afterJournal?: () => void) {
  const config = join(home, "config.toml")
  const receiptFile = join(home, "koko-statusline-registration.json")
  const lock = receiptFile + ".lock"
  function run() {
    const original = readText(config)
    const source = original ?? ""
    let receipt = receiptFrom(readText(receiptFile))
    const messages = [config]
    const save = (r: Receipt) => writeAtomic(receiptFile, JSON.stringify(r, null, 2) + "\n")
    const writeConfig = (changed: string | null) => {
      if (readText(config) !== original) throw new Error("Configuration changed during registration. Retry after checking the receipt.")
      if (changed === null) { if (original !== null) unlinkSync(config) }
      else if (changed !== original) writeAtomic(config, changed)
    }

    if (receipt && receipt.stage !== "installed") {
      const phase = receipt.stage
      const hash = sha(original)
      if (hash !== receipt.base && hash !== receipt.target) {
        throw new Error("Configuration changed after an interrupted " + phase + " operation. Preserve the config and receipt for manual reconciliation.")
      }
      if (action === "preview") return [...messages, "Interrupted " + phase + " operation. Run the same operation to complete it."]
      if (phase === "removing" && action !== "remove") throw new Error("Finish the interrupted removal first.")
      if (phase === "installing" && hash === receipt.base) {
        if (action === "remove") {
          unlinkSync(receiptFile)
          return [...messages, "Cancelled the pending install. The original configuration is intact."]
        }
        const changed = apply(source, receipt.changes)
        if (sha(changed) !== receipt.target) throw new Error("Cannot reproduce pending installation.")
        writeConfig(changed)
      }
      if (phase === "installing") {
        receipt.stage = "installed"
        save(receipt)
        if (action === "install") return [...messages, "Recovered the installation."]
      } else if (hash === receipt.target) {
        unlinkSync(receiptFile)
        return [...messages, "Completed the interrupted removal."]
      }
    }

    if (action === "remove") {
      if (!receipt) return [...messages, "No Koko-owned registration to remove."]
      const currentSelection = valueAt(source, settings.selection)
      const otherSelected = currentSelection && typeof currentSelection === "object" && !same(currentSelection, selection)
      let changed = source
      for (const c of [...receipt.changes].reverse()) {
        if (same(valueAt(changed, settings[c.key]), c.after) && !(c.key === "flag" && otherSelected)) {
          const candidate = setValue(changed, c.key, c.before)
          if (commentsPreserved(changed, candidate)) {
            changed = candidate
            continue
          }
          messages.push("Preserving " + settings[c.key].join(".") + " with user comments.")
        } else {
          messages.push("Preserving current " + settings[c.key].join("."))
        }
      }
      const target = receipt.absent && changed === "" ? null : changed
      if (receipt.stage === "removing" && sha(target) !== receipt.target) throw new Error("Cannot reproduce pending removal.")
      save({ ...receipt, stage: "removing", base: sha(original), target: sha(target) })
      afterJournal?.()
      writeConfig(target)
      unlinkSync(receiptFile)
      return [...messages, "Removed Koko-owned settings."]
    }

    const desired = { server: desiredServer(runtime, entry), flag: true, selection }
    const changes: Change[] = []
    for (const key of Object.keys(settings) as Key[]) {
      const before = valueAt(source, settings[key])
      if (same(before, desired[key])) continue
      if (key === "server" && before !== undefined) throw new Error("Conflicting server identity: " + serverName)
      if (receipt) throw new Error("Registration changed since install. Remove it before installing again.")
      changes.push({ key, before, after: desired[key] })
      messages.push("Set " + settings[key].join(".") + " to " + JSON.stringify(desired[key]))
    }
    if (!changes.length) return [...messages, "Koko is already registered."]
    const changed = apply(source, changes)
    if (action === "preview") return messages
    receipt = { version: 1, stage: "installing", base: sha(original), target: sha(changed), absent: original === null, changes }
    save(receipt)
    afterJournal?.()
    writeConfig(changed)
    save({ ...receipt, stage: "installed" })
    return [...messages, "Restart Codex on the connected app-server host."]
  }
  if (action === "preview" || (action === "remove" && !existsSync(home))) return run()
  mkdirSync(home, { recursive: true, mode: 0o700 })
  let fd: number
  try { fd = openSync(lock, "wx", 0o600) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    throw new Error("Registration lock exists at " + lock + ". Check its PID before recovering an interrupted operation.")
  }
  try {
    writeFileSync(fd, process.pid + "\n")
    return run()
  } finally { closeSync(fd); unlinkSync(lock) }
}

function apply(source: string, changes: Change[]) {
  for (const change of changes) {
    source = setValue(source, change.key, change.after)
  }
  return source
}
