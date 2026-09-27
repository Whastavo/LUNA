// Fechas siempre en español y en horario UTC (independiente del reloj local).
const MONTHS_UTC = [
	'ene', 'feb', 'mar', 'abr', 'may', 'jun',
	'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
] as const;

/** Fecha en UTC, p. ej. "15 sep 2026". */
export function formatDate(raw: string | Date): string {
	const d = raw instanceof Date ? raw : new Date(raw + 'T00:00:00Z');
	return `${d.getUTCDate()} ${MONTHS_UTC[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
