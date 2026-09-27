---
title: Configurar OmniVoice
description: Ejecuta el modelo texto-a-voz OmniVoice localmente para una voz completamente fuera de línea y multilenguaje.
---

# Configurar OmniVoice

[OmniVoice](https://github.com/k2-fsa/OmniVoice) es un modelo local de texto-a-voz que funciona por completo en tu propio hardware. Soporta una gran cantidad de idiomas, genera audio rápidamente en una GPU moderna y no necesita clave de API en la nube. Luna habla con OmniVoice a través de un pequeño proxy compatible con OpenAI que se incluye en este repositorio.

## Lo que necesitas

- **Docker** y Docker Compose (o un runtime de contenedores compatible) instalados en tu máquina.
- Linux es recomendable; el proxy se compila y prueba ahí.
- Una GPU NVIDIA con CUDA 12 para inferencia rápida, o una CPU moderna para inferencia por CPU más lenta.
- `nvidia-container-toolkit` si quieres aceleración por GPU dentro del contenedor.
- Acceso a internet en el primer arranque para descargar el modelo `k2-fsa/OmniVoice` desde HuggingFace.

OmniVoice también puede instalarse y ejecutarse fuera de Docker con Python 3.11 y sus dependencias nativas. Esta guía se centra en el camino con Docker porque es la forma más fácil de conseguir un entorno reproducible.

## Arrancar el proxy

El código del proxy vive en `tools/omnivoice` e incluye un archivo Docker Compose listo para usar:

```bash
cd tools/omnivoice
docker compose up -d
```

El primer arranque descarga el modelo desde HuggingFace, lo que puede tardar varios minutos según tu conexión. Espera hasta que el endpoint de salud devuelva `ok`:

```bash
curl http://localhost:8881/health
# {"status":"ok"}
```

Si la descarga del modelo es lenta o te topas con límites de peticiones, configura una variable de entorno `HF_TOKEN` para HuggingFace antes de arrancar el contenedor.

## Conectar Luna

1. Arranca el proxy.
2. Abre Luna y ve a **Ajustes > Voz (TTS)**.
3. Activa **Voz** y selecciona **OmniVoice**.
4. Configura la URL base. El archivo compose publica el proxy en todas las interfaces por defecto, así que usa:
   - `http://localhost:8881/v1/` desde la misma máquina
   - `http://<ip-del-host>:8881/v1/` desde otro dispositivo o desde el contenedor de desarrollo de Luna
5. Elige una voz, un idioma y una velocidad, y envía un mensaje.

El proxy envía cabeceras CORS permisivas, así que un sitio alojado puede alcanzarlo mientras el navegador permita la petición.

## Configurar tu voz

Después de seleccionar OmniVoice en **Ajustes > Voz (TTS)**:

- **Idioma**: idioma principal para la síntesis. OmniVoice soporta muchos idiomas; elige el que tu compañera hable la mayor parte del tiempo.
- **Voz predefinida**: una de las voces integradas de OmniVoice (por ejemplo `alloy`, `onyx` o `nova`). Cada predefinición tiene un perfil fijo de género/edad/tono/acento que Luna convierte en una cadena de instrucciones para el modelo.
- **Modo**: alterna entre **Sintético** (voces integradas/predefinidas) y **Clonado** (tus propias voces clonadas).
- **Regenerar**: solo disponible para voces sintéticas. Borra el perfil persistente en caché de la predefinición actual y crea uno nuevo con las mismas instrucciones. Úsalo para limpiar un perfil corrupto o para conseguir un color de voz ligeramente distinto con la misma predefinición. Como las voces clonadas no usan perfiles en caché, el botón está deshabilitado en modo clonado.
- **Probar**: reproduce una frase de prueba corta en el idioma seleccionado para que verifiques la voz antes de chatear.

### Ajustes avanzados

La tarjeta de voz principal lleva sus propios parámetros de síntesis:

- **Velocidad**: velocidad de reproducción del audio generado.
- **Num Step**: pasos de difusión. Valores más altos pueden mejorar la calidad a costa de una generación más lenta.
- **Temperatura de posición** / **Temperatura de clase**: temperaturas de muestreo para el tokenizador de audio. Déjalas en los valores por defecto salvo que quieras experimentar con variaciones de pronunciación.

La tarjeta de **Voz alternativa** tiene los mismos cuatro parámetros con el prefijo **Alt**; los valores sin configurar recurren a los ajustes de la voz principal.

Como OmniVoice es un modelo de difusión, el color exacto del hablante puede variar ligeramente entre frases incluso con la misma predefinición. Los perfiles persistentes de predefinición mantienen pequeña la variación; las voces clonadas tienden a sonar más estables que las predefiniciones sintéticas.

### Idioma y voz alternativos

Activa **Voz alternativa** para dar a las palabras extranjeras su propia voz. Está pensado para el aprendizaje de idiomas: cuando la compañera explica una palabra extranjera, la palabra misma se pronuncia en su propio idioma y dialecto, mientras la explicación que la rodea se queda en la voz principal.

- **Interruptor de activación**: enciende el interruptor. Sin él, todo se pronuncia con la voz principal (las palabras extranjeras siguen recibiendo el dialecto correcto, pero sin cambio de voz).
- **Idioma**: el idioma extranjero (por ejemplo `en`). El idioma principal queda excluido aquí; ambos deben ser distintos.
- **Voz predefinida / Modo**: las mismas opciones que la voz principal — predefiniciones sintéticas o una de tus voces clonadas.
- **Velocidad Alt / Num Step Alt / Temperaturas Alt**: parámetros de síntesis opcionales para la voz alternativa. Cada uno recurre al valor de la voz principal cuando no está configurado.
- **Probar voz alternativa**: reproduce una frase de prueba corta en el idioma alternativo para que verifiques la voz antes de chatear.
- **Precalentado de perfil**: cuando activas la voz alternativa, Luna pre-genera en segundo plano el perfil persistente para ese idioma, así que la primera palabra extranjera de un chat no se retrasa por la generación de perfil a demanda.

El interruptor es por palabra: con modelos capaces de usar herramientas, Luna entrega al LLM herramientas nativas de habla (de lo contrario usa la sintaxis `speak({...})`), y cada cambio de idioma se convierte en su propio segmento — una respuesta como «Das spanische Wort für Auto ist **el coche**.» reproduce la parte alemana con la voz principal y «el coche» con la voz alternativa. Las etiquetas de idioma regional del modelo (`es-ES`) siguen coincidiendo con el idioma configurado, y los idiomas escritos en alfabetos no latinos (japonés, coreano, chino, ruso, árabe, tailandés…) se detectan por su escritura cuando el modelo omite el marcado explícito.

### Function Calling (soporte de herramientas)

Cuando la voz alternativa está activada, Luna puede usar opcionalmente **function calling** del LLM para forzar un código de idioma en cada segmento de habla. Es más fiable que pedirle al LLM que escriba la sintaxis `speak({...})`, porque el campo de idioma es obligatorio por el esquema y no se puede olvidar. El interruptor **Forzar idioma por segmento** en los ajustes controla esto:

- **Activado** (por defecto): el LLM recibe una herramienta `speak_segment` con `language` como campo enum obligatorio. Cada segmento de habla debe especificar su idioma. Soportado por OpenAI, OpenRouter, DeepSeek y la mayoría de proveedores modernos.
- **Desactivado**: recurre a la sintaxis de texto `speak({...})`. Úsalo si tu proveedor de LLM no soporta function calling o rechaza parámetros desconocidos.

El icono ⓘ muestra la ayuda: *Más fiable; necesita soporte de herramientas del LLM*.

**Limitación conocida (orden de salida mixto):** cuando el function calling está activado, Luna transmite los deltas de texto inmediatamente pero entrega las llamadas de herramientas en una pasada separada al final de la respuesta. Esto funciona correctamente cuando un modelo responde *o* con llamadas de herramientas *o* con texto — que es el comportamiento normal de las APIs compatibles con OpenAI (`finish_reason: "tool_calls"` vs. `"stop"`). Si un modelo emitiese una respuesta **mixta** que intercale texto y llamadas de herramientas, el orden del habla podría no coincidir con la secuencia prevista. Es un caso límite aceptado; si observas habla fuera de orden, desactiva **Forzar idioma por segmento** para volver a la sintaxis en línea `speak({...})`.

### Detección y validación de idioma

Luna valida el idioma declarado de cada segmento contra el texto real usando **ELD** (Efficient Language Detector, [nitotm/eld](https://github.com/nitotm/efficient-language-detector)). Si el idioma detectado difiere del declarado (p. ej. el LLM etiquetó texto español como alemán), el segmento recurre a la voz principal. Esto detecta comportamientos inconsistentes del LLM sin depender solo del modelo.

La validación solo considera los dos idiomas activos (principal y alternativo), lo que la hace muy precisa incluso con palabras sueltas. Las palabras funcionales comunes (`el la un una por para` para el español, `der die das ein` para el alemán) se usan como heurística secundaria cuando el texto carece de diacríticos característicos.

### Streaming y habla expresiva

Las respuestas de OmniVoice empiezan a hablarse mientras el modelo sigue escribiendo: las frases completas se sintetizan en cuanto llegan, y el texto largo se divide en límites de frase. El lip-sync sigue el audio real.

Para el habla expresiva, el modelo puede insertar marcadores no verbales en el texto hablado — p. ej. `[laughter]`, `[sigh]`, `[question-oh]`, `[surprise-wa]`. Estos se renderizan como audio (en ambas voces) y se eliminan automáticamente de la burbuja de chat visible.

Limitaciones conocidas: las palabras extranjeras muy cortas se pronuncian como segmentos individuales, así que puede haber pausas diminutas entre ellas; los marcadores `pause()`/`gesture()` dentro de una respuesta en streaming no se ejecutan (solo se respetan en la reproducción sin streaming). Como el modelo de difusión puede devolver audio vacío para entradas extranjeras muy cortas, Luna capitaliza la palabra y añade un punto final (`"ir"` → `"Ir."`) y desactiva la eliminación de silencios integrada del modelo. Una escala de guidance más alta (`guidance_scale=6`) se aplica a los segmentos extranjeros para mejorar la estabilidad de la pronunciación. Los fragmentos del idioma principal son estables y no se tocan; las comillas alrededor de palabras nunca llegan al sintetizador, ya que OmniVoice las renderiza como silencio.

Si sílabas o palabras enteras se tragan ocasionalmente, la causa es el propio modelo de difusión, no el cambio de idioma: OmniVoice muestrea el audio en varios pasos en vez de renderizarlo de forma determinista desde el texto, y con entradas cortas o inusuales ese muestreo puede degenerar — se pierden teléfonos o el segmento vuelve casi silencioso. Luna ya aplica las mitigaciones automáticas de arriba (expansión de frase como `"ir"` → `"Ir."`, escala de guidance elevada, eliminación de silencios desactivada, y reglas de prompt que prohíben al LLM enviar palabras sueltas). Las palancas restantes están en los ajustes de voz: sube **Num Step** (más pasos de difusión → salida más estable), baja la **Temperatura de posición/clase** (menos varianza de muestreo), prefiere una voz predefinida sintética sobre un clon de voz nuevo para los segmentos extranjeros (los clones transfieren mal a otros idiomas) y evita segmentos extranjeros muy cortos — una frase de dos palabras sobrevive a la difusión notablemente mejor que una palabra sola.

> **Nota beta:** cualquier idioma que ofrezca el proxy puede seleccionarse como idioma alternativo, pero la función multilenguaje solo está completamente madura para **DE, ES, EN**. Otros idiomas funcionan — la detección de segmentos completos, los diacríticos y las comprobaciones de escritura siguen aplicando — pero las heurísticas dependientes del idioma (detección de palabras funcionales, interacción con clones de voz) están menos maduras. El interruptor **Forzar idioma por segmento** requiere un LLM con soporte de function calling; desactívalo para modelos que rechacen parámetros desconocidos.

### Cuando el modelo olvida etiquetar

El cambio de idioma depende de que el LLM marque las palabras extranjeras con un idioma. Con el function calling activado esto lo impone el esquema; de lo contrario, Luna confía en la sintaxis `speak({ lang: ... })`. Algunos modelos aún etiquetan de forma inconsistente — por ejemplo metiendo «el gato» dentro de una frase alemana en vez de darle su propia llamada. Luna corrige lo que se puede probar de forma determinista mediante la validación ELD (diacríticos, escrituras y palabras funcionales), pero una palabra extranjera sin marcar y sin ningún rasgo distintivo no se puede detectar con seguridad y se queda en la voz principal.

Si te pasa a menudo, la palanca es el modelo, no los ajustes de voz:

- **Baja la temperatura del LLM** (hacia 0.2–0.4). La disciplina de formato mejora notablemente a temperaturas más bajas; la creatividad de las frases solo sufre ligeramente en un caso de uso docente.
- **Cambia a un modelo con mejor seguimiento de instrucciones.** Criterios que importan aquí: adhesión fiable a formatos de salida estructurados (el modelo no debería eliminar ni estropear la sintaxis `speak({...})`), soporte explícito de tool-calling o modo JSON, y un entrenamiento multilingüe sólido. Los modelos pequeños destilados tienden a saltarse el etiquetado justo cuando la frase se complica (variantes lado a lado, tablas de conjugación); si ves etiquetas faltantes sobre todo en respuestas docentes largas, el modelo suele ser el cuello de botella.

### Voces clonadas

Usa **Clonar voz nueva** para subir una muestra de audio de 3–10 segundos y el texto de referencia correspondiente. El proxy crea un clon de voz que luego puedes seleccionar en la lista de **Voces clonadas**. Borra un clon con el botón **Eliminar** junto a la voz seleccionada.

## Alcanzar el proxy desde otra máquina

El proxy no tiene autenticación por defecto y ahora acepta subidas y borrados de voces, así que el archivo compose lo ata a loopback. Para alcanzarlo desde el contenedor de desarrollo de Luna u otro dispositivo, cambia el mapeo de puertos en `tools/omnivoice/docker-compose.yaml`:

```yaml
ports:
  - "8881:8881" # todas las interfaces
```

Expón el proxy solo a tu LAN en una red de confianza, y configura `OMNIVOICE_AUTH_TOKEN` cuando lo hagas; introduce el mismo token como clave de API en los ajustes de OmniVoice de Luna. Cualquiera que alcance un puerto sin autenticar puede usar tu GPU, subir audio de referencia y borrar voces clonadas. Lo mismo aplica al ejecutarlo fuera de Docker con `--host 0.0.0.0`; por defecto ahí es `127.0.0.1`.

Una vez expuesto, usa `http://<ip-de-tu-máquina>:8881/v1/` como URL base (por ejemplo `http://192.168.1.42:8881/v1/`).

### Actualizar el proxy tras cambios de código

Cuando el código del proxy cambia (por ejemplo tras un `git pull`), recompila y reinicia el contenedor para que el código nuevo se copie a la imagen:

```bash
cd tools/omnivoice
docker compose down
docker compose up -d --build
```

## Modo solo CPU

Si no tienes GPU NVIDIA ni `nvidia-container-toolkit`, usa el archivo compose de CPU:

```bash
cd tools/omnivoice
docker compose -f docker-compose.cpu.yaml up -d
```

La síntesis por CPU es más lenta, sobre todo en la primera carga, pero no requiere GPU.

## Ejecutar sin Docker

También puedes ejecutar el proxy directamente con Python 3.11:

```bash
pip install -r tools/omnivoice/requirements.txt
python tools/omnivoice/omnivoice-proxy.py --device cpu
```

Consulta el [repositorio de OmniVoice](https://github.com/k2-fsa/OmniVoice) para la configuración del modelo subyacente y los requisitos sin Docker.

## Probar el proxy

Arranca el proxy y ejecuta la prueba de integración:

```bash
python tools/omnivoice/test-omnivoice.py
```

Comprueba `/health`, `/v1/models`, `/v1/voices` y sintetiza un clip corto sin reproducir audio.

## Solución de problemas

### El contenedor se reinicia o `CONNECTION_REFUSED`

Revisa los registros:

```bash
docker logs omnivoice-proxy --tail 50
```

Las causas comunes son un import `Depends` faltante de `fastapi` (corregido en el proxy incluido), un conflicto de puertos, o que el modelo aún se esté descargando. Espera a que el endpoint de salud devuelva `ok` antes de probar desde Luna.

### `RuntimeError: CUDA out of memory`

Cierra otras aplicaciones que usen la GPU, reduce `--max-concurrent` a `1`, o ejecuta con `--device cpu`.

### El proxy está sano pero Luna no puede alcanzarlo

- Confirma que estás usando `localhost` o `127.0.0.1`. El proxy está atado a loopback por defecto, así que una IP de red no lo alcanzará hasta que cambies el mapeo de puertos. Consulta [Alcanzar el proxy desde otra máquina](#alcanzar-el-proxy-desde-otra-máquina).
- Si usas la app web alojada, el navegador puede pedir permiso para acceder a dispositivos de la red local; permítelo.
- Si ejecutas Luna en el contenedor de desarrollo de Docker, recuerda que `localhost` dentro del contenedor no es la máquina anfitriona. Necesitas la IP del host, lo que implica exponer el puerto como se describió arriba.

## Ver también

- [Configurar TTS local](/docs/guides/local-tts-setup) para Kokoro-FastAPI y openedai-speech.
- [Repositorio de OmniVoice](https://github.com/k2-fsa/OmniVoice)
