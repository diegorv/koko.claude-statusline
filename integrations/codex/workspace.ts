import { spawn } from "node:child_process"
import { isAbsolute, join } from "node:path"
import { EMPTY_WORKSPACE, type WorkspaceSnapshot } from "../../src/core/workspace.ts"
import { parseGit, remotes, revParse, status } from "../../src/workspace/git.ts"
import { parseWorktrunkList } from "../../src/workspace/worktrunk.ts"

const freshnessMs = 3_000
const maxEntries = 16
const maxRefreshing = 2
const refreshBudgetMs = 1_500
const maxOutput = 1024 * 1024

// A persistent provider can inherit another checkout's Git environment. Resolve all
// repository locations from the snapshot cwd. A missing cwd makes spawn itself fail.
const localEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")))

function command(cwd: string, program: string, args: string[], signal: AbortSignal): Promise<string | null> {
  if (signal.aborted) return Promise.resolve(null)
  return new Promise(resolve => {
    const group = process.platform !== "win32"
    const child = spawn(program, args, { cwd, env: localEnv, detached: group, stdio: ["ignore", "pipe", "ignore"] })
    const chunks: Buffer[] = []
    let size = 0
    let stopped = false
    function stop() {
      stopped = true
      if (!child.pid) return
      try {
        if (group) process.kill(-child.pid, "SIGKILL")
        else {
          // Win32 has no POSIX process groups. Ask the OS to end the command's tree.
          const taskkill = join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe")
          const killer = spawn(taskkill, ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true })
          killer.once("error", () => child.kill("SIGKILL"))
          killer.once("exit", code => { if (code !== 0) child.kill("SIGKILL") })
        }
      } catch { /* Already exited. */ }
      // A helper may have inherited the output pipe. Do not wait for it to close.
      child.stdout.destroy()
    }
    signal.addEventListener("abort", stop, { once: true })
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size <= maxOutput) chunks.push(chunk)
      else if (!stopped) stop()
    })
    child.once("error", () => { stopped = true })
    child.once("close", code => {
      signal.removeEventListener("abort", stop)
      resolve(code === 0 && !stopped ? Buffer.concat(chunks).toString("utf8").trim() : null)
    })
  })
}

async function collect(cwd: string, signal: AbortSignal): Promise<WorkspaceSnapshot> {
  const runGit = (args: string[]) => command(cwd, "git", ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args], signal)
  const roots = await runGit(revParse)
  if (!roots) return EMPTY_WORKSPACE
  const changes = await runGit(status)
  if (!changes) return EMPTY_WORKSPACE
  const remoteList = await runGit(remotes)
  if (remoteList === null) return EMPTY_WORKSPACE
  const git = parseGit(roots, changes, remoteList)
  if (!git.repo) return EMPTY_WORKSPACE
  const wt = git.worktree && await command(cwd, "wt", ["-C", cwd, "list", "--format=json"], signal)
  return { git, worktrunk: wt ? parseWorktrunkList(wt) : null }
}

type Entry = { snapshot: WorkspaceSnapshot; expires: number; pending?: AbortController }

/** Per-server LRU. Each polling read can schedule work for its own absolute local cwd. */
export class WorkspaceCache {
  private entries = new Map<string, Entry>()
  private pending = 0
  private closed = false

  read(cwd: string): WorkspaceSnapshot {
    if (this.closed || !isAbsolute(cwd) || cwd.includes("\0") || /^[/\\]{2}/.test(cwd)) return EMPTY_WORKSPACE
    if (process.platform === "win32" && !/^[a-z]:[/\\]/i.test(cwd)) return EMPTY_WORKSPACE
    let entry = this.entries.get(cwd)
    if (entry) {
      this.entries.delete(cwd)
      this.entries.set(cwd, entry)
    }
    if (entry?.pending || (entry && entry.expires > Date.now()) || this.pending >= maxRefreshing) {
      return entry?.snapshot ?? EMPTY_WORKSPACE
    }
    if (!entry) {
      if (this.entries.size >= maxEntries) {
        for (const [key, candidate] of this.entries) {
          if (candidate.pending) continue
          this.entries.delete(key)
          break
        }
      }
      entry = { snapshot: EMPTY_WORKSPACE, expires: 0 }
      this.entries.set(cwd, entry)
    }
    this.schedule(cwd, entry)
    return entry.snapshot
  }

  private schedule(cwd: string, entry: Entry) {
    const controller = new AbortController()
    entry.pending = controller
    this.pending++
    // The stdio server serializes and writes the reply before this callback runs.
    setImmediate(async () => {
      const deadline = setTimeout(() => controller.abort(), refreshBudgetMs)
      try {
        entry.snapshot = await collect(cwd, controller.signal)
      } catch {
        entry.snapshot = EMPTY_WORKSPACE
      } finally {
        clearTimeout(deadline)
        entry.expires = Date.now() + freshnessMs
        entry.pending = undefined
        this.pending--
      }
    })
  }

  close() {
    this.closed = true
    for (const entry of this.entries.values()) entry.pending?.abort()
    this.entries.clear()
  }
}
