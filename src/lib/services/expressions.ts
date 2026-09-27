// Etiquetas visibles para los nombres de expresiones VRM/ARKit. Los nombres
// en crudo son identificadores de blendshapes; la interfaz muestra la forma
// amable cuando existe, y el identificador si no está en el mapa.
export const EXPRESSION_LABELS: Record<string, string> = {
	// Ojos
	eyeBlinkLeft: 'Parpadeo ojo izq.',
	eyeBlinkRight: 'Parpadeo ojo der.',
	eyeLookUpLeft: 'Mirar arriba izq.',
	eyeLookUpRight: 'Mirar arriba der.',
	eyeLookDownLeft: 'Mirar abajo izq.',
	eyeLookDownRight: 'Mirar abajo der.',
	eyeLookInLeft: 'Mirar dentro izq.',
	eyeLookInRight: 'Mirar dentro der.',
	eyeLookOutLeft: 'Mirar fuera izq.',
	eyeLookOutRight: 'Mirar fuera der.',
	eyeSquintLeft: 'Entrecerrar izq.',
	eyeSquintRight: 'Entrecerrar der.',
	eyeWideLeft: 'Ojos abiertos izq.',
	eyeWideRight: 'Ojos abiertos der.',

	// Cejas
	browDownLeft: 'Ceja fruncida izq.',
	browDownRight: 'Ceja fruncida der.',
	browInnerUp: 'Cejas interiores arriba',
	browOuterUpLeft: 'Ceja exterior arriba izq.',
	browOuterUpRight: 'Ceja exterior arriba der.',

	// Boca
	jawForward: 'Mandíbula adelante',
	jawLeft: 'Mandíbula izq.',
	jawRight: 'Mandíbula der.',
	jawOpen: 'Boca abierta',
	mouthClose: 'Boca cerrada',
	mouthFunnel: 'Boca embudo',
	mouthPucker: 'Boca de beso',
	mouthLeft: 'Boca izq.',
	mouthRight: 'Boca der.',
	mouthSmileLeft: 'Sonrisa izq.',
	mouthSmileRight: 'Sonrisa der.',
	mouthFrownLeft: 'Tristeza izq.',
	mouthFrownRight: 'Tristeza der.',
	mouthDimpleLeft: 'Hoyuelo izq.',
	mouthDimpleRight: 'Hoyuelo der.',
	mouthStretchLeft: 'Estiramiento izq.',
	mouthStretchRight: 'Estiramiento der.',
	mouthRollLower: 'Labio inferior enrollado',
	mouthRollUpper: 'Labio superior enrollado',
	mouthShrugLower: 'Labio inferior encogido',
	mouthShrugUpper: 'Labio superior encogido',
	mouthPressLeft: 'Labio presionado izq.',
	mouthPressRight: 'Labio presionado der.',
	mouthLowerDownLeft: 'Labio inferior abajo izq.',
	mouthLowerDownRight: 'Labio inferior abajo der.',
	mouthUpperUpLeft: 'Labio superior arriba izq.',
	mouthUpperUpRight: 'Labio superior arriba der.',

	// Otras
	cheekPuff: 'Mejillas infladas',
	cheekSquintLeft: 'Mejilla arriba izq.',
	cheekSquintRight: 'Mejilla arriba der.',
	noseSneerLeft: 'Desdén nariz izq.',
	noseSneerRight: 'Desdén nariz der.',
	tongueOut: 'Lengua fuera',
	neutral: 'Neutral',
	happy: 'Feliz',
	angry: 'Enojada',
	sad: 'Triste',
	relaxed: 'Relajada',
	surprised: 'Sorprendida'
};

/** Etiquetas de las categorías de expresiones del panel de desarrollo. */
export const EXPRESSION_CATEGORY_LABELS: Record<string, string> = {
	eyes: 'Ojos',
	brows: 'Cejas',
	mouth: 'Boca',
	other: 'Otra'
};

/** Devuelve la etiqueta amable de una expresión, o su nombre en crudo. */
export function expressionLabel(name: string): string {
	return EXPRESSION_LABELS[name] ?? name;
}
