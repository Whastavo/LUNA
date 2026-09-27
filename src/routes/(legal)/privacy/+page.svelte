<script lang="ts">
	import { SITE_URL } from '$lib/config/site';
</script>

<svelte:head>
	<title>Política de privacidad — Luna</title>
	<meta
		name="description"
		content="Cómo Luna gestiona tus datos: sin cuentas, sin analíticas, sin rastreo. Tus conversaciones, recuerdos y ajustes viven en tu dispositivo."
	/>
	<link rel="canonical" href={`${SITE_URL}/privacy`} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Política de privacidad — Luna" />
	<meta
		property="og:description"
		content="Cómo Luna gestiona tus datos: sin cuentas, sin analíticas, sin rastreo."
	/>
	<meta property="og:url" content={`${SITE_URL}/privacy`} />
	<meta property="og:site_name" content="Luna" />
</svelte:head>

<header class="legal-header">
	<h1>Política de privacidad</h1>
	<p class="legal-date">Vigente desde: 3 de julio de 2026</p>
</header>

<div class="legal-summary">
	<p class="legal-summary-title">La versión corta</p>
	<ul>
		<li>Sin cuentas, sin analíticas, sin anuncios, sin cookies de rastreo.</li>
		<li>Tus conversaciones, recuerdos y ajustes se guardan en tu dispositivo, no en nuestros servidores.</li>
		<li>Los mensajes van al proveedor de IA que elijas, usando tus propias claves API.</li>
		<li>Nunca vendemos tu información personal. Ni siquiera tenemos ninguna.</li>
	</ul>
</div>

<article class="prose legal-prose">
	<p>
		Luna es una compañera de IA construida para ser local primero. Esta
		política explica qué ocurre con tus datos cuando usas el sitio web de Luna y la app web
		alojada (luna.ai y sus subdominios) y la app de escritorio de Luna, operadas por
		Whizzend. La versión corta: tu compañera vive en tu dispositivo, y nos gusta así.
	</p>

	<h2 id="what-we-dont-collect">Lo que no recopilamos</h2>
	<p>
		Luna no tiene sistema de cuentas, así que nunca te pedimos tu nombre, dirección de correo o
		contraseña. No ejecutamos analíticas ni scripts de rastreo en el sitio web ni en la app, no
		ponemos cookies publicitarias ni de rastreo, y no mostramos anuncios. No hay base de datos de
		usuarios de nuestro lado, y no podemos ver tus conversaciones. No podríamos vender tu
		información personal aunque quisiéramos, porque no tenemos ninguna.
	</p>

	<h2 id="where-your-data-lives">Dónde viven tus datos</h2>
	<p>
		Todo lo que hace que tu compañera sea tuya vive en tu dispositivo: historial de conversación,
		recuerdos extraídos, estado de la compañera, ajustes de persona y de pantalla, y las claves
		API que introduces. En la app web esto es el almacenamiento local de tu navegador (IndexedDB
		y localStorage); en la app de escritorio es el almacenamiento local propio de la app en tu
		ordenador. Nada de ello se sube ni se guarda en nuestros servidores.
	</p>
	<p>
		Para eliminar tus datos, usa las opciones de reinicio en los ajustes de la app, borra los
		datos del sitio en tu navegador o desinstala la app de escritorio. No hay copia de nuestro
		lado que pedirnos que borremos.
	</p>

	<h2 id="how-messages-reach-your-provider">Cómo llegan tus mensajes a tu proveedor de IA</h2>
	<p>
		Luna es de trae-tu-propia-IA: la conectas a un proveedor que tú eliges (por ejemplo OpenAI,
		Anthropic, o un modelo local mediante Ollama o LM Studio) usando tu propia clave API. Cómo
		viajan tus mensajes depende de dónde ejecutes Luna:
	</p>
	<ul>
		<li>
			<strong>App de escritorio:</strong> tus mensajes van directamente de tu dispositivo al
			proveedor que hayas elegido. No pasan por nuestros servidores.
		</li>
		<li>
			<strong>App web:</strong> por las restricciones cross-origin de los navegadores, las
			peticiones a proveedores en la nube pueden retransmitirse a través de nuestros servidores.
			El relé reenvía tu petición a tu proveedor y te transmite la respuesta en streaming. No
			guardamos tus mensajes ni tus claves API, y no escribimos contenido de conversaciones en
			nuestros logs.
		</li>
		<li>
			<strong>Proveedores locales:</strong> si usas Ollama o LM Studio, tus conversaciones nunca
			salen de tu máquina ni de tu red local.
		</li>
	</ul>
	<p>
		Cuando un mensaje llega a tu proveedor, la política de privacidad de ese proveedor gobierna
		cómo se trata. Te animamos a revisar las políticas de uso de datos de cualquier proveedor al
		que te conectes.
	</p>

	<h2 id="voice">Funciones de voz</h2>
	<p>
		Si usas el chat por voz, el audio del micrófono se captura solo mientras lo estás usando
		activamente y se envía directamente desde tu dispositivo al proveedor de voz que hayas
		configurado para su transcripción. La voz generada funciona igual a la inversa. Nosotros no
		recibimos ni almacenamos tu audio.
	</p>

	<h2 id="memory">La memoria funciona en tu dispositivo</h2>
	<p>
		La búsqueda semántica sobre los recuerdos de tu compañera ocurre por completo en tu
		dispositivo, usando un pequeño modelo de embeddings que se ejecuta localmente en la app. El
		archivo del modelo se descarga una vez desde una CDN pública (Hugging Face). Los recuerdos en
		sí se guardan en tu almacenamiento local como todo lo demás.
	</p>

	<h2 id="third-parties">Servicios de terceros de los que dependemos</h2>
	<ul>
		<li>
			<strong>Tus proveedores de IA</strong> procesan los mensajes y el audio que les envías bajo
			sus propias políticas de privacidad.
		</li>
		<li>
			<strong>Vercel</strong> aloja el sitio web y la app web. Como cualquier alojamiento,
			genera logs de infraestructura estándar y de vida corta (como direcciones IP y marcas de
			tiempo de las peticiones) como parte de servir las páginas. No los usamos para identificar
			nor perfilar a nadie.
		</li>
		<li>
			<strong>GitHub</strong> sirve nuestro código fuente, releases y descargas de escritorio. La
			app de escritorio también comprueba GitHub Releases en busca de actualizaciones, así que
			GitHub recibe datos estándar de petición (como tu dirección IP) cuando lo hace.
		</li>
		<li>
			<strong>Hugging Face</strong> sirve el archivo del modelo de memoria en el dispositivo la
			primera vez que la app lo carga.
		</li>
	</ul>

	<h2 id="children">Edad</h2>
	<p>
		Luna está pensada para adultos de 18 años o más. No está diseñada ni dirigida a menores de
		18, y no recopilamos a sabiendas información personal de nadie, menores incluidos, ya que no
		recopilamos información personal en absoluto.
	</p>

	<h2 id="changes">Cambios en esta política</h2>
	<p>
		Si cambiamos esta política, actualizaremos esta página y la fecha de arriba. Si un cambio es
		significativo (por ejemplo, si alguna función futura introdujera recopilación de datos), lo
		diremos claramente en nuestras notas de la versión.
	</p>

	<h2 id="contact">Contacto</h2>
	<p>
		La forma más rápida de contactarnos es a través de los canales oficiales de Whizzend. Luna
		es mantenida por Whizzend.
	</p>
</article>

<style>
	.legal-header {
		text-align: center;
		margin: 0 0 2.5rem;
	}

	.legal-header h1 {
		font-size: clamp(2.25rem, 5vw, 3rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin: 0 0 1rem;
	}

	.legal-date {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin: 0;
	}

	.legal-summary {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		padding: 1.5rem 1.75rem;
		margin: 0 0 3rem;
	}

	.legal-summary-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-tertiary);
		margin: 0 0 0.75rem;
	}

	.legal-summary ul {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.legal-summary li {
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--text-secondary);
	}

	.legal-prose {
		min-width: 0;
	}

	/* Load-in matching the blog post header rhythm. */
	.legal-header,
	.legal-summary {
		animation: legalEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.legal-summary {
		animation-delay: 0.05s;
	}

	@keyframes legalEnter {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
