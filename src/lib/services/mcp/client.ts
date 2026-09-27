/**
 * Client-side MCP client for the Tauri desktop build. HTTP requests go through
 * the Tauri HTTP plugin, which runs in the Rust core and therefore bypasses
 * webview CORS (plain fetch would be blocked by servers like Home Assistant).
 * stdio is server-side only and reports a clear error here.
 * Port of utsuwa 0.15.0.
 */
import type { McpServerConfig, McpTool, McpToolResult } from '$lib/types/mcp';
import { createHttpMcpClient, type FetchLike } from './http-client.ts';

let clientPromise: Promise<ReturnType<typeof createHttpMcpClient>> | null = null;

function getHttpClient() {
	if (!clientPromise) {
		clientPromise = import('@tauri-apps/plugin-http').then(({ fetch }) =>
			createHttpMcpClient(fetch as unknown as FetchLike)
		);
	}
	return clientPromise;
}

export async function listTools(config: McpServerConfig): Promise<McpTool[]> {
	if (config.transport === 'stdio') {
		// Surface this through the per-server error channel instead of an
		// empty list (callTool reports the same for stdio on desktop).
		throw new Error('Los servidores MCP stdio solo están disponibles en el build web con servidor.');
	}
	const client = await getHttpClient();
	return client.listTools(config);
}

export async function callTool(
	config: McpServerConfig,
	toolName: string,
	args: Record<string, unknown>
): Promise<McpToolResult> {
	if (config.transport === 'stdio') {
		return {
			toolName,
			content: 'Error: los servidores MCP stdio solo están disponibles en el build web con servidor.',
			isError: true
		};
	}
	const client = await getHttpClient();
	return client.callTool(config, toolName, args);
}
