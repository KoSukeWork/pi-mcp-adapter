import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  REAL_PI_AGENT_DIR,
  removeTestHome,
  restoreHomeEnv,
  setTestHome,
  snapshotHomeEnv,
} from "./test-home.ts";

describe("Windows-safe home isolation", () => {
  const originalHomeEnv = snapshotHomeEnv();
  const originalCwd = process.cwd();
  let tempDirs: string[] = [];

  function tempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreHomeEnv(originalHomeEnv);
    process.chdir(originalCwd);
    for (const dir of tempDirs.reverse()) removeTestHome(dir);
    tempDirs = [];
  });

  it("does not resolve Pi agent paths under the live user profile", async () => {
    delete process.env.PI_CODING_AGENT_DIR;
    delete process.env.PI_PACKAGE_DIR;
    const { getAgentDir, getAgentPath } = await import("../agent-dir.ts");
    const { getOnboardingStatePath } = await import("../onboarding-state.ts");
    const { getPiGlobalConfigPath } = await import("../config.ts");

    expect(getAgentDir()).not.toBe(REAL_PI_AGENT_DIR);
    expect(getAgentPath("mcp.json")).not.toBe(join(REAL_PI_AGENT_DIR, "mcp.json"));
    expect(getOnboardingStatePath()).not.toBe(join(REAL_PI_AGENT_DIR, "mcp-onboarding.json"));
    expect(getPiGlobalConfigPath()).not.toBe(join(REAL_PI_AGENT_DIR, "mcp.json"));
  });

  it("redirects configured Pi and rebranded agent dirs away from canaries", async () => {
    const canaryHome = tempDir("pi-mcp-canary-home-");
    const canaryAgentDir = join(canaryHome, ".pi", "agent");
    mkdirSync(canaryAgentDir, { recursive: true });
    const canaryConfig = join(canaryAgentDir, "mcp.json");
    const canaryOnboarding = join(canaryAgentDir, "mcp-onboarding.json");
    writeFileSync(canaryConfig, `${JSON.stringify({ mcpServers: {}, marker: "must-survive" }, null, 2)}\n`);
    writeFileSync(canaryOnboarding, `${JSON.stringify({ version: 1, sharedConfigHintShown: false, setupCompleted: false }, null, 2)}\n`);

    const arcHome = tempDir("pi-mcp-arc-canary-home-");
    const arcAgentDir = join(arcHome, ".arc", "agent");
    mkdirSync(arcAgentDir, { recursive: true });
    const arcConfig = join(arcAgentDir, "mcp.json");
    writeFileSync(arcConfig, `${JSON.stringify({ mcpServers: {}, marker: "arc-must-survive" }, null, 2)}\n`);

    const packageDir = tempDir("pi-mcp-canary-package-");
    writeFileSync(join(packageDir, "package.json"), `${JSON.stringify({ piConfig: { name: "arc", configDir: ".arc" } }, null, 2)}\n`);

    process.env.USERPROFILE = canaryHome;
    process.env.HOME = tempDir("pi-mcp-unix-only-home-");
    delete process.env.HOMEDRIVE;
    delete process.env.HOMEPATH;
    process.env.PI_CODING_AGENT_DIR = canaryAgentDir;
    process.env.ARC_CODING_AGENT_DIR = arcAgentDir;
    process.env.PI_PACKAGE_DIR = packageDir;

    const testHome = tempDir("pi-mcp-isolated-home-");
    const project = tempDir("pi-mcp-isolated-project-");
    setTestHome(testHome);
    process.chdir(project);

    expect(process.env.PI_CODING_AGENT_DIR).toBe(join(testHome, ".pi", "agent"));
    expect(process.env.ARC_CODING_AGENT_DIR).toBeUndefined();
    expect(process.env.PI_PACKAGE_DIR).toBeUndefined();

    const { ensureCompatibilityImports, getPiGlobalConfigPath } = await import("../config.ts");
    const written = ensureCompatibilityImports(["cursor", "codex"]);
    expect(written.path).toBe(getPiGlobalConfigPath());
    expect(written.path.startsWith(testHome)).toBe(true);
    expect(JSON.parse(readFileSync(written.path, "utf-8")).imports).toEqual(["cursor", "codex"]);

    const { markSetupCompleted, getOnboardingStatePath } = await import("../onboarding-state.ts");
    markSetupCompleted("second");
    expect(getOnboardingStatePath().startsWith(testHome)).toBe(true);
    expect(JSON.parse(readFileSync(getOnboardingStatePath(), "utf-8")).lastDiscoveryFingerprint).toBe("second");

    expect(JSON.parse(readFileSync(canaryConfig, "utf-8"))).toEqual({ mcpServers: {}, marker: "must-survive" });
    expect(JSON.parse(readFileSync(canaryOnboarding, "utf-8"))).toEqual({
      version: 1,
      sharedConfigHintShown: false,
      setupCompleted: false,
    });
    expect(JSON.parse(readFileSync(arcConfig, "utf-8"))).toEqual({ mcpServers: {}, marker: "arc-must-survive" });
  });

  it("removes temporary homes after use", () => {
    const home = tempDir("pi-mcp-remove-home-");
    writeFileSync(join(home, "marker.txt"), "temporary");

    removeTestHome(home);

    expect(existsSync(home)).toBe(false);
  });
});
