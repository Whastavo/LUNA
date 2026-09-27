// Ported from upstream utsuwa 0.19.0 / 0.19.2: transient provider failures
// are retried automatically, and every chat request settles (stall watchdog +
// hard turn cap). Classification works on the ERROR TEXT because failures
// arrive from two different transports (direct fetch on desktop/local, the
// streaming server route on web) that expose no status codes client-side.

// Failures worth another attempt: rate limits, overloaded servers, dropped
// connections and stalled requests.
const RETRYABLE_PATTERNS = [
	'rate limit',
	'too many requests',
	'429',
	'overloaded',
	'overload',
	'server is busy',
	'529',
	'503',
	'502',
	'failed to fetch',
	'fetch failed',
	'network error',
	'networkerror',
	'econnreset',
	'econnrefused',
	'socket hang up',
	'connection reset',
	'connection closed',
	'server disconnected',
	'terminated',
	'timed out',
	'timeout'
];

// Billing/config failures can ride the same statuses (a 429 with
// insufficient_quota will never succeed on retry) — they win over the
// retryable list.
const FATAL_PATTERNS = [
	'invalid api key',
	'incorrect api key',
	'invalid_api_key',
	'unauthorized',
	'401',
	'403',
	'insufficient_quota',
	'quota exceeded',
	'permission denied',
	'does not exist',
	'not found'
];

export function isRetryableProviderError(message: string): boolean {
	const m = message.toLowerCase();
	if (FATAL_PATTERNS.some((p) => m.includes(p))) return false;
	return RETRYABLE_PATTERNS.some((p) => m.includes(p));
}

/** Fixed retry schedule: waits of 2 and 4 seconds, two retries max. Upstream
 *  also honors a provider `Retry-After` of ≤20s; the client never sees
 *  response headers through the server route, so the schedule stays fixed. */
export const RETRY_SCHEDULE_MS: readonly number[] = [2_000, 4_000];

/** 0.19.0: a reply stream silent for this long counts as a dropped connection. */
export const STALL_TIMEOUT_MS = 90_000;

/** 0.19.0: hard cap for a whole turn, however slowly the provider trickles. */
export const TURN_TIMEOUT_MS = 600_000;

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
