import { expect, test } from "bun:test"
import { execFileSync, spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import { resourceUri } from "../protocol.ts"

const entry = fileURLToPath(new URL("../server.ts", import.meta.url))
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-C", cwd, "-c", "user.name=test", "-c", "user.email=test@example.org", ...args])

function workspace() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "koko-git-")))
  const repo = join(root, "main")
  git(root, "init", "-q", "-b", "first-branch", repo)
  git(repo, "commit", "-q", "--allow-empty", "-m", "initial")
  return { root, repo }
}

function provider(cwd: string, env: NodeJS.ProcessEnv = process.env) {
  const child = spawn(process.execPath, [entry], { cwd, env, stdio: ["pipe", "pipe", "pipe"] })
  const closed = once(child, "close")
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
  let seq = 0
  async function read(directory: string, thread = "session-A") {
    const id = ++seq
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method: "resources/read", params: {
      uri: resourceUri, _meta: { "com.openai/codex-statusline-state": {
        thread: { id: thread, workspace: { cwd: directory }, model: { display_name: "Model" } },
      } },
    } }) + "\n")
    const line = await lines.next()
    if (line.done) throw new Error("unexpected provider EOF")
    const response = JSON.parse(line.value)
    expect(response.id).toBe(id)
    return response.result.contents[0].text as string
  }
  return { child, closed, read }
}

async function until(check: () => boolean | Promise<boolean>, ms = 2_000) {
  const deadline = performance.now() + ms
  while (performance.now() < deadline) {
    if (await check()) return
    await Bun.sleep(15)
  }
  throw new Error("workspace condition did not become true")
}

test("loads only the displayed local workspace, refreshes stale Git, and evicts old directories", async () => {
  const { root, repo } = workspace()
  // Simulate a server launched with a different repository already selected by its Git environment.
  const p = provider(repo, { ...process.env, GIT_DIR: join(repo, ".git"), GIT_WORK_TREE: repo })
  try {
    for (const cwd of ["", ".", "ssh://other/repo", join(root, "missing"), root]) {
      expect(await p.read(cwd)).not.toContain("first-branch")
    }
    expect(await p.read(repo)).not.toContain("first-branch")
    await until(async () => (await p.read(repo)).includes("first-branch"))
    for (const cwd of ["", ".", "ssh://other/repo", join(root, "missing"), root]) {
      expect(await p.read(cwd)).not.toContain("first-branch")
    }
    git(repo, "branch", "-m", "changed-branch")
    expect(await p.read(repo)).toContain("first-branch")
    await until(async () => (await p.read(repo)).includes("changed-branch"), 5_000)
    for (let n = 0; n < 16; n++) {
      const subdir = join(repo, "sub-" + n)
      mkdirSync(subdir)
      await until(async () => (await p.read(subdir)).includes("changed-branch"))
    }
    expect(await p.read(repo)).not.toContain("changed-branch")
    await until(async () => (await p.read(repo)).includes("changed-branch"))
  } finally {
    p.child.stdin.end()
    await p.closed
    rmSync(root, { recursive: true, force: true })
  }
}, 15_000)

// The shell shims below hold real Git's response open across reads and record process lifetime.
test.skipIf(process.platform === "win32")("keeps independent reads responsive during slow and failing Git, and enriches linked worktrees only", async () => {
  const { root, repo } = workspace()
  const linked = join(root, "linked")
  git(repo, "worktree", "add", "-q", "-b", "second-branch", linked)
  const bin = join(root, "bin")
  mkdirSync(bin)
  const gate = join(root, "gate"), calls = join(root, "calls"), wtCalls = join(root, "wt-calls")
  const gitPath = Bun.which("git")!
  writeFileSync(join(bin, "git"), `#!/bin/sh
echo "$PWD $*" >> "$CALLS"
if [ "$PWD" = "$SLOW" ] && [ ! -f "$GATE" ]; then
  while [ ! -f "$GATE" ]; do sleep 0.02; done
fi
exec "$REAL_COMMAND" "$@"
`, { mode: 0o755 })
  writeFileSync(join(bin, "wt"), `#!/bin/sh
echo "$PWD" >> "$WT_CALLS"
echo '{"items":[{"worktree":{"current":true},"marker":"linked-marker"}]}'
`, { mode: 0o755 })
  const p = provider(root, { ...process.env, PATH: bin + delimiter + process.env.PATH,
    REAL_COMMAND: gitPath, SLOW: repo, CALLS: calls, GATE: gate, WT_CALLS: wtCalls })
  try {
    expect(await p.read(repo)).toContain("session-A")
    await until(() => existsSync(calls))
    const start = performance.now()
    for (let n = 0; n < 5; n++) expect(await p.read(repo)).not.toContain("first-branch")
    expect(performance.now() - start).toBeLessThan(1000)
    expect(readFileSync(calls, "utf8").trim().split("\n")).toHaveLength(1)
    expect(await p.read(linked, "session-B")).not.toContain("first-branch")
    await until(async () => (await p.read(linked, "session-B")).includes("linked-marker"))
    writeFileSync(gate, "")
    await until(async () => (await p.read(repo)).includes("first-branch"))
    const selected = await p.read(linked, "session-B")
    expect(selected).toContain("second-branch")
    expect(selected).not.toContain("first-branch")
    expect(selected).not.toContain("session-A")
    expect(readFileSync(wtCalls, "utf8").trim().split("\n")).toEqual([linked])
    // A real failing rev-parse in a non-repository is cached, too.
    expect(await p.read(root)).toContain("session-A")
    await until(() => readFileSync(calls, "utf8").includes(root + " --no-optional-locks"))
    await Bun.sleep(60)
    expect(await p.read(root)).not.toContain("branch")
    expect(readFileSync(calls, "utf8").split("\n").filter(line => line.startsWith(root + " "))).toHaveLength(1)
  } finally {
    p.child.stdin.end()
    await p.closed
    rmSync(root, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === "win32")("timeout and EOF cancel the in-flight Git process group", async () => {
  const { root, repo } = workspace()
  const shim = join(root, "git")
  writeFileSync(shim, `#!/bin/sh
sleep 30 &
echo $! >> "$PIDS"
wait
`, { mode: 0o755 })
  const pids = join(root, "pids")
  const p = provider(root, { ...process.env, PATH: root + delimiter + process.env.PATH, PIDS: pids })
  function stopped(pid: number) {
    try { process.kill(pid, 0); return false } catch { return true }
  }
  try {
    await p.read(repo)
    await until(() => existsSync(pids))
    const first = Number(readFileSync(pids, "utf8").trim())
    await until(() => stopped(first), 3_000)
    expect(await p.read(repo)).toContain("session-A")
    await p.read(root)
    await until(() => readFileSync(pids, "utf8").trim().split("\n").length === 2)
    const second = Number(readFileSync(pids, "utf8").trim().split("\n")[1])
    p.child.stdin.end()
    expect((await p.closed)[0]).toBe(0)
    await until(() => stopped(second))
  } finally {
    p.child.kill()
    await p.closed
    rmSync(root, { recursive: true, force: true })
  }
}, 8_000)
