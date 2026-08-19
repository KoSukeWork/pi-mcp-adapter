var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ui-stream-types.ts
import { z } from "zod";
function getVisualizationStreamEnvelope(structuredContent) {
  if (!structuredContent || typeof structuredContent !== "object" || Array.isArray(structuredContent)) {
    return void 0;
  }
  const candidate = structuredContent[UI_STREAM_STRUCTURED_CONTENT_KEY];
  const parsed = visualizationStreamEnvelopeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : void 0;
}
var UI_STREAM_HOST_CONTEXT_KEY, UI_STREAM_REQUEST_META_KEY, UI_STREAM_RESULT_PATCH_METHOD, SERVER_STREAM_RESULT_PATCH_METHOD, UI_STREAM_STRUCTURED_CONTENT_KEY, uiStreamModeSchema, visualizationStreamPhaseSchema, visualizationStreamFrameTypeSchema, visualizationStreamStatusSchema, looseRecordSchema, looseArraySchema, uiStreamHostContextSchema, visualizationStreamEnvelopeSchema, uiStreamCallToolResultSchema, uiStreamResultPatchNotificationSchema, serverStreamResultPatchNotificationSchema;
var init_ui_stream_types = __esm({
  "ui-stream-types.ts"() {
    "use strict";
    UI_STREAM_HOST_CONTEXT_KEY = "pi-mcp-adapter/stream";
    UI_STREAM_REQUEST_META_KEY = "pi-mcp-adapter/stream-token";
    UI_STREAM_RESULT_PATCH_METHOD = "notifications/pi-mcp-adapter/ui-result-patch";
    SERVER_STREAM_RESULT_PATCH_METHOD = "notifications/pi-mcp-adapter/result-patch";
    UI_STREAM_STRUCTURED_CONTENT_KEY = "pi-mcp-adapter/stream";
    uiStreamModeSchema = z.enum(["eager", "stream-first"]);
    visualizationStreamPhaseSchema = z.enum(["shell", "narrative", "structure", "detail", "settled"]);
    visualizationStreamFrameTypeSchema = z.enum(["patch", "checkpoint", "final"]);
    visualizationStreamStatusSchema = z.enum(["ok", "error"]);
    looseRecordSchema = z.record(z.string(), z.unknown());
    looseArraySchema = z.array(z.unknown());
    uiStreamHostContextSchema = z.object({
      mode: uiStreamModeSchema,
      streamId: z.string().min(1),
      intermediateResultPatches: z.boolean(),
      partialInput: z.boolean()
    });
    visualizationStreamEnvelopeSchema = z.object({
      streamId: z.string().min(1),
      sequence: z.number().int().nonnegative(),
      frameType: visualizationStreamFrameTypeSchema,
      phase: visualizationStreamPhaseSchema,
      status: visualizationStreamStatusSchema,
      message: z.string().optional(),
      spec: looseRecordSchema.optional(),
      checkpoint: looseRecordSchema.optional()
    });
    uiStreamCallToolResultSchema = z.object({
      content: looseArraySchema.optional(),
      structuredContent: looseRecordSchema.optional(),
      isError: z.boolean().optional(),
      _meta: looseRecordSchema.optional()
    }).passthrough();
    uiStreamResultPatchNotificationSchema = z.object({
      method: z.literal(UI_STREAM_RESULT_PATCH_METHOD),
      params: uiStreamCallToolResultSchema
    });
    serverStreamResultPatchNotificationSchema = z.object({
      method: z.literal(SERVER_STREAM_RESULT_PATCH_METHOD),
      params: z.object({
        streamToken: z.string().min(1),
        result: uiStreamCallToolResultSchema
      })
    });
  }
});

// types.ts
function extractUiPromptText(params) {
  if (params.type === "prompt" || params.prompt) {
    const prompt = params.prompt ?? String(params.message ?? "");
    return prompt || void 0;
  }
  if (params.role === "user" && Array.isArray(params.content)) {
    const text = params.content.map((block) => block && typeof block === "object" && "text" in block ? String(block.text ?? "") : "").filter(Boolean).join("\n\n");
    return text || void 0;
  }
  return void 0;
}
function parseUiPromptHandoff(prompt) {
  const newlineIndex = prompt.indexOf("\n");
  if (newlineIndex <= 0) {
    return void 0;
  }
  const intent = prompt.slice(0, newlineIndex).trim();
  const payloadText = prompt.slice(newlineIndex + 1).trim();
  if (!intent || !payloadText) {
    return void 0;
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(intent)) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(payloadText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return void 0;
    }
    return {
      intent,
      params: parsed,
      raw: prompt
    };
  } catch {
    return void 0;
  }
}
function createUiModelContextUpdate(params, maxChars = 12e3) {
  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== void 0)
  );
  if (Object.keys(payload).length === 0) return void 0;
  const serialized = JSON.stringify(payload);
  if (serialized.length <= maxChars) {
    return { payload, summary: serialized, truncated: false };
  }
  return {
    summary: `${serialized.slice(0, Math.max(0, maxChars - 1))}\u2026`,
    truncated: true
  };
}
function isServerDisabled(definition) {
  return definition?.disabled === true;
}
function sanitizeServerPrefix(serverName, preserveProviderValid = true) {
  const validCharacters = preserveProviderValid ? /^[A-Za-z0-9_-]$/ : /^[A-Za-z0-9]$/;
  return Array.from(
    serverName,
    (char) => validCharacters.test(char) ? char : `_${char.codePointAt(0).toString(16)}_`
  ).join("");
}
function getServerPrefix(serverName, mode) {
  if (mode === "none") return "";
  if (mode === "short") {
    let short = sanitizeServerPrefix(serverName.replace(/-?mcp$/i, ""));
    if (!short) short = "mcp";
    return short;
  }
  if (mode === "mcp") return `mcp__${sanitizeServerPrefix(serverName)}`;
  return sanitizeServerPrefix(serverName);
}
function formatToolName(toolName, serverName, prefix) {
  const p = getServerPrefix(serverName, prefix);
  const sanitized = toolName.replace(/\./g, "_");
  return p ? `${p}_${sanitized}` : sanitized;
}
function resolveToolPrefix(definition, globalPrefix) {
  return definition?.toolPrefix ?? globalPrefix ?? "server";
}
function sanitizePromptName(name) {
  const cleaned = name.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^[_-]+|[_-]+$/g, "");
  if (!cleaned) return "prompt";
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}
function formatPromptCommandName(promptName, serverName, prefix) {
  const serverPart = getServerPrefix(serverName, prefix) || sanitizeServerPrefix(serverName) || "server";
  return `mcp__${serverPart}__${sanitizePromptName(promptName)}`;
}
function getLegacyServerPrefix(serverName, mode) {
  if (mode === "none") return "";
  if (mode === "short") return sanitizeServerPrefix(serverName.replace(/-?mcp$/i, ""), false) || "mcp";
  if (mode === "mcp") return `mcp__${sanitizeServerPrefix(serverName, false)}`;
  return sanitizeServerPrefix(serverName, false);
}
function formatLegacyToolName(toolName, serverName, prefix) {
  const serverPrefix = getLegacyServerPrefix(serverName, prefix);
  const sanitizedToolName = toolName.replace(/[.-]/g, "_");
  return serverPrefix ? `${serverPrefix}_${sanitizedToolName}` : sanitizedToolName;
}
function getToolNameCandidates(toolName, serverName, prefix, includeLegacy = true) {
  const candidates = /* @__PURE__ */ new Set([
    toolName,
    formatToolName(toolName, serverName, prefix),
    formatToolName(toolName, serverName, "server"),
    formatToolName(toolName, serverName, "short"),
    formatToolName(toolName, serverName, "mcp")
  ]);
  if (includeLegacy) {
    const legacyToolName = toolName.replace(/-/g, "_");
    candidates.add(legacyToolName);
    candidates.add(formatToolName(legacyToolName, serverName, prefix));
    candidates.add(formatToolName(legacyToolName, serverName, "server"));
    candidates.add(formatToolName(legacyToolName, serverName, "short"));
    candidates.add(formatToolName(legacyToolName, serverName, "mcp"));
    candidates.add(formatLegacyToolName(toolName, serverName, prefix));
    candidates.add(formatLegacyToolName(toolName, serverName, "server"));
    candidates.add(formatLegacyToolName(toolName, serverName, "short"));
    candidates.add(formatLegacyToolName(toolName, serverName, "mcp"));
    candidates.add(formatToolName(toolName, serverName, prefix).replace(/-/g, "_"));
    candidates.add(formatToolName(toolName, serverName, "server").replace(/-/g, "_"));
    candidates.add(formatToolName(toolName, serverName, "short").replace(/-/g, "_"));
    candidates.add(formatToolName(toolName, serverName, "mcp").replace(/-/g, "_"));
  }
  return candidates;
}
function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
function createToolSelectorCandidateIndex(allCurrentCandidates, additionalCurrentCandidatesByToolName) {
  return {
    allCurrentCandidates,
    matchingCountByPattern: /* @__PURE__ */ new Map(),
    matcherByPattern: /* @__PURE__ */ new Map(),
    ...additionalCurrentCandidatesByToolName ? { additionalCurrentCandidatesByToolName } : {}
  };
}
function matchesToolPattern(candidates, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return false;
  for (const pattern of patterns) {
    if (typeof pattern !== "string") continue;
    if (!pattern.includes("*") && !pattern.includes("?") && candidates.has(pattern)) {
      return true;
    }
    if ((pattern.includes("*") || pattern.includes("?")) && [...candidates].some((candidate) => globToRegExp(pattern).test(candidate))) {
      return true;
    }
  }
  return false;
}
function indexHasOtherCurrentMatch(index, toolName, currentCandidates, pattern) {
  const additionalCandidates = index.additionalCurrentCandidatesByToolName?.get(toolName);
  const hasCandidate = (candidate) => index.allCurrentCandidates.has(candidate) || additionalCandidates?.has(candidate) === true;
  const isGlob = pattern.includes("*") || pattern.includes("?");
  if (!isGlob) {
    return hasCandidate(pattern) && !currentCandidates.has(pattern);
  }
  let matcher = index.matcherByPattern.get(pattern);
  if (!matcher) {
    matcher = globToRegExp(pattern);
    index.matcherByPattern.set(pattern, matcher);
  }
  let matchingCount = index.matchingCountByPattern.get(pattern);
  if (matchingCount === void 0) {
    matchingCount = 0;
    for (const candidate of index.allCurrentCandidates) {
      if (matcher.test(candidate)) matchingCount++;
    }
    index.matchingCountByPattern.set(pattern, matchingCount);
  }
  let totalMatchingCount = matchingCount;
  if (additionalCandidates) {
    for (const candidate of additionalCandidates) {
      if (!index.allCurrentCandidates.has(candidate) && matcher.test(candidate)) totalMatchingCount++;
    }
  }
  if (totalMatchingCount === 0) return false;
  let currentMatchingCount = 0;
  for (const candidate of currentCandidates) {
    if (hasCandidate(candidate) && matcher.test(candidate)) currentMatchingCount++;
  }
  return totalMatchingCount > currentMatchingCount;
}
function matchesToolSelector(toolName, serverName, prefix, patterns, otherCurrentCandidates) {
  if (!Array.isArray(patterns) || patterns.length === 0) return false;
  const currentCandidates = getToolNameCandidates(toolName, serverName, prefix, false);
  if (matchesToolPattern(currentCandidates, patterns)) return true;
  if (!otherCurrentCandidates) return matchesToolPattern(getToolNameCandidates(toolName, serverName, prefix), patterns);
  const legacyCandidates = getToolNameCandidates(toolName, serverName, prefix);
  for (const candidate of currentCandidates) legacyCandidates.delete(candidate);
  return patterns.some((pattern) => {
    if (typeof pattern !== "string" || !matchesToolPattern(legacyCandidates, [pattern])) return false;
    const hasCollision = otherCurrentCandidates instanceof Set ? matchesToolPattern(otherCurrentCandidates, [pattern]) : indexHasOtherCurrentMatch(otherCurrentCandidates, toolName, currentCandidates, pattern);
    return !hasCollision;
  });
}
function isToolIncluded(toolName, serverName, prefix, includeTools, otherCurrentCandidates) {
  if (!Array.isArray(includeTools) || includeTools.length === 0) return true;
  return matchesToolSelector(toolName, serverName, prefix, includeTools, otherCurrentCandidates);
}
function isToolExcluded(toolName, serverName, prefix, excludeTools, otherCurrentCandidates) {
  return matchesToolSelector(toolName, serverName, prefix, excludeTools, otherCurrentCandidates);
}
function isToolAllowed(toolName, serverName, prefix, includeTools, excludeTools, otherCurrentCandidates) {
  return isToolIncluded(toolName, serverName, prefix, includeTools, otherCurrentCandidates) && !isToolExcluded(toolName, serverName, prefix, excludeTools, otherCurrentCandidates);
}
var MCP_STATUS_EVENT, MCP_STATUS_SNAPSHOT_VERSION, MCP_TOOL_APPROVAL_REQUEST_EVENT;
var init_types = __esm({
  "types.ts"() {
    "use strict";
    init_ui_stream_types();
    MCP_STATUS_EVENT = "pi-mcp-adapter/status/v1";
    MCP_STATUS_SNAPSHOT_VERSION = 1;
    MCP_TOOL_APPROVAL_REQUEST_EVENT = "pi-mcp-adapter:tool-approval-request";
  }
});

// agent-dir.ts
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
function getConfigDirName() {
  const configDir = readPiConfig()?.configDir;
  return typeof configDir === "string" && configDir.trim() ? configDir.trim() : ".pi";
}
function getAgentDir() {
  const piConfig = readPiConfig();
  const name = piConfig?.name;
  const appName = typeof name === "string" && name.trim() ? name.trim() : "pi";
  const configured = process.env[`${appName.toUpperCase()}_CODING_AGENT_DIR`]?.trim();
  if (!configured) {
    return join(homedir(), getConfigDirName(), "agent");
  }
  if (configured === "~") {
    return homedir();
  }
  if (configured.startsWith("~/")) {
    return resolve(homedir(), configured.slice(2));
  }
  return resolve(configured);
}
function getAgentPath(...segments) {
  return join(getAgentDir(), ...segments);
}
function readPiConfig() {
  const dir = process.env.PI_PACKAGE_DIR?.trim();
  if (!dir) return void 0;
  try {
    const manifest = JSON.parse(readFileSync(join(resolve(dir), "package.json"), "utf8"));
    return manifest.piConfig;
  } catch {
    return void 0;
  }
}
function getAppName() {
  const name = readPiConfig()?.name;
  return typeof name === "string" && name.trim() ? name.trim() : "pi";
}
function getAppClientUri() {
  const uri = readPiConfig()?.clientUri;
  return typeof uri === "string" && uri.trim() ? uri.trim() : void 0;
}
var init_agent_dir = __esm({
  "agent-dir.ts"() {
    "use strict";
  }
});

// agent-plugin-loader.ts
import { existsSync, readFileSync as readFileSync2, statSync } from "node:fs";
import { isAbsolute, relative, resolve as resolve2, sep } from "node:path";
function loadAgentPluginConfigs(paths, cwd = process.cwd()) {
  const mcpServers = {};
  for (const pluginPath of getPluginPaths(paths)) {
    const loaded = loadAgentPluginMcpConfig(pluginPath, cwd);
    if (!loaded) continue;
    for (const [serverName, server2] of Object.entries(loaded.mcpServers)) {
      if (mcpServers[serverName]) {
        console.warn(`Agent Plugin at ${resolvePluginPath(pluginPath, cwd)} skips duplicate normalized MCP server ${serverName}`);
        continue;
      }
      mcpServers[serverName] = server2;
    }
  }
  return { mcpServers };
}
function getAgentPluginSummaries(paths, cwd = process.cwd()) {
  return getPluginPaths(paths).map((path2) => {
    const pluginRoot = resolvePluginPath(path2, cwd);
    const loaded = loadAgentPluginMcpConfig(path2, cwd);
    const manifest = loaded ? readPluginManifest(pluginRoot, false) : null;
    return {
      path: pluginRoot,
      ...manifest?.name ? { name: manifest.name } : {},
      serverCount: loaded ? Object.keys(loaded.mcpServers).length : 0
    };
  });
}
function getPluginPaths(paths) {
  return Array.isArray(paths) ? paths.filter((path2) => typeof path2 === "string") : [];
}
function loadAgentPluginMcpConfig(path2, cwd) {
  const pluginRoot = resolvePluginPath(path2, cwd);
  const manifest = readPluginManifest(pluginRoot, true);
  if (!manifest) return null;
  const mcpPath = resolve2(pluginRoot, "mcp.json");
  if (!existsSync(mcpPath)) return { mcpServers: {} };
  if (!statSync(mcpPath).isFile()) {
    console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: mcp.json is not a regular file`);
    return { mcpServers: {} };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync2(mcpPath, "utf8"));
  } catch (error) {
    console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: failed to parse mcp.json`, error);
    return { mcpServers: {} };
  }
  return translateAgentPluginMcpConfig(raw, manifest, pluginRoot);
}
function readPluginManifest(pluginRoot, report) {
  const manifestPath = resolve2(pluginRoot, "plugin.json");
  if (!existsSync(manifestPath)) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: missing plugin.json`);
    return null;
  }
  if (!statSync(manifestPath).isFile()) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: plugin.json is not a regular file`);
    return null;
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync2(manifestPath, "utf8"));
  } catch (error) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: failed to parse plugin.json`, error);
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: plugin.json must be an object`);
    return null;
  }
  const manifest = raw;
  for (const key of Object.keys(manifest)) {
    if (!PLUGIN_MANIFEST_FIELDS.has(key) && report) {
      console.warn(`Agent Plugin at ${pluginRoot} ignores unknown plugin.json field: ${key}`);
    }
  }
  if (manifest.$schema !== PLUGIN_SCHEMA) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: unsupported plugin.json $schema`);
    return null;
  }
  if (typeof manifest.name !== "string" || manifest.name.length < 1 || manifest.name.length > 64 || !PLUGIN_NAME_PATTERN.test(manifest.name)) {
    if (report) console.warn(`Agent Plugin at ${pluginRoot} is invalid: plugin.json name is invalid`);
    return null;
  }
  if (manifest.extensions !== void 0 && (!manifest.extensions || typeof manifest.extensions !== "object" || Array.isArray(manifest.extensions))) {
    if (report) console.warn(`Agent Plugin ${manifest.name} ignores non-object plugin.json extensions`);
  }
  return { name: manifest.name };
}
function translateAgentPluginMcpConfig(raw, manifest, pluginRoot) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: mcp.json must be an object`);
    return { mcpServers: {} };
  }
  const mcpConfig = raw;
  for (const key of Object.keys(mcpConfig)) {
    if (!MCP_CONFIG_FIELDS.has(key)) {
      console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: unknown top-level field ${key}`);
      return { mcpServers: {} };
    }
  }
  if (mcpConfig.$schema !== MCP_SCHEMA) {
    console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: unsupported mcp.json $schema`);
    return { mcpServers: {} };
  }
  if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== "object" || Array.isArray(mcpConfig.mcpServers)) {
    console.warn(`Agent Plugin ${manifest.name} has invalid MCP config: mcpServers must be an object`);
    return { mcpServers: {} };
  }
  const mcpServers = {};
  for (const [serverName, entry] of Object.entries(mcpConfig.mcpServers)) {
    const translated = translateAgentPluginServer(manifest, pluginRoot, serverName, entry);
    if (!translated) continue;
    const normalizedName = formatAgentPluginServerName(manifest.name, serverName);
    if (mcpServers[normalizedName]) {
      console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: normalized server name ${normalizedName} already exists`);
      continue;
    }
    mcpServers[normalizedName] = translated;
  }
  return { mcpServers };
}
function translateAgentPluginServer(manifest, pluginRoot, serverName, entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: entry must be an object`);
    return null;
  }
  const raw = entry;
  if (raw.type === "stdio") return translateStdioServer(manifest, pluginRoot, serverName, raw);
  if (raw.type === "streamable-http" || raw.type === "sse") return translateHttpServer(manifest, serverName, raw, raw.type);
  console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: unsupported type`);
  return null;
}
function translateStdioServer(manifest, pluginRoot, serverName, raw) {
  for (const key of Object.keys(raw)) {
    if (!STDIO_FIELDS.has(key)) return skipServer(manifest, serverName, `unknown field ${key}`);
  }
  if (typeof raw.command !== "string" || raw.command.length === 0) return skipServer(manifest, serverName, "command must be a non-empty string");
  if (!isBareCommand(raw.command) && !raw.command.startsWith("./")) return skipServer(manifest, serverName, "command must be bare or plugin-relative");
  const args = translateStringArray(raw.args, manifest, serverName, "args");
  if (args === null) return null;
  const env = translateEnv(raw.env, manifest, serverName);
  if (env === null) return null;
  const command = raw.command.startsWith("./") ? resolveContainedPath(pluginRoot, raw.command, pluginRoot) : raw.command;
  if (command === null) return skipServer(manifest, serverName, "command must stay inside the plugin directory");
  const pluginDataDir = getAgentPath("agent-plugin-data", manifest.name);
  const cwd = resolvePluginCwd(raw.cwd, pluginRoot, pluginDataDir);
  if (cwd === null) return skipServer(manifest, serverName, "cwd must be plugin-relative, PLUGIN_ROOT-rooted, or PLUGIN_DATA-rooted");
  return {
    command,
    args: args.map((value) => expandPluginPlaceholders(value, pluginRoot, pluginDataDir)),
    env: {
      ...Object.fromEntries(Object.entries(env).map(([key, value]) => [key, expandPluginPlaceholders(value, pluginRoot, pluginDataDir)])),
      PLUGIN_ROOT: pluginRoot,
      PLUGIN_DATA: pluginDataDir
    },
    cwd,
    pluginDataDir,
    literalEnv: true
  };
}
function translateHttpServer(manifest, serverName, raw, type) {
  for (const key of Object.keys(raw)) {
    if (!HTTP_FIELDS.has(key)) return skipServer(manifest, serverName, `unknown field ${key}`);
  }
  if (typeof raw.url !== "string" || raw.url.length === 0) return skipServer(manifest, serverName, "url must be a non-empty string");
  if (!isValidAgentPluginUrl(raw.url)) return skipServer(manifest, serverName, "url must be an allowed absolute HTTP(S) URL");
  const headers = translateHeaders(raw.headers, manifest, serverName);
  if (headers === null) return null;
  return {
    url: raw.url,
    httpTransport: type,
    ...headers ? { headers } : {}
  };
}
function formatAgentPluginServerName(pluginName, serverName) {
  const pluginPart = pluginName.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^[_-]+|[_-]+$/g, "") || "plugin";
  const serverPart = serverName.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^[_-]+|[_-]+$/g, "") || "server";
  return `${pluginPart}__${serverPart}`;
}
function skipServer(manifest, serverName, reason) {
  console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: ${reason}`);
  return null;
}
function translateStringArray(value, manifest, serverName, field) {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: ${field} must be an array of strings`);
    return null;
  }
  return value;
}
function translateEnv(value, manifest, serverName) {
  if (value === void 0) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: env must be an object of strings`);
    return null;
  }
  const env = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "PLUGIN_ROOT" || key === "PLUGIN_DATA") {
      console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: env must not define ${key}`);
      return null;
    }
    if (typeof entry !== "string") {
      console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: env values must be strings`);
      return null;
    }
    env[key] = entry;
  }
  return env;
}
function translateHeaders(value, manifest, serverName) {
  if (value === void 0) return void 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: headers must be an object of strings`);
    return null;
  }
  const headers = {};
  const seen = /* @__PURE__ */ new Set();
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: header values must be strings`);
      return null;
    }
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) {
      console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: duplicate header ${key}`);
      return null;
    }
    seen.add(normalized);
    headers[key] = entry;
  }
  try {
    new Headers(headers);
  } catch {
    console.warn(`Agent Plugin ${manifest.name} skips invalid MCP server ${serverName}: headers are not valid HTTP fields`);
    return null;
  }
  return Object.keys(headers).length > 0 ? headers : void 0;
}
function resolvePluginPath(path2, cwd) {
  if (path2 === "~") return resolve2(process.env.HOME ?? "", ".");
  if (path2.startsWith("~/")) return resolve2(process.env.HOME ?? "", path2.slice(2));
  return isAbsolute(path2) ? resolve2(path2) : resolve2(cwd, path2);
}
function isBareCommand(command) {
  return !command.includes("/") && !command.includes("\\") && !command.includes("${PLUGIN_ROOT}") && !command.includes("${PLUGIN_DATA}");
}
function resolvePluginCwd(value, pluginRoot, pluginDataDir) {
  if (value === void 0) return pluginRoot;
  if (typeof value !== "string") return null;
  if (value.startsWith("./")) return resolveContainedPath(pluginRoot, value, pluginRoot);
  if (value === "${PLUGIN_ROOT}" || value.startsWith("${PLUGIN_ROOT}/")) {
    return resolveContainedPath(pluginRoot, value.replace("${PLUGIN_ROOT}", "."), pluginRoot);
  }
  if (value === "${PLUGIN_DATA}" || value.startsWith("${PLUGIN_DATA}/")) {
    return resolveContainedPath(pluginDataDir, value.replace("${PLUGIN_DATA}", "."), pluginDataDir);
  }
  return null;
}
function resolveContainedPath(root, value, containmentRoot) {
  const resolved = resolve2(root, value);
  const rel = relative(containmentRoot, resolved);
  if (rel === "" || !rel.startsWith("..") && !rel.startsWith(sep) && !isAbsolute(rel)) return resolved;
  return null;
}
function expandPluginPlaceholders(value, pluginRoot, pluginDataDir) {
  return value.replaceAll("${PLUGIN_ROOT}", pluginRoot).replaceAll("${PLUGIN_DATA}", pluginDataDir);
}
function isValidAgentPluginUrl(value) {
  if (value.includes("${") || value.includes("$env:") || value.includes("{env:")) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password || url.hash) return false;
  if (url.protocol === "https:") return true;
  return isLoopbackHost(url.hostname);
}
function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
  return false;
}
var PLUGIN_SCHEMA, MCP_SCHEMA, PLUGIN_NAME_PATTERN, PLUGIN_MANIFEST_FIELDS, MCP_CONFIG_FIELDS, STDIO_FIELDS, HTTP_FIELDS;
var init_agent_plugin_loader = __esm({
  "agent-plugin-loader.ts"() {
    "use strict";
    init_agent_dir();
    PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
    MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
    PLUGIN_NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
    PLUGIN_MANIFEST_FIELDS = /* @__PURE__ */ new Set([
      "$schema",
      "name",
      "version",
      "description",
      "author",
      "homepage",
      "repository",
      "license",
      "keywords",
      "extensions"
    ]);
    MCP_CONFIG_FIELDS = /* @__PURE__ */ new Set(["$schema", "mcpServers"]);
    STDIO_FIELDS = /* @__PURE__ */ new Set(["type", "command", "args", "env", "cwd"]);
    HTTP_FIELDS = /* @__PURE__ */ new Set(["type", "url", "headers"]);
  }
});

// utils.ts
import { spawnSync } from "node:child_process";
import { homedir as homedir2, platform } from "node:os";
import { extname, isAbsolute as isAbsolute2, join as join2 } from "node:path";
async function execOpen(pi, target, browser, signal) {
  const os = platform();
  if (os === "darwin") {
    if (browser) {
      return isAbsolute2(browser) && extname(browser).toLowerCase() !== ".app" ? pi.exec(browser, [target], signal ? { signal } : {}) : pi.exec("open", ["-a", browser, target], signal ? { signal } : {});
    }
    return pi.exec("open", [target], signal ? { signal } : {});
  }
  if (os === "win32") {
    return browser ? pi.exec("cmd", ["/c", "start", "", browser, target], signal ? { signal } : {}) : pi.exec("cmd", ["/c", "start", "", target], signal ? { signal } : {});
  }
  return browser ? pi.exec(browser, [target], signal ? { signal } : {}) : pi.exec("xdg-open", [target], signal ? { signal } : {});
}
async function openUrl(pi, url, browser, signal) {
  const result = await execOpen(pi, url, browser, signal);
  if (result.code !== 0) {
    throw new Error(result.stderr || `Failed to open browser (exit code ${result.code})`);
  }
}
async function openPath(pi, targetPath) {
  const result = await execOpen(pi, targetPath);
  if (result.code !== 0) {
    throw new Error(result.stderr || `Failed to open path (exit code ${result.code})`);
  }
}
async function parallelLimit(items, limit, fn) {
  const results = [];
  const iterator = items.entries();
  async function worker() {
    while (true) {
      const next = iterator.next();
      if (next.done) return;
      const [index, item] = next.value;
      results[index] = await fn(item);
    }
  }
  const workers = Array(Math.min(limit, items.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}
function getConfigPathFromArgv() {
  const idx = process.argv.indexOf("--mcp-config");
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return void 0;
}
function interpolateEnvVars(value) {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "").replace(/\$env:(\w+)/g, (_, name) => process.env[name] ?? "").replace(/\{env:(\w+)\}/g, (_, name) => process.env[name] ?? "");
}
function getMissingEnvVars(value) {
  const missing = /* @__PURE__ */ new Set();
  for (const match of value.matchAll(/\$\{(\w+)\}|\$env:(\w+)|\{env:(\w+)\}/g)) {
    const name = match[1] ?? match[2] ?? match[3];
    if (name && process.env[name] === void 0) {
      missing.add(name);
    }
  }
  return [...missing];
}
function toStringRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
function interpolateSecretExpression(value) {
  if (value.startsWith("!!")) return interpolateEnvVars(value.slice(1));
  return value.startsWith("!") ? value : interpolateEnvVars(value);
}
function interpolateEnvRecord(values) {
  if (!values) return void 0;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    interpolateSecretExpression(value)
  ]));
}
function resolveCommandSecret(value, context) {
  if (value === void 0) return void 0;
  if (value.startsWith("!!")) return interpolateEnvVars(value.slice(1));
  if (!value.startsWith("!")) return interpolateEnvVars(value);
  const result = spawnSync(value.slice(1), {
    shell: true,
    encoding: "utf8",
    timeout: COMMAND_SECRET_TIMEOUT_MS,
    maxBuffer: COMMAND_SECRET_MAX_OUTPUT_BYTES,
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true
  });
  if (result.error) {
    const code = result.error.code;
    const reason = code === "ETIMEDOUT" ? "command timed out after 10 seconds" : code === "ENOBUFS" ? "command output exceeded 1 MiB" : "command failed to start";
    throw new Error(`Failed to resolve ${context}: ${reason}`);
  }
  if (result.status !== 0) {
    throw new Error(`Failed to resolve ${context}: command exited with code ${result.status ?? "unknown"}`);
  }
  const resolved = result.stdout.trim();
  if (!resolved) throw new Error(`Failed to resolve ${context}: command returned empty output`);
  return resolved;
}
function resolveCommandSecretsRecord(values, context) {
  if (!values) return void 0;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    resolveCommandSecret(value, context(key))
  ]));
}
function resolveServerUrl(definition) {
  if (definition.url == null) return void 0;
  if (typeof definition.url !== "string") {
    throw new Error("MCP server URL must be a string");
  }
  const missing = getMissingEnvVars(definition.url);
  if (missing.length > 0) {
    throw new Error(`Missing environment variable${missing.length === 1 ? "" : "s"} in MCP server URL: ${missing.join(", ")}`);
  }
  const resolved = interpolateEnvVars(definition.url);
  try {
    new URL(resolved);
  } catch (error) {
    throw new Error(`Invalid MCP server URL after environment interpolation: ${resolved}`, { cause: error });
  }
  return resolved;
}
function resolveConfigPath(value) {
  if (value === void 0) return void 0;
  const resolved = interpolateEnvVars(value);
  if (resolved === "~") return homedir2();
  if (resolved.startsWith("~/") || resolved.startsWith("~\\")) {
    return join2(homedir2(), resolved.slice(2));
  }
  return resolved;
}
function resolveBearerToken(definition) {
  if (definition.bearerToken !== void 0) {
    return interpolateSecretExpression(definition.bearerToken);
  }
  return definition.bearerTokenEnv ? process.env[definition.bearerTokenEnv] : void 0;
}
function stripOscSequences(text) {
  let result = "";
  let index = 0;
  while (index < text.length) {
    const isEscOsc = text.charCodeAt(index) === 27 && text[index + 1] === "]";
    const isC1Osc = text.charCodeAt(index) === 157;
    if (!isEscOsc && !isC1Osc) {
      result += text[index++];
      continue;
    }
    index += isEscOsc ? 2 : 1;
    while (index < text.length) {
      const code = text.charCodeAt(index++);
      if (code === 7 || code === 156) break;
      if (code === 27 && text[index] === "\\") {
        index++;
        break;
      }
    }
  }
  return result;
}
function sanitizeTerminalText(text) {
  return stripOscSequences(text).replace(/(?:\x1b\[[0-?]*[ -/]*[@-~]|\x1b[@-Z\\-_])/g, "").replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim();
}
function formatTerminalError(error) {
  const messages = [];
  const seen = /* @__PURE__ */ new Set();
  const collect = (value) => {
    if (seen.has(value)) return;
    if (typeof value === "object" && value !== null || typeof value === "function") seen.add(value);
    if (value instanceof AggregateError) {
      const countBefore = messages.length;
      for (const nested of value.errors) collect(nested);
      if (value.cause !== void 0) collect(value.cause);
      if (messages.length === countBefore && value.message) messages.push(value.message);
      return;
    }
    if (value instanceof Error) {
      if (value.message) messages.push(value.message);
      if (value.cause !== void 0) collect(value.cause);
      return;
    }
    messages.push(String(value));
  };
  collect(error);
  return sanitizeTerminalText([...new Set(messages)].join(": "));
}
function truncateAtWord(text, target) {
  if (!text || text.length <= target) return text;
  const truncated = text.slice(0, target);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > target * 0.6) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}
function normalizeDirectToolInputSchema(schema) {
  const inputSchema = schema && typeof schema === "object" && !Array.isArray(schema) ? schema : { type: "object", properties: {} };
  const { $schema, additionalProperties, ...normalized } = inputSchema;
  return normalized;
}
function formatAuthRequiredMessage(config, serverName, defaultMessage) {
  const template = config.settings?.authRequiredMessage;
  return template ? template.replaceAll("${server}", serverName) : defaultMessage;
}
function formatMcpStatus(config, message) {
  if (config.settings?.mcpFooterStatus === "off") return void 0;
  return `${config.settings?.showStatusIcon === false ? "MCP: " : "\u{1F50C} MCP: "}${message}`;
}
function extractToolUiStreamMode(toolMeta) {
  const uiMeta = toolMeta?.ui;
  if (!uiMeta || typeof uiMeta !== "object") return void 0;
  const streamMode = uiMeta["pi-mcp-adapter.streamMode"];
  if (streamMode === "eager" || streamMode === "stream-first") {
    return streamMode;
  }
  return void 0;
}
var COMMAND_SECRET_TIMEOUT_MS, COMMAND_SECRET_MAX_OUTPUT_BYTES;
var init_utils = __esm({
  "utils.ts"() {
    "use strict";
    COMMAND_SECRET_TIMEOUT_MS = 1e4;
    COMMAND_SECRET_MAX_OUTPUT_BYTES = 1024 * 1024;
  }
});

// config.ts
import { existsSync as existsSync2, readFileSync as readFileSync3, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname, join as join3, resolve as resolve3 } from "node:path";
import { parse as parseToml } from "smol-toml";
import stripJsonComments from "strip-json-comments";
function getPiGlobalConfigPath(overridePath) {
  return overridePath ? resolve3(overridePath) : getAgentPath("mcp.json");
}
function getProjectConfigPath(cwd = process.cwd()) {
  return resolve3(cwd, PROJECT_CONFIG_NAME);
}
function getProjectPiConfigPath(cwd = process.cwd()) {
  return resolve3(cwd, getConfigDirName(), PROJECT_PI_CONFIG_NAME);
}
function getConfigSourceSummaries(sourceSpecs) {
  return sourceSpecs.map((source) => {
    const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
    return {
      id: source.id,
      label: source.label,
      path: source.readPath,
      exists: existsSync2(source.readPath),
      scope: source.scope,
      kind: source.shared ? "shared" : "pi",
      serverCount: loaded ? Object.keys(loaded.mcpServers).length : 0
    };
  });
}
function getMcpStandardConfigSummary(overridePath, cwd = process.cwd()) {
  const sources = getConfigSourceSummaries(getConfigSources(overridePath, cwd));
  return {
    sources,
    hasSharedServers: sources.some((source) => source.kind === "shared" && source.serverCount > 0),
    fingerprint: JSON.stringify({ sources: sources.map((source) => [source.id, source.exists, source.serverCount]) })
  };
}
function getMcpDiscoverySummary(overridePath, cwd = process.cwd(), options = {}) {
  const sourceSpecs = getConfigSources(overridePath, cwd);
  const sources = getConfigSourceSummaries(sourceSpecs);
  const includeHostConfigs = options.includeHostConfigs !== false;
  const imports = includeHostConfigs ? Object.keys(IMPORT_PATHS).map((kind) => {
    const imported = loadImportedConfig(kind, cwd, `Failed to inspect imported MCP config from ${kind}:`);
    if (!imported) return null;
    return {
      kind,
      path: imported.path,
      serverCount: Object.keys(extractServers(imported.value, kind)).length
    };
  }).filter((value) => value !== null) : [];
  const hostConfigDiscovery = getConfiguredHostConfigDiscovery(overridePath, cwd);
  const hostConfigs = imports.map((entry) => ({ ...entry, active: hostConfigDiscovery === "on" }));
  const settings = getMergedSettings(overridePath, cwd);
  const agentPlugins = getAgentPluginSummaries(settings?.agentPluginPaths, cwd);
  const totalServerCount = sources.reduce((sum, source) => sum + source.serverCount, 0) + agentPlugins.reduce((sum, plugin) => sum + plugin.serverCount, 0);
  const hasSharedServers = sources.some((source) => source.kind === "shared" && source.serverCount > 0) || agentPlugins.some((plugin) => plugin.serverCount > 0);
  const hasPiOwnedServers = sources.some((source) => source.kind === "pi" && source.serverCount > 0);
  const hasAnyDetectedPaths = sources.some((source) => source.exists) || imports.length > 0 || agentPlugins.length > 0;
  const hasAnyConfig = totalServerCount > 0 || imports.some((entry) => entry.serverCount > 0) || hasAnyDetectedPaths;
  const summaryWithoutRepoPrompt = {
    sources,
    imports,
    hostConfigs,
    hostConfigDiscovery,
    agentPlugins,
    conflicts: getConfigConflicts(sourceSpecs, imports, cwd),
    hasAnyConfig,
    hasAnyDetectedPaths,
    hasSharedServers,
    hasPiOwnedServers,
    totalServerCount
  };
  const fingerprint = JSON.stringify({
    sources: sources.map((source) => [source.id, source.exists, source.serverCount]),
    imports: imports.map((entry) => [entry.kind, entry.path, entry.serverCount]),
    agentPlugins: agentPlugins.map((entry) => [entry.path, entry.name, entry.serverCount]),
    hostConfigDiscovery,
    conflicts: summaryWithoutRepoPrompt.conflicts
  });
  return {
    ...summaryWithoutRepoPrompt,
    fingerprint,
    repoPrompt: detectRepoPrompt(summaryWithoutRepoPrompt, cwd)
  };
}
function cloneMcpConfig(config) {
  return structuredClone(config);
}
function loadMcpConfig(overridePath, cwd = process.cwd()) {
  const sourceSpecs = getConfigSources(overridePath, cwd);
  const hostConfigDiscovery = getConfiguredHostConfigDiscovery(overridePath, cwd);
  let config = hostConfigDiscovery === "on" ? loadDiscoveredHostConfigs(cwd) : { mcpServers: {} };
  for (const source of sourceSpecs) {
    const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
    if (!loaded) continue;
    config = mergeConfigs(config, expandImports(loaded, cwd));
  }
  const pluginConfig = loadAgentPluginConfigs(config.settings?.agentPluginPaths, cwd);
  return mergeConfigs(pluginConfig, config);
}
function getMergedSettings(overridePath, cwd = process.cwd()) {
  let settings;
  for (const source of getConfigSources(overridePath, cwd)) {
    const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
    if (loaded?.settings) settings = { ...settings, ...loaded.settings };
  }
  return settings;
}
function getConfiguredHostConfigDiscovery(overridePath, cwd = process.cwd()) {
  let configured = "off";
  const settings = getMergedSettings(overridePath, cwd);
  const value = settings?.hostConfigDiscovery;
  if (value === "off" || value === "prompt" || value === "on") configured = value;
  return configured;
}
function loadDiscoveredHostConfigs(cwd) {
  let config = { mcpServers: {} };
  for (const importKind of Object.keys(IMPORT_PATHS)) {
    const imported = loadImportedConfig(importKind, cwd, `Failed to discover imported MCP config from ${importKind}:`);
    if (!imported) continue;
    config = mergeConfigs(config, {
      mcpServers: extractServers(imported.value, importKind)
    });
  }
  return config;
}
function getConfigConflicts(sourceSpecs, imports, cwd) {
  const seen = /* @__PURE__ */ new Map();
  const record = (name, source) => {
    const entries = seen.get(name) ?? [];
    if (!entries.some((entry) => entry.kind === source.kind && entry.path === source.path)) entries.push(source);
    seen.set(name, entries);
  };
  for (const entry of imports) {
    const imported = loadImportedConfig(entry.kind, cwd, `Failed to inspect imported MCP config from ${entry.kind}:`);
    if (!imported) continue;
    for (const name of Object.keys(extractServers(imported.value, entry.kind))) {
      record(name, { kind: "host", path: imported.path });
    }
  }
  for (const source of sourceSpecs) {
    const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
    if (!loaded) continue;
    if (loaded.imports?.length) {
      for (const importKind of loaded.imports) {
        const imported = loadImportedConfig(importKind, cwd, `Failed to inspect imported MCP config from ${importKind}:`);
        if (!imported) continue;
        for (const name of Object.keys(extractServers(imported.value, importKind))) {
          record(name, { kind: "host", path: imported.path });
        }
      }
    }
    for (const name of Object.keys(loaded.mcpServers)) {
      record(name, {
        kind: source.shared ? "shared" : "pi",
        path: source.readPath
      });
    }
  }
  return [...seen.entries()].filter(([, sources]) => sources.length > 1).map(([serverName, sources]) => ({ serverName, sources, winner: sources[sources.length - 1] })).sort((left, right) => left.serverName.localeCompare(right.serverName));
}
function getConfigSources(overridePath, cwd = process.cwd()) {
  const userPath = getPiGlobalConfigPath(overridePath);
  const projectPath = getProjectConfigPath(cwd);
  const projectPiPath = getProjectPiConfigPath(cwd);
  const sources = [];
  if (GENERIC_GLOBAL_CONFIG_PATH !== userPath) {
    sources.push({
      id: "shared-global",
      label: "user-global standard MCP",
      readPath: GENERIC_GLOBAL_CONFIG_PATH,
      writePath: userPath,
      kind: "import",
      importKind: "global MCP config",
      shared: true,
      scope: "global"
    });
  }
  for (const [index, agentsPath] of AGENTS_GLOBAL_CONFIG_PATHS.entries()) {
    if (agentsPath === userPath || agentsPath === GENERIC_GLOBAL_CONFIG_PATH) continue;
    sources.push({
      id: index === 0 ? "agents-global" : "agents-nested-global",
      label: index === 0 ? "user-global .agents MCP" : "user-global .agents nested MCP",
      readPath: agentsPath,
      writePath: userPath,
      kind: "import",
      importKind: index === 0 ? ".agents MCP config" : ".agents/mcp MCP config",
      shared: true,
      scope: "global"
    });
  }
  sources.push({
    id: "pi-global",
    label: "Pi global override",
    readPath: userPath,
    writePath: userPath,
    kind: "user",
    shared: false,
    scope: "global"
  });
  if (projectPath !== userPath) {
    sources.push({
      id: "shared-project",
      label: "project standard MCP",
      readPath: projectPath,
      writePath: projectPath,
      kind: "project",
      shared: true,
      scope: "project"
    });
  }
  if (projectPiPath !== userPath && projectPiPath !== projectPath) {
    sources.push({
      id: "pi-project",
      label: "project Pi override",
      readPath: projectPiPath,
      writePath: projectPiPath,
      kind: "project",
      shared: false,
      scope: "project"
    });
  }
  return sources;
}
function mergeConfigs(base, next) {
  const imports = mergeImports(base.imports, next.imports);
  const settings = next.settings ? { ...base.settings, ...next.settings } : base.settings;
  return {
    mcpServers: mergeServerMaps(base.mcpServers, next.mcpServers),
    ...imports !== void 0 ? { imports } : {},
    ...settings !== void 0 ? { settings } : {}
  };
}
function mergeServerMaps(base, next) {
  const merged = { ...base };
  for (const [name, definition] of Object.entries(next)) {
    const existing = merged[name];
    let baseEntry = existing ?? {};
    if (existing && typeof definition.socket === "string") {
      baseEntry = { ...existing };
      for (const field of [
        "command",
        "args",
        "env",
        "cwd",
        "url",
        "headers",
        "auth",
        "bearerToken",
        "bearerTokenEnv",
        "oauth"
      ]) {
        delete baseEntry[field];
      }
    } else if (existing?.socket && (typeof definition.command === "string" || typeof definition.url === "string")) {
      baseEntry = { ...existing };
      delete baseEntry.socket;
    }
    if (existing && typeof definition.url === "string" && definition.url !== existing.url) {
      if (baseEntry === existing) baseEntry = { ...existing };
      for (const field of URL_BOUND_AUTH_FIELDS) {
        delete baseEntry[field];
      }
      if (baseEntry.oauth !== false) {
        delete baseEntry.oauth;
      }
    }
    merged[name] = { ...baseEntry, ...definition };
  }
  return merged;
}
function mergeImports(left, right) {
  const merged = [...left ?? [], ...right ?? []];
  if (merged.length === 0) return void 0;
  return [...new Set(merged)];
}
function expandImports(config, cwd = process.cwd()) {
  if (!config.imports?.length) return config;
  const importedServers = {};
  for (const importKind of config.imports) {
    const imported = loadImportedConfig(importKind, cwd, `Failed to import MCP config from ${importKind}:`);
    if (!imported) continue;
    const servers = extractServers(imported.value, importKind);
    for (const [name, definition] of Object.entries(servers)) {
      if (!importedServers[name]) {
        importedServers[name] = definition;
      }
    }
  }
  return {
    imports: config.imports,
    ...config.settings !== void 0 ? { settings: config.settings } : {},
    mcpServers: mergeServerMaps(importedServers, config.mcpServers)
  };
}
function resolveImportCandidates(importKind, cwd) {
  return (IMPORT_PATHS[importKind] ?? []).map((candidate) => {
    if (importKind === "opencode" && candidate === "./opencode.json") {
      const start = resolve3(cwd);
      let gitRoot;
      let current = start;
      while (true) {
        if (existsSync2(join3(current, ".git"))) {
          gitRoot = current;
          break;
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
      if (!gitRoot) return join3(start, "opencode.json");
      current = start;
      while (true) {
        const projectConfig = join3(current, "opencode.json");
        if (existsSync2(projectConfig) || current === gitRoot) return projectConfig;
        current = dirname(current);
      }
    }
    return candidate.startsWith(".") ? resolve3(cwd, candidate) : candidate;
  });
}
function parseJsonConfig(raw) {
  return JSON.parse(stripJsonComments(raw, { trailingCommas: true }));
}
function readImportedConfig(path2) {
  const raw = readFileSync3(path2, "utf-8");
  return path2.endsWith(".toml") ? parseToml(raw) : parseJsonConfig(raw);
}
function loadImportedConfig(importKind, cwd, warningPrefix) {
  if (importKind === "opencode") {
    let merged = {};
    let highestPrecedencePath;
    for (const path2 of resolveImportCandidates(importKind, cwd)) {
      if (!existsSync2(path2)) continue;
      try {
        const value = readImportedConfig(path2);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          merged = mergeOpenCodeConfigs(merged, value);
          highestPrecedencePath = path2;
        }
      } catch (error) {
        console.warn(warningPrefix, error);
      }
    }
    return highestPrecedencePath ? { path: highestPrecedencePath, value: merged } : null;
  }
  for (const path2 of resolveImportCandidates(importKind, cwd)) {
    if (!existsSync2(path2)) continue;
    try {
      return { path: path2, value: readImportedConfig(path2) };
    } catch (error) {
      console.warn(warningPrefix, error);
    }
  }
  return null;
}
function readValidatedConfig(path2, label) {
  if (!existsSync2(path2)) return null;
  try {
    return validateConfig(parseJsonConfig(readFileSync3(path2, "utf-8")));
  } catch (error) {
    console.warn(`Failed to load ${label}:`, error);
    return null;
  }
}
function validateConfig(raw) {
  if (!isRecord(raw)) {
    return { mcpServers: {} };
  }
  return {
    mcpServers: toServerEntries(raw.mcpServers ?? raw["mcp-servers"]),
    ...Array.isArray(raw.imports) ? { imports: raw.imports } : {},
    ...raw.settings !== void 0 ? { settings: raw.settings } : {}
  };
}
function toServerEntries(servers) {
  if (!isRecord(servers)) return {};
  const entries = {};
  for (const [name, entry] of Object.entries(servers)) {
    if (isServerEntry(entry)) entries[name] = entry;
  }
  return entries;
}
function isServerEntry(value) {
  return isRecord(value);
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function mergeOpenCodeConfigs(base, next) {
  const baseMcp = base.mcp;
  const nextMcp = next.mcp;
  const mergedMcp = {
    ...baseMcp && typeof baseMcp === "object" && !Array.isArray(baseMcp) ? baseMcp : {}
  };
  if (nextMcp && typeof nextMcp === "object" && !Array.isArray(nextMcp)) {
    for (const [name, nextEntry] of Object.entries(nextMcp)) {
      const baseEntry = mergedMcp[name];
      if (baseEntry && typeof baseEntry === "object" && !Array.isArray(baseEntry) && nextEntry && typeof nextEntry === "object" && !Array.isArray(nextEntry)) {
        const safeBase = { ...baseEntry };
        const override = nextEntry;
        if (typeof override.type === "string" && override.type !== safeBase.type) {
          for (const field of ["command", "environment", "cwd", "url", "headers", "oauth"]) delete safeBase[field];
        }
        if (typeof override.url === "string" && override.url !== safeBase.url) {
          delete safeBase.headers;
          delete safeBase.oauth;
        }
        if (Array.isArray(override.command)) {
          const baseCommand = safeBase.command;
          const commandChanged = !Array.isArray(baseCommand) || override.command.length !== baseCommand.length || override.command.some((value, index) => value !== baseCommand[index]);
          if (commandChanged) {
            delete safeBase.environment;
            delete safeBase.cwd;
          }
        }
        const mergedEntry = { ...safeBase, ...override };
        for (const field of ["environment", "headers", "oauth"]) {
          const baseField = safeBase[field];
          const nextField = override[field];
          if (baseField && typeof baseField === "object" && !Array.isArray(baseField) && nextField && typeof nextField === "object" && !Array.isArray(nextField)) {
            mergedEntry[field] = { ...baseField, ...nextField };
          }
        }
        mergedMcp[name] = mergedEntry;
      } else {
        mergedMcp[name] = nextEntry;
      }
    }
  }
  return { ...base, ...next, mcp: mergedMcp };
}
function extractServers(config, kind) {
  if (!config || typeof config !== "object") return {};
  const obj = config;
  let servers;
  switch (kind) {
    case "claude-desktop":
    case "claude-code":
      servers = obj.mcpServers;
      break;
    case "codex":
      servers = obj.mcp_servers ?? obj.mcpServers;
      break;
    case "cursor":
    case "windsurf":
    case "vscode":
      servers = obj.mcpServers ?? obj["mcp-servers"];
      break;
    case "opencode":
      servers = obj.mcp;
      break;
    default:
      return {};
  }
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return {};
  }
  const mappedServers = {};
  for (const [name, entry] of Object.entries(servers)) {
    if (kind === "opencode") {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const raw = entry;
      if (raw.enabled === false) continue;
      if (raw.type === "local" && Array.isArray(raw.command) && raw.command.length > 0 && raw.command.every((value) => typeof value === "string")) {
        const env = toStringRecord(raw.environment);
        const command = raw.command[0];
        if (command === void 0) continue;
        const mapped2 = {
          command,
          args: raw.command.slice(1),
          ...env ? { env } : {},
          ...typeof raw.cwd === "string" ? { cwd: raw.cwd } : {}
        };
        mappedServers[name] = mapped2;
        continue;
      }
      if (raw.type === "remote" && typeof raw.url === "string") {
        const headers = toStringRecord(raw.headers);
        const mapped2 = {
          url: raw.url,
          ...headers ? { headers } : {}
        };
        if (raw.oauth === false) {
          mapped2.oauth = false;
        } else if (raw.oauth && typeof raw.oauth === "object" && !Array.isArray(raw.oauth)) {
          const oauth = raw.oauth;
          mapped2.auth = "oauth";
          mapped2.oauth = {
            ...typeof oauth.clientId === "string" ? { clientId: oauth.clientId } : {},
            ...typeof oauth.clientSecret === "string" ? { clientSecret: oauth.clientSecret } : {},
            ...typeof oauth.scope === "string" ? { scope: oauth.scope } : {},
            ...typeof oauth.skipIssuerMetadataValidation === "boolean" ? { skipIssuerMetadataValidation: oauth.skipIssuerMetadataValidation } : {}
          };
        }
        mappedServers[name] = mapped2;
      }
      continue;
    }
    if (!isRecord(entry)) continue;
    if (kind !== "codex") {
      mappedServers[name] = entry;
      continue;
    }
    const mapped = { ...entry };
    const bearerTokenEnv = mapped.bearer_token_env_var;
    const httpHeaders = mapped.http_headers;
    const envHttpHeaders = mapped.env_http_headers;
    if (typeof bearerTokenEnv === "string") {
      mapped.bearerTokenEnv = bearerTokenEnv;
      if (mapped.auth === void 0) mapped.auth = "bearer";
    }
    if (httpHeaders && typeof httpHeaders === "object" && !Array.isArray(httpHeaders)) {
      mapped.headers = { ...mapped.headers, ...httpHeaders };
    }
    if (envHttpHeaders && typeof envHttpHeaders === "object" && !Array.isArray(envHttpHeaders)) {
      const headers = { ...mapped.headers };
      for (const [header, envVar] of Object.entries(envHttpHeaders)) {
        if (typeof envVar === "string" && headers[header] === void 0) headers[header] = `$env:${envVar}`;
      }
      mapped.headers = headers;
    }
    delete mapped.bearer_token_env_var;
    delete mapped.http_headers;
    delete mapped.env_http_headers;
    mappedServers[name] = mapped;
  }
  return mappedServers;
}
function serializeRawConfig(raw) {
  return `${JSON.stringify(raw, null, 2)}
`;
}
function buildUnifiedDiff(beforeText, afterText) {
  if (beforeText === afterText) return "(no changes)";
  const before = beforeText.split("\n");
  const after = afterText.split("\n");
  const rows = before.length;
  const cols = after.length;
  const lcs = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
  for (let i2 = rows - 1; i2 >= 0; i2--) {
    for (let j2 = cols - 1; j2 >= 0; j2--) {
      const row = lcs[i2];
      const nextRow = lcs[i2 + 1];
      if (!row || !nextRow) continue;
      row[j2] = before[i2] === after[j2] ? (nextRow[j2 + 1] ?? 0) + 1 : Math.max(nextRow[j2] ?? 0, row[j2 + 1] ?? 0);
    }
  }
  const lines = ["--- before", "+++ after"];
  let i = 0;
  let j = 0;
  while (i < rows || j < cols) {
    if (i < rows && j < cols && before[i] === after[j]) {
      lines.push(`  ${before[i]}`);
      i++;
      j++;
      continue;
    }
    if (j < cols && (i === rows || (lcs[i]?.[j + 1] ?? 0) >= (lcs[i + 1]?.[j] ?? 0))) {
      lines.push(`+ ${after[j]}`);
      j++;
      continue;
    }
    if (i < rows) {
      lines.push(`- ${before[i]}`);
      i++;
    }
  }
  return lines.join("\n");
}
function buildConfigWritePreview(filePath, nextRaw) {
  const existed = existsSync2(filePath);
  const beforeRaw = readRawConfigObject(filePath);
  const beforeText = existed ? serializeRawConfig(beforeRaw) : "";
  const afterText = serializeRawConfig(nextRaw);
  return {
    path: filePath,
    existed,
    changed: beforeText !== afterText,
    beforeText,
    afterText,
    diffText: buildUnifiedDiff(beforeText, afterText)
  };
}
function readRawConfigObject(filePath) {
  if (!existsSync2(filePath)) return {};
  try {
    const raw = parseJsonConfig(readFileSync3(filePath, "utf-8"));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}
function writeRawConfigObject(filePath, raw) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(raw, null, 2)}
`, "utf-8");
  renameSync(tmpPath, filePath);
}
function getServersObject(raw) {
  const existing = raw.mcpServers ?? raw["mcp-servers"] ?? {};
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return {};
  }
  return existing;
}
function setServersObject(raw, servers) {
  delete raw["mcp-servers"];
  raw.mcpServers = servers;
}
function writeProjectServerDisabledOverride(overridePath, cwd, serverName, disabled) {
  const filePath = getProjectPiConfigPath(cwd);
  let raw = {};
  if (existsSync2(filePath)) {
    try {
      const parsed = parseJsonConfig(readFileSync3(filePath, "utf-8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("root value must be an object");
      }
      raw = parsed;
    } catch (error) {
      throw new Error(`Failed to read project MCP override at ${filePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
  const serverKey = raw.mcpServers !== void 0 ? "mcpServers" : raw["mcp-servers"] !== void 0 ? "mcp-servers" : "mcpServers";
  const rawServers = raw[serverKey];
  if (rawServers !== void 0 && (!rawServers || typeof rawServers !== "object" || Array.isArray(rawServers))) {
    throw new Error(`Failed to update project MCP override at ${filePath}: ${serverKey} must be an object`);
  }
  const servers = rawServers ?? {};
  const previous = servers[serverName];
  if (previous !== void 0 && (!previous || typeof previous !== "object" || Array.isArray(previous))) {
    throw new Error(`Failed to update project MCP override at ${filePath}: server "${serverName}" must be an object`);
  }
  const existing = previous;
  let next;
  if (disabled) {
    next = { ...existing, disabled: true };
  } else {
    next = Object.fromEntries(Object.entries(existing ?? {}).filter(([key]) => key !== "disabled"));
    let lowerConfig = { mcpServers: {} };
    for (const source of getConfigSources(overridePath, cwd)) {
      if (source.readPath === filePath) continue;
      const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
      if (loaded) lowerConfig = mergeConfigs(lowerConfig, expandImports(loaded, cwd));
    }
    if (raw.imports !== void 0) {
      if (!Array.isArray(raw.imports) || raw.imports.some((kind) => typeof kind !== "string" || !Object.hasOwn(IMPORT_PATHS, kind))) {
        throw new Error(`Failed to update project MCP override at ${filePath}: imports contains an unsupported config kind`);
      }
      lowerConfig = mergeConfigs(lowerConfig, expandImports({ mcpServers: {}, imports: raw.imports }, cwd));
    }
    if (isServerDisabled(lowerConfig.mcpServers[serverName])) next.disabled = false;
  }
  if (!existing && Object.keys(next).length === 0 || JSON.stringify(existing) === JSON.stringify(next)) {
    return { path: filePath, changed: false };
  }
  if (Object.keys(next).length === 0) delete servers[serverName];
  else servers[serverName] = next;
  raw[serverKey] = servers;
  writeRawConfigObject(filePath, raw);
  return { path: filePath, changed: true };
}
function isRepoPromptServer(name, entry) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("repoprompt") || normalizedName === "rp") {
    return true;
  }
  const command = entry.command?.toLowerCase() ?? "";
  if (command.includes("repoprompt") || command.includes("rp-mcp") || command.endsWith("repoprompt_cli")) {
    return true;
  }
  return (entry.args ?? []).some((arg) => typeof arg === "string" && arg.toLowerCase().includes("repoprompt"));
}
function findProjectRoot(cwd = process.cwd()) {
  let current = resolve3(cwd);
  while (true) {
    if (existsSync2(join3(current, ".git")) || existsSync2(join3(current, "package.json")) || existsSync2(join3(current, PROJECT_CONFIG_NAME)) || existsSync2(join3(current, ".pi"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function buildRepoPromptEntry(executablePath) {
  return {
    command: executablePath,
    args: [],
    lifecycle: "lazy"
  };
}
function detectRepoPrompt(summary, cwd = process.cwd()) {
  for (const source of summary.sources) {
    if (source.kind !== "shared" || source.serverCount === 0) continue;
    const config = readValidatedConfig(source.path, `MCP config from ${source.path}`);
    if (!config) continue;
    for (const [name, entry] of Object.entries(config.mcpServers)) {
      if (isRepoPromptServer(name, entry)) {
        return { configured: true, configuredPath: source.path };
      }
    }
  }
  const executablePath = REPOPROMPT_BINARY_CANDIDATES.find((candidate) => existsSync2(candidate));
  if (!executablePath) {
    return { configured: false };
  }
  const projectRoot = findProjectRoot(cwd);
  const targetPath = projectRoot ? join3(projectRoot, PROJECT_CONFIG_NAME) : GENERIC_GLOBAL_CONFIG_PATH;
  return {
    configured: false,
    executablePath,
    targetPath,
    serverName: "repoprompt",
    entry: buildRepoPromptEntry(executablePath)
  };
}
function previewCompatibilityImports(importKinds, overridePath) {
  const targetPath = getPiGlobalConfigPath(overridePath);
  const raw = readRawConfigObject(targetPath);
  const currentImports = Array.isArray(raw.imports) ? raw.imports.filter((value) => typeof value === "string") : [];
  const merged = [.../* @__PURE__ */ new Set([...currentImports, ...importKinds])];
  const nextRaw = { ...raw, imports: merged };
  setServersObject(nextRaw, getServersObject(nextRaw));
  return buildConfigWritePreview(targetPath, nextRaw);
}
function ensureCompatibilityImports(importKinds, overridePath) {
  const targetPath = getPiGlobalConfigPath(overridePath);
  const raw = readRawConfigObject(targetPath);
  const currentImports = Array.isArray(raw.imports) ? raw.imports.filter((value) => typeof value === "string") : [];
  const merged = [.../* @__PURE__ */ new Set([...currentImports, ...importKinds])];
  const added = merged.filter((kind) => !currentImports.includes(kind));
  if (added.length === 0) {
    return { path: targetPath, added: [] };
  }
  raw.imports = merged;
  const servers = getServersObject(raw);
  setServersObject(raw, servers);
  writeRawConfigObject(targetPath, raw);
  return { path: targetPath, added };
}
function buildStarterProjectConfig() {
  return {
    mcpServers: {}
  };
}
function previewStarterProjectConfig(cwd = process.cwd()) {
  const targetPath = getProjectConfigPath(cwd);
  const nextRaw = { mcpServers: buildStarterProjectConfig().mcpServers };
  return buildConfigWritePreview(targetPath, nextRaw);
}
function writeStarterProjectConfig(cwd = process.cwd()) {
  const targetPath = getProjectConfigPath(cwd);
  const raw = { mcpServers: buildStarterProjectConfig().mcpServers };
  writeRawConfigObject(targetPath, raw);
  return targetPath;
}
function previewSharedServerEntry(filePath, serverName, entry) {
  const raw = readRawConfigObject(filePath);
  const nextRaw = { ...raw };
  const servers = getServersObject(nextRaw);
  servers[serverName] = entry;
  setServersObject(nextRaw, servers);
  return buildConfigWritePreview(filePath, nextRaw);
}
function writeSharedServerEntry(filePath, serverName, entry) {
  const raw = readRawConfigObject(filePath);
  const servers = getServersObject(raw);
  servers[serverName] = entry;
  setServersObject(raw, servers);
  writeRawConfigObject(filePath, raw);
  return filePath;
}
function getServerProvenance(overridePath, cwd = process.cwd()) {
  const provenance = /* @__PURE__ */ new Map();
  const userPath = getPiGlobalConfigPath(overridePath);
  if (getConfiguredHostConfigDiscovery(overridePath, cwd) === "on") {
    for (const importKind of Object.keys(IMPORT_PATHS)) {
      const imported = loadImportedConfig(importKind, cwd, `Failed to inspect imported MCP config from ${importKind}:`);
      if (!imported) continue;
      for (const name of Object.keys(extractServers(imported.value, importKind))) {
        provenance.set(name, { path: userPath, kind: "import", importKind });
      }
    }
  }
  for (const source of getConfigSources(overridePath, cwd)) {
    const loaded = readValidatedConfig(source.readPath, `MCP config from ${source.readPath}`);
    if (!loaded) continue;
    if (loaded.imports?.length) {
      for (const importKind of loaded.imports) {
        const imported = loadImportedConfig(importKind, cwd, `Failed to inspect imported MCP config from ${importKind}:`);
        if (!imported) continue;
        const servers = extractServers(imported.value, importKind);
        for (const name of Object.keys(servers)) {
          if (!provenance.has(name)) {
            provenance.set(name, { path: userPath, kind: "import", importKind });
          }
        }
      }
    }
    for (const name of Object.keys(loaded.mcpServers)) {
      provenance.set(name, {
        path: source.writePath,
        kind: source.kind,
        ...source.importKind !== void 0 ? { importKind: source.importKind } : {}
      });
    }
  }
  return provenance;
}
function writeDirectToolsConfig(changes, provenance, fullConfig) {
  const byPath = /* @__PURE__ */ new Map();
  for (const [serverName, value] of changes) {
    const prov = provenance.get(serverName);
    if (!prov) continue;
    const targetPath = prov.path;
    if (!byPath.has(targetPath)) byPath.set(targetPath, []);
    byPath.get(targetPath).push({ name: serverName, value, prov });
  }
  for (const [filePath, entries] of byPath) {
    const raw = readRawConfigObject(filePath);
    const servers = getServersObject(raw);
    for (const { name, value, prov } of entries) {
      if (prov.kind === "import") {
        const fullDef = fullConfig.mcpServers[name];
        if (fullDef) {
          servers[name] = { ...fullDef, directTools: value };
        }
      } else if (servers[name]) {
        servers[name] = { ...servers[name], directTools: value };
      }
    }
    setServersObject(raw, servers);
    writeRawConfigObject(filePath, raw);
  }
}
function resolveConfiguredOAuthDir(raw, cwd = process.cwd()) {
  if (raw === void 0 || raw === null) return void 0;
  if (typeof raw !== "string") {
    throw new Error("settings.oauthDir must be a string");
  }
  const trimmed = raw.trim();
  if (!trimmed) return void 0;
  return resolve3(cwd, trimmed);
}
var GENERIC_GLOBAL_CONFIG_PATH, AGENTS_GLOBAL_CONFIG_PATHS, PROJECT_CONFIG_NAME, PROJECT_PI_CONFIG_NAME, REPOPROMPT_BINARY_CANDIDATES, KNOWN_SERVER_PRESETS, IMPORT_PATHS, URL_BOUND_AUTH_FIELDS;
var init_config = __esm({
  "config.ts"() {
    "use strict";
    init_agent_dir();
    init_agent_plugin_loader();
    init_types();
    init_utils();
    GENERIC_GLOBAL_CONFIG_PATH = join3(homedir3(), ".config", "mcp", "mcp.json");
    AGENTS_GLOBAL_CONFIG_PATHS = [
      join3(homedir3(), ".agents", "mcp.json"),
      join3(homedir3(), ".agents", "mcp", "mcp.json")
    ];
    PROJECT_CONFIG_NAME = ".mcp.json";
    PROJECT_PI_CONFIG_NAME = "mcp.json";
    REPOPROMPT_BINARY_CANDIDATES = [
      join3(homedir3(), "RepoPrompt", "repoprompt_cli"),
      "/Applications/Repo Prompt.app/Contents/MacOS/repoprompt-mcp"
    ];
    KNOWN_SERVER_PRESETS = [
      {
        id: "deepwiki",
        name: "DeepWiki",
        summary: "Ask questions about public GitHub repositories.",
        entry: { url: "https://mcp.deepwiki.com/mcp", protocolVersion: "auto" }
      },
      {
        id: "context7",
        name: "Context7",
        summary: "Look up current library documentation and examples.",
        entry: { url: "https://mcp.context7.com/mcp", protocolVersion: "auto" }
      },
      {
        id: "notion",
        name: "Notion",
        summary: "Search and work with your Notion workspace.",
        entry: { url: "https://mcp.notion.com/mcp", auth: "oauth", protocolVersion: "auto" }
      },
      {
        id: "github",
        name: "GitHub",
        summary: "Work with GitHub through your Copilot account.",
        entry: { url: "https://api.githubcopilot.com/mcp", auth: "oauth", protocolVersion: "auto" }
      },
      {
        id: "chrome-devtools",
        name: "Chrome DevTools",
        summary: "Inspect and automate a local Chrome browser.",
        entry: { command: "npx", args: ["-y", "chrome-devtools-mcp@1.6.0"] }
      }
    ];
    IMPORT_PATHS = {
      cursor: [join3(homedir3(), ".cursor", "mcp.json")],
      "claude-code": [
        join3(homedir3(), ".claude", "mcp.json"),
        join3(homedir3(), ".claude.json"),
        join3(homedir3(), ".claude", "claude_desktop_config.json")
      ],
      "claude-desktop": [join3(homedir3(), "Library", "Application Support", "Claude", "claude_desktop_config.json")],
      codex: [
        join3(homedir3(), ".codex", "config.toml"),
        join3(homedir3(), ".codex", "config.json")
      ],
      opencode: [
        join3(homedir3(), ".config", "opencode", "opencode.json"),
        "./opencode.json"
      ],
      windsurf: [join3(homedir3(), ".windsurf", "mcp.json")],
      vscode: [".vscode/mcp.json"]
    };
    URL_BOUND_AUTH_FIELDS = ["headers", "bearerToken", "bearerTokenEnv", "requestHeadersCommand"];
  }
});

// ui-app-bridge-helpers.ts
function getToolUiResourceUri(tool) {
  const meta = tool._meta;
  let resourceUri = getNestedResourceUri(meta);
  if (resourceUri === void 0) {
    resourceUri = meta?.[RESOURCE_URI_META_KEY];
  }
  if (typeof resourceUri === "string" && resourceUri.startsWith("ui://")) {
    return resourceUri;
  }
  if (resourceUri !== void 0) {
    throw new Error(`Invalid UI resource URI: ${JSON.stringify(resourceUri)}`);
  }
  return void 0;
}
function buildAllowAttribute(permissions) {
  if (!permissions) return "";
  const allowed = [];
  if (permissions.camera) allowed.push("camera");
  if (permissions.microphone) allowed.push("microphone");
  if (permissions.geolocation) allowed.push("geolocation");
  if (permissions.clipboardWrite) allowed.push("clipboard-write");
  return allowed.join("; ");
}
function getNestedResourceUri(meta) {
  const ui = meta?.ui;
  if (!ui || typeof ui !== "object") return void 0;
  return ui.resourceUri;
}
var RESOURCE_MIME_TYPE, RESOURCE_URI_META_KEY;
var init_ui_app_bridge_helpers = __esm({
  "ui-app-bridge-helpers.ts"() {
    "use strict";
    RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";
    RESOURCE_URI_META_KEY = "ui/resourceUri";
  }
});

// resource-tools.ts
function resourceNameToToolName(name) {
  let result = name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+/, "").replace(/_+$/, "").toLowerCase();
  if (!result || /^\d/.test(result)) {
    result = "resource" + (result ? "_" + result : "");
  }
  return result;
}
var init_resource_tools = __esm({
  "resource-tools.ts"() {
    "use strict";
  }
});

// ui-tool-visibility.ts
function extractUiToolVisibility(meta) {
  if (!meta || typeof meta !== "object") return void 0;
  const ui = meta.ui;
  if (!ui || typeof ui !== "object" || Array.isArray(ui)) return void 0;
  const visibility = ui.visibility;
  if (visibility === void 0) return void 0;
  if (!Array.isArray(visibility)) return [];
  const values = [];
  for (const entry of visibility) {
    if (entry !== "model" && entry !== "app") return [];
    if (!values.includes(entry)) values.push(entry);
  }
  return values;
}
function isUiToolVisibleToModel(visibility) {
  return visibility === void 0 || visibility.includes("model");
}
function isUiToolCallableByApp(visibility) {
  return visibility === void 0 || visibility.includes("app");
}
var init_ui_tool_visibility = __esm({
  "ui-tool-visibility.ts"() {
    "use strict";
  }
});

// metadata-cache.ts
import { existsSync as existsSync4, readFileSync as readFileSync5, writeFileSync as writeFileSync2, renameSync as renameSync2, mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname3 } from "node:path";
import { createHash as createHash2 } from "node:crypto";
function getMetadataCachePath() {
  return getAgentPath("mcp-cache.json");
}
function loadMetadataCache() {
  const cachePath = getMetadataCachePath();
  if (!existsSync4(cachePath)) return null;
  try {
    const raw = JSON.parse(readFileSync5(cachePath, "utf-8"));
    if (!raw || typeof raw !== "object") return null;
    if (raw.version !== CACHE_VERSION) return null;
    if (!raw.servers || typeof raw.servers !== "object") return null;
    return raw;
  } catch {
    return null;
  }
}
function saveMetadataCache(cache) {
  const cachePath = getMetadataCachePath();
  const dir = dirname3(cachePath);
  mkdirSync2(dir, { recursive: true });
  let merged = { version: CACHE_VERSION, servers: {} };
  try {
    if (existsSync4(cachePath)) {
      const existing = JSON.parse(readFileSync5(cachePath, "utf-8"));
      if (existing && existing.version === CACHE_VERSION && existing.servers) {
        merged.servers = { ...existing.servers };
      }
    }
  } catch {
  }
  merged.version = CACHE_VERSION;
  merged.servers = { ...merged.servers, ...cache.servers };
  const tmpPath = `${cachePath}.${process.pid}.tmp`;
  writeFileSync2(tmpPath, JSON.stringify(merged, null, 2), "utf-8");
  renameSync2(tmpPath, cachePath);
}
function computeServerHash(definition) {
  const identity = {
    command: definition.command,
    args: definition.args,
    socket: resolveConfigPath(definition.socket),
    env: interpolateEnvRecord(definition.env),
    cwd: resolveConfigPath(definition.cwd),
    url: resolveServerUrl(definition),
    headers: interpolateEnvRecord(definition.headers),
    requestHeadersCommand: definition.requestHeadersCommand ? {
      command: interpolateEnvVars(definition.requestHeadersCommand.command),
      args: definition.requestHeadersCommand.args?.map(interpolateEnvVars),
      env: interpolateEnvRecord(definition.requestHeadersCommand.env),
      timeoutMs: definition.requestHeadersCommand.timeoutMs
    } : void 0,
    auth: definition.auth,
    protocolVersion: definition.protocolVersion,
    bearerToken: resolveBearerToken(definition),
    bearerTokenEnv: definition.bearerTokenEnv,
    exposeResources: definition.exposeResources,
    includeTools: definition.includeTools,
    excludeTools: definition.excludeTools
  };
  const normalized = stableStringify(identity);
  return createHash2("sha256").update(normalized).digest("hex");
}
function isServerCacheValid(entry, definition, maxAgeMs = CACHE_MAX_AGE_MS) {
  let configHash;
  try {
    configHash = computeServerHash(definition);
  } catch {
    return false;
  }
  if (!entry || entry.configHash !== configHash) return false;
  if (!entry.cachedAt || typeof entry.cachedAt !== "number") return false;
  if (maxAgeMs > 0 && Date.now() - entry.cachedAt > maxAgeMs) return false;
  return true;
}
function parseDirectToolSelectors(selectors) {
  const servers = /* @__PURE__ */ new Set();
  const tools = /* @__PURE__ */ new Map();
  for (let selector of selectors) {
    selector = selector.replace(/\/+$/, "");
    if (selector.includes("/")) {
      const [server2, tool] = selector.split("/", 2);
      if (server2 && tool) {
        const serverTools = tools.get(server2) ?? /* @__PURE__ */ new Set();
        serverTools.add(tool);
        tools.set(server2, serverTools);
      } else if (server2) {
        servers.add(server2);
      }
    } else if (selector) {
      servers.add(selector);
    }
  }
  return { servers, tools };
}
function getMissingConfiguredDirectToolServers(config, cache, envOverride) {
  const missing = [];
  const globalDirect = config.settings?.directTools;
  const envSelection = envOverride ? parseDirectToolSelectors(envOverride) : null;
  for (const [serverName, definition] of Object.entries(config.mcpServers)) {
    if (isServerDisabled(definition)) continue;
    const hasDirectTools = envSelection ? envSelection.servers.has(serverName) || envSelection.tools.has(serverName) : definition.directTools !== void 0 ? !!definition.directTools : !!globalDirect;
    if (!hasDirectTools) continue;
    const serverCache = cache?.servers?.[serverName];
    if (!serverCache || !isServerCacheValid(serverCache, definition)) {
      missing.push(serverName);
    }
  }
  return missing;
}
function reconstructToolMetadata(serverName, entry, prefix, definition, configuredServers, cache) {
  const metadata = [];
  const seenNames = /* @__PURE__ */ new Set();
  const effectivePrefix = resolveToolPrefix(definition, prefix);
  const hasToolFilters = Array.isArray(definition.includeTools) && definition.includeTools.length > 0 || Array.isArray(definition.excludeTools) && definition.excludeTools.length > 0;
  const selectorCandidateIndex = hasToolFilters && configuredServers && cache ? (() => {
    const candidates = /* @__PURE__ */ new Set();
    for (const [otherServerName, otherDefinition] of Object.entries(configuredServers)) {
      const otherEntry = cache.servers[otherServerName];
      if (!otherEntry || !isServerCacheValid(otherEntry, otherDefinition) || isServerDisabled(otherDefinition)) continue;
      const otherPrefix = resolveToolPrefix(otherDefinition, prefix);
      for (const otherTool of otherEntry.tools ?? []) {
        if (!isUiToolVisibleToModel(otherTool.uiVisibility)) continue;
        for (const candidate of getToolNameCandidates(otherTool.name, otherServerName, otherPrefix, false)) candidates.add(candidate);
      }
      if (otherDefinition.exposeResources !== false) {
        for (const resource of otherEntry.resources ?? []) {
          const baseName = `read_${resourceNameToToolName(resource.name)}`;
          for (const candidate of getToolNameCandidates(baseName, otherServerName, otherPrefix, false)) candidates.add(candidate);
        }
      }
    }
    return createToolSelectorCandidateIndex(candidates);
  })() : void 0;
  for (const tool of entry.tools ?? []) {
    if (!tool?.name) continue;
    if (!isUiToolVisibleToModel(tool.uiVisibility)) {
      continue;
    }
    if (!isToolAllowed(tool.name, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) {
      continue;
    }
    const name = formatToolName(tool.name, serverName, effectivePrefix);
    if (seenNames.has(name)) {
      continue;
    }
    seenNames.add(name);
    metadata.push({
      name,
      originalName: tool.name,
      description: tool.description ?? "",
      ...tool.inputSchema !== void 0 ? { inputSchema: tool.inputSchema } : {},
      ...tool.uiResourceUri !== void 0 ? { uiResourceUri: tool.uiResourceUri } : {},
      ...tool.uiVisibility !== void 0 ? { uiVisibility: tool.uiVisibility } : {},
      ...tool.uiStreamMode !== void 0 ? { uiStreamMode: tool.uiStreamMode } : {}
    });
  }
  if (definition.exposeResources !== false) {
    for (const resource of entry.resources ?? []) {
      if (!resource?.name || !resource?.uri) continue;
      const baseName = `read_${resourceNameToToolName(resource.name)}`;
      if (!isToolAllowed(baseName, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) {
        continue;
      }
      const name = formatToolName(baseName, serverName, effectivePrefix);
      if (seenNames.has(name)) {
        continue;
      }
      seenNames.add(name);
      metadata.push({
        name,
        originalName: baseName,
        description: resource.description ?? `Read resource: ${resource.uri}`,
        resourceUri: resource.uri
      });
    }
  }
  return metadata;
}
function serializeTools(tools) {
  return tools.filter((t) => t?.name).map((t) => {
    const uiResourceUri = tryGetToolUiResourceUri(t);
    const uiVisibility = extractUiToolVisibility(t._meta);
    const uiStreamMode = extractToolUiStreamMode(t._meta);
    return {
      name: t.name,
      ...t.description !== void 0 ? { description: t.description } : {},
      ...t.inputSchema !== void 0 ? { inputSchema: t.inputSchema } : {},
      ...uiResourceUri !== void 0 ? { uiResourceUri } : {},
      ...uiVisibility !== void 0 ? { uiVisibility } : {},
      ...uiStreamMode !== void 0 ? { uiStreamMode } : {}
    };
  });
}
function serializeResources(resources) {
  return resources.filter((r) => r?.name && r?.uri).map((r) => ({
    uri: r.uri,
    name: r.name,
    ...r.description !== void 0 ? { description: r.description } : {}
  }));
}
function serializePrompts(prompts) {
  return (prompts ?? []).filter((prompt) => prompt?.name).map((prompt) => ({
    name: prompt.name,
    ...prompt.title !== void 0 ? { title: prompt.title } : {},
    ...prompt.description !== void 0 ? { description: prompt.description } : {},
    ...Array.isArray(prompt.arguments) ? {
      arguments: prompt.arguments.filter((argument) => argument?.name).map((argument) => ({
        name: argument.name,
        ...argument.description !== void 0 ? { description: argument.description } : {},
        ...argument.required !== void 0 ? { required: argument.required } : {}
      }))
    } : {}
  }));
}
function reconstructPromptMetadata(serverName, prompts, prefix, definition) {
  const effectivePrefix = resolveToolPrefix(definition, prefix);
  return (prompts ?? []).filter((prompt) => prompt?.name).map((prompt) => {
    const args = Array.isArray(prompt.arguments) ? prompt.arguments.filter((argument) => argument?.name).map((argument) => ({
      name: argument.name,
      ...argument.description !== void 0 ? { description: argument.description } : {},
      ...argument.required !== void 0 ? { required: argument.required } : {}
    })) : [];
    return {
      serverName,
      originalName: prompt.name,
      commandName: formatPromptCommandName(prompt.name, serverName, effectivePrefix),
      ...prompt.title !== void 0 ? { title: prompt.title } : {},
      description: prompt.description ?? "",
      arguments: args
    };
  });
}
function stableStringify(value) {
  if (value === null || value === void 0 || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    return serialized === void 0 ? "undefined" : serialized;
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
function tryGetToolUiResourceUri(tool) {
  try {
    return getToolUiResourceUri({ _meta: tool._meta });
  } catch {
    return void 0;
  }
}
var CACHE_VERSION, CACHE_MAX_AGE_MS;
var init_metadata_cache = __esm({
  "metadata-cache.ts"() {
    "use strict";
    init_agent_dir();
    init_ui_app_bridge_helpers();
    init_types();
    init_resource_tools();
    init_utils();
    init_ui_tool_visibility();
    CACHE_VERSION = 1;
    CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
  }
});

// panel-keys.ts
import { matchesKey } from "@earendil-works/pi-tui";
function configuredSaveKeys(keybindings) {
  const explicit = keybindings?.getUserBindings?.()["mcp.panel.save"];
  if (explicit !== void 0) return { keys: Array.isArray(explicit) ? explicit : [explicit], configured: true };
  return { keys: [], configured: false };
}
function createPanelKeys(keybindings) {
  const saveBinding = configuredSaveKeys(keybindings);
  if (keybindings) {
    return {
      selectUp: (data) => keybindings.matches(data, "tui.select.up"),
      selectDown: (data) => keybindings.matches(data, "tui.select.down"),
      selectConfirm: (data) => keybindings.matches(data, "tui.select.confirm"),
      save: (data) => saveBinding.keys.length > 0 ? saveBinding.keys.some((key) => matchesKey(data, key)) : !saveBinding.configured && matchesKey(data, "ctrl+s"),
      saveLabel: () => saveBinding.keys[0] ?? (saveBinding.configured ? null : "ctrl+s")
    };
  }
  return {
    selectUp: (data) => matchesKey(data, "up"),
    selectDown: (data) => matchesKey(data, "down"),
    selectConfirm: (data) => matchesKey(data, "return"),
    save: (data) => matchesKey(data, "ctrl+s"),
    saveLabel: () => "ctrl+s"
  };
}
var init_panel_keys = __esm({
  "panel-keys.ts"() {
    "use strict";
  }
});

// mcp-setup-panel.ts
var mcp_setup_panel_exports = {};
__export(mcp_setup_panel_exports, {
  McpSetupPanel: () => McpSetupPanel,
  createMcpSetupPanel: () => createMcpSetupPanel
});
import { matchesKey as matchesKey2, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
function fg(code, text) {
  return code ? `\x1B[${code}m${text}\x1B[0m` : text;
}
function wrapText(text, width) {
  if (width <= 8) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (visibleWidth(candidate) <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
function createMcpSetupPanel(discovery, callbacks, options, tui, done) {
  return new McpSetupPanel(discovery, callbacks, options, tui, done);
}
var DEFAULT_THEME, MIN_PANEL_WIDTH, COMPACT_WIDTH, COMPACT_ACTION_ROWS, DESKTOP_PREVIEW_WIDTH, McpSetupPanel;
var init_mcp_setup_panel = __esm({
  "mcp-setup-panel.ts"() {
    "use strict";
    init_panel_keys();
    init_agent_dir();
    init_config();
    DEFAULT_THEME = {
      border: "2",
      title: "36",
      selected: "32",
      hint: "2",
      success: "32",
      warning: "33",
      muted: "2;3"
    };
    MIN_PANEL_WIDTH = 24;
    COMPACT_WIDTH = 60;
    COMPACT_ACTION_ROWS = 7;
    DESKTOP_PREVIEW_WIDTH = 74;
    McpSetupPanel = class _McpSetupPanel {
      constructor(discovery, callbacks, options, tui, done) {
        this.discovery = discovery;
        this.callbacks = callbacks;
        this.options = options;
        this.done = done;
        this.tui = tui;
        this.keys = createPanelKeys(options.keybindings);
        this.screen = options.mode;
        for (const entry of discovery.imports) {
          this.selectedImports.add(entry.kind);
        }
        this.resetInactivityTimeout();
      }
      discovery;
      callbacks;
      options;
      done;
      screen;
      actionCursor = 0;
      importCursor = 0;
      pathCursor = 0;
      selectedImports = /* @__PURE__ */ new Set();
      busy = false;
      notice = null;
      tui;
      t = DEFAULT_THEME;
      keys;
      inactivityTimeout = null;
      static INACTIVITY_MS = 6e4;
      resetInactivityTimeout() {
        if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = setTimeout(() => {
          this.cleanup();
          this.done();
        }, _McpSetupPanel.INACTIVITY_MS);
      }
      cleanup() {
        if (this.inactivityTimeout) {
          clearTimeout(this.inactivityTimeout);
          this.inactivityTimeout = null;
        }
      }
      getActions() {
        const actions = [];
        if (this.screen === "empty") {
          actions.push({ id: "run-setup", label: "Run setup", description: "Inspect detected configs, adopt imports, and scaffold a minimal `.mcp.json`." });
        }
        if (this.discovery.imports.length > 0) {
          actions.push({ id: "adopt-imports", label: "Adopt detected compatibility imports", description: `Choose which host-specific MCP configs Pi should import into its own override file. ${this.discovery.imports.length} source${this.discovery.imports.length === 1 ? "" : "s"} found.` });
        }
        actions.push({ id: "view-example", label: "View example `.mcp.json`", description: "Preview a working shared MCP config you can paste or adapt." });
        if (!this.discovery.sources.some((source) => source.id === "shared-project" && source.exists)) {
          actions.push({ id: "scaffold-project", label: "Scaffold project `.mcp.json`", description: "Write a minimal project config using the standard shared MCP file path, then reload Pi." });
        }
        actions.push({ id: "show-precedence", label: "Explain config precedence", description: "Show the read order and where Pi writes compatibility settings." });
        if (this.getDetectedPaths().length > 0) {
          actions.push({ id: "open-paths", label: "Open detected config paths", description: "Browse the actual config files that Pi discovered on this machine." });
        }
        for (const preset of KNOWN_SERVER_PRESETS) {
          actions.push({ id: "add-known-server", label: preset.name, description: preset.summary, preset });
        }
        if (!this.discovery.repoPrompt.configured && this.discovery.repoPrompt.executablePath && this.discovery.repoPrompt.targetPath && this.discovery.repoPrompt.entry && this.discovery.repoPrompt.serverName) {
          actions.push({ id: "add-repoprompt", label: "Add RepoPrompt to shared MCP config", description: "Write a standard MCP entry for RepoPrompt to the recommended shared target, then reload MCP in-session." });
        }
        actions.push({ id: "close", label: "Close", description: "Exit the onboarding flow." });
        return actions;
      }
      getDetectedPaths() {
        const paths = [
          ...this.discovery.sources.filter((source) => source.exists).map((source) => source.path),
          ...this.discovery.imports.map((entry) => entry.path)
        ];
        return [...new Set(paths)];
      }
      getSelectedAction() {
        const actions = this.getActions();
        return actions[this.actionCursor];
      }
      handleInput(data) {
        this.resetInactivityTimeout();
        if (!this.busy) this.notice = null;
        if (matchesKey2(data, "ctrl+c")) {
          this.cleanup();
          this.done();
          return;
        }
        if (matchesKey2(data, "escape")) {
          if (this.screen === "imports" || this.screen === "paths") {
            this.screen = this.discovery.hasAnyConfig ? "setup" : "empty";
            this.tui.requestRender();
            return;
          }
          this.cleanup();
          this.done();
          return;
        }
        if (this.busy) return;
        if (this.screen === "imports") {
          this.handleImportsInput(data);
          return;
        }
        if (this.screen === "paths") {
          this.handlePathsInput(data);
          return;
        }
        const actions = this.getActions();
        if (this.keys.selectUp(data)) {
          this.actionCursor = Math.max(0, this.actionCursor - 1);
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectDown(data)) {
          this.actionCursor = Math.min(actions.length - 1, this.actionCursor + 1);
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectConfirm(data)) {
          const selected = this.getSelectedAction();
          if (selected) void this.runAction(selected);
        }
      }
      handleImportsInput(data) {
        const imports = this.discovery.imports;
        if (this.keys.selectUp(data)) {
          this.importCursor = Math.max(0, this.importCursor - 1);
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectDown(data)) {
          this.importCursor = Math.min(imports.length - 1, this.importCursor + 1);
          this.tui.requestRender();
          return;
        }
        if (matchesKey2(data, "space")) {
          const current = imports[this.importCursor];
          if (!current) return;
          if (this.selectedImports.has(current.kind)) {
            this.selectedImports.delete(current.kind);
          } else {
            this.selectedImports.add(current.kind);
          }
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectConfirm(data)) {
          void this.applySelectedImports();
        }
      }
      handlePathsInput(data) {
        const paths = this.getDetectedPaths();
        if (this.keys.selectUp(data)) {
          this.pathCursor = Math.max(0, this.pathCursor - 1);
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectDown(data)) {
          this.pathCursor = Math.min(paths.length - 1, this.pathCursor + 1);
          this.tui.requestRender();
          return;
        }
        if (this.keys.selectConfirm(data)) {
          const selected = paths[this.pathCursor];
          if (!selected) return;
          void this.runBusy(async () => {
            await this.callbacks.openPath(selected);
            this.notice = { text: `Opened ${selected}`, tone: "success" };
          });
        }
      }
      async runAction(action) {
        if (action.id === "run-setup") {
          this.screen = "setup";
          this.actionCursor = 0;
          this.tui.requestRender();
          return;
        }
        if (action.id === "adopt-imports") {
          this.screen = "imports";
          this.importCursor = 0;
          this.tui.requestRender();
          return;
        }
        if (action.id === "open-paths") {
          this.screen = "paths";
          this.pathCursor = 0;
          this.tui.requestRender();
          return;
        }
        if (action.id === "scaffold-project") {
          await this.runBusy(async () => {
            const result = await this.callbacks.scaffoldProjectConfig();
            this.callbacks.markSetupCompleted();
            this.notice = { text: `Wrote starter config to ${result.path}. Pi will reload after this panel closes.`, tone: "success" };
          });
          return;
        }
        if (action.id === "add-repoprompt") {
          await this.runBusy(async () => {
            const result = await this.callbacks.addRepoPrompt();
            this.callbacks.markSetupCompleted();
            this.notice = { text: `Added ${result.serverName} to ${result.path}. Pi will reload after this panel closes.`, tone: "success" };
          });
          return;
        }
        if (action.id === "add-known-server" && action.preset) {
          const preset = action.preset;
          await this.runBusy(async () => {
            const result = await this.callbacks.addKnownServer(preset);
            this.callbacks.markSetupCompleted();
            this.notice = { text: `Added ${result.serverName} to ${result.path}. Pi will reload after this panel closes.`, tone: "success" };
          });
          return;
        }
        if (action.id === "close") {
          this.cleanup();
          this.done();
          return;
        }
        this.notice = { text: "Review the details below. Press Enter on an action with a side effect to apply it.", tone: "muted" };
        this.tui.requestRender();
      }
      async applySelectedImports() {
        const selected = this.discovery.imports.filter((entry) => this.selectedImports.has(entry.kind)).map((entry) => entry.kind);
        if (selected.length === 0) {
          this.notice = { text: "Select at least one compatibility import first.", tone: "warning" };
          this.tui.requestRender();
          return;
        }
        await this.runBusy(async () => {
          const result = await this.callbacks.adoptImports(selected);
          this.callbacks.markSetupCompleted();
          this.notice = result.added.length > 0 ? { text: `Added ${result.added.join(", ")} to ${result.path}. Pi will reload after this panel closes.`, tone: "success" } : { text: `No changes needed in ${result.path}.`, tone: "muted" };
          this.screen = this.discovery.hasAnyConfig ? "setup" : "empty";
          this.actionCursor = 0;
        });
      }
      async runBusy(fn) {
        this.busy = true;
        this.notice = { text: "Working...", tone: "muted" };
        this.tui.requestRender();
        try {
          await fn();
        } catch (error) {
          this.notice = {
            text: error instanceof Error ? error.message : String(error),
            tone: "warning"
          };
        } finally {
          this.busy = false;
          this.tui.requestRender();
        }
      }
      render(width) {
        const panelW = Math.max(MIN_PANEL_WIDTH, width);
        const innerW = panelW - 2;
        const contentW = this.contentWidth(innerW);
        const lines = [];
        const border = fg(this.t.border, "\u2500".repeat(innerW));
        lines.push(`\u250C${border}\u2510`);
        lines.push(this.padLine(fg(this.t.title, "MCP setup"), innerW));
        for (const line of wrapText(this.discoverySummaryLine(), contentW)) {
          lines.push(this.padLine(line, innerW));
        }
        for (const line of wrapText(this.secondarySummaryLine(), contentW)) {
          lines.push(this.padLine(fg(this.t.muted, line), innerW));
        }
        lines.push(this.padLine("", innerW));
        if (this.notice) {
          const tone = this.notice.tone === "success" ? this.t.success : this.notice.tone === "warning" ? this.t.warning : this.t.hint;
          for (const line of wrapText(this.notice.text, contentW)) {
            lines.push(this.padLine(fg(tone, line), innerW));
          }
          lines.push(this.padLine("", innerW));
        }
        lines.push(`\u251C${border}\u2524`);
        if (this.screen === "imports") {
          lines.push(...this.renderImports(innerW));
        } else if (this.screen === "paths") {
          lines.push(...this.renderPaths(innerW));
        } else {
          lines.push(...this.renderActions(innerW));
        }
        lines.push(`\u2514${border}\u2518`);
        return lines;
      }
      renderActions(innerW) {
        const lines = [];
        const actions = this.getActions();
        const compact = innerW < COMPACT_WIDTH;
        const { start, end } = compact ? this.visibleActionRange(actions.length) : { start: 0, end: actions.length };
        if (start > 0) {
          lines.push(this.padLine(fg(this.t.muted, `\u2026 ${start} more above`), innerW));
        }
        for (let index = start; index < end; index++) {
          const action = actions[index];
          if (!action) continue;
          if (action.id === "add-known-server" && (index === start || actions[index - 1]?.id !== "add-known-server")) {
            lines.push(this.padLine(fg(this.t.title, "Add a known server"), innerW));
          }
          const selected = index === this.actionCursor;
          const cursor = selected ? fg(this.t.selected, "\u203A") : " ";
          lines.push(this.padLine(`${cursor} ${truncateToWidth(action.label, this.contentWidth(innerW) - 2)}`, innerW));
        }
        if (end < actions.length) {
          lines.push(this.padLine(fg(this.t.muted, `\u2026 ${actions.length - end} more below`), innerW));
        }
        lines.push(this.padLine("", innerW));
        const preview = this.getActionPreview(this.getSelectedAction(), this.previewWidth(innerW));
        for (const line of preview) {
          lines.push(this.padLine(line, innerW));
        }
        lines.push(this.padLine("", innerW));
        const hint = compact ? "Enter select \xB7 Esc back" : "Enter selects, Esc goes back, Ctrl+C closes.";
        lines.push(this.padLine(fg(this.t.muted, hint), innerW));
        return lines;
      }
      renderImports(innerW) {
        const lines = [];
        lines.push(this.padLine("Select compatibility imports. Space toggles, Enter saves, Esc goes back.", innerW));
        lines.push(this.padLine("", innerW));
        for (let index = 0; index < this.discovery.imports.length; index++) {
          const entry = this.discovery.imports[index];
          if (!entry) continue;
          const selected2 = this.selectedImports.has(entry.kind) ? "[x]" : "[ ]";
          const cursor = index === this.importCursor ? fg(this.t.selected, "\u203A") : " ";
          lines.push(this.padLine(`${cursor} ${selected2} ${entry.kind}  ${entry.path}`, innerW));
        }
        lines.push(this.padLine("", innerW));
        const selected = this.discovery.imports.filter((entry) => this.selectedImports.has(entry.kind)).map((entry) => entry.kind);
        const preview = this.callbacks.previewImports(selected);
        for (const line of this.formatWritePreview("Compatibility import write preview", preview, [], this.previewWidth(innerW))) {
          lines.push(this.padLine(line, innerW));
        }
        return lines;
      }
      renderPaths(innerW) {
        const lines = [];
        lines.push(this.padLine("Select a detected config path to open. Enter opens it, Esc goes back.", innerW));
        lines.push(this.padLine("", innerW));
        const paths = this.getDetectedPaths();
        for (let index = 0; index < paths.length; index++) {
          const cursor = index === this.pathCursor ? fg(this.t.selected, "\u203A") : " ";
          const path2 = paths[index];
          if (path2 !== void 0) lines.push(this.padLine(`${cursor} ${path2}`, innerW));
        }
        return lines;
      }
      discoverySummaryLine() {
        if (!this.discovery.hasAnyConfig) {
          return fg(this.t.warning, this.options.onboardingState.setupCompleted ? "No MCP servers are active right now." : "No MCP config is active yet.");
        }
        if (this.discovery.totalServerCount === 0 && (this.discovery.imports.length > 0 || !!this.discovery.repoPrompt.executablePath)) {
          return fg(this.t.warning, "Pi found MCP-related setup options, but none are active in Pi yet.");
        }
        const shared = this.discovery.sources.filter((source) => source.kind === "shared" && source.serverCount > 0).length;
        const piOwned = this.discovery.sources.filter((source) => source.kind === "pi" && source.serverCount > 0).length;
        return fg(this.t.hint, `Detected ${this.discovery.totalServerCount} configured servers across ${shared} shared and ${piOwned} Pi-owned source${shared + piOwned === 1 ? "" : "s"}.`);
      }
      secondarySummaryLine() {
        const hostNote = this.discovery.hostConfigs.length > 0 ? ` Host discovery is ${this.discovery.hostConfigDiscovery}; ${this.discovery.hostConfigs.length} host source${this.discovery.hostConfigs.length === 1 ? "" : "s"} detected.` : "";
        const conflictNote = this.discovery.conflicts.length > 0 ? ` ${this.discovery.conflicts.length} same-name conflict${this.discovery.conflicts.length === 1 ? "" : "s"} reported.` : "";
        if (!this.discovery.hasAnyConfig) {
          return `Create a shared .mcp.json, adopt host imports, or quick-add RepoPrompt from this screen.${hostNote}${conflictNote}`;
        }
        if (this.discovery.totalServerCount === 0 && this.discovery.imports.length > 0) {
          return `Detected ${this.discovery.imports.length} compatibility import source${this.discovery.imports.length === 1 ? "" : "s"}. Adopt them into Pi or inspect the underlying files.${hostNote}${conflictNote}`;
        }
        return `Shared MCP files are preferred. Pi-owned files are only for compatibility imports and adapter-specific overrides.${hostNote}${conflictNote}`;
      }
      visibleActionRange(total) {
        if (total <= COMPACT_ACTION_ROWS) return { start: 0, end: total };
        const half = Math.floor(COMPACT_ACTION_ROWS / 2);
        const start = Math.min(Math.max(0, this.actionCursor - half), Math.max(0, total - COMPACT_ACTION_ROWS));
        return { start, end: Math.min(total, start + COMPACT_ACTION_ROWS) };
      }
      contentWidth(innerW) {
        return Math.max(8, innerW - 4);
      }
      previewWidth(innerW) {
        return Math.max(12, Math.min(DESKTOP_PREVIEW_WIDTH, this.contentWidth(innerW)));
      }
      getActionPreview(action, previewW = DESKTOP_PREVIEW_WIDTH) {
        switch (action?.id) {
          case "run-setup":
            return this.formatPreview([
              "Run setup to adopt host-specific imports, inspect detected paths, and scaffold a minimal `.mcp.json` if needed."
            ], previewW);
          case "adopt-imports":
            return this.formatWritePreview(
              "Compatibility import write preview",
              this.callbacks.previewImports(this.discovery.imports.filter((entry) => this.selectedImports.has(entry.kind)).map((entry) => entry.kind)),
              [
                `Detected imports: ${this.discovery.imports.map((entry) => `${entry.kind} (${entry.serverCount} servers)`).join(", ")}`,
                "Selected imports are written into the Pi agent dir config as Pi-owned compatibility state."
              ],
              previewW
            );
          case "view-example":
            return this.formatPreview([
              "Example shared `.mcp.json`:",
              "{",
              '  "mcpServers": {',
              '    "chrome-devtools": {',
              '      "command": "npx",',
              '      "args": ["-y", "chrome-devtools-mcp@1.6.0"]',
              "    }",
              "  }",
              "}",
              "",
              "Use Scaffold project `.mcp.json` when you want a safe empty shell instead of a live example server."
            ], previewW);
          case "show-precedence":
            return this.formatPreview([
              "Read order (later entries win):",
              "0. detected host configs (opt-in lowest-precedence fallback)",
              "1. ~/.config/mcp/mcp.json",
              "2. ~/.agents/mcp.json",
              "3. ~/.agents/mcp/mcp.json",
              "4. <Pi agent dir>/mcp.json",
              "5. .mcp.json",
              `6. ${getConfigDirName()}/mcp.json`,
              `Host discovery: ${this.discovery.hostConfigDiscovery}. Conflicts reported: ${this.discovery.conflicts.length}.`,
              ...this.discovery.conflicts.slice(0, 8).map(
                (conflict) => `${conflict.serverName}: ${conflict.sources.map((source) => source.path).join(" -> ")} (winner: ${conflict.winner.path})`
              ),
              "Pi writes compatibility imports and adapter-only overrides to Pi-owned files."
            ], previewW);
          case "open-paths":
            return this.formatPreview(this.getDetectedPaths().length > 0 ? ["Detected paths:", ...this.getDetectedPaths()] : ["No config paths were detected."], previewW);
          case "add-repoprompt": {
            const repoPrompt = this.discovery.repoPrompt;
            const preview = this.callbacks.previewRepoPrompt();
            if (!preview) {
              return this.formatPreview(["RepoPrompt is not available to add from this setup screen."], previewW);
            }
            return this.formatWritePreview(
              "RepoPrompt write preview",
              preview,
              [
                `Executable: ${repoPrompt.executablePath ?? "not found"}`,
                `Target: ${repoPrompt.targetPath ?? "n/a"}`,
                `Server name: ${repoPrompt.serverName ?? "repoprompt"}`
              ],
              previewW
            );
          }
          case "add-known-server": {
            const preset = action.preset;
            if (!preset) return this.formatPreview(["Known server preset is unavailable."], previewW);
            return this.formatWritePreview(
              `${preset.name} write preview`,
              this.callbacks.previewKnownServer(preset),
              [preset.summary],
              previewW
            );
          }
          case "scaffold-project":
            return this.formatWritePreview(
              "Starter project `.mcp.json` write preview",
              this.callbacks.previewStarterProject(),
              [
                "This writes a minimal `.mcp.json` in the current project using the shared MCP layout.",
                "It intentionally avoids adding a fake placeholder server that would fail on first reload."
              ],
              previewW
            );
          case "close":
          default:
            return this.formatPreview(["Close the setup flow."], previewW);
        }
      }
      formatPreview(lines, width = DESKTOP_PREVIEW_WIDTH) {
        const preview = [];
        for (const line of lines) {
          preview.push(...wrapText(line, width));
        }
        return preview;
      }
      formatWritePreview(title, preview, intro = [], width = DESKTOP_PREVIEW_WIDTH) {
        const lines = [];
        for (const line of intro) {
          lines.push(...wrapText(line, width));
        }
        if (intro.length > 0) lines.push("");
        lines.push(...wrapText(`${title}: ${preview.path}`, width));
        lines.push(...wrapText(preview.existed ? "Existing file detected. Showing exact before/after diff." : "New file will be created. Showing exact content diff.", width));
        lines.push("");
        const diffLines = preview.diffText.split("\n");
        const maxLines = 18;
        const shown = diffLines.slice(0, maxLines);
        for (const line of shown) {
          lines.push(...wrapText(line, width));
        }
        if (diffLines.length > maxLines) {
          lines.push(...wrapText(`\u2026 ${diffLines.length - maxLines} more diff line${diffLines.length - maxLines === 1 ? "" : "s"}`, width));
        }
        return lines;
      }
      padLine(text, innerW) {
        const inset = 2;
        const contentW = Math.max(0, innerW - inset * 2);
        const fitted = truncateToWidth(text, contentW, "\u2026", true);
        const plainWidth = visibleWidth(fitted);
        const padding = Math.max(0, contentW - plainWidth);
        return `\u2502${" ".repeat(inset)}${fitted}${" ".repeat(padding)}${" ".repeat(inset)}\u2502`;
      }
      invalidate() {
      }
      dispose() {
        this.cleanup();
      }
    };
  }
});

// mcp-panel.ts
var mcp_panel_exports = {};
__export(mcp_panel_exports, {
  createMcpPanel: () => createMcpPanel
});
import { matchesKey as matchesKey3, truncateToWidth as truncateToWidth2, visibleWidth as visibleWidth2 } from "@earendil-works/pi-tui";
import { copyToClipboard } from "@earendil-works/pi-coding-agent";
function fg2(code, text) {
  if (!code) return text;
  return `\x1B[${code}m${text}\x1B[0m`;
}
function rainbowProgress(filled, total) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    const color = RAINBOW_COLORS[i % RAINBOW_COLORS.length];
    if (!color) continue;
    dots.push(fg2(color, i < filled ? "\u25CF" : "\u25CB"));
  }
  return dots.join(" ");
}
function fuzzyScore(query, text) {
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  if (lt.includes(lq)) return 100 + lq.length / lt.length * 50;
  let score = 0;
  let qi = 0;
  let consecutive = 0;
  for (let i = 0; i < lt.length && qi < lq.length; i++) {
    if (lt[i] === lq[qi]) {
      score += 10 + consecutive;
      consecutive += 5;
      qi++;
    } else {
      consecutive = 0;
    }
  }
  return qi === lq.length ? score : 0;
}
function sanitizeDisplayText(text) {
  return sanitizeTerminalText(text ?? "");
}
function sanitizeRowContent(content) {
  const withoutOsc = stripOscSequences(content);
  let result = "";
  let pendingSpace = false;
  for (let i = 0; i < withoutOsc.length; i++) {
    const rest = withoutOsc.slice(i);
    const ansi = rest.match(/^(?:\x1b\[[0-?]*[ -/]*[@-~]|\x1b[@-Z\\-_])/);
    if (ansi) {
      result += ansi[0];
      i += ansi[0].length - 1;
      continue;
    }
    const code = withoutOsc.charCodeAt(i);
    if (code <= 31 || code === 127 || code >= 128 && code <= 159) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && result && !result.endsWith(" ")) {
      result += " ";
    }
    pendingSpace = false;
    result += withoutOsc[i];
  }
  return result;
}
function estimateTokens(tool) {
  const schemaLen = JSON.stringify(tool.inputSchema ?? {}).length;
  const descLen = tool.description?.length ?? 0;
  return Math.ceil((tool.name.length + descLen + schemaLen) / 4) + 10;
}
function createMcpPanel(config, cache, provenance, callbacks, tui, done, options) {
  return new McpPanel(config, cache, provenance, callbacks, tui, done, options ?? {});
}
var DEFAULT_THEME2, RAINBOW_COLORS, McpPanel;
var init_mcp_panel = __esm({
  "mcp-panel.ts"() {
    "use strict";
    init_panel_keys();
    init_types();
    init_resource_tools();
    init_utils();
    init_metadata_cache();
    init_ui_tool_visibility();
    DEFAULT_THEME2 = {
      border: "2",
      title: "2",
      selected: "36",
      direct: "32",
      needsAuth: "33",
      placeholder: "2;3",
      description: "2",
      hint: "2",
      confirm: "32",
      cancel: "31"
    };
    RAINBOW_COLORS = [
      "38;2;178;129;214",
      "38;2;215;135;175",
      "38;2;254;188;56",
      "38;2;228;192;15",
      "38;2;137;210;129",
      "38;2;0;175;175",
      "38;2;23;143;185"
    ];
    McpPanel = class _McpPanel {
      constructor(config, cache, provenance, callbacks, tui, done, options = {}) {
        this.config = config;
        this.cache = cache;
        this.callbacks = callbacks;
        this.done = done;
        this.tui = tui;
        this.noticeLines = options.noticeLines ?? [];
        this.authOnly = options.authOnly === true;
        this.keys = createPanelKeys(options.keybindings);
        this.prefix = config.settings?.toolPrefix ?? "server";
        for (const [serverName, definition] of Object.entries(config.mcpServers)) {
          if (this.authOnly && !callbacks.canAuthenticate(serverName)) continue;
          const prov = provenance.get(serverName);
          const cachedEntry = this.cache?.servers?.[serverName];
          const serverCache = cachedEntry && isServerCacheValid(cachedEntry, definition) ? cachedEntry : void 0;
          const globalDirect = config.settings?.directTools;
          let toolFilter = false;
          if (definition.directTools !== void 0) {
            toolFilter = definition.directTools;
          } else if (globalDirect) {
            toolFilter = globalDirect;
          }
          const tools = [];
          if (serverCache && !this.authOnly && !isServerDisabled(definition)) {
            for (const tool of serverCache.tools ?? []) {
              if (!isUiToolVisibleToModel(tool.uiVisibility)) continue;
              if (!isToolAllowed(tool.name, serverName, this.prefix, definition.includeTools, definition.excludeTools, this.getOtherCurrentCandidates(serverName, definition, serverCache, tool.name))) {
                continue;
              }
              const isDirect = toolFilter === true || Array.isArray(toolFilter) && toolFilter.includes(tool.name);
              tools.push({
                name: tool.name,
                description: tool.description ?? "",
                isDirect,
                wasDirect: isDirect,
                estimatedTokens: estimateTokens(tool)
              });
            }
            if (definition.exposeResources !== false) {
              for (const resource of serverCache.resources ?? []) {
                const baseName = `read_${resourceNameToToolName(resource.name)}`;
                if (!isToolAllowed(baseName, serverName, this.prefix, definition.includeTools, definition.excludeTools, this.getOtherCurrentCandidates(serverName, definition, serverCache, baseName))) {
                  continue;
                }
                const isDirect = toolFilter === true || Array.isArray(toolFilter) && toolFilter.includes(baseName);
                const ct = {
                  name: baseName,
                  ...resource.description !== void 0 ? { description: resource.description } : {}
                };
                tools.push({
                  name: baseName,
                  description: resource.description ?? `Read resource: ${resource.uri}`,
                  isDirect,
                  wasDirect: isDirect,
                  estimatedTokens: estimateTokens(ct)
                });
              }
            }
          }
          const status = callbacks.getConnectionStatus(serverName);
          const failureMessage = callbacks.getFailureMessage?.(serverName) ?? null;
          this.servers.push({
            name: serverName,
            expanded: false,
            source: prov?.kind ?? "user",
            ...prov?.importKind !== void 0 ? { importKind: prov.importKind } : {},
            ...definition.includeTools !== void 0 ? { includeTools: definition.includeTools } : {},
            ...definition.excludeTools !== void 0 ? { excludeTools: definition.excludeTools } : {},
            exposeResources: definition.exposeResources !== false,
            connectionStatus: status,
            failureMessage,
            tools,
            hasCachedData: !!serverCache
          });
        }
        this.rebuildVisibleItems();
        this.resetInactivityTimeout();
      }
      config;
      cache;
      callbacks;
      done;
      noticeLines;
      prefix;
      servers = [];
      cursorIndex = 0;
      nameQuery = "";
      descSearchActive = false;
      descQuery = "";
      dirty = false;
      confirmingDiscard = false;
      discardSelected = 1;
      importNotice = null;
      authNotice = null;
      authInFlight = null;
      inactivityTimeout = null;
      visibleItems = [];
      tui;
      t = DEFAULT_THEME2;
      authOnly;
      keys;
      static MAX_VISIBLE = 12;
      static INACTIVITY_MS = 6e4;
      resetInactivityTimeout() {
        if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = setTimeout(() => {
          this.cleanup();
          this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
        }, _McpPanel.INACTIVITY_MS);
      }
      cleanup() {
        if (this.inactivityTimeout) {
          clearTimeout(this.inactivityTimeout);
          this.inactivityTimeout = null;
        }
      }
      rebuildVisibleItems() {
        const query = this.descSearchActive ? this.descQuery : this.nameQuery;
        const mode = this.descSearchActive ? "desc" : "name";
        this.visibleItems = [];
        for (let si = 0; si < this.servers.length; si++) {
          const server2 = this.servers[si];
          if (!server2) continue;
          if (query && this.authOnly) {
            const score = mode === "name" ? fuzzyScore(query, server2.name) : 0;
            if (score > 0) {
              this.visibleItems.push({ type: "server", serverIndex: si });
            }
            continue;
          }
          this.visibleItems.push({ type: "server", serverIndex: si });
          if (server2.expanded || query) {
            for (let ti = 0; ti < server2.tools.length; ti++) {
              const tool = server2.tools[ti];
              if (!tool) continue;
              if (query) {
                const score = mode === "name" ? Math.max(
                  fuzzyScore(query, tool.name),
                  fuzzyScore(query, server2.name) * 0.6
                ) : fuzzyScore(query, tool.description);
                if (score === 0) continue;
              }
              this.visibleItems.push({ type: "tool", serverIndex: si, toolIndex: ti });
            }
          }
        }
        if (query && !this.authOnly) {
          this.visibleItems = this.visibleItems.filter((item) => {
            if (item.type === "server") {
              return this.visibleItems.some(
                (other) => other.type === "tool" && other.serverIndex === item.serverIndex
              );
            }
            return true;
          });
        }
      }
      updateDirty() {
        this.dirty = this.servers.some((s) => s.tools.some((t) => t.isDirect !== t.wasDirect));
      }
      buildResult() {
        const changes = /* @__PURE__ */ new Map();
        for (const server2 of this.servers) {
          const changed = server2.tools.some((t) => t.isDirect !== t.wasDirect);
          if (!changed) continue;
          const directTools = server2.tools.filter((t) => t.isDirect);
          if (directTools.length === server2.tools.length && server2.tools.length > 0) {
            changes.set(server2.name, true);
          } else if (directTools.length === 0) {
            changes.set(server2.name, false);
          } else {
            changes.set(server2.name, directTools.map((t) => t.name));
          }
        }
        return { changes, cancelled: false };
      }
      handleInput(data) {
        this.resetInactivityTimeout();
        this.importNotice = null;
        if (!this.authInFlight) this.authNotice = null;
        if (this.confirmingDiscard) {
          this.handleDiscardInput(data);
          return;
        }
        if (matchesKey3(data, "ctrl+c")) {
          this.cleanup();
          this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
          return;
        }
        if (this.keys.save(data)) {
          this.cleanup();
          this.done(this.buildResult());
          return;
        }
        if (this.descSearchActive) {
          if (matchesKey3(data, "escape") || this.keys.selectConfirm(data)) {
            this.descSearchActive = false;
            this.descQuery = "";
            this.rebuildVisibleItems();
            this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
            return;
          }
          if (matchesKey3(data, "backspace")) {
            if (this.descQuery.length > 0) {
              this.descQuery = this.descQuery.slice(0, -1);
              this.rebuildVisibleItems();
              this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
            }
            return;
          }
          if (this.keys.selectUp(data)) {
            this.moveCursor(-1);
            return;
          }
          if (this.keys.selectDown(data)) {
            this.moveCursor(1);
            return;
          }
          if (matchesKey3(data, "space")) {
            const item = this.visibleItems[this.cursorIndex];
            if (item) this.toggleItem(item);
            return;
          }
          if (data.length === 1 && data.charCodeAt(0) >= 32) {
            this.descQuery += data;
            this.rebuildVisibleItems();
            this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
            return;
          }
          return;
        }
        if (matchesKey3(data, "escape")) {
          if (this.nameQuery) {
            this.nameQuery = "";
            this.rebuildVisibleItems();
            this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
            return;
          }
          if (this.dirty) {
            this.confirmingDiscard = true;
            this.discardSelected = 1;
            return;
          }
          this.cleanup();
          this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
          return;
        }
        if (this.keys.selectUp(data)) {
          this.moveCursor(-1);
          return;
        }
        if (this.keys.selectDown(data)) {
          this.moveCursor(1);
          return;
        }
        if (matchesKey3(data, "space")) {
          const item = this.visibleItems[this.cursorIndex];
          if (item && !this.authOnly) this.toggleItem(item);
          return;
        }
        if (this.keys.selectConfirm(data)) {
          const item = this.visibleItems[this.cursorIndex];
          if (!item) return;
          const server2 = this.servers[item.serverIndex];
          if (!server2) return;
          if (item.type === "server") {
            if (server2.connectionStatus === "disabled") return;
            if (this.authOnly || server2.connectionStatus === "needs-auth") {
              this.authenticateServer(server2);
              return;
            }
            server2.expanded = !server2.expanded;
            this.rebuildVisibleItems();
            this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
          } else if (item.toolIndex !== void 0) {
            const tool = server2.tools[item.toolIndex];
            if (!tool) return;
            tool.isDirect = !tool.isDirect;
            if (tool.isDirect && server2.source === "import") {
              this.importNotice = `Imported from ${sanitizeDisplayText(server2.importKind ?? "external")} \u2014 will copy to user config on save`;
            }
            this.updateDirty();
          }
          return;
        }
        if (matchesKey3(data, "ctrl+a")) {
          const item = this.visibleItems[this.cursorIndex];
          if (item) this.authenticateSelectedServer(item);
          return;
        }
        if (matchesKey3(data, "ctrl+r")) {
          const item = this.visibleItems[this.cursorIndex];
          if (!item) return;
          const server2 = this.servers[item.serverIndex];
          if (server2) this.reconnectServer(server2);
          return;
        }
        if (matchesKey3(data, "ctrl+y")) {
          const item = this.visibleItems[this.cursorIndex];
          if (!item) return;
          const server2 = this.servers[item.serverIndex];
          if (!server2 || server2.connectionStatus !== "failed" || !server2.failureMessage) return;
          const serverName = sanitizeDisplayText(server2.name);
          const failureMessage = sanitizeDisplayText(server2.failureMessage);
          copyToClipboard(failureMessage).then(() => {
            this.authNotice = `Copied error for ${serverName} to clipboard`;
            this.tui.requestRender();
          }).catch((error) => {
            const message = sanitizeDisplayText(error instanceof Error ? error.message : String(error));
            this.authNotice = `Failed to copy error for ${serverName}: ${message}`;
            this.tui.requestRender();
          });
          return;
        }
        if (data === "?") {
          if (this.authOnly) return;
          this.descSearchActive = true;
          this.descQuery = "";
          this.rebuildVisibleItems();
          this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
          return;
        }
        if (matchesKey3(data, "backspace")) {
          if (this.nameQuery.length > 0) {
            this.nameQuery = this.nameQuery.slice(0, -1);
            this.rebuildVisibleItems();
            this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
          }
          return;
        }
        if (data.length === 1 && data.charCodeAt(0) >= 32) {
          this.nameQuery += data;
          this.rebuildVisibleItems();
          this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.visibleItems.length - 1));
          return;
        }
      }
      authenticateSelectedServer(item) {
        const server2 = this.servers[item.serverIndex];
        if (server2) this.authenticateServer(server2);
      }
      authenticateServer(server2) {
        if (this.authInFlight) return;
        if (server2.connectionStatus === "connecting" || server2.connectionStatus === "disabled") return;
        const serverName = sanitizeDisplayText(server2.name);
        if (!this.callbacks.canAuthenticate(server2.name)) {
          this.authNotice = `${serverName} does not use OAuth authentication.`;
          return;
        }
        this.authInFlight = server2.name;
        this.authNotice = `Authenticating ${serverName}...`;
        this.tui.requestRender();
        this.callbacks.authenticate(server2.name).then((result) => {
          server2.connectionStatus = this.callbacks.getConnectionStatus(server2.name);
          if (result.ok) {
            this.authNotice = `OAuth finished for ${serverName}. Reconnecting...`;
            this.authInFlight = null;
            this.tui.requestRender();
            this.reconnectServer(server2, { afterAuth: true });
            return;
          }
          const message = sanitizeDisplayText(result.message);
          this.authNotice = `OAuth failed for ${serverName}${message ? `: ${message}` : ". Check the notification for details."}`;
          this.authInFlight = null;
          this.tui.requestRender();
        }).catch((error) => {
          const message = sanitizeDisplayText(error instanceof Error ? error.message : String(error));
          server2.connectionStatus = this.callbacks.getConnectionStatus(server2.name);
          this.authNotice = `OAuth failed for ${serverName}: ${message}`;
          this.authInFlight = null;
          this.tui.requestRender();
        });
      }
      reconnectServer(server2, options = {}) {
        if (server2.connectionStatus === "connecting" || server2.connectionStatus === "disabled") return;
        const serverName = sanitizeDisplayText(server2.name);
        server2.connectionStatus = "connecting";
        this.tui.requestRender();
        this.callbacks.reconnect(server2.name).then((connected) => {
          server2.connectionStatus = this.callbacks.getConnectionStatus(server2.name);
          server2.failureMessage = this.callbacks.getFailureMessage?.(server2.name) ?? null;
          if (server2.connectionStatus === "connected") {
            const entry = this.callbacks.refreshCacheAfterReconnect(server2.name);
            if (entry) {
              this.cache ??= { version: 1, servers: {} };
              this.cache.servers[server2.name] = entry;
              this.rebuildServerTools(server2, entry);
            }
            server2.hasCachedData = true;
          }
          if (options.afterAuth) {
            this.authNotice = connected && server2.connectionStatus === "connected" ? `OAuth finished for ${serverName}. Reconnected.` : `OAuth finished for ${serverName}, but reconnect did not complete. Press ctrl+r to retry.`;
          }
          this.tui.requestRender();
        }).catch((error) => {
          server2.connectionStatus = "failed";
          const message = sanitizeDisplayText(error instanceof Error ? error.message : String(error));
          this.authNotice = `Reconnect failed for ${serverName}: ${message}`;
          this.tui.requestRender();
        });
      }
      toggleItem(item) {
        if (this.authOnly) return;
        const server2 = this.servers[item.serverIndex];
        if (!server2) return;
        if (item.type === "server") {
          const newState = !server2.tools.every((t) => t.isDirect);
          if (server2.source === "import" && newState) {
            this.importNotice = `Imported from ${sanitizeDisplayText(server2.importKind ?? "external")} \u2014 will copy to user config on save`;
          }
          for (const t of server2.tools) t.isDirect = newState;
        } else if (item.toolIndex !== void 0) {
          const tool = server2.tools[item.toolIndex];
          if (!tool) return;
          tool.isDirect = !tool.isDirect;
          if (tool.isDirect && server2.source === "import") {
            this.importNotice = `Imported from ${sanitizeDisplayText(server2.importKind ?? "external")} \u2014 will copy to user config on save`;
          }
        }
        this.updateDirty();
      }
      handleDiscardInput(data) {
        if (matchesKey3(data, "ctrl+c")) {
          this.cleanup();
          this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
          return;
        }
        if (matchesKey3(data, "escape") || data === "n" || data === "N") {
          this.confirmingDiscard = false;
          return;
        }
        if (this.keys.selectConfirm(data)) {
          this.cleanup();
          if (this.discardSelected === 0) {
            this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
          } else {
            this.done(this.buildResult());
          }
          return;
        }
        if (data === "y" || data === "Y") {
          this.cleanup();
          this.done({ cancelled: true, changes: /* @__PURE__ */ new Map() });
          return;
        }
        if (matchesKey3(data, "left") || matchesKey3(data, "right") || matchesKey3(data, "tab")) {
          this.discardSelected = this.discardSelected === 0 ? 1 : 0;
        }
      }
      moveCursor(delta) {
        if (this.visibleItems.length === 0) return;
        this.cursorIndex = Math.max(0, Math.min(this.visibleItems.length - 1, this.cursorIndex + delta));
      }
      getOtherCurrentCandidates(serverName, definition, currentEntry, toolName) {
        const candidates = /* @__PURE__ */ new Set();
        for (const [otherServerName, otherDefinition] of Object.entries(this.config.mcpServers)) {
          if (isServerDisabled(otherDefinition)) continue;
          const cachedEntry = this.cache?.servers?.[otherServerName];
          const entry = otherServerName === serverName ? currentEntry : cachedEntry && isServerCacheValid(cachedEntry, otherDefinition) ? cachedEntry : void 0;
          if (!entry) continue;
          const otherPrefix = resolveToolPrefix(otherDefinition, this.prefix);
          for (const tool of entry.tools ?? []) {
            if (!isUiToolVisibleToModel(tool.uiVisibility)) continue;
            for (const candidate of getToolNameCandidates(tool.name, otherServerName, otherPrefix, false)) candidates.add(candidate);
          }
          if (otherDefinition.exposeResources !== false) {
            for (const resource of entry.resources ?? []) {
              const baseName = `read_${resourceNameToToolName(resource.name)}`;
              for (const candidate of getToolNameCandidates(baseName, otherServerName, otherPrefix, false)) candidates.add(candidate);
            }
          }
        }
        for (const candidate of getToolNameCandidates(toolName, serverName, resolveToolPrefix(definition, this.prefix), false)) candidates.delete(candidate);
        return candidates;
      }
      rebuildServerTools(server2, entry) {
        const existingState = /* @__PURE__ */ new Map();
        for (const t of server2.tools) existingState.set(t.name, t.isDirect);
        const newTools = [];
        for (const tool of entry.tools ?? []) {
          if (!isUiToolVisibleToModel(tool.uiVisibility)) continue;
          if (!isToolAllowed(tool.name, server2.name, this.prefix, server2.includeTools, server2.excludeTools, this.getOtherCurrentCandidates(server2.name, server2, entry, tool.name))) {
            continue;
          }
          const prev = existingState.get(tool.name);
          const isDirect = prev !== void 0 ? prev : false;
          newTools.push({
            name: tool.name,
            description: tool.description ?? "",
            isDirect,
            wasDirect: prev !== void 0 ? server2.tools.find((t) => t.name === tool.name)?.wasDirect ?? false : false,
            estimatedTokens: estimateTokens(tool)
          });
        }
        if (server2.exposeResources) {
          for (const resource of entry.resources ?? []) {
            const baseName = `read_${resourceNameToToolName(resource.name)}`;
            if (!isToolAllowed(baseName, server2.name, this.prefix, server2.includeTools, server2.excludeTools, this.getOtherCurrentCandidates(server2.name, server2, entry, baseName))) {
              continue;
            }
            const prev = existingState.get(baseName);
            const isDirect = prev !== void 0 ? prev : false;
            const ct = {
              name: baseName,
              ...resource.description !== void 0 ? { description: resource.description } : {}
            };
            newTools.push({
              name: baseName,
              description: resource.description ?? `Read resource: ${resource.uri}`,
              isDirect,
              wasDirect: prev !== void 0 ? server2.tools.find((t) => t.name === baseName)?.wasDirect ?? false : false,
              estimatedTokens: estimateTokens(ct)
            });
          }
        }
        server2.tools = newTools;
        this.rebuildVisibleItems();
        this.updateDirty();
      }
      render(width) {
        const innerW = width - 2;
        const lines = [];
        const t = this.t;
        const bold = (s) => `\x1B[1m${s}\x1B[22m`;
        const italic = (s) => `\x1B[3m${s}\x1B[23m`;
        const inverse = (s) => `\x1B[7m${s}\x1B[27m`;
        const row = (content) => fg2(t.border, "\u2502") + truncateToWidth2(" " + sanitizeRowContent(content), innerW, "\u2026", true) + fg2(t.border, "\u2502");
        const emptyRow = () => fg2(t.border, "\u2502") + " ".repeat(innerW) + fg2(t.border, "\u2502");
        const divider = () => fg2(t.border, "\u251C" + "\u2500".repeat(innerW) + "\u2524");
        const titleText = this.authOnly ? " MCP OAuth " : " MCP Servers ";
        const borderLen = innerW - visibleWidth2(titleText);
        const leftB = Math.floor(borderLen / 2);
        const rightB = borderLen - leftB;
        lines.push(fg2(t.border, "\u256D" + "\u2500".repeat(leftB)) + fg2(t.title, titleText) + fg2(t.border, "\u2500".repeat(rightB) + "\u256E"));
        lines.push(emptyRow());
        const cursor = fg2(t.selected, "\u2502");
        const searchIcon = fg2(t.border, "\u25CE");
        if (this.descSearchActive) {
          lines.push(row(`${searchIcon}  ${fg2(t.needsAuth, "desc:")} ${this.descQuery}${cursor}`));
        } else if (this.nameQuery) {
          lines.push(row(`${searchIcon}  ${this.nameQuery}${cursor}`));
        } else {
          lines.push(row(`${searchIcon}  ${fg2(t.placeholder, italic("search..."))}`));
        }
        lines.push(emptyRow());
        if (this.noticeLines.length > 0) {
          for (const notice of this.noticeLines) {
            lines.push(row(fg2(t.hint, italic(sanitizeDisplayText(notice)))));
          }
          lines.push(emptyRow());
        }
        lines.push(divider());
        if (this.servers.length === 0) {
          lines.push(emptyRow());
          lines.push(row(fg2(t.hint, italic(this.authOnly ? "No OAuth-capable MCP servers configured." : "No MCP servers configured."))));
          lines.push(emptyRow());
        } else {
          const maxVis = _McpPanel.MAX_VISIBLE;
          const total = this.visibleItems.length;
          const startIdx = Math.max(0, Math.min(this.cursorIndex - Math.floor(maxVis / 2), total - maxVis));
          const endIdx = Math.min(startIdx + maxVis, total);
          lines.push(emptyRow());
          for (let i = startIdx; i < endIdx; i++) {
            const item = this.visibleItems[i];
            if (!item) continue;
            const isCursor = i === this.cursorIndex;
            const server2 = this.servers[item.serverIndex];
            if (!server2) continue;
            if (item.type === "server") {
              lines.push(row(this.renderServerRow(server2, isCursor)));
              if (isCursor && server2.connectionStatus === "failed" && server2.failureMessage) {
                for (const line of this.wrapText(sanitizeDisplayText(server2.failureMessage), innerW - 6)) {
                  lines.push(row(`    ${fg2(t.cancel, line)}`));
                }
              }
            } else if (item.toolIndex !== void 0) {
              const tool = server2.tools[item.toolIndex];
              if (tool) lines.push(row(this.renderToolRow(tool, isCursor, innerW)));
            }
          }
          lines.push(emptyRow());
          if (total > maxVis) {
            const prog = Math.round((this.cursorIndex + 1) / total * 10);
            lines.push(row(`${rainbowProgress(prog, 10)}  ${fg2(t.hint, `${this.cursorIndex + 1}/${total}`)}`));
            lines.push(emptyRow());
          }
          if (this.importNotice) {
            lines.push(row(fg2(t.needsAuth, italic(sanitizeDisplayText(this.importNotice)))));
            lines.push(emptyRow());
          }
          if (this.authNotice) {
            lines.push(row(fg2(t.needsAuth, italic(sanitizeDisplayText(this.authNotice)))));
            lines.push(emptyRow());
          }
        }
        lines.push(divider());
        lines.push(emptyRow());
        if (this.confirmingDiscard) {
          const discardBtn = this.discardSelected === 0 ? inverse(bold(fg2(t.cancel, "  Discard  "))) : fg2(t.hint, "  Discard  ");
          const keepBtn = this.discardSelected === 1 ? inverse(bold(fg2(t.confirm, "  Keep & Close  "))) : fg2(t.hint, "  Keep & Close  ");
          lines.push(row(`Discard unsaved changes?  ${discardBtn}   ${keepBtn}`));
        } else {
          if (this.authOnly) {
            lines.push(row(fg2(t.description, "select a server to authenticate")));
          } else {
            const directCount = this.servers.reduce((sum, s) => sum + s.tools.filter((t2) => t2.isDirect).length, 0);
            const totalTokens = this.servers.reduce(
              (sum, s) => sum + s.tools.filter((t2) => t2.isDirect).reduce((ts, t2) => ts + t2.estimatedTokens, 0),
              0
            );
            const stats = directCount > 0 ? `${directCount} direct  ~${totalTokens.toLocaleString()} tokens` : "no direct tools";
            lines.push(row(fg2(t.description, stats + (this.dirty ? fg2(t.needsAuth, "  (unsaved)") : ""))));
          }
        }
        lines.push(emptyRow());
        const saveLabel = this.keys.saveLabel();
        const hints = this.authOnly ? [
          italic("\u2191\u2193") + " navigate",
          italic("\u23CE") + " auth",
          italic("ctrl+a") + " auth",
          italic("esc") + " clear/close",
          italic("ctrl+c") + " quit"
        ] : [
          italic("\u2191\u2193") + " navigate",
          italic("space") + " toggle",
          italic("\u23CE") + " expand/auth",
          italic("ctrl+a") + " auth",
          italic("ctrl+r") + " reconnect",
          ...this.selectedServerHasFailureMessage() ? [italic("ctrl+y") + " copy error"] : [],
          italic("?") + " desc search",
          ...saveLabel ? [italic(saveLabel) + " save"] : [],
          italic("esc") + " clear/close",
          italic("ctrl+c") + " quit"
        ];
        const gap = "  ";
        const gapW = 2;
        const maxW = innerW - 2;
        let curLine = "";
        let curW = 0;
        for (const hint of hints) {
          const hw = visibleWidth2(hint);
          const needed = curW === 0 ? hw : gapW + hw;
          if (curW > 0 && curW + needed > maxW) {
            lines.push(row(fg2(t.hint, curLine)));
            curLine = hint;
            curW = hw;
          } else {
            curLine += (curW > 0 ? gap : "") + hint;
            curW += needed;
          }
        }
        if (curLine) lines.push(row(fg2(t.hint, curLine)));
        lines.push(fg2(t.border, "\u2570" + "\u2500".repeat(innerW) + "\u256F"));
        return lines;
      }
      renderServerRow(server2, isCursor) {
        const t = this.t;
        const bold = (s) => `\x1B[1m${s}\x1B[22m`;
        const expandIcon = server2.expanded ? "\u25BE" : "\u25B8";
        const prefix = isCursor ? fg2(t.selected, expandIcon) : fg2(t.border, server2.expanded ? expandIcon : "\xB7");
        const serverName = sanitizeDisplayText(server2.name);
        const importKind = sanitizeDisplayText(server2.importKind ?? "import");
        const nameStr = isCursor ? bold(fg2(t.selected, serverName)) : serverName;
        const importLabel = server2.source === "import" ? fg2(t.description, ` (${importKind})`) : "";
        const statusLabel = this.renderConnectionStatus(server2);
        if (!server2.hasCachedData && !this.authOnly) {
          return `${prefix}   ${nameStr}${importLabel}  ${fg2(t.description, "(not cached)")}${statusLabel}`;
        }
        const directCount = server2.tools.filter((t2) => t2.isDirect).length;
        const totalCount = server2.tools.length;
        let toggleIcon = fg2(t.description, "\u25CB");
        if (directCount === totalCount && totalCount > 0) {
          toggleIcon = fg2(t.direct, "\u25CF");
        } else if (directCount > 0) {
          toggleIcon = fg2(t.needsAuth, "\u25D0");
        }
        let toolInfo = "";
        if (totalCount > 0) {
          toolInfo = `${directCount}/${totalCount}`;
          if (directCount > 0) {
            const tokens = server2.tools.filter((t2) => t2.isDirect).reduce((s, t2) => s + t2.estimatedTokens, 0);
            toolInfo += `  ~${tokens.toLocaleString()}`;
          }
          toolInfo = fg2(t.description, toolInfo);
        }
        return `${prefix} ${toggleIcon} ${nameStr}${importLabel}  ${toolInfo}${statusLabel}`;
      }
      selectedServerHasFailureMessage() {
        const item = this.visibleItems[this.cursorIndex];
        if (!item) return false;
        const server2 = this.servers[item.serverIndex];
        return server2?.connectionStatus === "failed" && !!server2.failureMessage;
      }
      wrapText(text, width) {
        const max = Math.max(8, width);
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        let current = "";
        const splitLongWord = (word) => {
          let rest = word;
          while (visibleWidth2(rest) > max) {
            let take = "";
            let index = 0;
            while (index < rest.length && visibleWidth2(take + rest.charAt(index)) <= max) {
              take += rest.charAt(index);
              index++;
            }
            if (!take) take = rest.charAt(0);
            lines.push(take);
            rest = rest.slice(take.length);
          }
          return rest;
        };
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word;
          if (visibleWidth2(candidate) <= max) {
            current = candidate;
          } else {
            if (current) lines.push(current);
            current = splitLongWord(word);
          }
        }
        if (current) lines.push(current);
        return lines.length > 0 ? lines : [text];
      }
      renderConnectionStatus(server2) {
        const t = this.t;
        if (this.authInFlight === server2.name) return `  ${fg2(t.needsAuth, "authenticating")}`;
        if (server2.connectionStatus === "disabled") return `  ${fg2(t.description, "disabled")}`;
        if (server2.connectionStatus === "needs-auth") return `  ${fg2(t.needsAuth, "needs auth")}`;
        if (server2.connectionStatus === "connecting") return `  ${fg2(t.needsAuth, "connecting")}`;
        if (server2.connectionStatus === "failed") return `  ${fg2(t.cancel, "failed")}`;
        if (this.authOnly && server2.connectionStatus === "connected") return `  ${fg2(t.direct, "connected")}`;
        if (this.authOnly) return `  ${fg2(t.description, "idle")}`;
        return "";
      }
      renderToolRow(tool, isCursor, innerW) {
        const t = this.t;
        const bold = (s) => `\x1B[1m${s}\x1B[22m`;
        const toggleIcon = tool.isDirect ? fg2(t.direct, "\u25CF") : fg2(t.description, "\u25CB");
        const cursor = isCursor ? fg2(t.selected, "\u25B8") : " ";
        const toolName = sanitizeDisplayText(tool.name);
        const description = sanitizeDisplayText(tool.description);
        const nameStr = isCursor ? bold(fg2(t.selected, toolName)) : toolName;
        const prefixLen = 7 + visibleWidth2(toolName);
        const maxDescLen = Math.max(0, innerW - prefixLen - 8);
        const descStr = maxDescLen > 5 && description ? fg2(t.description, "\u2014 " + truncateToWidth2(description, maxDescLen, "\u2026")) : "";
        return `  ${cursor} ${toggleIcon} ${nameStr} ${descStr}`;
      }
      invalidate() {
      }
      dispose() {
        this.cleanup();
      }
    };
  }
});

// index.ts
import { Type } from "typebox";

// commands.ts
init_types();
init_config();

// init.ts
init_types();
init_config();
import { existsSync as existsSync6 } from "node:fs";

// errors.ts
var McpUiError = class extends Error {
  code;
  context;
  recoveryHint;
  cause;
  constructor(message, options) {
    super(message);
    this.name = "McpUiError";
    this.code = options.code;
    this.context = options.context ?? {};
    this.recoveryHint = options.recoveryHint;
    this.cause = options.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoveryHint: this.recoveryHint,
      stack: this.stack
    };
  }
};
var ResourceFetchError = class extends McpUiError {
  constructor(uri, reason, options) {
    super(`Failed to fetch UI resource "${uri}": ${reason}`, {
      code: "RESOURCE_FETCH_ERROR",
      context: { uri, ...options?.server !== void 0 ? { server: options.server } : {} },
      recoveryHint: "Check that the MCP server is connected and the resource URI is valid.",
      ...options?.cause !== void 0 ? { cause: options.cause } : {}
    });
    this.name = "ResourceFetchError";
  }
};
var ResourceParseError = class extends McpUiError {
  constructor(uri, reason, options) {
    super(`Invalid UI resource "${uri}": ${reason}`, {
      code: "RESOURCE_PARSE_ERROR",
      context: {
        uri,
        ...options?.server !== void 0 ? { server: options.server } : {},
        ...options?.mimeType !== void 0 ? { mimeType: options.mimeType } : {}
      },
      recoveryHint: "Ensure the resource returns valid HTML with the correct MIME type."
    });
    this.name = "ResourceParseError";
  }
};
var ConsentError = class extends McpUiError {
  denied;
  constructor(server2, options) {
    const message = options.denied ? `Tool calls for "${server2}" were denied for this session` : `Tool call approval required for "${server2}"`;
    super(message, {
      code: options.denied ? "CONSENT_DENIED" : "CONSENT_REQUIRED",
      context: { server: server2 },
      recoveryHint: options.denied ? "The user denied tool access. Start a new session to try again." : "Prompt the user for consent before calling tools."
    });
    this.name = "ConsentError";
    this.denied = options.denied ?? false;
  }
};
var ServerError = class extends McpUiError {
  constructor(reason, options) {
    super(`UI server error: ${reason}`, {
      code: "SERVER_ERROR",
      context: options?.port !== void 0 ? { port: options.port } : {},
      recoveryHint: "Check if the port is available. Another process may be using it.",
      ...options?.cause !== void 0 ? { cause: options.cause } : {}
    });
    this.name = "ServerError";
  }
};
function wrapError(error, context) {
  if (error instanceof McpUiError) {
    return new McpUiError(error.message, {
      code: error.code,
      context: { ...error.context, ...context },
      ...error.recoveryHint !== void 0 ? { recoveryHint: error.recoveryHint } : {},
      ...error.cause !== void 0 ? { cause: error.cause } : {}
    });
  }
  const cause = error instanceof Error ? error : void 0;
  const message = error instanceof Error ? error.message : String(error);
  return new McpUiError(message, {
    code: "UNKNOWN_ERROR",
    ...context !== void 0 ? { context } : {},
    ...cause !== void 0 ? { cause } : {}
  });
}

// logger.ts
var LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var LEVEL_PREFIX = {
  debug: "[MCP-UI:DEBUG]",
  info: "[MCP-UI]",
  warn: "[MCP-UI:WARN]",
  error: "[MCP-UI:ERROR]"
};
var Logger = class {
  minLevel = "info";
  handlers = [];
  defaultContext = {};
  setLevel(level) {
    this.minLevel = level;
  }
  setDefaultContext(context) {
    this.defaultContext = context;
  }
  addHandler(handler) {
    this.handlers.push(handler);
  }
  clearHandlers() {
    this.handlers = [];
  }
  shouldLog(level) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }
  emit(level, message, context, error) {
    if (!this.shouldLog(level)) return;
    const entry = {
      level,
      message,
      context: { ...this.defaultContext, ...context },
      ...error !== void 0 ? { error } : {},
      timestamp: /* @__PURE__ */ new Date()
    };
    const prefix = LEVEL_PREFIX[level];
    const contextStr = formatContext(entry.context);
    const fullMessage = contextStr ? `${prefix} ${message} ${contextStr}` : `${prefix} ${message}`;
    if (level === "error") {
      console.error(fullMessage, error ?? "");
    } else if (level === "warn") {
      console.warn(fullMessage);
    } else if (level === "debug") {
      console.debug(fullMessage);
    } else {
      console.log(fullMessage);
    }
    for (const handler of this.handlers) {
      try {
        handler(entry);
      } catch {
      }
    }
  }
  debug(message, context) {
    this.emit("debug", message, context);
  }
  info(message, context) {
    this.emit("info", message, context);
  }
  warn(message, context) {
    this.emit("warn", message, context);
  }
  error(message, error, context) {
    this.emit("error", message, context, error);
  }
  /**
   * Create a child logger with additional default context.
   */
  child(context) {
    return new ChildLogger(this, context);
  }
};
var ChildLogger = class _ChildLogger {
  constructor(parent, context) {
    this.parent = parent;
    this.context = context;
  }
  parent;
  context;
  debug(message, context) {
    this.parent.debug(message, { ...this.context, ...context });
  }
  info(message, context) {
    this.parent.info(message, { ...this.context, ...context });
  }
  warn(message, context) {
    this.parent.warn(message, { ...this.context, ...context });
  }
  error(message, error, context) {
    this.parent.error(message, error, { ...this.context, ...context });
  }
  child(context) {
    return new _ChildLogger(this.parent, { ...this.context, ...context });
  }
};
function formatContext(context) {
  if (!context || Object.keys(context).length === 0) return "";
  const parts = [];
  for (const [key, value] of Object.entries(context)) {
    if (value !== void 0 && value !== null) {
      parts.push(`${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
    }
  }
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}
var logger = new Logger();
if (process.env.MCP_UI_DEBUG === "1" || process.env.MCP_UI_DEBUG === "true") {
  logger.setLevel("debug");
}

// consent-manager.ts
var ConsentManager = class {
  constructor(mode = "once-per-server") {
    this.mode = mode;
    this.log.debug("Initialized", { mode });
  }
  mode;
  approvedServers = /* @__PURE__ */ new Set();
  deniedServers = /* @__PURE__ */ new Set();
  log = logger.child({ component: "ConsentManager" });
  requiresPrompt(serverName) {
    if (this.mode === "never") return false;
    if (this.deniedServers.has(serverName)) return true;
    if (this.mode === "always") return true;
    return !this.approvedServers.has(serverName);
  }
  shouldCacheConsent() {
    return this.mode !== "always";
  }
  registerDecision(serverName, approved) {
    this.deniedServers.delete(serverName);
    this.approvedServers.delete(serverName);
    if (approved) {
      this.approvedServers.add(serverName);
      this.log.debug("Consent granted", { server: serverName });
      return;
    }
    this.deniedServers.add(serverName);
    this.log.debug("Consent denied", { server: serverName });
  }
  ensureApproved(serverName) {
    if (this.mode === "never") return;
    if (this.deniedServers.has(serverName)) {
      throw new ConsentError(serverName, { denied: true });
    }
    if (!this.approvedServers.has(serverName)) {
      throw new ConsentError(serverName, { requiresApproval: true });
    }
    if (this.mode === "always") {
      this.approvedServers.delete(serverName);
    }
  }
  clear(serverName) {
    if (serverName) {
      this.approvedServers.delete(serverName);
      this.deniedServers.delete(serverName);
      this.log.debug("Cleared consent for server", { server: serverName });
      return;
    }
    this.approvedServers.clear();
    this.deniedServers.clear();
    this.log.debug("Cleared all consent records");
  }
};

// lifecycle.ts
init_types();

// mcp-auth-flow.ts
import {
  auth as runSdkAuth,
  extractWWWAuthenticateParams,
  LATEST_PROTOCOL_VERSION,
  UnauthorizedError as UnauthorizedError2
} from "@modelcontextprotocol/client";
import open from "open";

// mcp-oauth-provider.ts
import {
  UnauthorizedError
} from "@modelcontextprotocol/client";

// mcp-auth.ts
init_agent_dir();
init_config();
import { spawnSync as spawnSync2 } from "child_process";
import { createHash } from "crypto";
import { createRequire } from "module";
import { readFileSync as readFileSync4, existsSync as existsSync3, rmSync } from "fs";
import { dirname as dirname2, join as join4 } from "path";
import { fileURLToPath } from "url";
var require2 = createRequire(import.meta.url);
var AUTH_SECRET_SERVICE = "pi-mcp-adapter.oauth";
var TEST_AUTH_STORE_ENV = "PI_MCP_ADAPTER_TEST_AUTH_STORE";
var AUTH_SECRET_CHUNK_SIZE = 1e3;
var AUTH_SECRET_VALUE_LIMIT = 1280;
var KEYRING_RECOVERY_DISABLED_ENV = "PI_MCP_ADAPTER_DISABLE_KEYRING_RECOVERY";
var KEYRING_RECOVERY_KEYCTL_ENV = "PI_MCP_ADAPTER_KEYRING_RECOVERY_KEYCTL";
var KEYRING_RECOVERY_NODE_ENV = "PI_MCP_ADAPTER_KEYRING_RECOVERY_NODE";
var KEYRING_RECOVERY_HELPER_ENV = "PI_MCP_ADAPTER_KEYRING_RECOVERY_HELPER";
var TEST_LINUX_KEYRING_RECOVERY_ENV = "PI_MCP_ADAPTER_TEST_LINUX_KEYRING_RECOVERY";
var AUTH_CACHE_DISABLED_ENV = "PI_MCP_ADAPTER_DISABLE_AUTH_CACHE";
var KEYRING_RECOVERY_TIMEOUT_MS = 1e4;
var AUTH_CHUNK_MANIFEST_KEY = "__piMcpAdapterOAuthChunked";
var OAuthCredentialStoreError = class extends Error {
  constructor(message, operation, cause) {
    super(message, { cause });
    this.operation = operation;
    this.name = "OAuthCredentialStoreError";
  }
  operation;
  code = "OAUTH_CREDENTIAL_STORE_UNAVAILABLE";
};
function causeChainContains(error, pattern) {
  const seen = /* @__PURE__ */ new Set();
  let current = error;
  while (typeof current === "object" && current !== null || typeof current === "function") {
    if (seen.has(current)) break;
    seen.add(current);
    const candidate = current;
    if ([candidate.name, candidate.message, candidate.code].some((value) => typeof value === "string" && pattern.test(value))) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}
function formatOAuthCredentialStoreUnavailable(error) {
  if (process.platform === "linux" && causeChainContains(error, /key\s*(?:has been\s*)?revoked|keyrevoked/i)) {
    return "OAuth credential store unavailable: the Linux session keyring may be revoked. Start Pi from a fresh login/keyring session and retry.";
  }
  return "OAuth credential store unavailable. Configure or unlock the OS credential store and retry.";
}
var KeyringEntryClass;
var memoryAuthEntries = /* @__PURE__ */ new Map();
var testAuthSecretStoreReadCount = 0;
var authEntryCache = /* @__PURE__ */ new Map();
function isAuthEntryCacheEnabled() {
  return process.env[AUTH_CACHE_DISABLED_ENV] !== "1";
}
function cloneAuthEntry(entry) {
  return entry === void 0 ? void 0 : structuredClone(entry);
}
var memoryAuthSecretStore = {
  read(account) {
    testAuthSecretStoreReadCount++;
    return memoryAuthEntries.get(account);
  },
  write(account, payload) {
    memoryAuthEntries.set(account, payload);
  },
  remove(account) {
    memoryAuthEntries.delete(account);
  }
};
var keyringAuthSecretStore = {
  read(account) {
    return getKeyringEntry(account).getPassword() ?? void 0;
  },
  write(account, payload) {
    getKeyringEntry(account).setPassword(payload);
  },
  remove(account) {
    getKeyringEntry(account).deleteCredential();
  }
};
var sizeLimitedAuthSecretStore = {
  read(account) {
    testAuthSecretStoreReadCount++;
    return memoryAuthEntries.get(account);
  },
  write(account, payload) {
    if (payload.length > AUTH_SECRET_VALUE_LIMIT) {
      throw new Error(`Value of 'password encoded as UTF-16' is longer than the platform limit of ${AUTH_SECRET_VALUE_LIMIT * 2} chars`);
    }
    memoryAuthEntries.set(account, payload);
  },
  remove(account) {
    memoryAuthEntries.delete(account);
  }
};
var unavailableAuthSecretStore = {
  read() {
    testAuthSecretStoreReadCount++;
    throw new Error("simulated secure credential store unavailable");
  },
  write() {
    throw new Error("simulated secure credential store unavailable");
  },
  remove() {
    throw new Error("simulated secure credential store unavailable");
  }
};
function createKeyRevokedTestError() {
  return new Error("Couldn't access platform storage: KeyRevoked", { cause: new Error("KeyRevoked") });
}
var keyRevokedAuthSecretStore = {
  read() {
    testAuthSecretStoreReadCount++;
    throw createKeyRevokedTestError();
  },
  write() {
    throw createKeyRevokedTestError();
  },
  remove() {
    throw createKeyRevokedTestError();
  }
};
function getAuthSecretStore() {
  if (process.env[TEST_AUTH_STORE_ENV] === "memory") return memoryAuthSecretStore;
  if (process.env[TEST_AUTH_STORE_ENV] === "sizelimited") return sizeLimitedAuthSecretStore;
  if (process.env[TEST_AUTH_STORE_ENV] === "unavailable") return unavailableAuthSecretStore;
  if (process.env[TEST_AUTH_STORE_ENV] === "keyrevoked") return keyRevokedAuthSecretStore;
  return keyringAuthSecretStore;
}
function getKeyringEntry(account) {
  try {
    KeyringEntryClass ??= loadKeyringEntryClass();
    return new KeyringEntryClass(AUTH_SECRET_SERVICE, account);
  } catch (error) {
    throw new Error("OAuth secure credential storage is unavailable. Configure the OS credential store and retry authentication.", { cause: error });
  }
}
function loadKeyringEntryClass(keyringRequire = require2, platform3 = process.platform, arch = process.arch) {
  try {
    return keyringRequire("@napi-rs/keyring").Entry;
  } catch (loaderError) {
    try {
      return loadKeyringNativeBindingFallback(keyringRequire, platform3, arch).Entry;
    } catch (fallbackError) {
      throw new Error(`Failed to load @napi-rs/keyring; absolute-path native binding fallback also failed: ${formatErrorMessage(fallbackError)}`, {
        cause: loaderError
      });
    }
  }
}
function loadKeyringNativeBindingFallback(keyringRequire, platform3, arch) {
  const targets = getKeyringNativeBindingTargets(platform3, arch);
  if (targets.length === 0) {
    throw new Error(`Unsupported @napi-rs/keyring native binding target: ${platform3}-${arch}`);
  }
  let lastError;
  for (const target of targets) {
    try {
      const packageJsonPath = keyringRequire.resolve(`${target.packageName}/package.json`);
      return keyringRequire(join4(dirname2(packageJsonPath), target.bindingFile));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
function getKeyringNativeBindingTargets(platform3, arch) {
  return getKeyringNativeBindingSuffixes(platform3, arch).map((suffix) => ({
    packageName: `@napi-rs/keyring-${suffix}`,
    bindingFile: `keyring.${suffix}.node`
  }));
}
function getKeyringNativeBindingSuffixes(platform3, arch) {
  if (platform3 === "darwin") {
    if (arch === "arm64") return ["darwin-arm64"];
    if (arch === "x64") return ["darwin-x64"];
  }
  if (platform3 === "win32") {
    if (arch === "arm64") return ["win32-arm64-msvc"];
    if (arch === "x64") return ["win32-x64-msvc"];
    if (arch === "ia32") return ["win32-ia32-msvc"];
  }
  if (platform3 === "linux") {
    if (arch === "arm64") return ["linux-arm64-gnu", "linux-arm64-musl"];
    if (arch === "arm") return ["linux-arm-gnueabihf"];
    if (arch === "riscv64") return ["linux-riscv64-gnu"];
    if (arch === "x64") return ["linux-x64-gnu", "linux-x64-musl"];
  }
  if (platform3 === "freebsd" && arch === "x64") return ["freebsd-x64"];
  return [];
}
function formatErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function isLinuxKeyringRecoveryEnabled() {
  if (process.env[KEYRING_RECOVERY_DISABLED_ENV] === "1") return false;
  return process.platform === "linux" || process.env[TEST_LINUX_KEYRING_RECOVERY_ENV] === "1";
}
function shouldAttemptLinuxKeyringRecovery(error) {
  return isLinuxKeyringRecoveryEnabled() && causeChainContains(error, /key\s*(?:has been\s*)?revoked|keyrevoked/i);
}
function runLinuxKeyringRecoveryOperation(operation, account, payload) {
  const keyctl = process.env[KEYRING_RECOVERY_KEYCTL_ENV]?.trim() || "keyctl";
  const node = process.env[KEYRING_RECOVERY_NODE_ENV]?.trim() || "node";
  const helper = process.env[KEYRING_RECOVERY_HELPER_ENV]?.trim() || fileURLToPath(new URL("./mcp-keyring-helper.cjs", import.meta.url));
  const request = JSON.stringify({ operation, service: AUTH_SECRET_SERVICE, account, payload });
  const result = spawnSync2(keyctl, ["session", "-", node, helper], {
    input: `${request}
`,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: KEYRING_RECOVERY_TIMEOUT_MS,
    windowsHide: true
  });
  if (result.error) {
    throw new Error(`Linux keyring recovery helper could not start: ${result.error.message}`, { cause: result.error });
  }
  if (result.status !== 0) {
    throw new Error(`Linux keyring recovery helper failed with exit code ${result.status ?? "unknown"}`);
  }
  let response;
  try {
    response = JSON.parse(result.stdout.trim());
  } catch (error) {
    throw new Error("Linux keyring recovery helper returned invalid JSON", { cause: error });
  }
  if (typeof response !== "object" || response === null || typeof response.ok !== "boolean") {
    throw new Error("Linux keyring recovery helper returned an invalid response");
  }
  const typedResponse = response;
  if (typedResponse.ok === false) {
    throw new Error(typedResponse.error || "Linux keyring recovery helper failed");
  }
  if (operation === "read" && typedResponse.found === true && typeof typedResponse.value !== "string") {
    throw new Error("Linux keyring recovery helper returned an invalid read response");
  }
  return typedResponse;
}
var linuxKeyringRecoveryAuthSecretStore = {
  read(account) {
    const response = runLinuxKeyringRecoveryOperation("read", account);
    return response.ok && response.found === true ? response.value : void 0;
  },
  write(account, payload) {
    runLinuxKeyringRecoveryOperation("write", account, payload);
  },
  remove(account) {
    runLinuxKeyringRecoveryOperation("remove", account);
  }
};
function getAuthStorageOptions(oauthDir, cwd = process.cwd()) {
  const baseDir = resolveConfiguredOAuthDir(oauthDir, cwd);
  return baseDir ? { baseDir } : {};
}
function getAuthBaseDir(options = {}) {
  const override = process.env.MCP_OAUTH_DIR?.trim();
  if (override) return override;
  return options.baseDir ?? getAgentPath("mcp-oauth");
}
function getServerDir(serverName, options) {
  if (typeof serverName !== "string") {
    throw new Error(`Invalid MCP server name: ${JSON.stringify(serverName)}`);
  }
  const storageKey = getAuthEntryAccount(serverName);
  return join4(getAuthBaseDir(options), storageKey);
}
function getAuthEntryAccount(serverName) {
  if (typeof serverName !== "string") {
    throw new Error(`Invalid MCP server name: ${JSON.stringify(serverName)}`);
  }
  return `sha256-${createHash("sha256").update(serverName, "utf8").digest("hex")}`;
}
function getAuthEntryFilePath(serverName, options) {
  return join4(getServerDir(serverName, options), "tokens.json");
}
function parseJsonPayload(serverName, payload, source) {
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(`Failed to parse OAuth credentials for ${serverName} from ${source}`, { cause: error });
  }
}
function parseAuthEntryPayload(serverName, payload, source) {
  const parsed = parseJsonPayload(serverName, payload, source);
  const entry = toAuthEntry(parsed);
  if (!entry) {
    throw new Error(`Failed to parse OAuth credentials for ${serverName} from ${source}: invalid credential shape`);
  }
  return entry;
}
function toAuthEntry(value) {
  const entry = toRecord(value);
  if (!entry) return void 0;
  const codeVerifier = optionalString(entry.codeVerifier);
  const oauthState = optionalString(entry.oauthState);
  const serverUrl = optionalString(entry.serverUrl);
  if (codeVerifier === null || oauthState === null || serverUrl === null) return void 0;
  const tokens = entry.tokens === void 0 ? void 0 : toStoredTokens(entry.tokens);
  const clientInfo = entry.clientInfo === void 0 ? void 0 : toStoredClientInfo(entry.clientInfo);
  if (entry.tokens !== void 0 && !tokens || entry.clientInfo !== void 0 && !clientInfo) return void 0;
  const authEntry = {};
  if (tokens) authEntry.tokens = tokens;
  if (clientInfo) authEntry.clientInfo = clientInfo;
  if (codeVerifier !== void 0) authEntry.codeVerifier = codeVerifier;
  if (oauthState !== void 0) authEntry.oauthState = oauthState;
  if (serverUrl !== void 0) authEntry.serverUrl = serverUrl;
  return authEntry;
}
function toStoredTokens(value) {
  const tokens = toRecord(value);
  if (!tokens || typeof tokens.accessToken !== "string") return void 0;
  const refreshToken = optionalString(tokens.refreshToken);
  const scope = optionalString(tokens.scope);
  const issuer = optionalString(tokens.issuer);
  const expiresAt = optionalNumber(tokens.expiresAt);
  if (refreshToken === null || scope === null || issuer === null || expiresAt === null) return void 0;
  const storedTokens = { accessToken: tokens.accessToken };
  if (refreshToken !== void 0) storedTokens.refreshToken = refreshToken;
  if (expiresAt !== void 0) storedTokens.expiresAt = expiresAt;
  if (scope !== void 0) storedTokens.scope = scope;
  if (issuer !== void 0) storedTokens.issuer = issuer;
  return storedTokens;
}
function toStoredClientInfo(value) {
  const clientInfo = toRecord(value);
  if (!clientInfo || typeof clientInfo.clientId !== "string") return void 0;
  const clientSecret = optionalString(clientInfo.clientSecret);
  const issuer = optionalString(clientInfo.issuer);
  const clientIdIssuedAt = optionalNumber(clientInfo.clientIdIssuedAt);
  const clientSecretExpiresAt = optionalNumber(clientInfo.clientSecretExpiresAt);
  const configPreRegistered = optionalBoolean(clientInfo.configPreRegistered);
  if (clientSecret === null || issuer === null || clientIdIssuedAt === null || clientSecretExpiresAt === null || configPreRegistered === null) return void 0;
  const storedClient = { clientId: clientInfo.clientId };
  const redirectUris = stringArray(clientInfo.redirectUris);
  if (clientSecret !== void 0) storedClient.clientSecret = clientSecret;
  if (clientIdIssuedAt !== void 0) storedClient.clientIdIssuedAt = clientIdIssuedAt;
  if (clientSecretExpiresAt !== void 0) storedClient.clientSecretExpiresAt = clientSecretExpiresAt;
  if (redirectUris !== void 0) storedClient.redirectUris = redirectUris;
  if (issuer !== void 0) storedClient.issuer = issuer;
  if (configPreRegistered !== void 0) storedClient.configPreRegistered = configPreRegistered;
  return storedClient;
}
function toRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function optionalString(value) {
  if (value === void 0) return void 0;
  return typeof value === "string" ? value : null;
}
function optionalNumber(value) {
  if (value === void 0) return void 0;
  return typeof value === "number" ? value : null;
}
function optionalBoolean(value) {
  if (value === void 0) return void 0;
  return typeof value === "boolean" ? value : null;
}
function stringArray(value) {
  return Array.isArray(value) && value.every((uri) => typeof uri === "string") ? value : void 0;
}
function isAuthEntryChunkManifest(value) {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value;
  return manifest[AUTH_CHUNK_MANIFEST_KEY] === 1 && typeof manifest.chunkCount === "number" && Number.isInteger(manifest.chunkCount) && manifest.chunkCount > 0 && typeof manifest.chunkDigest === "string" && /^[a-f0-9]{16}$/.test(manifest.chunkDigest);
}
function getAuthEntryChunkAccount(account, manifest, index) {
  return `${account}.chunk.${manifest.chunkDigest}.${index}`;
}
function getAuthEntryChunkAccounts(account, manifest) {
  return Array.from({ length: manifest.chunkCount }, (_, index) => getAuthEntryChunkAccount(account, manifest, index));
}
function readChunkManifestFromPayload(serverName, payload, source) {
  const parsed = parseJsonPayload(serverName, payload, source);
  return isAuthEntryChunkManifest(parsed) ? parsed : void 0;
}
function readExistingChunkManifest(store, serverName, account) {
  try {
    const payload = store.read(account);
    return payload === void 0 ? void 0 : readChunkManifestFromPayload(serverName, payload, "OS secure credential store");
  } catch {
    return void 0;
  }
}
function removeChunkPayloads(store, account, manifest) {
  for (const chunkAccount of getAuthEntryChunkAccounts(account, manifest)) {
    store.remove(chunkAccount);
  }
}
function tryRemoveChunkPayloads(store, account, manifest) {
  if (!manifest) return;
  try {
    removeChunkPayloads(store, account, manifest);
  } catch {
  }
}
function createChunkManifest(payload) {
  return {
    [AUTH_CHUNK_MANIFEST_KEY]: 1,
    chunkCount: Math.ceil(payload.length / AUTH_SECRET_CHUNK_SIZE),
    chunkDigest: createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16)
  };
}
function readChunkedAuthEntry(store, serverName, account, manifest) {
  const chunks = getAuthEntryChunkAccounts(account, manifest).map((chunkAccount) => {
    try {
      const chunk = store.read(chunkAccount);
      if (chunk === void 0) {
        throw new Error(`Missing OAuth credential chunk ${chunkAccount} for ${serverName}`);
      }
      return chunk;
    } catch (error) {
      throw new OAuthCredentialStoreError(
        `Failed to read OAuth credentials for ${serverName} from the OS secure credential store`,
        "read",
        error
      );
    }
  });
  return parseAuthEntryPayload(serverName, chunks.join(""), "OS secure credential store chunks");
}
function readLegacyAuthEntry(serverName, options) {
  const filePath = getAuthEntryFilePath(serverName, options);
  if (!existsSync3(filePath)) return void 0;
  const data = readFileSync4(filePath, "utf-8");
  return parseAuthEntryPayload(serverName, data, filePath);
}
function removeLegacyAuthEntry(serverName, options) {
  const filePath = getAuthEntryFilePath(serverName, options);
  if (!existsSync3(filePath)) return;
  try {
    rmSync(filePath, { force: true });
  } catch (error) {
    throw new Error(`Failed to remove legacy plaintext OAuth credentials for ${serverName} at ${filePath}`, { cause: error });
  }
  const dir = getServerDir(serverName, options);
  try {
    rmSync(dir, { recursive: true });
  } catch {
  }
}
function writeSecureAuthEntryToStore(store, serverName, entry) {
  const account = getAuthEntryAccount(serverName);
  const payload = JSON.stringify(entry);
  const previousManifest = readExistingChunkManifest(store, serverName, account);
  const manifest = payload.length > AUTH_SECRET_CHUNK_SIZE ? createChunkManifest(payload) : void 0;
  try {
    if (manifest) {
      for (let index = 0; index < manifest.chunkCount; index++) {
        const chunk = payload.slice(index * AUTH_SECRET_CHUNK_SIZE, (index + 1) * AUTH_SECRET_CHUNK_SIZE);
        store.write(getAuthEntryChunkAccount(account, manifest, index), chunk);
      }
      store.write(account, JSON.stringify(manifest));
    } else {
      store.write(account, payload);
    }
    if (previousManifest?.chunkDigest !== manifest?.chunkDigest) {
      tryRemoveChunkPayloads(store, account, previousManifest);
    }
  } catch (error) {
    tryRemoveChunkPayloads(store, account, manifest);
    throw new OAuthCredentialStoreError(
      `Failed to write OAuth credentials for ${serverName} to the OS secure credential store`,
      "write",
      error
    );
  }
  publishAuthEntryToCache(serverName, payload);
}
function publishAuthEntryToCache(serverName, payload) {
  if (!isAuthEntryCacheEnabled()) return;
  const normalized = toAuthEntry(JSON.parse(payload));
  if (!normalized) {
    authEntryCache.delete(serverName);
    return;
  }
  authEntryCache.set(serverName, cloneAuthEntry(normalized));
}
function writeSecureAuthEntry(serverName, entry) {
  try {
    writeSecureAuthEntryToStore(getAuthSecretStore(), serverName, entry);
  } catch (error) {
    if (!shouldAttemptLinuxKeyringRecovery(error)) throw error;
    writeSecureAuthEntryToStore(linuxKeyringRecoveryAuthSecretStore, serverName, entry);
  }
}
function readAuthEntryFromStore(store, serverName, options, behavior = {}) {
  const account = getAuthEntryAccount(serverName);
  let payload;
  try {
    payload = store.read(account);
  } catch (error) {
    throw new OAuthCredentialStoreError(
      `Failed to read OAuth credentials for ${serverName} from the OS secure credential store`,
      "read",
      error
    );
  }
  if (payload !== void 0) {
    const manifest = readChunkManifestFromPayload(serverName, payload, "OS secure credential store");
    const entry = manifest ? readChunkedAuthEntry(store, serverName, account, manifest) : parseAuthEntryPayload(serverName, payload, "OS secure credential store");
    removeLegacyAuthEntry(serverName, options);
    return entry;
  }
  const legacyEntry = readLegacyAuthEntry(serverName, options);
  if (!legacyEntry) return void 0;
  if (behavior.migrateLegacy === false) return legacyEntry;
  writeSecureAuthEntryToStore(store, serverName, legacyEntry);
  removeLegacyAuthEntry(serverName, options);
  return legacyEntry;
}
function readAuthEntry(serverName, options, behavior = {}) {
  const cacheable = behavior.migrateLegacy !== false && isAuthEntryCacheEnabled();
  if (cacheable && authEntryCache.has(serverName)) {
    return cloneAuthEntry(authEntryCache.get(serverName));
  }
  let entry;
  try {
    entry = readAuthEntryFromStore(getAuthSecretStore(), serverName, options, behavior);
  } catch (error) {
    if (!shouldAttemptLinuxKeyringRecovery(error)) throw error;
    entry = readAuthEntryFromStore(linuxKeyringRecoveryAuthSecretStore, serverName, options, behavior);
  }
  if (cacheable) authEntryCache.set(serverName, cloneAuthEntry(entry));
  return entry;
}
function getAuthEntry(serverName, options) {
  return readAuthEntry(serverName, options);
}
function getAuthForUrl(serverName, serverUrl, options) {
  const entry = getAuthEntry(serverName, options);
  if (!entry) return void 0;
  if (!entry.serverUrl) return void 0;
  if (entry.serverUrl !== serverUrl) return void 0;
  return entry;
}
function inspectAuthForUrl(serverName, serverUrl, options) {
  try {
    const entry = readAuthEntry(serverName, options, { migrateLegacy: false });
    if (!entry?.serverUrl || entry.serverUrl !== serverUrl) return { status: "absent" };
    return { status: "present", entry };
  } catch (error) {
    if (!(error instanceof OAuthCredentialStoreError)) throw error;
    return { status: "unavailable", message: formatOAuthCredentialStoreUnavailable(error) };
  }
}
function saveAuthEntry(serverName, entry, serverUrl, options) {
  if (serverUrl) {
    entry.serverUrl = serverUrl;
  }
  writeSecureAuthEntry(serverName, entry);
  removeLegacyAuthEntry(serverName, options);
}
function removeAuthEntryFromStore(store, serverName) {
  const account = getAuthEntryAccount(serverName);
  try {
    const payload = store.read(account);
    const manifest = payload === void 0 ? void 0 : readChunkManifestFromPayload(serverName, payload, "OS secure credential store");
    if (manifest) removeChunkPayloads(store, account, manifest);
    store.remove(account);
  } catch (error) {
    throw new OAuthCredentialStoreError(
      `Failed to remove OAuth credentials for ${serverName} from the OS secure credential store`,
      "remove",
      error
    );
  }
}
function removeAuthEntry(serverName, options) {
  try {
    removeAuthEntryFromStore(getAuthSecretStore(), serverName);
  } catch (error) {
    if (!shouldAttemptLinuxKeyringRecovery(error)) throw error;
    removeAuthEntryFromStore(linuxKeyringRecoveryAuthSecretStore, serverName);
  }
  authEntryCache.delete(serverName);
  removeLegacyAuthEntry(serverName, options);
}
function invalidateAuthEntryCache(serverName) {
  authEntryCache.delete(serverName);
}
function updateTokens(serverName, tokens, serverUrl, options) {
  const entry = getAuthEntry(serverName, options) ?? {};
  if (serverUrl && entry.serverUrl !== serverUrl) {
    delete entry.clientInfo;
    delete entry.codeVerifier;
    delete entry.oauthState;
  }
  entry.tokens = tokens;
  saveAuthEntry(serverName, entry, serverUrl, options);
}
function updateClientInfo(serverName, clientInfo, serverUrl, options) {
  const entry = getAuthEntry(serverName, options) ?? {};
  if (serverUrl && entry.serverUrl !== serverUrl) {
    delete entry.tokens;
    delete entry.codeVerifier;
    delete entry.oauthState;
  }
  entry.clientInfo = clientInfo;
  saveAuthEntry(serverName, entry, serverUrl, options);
}
function clearCodeVerifier(serverName, options) {
  const entry = getAuthEntry(serverName, options);
  if (entry) {
    delete entry.codeVerifier;
    saveAuthEntry(serverName, entry, void 0, options);
  }
}
function getOAuthState(serverName, options) {
  const entry = getAuthEntry(serverName, options);
  return entry?.oauthState;
}
function clearOAuthState(serverName, options) {
  const entry = getAuthEntry(serverName, options);
  if (entry) {
    delete entry.oauthState;
    saveAuthEntry(serverName, entry, void 0, options);
  }
}
function clearAllCredentials(serverName, options) {
  removeAuthEntry(serverName, options);
}
function clearClientInfo(serverName, options) {
  const entry = getAuthEntry(serverName, options);
  if (entry) {
    delete entry.clientInfo;
    saveAuthEntry(serverName, entry, void 0, options);
  }
}
function clearTokens(serverName, options) {
  const entry = getAuthEntry(serverName, options);
  if (entry) {
    delete entry.tokens;
    saveAuthEntry(serverName, entry, void 0, options);
  }
}

// mcp-oauth-provider.ts
init_utils();
init_agent_dir();
function defaultClientName() {
  const app = getAppName();
  return app === "pi" ? "Pi Coding Agent" : app;
}
function defaultClientUri() {
  const declared = getAppClientUri();
  if (declared) return declared;
  return getAppName() === "pi" ? "https://github.com/nicobailon/pi-mcp-adapter" : void 0;
}
function issuersMatch(first, second) {
  return first === second || first.endsWith("/") && first.slice(0, -1) === second || second.endsWith("/") && second.slice(0, -1) === first;
}
var DEFAULT_OAUTH_CALLBACK_PORT = 19876;
var DEFAULT_OAUTH_CALLBACK_PATH = "/callback";
var configuredOAuthCallbackPort = DEFAULT_OAUTH_CALLBACK_PORT;
if (process.env.MCP_OAUTH_CALLBACK_PORT) {
  const parsedPort = Number.parseInt(process.env.MCP_OAUTH_CALLBACK_PORT, 10);
  if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
    configuredOAuthCallbackPort = parsedPort;
  }
}
var oauthCallbackPort = configuredOAuthCallbackPort;
var oauthCallbackPath = DEFAULT_OAUTH_CALLBACK_PATH;
function getConfiguredOAuthCallbackPort() {
  return configuredOAuthCallbackPort;
}
function getOAuthCallbackPort() {
  return oauthCallbackPort;
}
function setOAuthCallbackPort(port) {
  oauthCallbackPort = port;
}
function getOAuthCallbackPath() {
  return oauthCallbackPath;
}
function setOAuthCallbackPath(path2) {
  oauthCallbackPath = path2.startsWith("/") ? path2 : `/${path2}`;
}
var reservedAuthorizationParams = /* @__PURE__ */ new Set([
  "client_id",
  "code_challenge",
  "code_challenge_method",
  "redirect_uri",
  "resource",
  "response_type",
  "scope",
  "state"
]);
function addAuthorizationParams(authorizationUrl, params) {
  if (!params) return authorizationUrl;
  const nextUrl = new URL(authorizationUrl.toString());
  for (const [key, value] of Object.entries(params)) {
    if (reservedAuthorizationParams.has(key) || nextUrl.searchParams.has(key)) {
      throw new Error(`OAuth authorizationParams.${key} cannot override an authorization flow parameter`);
    }
    nextUrl.searchParams.set(key, value);
  }
  return nextUrl;
}
var McpOAuthProvider = class {
  constructor(serverName, serverUrl, config, callbacks, storageOptions = {}, runtimeSignal, initialState) {
    this.serverName = serverName;
    this.serverUrl = serverUrl;
    this.config = config;
    this.callbacks = callbacks;
    this.storageOptions = storageOptions;
    this.runtimeSignal = runtimeSignal;
    this.flowState = initialState;
    this.redirectUrlSnapshot = config.grantType === "client_credentials" ? void 0 : config.redirectUri ?? `http://localhost:${getOAuthCallbackPort()}${getOAuthCallbackPath()}`;
  }
  serverName;
  serverUrl;
  config;
  callbacks;
  storageOptions;
  runtimeSignal;
  redirectUrlSnapshot;
  active = true;
  flowClientInfo;
  flowCodeVerifier;
  flowDiscoveryState;
  flowIssuerMismatch = false;
  flowState;
  get usesClientCredentials() {
    return this.config.grantType === "client_credentials";
  }
  get discoveredIssuer() {
    return this.flowDiscoveryState?.authorizationServerMetadata?.issuer ?? this.flowDiscoveryState?.authorizationServerUrl;
  }
  deactivate() {
    this.active = false;
  }
  assertStoredIssuerBindings(entry, issuer) {
    if (this.flowIssuerMismatch) {
      throw new Error(
        `OAuth authorization server issuer changed for ${this.serverName}; clear credentials before authenticating again`
      );
    }
    if (!entry || !issuer) return;
    const storedIssuers = [entry.clientInfo?.issuer, entry.tokens?.issuer].filter((storedIssuer) => storedIssuer !== void 0);
    if (storedIssuers.some((storedIssuer) => !issuersMatch(storedIssuer, issuer))) {
      this.flowIssuerMismatch = true;
      throw new Error(
        `OAuth authorization server issuer changed for ${this.serverName}; clear credentials before authenticating again`
      );
    }
  }
  throwIfInactive() {
    if (!this.active) throw new Error("OAuth flow is no longer active");
    this.runtimeSignal?.throwIfAborted();
  }
  /**
   * The redirect URL for OAuth callbacks.
   * This must match the redirect_uri in client metadata.
   */
  get redirectUrl() {
    return this.redirectUrlSnapshot;
  }
  /** Configured homepage, else the historical default on stock pi, else nothing. */
  get clientUri() {
    return this.config.clientUri ?? defaultClientUri();
  }
  /**
   * Client metadata for dynamic registration.
   * Describes this client to the OAuth authorization server.
   */
  get clientMetadata() {
    if (this.usesClientCredentials) {
      return {
        client_name: this.config.clientName ?? defaultClientName(),
        ...this.clientUri !== void 0 ? { client_uri: this.clientUri } : {},
        ...this.config.logoUri !== void 0 ? { logo_uri: this.config.logoUri } : {},
        redirect_uris: [],
        grant_types: ["client_credentials"],
        token_endpoint_auth_method: this.config.clientSecret ? "client_secret_post" : "none"
      };
    }
    const redirectUrl = this.redirectUrl;
    if (!redirectUrl) {
      throw new Error("redirectUrl is required for authorization_code flow");
    }
    return {
      redirect_uris: [redirectUrl],
      client_name: this.config.clientName ?? defaultClientName(),
      ...this.clientUri !== void 0 ? { client_uri: this.clientUri } : {},
      ...this.config.logoUri !== void 0 ? { logo_uri: this.config.logoUri } : {},
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: this.config.clientSecret ? "client_secret_post" : "none",
      ...this.config.scope !== void 0 ? { scope: this.config.scope } : {}
    };
  }
  /**
   * Get client information (for pre-registered or dynamically registered clients).
   * Returns undefined if no client info exists or if the server URL has changed.
   */
  async clientInformation() {
    const issuer = this.discoveredIssuer;
    const stored = await getAuthForUrl(this.serverName, this.serverUrl, this.storageOptions);
    this.assertStoredIssuerBindings(stored, issuer);
    if (this.config.clientId) {
      const storedClient = stored?.clientInfo?.clientId === this.config.clientId ? stored.clientInfo : void 0;
      if (issuer && (storedClient?.issuer !== issuer || storedClient.configPreRegistered !== true)) {
        updateClientInfo(
          this.serverName,
          { clientId: this.config.clientId, issuer, configPreRegistered: true },
          this.serverUrl,
          this.storageOptions
        );
      }
      const clientSecret = this.config.clientSecret?.startsWith("!") ? resolveCommandSecret(
        this.config.clientSecret,
        `MCP server "${this.serverName}" OAuth clientSecret`
      ) : this.config.clientSecret;
      return {
        client_id: this.config.clientId,
        client_secret: clientSecret,
        ...issuer !== void 0 ? { issuer } : {}
      };
    }
    const clientInfo = this.flowClientInfo ?? stored?.clientInfo;
    if (clientInfo) {
      const isConfigStub = clientInfo.configPreRegistered === true || clientInfo.clientSecret === void 0 && clientInfo.clientIdIssuedAt === void 0 && clientInfo.clientSecretExpiresAt === void 0 && clientInfo.redirectUris === void 0;
      if (isConfigStub) {
        return void 0;
      }
      if (clientInfo.clientSecretExpiresAt && clientInfo.clientSecretExpiresAt < Date.now() / 1e3) {
        return void 0;
      }
      if (issuer && clientInfo.issuer && !issuersMatch(clientInfo.issuer, issuer)) {
        return void 0;
      }
      if (issuer && clientInfo.issuer === void 0) {
        clientInfo.issuer = issuer;
        this.flowClientInfo = clientInfo;
        updateClientInfo(this.serverName, clientInfo, this.serverUrl, this.storageOptions);
      }
      return {
        client_id: clientInfo.clientId,
        client_secret: clientInfo.clientSecret,
        ...clientInfo.clientIdIssuedAt !== void 0 ? { client_id_issued_at: clientInfo.clientIdIssuedAt } : {},
        ...clientInfo.clientSecretExpiresAt !== void 0 ? { client_secret_expires_at: clientInfo.clientSecretExpiresAt } : {},
        ...clientInfo.redirectUris !== void 0 ? { redirect_uris: clientInfo.redirectUris } : {},
        ...clientInfo.issuer !== void 0 ? { issuer: clientInfo.issuer } : {}
      };
    }
    return void 0;
  }
  /**
   * Save client information from dynamic registration.
   */
  async saveClientInformation(info) {
    this.throwIfInactive();
    const issuer = this.discoveredIssuer ?? info.issuer;
    if (this.config.clientId && info.client_id === this.config.clientId) {
      updateClientInfo(
        this.serverName,
        {
          clientId: info.client_id,
          ...issuer !== void 0 ? { issuer } : {},
          configPreRegistered: true
        },
        this.serverUrl,
        this.storageOptions
      );
      return;
    }
    const redirectUris = ("redirect_uris" in info ? info.redirect_uris : void 0) ?? (this.redirectUrl ? [this.redirectUrl] : void 0);
    const clientInfo = {
      clientId: info.client_id,
      ...info.client_secret !== void 0 ? { clientSecret: info.client_secret } : {},
      ...info.client_id_issued_at !== void 0 ? { clientIdIssuedAt: info.client_id_issued_at } : {},
      ...info.client_secret_expires_at !== void 0 ? { clientSecretExpiresAt: info.client_secret_expires_at } : {},
      ...redirectUris !== void 0 ? { redirectUris } : {},
      ...issuer !== void 0 ? { issuer } : {}
    };
    this.flowClientInfo = clientInfo;
    updateClientInfo(this.serverName, clientInfo, this.serverUrl, this.storageOptions);
  }
  /**
   * Get stored OAuth tokens.
   * Returns undefined if no tokens exist or if the server URL has changed.
   */
  async tokens() {
    const entry = await getAuthForUrl(this.serverName, this.serverUrl, this.storageOptions);
    if (!entry?.tokens) return void 0;
    const issuer = this.discoveredIssuer;
    this.assertStoredIssuerBindings(entry, issuer);
    if (issuer && entry.tokens.issuer === void 0) {
      entry.tokens.issuer = issuer;
      updateTokens(this.serverName, entry.tokens, this.serverUrl, this.storageOptions);
    }
    return {
      access_token: entry.tokens.accessToken,
      token_type: "Bearer",
      refresh_token: entry.tokens.refreshToken,
      expires_in: entry.tokens.expiresAt ? Math.max(0, Math.floor(entry.tokens.expiresAt - Date.now() / 1e3)) : void 0,
      scope: entry.tokens.scope,
      ...entry.tokens.issuer !== void 0 ? { issuer: entry.tokens.issuer } : {}
    };
  }
  /**
   * Save OAuth tokens.
   */
  async saveTokens(tokens) {
    const issuer = this.discoveredIssuer ?? tokens.issuer;
    const storedTokens = {
      accessToken: tokens.access_token,
      ...tokens.refresh_token !== void 0 ? { refreshToken: tokens.refresh_token } : {},
      // Preserve expiry even when expires_in is 0 (e.g. the SDK re-saving an
      // already-expired token) so expired tokens stay expired instead of
      // being persisted as never-expiring.
      ...tokens.expires_in !== void 0 ? { expiresAt: Date.now() / 1e3 + tokens.expires_in } : {},
      ...tokens.scope !== void 0 ? { scope: tokens.scope } : {},
      ...issuer !== void 0 ? { issuer } : {}
    };
    this.throwIfInactive();
    updateTokens(this.serverName, storedTokens, this.serverUrl, this.storageOptions);
    this.flowDiscoveryState = void 0;
  }
  /**
   * Redirect the user to the authorization URL.
   * This opens the browser for the user to authenticate.
   *
   * Throws UnauthorizedError when called outside of a user-initiated flow
   * (no oauthState saved by startAuth). That path is reached when the SDK
   * falls through from a failed refresh into a fresh authorization_code
   * flow, which library hosts cannot complete in-process.
   */
  async redirectToAuthorization(authorizationUrl) {
    if (this.usesClientCredentials) {
      throw new Error("redirectToAuthorization is not used for client_credentials flow");
    }
    this.throwIfInactive();
    if (!this.flowState) {
      throw new UnauthorizedError(
        `Re-authentication required for MCP server: ${this.serverName}`
      );
    }
    await this.callbacks.onRedirect(addAuthorizationParams(authorizationUrl, this.config.authorizationParams));
  }
  /**
   * Save the PKCE code verifier.
   */
  async saveCodeVerifier(codeVerifier) {
    this.throwIfInactive();
    this.flowCodeVerifier = codeVerifier;
  }
  /**
   * Get the stored PKCE code verifier.
   * @throws Error if no code verifier is stored
   */
  async codeVerifier() {
    if (this.usesClientCredentials) {
      throw new Error("codeVerifier is not used for client_credentials flow");
    }
    this.throwIfInactive();
    if (!this.flowCodeVerifier) {
      throw new Error(`No code verifier saved for MCP server: ${this.serverName}`);
    }
    return this.flowCodeVerifier;
  }
  /**
   * Keep discovery with the in-flight PKCE verifier. The callback leg uses it
   * to validate the authorization response issuer before token exchange.
   */
  async saveDiscoveryState(state) {
    this.throwIfInactive();
    this.flowDiscoveryState = structuredClone(state);
  }
  async discoveryState() {
    this.throwIfInactive();
    return this.flowDiscoveryState ? structuredClone(this.flowDiscoveryState) : void 0;
  }
  /**
   * Save the OAuth state parameter for CSRF protection.
   */
  async saveState(state) {
    this.throwIfInactive();
    this.flowState = state;
  }
  /**
   * Get the stored OAuth state parameter.
   * @throws UnauthorizedError if no flow is in progress (see redirectToAuthorization)
   */
  async state() {
    if (this.usesClientCredentials) {
      throw new Error("state is not used for client_credentials flow");
    }
    this.throwIfInactive();
    if (!this.flowState) {
      throw new UnauthorizedError(
        `Re-authentication required for MCP server: ${this.serverName}`
      );
    }
    return this.flowState;
  }
  /**
   * Invalidate credentials when authentication fails.
   * Clears tokens, client info, or all credentials based on the type.
   */
  async invalidateCredentials(type) {
    this.throwIfInactive();
    switch (type) {
      case "all":
        this.flowClientInfo = void 0;
        this.flowCodeVerifier = void 0;
        this.flowDiscoveryState = void 0;
        this.flowIssuerMismatch = false;
        this.flowState = void 0;
        clearAllCredentials(this.serverName, this.storageOptions);
        break;
      case "client":
        this.flowClientInfo = void 0;
        clearClientInfo(this.serverName, this.storageOptions);
        break;
      case "tokens":
        clearTokens(this.serverName, this.storageOptions);
        break;
      case "verifier":
        clearCodeVerifier(this.serverName, this.storageOptions);
        break;
      case "discovery":
        this.flowDiscoveryState = void 0;
        break;
    }
  }
  /**
   * Adds configured authorization-code scope without replacing the SDK's
   * default token endpoint authentication behavior.
   */
  addClientAuthentication = async (headers, params, _url, metadata) => {
    this.throwIfInactive();
    if (params.get("grant_type") === "authorization_code" && !params.has("scope") && this.config.scope) {
      params.set("scope", this.config.scope);
    }
    const clientInfo = await this.clientInformation();
    this.throwIfInactive();
    if (!clientInfo) {
      return;
    }
    const supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];
    const hasClientSecret = clientInfo.client_secret !== void 0;
    let authMethod;
    if (supportedMethods.length === 0) {
      authMethod = hasClientSecret ? "client_secret_post" : "none";
    } else if (hasClientSecret && supportedMethods.includes("client_secret_basic")) {
      authMethod = "client_secret_basic";
    } else if (hasClientSecret && supportedMethods.includes("client_secret_post")) {
      authMethod = "client_secret_post";
    } else if (supportedMethods.includes("none")) {
      authMethod = "none";
    } else {
      authMethod = hasClientSecret ? "client_secret_post" : "none";
    }
    if (authMethod === "client_secret_basic") {
      if (!clientInfo.client_secret) {
        throw new Error("client_secret_basic authentication requires a client_secret");
      }
      headers.set("Authorization", `Basic ${Buffer.from(`${clientInfo.client_id}:${clientInfo.client_secret}`).toString("base64")}`);
      return;
    }
    if (!params.has("client_id")) {
      params.set("client_id", clientInfo.client_id);
    }
    if (authMethod === "client_secret_post" && clientInfo.client_secret && !params.has("client_secret")) {
      params.set("client_secret", clientInfo.client_secret);
    }
  };
  prepareTokenRequest(scope) {
    if (!this.usesClientCredentials) {
      return void 0;
    }
    const params = new URLSearchParams({ grant_type: "client_credentials" });
    const requestedScope = scope ?? this.config.scope;
    if (requestedScope) {
      params.set("scope", requestedScope);
    }
    return params;
  }
};

// mcp-callback-server.ts
init_agent_dir();
import { createServer } from "http";
var PAGE_STYLE = `
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #0f1117;
      color: #e6e8ee;
    }
    .card {
      width: 100%;
      max-width: 26rem;
      padding: 2.5rem 2rem;
      text-align: center;
      background: #161922;
      border: 1px solid #242938;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.25);
    }
    .badge {
      width: 3rem; height: 3rem;
      margin: 0 auto 1.25rem;
      display: grid; place-items: center;
      border-radius: 50%;
    }
    .badge svg { width: 1.5rem; height: 1.5rem; display: block; }
    .ok   { background: rgba(74,222,128,.12); color: #4ade80; }
    .bad  { background: rgba(248,113,113,.12); color: #f87171; }
    h1 { margin: 0 0 .5rem; font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; }
    p  { margin: 0; color: #9aa1b1; }
    .app { color: #e6e8ee; font-weight: 500; }
    .hint { margin-top: 1.25rem; font-size: .8125rem; color: #6b7280; }
    code {
      display: block;
      margin-top: 1.25rem;
      padding: .75rem .875rem;
      text-align: left;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #fca5a5;
      background: rgba(248,113,113,.08);
      border: 1px solid rgba(248,113,113,.2);
      border-radius: 8px;
      overflow-wrap: anywhere;
    }
    @media (prefers-color-scheme: light) {
      body { background: #f6f7f9; color: #121620; }
      .card { background: #fff; border-color: #e4e7ee; }
      p { color: #5b6474; }
      .app { color: #121620; }
      .hint { color: #8b93a3; }
    }`;
var CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
var CROSS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function page(options) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${options.title}</title>
  <style>${PAGE_STYLE}
  </style>
</head>
<body>
  <main class="card">
    <div class="badge ${options.tone}">${options.icon}</div>
    <h1>${options.heading}</h1>
    <p>${options.body}</p>
    ${options.extra ?? ""}
  </main>
${options.autoClose ? "  <script>setTimeout(() => window.close(), 2000);</script>\n" : ""}</body>
</html>`;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function htmlSuccess() {
  const app = escapeHtml(getAppName());
  return page({
    title: `${app} \u2014 Authorization Successful`,
    heading: "Authorization Successful",
    body: `You can close this window and return to <span class="app">${app}</span>.`,
    icon: CHECK_ICON,
    tone: "ok",
    autoClose: true
  });
}
function htmlManualSuccess() {
  const app = escapeHtml(getAppName());
  return page({
    title: `${app} \u2014 Authorization Received`,
    heading: "Authorization Received",
    body: `Copy the full callback URL from your browser address bar and paste it back into <span class="app">${app}</span> with auth-complete.`,
    icon: CHECK_ICON,
    tone: "ok"
  });
}
function htmlError(error) {
  const app = escapeHtml(getAppName());
  return page({
    title: `${app} \u2014 Authorization Failed`,
    heading: "Authorization Failed",
    body: `Something went wrong during authorization. You can close this window and try again from <span class="app">${app}</span>.`,
    icon: CROSS_ICON,
    tone: "bad",
    extra: `<code>${escapeHtml(error)}</code>`
  });
}
var server;
var bindingPromise;
var stoppingPromise;
var callbackGeneration = 0;
var pendingAuths = /* @__PURE__ */ new Map();
var reservedAuthStates = /* @__PURE__ */ new Set();
var CALLBACK_TIMEOUT_MS = 5 * 60 * 1e3;
var DEFAULT_OAUTH_CALLBACK_HOST = "localhost";
var callbackServerHost = DEFAULT_OAUTH_CALLBACK_HOST;
function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (url.pathname !== getOAuthCallbackPath()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const code = url.searchParams.get("code");
  const iss = url.searchParams.get("iss");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (!state) {
    const errorMsg = "Missing required state parameter - potential CSRF attack";
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(htmlError(errorMsg));
    return;
  }
  const pending = pendingAuths.get(state);
  const isReserved = reservedAuthStates.has(state);
  if (error) {
    if (!pending && !isReserved) {
      const errorMsg2 = "Invalid or expired state parameter - potential CSRF attack";
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(htmlError(errorMsg2));
      return;
    }
    const errorMsg = errorDescription || error;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(htmlError(errorMsg));
    if (pending) {
      reservedAuthStates.delete(state);
      clearTimeout(pending.timeout);
      pendingAuths.delete(state);
      setTimeout(() => pending.reject(new Error(errorMsg)), 0);
    }
    return;
  }
  if (!pending && !isReserved) {
    const errorMsg = "Invalid or expired state parameter - potential CSRF attack";
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(htmlError(errorMsg));
    return;
  }
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(htmlError("No authorization code provided"));
    return;
  }
  if (!pending) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(htmlManualSuccess());
    return;
  }
  clearTimeout(pending.timeout);
  pendingAuths.delete(state);
  pending.resolve({ code, ...iss !== null ? { iss } : {} });
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(htmlSuccess());
}
async function ensureCallbackServer(options = {}) {
  if (stoppingPromise) {
    throw new Error("OAuth callback server stopped");
  }
  const generation = callbackGeneration;
  while (bindingPromise) {
    await bindingPromise;
    if (generation !== callbackGeneration) {
      throw new Error("OAuth callback server stopped");
    }
  }
  if (generation !== callbackGeneration) {
    throw new Error("OAuth callback server stopped");
  }
  const operation = ensureCallbackServerLocked(options);
  bindingPromise = operation;
  try {
    await operation;
  } finally {
    if (bindingPromise === operation) {
      bindingPromise = void 0;
    }
  }
}
async function ensureCallbackServerLocked(options = {}) {
  const requiredPort = options.port ?? getConfiguredOAuthCallbackPort();
  const strictPort = options.strictPort === true;
  const requestedHost = options.callbackHost ?? DEFAULT_OAUTH_CALLBACK_HOST;
  const rawRequestedPath = options.callbackPath ?? DEFAULT_OAUTH_CALLBACK_PATH;
  const requestedPath = rawRequestedPath.startsWith("/") ? rawRequestedPath : `/${rawRequestedPath}`;
  if (options.reserveState && !options.oauthState) {
    throw new Error("OAuth callback reservation requires an oauthState");
  }
  let reservedState;
  const previousServer = server;
  const needsStrictRebind = Boolean(previousServer && strictPort && getOAuthCallbackPort() !== requiredPort);
  const needsHostSwitch = Boolean(previousServer && callbackServerHost !== requestedHost);
  const needsPathSwitch = Boolean(previousServer && getOAuthCallbackPath() !== requestedPath);
  if (previousServer) {
    if (!needsStrictRebind && !needsHostSwitch) {
      if (needsPathSwitch) {
        if (pendingAuths.size > 0 || reservedAuthStates.size > 0) {
          throw new Error(
            `OAuth callback server is using path ${getOAuthCallbackPath()}, but callback path ${requestedPath} is required and cannot be switched while authorizations are pending`
          );
        }
        setOAuthCallbackPath(requestedPath);
      }
      if (options.reserveState && options.oauthState) {
        reservedAuthStates.add(options.oauthState);
        reservedState = options.oauthState;
      }
      return;
    }
    if (pendingAuths.size > 0 || reservedAuthStates.size > 0) {
      throw new Error(
        `OAuth callback server is running on ${callbackServerHost}:${getOAuthCallbackPort()}, but strict callback endpoint ${requestedHost}:${requiredPort} is required and cannot be switched while authorizations are pending`
      );
    }
  }
  const candidateServer = createServer(handleRequest);
  const listenPort = strictPort ? requiredPort : 0;
  try {
    await new Promise((resolve6, reject) => {
      candidateServer.once("error", (err) => {
        reject(err);
      });
      candidateServer.listen(listenPort, requestedHost, () => {
        resolve6();
      });
    });
    if (strictPort) {
      setOAuthCallbackPort(requiredPort);
    } else {
      const address = candidateServer.address();
      if (!address || typeof address === "string" || typeof address.port !== "number") {
        throw new Error("OAuth callback server did not report an assigned port");
      }
      setOAuthCallbackPort(address.port);
    }
    if (previousServer && (needsStrictRebind || needsHostSwitch)) {
      await new Promise((resolve6) => {
        previousServer.close(() => resolve6());
      });
    }
    callbackServerHost = requestedHost;
    setOAuthCallbackPath(requestedPath);
    server = candidateServer;
    if (options.reserveState && options.oauthState) {
      reservedAuthStates.add(options.oauthState);
      reservedState = options.oauthState;
    }
    server.unref();
  } catch (error) {
    if (reservedState) {
      reservedAuthStates.delete(reservedState);
    }
    const nodeError = error;
    await new Promise((resolve6) => {
      candidateServer.close(() => resolve6());
    });
    if (strictPort && nodeError.code === "EADDRINUSE") {
      throw new Error(
        `OAuth callback port ${requiredPort} is already in use. Pre-registered OAuth clients require an exact redirect URI; set MCP_OAUTH_CALLBACK_PORT to your registered port or free port ${requiredPort}`,
        { cause: error }
      );
    }
    throw error;
  }
}
function releaseCallbackServer(oauthState) {
  reservedAuthStates.delete(oauthState);
}
function waitForCallback(oauthState) {
  reservedAuthStates.delete(oauthState);
  return new Promise((resolve6, reject) => {
    const timeout = setTimeout(() => {
      if (pendingAuths.has(oauthState)) {
        pendingAuths.delete(oauthState);
        reject(new Error("OAuth callback timeout - authorization took too long"));
      }
    }, CALLBACK_TIMEOUT_MS);
    pendingAuths.set(oauthState, { resolve: resolve6, reject, timeout });
  });
}
function cancelPendingCallback(oauthState) {
  reservedAuthStates.delete(oauthState);
  const pending = pendingAuths.get(oauthState);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingAuths.delete(oauthState);
    pending.reject(new Error("Authorization cancelled"));
  }
}
function stopCallbackServer() {
  if (stoppingPromise) return stoppingPromise;
  callbackGeneration += 1;
  const cleanup = (async () => {
    while (bindingPromise) {
      await bindingPromise.catch(() => {
      });
    }
    if (server) {
      await new Promise((resolve6) => {
        server.close(() => {
          resolve6();
        });
      });
      server = void 0;
    }
    setOAuthCallbackPort(getConfiguredOAuthCallbackPort());
    callbackServerHost = DEFAULT_OAUTH_CALLBACK_HOST;
    setOAuthCallbackPath(DEFAULT_OAUTH_CALLBACK_PATH);
    const pendingList = Array.from(pendingAuths.entries());
    pendingAuths.clear();
    reservedAuthStates.clear();
    setTimeout(() => {
      for (const [, pending] of pendingList) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("OAuth callback server stopped"));
      }
    }, 0);
  })();
  const operation = cleanup.finally(() => {
    if (stoppingPromise === operation) stoppingPromise = void 0;
  });
  stoppingPromise = operation;
  return operation;
}

// mcp-auth-flow.ts
init_types();
init_utils();

// abort.ts
function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? "MCP request aborted"));
}
async function abortable(promise, signal) {
  if (!signal) return promise;
  throwIfAborted(signal);
  return await new Promise((resolve6, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? "MCP request aborted")));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve6(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    );
  });
}

// runtime-owner.ts
init_utils();
function createMcpRuntimeOwner() {
  const controller = new AbortController();
  const cleanups = [];
  let stopPromise;
  const reportCleanupFailure = (error, late) => {
    console.error(`MCP: ${late ? "late " : ""}runtime cleanup failed: ${formatTerminalError(error)}`);
  };
  return {
    signal: controller.signal,
    isActive: () => !controller.signal.aborted,
    addCleanup: (cleanup) => {
      if (controller.signal.aborted) {
        void Promise.resolve().then(cleanup).catch((error) => reportCleanupFailure(error, true));
        return;
      }
      cleanups.push(cleanup);
    },
    stop: (reason = "MCP extension runtime stopped") => {
      if (stopPromise) return stopPromise;
      controller.abort(new Error(reason));
      const pendingCleanups = cleanups.splice(0).reverse().map(
        (cleanup) => Promise.resolve().then(cleanup)
      );
      stopPromise = Promise.allSettled(pendingCleanups).then((results) => {
        const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
        if (failures.length > 0) {
          const aggregate = new AggregateError(failures, "MCP runtime cleanup failed");
          console.error(`MCP: runtime cleanup failed: ${formatTerminalError(aggregate)}`);
          throw aggregate;
        }
      });
      return stopPromise;
    },
    throwIfInactive: () => controller.signal.throwIfAborted()
  };
}
function combineAbortSignals(...signals) {
  const active = signals.filter((signal) => signal !== void 0);
  if (active.length === 0) return void 0;
  if (active.length === 1) return active[0];
  return AbortSignal.any(active);
}
function createOwnedUi(ui, owner) {
  const proxies = /* @__PURE__ */ new WeakMap();
  const wrap = (value) => {
    if ((typeof value !== "object" || value === null) && typeof value !== "function") {
      return value;
    }
    const object = value;
    const existing = proxies.get(object);
    if (existing) return existing;
    const proxy = new Proxy(object, {
      get(target, property, receiver) {
        if (!owner.isActive()) return void 0;
        const member = Reflect.get(target, property, receiver);
        if (typeof member === "function") {
          return (...args) => {
            if (!owner.isActive()) return void 0;
            return Reflect.apply(member, target, args);
          };
        }
        return owner.isActive() ? wrap(member) : void 0;
      }
    });
    proxies.set(object, proxy);
    return proxy;
  };
  return wrap(ui);
}
function isAbortError(error, signal) {
  if (signal?.aborted) return true;
  return error instanceof Error && (error.name === "AbortError" || error.message === "MCP extension runtime stopped");
}

// mcp-auth-flow.ts
function applyOAuthConfig(discovery, config) {
  return {
    ...discovery,
    ...config.scope !== void 0 ? { scope: config.scope } : {},
    ...config.skipIssuerMetadataValidation === true ? { skipIssuerMetadataValidation: true } : {}
  };
}
var runtimeStates = /* @__PURE__ */ new WeakMap();
var activeRuntimes = /* @__PURE__ */ new Set();
function createOAuthRuntime(signal) {
  const controller = new AbortController();
  const runtime = { signal: combineAbortSignals(signal, controller.signal) };
  runtimeStates.set(runtime, {
    controller,
    generation: 0,
    pendingAuths: /* @__PURE__ */ new Map(),
    pendingAuthStates: /* @__PURE__ */ new Map(),
    pendingAuthCleanupTimers: /* @__PURE__ */ new Map(),
    pendingAuthentications: /* @__PURE__ */ new Map()
  });
  activeRuntimes.add(runtime);
  return runtime;
}
var legacyRuntime = createOAuthRuntime();
activeRuntimes.delete(legacyRuntime);
function getRuntime(options) {
  if (options?.runtime) {
    options.runtime.signal.throwIfAborted();
    activeRuntimes.add(options.runtime);
    return options.runtime;
  }
  if (legacyRuntime.signal.aborted) legacyRuntime = createOAuthRuntime();
  activeRuntimes.add(legacyRuntime);
  return legacyRuntime;
}
function getRuntimeState(runtime) {
  const state = runtimeStates.get(runtime);
  if (!state) throw new Error("Unknown OAuth runtime");
  return state;
}
function getPendingAuthKey(serverName, options) {
  return `${serverName}|${getAuthBaseDir(options)}`;
}
function hasPendingAuth(serverName, options, runtime) {
  const state = getRuntimeState(runtime ?? legacyRuntime);
  if (options) {
    return state.pendingAuths.has(getPendingAuthKey(serverName, options));
  }
  return Array.from(state.pendingAuths.values()).some((pendingAuth) => pendingAuth.serverName === serverName);
}
var MANUAL_AUTH_TIMEOUT_MS = 5 * 60 * 1e3;
function generateState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function extractOAuthConfig(definition) {
  if (definition.oauth === false) {
    return {};
  }
  const config = {};
  if (definition.oauth?.grantType !== void 0) config.grantType = definition.oauth.grantType;
  if (definition.oauth?.clientId !== void 0) {
    if (typeof definition.oauth.clientId !== "string") throw new Error("OAuth clientId must be a string");
    config.clientId = interpolateEnvVars(definition.oauth.clientId);
  }
  if (definition.oauth?.clientSecret !== void 0) {
    if (typeof definition.oauth.clientSecret !== "string") throw new Error("OAuth clientSecret must be a string");
    config.clientSecret = definition.oauth.clientSecret.startsWith("!") ? definition.oauth.clientSecret : interpolateEnvVars(definition.oauth.clientSecret);
  }
  if (definition.oauth?.scope !== void 0) {
    if (typeof definition.oauth.scope !== "string") throw new Error("OAuth scope must be a string");
    config.scope = interpolateEnvVars(definition.oauth.scope);
  }
  if (definition.oauth?.authorizationParams !== void 0) {
    const params = definition.oauth.authorizationParams;
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      throw new Error("OAuth authorizationParams must be an object");
    }
    config.authorizationParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (!key) throw new Error("OAuth authorizationParams keys must not be empty");
      if (typeof value !== "string") throw new Error(`OAuth authorizationParams.${key} must be a string`);
      config.authorizationParams[key] = interpolateEnvVars(value);
    }
  }
  if (definition.oauth?.redirectUri !== void 0) {
    if (typeof definition.oauth.redirectUri !== "string") {
      throw new Error("OAuth redirectUri must be a string");
    }
    const redirectUri = interpolateEnvVars(definition.oauth.redirectUri).trim();
    if (!redirectUri) {
      throw new Error("OAuth redirectUri must not be empty");
    }
    config.redirectUri = redirectUri;
  }
  if (definition.oauth?.clientName !== void 0) {
    if (typeof definition.oauth.clientName !== "string") {
      throw new Error("OAuth clientName must be a string");
    }
    const clientName = interpolateEnvVars(definition.oauth.clientName).trim();
    if (!clientName) {
      throw new Error("OAuth clientName must not be empty");
    }
    config.clientName = clientName;
  }
  if (definition.oauth?.clientUri !== void 0) {
    if (typeof definition.oauth.clientUri !== "string") {
      throw new Error("OAuth clientUri must be a string");
    }
    const clientUri = interpolateEnvVars(definition.oauth.clientUri).trim();
    if (!clientUri) {
      throw new Error("OAuth clientUri must not be empty");
    }
    config.clientUri = clientUri;
  }
  if (definition.oauth?.logoUri !== void 0) {
    if (typeof definition.oauth.logoUri !== "string") {
      throw new Error("OAuth logoUri must be a string");
    }
    const logoUri = interpolateEnvVars(definition.oauth.logoUri).trim();
    if (!logoUri) {
      throw new Error("OAuth logoUri must not be empty");
    }
    let parsed;
    try {
      parsed = new URL(logoUri);
    } catch {
      throw new Error("OAuth logoUri must be an absolute http(s) URL");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("OAuth logoUri must be an absolute http(s) URL");
    }
    config.logoUri = logoUri;
  }
  if (definition.oauth?.skipIssuerMetadataValidation !== void 0) {
    if (typeof definition.oauth.skipIssuerMetadataValidation !== "boolean") {
      throw new Error("OAuth skipIssuerMetadataValidation must be a boolean");
    }
    config.skipIssuerMetadataValidation = definition.oauth.skipIssuerMetadataValidation;
  }
  return config;
}
async function probeAuthDiscovery(serverUrl, definition, signal) {
  const discoveryHeaders = definition?.headers ? Object.fromEntries(Object.entries(definition.headers).filter(([, value]) => !value.startsWith("!") || value.startsWith("!!"))) : void 0;
  const headers = new Headers(interpolateEnvRecord(discoveryHeaders));
  headers.set("content-type", "application/json");
  const controller = new AbortController();
  const discoverySignal = combineAbortSignals(signal, controller.signal);
  const timer = setTimeout(() => controller.abort(), 5e3);
  try {
    headers.set("accept", "application/json, text/event-stream");
    const response = await fetch(new URL(serverUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "pi-mcp-adapter", version: "2.11.0" }
        }
      }),
      ...discoverySignal ? { signal: discoverySignal } : {}
    });
    const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
    await response.body?.cancel().catch(() => {
    });
    return { ...resourceMetadataUrl ? { resourceMetadataUrl } : {}, ...scope ? { scope } : {} };
  } catch (error) {
    if (signal?.aborted) throwIfAborted(signal);
    return {};
  } finally {
    clearTimeout(timer);
  }
}
function parseOAuthRedirectUri(redirectUri) {
  let url;
  try {
    url = new URL(redirectUri);
  } catch (error) {
    throw new Error(`Invalid OAuth redirectUri: ${redirectUri}`, { cause: error });
  }
  const hostname = url.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  if (url.protocol !== "http:" || !isLocalhost) {
    throw new Error("OAuth redirectUri must be an http:// localhost or loopback URI");
  }
  if (url.username || url.password) {
    throw new Error("OAuth redirectUri must not include username or password");
  }
  if (url.hash) {
    throw new Error("OAuth redirectUri must not include a fragment");
  }
  if (!url.port) {
    throw new Error("OAuth redirectUri must include an explicit numeric port");
  }
  const port = Number.parseInt(url.port, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("OAuth redirectUri must include an explicit numeric port");
  }
  const callbackHost = hostname === "[::1]" ? "::1" : hostname;
  return { port, callbackHost, callbackPath: url.pathname };
}
async function startAuth(serverName, serverUrl, definition, options = {}) {
  if (isServerDisabled(definition)) throw new Error(`MCP server "${serverName}" is disabled`);
  const runtime = getRuntime(options);
  const runtimeState = getRuntimeState(runtime);
  const config = definition ? extractOAuthConfig(definition) : {};
  const authStorageOptions = options.authStorageOptions ?? {};
  const signal = combineAbortSignals(runtime.signal, options.signal);
  const generation = runtimeState.generation;
  throwIfAborted(signal);
  if (config.grantType === "client_credentials") {
    const storedAuth = await getAuthForUrl(serverName, serverUrl, authStorageOptions);
    if (storedAuth?.clientInfo && !storedAuth.tokens && !config.clientId) {
      clearClientInfo(serverName, authStorageOptions);
      clearCodeVerifier(serverName, authStorageOptions);
      await clearOAuthState(serverName, authStorageOptions);
    }
    const authProvider2 = new McpOAuthProvider(serverName, serverUrl, config, {
      onRedirect: async () => {
        throw new Error("Browser redirect is not used for client_credentials flow");
      }
    }, authStorageOptions, runtime.signal);
    try {
      const discovery = applyOAuthConfig(await probeAuthDiscovery(serverUrl, definition, signal), config);
      throwIfAborted(signal);
      const result = await abortable(runSdkAuth(authProvider2, { serverUrl, ...discovery }), signal);
      throwIfAborted(signal);
      if (result !== "AUTHORIZED") {
        throw new UnauthorizedError2("Failed to authorize");
      }
      return { authorizationUrl: "" };
    } finally {
      authProvider2.deactivate();
    }
  }
  const existingPendingAuth = runtimeState.pendingAuths.get(getPendingAuthKey(serverName, authStorageOptions));
  if (existingPendingAuth?.serverUrl === serverUrl) {
    return { authorizationUrl: existingPendingAuth.authorizationUrl };
  }
  const redirectCallback = config.redirectUri !== void 0 ? parseOAuthRedirectUri(config.redirectUri) : void 0;
  const oauthState = generateState();
  try {
    await ensureCallbackServer({
      strictPort: Boolean(config.clientId) || config.redirectUri !== void 0,
      oauthState,
      reserveState: true,
      ...redirectCallback ? { port: redirectCallback.port, callbackHost: redirectCallback.callbackHost, callbackPath: redirectCallback.callbackPath } : {}
    });
    throwIfAborted(signal);
  } catch (error) {
    releaseCallbackServer(oauthState);
    try {
      await clearOAuthState(serverName, authStorageOptions);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "OAuth startup cleanup failed");
    }
    throw error;
  }
  let capturedUrl;
  const authProvider = new McpOAuthProvider(serverName, serverUrl, config, {
    onRedirect: async (url) => {
      capturedUrl = url;
    }
  }, authStorageOptions, runtime.signal, oauthState);
  try {
    const storedAuth = await getAuthForUrl(serverName, serverUrl, authStorageOptions);
    if (storedAuth?.clientInfo && !config.clientId) {
      if (!storedAuth.tokens) {
        clearClientInfo(serverName, authStorageOptions);
        clearCodeVerifier(serverName, authStorageOptions);
        await clearOAuthState(serverName, authStorageOptions);
      } else {
        const redirectUris = storedAuth.clientInfo.redirectUris;
        if (!Array.isArray(redirectUris) || !redirectUris.includes(authProvider.redirectUrl ?? "")) {
          clearClientInfo(serverName, authStorageOptions);
          clearTokens(serverName, authStorageOptions);
          clearCodeVerifier(serverName, authStorageOptions);
          await clearOAuthState(serverName, authStorageOptions);
        }
      }
    }
    throwIfAborted(signal);
    const discovery = applyOAuthConfig(await probeAuthDiscovery(serverUrl, definition, signal), config);
    throwIfAborted(signal);
    const result = await abortable(runSdkAuth(authProvider, { serverUrl, ...discovery }), signal);
    throwIfAborted(signal);
    if (result === "AUTHORIZED") {
      authProvider.deactivate();
      releaseCallbackServer(oauthState);
      await clearOAuthState(serverName, authStorageOptions);
      return { authorizationUrl: "" };
    }
    if (!capturedUrl) {
      throw new UnauthorizedError2("OAuth authorization URL was not provided");
    }
    await setPendingAuth(runtime, serverName, { serverName, authProvider, serverUrl, authorizationUrl: capturedUrl.toString(), discovery, authStorageOptions }, oauthState, signal, generation);
    return { authorizationUrl: capturedUrl.toString() };
  } catch (error) {
    authProvider.deactivate();
    try {
      await clearPendingAuth(runtime, serverName, oauthState, authStorageOptions);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "OAuth startup cleanup failed");
    }
    throw error;
  }
}
async function setPendingAuth(runtime, serverName, pendingAuth, oauthState, signal, generation = getRuntimeState(runtime).generation) {
  const state = getRuntimeState(runtime);
  const key = getPendingAuthKey(serverName, pendingAuth.authStorageOptions);
  await clearPendingAuth(runtime, serverName, void 0, pendingAuth.authStorageOptions);
  throwIfAborted(signal);
  if (generation !== state.generation) throw new Error("OAuth runtime stopped");
  state.pendingAuths.set(key, pendingAuth);
  state.pendingAuthStates.set(key, oauthState);
  const cleanupTimer = setTimeout(() => {
    void clearPendingAuth(runtime, serverName, oauthState, pendingAuth.authStorageOptions).catch((error) => {
      console.error(`MCP Auth: Timed-out flow cleanup failed: ${formatTerminalError(error)}`);
    });
  }, MANUAL_AUTH_TIMEOUT_MS);
  cleanupTimer.unref?.();
  state.pendingAuthCleanupTimers.set(key, cleanupTimer);
}
async function clearPendingAuth(runtime, serverName, oauthState, fallbackStorageOptions = {}) {
  const state = getRuntimeState(runtime);
  const key = getPendingAuthKey(serverName, fallbackStorageOptions);
  const pendingAuth = state.pendingAuths.get(key);
  const authStorageOptions = pendingAuth?.authStorageOptions ?? fallbackStorageOptions;
  const pendingState = state.pendingAuthStates.get(key);
  if (oauthState && pendingState && pendingState !== oauthState) return;
  const timer = state.pendingAuthCleanupTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    state.pendingAuthCleanupTimers.delete(key);
  }
  pendingAuth?.authProvider.deactivate();
  state.pendingAuths.delete(key);
  state.pendingAuthStates.delete(key);
  const stateToRelease = pendingState ?? oauthState;
  if (stateToRelease) {
    cancelPendingCallback(stateToRelease);
    const storedState = await getOAuthState(serverName, authStorageOptions);
    if (storedState === stateToRelease) {
      await clearOAuthState(serverName, authStorageOptions);
    }
  }
}
function getSearchParamsFromInput(input) {
  try {
    const url = new URL(input);
    const params = new URLSearchParams(url.search);
    if (url.hash) {
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(hash);
      for (const [key, value] of hashParams) {
        if (!params.has(key)) params.set(key, value);
      }
    }
    return params;
  } catch {
    const query = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
    const params = new URLSearchParams(query.startsWith("#") ? query.slice(1) : query);
    return params.has("code") || params.has("state") || params.has("error") ? params : void 0;
  }
}
function parseAuthorizationRedirectInput(input, expectedState) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Authorization code or redirect URL is required");
  }
  const params = getSearchParamsFromInput(trimmed);
  if (params) {
    const error = params.get("error");
    if (error) {
      const description = params.get("error_description");
      throw new Error(description ? `${error}: ${description}` : error);
    }
    const state = params.get("state");
    if (expectedState && !state) {
      throw new Error("OAuth state missing from redirect URL");
    }
    if (expectedState && state !== expectedState) {
      throw new Error("OAuth state mismatch - potential CSRF attack");
    }
    const code = params.get("code");
    if (code) {
      const iss = params.get("iss");
      return { code, ...iss !== null ? { iss } : {} };
    }
  }
  if (/^[A-Za-z0-9._~+/=-]+$/.test(trimmed)) {
    return { code: trimmed };
  }
  throw new Error("Could not find an OAuth authorization code in the provided input");
}
async function waitForAuthorizationResponse(callbackPromise, authorizationUrl, expectedState, onAuthorizationInput, signal) {
  if (!onAuthorizationInput) {
    return {
      input: await abortable(callbackPromise, signal),
      source: "callback"
    };
  }
  const inputController = new AbortController();
  try {
    const response = await abortable(Promise.race([
      callbackPromise.then((input) => ({ input, source: "callback" })),
      onAuthorizationInput(authorizationUrl, inputController.signal).then((input) => ({
        input,
        source: "manual"
      }))
    ]), signal);
    if (response.source === "callback") return response;
    if (!response.input?.trim()) throw new Error("OAuth authentication cancelled");
    if (!getSearchParamsFromInput(response.input.trim())) {
      throw new Error("Paste the full OAuth callback URL, including its code and state parameters");
    }
    return {
      input: parseAuthorizationRedirectInput(response.input, expectedState),
      source: "manual"
    };
  } finally {
    inputController.abort();
  }
}
async function completeAuthFromInput(serverName, input, options = {}) {
  const runtime = getRuntime(options);
  const runtimeState = getRuntimeState(runtime);
  const fallbackAuthStorageOptions = options.authStorageOptions ?? {};
  const signal = combineAbortSignals(runtime.signal, options.signal);
  throwIfAborted(signal);
  const key = getPendingAuthKey(serverName, fallbackAuthStorageOptions);
  const oauthState = runtimeState.pendingAuthStates.get(key);
  throwIfAborted(signal);
  const parsed = parseAuthorizationRedirectInput(input, oauthState);
  return completeAuth(serverName, parsed, options);
}
async function completeAuth(serverName, authorizationCode, options = {}) {
  const runtime = getRuntime(options);
  const runtimeState = getRuntimeState(runtime);
  const { code, iss } = typeof authorizationCode === "string" ? { code: authorizationCode, iss: void 0 } : authorizationCode;
  const fallbackAuthStorageOptions = options.authStorageOptions ?? {};
  const signal = combineAbortSignals(runtime.signal, options.signal);
  throwIfAborted(signal);
  const key = getPendingAuthKey(serverName, fallbackAuthStorageOptions);
  const pendingAuth = runtimeState.pendingAuths.get(key);
  const authStorageOptions = pendingAuth?.authStorageOptions ?? fallbackAuthStorageOptions;
  if (!pendingAuth) {
    throw new Error(`No pending OAuth flow for server: ${serverName}`);
  }
  const oauthState = runtimeState.pendingAuthStates.get(key);
  throwIfAborted(signal);
  let keepPendingForRetry = false;
  let caughtError;
  try {
    const discoveryState = await pendingAuth.authProvider.discoveryState();
    const metadata = discoveryState?.authorizationServerMetadata;
    const expectedIssuer = metadata?.issuer ?? discoveryState?.authorizationServerUrl;
    const requiresIssuer = metadata?.authorization_response_iss_parameter_supported === true;
    if (expectedIssuer !== void 0 && iss === void 0 && requiresIssuer) {
      keepPendingForRetry = true;
      throw new Error(
        `The authorization server for ${serverName} requires the RFC 9207 "iss" parameter. Paste the full redirect URL from the browser address bar (not just the authorization code).`
      );
    }
    if (expectedIssuer !== void 0 && iss !== void 0 && iss !== expectedIssuer) {
      throw new Error(`The OAuth authorization response issuer does not match the discovered issuer for ${serverName}.`);
    }
    const result = await abortable(runSdkAuth(pendingAuth.authProvider, {
      serverUrl: pendingAuth.serverUrl,
      authorizationCode: code,
      ...iss !== void 0 ? { iss } : {},
      ...pendingAuth.discovery
    }), signal);
    throwIfAborted(signal);
    if (result !== "AUTHORIZED") {
      throw new UnauthorizedError2("Failed to authorize");
    }
    return "authenticated";
  } catch (error) {
    caughtError = error;
    throw error;
  } finally {
    if (!keepPendingForRetry) {
      try {
        await clearPendingAuth(runtime, serverName, oauthState, authStorageOptions);
      } catch (cleanupError) {
        if (caughtError !== void 0) {
          throw new AggregateError([caughtError, cleanupError], "OAuth completion cleanup failed");
        }
        throw cleanupError;
      }
    }
  }
}
async function authenticate(serverName, serverUrl, definition, options = {}) {
  if (isServerDisabled(definition)) throw new Error(`MCP server "${serverName}" is disabled`);
  const runtime = getRuntime(options);
  const runtimeState = getRuntimeState(runtime);
  const authStorageOptions = options.authStorageOptions ?? {};
  const signal = combineAbortSignals(runtime.signal, options.signal);
  throwIfAborted(signal);
  const authKey = `${serverName}|${serverUrl}|${getAuthBaseDir(authStorageOptions)}`;
  const inFlight = runtimeState.pendingAuthentications.get(authKey);
  if (inFlight) {
    return inFlight;
  }
  const operation = (async () => {
    const { authorizationUrl } = await startAuth(serverName, serverUrl, definition, {
      ...options,
      ...signal ? { signal } : {},
      runtime
    });
    if (!authorizationUrl) {
      return "authenticated";
    }
    let oauthState;
    try {
      oauthState = runtimeState.pendingAuthStates.get(getPendingAuthKey(serverName, authStorageOptions));
      throwIfAborted(signal);
      if (!oauthState) {
        throw new Error("OAuth state not found - this should not happen");
      }
      const callbackPromise = waitForCallback(oauthState);
      void callbackPromise.catch(() => {
      });
      if (options.onAuthorizationUrl) {
        await abortable(Promise.resolve(options.onAuthorizationUrl(authorizationUrl)), signal);
      } else {
        console.log(`MCP Auth: Open this URL to authenticate ${serverName}:
${authorizationUrl}`);
      }
      try {
        await abortable(open(authorizationUrl), signal);
      } catch (error) {
        if (isAbortError(error, signal)) throw error;
        console.warn(`MCP Auth: Failed to open browser for ${serverName}; waiting for manual callback`, { error });
      }
      const authorizationResponse = await waitForAuthorizationResponse(
        callbackPromise,
        authorizationUrl,
        oauthState,
        options.onAuthorizationInput,
        signal
      );
      if (authorizationResponse.source === "manual") {
        cancelPendingCallback(oauthState);
      }
      throwIfAborted(signal);
      return await completeAuth(serverName, authorizationResponse.input, {
        ...options,
        ...signal ? { signal } : {},
        runtime
      });
    } catch (error) {
      if (oauthState) cancelPendingCallback(oauthState);
      try {
        await clearPendingAuth(runtime, serverName, oauthState, authStorageOptions);
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "OAuth cancellation cleanup failed");
      }
      throw error;
    }
  })();
  runtimeState.pendingAuthentications.set(authKey, operation);
  try {
    return await operation;
  } finally {
    if (runtimeState.pendingAuthentications.get(authKey) === operation) {
      runtimeState.pendingAuthentications.delete(authKey);
    }
  }
}
async function removeAuth(serverName, options = {}) {
  const runtime = getRuntime(options);
  const signal = combineAbortSignals(runtime.signal, options.signal);
  throwIfAborted(signal);
  const authStorageOptions = options.authStorageOptions ?? {};
  const oauthState = await getOAuthState(serverName, authStorageOptions);
  throwIfAborted(signal);
  if (oauthState) {
    cancelPendingCallback(oauthState);
  }
  await clearPendingAuth(runtime, serverName, oauthState, authStorageOptions);
  throwIfAborted(signal);
  clearAllCredentials(serverName, authStorageOptions);
  await clearOAuthState(serverName, authStorageOptions);
  throwIfAborted(signal);
  console.log(`MCP Auth: Removed credentials for ${serverName}`);
}
function supportsOAuth(definition) {
  if (!definition.url) return false;
  if (definition.auth === false) return false;
  if (definition.oauth === false) return false;
  if (definition.auth === "oauth") return true;
  if (definition.headers && Object.keys(definition.headers).length > 0) return false;
  return definition.auth === void 0;
}
async function shutdownOAuth(runtime = legacyRuntime) {
  const state = getRuntimeState(runtime);
  if (state.controller.signal.aborted) return;
  state.generation += 1;
  state.controller.abort(new Error("OAuth runtime stopped"));
  for (const callbackState of Array.from(state.pendingAuthStates.values())) cancelPendingCallback(callbackState);
  for (const pendingAuth of Array.from(state.pendingAuths.values())) {
    await clearPendingAuth(runtime, pendingAuth.serverName, void 0, pendingAuth.authStorageOptions);
  }
  state.pendingAuthentications.clear();
  activeRuntimes.delete(runtime);
  if (activeRuntimes.size === 0) {
    await stopCallbackServer();
  }
}

// lifecycle.ts
init_utils();
var McpLifecycleManager = class {
  constructor(manager, hasPendingAuthForServer = hasPendingAuth) {
    this.manager = manager;
    this.hasPendingAuthForServer = hasPendingAuthForServer;
  }
  manager;
  hasPendingAuthForServer;
  keepAliveServers = /* @__PURE__ */ new Map();
  allServers = /* @__PURE__ */ new Map();
  serverSettings = /* @__PURE__ */ new Map();
  globalIdleTimeout = 10 * 60 * 1e3;
  healthCheckInterval;
  onReconnect;
  onReconnectFailure;
  onIdleShutdown;
  activeHealthCheck;
  shutdownPromise;
  stopped = false;
  removeHealthAbortListener;
  setReconnectCallback(callback) {
    this.onReconnect = callback;
  }
  setReconnectFailureCallback(callback) {
    this.onReconnectFailure = callback;
  }
  markKeepAlive(name, definition) {
    if (isServerDisabled(definition)) return;
    this.keepAliveServers.set(name, definition);
  }
  registerServer(name, definition, settings) {
    if (isServerDisabled(definition)) return;
    this.allServers.set(name, definition);
    if (settings?.idleTimeout !== void 0) this.serverSettings.set(name, settings);
  }
  setGlobalIdleTimeout(minutes) {
    this.globalIdleTimeout = minutes * 60 * 1e3;
  }
  setIdleShutdownCallback(callback) {
    this.onIdleShutdown = callback;
  }
  startHealthChecks(signalOrInterval, maybeIntervalMs = 3e4) {
    const signal = typeof signalOrInterval === "number" ? void 0 : signalOrInterval;
    const intervalMs = typeof signalOrInterval === "number" ? signalOrInterval : maybeIntervalMs;
    this.stopped = false;
    if (signal?.aborted) {
      this.stopped = true;
      return;
    }
    const stop = () => {
      this.stopped = true;
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = void 0;
    };
    signal?.addEventListener("abort", stop, { once: true });
    this.removeHealthAbortListener = () => signal?.removeEventListener("abort", stop);
    this.healthCheckInterval = setInterval(() => {
      if (this.stopped || signal?.aborted || this.activeHealthCheck) return;
      const check = this.checkConnections(signal).catch((error) => {
        console.error(`MCP: Health check failed: ${formatTerminalError(error)}`);
      }).finally(() => {
        if (this.activeHealthCheck === check) this.activeHealthCheck = void 0;
      });
      this.activeHealthCheck = check;
    }, intervalMs);
    this.healthCheckInterval.unref();
  }
  async checkConnections(signal) {
    if (this.stopped || signal?.aborted) return;
    for (const [name, definition] of this.keepAliveServers) {
      if (isServerDisabled(definition)) continue;
      const connection = this.manager.getConnection(name);
      if (!connection || connection.status !== "connected") {
        if (this.hasPendingAuthForServer(name)) {
          logger.debug(`Skipping reconnect for ${name} while OAuth authorization is pending`);
          continue;
        }
        try {
          await this.manager.connect(name, definition, signal);
          if (this.stopped || signal?.aborted) return;
          logger.debug(`Reconnected to ${name}`);
          this.onReconnect?.(name);
        } catch (error) {
          if (this.stopped || signal?.aborted) return;
          this.onReconnectFailure?.(name, error);
          const message = error instanceof Error ? error.message : String(error);
          console.error(`MCP: Failed to reconnect to ${name}: ${sanitizeTerminalText(message)}`);
        }
      }
    }
    for (const [name] of this.allServers) {
      if (this.keepAliveServers.has(name)) continue;
      const timeout = this.getIdleTimeout(name);
      if (timeout > 0 && this.manager.isIdle(name, timeout)) {
        await this.manager.close(name);
        if (this.stopped || signal?.aborted) return;
        this.onIdleShutdown?.(name);
      }
    }
  }
  getIdleTimeout(name) {
    const perServer = this.serverSettings.get(name)?.idleTimeout;
    if (perServer !== void 0) return perServer * 60 * 1e3;
    return this.globalIdleTimeout;
  }
  async gracefulShutdown() {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shutdownPromise = this.shutdownOnce();
    return this.shutdownPromise;
  }
  async shutdownOnce() {
    this.stopped = true;
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = void 0;
    this.removeHealthAbortListener?.();
    this.removeHealthAbortListener = void 0;
    await this.activeHealthCheck;
    this.activeHealthCheck = void 0;
    this.onReconnect = void 0;
    this.onReconnectFailure = void 0;
    this.onIdleShutdown = void 0;
    if (typeof this.manager.closeAll === "function") {
      await this.manager.closeAll();
    }
  }
};

// init.ts
init_metadata_cache();

// server-manager.ts
import { mkdirSync as mkdirSync4 } from "node:fs";
import {
  Client,
  SdkHttpError,
  SSEClientTransport,
  StreamableHTTPClientTransport,
  UnauthorizedError as UnauthorizedError3
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

// unix-socket-transport.ts
import { createConnection } from "node:net";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/client";
var UnixSocketClientTransport = class {
  constructor(socketPath) {
    this.socketPath = socketPath;
  }
  socketPath;
  socket;
  readBuffer = new ReadBuffer();
  onclose;
  onerror;
  onmessage;
  async start() {
    if (this.socket) {
      throw new Error("UnixSocketClientTransport already started");
    }
    await new Promise((resolve6, reject) => {
      const socket = createConnection(this.socketPath);
      this.socket = socket;
      let connected = false;
      socket.once("connect", () => {
        connected = true;
        resolve6();
      });
      socket.on("data", (chunk) => {
        try {
          this.readBuffer.append(chunk);
          while (true) {
            const message = this.readBuffer.readMessage();
            if (message === null) break;
            this.onmessage?.(message);
          }
        } catch (error) {
          const cause = error instanceof Error ? error : new Error(String(error));
          this.onerror?.(cause);
          void this.close();
        }
      });
      socket.on("error", (error) => {
        if (!connected) reject(error);
        this.onerror?.(error);
      });
      socket.on("close", () => {
        if (this.socket === socket) this.socket = void 0;
        this.readBuffer.clear();
        this.onclose?.();
      });
    });
  }
  async close() {
    const socket = this.socket;
    this.socket = void 0;
    this.readBuffer.clear();
    if (!socket || socket.destroyed) return;
    await new Promise((resolve6) => {
      const timeout = setTimeout(() => socket.destroy(), 2e3);
      timeout.unref();
      socket.once("close", () => {
        clearTimeout(timeout);
        resolve6();
      });
      socket.end();
    });
  }
  async send(message) {
    const socket = this.socket;
    if (!socket || socket.destroyed) throw new Error("Unix socket is not connected");
    await new Promise((resolve6, reject) => {
      socket.write(serializeMessage(message), (error) => {
        if (error) reject(error);
        else resolve6();
      });
    });
  }
};

// mcp-probe.ts
var PROBE_TIMEOUT_MS = 5e3;
var MODERN_PROTOCOL_VERSION = "2026-07-28";
var LEGACY_PROTOCOL_VERSION = "2025-06-18";
var JSON_ACCEPT = "application/json, text/event-stream";
var SSE_ACCEPT = "text/event-stream";
var MODERN_FALLBACK_STATUSES = /* @__PURE__ */ new Set([400, 401, 404, 405, 406, 415]);
var POST_ENDPOINT_MISMATCH_STATUSES = /* @__PURE__ */ new Set([404, 405, 406, 415]);
var DISCOVER_REQUEST = {
  jsonrpc: "2.0",
  id: 1,
  method: "server/discover",
  params: {}
};
var INITIALIZE_REQUEST = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: LEGACY_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "pi-mcp-probe", version: "2.1.2" }
  }
};
var MODERN_STRATEGY = {
  kind: "modern",
  request: {
    method: "POST",
    headers: {
      Accept: JSON_ACCEPT,
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": "server/discover"
    },
    body: JSON.stringify(DISCOVER_REQUEST)
  },
  allowJson: true
};
var LEGACY_POST_STRATEGY = {
  kind: "legacy-post",
  request: {
    method: "POST",
    headers: {
      Accept: JSON_ACCEPT,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(INITIALIZE_REQUEST)
  },
  allowJson: true
};
var LEGACY_SSE_STRATEGY = {
  kind: "legacy-sse",
  request: { headers: { Accept: SSE_ACCEPT } },
  allowJson: false
};
function jsonRpcEnvelopeInfo(value) {
  if (typeof value !== "object" || value === null || value.jsonrpc !== "2.0") {
    return null;
  }
  if ("result" in value) {
    const result = value.result;
    return {
      kind: "result",
      protocolVersion: typeof result === "object" && result !== null ? result.protocolVersion : void 0
    };
  }
  if ("error" in value) return { kind: "error" };
  return null;
}
function isBearerChallenge(response) {
  return /(?:^|,)\s*Bearer\b/i.test(response.headers.get("www-authenticate") ?? "");
}
function responseKind(response) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType === "text/html") return "HTML";
  if (contentType) return contentType;
  return "an untyped response";
}
async function getJsonRpcEnvelopeInfo(response) {
  try {
    return jsonRpcEnvelopeInfo(JSON.parse(await response.text()));
  } catch {
    return null;
  }
}
async function classifyResponse(response, strategy) {
  const isSse = response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream");
  if (response.ok && isSse) {
    return { kind: "mcp", result: { isMcp: true, classification: "endpoint responded with an MCP event stream" } };
  }
  const envelope = strategy.allowJson || response.status === 401 ? await getJsonRpcEnvelopeInfo(response) : null;
  if (response.ok && strategy.allowJson && envelope) {
    if (strategy.kind === "modern" && (envelope.kind === "error" || envelope.protocolVersion !== MODERN_PROTOCOL_VERSION)) {
      return { kind: "unsupported-modern" };
    }
    return {
      kind: "mcp",
      result: {
        isMcp: true,
        classification: strategy.kind === "modern" ? `endpoint supports stateless MCP ${MODERN_PROTOCOL_VERSION} server/discover` : "endpoint responded with a JSON-RPC 2.0 envelope"
      }
    };
  }
  if (response.status === 401 && isBearerChallenge(response) && envelope) {
    return {
      kind: "mcp",
      result: {
        isMcp: true,
        classification: strategy.kind === "modern" ? `endpoint requires Bearer authentication during MCP ${MODERN_PROTOCOL_VERSION} server/discover probing` : "endpoint requires Bearer authentication and responded with a JSON-RPC 2.0 error"
      }
    };
  }
  return { kind: "unrecognized" };
}
async function probe(url, strategy) {
  const response = await fetch(url, {
    ...strategy.request,
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
  });
  return { response, outcome: await classifyResponse(response, strategy) };
}
function notMcp(response) {
  return {
    isMcp: false,
    classification: `endpoint returned ${responseKind(response)} (${response.status}) \u2014 this URL does not appear to speak MCP`
  };
}
async function probeMcpEndpoint(url) {
  const { response: modernResponse, outcome: modernOutcome } = await probe(url, MODERN_STRATEGY);
  if (modernOutcome.kind === "mcp") return modernOutcome.result;
  if (modernOutcome.kind !== "unsupported-modern" && !MODERN_FALLBACK_STATUSES.has(modernResponse.status)) {
    return notMcp(modernResponse);
  }
  const { response: postResponse, outcome: postOutcome } = await probe(url, LEGACY_POST_STRATEGY);
  if (postOutcome.kind === "mcp") return postOutcome.result;
  if (!POST_ENDPOINT_MISMATCH_STATUSES.has(postResponse.status)) return notMcp(postResponse);
  const { response: getResponse, outcome: getOutcome } = await probe(url, LEGACY_SSE_STRATEGY);
  return getOutcome.kind === "mcp" ? getOutcome.result : notMcp(getResponse);
}

// server-manager.ts
init_types();

// npx-resolver.ts
init_agent_dir();
import { existsSync as existsSync5, readFileSync as readFileSync6, realpathSync, readdirSync, statSync as statSync2, writeFileSync as writeFileSync3, renameSync as renameSync3, mkdirSync as mkdirSync3, openSync, readSync, closeSync, unlinkSync } from "node:fs";
import { join as join5, dirname as dirname4, extname as extname2, resolve as resolve4, sep as sep2 } from "node:path";
import crossSpawn from "cross-spawn";
var CACHE_VERSION2 = 2;
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var EXACT_PACKAGE_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?(?:\+[0-9A-Za-z][0-9A-Za-z.-]*)?$/;
async function resolveNpxBinary(command, args, signal) {
  throwIfAborted(signal);
  const parsed = command === "npx" ? parseNpxArgs(args) : command === "npm" ? parseNpmExecArgs(args) : null;
  if (!parsed) return null;
  const packageSpec = parsePackageSpec(parsed.packageSpec);
  const cacheKey = JSON.stringify([command, parsed.packageSpec, parsed.binName ?? ""]);
  const cache = loadCache();
  const cached = cache?.entries?.[cacheKey];
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS && existsSync5(cached.resolvedBin) && (!packageSpec?.exactVersion || cached.packageVersion === packageSpec.exactVersion)) {
    return { binPath: cached.resolvedBin, extraArgs: parsed.extraArgs, isJs: cached.isJs };
  }
  const resolved = resolveFromNpmCache(parsed.packageSpec, parsed.binName);
  if (resolved) {
    saveCacheEntry(cacheKey, resolved);
    return { binPath: resolved.resolvedBin, extraArgs: parsed.extraArgs, isJs: resolved.isJs };
  }
  await forceNpxCache(parsed.packageSpec, signal);
  const resolvedAfterInstall = resolveFromNpmCache(parsed.packageSpec, parsed.binName);
  if (resolvedAfterInstall) {
    saveCacheEntry(cacheKey, resolvedAfterInstall);
    return { binPath: resolvedAfterInstall.resolvedBin, extraArgs: parsed.extraArgs, isJs: resolvedAfterInstall.isJs };
  }
  return null;
}
function parseNpxArgs(args) {
  const separatorIndex = args.indexOf("--");
  const before = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
  const after = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : [];
  const positionals = [];
  let packageSpec;
  let sawPackageFlag = false;
  let foundFirstPositional = false;
  for (let i = 0; i < before.length; i++) {
    const arg = before[i];
    if (arg === void 0) return null;
    if (foundFirstPositional) {
      positionals.push(arg);
      continue;
    }
    if (arg === "-y" || arg === "--yes") continue;
    if (arg === "-p" || arg === "--package") {
      const value = before[i + 1];
      if (!value || value.startsWith("-")) return null;
      if (!packageSpec) packageSpec = value;
      sawPackageFlag = true;
      i++;
      continue;
    }
    if (arg.startsWith("--package=")) {
      const value = arg.slice("--package=".length);
      if (!value) return null;
      if (!packageSpec) packageSpec = value;
      sawPackageFlag = true;
      continue;
    }
    if (arg.startsWith("-")) {
      return null;
    }
    positionals.push(arg);
    foundFirstPositional = true;
  }
  const separatedAfter = separatorIndex >= 0 && after.length > 0 ? ["--", ...after] : after;
  if (sawPackageFlag) {
    const binName = positionals[0];
    if (!packageSpec || !binName) return null;
    const extraArgs2 = positionals.slice(1).concat(separatedAfter);
    return { packageSpec, binName, extraArgs: extraArgs2 };
  }
  const packagePositional = positionals[0];
  if (!packagePositional) return null;
  const extraArgs = positionals.slice(1).concat(separatedAfter);
  return { packageSpec: packagePositional, extraArgs };
}
function parseNpmExecArgs(args) {
  if (args[0] !== "exec") return null;
  const execArgs = args.slice(1);
  const separatorIndex = execArgs.indexOf("--");
  if (separatorIndex < 0) return null;
  const before = execArgs.slice(0, separatorIndex);
  const after = execArgs.slice(separatorIndex + 1);
  let packageSpec;
  for (let i = 0; i < before.length; i++) {
    const arg = before[i];
    if (arg === void 0) return null;
    if (arg === "-y" || arg === "--yes") continue;
    if (arg === "--package") {
      const value = before[i + 1];
      if (!value || value.startsWith("-")) return null;
      if (!packageSpec) packageSpec = value;
      i++;
      continue;
    }
    if (arg.startsWith("--package=")) {
      const value = arg.slice("--package=".length);
      if (!value) return null;
      if (!packageSpec) packageSpec = value;
      continue;
    }
    if (arg.startsWith("-")) {
      return null;
    }
  }
  const binName = after[0];
  if (!packageSpec || !binName) return null;
  const extraArgs = after.slice(1);
  return { packageSpec, binName, extraArgs };
}
function resolveFromNpmCache(packageSpec, binName) {
  const cacheDir = getNpmCacheDir();
  if (!cacheDir) return null;
  const parsedSpec = parsePackageSpec(packageSpec);
  if (!parsedSpec) return null;
  const { packageName, exactVersion } = parsedSpec;
  const packageDir = findCachedPackageDir(cacheDir, packageName, exactVersion);
  if (!packageDir) return null;
  const packageJsonPath = join5(packageDir, "package.json");
  if (!existsSync5(packageJsonPath)) return null;
  let pkg = null;
  try {
    pkg = JSON.parse(readFileSync6(packageJsonPath, "utf-8"));
  } catch {
    return null;
  }
  const binField = pkg?.bin;
  if (!binField) return null;
  const candidates = buildBinCandidates(packageName, binName);
  let chosenBinName;
  let binRel;
  if (typeof binField === "string") {
    chosenBinName = defaultBinName(packageName);
    binRel = binField;
  } else {
    for (const candidate of candidates) {
      if (binField[candidate]) {
        chosenBinName = candidate;
        binRel = binField[candidate];
        break;
      }
    }
    if (!binRel) {
      const firstEntry = Object.entries(binField)[0];
      if (firstEntry) {
        chosenBinName = firstEntry[0];
        binRel = firstEntry[1];
      }
    }
  }
  if (!binRel) return null;
  const nodeModulesDir = findNodeModulesDir(packageDir);
  const binLink = chosenBinName ? join5(nodeModulesDir, ".bin", chosenBinName) : null;
  let resolvedBin = binLink && existsSync5(binLink) ? safeRealpath(binLink) : "";
  if (!resolvedBin) {
    resolvedBin = resolve4(packageDir, binRel);
    if (!existsSync5(resolvedBin)) return null;
  }
  const isJs = detectJsBinary(resolvedBin);
  return {
    resolvedBin,
    resolvedAt: Date.now(),
    ...pkg?.version !== void 0 ? { packageVersion: pkg.version } : {},
    isJs
  };
}
var FORCE_CACHE_TIMEOUT_MS = 3e4;
async function forceNpxCache(packageSpec, signal) {
  throwIfAborted(signal);
  try {
    await new Promise((resolve6, reject) => {
      const proc = crossSpawn(
        "npm",
        ["exec", "--yes", "--package", packageSpec, "--", "node", "-e", "1"],
        { stdio: "ignore" }
      );
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error("timeout"));
      }, FORCE_CACHE_TIMEOUT_MS);
      const abort = () => {
        proc.kill();
        reject(signal?.reason instanceof Error ? signal.reason : new Error("MCP request aborted"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      timer.unref();
      proc.on("close", () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        resolve6();
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(err);
      });
    });
  } catch (error) {
    if (signal?.aborted) throwIfAborted(signal);
  }
  throwIfAborted(signal);
}
function buildBinCandidates(packageName, explicitBin) {
  const candidates = [];
  if (explicitBin) candidates.push(explicitBin);
  if (packageName.startsWith("@")) {
    const namePart = packageName.split("/")[1] ?? "";
    const scopePart = packageName.split("/")[0]?.replace("@", "") ?? "";
    if (namePart) candidates.push(namePart);
    if (scopePart && namePart) candidates.push(`${scopePart}-${namePart}`);
  } else {
    candidates.push(packageName);
  }
  return [...new Set(candidates.filter(Boolean))];
}
function parsePackageSpec(spec) {
  const trimmed = spec.trim();
  if (!trimmed) return null;
  let packageName;
  let requestedVersion;
  if (trimmed.startsWith("@")) {
    const slashIndex = trimmed.indexOf("/");
    if (slashIndex < 0) return null;
    const atIndex = trimmed.lastIndexOf("@");
    if (atIndex > slashIndex) {
      packageName = trimmed.slice(0, atIndex);
      requestedVersion = trimmed.slice(atIndex + 1);
    } else {
      packageName = trimmed;
    }
  } else {
    const atIndex = trimmed.indexOf("@");
    if (atIndex >= 0) {
      packageName = trimmed.slice(0, atIndex);
      requestedVersion = trimmed.slice(atIndex + 1);
    } else {
      packageName = trimmed;
    }
  }
  if (!packageName) return null;
  const normalizedVersion = requestedVersion?.replace(/^=/, "").replace(/^v/i, "");
  return {
    packageName,
    ...normalizedVersion && EXACT_PACKAGE_VERSION_RE.test(normalizedVersion) ? { exactVersion: normalizedVersion } : {}
  };
}
function defaultBinName(packageName) {
  if (packageName.startsWith("@")) {
    const parts = packageName.split("/");
    return parts[1] ?? packageName.replace("@", "").replace("/", "-");
  }
  return packageName;
}
function findCachedPackageDir(cacheDir, packageName, exactVersion) {
  const npxDir = join5(cacheDir, "_npx");
  if (!existsSync5(npxDir)) return null;
  const packagePathParts = packageName.startsWith("@") ? packageName.split("/") : [packageName];
  const candidates = readdirSync(npxDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => {
    const full = join5(npxDir, entry.name);
    const mtime = safeStatMtime(full);
    return { name: entry.name, mtime };
  }).sort((a, b) => b.mtime - a.mtime);
  for (const entry of candidates) {
    const pkgDir = join5(npxDir, entry.name, "node_modules", ...packagePathParts);
    const packageJsonPath = join5(pkgDir, "package.json");
    if (!existsSync5(packageJsonPath)) continue;
    if (exactVersion) {
      try {
        const pkg = JSON.parse(readFileSync6(packageJsonPath, "utf-8"));
        if (pkg.version !== exactVersion) continue;
      } catch {
        continue;
      }
    }
    return pkgDir;
  }
  return null;
}
function findNodeModulesDir(packageDir) {
  const parts = packageDir.split(sep2);
  const idx = parts.lastIndexOf("node_modules");
  if (idx >= 0) {
    return parts.slice(0, idx + 1).join(sep2);
  }
  return join5(packageDir, "..");
}
function detectJsBinary(binPath) {
  const ext = extname2(binPath).toLowerCase();
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return true;
  try {
    const fd = openSync(binPath, "r");
    try {
      const buf = Buffer.alloc(256);
      readSync(fd, buf, 0, 256, 0);
      const firstLine = buf.toString("utf-8").split("\n")[0] ?? "";
      return firstLine.startsWith("#!") && firstLine.includes("node");
    } finally {
      closeSync(fd);
    }
  } catch {
    return false;
  }
}
var npmCacheDirCached;
function getNpmCacheDir() {
  if (npmCacheDirCached !== void 0) return npmCacheDirCached;
  if (process.env.NPM_CONFIG_CACHE) {
    npmCacheDirCached = process.env.NPM_CONFIG_CACHE;
    return npmCacheDirCached;
  }
  try {
    const result = crossSpawn.sync("npm", ["config", "get", "cache"], { encoding: "utf-8" });
    if (result.status === 0) {
      const path2 = String(result.stdout).trim();
      npmCacheDirCached = path2 || null;
      return npmCacheDirCached;
    }
  } catch {
    npmCacheDirCached = null;
    return null;
  }
  npmCacheDirCached = null;
  return null;
}
function getNpxCachePath() {
  return getAgentPath("mcp-npx-cache.json");
}
function readNpxCachePayload(cachePath) {
  if (!existsSync5(cachePath)) return null;
  try {
    return JSON.parse(readFileSync6(cachePath, "utf-8"));
  } catch {
    return null;
  }
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function createCacheEntries() {
  return /* @__PURE__ */ Object.create(null);
}
function toNpxCacheEntry(value) {
  const raw = asRecord(value);
  if (!raw) return null;
  if (typeof raw.resolvedBin !== "string") return null;
  if (typeof raw.resolvedAt !== "number" || !Number.isFinite(raw.resolvedAt)) return null;
  if (typeof raw.isJs !== "boolean") return null;
  if (raw.packageVersion !== void 0 && typeof raw.packageVersion !== "string") return null;
  return {
    resolvedBin: raw.resolvedBin,
    resolvedAt: raw.resolvedAt,
    ...raw.packageVersion !== void 0 ? { packageVersion: raw.packageVersion } : {},
    isJs: raw.isJs
  };
}
function toNpxCache(value) {
  const raw = asRecord(value);
  if (!raw || raw.version !== CACHE_VERSION2) return null;
  const rawEntries = asRecord(raw.entries);
  if (!rawEntries) return null;
  const entries = createCacheEntries();
  for (const [key, rawEntry] of Object.entries(rawEntries)) {
    const entry = toNpxCacheEntry(rawEntry);
    if (entry) entries[key] = entry;
  }
  return { version: CACHE_VERSION2, entries };
}
function clearLegacyCache() {
  const cachePath = getNpxCachePath();
  const raw = asRecord(readNpxCachePayload(cachePath));
  if (raw?.version !== 1) return false;
  try {
    unlinkSync(cachePath);
  } catch {
    try {
      writeFileSync3(cachePath, "", "utf-8");
    } catch {
    }
  }
  return true;
}
clearLegacyCache();
function loadCache() {
  if (clearLegacyCache()) return null;
  return toNpxCache(readNpxCachePayload(getNpxCachePath()));
}
function saveCacheEntry(key, entry) {
  try {
    const cachePath = getNpxCachePath();
    const dir = dirname4(cachePath);
    mkdirSync3(dir, { recursive: true });
    const existing = toNpxCache(readNpxCachePayload(cachePath));
    const entries = createCacheEntries();
    if (existing) Object.assign(entries, existing.entries);
    const merged = { version: CACHE_VERSION2, entries };
    merged.entries[key] = entry;
    const tmpPath = `${cachePath}.${process.pid}.tmp`;
    writeFileSync3(tmpPath, JSON.stringify(merged, null, 2), "utf-8");
    renameSync3(tmpPath, cachePath);
  } catch {
  }
}
function safeRealpath(path2) {
  try {
    return realpathSync(path2);
  } catch {
    return "";
  }
}
function safeStatMtime(path2) {
  try {
    return statSync2(path2).mtimeMs;
  } catch {
    return 0;
  }
}

// json-schema-validator.ts
import { Ajv } from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/client/validators/ajv";
var addFormats = addFormatsImport;
var DRAFT_07_SCHEMA_URIS = /* @__PURE__ */ new Set([
  "http://json-schema.org/draft-07/schema",
  "https://json-schema.org/draft-07/schema"
]);
var DRAFT_2020_12_SCHEMA_URIS = /* @__PURE__ */ new Set([
  "https://json-schema.org/draft/2020-12/schema"
]);
function schemaDialect(schema) {
  if (!("$schema" in schema) || typeof schema.$schema !== "string") {
    return { status: "unstamped" };
  }
  return {
    status: "stamped",
    uri: schema.$schema.endsWith("#") ? schema.$schema.slice(0, -1) : schema.$schema
  };
}
function createJsonSchemaValidator() {
  let draft07Validator;
  let draft2020Validator;
  return {
    getValidator(schema) {
      const dialect = schemaDialect(schema);
      if (dialect.status === "unstamped" || DRAFT_2020_12_SCHEMA_URIS.has(dialect.uri)) {
        draft2020Validator ??= (() => {
          const Ajv2020 = Ajv2020Import;
          const ajv = new Ajv2020({ strict: false, allErrors: true });
          addFormats(ajv);
          return new AjvJsonSchemaValidator(ajv);
        })();
        return draft2020Validator.getValidator(schema);
      }
      if (!DRAFT_07_SCHEMA_URIS.has(dialect.uri)) {
        throw new Error(`Unsupported JSON Schema dialect: ${dialect.uri}`);
      }
      draft07Validator ??= (() => {
        const ajv = new Ajv({
          strict: false,
          validateFormats: true,
          validateSchema: false,
          allErrors: true
        });
        addFormats(ajv);
        return new AjvJsonSchemaValidator(ajv);
      })();
      return draft07Validator.getValidator(schema);
    }
  };
}

// sampling-handler.ts
init_utils();
import { complete } from "@earendil-works/pi-ai/compat";
function registerSamplingHandler(client, options) {
  client.setRequestHandler("sampling/createMessage", (request) => {
    return handleSamplingRequest(options, request);
  });
}
async function handleSamplingRequest(options, request) {
  const params = request.params;
  const signal = options.getSignal();
  throwIfAborted(signal);
  if ("task" in params && params.task) {
    throw new Error("MCP sampling tasks are not supported");
  }
  if (params.includeContext && params.includeContext !== "none") {
    throw new Error("MCP sampling context inclusion is not supported");
  }
  if (params.tools?.length) {
    throw new Error("MCP sampling tool use is not supported");
  }
  if (params.toolChoice) {
    throw new Error("MCP sampling tool choice is not supported");
  }
  if (params.stopSequences?.length) {
    throw new Error("MCP sampling stop sequences are not supported");
  }
  const messages = params.messages.map(convertSamplingMessage);
  const { model, apiKey, headers } = await resolveSamplingModel(options, params.modelPreferences);
  throwIfAborted(signal);
  await confirmSampling(
    options,
    "Approve MCP sampling request",
    formatRequestApproval(options.serverName, `${model.provider}/${model.id}`, params.systemPrompt, messages)
  );
  throwIfAborted(signal);
  const result = await complete(
    model,
    {
      ...params.systemPrompt !== void 0 ? { systemPrompt: params.systemPrompt } : {},
      messages
    },
    {
      ...apiKey !== void 0 ? { apiKey } : {},
      ...headers !== void 0 ? { headers } : {},
      maxTokens: params.maxTokens,
      ...params.temperature !== void 0 ? { temperature: params.temperature } : {},
      ...params.metadata !== void 0 ? { metadata: params.metadata } : {},
      ...signal ? { signal } : {}
    }
  );
  const converted = convertAssistantResult(result);
  throwIfAborted(signal);
  await confirmSampling(
    options,
    "Return MCP sampling response",
    formatResponseApproval(options.serverName, converted)
  );
  return converted;
}
function formatRequestApproval(serverName, modelName, systemPrompt, messages) {
  const lines = [`${serverName} wants to sample ${messages.length} message${messages.length === 1 ? "" : "s"} with ${modelName}.`];
  if (systemPrompt) {
    lines.push(`System: ${truncateAtWord(systemPrompt, 400)}`);
  }
  for (const [index, message] of messages.entries()) {
    lines.push(`${index + 1}. ${message.role}: ${truncateAtWord(messageText(message), 400)}`);
  }
  return lines.join("\n\n");
}
function formatResponseApproval(serverName, response) {
  const text = response.content.type === "text" ? response.content.text : `[${response.content.type} content]`;
  return `${serverName} will receive this response from ${response.model}:

${truncateAtWord(text, 1e3)}`;
}
function messageText(message) {
  if (typeof message.content === "string") return message.content;
  return message.content.map((block) => {
    if (block.type === "text") return block.text;
    if (block.type === "image") return `[image: ${block.mimeType}]`;
    if (block.type === "thinking") return "[thinking]";
    if (block.type === "toolCall") return `[tool call: ${block.name}]`;
    return "[content]";
  }).join("\n");
}
async function resolveSamplingModel(options, modelPreferences) {
  const candidates = [];
  const availableModels = options.modelRegistry.getAvailable();
  for (const hint of modelPreferences?.hints ?? []) {
    const normalizedHint = hint.name?.trim().toLowerCase();
    if (!normalizedHint) continue;
    for (const model of availableModels) {
      const searchableNames = [`${model.provider}/${model.id}`, model.id, model.name];
      if (searchableNames.some((name) => name.toLowerCase().includes(normalizedHint))) {
        addSamplingCandidate(candidates, model);
      }
    }
  }
  const currentModel = options.getCurrentModel();
  if (currentModel) addSamplingCandidate(candidates, currentModel);
  for (const model of availableModels) {
    addSamplingCandidate(candidates, model);
  }
  const errors = [];
  const signal = options.getSignal();
  for (const model of candidates) {
    throwIfAborted(signal);
    const auth = await options.modelRegistry.getApiKeyAndHeaders(model);
    throwIfAborted(signal);
    if (auth.ok === false) {
      errors.push(`${model.provider}/${model.id}: ${auth.error}`);
      continue;
    }
    return {
      model,
      ...auth.apiKey !== void 0 ? { apiKey: auth.apiKey } : {},
      ...auth.headers !== void 0 ? { headers: auth.headers } : {}
    };
  }
  if (errors.length > 0) {
    throw new Error(`No configured auth for MCP sampling model. ${errors.join("; ")}`);
  }
  throw new Error("No Pi model is available for MCP sampling");
}
function addSamplingCandidate(candidates, model) {
  if (!candidates.some((candidate) => candidate.provider === model.provider && candidate.id === model.id)) {
    candidates.push(model);
  }
}
async function confirmSampling(options, title, message) {
  if (options.autoApprove) return;
  if (!options.ui) {
    throw new Error("MCP sampling requires interactive approval. Set settings.samplingAutoApprove to true to allow it without UI.");
  }
  const approved = await options.ui.confirm(title, message);
  if (!approved) {
    throw new Error("MCP sampling request was declined");
  }
}
function convertSamplingMessage(message) {
  const blocks = Array.isArray(message.content) ? message.content : [message.content];
  if (message.role === "user") {
    return {
      role: "user",
      content: blocks.map(convertUserContent),
      timestamp: Date.now()
    };
  }
  return {
    role: "assistant",
    content: blocks.map(convertAssistantContent),
    api: "mcp-sampling",
    provider: "mcp",
    model: "sampling-request",
    usage: zeroUsage(),
    stopReason: "stop",
    timestamp: Date.now()
  };
}
function convertUserContent(block) {
  if (block.type === "text") {
    return { type: "text", text: block.text };
  }
  throw new Error(`MCP sampling ${block.type} content is not supported`);
}
function convertAssistantContent(block) {
  if (block.type === "text") {
    return { type: "text", text: block.text };
  }
  throw new Error(`MCP sampling assistant ${block.type} content is not supported`);
}
function convertAssistantResult(message) {
  if (message.stopReason === "error") {
    throw new Error(message.errorMessage ?? "MCP sampling model call failed");
  }
  if (message.stopReason === "aborted") {
    throw new Error(message.errorMessage ?? "MCP sampling model call was aborted");
  }
  const text = message.content.map((block) => {
    if (block.type === "text") return block.text;
    if (block.type === "thinking") return void 0;
    throw new Error(`MCP sampling result ${block.type} content is not supported`);
  }).filter((value) => value !== void 0).join("\n\n").trim();
  if (!text) {
    throw new Error("MCP sampling result did not contain text content");
  }
  return {
    role: "assistant",
    content: { type: "text", text },
    model: `${message.provider}/${message.model}`,
    stopReason: mapStopReason(message.stopReason)
  };
}
function mapStopReason(reason) {
  if (reason === "stop") return "endTurn";
  if (reason === "length") return "maxTokens";
  if (reason === "toolUse") return "toolUse";
  return reason;
}
function zeroUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0
    }
  };
}

// elicitation-handler.ts
import {
  ProtocolError,
  ProtocolErrorCode
} from "@modelcontextprotocol/client";
import { AjvJsonSchemaValidator as AjvJsonSchemaValidator2 } from "@modelcontextprotocol/client/validators/ajv";
import open2 from "open";
function registerElicitationHandler(client, options) {
  client.setRequestHandler("elicitation/create", (request) => handleElicitationRequest(options, request));
}
async function handleElicitationRequest(options, request) {
  return request.params.mode === "url" ? handleUrlElicitation(options, request.params) : handleFormElicitation(options, request.params);
}
async function handleFormElicitation(options, params) {
  const properties = Object.entries(params.requestedSchema.properties);
  const decision = await options.ui.select(
    `MCP Input Request
Server: ${options.serverName}

${params.message}`,
    ["Continue", "Decline"]
  );
  if (decision === void 0) return { action: "cancel" };
  if (decision === "Decline") return { action: "decline" };
  if (properties.length === 0) return { action: "accept", content: {} };
  const values = {};
  for (const [name, schema] of properties) {
    const value = await collectValidField(options.ui, params, name, schema);
    if (value.status === "cancelled") return { action: "cancel" };
    values[name] = value.value;
  }
  while (true) {
    const content = coerceAndValidateFormValues(params, values);
    const action = await options.ui.select(
      formatReview(options.serverName, properties, content),
      ["Submit", "Edit", "Decline"]
    );
    if (action === void 0) return { action: "cancel" };
    if (action === "Decline") return { action: "decline" };
    if (action === "Submit") return { action: "accept", content };
    const labels = properties.map(([name2, schema2]) => `${schema2.title ?? humanizeName(name2)} (${name2})`);
    const selected = await options.ui.select("Choose a field to edit", labels);
    if (selected === void 0) return { action: "cancel" };
    const property = properties[labels.indexOf(selected)];
    if (!property) continue;
    const [name, schema] = property;
    const value = await collectValidField(options.ui, params, name, schema, values[name]);
    if (value.status === "cancelled") return { action: "cancel" };
    values[name] = value.value;
  }
}
async function collectValidField(ui, params, name, schema, current) {
  const required = params.requestedSchema.required?.includes(name) === true;
  while (true) {
    const result = await collectField(ui, params, name, schema, current);
    if (result.status === "cancelled") return result;
    try {
      coerceAndValidateFormValues({
        ...params,
        requestedSchema: {
          type: "object",
          properties: { [name]: schema },
          ...required ? { required: [name] } : {}
        }
      }, { [name]: result.value });
      return result;
    } catch (error) {
      ui.notify(error instanceof Error ? error.message : String(error), "error");
      current = result.value;
    }
  }
}
async function collectField(ui, params, name, schema, current) {
  const required = params.requestedSchema.required?.includes(name) === true;
  const title = [schema.title ?? humanizeName(name), required ? "(required)" : "", schema.description].filter(Boolean).join(" ");
  if (schema.type === "string" && ("enum" in schema || "oneOf" in schema)) {
    const choices = "oneOf" in schema ? schema.oneOf.map((option) => ({ value: option.const, display: formatChoice(option.const, option.title) })) : schema.enum.map((value, index) => ({
      value,
      display: formatChoice(value, "enumNames" in schema ? schema.enumNames?.[index] : void 0)
    }));
    const displays = uniqueLabels(choices.map((choice) => choice.display));
    const actions2 = [...displays];
    const useDefault = schema.default === void 0 ? void 0 : uniqueAction("Use default", actions2);
    if (useDefault) actions2.push(useDefault);
    const omit = required ? void 0 : uniqueAction("Omit", actions2);
    if (omit) actions2.push(omit);
    const action2 = await ui.select(title, actions2);
    if (action2 === void 0) return { status: "cancelled" };
    if (action2 === useDefault) return { status: "collected", value: schema.default };
    if (action2 === omit) return { status: "collected", value: void 0 };
    return { status: "collected", value: choices[displays.indexOf(action2)]?.value };
  }
  if (schema.type === "boolean") {
    const actions2 = ["Yes", "No"];
    if (schema.default !== void 0) actions2.push("Use default");
    if (!required) actions2.push("Omit");
    const action2 = await ui.select(title, actions2);
    if (action2 === void 0) return { status: "cancelled" };
    if (action2 === "Use default") return { status: "collected", value: schema.default };
    if (action2 === "Omit") return { status: "collected", value: void 0 };
    return { status: "collected", value: action2 === "Yes" };
  }
  if (schema.type === "array") {
    const actions2 = ["Choose values"];
    if (schema.default !== void 0) actions2.push("Use default");
    if (!required) actions2.push("Omit");
    const action2 = await ui.select(title, actions2);
    if (action2 === void 0) return { status: "cancelled" };
    if (action2 === "Use default") return { status: "collected", value: schema.default };
    if (action2 === "Omit") return { status: "collected", value: void 0 };
    const choices = extractMultiSelectOptions(schema);
    const selected = new Set(Array.isArray(current) ? current : []);
    while (true) {
      const displays = uniqueLabels(choices.map((choice2) => selected.has(choice2.value) ? `\u2713 ${choice2.display}` : choice2.display));
      const done = uniqueAction("Done", displays);
      const picked = await ui.select(title, [...displays, done]);
      if (picked === void 0) return { status: "cancelled" };
      if (picked === done) return { status: "collected", value: [...selected] };
      const choice = choices[displays.indexOf(picked)];
      if (!choice) continue;
      if (selected.has(choice.value)) selected.delete(choice.value);
      else selected.add(choice.value);
    }
  }
  const actions = ["Enter value"];
  if (schema.default !== void 0) actions.push("Use default");
  if (!required) actions.push("Omit");
  const action = await ui.select(title, actions);
  if (action === void 0) return { status: "cancelled" };
  if (action === "Use default") return { status: "collected", value: schema.default };
  if (action === "Omit") return { status: "collected", value: void 0 };
  const entered = await ui.input(title, current === void 0 ? void 0 : String(current));
  return entered === void 0 ? { status: "cancelled" } : { status: "collected", value: entered };
}
function coerceAndValidateFormValues(params, values) {
  const output = {};
  const required = new Set(params.requestedSchema.required ?? []);
  for (const [name, schema] of Object.entries(params.requestedSchema.properties)) {
    const value = values[name];
    if (value === void 0) {
      if (required.has(name)) throw new Error(`Missing required elicitation field: ${name}`);
      continue;
    }
    if (schema.type === "string") {
      const stringValue = String(value);
      const limits = schema;
      if (limits.minLength !== void 0 && stringValue.length < limits.minLength) {
        throw new Error(`Elicitation field ${name} is shorter than minimum length ${limits.minLength}`);
      }
      if (limits.maxLength !== void 0 && stringValue.length > limits.maxLength) {
        throw new Error(`Elicitation field ${name} is longer than maximum length ${limits.maxLength}`);
      }
      if ("enum" in schema && !schema.enum.includes(stringValue)) {
        throw new Error(`Elicitation field ${name} is not an allowed value`);
      }
      if ("oneOf" in schema && !schema.oneOf.some((option) => option.const === stringValue)) {
        throw new Error(`Elicitation field ${name} is not an allowed value`);
      }
      output[name] = stringValue;
      continue;
    }
    if (schema.type === "number" || schema.type === "integer") {
      if (typeof value === "string" && value.trim() === "") {
        throw new Error(`Elicitation field ${name} must be a number`);
      }
      const numberValue = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numberValue)) throw new Error(`Elicitation field ${name} must be a number`);
      if (schema.type === "integer" && !Number.isInteger(numberValue)) {
        throw new Error(`Elicitation field ${name} must be an integer`);
      }
      if (schema.minimum !== void 0 && numberValue < schema.minimum) {
        throw new Error(`Elicitation field ${name} is below minimum ${schema.minimum}`);
      }
      if (schema.maximum !== void 0 && numberValue > schema.maximum) {
        throw new Error(`Elicitation field ${name} is above maximum ${schema.maximum}`);
      }
      output[name] = numberValue;
      continue;
    }
    if (schema.type === "boolean") {
      output[name] = typeof value === "boolean" ? value : value === "true";
      continue;
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) throw new Error(`Elicitation field ${name} must be a list`);
      const allowed = new Set(extractMultiSelectOptions(schema).map((option) => option.value));
      const arrayValue = value.map(String);
      if (schema.minItems !== void 0 && arrayValue.length < schema.minItems) {
        throw new Error(`Elicitation field ${name} has fewer than ${schema.minItems} selections`);
      }
      if (schema.maxItems !== void 0 && arrayValue.length > schema.maxItems) {
        throw new Error(`Elicitation field ${name} has more than ${schema.maxItems} selections`);
      }
      if (arrayValue.some((item) => !allowed.has(item))) {
        throw new Error(`Elicitation field ${name} contains an invalid selection`);
      }
      output[name] = arrayValue;
    }
  }
  const validation = new AjvJsonSchemaValidator2().getValidator(params.requestedSchema)(output);
  if (!validation.valid) {
    throw new Error(`Invalid elicitation response: ${validation.errorMessage}`);
  }
  return output;
}
function formatChoice(value, title) {
  return title && title !== value ? `${title} (${value})` : value;
}
function uniqueLabels(labels) {
  const used = /* @__PURE__ */ new Set();
  return labels.map((label) => {
    let unique = label;
    while (used.has(unique)) unique += "\u2026";
    used.add(unique);
    return unique;
  });
}
function uniqueAction(label, choices) {
  let unique = label;
  while (choices.includes(unique)) unique += "\u2026";
  return unique;
}
function extractMultiSelectOptions(schema) {
  const items = schema.items;
  return items.anyOf ? items.anyOf.map((option) => ({ value: option.const, display: formatChoice(option.const, option.title) })) : (items.enum ?? []).map((value) => ({ value, display: value }));
}
function formatReview(serverName, properties, content) {
  const rows = properties.map(([name, schema]) => `${schema.title ?? humanizeName(name)}: ${content[name] === void 0 ? "(omitted)" : String(content[name])}`);
  return [`Review input for ${serverName}`, "", ...rows].join("\n");
}
async function handleUrlElicitation(options, params) {
  if (!options.allowUrl) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "URL elicitation is not supported");
  let parsed;
  try {
    parsed = new URL(params.url);
  } catch {
    throw new ProtocolError(ProtocolErrorCode.InvalidParams, "URL elicitation supplied an invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ProtocolError(ProtocolErrorCode.InvalidParams, "URL elicitation only supports HTTP and HTTPS URLs");
  }
  const decision = await options.ui.select([
    "MCP Browser Request",
    `Server: ${options.serverName}`,
    "",
    params.message,
    "",
    `Host: ${parsed.host}`,
    `Full URL: ${params.url}`,
    "",
    "Open this URL in your browser?"
  ].join("\n"), ["Open", "Decline"]);
  if (decision === void 0) return { action: "cancel" };
  if (decision === "Decline") return { action: "decline" };
  try {
    await open2(params.url);
  } catch (error) {
    options.ui.notify(`Could not open MCP elicitation URL: ${error instanceof Error ? error.message : String(error)}`, "error");
    return { action: "cancel" };
  }
  options.onUrlAccepted?.(params.elicitationId);
  options.ui.notify("Opened browser for MCP elicitation.", "info");
  return { action: "accept" };
}
function humanizeName(name) {
  return name.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());
}

// server-manager.ts
init_utils();

// mcp-trace.ts
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { Buffer as Buffer2 } from "node:buffer";
import { dirname as dirname5, isAbsolute as isAbsolute3, resolve as resolve5 } from "node:path";
var MCP_TRACE_SCHEMA_VERSION = 1;
var DEFAULT_MCP_TRACE_MAX_BYTES = 256 * 1024;
var DEFAULT_MCP_TRACE_MAX_EVENTS = 1e4;
function boundedPositiveInteger(value, fallback) {
  if (!Number.isFinite(value) || value === void 0 || value <= 0) return fallback;
  return Math.floor(value);
}
function redactTraceText(value, maxLength = 160) {
  if (/\b(?:token|secret|password|passwd|api[_-]?key|authorization|cookie)\b/i.test(value)) {
    return "[REDACTED]";
  }
  let redacted = value.replace(/\b[a-z][a-z\d+.-]*:\/\/[^\s"'<>]+/gi, "[REDACTED_URL]").replace(/\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi, "[REDACTED_AUTH]").replace(/\b(?:token|secret|password|passwd|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
  if (redacted.length > maxLength) redacted = `${redacted.slice(0, maxLength - 1)}\u2026`;
  return redacted;
}
function messageKind(message) {
  if ("method" in message) return "id" in message ? "request" : "notification";
  return "response";
}
function traceId(value) {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return "[REDACTED_ID]";
  return void 0;
}
function messageBytes(message) {
  try {
    return Buffer2.byteLength(JSON.stringify(message), "utf8");
  } catch {
    return void 0;
  }
}
function createMcpTraceEvent(direction, server2, transport, message, status, options) {
  const kind = messageKind(message);
  const bytes = messageBytes(message);
  const event = {
    version: MCP_TRACE_SCHEMA_VERSION,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    direction,
    server: redactTraceText(server2, 120),
    transport,
    kind,
    status,
    ...bytes !== void 0 ? { bytes } : {}
  };
  if ("method" in message) event.method = redactTraceText(message.method, 120);
  if ("id" in message) event.id = traceId(message.id) ?? null;
  const relatedRequestId = traceId(options?.relatedRequestId);
  if (relatedRequestId !== void 0 && relatedRequestId !== null) event.relatedRequestId = relatedRequestId;
  if ("error" in message && message.error && typeof message.error.code === "number") {
    event.errorCode = message.error.code;
  }
  if (options?.durationMs !== void 0 && Number.isFinite(options.durationMs)) {
    event.durationMs = Math.max(0, Math.round(options.durationMs * 100) / 100);
  }
  return event;
}
var McpTraceWriter = class {
  constructor(options) {
    this.options = options;
    this.maxBytes = boundedPositiveInteger(options.maxBytes, DEFAULT_MCP_TRACE_MAX_BYTES);
    this.maxEvents = boundedPositiveInteger(options.maxEvents, DEFAULT_MCP_TRACE_MAX_EVENTS);
    this.append = options.appendFile ?? (async (path2, data, appendOptions) => {
      await appendFile(path2, data, appendOptions);
    });
    this.resetFile = options.writeFile ?? (async (path2, data, writeOptions) => {
      await writeFile(path2, data, writeOptions);
    });
    this.makeDirectory = options.mkdir ?? (async (path2) => {
      await mkdir(path2, { recursive: true });
      return void 0;
    });
    this.fileReady = this.makeDirectory(dirname5(this.options.filePath), { recursive: true }).then(() => this.resetFile(this.options.filePath, "", { encoding: "utf8" })).catch(() => {
      this.initializationFailed = true;
      this.disabled = true;
    });
  }
  options;
  maxBytes;
  maxEvents;
  append;
  resetFile;
  makeDirectory;
  bytesWritten = 0;
  eventsWritten = 0;
  queue = Promise.resolve();
  disabled = false;
  initializationFailed = false;
  fileReady;
  get filePath() {
    return this.options.filePath;
  }
  get isDisabled() {
    return this.disabled;
  }
  get stats() {
    return { bytes: this.bytesWritten, events: this.eventsWritten };
  }
  write(event) {
    if (this.disabled || this.eventsWritten >= this.maxEvents) return;
    let line;
    try {
      line = `${JSON.stringify(event)}
`;
    } catch {
      this.disabled = true;
      return;
    }
    const bytes = Buffer2.byteLength(line, "utf8");
    if (bytes > this.maxBytes - this.bytesWritten) {
      this.disabled = true;
      return;
    }
    this.bytesWritten += bytes;
    this.eventsWritten += 1;
    this.queue = this.queue.then(async () => {
      await this.fileReady;
      if (this.initializationFailed) return;
      await this.append(this.options.filePath, line, { encoding: "utf8" });
    }).catch(() => {
      this.disabled = true;
    });
  }
  async flush() {
    await this.fileReady;
    await this.queue;
  }
};
function createMcpTraceWriter(sessionCwd, settings = {}, randomSuffix = Math.random().toString(36).slice(2, 10)) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const configuredPath = settings.file;
  const filePath = configuredPath ? isAbsolute3(configuredPath) ? configuredPath : resolve5(sessionCwd ?? process.cwd(), configuredPath) : resolve5(sessionCwd ?? process.cwd(), ".pi", "mcp-traces", `mcp-${timestamp}-${randomSuffix}.jsonl`);
  return new McpTraceWriter({
    filePath,
    ...settings.maxBytes !== void 0 ? { maxBytes: settings.maxBytes } : {},
    ...settings.maxEvents !== void 0 ? { maxEvents: settings.maxEvents } : {}
  });
}
function isMcpTraceEnabled(definition, settings) {
  return definition.trace ?? settings?.enabled === true;
}
function wrapTransportWithMcpTrace(transport, server2, transportKind, observer) {
  let messageHandler = transport.onmessage;
  let tracedMessageHandler;
  const originalSend = transport.send;
  const record = (event) => {
    try {
      observer.record(event);
    } catch {
    }
  };
  try {
    Object.defineProperty(transport, "onmessage", {
      configurable: true,
      enumerable: true,
      get() {
        return tracedMessageHandler;
      },
      set(handler) {
        messageHandler = handler;
        tracedMessageHandler = handler ? ((message, extra) => {
          record(createMcpTraceEvent("inbound", server2, transportKind, message, "received"));
          handler(message, extra);
        }) : void 0;
      }
    });
    transport.onmessage = messageHandler;
  } catch {
  }
  transport.send = async (message, options) => {
    const started = performance.now();
    const messages = Array.isArray(message) ? message : [message];
    try {
      await originalSend.call(transport, message, options);
      for (const item of messages) {
        record(createMcpTraceEvent("outbound", server2, transportKind, item, "sent", {
          durationMs: performance.now() - started
        }));
      }
    } catch (error) {
      for (const item of messages) {
        record(createMcpTraceEvent("outbound", server2, transportKind, item, "error", {
          durationMs: performance.now() - started
        }));
      }
      throw error;
    }
  };
  return transport;
}
function traceTransportKind(definition, transport) {
  if (definition.command) return "stdio";
  if (definition.socket) return "unix-socket";
  const constructorName = transport.constructor?.name.toLowerCase() ?? "";
  if (constructorName.includes("sse")) return "sse";
  if (constructorName.includes("streamable")) return "streamable-http";
  return definition.url ? "streamable-http" : "unknown";
}

// request-headers-command.ts
init_utils();
import { spawn, spawnSync as spawnSync3 } from "node:child_process";
import { randomUUID } from "node:crypto";
var DEFAULT_TIMEOUT_MS = 1e4;
var MAX_OUTPUT_BYTES = 64 * 1024;
var USE_PROCESS_GROUP = process.platform !== "win32";
var CLEANUP_TOKEN_ENV = "PI_MCP_REQUEST_HEADERS_CLEANUP_TOKEN";
function isNoSuchProcessError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH";
}
function runPosixPs(args) {
  if (process.env.PI_MCP_ADAPTER_TEST_FAIL_PS === "1") return { status: 1, stdout: "" };
  return spawnSync3("ps", args, { encoding: "utf8" });
}
function collectPosixDescendantPids(rootPid) {
  const result = runPosixPs(["-axo", "pid=,ppid="]);
  if (result.status !== 0) {
    throw new Error(`HTTP request headers command cleanup failed: ps exited with code ${result.status ?? "unknown"}`);
  }
  const childrenByParent = /* @__PURE__ */ new Map();
  for (const line of result.stdout.split("\n")) {
    const [pidText, ppidText] = line.trim().split(/\s+/, 2);
    const pid = Number(pidText);
    const ppid = Number(ppidText);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    const children = childrenByParent.get(ppid);
    if (children) children.push(pid);
    else childrenByParent.set(ppid, [pid]);
  }
  const descendants = [];
  const stack = [...childrenByParent.get(rootPid) ?? []];
  while (stack.length > 0) {
    const pid = stack.pop();
    descendants.push(pid);
    stack.push(...childrenByParent.get(pid) ?? []);
  }
  return descendants;
}
function collectPosixCleanupTokenPids(cleanupToken) {
  const result = runPosixPs(["axeww", "-o", "pid=,command="]);
  if (result.status !== 0) {
    throw new Error(`HTTP request headers command cleanup failed: ps exited with code ${result.status ?? "unknown"}`);
  }
  const needle = `${CLEANUP_TOKEN_ENV}=${cleanupToken}`;
  const pids = [];
  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.includes(needle)) continue;
    const [pidText] = trimmed.split(/\s+/, 1);
    const pid = Number(pidText);
    if (Number.isInteger(pid) && pid !== process.pid) pids.push(pid);
  }
  return pids;
}
function assertPosixProcessDiscoveryAvailable() {
  collectPosixDescendantPids(process.pid);
  collectPosixCleanupTokenPids(`${process.pid}-preflight`);
}
function isTaskkillNoSuchProcess(result) {
  return `${result.stdout ?? ""}
${result.stderr ?? ""}`.toLowerCase().includes("not found");
}
function signalPid(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (!isNoSuchProcessError(error)) throw error;
  }
}
function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isNoSuchProcessError(error)) throw error;
  }
}
function killRequestHeadersCommand(child, trackedPosixDescendantPids = /* @__PURE__ */ new Set(), cleanupToken) {
  if (process.platform === "win32" && child.pid !== void 0) {
    const result = spawnSync3("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status === 0 || isTaskkillNoSuchProcess(result)) return;
    throw new Error(`HTTP request headers command cleanup failed: taskkill exited with code ${result.status ?? "unknown"}`);
  }
  if (USE_PROCESS_GROUP && child.pid !== void 0) {
    const frozenPids = /* @__PURE__ */ new Set();
    let cleanupError;
    try {
      signalProcessGroup(child.pid, "SIGSTOP");
      for (const pid of trackedPosixDescendantPids) {
        signalPid(pid, "SIGSTOP");
        frozenPids.add(pid);
      }
      let stablePasses = 0;
      for (let pass = 0; pass < 16; pass++) {
        const candidates = [
          ...collectPosixDescendantPids(child.pid),
          ...cleanupToken ? collectPosixCleanupTokenPids(cleanupToken) : []
        ];
        const newPids = candidates.filter((pid) => !frozenPids.has(pid));
        if (newPids.length === 0) {
          stablePasses++;
          if (stablePasses >= 2) return;
          continue;
        }
        stablePasses = 0;
        for (const pid of newPids) {
          signalPid(pid, "SIGSTOP");
          frozenPids.add(pid);
        }
      }
      cleanupError = new Error("HTTP request headers command cleanup failed: descendant process tree did not stabilize");
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    } finally {
      signalProcessGroup(child.pid, "SIGKILL");
      for (const pid of frozenPids) signalPid(pid, "SIGKILL");
    }
    if (cleanupError) throw cleanupError;
    return;
  }
  child.kill("SIGKILL");
}
function resolvedCommand(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("HTTP request headers command must be an object");
  }
  if (typeof config.command !== "string" || config.command.trim() === "") {
    throw new Error("HTTP request headers command requires a non-empty command");
  }
  if (config.args !== void 0 && (!Array.isArray(config.args) || config.args.some((arg) => typeof arg !== "string"))) {
    throw new Error("HTTP request headers command args must be strings");
  }
  if (config.env !== void 0 && (typeof config.env !== "object" || Array.isArray(config.env) || Object.values(config.env).some((value) => typeof value !== "string"))) {
    throw new Error("HTTP request headers command env values must be strings");
  }
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 6e4) {
    throw new Error("HTTP request headers command timeoutMs must be an integer between 1 and 60000");
  }
  return {
    command: interpolateEnvVars(config.command),
    args: (config.args ?? []).map(interpolateEnvVars),
    env: {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(config.env ?? {}).map(([key, value]) => [key, interpolateEnvVars(value)])
      )
    },
    timeoutMs
  };
}
async function invokeRequestHeadersCommand(config, envelope, signal) {
  const resolved = resolvedCommand(config);
  if (USE_PROCESS_GROUP) assertPosixProcessDiscoveryAvailable();
  return new Promise((resolve6, reject) => {
    let stdout = Buffer.alloc(0);
    let settled = false;
    const cleanupToken = randomUUID();
    const child = spawn(resolved.command, resolved.args, {
      env: { ...resolved.env, [CLEANUP_TOKEN_ENV]: cleanupToken },
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
      detached: USE_PROCESS_GROUP
    });
    const trackedPosixDescendantPids = /* @__PURE__ */ new Set();
    let trackingError;
    const trackPosixDescendants = () => {
      if (!USE_PROCESS_GROUP || child.pid === void 0 || settled || trackingError) return;
      try {
        for (const pid of collectPosixDescendantPids(child.pid)) trackedPosixDescendantPids.add(pid);
        for (const pid of collectPosixCleanupTokenPids(cleanupToken)) trackedPosixDescendantPids.add(pid);
      } catch (error) {
        trackingError = error instanceof Error ? error : new Error(String(error));
      }
    };
    const descendantTracker = USE_PROCESS_GROUP ? setInterval(trackPosixDescendants, 50) : void 0;
    descendantTracker?.unref();
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (descendantTracker) clearInterval(descendantTracker);
      signal.removeEventListener("abort", abort);
      if (result.status === "error") reject(result.error);
      else resolve6(result.headers);
    };
    const finishAfterKill = (result) => {
      try {
        killRequestHeadersCommand(child, trackedPosixDescendantPids, cleanupToken);
        finish(result);
      } catch (cleanupError) {
        finish({ status: "error", error: cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)) });
      }
    };
    const failAfterKill = (message) => {
      finishAfterKill({ status: "error", error: trackingError ?? new Error(message) });
    };
    const abort = () => {
      failAfterKill("HTTP request headers command aborted");
    };
    const timer = setTimeout(() => {
      failAfterKill(`HTTP request headers command timed out after ${resolved.timeoutMs}ms`);
    }, resolved.timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    child.on("error", () => finish({ status: "error", error: new Error("HTTP request headers command failed to start") }));
    child.stdout.on("data", (chunk) => {
      if (settled) return;
      stdout = Buffer.concat([stdout, Buffer.from(chunk)]);
      if (stdout.byteLength > MAX_OUTPUT_BYTES) {
        failAfterKill("HTTP request headers command output exceeded 64 KiB");
      }
    });
    child.on("close", (code) => {
      if (settled) return;
      if (trackingError) {
        failAfterKill(trackingError.message);
        return;
      }
      if (code !== 0) {
        failAfterKill(`HTTP request headers command exited with code ${code ?? "unknown"}`);
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout.toString("utf8"));
      } catch {
        finishAfterKill({ status: "error", error: new Error("HTTP request headers command returned invalid JSON") });
        return;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        finishAfterKill({ status: "error", error: new Error("HTTP request headers command must return a JSON object") });
        return;
      }
      const entries = Object.entries(parsed);
      if (entries.some(([, value]) => typeof value !== "string")) {
        finishAfterKill({ status: "error", error: new Error("HTTP request headers command values must be strings") });
        return;
      }
      try {
        finishAfterKill({ status: "success", headers: new Headers(entries) });
      } catch {
        finishAfterKill({ status: "error", error: new Error("HTTP request headers command returned an invalid header") });
      }
    });
    child.stdin.on("error", () => {
    });
    child.stdin.end(JSON.stringify(envelope));
  });
}
function createRequestHeadersCommandFetch(config, delegate = globalThis.fetch) {
  resolvedCommand(config);
  return async (input, init) => {
    const request = new Request(input, init);
    const body = Buffer.from(await request.clone().arrayBuffer());
    const derived = await invokeRequestHeadersCommand(config, {
      version: 1,
      method: request.method.toUpperCase(),
      url: request.url,
      bodyBase64: body.toString("base64")
    }, request.signal);
    const headers = new Headers(request.headers);
    derived.forEach((value, name) => headers.set(name, value));
    return delegate(new URL(request.url), {
      method: request.method,
      headers,
      ...request.method === "GET" || request.method === "HEAD" ? {} : { body },
      signal: request.signal,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy
    });
  };
}

// server-manager.ts
var MAX_CAPTURED_STDERR_BYTES = 8 * 1024;
var MAX_CAPTURED_STDERR_LINES = 3;
var abortCleanupPromises = /* @__PURE__ */ new WeakMap();
function isUnauthorizedHttpError(error) {
  return error instanceof UnauthorizedError3 || error instanceof SdkHttpError && error.status === 401;
}
function shouldFallbackToSse(error, definition) {
  if (definition.protocolVersion === "2026-07-28") return false;
  return error instanceof SdkHttpError && [404, 405, 406, 415].includes(error.status);
}
function resolveVersionNegotiation(definition) {
  switch (definition.protocolVersion) {
    case void 0:
    case "legacy":
      return void 0;
    case "auto":
      return { mode: "auto" };
    case "2026-07-28":
      return { mode: { pin: "2026-07-28" } };
    default:
      throw new Error(`Invalid MCP protocolVersion: ${String(definition.protocolVersion)}`);
  }
}
function boundedStderrChunk(chunk) {
  if (Buffer.isBuffer(chunk)) {
    const start = Math.max(0, chunk.byteLength - MAX_CAPTURED_STDERR_BYTES);
    return Buffer.from(chunk.subarray(start));
  }
  const suffix = chunk.length > MAX_CAPTURED_STDERR_BYTES ? chunk.slice(-MAX_CAPTURED_STDERR_BYTES) : chunk;
  const bytes = Buffer.from(suffix, "utf8");
  return bytes.byteLength > MAX_CAPTURED_STDERR_BYTES ? Buffer.from(bytes.subarray(bytes.byteLength - MAX_CAPTURED_STDERR_BYTES)) : bytes;
}
function appendStderrTail(tail, chunk) {
  const bytes = boundedStderrChunk(chunk);
  if (bytes.length === 0) return tail;
  if (tail.length === 0) return bytes;
  const combined = Buffer.concat([tail, bytes]);
  return combined.length > MAX_CAPTURED_STDERR_BYTES ? Buffer.from(combined.subarray(combined.length - MAX_CAPTURED_STDERR_BYTES)) : combined;
}
var McpServerManager = class {
  /** Default cwd for stdio servers without an explicit config `cwd`. */
  constructor(defaultCwd) {
    this.defaultCwd = defaultCwd;
  }
  defaultCwd;
  connections = /* @__PURE__ */ new Map();
  connectPromises = /* @__PURE__ */ new Map();
  reconnectPromises = /* @__PURE__ */ new Map();
  uiStreamListeners = /* @__PURE__ */ new Map();
  samplingConfig;
  metadataListChangedListener;
  elicitationConfig;
  authStorageOptions = {};
  oauthRuntime;
  acceptedUrlElicitations = /* @__PURE__ */ new Map();
  defaultRequestTimeoutMs;
  runtimeSignal;
  closePromises = /* @__PURE__ */ new Map();
  closeGenerations = /* @__PURE__ */ new Map();
  connectAttempts = /* @__PURE__ */ new Map();
  traceSettings;
  traceWriter;
  stopped = false;
  setSamplingConfig(config) {
    this.samplingConfig = config;
  }
  setMetadataListChangedListener(listener) {
    this.metadataListChangedListener = listener;
  }
  setElicitationConfig(config) {
    this.elicitationConfig = config;
  }
  setRuntimeSignal(signal) {
    this.runtimeSignal = signal;
  }
  setDefaultRequestTimeoutMs(timeoutMs) {
    this.defaultRequestTimeoutMs = normalizeRequestTimeoutMs(timeoutMs);
  }
  setTraceConfig(settings) {
    this.traceSettings = settings;
  }
  setAuthStorageOptions(options) {
    this.authStorageOptions = options;
  }
  setOAuthRuntime(runtime) {
    this.oauthRuntime = runtime;
  }
  getRequestOptions(name, signal) {
    const connection = this.connections.get(name);
    return this.buildRequestOptions(connection?.definition, signal);
  }
  getResolvedRequestTimeoutMs(definition) {
    if (definition?.requestTimeoutMs !== void 0) {
      return normalizeRequestTimeoutMs(definition.requestTimeoutMs);
    }
    return this.defaultRequestTimeoutMs;
  }
  buildRequestOptions(definition, signal) {
    const timeout = this.getResolvedRequestTimeoutMs(definition);
    const ownedSignal = combineAbortSignals(this.runtimeSignal, signal);
    if (!ownedSignal && timeout === void 0) {
      return void 0;
    }
    return {
      ...ownedSignal ? { signal: ownedSignal } : {},
      ...timeout !== void 0 ? { timeout } : {}
    };
  }
  async connect(name, definition, signal) {
    if (isServerDisabled(definition)) throw new Error(`MCP server "${name}" is disabled`);
    if (this.stopped) throw new Error("MCP server manager is closed");
    const ownedSignal = combineAbortSignals(this.runtimeSignal, signal);
    throwIfAborted(ownedSignal);
    const closing = this.closePromises.get(name);
    if (closing) await abortable(closing, ownedSignal);
    throwIfAborted(ownedSignal);
    if (this.connectPromises.has(name)) {
      return abortable(this.connectPromises.get(name), ownedSignal);
    }
    const existing = this.connections.get(name);
    if (existing?.status === "connected") {
      existing.lastUsedAt = Date.now();
      return existing;
    }
    const credentialsInvalidated = existing?.status === "needs-auth" && existing.credentialsInvalidated === true;
    const generation = this.closeGenerations.get(name) ?? 0;
    const attemptController = new AbortController();
    const attemptSignal = combineAbortSignals(ownedSignal, attemptController.signal);
    const connectionAttempt = this.createConnection(name, definition, attemptSignal, ownedSignal, credentialsInvalidated);
    const promise = definition.url ? connectionAttempt.catch(async (error) => {
      throw await this.enrichHttpConnectionError(definition, error);
    }) : connectionAttempt;
    this.connectPromises.set(name, promise);
    this.connectAttempts.set(name, attemptController);
    try {
      const connection = await promise;
      if (attemptController.signal.aborted || (this.closeGenerations.get(name) ?? 0) !== generation) {
        await this.disposeConnection(connection);
        throwIfAborted(attemptSignal);
        throw new Error(`MCP connection for ${name} was closed while connecting`);
      }
      this.connections.set(name, connection);
      return connection;
    } finally {
      if (this.connectPromises.get(name) === promise) this.connectPromises.delete(name);
      if (this.connectAttempts.get(name) === attemptController) this.connectAttempts.delete(name);
    }
  }
  /**
   * Reconnect a server whose connection was proven stale (e.g. by a 404
   * "session no longer exists" response). Single-flight per server name —
   * concurrent callers that raced to the same failure share one reconnect —
   * and identity-guarded: `staleConnection` is only torn down if it is
   * still the manager's current connection for `name`. If a concurrent
   * reconnect (or an unrelated connect()) already replaced it with a fresh
   * connection, that fresh connection is returned untouched.
   */
  async reconnect(name, definition, staleConnection, signal) {
    if (isServerDisabled(definition)) throw new Error(`MCP server "${name}" is disabled`);
    if (this.stopped) throw new Error("MCP server manager is closed");
    const ownedSignal = combineAbortSignals(this.runtimeSignal, signal);
    throwIfAborted(ownedSignal);
    const inFlight = this.reconnectPromises.get(name);
    if (inFlight) {
      return abortable(inFlight, ownedSignal);
    }
    const promise = this.doReconnect(name, definition, staleConnection, ownedSignal).finally(() => {
      if (this.reconnectPromises.get(name) === promise) {
        this.reconnectPromises.delete(name);
      }
    });
    this.reconnectPromises.set(name, promise);
    return abortable(promise, ownedSignal);
  }
  async doReconnect(name, definition, staleConnection, signal) {
    throwIfAborted(signal);
    const current = this.connections.get(name);
    if (current !== staleConnection) {
      return current ?? this.connect(name, definition, signal);
    }
    const staleInFlight = staleConnection.inFlight;
    await this.close(name);
    const fresh = await this.connect(name, definition, signal);
    fresh.inFlight = Math.max(fresh.inFlight, staleInFlight);
    return fresh;
  }
  async createConnection(name, definition, signal, requestSignal, credentialsInvalidated = false) {
    throwIfAborted(signal);
    const tracingEnabled = isMcpTraceEnabled(definition, this.traceSettings);
    const traceWriter = tracingEnabled ? this.traceWriter ??= createMcpTraceWriter(this.defaultCwd, this.traceSettings ?? {}) : void 0;
    const traceObserver = traceWriter ? { record: (event) => traceWriter.write(event) } : void 0;
    let client;
    let transport;
    let clientConnected = false;
    let invalidated = credentialsInvalidated;
    let transportAlreadyTraced = false;
    let stderrTail = Buffer.alloc(0);
    const configuredTransports = [definition.command, definition.url, definition.socket].filter((value) => typeof value === "string" && value.length > 0);
    if (configuredTransports.length !== 1) {
      throw new Error(`Server ${name} must configure exactly one of command, url, or socket`);
    }
    const requestOptions = this.buildRequestOptions(definition, requestSignal);
    if (definition.command) {
      client = this.createClient(name, definition);
      let command = definition.command;
      let args = (definition.args ?? []).map(interpolateEnvVars);
      if (command === "npx" || command === "npm") {
        const resolved = await resolveNpxBinary(command, args, signal);
        if (resolved) {
          command = resolved.isJs ? "node" : resolved.binPath;
          args = resolved.isJs ? [resolved.binPath, ...resolved.extraArgs] : resolved.extraArgs;
          logger.debug(`${name} resolved to ${resolved.binPath} (skipping npm parent)`);
        }
      }
      throwIfAborted(signal);
      if (definition.pluginDataDir) mkdirSync4(definition.pluginDataDir, { recursive: true });
      const cwd = resolveConfigPath(definition.cwd) ?? this.defaultCwd;
      const stdioTransport = new StdioClientTransport({
        command,
        args,
        env: resolveEnv(definition.env, name, definition.literalEnv === true),
        ...cwd !== void 0 ? { cwd } : {},
        stderr: definition.debug ? "inherit" : "pipe"
      });
      if (stdioTransport.stderr) {
        stdioTransport.stderr.on("data", (chunk) => {
          stderrTail = appendStderrTail(stderrTail, chunk);
        });
      }
      transport = stdioTransport;
    } else if (definition.url) {
      const httpConnection = await this.connectHttpClient(
        definition,
        name,
        requestOptions,
        signal,
        traceObserver,
        invalidated
      );
      client = httpConnection.client;
      transport = httpConnection.transport;
      invalidated = httpConnection.credentialsInvalidated;
      if (httpConnection.status === "needs-auth") {
        return {
          client,
          transport,
          definition,
          tools: [],
          resources: [],
          prompts: [],
          lastUsedAt: Date.now(),
          inFlight: 0,
          status: "needs-auth",
          credentialsInvalidated: invalidated
        };
      }
      clientConnected = true;
      transportAlreadyTraced = traceObserver !== void 0;
    } else {
      client = this.createClient(name, definition);
      transport = new UnixSocketClientTransport(resolveConfigPath(definition.socket));
    }
    if (traceObserver && !transportAlreadyTraced) {
      const traceTransportKindValue = traceTransportKind(definition, transport);
      transport = wrapTransportWithMcpTrace(transport, name, traceTransportKindValue, traceObserver);
    }
    try {
      throwIfAborted(signal);
      if (!clientConnected) {
        await this.connectClientWithAbort(client, transport, requestOptions, signal);
      }
      this.attachAdapterNotificationHandlers(name, client);
      const instructions = client.getInstructions?.();
      const connection = {
        client,
        transport,
        definition,
        tools: [],
        resources: [],
        prompts: [],
        ...instructions !== void 0 ? { instructions } : {},
        lastUsedAt: Date.now(),
        inFlight: 0,
        status: "connected"
      };
      client.onclose = () => {
        if (this.connections.get(name) === connection) {
          connection.status = "closed";
        }
      };
      const [tools, resources, promptResult] = await Promise.all([
        this.fetchAllTools(client, requestOptions),
        this.fetchAllResources(client, requestOptions),
        this.fetchAllPrompts(client, requestOptions)
      ]);
      connection.tools = tools;
      connection.resources = resources;
      connection.prompts = promptResult.prompts;
      connection.promptDiscoveryFailed = promptResult.failed;
      return connection;
    } catch (error) {
      const abortCleanup = abortCleanupPromises.get(transport);
      const abortCleanupFailed = error instanceof AggregateError && error.message === "MCP connection abort cleanup failed";
      const cleanupResults = abortCleanupFailed ? [] : await Promise.allSettled([
        abortCleanup ?? Promise.resolve().then(() => client.close())
      ]);
      const cleanupFailures = cleanupResults.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
      let reportedError = error;
      if (cleanupFailures.length > 0) {
        reportedError = new AggregateError([error, ...cleanupFailures], "MCP connection setup failed");
      }
      if (isUnauthorizedHttpError(error) && supportsOAuth(definition) && cleanupFailures.length === 0) {
        if (!invalidated) {
          invalidateAuthEntryCache(name);
          invalidated = true;
        }
        return {
          client,
          transport,
          definition,
          tools: [],
          resources: [],
          prompts: [],
          lastUsedAt: Date.now(),
          inFlight: 0,
          status: "needs-auth",
          credentialsInvalidated: invalidated
        };
      }
      if (stderrTail.length > 0) {
        const stderrText = stderrTail.toString("utf8").trim();
        const lines = stderrText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length > 0) {
          const baseMessage = reportedError instanceof Error ? reportedError.message : String(reportedError);
          const detail = lines.slice(-MAX_CAPTURED_STDERR_LINES).join(" \u2014 ");
          throw new Error(`${baseMessage} (${detail})`, { cause: reportedError });
        }
      }
      throw reportedError;
    }
  }
  async enrichHttpConnectionError(definition, error) {
    const originalMessage = error instanceof Error ? error.message : String(error);
    try {
      const probe2 = await probeMcpEndpoint(resolveServerUrl(definition));
      return new Error(`${originalMessage} \u2014 probe: ${probe2.classification}`, { cause: error });
    } catch {
      return error instanceof Error ? error : new Error(originalMessage);
    }
  }
  async connectClientWithAbort(client, transport, requestOptions, signal) {
    throwIfAborted(signal);
    let abortCleanup;
    const closeTransport = () => {
      abortCleanup = Promise.resolve().then(() => transport.close());
      abortCleanupPromises.set(transport, abortCleanup);
    };
    signal?.addEventListener("abort", closeTransport, { once: true });
    try {
      await abortable(client.connect(transport, requestOptions), signal);
      await abortCleanup;
    } catch (error) {
      if (abortCleanup) {
        try {
          await abortCleanup;
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "MCP connection abort cleanup failed");
        }
      }
      throw error;
    } finally {
      signal?.removeEventListener("abort", closeTransport);
    }
  }
  buildClientCapabilities() {
    return {
      ...this.samplingConfig ? { sampling: {} } : {},
      ...this.elicitationConfig ? {
        elicitation: {
          form: {},
          ...this.elicitationConfig.allowUrl ? { url: {} } : {}
        }
      } : {}
    };
  }
  createClient(serverName, definition) {
    const capabilities = this.buildClientCapabilities();
    const versionNegotiation = resolveVersionNegotiation(definition);
    let client;
    client = new Client(
      { name: `pi-mcp-${serverName}`, version: "1.0.0" },
      {
        jsonSchemaValidator: createJsonSchemaValidator(),
        ...versionNegotiation ? { versionNegotiation } : {},
        ...Object.keys(capabilities).length > 0 ? { capabilities } : {},
        listChanged: {
          tools: {
            onChanged: (error, tools) => {
              this.handleToolsListChanged(serverName, client, error, tools);
            }
          },
          resources: {
            onChanged: (error, resources) => {
              this.handleResourcesListChanged(serverName, client, error, resources);
            }
          },
          prompts: {
            onChanged: (error, prompts) => {
              this.handlePromptsListChanged(serverName, client, error, prompts);
            }
          }
        }
      }
    );
    if (this.samplingConfig) {
      registerSamplingHandler(client, { ...this.samplingConfig, serverName });
    }
    if (this.elicitationConfig) {
      registerElicitationHandler(client, {
        ...this.elicitationConfig,
        serverName,
        onUrlAccepted: (elicitationId) => this.rememberUrlElicitation(serverName, elicitationId)
      });
      if (this.elicitationConfig.allowUrl) {
        client.setNotificationHandler("notifications/elicitation/complete", (notification) => {
          if (this.runtimeSignal?.aborted) return;
          const accepted = this.acceptedUrlElicitations.get(serverName);
          if (!accepted?.delete(notification.params.elicitationId)) return;
          this.elicitationConfig?.ui.notify(
            `MCP browser interaction for ${serverName} completed. You can retry the tool now.`,
            "info"
          );
        });
      }
    }
    return client;
  }
  handleToolsListChanged(serverName, client, error, tools) {
    if (error) {
      logger.debug(`MCP: tools/list_changed refresh failed for ${serverName}: ${error.message}`);
      return;
    }
    if (!tools) return;
    const connection = this.connections.get(serverName);
    if (!connection || connection.client !== client || connection.status !== "connected") return;
    connection.tools = tools;
    this.metadataListChangedListener?.(serverName, "tools-list-changed");
  }
  handlePromptsListChanged(serverName, client, error, prompts) {
    if (error) {
      logger.debug(`MCP: prompts/list_changed refresh failed for ${serverName}: ${error.message}`);
      return;
    }
    if (!prompts) return;
    const connection = this.connections.get(serverName);
    if (!connection || connection.client !== client || connection.status !== "connected") return;
    connection.prompts = prompts;
    connection.promptDiscoveryFailed = false;
    this.metadataListChangedListener?.(serverName, "prompts-list-changed");
  }
  handleResourcesListChanged(serverName, client, error, resources) {
    if (error) {
      logger.debug(`MCP: resources/list_changed refresh failed for ${serverName}: ${error.message}`);
      return;
    }
    if (!resources) return;
    const connection = this.connections.get(serverName);
    if (!connection || connection.client !== client || connection.status !== "connected") return;
    connection.resources = resources;
    this.metadataListChangedListener?.(serverName, "resources-list-changed");
  }
  async handleUrlElicitationRequired(serverName, error) {
    if (this.runtimeSignal?.aborted || !this.elicitationConfig?.allowUrl) return "cancel";
    for (const params of error.elicitations) {
      const result = await handleUrlElicitation({
        ...this.elicitationConfig,
        serverName,
        onUrlAccepted: (elicitationId) => this.rememberUrlElicitation(serverName, elicitationId)
      }, params);
      if (result.action !== "accept") return result.action;
    }
    return "accept";
  }
  rememberUrlElicitation(serverName, elicitationId) {
    if (this.runtimeSignal?.aborted) return;
    let accepted = this.acceptedUrlElicitations.get(serverName);
    if (!accepted) {
      accepted = /* @__PURE__ */ new Set();
      this.acceptedUrlElicitations.set(serverName, accepted);
    }
    accepted.add(elicitationId);
  }
  async connectHttpClient(definition, serverName, requestOptions, signal, traceObserver, credentialsInvalidated = false) {
    throwIfAborted(signal);
    const serverUrl = resolveServerUrl(definition);
    const url = new URL(serverUrl);
    const hasCommandHeader = Object.values(definition.headers ?? {}).some((value) => value.startsWith("!") && !value.startsWith("!!"));
    const headers = resolveCommandSecretsRecord(
      definition.headers,
      (key) => `MCP server "${serverName}" HTTP header "${key}"`
    ) ?? {};
    const commandBearer = definition.bearerToken?.startsWith("!") && !definition.bearerToken.startsWith("!!") ? definition.bearerToken : void 0;
    if (definition.auth === "bearer") {
      const token = commandBearer ? resolveCommandSecret(commandBearer, `MCP server "${serverName}" HTTP bearer token`) : resolveBearerToken(definition);
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    if (hasCommandHeader || commandBearer) {
      try {
        new Headers(headers);
      } catch {
        throw new Error(`Failed to resolve MCP server "${serverName}" HTTP command secret: command returned an invalid header value`);
      }
    }
    const requestInit = Object.keys(headers).length > 0 ? { headers } : void 0;
    const requestFetch = definition.requestHeadersCommand ? createRequestHeadersCommandFetch(definition.requestHeadersCommand) : void 0;
    const createAuthProvider = () => new McpOAuthProvider(
      serverName,
      serverUrl,
      extractOAuthConfig(definition),
      { onRedirect: async () => {
      } },
      this.authStorageOptions,
      this.oauthRuntime?.signal
    );
    let authState = supportsOAuth(definition) ? definition.auth === void 0 ? { status: "implicit-deferred" } : { status: "explicit", provider: createAuthProvider() } : { status: "disabled" };
    const attempt = async (kind2) => {
      const authProvider = "provider" in authState ? authState.provider : void 0;
      const transportOptions = {
        ...requestInit !== void 0 ? { requestInit } : {},
        ...requestFetch !== void 0 ? { fetch: requestFetch } : {},
        ...authProvider !== void 0 ? { authProvider } : {},
        ...authProvider !== void 0 && definition.oauth !== false && definition.oauth?.skipIssuerMetadataValidation === true ? { skipIssuerMetadataValidation: true } : {}
      };
      const baseTransport = kind2 === "streamable-http" ? new StreamableHTTPClientTransport(url, transportOptions) : new SSEClientTransport(url, transportOptions);
      const transport = traceObserver ? wrapTransportWithMcpTrace(baseTransport, serverName, kind2, traceObserver) : baseTransport;
      const client = this.createClient(serverName, definition);
      try {
        await this.connectClientWithAbort(client, transport, requestOptions, signal);
        return { status: "connected", client, transport };
      } catch (error) {
        const abortCleanupFailed = error instanceof AggregateError && error.message === "MCP connection abort cleanup failed";
        if (!abortCleanupFailed) {
          try {
            await (abortCleanupPromises.get(transport) ?? client.close());
          } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], "MCP HTTP connection cleanup failed");
          }
        }
        return { status: "failed", client, transport, error };
      }
    };
    let kind = definition.httpTransport ?? "streamable-http";
    let invalidated = credentialsInvalidated;
    for (; ; ) {
      const result = await attempt(kind);
      if (result.status === "connected") return { ...result, credentialsInvalidated: invalidated };
      if (result.error instanceof AggregateError && result.error.message === "MCP connection abort cleanup failed") {
        throw result.error;
      }
      if (signal?.aborted) throwIfAborted(signal);
      if (authState.status === "implicit-deferred" && isUnauthorizedHttpError(result.error)) {
        authState = { status: "implicit-challenged", provider: createAuthProvider() };
        continue;
      }
      if (isUnauthorizedHttpError(result.error)) {
        if (supportsOAuth(definition)) {
          if (!invalidated) {
            invalidateAuthEntryCache(serverName);
            invalidated = true;
          }
          return {
            client: result.client,
            transport: result.transport,
            status: "needs-auth",
            credentialsInvalidated: invalidated
          };
        }
        throw result.error;
      }
      if (definition.httpTransport === void 0 && kind === "streamable-http" && shouldFallbackToSse(result.error, definition)) {
        kind = "sse";
        continue;
      }
      throw result.error;
    }
  }
  async fetchAllTools(client, requestOptions) {
    const allTools = [];
    let cursor;
    do {
      const result = await client.listTools(cursor ? { cursor } : void 0, requestOptions);
      allTools.push(...result.tools ?? []);
      cursor = result.nextCursor;
    } while (cursor);
    return allTools;
  }
  async fetchAllPrompts(client, requestOptions) {
    const capabilities = client.getServerCapabilities?.();
    if (!capabilities?.prompts) return { prompts: [], failed: false };
    try {
      const prompts = [];
      let cursor;
      do {
        const result = await client.listPrompts(cursor ? { cursor } : void 0, requestOptions);
        prompts.push(...result.prompts ?? []);
        cursor = result.nextCursor;
      } while (cursor);
      return { prompts, failed: false };
    } catch (error) {
      if (requestOptions?.signal?.aborted) throwIfAborted(requestOptions.signal);
      if (isUnauthorizedHttpError(error)) throw error;
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`MCP: prompts/list failed: ${message}`);
      return { prompts: [], failed: true };
    }
  }
  async fetchAllResources(client, requestOptions) {
    const capabilities = client.getServerCapabilities?.();
    if (!capabilities?.resources) return [];
    try {
      const allResources = [];
      let cursor;
      do {
        const result = await client.listResources(cursor ? { cursor } : void 0, requestOptions);
        allResources.push(...result.resources ?? []);
        cursor = result.nextCursor;
      } while (cursor);
      return allResources;
    } catch (error) {
      if (requestOptions?.signal?.aborted) {
        throwIfAborted(requestOptions.signal);
      }
      if (isUnauthorizedHttpError(error)) throw error;
      return [];
    }
  }
  attachAdapterNotificationHandlers(serverName, client) {
    client.setNotificationHandler(
      SERVER_STREAM_RESULT_PATCH_METHOD,
      { params: serverStreamResultPatchNotificationSchema.shape.params },
      (params) => {
        const listener = this.uiStreamListeners.get(params.streamToken);
        if (!listener) return;
        listener(serverName, params);
      }
    );
  }
  registerUiStreamListener(streamToken, listener) {
    this.uiStreamListeners.set(streamToken, listener);
  }
  removeUiStreamListener(streamToken) {
    this.uiStreamListeners.delete(streamToken);
  }
  async getPrompt(name, promptName, args, signal) {
    const connection = this.connections.get(name);
    if (!connection || connection.status !== "connected") {
      throw new Error(`Server "${name}" is not connected`);
    }
    try {
      this.touch(name);
      this.incrementInFlight(name);
      return await connection.client.getPrompt(
        { name: promptName, ...args ? { arguments: args } : {} },
        this.getRequestOptions(name, signal)
      );
    } finally {
      this.decrementInFlight(name);
      this.touch(name);
    }
  }
  async readResource(name, uri, signal) {
    if (isServerDisabled(this.connections.get(name)?.definition)) {
      throw new Error(`MCP server "${name}" is disabled`);
    }
    const connection = this.connections.get(name);
    if (!connection || connection.status !== "connected") {
      throw new Error(`Server "${name}" is not connected`);
    }
    try {
      this.touch(name);
      this.incrementInFlight(name);
      return await connection.client.readResource({ uri }, this.getRequestOptions(name, signal));
    } finally {
      this.decrementInFlight(name);
      this.touch(name);
    }
  }
  async close(name) {
    this.closeGenerations.set(name, (this.closeGenerations.get(name) ?? 0) + 1);
    this.connectAttempts.get(name)?.abort(new Error(`MCP connection ${name} was closed`));
    const connection = this.connections.get(name);
    if (!connection) {
      const pendingClose = this.closePromises.get(name);
      if (pendingClose) {
        await pendingClose;
        return;
      }
      const pendingConnect = this.connectPromises.get(name);
      if (pendingConnect) {
        try {
          await pendingConnect;
        } catch (error) {
          if (this.containsCleanupFailure(error)) throw error;
        }
      }
      return;
    }
    connection.status = "closed";
    this.connections.delete(name);
    this.acceptedUrlElicitations.delete(name);
    const closing = this.disposeConnection(connection).finally(() => {
      if (this.closePromises.get(name) === closing) this.closePromises.delete(name);
    });
    this.closePromises.set(name, closing);
    return closing;
  }
  async disposeConnection(connection) {
    const results = await Promise.allSettled([
      // Only client.close() is needed; the client owns the transport and will close it internally.
      Promise.resolve().then(() => connection.client.close()),
      this.traceWriter?.flush() ?? Promise.resolve()
    ]);
    const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
    if (failures.length > 0) throw new AggregateError(failures, "MCP connection cleanup failed");
  }
  async closeAll() {
    this.stopped = true;
    const names = /* @__PURE__ */ new Set([...this.connections.keys(), ...this.connectPromises.keys()]);
    for (const name of names) {
      this.closeGenerations.set(name, (this.closeGenerations.get(name) ?? 0) + 1);
      this.connectAttempts.get(name)?.abort(new Error(`MCP connection ${name} was closed`));
    }
    const pendingConnects = [...this.connectPromises.values()];
    const currentNames = [...this.connections.keys()];
    const pendingResults = await Promise.allSettled(pendingConnects);
    const results = await Promise.allSettled(currentNames.map((name) => this.close(name)));
    const lateNames = [...this.connections.keys()];
    const lateResults = await Promise.allSettled(lateNames.map((name) => this.close(name)));
    const failures = [...pendingResults, ...results, ...lateResults].flatMap((result) => result.status === "rejected" ? [result.reason] : []).filter((error) => this.containsCleanupFailure(error));
    this.uiStreamListeners.clear();
    this.acceptedUrlElicitations.clear();
    this.samplingConfig = void 0;
    this.elicitationConfig = void 0;
    await this.traceWriter?.flush();
    if (failures.length > 0) throw new AggregateError(failures, "MCP manager cleanup failed");
  }
  containsCleanupFailure(error) {
    const pending = [error];
    const seen = /* @__PURE__ */ new Set();
    while (pending.length > 0) {
      const current = pending.pop();
      if (!(current instanceof Error) || seen.has(current)) continue;
      seen.add(current);
      if (current instanceof AggregateError) {
        if (/cleanup failed|setup failed/.test(current.message)) return true;
        pending.push(...current.errors);
      }
      if (current.cause !== void 0) pending.push(current.cause);
    }
    return false;
  }
  isConnecting(name) {
    return this.connectPromises.has(name);
  }
  getConnection(name) {
    return this.connections.get(name);
  }
  getAllConnections() {
    return new Map(this.connections);
  }
  touch(name) {
    const connection = this.connections.get(name);
    if (connection) {
      connection.lastUsedAt = Date.now();
    }
  }
  incrementInFlight(name) {
    const connection = this.connections.get(name);
    if (connection) {
      connection.inFlight = (connection.inFlight ?? 0) + 1;
    }
  }
  decrementInFlight(name) {
    const connection = this.connections.get(name);
    if (connection && connection.inFlight) {
      connection.inFlight--;
    }
  }
  isIdle(name, timeoutMs) {
    const connection = this.connections.get(name);
    if (!connection || connection.status !== "connected") return false;
    if (connection.inFlight > 0) return false;
    return Date.now() - connection.lastUsedAt > timeoutMs;
  }
};
function resolveEnv(env, serverName, literalEnv = false) {
  const resolved = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== void 0) resolved[key] = value;
  }
  if (literalEnv) return env ? { ...resolved, ...env } : resolved;
  const overrides = resolveCommandSecretsRecord(
    env,
    (key) => `MCP server "${serverName}" stdio env "${key}"`
  );
  return overrides ? { ...resolved, ...overrides } : resolved;
}
function normalizeRequestTimeoutMs(timeoutMs) {
  return typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : void 0;
}

// tool-metadata.ts
init_ui_app_bridge_helpers();
init_types();
init_resource_tools();
init_utils();
init_ui_tool_visibility();
function buildToolMetadata(tools, resources, definition, serverName, prefix, configuredServers, knownMetadata, includeMissingConfiguredCandidates = false) {
  const metadata = [];
  const failedTools = [];
  const seenNames = /* @__PURE__ */ new Set();
  const effectivePrefix = resolveToolPrefix(definition, prefix);
  const hasToolFilters = Array.isArray(definition.includeTools) && definition.includeTools.length > 0 || Array.isArray(definition.excludeTools) && definition.excludeTools.length > 0;
  const selectorCandidateIndex = hasToolFilters && configuredServers ? (() => {
    const candidates = /* @__PURE__ */ new Set();
    const additionalCandidatesByToolName = /* @__PURE__ */ new Map();
    const evaluatedToolNames = /* @__PURE__ */ new Set();
    const addCandidates = (target, originalName, candidateServerName, candidatePrefix) => {
      for (const candidate of getToolNameCandidates(originalName, candidateServerName, candidatePrefix, false)) target.add(candidate);
    };
    for (const tool of tools) {
      if (!tool?.name) continue;
      evaluatedToolNames.add(tool.name);
      addCandidates(candidates, tool.name, serverName, effectivePrefix);
    }
    if (definition.exposeResources !== false) {
      for (const resource of resources) {
        const baseName = `read_${resourceNameToToolName(resource.name)}`;
        evaluatedToolNames.add(baseName);
        if (resource?.name && resource?.uri) addCandidates(candidates, baseName, serverName, effectivePrefix);
      }
    }
    for (const [otherServerName, otherDefinition] of Object.entries(configuredServers)) {
      if (otherServerName === serverName) continue;
      const otherPrefix = resolveToolPrefix(otherDefinition, prefix);
      const knownTools = knownMetadata?.get(otherServerName);
      if (knownTools) {
        for (const tool of knownTools) {
          candidates.add(tool.name);
          addCandidates(candidates, tool.originalName, otherServerName, otherPrefix);
        }
      } else if (!knownMetadata || includeMissingConfiguredCandidates) {
        for (const toolName of evaluatedToolNames) {
          let additionalCandidates = additionalCandidatesByToolName.get(toolName);
          if (!additionalCandidates) {
            additionalCandidates = /* @__PURE__ */ new Set();
            additionalCandidatesByToolName.set(toolName, additionalCandidates);
          }
          addCandidates(additionalCandidates, toolName, otherServerName, otherPrefix);
          if (includeMissingConfiguredCandidates) {
            for (const candidate of getToolNameCandidates(toolName, otherServerName, otherPrefix, false)) {
              additionalCandidates.add(candidate.replace(/-/g, "_"));
            }
          }
        }
      }
    }
    return createToolSelectorCandidateIndex(candidates, additionalCandidatesByToolName);
  })() : void 0;
  for (const tool of tools) {
    if (!tool?.name) {
      failedTools.push("(unnamed)");
      continue;
    }
    if (!isToolAllowed(tool.name, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) {
      continue;
    }
    const name = formatToolName(tool.name, serverName, effectivePrefix);
    if (seenNames.has(name)) {
      continue;
    }
    const uiVisibility = extractUiToolVisibility(tool._meta);
    if (!isUiToolVisibleToModel(uiVisibility)) {
      continue;
    }
    seenNames.add(name);
    let uiResourceUri;
    try {
      uiResourceUri = getToolUiResourceUri({ _meta: tool._meta });
    } catch {
      failedTools.push(tool.name);
    }
    const uiStreamMode = extractToolUiStreamMode(tool._meta);
    metadata.push({
      name,
      originalName: tool.name,
      description: tool.description ?? "",
      ...tool.inputSchema !== void 0 ? { inputSchema: tool.inputSchema } : {},
      ...uiResourceUri !== void 0 ? { uiResourceUri } : {},
      ...uiVisibility !== void 0 ? { uiVisibility } : {},
      ...uiStreamMode !== void 0 ? { uiStreamMode } : {}
    });
  }
  if (definition.exposeResources !== false) {
    for (const resource of resources) {
      const baseName = `read_${resourceNameToToolName(resource.name)}`;
      if (!isToolAllowed(baseName, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) {
        continue;
      }
      const name = formatToolName(baseName, serverName, effectivePrefix);
      if (seenNames.has(name)) {
        continue;
      }
      seenNames.add(name);
      metadata.push({
        name,
        originalName: baseName,
        description: resource.description ?? `Read resource: ${resource.uri}`,
        resourceUri: resource.uri
      });
    }
  }
  return { metadata, failedTools };
}
function getToolNames(state, serverName) {
  return state.toolMetadata.get(serverName)?.map((m) => m.name) ?? [];
}
function totalToolCount(state) {
  let count = 0;
  for (const metadata of state.toolMetadata.values()) {
    count += metadata.length;
  }
  return count;
}
function findToolByName(metadata, toolName) {
  if (!metadata) return void 0;
  const exact = metadata.find((m) => m.name === toolName);
  if (exact) return exact;
  const normalized = toolName.replace(/-/g, "_");
  return metadata.find((m) => m.name.replace(/-/g, "_") === normalized);
}
function formatSchema(schema, indent = "  ") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return `${indent}(no schema)`;
  }
  const s = schema;
  if (s.type === "object" && s.properties && typeof s.properties === "object" && !Array.isArray(s.properties)) {
    const props = s.properties;
    const required = Array.isArray(s.required) ? s.required.filter((name) => typeof name === "string") : [];
    if (Object.keys(props).length === 0) {
      return `${indent}(no parameters)`;
    }
    const lines2 = [];
    for (const [name, propSchema] of Object.entries(props)) {
      lines2.push(...formatProperty(name, propSchema, required.includes(name), indent));
    }
    return lines2.join("\n");
  }
  const lines = formatNestedSchema(s, indent);
  if (lines.length > 0) {
    return lines.join("\n");
  }
  const typeStr = formatType(s);
  if (typeStr) {
    return `${indent}(${typeStr})`;
  }
  return `${indent}(complex schema)`;
}
function formatProperty(name, schema, required, indent) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return [`${indent}${name}${required ? " *required*" : ""}`];
  }
  const s = schema;
  const parts = [`${indent}${name}`];
  const typeStr = formatType(s);
  if (typeStr) parts.push(`(${typeStr})`);
  if (required) parts.push("*required*");
  appendSchemaAnnotations(parts, s);
  return [parts.join(" "), ...formatNestedSchema(s, `${indent}  `)];
}
function formatNestedSchema(schema, indent) {
  const lines = [];
  if (Array.isArray(schema.anyOf)) {
    lines.push(...formatVariants("anyOf", schema.anyOf, indent));
  }
  if (Array.isArray(schema.oneOf)) {
    lines.push(...formatVariants("oneOf", schema.oneOf, indent));
  }
  if (schema.items !== void 0) {
    lines.push(...formatProperty("items", schema.items, false, indent));
  }
  if (schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)) {
    const required = Array.isArray(schema.required) ? schema.required.filter((name) => typeof name === "string") : [];
    for (const [name, propSchema] of Object.entries(schema.properties)) {
      lines.push(...formatProperty(name, propSchema, required.includes(name), indent));
    }
  }
  return lines;
}
function formatVariants(keyword, variants, indent) {
  const lines = [`${indent}${keyword}:`];
  for (const variant of variants) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      lines.push(`${indent}  - ${JSON.stringify(variant)}`);
      continue;
    }
    const s = variant;
    const typeStr = formatType(s) || "schema";
    const parts = [`${indent}  - ${typeStr}`];
    appendSchemaAnnotations(parts, s);
    lines.push(parts.join(" "));
    lines.push(...formatNestedSchema(s, `${indent}    `));
  }
  return lines;
}
function formatType(schema) {
  if (Object.hasOwn(schema, "const")) {
    return `const ${JSON.stringify(schema.const)}`;
  }
  if (Array.isArray(schema.enum)) {
    return `enum: ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`;
  }
  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => String(type)).join(" | ");
  }
  if (schema.type) {
    return String(schema.type);
  }
  if (schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)) {
    return "object";
  }
  if (schema.items !== void 0) {
    return "array";
  }
  return "";
}
function appendSchemaAnnotations(parts, schema) {
  if (schema.description && typeof schema.description === "string") {
    parts.push(`- ${schema.description}`);
  }
  for (const key of ["minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "format", "pattern"]) {
    if (schema[key] !== void 0) {
      parts.push(`[${key}: ${JSON.stringify(schema[key])}]`);
    }
  }
  if (schema.default !== void 0) {
    parts.push(`[default: ${JSON.stringify(schema.default)}]`);
  }
}

// init.ts
init_resource_tools();

// ui-resource-handler.ts
init_ui_app_bridge_helpers();
import { UrlElicitationRequiredError } from "@modelcontextprotocol/client";

// session-recovery.ts
import { ProtocolError as ProtocolError2, SdkHttpError as SdkHttpError2, UnauthorizedError as UnauthorizedError4 } from "@modelcontextprotocol/client";
init_types();
var CONNECTION_CLOSED_PROTOCOL_CODE = -32e3;
var SERVER_NOT_INITIALIZED_MCP_MESSAGES = /* @__PURE__ */ new Set([
  "Server not initialized",
  "Bad Request: Server not initialized"
]);
function isTerminatedSession(err, hadSessionId) {
  if (!hadSessionId) return false;
  if (err instanceof SdkHttpError2) {
    return err.status === 404 || err.status === 400 && /"code"\s*:\s*-32000/.test(err.message) && /"message"\s*:\s*"Bad Request: Server not initialized"/.test(err.message);
  }
  return err instanceof ProtocolError2 && err.code === CONNECTION_CLOSED_PROTOCOL_CODE && SERVER_NOT_INITIALIZED_MCP_MESSAGES.has(err.message);
}
function hasSessionId(connection) {
  const transport = connection.transport;
  return transport?.sessionId != null;
}
var SessionRecoveryAuthRequiredError = class extends Error {
  constructor(serverName, authMessage) {
    super(authMessage ?? `MCP server "${serverName}" requires OAuth authentication after reconnect.`);
    this.serverName = serverName;
    this.authMessage = authMessage;
    this.name = "SessionRecoveryAuthRequiredError";
  }
  serverName;
  authMessage;
};
async function withSessionRecovery(deps, serverName, fn) {
  if (isServerDisabled(deps.config.mcpServers[serverName])) {
    throw new Error(`MCP server "${serverName}" is disabled`);
  }
  const connection = deps.manager.getConnection(serverName);
  if (!connection) {
    throw new Error(`Server "${serverName}" is not connected`);
  }
  const hadSessionId = hasSessionId(connection);
  try {
    return await fn(connection);
  } catch (err) {
    const definition = deps.config.mcpServers[serverName];
    if (definition && supportsOAuth(definition) && (err instanceof UnauthorizedError4 || err instanceof SdkHttpError2 && err.status === 401)) {
      invalidateAuthEntryCache(serverName);
    }
    if (!isTerminatedSession(err, hadSessionId)) {
      throw err;
    }
    if (!definition) {
      throw err;
    }
    throwIfAborted(deps.signal);
    logger.debug(`MCP session for "${serverName}" expired; reconnecting`, {
      server: serverName
    });
    let freshConnection = deps.signal ? await deps.manager.reconnect(serverName, definition, connection, deps.signal) : await deps.manager.reconnect(serverName, definition, connection);
    throwIfAborted(deps.signal);
    if (freshConnection.status === "needs-auth") {
      freshConnection = await deps.onNeedsAuth?.(serverName) ?? freshConnection;
      throwIfAborted(deps.signal);
    }
    if (freshConnection.status === "needs-auth") {
      throw new SessionRecoveryAuthRequiredError(serverName);
    }
    if (freshConnection.status !== "connected") {
      throw err;
    }
    return fn(freshConnection);
  }
}

// ui-resource-handler.ts
init_types();
var UiResourceHandler = class {
  constructor(manager, config = void 0) {
    this.manager = manager;
    this.config = config;
  }
  manager;
  config;
  log = logger.child({ component: "UiResourceHandler" });
  async readUiResource(serverName, uri, options = {}) {
    const log = this.log.child({ server: serverName, uri });
    if (!uri.startsWith("ui://")) {
      throw new ResourceParseError(uri, "URI must start with ui://", { server: serverName });
    }
    log.debug("Fetching UI resource");
    let result;
    try {
      const config = options.config ?? this.config;
      if (config && isServerDisabled(config.mcpServers[serverName])) {
        throw new Error(`MCP server "${serverName}" is disabled`);
      }
      if (config) {
        this.manager.touch(serverName);
        this.manager.incrementInFlight(serverName);
        try {
          result = await withSessionRecovery(
            {
              manager: this.manager,
              config,
              ...options.signal ? { signal: options.signal } : {},
              ...options.onNeedsAuth ? { onNeedsAuth: options.onNeedsAuth } : {}
            },
            serverName,
            (connection) => connection.client.readResource({ uri }, this.manager.getRequestOptions(serverName, options.signal))
          );
        } finally {
          this.manager.decrementInFlight(serverName);
          this.manager.touch(serverName);
        }
      } else {
        result = await this.manager.readResource(serverName, uri, options.signal);
      }
    } catch (error) {
      if (error instanceof UrlElicitationRequiredError || error instanceof SessionRecoveryAuthRequiredError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      log.error("Failed to read resource", error instanceof Error ? error : void 0);
      throw new ResourceFetchError(uri, message, {
        server: serverName,
        ...error instanceof Error ? { cause: error } : {}
      });
    }
    const content = selectContent(result, uri);
    const mimeType = content.mimeType;
    if (mimeType && !isHtmlMimeType(mimeType)) {
      log.warn("Unsupported MIME type", { mimeType });
      throw new ResourceParseError(
        uri,
        `unsupported MIME type "${mimeType}" (expected text/html or ${RESOURCE_MIME_TYPE})`,
        { server: serverName, mimeType }
      );
    }
    const html = toHtml(content);
    if (!html.trim()) {
      log.warn("Resource content is empty");
      throw new ResourceParseError(uri, "content is empty", { server: serverName });
    }
    const contentMeta = extractUiMeta(content._meta);
    const listMeta = extractUiMeta(this.getListResourceMeta(serverName, uri));
    log.debug("Resource loaded successfully", {
      contentLength: html.length,
      hasCsp: !!contentMeta.csp || !!listMeta.csp
    });
    return {
      uri: content.uri ?? uri,
      html,
      mimeType: mimeType ?? RESOURCE_MIME_TYPE,
      meta: {
        ...(contentMeta.csp ?? listMeta.csp) !== void 0 ? { csp: contentMeta.csp ?? listMeta.csp } : {},
        ...(contentMeta.permissions ?? listMeta.permissions) !== void 0 ? { permissions: contentMeta.permissions ?? listMeta.permissions } : {},
        ...(contentMeta.domain ?? listMeta.domain) !== void 0 ? { domain: contentMeta.domain ?? listMeta.domain } : {},
        ...(contentMeta.prefersBorder ?? listMeta.prefersBorder) !== void 0 ? { prefersBorder: contentMeta.prefersBorder ?? listMeta.prefersBorder } : {}
      }
    };
  }
  getListResourceMeta(serverName, uri) {
    const connection = this.manager.getConnection(serverName);
    if (!connection?.resources?.length) return void 0;
    const resource = connection.resources.find((entry) => entry.uri === uri);
    if (!resource || !resource._meta || typeof resource._meta !== "object") return void 0;
    return resource._meta;
  }
};
function selectContent(result, preferredUri) {
  const contents = result.contents ?? [];
  if (contents.length === 0) {
    throw new Error(`No contents returned for UI resource: ${preferredUri}`);
  }
  const byUri = contents.find((content) => content.uri === preferredUri);
  if (byUri) return byUri;
  const byHtmlMime = contents.find(
    (content) => content.mimeType && isHtmlMimeType(content.mimeType)
  );
  if (byHtmlMime) return byHtmlMime;
  const firstContent = contents[0];
  if (!firstContent) {
    throw new Error(`No contents returned for UI resource: ${preferredUri}`);
  }
  return firstContent;
}
function isHtmlMimeType(mimeType) {
  const normalized = mimeType.toLowerCase();
  return normalized.startsWith("text/html") || normalized === RESOURCE_MIME_TYPE.toLowerCase();
}
function toHtml(content) {
  if (typeof content.text === "string") {
    return content.text;
  }
  if (typeof content.blob === "string") {
    return Buffer.from(content.blob, "base64").toString("utf-8");
  }
  throw new Error(`UI resource ${content.uri ?? "(unknown)"} did not include text or blob content`);
}
var OPENAI_CSP_FIELD_MAPPINGS = [
  ["resource_domains", "resourceDomains"],
  ["connect_domains", "connectDomains"],
  ["frame_domains", "frameDomains"]
];
var UI_CSP_DOMAIN_FIELDS = [
  "resourceDomains",
  "connectDomains",
  "frameDomains",
  "baseUriDomains"
];
function extractUiMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  const ui = isRecord2(meta.ui) ? meta.ui : void 0;
  const out = {};
  const openAiCsp = Object.hasOwn(meta, "openai/widgetCSP") ? normalizeOpenAiWidgetCsp(meta["openai/widgetCSP"]) : void 0;
  const hasStandardCsp = !!ui && Object.hasOwn(ui, "csp");
  const standardCspValue = hasStandardCsp ? ui.csp : void 0;
  if (hasStandardCsp && !isRecord2(standardCspValue)) {
    out.csp = {};
  } else {
    const standardCsp = hasStandardCsp ? normalizeUiResourceCsp(standardCspValue) : void 0;
    if (openAiCsp || standardCsp) {
      out.csp = { ...openAiCsp, ...standardCsp };
      if (isRecord2(standardCspValue)) {
        for (const [, standardField] of OPENAI_CSP_FIELD_MAPPINGS) {
          if (Object.hasOwn(standardCspValue, standardField) && !copyStringArray(standardCspValue[standardField])) {
            delete out.csp[standardField];
          }
        }
      }
    }
  }
  if (ui && isRecord2(ui.permissions)) {
    out.permissions = ui.permissions;
  }
  if (ui && typeof ui.domain === "string") {
    out.domain = ui.domain;
  }
  if (ui && typeof ui.prefersBorder === "boolean") {
    out.prefersBorder = ui.prefersBorder;
  }
  return out;
}
function normalizeUiResourceCsp(value) {
  if (!isRecord2(value)) return {};
  const csp = {};
  for (const field of UI_CSP_DOMAIN_FIELDS) {
    const domains = copyStringArray(value[field]);
    if (domains) csp[field] = domains;
  }
  return csp;
}
function normalizeOpenAiWidgetCsp(value) {
  if (!isRecord2(value)) return {};
  const csp = {};
  for (const [sourceField, targetField] of OPENAI_CSP_FIELD_MAPPINGS) {
    const domains = copyStringArray(value[sourceField]);
    if (domains) csp[targetField] = domains;
  }
  return csp;
}
function copyStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? [...value] : void 0;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// init.ts
init_utils();

// mcp-status.ts
init_types();
init_types();
var FAILURE_BACKOFF_MS = 60 * 1e3;
function getActiveFailureAgeSeconds(state, serverName) {
  const failedAt = state.failureTracker.get(serverName);
  if (!failedAt) return void 0;
  const ageMs = Date.now() - failedAt;
  if (ageMs > FAILURE_BACKOFF_MS) return void 0;
  return Math.round(ageMs / 1e3);
}
function createMcpStatusSnapshot(state) {
  const servers = [];
  let totalTools = 0;
  let totalResources = 0;
  let connectedCount = 0;
  let disabledCount = 0;
  for (const name of Object.keys(state.config.mcpServers)) {
    const definition = state.config.mcpServers[name];
    const disabled = definition?.disabled === true;
    const connection = disabled ? void 0 : state.manager.getConnection(name);
    const metadata = disabled ? void 0 : state.toolMetadata.get(name);
    const toolCount = metadata?.length ?? (connection?.status === "connected" ? connection.tools.length : 0);
    const resourceCount = disabled ? void 0 : state.resourceCounts?.get(name) ?? (connection?.status === "connected" ? connection.resources.length : void 0);
    const failedAgoSeconds = disabled ? void 0 : getActiveFailureAgeSeconds(state, name);
    let status = "not-connected";
    if (disabled) {
      status = "disabled";
      disabledCount++;
    } else if (connection?.status === "connected") {
      status = "connected";
      connectedCount++;
    } else if (connection?.status === "needs-auth") {
      status = "needs-auth";
    } else if (failedAgoSeconds !== void 0) {
      status = "failed";
    } else if (metadata !== void 0) {
      status = "cached";
    }
    totalTools += disabled ? 0 : toolCount;
    if (!disabled && resourceCount !== void 0) totalResources += resourceCount;
    servers.push({
      name,
      status,
      toolCount,
      ...resourceCount !== void 0 ? { resourceCount } : {},
      ...status === "failed" && failedAgoSeconds !== void 0 ? { failedAgoSeconds } : {},
      disabled
    });
  }
  return {
    version: MCP_STATUS_SNAPSHOT_VERSION,
    servers,
    totalTools,
    totalResources,
    connectedCount,
    disabledCount
  };
}
function publishMcpStatusSnapshot(state, snapshot) {
  const events = state.statusEvents;
  if (!events) return;
  try {
    events.emit(MCP_STATUS_EVENT, snapshot ?? createMcpStatusSnapshot(state));
  } catch {
  }
}
function publishMcpStatusShutdown(events) {
  if (!events) return;
  try {
    events.emit(MCP_STATUS_EVENT, {
      version: MCP_STATUS_SNAPSHOT_VERSION,
      servers: [],
      totalTools: 0,
      totalResources: 0,
      connectedCount: 0,
      disabledCount: 0
    });
  } catch {
  }
}

// init.ts
var FAILURE_BACKOFF_MS2 = 60 * 1e3;
var MAX_FAILURE_MESSAGE_CHARS = 8 * 1024;
var failureExpiryTimers = /* @__PURE__ */ new WeakMap();
function getFailureExpiryTimers(state) {
  let timers = failureExpiryTimers.get(state);
  if (!timers) {
    timers = /* @__PURE__ */ new Map();
    failureExpiryTimers.set(state, timers);
  }
  return timers;
}
function clearFailure(state, serverName) {
  state.failureTracker.delete(serverName);
  state.failureMessages?.delete(serverName);
  const timers = failureExpiryTimers.get(state);
  const timer = timers?.get(serverName);
  if (timer) clearTimeout(timer);
  timers?.delete(serverName);
}
function recordFailure(state, serverName, message) {
  clearFailure(state, serverName);
  const failedAt = Date.now();
  state.failureTracker.set(serverName, failedAt);
  state.failureMessages?.set(serverName, message.slice(0, MAX_FAILURE_MESSAGE_CHARS));
  const timer = setTimeout(() => {
    if (!state.owner.isActive()) {
      getFailureExpiryTimers(state).delete(serverName);
      return;
    }
    if (state.failureTracker.get(serverName) === failedAt) {
      state.failureTracker.delete(serverName);
      state.failureMessages?.delete(serverName);
      publishMcpStatusSnapshot(state);
    }
    getFailureExpiryTimers(state).delete(serverName);
  }, FAILURE_BACKOFF_MS2);
  timer.unref?.();
  getFailureExpiryTimers(state).set(serverName, timer);
}
async function initializeMcp(pi, ctx, owner = createMcpRuntimeOwner(), options = {}) {
  const configPath = options.config !== void 0 ? void 0 : options.configPath ?? pi.getFlag("mcp-config");
  const cwd = ctx.cwd;
  const hasUI = ctx.hasUI;
  const mode = ctx.mode;
  const rawUi = hasUI ? ctx.ui : void 0;
  const modelRegistry = ctx.modelRegistry;
  const initialSignal = ctx.signal;
  const ui = rawUi ? createOwnedUi(rawUi, owner) : void 0;
  const runtimeSignal = combineAbortSignals(owner.signal, initialSignal);
  const config = options.config !== void 0 ? cloneMcpConfig(options.config) : loadMcpConfig(configPath, cwd);
  const authStorageOptions = getAuthStorageOptions(config.settings?.oauthDir, cwd);
  const ownsOAuthRuntime = options.oauthRuntime === void 0;
  const oauthRuntime = options.oauthRuntime ?? createOAuthRuntime(owner.signal);
  const manager = new McpServerManager(cwd);
  manager.setRuntimeSignal?.(owner.signal);
  manager.setOAuthRuntime?.(oauthRuntime);
  manager.setDefaultRequestTimeoutMs(config.settings?.requestTimeoutMs);
  manager.setTraceConfig?.(config.settings?.trace);
  manager.setAuthStorageOptions(authStorageOptions);
  const samplingAutoApprove = config.settings?.samplingAutoApprove === true;
  if (config.settings?.sampling !== false && (hasUI || samplingAutoApprove)) {
    manager.setSamplingConfig({
      autoApprove: samplingAutoApprove,
      ...ui !== void 0 ? { ui } : {},
      modelRegistry,
      getCurrentModel: () => owner.isActive() ? ctx.model : void 0,
      getSignal: () => owner.isActive() ? combineAbortSignals(owner.signal, ctx.signal) : owner.signal
    });
  }
  const elicitationEnabled = config.settings?.elicitation !== false && hasUI;
  if (elicitationEnabled && ui) {
    manager.setElicitationConfig({
      ui,
      allowUrl: mode === "tui"
    });
  }
  const lifecycle = new McpLifecycleManager(manager, (serverName) => hasPendingAuth(serverName, void 0, oauthRuntime));
  const toolMetadata = /* @__PURE__ */ new Map();
  const resourceCounts = /* @__PURE__ */ new Map();
  const promptMetadata = /* @__PURE__ */ new Map();
  const promptMetadataLive = /* @__PURE__ */ new Set();
  const serverInstructions = /* @__PURE__ */ new Map();
  const failureTracker = /* @__PURE__ */ new Map();
  const failureMessages = /* @__PURE__ */ new Map();
  const approvedToolCalls = /* @__PURE__ */ new Map();
  const uiResourceHandler = new UiResourceHandler(manager, config);
  const consentManager = new ConsentManager("once-per-server");
  const state = {
    owner,
    manager,
    lifecycle,
    toolMetadata,
    resourceCounts,
    promptMetadata,
    promptMetadataLive,
    serverInstructions,
    config,
    programmaticConfig: options.config !== void 0,
    oauthRuntime,
    authStorageOptions,
    failureTracker,
    failureMessages,
    approvedToolCalls,
    approvalEvents: pi.events,
    uiResourceHandler,
    consentManager,
    uiServer: null,
    completedUiSessions: [],
    openBrowser: async (url) => {
      owner.throwIfInactive();
      await openUrl(pi, url, process.env.BROWSER, owner.signal);
      owner.throwIfInactive();
    },
    ...ui !== void 0 ? { ui } : {},
    sendMessage: (message, options2) => {
      if (!owner.isActive()) return;
      pi.sendMessage(message, options2);
    },
    ...options.statusEvents !== void 0 ? { statusEvents: options.statusEvents } : {}
  };
  if (ownsOAuthRuntime) owner.addCleanup(() => shutdownOAuth(oauthRuntime));
  manager.setMetadataListChangedListener?.((serverName, reason) => {
    if (!owner.isActive()) return;
    updateServerMetadata(state, serverName);
    updateMetadataCache(state, serverName, { preserveEmptyResources: false });
    notifyToolMetadataUpdated(state, serverName, reason);
    updateStatusBar(state);
  });
  owner.addCleanup(() => lifecycle.gracefulShutdown());
  owner.addCleanup(() => {
    if (state.uiServer) {
      state.uiServer.close("runtime_owner_stopped");
      state.uiServer = null;
    }
  });
  const allServerEntries = Object.entries(config.mcpServers);
  const serverEntries = allServerEntries.filter(([, definition]) => !isServerDisabled(definition));
  if (serverEntries.length === 0) {
    if (allServerEntries.length > 0 && hasUI) {
      ui?.notify(`MCP: All ${allServerEntries.length} server(s) are disabled`, "info");
    }
    publishMcpStatusSnapshot(state);
    return state;
  }
  const idleSetting = typeof config.settings?.idleTimeout === "number" ? config.settings.idleTimeout : 10;
  lifecycle.setGlobalIdleTimeout(idleSetting);
  const cachePath = getMetadataCachePath();
  const cacheFileExists = existsSync6(cachePath);
  let cache = loadMetadataCache();
  let bootstrapAll = false;
  if (!cacheFileExists) {
    bootstrapAll = true;
    saveMetadataCache({ version: 1, servers: {} });
  } else if (!cache) {
    cache = { version: 1, servers: {} };
    saveMetadataCache(cache);
  }
  const prefix = config.settings?.toolPrefix ?? "server";
  for (const [name, definition] of serverEntries) {
    const lifecycleMode = definition.lifecycle ?? "lazy";
    const persistsAfterFirstSpawn = lifecycleMode === "eager" || lifecycleMode === "lazy-keep-alive";
    const idleOverride = definition.idleTimeout ?? (persistsAfterFirstSpawn ? 0 : void 0);
    lifecycle.registerServer(
      name,
      definition,
      idleOverride !== void 0 ? { idleTimeout: idleOverride } : void 0
    );
    if (lifecycleMode === "keep-alive") {
      lifecycle.markKeepAlive(name, definition);
    }
    const cachedEntry = cache?.servers?.[name];
    if (cachedEntry && isServerCacheValid(cachedEntry, definition)) {
      const metadata = reconstructToolMetadata(name, cachedEntry, prefix, definition, config.mcpServers, cache ?? void 0);
      toolMetadata.set(name, metadata);
      if (Array.isArray(cachedEntry.resources)) {
        resourceCounts.set(name, cachedEntry.resources.length);
      }
      if (cachedEntry.prompts?.length) {
        promptMetadata.set(name, reconstructPromptMetadata(name, cachedEntry.prompts ?? [], prefix, definition));
      }
      if (cachedEntry.instructions) {
        serverInstructions.set(name, cachedEntry.instructions);
      }
    }
  }
  const startupServers = bootstrapAll ? serverEntries : serverEntries.filter(([, definition]) => {
    const mode2 = definition.lifecycle ?? "lazy";
    return mode2 === "keep-alive" || mode2 === "eager";
  });
  if (ui && startupServers.length > 0) {
    const status = formatMcpStatus(state.config, `connecting to ${startupServers.length} servers...`);
    ui.setStatus("mcp", status);
  }
  const results = await parallelLimit(startupServers, 10, async ([name, definition]) => {
    try {
      const connection = await manager.connect(name, definition, runtimeSignal);
      if (connection.status === "needs-auth") {
        return { name, definition, connection: null, error: `OAuth authentication required. Run /mcp-auth ${name}.` };
      }
      return { name, definition, connection, error: null };
    } catch (error) {
      if (isAbortError(error, runtimeSignal)) {
        if (owner.signal.aborted) throw error;
        return { name, definition, connection: null, error: null };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { name, definition, connection: null, error: message };
    }
  });
  if (initialSignal?.aborted) return state;
  owner.throwIfInactive();
  const startupKnownMetadata = /* @__PURE__ */ new Map();
  for (const { name, definition, connection } of results) {
    if (!connection) continue;
    const effectivePrefix = resolveToolPrefix(definition, prefix);
    const metadata = [
      ...connection.tools.filter((tool) => tool?.name).map((tool) => ({
        name: formatToolName(tool.name, name, effectivePrefix),
        originalName: tool.name,
        description: tool.description ?? ""
      })),
      ...definition.exposeResources !== false ? connection.resources.filter((resource) => resource?.name && resource?.uri).map((resource) => {
        const originalName = `read_${resourceNameToToolName(resource.name)}`;
        return {
          name: formatToolName(originalName, name, effectivePrefix),
          originalName,
          description: resource.description ?? `Read resource: ${resource.uri}`,
          resourceUri: resource.uri
        };
      }) : []
    ];
    startupKnownMetadata.set(name, metadata);
  }
  for (const { name, definition, connection, error } of results) {
    owner.throwIfInactive();
    if (error || !connection) {
      if (initialSignal?.aborted) continue;
      if (error) recordFailure(state, name, error);
      const displayError = sanitizeTerminalText(error ?? "Unknown connection failure");
      if (ui) {
        ui.notify(`MCP: Failed to connect to ${name}: ${displayError}`, "error");
      }
      console.error(`MCP: Failed to connect to ${name}: ${displayError}`);
      continue;
    }
    const { metadata, failedTools } = buildToolMetadata(connection.tools, connection.resources, definition, name, prefix, config.mcpServers, startupKnownMetadata, true);
    toolMetadata.set(name, metadata);
    resourceCounts.set(name, connection.resources.length);
    if (!connection.promptDiscoveryFailed) {
      promptMetadata.set(name, reconstructPromptMetadata(name, connection.prompts ?? [], prefix, definition));
      promptMetadataLive.add(name);
    }
    if (connection.instructions) {
      serverInstructions.set(name, connection.instructions);
    } else {
      serverInstructions.delete(name);
    }
    updateMetadataCache(state, name);
    notifyToolMetadataUpdated(state, name, "startup");
    markKeepAliveAfterConnect(state, name);
    if (failedTools.length > 0 && ui) {
      ui.notify(
        `MCP: ${name} - ${failedTools.length} tools skipped`,
        "warning"
      );
    }
  }
  const connectedCount = results.filter((r) => r.connection).length;
  const failedCount = results.filter((r) => r.error).length;
  if (ui && connectedCount > 0 && config.settings?.notifyOnStartupConnect !== false) {
    const totalTools = totalToolCount(state);
    const msg = failedCount > 0 ? `MCP: ${connectedCount}/${startupServers.length} servers connected (${totalTools} tools)` : `MCP: ${connectedCount} servers connected (${totalTools} tools)`;
    ui.notify(msg, "info");
  }
  const envDirect = process.env.MCP_DIRECT_TOOLS;
  if (envDirect !== "__none__") {
    const currentCache = loadMetadataCache();
    const envDirectToolOverride = envDirect?.split(",").map((selector) => selector.trim()).filter(Boolean);
    const missingCacheServers = getMissingConfiguredDirectToolServers(config, currentCache, envDirectToolOverride);
    if (missingCacheServers.length > 0) {
      const bootstrapResults = await parallelLimit(
        missingCacheServers.filter((name) => !results.some((r) => r.name === name && r.connection)),
        10,
        async (name) => {
          try {
            const definition = config.mcpServers[name];
            if (!definition) throw new Error(`MCP server "${name}" is not configured`);
            const connection = await manager.connect(name, definition, runtimeSignal);
            if (connection.status === "needs-auth") {
              return { name, ok: false };
            }
            updateServerMetadata(state, name);
            updateMetadataCache(state, name);
            notifyToolMetadataUpdated(state, name, "direct-tools-bootstrap");
            markKeepAliveAfterConnect(state, name);
            clearFailure(state, name);
            return { name, ok: true };
          } catch (error) {
            if (isAbortError(error, runtimeSignal)) {
              if (owner.signal.aborted) throw error;
              return { name, ok: false };
            }
            const message = error instanceof Error ? error.message : String(error);
            recordFailure(state, name, message);
            logger.debug(`MCP: direct-tools bootstrap failed for ${name}: ${sanitizeTerminalText(message)}`);
            return { name, ok: false };
          }
        }
      );
      const bootstrapped = bootstrapResults.filter((r) => r.ok).map((r) => r.name);
      owner.throwIfInactive();
      if (bootstrapped.length > 0 && ui) {
        ui.notify(`MCP: direct tools for ${bootstrapped.join(", ")} will be available after restart`, "info");
      }
    }
  }
  lifecycle.setReconnectCallback((serverName) => {
    if (!owner.isActive()) return;
    updateServerMetadata(state, serverName);
    updateMetadataCache(state, serverName);
    notifyToolMetadataUpdated(state, serverName, "lifecycle-reconnect");
    clearFailure(state, serverName);
    updateStatusBar(state);
  });
  lifecycle.setReconnectFailureCallback((serverName, error) => {
    if (!owner.isActive()) return;
    const message = error instanceof Error ? error.message : String(error);
    recordFailure(state, serverName, message);
    updateStatusBar(state);
  });
  lifecycle.setIdleShutdownCallback((serverName) => {
    if (!owner.isActive()) return;
    const idleMinutes = getEffectiveIdleTimeoutMinutes(state, serverName);
    logger.debug(`${serverName} shut down (idle ${idleMinutes}m)`);
    updateStatusBar(state);
  });
  owner.throwIfInactive();
  lifecycle.startHealthChecks(runtimeSignal);
  if (config.settings?.mcpFooterStatus === "off") {
    ui?.setStatus("mcp", void 0);
  }
  publishMcpStatusSnapshot(state);
  return state;
}
function markKeepAliveAfterConnect(state, serverName) {
  const definition = state.config.mcpServers[serverName];
  if (!definition || isServerDisabled(definition)) return;
  if ((definition.lifecycle ?? "lazy") === "lazy-keep-alive") {
    state.lifecycle.markKeepAlive(serverName, definition);
  }
}
function updateServerMetadata(state, serverName) {
  const connection = state.manager.getConnection(serverName);
  if (!connection || connection.status !== "connected") return;
  const definition = state.config.mcpServers[serverName];
  if (!definition) return;
  if (isServerDisabled(definition)) {
    state.toolMetadata.delete(serverName);
    state.resourceCounts?.delete(serverName);
    state.promptMetadata?.delete(serverName);
    state.promptMetadataLive?.delete(serverName);
    state.serverInstructions.delete(serverName);
    return;
  }
  const prefix = state.config.settings?.toolPrefix ?? "server";
  const { metadata } = buildToolMetadata(connection.tools, connection.resources, definition, serverName, prefix, state.config.mcpServers, state.toolMetadata);
  state.toolMetadata.set(serverName, metadata);
  state.resourceCounts?.set(serverName, connection.resources.length);
  if (!connection.promptDiscoveryFailed) {
    state.promptMetadata?.set(serverName, reconstructPromptMetadata(serverName, connection.prompts ?? [], prefix, definition));
    state.promptMetadataLive?.add(serverName);
  }
  if (connection.instructions) {
    state.serverInstructions?.set(serverName, connection.instructions);
  } else {
    state.serverInstructions?.delete(serverName);
  }
}
function updateMetadataCache(state, serverName, options = {}) {
  const connection = state.manager.getConnection(serverName);
  if (!connection || connection.status !== "connected") return;
  const definition = state.config.mcpServers[serverName];
  if (!definition || isServerDisabled(definition)) return;
  const configHash = computeServerHash(definition);
  const existing = loadMetadataCache();
  const existingEntry = existing?.servers?.[serverName];
  const tools = serializeTools(connection.tools);
  let resources = definition.exposeResources === false ? [] : serializeResources(connection.resources);
  const prompts = connection.promptDiscoveryFailed ? existingEntry?.configHash === configHash ? existingEntry.prompts : void 0 : serializePrompts(connection.prompts ?? []);
  if (definition.exposeResources !== false && resources.length === 0 && existingEntry?.resources?.length && existingEntry.configHash === configHash && options.preserveEmptyResources !== false) {
    resources = existingEntry.resources;
  }
  const entry = {
    configHash,
    tools,
    resources,
    ...prompts !== void 0 ? { prompts } : {},
    ...connection.instructions !== void 0 ? { instructions: connection.instructions } : {},
    cachedAt: Date.now()
  };
  saveMetadataCache({ version: 1, servers: { [serverName]: entry } });
}
function notifyToolMetadataUpdated(state, serverName, reason) {
  try {
    const result = state.onToolMetadataUpdated?.(serverName, reason);
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`MCP: metadata update hook failed for ${serverName}: ${message}`);
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`MCP: metadata update hook failed for ${serverName}: ${message}`);
  }
}
function flushMetadataCache(state) {
  for (const [name, connection] of state.manager.getAllConnections()) {
    if (connection.status === "connected") {
      updateMetadataCache(state, name);
    }
  }
}
function updateStatusBar(state) {
  publishMcpStatusSnapshot(state);
  const ui = state.ui;
  if (!ui) return;
  const entries = Object.entries(state.config.mcpServers);
  const disabledCount = entries.filter(([, definition]) => isServerDisabled(definition)).length;
  const enabledCount = entries.length - disabledCount;
  if (entries.length === 0) {
    ui.setStatus("mcp", void 0);
    return;
  }
  const connectedCount = [...state.manager.getAllConnections()].filter(([name, connection]) => {
    const definition = state.config.mcpServers[name];
    return connection.status === "connected" && definition !== void 0 && !isServerDisabled(definition);
  }).length;
  const footerStatus = state.config.settings?.mcpFooterStatus ?? "full";
  if (footerStatus === "off") {
    ui.setStatus("mcp", void 0);
    return;
  }
  let status = footerStatus === "compact" ? `MCP ${connectedCount}/${enabledCount}` : `${enabledCount} ${enabledCount === 1 ? "server" : "servers"} enabled`;
  if (footerStatus === "full") {
    if (connectedCount > 0) status += ` (${connectedCount} connected)`;
    if (disabledCount > 0) status += ` (${disabledCount} disabled)`;
  }
  const formattedStatus = footerStatus === "compact" ? status : formatMcpStatus(state.config, status);
  if (formattedStatus === void 0) {
    ui.setStatus("mcp", void 0);
    return;
  }
  ui.setStatus("mcp", ui.theme ? ui.theme.fg("accent", formattedStatus) : formattedStatus);
}
function getFailureAgeSeconds(state, serverName) {
  const failedAt = state.failureTracker.get(serverName);
  if (!failedAt) return null;
  const ageMs = Date.now() - failedAt;
  if (ageMs > FAILURE_BACKOFF_MS2) return null;
  return Math.round(ageMs / 1e3);
}
function getFailureMessage(state, serverName) {
  if (getFailureAgeSeconds(state, serverName) === null) return null;
  return state.failureMessages?.get(serverName) ?? null;
}
async function lazyConnect(state, serverName, signal) {
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  throwIfAborted(ownedSignal);
  const connection = state.manager.getConnection(serverName);
  if (connection?.status === "needs-auth") {
    return false;
  }
  if (connection?.status === "connected") {
    updateServerMetadata(state, serverName);
    markKeepAliveAfterConnect(state, serverName);
    return true;
  }
  const failedAgo = getFailureAgeSeconds(state, serverName);
  if (failedAgo !== null) return false;
  const definition = state.config.mcpServers[serverName];
  if (!definition || isServerDisabled(definition)) return false;
  try {
    if (state.ui) {
      const status = formatMcpStatus(state.config, `connecting to ${serverName}...`);
      state.ui.setStatus("mcp", status);
    }
    const newConnection = await state.manager.connect(serverName, definition, ownedSignal);
    if (newConnection.status === "needs-auth") {
      return false;
    }
    clearFailure(state, serverName);
    updateServerMetadata(state, serverName);
    updateMetadataCache(state, serverName);
    notifyToolMetadataUpdated(state, serverName, "lazy-connect");
    markKeepAliveAfterConnect(state, serverName);
    updateStatusBar(state);
    return true;
  } catch (error) {
    if (isAbortError(error, ownedSignal)) {
      throwIfAborted(ownedSignal);
    }
    const message = error instanceof Error ? error.message : String(error);
    recordFailure(state, serverName, message);
    logger.debug(`MCP: lazy connect failed for ${serverName}: ${sanitizeTerminalText(message)}`);
    updateStatusBar(state);
    return false;
  }
}
function getEffectiveIdleTimeoutMinutes(state, serverName) {
  const definition = state.config.mcpServers[serverName];
  if (!definition) {
    return typeof state.config.settings?.idleTimeout === "number" ? state.config.settings.idleTimeout : 10;
  }
  if (typeof definition.idleTimeout === "number") return definition.idleTimeout;
  const mode = definition.lifecycle ?? "lazy";
  if (mode === "eager" || mode === "lazy-keep-alive") return 0;
  return typeof state.config.settings?.idleTimeout === "number" ? state.config.settings.idleTimeout : 10;
}

// commands.ts
init_metadata_cache();

// onboarding-state.ts
init_agent_dir();
import { existsSync as existsSync7, mkdirSync as mkdirSync5, readFileSync as readFileSync7, writeFileSync as writeFileSync4, renameSync as renameSync4 } from "node:fs";
import { dirname as dirname6 } from "node:path";
var DEFAULT_STATE = {
  version: 1,
  sharedConfigHintShown: false,
  setupCompleted: false
};
function getOnboardingStatePath() {
  return getAgentPath("mcp-onboarding.json");
}
function loadOnboardingState() {
  const path2 = getOnboardingStatePath();
  if (!existsSync7(path2)) return { ...DEFAULT_STATE };
  try {
    const raw = JSON.parse(readFileSync7(path2, "utf-8"));
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
    return {
      version: 1,
      sharedConfigHintShown: raw.sharedConfigHintShown === true,
      setupCompleted: raw.setupCompleted === true,
      ...typeof raw.lastDiscoveryFingerprint === "string" ? { lastDiscoveryFingerprint: raw.lastDiscoveryFingerprint } : {}
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function saveOnboardingState(state) {
  const path2 = getOnboardingStatePath();
  mkdirSync5(dirname6(path2), { recursive: true });
  const tmpPath = `${path2}.${process.pid}.tmp`;
  writeFileSync4(tmpPath, `${JSON.stringify(state, null, 2)}
`, "utf-8");
  renameSync4(tmpPath, path2);
}
function updateOnboardingState(updater) {
  const next = updater(loadOnboardingState());
  saveOnboardingState(next);
  return next;
}
function markSharedConfigHintShown(fingerprint) {
  return updateOnboardingState((state) => {
    const lastDiscoveryFingerprint = fingerprint ?? state.lastDiscoveryFingerprint;
    return {
      ...state,
      sharedConfigHintShown: true,
      ...lastDiscoveryFingerprint !== void 0 ? { lastDiscoveryFingerprint } : {}
    };
  });
}
function markSetupCompleted(fingerprint) {
  return updateOnboardingState((state) => {
    const lastDiscoveryFingerprint = fingerprint ?? state.lastDiscoveryFingerprint;
    return {
      ...state,
      setupCompleted: true,
      ...lastDiscoveryFingerprint !== void 0 ? { lastDiscoveryFingerprint } : {}
    };
  });
}

// commands.ts
init_utils();
function terminalHyperlink(label, url) {
  return `\x1B]8;;${sanitizeTerminalText(url)}\x1B\\${sanitizeTerminalText(label)}\x1B]8;;\x1B\\`;
}
async function showStatus(state, ctx) {
  if (!ctx.hasUI) return;
  const lines = ["MCP Server Status:", ""];
  for (const name of Object.keys(state.config.mcpServers)) {
    const definition = state.config.mcpServers[name];
    if (isServerDisabled(definition)) {
      lines.push(`\u2298 ${name}: disabled (run /mcp enable ${name}, then /reload)`);
      continue;
    }
    const connection = state.manager.getConnection(name);
    const metadata = state.toolMetadata.get(name);
    const toolCount = metadata?.length ?? 0;
    const failedAgo = getFailureAgeSeconds(state, name);
    let status = "not connected";
    let statusIcon = "\u25CB";
    let failed = false;
    if (connection?.status === "connected") {
      status = "connected";
      statusIcon = "\u2713";
    } else if (connection?.status === "needs-auth") {
      status = "needs auth";
      statusIcon = "\u26A0";
    } else if (failedAgo !== null) {
      const reason = sanitizeTerminalText(getFailureMessage(state, name) ?? "");
      status = reason ? `failed ${failedAgo}s ago \u2014 ${reason}` : `failed ${failedAgo}s ago`;
      statusIcon = "\u2717";
      failed = true;
    } else if (metadata !== void 0) {
      status = "cached";
    }
    const toolSuffix = failed ? "" : ` (${toolCount} tools${status === "cached" ? ", cached" : ""})`;
    lines.push(`${statusIcon} ${name}: ${status}${toolSuffix}`);
  }
  if (Object.keys(state.config.mcpServers).length === 0) {
    lines.push("No MCP servers configured");
    lines.push("Run /mcp setup to adopt imports or scaffold a starter .mcp.json");
  }
  ctx.ui.notify(lines.join("\n"), "info");
}
async function showPrompts(state, ctx) {
  if (!ctx.hasUI) return;
  const allPrompts = [...state.promptMetadata?.values() ?? []].flat();
  const failedPromptServers = [...state.manager.getAllConnections?.() ?? []].filter(([, connection]) => connection.status === "connected" && connection.promptDiscoveryFailed).map(([serverName]) => serverName).sort();
  if (allPrompts.length === 0) {
    const failureNote = failedPromptServers.length > 0 ? ` Prompt discovery failed for: ${failedPromptServers.join(", ")}.` : "";
    ctx.ui.notify(`No MCP prompts available. Prompts are discovered when servers with the \`prompts\` capability connect.${failureNote}`, "info");
    return;
  }
  const lines = ["MCP Prompts:", ""];
  const grouped = /* @__PURE__ */ new Map();
  for (const prompt of allPrompts) {
    const list = grouped.get(prompt.serverName) ?? [];
    list.push(prompt);
    grouped.set(prompt.serverName, list);
  }
  for (const [serverName, prompts] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${serverName}:`);
    for (const prompt of prompts.sort((a, b) => a.commandName.localeCompare(b.commandName))) {
      const args = prompt.arguments.map((argument) => argument.required ? `<${argument.name}>` : `[${argument.name}]`).join(" ");
      lines.push(`  /${prompt.commandName}${args ? ` ${args}` : ""}`);
      if (prompt.description) lines.push(`      ${prompt.description}`);
    }
    lines.push("");
  }
  lines.push(`Total: ${allPrompts.length} prompt${allPrompts.length === 1 ? "" : "s"}`);
  if (failedPromptServers.length > 0) {
    lines.push(`Prompt discovery failed for: ${failedPromptServers.join(", ")}. Cached prompt metadata may be stale.`);
  }
  ctx.ui.notify(lines.join("\n"), "info");
}
async function showTools(state, ctx) {
  if (!ctx.hasUI) return;
  const allTools = [...state.toolMetadata.entries()].filter(([serverName]) => !isServerDisabled(state.config.mcpServers[serverName])).flatMap(([, metadata]) => metadata.map((m) => m.name));
  if (allTools.length === 0) {
    ctx.ui.notify("No MCP tools available", "info");
    return;
  }
  const lines = [
    "MCP Tools:",
    "",
    ...allTools.map((t) => `  ${t}`),
    "",
    `Total: ${allTools.length} tools`
  ];
  ctx.ui.notify(lines.join("\n"), "info");
}
async function reconnectServer(state, ctx, name) {
  const definition = state.config.mcpServers[name];
  const ui = ctx.hasUI ? ctx.ui : void 0;
  const signal = state.owner?.signal;
  if (!definition) {
    if (ui) {
      ui.notify(`Server "${name}" not found in config`, "error");
    }
    return false;
  }
  if (isServerDisabled(definition)) {
    if (ui) ui.notify(`MCP: ${name} is disabled. Run /mcp enable ${name}, then /reload.`, "warning");
    return false;
  }
  try {
    await state.manager.close(name);
    state.owner?.throwIfInactive();
    const connection = signal ? await state.manager.connect(name, definition, signal) : await state.manager.connect(name, definition);
    state.owner?.throwIfInactive();
    if (connection.status === "needs-auth") {
      if (ui) {
        ui.notify(`MCP: ${name} requires OAuth. Run /mcp-auth ${name} first.`, "warning");
      }
      updateStatusBar(state);
      return false;
    }
    const prefix = state.config.settings?.toolPrefix ?? "server";
    const { metadata, failedTools } = buildToolMetadata(connection.tools, connection.resources, definition, name, prefix, state.config.mcpServers, state.toolMetadata);
    state.toolMetadata.set(name, metadata);
    if (!connection.promptDiscoveryFailed) {
      state.promptMetadata?.set(name, reconstructPromptMetadata(name, connection.prompts ?? [], prefix, definition));
      state.promptMetadataLive?.add(name);
    }
    if (connection.instructions) {
      state.serverInstructions.set(name, connection.instructions);
    } else {
      state.serverInstructions.delete(name);
    }
    updateMetadataCache(state, name);
    notifyToolMetadataUpdated(state, name, "command-reconnect");
    markKeepAliveAfterConnect(state, name);
    clearFailure(state, name);
    if (ui) {
      ui.notify(
        `MCP: Reconnected to ${name} (${connection.tools.length} tools, ${connection.resources.length} resources)`,
        "info"
      );
      if (failedTools.length > 0) {
        ui.notify(`MCP: ${name} - ${failedTools.length} tools skipped`, "warning");
      }
    }
    updateStatusBar(state);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isAbortError(error, signal)) throw error;
    recordFailure(state, name, message);
    if (ui) {
      ui.notify(`MCP: Failed to reconnect to ${name}: ${sanitizeTerminalText(message)}`, "error");
    }
    updateStatusBar(state);
    return false;
  }
}
async function reconnectServers(state, ctx, targetServer) {
  if (targetServer && !state.config.mcpServers[targetServer]) {
    if (ctx.hasUI) {
      ctx.ui.notify(`Server "${targetServer}" not found in config`, "error");
    }
    return;
  }
  const names = targetServer ? [targetServer] : Object.keys(state.config.mcpServers);
  for (const name of names) {
    await reconnectServer(state, ctx, name);
  }
  updateStatusBar(state);
}
async function authenticateServer(serverName, config, ctx, signal, runtime) {
  const ui = ctx.hasUI ? ctx.ui : void 0;
  const cwd = ctx.cwd;
  signal ??= ctx.signal;
  if (!ui) return { ok: false, message: "OAuth authentication requires an interactive session." };
  const definition = config.mcpServers[serverName];
  if (!definition) {
    const message = `Server "${serverName}" not found in config`;
    ui.notify(message, "error");
    return { ok: false, message };
  }
  if (isServerDisabled(definition)) {
    const message = `Server "${serverName}" is disabled. Run /mcp enable ${serverName}, then /reload.`;
    ui.notify(message, "warning");
    return { ok: false, message };
  }
  if (!supportsOAuth(definition)) {
    const message = `Server "${serverName}" does not use OAuth authentication. Set "auth": "oauth" or omit auth for auto-detection.`;
    ui.notify(
      `Server "${serverName}" does not use OAuth authentication.
Set "auth": "oauth" or omit auth for auto-detection.`,
      "error"
    );
    return { ok: false, message };
  }
  try {
    const serverUrl = resolveServerUrl(definition);
    if (!serverUrl) {
      const message2 = `Server "${serverName}" has no URL configured (OAuth requires HTTP transport)`;
      ui.notify(message2, "error");
      return { ok: false, message: message2 };
    }
    ui.setStatus("mcp-auth", `Authenticating ${serverName}...`);
    const authStorageOptions = getAuthStorageOptions(config.settings?.oauthDir, cwd);
    const status = await authenticate(serverName, serverUrl, definition, {
      ...authStorageOptions.baseDir ? { authStorageOptions } : {},
      onAuthorizationUrl: (authorizationUrl) => {
        ui.notify(
          `Open this URL to authenticate ${serverName}:

${terminalHyperlink(authorizationUrl, authorizationUrl)}

After approving, Pi will complete automatically if the browser can reach its localhost callback. On a remote machine, copy the full localhost URL from the browser address bar and paste it into Pi.`,
          "info"
        );
      },
      onAuthorizationInput: async (authorizationUrl, inputSignal) => {
        const readyToPaste = await ui.confirm(
          `Authorize ${serverName}`,
          `Open this link in your browser:
${terminalHyperlink(authorizationUrl, authorizationUrl)}

After approving access, select Yes to paste the callback URL.`,
          { signal: inputSignal }
        );
        if (!readyToPaste || inputSignal.aborted) return void 0;
        return ui.input(
          `Complete ${serverName} OAuth`,
          "Paste the full callback URL",
          { signal: inputSignal }
        );
      },
      ...signal ? { signal } : {},
      ...runtime ? { runtime } : {}
    });
    if (signal?.aborted) signal.throwIfAborted();
    if (status === "authenticated") {
      const message2 = `OAuth authentication successful for "${serverName}".`;
      ui.notify(message2, "info");
      return { ok: true, message: message2 };
    }
    const message = `OAuth authentication failed for "${serverName}".`;
    ui.notify(message, "error");
    return { ok: false, message };
  } catch (error) {
    if (signal?.aborted) throw error;
    const message = error instanceof Error ? error.message : String(error);
    ui.notify(`Failed to authenticate "${serverName}": ${message}`, "error");
    return { ok: false, message };
  } finally {
    if (!signal?.aborted) ui.setStatus("mcp-auth", void 0);
  }
}
async function logoutServer(serverName, state, ctx) {
  const definition = state.config.mcpServers[serverName];
  const ui = ctx.hasUI ? ctx.ui : void 0;
  if (!definition) {
    const message2 = `Server "${serverName}" not found in config`;
    if (ui) ui.notify(message2, "error");
    return { ok: false, message: message2 };
  }
  const signal = state.owner?.signal;
  try {
    await removeAuth(serverName, { authStorageOptions: state.authStorageOptions, signal, runtime: state.oauthRuntime });
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    const message2 = error instanceof Error ? error.message : String(error);
    if (ui) {
      ui.notify(`Failed to clear OAuth credentials for "${serverName}": ${sanitizeTerminalText(message2)}`, "error");
    }
    return { ok: false, message: message2 };
  }
  state.owner?.throwIfInactive();
  try {
    await state.manager.close(serverName);
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    const message2 = error instanceof Error ? error.message : String(error);
    if (ui) {
      ui.notify(
        `OAuth credentials were cleared for "${serverName}", but its connection could not be closed: ${sanitizeTerminalText(message2)}`,
        "error"
      );
    }
    return { ok: false, message: message2 };
  }
  state.owner?.throwIfInactive();
  updateStatusBar(state);
  const message = `OAuth credentials cleared for "${serverName}". Run /mcp-auth ${serverName} to authenticate again.`;
  if (ui) ui.notify(message, "info");
  return { ok: true, message };
}
function buildSharedConfigNoticeLines(configOverridePath, cwd) {
  const discovery = getMcpStandardConfigSummary(configOverridePath, cwd);
  const onboardingState = loadOnboardingState();
  if (!discovery.hasSharedServers || onboardingState.sharedConfigHintShown) {
    return { lines: [], fingerprint: null };
  }
  const sharedSources = discovery.sources.filter((source) => source.kind === "shared" && source.serverCount > 0);
  const sourceList = sharedSources.map((source) => source.path).join(", ");
  return {
    lines: [
      `Using standard MCP config from ${sourceList}.`,
      "Pi only writes compatibility imports and adapter-specific overrides into Pi-owned files when needed."
    ],
    fingerprint: discovery.fingerprint
  };
}
async function openMcpSetup(state, pi, ctx, configOverridePath, mode = "setup", options = {}) {
  if (!ctx.hasUI) return { configChanged: false };
  if (state.programmaticConfig) {
    ctx.ui.notify("MCP setup is unavailable when config is supplied by createMcpAdapter().", "info");
    return { configChanged: false };
  }
  const discovery = getMcpDiscoverySummary(configOverridePath, ctx.cwd, options);
  const onboardingState = loadOnboardingState();
  const { createMcpSetupPanel: createMcpSetupPanel2 } = await Promise.resolve().then(() => (init_mcp_setup_panel(), mcp_setup_panel_exports));
  let configChanged = false;
  const callbacks = {
    previewImports: (imports) => previewCompatibilityImports(imports, configOverridePath),
    previewStarterProject: () => previewStarterProjectConfig(ctx.cwd),
    previewRepoPrompt: () => {
      const repoPrompt = getMcpDiscoverySummary(configOverridePath, ctx.cwd, options).repoPrompt;
      if (!repoPrompt.entry || !repoPrompt.targetPath || !repoPrompt.serverName) return null;
      return previewSharedServerEntry(repoPrompt.targetPath, repoPrompt.serverName, repoPrompt.entry);
    },
    previewKnownServer: (preset) => previewSharedServerEntry(getProjectConfigPath(ctx.cwd), preset.id, preset.entry),
    adoptImports: async (imports) => {
      const result = ensureCompatibilityImports(imports, configOverridePath);
      if (result.added.length > 0) configChanged = true;
      return result;
    },
    scaffoldProjectConfig: async () => {
      const path2 = writeStarterProjectConfig(ctx.cwd);
      configChanged = true;
      return { path: path2 };
    },
    addRepoPrompt: async () => {
      const repoPrompt = getMcpDiscoverySummary(configOverridePath, ctx.cwd, options).repoPrompt;
      if (!repoPrompt.entry || !repoPrompt.targetPath || !repoPrompt.serverName) {
        throw new Error("RepoPrompt is not available to add from this setup screen.");
      }
      const path2 = writeSharedServerEntry(repoPrompt.targetPath, repoPrompt.serverName, repoPrompt.entry);
      configChanged = true;
      return { path: path2, serverName: repoPrompt.serverName };
    },
    addKnownServer: async (preset) => {
      const path2 = writeSharedServerEntry(getProjectConfigPath(ctx.cwd), preset.id, preset.entry);
      configChanged = true;
      return { path: path2, serverName: preset.name };
    },
    openPath: async (targetPath) => {
      await openPath(pi, targetPath);
    },
    markSetupCompleted: () => {
      markSetupCompleted(discovery.fingerprint);
    }
  };
  return new Promise((resolve6) => {
    ctx.ui.custom(
      (tui, _theme, keybindings, done) => {
        return createMcpSetupPanel2(discovery, callbacks, { mode, onboardingState, keybindings }, tui, () => {
          done(void 0);
          resolve6({ configChanged });
        });
      },
      { overlay: true, overlayOptions: { anchor: "center", width: 92 } }
    );
  });
}
function buildMcpPanelCallbacks(state, config, ctx) {
  const authStatusFailures = /* @__PURE__ */ new Map();
  return {
    reconnect: (serverName) => reconnectServer(state, ctx, serverName),
    canAuthenticate: (serverName) => {
      const definition = config.mcpServers[serverName];
      return definition ? !isServerDisabled(definition) && supportsOAuth(definition) : false;
    },
    authenticate: (serverName) => authenticateServer(serverName, config, ctx, state.owner?.signal, state.oauthRuntime),
    getConnectionStatus: (serverName) => {
      authStatusFailures.delete(serverName);
      const definition = config.mcpServers[serverName];
      if (isServerDisabled(definition)) return "disabled";
      const connection = state.manager.getConnection(serverName);
      let serverUrl;
      try {
        serverUrl = definition ? resolveServerUrl(definition) : void 0;
      } catch {
        return "failed";
      }
      if (definition?.auth === "oauth" && serverUrl && definition.oauth !== false && definition.oauth?.grantType !== "client_credentials") {
        const authStatus = inspectAuthForUrl(serverName, serverUrl, state.authStorageOptions);
        if (authStatus.status === "unavailable") {
          authStatusFailures.set(serverName, authStatus.message);
          return "failed";
        }
        if (authStatus.status === "absent" || !authStatus.entry.tokens) {
          return "needs-auth";
        }
      }
      if (connection?.status === "needs-auth") return "needs-auth";
      if (connection?.status === "connected") return "connected";
      if (getFailureAgeSeconds(state, serverName) !== null) return "failed";
      return "idle";
    },
    getFailureMessage: (serverName) => authStatusFailures.get(serverName) ?? getFailureMessage(state, serverName),
    refreshCacheAfterReconnect: (serverName) => {
      const freshCache = loadMetadataCache();
      return freshCache?.servers?.[serverName] ?? null;
    }
  };
}
async function openMcpPanel(state, pi, ctx, configOverridePath, onDirectToolsConfigChanged) {
  if (state.programmaticConfig) {
    if (ctx.hasUI) {
      ctx.ui.notify("MCP status is shown from the in-memory SDK config; configuration discovery is unavailable.", "info");
      await showStatus(state, ctx);
    }
    return { configChanged: false };
  }
  if (Object.keys(state.config.mcpServers).length === 0) {
    return openMcpSetup(state, pi, ctx, configOverridePath, "empty", { includeHostConfigs: false });
  }
  const config = state.config;
  const cache = loadMetadataCache();
  const configPath = pi.getFlag("mcp-config") ?? configOverridePath;
  const provenanceMap = getServerProvenance(configPath, ctx.cwd);
  const { lines: noticeLines, fingerprint } = buildSharedConfigNoticeLines(configPath, ctx.cwd);
  const callbacks = buildMcpPanelCallbacks(state, config, ctx);
  const { createMcpPanel: createMcpPanel2 } = await Promise.resolve().then(() => (init_mcp_panel(), mcp_panel_exports));
  let configChanged = false;
  await new Promise((resolve6) => {
    ctx.ui.custom(
      (tui, _theme, keybindings, done) => {
        return createMcpPanel2(config, cache, provenanceMap, callbacks, tui, (result) => {
          void (async () => {
            if (!result.cancelled && result.changes.size > 0) {
              writeDirectToolsConfig(result.changes, provenanceMap, config);
              await onDirectToolsConfigChanged?.(result.changes);
              ctx.ui.notify("Direct tools updated for this session.", "info");
            }
            done(void 0);
            resolve6();
          })().catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            ctx.ui.notify(`Direct tools updated, but live refresh failed: ${message}`, "error");
            configChanged = true;
            done(void 0);
            resolve6();
          });
        }, { noticeLines, keybindings });
      },
      { overlay: true, overlayOptions: { anchor: "center", width: 82 } }
    );
  });
  if (noticeLines.length > 0 && fingerprint) {
    markSharedConfigHintShown(fingerprint);
  }
  return { configChanged };
}
async function openMcpAuthPanel(state, pi, ctx, configOverridePath) {
  if (!ctx.hasUI) return { configChanged: false };
  if (state.programmaticConfig) {
    ctx.ui.notify("Use /mcp-auth <server> to authenticate a server from the in-memory SDK config.", "info");
    return { configChanged: false };
  }
  const config = state.config;
  const oauthServers = Object.entries(config.mcpServers).filter(
    ([, definition]) => !isServerDisabled(definition) && supportsOAuth(definition)
  );
  if (oauthServers.length === 0) {
    ctx.ui.notify("No OAuth-capable MCP servers are configured.", "warning");
    return { configChanged: false };
  }
  const cache = loadMetadataCache();
  const configPath = pi.getFlag("mcp-config") ?? configOverridePath;
  const provenanceMap = getServerProvenance(configPath, ctx.cwd);
  const callbacks = buildMcpPanelCallbacks(state, config, ctx);
  const { createMcpPanel: createMcpPanel2 } = await Promise.resolve().then(() => (init_mcp_panel(), mcp_panel_exports));
  await new Promise((resolve6) => {
    ctx.ui.custom(
      (tui, _theme, keybindings, done) => {
        return createMcpPanel2(config, cache, provenanceMap, callbacks, tui, () => {
          done(void 0);
          resolve6();
        }, {
          authOnly: true,
          keybindings,
          noticeLines: ["Select an OAuth MCP server and press Enter or ctrl+a to authenticate."]
        });
      },
      { overlay: true, overlayOptions: { anchor: "center", width: 82 } }
    );
  });
  return { configChanged: false };
}

// index.ts
init_config();

// direct-tools.ts
import { UrlElicitationRequiredError as UrlElicitationRequiredError3 } from "@modelcontextprotocol/client";
init_metadata_cache();
init_metadata_cache();

// tool-registrar.ts
import { mkdtempSync, rmSync as rmSync2, writeFileSync as writeFileSync5 } from "node:fs";
import { tmpdir } from "node:os";
import { join as join6 } from "node:path";
var MAX_BINARY_RESOURCE_BYTES = 10 * 1024 * 1024;
var MAX_SESSION_RESOURCE_BYTES = 100 * 1024 * 1024;
var MAX_SESSION_RESOURCE_FILES = 1e4;
var CLEANUP_RETRY_DELAY_MS = 3e4;
var MAX_CLEANUP_RETRY_ATTEMPTS = 3;
function createMaterializedResourceSession() {
  return {
    directory: void 0,
    bytes: 0,
    files: 0,
    sequence: 0
  };
}
var defaultMaterializedResourceSession = createMaterializedResourceSession();
var scopedMaterializedResourceSessions = /* @__PURE__ */ new WeakMap();
var pendingCleanupDirectories = /* @__PURE__ */ new Set();
var cleanupRetryAttempts = /* @__PURE__ */ new Map();
var pendingCleanupRetry;
function isAbortedScope(scope) {
  return !!scope && "aborted" in scope && scope.aborted === true;
}
function getMaterializedResourceSession(scope) {
  if (isAbortedScope(scope)) return void 0;
  if (!scope) return defaultMaterializedResourceSession;
  let session = scopedMaterializedResourceSessions.get(scope);
  if (!session) {
    session = createMaterializedResourceSession();
    scopedMaterializedResourceSessions.set(scope, session);
  }
  return session;
}
function hasRetryableCleanupDirectory() {
  for (const directory of pendingCleanupDirectories) {
    if ((cleanupRetryAttempts.get(directory) ?? 0) < MAX_CLEANUP_RETRY_ATTEMPTS) return true;
  }
  return false;
}
function schedulePendingCleanupRetry() {
  if (pendingCleanupRetry || !hasRetryableCleanupDirectory()) return;
  for (const directory of pendingCleanupDirectories) {
    const attempts = cleanupRetryAttempts.get(directory) ?? 0;
    if (attempts < MAX_CLEANUP_RETRY_ATTEMPTS) cleanupRetryAttempts.set(directory, attempts + 1);
  }
  pendingCleanupRetry = setTimeout(() => {
    pendingCleanupRetry = void 0;
    try {
      drainPendingCleanupDirectories();
    } catch {
    }
  }, CLEANUP_RETRY_DELAY_MS);
}
function drainPendingCleanupDirectories() {
  const failures = [];
  for (const directory of Array.from(pendingCleanupDirectories)) {
    try {
      rmSync2(directory, { recursive: true, force: true });
      pendingCleanupDirectories.delete(directory);
      cleanupRetryAttempts.delete(directory);
    } catch (error) {
      failures.push(error);
    }
  }
  if (pendingCleanupDirectories.size === 0 && pendingCleanupRetry) {
    clearTimeout(pendingCleanupRetry);
    pendingCleanupRetry = void 0;
  }
  if (failures.length > 0) {
    schedulePendingCleanupRetry();
    throw new AggregateError(failures, "Failed to clean materialized MCP resources");
  }
}
function cleanupMaterializedBinaryResources(scope) {
  const session = scope ? scopedMaterializedResourceSessions.get(scope) : defaultMaterializedResourceSession;
  if (session?.directory) pendingCleanupDirectories.add(session.directory);
  if (session) {
    session.directory = void 0;
    session.bytes = 0;
    session.files = 0;
    session.sequence = 0;
    if (scope) scopedMaterializedResourceSessions.delete(scope);
  }
  drainPendingCleanupDirectories();
}
function replaceBlob(resource, text) {
  delete resource.blob;
  resource.text = text;
  return text;
}
function omitBinaryResource(resource, reason) {
  return replaceBlob(resource, [
    `[Resource: ${resource.uri ?? "(no URI)"}]`,
    `Binary content omitted: ${reason}`,
    `MIME type: ${resource.mimeType ?? "application/octet-stream"}`
  ].join("\n"));
}
function materializeBinaryResource(resource, scope) {
  const session = getMaterializedResourceSession(scope);
  if (!session) return omitBinaryResource(resource, "runtime stopped");
  const decodedBytes = Buffer.byteLength(resource.blob, "base64");
  if (decodedBytes > MAX_BINARY_RESOURCE_BYTES) {
    return omitBinaryResource(resource, "decoded size exceeds 10 MiB");
  }
  if (session.bytes + decodedBytes > MAX_SESSION_RESOURCE_BYTES || session.files >= MAX_SESSION_RESOURCE_FILES) {
    return omitBinaryResource(resource, "session resource limit reached");
  }
  try {
    session.directory ??= mkdtempSync(join6(tmpdir(), "pi-mcp-resource-"));
  } catch {
    return omitBinaryResource(resource, "could not be saved");
  }
  const filePath = join6(session.directory, `resource-${++session.sequence}.bin`);
  session.bytes += decodedBytes;
  session.files += 1;
  try {
    writeFileSync5(filePath, Buffer.from(resource.blob, "base64"), { flag: "wx", mode: 384 });
  } catch {
    try {
      rmSync2(filePath, { force: true });
      session.bytes -= decodedBytes;
      session.files -= 1;
    } catch {
    }
    return omitBinaryResource(resource, "could not be saved");
  }
  return replaceBlob(resource, [
    `[Resource: ${resource.uri ?? "(no URI)"}]`,
    `Binary content saved to ${filePath}`,
    `MIME type: ${resource.mimeType ?? "application/octet-stream"}`
  ].join("\n"));
}
function transformMcpResourceContents(contents, scope) {
  return contents.map((resource) => {
    if (typeof resource.text === "string") return { type: "text", text: resource.text };
    if (typeof resource.blob === "string") return { type: "text", text: materializeBinaryResource(resource, scope) };
    return { type: "text", text: JSON.stringify(resource) };
  });
}
function transformMcpContent(content, scope) {
  return content.map((c) => {
    if (c.type === "text") {
      return { type: "text", text: c.text ?? "" };
    }
    if (c.type === "image") {
      return {
        type: "image",
        data: c.data ?? "",
        mimeType: c.mimeType ?? "image/png"
      };
    }
    if (c.type === "resource") {
      const resourceUri = c.resource?.uri ?? "(no URI)";
      if (c.resource && "blob" in c.resource && typeof c.resource.blob === "string") {
        const binaryResource = c.resource;
        return {
          type: "text",
          text: materializeBinaryResource(binaryResource, scope)
        };
      }
      const resourceContent = c.resource?.text ?? (c.resource ? JSON.stringify(c.resource) : "(no content)");
      return {
        type: "text",
        text: `[Resource: ${resourceUri}]
${resourceContent}`
      };
    }
    if (c.type === "resource_link") {
      const linkName = c.name ?? c.uri ?? "unknown";
      const linkUri = c.uri ?? "(no URI)";
      return {
        type: "text",
        text: `[Resource Link: ${linkName}]
URI: ${linkUri}`
      };
    }
    if (c.type === "audio") {
      return {
        type: "text",
        text: `[Audio content: ${c.mimeType ?? "audio/*"}]`
      };
    }
    return { type: "text", text: JSON.stringify(c) };
  });
}
function resolveMcpResultContent(result, scope) {
  const blocks = transformMcpContent(Array.isArray(result.content) ? result.content : [], scope);
  if (blocks.length > 0) return blocks;
  if (result.structuredContent !== void 0 && result.structuredContent !== null) {
    return [{ type: "text", text: stringifyStructuredContent(result.structuredContent) }];
  }
  return [];
}
function stringifyStructuredContent(value) {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

// mcp-output-guard.ts
import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile as writeFile2 } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join7 } from "node:path";
var DEFAULT_MCP_OUTPUT_MAX_BYTES = 50 * 1024;
var DEFAULT_MCP_OUTPUT_MAX_LINES = 2e3;
var DEFAULT_MCP_DETAILS_MAX_BYTES = 16 * 1024;
var CONTENT_SUMMARY_LIMIT = 20;
var KEY_PREVIEW_LIMIT = 20;
var KEY_MAX_CHARS = 120;
function resolveMcpOutputGuardOptions(settings) {
  const configured = settings?.outputGuard;
  const tuning = typeof configured === "object" && configured !== null ? configured : void 0;
  return {
    enabled: envKillSwitch("MCP_OUTPUT_GUARD") ?? configured !== false,
    maxBytes: positiveInt(tuning?.maxBytes) ?? DEFAULT_MCP_OUTPUT_MAX_BYTES,
    maxLines: positiveInt(tuning?.maxLines) ?? DEFAULT_MCP_OUTPUT_MAX_LINES,
    detailsMaxBytes: positiveInt(tuning?.detailsMaxBytes) ?? DEFAULT_MCP_DETAILS_MAX_BYTES
  };
}
function guardedMcpDetails(guarded) {
  return {
    ...guarded.mcpResult !== void 0 ? { mcpResult: guarded.mcpResult } : {},
    ...guarded.outputGuard ? { outputGuard: guarded.outputGuard } : {}
  };
}
async function guardMcpOutput(content, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MCP_OUTPUT_MAX_BYTES;
  const maxLines = options.maxLines ?? DEFAULT_MCP_OUTPUT_MAX_LINES;
  const detailsMaxBytes = options.detailsMaxBytes ?? DEFAULT_MCP_DETAILS_MAX_BYTES;
  const prefix = options.prefix ?? "";
  const suffix = options.suffix ?? "";
  const normalizedContent = withEmptyTextFallback(
    content.length > 0 ? sanitizeContent(content) : [{ type: "text", text: options.emptyTextFallback ?? "(empty result)" }],
    options.emptyTextFallback
  );
  if (options.enabled === false) {
    return {
      content: addAffixes(normalizedContent, prefix, suffix),
      ...options.rawMcpResult !== void 0 ? { mcpResult: options.rawMcpResult } : {}
    };
  }
  const imageBlocks = normalizedContent.filter((block) => block.type === "image");
  const textOutput = normalizedContent.filter((block) => block.type === "text").map((block) => block.text).join("\n");
  const composedOutput = `${prefix}${textOutput}${suffix}`;
  const stats = textStats(composedOutput);
  let guardedContent = addAffixes(normalizedContent, prefix, suffix);
  let outputGuard;
  if (stats.bytes > maxBytes || stats.lines > maxLines) {
    const { path: fullOutputPath, error: writeError } = await saveArtifact("output", composedOutput);
    const notice = formatTruncationNotice(stats, fullOutputPath, writeError);
    const previewBudget = reserveBudget(maxBytes, maxLines, notice);
    const preview = truncateHead(composedOutput, previewBudget.maxBytes, previewBudget.maxLines);
    const finalText = `${preview.content}

${notice}`;
    const finalStats = textStats(finalText);
    guardedContent = [{ type: "text", text: finalText }, ...imageBlocks];
    outputGuard = {
      truncated: true,
      originalBytes: stats.bytes,
      returnedBytes: finalStats.bytes,
      originalLines: stats.lines,
      returnedLines: finalStats.lines,
      ...imageBlocks.length > 0 ? { imageBlocksPassedThrough: imageBlocks.length } : {},
      ...fullOutputPath !== void 0 ? { fullOutputPath } : {},
      ...writeError !== void 0 ? { writeError } : {}
    };
  }
  const mcpResult = options.rawMcpResult === void 0 ? void 0 : await boundMcpResult(options.rawMcpResult, detailsMaxBytes);
  return {
    content: guardedContent,
    ...outputGuard ? { outputGuard } : {},
    ...mcpResult !== void 0 ? { mcpResult } : {}
  };
}
function sanitizeContent(content) {
  return content.map((block) => {
    if (block.type !== "image") return block;
    const mimeType = typeof block.mimeType === "string" && block.mimeType.trim() ? block.mimeType.trim().slice(0, 100) : "image/png";
    return { ...block, mimeType };
  });
}
function withEmptyTextFallback(content, fallback) {
  if (!fallback) return content;
  const textOutput = content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
  if (textOutput) return content;
  return [{ type: "text", text: fallback }, ...content.filter((block) => block.type === "image")];
}
function addAffixes(content, prefix, suffix) {
  if (!prefix && !suffix) return content;
  const next = [...content];
  if (prefix) {
    const index = next.findIndex((block2) => block2.type === "text");
    const block = next[index];
    if (block?.type === "text") {
      next[index] = { ...block, text: `${prefix}${block.text}` };
    } else {
      next.unshift({ type: "text", text: prefix });
    }
  }
  if (suffix) {
    let index = -1;
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i]?.type === "text") {
        index = i;
        break;
      }
    }
    const block = next[index];
    if (block?.type === "text") {
      next[index] = { ...block, text: `${block.text}${suffix}` };
    } else {
      next.push({ type: "text", text: suffix });
    }
  }
  return next;
}
function reserveBudget(maxBytes, maxLines, notice) {
  const noticeStats = textStats(`

${notice}`);
  return {
    maxBytes: Math.max(0, maxBytes - noticeStats.bytes),
    maxLines: Math.max(0, maxLines - noticeStats.lines)
  };
}
function truncateHead(text, maxBytes, maxLines) {
  const lines = text.split("\n");
  const output = [];
  let bytes = 0;
  for (const line of lines) {
    if (output.length >= maxLines) break;
    const separatorBytes = output.length > 0 ? 1 : 0;
    const lineBytes = byteLength(line);
    if (bytes + separatorBytes + lineBytes > maxBytes) {
      const remaining = maxBytes - bytes - separatorBytes;
      if (remaining > 0) {
        output.push(truncateStringToBytes(line, remaining));
      }
      break;
    }
    output.push(line);
    bytes += separatorBytes + lineBytes;
  }
  const content = output.join("\n");
  const stats = textStats(content);
  return { content, bytes: stats.bytes, lines: stats.lines };
}
function truncateStringToBytes(value, maxBytes) {
  if (byteLength(value) <= maxBytes) return value;
  const buffer = Buffer.from(value, "utf8");
  let end = Number.isFinite(maxBytes) ? Math.max(0, Math.floor(maxBytes)) : 0;
  while (end > 0 && (buffer.readUInt8(end) & 192) === 128) end--;
  return buffer.subarray(0, end).toString("utf8");
}
function formatTruncationNotice(stats, fullOutputPath, writeError) {
  const base = `[MCP text output truncated: original ${stats.lines.toLocaleString()} lines / ${formatSize(stats.bytes)}.`;
  if (fullOutputPath) {
    return `${base} Full text saved to: ${fullOutputPath} \u2014 use read with offset/limit or grep to inspect.]`;
  }
  return `${base} Full output could not be saved: ${writeError ?? "unknown error"}]`;
}
async function boundMcpResult(result, detailsMaxBytes) {
  const raw = safeStringify(result);
  const rawBytes = byteLength(raw);
  if (rawBytes <= detailsMaxBytes) return result;
  return summarizeMcpResult(result, raw, rawBytes);
}
async function summarizeMcpResult(result, raw, rawBytes) {
  const { path: fullResultPath, error: resultWriteError } = await saveArtifact("mcp-result", raw);
  const record = asRecord2(result);
  const content = Array.isArray(record?.content) ? record.content : [];
  const summary = {
    omitted: true,
    reason: "Raw MCP result exceeded the details size limit and was replaced with this summary to keep session context bounded.",
    isError: record?.isError === true,
    contentBlocks: content.length,
    contentSummary: summarizeContent(content),
    rawResultBytes: rawBytes,
    ...fullResultPath !== void 0 ? { fullResultPath } : {},
    ...resultWriteError !== void 0 ? { resultWriteError } : {}
  };
  if (record && "structuredContent" in record) {
    summary.structuredContent = summarizeValue(record.structuredContent);
  }
  if (record && "_meta" in record) {
    summary.meta = summarizeValue(record._meta);
  }
  if (record) {
    const standard = /* @__PURE__ */ new Set(["content", "isError", "structuredContent", "_meta"]);
    const extraFields = Object.keys(record).filter((key) => !standard.has(key)).slice(0, KEY_PREVIEW_LIMIT).map((key) => ({ key: truncateKey(key), type: typeof record[key], estimatedBytes: estimateValueBytes(record[key]), omitted: true }));
    if (extraFields.length > 0) summary.extraFields = extraFields;
  }
  return summary;
}
function summarizeContent(content) {
  const summaries = content.slice(0, CONTENT_SUMMARY_LIMIT).map((block) => {
    const record = asRecord2(block);
    if (!record) return { type: typeof block, omitted: true };
    if (record.type === "text") {
      const text = typeof record.text === "string" ? record.text : "";
      return { type: "text", bytes: byteLength(text), lines: textStats(text).lines, textOmitted: true };
    }
    if (record.type === "image") {
      const data = typeof record.data === "string" ? record.data : "";
      return { type: "image", mimeType: typeof record.mimeType === "string" ? record.mimeType : void 0, dataBytes: byteLength(data), dataOmitted: true };
    }
    return { type: typeof record.type === "string" ? record.type : "unknown", estimatedBytes: estimateValueBytes(record), omitted: true };
  });
  if (content.length > CONTENT_SUMMARY_LIMIT) {
    summaries.push({ type: "omitted", count: content.length - CONTENT_SUMMARY_LIMIT });
  }
  return summaries;
}
function summarizeValue(value) {
  const record = asRecord2(value);
  if (!record) {
    return { type: value === null ? "null" : typeof value, estimatedBytes: estimateValueBytes(value), omitted: true };
  }
  const keys = Object.keys(record);
  return {
    type: Array.isArray(value) ? "array" : "object",
    estimatedBytes: estimateValueBytes(value),
    keyCount: keys.length,
    keysPreview: keys.slice(0, KEY_PREVIEW_LIMIT).map(truncateKey),
    omitted: true
  };
}
function estimateValueBytes(value, depth = 0) {
  if (value === null || value === void 0) return 0;
  if (typeof value === "string") return byteLength(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return byteLength(String(value));
  const record = asRecord2(value);
  if (!record || depth >= 2) return 0;
  const values = Array.isArray(value) ? value.slice(0, KEY_PREVIEW_LIMIT) : Object.values(record).slice(0, KEY_PREVIEW_LIMIT);
  return values.reduce((total, item) => total + estimateValueBytes(item, depth + 1), 0);
}
function truncateKey(key) {
  return key.length <= KEY_MAX_CHARS ? key : `${key.slice(0, KEY_MAX_CHARS - 1)}\u2026`;
}
async function saveArtifact(kind, text) {
  try {
    const dir = await mkdtemp(join7(tmpdir2(), "pi-mcp-output-"));
    const path2 = join7(dir, `${kind}-${randomBytes(4).toString("hex")}.txt`);
    await writeFile2(path2, text, { encoding: "utf8", mode: 384 });
    return { path: path2 };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
function asRecord2(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function textStats(text) {
  return { bytes: byteLength(text), lines: text.length === 0 ? 0 : text.split("\n").length };
}
function byteLength(text) {
  return Buffer.byteLength(text, "utf8");
}
function positiveInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
  const integer = Math.floor(value);
  return integer > 0 ? integer : void 0;
}
function envKillSwitch(name) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return void 0;
  if (["0", "false", "no", "off"].includes(value)) return false;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  return void 0;
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

// ui-session.ts
init_types();
import { execFile } from "node:child_process";
import { randomUUID as randomUUID4 } from "node:crypto";
import net from "node:net";
import { UrlElicitationRequiredError as UrlElicitationRequiredError2 } from "@modelcontextprotocol/client";

// ui-server.ts
init_ui_app_bridge_helpers();
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID as randomUUID3 } from "node:crypto";
import { ContentBlockSchema } from "@modelcontextprotocol/core";
init_utils();

// host-html-template.ts
var DEFAULT_APP_BRIDGE_MODULE_URL = "/app-bridge.bundle.js";
var APP_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-downloads";
function buildHostHtmlTemplate(input) {
  const hostContext = input.hostContext ?? {};
  const sessionToken = safeInlineJSON(input.sessionToken);
  const uiResourceToken = safeInlineJSON(input.uiResourceToken);
  const toolArgs = safeInlineJSON(input.toolArgs);
  const serverName = safeInlineJSON(input.serverName);
  const toolName = safeInlineJSON(input.toolName);
  const hostContextJson = safeInlineJSON(hostContext);
  const allowAttribute = safeInlineJSON(input.allowAttribute);
  const requireToolConsent = safeInlineJSON(input.requireToolConsent);
  const cacheToolConsent = safeInlineJSON(input.cacheToolConsent);
  const moduleUrl = safeInlineJSON(input.appBridgeModuleUrl ?? DEFAULT_APP_BRIDGE_MODULE_URL);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCP UI - ${escapeHtml2(input.serverName)} / ${escapeHtml2(input.toolName)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1115;
      --surface: #181c22;
      --text: #ecf0f5;
      --muted: #a9b2bf;
      --accent: #43c0ff;
      --border: rgba(255, 255, 255, 0.12);
      --good: #34d399;
      --warn: #fbbf24;
      --bad: #f87171;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f6f7fb;
        --surface: #ffffff;
        --text: #1d2939;
        --muted: #667085;
        --accent: #0ea5e9;
        --border: rgba(15, 23, 42, 0.14);
        --good: #059669;
        --warn: #b45309;
        --bad: #b91c1c;
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
    body { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; }
    header { background: var(--surface); border-bottom: 1px solid var(--border); padding: calc(10px + env(safe-area-inset-top, 0px)) calc(14px + env(safe-area-inset-right, 0px)) 10px calc(14px + env(safe-area-inset-left, 0px)); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .title { display: flex; gap: 8px; align-items: baseline; min-width: 0; }
    .server { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
    .tool { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge { border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: var(--muted); white-space: nowrap; }
    .controls { display: flex; gap: 8px; align-items: center; }
    .status { font-size: 12px; color: var(--muted); white-space: nowrap; }
    button { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
    button.primary { border-color: color-mix(in srgb, var(--good) 40%, var(--border) 60%); color: var(--good); }
    button.danger { border-color: color-mix(in srgb, var(--bad) 40%, var(--border) 60%); color: var(--bad); }
    button:hover { background: color-mix(in srgb, var(--surface) 75%, var(--accent) 25%); }
    main { flex: 1; min-height: 0; padding: 10px; padding-inline: calc(10px + env(safe-area-inset-left, 0px)) calc(10px + env(safe-area-inset-right, 0px)); padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px)); display: flex; }
    iframe { width: 100%; height: 100%; border: 1px solid var(--border); border-radius: 10px; background: white; }
    .overlay { position: fixed; inset: 0; background: color-mix(in srgb, var(--bg) 90%, black 10%); display: none; align-items: center; justify-content: center; z-index: 2; padding: 16px; }
    .overlay.visible { display: flex; }
    .panel { width: min(680px, calc(100vw - 40px)); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .panel h2 { margin: 0 0 8px; font-size: 16px; }
    .panel p { margin: 0; color: var(--muted); line-height: 1.4; font-size: 14px; white-space: pre-wrap; }
    @media (max-width: 640px) {
      header { align-items: stretch; flex-direction: column; gap: 8px; }
      .title { flex-wrap: wrap; row-gap: 4px; }
      .server { flex-basis: 100%; }
      .controls { width: 100%; }
      .status { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      button { min-height: 44px; padding: 10px 14px; }
      main { padding: 6px; padding-inline: calc(6px + env(safe-area-inset-left, 0px)) calc(6px + env(safe-area-inset-right, 0px)); padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)); }
      iframe { border-radius: 6px; }
      .panel { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div class="title">
      <span class="server">MCP \xB7 <span id="server-name"></span></span>
      <span class="tool" id="tool-name"></span>
      <span class="badge">Sandboxed</span>
    </div>
    <div class="controls">
      <span class="status" id="status">Loading UI...</span>
      <button class="primary" id="done-btn" title="Cmd/Ctrl+Enter">Done</button>
      <button class="danger" id="cancel-btn" title="Escape">Cancel</button>
    </div>
  </header>
  <main>
    <iframe id="mcp-app" sandbox="${APP_SANDBOX}" referrerpolicy="no-referrer"></iframe>
  </main>
  <div class="overlay" id="error-overlay">
    <div class="panel">
      <h2>UI Error</h2>
      <p id="error-message"></p>
    </div>
  </div>
  <div class="overlay" id="completion-overlay">
    <div class="panel">
      <h2>Done</h2>
      <p>MCP UI session finished. You can close this page and return to Pi.</p>
    </div>
  </div>
  <script type="module">
    import { AppBridge, PostMessageTransport } from ${moduleUrl};

    const SESSION_TOKEN = ${sessionToken};
    const UI_RESOURCE_TOKEN = ${uiResourceToken};
    const SERVER_NAME = ${serverName};
    const TOOL_NAME = ${toolName};
    const TOOL_ARGS = ${toolArgs};
    const HOST_CONTEXT = ${hostContextJson};
    const ALLOW_ATTRIBUTE = ${allowAttribute};
    const REQUIRE_TOOL_CONSENT = ${requireToolConsent};
    const CACHE_TOOL_CONSENT = ${cacheToolConsent};
    const STREAM_CONTEXT_KEY = "pi-mcp-adapter/stream";
    const STREAM_PATCH_METHOD = "notifications/pi-mcp-adapter/ui-result-patch";

    const iframe = document.getElementById("mcp-app");
    const statusNode = document.getElementById("status");
    const doneBtn = document.getElementById("done-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const errorOverlay = document.getElementById("error-overlay");
    const completionOverlay = document.getElementById("completion-overlay");
    const errorMessage = document.getElementById("error-message");

    document.getElementById("server-name").textContent = SERVER_NAME;
    document.getElementById("tool-name").textContent = TOOL_NAME;

    const setStatus = (text, isError = false) => {
      statusNode.textContent = text;
      statusNode.style.color = isError ? "var(--bad)" : "var(--muted)";
    };

    const showError = (message) => {
      errorMessage.textContent = message;
      errorOverlay.classList.add("visible");
      setStatus("Error", true);
    };

    let completionPending = false;
    const showCompletion = () => {
      completionOverlay.classList.add("visible");
      setStatus("Complete");
    };
    const closeOrShowDone = () => {
      completionPending = true;
      window.close();
      setTimeout(() => {
        if (!document.hidden) {
          showCompletion();
        }
      }, 1000);
    };
    document.addEventListener("visibilitychange", () => {
      if (completionPending && !document.hidden) {
        showCompletion();
      }
    });

    const post = async (endpoint, params) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SESSION_TOKEN, params }),
      });

      const body = await response.json().catch(() => ({ ok: false, error: "Invalid JSON response" }));
      if (!response.ok || !body.ok) {
        const message = body.error || ("HTTP " + response.status);
        throw new Error(message);
      }
      return body.result ?? {};
    };

    let consentGranted = !REQUIRE_TOOL_CONSENT;
    const initialStreamContext = HOST_CONTEXT?.[STREAM_CONTEXT_KEY];
    const streamMode = initialStreamContext?.mode === "stream-first" ? "stream-first" : "eager";

    const bridge = new AppBridge(
      null,
      { name: "pi", version: "1.0.0" },
      { serverTools: {}, openLinks: {}, logging: {}, updateModelContext: {}, message: {} },
      { hostContext: HOST_CONTEXT }
    );

    bridge.oncalltool = async (params) => {
      if (!consentGranted) {
        const accepted = window.confirm("Allow this UI to call server tools for this session?");
        if (!accepted) {
          await post("/proxy/ui/consent", { approved: false }).catch(() => {});
          return {
            isError: true,
            content: [{ type: "text", text: "Tool call denied by user." }],
          };
        }
        await post("/proxy/ui/consent", { approved: true });
        if (CACHE_TOOL_CONSENT) {
          consentGranted = true;
        }
      }
      const result = await post("/proxy/tools/call", params);
      // Notify agent about the tool call
      await post("/proxy/ui/generated-tool-call-intent", {
        tool: params.name,
        arguments: params.arguments,
        isError: result.isError
      }).catch(() => {});
      return result;
    };

    bridge.onmessage = async (params) => post("/proxy/ui/message", params);
    bridge.onupdatemodelcontext = async (params) => post("/proxy/ui/context", params);
    
    // Also listen for raw postMessage events with custom types (notify, prompt, intent, etc.)
    // These bypass the AppBridge protocol but are used by some MCP UI implementations
    window.addEventListener("message", async (event) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      
      // Skip AppBridge protocol messages (handled by bridge)
      if (data.jsonrpc || (typeof data.method === "string" && (data.method.startsWith("app/") || data.method.startsWith("host/")))) return;
      
      // Handle raw UI action messages
      const msgType = data.type;
      if (typeof msgType !== "string") return;
      
      if (msgType === "notify" || msgType === "prompt" || msgType === "intent" || msgType === "message") {
        // Standard MCP-UI types - preserve their semantics
        // Support both { type, payload: {...} } and { type, field: value } formats
        const { type: _, payload, ...directFields } = data;
        await post("/proxy/ui/message", { type: msgType, ...directFields, ...(payload || {}) }).catch(() => {});
      } else if (!msgType.startsWith("ui-lifecycle-") && !msgType.startsWith("ui-message-")) {
        // Any other custom type - forward as intent with type as intent name
        // (Skip internal lifecycle/ack messages)
        const payload = data.payload || {};
        await post("/proxy/ui/message", {
          type: "intent",
          intent: msgType,
          params: payload,
        }).catch(() => {});
      }
    });
    bridge.ondownloadfile = async (params) => post("/proxy/ui/download-file", params);
    bridge.onrequestdisplaymode = async (params) => post("/proxy/ui/request-display-mode", params);
    bridge.onopenlink = async (params) => {
      const result = await post("/proxy/ui/open-link", params);
      if (!result.isError) {
        window.open(params.url, "_blank", "noopener,noreferrer");
        // Notify agent about the link open
        await post("/proxy/ui/message", {
          type: "intent",
          intent: "open_link",
          params: { url: params.url }
        }).catch(() => {});
      }
      return result;
    };

    bridge.oninitialized = () => {
      if (streamMode !== "stream-first") {
        bridge.sendToolInput({ arguments: TOOL_ARGS });
      }
      setStatus(streamMode === "stream-first" ? "Streaming\u2026" : "Connected");
    };

    bridge.onsizechange = ({ width, height }) => {
      if (typeof width === "number" && width > 0) {
        iframe.style.minWidth = Math.min(width, window.innerWidth - 24) + "px";
      }
      if (typeof height === "number" && height > 0) {
        iframe.style.height = Math.max(height, 320) + "px";
      }
    };

    if (ALLOW_ATTRIBUTE) {
      iframe.setAttribute("allow", ALLOW_ATTRIBUTE);
    }

    // Connect bridge BEFORE loading iframe to ensure we're listening when the app sends ui/initialize
    try {
      const transport = new PostMessageTransport(iframe.contentWindow, iframe.contentWindow);
      await bridge.connect(transport);
    } catch (error) {
      console.error("[host] Bridge connection failed:", error);
      showError("Failed to initialize AppBridge: " + String(error));
    }

    const iframeLoaded = new Promise((resolve) => {
      iframe.onload = resolve;
    });
    iframe.src = "/ui-app?resource=" + encodeURIComponent(UI_RESOURCE_TOKEN);
    await iframeLoaded;

    const eventSource = new EventSource("/events?session=" + encodeURIComponent(SESSION_TOKEN));
    eventSource.addEventListener("tool-input", (event) => {
      try {
        bridge.sendToolInput(JSON.parse(event.data));
      } catch (error) {
        showError("Failed to forward tool input: " + String(error));
      }
    });
    eventSource.addEventListener("tool-result", (event) => {
      try {
        bridge.sendToolResult(JSON.parse(event.data));
      } catch (error) {
        showError("Failed to forward tool result: " + String(error));
      }
    });
    eventSource.addEventListener("tool-cancelled", (event) => {
      try {
        bridge.sendToolCancelled(JSON.parse(event.data));
      } catch (error) {
        showError("Failed to forward cancellation: " + String(error));
      }
    });
    eventSource.addEventListener("result-patch", async (event) => {
      try {
        await bridge.notification({
          method: STREAM_PATCH_METHOD,
          params: JSON.parse(event.data),
        });
      } catch (error) {
        showError("Failed to forward stream patch: " + String(error));
      }
    });
    eventSource.addEventListener("host-context", (event) => {
      try {
        bridge.setHostContext(JSON.parse(event.data));
      } catch {}
    });
    eventSource.addEventListener("session-complete", async () => {
      await bridge.teardownResource({}).catch(() => {});
      eventSource.close();
      closeOrShowDone();
    });
    eventSource.onerror = () => {
      setStatus("Connection lost", true);
    };

    const heartbeat = setInterval(() => {
      post("/proxy/ui/heartbeat", {}).catch(() => {});
    }, 10000);

    const complete = async (reason) => {
      try {
        await post("/proxy/ui/complete", { reason });
      } catch {}
      try {
        await bridge.teardownResource({});
      } catch {}
      clearInterval(heartbeat);
      eventSource.close();
      closeOrShowDone();
    };

    doneBtn.addEventListener("click", () => complete("done"));
    cancelBtn.addEventListener("click", () => complete("cancel"));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        complete("cancel");
      } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        complete("done");
      }
    });
  </script>
</body>
</html>`;
}
function buildCspMetaContent(csp) {
  const resourceDomains = sanitizeCspDomains(csp?.resourceDomains);
  const connectDomains = sanitizeCspDomains(csp?.connectDomains);
  const frameDomains = sanitizeCspDomains(csp?.frameDomains);
  const baseUriDomains = sanitizeCspDomains(csp?.baseUriDomains);
  return [
    "default-src 'none'",
    `sandbox ${APP_SANDBOX}`,
    toDirective("script-src", ["'self'", "'unsafe-inline'"], resourceDomains),
    toDirective("style-src", ["'self'", "'unsafe-inline'"], resourceDomains),
    toDirective("font-src", ["'self'"], resourceDomains),
    toDirective("img-src", ["'self'", "data:"], resourceDomains),
    toDirective("media-src", ["'self'", "data:"], resourceDomains),
    connectDomains.length > 0 ? `connect-src ${connectDomains.join(" ")}` : "connect-src 'none'",
    frameDomains.length > 0 ? `frame-src ${frameDomains.join(" ")}` : "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    baseUriDomains.length > 0 ? `base-uri ${baseUriDomains.join(" ")}` : "base-uri 'self'"
  ].join("; ");
}
function toDirective(name, trustedSources, domains) {
  return `${name} ${[.../* @__PURE__ */ new Set([...trustedSources, ...domains])].join(" ")}`;
}
function sanitizeCspDomains(domains) {
  if (!Array.isArray(domains)) return [];
  return [...new Set(domains.filter(
    (domain) => typeof domain === "string" && domain.length > 0 && // HTTP headers must be printable ASCII; rejecting all other code points also
    // excludes every C0/C1 control character before Node serializes the policy.
    /^[\x21-\x7E]+$/.test(domain) && !/[;'"]/.test(domain)
  ))];
}
function safeInlineJSON(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function escapeHtml2(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// tool-approval.ts
import { randomUUID as randomUUID2 } from "node:crypto";
init_types();
init_utils();
function isToolCallApprovalRequired(config, serverName, toolMeta, toolMetadata) {
  const definition = config.mcpServers[serverName];
  const serverApproval = definition?.approveTools;
  const approval = serverApproval !== void 0 ? serverApproval : config.settings?.approveTools;
  if (approval === true) return true;
  if (!Array.isArray(approval) || approval.length === 0) return false;
  const prefix = resolveToolPrefix(definition, config.settings?.toolPrefix);
  const currentCandidates = getToolNameCandidates(toolMeta.originalName, serverName, prefix, false);
  if (serverApproval !== void 0) {
    if (matchesToolPattern(currentCandidates, approval)) return true;
    if (!toolMetadata) return matchesToolPattern(getToolNameCandidates(toolMeta.originalName, serverName, prefix), approval);
    const legacyCandidates2 = getToolNameCandidates(toolMeta.originalName, serverName, prefix);
    const legacyEmittedName2 = [...currentCandidates].find((candidate) => candidate !== toolMeta.originalName)?.replace(/-/g, "_");
    if (legacyEmittedName2) legacyCandidates2.add(legacyEmittedName2);
    for (const candidate of currentCandidates) legacyCandidates2.delete(candidate);
    const otherCurrentCandidates2 = /* @__PURE__ */ new Set();
    for (const tool of toolMetadata.get(serverName) ?? []) {
      for (const candidate of getToolNameCandidates(tool.originalName, serverName, prefix, false)) {
        otherCurrentCandidates2.add(candidate);
      }
    }
    for (const candidate of currentCandidates) otherCurrentCandidates2.delete(candidate);
    return approval.some(
      (pattern) => matchesToolPattern(legacyCandidates2, [pattern]) && !matchesToolPattern(otherCurrentCandidates2, [pattern])
    );
  }
  if (matchesToolPattern(currentCandidates, approval)) return true;
  if (!toolMetadata) return false;
  const legacyCandidates = getToolNameCandidates(toolMeta.originalName, serverName, prefix);
  const legacyEmittedName = [...currentCandidates].find((candidate) => candidate !== toolMeta.originalName)?.replace(/-/g, "_");
  if (legacyEmittedName) legacyCandidates.add(legacyEmittedName);
  for (const candidate of currentCandidates) legacyCandidates.delete(candidate);
  const otherCurrentCandidates = /* @__PURE__ */ new Set();
  for (const [name, metadata] of toolMetadata) {
    const otherPrefix = resolveToolPrefix(config.mcpServers[name], config.settings?.toolPrefix);
    for (const tool of metadata) {
      for (const candidate of getToolNameCandidates(tool.originalName, name, otherPrefix, false)) {
        otherCurrentCandidates.add(candidate);
      }
    }
  }
  for (const candidate of currentCandidates) otherCurrentCandidates.delete(candidate);
  return approval.some(
    (pattern) => matchesToolPattern(legacyCandidates, [pattern]) && !matchesToolPattern(otherCurrentCandidates, [pattern])
  );
}
function isMcpToolApprovalDecision(value) {
  return value === "allow_once" || value === "allow_for_session" || value === "deny" || value === "abstain";
}
async function requestBrokerApproval(state, serverName, toolMeta, args, origin, signal) {
  if (!state.approvalEvents) return "abstain";
  let acceptingClaim = true;
  let handler;
  const request = {
    requestId: randomUUID2(),
    serverName,
    originalToolName: toolMeta.originalName,
    prefixedToolName: toolMeta.name,
    args: args ?? {},
    origin,
    ...signal !== void 0 ? { signal } : {},
    claim(candidate) {
      if (!acceptingClaim || handler) return false;
      handler = candidate;
      return true;
    }
  };
  state.approvalEvents.emit(MCP_TOOL_APPROVAL_REQUEST_EVENT, request);
  acceptingClaim = false;
  if (!handler) return "abstain";
  try {
    const decision = await abortable(Promise.resolve().then(handler), signal);
    return isMcpToolApprovalDecision(decision) ? decision : "deny";
  } catch (error) {
    if (signal?.aborted) throw error;
    return "deny";
  }
}
async function ensureToolCallApproved(state, serverName, toolMeta, args, signal, origin = toolMeta.resourceUri ? "resource" : "proxy", approvalMetadata) {
  const cacheKey = `${serverName}\0${toolMeta.originalName}`;
  const approvedToolCalls = state.approvedToolCalls ??= /* @__PURE__ */ new Map();
  if (approvedToolCalls.has(cacheKey)) {
    return { ok: true };
  }
  const brokerDecision = await requestBrokerApproval(state, serverName, toolMeta, args, origin, signal);
  if (brokerDecision === "allow_once") return { ok: true };
  if (brokerDecision === "allow_for_session") {
    approvedToolCalls.set(cacheKey, true);
    return { ok: true };
  }
  if (brokerDecision === "deny") return { ok: false, reason: "denied" };
  if (!isToolCallApprovalRequired(state.config, serverName, toolMeta, approvalMetadata ?? state.toolMetadata)) {
    return { ok: true };
  }
  if (!state.ui) {
    return { ok: false, reason: "approval_required_headless" };
  }
  const json = JSON.stringify(args ?? {}, null, 2);
  const sanitized = sanitizeTerminalText(json);
  const preview = sanitized.length > 500 ? `${sanitized.slice(0, 500)}...` : sanitized;
  const title = `MCP: ${sanitizeTerminalText(serverName)} wants to run ${sanitizeTerminalText(toolMeta.originalName)}`;
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  const decision = await abortable(
    state.ui.select(
      `${title}

Arguments:
${preview}`,
      ["Allow once", "Allow for session", "Deny"]
    ),
    ownedSignal
  );
  if (decision === "Allow once") {
    return { ok: true };
  }
  if (decision === "Allow for session") {
    approvedToolCalls.set(cacheKey, true);
    return { ok: true };
  }
  return { ok: false, reason: "denied" };
}

// ui-server.ts
init_ui_tool_visibility();
init_resource_tools();
init_types();
var MAX_BODY_SIZE = 2 * 1024 * 1024;
var ABANDONED_GRACE_MS = 6e4;
var WATCHDOG_INTERVAL_MS = 5e3;
var MAX_EVENT_LOG = 128;
var MAX_CONTEXT_UPDATES = 20;
var MOSHI_DISCOVERY_PORT_START = 8377;
var MOSHI_DISCOVERY_PORT_END = 8396;
var nextMoshiDiscoveryPort = MOSHI_DISCOVERY_PORT_START;
async function startUiServer(options) {
  const sessionToken = options.sessionToken ?? randomUUID3();
  const uiResourceToken = randomUUID3();
  const log = logger.child({
    component: "UiServer",
    server: options.serverName,
    tool: options.toolName,
    session: sessionToken.slice(0, 8)
  });
  log.debug("Starting UI server");
  const sseClients = /* @__PURE__ */ new Set();
  let completed = false;
  let lastHeartbeatAt = Date.now();
  let watchdog = null;
  let currentDisplayMode = options.hostContext?.displayMode ?? "inline";
  let nextEventId = 1;
  const eventLog = [];
  let streamSummary;
  const sessionMessages = {
    prompts: [],
    notifications: [],
    intents: [],
    contexts: []
  };
  const hostContext = {
    displayMode: currentDisplayMode,
    availableDisplayModes: ["inline", "fullscreen", "pip"],
    platform: "desktop",
    ...options.hostContext
    // Only include toolInfo if caller provides full tool definition with inputSchema
    // The App validates toolInfo.tool.inputSchema as required object
  };
  const initialStreamContext = hostContext["pi-mcp-adapter/stream"];
  if (initialStreamContext && typeof initialStreamContext === "object") {
    const streamId = initialStreamContext.streamId;
    const mode = initialStreamContext.mode;
    if (typeof streamId === "string" && (mode === "eager" || mode === "stream-first")) {
      streamSummary = {
        streamId,
        mode,
        frames: 0,
        phases: []
      };
    }
  }
  const isAppOnlyTool = (toolName) => {
    const toolDefinition = options.manager.getConnection(options.serverName)?.tools?.find((tool) => tool.name === toolName);
    if (!toolDefinition) return false;
    const visibility = extractUiToolVisibility(toolDefinition._meta);
    return isUiToolCallableByApp(visibility) && !isUiToolVisibleToModel(visibility);
  };
  const recordUiMessage = async (msgParams) => {
    const promptText = extractUiPromptText(msgParams);
    if (promptText) {
      sessionMessages.prompts.push(promptText);
      log.debug("UI prompt received", { prompt: promptText.slice(0, 100) });
    } else if (msgParams.type === "intent" || msgParams.intent) {
      const intentName = msgParams.intent ?? "";
      if (intentName) {
        sessionMessages.intents.push({
          intent: intentName,
          ...msgParams.params !== void 0 ? { params: msgParams.params } : {}
        });
        log.debug("UI intent received", { intent: intentName });
      }
    } else if (msgParams.type === "notify" || msgParams.message) {
      const notifyText = msgParams.message ?? "";
      if (notifyText) {
        sessionMessages.notifications.push(notifyText);
        log.debug("UI notification", { message: notifyText.slice(0, 100) });
      }
    }
    await options.onMessage?.(msgParams);
  };
  const touchHeartbeat = () => {
    lastHeartbeatAt = Date.now();
  };
  const updateStreamSummary = (payload) => {
    const envelope = getVisualizationStreamEnvelope(payload?.structuredContent);
    if (!envelope) return;
    if (!streamSummary) {
      streamSummary = {
        streamId: envelope.streamId,
        mode: "eager",
        frames: 0,
        phases: []
      };
    }
    streamSummary.frames += 1;
    if (!streamSummary.phases.includes(envelope.phase)) {
      streamSummary.phases.push(envelope.phase);
    }
    streamSummary.finalStatus = envelope.status;
    if (envelope.message !== void 0) streamSummary.lastMessage = envelope.message;
    else delete streamSummary.lastMessage;
  };
  const serializeEvent = (eventId, name, payload) => {
    return `id: ${eventId}
event: ${name}
data: ${JSON.stringify(payload)}

`;
  };
  const getLatestCheckpointIndex = () => {
    for (let index = eventLog.length - 1; index >= 0; index -= 1) {
      const entry = eventLog[index];
      if (!entry) continue;
      const envelope = getVisualizationStreamEnvelope(entry.payload?.structuredContent);
      if (envelope?.frameType === "checkpoint" || envelope?.frameType === "final") {
        return index;
      }
    }
    return -1;
  };
  const pruneEventLog = () => {
    if (eventLog.length <= MAX_EVENT_LOG) return;
    const latestCheckpointIndex = getLatestCheckpointIndex();
    if (latestCheckpointIndex > 0) {
      eventLog.splice(0, latestCheckpointIndex);
    }
    if (eventLog.length > MAX_EVENT_LOG) {
      eventLog.splice(0, eventLog.length - MAX_EVENT_LOG);
    }
  };
  const pushEvent = (name, payload) => {
    if (completed) return;
    const eventId = nextEventId++;
    eventLog.push({ id: eventId, name, payload });
    updateStreamSummary(payload);
    pruneEventLog();
    const chunk = serializeEvent(eventId, name, payload);
    for (const client of sseClients) {
      try {
        client.write(chunk);
      } catch {
        sseClients.delete(client);
      }
    }
  };
  const replayEvents = (res, lastEventIdHeader) => {
    const parsedLastId = lastEventIdHeader ? Number(lastEventIdHeader) : Number.NaN;
    const eventsToReplay = Number.isFinite(parsedLastId) ? eventLog.filter((entry) => entry.id > parsedLastId) : (() => {
      const latestCheckpointIndex = getLatestCheckpointIndex();
      return latestCheckpointIndex >= 0 ? eventLog.slice(latestCheckpointIndex) : eventLog;
    })();
    for (const entry of eventsToReplay) {
      try {
        res.write(serializeEvent(entry.id, entry.name, entry.payload));
      } catch {
        sseClients.delete(res);
        return;
      }
    }
  };
  const closeSse = () => {
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
      }
    }
    sseClients.clear();
  };
  const stopWatchdog = () => {
    if (!watchdog) return;
    clearInterval(watchdog);
    watchdog = null;
  };
  const markCompleted = (reason) => {
    if (completed) return;
    log.debug("Session completed", { reason });
    pushEvent("session-complete", { reason });
    completed = true;
    stopWatchdog();
    options.onComplete?.(reason);
  };
  const server2 = http.createServer(async (req, res) => {
    try {
      const method = req.method || "GET";
      const hostHeader = req.headers.host;
      const url = new URL(req.url || "/", `http://${hostHeader || "127.0.0.1"}`);
      if (hostHeader !== void 0 && !isAllowedHost(url.hostname)) {
        sendText(res, 403, "Invalid host");
        return;
      }
      if (method === "HEAD" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end();
        return;
      }
      if (method === "GET" && url.pathname === "/") {
        if (!url.searchParams.has("session")) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
          res.end(
            '<!doctype html><html><head><meta charset="utf-8"><title>MCP UI</title></head><body><p>Open the authenticated MCP UI URL shown by Pi.</p></body></html>'
          );
          return;
        }
        if (!validateTokenQuery(url, sessionToken, res)) return;
        touchHeartbeat();
        const html = buildHostHtmlTemplate({
          sessionToken,
          uiResourceToken,
          serverName: options.serverName,
          toolName: options.toolName,
          toolArgs: options.toolArgs,
          resource: options.resource,
          allowAttribute: buildAllowAttribute(options.resource.meta.permissions),
          requireToolConsent: options.consentManager.requiresPrompt(options.serverName),
          cacheToolConsent: options.consentManager.shouldCacheConsent(),
          hostContext
        });
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        });
        res.end(html);
        return;
      }
      if (method === "GET" && url.pathname === "/events") {
        if (!validateTokenQuery(url, sessionToken, res)) return;
        touchHeartbeat();
        log.debug("SSE client connected", { clientCount: sseClients.size + 1 });
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        res.write(": connected\n\n");
        sseClients.add(res);
        replayEvents(res, req.headers["last-event-id"] ? String(req.headers["last-event-id"]) : null);
        req.on("close", () => {
          sseClients.delete(res);
        });
        return;
      }
      if (method === "GET" && url.pathname === "/health") {
        if (!validateTokenQuery(url, sessionToken, res)) return;
        sendJson(res, 200, { ok: true, result: { healthy: true } });
        return;
      }
      if (method === "GET" && url.pathname === "/ui-app") {
        if (!validateTokenQuery(url, uiResourceToken, res, "resource")) return;
        touchHeartbeat();
        const cspContent = buildCspMetaContent(options.resource.meta.csp);
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy": cspContent
        });
        res.end(options.resource.html);
        return;
      }
      if (method === "GET" && url.pathname === "/app-bridge.bundle.js") {
        const bundlePath = path.join(import.meta.dirname, "app-bridge.bundle.js");
        try {
          const content = await fs.readFile(bundlePath, "utf-8");
          res.writeHead(200, {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=31536000"
          });
          res.end(content);
        } catch {
          sendJson(res, 500, { ok: false, error: "Bundle not found" });
        }
        return;
      }
      if (method !== "POST") {
        sendJson(res, 404, { ok: false, error: "Not found" });
        return;
      }
      const body = await parseBody(req, res);
      if (!body) return;
      if (!validateTokenBody(body, sessionToken, res)) return;
      const params = body.params ?? {};
      touchHeartbeat();
      if (url.pathname === "/proxy/tools/call") {
        options.consentManager.ensureApproved(options.serverName);
        const callParams = params;
        if (!callParams || typeof callParams.name !== "string" || !callParams.name.trim()) {
          sendJson(res, 400, { ok: false, error: "Invalid tools/call params" });
          return;
        }
        const connection = options.manager.getConnection(options.serverName);
        if (!connection || connection.status !== "connected") {
          sendJson(res, 503, { ok: false, error: `Server "${options.serverName}" is not connected` });
          return;
        }
        if (isServerDisabled(options.config?.mcpServers[options.serverName]) || isServerDisabled(connection.definition)) {
          sendJson(res, 503, { ok: false, error: `Server "${options.serverName}" is disabled` });
          return;
        }
        const toolDefinitions = Array.isArray(connection.tools) ? connection.tools : [];
        const toolDefinition = toolDefinitions.find((tool) => tool.name === callParams.name);
        if (!toolDefinition) {
          sendJson(res, 403, { ok: false, error: `MCP tool "${callParams.name}" is not callable by apps` });
          return;
        }
        const uiVisibility = extractUiToolVisibility(toolDefinition._meta);
        if (!isUiToolCallableByApp(uiVisibility)) {
          sendJson(res, 403, { ok: false, error: `MCP tool "${callParams.name}" is not callable by apps` });
          return;
        }
        const callArgs = {
          name: callParams.name,
          arguments: callParams.arguments && typeof callParams.arguments === "object" && !Array.isArray(callParams.arguments) ? callParams.arguments : {}
        };
        const toolMeta = {
          name: callParams.name,
          originalName: callParams.name,
          description: toolDefinition?.description ?? "",
          ...toolDefinition?.inputSchema !== void 0 ? { inputSchema: toolDefinition.inputSchema } : {},
          ...uiVisibility !== void 0 ? { uiVisibility } : {}
        };
        const approvalMetadata = new Map(options.state?.toolMetadata);
        const definition = options.config?.mcpServers[options.serverName] ?? options.state?.config.mcpServers[options.serverName];
        approvalMetadata.set(options.serverName, [
          ...connection.tools.map((tool) => ({
            name: tool.name,
            originalName: tool.name,
            description: tool.description ?? ""
          })),
          ...definition?.exposeResources !== false ? (connection.resources ?? []).map((resource) => {
            const originalName = `read_${resourceNameToToolName(resource.name)}`;
            return {
              name: originalName,
              originalName,
              description: resource.description ?? `Read resource: ${resource.uri}`
            };
          }) : []
        ]);
        const approval = options.state ? await ensureToolCallApproved(
          options.state,
          options.serverName,
          toolMeta,
          callArgs.arguments,
          options.state.owner?.signal,
          "iframe",
          approvalMetadata
        ) : options.config && isToolCallApprovalRequired(options.config, options.serverName, toolMeta, approvalMetadata) ? { ok: false, reason: "approval_required_headless" } : { ok: true };
        if (approval.ok === false) {
          const denied = approval.reason === "denied";
          const message = denied ? `The user declined approval to run MCP tool "${callParams.name}" on server "${options.serverName}".` : `MCP tool "${callParams.name}" on server "${options.serverName}" is approval-gated and requires an interactive session.`;
          sendJson(res, 200, {
            ok: true,
            result: {
              content: [{ type: "text", text: message }],
              details: {
                error: denied ? "approval_denied" : "approval_required",
                server: options.serverName,
                tool: callParams.name
              }
            }
          });
          return;
        }
        try {
          options.manager.touch(options.serverName);
          options.manager.incrementInFlight(options.serverName);
          const result = options.config ? await withSessionRecovery(
            {
              manager: options.manager,
              config: options.config,
              ...options.onNeedsAuth ? { onNeedsAuth: options.onNeedsAuth } : {}
            },
            options.serverName,
            (conn) => conn.client.callTool(callArgs, options.manager.getRequestOptions?.(options.serverName))
          ) : await connection.client.callTool(callArgs, options.manager.getRequestOptions?.(options.serverName));
          sendJson(res, 200, { ok: true, result });
        } finally {
          options.manager.decrementInFlight(options.serverName);
          options.manager.touch(options.serverName);
        }
        return;
      }
      if (url.pathname === "/proxy/ui/consent") {
        const approved = !!params.approved;
        options.consentManager.registerDecision(options.serverName, approved);
        sendJson(res, 200, { ok: true, result: { approved } });
        return;
      }
      if (url.pathname === "/proxy/ui/generated-tool-call-intent") {
        const tool = typeof params.tool === "string" ? params.tool : void 0;
        if (tool && isAppOnlyTool(tool)) {
          log.debug("Ignored generated app-only tool call intent", { tool });
        } else {
          await recordUiMessage({
            type: "intent",
            intent: "call_tool",
            params: {
              ...tool !== void 0 ? { tool } : {},
              ...params.arguments !== void 0 ? { arguments: params.arguments } : {},
              ...params.isError !== void 0 ? { isError: params.isError } : {}
            }
          });
        }
        sendJson(res, 200, { ok: true, result: {} });
        return;
      }
      if (url.pathname === "/proxy/ui/message") {
        await recordUiMessage(params);
        sendJson(res, 200, { ok: true, result: {} });
        return;
      }
      if (url.pathname === "/proxy/ui/context") {
        const content = params.content;
        const structuredContent = params.structuredContent;
        if (content !== void 0 && (!Array.isArray(content) || content.some((block) => !ContentBlockSchema.safeParse(block).success)) || structuredContent !== void 0 && (!structuredContent || typeof structuredContent !== "object" || Array.isArray(structuredContent))) {
          sendJson(res, 400, { ok: false, error: "Invalid update-model-context params" });
          return;
        }
        const ctxParams = {
          ...content !== void 0 ? { content } : {},
          ...structuredContent !== void 0 ? { structuredContent } : {}
        };
        const update = createUiModelContextUpdate(ctxParams);
        if (update) {
          sessionMessages.contexts.push(update);
          while (sessionMessages.contexts.length > MAX_CONTEXT_UPDATES) {
            sessionMessages.contexts.shift();
          }
        }
        log.debug("UI context update", { hasContent: !!ctxParams.content, hasUpdate: !!update });
        await options.onContextUpdate?.(ctxParams);
        sendJson(res, 200, { ok: true, result: {} });
        return;
      }
      if (url.pathname === "/proxy/ui/open-link") {
        const openParams = params;
        if (!openParams?.url || typeof openParams.url !== "string") {
          sendJson(res, 400, { ok: false, error: "Invalid open-link params" });
          return;
        }
        let result = {};
        try {
          new URL(openParams.url);
        } catch {
          result = { isError: true };
        }
        sendJson(res, 200, { ok: true, result });
        return;
      }
      if (url.pathname === "/proxy/ui/download-file") {
        sendJson(res, 200, { ok: true, result: { isError: true } });
        return;
      }
      if (url.pathname === "/proxy/ui/request-display-mode") {
        const displayParams = params;
        const requested = displayParams?.mode;
        const available = hostContext.availableDisplayModes ?? ["inline"];
        if (requested && available.includes(requested)) {
          currentDisplayMode = requested;
        }
        hostContext.displayMode = currentDisplayMode;
        pushEvent("host-context", { displayMode: currentDisplayMode });
        const result = { mode: currentDisplayMode };
        sendJson(res, 200, { ok: true, result });
        return;
      }
      if (url.pathname === "/proxy/ui/heartbeat") {
        sendJson(res, 200, { ok: true, result: {} });
        return;
      }
      if (url.pathname === "/proxy/ui/complete") {
        const reason = typeof params.reason === "string" ? params.reason : "done";
        markCompleted(reason);
        sendJson(res, 200, { ok: true, result: {} });
        setTimeout(() => {
          try {
            server2.close();
          } catch {
          }
          closeSse();
        }, 20).unref();
        return;
      }
      sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (error) {
      if (error instanceof SessionRecoveryAuthRequiredError) {
        const fallback = `Server "${options.serverName}" requires OAuth authentication. Run mcp({ action: "auth-start", server: "${options.serverName}" }) to get a browser URL, or /mcp-auth ${options.serverName} in an interactive local session.`;
        const message = error.authMessage ?? (options.config ? formatAuthRequiredMessage(options.config, options.serverName, fallback) : fallback);
        sendJson(res, 401, { ok: false, error: message });
        return;
      }
      const wrapped = wrapError(error, { server: options.serverName, tool: options.toolName });
      const status = /approval required|denied/i.test(wrapped.message) ? 403 : 500;
      if (status === 500) {
        log.error("Request handler error", error instanceof Error ? error : void 0);
      }
      sendJson(res, status, { ok: false, error: wrapped.message });
    }
  });
  if (options.initialResultPromise) {
    options.initialResultPromise.then(
      (result) => pushEvent("tool-result", result),
      (error) => {
        const reason = error instanceof Error ? error.message : String(error);
        pushEvent("tool-cancelled", { reason });
      }
    );
  }
  watchdog = setInterval(() => {
    if (completed) return;
    if (Date.now() - lastHeartbeatAt <= ABANDONED_GRACE_MS) return;
    markCompleted("stale");
    try {
      server2.close();
    } catch {
    }
    closeSse();
  }, WATCHDOG_INTERVAL_MS);
  watchdog.unref();
  return new Promise((resolve6, reject) => {
    const candidates = resolvePortCandidates(options.port);
    let candidateIndex = 0;
    const listen = () => {
      server2.once("error", onError);
      server2.listen(candidates[candidateIndex], "127.0.0.1", onListening);
    };
    const onError = (error) => {
      server2.off("listening", onListening);
      if (error.code === "EADDRINUSE" && candidateIndex < candidates.length - 1) {
        candidateIndex += 1;
        listen();
        return;
      }
      log.error("Failed to start server", error);
      const port = candidates[candidateIndex];
      reject(new ServerError(error.message, {
        ...port !== void 0 ? { port } : {},
        cause: error
      }));
    };
    const onListening = () => {
      server2.off("error", onError);
      const address = server2.address();
      if (!address || typeof address === "string") {
        const err = new ServerError("invalid address");
        log.error("Invalid server address", err);
        reject(err);
        return;
      }
      log.debug("Server started", { port: address.port });
      rememberMoshiDiscoveryPort(address.port);
      const handle = {
        url: `http://localhost:${address.port}/?session=${sessionToken}`,
        port: address.port,
        sessionToken,
        serverName: options.serverName,
        toolName: options.toolName,
        close: (reason) => {
          markCompleted(reason ?? "closed");
          try {
            server2.close();
          } catch {
          }
          closeSse();
        },
        sendToolInput: (args) => {
          pushEvent("tool-input", { arguments: args });
        },
        sendToolResult: (result) => {
          pushEvent("tool-result", result);
        },
        sendResultPatch: (result) => {
          pushEvent("result-patch", result);
        },
        sendToolCancelled: (reason) => {
          pushEvent("tool-cancelled", { reason });
        },
        sendHostContext: (context) => {
          Object.assign(hostContext, context);
          pushEvent("host-context", context);
        },
        getSessionMessages: () => ({ ...sessionMessages }),
        getStreamSummary: () => streamSummary ? { ...streamSummary, phases: [...streamSummary.phases] } : void 0
      };
      resolve6(handle);
    };
    listen();
  });
}
async function parseBody(req, res) {
  try {
    const body = await readBody(req);
    if (!body || typeof body !== "object") {
      sendJson(res, 400, { ok: false, error: "Invalid request body" });
      return null;
    }
    return body;
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "Invalid body" });
    return null;
  }
}
function readBody(req) {
  return new Promise((resolve6, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve6(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
function resolvePortCandidates(port) {
  if (port !== void 0) return [port];
  const candidates = [];
  const count = MOSHI_DISCOVERY_PORT_END - MOSHI_DISCOVERY_PORT_START + 1;
  for (let offset = 0; offset < count; offset += 1) {
    const candidate = MOSHI_DISCOVERY_PORT_START + (nextMoshiDiscoveryPort - MOSHI_DISCOVERY_PORT_START + offset) % count;
    candidates.push(candidate);
  }
  candidates.push(0);
  return candidates;
}
function rememberMoshiDiscoveryPort(port) {
  if (port < MOSHI_DISCOVERY_PORT_START || port > MOSHI_DISCOVERY_PORT_END) return;
  nextMoshiDiscoveryPort = port >= MOSHI_DISCOVERY_PORT_END ? MOSHI_DISCOVERY_PORT_START : port + 1;
}
function isAllowedHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
function validateTokenQuery(url, expected, res, parameter = "session") {
  const token = url.searchParams.get(parameter);
  if (token !== expected) {
    sendJson(res, 403, { ok: false, error: "Invalid session" });
    return false;
  }
  return true;
}
function validateTokenBody(body, expected, res) {
  if (body.token !== expected) {
    sendJson(res, 403, { ok: false, error: "Invalid session" });
    return false;
  }
  return true;
}
function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}
function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(text);
}

// glimpse-ui.ts
import { existsSync as existsSync8 } from "node:fs";
import { execFileSync } from "node:child_process";
import { join as join8, dirname as dirname7 } from "node:path";
import { platform as platform2 } from "node:os";
import { createRequire as createRequire2 } from "node:module";
var glimpseAvailable = null;
var resolvedBinaryPath = null;
function isGlimpseAvailable() {
  if (glimpseAvailable !== null) return glimpseAvailable;
  if (platform2() !== "darwin") {
    glimpseAvailable = false;
    return false;
  }
  resolvedBinaryPath = getGlimpseBinaryPath();
  glimpseAvailable = resolvedBinaryPath !== null;
  return glimpseAvailable;
}
function getGlimpseBinaryPath() {
  if (process.env.GLIMPSE_BINARY && existsSync8(process.env.GLIMPSE_BINARY)) {
    return process.env.GLIMPSE_BINARY;
  }
  try {
    const require4 = createRequire2(import.meta.url);
    const glimpseuiPath = require4.resolve("glimpseui");
    const binaryPath = join8(dirname7(glimpseuiPath), "glimpse");
    if (existsSync8(binaryPath)) return binaryPath;
  } catch {
  }
  try {
    const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf-8" }).trim();
    const binaryPath = join8(globalRoot, "glimpseui", "src", "glimpse");
    if (existsSync8(binaryPath)) return binaryPath;
  } catch {
  }
  return null;
}
async function openGlimpseWindow(html, options) {
  const modulePath = resolvedBinaryPath ? join8(dirname7(resolvedBinaryPath), "glimpse.mjs") : "glimpseui";
  const glimpse = await import(modulePath);
  let active = true;
  const win = glimpse.open(html, {
    width: options.width ?? 900,
    height: options.height ?? 700,
    title: options.title
  });
  win.on("closed", () => {
    if (!active) return;
    active = false;
    options.onClosed();
  });
  return {
    close: () => {
      if (!active) return;
      active = false;
      win.close();
    }
  };
}

// ui-session.ts
var activeGlimpseWindow = null;
function summarizeUiSessionResult(uiSession) {
  if (!uiSession) {
    return {
      message: "Interactive UI was unavailable; returning the tool result inline.",
      uiOpen: false
    };
  }
  if (!uiSession.windowOpen) {
    const action = uiSession.reused ? "Updated the suppressed MCP UI session." : "MCP UI window was suppressed.";
    return {
      message: `${action} Open manually: ${uiSession.url}`,
      uiOpen: false,
      uiViewer: uiSession.viewer,
      uiUrl: uiSession.url
    };
  }
  return {
    message: uiSession.reused ? "Updated the open UI." : "Interactive UI is open. I'll respond to your prompts and intents as you interact with it.",
    uiOpen: true,
    uiViewer: uiSession.viewer,
    uiUrl: uiSession.url
  };
}
var MAX_COMPLETED_SESSIONS = 10;
function withStreamEnvelope(result, streamId, sequence) {
  if (!streamId) {
    return result;
  }
  const structuredContent = result.structuredContent && typeof result.structuredContent === "object" && !Array.isArray(result.structuredContent) ? { ...result.structuredContent } : {};
  const rawEnvelope = structuredContent[UI_STREAM_STRUCTURED_CONTENT_KEY];
  const envelope = rawEnvelope && typeof rawEnvelope === "object" && !Array.isArray(rawEnvelope) ? { ...rawEnvelope } : {
    frameType: "final",
    phase: "settled",
    status: result.isError ? "error" : "ok"
  };
  structuredContent[UI_STREAM_STRUCTURED_CONTENT_KEY] = {
    ...envelope,
    streamId,
    sequence
  };
  return {
    ...result,
    structuredContent
  };
}
async function openInBrowser(state, url, signal) {
  throwIfAborted(signal);
  try {
    await state.openBrowser(url);
    throwIfAborted(signal);
    return null;
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (state.owner?.isActive() === false) return null;
    state.ui?.notify(`MCP UI browser open failed: ${message}`, "warning");
    return message;
  }
}
function isRemoteSession() {
  return Boolean(process.env.SSH_CONNECTION || process.env.SSH_TTY);
}
function hasActiveRemoteLogin() {
  return new Promise((resolve6) => {
    execFile("who", { encoding: "utf8", timeout: 2e3 }, (error, out) => {
      if (error) {
        resolve6(false);
        return;
      }
      resolve6(/\(.+\)\s*$/m.test(out));
    });
  });
}
function probeMoshiGateway() {
  return new Promise((resolve6) => {
    const socket = net.connect({ host: "127.0.0.1", port: 24543 });
    const done = (ok) => {
      socket.destroy();
      resolve6(ok);
    };
    socket.setTimeout(300);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}
function remoteAccessHint(opts) {
  const lines = [
    opts.openError !== null ? "Couldn't open MCP UI here. Open it from your own device:" : opts.openedOnHost ? "MCP UI opened on this host. If you're controlling this session remotely, open it from your own device:" : "This looks like a remote session - if no MCP UI appeared, open it from your own device:",
    `  ${opts.url}`
  ];
  if (opts.openError !== null) {
    lines.push(`Browser launch failed: ${opts.openError}`);
  }
  if (opts.moshi) {
    lines.push("Moshi: tap the preview button in the terminal title bar and pick this MCP UI server.");
  }
  lines.push(
    `SSH: run \`ssh -L ${opts.port}:127.0.0.1:${opts.port} <this-host>\` on your local machine, then open the URL above.`,
    "mosh can't forward ports - run that ssh command in a separate terminal."
  );
  return lines.join("\n");
}
async function maybeStartUiSession(state, request) {
  const log = logger.child({
    component: "UiSession",
    server: request.serverName,
    tool: request.toolName
  });
  const runtimeSignal = combineAbortSignals(state.owner?.signal, request.signal) ?? new AbortController().signal;
  try {
    throwIfAborted(runtimeSignal);
    if (state.uiServer && state.uiServer.serverName === request.serverName && state.uiServer.toolName === request.toolName) {
      const existingHandle = state.uiServer;
      const streamMode2 = request.streamMode;
      const streamId2 = streamMode2 ? randomUUID4() : void 0;
      const streamToken2 = streamMode2 ? randomUUID4() : void 0;
      let active2 = true;
      let nextStreamSequence2 = 0;
      const cleanupStreamListener2 = () => {
        if (streamToken2) {
          state.manager.removeUiStreamListener(streamToken2);
        }
      };
      existingHandle.sendToolInput(request.toolArgs);
      if (streamToken2) {
        state.manager.registerUiStreamListener(streamToken2, (serverName, notification) => {
          if (!active2 || state.uiServer !== existingHandle) return;
          if (serverName !== request.serverName) return;
          nextStreamSequence2 += 1;
          existingHandle.sendResultPatch(
            withStreamEnvelope(notification.result, streamId2, nextStreamSequence2)
          );
        });
      }
      return {
        serverName: request.serverName,
        toolName: request.toolName,
        reused: true,
        ...streamId2 !== void 0 ? { streamId: streamId2 } : {},
        ...streamToken2 !== void 0 ? { streamToken: streamToken2 } : {},
        ...streamMode2 !== void 0 ? { streamMode: streamMode2 } : {},
        ...streamToken2 ? { requestMeta: { [UI_STREAM_REQUEST_META_KEY]: streamToken2 } } : {},
        url: existingHandle.url,
        viewer: existingHandle.viewer ?? "browser",
        windowOpen: existingHandle.windowOpen ?? true,
        isActive: () => active2 && state.uiServer === existingHandle,
        sendToolResult: (result) => {
          if (!active2 || state.uiServer !== existingHandle) return;
          nextStreamSequence2 += 1;
          existingHandle.sendToolResult(withStreamEnvelope(result, streamId2, nextStreamSequence2));
        },
        sendResultPatch: (result) => {
          if (!active2 || state.uiServer !== existingHandle) return;
          nextStreamSequence2 += 1;
          existingHandle.sendResultPatch(withStreamEnvelope(result, streamId2, nextStreamSequence2));
        },
        sendToolCancelled: (reason) => {
          if (!active2 || state.uiServer !== existingHandle) return;
          nextStreamSequence2 += 1;
          existingHandle.sendToolResult(
            withStreamEnvelope(
              {
                isError: true,
                content: [{ type: "text", text: reason }]
              },
              streamId2,
              nextStreamSequence2
            )
          );
        },
        close: () => {
          active2 = false;
          cleanupStreamListener2();
        }
      };
    }
    const resource = await state.uiResourceHandler.readUiResource(request.serverName, request.uiResourceUri, {
      config: state.config,
      signal: runtimeSignal,
      onNeedsAuth: request.onNeedsAuth
    });
    throwIfAborted(runtimeSignal);
    if (state.uiServer) {
      state.uiServer.close("replaced");
      state.uiServer = null;
    }
    if (activeGlimpseWindow) {
      activeGlimpseWindow.close();
      activeGlimpseWindow = null;
    }
    const streamMode = request.streamMode;
    const streamId = streamMode ? randomUUID4() : void 0;
    const streamToken = streamMode ? randomUUID4() : void 0;
    const hostContext = streamMode && streamId ? {
      [UI_STREAM_HOST_CONTEXT_KEY]: {
        mode: streamMode,
        streamId,
        intermediateResultPatches: streamMode === "stream-first",
        partialInput: false
      }
    } : void 0;
    let active = true;
    let nextStreamSequence = 0;
    let handle;
    const cleanupStreamListener = () => {
      if (streamToken) {
        state.manager.removeUiStreamListener(streamToken);
      }
    };
    handle = await startUiServer({
      serverName: request.serverName,
      toolName: request.toolName,
      toolArgs: streamMode === "stream-first" ? {} : request.toolArgs,
      resource,
      manager: state.manager,
      config: state.config,
      state,
      ...request.onNeedsAuth ? { onNeedsAuth: request.onNeedsAuth } : {},
      consentManager: state.consentManager,
      ...hostContext !== void 0 ? { hostContext } : {},
      onMessage: (params) => {
        const prompt = extractUiPromptText(params);
        if (prompt) {
          if (state.sendMessage) {
            state.sendMessage(
              {
                customType: "mcp-ui-prompt",
                content: [{ type: "text", text: `User sent prompt from ${request.serverName} UI: "${prompt}"` }],
                display: `\u{1F4AC} UI Prompt: ${prompt}`,
                details: { server: request.serverName, tool: request.toolName, prompt }
              },
              { triggerTurn: true }
            );
            log.debug("Triggered agent turn for UI prompt", { prompt: prompt.slice(0, 50) });
          }
        } else if (params.type === "intent" || params.intent) {
          const intent = params.intent ?? "";
          const intentParams = params.params;
          if (intent && state.sendMessage) {
            const paramsStr = intentParams ? ` ${JSON.stringify(intentParams)}` : "";
            state.sendMessage(
              {
                customType: "mcp-ui-intent",
                content: [{ type: "text", text: `User triggered intent from ${request.serverName} UI: ${intent}${paramsStr}` }],
                display: `\u{1F3AF} UI Intent: ${intent}`,
                details: { server: request.serverName, tool: request.toolName, intent, params: intentParams }
              },
              { triggerTurn: true }
            );
            log.debug("Triggered agent turn for UI intent", { intent });
          }
        } else if (params.type === "notify" || params.message) {
          const text = params.message ?? "";
          if (text && state.ui) {
            state.ui.notify(`[${request.serverName}] ${text}`, "info");
          }
        }
      },
      onContextUpdate: (params) => {
        const update = createUiModelContextUpdate(params);
        log.debug("Model context update from UI", {
          hasContent: !!params.content,
          hasStructured: !!params.structuredContent,
          hasUpdate: !!update
        });
        if (update && state.sendMessage) {
          state.sendMessage(
            {
              customType: "mcp-ui-context",
              content: [{ type: "text", text: `User submitted model context from ${request.serverName} UI:
${update.summary}` }],
              display: "UI Context submitted",
              details: { server: request.serverName, tool: request.toolName, context: update }
            },
            { triggerTurn: true }
          );
        }
      },
      onComplete: (reason) => {
        active = false;
        cleanupStreamListener();
        if (state.uiServer === handle) {
          const messages = handle.getSessionMessages();
          const stream = handle.getStreamSummary();
          const hasContent = messages.prompts.length > 0 || messages.intents.length > 0 || messages.notifications.length > 0 || messages.contexts.length > 0 || !!stream;
          if (hasContent) {
            state.completedUiSessions.push({
              serverName: handle.serverName,
              toolName: handle.toolName,
              completedAt: /* @__PURE__ */ new Date(),
              reason,
              messages,
              ...stream !== void 0 ? { stream } : {}
            });
            while (state.completedUiSessions.length > MAX_COMPLETED_SESSIONS) {
              state.completedUiSessions.shift();
            }
            log.debug("Session completed", {
              reason,
              prompts: messages.prompts.length,
              intents: messages.intents.length,
              notifications: messages.notifications.length,
              contexts: messages.contexts.length,
              streamFrames: stream?.frames ?? 0
            });
          }
          state.uiServer = null;
          if (activeGlimpseWindow) {
            activeGlimpseWindow.close();
            activeGlimpseWindow = null;
          }
        }
      }
    });
    if (state.owner?.isActive() === false || runtimeSignal.aborted) {
      handle.close("runtime_owner_stopped");
      throwIfAborted(runtimeSignal);
      throw new Error("MCP UI session became stale before registration");
    }
    if (streamToken) {
      state.manager.registerUiStreamListener(streamToken, (serverName, notification) => {
        if (!active || state.uiServer !== handle) return;
        if (serverName !== request.serverName) return;
        nextStreamSequence += 1;
        handle.sendResultPatch(withStreamEnvelope(notification.result, streamId, nextStreamSequence));
      });
    }
    state.uiServer = handle;
    const viewerPref = process.env.MCP_UI_VIEWER?.toLowerCase();
    const uiSuppressed = viewerPref === "none" || viewerPref === "off" || viewerPref === "disabled";
    let viewer = "browser";
    let windowOpen = true;
    const remoteByEnv = isRemoteSession();
    if (uiSuppressed) {
      viewer = "suppressed";
      windowOpen = false;
      state.ui?.notify(`MCP UI window suppressed (MCP_UI_VIEWER=${viewerPref}). Open manually: ${handle.url}`, "info");
      log.info("Suppressing MCP UI window (MCP_UI_VIEWER=" + viewerPref + ")", { url: handle.url });
    } else {
      const remoteLikely = remoteByEnv || await hasActiveRemoteLogin();
      const emitRemoteHint = async (openError, openedOnHost = false) => {
        state.ui?.notify(remoteAccessHint({
          url: handle.url,
          port: handle.port,
          moshi: await probeMoshiGateway(),
          openError,
          openedOnHost
        }), openError === null ? "info" : "warning");
      };
      const glimpseDetected = !remoteByEnv && isGlimpseAvailable();
      const useGlimpse = !remoteByEnv && (viewerPref === "glimpse" || viewerPref !== "browser" && glimpseDetected);
      if (useGlimpse) {
        try {
          const glimpseHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;width:100vw;height:100vh;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${handle.url}"></iframe></body></html>`;
          const glimpseWindow = await openGlimpseWindow(glimpseHtml, {
            title: `MCP \xB7 ${request.serverName} \xB7 ${request.toolName}`,
            width: 1e3,
            height: 800,
            onClosed: () => {
              if (active) handle.close("glimpse-closed");
            }
          });
          if (state.owner?.isActive() === false || runtimeSignal.aborted) {
            glimpseWindow.close();
            throwIfAborted(runtimeSignal);
            throw new Error("MCP Glimpse window became stale before registration");
          }
          activeGlimpseWindow = glimpseWindow;
          viewer = "glimpse";
          if (remoteLikely) {
            await emitRemoteHint(null, true);
          }
        } catch (error) {
          log.debug("Glimpse unavailable, using browser", {
            error: error instanceof Error ? error.message : String(error)
          });
          const openError = await openInBrowser(state, handle.url, runtimeSignal);
          if (openError !== null || remoteLikely) {
            await emitRemoteHint(openError);
          }
          viewer = "browser";
        }
      } else {
        const openError = await openInBrowser(state, handle.url, runtimeSignal);
        if (openError !== null || remoteLikely) {
          await emitRemoteHint(openError);
        }
      }
    }
    throwIfAborted(runtimeSignal);
    handle.viewer = viewer;
    handle.windowOpen = windowOpen;
    return {
      serverName: request.serverName,
      toolName: request.toolName,
      reused: false,
      ...streamId !== void 0 ? { streamId } : {},
      ...streamToken !== void 0 ? { streamToken } : {},
      ...streamMode !== void 0 ? { streamMode } : {},
      ...streamToken ? { requestMeta: { [UI_STREAM_REQUEST_META_KEY]: streamToken } } : {},
      url: handle.url,
      viewer,
      windowOpen,
      isActive: () => active && state.uiServer === handle,
      sendToolResult: (result) => {
        if (!active || state.uiServer !== handle) return;
        nextStreamSequence += 1;
        handle.sendToolResult(withStreamEnvelope(result, streamId, nextStreamSequence));
      },
      sendResultPatch: (result) => {
        if (!active || state.uiServer !== handle) return;
        nextStreamSequence += 1;
        handle.sendResultPatch(withStreamEnvelope(result, streamId, nextStreamSequence));
      },
      sendToolCancelled: (reason) => {
        if (!active || state.uiServer !== handle) return;
        handle.sendToolCancelled(reason);
      },
      close: (reason) => {
        active = false;
        cleanupStreamListener();
        handle.close(reason);
      }
    };
  } catch (error) {
    if (error instanceof UrlElicitationRequiredError2 || isAbortError(error, runtimeSignal)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    log.error("Failed to start UI session", error instanceof Error ? error : void 0);
    state.ui?.notify(
      `MCP UI unavailable for ${request.toolName} (${request.serverName}): ${message}`,
      "warning"
    );
    return null;
  }
}

// direct-tools.ts
init_types();
init_ui_tool_visibility();
init_resource_tools();
init_utils();
var BUILTIN_NAMES = /* @__PURE__ */ new Set(["read", "bash", "edit", "write", "grep", "find", "ls", "mcp"]);
var INSTRUCTIONS_SNIPPET_LENGTH = 150;
var DIRECT_TOOLS_ADVISORY_THRESHOLD = 75;
function getDirectAuthRequiredMessage(state, serverName, defaultMessage = `MCP server "${serverName}" requires OAuth authentication. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`) {
  return formatAuthRequiredMessage(state.config, serverName, defaultMessage);
}
function getDirectAuthFailedMessage(state, serverName, message) {
  const customGuidance = state.config.settings?.authRequiredMessage;
  if (customGuidance) {
    return `OAuth authentication failed for "${serverName}": ${message}. ${getDirectAuthRequiredMessage(state, serverName)}`;
  }
  return `OAuth authentication failed for "${serverName}": ${message}. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`;
}
async function attemptDirectAutoAuth(state, serverName, signal) {
  if (state.config.settings?.autoAuth !== true) {
    return { status: "skipped" };
  }
  const definition = state.config.mcpServers[serverName];
  if (!definition || isServerDisabled(definition) || !supportsOAuth(definition)) {
    return { status: "skipped" };
  }
  let serverUrl;
  try {
    serverUrl = resolveServerUrl(definition);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "failed", message: getDirectAuthFailedMessage(state, serverName, message) };
  }
  if (!serverUrl) {
    return { status: "skipped" };
  }
  const grantType = definition.oauth ? definition.oauth.grantType ?? "authorization_code" : "authorization_code";
  if (!state.ui && grantType !== "client_credentials") {
    return {
      status: "failed",
      message: getDirectAuthRequiredMessage(
        state,
        serverName,
        `MCP server "${serverName}" requires OAuth authentication. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`
      )
    };
  }
  try {
    if (state.authStorageOptions) {
      await authenticate(
        serverName,
        serverUrl,
        definition,
        signal ? { authStorageOptions: state.authStorageOptions, signal, runtime: state.oauthRuntime } : { authStorageOptions: state.authStorageOptions, runtime: state.oauthRuntime }
      );
    } else {
      await authenticate(serverName, serverUrl, definition, {
        ...signal ? { signal } : {},
        runtime: state.oauthRuntime
      });
    }
    return { status: "success" };
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      message: getDirectAuthFailedMessage(state, serverName, message)
    };
  }
}
function resolveDirectTools(config, cache, prefix, envOverride) {
  const specs = [];
  if (!cache) return specs;
  const seenNames = /* @__PURE__ */ new Set();
  const envSelection = envOverride ? parseDirectToolSelectors(envOverride) : null;
  const globalDirect = config.settings?.directTools;
  for (const [serverName, definition] of Object.entries(config.mcpServers)) {
    if (isServerDisabled(definition)) continue;
    const serverCache = cache.servers[serverName];
    if (!serverCache || !isServerCacheValid(serverCache, definition)) continue;
    let toolFilter = false;
    if (envSelection) {
      if (envSelection.servers.has(serverName)) {
        toolFilter = true;
      } else if (envSelection.tools.has(serverName)) {
        toolFilter = [...envSelection.tools.get(serverName)];
      }
    } else {
      if (definition.directTools !== void 0) {
        toolFilter = definition.directTools;
      } else if (globalDirect) {
        toolFilter = globalDirect;
      }
    }
    if (!toolFilter) continue;
    const effectivePrefix = resolveToolPrefix(definition, prefix);
    const hasToolFilters = Array.isArray(definition.includeTools) && definition.includeTools.length > 0 || Array.isArray(definition.excludeTools) && definition.excludeTools.length > 0;
    const selectorCandidateIndex = hasToolFilters ? (() => {
      const candidates = /* @__PURE__ */ new Set();
      for (const [otherServerName, otherDefinition] of Object.entries(config.mcpServers)) {
        const otherCache = cache.servers[otherServerName];
        if (!otherCache || !isServerCacheValid(otherCache, otherDefinition) || isServerDisabled(otherDefinition)) continue;
        const otherPrefix = resolveToolPrefix(otherDefinition, prefix);
        for (const otherTool of otherCache.tools ?? []) {
          if (!isUiToolVisibleToModel(otherTool.uiVisibility)) continue;
          for (const candidate of getToolNameCandidates(otherTool.name, otherServerName, otherPrefix, false)) candidates.add(candidate);
        }
        if (otherDefinition.exposeResources !== false) {
          for (const resource of otherCache.resources ?? []) {
            const baseName = `read_${resourceNameToToolName(resource.name)}`;
            for (const candidate of getToolNameCandidates(baseName, otherServerName, otherPrefix, false)) candidates.add(candidate);
          }
        }
      }
      return createToolSelectorCandidateIndex(candidates);
    })() : void 0;
    for (const tool of serverCache.tools ?? []) {
      if (!isUiToolVisibleToModel(tool.uiVisibility)) continue;
      if (toolFilter !== true && !toolFilter.includes(tool.name)) continue;
      if (!isToolAllowed(tool.name, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) continue;
      const prefixedName = formatToolName(tool.name, serverName, effectivePrefix);
      if (BUILTIN_NAMES.has(prefixedName)) {
        console.warn(`MCP: skipping direct tool "${prefixedName}" (collides with builtin)`);
        continue;
      }
      if (seenNames.has(prefixedName)) {
        console.warn(`MCP: skipping duplicate direct tool "${prefixedName}" from "${serverName}"`);
        continue;
      }
      seenNames.add(prefixedName);
      specs.push({
        serverName,
        originalName: tool.name,
        prefixedName,
        description: tool.description ?? "",
        ...tool.inputSchema !== void 0 ? { inputSchema: tool.inputSchema } : {},
        ...tool.uiResourceUri !== void 0 ? { uiResourceUri: tool.uiResourceUri } : {},
        ...tool.uiStreamMode !== void 0 ? { uiStreamMode: tool.uiStreamMode } : {}
      });
    }
    if (definition.exposeResources !== false) {
      for (const resource of serverCache.resources ?? []) {
        const baseName = `read_${resourceNameToToolName(resource.name)}`;
        if (toolFilter !== true && !toolFilter.includes(baseName)) continue;
        if (!isToolAllowed(baseName, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)) continue;
        const prefixedName = formatToolName(baseName, serverName, effectivePrefix);
        if (BUILTIN_NAMES.has(prefixedName)) {
          console.warn(`MCP: skipping direct resource tool "${prefixedName}" (collides with builtin)`);
          continue;
        }
        if (seenNames.has(prefixedName)) {
          console.warn(`MCP: skipping duplicate direct resource tool "${prefixedName}" from "${serverName}"`);
          continue;
        }
        seenNames.add(prefixedName);
        specs.push({
          serverName,
          originalName: baseName,
          prefixedName,
          description: resource.description ?? `Read resource: ${resource.uri}`,
          resourceUri: resource.uri
        });
      }
    }
  }
  if (config.settings?.warnOnLargeDirectTools !== false && specs.length >= DIRECT_TOOLS_ADVISORY_THRESHOLD) {
    console.warn(`MCP: ${specs.length} direct tools resolved. Each direct tool adds prompt context; README guidance recommends targeted sets of 5-20 tools and using the proxy or an explicit string[] when 75+ direct tools would be registered.`);
  }
  return specs;
}
function buildProxyDescription(config, cache, directSpecs) {
  const prefix = config.settings?.toolPrefix ?? "server";
  let desc = `MCP gateway \u2014 server status, tool search/describe, auth, and single MCP tool calls. When one request needs several MCP calls with logic between them, use mcpScript. Non-MCP Pi tools should be called directly, not through mcp.
`;
  const directByServer = /* @__PURE__ */ new Map();
  for (const spec of directSpecs) {
    directByServer.set(spec.serverName, (directByServer.get(spec.serverName) ?? 0) + 1);
  }
  if (directByServer.size > 0) {
    const parts = [...directByServer.entries()].map(
      ([server2, count]) => `${server2} (${count})`
    );
    desc += `
Direct tools available (call as normal tools): ${parts.join(", ")}
`;
  }
  const serverSummaries = [];
  for (const serverName of Object.keys(config.mcpServers)) {
    const definition = config.mcpServers[serverName];
    if (!definition || isServerDisabled(definition)) continue;
    const cachedEntry = cache?.servers?.[serverName];
    const entry = cachedEntry && isServerCacheValid(cachedEntry, definition) ? cachedEntry : void 0;
    const effectivePrefix = resolveToolPrefix(definition, prefix);
    const hasToolFilters = Array.isArray(definition.includeTools) && definition.includeTools.length > 0 || Array.isArray(definition.excludeTools) && definition.excludeTools.length > 0;
    const selectorCandidateIndex = hasToolFilters && cache ? (() => {
      const candidates = /* @__PURE__ */ new Set();
      for (const [otherServerName, otherDefinition] of Object.entries(config.mcpServers)) {
        const otherEntry = cache.servers[otherServerName];
        if (!otherEntry || !isServerCacheValid(otherEntry, otherDefinition) || isServerDisabled(otherDefinition)) continue;
        const otherPrefix = resolveToolPrefix(otherDefinition, prefix);
        for (const otherTool of otherEntry.tools ?? []) {
          if (!isUiToolVisibleToModel(otherTool.uiVisibility)) continue;
          for (const candidate of getToolNameCandidates(otherTool.name, otherServerName, otherPrefix, false)) candidates.add(candidate);
        }
        if (otherDefinition.exposeResources !== false) {
          for (const resource of otherEntry.resources ?? []) {
            const baseName = `read_${resourceNameToToolName(resource.name)}`;
            for (const candidate of getToolNameCandidates(baseName, otherServerName, otherPrefix, false)) candidates.add(candidate);
          }
        }
      }
      return createToolSelectorCandidateIndex(candidates);
    })() : void 0;
    const toolCount = (entry?.tools ?? []).filter(
      (tool) => isUiToolVisibleToModel(tool.uiVisibility) && isToolAllowed(tool.name, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex)
    ).length;
    const resourceCount = definition?.exposeResources !== false ? (entry?.resources ?? []).filter((resource) => {
      const baseName = `read_${resourceNameToToolName(resource.name)}`;
      return isToolAllowed(baseName, serverName, effectivePrefix, definition.includeTools, definition.excludeTools, selectorCandidateIndex);
    }).length : 0;
    const totalItems = toolCount + resourceCount;
    if (totalItems === 0) continue;
    const directCount = directByServer.get(serverName) ?? 0;
    const proxyCount = totalItems - directCount;
    if (proxyCount > 0) {
      serverSummaries.push(`${serverName} (${proxyCount} tools)`);
    }
  }
  if (serverSummaries.length > 0) {
    desc += `
Servers: ${serverSummaries.join(", ")}
`;
  }
  const disabledServers = Object.entries(config.mcpServers).filter(([, definition]) => isServerDisabled(definition)).map(([serverName]) => serverName);
  if (disabledServers.length > 0) {
    desc += `
Disabled servers (enable with /mcp enable <server> and /reload): ${disabledServers.join(", ")}
`;
  }
  const instructionSummaries = [];
  for (const serverName of Object.keys(config.mcpServers)) {
    if (isServerDisabled(config.mcpServers[serverName])) continue;
    const definition = config.mcpServers[serverName];
    const entry = definition && cache?.servers?.[serverName];
    const instructions = entry && definition && isServerCacheValid(entry, definition) ? entry.instructions : void 0;
    if (!instructions) continue;
    const snippet = truncateAtWord(instructions.replace(/\s+/g, " ").trim(), INSTRUCTIONS_SNIPPET_LENGTH);
    instructionSummaries.push(`  ${serverName}: ${snippet}`);
  }
  if (instructionSummaries.length > 0) {
    desc += `
Server instructions (truncated - full text via mcp({ instructions: "name" })):
${instructionSummaries.join("\n")}
`;
  }
  desc += `
Usage:
`;
  desc += `  mcp({ })                              \u2192 Show server status
`;
  desc += `  mcp({ server: "name" })               \u2192 List tools from server
`;
  desc += `  mcp({ search: "query" })              \u2192 Search MCP tools by name/description
`;
  desc += `  mcp({ describe: "tool_name" })        \u2192 Show tool details and parameters
`;
  desc += `  mcp({ instructions: "name" })         \u2192 Show full server usage instructions
`;
  desc += `  mcp({ connect: "server-name" })       \u2192 Connect to a server and refresh metadata
`;
  desc += `  mcp({ tool: "name", args: { key: "value" } })         \u2192 Call a tool (object args; JSON string also accepted)
`;
  desc += `  mcp({ action: "ui-messages" })        \u2192 Retrieve accumulated messages from completed UI sessions
`;
  desc += `  mcp({ action: "auth-start", server: "name" })      \u2192 Start manual OAuth and get a browser URL
`;
  desc += `  mcp({ action: "auth-complete", server: "name", args: { redirectUrl: "..." } }) \u2192 Complete manual OAuth
`;
  desc += `
Mode: action > tool (call) > connect > describe > instructions > search > server (list) > nothing (status)`;
  return desc;
}
function createDirectToolExecutor(getState, getInitPromise, spec) {
  return async function execute(_toolCallId, params, signal) {
    throwIfAborted(signal);
    let state = getState();
    const initPromise = getInitPromise();
    if (!state && initPromise) {
      try {
        state = await initPromise;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `MCP initialization failed: ${message}` }],
          details: { error: "init_failed", message }
        };
      }
    }
    if (!state) {
      return {
        content: [{ type: "text", text: "MCP not initialized" }],
        details: { error: "not_initialized" }
      };
    }
    const definition = state.config.mcpServers[spec.serverName];
    if (isServerDisabled(definition)) {
      const message = `MCP server "${spec.serverName}" is disabled. Run /mcp enable ${spec.serverName} and /reload to enable it.`;
      return {
        content: [{ type: "text", text: message }],
        details: { error: "server_disabled", server: spec.serverName, message }
      };
    }
    const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
    throwIfAborted(ownedSignal);
    let connected = await lazyConnect(state, spec.serverName, ownedSignal);
    let autoAuthAttempted = false;
    if (!connected && state.manager.getConnection(spec.serverName)?.status === "needs-auth") {
      autoAuthAttempted = true;
      const autoAuth = await attemptDirectAutoAuth(state, spec.serverName, ownedSignal);
      if (autoAuth.status === "failed") {
        return {
          content: [{ type: "text", text: autoAuth.message }],
          details: { error: "auth_required", server: spec.serverName, message: autoAuth.message }
        };
      }
      if (autoAuth.status === "success") {
        await state.manager.close(spec.serverName);
        clearFailure(state, spec.serverName);
        connected = await lazyConnect(state, spec.serverName, ownedSignal);
      }
    }
    if (!connected) {
      const authConnection = state.manager.getConnection(spec.serverName);
      if (authConnection?.status === "needs-auth") {
        const message = getDirectAuthRequiredMessage(state, spec.serverName);
        return {
          content: [{ type: "text", text: message }],
          details: { error: "auth_required", server: spec.serverName, message, autoAuthAttempted }
        };
      }
      const failedAgo = getFailureAgeSeconds(state, spec.serverName);
      return {
        content: [{ type: "text", text: `MCP server "${spec.serverName}" not available${failedAgo !== null ? ` (failed ${failedAgo}s ago)` : ""}` }],
        details: { error: "server_unavailable", server: spec.serverName }
      };
    }
    const connection = state.manager.getConnection(spec.serverName);
    if (!connection || connection.status !== "connected") {
      return {
        content: [{ type: "text", text: `MCP server "${spec.serverName}" not connected` }],
        details: { error: "not_connected", server: spec.serverName }
      };
    }
    const approval = await ensureToolCallApproved(state, spec.serverName, {
      name: spec.prefixedName,
      originalName: spec.originalName,
      description: spec.description,
      ...spec.inputSchema !== void 0 ? { inputSchema: spec.inputSchema } : {},
      ...spec.resourceUri !== void 0 ? { resourceUri: spec.resourceUri } : {},
      ...spec.uiResourceUri !== void 0 ? { uiResourceUri: spec.uiResourceUri } : {},
      ...spec.uiStreamMode !== void 0 ? { uiStreamMode: spec.uiStreamMode } : {}
    }, params, ownedSignal, spec.resourceUri ? "resource" : "direct");
    if (approval.ok === false) {
      const denied = approval.reason === "denied";
      const message = denied ? `The user declined approval to run MCP tool "${spec.originalName}" on server "${spec.serverName}".` : `MCP tool "${spec.originalName}" on server "${spec.serverName}" is approval-gated and requires an interactive session.`;
      return {
        content: [{ type: "text", text: message }],
        details: {
          error: denied ? "approval_denied" : "approval_required",
          server: spec.serverName,
          tool: spec.originalName
        }
      };
    }
    let uiSession = null;
    const requestOptions = state.manager.getRequestOptions?.(spec.serverName, ownedSignal) ?? (ownedSignal ? { signal: ownedSignal } : void 0);
    const outputGuardOptions = resolveMcpOutputGuardOptions(state.config.settings);
    const recoverAuthConnection = async () => {
      const current = state.manager.getConnection(spec.serverName);
      if (current?.status === "connected") return current;
      if (!autoAuthAttempted) {
        autoAuthAttempted = true;
        const autoAuth = await attemptDirectAutoAuth(state, spec.serverName, ownedSignal);
        if (autoAuth.status === "failed") {
          throw new SessionRecoveryAuthRequiredError(spec.serverName, autoAuth.message);
        }
        if (autoAuth.status === "success") {
          const afterAuth = state.manager.getConnection(spec.serverName);
          if (afterAuth?.status === "connected") return afterAuth;
          if (afterAuth?.status === "needs-auth") {
            await state.manager.close(spec.serverName);
          }
          clearFailure(state, spec.serverName);
          const reconnected = await lazyConnect(state, spec.serverName, ownedSignal);
          return reconnected ? state.manager.getConnection(spec.serverName) : void 0;
        }
      }
      return state.manager.getConnection(spec.serverName);
    };
    try {
      state.manager.touch(spec.serverName);
      state.manager.incrementInFlight(spec.serverName);
      if (spec.resourceUri) {
        const result2 = await withSessionRecovery(
          {
            manager: state.manager,
            config: state.config,
            ...ownedSignal ? { signal: ownedSignal } : {},
            onNeedsAuth: recoverAuthConnection
          },
          spec.serverName,
          (conn) => conn.client.readResource({ uri: spec.resourceUri }, requestOptions)
        );
        const content2 = transformMcpResourceContents(result2.contents ?? [], state.owner?.signal);
        const guarded2 = await guardMcpOutput(content2.length > 0 ? content2 : [{ type: "text", text: "(empty resource)" }], outputGuardOptions);
        return {
          content: guarded2.content,
          details: { server: spec.serverName, resourceUri: spec.resourceUri, ...guardedMcpDetails(guarded2) }
        };
      }
      const hasUi = !!spec.uiResourceUri;
      uiSession = hasUi ? await maybeStartUiSession(state, {
        serverName: spec.serverName,
        toolName: spec.originalName,
        toolArgs: params ?? {},
        uiResourceUri: spec.uiResourceUri,
        ...spec.uiStreamMode !== void 0 ? { streamMode: spec.uiStreamMode } : {},
        ...signal ? { signal } : {},
        onNeedsAuth: recoverAuthConnection
      }) : null;
      const result = await withSessionRecovery(
        {
          manager: state.manager,
          config: state.config,
          ...ownedSignal ? { signal: ownedSignal } : {},
          onNeedsAuth: recoverAuthConnection
        },
        spec.serverName,
        (conn) => abortable(conn.client.callTool({
          name: spec.originalName,
          arguments: params ?? {},
          _meta: uiSession?.requestMeta
        }, requestOptions), ownedSignal)
      );
      uiSession?.sendToolResult(result);
      if (result.isError) {
        const mcpContent = result.content ?? [];
        const content2 = transformMcpContent(mcpContent, state.owner?.signal);
        const outputContent2 = content2.length > 0 ? content2 : [{ type: "text", text: "(empty result)" }];
        const schemaText = spec.inputSchema ? `

Expected parameters:
${formatSchema(spec.inputSchema)}` : "";
        const guarded2 = await guardMcpOutput(outputContent2, { ...outputGuardOptions, prefix: "Error: ", suffix: schemaText, emptyTextFallback: "Tool execution failed" });
        return {
          content: guarded2.content,
          details: { error: "tool_error", server: spec.serverName, ...guardedMcpDetails(guarded2) }
        };
      }
      const content = resolveMcpResultContent(result, state.owner?.signal);
      const outputContent = content.length > 0 ? content : [{ type: "text", text: "(empty result)" }];
      if (hasUi) {
        const uiSummary = summarizeUiSessionResult(uiSession);
        const guarded2 = await guardMcpOutput(outputContent, { ...outputGuardOptions, suffix: `

${uiSummary.message}` });
        return {
          content: guarded2.content,
          details: {
            server: spec.serverName,
            tool: spec.originalName,
            uiOpen: uiSummary.uiOpen,
            uiViewer: uiSummary.uiViewer,
            uiUrl: uiSummary.uiUrl,
            ...guardedMcpDetails(guarded2)
          }
        };
      }
      const guarded = await guardMcpOutput(outputContent, { ...outputGuardOptions });
      return {
        content: guarded.content,
        details: { server: spec.serverName, tool: spec.originalName, ...guardedMcpDetails(guarded) }
      };
    } catch (error) {
      if (error instanceof SessionRecoveryAuthRequiredError) {
        const message2 = error.authMessage ?? getDirectAuthRequiredMessage(state, spec.serverName);
        uiSession?.sendToolCancelled(message2);
        return {
          content: [{ type: "text", text: message2 }],
          details: { error: "auth_required", server: spec.serverName, message: message2, autoAuthAttempted }
        };
      }
      if (error instanceof UrlElicitationRequiredError3) {
        const action = await state.manager.handleUrlElicitationRequired(spec.serverName, error);
        const message2 = action === "accept" ? "The original MCP tool did not run. Complete the opened browser interaction, then retry the tool." : `The URL interaction was ${action === "decline" ? "declined" : "cancelled"}.`;
        uiSession?.sendToolCancelled(message2);
        return {
          content: [{ type: "text", text: message2 }],
          details: { error: "url_elicitation_required", server: spec.serverName, action }
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      uiSession?.sendToolCancelled(message);
      const schemaText = spec.inputSchema ? `

Expected parameters:
${formatSchema(spec.inputSchema)}` : "";
      const guarded = await guardMcpOutput([{ type: "text", text: message }], { ...outputGuardOptions, prefix: "Failed to call tool: ", suffix: schemaText });
      return {
        content: guarded.content,
        details: { error: isAbortError(error, ownedSignal) ? "aborted" : "call_failed", server: spec.serverName, ...guardedMcpDetails(guarded) }
      };
    } finally {
      if (uiSession?.reused) {
        uiSession.close();
      }
      state.manager.decrementInFlight(spec.serverName);
      state.manager.touch(spec.serverName);
    }
  };
}

// index.ts
init_metadata_cache();

// prompts.ts
init_types();
init_types();
init_metadata_cache();
init_utils();
function resolveCachedPrompts(config) {
  const cache = loadMetadataCache();
  if (!cache?.servers) return [];
  const prefix = config.settings?.toolPrefix ?? "server";
  const specs = [];
  for (const [serverName, entry] of Object.entries(cache.servers)) {
    const definition = config.mcpServers[serverName];
    if (!definition || isServerDisabled(definition)) continue;
    if (!entry?.prompts?.length || !isServerCacheValid(entry, definition)) continue;
    specs.push(...reconstructPromptMetadata(serverName, entry.prompts, prefix, definition));
  }
  return specs;
}
function parsePromptArgs(input) {
  const positional = [];
  const named = {};
  const tokens = tokenizeArgs(input);
  for (const token of tokens) {
    const eq = findUnquotedEquals(token);
    if (eq > 0) {
      const key = token.slice(0, eq).trim();
      const value = stripQuotes(token.slice(eq + 1).trim());
      if (key) {
        named[key] = value;
        continue;
      }
    }
    positional.push(stripQuotes(token));
  }
  return { positional, named };
}
function tokenizeArgs(input) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;
  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}
function findUnquotedEquals(token) {
  let quote = null;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "=") return i;
  }
  return -1;
}
function stripQuotes(value) {
  if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'")) && value.endsWith(value.charAt(0))) {
    return value.slice(1, -1);
  }
  return value;
}
function resolvePromptArgs(metadata, parsed) {
  const args = {};
  const declared = metadata.arguments;
  let positionalIndex = 0;
  for (const argDef of declared) {
    const value = parsed.named[argDef.name] ?? parsed.positional[positionalIndex++];
    if (value !== void 0 && value !== "") {
      args[argDef.name] = value;
    }
  }
  for (const [key, value] of Object.entries(parsed.named)) {
    if (!(key in args)) args[key] = value;
  }
  const missing = declared.filter((a) => a.required && (args[a.name] === void 0 || args[a.name] === ""));
  if (missing.length > 0) {
    return { ok: false, error: buildUsageMessage(metadata, missing) };
  }
  return { ok: true, args };
}
function buildUsageMessage(metadata, missing) {
  const usage = metadata.arguments.map((a) => a.required ? `<${a.name}>` : `[${a.name}]`).join(" ");
  const missingList = missing.map((a) => a.name).join(", ");
  return `Missing required argument${missing.length > 1 ? "s" : ""}: ${missingList}.
Usage: /${metadata.commandName} ${usage}`.trim();
}
function formatPromptResult(result) {
  const lines = [];
  for (const message of result.messages) {
    const text = extractMessageText(message);
    if (!text) continue;
    if (message.role === "user" && result.messages.length === 1) {
      lines.push(text);
    } else {
      lines.push(`[${message.role}] ${text}`);
    }
  }
  return lines.join("\n\n").trim();
}
function extractMessageText(message) {
  const content = message.content;
  if (!content || typeof content !== "object") return "";
  switch (content.type) {
    case "text":
      return content.text ?? "";
    case "resource": {
      const resource = content.resource;
      if (!resource) return "";
      if ("text" in resource && typeof resource.text === "string") {
        return `[resource ${resource.uri}]
${resource.text}`;
      }
      return `[resource ${resource.uri}]`;
    }
    case "resource_link":
      return `[resource_link ${content.uri ?? ""}${content.name ? ` \u2014 ${content.name}` : ""}]`;
    case "image":
      return `[image ${content.mimeType ?? "unknown"}${content.data ? " (embedded)" : ""}]`;
    case "audio":
      return `[audio ${content.mimeType ?? "unknown"}]`;
    default:
      return "";
  }
}
function createPromptCommand(pi, getState, metadata) {
  const description = buildCommandDescription(metadata);
  return {
    description,
    handler: async (args, ctx) => {
      const state = getState();
      if (!state) {
        if (ctx.hasUI) ctx.ui.notify("MCP not initialized", "error");
        return;
      }
      const liveMetadata = findLivePromptMetadata(state, metadata.serverName, metadata.originalName);
      if (state.promptMetadataLive?.has(metadata.serverName) && !liveMetadata) {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `MCP prompt "${metadata.originalName}" is no longer advertised by server "${metadata.serverName}". Run /mcp reconnect to refresh.`,
            "error"
          );
        }
        return;
      }
      const live = liveMetadata ?? metadata;
      const parsed = parsePromptArgs(args ?? "");
      const resolved = resolvePromptArgs(live, parsed);
      if (!resolved.ok) {
        if (ctx.hasUI) ctx.ui.notify(resolved.error ?? "Invalid prompt arguments", "error");
        return;
      }
      const promptArgs = resolved.args ?? {};
      if (!state.config.mcpServers[metadata.serverName]) {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `MCP prompt "${live.originalName}" is no longer configured. Run /mcp reconnect to refresh.`,
            "error"
          );
        }
        return;
      }
      const connected = await lazyConnect(state, metadata.serverName, ctx.signal);
      if (!connected) {
        if (ctx.hasUI) {
          const conn = state.manager.getConnection(metadata.serverName);
          const message = conn?.status === "needs-auth" ? `MCP server "${metadata.serverName}" needs authentication. Run /mcp-auth ${metadata.serverName}.` : `MCP server "${metadata.serverName}" is not available. Run /mcp reconnect ${metadata.serverName}.`;
          ctx.ui.notify(message, "error");
        }
        return;
      }
      const refreshed = findLivePromptMetadata(state, metadata.serverName, metadata.originalName);
      if (state.promptMetadataLive?.has(metadata.serverName) && !refreshed) {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `MCP prompt "${metadata.originalName}" is no longer advertised by server "${metadata.serverName}". Run /mcp reconnect to refresh.`,
            "error"
          );
        }
        return;
      }
      const dispatchMetadata = refreshed ?? live;
      let result;
      try {
        result = await state.manager.getPrompt(
          metadata.serverName,
          dispatchMetadata.originalName,
          Object.keys(promptArgs).length > 0 ? promptArgs : void 0,
          ctx.signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`MCP prompt "${live.originalName}" on ${metadata.serverName} failed: ${message}`);
        if (ctx.hasUI) {
          ctx.ui.notify(`MCP prompt "${live.originalName}" failed: ${message}`, "error");
        }
        return;
      }
      const text = formatPromptResult(result);
      if (!text) {
        if (ctx.hasUI) {
          ctx.ui.notify(`MCP prompt "${live.originalName}" returned no text content.`, "warning");
        }
        return;
      }
      pi.sendUserMessage(text);
    }
  };
}
function findLivePromptMetadata(state, serverName, originalName) {
  return state.promptMetadata?.get(serverName)?.find((p) => p.originalName === originalName);
}
function buildCommandDescription(metadata) {
  const base = metadata.description || metadata.title || `MCP prompt from ${metadata.serverName}`;
  return truncateAtWord(`MCP: ${base}`, 120) || `MCP prompt from ${metadata.serverName}`;
}

// proxy-modes.ts
init_types();
import { UrlElicitationRequiredError as UrlElicitationRequiredError4 } from "@modelcontextprotocol/client";
import { createRequire as createRequire3 } from "node:module";

// ts-shape.ts
var UNSUPPORTED_KEYWORDS = ["if", "then", "else", "allOf", "not", "patternProperties", "additionalProperties"];
function renderTsShape(inputSchema) {
  try {
    if (!isSchema(inputSchema)) return null;
    const definitions = /* @__PURE__ */ new Map();
    for (const key of ["$defs", "definitions"]) {
      const rawDefinitions = inputSchema[key];
      if (rawDefinitions === void 0) continue;
      if (!isSchema(rawDefinitions)) return null;
      for (const [name, definition] of Object.entries(rawDefinitions)) {
        if (!isSchema(definition)) return null;
        definitions.set(`${key}/${decodePointerToken(name)}`, definition);
      }
    }
    const aliases = /* @__PURE__ */ new Map();
    const usedAliases = /* @__PURE__ */ new Set();
    let aliasIndex = 0;
    const aliasFor = (definitionKey) => {
      let alias = aliases.get(definitionKey);
      if (alias) return alias;
      const name = definitionKey.slice(definitionKey.indexOf("/") + 1);
      alias = /^[A-Za-z_$][\w$]*$/.test(name) && !usedAliases.has(name) ? name : `Definition${++aliasIndex}`;
      while (usedAliases.has(alias)) alias = `Definition${++aliasIndex}`;
      aliases.set(definitionKey, alias);
      usedAliases.add(alias);
      return alias;
    };
    const render = (schema) => {
      if (!isSchema(schema) || hasUnsupportedKeyword(schema)) return null;
      if ("$ref" in schema) {
        if (typeof schema.$ref !== "string") return null;
        const match = schema.$ref.match(/^#\/(\$defs|definitions)\/([^/]+)$/);
        if (!match) return null;
        const definitionGroup = match[1];
        const definitionName = match[2];
        if (definitionGroup === void 0 || definitionName === void 0) return null;
        const definitionKey = `${definitionGroup}/${decodePointerToken(definitionName)}`;
        if (!definitions.has(definitionKey)) return null;
        return aliasFor(definitionKey);
      }
      if (Array.isArray(schema.enum)) {
        const values = schema.enum.map(renderLiteral);
        return values.every((value) => value !== null) ? values.join(" | ") : null;
      }
      if (Object.hasOwn(schema, "const")) return renderLiteral(schema.const);
      if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
        const variants = schema.anyOf ?? schema.oneOf;
        if (variants.length === 0) return null;
        const rendered = variants.map(render);
        return rendered.every((value) => value !== null) ? rendered.join(" | ") : null;
      }
      if (schema.type === "object" || schema.properties !== void 0) {
        if (schema.properties === void 0) return "{}";
        if (!isSchema(schema.properties)) return null;
        const required = new Set(Array.isArray(schema.required) ? schema.required.filter((name) => typeof name === "string") : []);
        const properties = [];
        for (const [name, property] of Object.entries(schema.properties)) {
          const rendered = render(property);
          if (rendered === null) return null;
          properties.push(`${formatPropertyName(name)}${required.has(name) ? "" : "?"}: ${rendered};`);
        }
        return properties.length === 0 ? "{}" : `{ ${properties.join(" ")} }`;
      }
      if (schema.type === "array") {
        if (schema.items === void 0) return "unknown[]";
        const item = render(schema.items);
        return item === null ? null : `${needsParentheses(item) ? `(${item})` : item}[]`;
      }
      if (Array.isArray(schema.type)) {
        const types = schema.type.map(renderType);
        return types.every((type) => type !== null) ? types.join(" | ") : null;
      }
      if (typeof schema.type === "string") return renderType(schema.type);
      return "unknown";
    };
    const root = render(inputSchema);
    if (root === null) return null;
    const definitionsText = [];
    for (const [key, alias] of aliases) {
      const definition = definitions.get(key);
      if (!definition) return null;
      const rendered = render(definition);
      if (rendered === null) return null;
      definitionsText.push(`type ${alias} = ${rendered};`);
    }
    return definitionsText.length > 0 ? `${definitionsText.join("\n")}

${root}` : root;
  } catch {
    return null;
  }
}
function isSchema(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasUnsupportedKeyword(schema) {
  return UNSUPPORTED_KEYWORDS.some((keyword) => {
    if (!Object.hasOwn(schema, keyword)) return false;
    return keyword !== "additionalProperties" || schema.additionalProperties !== false;
  });
}
function decodePointerToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
function renderType(type) {
  switch (type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "object":
      return "{}";
    case "array":
      return "unknown[]";
    default:
      return null;
  }
}
function renderLiteral(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}
function formatPropertyName(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}
function needsParentheses(type) {
  return type.includes(" | ");
}

// proxy-modes.ts
init_metadata_cache();
init_utils();

// search-ranking.ts
init_types();
var MIN_STEM_LENGTH = 4;
var FIELD_WEIGHTS = {
  name: 12,
  originalName: 10,
  server: 8,
  description: 5,
  keywords: 5
};
function resolveSearchKeywords(definition, toolOriginalName, serverName, globalPrefix) {
  const map = definition?.searchKeywords;
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  const candidates = getToolNameCandidates(toolOriginalName, serverName, resolveToolPrefix(definition, globalPrefix));
  const keywords = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [pattern, values] of Object.entries(map)) {
    if (!Array.isArray(values)) continue;
    if (!matchesToolPattern(candidates, [pattern])) continue;
    for (const value of values) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      keywords.push(trimmed);
    }
  }
  return keywords;
}
function normalizeSearchText(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_./:-]+/g, " ").toLowerCase();
}
function tokenize(value) {
  return normalizeSearchText(value).split(/[^a-z0-9]+/).filter(Boolean);
}
function scoreToolMatch(tool, server2, query, keywords) {
  const normalizedQuery = normalizeSearchText(query).trim();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;
  const fields = {
    name: normalizeSearchText(tool.name),
    originalName: normalizeSearchText(tool.originalName),
    server: normalizeSearchText(server2),
    description: normalizeSearchText(tool.description)
  };
  let score = 0;
  let phraseMatched = false;
  let wholeFieldExact = false;
  const matchedTokens = /* @__PURE__ */ new Set();
  for (const [field, value] of Object.entries(fields)) {
    const weight = FIELD_WEIGHTS[field];
    const fieldTokens = tokenize(value);
    if (value === normalizedQuery) {
      score += weight * 14;
      phraseMatched = true;
      wholeFieldExact = true;
    } else if (value.startsWith(normalizedQuery)) {
      score += weight * 9;
      phraseMatched = true;
    } else if (value.includes(normalizedQuery)) {
      score += weight * 6;
      phraseMatched = true;
    }
    for (const token of queryTokens) {
      if (fieldTokens.includes(token)) {
        score += weight * 4;
        matchedTokens.add(token);
      } else if (fieldTokens.some((fieldToken) => fieldToken.startsWith(token) || fieldToken.length >= MIN_STEM_LENGTH && token.startsWith(fieldToken))) {
        score += weight * 2;
        matchedTokens.add(token);
      } else if (value.includes(token)) {
        score += weight;
        matchedTokens.add(token);
      }
    }
  }
  if (keywords !== void 0 && keywords.length > 0) {
    const weight = FIELD_WEIGHTS.keywords;
    const phrases = keywords.map((keyword) => normalizeSearchText(keyword).trim()).filter(Boolean);
    let phraseScore = 0;
    for (const phrase of phrases) {
      if (phrase === normalizedQuery) {
        phraseScore = Math.max(phraseScore, weight * 14);
        phraseMatched = true;
        wholeFieldExact = true;
      } else if (phrase.startsWith(normalizedQuery)) {
        phraseScore = Math.max(phraseScore, weight * 9);
        phraseMatched = true;
      } else if (phrase.includes(normalizedQuery)) {
        phraseScore = Math.max(phraseScore, weight * 6);
        phraseMatched = true;
      }
    }
    score += phraseScore;
    const keywordTokens = phrases.flatMap(tokenize);
    for (const token of queryTokens) {
      if (keywordTokens.includes(token)) {
        score += weight * 4;
        matchedTokens.add(token);
      } else if (keywordTokens.some((keywordToken) => keywordToken.startsWith(token) || keywordToken.length >= MIN_STEM_LENGTH && token.startsWith(keywordToken))) {
        score += weight * 2;
        matchedTokens.add(token);
      } else if (phrases.some((phrase) => phrase.includes(token))) {
        score += weight;
        matchedTokens.add(token);
      }
    }
  }
  const coverage = matchedTokens.size / queryTokens.length;
  if (!phraseMatched && (queryTokens.length <= 2 ? coverage !== 1 : coverage < 0.6)) return null;
  score += coverage === 1 ? 25 : Math.round(coverage * 10);
  const firstQueryToken = queryTokens[0];
  if (firstQueryToken !== void 0 && tokenize(fields.name).includes(firstQueryToken)) score += 8;
  if (wholeFieldExact) score += 20;
  return score;
}
function rankToolMatches(state, query, server2, includeKeywords = true) {
  const matches = [];
  const globalPrefix = state.config.settings?.toolPrefix ?? "server";
  for (const [serverName, metadata] of state.toolMetadata.entries()) {
    if (server2 && serverName !== server2) continue;
    const definition = state.config.mcpServers[serverName];
    if (isServerDisabled(definition)) continue;
    const hasKeywords = includeKeywords && definition?.searchKeywords !== void 0;
    for (const tool of metadata) {
      const keywords = hasKeywords ? resolveSearchKeywords(definition, tool.originalName, serverName, globalPrefix) : void 0;
      const score = scoreToolMatch(tool, serverName, query, keywords);
      if (score !== null) matches.push({ server: serverName, tool, score });
    }
  }
  return matches.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
}
function paginate(items, offset, limit) {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit)) : 1;
  const total = items.length;
  const page2 = items.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + page2.length;
  return {
    items: page2,
    total,
    hasMore: nextOffset < total,
    nextOffset: nextOffset < total ? nextOffset : null
  };
}
function rankSuggestions(state, name, limit) {
  const stripped = Object.keys(state.config.mcpServers).flatMap((server2) => ["server", "short", "mcp"].map((prefix) => getServerPrefix(server2, prefix))).filter((candidate) => Boolean(candidate) && name.startsWith(`${candidate}_`)).sort((a, b) => b.length - a.length).map((candidate) => name.slice(candidate.length + 1));
  const query = stripped[0] ?? name;
  return rankToolMatches(state, query, void 0, false).slice(0, limit).map((match) => match.tool.name);
}

// proxy-modes.ts
var require3 = createRequire3(import.meta.url);
var MAX_REGEX_SEARCH_QUERY_LENGTH = 256;
var INSTRUCTIONS_PREVIEW_LENGTH = 300;
var REGEX_SAFETY_CHECK_PARAMS = {
  attackTimeout: 50,
  incubationTimeout: 50,
  timeout: 250
};
function getToolMatches(metadata, toolName, exact) {
  if (!metadata) return [];
  if (exact) return metadata.filter((tool) => tool.name === toolName);
  const normalizedName = toolName.replace(/-/g, "_");
  return metadata.filter((tool) => tool.name.replace(/-/g, "_") === normalizedName);
}
function getEnabledToolMatches(state, toolName, exact) {
  const matches = [];
  for (const [server2, metadata] of state.toolMetadata) {
    if (isServerDisabled(state.config.mcpServers[server2])) continue;
    for (const tool of getToolMatches(metadata, toolName, exact)) matches.push({ server: server2, tool });
  }
  return matches;
}
function getSingleToolMatch(metadata, toolName) {
  const exactMatches = getToolMatches(metadata, toolName, true);
  const matches = exactMatches.length > 0 ? exactMatches : getToolMatches(metadata, toolName, false);
  return matches.length > 1 ? "ambiguous" : matches[0];
}
function ambiguousToolResult(mode, toolName) {
  const message = `Tool "${toolName}" matches multiple servers. Specify a server.`;
  return {
    content: [{ type: "text", text: message }],
    details: { mode, error: "ambiguous_tool", requestedTool: toolName, message }
  };
}
function disabledResult(mode, serverName) {
  const message = `Server "${serverName}" is disabled. Run /mcp enable ${serverName} and /reload to enable it.`;
  return {
    content: [{ type: "text", text: message }],
    details: { mode, error: "server_disabled", server: serverName, message }
  };
}
function getAuthRequiredMessage(state, serverName, defaultMessage = `Server "${serverName}" requires OAuth authentication. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`) {
  return formatAuthRequiredMessage(state.config, serverName, defaultMessage);
}
function getAuthFailedMessage(state, serverName, message) {
  const customGuidance = state.config.settings?.authRequiredMessage;
  if (customGuidance) {
    return `OAuth authentication failed for "${serverName}": ${message}. ${getAuthRequiredMessage(state, serverName)}`;
  }
  return `OAuth authentication failed for "${serverName}": ${message}. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`;
}
function getRedirectPort(authorizationUrl) {
  try {
    const redirectUri = new URL(authorizationUrl).searchParams.get("redirect_uri");
    if (!redirectUri) return void 0;
    const port = Number.parseInt(new URL(redirectUri).port, 10);
    return Number.isInteger(port) ? port : void 0;
  } catch {
    return void 0;
  }
}
function formatManualAuthInstructions(serverName, authorizationUrl) {
  const port = getRedirectPort(authorizationUrl);
  const portNote = port ? `
The redirect URL will use local port ${port}. On a remote server it is expected for that localhost page to fail locally; copy the address bar URL anyway.` : "";
  return [
    `MCP OAuth required for "${serverName}".`,
    "",
    "Open this URL in your local browser:",
    "",
    authorizationUrl,
    "",
    "After approving, copy the full redirected localhost URL from your browser address bar and send it back with:",
    `mcp({ action: "auth-complete", server: "${serverName}", args: { redirectUrl: "PASTE_REDIRECT_URL_HERE" } })`,
    "",
    'You can also pass just the `code` query parameter as `args: { code: "PASTE_CODE_HERE" }`. JSON-string args remain supported.',
    portNote.trimEnd()
  ].filter(Boolean).join("\n");
}
async function attemptAutoAuth(state, serverName, signal) {
  if (state.config.settings?.autoAuth !== true) {
    return { status: "skipped" };
  }
  const definition = state.config.mcpServers[serverName];
  if (!definition || isServerDisabled(definition) || !supportsOAuth(definition)) {
    return { status: "skipped" };
  }
  let serverUrl;
  try {
    serverUrl = resolveServerUrl(definition);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "failed", message: getAuthFailedMessage(state, serverName, message) };
  }
  if (!serverUrl) {
    return { status: "skipped" };
  }
  const grantType = definition.oauth ? definition.oauth.grantType ?? "authorization_code" : "authorization_code";
  if (!state.ui && grantType !== "client_credentials") {
    return {
      status: "failed",
      message: getAuthRequiredMessage(
        state,
        serverName,
        `Server "${serverName}" requires OAuth authentication. Run mcp({ action: "auth-start", server: "${serverName}" }) to get a browser URL, or /mcp-auth ${serverName} in an interactive local session.`
      )
    };
  }
  try {
    if (state.authStorageOptions) {
      await authenticate(
        serverName,
        serverUrl,
        definition,
        signal ? { authStorageOptions: state.authStorageOptions, signal, runtime: state.oauthRuntime } : { authStorageOptions: state.authStorageOptions, runtime: state.oauthRuntime }
      );
    } else {
      if (signal) {
        await authenticate(serverName, serverUrl, definition, { signal, runtime: state.oauthRuntime });
      } else {
        await authenticate(serverName, serverUrl, definition, { runtime: state.oauthRuntime });
      }
    }
    return { status: "success" };
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      message: getAuthFailedMessage(state, serverName, message)
    };
  }
}
function executeUiMessages(state) {
  const sessions = state.completedUiSessions;
  if (sessions.length === 0) {
    return {
      content: [{ type: "text", text: "No UI session messages available." }],
      details: { sessions: 0 }
    };
  }
  const output = [];
  output.push(`UI Session Messages (${sessions.length} session${sessions.length > 1 ? "s" : ""}):
`);
  const allPrompts = [];
  const allIntents = sessions.flatMap((session) => session.messages.intents);
  const allContexts = sessions.flatMap((session) => session.messages.contexts);
  const parsedHandoffs = [];
  for (const session of sessions) {
    const timestamp = session.completedAt.toLocaleTimeString();
    output.push(`
## ${session.serverName} / ${session.toolName} (${timestamp}, ${session.reason})`);
    const plainPrompts = [];
    for (const prompt of session.messages.prompts) {
      allPrompts.push(prompt);
      const handoff = parseUiPromptHandoff(prompt);
      if (handoff) {
        parsedHandoffs.push(handoff);
      } else {
        plainPrompts.push(prompt);
      }
    }
    if (plainPrompts.length > 0) {
      output.push("\n### Prompts:");
      for (const prompt of plainPrompts) {
        output.push(`- ${prompt}`);
      }
    }
    const intentsForSession = [
      ...session.messages.intents,
      ...session.messages.prompts.map((prompt) => parseUiPromptHandoff(prompt)).filter((handoff) => !!handoff).map((handoff) => ({ intent: handoff.intent, params: handoff.params }))
    ];
    if (intentsForSession.length > 0) {
      output.push("\n### Intents:");
      for (const intent of intentsForSession) {
        const params = intent.params ? ` (${JSON.stringify(intent.params)})` : "";
        output.push(`- ${intent.intent}${params}`);
      }
    }
    const contexts = session.messages.contexts;
    if (contexts.length > 0) {
      output.push("\n### Context updates:");
      for (const context of contexts) {
        output.push(`- ${context.summary}${context.truncated ? " (truncated)" : ""}`);
      }
    }
    if (session.messages.notifications.length > 0) {
      output.push("\n### Notifications:");
      for (const notification of session.messages.notifications) {
        output.push(`- ${notification}`);
      }
    }
  }
  const count = sessions.length;
  state.completedUiSessions = [];
  return {
    content: [{ type: "text", text: output.join("\n") }],
    details: {
      sessions: count,
      prompts: allPrompts,
      intents: [...allIntents, ...parsedHandoffs.map(({ intent, params }) => ({ intent, params }))],
      contexts: allContexts,
      handoffs: parsedHandoffs,
      cleared: true
    }
  };
}
function executeStatus(state) {
  const servers = [];
  for (const name of Object.keys(state.config.mcpServers)) {
    const definition = state.config.mcpServers[name];
    const disabled = isServerDisabled(definition);
    const connection = disabled ? void 0 : state.manager.getConnection(name);
    const metadata = disabled ? void 0 : state.toolMetadata.get(name);
    const toolCount = metadata?.length ?? 0;
    const failedAgo = disabled ? null : getFailureAgeSeconds(state, name);
    let status = disabled ? "disabled" : "not connected";
    if (!disabled && connection?.status === "connected") {
      status = "connected";
    } else if (!disabled && connection?.status === "needs-auth") {
      status = "needs-auth";
    } else if (!disabled && failedAgo !== null) {
      status = "failed";
    } else if (!disabled && metadata !== void 0) {
      status = "cached";
    }
    servers.push({ name, status, toolCount, failedAgo, ...disabled ? { disabled: true } : {} });
  }
  const disabledCount = servers.filter((s) => s.disabled).length;
  const enabledServers = servers.filter((s) => !s.disabled);
  const totalTools = enabledServers.reduce((sum, s) => sum + s.toolCount, 0);
  const connectedCount = enabledServers.filter((s) => s.status === "connected").length;
  let text = `MCP: ${connectedCount}/${enabledServers.length} servers, ${totalTools} tools`;
  if (disabledCount > 0) text += ` (${disabledCount} disabled)`;
  text += "\n\n";
  for (const server2 of servers) {
    if (server2.disabled) {
      text += `\u2298 ${server2.name} (disabled)
`;
      continue;
    }
    if (server2.status === "connected") {
      text += `\u2713 ${server2.name} (${server2.toolCount} tools)
`;
      continue;
    }
    if (server2.status === "needs-auth") {
      text += `\u26A0 ${server2.name} (needs auth)
`;
      continue;
    }
    if (server2.status === "cached") {
      text += `\u25CB ${server2.name} (${server2.toolCount} tools, cached)
`;
      continue;
    }
    if (server2.status === "failed") {
      text += `\u2717 ${server2.name} (failed ${server2.failedAgo ?? 0}s ago)
`;
      continue;
    }
    text += `\u25CB ${server2.name} (not connected)
`;
  }
  if (servers.length > 0) {
    text += `
mcp({ server: "name" }) to list tools, mcp({ search: "..." }) to search`;
  }
  return {
    content: [{ type: "text", text: text.trim() }],
    details: { mode: "status", servers, totalTools, connectedCount, disabledCount }
  };
}
async function executeAuthStart(state, serverName, signal) {
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  throwIfAborted(ownedSignal);
  const definition = state.config.mcpServers[serverName];
  if (!definition) {
    return {
      content: [{ type: "text", text: `Server "${serverName}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "auth-start", error: "not_found", server: serverName }
    };
  }
  if (isServerDisabled(definition)) return disabledResult("auth-start", serverName);
  try {
    const serverUrl = resolveServerUrl(definition);
    if (!serverUrl || !supportsOAuth(definition)) {
      return {
        content: [{ type: "text", text: `Server "${serverName}" is not configured for OAuth over HTTP.` }],
        details: { mode: "auth-start", error: "oauth_not_supported", server: serverName }
      };
    }
    const { authorizationUrl } = state.authStorageOptions ? ownedSignal ? await startAuth(serverName, serverUrl, definition, { authStorageOptions: state.authStorageOptions, signal: ownedSignal, runtime: state.oauthRuntime }) : await startAuth(serverName, serverUrl, definition, { authStorageOptions: state.authStorageOptions, runtime: state.oauthRuntime }) : ownedSignal ? await startAuth(serverName, serverUrl, definition, { signal: ownedSignal, runtime: state.oauthRuntime }) : await startAuth(serverName, serverUrl, definition, { runtime: state.oauthRuntime });
    if (!authorizationUrl) {
      return {
        content: [{ type: "text", text: `OAuth authentication successful for "${serverName}".` }],
        details: { mode: "auth-start", server: serverName, authenticated: true }
      };
    }
    return {
      content: [{ type: "text", text: formatManualAuthInstructions(serverName, authorizationUrl) }],
      details: { mode: "auth-start", server: serverName, authorizationUrl }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Failed to start OAuth for "${serverName}": ${message}` }],
      details: { mode: "auth-start", error: "auth_start_failed", server: serverName, message }
    };
  }
}
async function executeAuthComplete(state, serverName, input, signal) {
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  throwIfAborted(ownedSignal);
  const definition = state.config.mcpServers[serverName];
  if (!definition) {
    return {
      content: [{ type: "text", text: `Server "${serverName}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "auth-complete", error: "not_found", server: serverName }
    };
  }
  if (isServerDisabled(definition)) return disabledResult("auth-complete", serverName);
  try {
    const status = state.authStorageOptions ? ownedSignal ? await completeAuthFromInput(serverName, input, { authStorageOptions: state.authStorageOptions, signal: ownedSignal, runtime: state.oauthRuntime }) : await completeAuthFromInput(serverName, input, { authStorageOptions: state.authStorageOptions, runtime: state.oauthRuntime }) : ownedSignal ? await completeAuthFromInput(serverName, input, { signal: ownedSignal, runtime: state.oauthRuntime }) : await completeAuthFromInput(serverName, input, { runtime: state.oauthRuntime });
    if (status !== "authenticated") {
      return {
        content: [{ type: "text", text: `OAuth authentication did not complete for "${serverName}".` }],
        details: { mode: "auth-complete", error: "not_authenticated", server: serverName, status }
      };
    }
    await state.manager.close(serverName);
    clearFailure(state, serverName);
    updateStatusBar(state);
    return {
      content: [{ type: "text", text: `OAuth authentication successful for "${serverName}". Run mcp({ connect: "${serverName}" }) to connect with the new token.` }],
      details: { mode: "auth-complete", server: serverName, authenticated: true }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Failed to complete OAuth for "${serverName}": ${message}` }],
      details: { mode: "auth-complete", error: "auth_complete_failed", server: serverName, message }
    };
  }
}
function executeDescribe(state, toolName) {
  const exactMatches = getEnabledToolMatches(state, toolName, true);
  if (exactMatches.length > 1) return ambiguousToolResult("describe", toolName);
  if (exactMatches.length === 0 && getEnabledToolMatches(state, toolName, false).length > 1) {
    return ambiguousToolResult("describe", toolName);
  }
  let serverName = exactMatches[0]?.server;
  let toolMeta = exactMatches[0]?.tool;
  let disabledMatch;
  if (!toolMeta) {
    for (const [server2, metadata] of state.toolMetadata.entries()) {
      const found = findToolByName(metadata, toolName);
      if (!found) continue;
      if (isServerDisabled(state.config.mcpServers[server2])) {
        disabledMatch ??= server2;
        continue;
      }
      serverName = server2;
      toolMeta = found;
      break;
    }
  }
  if (!serverName || !toolMeta) {
    if (disabledMatch) return disabledResult("describe", disabledMatch);
    const suggestions = rankSuggestions(state, toolName, 5);
    const suggestionText = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}` : "";
    return {
      content: [{ type: "text", text: `Tool "${toolName}" not found. Use mcp({ search: "..." }) to search.${suggestionText}` }],
      details: { mode: "describe", error: "tool_not_found", requestedTool: toolName, suggestions }
    };
  }
  const approvalMarker = isToolCallApprovalRequired(state.config, serverName, toolMeta, state.toolMetadata) ? " (requires approval)" : "";
  let text = `${toolMeta.name}${approvalMarker}
`;
  text += `Server: ${serverName}
`;
  if (toolMeta.resourceUri) {
    text += `Type: Resource (reads from ${toolMeta.resourceUri})
`;
  }
  text += `
${toolMeta.description || "(no description)"}
`;
  if (toolMeta.inputSchema && !toolMeta.resourceUri) {
    const shape = renderTsShape(toolMeta.inputSchema);
    text += shape === null ? `
Parameters:
${formatSchema(toolMeta.inputSchema)}` : `
Shape:
${shape}`;
  } else if (toolMeta.resourceUri) {
    text += `
No parameters required (resource tool).`;
  } else {
    text += `
No parameters defined.`;
  }
  return {
    content: [{ type: "text", text: text.trim() }],
    details: { mode: "describe", tool: toolMeta, server: serverName }
  };
}
function executeSearch(state, query, regex, server2, includeSchemas, limit = 12, offset = 0) {
  const showSchemas = includeSchemas !== false;
  if (server2 && isServerDisabled(state.config.mcpServers[server2])) return disabledResult("search", server2);
  let matches;
  if (regex) {
    let pattern;
    try {
      if (query.length > MAX_REGEX_SEARCH_QUERY_LENGTH) {
        return {
          content: [{ type: "text", text: `Regex query is too long; maximum length is ${MAX_REGEX_SEARCH_QUERY_LENGTH} characters.` }],
          details: { mode: "search", error: "query_too_long", query, maxLength: MAX_REGEX_SEARCH_QUERY_LENGTH }
        };
      }
      pattern = new RegExp(query, "i");
      let safety;
      try {
        const { checkSync } = require3("recheck");
        safety = checkSync(query, "i", REGEX_SAFETY_CHECK_PARAMS);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: "Regex query rejected because safety analysis failed." }],
          details: { mode: "search", error: "unsafe_pattern", query, reason }
        };
      }
      if (safety.status !== "safe") {
        return {
          content: [{ type: "text", text: `Regex query rejected as unsafe (${safety.status}).` }],
          details: { mode: "search", error: "unsafe_pattern", query, safetyStatus: safety.status }
        };
      }
    } catch {
      return {
        content: [{ type: "text", text: `Invalid regex: ${query}` }],
        details: { mode: "search", error: "invalid_pattern", query }
      };
    }
    matches = [];
    const globalPrefix = state.config.settings?.toolPrefix ?? "server";
    for (const [serverName, metadata] of state.toolMetadata.entries()) {
      const definition = state.config.mcpServers[serverName];
      if (isServerDisabled(definition)) continue;
      if (server2 && serverName !== server2) continue;
      for (const tool of metadata) {
        const matched = pattern.test(tool.name) || pattern.test(tool.description) || resolveSearchKeywords(definition, tool.originalName, serverName, globalPrefix).some((keyword) => pattern.test(keyword));
        if (matched) matches.push({ server: serverName, tool, score: 0 });
      }
    }
  } else if (query.trim().length === 0) {
    if (!server2) {
      return {
        content: [{ type: "text", text: "Search query cannot be empty" }],
        details: { mode: "search", error: "empty_query" }
      };
    }
    matches = (state.toolMetadata.get(server2) ?? []).map((tool) => ({ server: server2, tool, score: 0 })).sort((a, b) => a.tool.name.localeCompare(b.tool.name));
  } else {
    matches = rankToolMatches(state, query, server2);
  }
  const page2 = paginate(matches, offset, limit);
  if (page2.total === 0) {
    const connectingServers = server2 ? state.config.mcpServers[server2] && state.manager.isConnecting(server2) ? [server2] : [] : Object.keys(state.config.mcpServers).filter((name) => !isServerDisabled(state.config.mcpServers[name]) && state.manager.isConnecting(name)).sort((a, b) => a.localeCompare(b));
    const msg = server2 ? `No tools matching "${query}" in "${server2}"` : `No tools matching "${query}"`;
    const connectingMessage = connectingServers.length === 1 ? ` Server "${connectingServers[0]}" is still connecting; retry in a moment.` : connectingServers.length > 1 ? ` Servers ${connectingServers.map((name) => `"${name}"`).join(", ")} are still connecting; retry in a moment.` : "";
    return {
      content: [{ type: "text", text: `${msg}${connectingMessage}` }],
      details: {
        mode: "search",
        matches: [],
        count: 0,
        hasMore: false,
        nextOffset: null,
        query,
        ...connectingServers.length > 0 ? { connectingServers } : {}
      }
    };
  }
  let text = `Found ${page2.total} tool${page2.total === 1 ? "" : "s"} matching "${query}":

`;
  for (const match of page2.items) {
    const approvalMarker = isToolCallApprovalRequired(state.config, match.server, match.tool, state.toolMetadata) ? " (requires approval)" : "";
    if (showSchemas) {
      text += `${match.tool.name}${approvalMarker}
`;
      text += `  ${match.tool.description || "(no description)"}
`;
      if (match.tool.inputSchema && !match.tool.resourceUri) {
        const shape = renderTsShape(match.tool.inputSchema);
        text += shape === null ? `
  Parameters:
${formatSchema(match.tool.inputSchema, "    ")}
` : `
  Shape:
${shape.split("\n").map((line) => `    ${line}`).join("\n")}
`;
      } else if (match.tool.resourceUri) {
        text += "  No parameters (resource tool).\n";
      }
      text += "\n";
    } else {
      text += `- ${match.tool.name}${approvalMarker}`;
      if (match.tool.description) text += ` - ${truncateAtWord(match.tool.description, 50)}`;
      text += "\n";
    }
  }
  if (page2.hasMore) text += `
${page2.items.length} of ${page2.total} \u2014 offset: ${page2.nextOffset} for more
`;
  return {
    content: [{ type: "text", text: text.trim() }],
    details: {
      mode: "search",
      matches: page2.items.map((match) => ({ server: match.server, tool: match.tool.name, score: match.score })),
      count: page2.total,
      hasMore: page2.hasMore,
      nextOffset: page2.nextOffset,
      query
    }
  };
}
function executeList(state, server2) {
  const definition = state.config.mcpServers[server2];
  if (!definition) {
    return {
      content: [{ type: "text", text: `Server "${server2}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "list", server: server2, tools: [], count: 0, error: "not_found" }
    };
  }
  if (isServerDisabled(definition)) return disabledResult("list", server2);
  const metadata = state.toolMetadata.get(server2);
  const toolNames = metadata?.map((m) => m.name) ?? [];
  const connection = state.manager.getConnection(server2);
  const instructions = state.serverInstructions.get(server2);
  let instructionsText = "";
  if (instructions) {
    const preview = truncateAtWord(instructions, INSTRUCTIONS_PREVIEW_LENGTH);
    instructionsText = `

Server instructions:
${preview}`;
    if (preview !== instructions) {
      instructionsText += `
Use mcp({ instructions: "${server2}" }) for the full text.`;
    }
  }
  if (toolNames.length === 0) {
    if (connection?.status === "connected") {
      return {
        content: [{ type: "text", text: `Server "${server2}" has no tools.${instructionsText}` }],
        details: { mode: "list", server: server2, tools: [], count: 0, hasInstructions: Boolean(instructions) }
      };
    }
    if (metadata !== void 0) {
      return {
        content: [{ type: "text", text: `Server "${server2}" has no cached tools (not connected).${instructionsText}` }],
        details: { mode: "list", server: server2, tools: [], count: 0, cached: true, hasInstructions: Boolean(instructions) }
      };
    }
    return {
      content: [{ type: "text", text: `Server "${server2}" is configured but not connected. Use mcp({ connect: "${server2}" }) or /mcp reconnect ${server2} to retry.${instructionsText}` }],
      details: { mode: "list", server: server2, tools: [], count: 0, error: "not_connected", hasInstructions: Boolean(instructions) }
    };
  }
  const cachedNote = connection?.status === "connected" ? "" : " (not connected, cached)";
  let text = `${server2} (${toolNames.length} tools${cachedNote}):

`;
  const descMap = /* @__PURE__ */ new Map();
  if (metadata) {
    for (const m of metadata) {
      descMap.set(m.name, m.description);
    }
  }
  for (const tool of toolNames) {
    const desc = descMap.get(tool) ?? "";
    const truncated = truncateAtWord(desc, 50);
    text += `- ${tool}`;
    if (truncated) text += ` - ${truncated}`;
    text += "\n";
  }
  text += instructionsText;
  return {
    content: [{ type: "text", text: text.trim() }],
    details: { mode: "list", server: server2, tools: toolNames, count: toolNames.length, hasInstructions: Boolean(instructions) }
  };
}
function executeInstructions(state, server2) {
  const definition = state.config.mcpServers[server2];
  if (!definition) {
    return {
      content: [{ type: "text", text: `Server "${server2}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "instructions", server: server2, error: "not_found" }
    };
  }
  if (isServerDisabled(definition)) return disabledResult("instructions", server2);
  const instructions = state.serverInstructions.get(server2);
  if (instructions) {
    return {
      content: [{ type: "text", text: `${server2} instructions:

${instructions}` }],
      details: { mode: "instructions", server: server2, length: instructions.length }
    };
  }
  const connection = state.manager.getConnection(server2);
  if (connection?.status === "connected") {
    return {
      content: [{ type: "text", text: `Server "${server2}" does not provide instructions.` }],
      details: { mode: "instructions", server: server2, error: "no_instructions" }
    };
  }
  return {
    content: [{ type: "text", text: `No instructions cached for "${server2}". Use mcp({ connect: "${server2}" }) to connect and refresh.` }],
    details: { mode: "instructions", server: server2, error: "not_connected" }
  };
}
async function executeConnect(state, serverName, signal) {
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  throwIfAborted(ownedSignal);
  const definition = state.config.mcpServers[serverName];
  if (!definition) {
    return {
      content: [{ type: "text", text: `Server "${serverName}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "connect", error: "not_found", server: serverName }
    };
  }
  if (isServerDisabled(definition)) return disabledResult("connect", serverName);
  try {
    if (state.ui) {
      state.ui.setStatus("mcp", formatMcpStatus(state.config, `connecting to ${serverName}...`));
    }
    const currentConnection = state.manager.getConnection(serverName);
    let connection = currentConnection?.status === "connected" ? await state.manager.reconnect(serverName, definition, currentConnection, ownedSignal) : await state.manager.connect(serverName, definition, ownedSignal);
    if (connection.status === "needs-auth") {
      const autoAuth = await attemptAutoAuth(state, serverName, ownedSignal);
      if (autoAuth.status === "failed") {
        return {
          content: [{ type: "text", text: autoAuth.message }],
          details: { mode: "connect", error: "auth_required", server: serverName, message: autoAuth.message }
        };
      }
      if (autoAuth.status === "success") {
        await state.manager.close(serverName);
        throwIfAborted(ownedSignal);
        connection = ownedSignal ? await state.manager.connect(serverName, definition, ownedSignal) : await state.manager.connect(serverName, definition);
      }
      if (connection.status === "needs-auth") {
        const message = getAuthRequiredMessage(state, serverName);
        return {
          content: [{ type: "text", text: message }],
          details: { mode: "connect", error: "auth_required", server: serverName, message }
        };
      }
    }
    const prefix = state.config.settings?.toolPrefix ?? "server";
    const { metadata } = buildToolMetadata(connection.tools, connection.resources, definition, serverName, prefix, state.config.mcpServers, state.toolMetadata);
    state.toolMetadata.set(serverName, metadata);
    if (!connection.promptDiscoveryFailed) {
      state.promptMetadata?.set(serverName, reconstructPromptMetadata(serverName, connection.prompts ?? [], prefix, definition));
      state.promptMetadataLive?.add(serverName);
    }
    if (connection.instructions) {
      state.serverInstructions.set(serverName, connection.instructions);
    } else {
      state.serverInstructions.delete(serverName);
    }
    updateMetadataCache(state, serverName);
    notifyToolMetadataUpdated(state, serverName, "proxy-connect");
    markKeepAliveAfterConnect(state, serverName);
    clearFailure(state, serverName);
    updateStatusBar(state);
    return executeList(state, serverName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isAbortError(error, ownedSignal)) recordFailure(state, serverName, message);
    updateStatusBar(state);
    return {
      content: [{ type: "text", text: `Failed to connect to "${serverName}": ${message}` }],
      details: { mode: "connect", error: isAbortError(error, ownedSignal) ? "aborted" : "connect_failed", server: serverName, message }
    };
  }
}
async function executeCall(state, toolName, args, serverOverride, getPiTools, signal, origin) {
  const ownedSignal = combineAbortSignals(state.owner?.signal, signal);
  throwIfAborted(ownedSignal);
  let serverName = serverOverride;
  let toolMeta;
  let autoAuthAttempted = false;
  const prefixMode = state.config.settings?.toolPrefix ?? "server";
  const disabledCallResult = (disabledServer, metadata) => {
    if (!metadata) {
      const message2 = `Server "${disabledServer}" is disabled. Run /mcp enable ${disabledServer} and /reload to enable it.`;
      return {
        content: [{ type: "text", text: message2 }],
        details: { mode: "call", error: "server_disabled", server: disabledServer, requestedTool: toolName, message: message2 }
      };
    }
    const message = `Server "${disabledServer}" is disabled. Run /mcp enable ${disabledServer} and /reload to enable it.`;
    const identity = metadata.resourceUri ? { server: disabledServer, resourceUri: metadata.resourceUri } : { server: disabledServer, tool: metadata.originalName };
    return {
      content: [{ type: "text", text: message }],
      details: { mode: "call", error: "server_disabled", ...identity, message }
    };
  };
  if (serverName && !state.config.mcpServers[serverName]) {
    return {
      content: [{ type: "text", text: `Server "${serverName}" not found. Use mcp({}) to see available servers.` }],
      details: { mode: "call", error: "server_not_found", server: serverName, requestedTool: toolName }
    };
  }
  if (serverName) {
    const match = getSingleToolMatch(state.toolMetadata.get(serverName), toolName);
    if (match === "ambiguous") return ambiguousToolResult("call", toolName);
    toolMeta = match;
    if (isServerDisabled(state.config.mcpServers[serverName])) {
      return disabledCallResult(serverName, toolMeta);
    }
  } else {
    const exactMatches = getEnabledToolMatches(state, toolName, true);
    if (exactMatches.length > 1) return ambiguousToolResult("call", toolName);
    if (exactMatches.length === 0 && getEnabledToolMatches(state, toolName, false).length > 1) {
      return ambiguousToolResult("call", toolName);
    }
    let disabledMatch;
    for (const [server2, metadata] of state.toolMetadata.entries()) {
      const found = metadata.find((tool) => tool.name === toolName);
      if (!found) continue;
      if (isServerDisabled(state.config.mcpServers[server2])) {
        disabledMatch ??= { serverName: server2, toolMeta: found };
        continue;
      }
      serverName = server2;
      toolMeta = found;
      break;
    }
    if (!toolMeta && !disabledMatch) {
      for (const [server2, metadata] of state.toolMetadata.entries()) {
        const found = findToolByName(metadata, toolName);
        if (!found) continue;
        if (isServerDisabled(state.config.mcpServers[server2])) {
          disabledMatch ??= { serverName: server2, toolMeta: found };
          continue;
        }
        serverName = server2;
        toolMeta = found;
        break;
      }
    }
    if (!toolMeta && disabledMatch) return disabledCallResult(disabledMatch.serverName, disabledMatch.toolMeta);
  }
  if (serverName && !toolMeta) {
    const connected = await lazyConnect(state, serverName, ownedSignal);
    if (connected) {
      const match = getSingleToolMatch(state.toolMetadata.get(serverName), toolName);
      if (match === "ambiguous") return ambiguousToolResult("call", toolName);
      toolMeta = match;
    } else {
      const needsAuthConnection = state.manager.getConnection(serverName);
      if (needsAuthConnection?.status === "needs-auth") {
        if (!autoAuthAttempted) {
          autoAuthAttempted = true;
          const autoAuth = await attemptAutoAuth(state, serverName, ownedSignal);
          if (autoAuth.status === "failed") {
            return {
              content: [{ type: "text", text: autoAuth.message }],
              details: { mode: "call", error: "auth_required", server: serverName, requestedTool: toolName, message: autoAuth.message }
            };
          }
          if (autoAuth.status === "success") {
            await state.manager.close(serverName);
            clearFailure(state, serverName);
            const connectedAfterAuth = await lazyConnect(state, serverName, ownedSignal);
            if (connectedAfterAuth) {
              const match = getSingleToolMatch(state.toolMetadata.get(serverName), toolName);
              if (match === "ambiguous") return ambiguousToolResult("call", toolName);
              toolMeta = match;
              if (!toolMeta) {
                const suggestions = rankSuggestions(state, toolName, 5);
                const suggestionText = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}` : "";
                return {
                  content: [{ type: "text", text: `Tool "${toolName}" not found on "${serverName}" after reconnect.${suggestionText}` }],
                  details: { mode: "call", error: "tool_not_found_after_reconnect", server: serverName, requestedTool: toolName, suggestions }
                };
              }
            }
          }
        }
        if (!toolMeta && state.manager.getConnection(serverName)?.status === "needs-auth") {
          const message = getAuthRequiredMessage(state, serverName);
          return {
            content: [{ type: "text", text: message }],
            details: { mode: "call", error: "auth_required", server: serverName, requestedTool: toolName, message }
          };
        }
      }
      if (!toolMeta) {
        const failedAgo = getFailureAgeSeconds(state, serverName);
        if (failedAgo !== null) {
          return {
            content: [{ type: "text", text: `Server "${serverName}" not available (last failed ${failedAgo}s ago)` }],
            details: { mode: "call", error: "server_backoff", server: serverName, requestedTool: toolName }
          };
        }
      }
    }
  }
  let prefixMatchedServer;
  if (!serverName && !toolMeta && prefixMode !== "none") {
    const lazyExactMatches = [];
    const lazyFallbackMatches = [];
    const candidates = Object.keys(state.config.mcpServers).filter((name) => !isServerDisabled(state.config.mcpServers[name])).map((name) => ({ name, prefix: getServerPrefix(name, prefixMode) })).filter((c) => c.prefix && toolName.startsWith(c.prefix + "_")).sort((a, b) => b.prefix.length - a.prefix.length);
    for (const { name: configuredServer } of candidates) {
      const existingConnection = state.manager.getConnection(configuredServer);
      const failedAgo = getFailureAgeSeconds(state, configuredServer);
      if (failedAgo !== null && existingConnection?.status !== "needs-auth") continue;
      let connected = await lazyConnect(state, configuredServer, ownedSignal);
      if (!connected && state.manager.getConnection(configuredServer)?.status === "needs-auth" && !autoAuthAttempted) {
        autoAuthAttempted = true;
        const autoAuth = await attemptAutoAuth(state, configuredServer, ownedSignal);
        if (autoAuth.status === "failed") {
          return {
            content: [{ type: "text", text: autoAuth.message }],
            details: { mode: "call", error: "auth_required", server: configuredServer, requestedTool: toolName, message: autoAuth.message }
          };
        }
        if (autoAuth.status === "success") {
          await state.manager.close(configuredServer);
          clearFailure(state, configuredServer);
          connected = await lazyConnect(state, configuredServer, ownedSignal);
        }
      }
      if (!connected) continue;
      if (!prefixMatchedServer) prefixMatchedServer = configuredServer;
      const metadata = state.toolMetadata.get(configuredServer);
      const exactMatches = getToolMatches(metadata, toolName, true);
      if (exactMatches.length > 1) return ambiguousToolResult("call", toolName);
      if (exactMatches.length === 1) {
        lazyExactMatches.push({ serverName: configuredServer, toolMeta: exactMatches[0] });
        continue;
      }
      const fallbackMatches = getToolMatches(metadata, toolName, false);
      if (fallbackMatches.length > 1) return ambiguousToolResult("call", toolName);
      if (fallbackMatches.length === 1) lazyFallbackMatches.push({ serverName: configuredServer, toolMeta: fallbackMatches[0] });
    }
    const lazyMatches = lazyExactMatches.length > 0 ? lazyExactMatches : lazyFallbackMatches;
    if (lazyMatches.length > 1) return ambiguousToolResult("call", toolName);
    if (lazyMatches.length === 1) {
      serverName = lazyMatches[0].serverName;
      toolMeta = lazyMatches[0].toolMeta;
    }
  }
  if (!serverName || !toolMeta) {
    const nativeTool = !serverOverride ? getPiTools?.().find((tool) => tool.name === toolName && tool.name !== "mcp") : void 0;
    if (nativeTool) {
      return {
        content: [{ type: "text", text: `"${toolName}" is a native Pi tool. Call ${toolName} directly instead of using mcp({ tool: "${toolName}" }).` }],
        details: { mode: "call", error: "native_tool", requestedTool: toolName }
      };
    }
    const hintServer = serverName ?? prefixMatchedServer;
    const available = hintServer ? getToolNames(state, hintServer) : [];
    let msg = `Tool "${toolName}" not found.`;
    if (available.length > 0) {
      msg += ` Server "${hintServer}" has: ${available.join(", ")}`;
    } else {
      msg += ` Use mcp({ search: "..." }) to search.`;
    }
    const suggestions = rankSuggestions(state, toolName, 5);
    if (suggestions.length > 0) msg += ` Did you mean: ${suggestions.join(", ")}`;
    return {
      content: [{ type: "text", text: msg }],
      details: { mode: "call", error: "tool_not_found", requestedTool: toolName, hintServer, suggestions }
    };
  }
  const callIdentity = toolMeta.resourceUri ? { server: serverName, resourceUri: toolMeta.resourceUri } : { server: serverName, tool: toolMeta.originalName };
  let connection = state.manager.getConnection(serverName);
  if (connection?.status === "needs-auth") {
    if (!autoAuthAttempted) {
      autoAuthAttempted = true;
      const autoAuth = await attemptAutoAuth(state, serverName, ownedSignal);
      if (autoAuth.status === "failed") {
        return {
          content: [{ type: "text", text: autoAuth.message }],
          details: { mode: "call", error: "auth_required", ...callIdentity, message: autoAuth.message }
        };
      }
      if (autoAuth.status === "success") {
        await state.manager.close(serverName);
        clearFailure(state, serverName);
        connection = state.manager.getConnection(serverName);
      }
    }
    if (connection?.status === "needs-auth") {
      const message = getAuthRequiredMessage(state, serverName);
      return {
        content: [{ type: "text", text: message }],
        details: { mode: "call", error: "auth_required", ...callIdentity, message }
      };
    }
  }
  if (!connection || connection.status !== "connected") {
    const failedAgo = getFailureAgeSeconds(state, serverName);
    if (failedAgo !== null) {
      return {
        content: [{ type: "text", text: `Server "${serverName}" not available (last failed ${failedAgo}s ago)` }],
        details: { mode: "call", error: "server_backoff", ...callIdentity }
      };
    }
    const definition = state.config.mcpServers[serverName];
    if (!definition) {
      return {
        content: [{ type: "text", text: `Server "${serverName}" not connected` }],
        details: { mode: "call", error: "server_not_connected", ...callIdentity }
      };
    }
    try {
      if (state.ui) {
        state.ui.setStatus("mcp", formatMcpStatus(state.config, `connecting to ${serverName}...`));
      }
      connection = await state.manager.connect(serverName, definition, ownedSignal);
      if (connection.status === "needs-auth") {
        if (!autoAuthAttempted) {
          autoAuthAttempted = true;
          const autoAuth = await attemptAutoAuth(state, serverName, ownedSignal);
          if (autoAuth.status === "failed") {
            return {
              content: [{ type: "text", text: autoAuth.message }],
              details: { mode: "call", error: "auth_required", ...callIdentity, message: autoAuth.message }
            };
          }
          if (autoAuth.status === "success") {
            await state.manager.close(serverName);
            connection = await state.manager.connect(serverName, definition, ownedSignal);
          }
        }
        if (connection.status === "needs-auth") {
          const message = getAuthRequiredMessage(state, serverName);
          return {
            content: [{ type: "text", text: message }],
            details: { mode: "call", error: "auth_required", ...callIdentity, message }
          };
        }
      }
      clearFailure(state, serverName);
      updateServerMetadata(state, serverName);
      updateMetadataCache(state, serverName);
      notifyToolMetadataUpdated(state, serverName, "proxy-call-reconnect");
      markKeepAliveAfterConnect(state, serverName);
      updateStatusBar(state);
      const match = getSingleToolMatch(state.toolMetadata.get(serverName), toolName);
      if (match === "ambiguous") return ambiguousToolResult("call", toolName);
      toolMeta = match;
      if (!toolMeta) {
        const available = getToolNames(state, serverName);
        const hint = available.length > 0 ? `Available tools on "${serverName}": ${available.join(", ")}` : `Server "${serverName}" has no tools.`;
        const suggestions = rankSuggestions(state, toolName, 5);
        const suggestionText = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}` : "";
        return {
          content: [{ type: "text", text: `Tool "${toolName}" not found on "${serverName}" after reconnect. ${hint}${suggestionText}` }],
          details: { mode: "call", error: "tool_not_found_after_reconnect", server: serverName, requestedTool: toolName, suggestions }
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isAbortError(error, ownedSignal)) recordFailure(state, serverName, message);
      updateStatusBar(state);
      return {
        content: [{ type: "text", text: `Failed to connect to "${serverName}": ${message}` }],
        details: { mode: "call", error: isAbortError(error, ownedSignal) ? "aborted" : "connect_failed", ...callIdentity, message }
      };
    }
  }
  if (isServerDisabled(state.config.mcpServers[serverName])) {
    return disabledCallResult(serverName, toolMeta);
  }
  const approval = await ensureToolCallApproved(
    state,
    serverName,
    toolMeta,
    args,
    ownedSignal,
    origin ?? (toolMeta.resourceUri ? "resource" : "proxy")
  );
  if (approval.ok === false) {
    const denied = approval.reason === "denied";
    const message = denied ? `The user declined approval to run MCP tool "${toolMeta.originalName}" on server "${serverName}".` : `MCP tool "${toolMeta.originalName}" on server "${serverName}" is approval-gated and requires an interactive session.`;
    return {
      content: [{ type: "text", text: message }],
      details: {
        mode: "call",
        error: denied ? "approval_denied" : "approval_required",
        server: serverName,
        tool: toolMeta.originalName
      }
    };
  }
  let uiSession = null;
  const requestOptions = state.manager.getRequestOptions?.(serverName, ownedSignal) ?? (ownedSignal ? { signal: ownedSignal } : void 0);
  const outputGuardOptions = resolveMcpOutputGuardOptions(state.config.settings);
  const recoverAuthConnection = async () => {
    const current = state.manager.getConnection(serverName);
    if (current?.status === "connected") return current;
    if (!autoAuthAttempted) {
      autoAuthAttempted = true;
      const autoAuth = await attemptAutoAuth(state, serverName, ownedSignal);
      if (autoAuth.status === "failed") {
        throw new SessionRecoveryAuthRequiredError(serverName, autoAuth.message);
      }
      if (autoAuth.status === "success") {
        const definition = state.config.mcpServers[serverName];
        if (!definition) return void 0;
        const afterAuth = state.manager.getConnection(serverName);
        if (afterAuth?.status === "connected") return afterAuth;
        if (afterAuth?.status === "needs-auth") {
          await state.manager.close(serverName);
        }
        clearFailure(state, serverName);
        connection = await state.manager.connect(serverName, definition, ownedSignal);
        return connection;
      }
    }
    return state.manager.getConnection(serverName);
  };
  try {
    state.manager.touch(serverName);
    state.manager.incrementInFlight(serverName);
    if (toolMeta.resourceUri) {
      const result2 = await withSessionRecovery(
        {
          manager: state.manager,
          config: state.config,
          ...ownedSignal ? { signal: ownedSignal } : {},
          onNeedsAuth: recoverAuthConnection
        },
        serverName,
        (conn) => conn.client.readResource({ uri: toolMeta.resourceUri }, requestOptions)
      );
      const content2 = transformMcpResourceContents(result2.contents ?? [], state.owner?.signal);
      const guarded2 = await guardMcpOutput(content2.length > 0 ? content2 : [{ type: "text", text: "(empty resource)" }], outputGuardOptions);
      return {
        content: guarded2.content,
        details: { mode: "call", ...callIdentity, ...guardedMcpDetails(guarded2) }
      };
    }
    uiSession = toolMeta.uiResourceUri ? await maybeStartUiSession(state, {
      serverName,
      toolName: toolMeta.originalName,
      toolArgs: args ?? {},
      uiResourceUri: toolMeta.uiResourceUri,
      ...toolMeta.uiStreamMode !== void 0 ? { streamMode: toolMeta.uiStreamMode } : {},
      ...signal ? { signal } : {},
      onNeedsAuth: recoverAuthConnection
    }) : null;
    const result = await withSessionRecovery(
      {
        manager: state.manager,
        config: state.config,
        ...ownedSignal ? { signal: ownedSignal } : {},
        onNeedsAuth: recoverAuthConnection
      },
      serverName,
      (conn) => abortable(conn.client.callTool({
        name: toolMeta.originalName,
        arguments: args ?? {},
        _meta: uiSession?.requestMeta
      }, requestOptions), ownedSignal)
    );
    if (toolMeta.uiResourceUri) {
      uiSession?.sendToolResult(result);
      if (result.isError) {
        const mcpContent = result.content ?? [];
        const content3 = transformMcpContent(mcpContent, state.owner?.signal);
        const outputContent3 = content3.length > 0 ? content3 : [{ type: "text", text: "(empty result)" }];
        const schemaText = toolMeta.inputSchema ? `

Expected parameters:
${formatSchema(toolMeta.inputSchema)}` : "";
        const guarded3 = await guardMcpOutput(outputContent3, { ...outputGuardOptions, prefix: "Error: ", suffix: schemaText, emptyTextFallback: "Tool execution failed", rawMcpResult: result });
        return {
          content: guarded3.content,
          details: { mode: "call", error: "tool_error", ...callIdentity, ...guardedMcpDetails(guarded3) }
        };
      }
      const content2 = resolveMcpResultContent(result, state.owner?.signal);
      const outputContent2 = content2.length > 0 ? content2 : [{ type: "text", text: "(empty result)" }];
      const uiSummary = summarizeUiSessionResult(uiSession);
      const guarded2 = await guardMcpOutput(outputContent2, { ...outputGuardOptions, suffix: `

${uiSummary.message}`, rawMcpResult: result });
      return {
        content: guarded2.content,
        details: {
          mode: "call",
          ...guardedMcpDetails(guarded2),
          ...callIdentity,
          uiOpen: uiSummary.uiOpen,
          uiViewer: uiSummary.uiViewer,
          uiUrl: uiSummary.uiUrl
        }
      };
    }
    if (result.isError) {
      const mcpContent = result.content ?? [];
      const content2 = transformMcpContent(mcpContent, state.owner?.signal);
      const outputContent2 = content2.length > 0 ? content2 : [{ type: "text", text: "(empty result)" }];
      const schemaText = toolMeta.inputSchema ? `

Expected parameters:
${formatSchema(toolMeta.inputSchema)}` : "";
      const guarded2 = await guardMcpOutput(outputContent2, { ...outputGuardOptions, prefix: "Error: ", suffix: schemaText, emptyTextFallback: "Tool execution failed", rawMcpResult: result });
      return {
        content: guarded2.content,
        details: { mode: "call", error: "tool_error", ...callIdentity, ...guardedMcpDetails(guarded2) }
      };
    }
    const content = resolveMcpResultContent(result, state.owner?.signal);
    const outputContent = content.length > 0 ? content : [{ type: "text", text: "(empty result)" }];
    const guarded = await guardMcpOutput(outputContent, { ...outputGuardOptions, rawMcpResult: result });
    return {
      content: guarded.content,
      details: { mode: "call", ...guardedMcpDetails(guarded), ...callIdentity }
    };
  } catch (error) {
    if (error instanceof SessionRecoveryAuthRequiredError) {
      const message2 = error.authMessage ?? getAuthRequiredMessage(state, serverName);
      uiSession?.sendToolCancelled(message2);
      return {
        content: [{ type: "text", text: message2 }],
        details: { mode: "call", error: "auth_required", ...callIdentity, message: message2, autoAuthAttempted }
      };
    }
    if (error instanceof UrlElicitationRequiredError4) {
      const action = await state.manager.handleUrlElicitationRequired(serverName, error);
      const message2 = action === "accept" ? "The original MCP tool did not run. Complete the opened browser interaction, then retry the tool." : `The URL interaction was ${action === "decline" ? "declined" : "cancelled"}.`;
      uiSession?.sendToolCancelled(message2);
      return {
        content: [{ type: "text", text: message2 }],
        details: { mode: "call", error: "url_elicitation_required", ...callIdentity, action }
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    uiSession?.sendToolCancelled(message);
    const schemaText = toolMeta.inputSchema ? `

Expected parameters:
${formatSchema(toolMeta.inputSchema)}` : "";
    const guarded = await guardMcpOutput([{ type: "text", text: message }], { ...outputGuardOptions, prefix: "Failed to call tool: ", suffix: schemaText });
    return {
      content: guarded.content,
      details: { mode: "call", error: isAbortError(error, ownedSignal) ? "aborted" : "call_failed", ...callIdentity, message: guarded.outputGuard ? "output truncated; see outputGuard.fullOutputPath" : message, ...guardedMcpDetails(guarded) }
    };
  } finally {
    if (uiSession?.reused) {
      uiSession.close();
    }
    state.manager.decrementInFlight(serverName);
    state.manager.touch(serverName);
  }
}

// index.ts
init_utils();

// tool-result-renderer.ts
import { Text, truncateToWidth as truncateToWidth3, visibleWidth as visibleWidth3 } from "@earendil-works/pi-tui";
var plainTheme = { fg: (_name, text) => text };
var DEFAULT_MAX_CALL_INPUT_CHARS = 1500;
var DEFAULT_BOXED_COLLAPSED_LINES = 3;
var DEFAULT_COMPACT_COLLAPSED_LINES = 1;
var DEFAULT_MAX_COLLAPSED_CHARS = 8e3;
var COLLAPSED_RENDER_CHAR_SLACK = 8;
var EmptyComponent = class {
  render() {
    return [];
  }
  invalidate() {
  }
};
var CompactMcpToolResult = class {
  constructor(title, display, theme) {
    this.title = title;
    this.display = display;
    this.theme = theme;
  }
  title;
  display;
  theme;
  rendered = null;
  render(width) {
    const safeWidth = Math.max(1, Math.floor(width));
    if (this.rendered?.width === safeWidth) return this.rendered.lines;
    const resultLines = this.display.lines.filter((line, index, lines2) => {
      return !(this.display.truncated && index === lines2.length - 1 && line === "\u2026");
    });
    const lines = resultLines.length > 0 ? resultLines : [""];
    const bodies = lines.map((line, index) => {
      const prefix = index === 0 && this.title ? `${this.theme.fg("toolTitle", this.title)} \u2192 ` : "";
      return `${prefix}${this.theme.fg("toolOutput", line)}`;
    });
    const hiddenText = this.display.truncated || bodies.some((body) => visibleWidth3(body) > safeWidth);
    const rendered = bodies.map((body, index) => {
      const suffix = hiddenText && index === bodies.length - 1 ? " \u2026 (Ctrl+O to expand)" : "";
      if (!suffix) return truncateToWidth3(body, safeWidth, "\u2026");
      if (safeWidth >= suffix.length + 20) {
        return `${truncateToWidth3(body, safeWidth - suffix.length, "\u2026")}${this.theme.fg("muted", suffix)}`;
      }
      const shortSuffix = " (Ctrl+O)";
      if (safeWidth >= shortSuffix.length + 5) {
        return `${truncateToWidth3(body, safeWidth - shortSuffix.length, "\u2026")}${this.theme.fg("muted", shortSuffix)}`;
      }
      return truncateToWidth3(this.theme.fg("muted", shortSuffix.trim()), safeWidth, "\u2026");
    });
    this.rendered = { width: safeWidth, lines: rendered };
    return rendered;
  }
  invalidate() {
    this.rendered = null;
  }
};
var CollapsibleText = class {
  constructor(text, expanded, maxCollapsedLines, ellipsis, expandHint, preTruncated = false) {
    this.text = text;
    this.expanded = expanded;
    this.maxCollapsedLines = maxCollapsedLines;
    this.preTruncated = preTruncated;
    this.fullText = new Text(text, 0, 0);
    this.footerText = new Text(`${ellipsis}
${expandHint}`, 0, 0);
  }
  text;
  expanded;
  maxCollapsedLines;
  preTruncated;
  fullText;
  footerText;
  collapsedText = null;
  collapsedRender = null;
  render(width) {
    if (this.expanded) {
      return this.fullText.render(width);
    }
    const safeWidth = Math.max(1, Math.floor(width));
    const charBudget = safeWidth * (this.maxCollapsedLines + 1) * COLLAPSED_RENDER_CHAR_SLACK;
    if (!this.collapsedText || this.collapsedText.charBudget !== charBudget) {
      const prefix = this.text.length > charBudget ? this.text.slice(0, charBudget) : this.text;
      this.collapsedText = {
        charBudget,
        fullyIncluded: prefix === this.text,
        text: new Text(prefix, 0, 0)
      };
      this.collapsedRender = null;
    }
    const lines = this.collapsedText.text.render(width);
    if (!this.preTruncated && this.collapsedText.fullyIncluded && lines.length <= this.maxCollapsedLines) return lines;
    if (this.collapsedRender?.width === width && this.collapsedRender.charBudget === charBudget) {
      return this.collapsedRender.lines;
    }
    const rendered = [
      ...lines.slice(0, this.maxCollapsedLines),
      ...this.footerText.render(width)
    ];
    this.collapsedRender = { width, charBudget, lines: rendered };
    return rendered;
  }
  invalidate() {
    this.fullText.invalidate();
    this.footerText.invalidate();
    this.collapsedText?.text.invalidate();
    this.collapsedRender = null;
  }
};
function truncateText(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}
function formatJsonish(value, maxChars) {
  if (typeof value === "string") {
    try {
      return truncateText(JSON.stringify(JSON.parse(value), null, 2), maxChars);
    } catch {
      return truncateText(value, maxChars);
    }
  }
  try {
    return truncateText(JSON.stringify(value, null, 2), maxChars);
  } catch {
    return truncateText(String(value), maxChars);
  }
}
function hasUsefulObjectContent(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}
function formatMcpProxyToolCallLines(args, maxInputChars = DEFAULT_MAX_CALL_INPUT_CHARS) {
  if (args.action === "ui-messages") return [`mcp ${args.action}`];
  if (args.tool) {
    const target = args.server ? `${args.tool} @ ${args.server}` : args.tool;
    const lines = [`mcp call ${target}`];
    if (args.args) lines.push(formatJsonish(args.args, maxInputChars));
    return lines;
  }
  if (args.connect) return [`mcp connect ${args.connect}`];
  if (args.describe) return [`mcp describe ${args.describe}`];
  if (args.search) {
    let line = `mcp search ${args.search}`;
    if (args.server) line += ` @ ${args.server}`;
    if (args.regex === true) line += " (regex)";
    if (args.includeSchemas === false) line += " (schemas hidden)";
    return [line];
  }
  if (args.server) return [`mcp list ${args.server}`];
  if (args.action) return [`mcp ${args.action}`];
  return ["mcp status"];
}
function formatMcpDirectToolCallLines(displayName, args, maxInputChars = DEFAULT_MAX_CALL_INPUT_CHARS) {
  if (!hasUsefulObjectContent(args)) return [displayName];
  return [displayName, formatJsonish(args, maxInputChars)];
}
function renderToolCallLines(lines, theme) {
  const activeTheme = theme ?? plainTheme;
  const [title = "mcp", ...rest] = lines;
  const styledTitle = activeTheme.fg("toolTitle", activeTheme.bold ? activeTheme.bold(title) : title);
  const styledRest = rest.map((line) => activeTheme.fg("muted", line));
  return new Text([styledTitle, ...styledRest].join("\n"), 0, 0);
}
function resolveMcpToolRenderOptions(settings) {
  const resultRendering = settings?.toolResultRendering === "boxed" ? "boxed" : "compact";
  const collapsedLines = settings?.collapsedResultLines;
  const defaultLines = resultRendering === "boxed" ? DEFAULT_BOXED_COLLAPSED_LINES : DEFAULT_COMPACT_COLLAPSED_LINES;
  return {
    resultRendering,
    collapsedResultLines: collapsedLines === 1 || collapsedLines === 2 || collapsedLines === 3 ? collapsedLines : defaultLines
  };
}
function shouldUseCompactFinalRender(options, context) {
  return options.resultRendering === "compact" && context !== void 0 && context.isPartial === false && context.expanded !== true && context.isError !== true;
}
function renderToolCall(lines, theme, context, options) {
  if (context?.state) context.state.compactTitle = lines[0] ?? "mcp";
  if (shouldUseCompactFinalRender(options, context)) return new EmptyComponent();
  return renderToolCallLines(lines, theme);
}
function createMcpProxyToolCallRenderer(options) {
  return (args, theme, context) => {
    return renderToolCall(formatMcpProxyToolCallLines(args), theme, context, options);
  };
}
function createMcpDirectToolCallRenderer(displayName, options = resolveMcpToolRenderOptions()) {
  return (args, theme, context) => {
    return renderToolCall(formatMcpDirectToolCallLines(displayName, args), theme, context, options);
  };
}
function blockToLines(block) {
  if (block.type === "text") {
    return block.text.split("\n");
  }
  return [`[image: ${block.mimeType}]`];
}
function collectCollapsedResultLines(content, maxLines, maxChars) {
  if (content.length === 0) return { lines: ["(empty result)"], truncated: false };
  const lines = [];
  let remainingChars = maxChars;
  let truncated = false;
  const appendLine = (line) => {
    if (lines.length >= maxLines || remainingChars <= 0) {
      truncated = true;
      return false;
    }
    if (line.length > remainingChars) {
      lines.push(line.slice(0, remainingChars));
      truncated = true;
      remainingChars = 0;
      return false;
    }
    lines.push(line);
    remainingChars -= line.length + 1;
    return true;
  };
  for (const block of content) {
    if (block.type !== "text") {
      if (!appendLine(`[image: ${block.mimeType}]`)) break;
      continue;
    }
    let start = 0;
    while (start <= block.text.length) {
      const newline = block.text.indexOf("\n", start);
      const line = newline === -1 ? block.text.slice(start) : block.text.slice(start, newline);
      if (!appendLine(line)) break;
      if (newline === -1) break;
      start = newline + 1;
    }
    if (truncated) break;
  }
  if (lines.length === 0) lines.push("");
  if (truncated && lines.length >= maxLines) lines.push("\u2026");
  return { lines, truncated };
}
function formatMcpToolResultIdentity(details) {
  if (details?.mode !== "call") return null;
  const server2 = typeof details.server === "string" ? details.server : typeof details.hintServer === "string" ? details.hintServer : null;
  if (!server2) return null;
  if (typeof details.tool === "string") return `MCP ${server2}/${details.tool}`;
  if (typeof details.resourceUri === "string") return `MCP ${server2} resource ${details.resourceUri}`;
  if (typeof details.requestedTool === "string") return `MCP ${server2}/${details.requestedTool}`;
  return null;
}
function formatMcpToolResultLines(result, expanded, maxCollapsedLines = DEFAULT_BOXED_COLLAPSED_LINES, maxCollapsedChars = DEFAULT_MAX_COLLAPSED_CHARS) {
  if (!expanded) {
    return collectCollapsedResultLines(result.content, maxCollapsedLines, maxCollapsedChars);
  }
  const allLines = result.content.flatMap(blockToLines);
  const lines = allLines.length > 0 ? allLines : ["(empty result)"];
  return { lines, truncated: false };
}
function renderMcpToolResult(result, options, theme, context, renderOptions = resolveMcpToolRenderOptions()) {
  const activeTheme = theme ?? plainTheme;
  if (options.isPartial) {
    return new Text(activeTheme.fg("warning", "Running MCP tool..."), 0, 0);
  }
  const hasErrorDetails = Boolean(result.details.error);
  const expanded = options.expanded || context?.isError === true || hasErrorDetails;
  if (!expanded && renderOptions.resultRendering === "compact") {
    const display2 = formatMcpToolResultLines(result, false, renderOptions.collapsedResultLines);
    const title = context?.state?.compactTitle ?? formatMcpToolResultIdentity(result.details) ?? "";
    return new CompactMcpToolResult(title, display2, activeTheme);
  }
  const display = formatMcpToolResultLines(result, expanded, renderOptions.collapsedResultLines);
  const identity = formatMcpToolResultIdentity(result.details);
  const output = [
    ...identity ? [activeTheme.fg("muted", identity)] : [],
    ...display.lines.map((line) => activeTheme.fg("toolOutput", line))
  ].join("\n");
  return new CollapsibleText(
    output,
    expanded,
    renderOptions.collapsedResultLines + (identity ? 1 : 0),
    activeTheme.fg("muted", "\u2026"),
    activeTheme.fg("muted", "(Ctrl+O to expand)"),
    display.truncated
  );
}
function createMcpToolResultRenderer(renderOptions) {
  return (result, options, theme, context) => renderMcpToolResult(result, options, theme, context, renderOptions);
}

// error-signal.ts
function toolErrorOverride(details) {
  if (details && typeof details === "object" && "error" in details) {
    const code = details.error;
    if (code === "tool_error" || code === "call_failed") {
      return { isError: true };
    }
  }
  return void 0;
}

// mcp-code.ts
import { formatWithOptions } from "node:util";
import { Worker } from "node:worker_threads";
var DEFAULT_MCP_SCRIPT_TIMEOUT_MS = 3e4;
var McpScriptTimeoutError = class extends Error {
  constructor(timeoutMs) {
    super(`mcpScript timed out after ${timeoutMs}ms`);
    this.name = "McpScriptTimeoutError";
  }
};
function needsInspectableFormatting(value, stack = /* @__PURE__ */ new WeakSet()) {
  if (value === void 0 || typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") return true;
  if (typeof value !== "object" || value === null) return false;
  if (stack.has(value)) return true;
  if (value instanceof Map || value instanceof Set || value instanceof WeakMap || value instanceof WeakSet) return true;
  stack.add(value);
  try {
    return Object.values(value).some((entry) => needsInspectableFormatting(entry, stack));
  } finally {
    stack.delete(value);
  }
}
function formatValue(value) {
  if (typeof value === "string") return value;
  try {
    if (!needsInspectableFormatting(value)) {
      const json = JSON.stringify(value, null, 2);
      if (json !== void 0) return json;
    }
    return formatWithOptions({ colors: false, depth: 6 }, value);
  } catch {
    return "[unserializable value]";
  }
}
function toContentBlock(value) {
  if (typeof value === "object" && value !== null) {
    const block = value;
    if (block.type === "text" && typeof block.text === "string") {
      return { type: "text", text: block.text };
    }
    if (block.type === "image" && typeof block.data === "string" && typeof block.mimeType === "string") {
      return { type: "image", data: block.data, mimeType: block.mimeType };
    }
  }
  return { type: "text", text: formatValue(value) };
}
function textFromContent(content) {
  return content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
}
function abortReasonError(reason) {
  return reason instanceof Error ? reason : new Error(String(reason ?? "MCP request aborted"));
}
function parseWorkerMessage(value) {
  if (typeof value !== "object" || value === null) return null;
  const message = value;
  if (message.type === "emit" && "block" in message) return { type: "emit", block: message.block };
  if (message.type === "call" && typeof message.id === "number" && typeof message.path === "string") {
    return "args" in message ? { type: "call", id: message.id, path: message.path, args: message.args } : { type: "call", id: message.id, path: message.path };
  }
  if ((message.type === "search" || message.type === "describe") && typeof message.id === "number") {
    return "input" in message ? { type: message.type, id: message.id, input: message.input } : { type: message.type, id: message.id };
  }
  if (message.type === "done") {
    return "returnBlock" in message ? { type: "done", returnBlock: message.returnBlock } : { type: "done" };
  }
  if (message.type === "error" && typeof message.message === "string") {
    return { type: "error", message: message.message };
  }
  return null;
}
async function runMcpScript(state, code, timeoutMs = DEFAULT_MCP_SCRIPT_TIMEOUT_MS, getPiTools, signal) {
  const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : DEFAULT_MCP_SCRIPT_TIMEOUT_MS;
  const output = [];
  const externalSignal = combineAbortSignals(state.owner?.signal, signal);
  const timeoutController = new AbortController();
  const callSignal = combineAbortSignals(externalSignal, timeoutController.signal);
  const calls = [];
  const snapshotCalls = () => calls.map(({ startedAt, ...operation }) => ({
    ...operation,
    durationMs: "error" in operation && operation.error === "incomplete" ? Math.max(0, Date.now() - startedAt) : operation.durationMs
  }));
  let callsSnapshot;
  const callTool = async (path2, args) => {
    const startedAt = Date.now();
    const index = calls.push({ operation: "call", path: path2, ok: false, error: "incomplete", durationMs: 0, startedAt }) - 1;
    const result = await executeCall(state, path2, args, void 0, getPiTools, callSignal, "script");
    const details = result.details;
    if (details.error !== void 0) {
      const errorCode2 = String(details.error);
      const suggestions = Array.isArray(details.suggestions) ? details.suggestions.filter((suggestion) => typeof suggestion === "string") : [];
      const message = errorCode2 === "tool_not_found" ? `Tool "${path2}" not found. Use await tools.search({ query: "..." }) inside mcpScript.${suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}` : ""}` : typeof details.message === "string" ? details.message : textFromContent(result.content);
      calls[index] = { operation: "call", path: path2, ok: false, error: errorCode2, durationMs: Date.now() - startedAt, startedAt };
      return {
        ok: false,
        error: { code: errorCode2, message }
      };
    }
    calls[index] = { operation: "call", path: path2, ok: true, durationMs: Date.now() - startedAt, startedAt };
    return {
      ok: true,
      data: details.mcpResult !== void 0 ? details.mcpResult : textFromContent(result.content)
    };
  };
  const searchTools = (input) => {
    const startedAt = Date.now();
    const query = typeof input?.query === "string" ? input.query : "";
    let error;
    try {
      if (query.trim() === "") {
        return { items: [], total: 0, hasMore: false, nextOffset: null };
      }
      const server2 = typeof input?.server === "string" ? input.server : void 0;
      const limit = typeof input?.limit === "number" ? input.limit : 12;
      const offset = typeof input?.offset === "number" ? input.offset : 0;
      const page2 = paginate(rankToolMatches(state, query, server2), offset, limit);
      return {
        ...page2,
        items: page2.items.map(({ server: matchServer, tool, score }) => ({
          path: tool.name,
          name: tool.originalName,
          server: matchServer,
          ...tool.description ? { description: tool.description } : {},
          score
        }))
      };
    } catch (caught) {
      error = caught;
      throw caught;
    } finally {
      calls.push(error === void 0 ? { operation: "search", query, ok: true, durationMs: Date.now() - startedAt, startedAt } : { operation: "search", query, ok: false, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt, startedAt });
    }
  };
  const describeTool = (input) => {
    const startedAt = Date.now();
    const path2 = typeof input?.path === "string" ? input.path : "";
    let error;
    try {
      for (const [server2, metadata] of state.toolMetadata) {
        const tool = findToolByName(metadata, path2);
        if (!tool) continue;
        const inputTypeScript = tool.inputSchema ? renderTsShape(tool.inputSchema) ?? formatSchema(tool.inputSchema) : null;
        return {
          path: tool.name,
          name: tool.originalName,
          server: server2,
          ...tool.description ? { description: tool.description } : {},
          ...inputTypeScript ? { inputTypeScript } : {}
        };
      }
      const suggestions = path2 ? rankSuggestions(state, path2, 5) : [];
      error = "tool_not_found";
      return {
        path: path2,
        error: {
          code: "tool_not_found",
          message: `Tool not found: ${path2}`,
          suggestions
        }
      };
    } catch (caught) {
      error = caught;
      throw caught;
    } finally {
      calls.push(error === void 0 ? { operation: "describe", path: path2, ok: true, durationMs: Date.now() - startedAt, startedAt } : { operation: "describe", path: path2, ok: false, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt, startedAt });
    }
  };
  let worker;
  let timer;
  let removeAbortListener = () => {
  };
  let errorCode;
  let errorMessage;
  try {
    if (externalSignal?.aborted) {
      throw abortReasonError(externalSignal.reason);
    }
    worker = new Worker(new URL("./mcp-script-worker.mjs", import.meta.url), {
      workerData: { code },
      env: {}
    });
    const activeWorker = worker;
    const execution = new Promise((resolve6, reject) => {
      let completed = false;
      activeWorker.on("message", (value) => {
        const message = parseWorkerMessage(value);
        if (!message || completed) return;
        if (message.type === "emit") {
          output.push(toContentBlock(message.block));
          return;
        }
        if (message.type === "done") {
          completed = true;
          if ("returnBlock" in message) output.push(toContentBlock(message.returnBlock));
          resolve6();
          return;
        }
        if (message.type === "error") {
          completed = true;
          reject(new Error(message.message));
          return;
        }
        void (async () => {
          let envelope;
          if (message.type === "call") {
            envelope = await callTool(message.path, message.args);
          } else if (message.type === "search") {
            envelope = searchTools(message.input);
          } else {
            envelope = describeTool(message.input);
          }
          const response = { type: "result", id: message.id, envelope };
          activeWorker.postMessage(response);
        })().catch(reject);
      });
      activeWorker.once("error", reject);
      activeWorker.once("exit", (code2) => {
        if (!completed && code2 !== 0) reject(new Error(`mcpScript worker exited with code ${code2}`));
      });
    });
    const timeoutError = new McpScriptTimeoutError(resolvedTimeoutMs);
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => {
        callsSnapshot = snapshotCalls();
        timeoutController.abort(timeoutError);
        void activeWorker.terminate();
        reject(timeoutError);
      }, resolvedTimeoutMs);
    });
    const aborted = externalSignal ? new Promise((_resolve, reject) => {
      const onAbort = () => {
        callsSnapshot = snapshotCalls();
        void activeWorker.terminate();
        reject(abortReasonError(externalSignal.reason));
      };
      externalSignal.addEventListener("abort", onAbort, { once: true });
      removeAbortListener = () => externalSignal.removeEventListener("abort", onAbort);
    }) : new Promise(() => {
    });
    await Promise.race([execution, timeout, aborted]);
  } catch (error) {
    if (error instanceof McpScriptTimeoutError) {
      errorCode = "timeout";
      errorMessage = `mcpScript timed out after ${resolvedTimeoutMs}ms`;
    } else if (externalSignal?.aborted) {
      errorCode = "aborted";
      errorMessage = error instanceof Error ? error.message : String(error);
    } else {
      errorCode = "script_error";
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    output.push({ type: "text", text: errorMessage });
  } finally {
    clearTimeout(timer);
    removeAbortListener();
    callsSnapshot ??= snapshotCalls();
    timeoutController.abort(new Error("mcpScript finished"));
    await worker?.terminate();
  }
  const guarded = await guardMcpOutput(
    output.length > 0 ? [...output] : [{ type: "text", text: "(no output)" }],
    resolveMcpOutputGuardOptions(state.config.settings)
  );
  return {
    content: guarded.content,
    details: {
      mode: "script",
      ...errorCode ? { error: errorCode, message: errorMessage } : {},
      timeoutMs: resolvedTimeoutMs,
      ...callsSnapshot.length > 0 ? { calls: callsSnapshot } : {},
      ...guardedMcpDetails(guarded)
    }
  };
}

// index.ts
init_types();
var INIT_WAIT_TIMEOUT_MS = 3e4;
var INIT_WAIT_TIMED_OUT = /* @__PURE__ */ Symbol("init-wait-timed-out");
async function awaitWithTimeout(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve6) => {
        timer = setTimeout(() => resolve6(INIT_WAIT_TIMED_OUT), timeoutMs);
        timer.unref?.();
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function optionalNumber2(options) {
  const number = Type.Number;
  return typeof number === "function" ? Type.Optional(number(options)) : { type: "number", ...options };
}
function installMcpAdapter(pi, options) {
  const sessionConfig = options.config !== void 0 ? cloneMcpConfig(options.config) : void 0;
  const programmaticConfig = sessionConfig !== void 0;
  let state = null;
  let initPromise = null;
  let currentOwner = null;
  let currentOAuthRuntime = null;
  let lifecycleGeneration = 0;
  async function shutdownState(currentState, reason) {
    if (!currentState) {
      publishMcpStatusShutdown(pi.events);
      return;
    }
    publishMcpStatusShutdown(currentState.statusEvents);
    if (currentState.uiServer) {
      currentState.uiServer.close(reason);
      currentState.uiServer = null;
    }
    let flushError;
    try {
      flushMetadataCache(currentState);
    } catch (error) {
      flushError = error;
    }
    try {
      if (currentState.owner) {
        await currentState.owner.stop(reason);
      } else {
        await currentState.lifecycle.gracefulShutdown();
      }
    } catch (error) {
      if (flushError) {
        console.error(`MCP: graceful shutdown failed after metadata flush error: ${formatTerminalError(error)}`);
      } else {
        throw error;
      }
    }
    if (flushError) {
      throw flushError;
    }
  }
  const earlyConfigPath = programmaticConfig ? void 0 : options.configPath ?? getConfigPathFromArgv();
  const earlyConfig = programmaticConfig ? cloneMcpConfig(sessionConfig) : loadMcpConfig(earlyConfigPath);
  const earlyCache = loadMetadataCache();
  const envRaw = process.env.MCP_DIRECT_TOOLS;
  const envDirectToolOverride = envRaw?.split(",").map((s) => s.trim()).filter(Boolean);
  const registeredDirectTools = /* @__PURE__ */ new Map();
  const fallbackDeactivatedTools = /* @__PURE__ */ new Set();
  const toolRenderOptions = resolveMcpToolRenderOptions(earlyConfig.settings);
  const toolRenderShell = toolRenderOptions.resultRendering === "compact" ? "self" : "default";
  const renderMcpToolResult2 = createMcpToolResultRenderer(toolRenderOptions);
  let proxyToolRegistered = false;
  let proxyToolDescription = null;
  let directToolsFrozen = false;
  const toToolParameters = (schema) => typeof Type.Unsafe === "function" ? Type.Unsafe(schema) : schema;
  function directToolFingerprint(spec) {
    return JSON.stringify({
      serverName: spec.serverName,
      originalName: spec.originalName,
      prefixedName: spec.prefixedName,
      description: spec.description,
      inputSchema: spec.inputSchema,
      resourceUri: spec.resourceUri,
      uiResourceUri: spec.uiResourceUri,
      uiStreamMode: spec.uiStreamMode
    });
  }
  function registerDirectTool(spec) {
    pi.registerTool({
      name: spec.prefixedName,
      label: `MCP: ${spec.originalName}`,
      description: spec.description || "(no description)",
      promptSnippet: truncateAtWord(spec.description, 100) || `MCP tool from ${spec.serverName}`,
      parameters: toToolParameters(normalizeDirectToolInputSchema(spec.inputSchema)),
      execute: createDirectToolExecutor(() => state, () => initPromise, spec),
      renderShell: toolRenderShell,
      renderCall: createMcpDirectToolCallRenderer(spec.prefixedName, toolRenderOptions),
      renderResult: renderMcpToolResult2
    });
  }
  function resolveCurrentDirectTools(config, cache) {
    if (envRaw === "__none__") return [];
    const prefix = config.settings?.toolPrefix ?? "server";
    return resolveDirectTools(config, cache, prefix, envDirectToolOverride);
  }
  function getActiveToolsIfReady() {
    try {
      return pi.getActiveTools?.();
    } catch (error) {
      if (error instanceof Error && error.message.includes("Action methods cannot be called during extension loading")) return void 0;
      throw error;
    }
  }
  function deactivateTools(toolNames) {
    if (toolNames.length === 0) return [];
    const unregisterTool = pi.unregisterTool;
    const unregistered = toolNames.filter((toolName) => unregisterTool?.(toolName) === true);
    const fallbackNames = toolNames.filter((toolName) => !unregistered.includes(toolName));
    const remove = new Set(toolNames);
    const activeTools = getActiveToolsIfReady();
    if (!activeTools || activeTools.length === 0) {
      for (const toolName of fallbackNames) fallbackDeactivatedTools.add(toolName);
      return unregistered;
    }
    const nextActiveTools = activeTools.filter((name) => !remove.has(name));
    if (nextActiveTools.length !== activeTools.length) {
      for (const toolName of fallbackNames) fallbackDeactivatedTools.add(toolName);
      pi.setActiveTools(nextActiveTools);
    }
    return unregistered;
  }
  function syncDirectTools(config, cache) {
    const specs = resolveCurrentDirectTools(config, cache);
    const nextNames = new Set(specs.map((spec) => spec.prefixedName));
    const added = [];
    const updated = [];
    const deactivated = [];
    for (const spec of specs) {
      const fingerprint = directToolFingerprint(spec);
      const previous = registeredDirectTools.get(spec.prefixedName);
      if (previous !== fingerprint) {
        registerDirectTool(spec);
        registeredDirectTools.set(spec.prefixedName, fingerprint);
        if (fallbackDeactivatedTools.delete(spec.prefixedName)) {
          const activeTools = getActiveToolsIfReady();
          if (activeTools && !activeTools.includes(spec.prefixedName)) {
            pi.setActiveTools([...activeTools, spec.prefixedName]);
          }
        }
        (previous ? updated : added).push(spec.prefixedName);
      }
    }
    for (const toolName of [...registeredDirectTools.keys()]) {
      if (nextNames.has(toolName)) continue;
      registeredDirectTools.delete(toolName);
      deactivated.push(toolName);
    }
    deactivateTools(deactivated);
    return { specs, added, updated, deactivated };
  }
  function applyDirectToolConfigChanges(changes) {
    if (!state) return;
    for (const [serverName, value] of changes) {
      const definition = state.config.mcpServers[serverName];
      if (!definition) continue;
      state.config.mcpServers[serverName] = { ...definition, directTools: value };
    }
  }
  function syncToolSurface(ctx) {
    const config = state?.config ?? earlyConfig;
    const cache = loadMetadataCache();
    const result = syncDirectTools(config, cache);
    syncProxyTool(config, cache, result.specs);
    const changed = result.added.length + result.updated.length + result.deactivated.length;
    if (changed > 0 && ctx?.hasUI) {
      ctx.ui.notify(
        `MCP: direct tools refreshed (+${result.added.length}, ~${result.updated.length}, -${result.deactivated.length})`,
        "info"
      );
    }
  }
  const registeredPromptCommands = /* @__PURE__ */ new Set();
  function registerPromptCommands(specs) {
    for (const spec of specs) {
      if (registeredPromptCommands.has(spec.commandName)) {
        logger.debug(`MCP: prompt "${spec.originalName}" on ${spec.serverName} skipped; /${spec.commandName} is already registered`);
        continue;
      }
      registeredPromptCommands.add(spec.commandName);
      pi.registerCommand(spec.commandName, createPromptCommand(pi, () => state, spec));
    }
  }
  function syncPromptCommands() {
    registerPromptCommands([...state?.promptMetadata?.values() ?? []].flat());
  }
  registerPromptCommands(resolveCachedPrompts(earlyConfig));
  const getPiTools = () => pi.getAllTools();
  pi.registerFlag("mcp-config", {
    description: "Path to MCP config file",
    type: "string"
  });
  function startInitialization(ctx, owner, oauthRuntime, generation, staleReason) {
    owner.addCleanup(() => cleanupMaterializedBinaryResources(owner.signal));
    const promise = initializeMcp(pi, ctx, owner, {
      ...programmaticConfig || options.configPath !== void 0 ? {
        ...earlyConfigPath !== void 0 ? { configPath: earlyConfigPath } : {},
        ...sessionConfig !== void 0 ? { config: sessionConfig } : {}
      } : {},
      oauthRuntime,
      statusEvents: pi.events
    });
    initPromise = promise;
    return promise.then(async (nextState) => {
      if (!owner.isActive() || generation !== lifecycleGeneration || initPromise !== promise) {
        try {
          await shutdownState(nextState, staleReason);
        } catch (error) {
          console.error(`MCP: failed to clean stale initialization state: ${formatTerminalError(error)}`);
        }
        return;
      }
      state = nextState;
      nextState.onToolMetadataUpdated = (_serverName, _reason) => {
        if (state !== nextState || !owner.isActive()) return;
        syncPromptCommands();
        if (directToolsFrozen) {
          logger.debug(`MCP: metadata update for ${_serverName} (${_reason}) skipped \u2014 directTools frozen`);
          return;
        }
        syncToolSurface(ctx);
      };
      syncPromptCommands();
      syncToolSurface(ctx);
      updateStatusBar(nextState);
      initPromise = null;
      if (earlyConfig.settings?.freezeDirectTools === true) {
        directToolsFrozen = true;
        logger.info(`MCP: direct tools frozen after initial sync \u2014 reconnects won't rebuild the system prompt; use mcp({ connect: "server" }) to rediscover`);
      }
    }).catch(async (err) => {
      if (!owner.isActive() || generation !== lifecycleGeneration) {
        return;
      }
      if (initPromise !== promise && initPromise !== null) {
        return;
      }
      console.error(`MCP initialization failed: ${formatTerminalError(err)}`);
      initPromise = null;
      if (state) return;
      try {
        await Promise.all([
          owner.stop("MCP initialization failed"),
          shutdownOAuth(oauthRuntime)
        ]);
      } catch (error) {
        console.error(`MCP: failed to clean rejected initialization: ${formatTerminalError(error)}`);
      }
    });
  }
  function startLoadTimeInitialization() {
    const hasStartupServer = Object.values(earlyConfig.mcpServers).some((definition) => {
      if (definition.disabled === true) return false;
      return definition.lifecycle === "eager" || definition.lifecycle === "keep-alive";
    });
    if (!hasStartupServer) return;
    setImmediate(() => {
      if (lifecycleGeneration !== 0 || state || initPromise) return;
      const generation = ++lifecycleGeneration;
      const owner = createMcpRuntimeOwner();
      const oauthRuntime = createOAuthRuntime(owner.signal);
      currentOwner = owner;
      currentOAuthRuntime = oauthRuntime;
      startInitialization({
        mode: "print",
        hasUI: false,
        cwd: process.cwd(),
        model: void 0,
        modelRegistry: void 0,
        signal: void 0
      }, owner, oauthRuntime, generation, "stale_load_time_initialization");
    });
  }
  pi.on("session_start", async (_event, ctx) => {
    const generation = ++lifecycleGeneration;
    const previousState = state;
    const previousOwner = currentOwner;
    const previousOAuthRuntime = currentOAuthRuntime;
    const owner = createMcpRuntimeOwner();
    const oauthRuntime = createOAuthRuntime(owner.signal);
    currentOwner = owner;
    currentOAuthRuntime = oauthRuntime;
    state = null;
    initPromise = null;
    const stopPrevious = previousOwner?.stop("MCP extension session restarted") ?? Promise.resolve();
    try {
      await Promise.all([
        stopPrevious,
        shutdownState(previousState, "session_restart"),
        previousOAuthRuntime ? shutdownOAuth(previousOAuthRuntime) : Promise.resolve()
      ]);
    } catch (error) {
      console.error(`MCP: failed to shut down previous session state: ${formatTerminalError(error)}`);
    }
    if (generation !== lifecycleGeneration || !owner.isActive()) return;
    const initialization = startInitialization(ctx, owner, oauthRuntime, generation, "stale_session_start");
    if (envRaw !== void 0 && envRaw !== "__none__") {
      const missingEnvDirectTools = getMissingConfiguredDirectToolServers(
        earlyConfig,
        loadMetadataCache(),
        envDirectToolOverride
      );
      if (missingEnvDirectTools.length > 0) {
        await initialization;
      }
    }
  });
  pi.on("session_shutdown", async () => {
    ++lifecycleGeneration;
    const currentState = state;
    const owner = currentOwner;
    const oauthRuntime = currentOAuthRuntime;
    currentOwner = null;
    currentOAuthRuntime = null;
    state = null;
    initPromise = null;
    const stopOwner = owner?.stop("MCP extension session shutdown") ?? Promise.resolve();
    try {
      await Promise.all([
        stopOwner,
        shutdownState(currentState, "session_shutdown"),
        oauthRuntime ? shutdownOAuth(oauthRuntime) : Promise.resolve()
      ]);
    } catch (error) {
      console.error(`MCP: session shutdown cleanup failed: ${formatTerminalError(error)}`);
    }
  });
  pi.on("tool_result", (event) => toolErrorOverride(event.details));
  pi.registerCommand("mcp", {
    description: "Show MCP server status",
    getArgumentCompletions: (prefix) => {
      const normalized = prefix.trimStart();
      const argumentMatch = normalized.match(/^(\S+)\s+(.*)$/);
      if (!argumentMatch) {
        const subcommands = [
          { value: "reconnect", label: "reconnect \u2014 Reconnect servers" },
          { value: "tools", label: "tools \u2014 List all tools" },
          { value: "prompts", label: "prompts \u2014 List all MCP prompts" },
          { value: "setup", label: "setup \u2014 Configure MCP servers" },
          { value: "logout", label: "logout \u2014 Clear server credentials" },
          { value: "disable", label: "disable \u2014 Disable a server" },
          { value: "enable", label: "enable \u2014 Enable a server" },
          { value: "status", label: "status \u2014 Show server status" }
        ].filter(({ value }) => value.startsWith(normalized));
        return subcommands.length > 0 ? subcommands : null;
      }
      const [, subcommand, argumentPrefix] = argumentMatch;
      if (subcommand !== "reconnect" && subcommand !== "logout" && subcommand !== "disable" && subcommand !== "enable" || argumentPrefix === void 0 || !state) return null;
      const servers = Object.keys(state.config.mcpServers).filter((serverName) => serverName.startsWith(argumentPrefix.trimStart())).map((serverName) => ({ value: `${subcommand} ${serverName}`, label: serverName }));
      return servers.length > 0 ? servers : null;
    },
    handler: async (args, ctx) => {
      const commandOwner = currentOwner;
      const commandReload = typeof ctx.reload === "function" ? ctx.reload.bind(ctx) : async () => {
      };
      const commandHasUI = ctx.hasUI;
      const commandCtx = {
        hasUI: commandHasUI,
        ui: commandHasUI ? commandOwner ? createOwnedUi(ctx.ui, commandOwner) : ctx.ui : void 0,
        cwd: ctx.cwd,
        mode: ctx.mode,
        signal: commandOwner?.signal ?? ctx.signal
      };
      if (!state && initPromise) {
        try {
          const initialized = await initPromise;
          commandOwner?.throwIfInactive();
          state = initialized;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (commandCtx.hasUI) commandCtx.ui?.notify(`MCP initialization failed: ${message}`, "error");
          return;
        }
      }
      if (!state) {
        if (commandCtx.hasUI) commandCtx.ui?.notify("MCP not initialized", "error");
        return;
      }
      const parts = args?.trim()?.split(/\s+/) ?? [];
      const subcommand = parts[0] ?? "";
      const targetServer = parts[1];
      const rest = parts.slice(1).join(" ");
      switch (subcommand) {
        case "reconnect":
          commandOwner?.throwIfInactive();
          await reconnectServers(state, commandCtx, targetServer);
          if (directToolsFrozen) syncToolSurface(commandCtx);
          break;
        case "tools":
          await showTools(state, commandCtx);
          break;
        case "prompts":
          await showPrompts(state, commandCtx);
          break;
        case "setup": {
          commandOwner?.throwIfInactive();
          if (programmaticConfig) {
            commandCtx.ui?.notify("MCP setup is unavailable when config is supplied by createMcpAdapter().", "info");
            break;
          }
          const result = await openMcpSetup(state, pi, commandCtx, earlyConfigPath, "setup");
          if (result?.configChanged) {
            commandOwner?.throwIfInactive();
            await commandReload();
            return;
          }
          break;
        }
        case "logout": {
          const serverName = rest;
          if (!serverName) {
            if (commandCtx.hasUI) commandCtx.ui?.notify("Usage: /mcp logout <server>", "error");
            return;
          }
          commandOwner?.throwIfInactive();
          await logoutServer(serverName, state, commandCtx);
          break;
        }
        case "disable":
        case "enable": {
          const serverName = rest;
          if (programmaticConfig) {
            commandCtx.ui?.notify(`/mcp ${subcommand} is unavailable when config is supplied by createMcpAdapter().`, "info");
            break;
          }
          if (!serverName) {
            commandCtx.ui?.notify(`Usage: /mcp ${subcommand} <server>`, "error");
            break;
          }
          if (!state.config.mcpServers[serverName]) {
            commandCtx.ui?.notify(`Server "${serverName}" not found in effective config`, "error");
            break;
          }
          commandOwner?.throwIfInactive();
          const result = writeProjectServerDisabledOverride(earlyConfigPath, commandCtx.cwd, serverName, subcommand === "disable");
          if (result.changed) {
            commandCtx.ui?.notify(`${subcommand === "disable" ? "Disabled" : "Enabled"} server "${serverName}" in ${result.path} \u2014 run /reload to apply`, "info");
          } else {
            commandCtx.ui?.notify(`Server "${serverName}" is already ${subcommand === "disable" ? "disabled" : "enabled"}`, "info");
          }
          break;
        }
        case "status":
        case "":
        default:
          if (commandCtx.hasUI) {
            commandOwner?.throwIfInactive();
            if (programmaticConfig) {
              commandCtx.ui?.notify("MCP status is shown from the in-memory SDK config; configuration discovery is unavailable.", "info");
              await showStatus(state, commandCtx);
              break;
            }
            const result = await openMcpPanel(state, pi, commandCtx, earlyConfigPath, (changes) => {
              applyDirectToolConfigChanges(changes);
              syncToolSurface(commandCtx);
            });
            if (result?.configChanged) {
              commandOwner?.throwIfInactive();
              await commandReload();
              return;
            }
          } else {
            await showStatus(state, commandCtx);
          }
          break;
      }
    }
  });
  pi.registerCommand("mcp-auth", {
    description: "Authenticate with an MCP server (OAuth)",
    handler: async (args, ctx) => {
      const commandOwner = currentOwner;
      const commandHasUI = ctx.hasUI;
      const commandCtx = {
        hasUI: commandHasUI,
        ui: commandHasUI ? commandOwner ? createOwnedUi(ctx.ui, commandOwner) : ctx.ui : void 0,
        cwd: ctx.cwd,
        mode: ctx.mode,
        signal: commandOwner?.signal ?? ctx.signal
      };
      const serverName = args?.trim();
      if (!serverName && !commandCtx.hasUI) {
        return;
      }
      if (!state && initPromise) {
        try {
          const initialized = await initPromise;
          commandOwner?.throwIfInactive();
          state = initialized;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (commandCtx.hasUI) commandCtx.ui?.notify(`MCP initialization failed: ${message}`, "error");
          return;
        }
      }
      if (!state) {
        if (commandCtx.hasUI) commandCtx.ui?.notify("MCP not initialized", "error");
        return;
      }
      if (!serverName) {
        if (programmaticConfig) {
          commandCtx.ui?.notify("Use /mcp-auth <server> to authenticate a server from the in-memory SDK config.", "info");
          return;
        }
        await openMcpAuthPanel(state, pi, commandCtx, earlyConfigPath);
        return;
      }
      const result = await authenticateServer(serverName, state.config, commandCtx, commandCtx.signal, state.oauthRuntime);
      if (result.ok) {
        commandOwner?.throwIfInactive();
        await reconnectServer(state, commandCtx, serverName);
      }
    }
  });
  if (earlyConfig.settings?.scriptMode !== false) {
    pi.registerTool({
      name: "mcpScript",
      label: "MCP Script",
      description: "Run trusted JavaScript that makes multiple MCP tool calls in one request \u2014 loop, filter, chain, or fan out between calls. For a single MCP call, search, describe, status check, or auth action, use the mcp tool instead. Discover with await tools.search({ query }) \u2014 resolves to { items: [{ path, name, server, description? }], total, hasMore, nextOffset }, not an { ok, data } envelope. Inspect with await tools.describe({ path }) \u2014 resolves to the tool descriptor with inputTypeScript, or { path, error: { code, message, suggestions } }. Then call tools.call(path, args) \u2014 resolves to { ok: true, data } or { ok: false, error: { code, message } } \u2014 or use direct flat calls when the name is already known; use emit(value) for user-visible output. Load the mcp-scripting skill for the full workflow guide.",
      promptSnippet: "Batch multiple MCP tool calls in one JavaScript request (loop, filter, chain)",
      parameters: Type.Object({
        code: Type.String({ description: "Trusted JavaScript MCP script. Use tools.<prefixedToolName>(args) and emit(value)." }),
        timeoutMs: optionalNumber2({ minimum: 1, description: "Execution timeout in milliseconds (default: 30000)" })
      }),
      renderResult: renderMcpToolResult2,
      async execute(_toolCallId, params, signal) {
        const executeOwner = currentOwner;
        if (!state && initPromise) {
          try {
            const initialized = await awaitWithTimeout(initPromise, INIT_WAIT_TIMEOUT_MS);
            if (initialized === INIT_WAIT_TIMED_OUT) {
              return {
                content: [{ type: "text", text: "MCP initialization is still in progress. Try again shortly." }],
                details: { mode: "script", error: "init_timeout", timeoutMs: INIT_WAIT_TIMEOUT_MS }
              };
            }
            executeOwner?.throwIfInactive();
            state = initialized;
          } catch (error) {
            if (executeOwner && isAbortError(error, executeOwner.signal)) throw error;
            const message = error instanceof Error ? error.message : String(error);
            return {
              content: [{ type: "text", text: `MCP initialization failed: ${message}` }],
              details: { mode: "script", error: "init_failed", message }
            };
          }
        }
        if (!state) {
          return {
            content: [{ type: "text", text: "MCP not initialized" }],
            details: { mode: "script", error: "not_initialized" }
          };
        }
        executeOwner?.throwIfInactive();
        return runMcpScript(state, params.code, params.timeoutMs, getPiTools, signal);
      }
    });
  }
  function registerProxyTool(description) {
    pi.registerTool({
      name: "mcp",
      label: "MCP",
      description,
      promptSnippet: "MCP gateway \u2014 status, search, describe, auth, and single MCP tool calls",
      renderShell: toolRenderShell,
      renderCall: createMcpProxyToolCallRenderer(toolRenderOptions),
      parameters: Type.Object({
        tool: Type.Optional(Type.String({ description: "Tool name to call (e.g., 'xcodebuild_list_sims')" })),
        args: Type.Optional(Type.Union([
          Type.String({ description: `Arguments as a JSON string (e.g., '{"key": "value"}')` }),
          Type.Object({}, {
            additionalProperties: true,
            description: 'Arguments as a JSON object (e.g., { "key": "value" })'
          })
        ], { description: "Tool arguments as a JSON object, or as a JSON string encoding one" })),
        connect: Type.Optional(Type.String({ description: "Server name to connect (lazy connect + metadata refresh)" })),
        describe: Type.Optional(Type.String({ description: "Tool name to describe (shows parameters)" })),
        instructions: Type.Optional(Type.String({ description: "Server name to show that server's usage instructions" })),
        search: Type.Optional(Type.String({ description: "Search tools by name/description" })),
        regex: Type.Optional(Type.Boolean({ description: "Treat search as regex (default: substring match)" })),
        includeSchemas: Type.Optional(Type.Boolean({ description: "Include parameter schemas in search results (default: true)" })),
        limit: optionalNumber2({ minimum: 1, description: "Maximum search results to return (default: 12)" }),
        offset: optionalNumber2({ minimum: 0, description: "Search result offset (default: 0)" }),
        server: Type.Optional(Type.String({ description: "Filter to specific server (also disambiguates tool calls)" })),
        action: Type.Optional(Type.String({ description: "Action: 'ui-messages', 'auth-start', or 'auth-complete'" }))
      }),
      renderResult: renderMcpToolResult2,
      async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
        const executeOwner = currentOwner;
        const parseArgs = (value) => {
          if (value === void 0 || value === "") return void 0;
          let args;
          if (typeof value === "string") {
            try {
              args = JSON.parse(value);
            } catch (error) {
              if (error instanceof SyntaxError) {
                throw new Error(`Invalid args JSON: ${error.message}`, { cause: error });
              }
              throw error;
            }
          } else {
            args = value;
          }
          if (typeof args !== "object" || args === null || Array.isArray(args)) {
            const gotType = Array.isArray(args) ? "array" : args === null ? "null" : typeof args;
            throw new Error(`Invalid args: expected a JSON object, got ${gotType}`);
          }
          return args;
        };
        let parsedArgs = parseArgs(params.args);
        let dispatchParams = params;
        const hasGatewayMode = (value) => value.tool !== void 0 || value.connect !== void 0 || value.describe !== void 0 || value.instructions !== void 0 || value.search !== void 0 || value.server !== void 0 || value.action !== void 0;
        if (!hasGatewayMode(params) && parsedArgs) {
          const nestedParams = parsedArgs;
          if (hasGatewayMode(nestedParams)) {
            dispatchParams = nestedParams;
            parsedArgs = parseArgs(nestedParams.args);
          } else {
            throw new Error('Gateway params were nested inside `args`; pass them top-level (for example, mcp({ search: "..." }) or mcp({ tool: "...", args: {} })).');
          }
        } else if (!hasGatewayMode(params) && params.args !== void 0) {
          throw new Error('Gateway params were nested inside `args`; pass them top-level (for example, mcp({ search: "..." }) or mcp({ tool: "...", args: {} })).');
        }
        if (!state && initPromise) {
          try {
            const initialized = await awaitWithTimeout(initPromise, INIT_WAIT_TIMEOUT_MS);
            if (initialized === INIT_WAIT_TIMED_OUT) {
              return {
                content: [{ type: "text", text: "MCP initialization is still in progress. Try again shortly." }],
                details: { error: "init_timeout", timeoutMs: INIT_WAIT_TIMEOUT_MS }
              };
            }
            executeOwner?.throwIfInactive();
            state = initialized;
          } catch (error) {
            if (executeOwner && isAbortError(error, executeOwner.signal)) throw error;
            const message = error instanceof Error ? error.message : String(error);
            return {
              content: [{ type: "text", text: `MCP initialization failed: ${message}` }],
              details: { error: "init_failed", message }
            };
          }
        }
        if (!state) {
          return {
            content: [{ type: "text", text: "MCP not initialized" }],
            details: { error: "not_initialized" }
          };
        }
        executeOwner?.throwIfInactive();
        if (dispatchParams.action === "ui-messages") {
          return executeUiMessages(state);
        }
        if (dispatchParams.action === "auth-start") {
          if (!dispatchParams.server) {
            return {
              content: [{ type: "text", text: 'auth-start requires `server`. Example: mcp({ action: "auth-start", server: "linear-server" })' }],
              details: { mode: "auth-start", error: "missing_server" }
            };
          }
          return signal ? executeAuthStart(state, dispatchParams.server, signal) : executeAuthStart(state, dispatchParams.server);
        }
        if (dispatchParams.action === "auth-complete") {
          if (!dispatchParams.server) {
            return {
              content: [{ type: "text", text: "auth-complete requires `server`." }],
              details: { mode: "auth-complete", error: "missing_server" }
            };
          }
          const input = parsedArgs?.redirectUrl ?? parsedArgs?.code ?? parsedArgs?.input;
          if (typeof input !== "string" || input.trim().length === 0) {
            return {
              content: [{ type: "text", text: "auth-complete requires args with `redirectUrl`, `code`, or `input`." }],
              details: { mode: "auth-complete", error: "missing_input" }
            };
          }
          return signal ? executeAuthComplete(state, dispatchParams.server, input, signal) : executeAuthComplete(state, dispatchParams.server, input);
        }
        if (dispatchParams.tool) {
          return executeCall(state, dispatchParams.tool, parsedArgs, dispatchParams.server, getPiTools, signal);
        }
        if (dispatchParams.connect) {
          const result = await executeConnect(state, dispatchParams.connect, signal);
          syncToolSurface(_ctx);
          return result;
        }
        if (dispatchParams.describe) {
          return executeDescribe(state, dispatchParams.describe);
        }
        if (dispatchParams.instructions) {
          return executeInstructions(state, dispatchParams.instructions);
        }
        if (dispatchParams.search !== void 0) {
          return executeSearch(state, dispatchParams.search, dispatchParams.regex, dispatchParams.server, dispatchParams.includeSchemas, dispatchParams.limit, dispatchParams.offset);
        }
        if (dispatchParams.server) {
          return executeList(state, dispatchParams.server);
        }
        return executeStatus(state);
      }
    });
    proxyToolRegistered = true;
    proxyToolDescription = description;
  }
  function syncProxyTool(config, cache, directSpecs) {
    const missingConfiguredDirectToolServers = getMissingConfiguredDirectToolServers(
      config,
      cache,
      envRaw === void 0 || envRaw === "__none__" ? void 0 : envDirectToolOverride
    );
    const shouldRegisterProxyTool = config.settings?.disableProxyTool !== true || directSpecs.length === 0 || missingConfiguredDirectToolServers.length > 0;
    if (shouldRegisterProxyTool) {
      const description = buildProxyDescription(config, cache, directSpecs);
      if (!proxyToolRegistered || proxyToolDescription !== description) {
        registerProxyTool(description);
        return;
      }
      const activeTools = getActiveToolsIfReady();
      if (activeTools && !activeTools.includes("mcp")) {
        pi.setActiveTools([...activeTools, "mcp"]);
      }
      return;
    }
    if (proxyToolRegistered) {
      const unregistered = deactivateTools(["mcp"]);
      if (unregistered.includes("mcp")) {
        proxyToolRegistered = false;
        proxyToolDescription = null;
      }
    }
  }
  const initialDirectTools = syncDirectTools(earlyConfig, earlyCache).specs;
  syncProxyTool(earlyConfig, earlyCache, initialDirectTools);
  startLoadTimeInitialization();
}
function createMcpAdapter(options = {}) {
  const factoryConfig = options.config !== void 0 ? cloneMcpConfig(options.config) : void 0;
  return function mcpAdapter(pi) {
    installMcpAdapter(pi, {
      ...options.configPath !== void 0 ? { configPath: options.configPath } : {},
      ...factoryConfig !== void 0 ? { config: cloneMcpConfig(factoryConfig) } : {}
    });
  };
}
var index_default = createMcpAdapter();
export {
  MCP_STATUS_EVENT,
  MCP_STATUS_SNAPSHOT_VERSION,
  MCP_TOOL_APPROVAL_REQUEST_EVENT,
  createMcpAdapter,
  index_default as default
};
