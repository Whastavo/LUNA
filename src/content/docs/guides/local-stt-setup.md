---
title: Configurar STT local
description: Ejecuta voz-a-texto por completo en tu máquina con un servidor Whisper compatible con OpenAI (Speaches, faster-whisper-server, whisper.cpp).
---

# Configurar STT local

Si ya ejecutas LLMs locales con Ollama o LM Studio y una voz local con TTS local, también puedes transcribir tu voz localmente. El audio se procesa en tu máquina, así que nada sale del dispositivo y no hay claves de API ni costes por minuto.

Luna habla con cualquier servidor que exponga el endpoint de OpenAI `/v1/audio/transcriptions`. Graba desde tu micrófono, envía el clip a ese endpoint y usa el texto devuelto como tu mensaje.

## Speaches (recomendado)

[Speaches](https://github.com/speaches-ai/speaches) (antes faster-whisper-server) sirve transcripción Whisper mediante la API de OpenAI y funciona bien en CPU.

### Instalación

El camino más rápido es Docker:

```bash
docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu
```

Si tienes una GPU NVIDIA, usa la imagen CUDA en su lugar. Consulta el README del proyecto para instalaciones sin Docker.

Esto sirve la API en `http://localhost:8000/v1`.

### Conectar con Luna

1. Abre **Ajustes** (icono de engranaje)
2. Ve a la pestaña **Personaje**
3. Abre **Servicios de IA** y desplázate hasta **Entrada de voz (STT)**
4. Bajo **Servidor local**, introduce la URL base — déjala como `http://localhost:8000/v1/` salvo que hayas cambiado el puerto
5. Pon el campo **Modelo** con un modelo que exponga tu servidor (p. ej. `Systran/faster-whisper-large-v3`)
6. Pulsa el botón del micrófono en la barra de chat y habla

Un servidor local configurado tiene prioridad automáticamente sobre Groq, OpenAI y la Web Speech API del navegador — no hay interruptor separado.

### Modelos

Speaches usa IDs de modelos de Hugging Face como `Systran/faster-whisper-large-v3` (mejor calidad) o `Systran/faster-whisper-medium` (más rápido). El servidor descarga el modelo en el primer uso. Comprueba los modelos que tiene tu servidor con `curl http://localhost:8000/v1/models`.

## faster-whisper-server y whisper.cpp

Cualquier servidor de transcripción compatible con OpenAI funciona. [whisper.cpp](https://github.com/ggerganov/whisper.cpp) incluye un servidor (`whisper-server`) que expone el mismo endpoint — apunta la URL base de STT local de Luna hacia él y usa el nombre de modelo que sirva. Las instalaciones antiguas de [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) se comportan como Speaches.

## URL base personalizada

¿Ejecutas el servidor en otra máquina o puerto? Introduce la URL completa en el campo de URL base de STT local. Luna la normaliza para que termine en `/v1`, así que `http://localhost:8000`, `http://localhost:8000/v1` y `http://localhost:8000/v1/` funcionan todos. Ejemplos:

- Puerto personalizado: `http://localhost:9000/v1/`
- Máquina remota: `http://192.168.1.50:8000/v1/` (solo app de escritorio, ver abajo)

## App de escritorio vs sitio web alojado

El STT local funciona mejor en la **app de escritorio**, donde no necesita configuración extra. La app de escritorio habla con tu servidor local directamente, sin restricciones de origen de navegador, contenido mixto ni red local.

En el **sitio web alojado** (`https://app.luna.ai`) aún puede funcionar, pero como una página HTTPS pública está alcanzando un servidor en tu propia máquina, el navegador añade algunas reglas:

- **Solo la misma máquina.** El servidor tiene que estar en `localhost` / `127.0.0.1`. Un servidor en otra máquina por `http://` simple queda bloqueado por el navegador como contenido mixto. (`localhost` está exento, que es la única razón por la que el caso local funciona.) Por eso la URL base de máquina remota de arriba funciona en la app de escritorio pero no en el sitio alojado.
- **El servidor debe permitir el origen del sitio.** Tu servidor STT necesita enviar cabeceras CORS que permitan `https://app.luna.ai`. Un servidor reforzado o tras proxy puede necesitar añadir el origen explícitamente. (En ese caso, el origen de la app de escritorio es `tauri://localhost` en macOS y `http://tauri.localhost` en Windows y Linux.)
- **Tu navegador puede pedir permiso.** Versiones recientes de Chrome tratan un sitio público alcanzando `localhost` como una petición de red local y puede pedirte permitirla. Permítelo si te lo pide.

Con un servidor por defecto, nada de esto aplica a la app de escritorio. El único caso que requiere atención es un servidor que hayas reforzado para restringir orígenes, que necesitaría permitir el origen de escritorio de arriba. Es el mismo conjunto de reglas que siguen los LLM locales y el TTS local en el sitio alojado.

## Solución de problemas

### «No se pudo conectar con un servidor STT local»

El servidor no está en ejecución o no se puede alcanzar en la URL base. Confirma que está arriba:

```bash
curl http://localhost:8000/v1/models
```

Si eso devuelve datos pero Luna aún no puede alcanzarlo desde un navegador, es casi seguro un bloqueo de origen o de red local. En el sitio alojado, el servidor tiene que permitir el origen `https://app.luna.ai`, y tu navegador puede pedir permiso para acceder a dispositivos de la red local. Consulta [App de escritorio vs sitio web alojado](#app-de-escritorio-vs-sitio-web-alojado). Nada de esto aplica a la **app de escritorio**, que es la forma más fluida de usar STT local.

### 400 o 404 del servidor

El nombre del modelo no es válido para ese servidor. Comprueba los modelos disponibles con `curl http://localhost:8000/v1/models` y pon el campo Modelo con uno de ellos.

### Sin transcripción después de hablar

Asegúrate de que tu micrófono está permitido para el sitio (aviso de permisos del navegador) y de que el campo Modelo está configurado. Observa el botón del micrófono — muestra un estado de transcripción después de dejar de hablar mientras el servidor procesa el clip.
