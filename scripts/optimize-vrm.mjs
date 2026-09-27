// Optimización de texturas embebidas en VRM/GLB/GLTF + cifrado .lcx.
//
// Seguridad: nunca toca accessors (skinning/morphs), skins, materiales ni
// extensiones VRM; solo images[].bufferView/mimeType. Las texturas de
// cara/ojos se preservan byte a byte (las expressions dependen de esos
// píxeles). UniGLTF/VRoid escriben GLB con varios chunks BIN: se fusionan
// en un buffer único (válido por spec) antes de re-empaquetar.
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Debe coincidir con scripts/protect-assets.mjs y asset-guard.ts.
// Rotar la clave = rotarla en los tres sitios.
const KEY = Buffer.from(
	'de29773cb71247e21920d9616c58aaf2b580993cf8c882150f3b3f44a0bd8e24',
	'hex'
);

const FACE_RE = /face|eye|iris|brow|lash|mouth|highlight|eyeline/i;
const MAX_THUMB = 512;
const MAX_BODY = 1024;

export const SRC_DIR = 'assets-private/luna/forms';
export const OUT_DIR = join(SRC_DIR, 'optimized');
export const LCX_DIR = 'static/luna/forms';

/** @param {number} n @returns {string} */
const fmt = (n) => `${(n / 1e6).toFixed(2)}MB`;

/** @param {Buffer} buf @returns {string} */
export function sha256(buf) {
	return createHash('sha256').update(buf).digest('hex');
}

// ------------------------------------------------------------- GLB multi-chunk
/** @param {Buffer} buf @returns {{ json: any, bin: Buffer | null }} */
export function parseGlb(buf) {
	if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
	const jsonLen = buf.readUInt32LE(12);
	const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
	const chunkStarts = [];
	const parts = [];
	let cursor = 20 + jsonLen;
	while (cursor + 8 <= buf.length) {
		const len = buf.readUInt32LE(cursor);
		const type = buf.readUInt32LE(cursor + 4);
		if (type === 0x004e4942) {
			chunkStarts.push(parts.reduce((/** @type {number} */ n, /** @type {Buffer} */ p) => n + p.length, 0));
			parts.push(buf.subarray(cursor + 8, cursor + 8 + len));
		} else if (type !== 0x4e4f534a) {
			throw new Error(`unknown GLB chunk 0x${type.toString(16)}`);
		}
		cursor += 8 + len + ((4 - (len % 4)) % 4);
	}
	const bin = parts.length ? Buffer.concat(parts) : null;
	const declared = json.buffers?.length ?? (bin ? 1 : 0);
	if (declared !== chunkStarts.length) {
		throw new Error(`buffers(${json.buffers?.length}) != BIN chunks(${chunkStarts.length})`);
	}
	for (const v of json.bufferViews ?? []) {
		if (v.buffer === undefined || v.buffer === 0) continue;
		v.byteOffset = (v.byteOffset ?? 0) + chunkStarts[v.buffer];
		v.buffer = 0;
	}
	if (bin) json.buffers = [{ byteLength: bin.length }];
	return { json, bin };
}

/** @param {any} json @param {Buffer} [bin] @returns {Buffer} */
export function buildGlb(json, bin) {
	let jsonChunk = Buffer.from(JSON.stringify(json), 'utf8');
	const jsonPad = (4 - (jsonChunk.length % 4)) % 4;
	if (jsonPad) jsonChunk = Buffer.concat([jsonChunk, Buffer.alloc(jsonPad, 0x20)]);
	const header = Buffer.alloc(12);
	header.writeUInt32LE(0x46546c67, 0);
	header.writeUInt32LE(2, 4);
	if (!bin || bin.length === 0) {
		header.writeUInt32LE(12 + 8 + jsonChunk.length, 8);
		const jh = Buffer.alloc(8);
		jh.writeUInt32LE(jsonChunk.length, 0);
		jh.writeUInt32LE(0x4e4f534a, 4);
		return Buffer.concat([header, jh, jsonChunk]);
	}
	const binPad = (4 - (bin.length % 4)) % 4;
	const binChunk = binPad ? Buffer.concat([bin, Buffer.alloc(binPad)]) : bin;
	header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
	const jh = Buffer.alloc(8);
	jh.writeUInt32LE(jsonChunk.length, 0);
	jh.writeUInt32LE(0x4e4f534a, 4);
	const bh = Buffer.alloc(8);
	bh.writeUInt32LE(binChunk.length, 0);
	bh.writeUInt32LE(0x004e4942, 4);
	return Buffer.concat([header, jh, jsonChunk, bh, binChunk]);
}

/**
 * @param {any} json
 * @returns {Map<number, { mats: string[], isNormal: boolean }>}
 */
function mapTextureUsage(json) {
	/** @type {Map<number, { mats: string[], isNormal: boolean }>} */
	const usage = new Map();
	const note = (/** @type {number} */ texIndex, /** @type {string} */ matName, /** @type {boolean} */ isNormal) => {
		const u = usage.get(texIndex) ?? { mats: [], isNormal: false };
		if (!u.mats.includes(matName)) u.mats.push(matName);
		if (isNormal) u.isNormal = true;
		usage.set(texIndex, u);
	};
	const walk = (/** @type {any} */ obj, /** @type {string} */ matName) => {
		if (!obj || typeof obj !== 'object') return;
		for (const [k, v] of Object.entries(obj)) {
			if (k.endsWith('Texture') && v && Number.isInteger(v.index)) {
				note(v.index, matName, k === 'normalTexture');
			} else if (v && typeof v === 'object') {
				walk(v, matName);
			}
		}
	};
	for (const m of json.materials ?? []) {
		walk(m, m.name ?? '');
		const props = m.extensions?.VRM?.materialProperties;
		if (props?.textureProperties) {
			for (const [slot, texIndex] of Object.entries(props.textureProperties)) {
				if (Number.isInteger(texIndex)) note(texIndex, m.name ?? '', slot === 'bumpMap');
			}
		}
	}
	return usage;
}

/** @param {any} json @returns {number} */
function metaThumbnailIndex(json) {
	const v1 = json.extensions?.VRMC_vrm?.meta;
	if (v1 && Number.isInteger(v1.thumbnailImage)) return v1.thumbnailImage;
	const v0 = json.extensions?.VRM?.meta;
	if (v0 && Number.isInteger(v0.texture)) return v0.texture;
	return -1;
}

/** @param {any} json @param {Buffer} oldBin @param {Map<number, Buffer & { mime: string }>} replacements @returns {Buffer} */
function repack(json, oldBin, replacements) {
	const images = json.images ?? [];
	const views = json.bufferViews ?? [];
	const accessorViews = new Set();
	for (const a of json.accessors ?? []) {
		if (Number.isInteger(a.bufferView)) accessorViews.add(a.bufferView);
		if (a.sparse) {
			if (Number.isInteger(a.sparse.indices?.bufferView)) accessorViews.add(a.sparse.indices.bufferView);
			if (Number.isInteger(a.sparse.values?.bufferView)) accessorViews.add(a.sparse.values.bufferView);
		}
	}
	/** @type {Buffer[]} */
	const parts = [];
	let cursor = 0;
	const viewOffsets = new Map();
	const assign = (/** @type {number} */ vi, /** @type {Buffer} */ data) => {
		const off = (cursor + 3) & ~3;
		if (off > cursor) parts.push(Buffer.alloc(off - cursor));
		parts.push(data);
		viewOffsets.set(vi, { offset: off, length: data.length });
		cursor = off + data.length;
	};

	for (const vi of accessorViews) {
		const v = views[vi];
		assign(vi, oldBin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
	}
	images.forEach((/** @type {any} */ im, /** @type {number} */ i) => {
		if (!Number.isInteger(im.bufferView)) return;
		const data = replacements.get(i);
		if (data) {
			assign(im.bufferView, data);
		} else {
			const v = views[im.bufferView];
			assign(im.bufferView, oldBin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
		}
	});

	for (const [vi, pos] of viewOffsets) {
		views[vi].byteOffset = pos.offset;
		views[vi].byteLength = pos.length;
	}
	for (const [imgIdx, data] of replacements) {
		images[imgIdx].mimeType = data.mime;
	}
	const bin = Buffer.concat(parts);
	json.bufferViews = views;
	(json.buffers ?? [])[0].byteLength = bin.length;
	return bin;
}

/** @param {Buffer} data @param {number} max @param {{ forceWebp?: boolean }} [opts] */
async function resizeImage(data, max, { forceWebp = false } = {}) {
	const meta = await sharp(data, { failOn: 'none' }).metadata();
	if (!meta.width || !meta.height) return null;
	const scale = Math.min(1, max / Math.max(meta.width, meta.height));
	if (scale === 1 && !forceWebp) return null;
	const img = sharp(data, { failOn: 'none' }).resize(
		Math.round(meta.width * scale),
		Math.round(meta.height * scale),
		{ fit: 'inside' }
	);
	if (forceWebp) {
		const out = await img.webp({ quality: 88, alphaQuality: 90 }).toBuffer();
		return { data: out, mime: 'image/webp' };
	}
	const out = await img.png({ compressionLevel: 9 }).toBuffer();
	return { data: out, mime: 'image/png' };
}

/** @param {any} json @returns {Record<string, unknown>} */
function structuralFingerprint(json) {
	let tris = 0, verts = 0, morphs = 0, prims = 0;
	const acc = json.accessors ?? [];
	for (const m of json.meshes ?? []) {
		for (const p of m.primitives ?? []) {
			prims++;
			const pos = acc[p.attributes?.POSITION];
			if (pos) verts += pos.count;
			if (p.indices) tris += acc[p.indices].count / 3;
			if (p.targets) morphs += p.targets.length;
		}
	}
	const spring = json.extensions?.VRMC_springBone;
	return {
		prims, verts, tris: Math.round(tris), morphs,
			skins: (json.skins ?? []).map((/** @type {any} */ s) => s.joints.length),
		images: (json.images ?? []).length,
		textures: (json.textures ?? []).length,
		materials: (json.materials ?? []).length,
		nodes: (json.nodes ?? []).length,
		anim: (json.animations ?? []).length,
		ext: (json.extensionsUsed ?? []).slice().sort(),
		expressions: (() => {
			const e = json.extensions?.VRMC_vrm?.expressions;
			if (e) return Object.keys(e.preset ?? {}).length + Object.keys(e.custom ?? {}).length;
			return (json.extensions?.VRM?.blendShapeMaster?.blendShapeGroups ?? []).length;
		})(),
		springbones: spring ? (spring.springs ?? []).length + (spring.colliders ?? []).length : 0
	};
}

// ------------------------------------------------------------------- .lcx
/** @param {Buffer} plain @returns {Buffer} */
export function cipher(plain) {
	const iv = randomBytes(12);
	const c = createCipheriv('aes-256-gcm', KEY, iv);
	const enc = Buffer.concat([c.update(plain), c.final()]);
	const tag = c.getAuthTag();
	return Buffer.concat([
		Buffer.from(new Uint32Array([iv.length]).buffer),
		iv,
		Buffer.concat([enc, tag])
	]);
}

/** @param {Buffer} raw @returns {Promise<Buffer>} */
export async function decipherLCX(raw) {
	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
	const ivLen = view.getUint32(0, true);
	const iv = new Uint8Array(raw.buffer, raw.byteOffset + 4, ivLen);
	const data = new Uint8Array(raw.buffer, raw.byteOffset + 4 + ivLen);
	const { webcrypto } = await import('node:crypto');
	const key = await webcrypto.subtle.importKey('raw', KEY, 'AES-GCM', false, ['decrypt']);
	return Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
}

// ------------------------------------------------------------------- núcleo
/**
 * Optimiza las texturas de un VRM/GLB y devuelve { output, replaced, log }.
 * output === null si no hay ganancia (el caller conserva el original).
 */
/** @param {Buffer} original @returns {Promise<{ output: Buffer | null, replaced: number[], mimes: Record<string, string>, log: string[] }>} */
export async function optimizeVrm(original) {
	const { json, bin } = parseGlb(original);
	// glTF con texturas externas: los píxeles viven en archivos aparte, el
	// repack de texturas embebidas no aplica. El asset viaja sin alterar.
	if (!bin) return { output: null, replaced: [], mimes: {}, log: ['glTF sin BIN: texturas externas, se sirve tal cual'] };
	const usage = mapTextureUsage(json);
	const thumbIdx = metaThumbnailIndex(json);
	const images = json.images ?? [];
	const views = json.bufferViews ?? [];
	const accessorViews = new Set();
	for (const a of /** @type {any[]} */ (json.accessors ?? [])) {
		if (Number.isInteger(a.bufferView)) accessorViews.add(a.bufferView);
	}

	const replacements = new Map();
	const log = [];
	for (const [imgIdx, im] of images.entries()) {
		const bv = views[im.bufferView];
		if (!Number.isInteger(im.bufferView) || !bv) continue;
		const old = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
		if (old.length === 0) continue;
		if (accessorViews.has(im.bufferView)) {
			log.push(`img${imgIdx}: shared bufferView, skipped`);
			continue;
		}
		const u = usage.get(imgIdx);
		const isThumb = imgIdx === thumbIdx;
		const isFace = (u?.mats ?? []).some((m) => FACE_RE.test(m));
		if (isFace && !isThumb) {
			log.push(`img${imgIdx}: face/eyes, preserved (${fmt(old.length)})`);
			continue;
		}
		const isPng = old.length > 8 && old.readUInt32BE(0) === 0x89504e47;
		const isWebp =
			old.length > 12 &&
			old.subarray(0, 4).toString('ascii') === 'RIFF' &&
			old.subarray(8, 12).toString('ascii') === 'WEBP';
		if (!isPng && !isWebp) {
			log.push(`img${imgIdx}: format ${im.mimeType ?? '?'}, skipped`);
			continue;
		}
		const max = isThumb ? MAX_THUMB : MAX_BODY;
		const res = await resizeImage(old, max, { forceWebp: isThumb });
		if (!res || res.data.length >= old.length) {
			log.push(`img${imgIdx}: no gain, kept (${fmt(old.length)})`);
			continue;
		}
		/** @type {Buffer} */
		const buf = Buffer.from(res.data);
		Object.assign(buf, { mime: res.mime });
		replacements.set(imgIdx, buf);
		log.push(`img${imgIdx}: ${fmt(old.length)} -> ${fmt(res.data.length)} (${res.mime})`);
	}

	if (replacements.size === 0) return { output: null, replaced: [], mimes: {}, log };

	const newBin = repack(json, bin, replacements);
	const out = buildGlb(json, newBin);

	const fpA = structuralFingerprint(parseGlb(original).json);
	const fpB = structuralFingerprint(parseGlb(out).json);
	const diffs = Object.keys(fpA).filter((k) => JSON.stringify(fpA[k]) !== JSON.stringify(fpB[k]));
	if (diffs.length) throw new Error(`structural fingerprint changed: ${diffs.join(', ')}`);
	const mimes = Object.fromEntries(
		[...replacements].map((/** @type {[number, Buffer]} */ [i, b]) => [
			i,
			(/** @type {{ mime: string }} */ (/** @type {any} */ (b))).mime
		])
	);
	return { output: out, replaced: [...replacements.keys()].sort((a, b) => a - b), mimes, log };
}

/**
 * Optimiza un VRM (si hay ganancia) y escribe VRM + .lcx + manifest de
 * verificación. Devuelve null si no hubo cambios.
 * @param {string} file
 * @param {{ outDir?: string, lcxDir?: string }} [opts]
 */
export async function optimizeVrmFile(file, { outDir = OUT_DIR, lcxDir = LCX_DIR } = {}) {
	const name = basename(file).replace(/\.(vrm|glb|gltf)$/i, '');
	const original = readFileSync(file);
	mkdirSync(outDir, { recursive: true });
	mkdirSync(lcxDir, { recursive: true });

	const { output, replaced, mimes, log } = await optimizeVrm(original);
	if (!output) return null;

	writeFileSync(join(outDir, `${name}.vrm`), output);
	writeFileSync(join(lcxDir, `${name}.lcx`), cipher(output));
	writeFileSync(
		join(outDir, `${name}.manifest.json`),
		JSON.stringify({ replaced, mimes }, null, '\t')
	);
	// Referencia del original para verify-optimize-vrm.mjs.
	writeFileSync(join(outDir, `${name}.size`), String(original.length));
	writeFileSync(join(outDir, `${name}.sha256`), sha256(original));

	const roundtrip = await decipherLCX(readFileSync(join(lcxDir, `${name}.lcx`)));
	if (!roundtrip.equals(output)) throw new Error(`${name}: lcx roundtrip mismatch`);

	return { name, before: original.length, after: output.length, replaced, log };
}

// ------------------------------------------------------------------- CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const verify = process.argv.includes('--verify');
	const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
	mkdirSync(OUT_DIR, { recursive: true });
	const targets = args.length
		? args.map((a) => join(SRC_DIR, a))
		: readdirSync(SRC_DIR).filter((f) => f.endsWith('.vrm')).map((f) => join(SRC_DIR, f));

	let totalBefore = 0, totalAfter = 0, touched = 0;
	for (const file of targets) {
		const result = await optimizeVrmFile(file);
		if (!result) {
			console.log(`= ${basename(file)}: no gain, kept`);
			continue;
		}
		totalBefore += result.before;
		totalAfter += result.after;
		touched++;
		console.log(`> ${result.name}.vrm: ${fmt(result.before)} -> ${fmt(result.after)}`);
		if (verify) for (const line of result.log) console.log(`    ${line}`);
	}
	if (totalBefore > 0) {
		console.log(`total: ${fmt(totalBefore)} -> ${fmt(totalAfter)} (-${fmt(totalBefore - totalAfter)}), ${touched}/${targets.length} files`);
	}
}
