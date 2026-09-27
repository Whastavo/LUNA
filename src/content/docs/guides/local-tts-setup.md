---
title: Configurar TTS local
description: Dale a tu compañera una voz que funciona por completo en tu máquina usando Kokoro-FastAPI o openedai-speech.
---

# Configurar TTS local

Si ya ejecutas LLMs locales con Ollama o LM Studio, también puedes darle a tu compañera una voz local. El audio se genera en tu máquina, así que nada sale del dispositivo y no hay claves de API ni costes por carácter.

Luna habla con cualquier servidor TTS que exponga el endpoint de OpenAI `/v1/audio/speech`. Los dos que recomendamos son **Kokoro-FastAPI** y **openedai-speech**. El lip-sync funciona automáticamente porque Luna anima la boca a partir del propio audio, sin datos extra.

Para una voz totalmente local y multilenguaje que no necesita API externa, consulta la guía de [Configurar OmniVoice](/docs/guides/omnivoice). El resto de esta página cubre servidores TTS locales genéricos compatibles con OpenAI.

## Kokoro-FastAPI (recomendado)

[Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) envuelve el modelo de voz Kokoro y sirve la API de voz de OpenAI directamente. Es rápido en CPU y suena muy bien para su tamaño.

### Instalación

El camino más rápido es Docker:

```bash
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

Si tienes una GPU NVIDIA, usa la imagen `kokoro-fastapi-gpu` en su lugar. Consulta el README del proyecto para instalaciones sin Docker.

Esto sirve la API en `http://localhost:8880/v1`.

### Conectar con Luna

1. Abre el panel de **Controles** (icono de deslizadores, arriba a la derecha) y pulsa **Ajustes** (engranaje)
2. Ve a la pestaña **Personaje** y abre la sección de **Servicios de IA**
3. Activa el interruptor de **Voz (TTS)**, luego selecciona **TTS local** en el desplegable de proveedores
4. Deja la URL base como `http://localhost:8880/v1/` salvo que hayas cambiado el puerto
5. Elige una **voz** (empieza a escribir en el campo de voz para ver sugerencias como `af_bella`)
6. Deja **Modelo** en blanco para usar el predeterminado, o ponlo en `kokoro`
7. Envía un mensaje y tu compañera habla

### Voces

Los nombres de voz de Kokoro codifican región y género, por ejemplo `af_bella` (mujer estadounidense) o `bm_george` (hombre británico). Luna pre-carga algunas voces comunes en el campo de voz, y puedes escribir cualquier voz que tu servidor soporte.

## openedai-speech

[openedai-speech](https://github.com/matatonic/openedai-speech) es otro servidor compatible con OpenAI que puede ejecutar Piper y otros motores. Configura su servidor y apunta la URL base de TTS local de Luna hacia él (por defecto `http://localhost:8000/v1/`). Usa los nombres de voz que expone ese servidor.

## URL base personalizada

¿Ejecutas el servidor en otra máquina o puerto? Introduce la URL completa en el campo de URL base de TTS local. Luna la normaliza para que termine en `/v1/`, así que `http://localhost:8880`, `http://localhost:8880/v1` y `http://localhost:8880/v1/` funcionan todos. Ejemplos:

- Puerto personalizado: `http://localhost:9000/v1/`
- Máquina remota: `http://192.168.1.50:8880/v1/` (solo app de escritorio, ver abajo)

## App de escritorio vs sitio web alojado

El TTS local funciona mejor en la **app de escritorio**, donde no necesita configuración extra. La app de escritorio habla con tu servidor local directamente, sin restricciones de origen de navegador, contenido mixto ni red local. Si quieres la experiencia más fluida, usa la app de escritorio.

En el **sitio web alojado** (`https://app.luna.ai`) aún puede funcionar, pero como una página HTTPS pública está alcanzando un servidor en tu propia máquina, el navegador añade algunas reglas:

- **Solo la misma máquina.** El servidor tiene que estar en `localhost` / `127.0.0.1`. Un servidor TTS en otra máquina por `http://` simple queda bloqueado por el navegador como contenido mixto. (`localhost` está exento de ese bloqueo, que es la única razón por la que el caso local funciona.) Por eso la URL base de máquina remota de arriba funciona en la app de escritorio pero no en el sitio alojado.
- **El servidor debe permitir el origen del sitio.** Tu servidor TTS necesita enviar cabeceras CORS que permitan `https://app.luna.ai`. Kokoro-FastAPI y openedai-speech permiten todos los orígenes por defecto, así que esto normalmente funciona sin más; un servidor reforzado o tras proxy puede necesitar añadir el origen explícitamente. (En ese caso, el origen de la app de escritorio es `tauri://localhost` en macOS y `http://tauri.localhost` en Windows y Linux.)
- **Tu navegador puede pedir permiso.** Versiones recientes de Chrome tratan un sitio público alcanzando `localhost` como una petición de red local y puede pedirte permitirla (o requerir que el servidor lo permita). Permítelo si te lo pide.

Con los servidores por defecto, nada de esto aplica a la app de escritorio. El único caso que requiere atención es un servidor que hayas reforzado para restringir orígenes, que necesitaría permitir el origen de escritorio de arriba. Es el mismo conjunto de reglas que siguen los LLM locales (Ollama, LM Studio) en el sitio alojado.

## Solución de problemas

### Sin sonido y sin error

Asegúrate de que el módulo de **Voz (TTS)** está activado y de que hay una voz configurada. Si el campo de voz está vacío, escribe una voz válida para tu servidor (p. ej. `af_bella` para Kokoro).

### «No se pudo conectar con un servidor TTS local»

El servidor no está en ejecución o no se puede alcanzar en la URL base. Confirma que está arriba:

```bash
curl http://localhost:8880/v1/audio/voices
```

Si eso devuelve datos pero Luna aún no puede alcanzarlo desde un navegador, es casi seguro un bloqueo de origen o de red local. En el sitio alojado, el servidor tiene que permitir el origen `https://app.luna.ai` (Kokoro-FastAPI permite todos los orígenes por defecto; un servidor tras proxy o reforzado puede necesitar añadirlo), y tu navegador puede pedir permiso para acceder a dispositivos de la red local. Consulta [App de escritorio vs sitio web alojado](#app-de-escritorio-vs-sitio-web-alojado) para la lista completa. Nada de esto aplica a la **app de escritorio**, que es la forma más fluida de usar TTS local.

### «El servidor TTS local devolvió 400/404»

El modelo o la voz no son válidos para ese servidor. Deja el modelo en blanco (Luna envía `tts-1`, que la mayoría de los servidores aceptan) y revisa el nombre de la voz contra la lista de voces de tu servidor.

### Voz entrecortada o con retardo

El TTS local genera el clip completo antes de reproducirlo. En hardware más lento, prueba una build optimizada para CPU o una imagen de GPU, y mantén las respuestas más cortas.
