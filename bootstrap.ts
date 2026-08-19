import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installDeferred } from "./lazy-extension.js";

export default function (pi: ExtensionAPI) {
	pi.registerFlag("mcp-config", {
		description: "Path to MCP config file",
		type: "string",
	});
	installDeferred(pi, () => import("./index.js"));
}
