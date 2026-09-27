import test from 'node:test';
import assert from 'node:assert/strict';
import {
	MCP_MAX_ROUNDS,
	MAX_TOOL_CALLS_PER_ROUND,
	buildAssistantToolMessage,
	buildToolResultMessages,
	capToolResult,
	ensureToolPairs,
	findMcpTool,
	mcpCallsOnly,
	splitToolCalls,
	speechToolAck,
	stripFromStateFence,
	toOpenAiTool,
	toOpenAiToolCalls
} from './loop.ts';
import type { McpTool } from '$lib/types/mcp';

const tool: McpTool = {
	serverId: 's1',
	serverName: 'S1',
	name: 'get_weather',
	description: 'Weather lookup',
	inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
};

test('MCP tools convert to OpenAI definitions without MCP-only fields', () => {
	const def = toOpenAiTool({ ...tool, inputSchema: { type: 'object', outputSchema: {} } } as McpTool);
	assert.equal(def.type, 'function');
	assert.equal(def.function.name, 'get_weather');
	assert.equal('outputSchema' in def.function.parameters, false);
});

test('round bounds are the utsuwa safety limits', () => {
	assert.equal(MCP_MAX_ROUNDS, 5);
	assert.equal(MAX_TOOL_CALLS_PER_ROUND, 8);
});

test('splitToolCalls keeps the first N and reports the skipped tail', () => {
	const calls = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: 'x', args: {} }));
	const { run, skipped } = splitToolCalls(calls);
	assert.equal(run.length, 8);
	assert.equal(skipped.length, 2);
	assert.equal(run[0].id, 'c0');
});

test('capToolResult truncates with a visible marker', () => {
	const big = 'x'.repeat(9000);
	const capped = capToolResult(big);
	assert.equal(capped.length, 8000 + '\n…[truncated]'.length);
	assert.ok(capped.endsWith('…[truncated]'));
	assert.equal(capToolResult('small'), 'small');
});

test('ensureToolPairs walks back to the parent assistant message', () => {
	const all = [
		{ role: 'user' },
		{ role: 'assistant' },
		{ role: 'tool' },
		{ role: 'tool' },
		{ role: 'assistant' }
	];
	const kept = all.slice(3); // [tool, assistant]
	assert.equal(kept[0].role, 'tool');
	const repaired = ensureToolPairs(all, kept);
	// Walks back over the tool message to its parent assistant call; the
	// trailing assistant message stays.
	assert.equal(repaired[0].role, 'assistant');
	assert.deepEqual(repaired.map((m) => m.role), ['assistant', 'tool', 'tool', 'assistant']);
	assert.equal(repaired.length, 4);
	// A slice that does not start with a tool message stays untouched.
	assert.equal(ensureToolPairs(all, all.slice(1)).length, 4);
	assert.equal(ensureToolPairs(all, []).length, 0);
});

test('assistant tool message carries OpenAI-shaped calls with JSON args', () => {
	const msg = buildAssistantToolMessage('thinking…', [{ id: 'c1', name: 'get_weather', args: { city: 'Lima' } }]);
	assert.equal(msg.role, 'assistant');
	assert.equal(msg.tool_calls?.[0].function.arguments, '{"city":"Lima"}');
	assert.deepEqual(toOpenAiToolCalls([{ id: 'c1', name: 't', args: {} }])[0].type, 'function');
});

test('tool results include the call id and optional user-side copy', () => {
	const messages = buildToolResultMessages([
		{ call: { id: 'c1', name: 'a', args: {} }, content: 'result' },
		{ call: { id: 'c2', name: 'b', args: {} }, content: 'big', injectAsUser: true }
	]);
	assert.equal(messages[0].role, 'tool');
	assert.equal(messages[0].tool_call_id, 'c1');
	assert.equal(messages[1].tool_call_id, 'c2');
	assert.equal(messages[2].role, 'user');
	assert.match(messages[2].content, /Tool result from b/);
});

test('speech calls are acked; only MCP tool names survive mcpCallsOnly', () => {
	assert.equal(speechToolAck({ text: 'hola' }), '{"result":{"text":"hola"}}');
	const tools = [tool];
	const calls = [
		{ id: '1', name: 'get_weather', args: {} },
		{ id: '2', name: 'hallucinated', args: {} }
	];
	assert.deepEqual(mcpCallsOnly(calls, tools).map((c) => c.name), ['get_weather']);
	assert.equal(findMcpTool(tools, 'get_weather')?.serverName, 'S1');
	assert.equal(findMcpTool(tools, 'missing'), undefined);
});

test('intermediate rounds are cut at the state fence', () => {
	const text = 'Answer part one.\n```json\n{"mood_change":{}}\n```';
	assert.equal(stripFromStateFence(text), 'Answer part one.\n');
	assert.equal(stripFromStateFence('no fence'), 'no fence');
});
