import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installDeferred } from "./lazy-extension.js";

export default function (pi: ExtensionAPI) {
	pi.registerFlag("mcp-config", {
		description: "Path to MCP config file",
		type: "string",
	});
	installDeferred(pi, () => import("./index.js"), {
		commands: [
			{ name: "mcp", description: "MCP status, tools, prompts, and setup" },
			{ name: "mcp-auth", description: "Authenticate an MCP server" },
		],
	});
}
