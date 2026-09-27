---
title: Sistema de compañera
description: Documentación de arquitectura del sistema de relación y estado de personaje de Luna.
---

# Arquitectura del Sistema de compañera

## Visión general

El Sistema de compañera es el motor central que gestiona el estado de relación, las emociones del personaje, la memoria y la progresión de eventos. El principio de diseño clave: **la app es la directora del juego** — ella controla las emociones, el ánimo, el estado de relación, y el LLM es puramente un generador de diálogo que puede sugerir cambios de estado vía JSON.

## Principios de diseño

1. **Estado controlado por la app** — Todo el estado del personaje lo gestiona la aplicación. El LLM no tiene estado interno.
2. **Actualizaciones híbridas** — Las heurísticas de la app calculan cambios de estado base; el LLM puede anular el ánimo y sugerir cambios adicionales vía JSON.
3. **Degradación elegante** — Si el LLM falla al emitir JSON válido, el sistema funciona usando solo heurísticas.
4. **Relaciones multi-eje** — En vez de una única puntuación de afecto, las relaciones se siguen en 5 dimensiones.
5. **Progresión por eventos** — Los eventos de hito se disparan en umbrales de relación concretos.
6. **Compañera única** — Un estado de personaje unificado que combina metadatos de persona y estadísticas.
7. **Operación en doble modo** — Los usuarios pueden elegir entre Modo compañía (asistente simple) y Modo simulador de citas (mecánicas de relación completas).

## Modos de la app

Luna soporta dos modos distintos:

### Modo compañía

- Experiencia de asistente de IA simple sin mecánicas de relación
- La etapa de relación queda fijada en «Compañía»
- Sin progresión de estadísticas — afecto, confianza, intimidad, etc. permanecen estáticos
- Las estadísticas del simulador de citas se conservan; volver activa el recálculo de la etapa

### Modo simulador de citas (predeterminado)

- Mecánicas de relación completas activadas
- Progresión a través de 8 etapas de relación (Desconocida a Alma gemela)
- Las estadísticas cambian según las conversaciones e interacciones
- Los eventos se disparan en los hitos

Al cambiar de Simulador de citas a Modo compañía, la etapa de relación actual se guarda en `savedDatingSimStage`. Al volver, se recalcula la etapa de relación a partir de las estadísticas actuales.

## Modelos de datos

### Estado del personaje

La estructura de datos central que sigue todos los datos de relación y personaje. Un registro unificado que combina metadatos de persona con estadísticas de personaje.

```typescript
interface CharacterState {
  id?: number;
  name: string;
  systemPrompt: string;
  extensions: PersonaExtensions;
  mood: MoodState;
  energy: number;              // 0-100
  affection: number;           // 0-1000
  trust: number;               // 0-100
  intimacy: number;            // 0-100
  comfort: number;             // 0-100
  respect: number;             // 0-100
  appMode: AppMode;
  relationshipStage: RelationshipStage;
  savedDatingSimStage?: RelationshipStage;
  personality: PersonalityProfile;
  lastInteraction: Date | null;
  lastDecayAt?: Date | null;   // decay applies once per absence, not per reload
  firstMet: Date;
  daysKnown: number;
  totalInteractions: number;
  currentStreak: number;
  longestStreak: number;
  streakLastDate: string | null;
  completedEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Estado de ánimo

Sigue el estado emocional actual con causalidad — el sistema recuerda *por qué* la compañera se siente de cierta manera.

```typescript
interface MoodState {
  primary: Emotion;
  intensity: number;     // 0-100
  secondary?: Emotion;
  causes: string[];      // Last 5 causes
}

type Emotion =
  | 'happy' | 'sad' | 'excited' | 'anxious'
  | 'content' | 'frustrated' | 'curious'
  | 'affectionate' | 'playful' | 'melancholy'
  | 'flustered' | 'neutral';
```

### Etapas de relación

Nueve etapas en total — una etapa especial de Modo compañía (no parte de la progresión) más ocho etapas de progresión del Simulador de citas (Desconocida hasta Alma gemela).

```typescript
type RelationshipStage =
  | 'companion'
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'romantic_interest'
  | 'dating'
  | 'committed'
  | 'soulmate';
```

### Requisitos de etapa (Modo simulador de citas)

| Etapa | Afecto | Confianza | Intimidad | Comodidad | Respeto | Días conocidos | Interacciones | Eventos requeridos |
|-------|-----------|-------|----------|---------|---------|------------|--------------|-----------------|
| Desconocida | 0 | 0 | - | - | - | - | - | - |
| Aliada | 50 | 20 | - | - | - | - | 3 | - |
| Amiga | 150 | 50 | - | - | - | 3 | 10 | - |
| Amiga cercana | 300 | 70 | - | 50 | - | 7 | 25 | - |
| Interés romántico | 450 | 75 | 30 | - | - | 10 | - | first_deep_conversation, shared_vulnerability |
| Citas | 600 | 85 | 50 | - | - | 14 | - | confession_accepted |
| Comprometida | 800 | 95 | 75 | 80 | - | 30 | - | commitment_accepted |
| Alma gemela | 950 | 100 | 90 | 95 | 90 | 60 | - | deep_bond_moment |

`confession_accepted` y `commitment_accepted` son marcadores de resultado de elección, no IDs de eventos: solo la elección de aceptar de la confesión o de la conversación de compromiso los otorga. Aplazar cualquiera de las dos conversaciones deja la etapa bloqueada, y un evento repetible de seguimiento (`confession_revisit` / `commitment_revisit`) vuelve a plantear la pregunta más tarde para que la puerta siga abierta.

## Sistema de memoria

### Memoria de tres niveles

1. **Memoria de trabajo** (en memoria) — Los últimos 20 turnos de conversación, contexto de la sesión actual
2. **Datos** (IndexedDB) — Conocimiento extraído sobre el usuario, indexado con embeddings vectoriales
3. **Sesiones** (IndexedDB) — Resúmenes de conversaciones pasadas

### Búsqueda de memoria semántica

Los datos se indexan usando embeddings vectoriales para la búsqueda por similitud semántica. En lugar de coincidencia por palabras clave, el sistema encuentra datos por significado — «actividades al aire libre» puede recuperar recuerdos sobre senderismo incluso sin palabras compartidas.

**Cómo funciona:**
- Usa Transformers.js con el modelo multilingüe `paraphrase-multilingual-MiniLM-L12-v2` (corre localmente; funciona entre idiomas, no solo inglés)
- Los embeddings son vectores de 384 dimensiones guardados junto a los datos en IndexedDB
- En una consulta, el mensaje del usuario se incrusta y se compara usando similitud coseno
- Los resultados se ordenan mezclando similitud semántica (70%) con puntuación de importancia (30%), similitud mínima 0.3
- Los recuerdos disparados (re-búsqueda por palabra clave) usan otra mezcla: 60% similitud / 40% importancia, similitud mínima 0.5
- Recurre a la búsqueda por palabras clave si el modelo de embeddings falla al cargar

**Rendimiento:**
- El modelo carga en 2-5 segundos (en caché tras la primera carga)
- Generación de embeddings: 10-50ms por dato
- Búsqueda por similitud: menos de 10ms incluso con miles de datos
- Almacenamiento: ~1.5KB por dato para los embeddings

### Estructura de dato

```typescript
interface Fact {
  id?: number;
  content: string;
  category: FactCategory;  // 'user' | 'relationship' | 'shared_experience'
  importance: number;       // 0-100
  confidence: number;       // 0-1
  source?: string;
  referenceCount: number;
  createdAt: Date;
  lastAccessed?: Date;
  embedding?: number[];     // 384-dim vector
  embeddingModel?: string;  // which model produced it; drives re-embedding on upgrades
}
```

### Fuentes de memoria

Los datos se capturan de dos fuentes:

1. **Observaciones del LLM** — El LLM puede emitir un campo `new_memory` en su respuesta JSON con conclusiones sobre el usuario. Estas se guardan automáticamente.
2. **Extracción de patrones** — Patrones de regex extraen datos de los mensajes del usuario (p. ej. «Mi nombre es…», «Trabajo en…», «Me gusta…»).

### Recuperación de memoria

Al construir los prompts, el sistema recupera:
- Turnos recientes de la memoria de trabajo
- Datos relevantes por búsqueda de similitud semántica (recurre a búsqueda por palabras clave)
- Recuerdos disparados (datos de alta importancia semánticamente relacionados con la conversación)
- Resúmenes de sesiones recientes (si vuelve tras una ausencia)

## Mostrarle imágenes (multimodal)

Los usuarios pueden «mostrar» a su compañera una imagen igual que le mostrarías algo a un amigo en tu teléfono: vía el botón de cámara en la barra de chat, o arrastrando una foto sobre ella. Se plantea como *mostrarle algo*, no como «adjuntar un archivo».

### Cómo funciona

- **Filtro de visión**: El botón de cámara solo está activo cuando el modelo seleccionado realmente puede ver. `canShowImages()` combina una marca de `supportsVision` a nivel de proveedor (OpenAI, Anthropic, Google, xAI) con una heurística de nombre de modelo (`modelSupportsVision`) para proveedores locales (Ollama / LM Studio), donde la capacidad depende del modelo instalado (LLaVA, gemma3:4b, qwen2.5-vl…). Los modelos de solo texto reciben una invitación amable a cambiar, no un fallo silencioso.
- **Gestión de formatos**: Las imágenes elegidas se normalizan antes de enviar. Las imágenes demasiado grandes se reducen (el borde más largo se acota) y se re-codifican a JPEG; los formatos decodificables pero no soportados (p. ej. HEIC en Safari) se convierten a JPEG; los formatos que el navegador no puede decodificar y las APIs de visión no aceptarán (p. ej. HEIC en Chrome) se rechazan con un mensaje claro. Los formatos de envío soportados son JPEG, PNG, GIF y WebP.
- **Formatos de envío por proveedor**: La misma imagen en memoria se serializa por proveedor (URLs de datos `image_url` estilo OpenAI, o bloques base64 `source` estilo Anthropic) por `toOpenAIContent` / `toAnthropicContent`.
- **Memoria y el tablero**: Una imagen mostrada puede convertirse en un «recuerdo de foto» — la compañera puede dejar una nota sobre lo que vio — y las fotos guardadas se almacenan localmente (blob + miniatura) y se muestran en un **tablero de fotos** estilo álbum de recortes.

### Privacidad

Las imágenes se quedan en tu dispositivo. Solo las reciben los modelos con visión, y solo para la única inferencia en la que las muestras. Cuando se selecciona un proveedor en la nube, un aviso de una sola vez informa al usuario de que su foto se envía a ese proveedor para ser vista; con un proveedor local indica que la imagen nunca sale de la máquina. Las fotos guardadas pueden borrarse del tablero en cualquier momento.

## Recuperación y decaimiento basados en el tiempo

Cuando la app carga, calcula las horas desde la última interacción y aplica recuperación o decaimiento.

### Recuperación de energía

- **Recuperación completa** — 6+ horas de ausencia restauran la energía a 100
- **Recuperación parcial** — Basada en proporción (horas / 6), mínimo 1 energía por sesión

### Decaimiento de afecto

- **Umbral** — 48+ horas de ausencia
- **Tasa** — 1-5% por sesión según los días de ausencia
- **Tope** — Máximo 50 de afecto perdido por sesión

### Decaimiento de confianza

- **Umbral** — 7+ días de ausencia
- **Tasa** — 2 de confianza por semana de ausencia
- **Tope** — Máximo 10 de confianza perdido por sesión

### Cambio de ánimo

- **Umbral** — 3+ días de ausencia
- **Efecto** — El ánimo cambia a melancolía
- **Intensidad** — Aumenta 5 por día de ausencia (máx. 30)

## Sistema de eventos

### Definición de evento

```typescript
interface EventDefinition {
  id: string;
  name: string;
  type: 'milestone' | 'random' | 'scheduled' | 'conditional' | 'anniversary';
  conditions: EventCondition[];
  scene?: Scene;
  stateChanges?: Partial<StateUpdates>;
  unlocks?: string[];
  achievementId?: string;
  cooldownDays?: number;
  lastTriggered?: Date;
  oneTime: boolean;
  priority: number;
}
```

### Tipos de condición

| Condición | Descripción |
|-----------|-------------|
| min_affection | Nivel mínimo de afecto |
| min_trust | Nivel mínimo de confianza |
| min_intimacy | Nivel mínimo de intimidad |
| min_comfort | Nivel mínimo de comodidad |
| min_respect | Nivel mínimo de respeto |
| max_energy | Energía máxima (para eventos de cansancio) |
| relationship_stage | Coincidencia exacta de etapa |
| relationship_stage_min | Etapa mínima |
| days_known | Días conocidos mínimos |
| total_interactions | Recuento mínimo de chats |
| event_completed | Evento prerequisito |
| event_not_completed | Evento aún no disparado |
| time_of_day | mañana / tarde / noche / madrugada |
| day_of_week | 0-6 (domingo-sábado) |
| random_chance | Probabilidad (0-1) |
| keyword_mentioned | Palabra en el mensaje |
| mood_is | Ánimo concreto |
| mood_intensity_min | Intensidad mínima |
| consecutive_days | Racha mínima |
| hours_since_last_interaction_min | Ausencia mínima |
| hours_since_last_interaction_max | Ausencia máxima |

### Estructura de escena

```typescript
interface Scene {
  id: string;
  intro?: string;
  dialogue?: string;
  choices?: SceneChoice[];
  outro?: string;
  backgroundChange?: string;
  expressionOverride?: string;
  musicCue?: string;
}

interface SceneChoice {
  text: string;
  response: string;
  stateChanges: Partial<StateUpdates>;
  nextSceneId?: string;
  unlocks?: string[];
}
```

### Categorías de eventos

Los eventos se organizan por tipo (`milestone`, `random`, `scheduled`, `conditional`, `anniversary`), y se agrupan en cuatro archivos:

1. **Eventos de hito** — Primera cita, aniversarios, conversaciones profundas, logros de racha
2. **Eventos aleatorios** — Preguntas, cumplidos, recuerdos, bromas
3. **Eventos románticos** — Confesión, citas, ceremonias de compromiso
4. **Eventos basados en el tiempo** — Saludos matutinos, chats nocturnos, ambiente de fin de semana

## Arquitectura de prompts

El prompt de sistema se construye con hasta 7 capas:

1. **Sistema** — Reglas, formato de salida, hora actual
2. **Personaje** — Nombre, personalidad, historia, patrones de habla
3. **Estado actual** — Ánimo, energía, etapa de relación y estadísticas, días conocidos
4. **Memoria** — Turnos de conversación recientes, datos relevantes, contexto de sesión
5. **Mostrando** *(opcional)* — Presente solo cuando el usuario muestra una imagen: enmarca la foto como algo que se le está mostrando en el momento, no un archivo adjunto
6. **Evento** *(opcional)* — Presente solo para eventos de sistema como un recordatorio disparado: el texto del disparo llega en un bloque `<event>` en vez de un turno de usuario
7. **Instrucciones** — Guía de comportamiento específica de etapa, formato de salida JSON

### Ganchos de progreso de turno

El bucle de envío (`companion-chat.ts`) reporta progreso a la superficie que lo aloja (app principal o superposición de escritorio) a través de una pequeña interfaz de ganchos. Además del indicador de escritura y la respuesta final, un gancho opcional `setPhase` narra lo que el turno está haciendo realmente: `remembering` mientras la recuperación de memoria construye el prompt, luego `seeing` (turnos con imagen) o `thinking` cuando empieza la llamada al modelo. La UI renderiza esto como una etiqueta shimmer en la burbuja de diálogo y la ventana de chat en vez de puntos de escritura anónimos. Las fases las impulsan las etapas reales del pipeline, nunca simuladas.

### Eventos de sistema y recordatorios

No todo turno empieza con el usuario. La compañera puede programar recordatorios y temporizadores, ya sea emitiendo una etiqueta `[reminder:5min]contenido[/reminder]` en su respuesta o desde frases naturales como «recuérdame en 10 minutos» vía un respaldo del lado del cliente. Los recordatorios persisten en la tabla `reminders`, se disparan desde un bucle de sondeo que sobrevive a recargas, y los temporizadores perdidos mientras la app estaba cerrada aparecen en el siguiente arranque.

Un recordatorio disparado se entrega como **evento de sistema**: el texto del disparo entra al prompt por la capa `<event>` en vez de un mensaje de usuario falso, y el turno deliberadamente se salta todo lo que fingiría que el usuario habló. Las heurísticas de sentimiento, las actualizaciones de estadísticas base, el conteo de rachas e interacciones, la extracción de datos y las comprobaciones de eventos se omiten todas; su respuesta se sigue analizando, hablando por TTS, y puede encadenar más recordatorios. Los turnos generados por máquina nunca pueden avanzar la relación ni reiniciar el reloj de ausencia.

### Ventana de contexto y presupuesto de memoria

Los ajustes del LLM exponen un deslizador de **Ventana de contexto** que indica a Luna cuántos tokens puede procesar el modelo seleccionado. Este valor se usa en tres sitios:

1. **Recuperación de memoria** — `retrieveRelevantContext` pide a la memoria de trabajo hasta el número presupuestado de turnos recientes. Sin ventana de contexto configurada recurre a 10 turnos; con una ventana grande configurada recupera hasta 20, así que el presupuesto mayor realmente se usa.

2. **Inyección de memoria** — El constructor de prompts inyecta solo el número presupuestado de turnos de conversación recientes y datos relevantes. Los modelos locales pequeños (1K–4K tokens) reciben una capa de memoria mínima para que el propio prompt de sistema no desborde la ventana. Los modelos más grandes reciben más turnos y datos hasta un techo razonable.

3. **Truncado del historial** — Antes de enviar una petición, los mensajes ensamblados se recortan para que el prompt de sistema más el historial de conversación más una pequeña reserva para la respuesta del modelo quepan dentro de la ventana configurada. El truncado siempre conserva el prompt de sistema y el mensaje más nuevo del usuario; el historial más viejo se descarta primero.

La reserva y el escalado son deliberadamente conservadores. Si el propio prompt de sistema es mayor que la ventana, Luna aún conserva el mensaje de usuario más nuevo y deja que el proveedor gestione el desbordamiento en vez de descartar silenciosamente el turno actual del usuario.

### Formato de salida del LLM

La compañera usa un modelo de **extracción de estado de dos caminos**, así que se mantiene fiable desde GPT-4o hasta un modelo local de 4B:

1. **Camino rápido en línea** — El modelo responde en personaje y termina con un bloque JSON de actualizaciones de estado. Los modelos capaces hacen esto en cada turno, así que no se necesita nada extra.

   ```json
   {
     "mood_change": { "emotion": "happy", "intensity_delta": 10 },
     "affection_delta": 5,
     "trust_delta": 2,
     "intimacy_delta": 3,
     "comfort_delta": 1,
     "respect_delta": 0,             // supported by parser, not in prompt template
     "new_memory": "User mentioned they like hiking",
     "new_inside_joke": "optional string (defined in schema but not mapped by parser)",
     "triggered_event": "optional_event_id"
   }
   ```

2. **Respaldo de extracción desacoplado** — Los modelos más pequeños y afinados para roleplay a menudo omiten o estropean ese bloque. Cuando falta el JSON en línea, una segunda llamada sin streaming re-deriva el estado del intercambio, restringida a JSON (`response_format: json_object` para proveedores compatibles con OpenAI; un prompt de sistema dedicado en `/messages` de Anthropic). Devuelve la misma forma incluidos los deltas de relación, así que la memoria y el movimiento de la relación aterrizan incluso cuando el modelo ignora el formato. Los modelos capaces nunca lo disparan — el bloque en línea ya es válido — así que no hay llamada extra en el camino rápido.

Ambos modos escriben recuerdos: el **Modo compañía** también emite `new_memory` (allí solo aplican ánimo/energía y memoria — los deltas de relación se ignoran), mientras que el **Modo simulador de citas** usa el conjunto completo.

### Análisis de respuestas y robustez

`response-parser.ts` normaliza la salida del modelo a la defensiva antes de aplicarla — esto es lo que hace utilizables a los modelos pequeños y locales:

- **Trazas de razonamiento eliminadas** — `<think>...</think>` (y un `</think>` suelto) de modelos estilo R1 se eliminan antes del análisis o la visualización, para que el borrador nunca se filtre a la burbuja de chat ni se confunda con el bloque de estado.
- **JSON tolerante** — se aceptan comas finales, comentarios `//` y `/* */`, y JSON desnudo (sin vallar); el analizador también extrae el objeto de estado de la prosa que lo rodea mediante un escaneo de llaves balanceadas.
- **Tokens de parada filtrados eliminados** — `</s>`, `<|im_end|>`, `<|eot_id|>`, `<end_of_turn>` y tokens de plantilla sueltos se eliminan, y la salida desbocada tras un marcador de fin de turno se descarta.
- **Turnos alucinados eliminados** — cuando un modelo sigue escribiendo como el usuario o un narrador (p. ej. `Nombre: «una nota en tercera persona»`), ese falso turno final se elimina del diálogo.
- **Normalización de emociones** — las emociones libres y compuestas (`"grateful|cared-for"`, `"excitement"`, `"nervous"`) se mapean al conjunto canónico; las genuinamente desconocidas se descartan en vez de adivinarlas.

Todos los deltas se acotan y las emociones están en lista blanca, así que una actualización malformada o exagerada no puede corromper el estado guardado.

## Motor de heurísticas

### Análisis de mensajes

Cada mensaje de usuario se analiza en busca de:
- **Sentimiento** — Positivo/negativo según coincidencia de palabras clave
- **Profundidad del tema** — Superficial, moderado o profundo
- **Contenido emocional** — Presencia de lenguaje emocional
- **Preguntas** — Si el mensaje pregunta algo

### Cálculos base

| Factor | Efecto |
|--------|--------|
| Sentimiento positivo | +2 afecto, +1 comodidad |
| Sentimiento negativo | -1 afecto, -1 comodidad |
| Tema profundo | +2 afecto, +2 intimidad, +1 confianza, -2 energía |
| Tema moderado | +1 afecto, +1 intimidad, -1 energía |
| Tema superficial | -1 comodidad |
| Contenido emocional | +2 intimidad, +1 confianza, +1 afecto |
| Preguntas hechas | +1 respeto, +1 confianza |
| Afecto no lineal | Rápido al principio (1.5x), normal en medio, lento al final (0.7x) |
| Aleatoriedad | Varianza de ±20% en los deltas de afecto y confianza |

### Fusión de estado

Cuando el LLM proporciona sugerencias JSON:
1. El cambio de ánimo del LLM anula completamente el ánimo base
2. El delta de afecto del LLM se acota a ±2x la magnitud base (tope mínimo de ±5)
3. El delta de confianza del LLM se acota a ±2x la magnitud base (tope mínimo de ±3)
4. Los deltas de intimidad/comodidad/respeto del LLM se acotan a [-3, 5]
5. El delta de energía siempre viene de las heurísticas (el LLM no puede cambiar la energía)
6. Las sugerencias de memoria y eventos pasan sin cambios

## Flujo de interacción

```
El usuario envía un mensaje
    |
[App] Calcula actualizaciones de estado base (heurísticas)
    |
[App] Recupera recuerdos relevantes
    |
[App] Construye el prompt con contexto
    |
[LLM] Genera la respuesta
    |
[App] Analiza respuesta + JSON
    |
[App] Fusiona sugerencias del LLM con la base
    |
[App] Aplica actualizaciones de estado
    |
[App] Comprueba transiciones de etapa
    |
[App] Comprueba disparadores de eventos
    |
[App] Si se disparó un evento, presenta la escena
    |
[App] Guarda el estado en IndexedDB
    |
[UI] Muestra la respuesta + dispara la animación
```

## Almacenamiento

Todos los datos se guardan del lado del cliente en el dispositivo del usuario usando IndexedDB vía Dexie.js.

### Esquema de la base de datos

```typescript
const db = new Dexie('luna-db');

// v2: Single character model (migrated from v1 multi-persona)
db.version(2).stores({
  characterStates: '++id, updatedAt',
  facts: '++id, category, importance, createdAt',
  sessions: '++id, startedAt',
  conversationTurns: '++id, sessionId, createdAt',
  completedEvents: '++id, eventId, completedAt',
  companion: null  // Delete legacy table
});

// v3: Added optional 384-dim embedding vectors to facts
db.version(3).stores({
  characterStates: '++id, updatedAt',
  facts: '++id, category, importance, createdAt',
  sessions: '++id, startedAt',
  conversationTurns: '++id, sessionId, createdAt',
  completedEvents: '++id, eventId, completedAt'
});

// v4: Reminders table for scheduled tasks and timers
// v5: Compound index [executed+triggerAt] for efficient due/upcoming queries
// v6: dismissed flag so fired reminders survive reloads until dismissed
db.version(6).stores({
  characterStates: '++id, updatedAt',
  facts: '++id, category, importance, createdAt',
  sessions: '++id, startedAt',
  conversationTurns: '++id, sessionId, createdAt',
  completedEvents: '++id, eventId, completedAt',
  reminders: '++id, sessionId, triggerAt, executed, dismissed, [executed+triggerAt]'
});
```

### Exportación/importación de datos

Los usuarios pueden exportar todos los datos como un archivo de guardado JSON. Los embeddings vectoriales se eliminan de las exportaciones (se regeneran al importar).

```typescript
interface SaveFile {
  version: string;      // "2.0"
  exportedAt: string;
  appVersion: string;
  data: {
    character: CharacterState;
    facts: Fact[];
    sessions: SessionSummary[];
    conversationTurns: ConversationTurn[];
    completedEvents: CompletedEventRecord[];
  };
}
```
