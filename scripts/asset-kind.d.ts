// Contract every asset kind implements in scripts/optimize-assets.mjs (KINDS).
// Shared by hashing, caching, orphan cleanup and manifest writing; a kind only
// declares what makes it different.

export interface AssetProcessContext {
	/** Pipeline group (e.g. 'luna', 'marketing', 'blog') — drives profiles. Images only. */
	group?: string;
	/** The kind itself (publicUrlOf, ...). */
	kind: AssetKind;
	/** Probed source metadata. Images: sharp metadata. */
	meta: Record<string, unknown>;
	/** Variant widths requested by profile+override. Images only. */
	requestedWidths: number[];
}

export interface AssetProcessResult {
	/** Original asset URL, used as the manifest key (e.g. '/marketing/hero.webp'). */
	url: string;
	/**
	 * Manifest entry consumed by consumers of the manifest (images:
	 * marketing-images.ts). Kinds with no manifest output (vrm) return {} and
	 * their public artifacts live outside the manifest.
	 */
	entry: Record<string, unknown>;
	/** Absolute paths of generated public artifacts, for freshness checks. */
	artifacts: string[];
}

export interface AssetKind {
	/** dir (relative to repo root) → file-name matcher. */
	globs: Record<string, string | RegExp | ((name: string) => boolean)>;
	/** Variant-width profile per render group. Images only; may be empty. */
	groupProfiles: Record<string, number[]>;
	/** Per-asset overrides on top of the group profile. Images only. */
	profileOverrides: Record<string, number[]>;
	/** Render group of each source dir (relative to repo root). */
	groupOfDir: Record<string, string>;
	/** Historical public URL (manifest key) of a master. */
	publicUrlOf(sourcePath: string): string;
	/** Whether raw PNG masters may appear in srcsets. */
	rawPngInSrcset: boolean;
	/** Groups whose served webp original is appended to srcsets. */
	originalInSrcsetGroups: string[];
	/**
	 * Source metadata probe. Defaults to sharp image metadata. A kind may
	 * return { skipped: true } to declare the source out of its processing
	 * scope (e.g. glTF with external textures): it gets cached for
	 * fingerprinting but process() is never called for it.
	 */
	probe?(sourcePath: string): Promise<Record<string, unknown>>;
	process(sourcePath: string, ctx: AssetProcessContext): Promise<AssetProcessResult>;
}
