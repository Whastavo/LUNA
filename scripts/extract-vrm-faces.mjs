// Extrae la miniatura de cara embebida en cada VRM de Luna (la misma imagen
// que la app muestra como miniatura del modelo) a static/luna/faces/<id>.png.
//
// Uso:
//   node scripts/extract-vrm-faces.mjs
//   # opcional, para reducir a 160px (requiere macOS sips):
//   for f in static/luna/faces/*.png; do sips -Z 160 "$f" >/dev/null; done
//
// Si algún día se reemplazan los VRM, vuelve a correr esto para refrescar
// las caras del dock de la landing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const FORMS = [
	{ id: 'luna', file: 'static/luna/forms/luna.vrm' },
	{ id: 'luna-nova', file: 'static/luna/forms/luna-nova.vrm' },
	{ id: 'luna-vela', file: 'static/luna/forms/luna-vela.vrm' }
];

function parseGlb(buffer) {
	if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('no es un archivo GLB');
	let off = 12;
	let json = null;
	let binStart = -1;
	while (off + 8 <= buffer.length) {
		const len = buffer.readUInt32LE(off);
		const type = buffer.readUInt32LE(off + 4);
		if (type === 0x4e4f534a) json = JSON.parse(buffer.slice(off + 8, off + 8 + len).toString('utf8'));
		if (type === 0x004e4942) binStart = off + 8;
		off += 8 + len;
	}
	return { json, binStart };
}

// La miniatura vive en images[] con nombre "Thumbnail" (convención VRoid).
function findThumbnail(json) {
	return (json.images || []).find((img) => /thumbnail/i.test(img.name || ''));
}

await mkdir('static/luna/faces', { recursive: true });
for (const form of FORMS) {
	const buf = await readFile(form.file);
	const { json, binStart } = parseGlb(buf);
	const img = findThumbnail(json);
	if (!img) {
		console.error(`${form.id}: sin miniatura embebida`);
		continue;
	}
	let data;
	if (img.uri?.startsWith('data:')) {
		data = Buffer.from(img.uri.split(',')[1], 'base64');
	} else if (img.bufferView != null) {
		const view = json.bufferViews[img.bufferView];
		const start = binStart + (view.byteOffset || 0);
		data = buf.slice(start, start + view.byteLength);
	} else {
		console.error(`${form.id}: miniatura sin datos accesibles`);
		continue;
	}
	const out = `static/luna/faces/${form.id}.png`;
	await writeFile(out, data);
	console.log(`${form.id}: → ${out} (${(data.length / 1024).toFixed(0)} KB)`);
}
