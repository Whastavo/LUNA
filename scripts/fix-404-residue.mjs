// Limpieza final del render 404: FUNDIDO DE ALFA GEOMÉTRICO. El residuo
// (viñeteado atrapado) vive en la franja inferior de la imagen; las piernas
// de Luna son líneas finas dentro de esa franja. Por cada columna de
// píxeles, busco el ÚLTIMO píxel con contenido real (opaco y no-residual)
// y fundo a transparente por debajo de él. Sin decisiones de color: el
// residuo siempre está DEBAJO del último contenido de su columna.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from '../node_modules/.pnpm/pngjs@7.0.0/node_modules/pngjs/lib/png.js';

const RUTA = 'static/luna/visuals/luna-404.png';

const png = PNG.sync.read(readFileSync(RUTA));
const { width: w, height: h, data } = png;

const esResidual = (i) => {
	const r = data[i];
	const g = data[i + 1];
	const b = data[i + 2];
	if (data[i + 3] < 180) return false;
	const lum = (r + g + b) / 3;
	const neutralidad = Math.max(r, g, b) - Math.min(r, g, b);
	return lum < 64 && neutralidad < 12;
};

let columnasTocadas = 0;
for (let x = 0; x < w; x++) {
	// Último píxel de la columna con contenido real (no residual).
	let ultimoReal = -1;
	for (let y = h - 1; y >= 0; y--) {
		const i = (y * w + x) * 4;
		if (data[i + 3] > 30 && !esResidual(i)) {
			ultimoReal = y;
			break;
		}
	}
	if (ultimoReal === -1 || ultimoReal >= h - 3) continue;

	// Debajo del último contenido real: TODO a transparente (ahí solo vive
	// el residuo), con una mini-franja de fundido justo encima del corte.
	const inicioFundido = Math.max(0, ultimoReal - 2);
	for (let y = inicioFundido; y < h; y++) {
		const i = (y * w + x) * 4;
		if (y > ultimoReal) {
			data[i + 3] = 0;
		} else if (data[i + 3] > 0) {
			const t = (ultimoReal - y) / (ultimoReal - inicioFundido + 1);
			data[i + 3] = Math.round(data[i + 3] * (0.35 + 0.65 * t));
		}
	}
	columnasTocadas++;
}

writeFileSync(RUTA, PNG.sync.write(png));
console.log(`fundido listo: ${columnasTocadas} columnas procesadas`);
