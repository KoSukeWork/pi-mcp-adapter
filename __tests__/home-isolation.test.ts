import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { REAL_PI_AGENT_DIR, restoreHomeEnv, setTestHome, snapshotHomeEnv } from "./test-home.ts";

describe("Windows-safe home isolation", () => {
  const originalHomeEnv = snapshotHomeEnv();
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreHomeEnv(originalHomeEnv);
    process.chdir(originalCwd);
  });

  it("does not resolve Pi agent paths under the live user profile", async () => {
    delete process.env.PI_CODING_AGENT_DIR;
    const { getAgentDir, getAgentPath } = await import("../agent-dir.ts");
    const { getOnboardingStatePath } = await import("../onboarding-state.ts");
    const { getPiGlobalConfigPath } = await import("../config.ts");

    expect(getAgentDir()).not.toBe(REAL_PI_AGENT_DIR);
    expect(getAgentPath("mcp.json")).not.toBe(join(REAL_PI_AGENT_DIR, "mcp.json"));
    expect(getOnboardingStatePath()).not.toBe(join(REAL_PI_AGENT_DIR, "mcp-onboarding.json"));
    expect(getPiGlobalConfigPath()).not.toBe(join(REAL_PI_AGENT_DIR, "mcp.json"));
  });

  it("setTestHome redirects agent writes away from a Windows USERPROFILE canary", async () => {
    const canaryHome = mkdtempSync(join(tmpdir(), "pi-mcp-canary-home-"));
    const canaryAgentDir = join(canaryHome, ".pi", "agent");
    mkdirSync(canaryAgentDir, { recursive: true });
    const canaryConfig = join(canaryAgentDir, "mcp.json");
    const canaryOnboarding = join(canaryAgentDir, "mcp-onboarding.json");
    writeFileSync(canaryConfig, `${JSON.stringify({ mcpServers: {}, imports: [] }, null, 2)}\n`);
    writeFileSync(canaryOnboarding, `${JSON.stringify({ version: 1, sharedConfigHintShown: false, setupCompleted: false }, null, 2)}\n`);

    process.env.USERPROFILE = canaryHome;
    process.env.HOME = mkdtempSync(join(tmpdir(), "pi-mcp-unix-only-home-"));
    delete process.env.HOMEDRIVE;
    delete process.env.HOMEPATH;
    delete process.env.PI_CODING_AGENT_DIR;

    const testHome = mkdtempSync(join(tmpdir(), "pi-mcp-isolated-home-"));
    const project = mkdtempSync(join(tmpdir(), "pi-mcp-isolated-project-"));
    setTestHome(testHome);
    process.chdir(project);

    const { ensureCompatibilityImports, getPiGlobalConfigPath } = await import("../config.ts");
    const written = ensureCompatibilityImports(["cursor", "codex"]);
    expect(written.path).toBe(getPiGlobalConfigPath());
    expect(written.path.startsWith(testHome)).toBe(true);
    expect(JSON.parse(readFileSync(written.path, "utf-8")).imports).toEqual(["cursor", "codex"]);

    const { markSetupCompleted, getOnboardingStatePath } = await import("../onboarding-state.ts");
    markSetupCompleted("second");
    expect(getOnboardingStatePath().startsWith(testHome)).toBe(true);
    expect(JSON.parse(readFileSync(getOnboardingStatePath(), "utf-8")).lastDiscoveryFingerprint).toBe("second");

    expect(JSON.parse(readFileSync(canaryConfig, "utf-8"))).toEqual({ mcpServers: {}, imports: [] });
    expect(JSON.parse(readFileSync(canaryOnboarding, "utf-8"))).toEqual({
      version: 1,
      sharedConfigHintShown: false,
      setupCompleted: false,
    });
  });
});
