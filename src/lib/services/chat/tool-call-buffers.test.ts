import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emitToolCalls, type ToolCallBuffer } from './tool-call-buffers.ts';

test('emitToolCalls emits complete calls with parsed args and ids', () => {
	const buffers = new Map<number, ToolCallBuffer>();
	buffers.set(0, { id: 'call_a', name: 'search', args: '{"q":"luna"}' });
	const seen: Array<{ name: string; args: unknown; id: string }> = [];
	emitToolCalls(buffers, (name, args, id) => seen.push({ name, args, id }));
	assert.deepEqual(seen, [{ name: 'search', args: { q: 'luna' }, id: 'call_a' }]);
});

test('emitToolCalls keeps no-arg tool calls as empty objects', () => {
	const buffers = new Map<number, ToolCallBuffer>();
	buffers.set(1, { id: '', name: 'get_time', args: '' });
	const seen: Array<{ name: string; args: unknown; id: string }> = [];
	emitToolCalls(buffers, (name, args, id) => seen.push({ name, args, id }));
	assert.deepEqual(seen, [{ name: 'get_time', args: {}, id: 'call_1' }]);
});

test('emitToolCalls skips malformed argument JSON and nameless buffers', () => {
	const buffers = new Map<number, ToolCallBuffer>();
	buffers.set(0, { id: 'call_x', name: 'broken', args: '{nope' });
	buffers.set(1, { id: 'call_y', name: '', args: '{}' });
	const seen: unknown[] = [];
	emitToolCalls(buffers, (name, args) => seen.push([name, args]));
	assert.deepEqual(seen, []);
});
