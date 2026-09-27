// Limpieza quirúrgica del render 404: elimina el TALLO residual de la bota.
//
// El viñeteado del render original dejó una franja opaca que sale de la
// planta de la bota alzada y baja hasta el borde (un "tallo" de ~75-110px
// de ancho, color gris 7-36). Las piernas REALES de Luna son angostas
// (< 70px) y están más arriba. Regla: por debajo del 82% del alto, toda
// carrera horizontal de píxeles opacos más ancha que 70px es tallo → se
// funde a transparente. Las piernas nunca llegan tan abajo ni son tan
// anchas ahí, así que es imposible tocarlas.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from '../node_modules/.pnpm/pngjs@7.0.0/node_modules/pngjs/lib/png.js';

const RUTA = 'static/luna/visuals/luna-404.png';
const ANCHO_MAX_PIERNA = 70; // px: nada legítimo es más ancho abajo del 82%
const Y_INICIO = 0.82; // fracción del alto donde empieza la zona del tallo

const png = PNG.sync.read(readFileSync(RUTA));
const { width: w, height: h, data } = png;

const yInicio = Math.floor(h * Y_INICIO);
let talloFilas = 0;

for (let y = yInicio; y < h; y++) {
	// Carreras horizontales de píxeles visibles
	let x = 0;
	while (x < w) {
		if (data[(y * w + x) * 4 + 3] > 60) {
			let fin = x;
			while (fin < w && data[(y * w + fin) * 4 + 3] > 60) fin++;
			const ancho = fin - x;
			if (ancho > ANCHO_MAX_PIERNA) {
				// Tallo: funde TODA la carrera a transparente (la imagen de la
				// página ya tiene su propio mask CSS; esto quita el bloqueo).
				for (let i = x; i < fin; i++) {
					const px = (y * w + i) * 4;
					data[px + 3] = 0;
				}
				talloFilas++;
			}
			x = fin;
		} else {
			x++;
		}
	}
}

writeFileSync(RUTA, PNG.sync.write(png));
console.log(`tallo eliminado: ${talloFilas} filas limpiadas`);
