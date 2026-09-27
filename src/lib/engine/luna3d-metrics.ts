// Métricas reales del render loop (dev only). window.__luna3d expone el
// muestreo para verificación en navegador; en producción no se registra.
import { useThrelte, useTask } from '@threlte/core';
import * as THREE from 'three';

interface Luna3DSample {
	fps: number;
	frameMs: number;
	drawCalls: number;
	triangles: number;
	programs: number;
	geometries: number;
	textures: number;
	geoMB: number;
	texMB: number;
	texLargest: string[];
	dpr: number;
	antialias: boolean;
}

declare global {
	interface Window {
		__luna3d?: {
			sample(): Luna3DSample;
			history(): Luna3DSample[];
		};
	}
}

// three.js no expone bytes por recurso: info.memory solo da conteos y los
// bytes se derivan del scene graph (byteLength de atributos; texturas como
// RGBA8 + mipmaps ~1.33x, que es como three.js las sube por defecto).
function gpuBudget(scene: THREE.Object3D) {
	let geoBytes = 0;
	const texStats = new Map<string, { bytes: number; name: string }>();
	const seenGeo = new Set<THREE.BufferGeometry>();
	const seenTex = new Set<THREE.Texture>();

	const bytesOf = (g: THREE.BufferGeometry) => {
		let n = 0;
		const idx = g.getIndex();
		if (idx) n += idx.array.byteLength;
		for (const key of Object.keys(g.attributes)) {
			const attr = g.attributes[key] as THREE.BufferAttribute;
			n += attr.array.byteLength;
		}
		return n;
	};

	// MToonMaterial (three-vrm) extiende ShaderMaterial: sus texturas viven en
	// uniforms.*.value, no en propiedades del material.
	const textureValues = (m: THREE.Material): unknown[] => {
		const values = Object.values(m as unknown as Record<string, unknown>);
		const uniforms = (m as THREE.ShaderMaterial).uniforms;
		if (uniforms) {
			values.push(...Object.values(uniforms).map((u) => (u as { value?: unknown }).value));
		}
		return values;
	};

	scene.traverse((obj) => {
		const mesh = obj as THREE.Mesh;
		if (!mesh.isMesh) return;
		const geoms = Array.isArray(mesh.geometry) ? mesh.geometry : [mesh.geometry];
		for (const g of geoms) {
			if (!g || seenGeo.has(g)) continue;
			seenGeo.add(g);
			geoBytes += bytesOf(g);
		}
		const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		for (const m of mats) {
			if (!m) continue;
			for (const value of textureValues(m)) {
				if (value && (value as THREE.Texture).isTexture) {
					const t = value as THREE.Texture;
					if (seenTex.has(t)) continue;
					seenTex.add(t);
					const img = t.image as { width?: number; height?: number } | undefined;
					if (img?.width && img?.height) {
						// RGBA8 + mipmaps (~1.33x), como sube three.js por defecto.
						const bytes = img.width * img.height * 4 * 1.33;
						texStats.set(t.uuid, {
							bytes,
							name: t.name || `${img.width}x${img.height}`
						});
					}
				}
			}
		}
	});

	const texMB = [...texStats.values()].reduce((n, t) => n + t.bytes, 0) / 1e6;
	const largest = [...texStats.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 6);
	return {
		geoMB: +(geoBytes / 1e6).toFixed(1),
		texMB: +texMB.toFixed(1),
		texLargest: largest.map((t) => `${t.name}: ${(t.bytes / 1e6).toFixed(1)}MB`)
	};
}

export function useLuna3dMetrics(getScene: () => THREE.Object3D | null) {
	if (!import.meta.env.DEV) return;

	const ctx = useThrelte();
	const renderer = ctx.renderer as THREE.WebGLRenderer;
	const samples: Luna3DSample[] = [];
	let frames = 0;
	let last = performance.now();
	let frameMsAccum = 0;

	useTask((delta: number) => {
		frames++;
		frameMsAccum += delta * 1000;
	});

	const interval = setInterval(() => {
		const now = performance.now();
		const elapsed = now - last;
		const info = renderer.info;
		const mem = info.memory as unknown as Record<string, number>;
		const scene = getScene();
		const budget = scene ? gpuBudget(scene) : { geoMB: 0, texMB: 0, texLargest: [] };
		const sample: Luna3DSample = {
			fps: Math.round((frames * 1000) / Math.max(elapsed, 1)),
			frameMs: +(frameMsAccum / Math.max(frames, 1)).toFixed(2),
			drawCalls: info.render.calls,
			triangles: info.render.triangles,
			programs: info.programs?.length ?? 0,
			geometries: mem.geometries ?? 0,
			textures: mem.textures ?? 0,
			geoMB: budget.geoMB,
			texMB: budget.texMB,
			texLargest: budget.texLargest,
			dpr: +renderer.getPixelRatio().toFixed(2),
			antialias: renderer.getContext().getContextAttributes()?.antialias ?? false
		};
		samples.push(sample);
		if (samples.length > 120) samples.shift();
		window.__luna3d = {
			sample: () => sample,
			history: () => [...samples]
		};
		frames = 0;
		frameMsAccum = 0;
		last = now;
	}, 1000);

	return () => clearInterval(interval);
}
