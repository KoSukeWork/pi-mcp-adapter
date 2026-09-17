import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const FIXED_ENV_KEYS = ["HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "PI_PACKAGE_DIR"] as const;
const CODING_AGENT_DIR_SUFFIX = "_CODING_AGENT_DIR";

export type HomeEnvSnapshot = {
  values: Record<string, string>;
  codingAgentDirKeys: string[];
};

/**
 * Real homedir observed when this helper is first imported. Vitest loads
 * `__tests__/vitest.setup.ts` before tests, so this is the live user profile
 * rather than an isolated test home.
 */
export const REAL_HOMEDIR = homedir();
export const REAL_PI_AGENT_DIR = resolve(join(REAL_HOMEDIR, ".pi", "agent"));

function codingAgentDirKeys(): string[] {
  return Object.keys(process.env).filter((key) => key.endsWith(CODING_AGENT_DIR_SUFFIX));
}

export function snapshotHomeEnv(): HomeEnvSnapshot {
  const agentDirKeys = codingAgentDirKeys();
  const values: Record<string, string> = {};
  for (const key of [...FIXED_ENV_KEYS, ...agentDirKeys]) {
    const value = process.env[key];
    if (value !== undefined) values[key] = value;
  }
  return { values, codingAgentDirKeys: agentDirKeys };
}

export function restoreHomeEnv(snapshot: HomeEnvSnapshot): void {
  const keys = new Set<string>([
    ...FIXED_ENV_KEYS,
    ...codingAgentDirKeys(),
    ...snapshot.codingAgentDirKeys,
  ]);
  for (const key of keys) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(snapshot.values)) {
    process.env[key] = value;
  }
}

/**
 * Point Unix `HOME`, Windows `os.homedir()` (`USERPROFILE`), and Pi's
 * higher-precedence agent-dir override at `home`. Stubbing only `HOME` does
 * not move `os.homedir()` on Windows, while leaving `*_CODING_AGENT_DIR`
 * intact can still route writes into a live rebranded host profile.
 */
export function setTestHome(home: string): string {
  for (const key of codingAgentDirKeys()) {
    delete process.env[key];
  }
  delete process.env.PI_PACKAGE_DIR;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.HOMEDRIVE;
  delete process.env.HOMEPATH;
  process.env.PI_CODING_AGENT_DIR = join(home, ".pi", "agent");
  return home;
}

export function makeTestHome(prefix = "pi-mcp-home-"): string {
  return setTestHome(mkdtempSync(join(tmpdir(), prefix)));
}

export function removeTestHome(home: string): void {
  try {
    rmSync(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    // Best effort: Windows scanners or delayed child shutdown may briefly hold files.
  }
}
