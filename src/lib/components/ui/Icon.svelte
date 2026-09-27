<script lang="ts">
	// Iconos del sistema: Lucide (@lucide/svelte) — lineales, estilo Apple.
	// La API pública no cambia: { name, size, strokeWidth, color, class }.
	// Import por componente para tree-shaking (nunca el índice completo).
	import {
		ArrowRight,
		Award,
		Bell,
		BookOpen,
		Box,
		Brain,
		Calendar,
		Camera,
		ChartColumn,
		ChartNoAxesColumn,
		Check,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronUp,
		Circle,
		CircleAlert,
		CircleCheck,
		CircleDot,
		CircleHelp,
		CircleUser,
		CircleX,
		Clock,
		Cloud,
		Code,
		Coins,
		Compass,
		Copy,
		Crown,
		Database,
		Download,
		ExternalLink,
		FaceNeutral,
		File,
		FileText,
		Flame,
		Frown,
		Gamepad2,
		Gem,
		Gift,
		Globe,
		Headphones,
		Heart,
		HeartCrack,
		House,
		Image,
		Info,
		Layers,
		Layers2,
		Link,
		List,
		LoaderCircle,
		Lock,
		LockOpen,
		Meh,
		Menu,
		MessageCircle,
		MessageSquare,
		Mic,
		Milestone,
		Minus,
		Monitor,
		Moon,
		Palette,
		Paperclip,
		Pencil,
		Plus,
		RefreshCw,
		RotateCcw,
		Save,
		Search,
		Send,
		Settings,
		Shield,
		Shirt,
		Shuffle,
		SlidersHorizontal,
		Smile,
		Sparkles,
		Square,
		Star,
		Sun,
		Target,
		Trash2,
		TrendingUp,
		Trophy,
		Upload,
		UserRound,
		Users,
		Video,
		Volume2,
		X,
		Zap
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	interface Props {
		name: string;
		size?: number;
		strokeWidth?: number;
		color?: string;
		class?: string;
	}

	let { name, size = 18, strokeWidth = 2, color = 'currentColor', class: className = '' }: Props = $props();

	// Tabla de equivalencia: nombres del sistema → componente Lucide.
	// Los nombres históricos se mantienen para no tocar los 100+ sitios de uso.
	const icons: Record<string, Component> = {
		// Chevrons
		'chevron-down': ChevronDown,
		'chevron-up': ChevronUp,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,

		// Usuarios
		user: UserRound,
		'circle-user': CircleUser,
		persona: CircleUser,
		users: Users,

		// Navegación
		bars: Menu,
		xmark: X,
		x: X,
		close: X,

		// Acciones
		search: Search,
		settings: Settings,
		check: Check,
		plus: Plus,
		minus: Minus,
		trash: Trash2,
		send: Send,
		save: Save,
		copy: Copy,
		refresh: RefreshCw,
		'refresh-cw': RefreshCw,
		pencil: Pencil,
		shuffle: Shuffle,
		loader: LoaderCircle,

		// Estado y alertas
		alert: CircleAlert,
		'alert-circle': CircleAlert,
		warning: CircleAlert,
		info: Info,
		'check-circle': CircleCheck,
		'x-circle': CircleX,
		'help-circle': CircleHelp,
		'circle-help': CircleHelp,
		'circle-dot': CircleDot,
		circle: Circle,
		dot: Circle,

		// Tema
		sun: Sun,
		moon: Moon,
		monitor: Monitor,
		display: Monitor,

		// Medios y dispositivos
		camera: Camera,
		video: Video,
		image: Image,
		mic: Mic,
		volume: Volume2,
		headset: Headphones,
		gamepad: Gamepad2,

		// Ajustes y preferencias
		sliders: SlidersHorizontal,
		cube: Box,
		layers: Layers,
		modules: Layers2,
		palette: Palette,
		shirt: Shirt,
		sparkles: Sparkles,
		'wand-sparkles': Sparkles,

		// Archivos
		upload: Upload,
		download: Download,
		file: File,
		'file-text': FileText,
		'lock-open': LockOpen,
		lock: Lock,
		link: Link,
		paperclip: Paperclip,

		// Web y comunicación
		globe: Globe,
		message: MessageSquare,
		'message-square': MessageSquare,
		'message-circle': MessageCircle,
		bell: Bell,

		// Técnico
		brain: Brain,
		code: Code,
		database: Database,
		cloud: Cloud,
		shield: Shield,
		'rotate-ccw': RotateCcw,

		// Economía y recompensas
		coins: Coins,
		coin: Coins,
		gem: Gem,
		gift: Gift,
		crown: Crown,
		award: Award,
		trophy: Trophy,
		star: Star,

		// Energía y tiempo
		zap: Zap,
		energy: Zap,
		flame: Flame,
		fire: Flame,
		streak: Flame,
		clock: Clock,
		time: Clock,
		calendar: Calendar,
		compass: Compass,

		// Datos
		chart: ChartNoAxesColumn,
		stats: ChartNoAxesColumn,
		'bar-chart': ChartColumn,
		'trending-up': TrendingUp,
		target: Target,
		list: List,
		milestone: Milestone,

		// Emociones (ánimo de Luna)
		smile: Smile,
		happy: Smile,
		frown: Frown,
		sad: Frown,
		meh: Meh,
		boredom: Meh,
		neutral: FaceNeutral,
		excited: Sparkles,
		affection: Heart,
		loneliness: HeartCrack,
		heart: Heart,

		// Varios
		home: House,
		book: BookOpen,
		'arrow-right': ArrowRight,
		'external-link': ExternalLink,
		stop: Square,
		github: Code // (resguardo; las marcas ya no viven en Lucide y no se usa)
	};

	const Cmp = $derived(icons[name]);
</script>

{#if Cmp}
	<span class="icon-host {className}" style="width: {size}px; height: {size}px; color: {color};">
		<Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" />
	</span>
{:else}
	<span class="icon-fallback {className}" style="width: {size}px; height: {size}px;">?</span>
{/if}

<style>
	/* El svg lo renderiza el componente Lucide; este host hereda el color
	   y mantiene el comportamiento de siempre (inline, centrado, sin encoger). */
	.icon-host {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		flex-shrink: 0;
		line-height: 0;
	}

	.icon-host :global(svg) {
		display: block;
		overflow: visible;
	}

	.icon-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75em;
		color: var(--color-neutral-400);
	}
</style>
