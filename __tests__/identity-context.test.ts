import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_MAIL_IDENTITY_META_KEY,
  consumeSensitiveBrowserAction,
  mergeTrustedConversationMeta,
} from "../identity-context.ts";
import { clearAllCredentials, resetTestAuthSecretStore } from "../mcp-auth.ts";
import type { McpExtensionState } from "../state.ts";
import { createDirectToolExecutor } from "../direct-tools.ts";
import { executeCall } from "../proxy-modes.ts";

function state(conversationUid: string, openBrowser = vi.fn(async () => {})): McpExtensionState {
  return {
    conversationUid,
    agentMailClientIdentities: new Map(),
    authStorageOptions: {},
    config: {
      mcpServers: {
        "agent-mail": { command: "agent-mail-server" },
        "agent-mail-a": { command: "agent-mail-server-a" },
        "agent-mail-b": { command: "agent-mail-server-b" },
        "other-server": { command: "other-server" },
        alpha: { command: "alpha-server" },
      },
    },
    openBrowser,
  } as unknown as McpExtensionState;
}

function executionState(callTool: ReturnType<typeof vi.fn>): McpExtensionState {
  const runtime = state("session-execution-0001");
  return {
    ...runtime,
    config: {
      settings: { toolPrefix: "server" },
      mcpServers: { demo: { command: "node", args: ["server.js"] } },
    },
    manager: {
      getConnection: vi.fn(() => ({ status: "connected", client: { callTool }, tools: [], resources: [] })),
      getRequestOptions: vi.fn(() => undefined),
      touch: vi.fn(),
      incrementInFlight: vi.fn(),
      decrementInFlight: vi.fn(),
    },
    toolMetadata: new Map([["demo", [{ name: "demo_identity", originalName: "identity", description: "Identity" }]]]),
    serverInstructions: new Map(),
    failureTracker: new Map(),
    completedUiSessions: [],
    ui: undefined,
  } as unknown as McpExtensionState;
}

describe("trusted MCP Agent Mail identity context", () => {
  beforeEach(() => {
    process.env.PI_MCP_ADAPTER_TEST_AUTH_STORE = "memory";
    process.env.PI_MCP_ADAPTER_DISABLE_AUTH_CACHE = "1";
    resetTestAuthSecretStore();
  });

  afterEach(() => {
    delete process.env.PI_MCP_ADAPTER_TEST_AUTH_STORE;
    delete process.env.PI_MCP_ADAPTER_DISABLE_AUTH_CACHE;
    resetTestAuthSecretStore();
    vi.restoreAllMocks();
  });

  it("reuses a server client credential while binding distinct Pi conversations", () => {
    const first = mergeTrustedConversationMeta(state("session-alpha-0001"), "agent-mail", {
      "ui/key": "kept",
      [AGENT_MAIL_IDENTITY_META_KEY]: { client_uid: "forged" },
    });
    const second = mergeTrustedConversationMeta(state("session-beta-0002"), "agent-mail");
    const firstIdentity = first?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;
    const secondIdentity = second?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;

    expect(first?.["ui/key"]).toBe("kept");
    expect(firstIdentity.client_uid).toBe(secondIdentity.client_uid);
    expect(firstIdentity.client_uid).not.toBe("forged");
    expect(firstIdentity.client_secret).toBe(secondIdentity.client_secret);
    expect(firstIdentity.conversation_uid).toBe("session-alpha-0001");
    expect(secondIdentity.conversation_uid).toBe("session-beta-0002");
    expect(firstIdentity.capabilities).toEqual(["browser_confirmation"]);
  });

  it("strips forged identity metadata when no trusted conversation exists", () => {
    const runtime = state("   ");
    const meta = mergeTrustedConversationMeta(runtime, "agent-mail", {
      "ui/key": "kept",
      [AGENT_MAIL_IDENTITY_META_KEY]: { client_uid: "forged" },
    });

    expect(meta).toEqual({ "ui/key": "kept" });
  });

  it("uses independent credentials for independent MCP servers", () => {
    const runtime = state("session-alpha-0001");
    const first = mergeTrustedConversationMeta(runtime, "agent-mail-a");
    const second = mergeTrustedConversationMeta(runtime, "agent-mail-b");
    const firstIdentity = first?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;
    const secondIdentity = second?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;

    expect(firstIdentity.client_uid).not.toBe(secondIdentity.client_uid);
    expect(firstIdentity.client_secret).not.toBe(secondIdentity.client_secret);
  });

  it("rotates credentials when a configured server is repointed", () => {
    const firstState = state("session-alpha-0001");
    const first = mergeTrustedConversationMeta(firstState, "agent-mail")!;
    const firstIdentity = first[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;
    const secondState = state("session-beta-0001");
    secondState.config.mcpServers["agent-mail"] = { url: "https://different.example/mcp" };
    const second = mergeTrustedConversationMeta(secondState, "agent-mail")!;
    const secondIdentity = second[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;

    expect(secondIdentity.client_uid).not.toBe(firstIdentity.client_uid);
    expect(secondIdentity.client_secret).not.toBe(firstIdentity.client_secret);
  });

  it("keeps the client principal stable when OAuth credentials are cleared", () => {
    const first = mergeTrustedConversationMeta(state("session-alpha-0001"), "agent-mail");
    const firstIdentity = first?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;

    clearAllCredentials("agent-mail");
    const second = mergeTrustedConversationMeta(state("session-beta-0002"), "agent-mail");
    const secondIdentity = second?.[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;

    expect(secondIdentity.client_uid).toBe(firstIdentity.client_uid);
    expect(secondIdentity.client_secret).toBe(firstIdentity.client_secret);
  });

  it("injects trusted metadata through direct tool calls", async () => {
    const callTool = vi.fn(async () => ({ content: [{ type: "text", text: "ok" }] }));
    const runtime = executionState(callTool);
    const execute = createDirectToolExecutor(
      () => runtime,
      () => null,
      { serverName: "demo", originalName: "identity", prefixedName: "demo_identity", description: "Identity" },
    );

    await execute("call-1", {}, undefined, undefined, {} as never);

    const request = callTool.mock.calls[0]?.[0] as Record<string, unknown>;
    const meta = request._meta as Record<string, unknown>;
    const identity = meta[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;
    expect(identity.conversation_uid).toBe("session-execution-0001");
    expect(identity.client_secret).toEqual(expect.any(String));
  });

  it("consumes sensitive browser actions in the direct tool path", async () => {
    const secretUrl = "http://localhost:8765/identity/confirm/request#challenge=direct-secret";
    const action = { type: "open_browser", url: secretUrl, sensitive: true } as const;
    const callTool = vi.fn(async () => ({
      structuredContent: { status: "pending", _client_action: action },
      content: [{ type: "text", text: JSON.stringify({ status: "pending", _client_action: action }) }],
    }));
    const runtime = executionState(callTool);
    const openBrowser = vi.fn(async () => {});
    runtime.openBrowser = openBrowser;
    const execute = createDirectToolExecutor(
      () => runtime,
      () => null,
      { serverName: "demo", originalName: "identity", prefixedName: "demo_identity", description: "Identity" },
    );

    const result = await execute("call-1", {}, undefined, undefined, {} as never);

    expect(openBrowser).toHaveBeenCalledWith(secretUrl);
    expect(JSON.stringify(result)).not.toContain("direct-secret");
    expect(JSON.stringify(result)).toContain("client_action_handled");
  });

  it("injects trusted metadata through proxy and script-origin calls", async () => {
    const callTool = vi.fn(async () => ({ content: [{ type: "text", text: "ok" }] }));
    const runtime = executionState(callTool);

    await executeCall(runtime, "demo_identity", {}, undefined, undefined, undefined, "script");

    const request = callTool.mock.calls[0]?.[0] as Record<string, unknown>;
    const meta = request._meta as Record<string, unknown>;
    const identity = meta[AGENT_MAIL_IDENTITY_META_KEY] as Record<string, unknown>;
    expect(identity.conversation_uid).toBe("session-execution-0001");
    expect(identity.client_secret).toEqual(expect.any(String));
  });

  it("opens and removes a sensitive browser action before returning MCP content", async () => {
    const openBrowser = vi.fn(async () => {});
    const runtime = state("session-alpha-0001", openBrowser);
    const action = {
      type: "open_browser",
      url: "http://127.0.0.1:8765/identity/confirm/request#challenge=secret-value",
      sensitive: true,
    } as const;
    const result = await consumeSensitiveBrowserAction(runtime, {
      structuredContent: { result: { status: "pending", _client_action: action } },
      content: [{ type: "text", text: JSON.stringify([{ status: "pending", _client_action: action }]) }],
      details: { nested: { _client_action: action } },
    });

    expect(openBrowser).toHaveBeenCalledOnce();
    expect(openBrowser).toHaveBeenCalledWith(action.url);
    expect(JSON.stringify(result)).not.toContain("secret-value");
    expect(result.structuredContent.result.client_action_handled).toEqual({
      type: "open_browser",
      status: "opened",
    });
    expect(JSON.parse(result.content[0].text)[0].client_action_handled).toEqual({
      type: "open_browser",
      status: "opened",
    });
    expect(result.details.nested.client_action_handled).toEqual({ type: "open_browser", status: "opened" });
  });

  it("rejects unsafe browser schemes without leaking the URL to the error", async () => {
    const runtime = state("session-alpha-0001");
    const secretUrl = "http://example.test/confirm#challenge=must-not-leak";

    await expect(consumeSensitiveBrowserAction(runtime, {
      structuredContent: {
        _client_action: { type: "open_browser", url: secretUrl, sensitive: true },
      },
    })).rejects.not.toThrow("must-not-leak");
  });
});
