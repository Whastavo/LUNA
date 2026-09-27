import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	isRetryableProviderError,
	RETRY_SCHEDULE_MS,
	STALL_TIMEOUT_MS,
	TURN_TIMEOUT_MS
} from './retry.ts';

test('rate limits and overload are retryable', () => {
	assert.equal(isRetryableProviderError('Rate limit exceeded'), true);
	assert.equal(isRetryableProviderError('Remote sent 429 response: too many requests'), true);
	assert.equal(isRetryableProviderError('The server is overloaded'), true);
	assert.equal(isRetryableProviderError('Provider error (503)'), true);
});

test('dropped connections are retryable', () => {
	assert.equal(isRetryableProviderError('Failed to fetch'), true);
	assert.equal(isRetryableProviderError('socket hang up'), true);
	assert.equal(isRetryableProviderError('The request timed out'), true);
});

test('auth and billing errors are never retried', () => {
	assert.equal(isRetryableProviderError('Incorrect API key provided'), false);
	assert.equal(isRetryableProviderError('Remote sent 401 response: unauthorized'), false);
	assert.equal(
		isRetryableProviderError('429 insufficient_quota: you have exceeded your billing quota'),
		false
	);
	assert.equal(isRetryableProviderError('Model gpt-x does not exist'), false);
});

test('plain failures are not retryable', () => {
	assert.equal(isRetryableProviderError('Configura un proveedor'), false);
	assert.equal(isRetryableProviderError(''), false);
});

test('retry schedule is exactly two backoff steps of 2s and 4s', () => {
	assert.deepEqual([...RETRY_SCHEDULE_MS], [2_000, 4_000]);
});

test('watchdog constants match upstream 0.19.0', () => {
	assert.equal(STALL_TIMEOUT_MS, 90_000);
	assert.equal(TURN_TIMEOUT_MS, 600_000);
});
