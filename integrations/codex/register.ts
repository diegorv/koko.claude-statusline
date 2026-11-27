import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual as same } from "node:util"
import { desiredServer, readText, registration } from "./registration.ts"
import { settings, valueAt } from "./registration-toml.ts"
import { serverName, toolName } from "./protocol.ts"

function executable(file: unknown) {
  if (typeof file !== "string") return false
  try {
    accessSync(file, constants.X_OK)
    return statSync(file).isFile()
  } catch { return false }
}

function canonical(path: string): string {
  return existsSync(path) ? realpathSync(path) : join(canonical(dirname(path)), basename(path))
}

function insideGitWorkspace(dir: string) {
  for (let ancestor = dir; ; ancestor = dirname(ancestor)) {
    if (existsSync(join(ancestor, ".git"))) return true
    if (ancestor === dirname(ancestor)) return false
  }
}

function wrongDestination(home: string) {
  return basename(home) === ".codex" && home !== canonical(join(homedir(), ".codex"))
    && insideGitWorkspace(dirname(home))
}

function projectProblems(workspace: string, home: string) {
  const issues: string[] = []
  const defaultHome = canonical(join(homedir(), ".codex"))
  // Start nearest the workspace. A more local setting takes precedence over one
  // in a parent directory. Codex applies project config when the project is trusted.
  let foundFlag = false
  let foundSelection = false
  for (let dir = resolve(workspace); ; dir = dirname(dir)) {
    const projectHome = canonical(join(dir, ".codex"))
    if (projectHome === home && home !== defaultHome) {
      issues.push("Wrong configuration scope: CODEX_HOME points at this workspace's .codex directory.")
    } else if (projectHome !== home && projectHome !== defaultHome) {
      const file = join(projectHome, "config.toml")
      const content = readText(file)
      if (content !== null) {
        if (valueAt(content, settings.server) !== undefined) issues.push("Project-level server override in " + file)
        const feature = valueAt(content, settings.flag)
        if (!foundFlag && feature !== undefined) {
          foundFlag = true
          if (feature !== true) issues.push("Custom status line feature is disabled by project configuration in " + file + " when trusted.")
        }
        const selection = valueAt(content, settings.selection)
        if (!foundSelection && selection !== undefined) {
          foundSelection = true
          if (!same(selection, { server: serverName, tool: toolName })) {
            issues.push("Project configuration selects a different status line in " + file + " when trusted.")
          }
        }
      }
    }
    if (existsSync(join(dir, ".git")) || dir === dirname(dir)) return issues
  }
}

function versionProblem() {
  const version = spawnSync("codex", ["--version"], { encoding: "utf8", timeout: 3_000 })
  if (version.status !== 0) return "Codex executable is unavailable on this host."
  const value = version.stdout.trim()
  return /^codex-cli 0\.(171|172)\.0$/.test(value) ? null : "Unsupported Codex version: " + value + ". Tested contract: 0.171.0 and 0.172.0."
}

function main(args: string[]) {
  const [action, ...rest] = args
  if (!["preview", "install", "doctor", "remove"].includes(action) || rest.length) {
    throw new Error("Usage: bun integrations/codex/register.ts preview|install|doctor|remove")
  }
  const home = process.env.CODEX_HOME || join(homedir(), ".codex")
  if (!isAbsolute(home)) throw new Error("CODEX_HOME must be an absolute user-level directory.")
  const root = canonical(resolve(home))
  const runtime = process.execPath
  const entry = fileURLToPath(new URL("./server.ts", import.meta.url))
  if (wrongDestination(root)) throw new Error("Wrong configuration scope: CODEX_HOME is a project .codex directory at " + root)
  const scope = projectProblems(process.cwd(), root)
  const userProject = scope.some(p => p.startsWith("Wrong configuration scope:"))
  if (action === "remove" && !userProject) {
    console.log(registration("remove", root, runtime, entry).join("\n"))
    return
  }
  const problems = [...scope, versionProblem()].filter((p): p is string => p !== null)
  if (action === "doctor") {
    const config = join(root, "config.toml")
    const source = readText(config) ?? ""
    const server = valueAt(source, settings.server) as { command?: unknown } | undefined
    if (valueAt(source, settings.flag) !== true) problems.push("Custom status line feature is disabled.")
    if (!same(server, desiredServer(runtime, entry))) problems.push("Incomplete registration or conflicting server identity: " + serverName)
    if (!same(valueAt(source, settings.selection), { server: serverName, tool: toolName })) problems.push("Koko is not selected as the status line provider.")
    if (server && !executable(server.command)) problems.push("Registered provider executable is unavailable.")
    if (!existsSync(entry)) problems.push("Provider entry point is unavailable: " + entry)
    console.log([config, ...(problems.length ? problems : ["Koko registration is ready."])].join("\n"))
    if (problems.length) process.exitCode = 1
    return
  }
  if (problems.length) throw new Error(problems.join("\n"))
  if (!executable(runtime) || !existsSync(entry)) throw new Error("Provider executable or entry point is unavailable.")
  console.log(registration(action as "install" | "preview", root, runtime, entry).join("\n"))
}

try { main(process.argv.slice(2)) }
catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exitCode = 1
}
