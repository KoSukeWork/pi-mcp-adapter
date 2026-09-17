import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOME_ENV_KEYS = ["HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH"] as const;

export type HomeEnvSnapshot = {
  HOME?: string;
  USERPROFILE?: string;
  HOMEDRIVE?: string;
  HOMEPATH?: string;
};

/**
 * Real homedir observed when this helper is first imported. Vitest loads
 * `__tests__/vitest.setup.ts` before tests, so this is the live user profile
 * rather than an isolated test home.
 */
export const REAL_HOMEDIR = homedir();
export const REAL_PI_AGENT_DIR = resolve(join(REAL_HOMEDIR, ".pi", "agent"));

export function snapshotHomeEnv(): HomeEnvSnapshot {
  const snapshot: HomeEnvSnapshot = {};
  for (const key of HOME_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) snapshot[key] = value;
  }
  return snapshot;
}

export function restoreHomeEnv(snapshot: HomeEnvSnapshot): void {
  for (const key of HOME_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/**
 * Point both Unix `HOME` and Windows `os.homedir()` (`USERPROFILE`) at `home`.
 * Stubbing only `HOME` does not move `os.homedir()` on Windows.
 */
export function setTestHome(home: string): string {
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.HOMEDRIVE;
  delete process.env.HOMEPATH;
  return home;
}

export function makeTestHome(prefix = "pi-mcp-home-"): string {
  return setTestHome(mkdtempSync(join(tmpdir(), prefix)));
}
