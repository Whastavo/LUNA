import test from 'node:test';
import assert from 'node:assert/strict';
import {
	buildAuthHeaders,
	buildInitializeRequest,
	buildInitializedNotification,
	buildRpcRequest,
	isAllowedMcpHttpUrl,
	isBlockedMcpHost,
	isServerMcpEnabled,
	isStdioCommandAllowed,
	mcpUrlCandidates,
	parseEnvLines,
	parseJsonRpcResult,
	parseQuotedArgs,
	parseSseResult,
	parseToolNameList,
	parseToolsList,
	resolveCapabilityFromProbe,
	stringifyToolResult,
	combineServerResults,
	singleFlight,
	stdioDenyReason
} from './protocol.ts';

test('server gate: only explicit opt-ins enable the proxy routes', () => {
	assert.equal(isServerMcpEnabled(undefined), false);
	assert.equal(isServerMcpEnabled(''), false);
	assert.equal(isServerMcpEnabled('client'), false);
	assert.equal(isServerMcpEnabled('server'), true);
	assert.equal(isServerMcpEnabled('both'), true);
});

test('capability probe: 404 disables, 2xx enables, other errors keep known state', () => {
	assert.equal(resolveCapabilityFromProbe(404, 'unknown'), 'none');
	assert.equal(resolveCapabilityFromProbe(200, 'unknown'), 'server');
	assert.equal(resolveCapabilityFromProbe(500, 'server'), 'server');
	assert.equal(resolveCapabilityFromProbe(503, 'unknown'), 'none');
});

test('URL candidates: configured URL first, trailing-slash variant second', () => {
	assert.deepEqual(mcpUrlCandidates('http://x/y'), ['http://x/y', 'http://x/y/']);
	assert.deepEqual(mcpUrlCandidates('http://x/y/'), ['http://x/y', 'http://x/y/']);
	assert.deepEqual(mcpUrlCandidates('  '), []);
});

test('scheme allowlist blocks non-http transports', () => {
	assert.equal(isAllowedMcpHttpUrl('http://a'), true);
	assert.equal(isAllowedMcpHttpUrl('https://a'), true);
	assert.equal(isAllowedMcpHttpUrl('file:///etc/passwd'), false);
	assert.equal(isAllowedMcpHttpUrl('data:text/plain,x'), false);
	assert.equal(isAllowedMcpHttpUrl('not a url'), false);
});

test('metadata and link-local hosts are blocked; LAN hosts pass', () => {
	assert.equal(isBlockedMcpHost('169.254.169.254'), true);
	assert.equal(isBlockedMcpHost('metadata.google.internal'), true);
	assert.equal(isBlockedMcpHost('100.100.100.200'), true);
	assert.equal(isBlockedMcpHost('fd00:ec2::254'), true);
	assert.equal(isBlockedMcpHost('::ffff:169.254.169.254'), true);
	assert.equal(isBlockedMcpHost('fe80::1'), true);
	// Allowed on purpose: self-hosted MCP servers live on the LAN/loopback.
	assert.equal(isBlockedMcpHost('192.168.1.10'), false);
	assert.equal(isBlockedMcpHost('localhost'), false);
	assert.equal(isBlockedMcpHost('homeassistant.local'), false);
});

test('JSON-RPC parsing surfaces protocol errors with readable messages', () => {
	assert.equal(parseJsonRpcResult({ result: 42 }), 42);
	assert.throws(() => parseJsonRpcResult({ error: { message: 'boom' } }), /MCP error: boom/);
	assert.throws(() => parseJsonRpcResult(null), /empty response/);
});

test('SSE parsing skips notifications and matches the expected id', () => {
	const sse = [
		'data: {"jsonrpc":"2.0","method":"ping"}',
		'',
		'data: {"jsonrpc":"2.0","id":7,"result":{"tools":[]}}',
		''
	].join('\n');
	assert.deepEqual(parseSseResult(sse, 7), { tools: [] });
	assert.throws(() => parseSseResult('data: {"jsonrpc":"2.0","id":9,"result":{}}', 7));
});

test('tools/list parsing drops nameless entries and normalizes schemas', () => {
	const tools = parseToolsList({
		tools: [
			{ name: 'good', description: 'd', inputSchema: { type: 'object', properties: {} } },
			{ description: 'no name' },
			{ name: 'schemaless' }
		]
	});
	assert.equal(tools.length, 2);
	assert.equal(tools[1].inputSchema.type, 'object');
});

test('tool results flatten text parts; non-text falls back to JSON', () => {
	assert.equal(stringifyToolResult({ content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }), 'a\nb');
	assert.equal(stringifyToolResult({ content: [{ type: 'image', data: 'x' }] }), '{"content":[{"type":"image","data":"x"}]}');
	assert.equal(stringifyToolResult(undefined), '');
});

test('combineServerResults keeps per-server errors readable', () => {
	const servers = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
	const { values, errors } = combineServerResults(
		[{ status: 'fulfilled', value: [1] }, { status: 'rejected', reason: new Error('down') }],
		servers
	);
	assert.deepEqual(values, [[1]]);
	assert.equal(errors[0].serverId, 'b');
	assert.equal(errors[0].message, 'down');
});

test('auth headers only ever carry the bearer token', () => {
	assert.deepEqual(buildAuthHeaders(undefined), {});
	assert.deepEqual(buildAuthHeaders({ type: 'none' }), {});
	assert.deepEqual(buildAuthHeaders({ type: 'bearer', token: 't' }), { Authorization: 'Bearer t' });
});

test('stdio allowlist is fail-closed', () => {
	assert.equal(isStdioCommandAllowed('node', ['node']), true);
	assert.equal(isStdioCommandAllowed('node', []), false);
	assert.equal(isStdioCommandAllowed(undefined, []), false);
	assert.equal(isStdioCommandAllowed('anything', ['*']), true);
	assert.match(stdioDenyReason('node', []) ?? '', /MCP_STDIO_ALLOWED_COMMANDS/);
	assert.equal(stdioDenyReason('node', ['node']), null);
});

test('tool name list and env lines parse leniently', () => {
	assert.deepEqual(parseToolNameList(' a , b,, '), ['a', 'b']);
	assert.deepEqual(parseToolNameList(undefined), []);
	assert.deepEqual(parseEnvLines('A=1\n# c\n\nB=2'), { A: '1', B: '2' });
	assert.deepEqual(parseQuotedArgs('run "my file.ts" \'x y\' z'), ['run', 'my file.ts', 'x y', 'z']);
});

test('singleFlight collapses concurrent calls', async () => {
	let calls = 0;
	const f = singleFlight(async () => {
		calls++;
		await new Promise((r) => setTimeout(r, 5));
		return calls;
	});
	const [a, b] = await Promise.all([f(), f()]);
	assert.equal(a, 1);
	assert.equal(b, 1);
	await f();
	assert.equal(calls, 2);
});

test('request builders carry the LUNA client identity and protocol version', () => {
	const req = buildInitializeRequest(1);
	assert.equal(req.method, 'initialize');
	assert.equal((req.params as { clientInfo: { name: string } }).clientInfo.name, 'luna');
	assert.equal(buildRpcRequest(3, 'ping').jsonrpc, '2.0');
	assert.equal(buildInitializedNotification().method, 'notifications/initialized');
});
