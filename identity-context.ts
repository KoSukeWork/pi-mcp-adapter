import { createHash } from "node:crypto";
import type { McpExtensionState } from "./state.ts";
import {
  OAuthCredentialStoreError,
  getOrCreateAgentMailClientIdentity,
} from "./mcp-auth.ts";

export const AGENT_MAIL_IDENTITY_META_KEY = "io.github.mcp-agent-mail/identity";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serverFingerprint(state: McpExtensionState, serverName: string): string {
  const server = state.config.mcpServers[serverName];
  if (!server) throw new Error(`Cannot create trusted MCP identity for unknown server ${serverName}`);
  const transportIdentity = server.url
    ? { transport: "http", url: server.url }
    : server.socket
      ? { transport: "socket", socket: server.socket }
      : {
          transport: "stdio",
          command: server.command ?? null,
          args: server.args ?? [],
          cwd: server.cwd ?? null,
        };
  return createHash("sha256")
    .update(JSON.stringify({ serverName, ...transportIdentity }), "utf8")
    .digest("hex");
}

/** Merge model-inaccessible client and Pi-session identity into an MCP request. */
export function mergeTrustedConversationMeta(
  state: McpExtensionState,
  serverName: string,
  requestMeta?: JsonObject,
): JsonObject | undefined {
  const forwardedMeta = requestMeta ? { ...requestMeta } : undefined;
  if (forwardedMeta) delete forwardedMeta[AGENT_MAIL_IDENTITY_META_KEY];
  const conversationUid = state.conversationUid?.trim();
  if (!conversationUid) return forwardedMeta;

  let identity = state.agentMailClientIdentities?.get(serverName);
  if (!identity) {
    try {
      identity = getOrCreateAgentMailClientIdentity(
        serverName,
        serverFingerprint(state, serverName),
        state.authStorageOptions,
      );
    } catch (error) {
      // A missing secure credential store must not make unrelated MCP servers
      // unusable. Agent Mail identity tools remain fail-closed because no
      // trusted namespace is injected.
      if (error instanceof OAuthCredentialStoreError) return forwardedMeta;
      throw error;
    }
    if (!state.agentMailClientIdentities) state.agentMailClientIdentities = new Map();
    state.agentMailClientIdentities.set(serverName, identity);
  }

  return {
    ...(forwardedMeta ?? {}),
    [AGENT_MAIL_IDENTITY_META_KEY]: {
      version: 1,
      client_uid: identity.clientUid,
      client_secret: identity.clientSecret,
      conversation_uid: conversationUid,
      client_label: "Pi MCP Adapter",
      capabilities: ["browser_confirmation"],
    },
  };
}

interface SensitiveBrowserAction {
  type: "open_browser";
  url: string;
  sensitive: true;
}

function readSensitiveBrowserAction(value: JsonObject): SensitiveBrowserAction | undefined {
  const action = value._client_action;
  if (!isObject(action)) return undefined;
  if (action.type !== "open_browser" || action.sensitive !== true || typeof action.url !== "string") {
    return undefined;
  }
  return { type: "open_browser", url: action.url, sensitive: true };
}

function sanitizedValue(value: unknown, urls: Set<string>): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    const children = value.map((item) => sanitizedValue(item, urls));
    const changed = children.some((child) => child.changed);
    return { value: changed ? children.map((child) => child.value) : value, changed };
  }
  if (!isObject(value)) return { value, changed: false };

  const action = readSensitiveBrowserAction(value);
  let changed = Object.hasOwn(value, "_client_action");
  const sanitized: JsonObject = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (key === "_client_action") continue;
    const child = sanitizedValue(childValue, urls);
    sanitized[key] = child.value;
    changed ||= child.changed;
  }
  if (action) {
    urls.add(action.url);
    sanitized.client_action_handled = { type: "open_browser", status: "opened" };
  }
  return { value: changed ? sanitized : value, changed };
}

function validatedBrowserUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("MCP browser confirmation returned an invalid URL.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("MCP browser confirmation URLs must not contain user credentials.");
  }
  const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new Error("MCP browser confirmation requires HTTPS or a loopback HTTP URL.");
  }
  return parsed.toString();
}

/**
 * Consume a sensitive browser action before MCP output reaches UI or model
 * history, returning a result with the secret-bearing action removed.
 */
export async function consumeSensitiveBrowserAction<T extends JsonObject>(
  state: McpExtensionState,
  result: T,
): Promise<T> {
  const urls = new Set<string>();
  const root = sanitizedValue(result, urls);
  const next = root.value as JsonObject;

  if (Array.isArray(next.content)) {
    const originalContent = next.content;
    const sanitizedContent = originalContent.map((block) => {
      if (!isObject(block) || block.type !== "text" || typeof block.text !== "string") return block;
      try {
        const parsed = JSON.parse(block.text) as unknown;
        const sanitized = sanitizedValue(parsed, urls);
        return sanitized.changed ? { ...block, text: JSON.stringify(sanitized.value) } : block;
      } catch {
        return block;
      }
    });
    if (sanitizedContent.some((block, index) => block !== originalContent[index])) {
      next.content = sanitizedContent;
    }
  }

  if (urls.size === 0) return result;
  if (urls.size !== 1) {
    throw new Error("MCP browser confirmation returned conflicting sensitive actions.");
  }
  const rawUrl = [...urls][0];
  if (!rawUrl) return result;
  const url = validatedBrowserUrl(rawUrl);
  try {
    await state.openBrowser(url);
  } catch {
    // Do not attach the original error as a cause: platform launchers may echo
    // the sensitive confirmation URL in their failure text.
    throw new Error("The MCP browser confirmation page could not be opened locally.");
  }
  return next as T;
}
