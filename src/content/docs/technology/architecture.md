---
title: Visión de la arquitectura
description: Arquitectura de alto nivel del visor VRM, el sistema de chat y el motor de compañera de Luna.
---

# Visión de la arquitectura

Luna es una aplicación del lado del cliente que combina renderizado de avatar 3D, chat con LLM, texto-a-voz y un motor de simulación de relación. Todo funciona localmente en el dispositivo del usuario — en un navegador o en la app de escritorio — sin backend necesario.

## Diagrama del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                  Cliente (Navegador o Escritorio)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      App SvelteKit                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │   UI Chat   │  │  Escena 3D  │  │   Panel de Ajustes  ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘│  │
│  │         │                │                                 │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐                         │  │
│  │  │ Cliente LLM │  │  Three.js   │                         │  │
│  │  │ xsAI/fetch  │  │  + Threlte  │                         │  │
│  │  └──────┬──────┘  └──────┬──────┘                         │  │
│  │         │                │                                 │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────────────────────┐│  │
│  │  │  Motor de   │  │ Modelo VRM  │  │   Pipeline TTS      ││  │
│  │  │  compañera  │  │ @pixiv/vrm  │  │   + Lip-sync        ││  │
│  │  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘│  │
│  │         │                                      │           │  │
│  │  ┌──────▼─────────────────────────────────────▼──────────┐│  │
│  │  │              Stores con Runes de Svelte 5              ││  │
│  │  │  (character.svelte.ts, vrm.svelte.ts, settings.svelte.ts)│  │
│  │  └──────────────────────────┬────────────────────────────┘│  │
│  │                             │                              │  │
│  │  ┌──────────────────────────▼────────────────────────────┐│  │
│  │  │              IndexedDB (Dexie.js)                      ││  │
│  │  │      Estado del personaje, datos, turnos, eventos     ││  │
│  │  └───────────────────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         APIs externas         │
              │  LLM: OpenAI / Anthropic / etc│
              │  TTS: ElevenLabs / OpenAI TTS │
              │  STT: Web Speech / Groq / Local│
              └───────────────────────────────┘
```

## Componentes principales

### Renderizado VRM

El sistema de avatar 3D usa Three.js con Threlte (un envoltorio para Svelte) para la integración.

**Archivos clave:**
- `src/lib/components/vrm/Scene.svelte` — Escena 3D principal con cámara, iluminación y post-procesado
- `src/lib/components/vrm/VrmModel.svelte` — Carga del modelo VRM, animación y control de expresiones
- `src/lib/stores/vrm.svelte.ts` — Estado VRM incluido el seguimiento de cabeza para el posicionamiento de la UI

**Librerías:**
- `@pixiv/three-vrm` — Carga y runtime de modelos VRM
- `@pixiv/three-vrm-animation` — Soporte de animaciones VRMA
- `@threlte/core` — Integración Svelte-Three.js
- `n8ao` y `postprocessing` — Efectos visuales

**Cómo funciona:**
1. El usuario sube un archivo `.vrm` o una URL
2. El cargador VRM analiza el modelo y crea un objeto de escena Three.js
3. Threlte gestiona el bucle de renderizado y se integra con la reactividad de Svelte
4. Las expresiones y animaciones se aplican vía las APIs humanoides y de expresiones de VRM

### Sistema de chat

Los mensajes fluyen por dos transportes:
- **Ruta de servidor (web + proveedores en la nube):** ruta SvelteKit usando el SDK xsAI (`src/routes/api/chat/+server.ts`)
- **Fetch directo (proveedores locales + escritorio):** transmite directamente desde el proveedor (`src/lib/services/chat/client-chat.ts`) — usado para Ollama/LM Studio y todas las builds Tauri

**Archivos clave:**
- `src/lib/components/chat/BottomChatBar.svelte` — Interfaz de entrada del usuario (texto, voz y mostrar imágenes)
- `src/lib/components/chat/SpeechBubble.svelte` — Visualización de mensajes
- `src/lib/ai/prompt-builder.ts` — Construcción del prompt de sistema (incl. el prompt de extracción JSON forzado)
- `src/lib/ai/response-parser.ts` — Extrae diálogo + estado y normaliza a la defensiva la salida del modelo
- `src/lib/services/chat/client-chat.ts` — Streaming directo + el fallback desacoplado `extractStateUpdates`
- `src/lib/services/chat/content.ts` — Serialización de imágenes por proveedor
- `src/lib/engine/` — Lógica central del motor de compañera

**Flujo:**
```
Entrada del usuario
    │
    ▼
┌──────────────┐
│ Heurísticas  │ ── Calcula cambios de estado base
│ Motor        │    (decaimiento de energía, actualización de rachas)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Recuperación │ ── Recupera datos relevantes + turnos recientes por
│ de memoria   │    similitud semántica (fallback por palabra clave hasta
└──────┬───────┘    que los embeddings se calienten)
       │
       ▼
┌──────────────┐
│ Constructor  │ ── Combina prompt de sistema + estado del personaje
│ de prompts   │    + contexto de memoria + instrucciones
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Proveedor    │ ── Transmite la respuesta de OpenAI/Anthropic/etc.
│ LLM          │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Analizador   │ ── Elimina tokens de razonamiento/parada + turnos
│ de respuesta │    alucinados, extrae diálogo + JSON en línea
└──────┬───────┘    (tolerante a formato inválido)
       │
       ▼
┌──────────────┐
│ Respaldo de  │ ── Si el JSON en línea falta (modelos pequeños/RP),
│ extracción   │    una llamada JSON forzada re-deriva ánimo/deltas/memoria
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Fusionador   │ ── Fusiona la línea base heurística + deltas del LLM,
│ de estado    │    persiste en IndexedDB; guarda recuerdos nuevos
└──────────────┘    (datos + embeddings)
```

**Extracción de estado (dos caminos):** El modelo responde en personaje y termina con un bloque JSON de actualizaciones de estado (ánimo, deltas de relación, `new_memory`). Los modelos capaces lo emiten en línea; cuando un modelo lo omite o lo estropea (común en modelos pequeños, locales y afinados para roleplay), una segunda llamada JSON forzada re-deriva el estado para que la memoria y el movimiento de la relación sigan aterrizando. Consulta [Sistema de compañera](/docs/technology/companion-system) para el modelo de dos caminos y las capas de robustez del analizador.

**Mostrar imágenes:** Una imagen mostrada (cámara o arrastrar-y-soltar) se serializa por proveedor — URLs de datos `image_url` estilo OpenAI o bloques base64 `source` de Anthropic (`content.ts`) — y solo llega a modelos con visión. Las fotos guardadas se almacenan localmente (blob + miniatura) vía `src/lib/services/storage/keepsakes.ts`.

### Pipeline TTS

El texto-a-voz convierte las respuestas del LLM en audio con lip-sync.

**Archivos clave:**
- `src/lib/services/lipsync/analyzer.ts` — Análisis de audio para el lip-sync
- `src/lib/services/tts/elevenlabs.ts` — Proveedor ElevenLabs
- `src/lib/services/tts/openai-tts.ts` — Proveedor compatible con OpenAI (TTS en la nube de OpenAI y servidores locales)
- `src/lib/services/tts/index.ts` — Fábrica de proveedores y contexto de audio compartido
- `src/lib/services/providers/local-endpoints.ts` — Resolución de URL base de TTS local y pistas de conexión

**Proveedores soportados (3):**
- **ElevenLabs** (nube, alta calidad, requiere clave de API)
- **OpenAI TTS** (nube, requiere clave de API)
- **TTS local** — cualquier servidor TTS compatible con OpenAI que exponga `/v1/audio/speech` (p. ej. Kokoro-FastAPI, openedai-speech). Sin clave; por defecto `http://localhost:8880/v1`, y reutiliza el cliente de OpenAI TTS apuntado a la URL base local

**Flujo:**
1. El texto de respuesta del LLM se envía al proveedor TTS
2. El audio se recibe como un buffer
3. La Web Audio API reproduce el audio
4. El analizador de audio extrae datos de volumen/frecuencia
5. El modelo VRM mapea los datos de audio a las formas de mezcla de la boca en tiempo real

### Voz-a-texto (STT)

La entrada de voz convierte el audio del micrófono en texto a través de uno de cuatro proveedores, elegido automáticamente por prioridad.

**Archivos clave:**
- `src/lib/services/stt/openai-stt.ts` — Cliente de transcripción compatible con OpenAI (Groq y servidores Whisper locales vía `/v1/audio/transcriptions`)
- `src/lib/services/stt/web-speech.ts` — Proveedor de la Web Speech API del navegador
- `src/lib/stores/stt.svelte.ts` — Selección del proveedor activo y estado de sesión

**Proveedores soportados (orden de prioridad):**
- **STT local** — cualquier servidor Whisper compatible con OpenAI (Speaches, faster-whisper-server, whisper.cpp). Sin clave; por defecto `http://localhost:8000/v1`
- **Groq (Whisper)** — transcripción en la nube, requiere clave de API
- **OpenAI (Whisper)** — transcripción en la nube vía la API de OpenAI, requiere clave de API
- **Web Speech API** — integrada en el navegador, sin clave, no disponible en el webview de escritorio

Selección: gana un servidor local configurado, luego Groq, luego OpenAI, luego Web Speech.

### Sistema de memoria

Arquitectura de memoria de tres niveles para el contexto y el recuerdo.

**Archivos clave:**
- `src/lib/engine/memory.ts` — Gestión de memoria
- `src/lib/types/memory.ts` — Definiciones de tipos de memoria
- `src/lib/db/index.ts` — Esquema de la base de datos

**Niveles:**
1. **Memoria de trabajo** — Buffer en memoria de los turnos recientes de conversación
2. **Datos** — Datos guardados en IndexedDB con embeddings vectoriales para búsqueda semántica
3. **Sesiones** — Resúmenes de conversación para el contexto a largo plazo

**Búsqueda semántica:**
Usa `@xenova/transformers` para ejecutar localmente en el dispositivo del usuario el modelo de embeddings multilingüe `paraphrase-multilingual-MiniLM-L12-v2`. Los datos se incrustan como vectores de 384 dimensiones y pueden recuperarse por similitud coseno con la conversación actual.

Consulta [Sistema de compañera](/docs/technology/companion-system) y [Grafo de memoria](/docs/technology/memory-graph) para la documentación detallada de la memoria.

### Gestión de estado

Stores basados en las runes de Svelte 5 para el estado reactivo.

**Stores clave:**
- `src/lib/stores/character.svelte.ts` — Estado del personaje/compañera
- `src/lib/stores/vrm.svelte.ts` — Estado del modelo 3D, seguimiento de cabeza
- `src/lib/stores/settings.svelte.ts` — Configuraciones de proveedores (LLM, TTS, STT)
- `src/lib/stores/persona.svelte.ts` — Gestión de la tarjeta de persona
- `src/lib/stores/chat.svelte.ts` — Estado de la sesión de chat
- `src/lib/stores/tts.svelte.ts` — Estado del texto-a-voz
- `src/lib/stores/stt.svelte.ts` — Estado de la voz-a-texto
- `src/lib/stores/display.svelte.ts` — Distancia de cámara y ajustes de pantalla
- `src/lib/stores/overlay.svelte.ts` — Estado del modo superposición de escritorio

**Patrón:**
```typescript
// Patrón de runes de Svelte 5
let count = $state(0);
const doubled = $derived(count * 2);

$effect(() => {
  console.log('Count changed:', count);
});
```

### Modo foto

Un estudio dentro de la escena: poses, expresiones, fondos, filtros, marcos, stickers, seguimiento de cabeza y captura en alta resolución.

**Archivos clave:**
- `src/lib/stores/photomode.svelte.ts` — estado del modo, override de lente solo en sesión, opciones de captura
- `src/lib/services/poses.ts` — carga del manifiesto de poses (`/static/luna/poses/manifest.json`) con animaciones VRMA en caché; añadir una pose es un cambio de datos
- `src/lib/services/scene-backgrounds.ts` — biblioteca compartida de fondos predefinidos: degradados como valores CSS, patrones como mosaicos de canvas dibujados proceduralmente reutilizados para la vista previa en vivo y la composición de capturas
- `src/lib/services/photo-capture.ts` — ayudantes de composición de captura (fondos, marcos, viñeta, stickers)
- `src/lib/components/photomode/` — el panel con pestañas, la capa arrastrable de stickers y la vista previa de marcos

Las capturas renderizan un fotograma con supermuestreo en el sitio (el canvas conserva su buffer de dibujo), y luego componen el fondo, el filtro, la viñeta, el marco y los stickers en un canvas 2D para que el PNG guardado coincida exactamente con la vista previa. Las capturas de foto se almacenan bajo un tipo de recuerdo separado y nunca aparecen en el tablero de fotos; el archivo mismo va a la carpeta de Descargas (una descarga del navegador en web, una escritura directa vía el plugin de fs en escritorio).

### Reacciones al tacto y física

- `src/lib/services/photo-touch.ts` — clasifica un toque por raycast en una zona táctil gruesa según el hueso humanoide más cercano
- `src/lib/engine/photo-reactions.ts` — la tabla de reacciones basada en datos indexada por zona y etapa de relación; toques repetidos escalan y se enfrían. Este archivo es la única palanca para afinar el tono
- `src/lib/engine/spring-physics.ts` — el mapeo de intensidad de física (multiplicadores sobre los valores de muelle autorados de cada rig, acotados a rangos estables) y el límite de delta de fotograma que evita explosiones de huesos con muelle tras volver a la pestaña

Las reacciones funcionan por igual en la vista de chat y en el modo foto: un destello de expresión más un empujón de hueso decayente que solo hereda la física de muelles.

### Recordatorios y programación

Tareas y temporizadores programados por la compañera, conscientes de múltiples ventanas.

**Archivos clave:**
- `src/lib/utils/reminders.ts` — análisis de etiquetas de recordatorio (`[reminder:5min]...[/reminder]`), extracción de respaldo por lenguaje natural, y ayudantes de política puros
- `src/lib/stores/reminders.svelte.ts` — el bucle de sondeo: dispara recordatorios vencidos, reporta los perdidos, coordina entre ventanas vía `BroadcastChannel` con una reclamación atómica para que el LLM reaccione exactamente una vez
- `src/lib/services/chat/reminder-chat.ts` — entrega los recordatorios disparados por el pipeline de chat como eventos de sistema

Los recordatorios disparados entran al prompt como una capa `<event>` en vez de un turno de usuario y se saltan toda la mutación del estado de relación. Consulta el documento del Sistema de compañera para el camino de turno systemEvent.

### Capa de almacenamiento

Todos los datos persisten del lado del cliente vía IndexedDB usando Dexie.js.

**Tablas de la base de datos:**
- `characterStates` — Estado del personaje y datos de relación
- `facts` — Datos de memoria con embeddings
- `sessions` — Resúmenes de sesiones de conversación
- `conversationTurns` — Historial de conversación
- `completedEvents` — Eventos de hitos que se han disparado
- `reminders` — Tareas y temporizadores programados con su estado disparado/descartado

**Archivo clave:** `src/lib/db/index.ts`

**Beneficios:**
- Sin servidor necesario
- Los datos se quedan en el dispositivo del usuario
- Funciona fuera de línea tras la carga inicial
- Gran capacidad de almacenamiento (típicamente 50MB+)

## Estructura del proyecto

```
src/
├── lib/
│   ├── ai/               # Construcción de prompts LLM y análisis de respuestas
│   ├── components/
│   │   ├── chat/          # UI de chat (BottomChatBar, SpeechBubble)
│   │   ├── docs/          # Componentes del sitio de documentación
│   │   ├── events/        # Escena de eventos y UI de elección
│   │   ├── icons/         # Componentes de iconos
│   │   ├── marketing/     # Componentes de la página de aterrizaje
│   │   ├── memory/        # Visualización del grafo de memoria
│   │   ├── onboarding/    # Configuración de primera ejecución
│   │   ├── overlay/       # UI de superposición de escritorio
│   │   ├── photomode/     # Panel de modo foto, stickers, vista previa de marcos
│   │   ├── settings/      # Componentes de la página de ajustes
│   │   ├── ui/            # Primitivas de UI compartidas
│   │   ├── updater/       # UI de auto-actualización de escritorio
│   │   └── vrm/           # Escena y modelo 3D
│   ├── config/            # Configuración de la app y la documentación
│   ├── data/              # Datos estáticos (definiciones de eventos)
│   ├── db/                # Esquema de base de datos y exportación/importación
│   ├── engine/            # Motor de compañera (heurísticas, etapas, estado, eventos, memoria)
│   ├── services/
│   │   ├── chat/          # Cliente de chat
│   │   ├── lipsync/       # Análisis de audio para lip-sync
│   │   ├── modules/       # Sistema de módulos
│   │   ├── platform/      # Abstracción de plataforma Tauri/web
│   │   ├── providers/     # Registro de proveedores LLM y obtención de modelos
│   │   ├── storage/       # Capa de almacenamiento IndexedDB
│   │   ├── stt/           # Proveedores de voz-a-texto
│   │   └── tts/           # Proveedores de texto-a-voz
│   ├── stores/            # Stores con runes de Svelte 5
│   ├── types/             # Tipos TypeScript
│   └── utils/             # Funciones de utilidad
├── routes/
│   ├── app/               # Rutas de la app principal y ajustes
│   ├── blog/              # Páginas del blog
│   ├── docs/              # Sitio de documentación
│   └── overlay/           # Ruta de superposición de escritorio
└── content/
    ├── blog/              # Contenido markdown de las entradas del blog
    └── docs/              # Markdown del sitio de documentación
```

## Interacciones clave

### Actualización de expresiones

Cuando cambia el ánimo de la compañera:

1. El motor de compañera calcula el nuevo estado de ánimo
2. El estado se escribe en el store de `character.svelte.ts`
3. El componente `VrmModel.svelte` reacciona al cambio del store
4. El ánimo se mapea a las formas de mezcla VRM (expresiones)
5. La cara del modelo VRM se actualiza en tiempo real

### Disparo de eventos

Cuando se cruzan umbrales de relación:

1. El fusionador de estado detecta el cruce del umbral
2. El sistema de eventos comprueba eventos elegibles
3. El evento coincidente se marca como disparado
4. La UI muestra el contenido del evento (si lo hay)
5. El ID del evento se añade a `completedEvents`

## Aplicación de escritorio (Tauri)

La app de escritorio envuelve la misma aplicación SvelteKit usando Tauri v2.

### Capa de plataforma

Una capa de abstracción de plataforma permite que el código se comporte distinto en web vs escritorio:

**Archivos clave:**
- `src/lib/services/platform/platform.ts` — detección de `isTauri()` / `isWeb()`
- `src/lib/services/platform/window.ts` — Gestión de ventanas (posición, arrastre, clic-a-través)
- `src/lib/services/platform/hotkeys.ts` — Registro de atajos globales

**Patrón de detección:**
```typescript
import { isTauri } from '$lib/services/platform';

if (isTauri()) {
  // Código solo de escritorio
  await startDragging();
}
```

### Arquitectura multi-ventana

La app de escritorio usa dos ventanas:

| Ventana | Propósito |
|--------|---------|
| `main` | Aplicación completa con todas las funciones |
| `overlay` | Vista de compañera transparente siempre encima |

**Lógica de cambio:**
- Principal → Superposición: invocar el comando `show_overlay`, ocultar la ventana principal
- Superposición → Principal: mostrar la ventana principal, ocultar la superposición

### Renderizado de superposición

Para fondos transparentes en modo superposición:
1. Ventana Tauri configurada con `transparent: true`, `decorations: false`
2. Fondos de HTML/body puestos en transparente vía CSS
3. El renderer de Three.js usa `alpha: true` y `setClearColor(0x000000, 0)`
4. Fondo de escena puesto en `null` (sin skybox)

**Archivo clave:** `src/routes/overlay/+page.svelte`

## Tecnologías

| Categoría | Tecnología |
|----------|------------|
| Framework | SvelteKit 2 |
| Lenguaje | TypeScript |
| Renderizado 3D | Three.js + Threlte |
| Soporte VRM | @pixiv/three-vrm |
| Integración LLM | SDK xsAI (web) / fetch directo (escritorio) |
| Escritorio | Tauri v2 |
| Estilos | Tailwind CSS 4 |
| Base de datos | IndexedDB (Dexie.js) |
| Embeddings | Transformers.js |
| Herramienta de build | Vite |
