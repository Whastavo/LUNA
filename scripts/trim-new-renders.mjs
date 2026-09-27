// Recorta las franjas sólidas (arriba/abajo) de los renders nuevos y deja
// solo el contenido con transparencia, con margen. Salida a static/luna/visuals/
// con el nombre del sistema (luna-<nombre>.png). Los originales del usuario
// se mueven a assets-private/luna/ (nunca despliegan).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from '../node_modules/.pnpm/pngjs@7.0.0/node_modules/pngjs/lib/png.js';

const ORIGEN = {
	'wen.png': 'luna-hush.png', // gesto "shh" cerca a cámara
	'pose.png': 'luna-grace.png', // pose elegante de pie
	'pose2.png': 'luna-lean.png' // pose dinámica inclinada
};

const MARGEN = 8;

for (const [entrada, salidaNombre] of Object.entries(ORIGEN)) {
	const png = PNG.sync.read(readFileSync(`static/${entrada}`));
	const { width: w, height: h, data } = png;

	// Bounding box del contenido visible (alfa > 10).
	let top = h, bottom = -1, minX = w, maxX = -1;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			if (data[(y * w + x) * 4 + 3] > 10) {
				if (y < top) top = y;
				if (y > bottom) bottom = y;
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
			}
		}
	}
	if (bottom < 0) throw new Error(`${entrada}: sin contenido visible`);

	top = Math.max(0, top - MARGEN);
	bottom = Math.min(h - 1, bottom + MARGEN);
	minX = Math.max(0, minX - MARGEN);
	maxX = Math.min(w - 1, maxX + MARGEN);
	const cw = maxX - minX + 1;
	const ch = bottom - top + 1;

	const recorte = new PNG({ width: cw, height: ch });
	for (let y = 0; y < ch; y++) {
		const from = ((top + y) * w + minX) * 4;
		data.copy(recorte.data, y * cw * 4, from, from + cw * 4);
	}

	writeFileSync(`static/luna/visuals/${salidaNombre}`, PNG.sync.write(recorte));
	console.log(`${entrada} → static/luna/visuals/${salidaNombre} (${cw}x${ch})`);
}
