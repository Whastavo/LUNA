// Cifra los assets protegidos de Luna (AES-256-GCM) para su distribución.
//
//   node scripts/protect-assets.mjs
//
// Los originales legibles se MUEVEN a assets-private/ (nunca dentro de static/,
// jamás se despliegan, y .gitignore los excluye del repo). En static/luna/ quedan
// los .lcx: basura ilegible para cualquiera que los pida directo. El README de
// licencias también baja a assets-private: nada de documentación expuesta.
//
// NOTA: los .vrm ya no se cifran a mano con este script una vez optimizados;
// el Asset Optimizer (scripts/optimize-assets.mjs, kind 'vrm') regenera los
// .lcx automáticamente en cada dev/build. Este script queda para VRMA y para
// bootstrap manual. La clave DEBE coincidir con la troceada en
// src/lib/services/asset-guard.ts. Rota ambos lados juntos si la cambias.
import { createCipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = Buffer.from('de29773cb71247e21920d9616c58aaf2b580993cf8c882150f3b3f44a0bd8e24', 'hex');

const FILES = [
	'static/luna/forms/luna.vrm',
	'static/luna/forms/luna-nova.vrm',
	'static/luna/forms/luna-vela.vrm',
	...(await readdir('static/luna/motion'))
		.filter((f) => f.endsWith('.vrma'))
		.map((f) => join('static/luna/motion', f))
];

await mkdir('assets-private/luna/forms', { recursive: true });
await mkdir('assets-private/luna/motion', { recursive: true });

for (const file of FILES) {
	const plain = await readFile(file);
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', KEY, iv);
	const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Formato .lcx: [u32 IV-len][IV][ciphertext+tag GCM]
	const out = Buffer.concat([
		// Cabecera u32 big-endian con la longitud del IV (igual que DataView en el cliente)
		Buffer.from(new Uint32Array([iv.length]).buffer),
		iv,
		Buffer.concat([enc, tag])
	]);
	const dest = file.replace(/\.vrma?$/, '.lcx');
	await writeFile(dest, out);
	await rename(file, file.replace('static/', 'assets-private/'));
	console.log(`${file} → ${dest} (${(plain.length / 1e6).toFixed(1)}MB → ${(out.length / 1e6).toFixed(1)}MB)`);
}

// El manifiesto de poses referencia .vrma por URL; la app convierte a .lcx al
// vuelo, así que el manifiesto queda igual. Limpieza: nada de originales abajo.
console.log('\nListo: originales en assets-private/, cifrados en static/luna/.');
