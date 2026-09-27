import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractStateUpdates } from '$lib/services/chat/client-chat';
import { assertSafeProviderUrl } from '$lib/services/providers/url-guard';
import { env } from '$env/dynamic/private';

// Ported from upstream utsuwa 0.19.0: the memory-extraction fallback now goes
// through the server route, so it works with cloud providers that block
// browser (CORS) calls. One LLM transport for chat AND extraction.
export const POST: RequestHandler = async ({ request }) => {
	const { provider, model, apiKey, baseURL, system, userMessage, reply } = await request.json();

	if (!provider || !model || !system || !userMessage || !reply) {
		return json({ error: 'Faltan campos para la extracción' }, { status: 400 });
	}

	// SSRF guard mirrors /api/chat: the base URL is client-supplied and
	// fetched server-side.
	try {
		assertSafeProviderUrl(baseURL, env.ALLOW_LOCAL_PROVIDER_HOSTS === 'true');
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : 'URL de proveedor inválida' }, { status: 400 });
	}

	const text = await extractStateUpdates({
		provider,
		model,
		apiKey,
		baseURL,
		system,
		userMessage,
		reply
	});

	return json({ text });
};
