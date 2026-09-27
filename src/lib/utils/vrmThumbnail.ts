import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import { fetchProtectedAsset } from '$lib/services/asset-guard';
import {
	WebGLRenderer,
	Scene,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
	Box3,
	Vector3
} from 'three';

// dispose() solo mantiene vivo el contexto WebGL hasta el GC; sin forzar la
// pérdida, generar thumbnails de muchos modelos puede chocar con el límite de
// contextos vivos del navegador y matar el contexto de la escena principal.
function disposeRenderer(renderer: WebGLRenderer) {
	renderer.dispose();
	renderer.forceContextLoss();
}

function disposeVrm(vrm: VRM, scene: Scene) {
	vrm.scene.traverse((obj: any) => {
		if (obj.geometry?.dispose) obj.geometry.dispose();
		if (obj.material) {
			const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
			materials.forEach((mat: any) => {
				if (mat?.map?.dispose) mat.map.dispose();
				mat?.dispose?.();
			});
		}
	});
	scene.remove(vrm.scene);
}

// Misma fuente que VrmModel: VRM 1.0 expone un HTMLImageElement, 0.x una texture
function getEmbeddedThumbnail(vrm: VRM): HTMLImageElement | undefined {
	if (!vrm.meta) return undefined;
	if (vrm.meta.metaVersion === '1') {
		return (vrm.meta as any).thumbnailImage;
	}
	return (vrm.meta as any).texture?.image;
}

function embeddedThumbnailToDataUrl(image: HTMLImageElement): string | null {
	try {
		const canvas = document.createElement('canvas');
		canvas.width = image.width || (image as any).naturalWidth || 256;
		canvas.height = image.height || (image as any).naturalHeight || 256;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(image, 0, 0);
		return canvas.toDataURL('image/png');
	} catch {
		return null;
	}
}

const isV1 = (vrm: VRM) => vrm.meta?.metaVersion === '1';
const armZ = Math.PI * 0.4;
const left = (vrm: VRM) => vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
const right = (vrm: VRM) => vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');

/** Pose relajada (brazos abajo) para el render fuera de pantalla. */
function applyRelaxedPose(vrm: VRM) {
	const flip = isV1(vrm) ? -1 : 1;
	if (left(vrm)) left(vrm)!.rotation.z = flip * armZ;
	if (right(vrm)) right(vrm)!.rotation.z = -flip * armZ;
	vrm.humanoid?.update();
}

/**
 * Genera el thumbnail de un modelo VRM. Prefiere la miniatura embebida en la
 * meta del modelo (la misma imagen que la escena principal muestra) para que
 * las previews sean consistentes; si no existe, renderiza el modelo en pose
 * relajada fuera de pantalla. El VRM viaja cifrado (.lcx): se descifra en
 * memoria y se parsea — nunca hay un .vrm legible en tránsito.
 */
export async function generateVrmThumbnail(url: string): Promise<string | null> {
	try {
		const data = await fetchProtectedAsset(url);
		const loader = new GLTFLoader();
		loader.register((parser) => {
			const plugin = new VRMLoaderPlugin(parser);
			if (plugin.metaPlugin) {
				plugin.metaPlugin.needThumbnailImage = true;
			}
			return plugin;
		});
		const gltf = await loader.parseAsync(data, '');
		const vrm = gltf.userData.vrm as VRM;

		// La miniatura embebida no necesita render alguno
		const embedded = getEmbeddedThumbnail(vrm);
		if (embedded) {
			const dataUrl = embeddedThumbnailToDataUrl(embedded);
			if (dataUrl) {
				const scratch = new Scene();
				scratch.add(vrm.scene);
				disposeVrm(vrm, scratch);
				return dataUrl;
			}
		}

		// Fallback: render fuera de pantalla en pose relajada
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;

		const renderer = new WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true
		});
		renderer.setSize(canvas.width, canvas.height, false);
		renderer.setPixelRatio(1);

		const scene = new Scene();
		const camera = new PerspectiveCamera(35, 1, 0.01, 100);
		scene.add(new AmbientLight(0xffffff, 0.8));
		const directionalLight = new DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(1, 1, 1);
		scene.add(directionalLight);

		try {
			VRMUtils.removeUnnecessaryVertices(vrm.scene);
			VRMUtils.removeUnnecessaryJoints(vrm.scene);

			applyRelaxedPose(vrm);

			// Los modelos VRM 0.x miran lejos de +Z; los 1.0 ya encaran la cámara
			if (!isV1(vrm)) {
				vrm.scene.rotation.y = Math.PI;
			}

			scene.add(vrm.scene);

			// Encuadre: bounding box y cámara a la altura del rostro
			const box = new Box3().setFromObject(vrm.scene);
			const center = box.getCenter(new Vector3());
			const size = box.getSize(new Vector3());

			const headY = center.y + size.y * 0.25;
			camera.position.set(0, headY, size.z * 2);
			camera.lookAt(0, headY, 0);
			camera.updateProjectionMatrix();

			renderer.render(scene, camera);
			const dataUrl = canvas.toDataURL('image/png');

			disposeVrm(vrm, scene);
			disposeRenderer(renderer);
			return dataUrl;
		} catch (e) {
			console.error('Error generando thumbnail:', e);
			disposeRenderer(renderer);
			return null;
		}
	} catch (e) {
		console.error('Error cargando VRM para thumbnail:', e);
		return null;
	}
}

/**
 * Pre-genera thumbnails para todos los modelos que aún no tienen una.
 */
export async function preGenerateThumbnails(
	models: Array<{ id: string; url: string; previewUrl?: string }>,
	onThumbnailGenerated: (modelId: string, dataUrl: string) => void
): Promise<void> {
	for (const model of models) {
		// Ya tiene preview: nada que hacer
		if (model.previewUrl) continue;

		const thumbnail = await generateVrmThumbnail(model.url);
		if (thumbnail) {
			onThumbnailGenerated(model.id, thumbnail);
		}
	}
}
