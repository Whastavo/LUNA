export function formatDate(raw: string | Date, locale: string = "es-ES"): string {
	const d = raw instanceof Date ? raw : new Date(raw + (typeof raw === "string" && raw.includes("T") ? "" : "T00:00:00"));
	return d.toLocaleDateString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric"
	});
}
