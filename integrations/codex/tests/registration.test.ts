import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { registration } from "../registration.ts"
import { settings, setValue, valueAt } from "../registration-toml.ts"

const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "koko-register-"))
  folders.push(dir)
  const home = join(dir, "custom Codex home")
  const cwd = join(dir, "project")
  const user = join(dir, "user")
  for (const path of [home, cwd, user]) mkdirSync(path)
  const config = join(home, "config.toml")
  const binaryDir = join(dir, "bin")
  mkdirSync(binaryDir)
  function fakeCodex(version: string) {
    writeFileSync(join(binaryDir, "codex"), "#!/bin/sh\necho 'codex-cli " + version + "'\n", { mode: 0o700 })
  }
  fakeCodex("0.172.0")
  const env = { HOME: user, CODEX_HOME: home, PATH: binaryDir + ":" + process.env.PATH }
  const cli = (action: string, overrides = {}) => spawnSync(process.execPath,
    [join(import.meta.dir, "../register.ts"), action], { env: { ...env, ...overrides }, cwd, encoding: "utf8" })
  const run = (action: "install" | "remove" | "preview", onJournal?: () => void) =>
    registration(action, home, '/opt/Bun "nightly"/bun', '/checkout with space/server.ts', onJournal)
  const read = () => readFileSync(config, "utf8")
  return { home, cwd, config, cli, run, read, fakeCodex }
}

test("preview, diagnose, install and remove through the public command using a custom Codex home", () => {
  const { home, cwd, config, cli, read, fakeCodex } = fixture()
  const original = '# personal\nmodel = "test"\n[features]\ntui_extensions_statusline = false # choice\n[tui.status_line_provider]\nserver = "prior" # original\ntool = "footer"\n'
  writeFileSync(config, original)
  expect(cli("preview").stdout).toContain("Set mcp_servers.koko-statusline")
  expect(cli("doctor").stdout).toContain("disabled")
  expect(readdirSync(home)).toEqual(["config.toml"])
  expect(read()).toBe(original)
  expect(cli("install").status).toBe(0)
  const installed = read()
  expect(installed).toContain('server = "koko-statusline" # original')
  expect(cli("doctor").status).toBe(0)
  const mtime = statSync(config).mtimeMs
  expect(cli("install").stdout).toContain("already registered")
  expect(statSync(config).mtimeMs).toBe(mtime)
  expect(read()).toBe(installed)

  mkdirSync(join(cwd, ".codex"))
  writeFileSync(join(cwd, ".codex/config.toml"), '[mcp_servers.koko-statusline]\ncommand = "elsewhere"\n')
  fakeCodex("0.170.0")
  const result = cli("doctor")
  expect(result.status).toBe(1)
  expect(result.stdout).toContain("Unsupported Codex version")
  expect(result.stdout).toContain("Project-level")
  expect(cli("install").status).toBe(1)
  expect(read()).toBe(installed)
  expect(cli("install", { CODEX_HOME: join(cwd, ".codex") }).stderr).toContain("Wrong configuration scope")
  expect(cli("remove").status).toBe(0)
  expect(read()).toBe(original)
})

test("restores an existing inline provider, preserves unrelated TOML and quotes executable paths", () => {
  const { config, read, run } = fixture()
  const initial = 'features = { other = true }\n[tui]\nstatus_line_provider = { server = "prior", tool = "old" } # picker\n[other]\nlarge = 9223372036854775807\ntext = """\n[features]\n"""\n'
  writeFileSync(config, initial)
  run("install")
  expect(valueAt(read(), settings.server)).toEqual({ command: '/opt/Bun "nightly"/bun', args: ['/checkout with space/server.ts'] })
  expect(read()).toContain("# picker")
  writeFileSync(config, read() + "extra = 42 # new preference\n")
  run("remove")
  expect(valueAt(read(), settings.selection)).toEqual({ server: "prior", tool: "old" })
  expect(read()).toContain("# picker")
  expect(read()).toContain("large = 9223372036854775807")
  expect(read()).toContain("extra = 42 # new preference")
  expect(valueAt(read(), ["features", "other"])).toBe(true)
})

test("refuses conflicting identities and preserves a user's intervening provider and executable", () => {
  const { home, config, cli, read, run } = fixture()
  const initial = '[mcp_servers.koko-statusline]\ncommand = "/missing"\n'
  writeFileSync(config, initial)
  expect(cli("doctor").stdout).toContain("executable is unavailable")
  expect(cli("install").stderr).toContain("Conflicting server identity")
  expect(readdirSync(home)).toEqual(["config.toml"])
  expect(read()).toBe(initial)
  writeFileSync(config, '[mcp_servers.other]\ncommand = "keep"\n')
  run("install")
  let changed = setValue(read(), "selection", { server: "other", tool: "pick" })
  changed = changed.replace('"/opt/Bun \\"nightly\\"/bun"', '"/user/bun"')
  writeFileSync(config, changed)
  run("remove")
  expect(read()).toBe(changed)
})

test("uninstall leaves preexisting matching values and restores the previous built-in selection", () => {
  const { config, read, run } = fixture()
  const initial = 'features.tui_extensions_statusline = true\n[tui]\nstatus_line_provider = "default" # keep\n'
  writeFileSync(config, initial)
  run("install")
  run("remove")
  expect(read()).toBe(initial)
})

test("journal recovers both interrupted install and remove and detects competing config edits", () => {
  const { config, home, read, run } = fixture()
  const crash = () => { throw new Error("interrupted") }
  expect(() => run("install", crash)).toThrow("interrupted")
  expect(existsSync(config)).toBe(false)
  expect(run("install").join()).toContain("Recovered")
  const installed = read()
  expect(() => run("remove", crash)).toThrow("interrupted")
  expect(read()).toBe(installed)
  run("remove")
  expect(readdirSync(home)).toEqual([])
  expect(() => run("install", () => writeFileSync(config, "# concurrent user edit\n"))).toThrow("changed")
  expect(() => run("install")).toThrow("interrupted")
  expect(read()).toBe("# concurrent user edit\n")
})

test("a malformed or unfamiliar config fails before any user setting is written", () => {
  const { home, config, run, read } = fixture()
  writeFileSync(config, 'features = "wrong shape"\n')
  expect(() => run("install")).toThrow()
  expect(read()).toBe('features = "wrong shape"\n')
  expect(readdirSync(home)).toEqual(["config.toml"])
})

test("rejects a project Codex home in another repository before creating anything", () => {
  const { cwd, cli } = fixture()
  mkdirSync(join(cwd, ".git"))
  const other = join(cwd, "..", "other-worktree")
  mkdirSync(other)
  // Linked worktrees have a .git file.
  writeFileSync(join(other, ".git"), "gitdir: elsewhere\n")
  const destination = join(other, ".codex")
  for (const action of ["preview", "install", "doctor", "remove"]) {
    const result = cli(action, { CODEX_HOME: destination })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Wrong configuration scope")
    expect(existsSync(destination)).toBe(false)
  }
})

test("doctor reports feature and selection overrides for the intended workspace", () => {
  const { cwd, cli, read } = fixture()
  expect(cli("install").status).toBe(0)
  const installed = read()
  mkdirSync(join(cwd, ".git"))
  mkdirSync(join(cwd, ".codex"))
  const project = join(cwd, ".codex/config.toml")
  const override = 'features.tui_extensions_statusline = false\ntui.status_line_provider = "default"\n'
  writeFileSync(project, override)
  const result = cli("doctor")
  expect(result.status).toBe(1)
  expect(result.stdout).toContain("disabled by project configuration")
  expect(result.stdout).toContain("selects a different status line")
  expect(read()).toBe(installed)
  expect(readFileSync(project, "utf8")).toBe(override)
})

test("public removal preserves user comments inside an expanded server's arguments", () => {
  const { config, read, cli } = fixture()
  expect(cli("install").status).toBe(0)
  const server = valueAt(read(), settings.server) as { command: string; args: string[] }
  const withoutServer = setValue(read(), "server", undefined)
  const block = '[mcp_servers.koko-statusline]\ncommand = ' + JSON.stringify(server.command)
    + '\nargs = [\n  # owned by the workspace maintainer\n  ' + JSON.stringify(server.args[0]) + '\n]\n'
  writeFileSync(config, withoutServer + block)
  const removed = cli("remove")
  expect(removed.status).toBe(0)
  expect(removed.stdout).toContain("with user comments")
  expect(read()).toContain(block)
  expect(valueAt(read(), settings.selection)).toBeUndefined()
})
