<script lang="ts">
	import { SITE_URL } from '$lib/config/site';
</script>

<svelte:head>
	<title>Términos de uso — Luna</title>
	<meta
		name="description"
		content="Los términos que rigen el sitio web de Luna, la app web alojada y la app de escritorio."
	/>
	<link rel="canonical" href={`${SITE_URL}/terms`} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Términos de uso — Luna" />
	<meta
		property="og:description"
		content="Los términos que rigen el sitio web de Luna, la app web alojada y la app de escritorio."
	/>
	<meta property="og:url" content={`${SITE_URL}/terms`} />
	<meta property="og:site_name" content="Luna" />
</svelte:head>

<header class="legal-header">
	<h1>Términos de uso</h1>
	<p class="legal-date">Vigente desde: 3 de julio de 2026</p>
</header>

<article class="prose legal-prose">
	<p>
		Gracias por usar Luna. Estos términos cubren el sitio web de Luna y los servicios alojados en
		luna.ai (incluyendo app.luna.ai y docs.luna.ai) y la app de escritorio de Luna, operados por
		Whizzend ("nosotros"). Al usar Luna, aceptas estos términos.
	</p>

	<h2 id="what-luna-is">Qué es Luna (y qué no es)</h2>
	<p>
		Luna es una compañera de IA: software que renderiza un personaje animado y lo conecta a
		modelos de IA para que puedas hablar con él. Está construida para compañía, creatividad y
		diversión.
	</p>
	<p>
		No es una persona, y no es una profesional. Nada de lo que tu compañera dice es consejo
		médico, de salud mental, legal, financiero u otro consejo profesional, y no sustituye la
		atención de una persona cualificada. Si estás pasando por una crisis, por favor no confíes en
		una compañera de IA: en EE. UU. puedes llamar o enviar un mensaje al 988 (la línea de vida
		para suicidio y crisis); en otros lugares, contacta con tus servicios de emergencia o crisis
		locales.
	</p>

	<h2 id="your-provider">Tu proveedor de IA, tus claves</h2>
	<p>
		Luna no incluye un modelo de IA. Conectas un proveedor de tu elección usando tu propia clave
		API, o ejecutas un modelo local en tu propio hardware. Eres responsable de mantener tus
		claves seguras, de los costes que te cobre tu proveedor y de cumplir los términos de servicio
		de tu proveedor. Las respuestas de tu compañera son generadas por el modelo de terceros que
		seleccionaste; nosotros no las redactamos, controlamos ni revisamos.
	</p>

	<h2 id="ai-content">Contenido generado por IA</h2>
	<p>
		La salida de la IA puede ser inexacta, incompleta o enteramente ficticia, incluso cuando suena
		segura. La personalidad, las emociones y los recuerdos de tu compañera son simulaciones
		impulsadas por tu configuración y tu modelo elegido. Usa tu propio juicio antes de confiar en
		o compartir cualquier cosa que produzca; eres responsable de cómo la usas.
	</p>

	<h2 id="acceptable-use">Uso aceptable</h2>
	<p>
		Usa Luna de forma legal. No interfieras, interrumpas ni sobrecargues nuestros servicios
		alojados ni intentes eludir sus protecciones; no uses nuestro relé para violar las políticas
		de tu proveedor de IA; y no te presentes como afiliado a Luna o Whizzend.
	</p>

	<h2 id="no-crypto">Nada de cripto, nunca</h2>
	<p>
		Luna no tiene criptomoneda, token, NFT ni proyecto de blockchain de ningún tipo, ni nunca lo
		tendrá. Cualquiera que afirme lo contrario no está afiliado a nosotros.
	</p>

	<h2 id="propiedad">Propiedad</h2>
	<p>
		Luna es un producto propietario de Whizzend. Estos términos rigen tu uso del sitio web y de
		nuestros servicios. El nombre, logo y marca de Luna pertenecen a Whizzend; por favor no los
		uses de formas que impliquen respaldo o afiliación. Los modelos de avatar, animaciones y otros
		recursos que importes siguen siendo tuyos, sujetos a las licencias con las que vinieran.
	</p>

	<h2 id="age">Edad</h2>
	<p>
		Luna es para adultos. Debes tener al menos 18 años para usarla; no está diseñada ni pensada
		para menores de 18.
	</p>

	<h2 id="as-is">Luna se proporciona "tal cual"</h2>
	<p>
		Luna se proporciona "tal cual" y "según disponibilidad", sin garantías de
		ningún tipo, expresas o implícitas, incluyendo garantías de comerciabilidad, aptitud para un
		propósito particular y no infracción. No prometemos que Luna estará disponible sin
		interrupciones, sin errores, ni que su salida será precisa.
	</p>

	<h2 id="liability">Limitación de responsabilidad</h2>
	<p>
		En la máxima medida permitida por la ley, Whizzend y sus miembros y
		colaboradores no serán responsables de ningún daño indirecto, incidental, especial,
		consecuente o ejemplar, ni por beneficios, datos o buena voluntad perdidos, derivados de tu
		uso de Luna. Nuestra responsabilidad total por cualquier reclamación relacionada con Luna no
		excederá cincuenta dólares estadounidenses (50 US$) o la cantidad que nos hayas pagado por
		usar Luna en los últimos doce meses, la mayor de ambas.
	</p>

	<h2 id="governing-law">Ley aplicable</h2>
	<p>
		Estos términos se rigen por las leyes del Estado de Ohio, EE. UU., sin considerar sus reglas
		sobre conflicto de leyes. Cualquier disputa relacionada con estos términos se resolverá en
		los tribunales estatales o federales ubicados en Ohio.
	</p>

	<h2 id="changes">Cambios en estos términos</h2>
	<p>
		Podemos actualizar estos términos de vez en cuando. Si lo hacemos, actualizaremos esta página
		y la fecha de arriba. Seguir usando Luna después de un cambio significa que aceptas los
		términos actualizados.
	</p>

	<h2 id="contact">Contacto</h2>
	<p>
		Puedes contactarnos a través de los canales oficiales de Whizzend.
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

	.legal-prose {
		min-width: 0;
	}

	.legal-header {
		animation: legalEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes legalEnter {
		from {
			opacity: 0;
			transform: translateY(12px);
		}		to {
				opacity: 1;
				transform: translateY(0);
		}
	}
</style>
