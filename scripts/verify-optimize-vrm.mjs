// Verificación independiente de los VRM optimizados contra los originales:
// original intacto (SHA-256), .lcx descifrable con WebCrypto (protocolo de
// asset-guard.ts), geometría byte-idéntica, estructura VRM inalterada y
// texturas preservadas byte a byte salvo las re-codificadas del manifest.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseGlb, decipherLCX, SRC_DIR, OUT_DIR, LCX_DIR } from './optimize-vrm.mjs';

let failures = 0;
const check = (ok, label, detail = '') => {
	console.log(`${ok ? 'ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
	if (!ok) failures++;
};

for (const f of readdirSync(SRC_DIR).filter((x) => x.endsWith('.vrm'))) {
	const name = f.replace(/\.vrm$/, '');
	console.log(`\n== ${name}`);

	const original = readFileSync(join(SRC_DIR, f));
	const optimizedPath = join(OUT_DIR, f);
	if (!readFileSync(join(OUT_DIR, `${name}.sha256`), 'utf8')) throw new Error('missing hash');
	check(
		original.length === Number(readFileSync(join(OUT_DIR, `${name}.size`), 'utf8')) &&
			(await import('node:crypto')).createHash('sha256').update(original).digest('hex') ===
				readFileSync(join(OUT_DIR, `${name}.sha256`), 'utf8'),
		'original intacto (size + sha256)'
	);

	const optimized = readFileSync(optimizedPath);
	const plain = await decipherLCX(readFileSync(join(LCX_DIR, `${name}.lcx`)));
	check(plain.equals(optimized), 'lcx descifra al VRM optimizado (WebCrypto)');

	const A = parseGlb(original);
	const B = parseGlb(plain);

	let geoOk = (A.json.accessors ?? []).length === (B.json.accessors ?? []).length;
	let geoCount = 0;
	if (geoOk) {
		for (let i = 0; i < A.json.accessors.length; i++) {
			const a = A.json.accessors[i], b = B.json.accessors[i];
			if (a.type !== b.type || a.componentType !== b.componentType || a.count !== b.count) {
				geoOk = false;
				break;
			}
			if (a.bufferView === undefined) continue;
			const vA = A.json.bufferViews[a.bufferView];
			const vB = B.json.bufferViews[b.bufferView];
			const offA = (vA.byteOffset ?? 0) + (a.byteOffset ?? 0);
			const offB = (vB.byteOffset ?? 0) + (b.byteOffset ?? 0);
			if (!A.bin.subarray(offA, offA + vA.byteLength).equals(B.bin.subarray(offB, offB + vB.byteLength))) {
				geoOk = false;
				break;
			}
			geoCount++;
		}
	}
	check(geoOk, 'geometría byte-idéntica', `${geoCount} accessors`);

	const stripImages = (json) => {
		const clone = JSON.parse(JSON.stringify(json));
		for (const im of clone.images ?? []) {
			delete im.bufferView;
			delete im.mimeType;
			delete im.name;
		}
		delete clone.bufferViews;
		delete clone.buffers;
		return clone;
	};
	check(
		JSON.stringify(stripImages(A.json)) === JSON.stringify(stripImages(B.json)),
		'estructura VRM idéntica (skins, morphs, materiales, springbones, expressions, nodos)'
	);

	const manifest = JSON.parse(readFileSync(join(OUT_DIR, `${name}.manifest.json`), 'utf8'));
	const wasReplaced = new Set(manifest.replaced);
	const imgsA = A.json.images ?? [], imgsB = B.json.images ?? [];
	let kept = 0, replaced = 0, texturesOk = true;
	for (let i = 0; i < imgsA.length; i++) {
		const bvA = imgsA[i].bufferView, bvB = imgsB[i]?.bufferView;
		if (bvA === undefined) continue;
		if (bvB === undefined) { texturesOk = false; break; }
		const dA = A.bin.subarray(
			A.json.bufferViews[bvA].byteOffset ?? 0,
			(A.json.bufferViews[bvA].byteOffset ?? 0) + A.json.bufferViews[bvA].byteLength
		);
		const dB = B.bin.subarray(
			B.json.bufferViews[bvB].byteOffset ?? 0,
			(B.json.bufferViews[bvB].byteOffset ?? 0) + B.json.bufferViews[bvB].byteLength
		);
		if (wasReplaced.has(String(i)) || wasReplaced.has(i)) {
			if (dA.equals(dB)) { texturesOk = false; break; }
			if (imgsB[i].mimeType !== manifest.mimes[i]) { texturesOk = false; break; }
			replaced++;
		} else if (!dA.equals(dB) || imgsA[i].mimeType !== imgsB[i].mimeType) {
			texturesOk = false;
			break;
		} else {
			kept++;
		}
	}
	check(texturesOk, `texturas: ${kept} intactas byte-idénticas, ${replaced} re-codificadas`);

	const thumbA = A.json.extensions?.VRMC_vrm?.meta?.thumbnailImage ?? A.json.extensions?.VRM?.meta?.texture;
	const thumbB = B.json.extensions?.VRMC_vrm?.meta?.thumbnailImage ?? B.json.extensions?.VRM?.meta?.texture;
	check(thumbA === thumbB, 'meta.thumbnailImage apunta a la misma textura');
}

console.log(failures === 0 ? '\nverificación completa: OK' : `\n${failures} fallos`);
process.exitCode = failures === 0 ? 0 : 1;
