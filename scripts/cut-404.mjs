// Recorta el fondo sólido del render 404 (chroma-key con flood-fill desde
// los bordes). Solo elimina la región del fondo CONECTADA al borde, así el
// cabello gris de Luna nunca se toca aunque se parezca al color base.
// El borde del recorte se suaviza con alfa parcial para evitar dientes de sierra.
//
// Uso: coloca el render original (con fondo) en assets-private/luna/404-original.png
// y corre `node scripts/cut-404.mjs`. El recorte queda en static/luna/faces/404.png.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from '../node_modules/.pnpm/pngjs@7.0.0/node_modules/pngjs/lib/png.js';

const ENTRADA = 'assets-private/luna/404-original.png';
const SALIDA = 'static/luna/faces/404.png';
const TOLERANCIA = 12; // el fondo del render es plano: estricto para no filtrarse en la ropa

const png = PNG.sync.read(readFileSync(ENTRADA));
const { width: w, height: h, data } = png;

// Color de fondo: muestreo las 4 esquinas y promedio.
const esquinas = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
const fondo = [0, 1, 2].map((c) =>
	Math.round(esquinas.reduce((s, i) => s + data[i + c], 0) / 4)
);
console.log('fondo detectado:', fondo);

const dist = (i) => {
	const dr = data[i] - fondo[0];
	const dg = data[i + 1] - fondo[1];
	const db = data[i + 2] - fondo[2];
	return Math.sqrt(dr * dr + dg * dg + db * db);
};

// Flood-fill BFS desde todo el perímetro: marca el fondo conectado.
const esFondo = new Uint8Array(w * h);
const cola = [];
const empujar = (x, y) => {
	const idx = y * w + x;
	if (!esFondo[idx] && dist(idx * 4) <= TOLERANCIA) {
		esFondo[idx] = 1;
		cola.push(idx);
	}
};
for (let x = 0; x < w; x++) {
	empujar(x, 0);
	empujar(x, h - 1);
}
for (let y = 0; y < h; y++) {
	empujar(0, y);
	empujar(w - 1, y);
}
while (cola.length) {
	const idx = cola.pop();
	const x = idx % w;
	const y = (idx - x) / w;
	if (x > 0) empujar(x - 1, y);
	if (x < w - 1) empujar(x + 1, y);
	if (y > 0) empujar(x, y - 1);
	if (y < h - 1) empujar(x, y + 1);
}

// Alfa: 255 en figura, 0 en fondo. La franja de transición SOLO se aplica
// a la frontera real (píxeles de figura que tocan el fondo): los internos
// conservan su alfa aunque su color se parezca al del fondo (manga negra).
const vecinoFondo = (x, y) => {
	for (let dy = -1; dy <= 1; dy++) {
		const ny = y + dy;
		if (ny < 0 || ny >= h) continue;
		for (let dx = -1; dx <= 1; dx++) {
			const nx = x + dx;
			if (nx < 0 || nx >= w) continue;
			if (esFondo[ny * w + nx]) return true;
		}
	}
	return false;
};
for (let y = 0; y < h; y++) {
	for (let x = 0; x < w; x++) {
		const idx = y * w + x;
		if (esFondo[idx]) {
			data[idx * 4 + 3] = 0;
			continue;
		}
		if (!vecinoFondo(x, y)) continue; // interior de la figura: intacto
		const d = dist(idx * 4);
		if (d < TOLERANCIA * 1.6) {
			// píxel de frontera: alfa según cuán "figura" es su color
			const t = Math.min(1, (d - TOLERANCIA) / (TOLERANCIA * 0.6));
			data[idx * 4 + 3] = Math.round(Math.max(0.15, t) * 255);
		}
	}
}

// Bounding box del contenido con margen, y recorte.
let minX = w, minY = h, maxX = 0, maxY = 0;
for (let y = 0; y < h; y++) {
	for (let x = 0; x < w; x++) {
		if (data[(y * w + x) * 4 + 3] > 20) {
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}
}
const margen = 12;
minX = Math.max(0, minX - margen);
minY = Math.max(0, minY - margen);
maxX = Math.min(w - 1, maxX + margen);
maxY = Math.min(h - 1, maxY + margen);
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;

const recorte = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++) {
	const from = ((minY + y) * w + minX) * 4;
	data.copy(recorte.data, y * cw * 4, from, from + cw * 4);
}

writeFileSync(SALIDA, PNG.sync.write(recorte));
console.log(`listo: ${SALIDA} (${cw}x${ch})`);
