---
title: Solución de problemas
description: Problemas comunes y soluciones para Luna.
---

# Solución de problemas

Esta guía cubre los problemas comunes que puedes encontrar al usar Luna y cómo resolverlos.

## Problemas de versión de Node.js

### Error «Unsupported engine»

Luna requiere Node.js 22 o superior. Si ves un error como:

```bash
npm error engine Unsupported engine
npm error notsup Required: {"node":">=22.0.0"}
```

Necesitas actualizar tu versión de Node.js. Si usas nvm:

```bash
nvm install 22
nvm use 22
```

O con el `.nvmrc` del proyecto:

```bash
nvm use
```

### Comprobar tu versión de Node

```bash
node --version
```

Debería mostrar `v22.0.0` o superior.

## Configuración de claves de API

### Error «Clave de API no válida»

Esto suele significar que tu clave de API es incorrecta o ha expirado. Revisa:

1. Que la clave esté bien introducida (sin espacios extra)
2. Que la clave no haya sido revocada
3. Que uses la clave correcta para el proveedor (clave de OpenAI para OpenAI, etc.)

### La clave de API no se guarda

Todas las claves de API se guardan localmente en tu dispositivo. Si las claves no persisten:

1. Comprueba si estás en modo privado/incógnito (solo web — el incógnito puede limpiar el almacenamiento al cerrar)
2. Borra los datos del sitio y vuelve a introducir la clave
3. En la app de escritorio, prueba a reiniciar la aplicación

### Límites de peticiones

Si recibes errores de límite de peticiones, puede que necesites:

1. Esperar unos minutos antes de reintentar
2. Revisar el panel de uso de tu proveedor de API
3. Ampliar tu plan de API si hace falta

## Problemas del modelo VRM

### El modelo no carga

Si tu modelo VRM no carga:

1. **Revisa el tamaño del archivo** - Los modelos grandes (>50MB) pueden tardar más en cargar
2. **Verifica el formato** - Asegúrate de que es un archivo `.vrm` válido
3. **Prueba otro modelo** - Testa con un VRM distinto para aislar el problema
4. **Revisa la consola** - Abre DevTools (F12 en navegador o app de escritorio) y busca errores

### El modelo se muestra incorrectamente

Si el modelo aparece distorsionado o mal:

1. **Versión de VRM** - Algunos modelos VRM 0.x antiguos pueden tener problemas de compatibilidad
2. **Estructura de huesos** - Los modelos necesitan configuraciones de huesos estándar de VRM
3. **Materiales** - Algunos shaders personalizados pueden no renderizarse correctamente

### Las animaciones no se reproducen

Si la animación de reposo o las expresiones no funcionan:

1. **Espera la carga** - Las animaciones cargan después del modelo
2. **Revisa el soporte de VRMA** - Asegúrate de que tu modelo soporta animaciones VRM
3. **Recarga la página** - A veces un refresco arregla problemas de animación

### La página local carga pero la escena o los controles se quedan colgados

Si estás desarrollando localmente y la página `/app` renderiza pero el modelo nunca aparece, los controles no responden, o la consola muestra `Outdated Optimize Dep` o imports dinámicos fallidos, limpia las cachés locales de Vite y reinicia el servidor de desarrollo:

```bash
rm -rf node_modules/.vite .svelte-kit
pnpm exec svelte-kit sync
pnpm exec vite dev --force --host localhost --port 5173
```

Tras recargar la página, completa o descarta el modal de configuración inicial antes de probar los controles de Ajustes, Información o estadísticas. El modal de configuración se coloca deliberadamente sobre la escena hasta que la configuración termina.

## Problemas de texto-a-voz

### Sin salida de audio

Si el TTS no produce sonido:

1. **Revisa el audio** - Asegúrate de que la pestaña no está silenciada (web) o de que el audio del sistema está activado (escritorio)
2. **Verifica los permisos** - Tu navegador o SO puede necesitar conceder permiso de reproducción automática de audio
3. **Revisa la clave de API** - Verifica que tu clave de API de ElevenLabs u OpenAI TTS es válida
4. **Revisa el estado del proveedor** - El proveedor de TTS puede estar teniendo problemas

### El lip-sync no funciona

Si la boca del avatar no se mueve:

1. **El audio es necesario** - El lip-sync solo funciona cuando se reproduce audio del TTS
2. **Nivel de volumen** - Un audio muy bajo puede no activar el lip-sync
3. **Soporte del navegador** - La Web Audio API debe estar soportada

### La voz suena mal

1. **Revisa los ajustes de voz** - ElevenLabs y OpenAI TTS tienen voces disponibles distintas
2. **ID de voz personalizado** - Si usas una voz personalizada de ElevenLabs, verifica que el ID de voz es correcto

### El TTS local no habla

Si seleccionaste **TTS local** pero no oyes nada:

1. **Servidor en marcha** - Confirma que tu servidor TTS está arriba, p. ej. `curl http://localhost:8880/v1/audio/voices`
2. **Voz configurada** - El campo de voz debe contener un nombre que tu servidor conozca (p. ej. `af_bella` para Kokoro)
3. **URL base** - Debe apuntar al `/v1` del servidor; Luna normaliza la barra final por ti
4. **App de escritorio** - Solo necesita el servidor en marcha en `localhost`; no se requiere configuración de origen ni CORS
5. **Sitio alojado** (`https://app.luna.ai`) - El servidor debe estar en `localhost` (uno en otra máquina queda bloqueado como contenido mixto), debe permitir el origen `app.luna.ai` (Kokoro-FastAPI lo hace por defecto), y tu navegador puede pedir permiso para acceder a la red local. Permítelo si te lo pide

Consulta [Configurar TTS local](/docs/guides/local-tts-setup#app-de-escritorio-vs-sitio-web-alojado) para los detalles de sitio alojado vs escritorio.

## Problemas de entrada de voz

### El botón del micrófono no responde (escritorio)

La app de escritorio usa el webview de Tauri, que no soporta la Web Speech API del navegador. Configura un servidor Whisper local o Groq para la entrada de voz en escritorio:

1. Ve a **Ajustes > Personaje**
2. Bajo **Entrada de voz (STT)**, apunta el STT local a la URL base de tu servidor Whisper (por defecto `http://localhost:8000/v1/`) o introduce tu clave de API de Groq

### El botón del micrófono no responde (web)

Si el botón del micrófono muestra un error en el navegador:

1. **Revisa el soporte del navegador** - La Web Speech API funciona en Chrome, Edge y Safari. Firefox tiene soporte limitado.
2. **Permite el acceso al micrófono** - Tu navegador puede estar bloqueando el permiso del micrófono.
3. **Usa un servidor Whisper local o Groq** - Para mejor calidad o un soporte de navegadores más amplio, configura el STT local (un servidor Whisper auto-alojado compatible con OpenAI) o añade una clave de API de Groq en **Ajustes > Personaje** bajo Entrada de voz (STT). Un servidor local configurado tiene la máxima prioridad, luego Groq, luego OpenAI, luego la Web Speech API.

### «Acceso al micrófono denegado»

Tu navegador o SO está bloqueando el acceso al micrófono:

1. **Permisos del navegador** - Pulsa el icono del candado en la barra de direcciones y permite el acceso al micrófono
2. **Permisos del sistema** - En macOS, ve a Ajustes del Sistema > Privacidad y seguridad > Micrófono y activa el acceso para tu navegador o para Luna

## App de escritorio

### La app no abre

La app de escritorio está en beta y actualmente **sin firmar**, así que tu SO avisa la primera vez que la abres. Es lo esperado, no una descarga corrupta.

1. **macOS** - Clic derecho en la app → **Abrir** → **Abrir**, o ejecuta `xattr -dr com.apple.quarantine /Applications/Luna.app` una vez
2. **Windows** - En el aviso de SmartScreen, pulsa **Más información** → **Ejecutar de todos modos**
3. **Linux** - Da al AppImage el bit de ejecución: `chmod +x Luna.AppImage`

Consulta la [Guía de escritorio](/docs/guides/desktop-guide) para el recorrido completo de instalación.

### El LLM o TTS local no conecta (escritorio)

En la app de escritorio, la mayoría de los proveedores locales solo necesitan que el servidor esté en marcha. La única excepción es **Ollama en Windows y Linux**: el origen de la app de escritorio es `http://tauri.localhost`, que Ollama no permite por defecto, así que rechaza cada petición con un `403`. macOS funciona de fábrica, y LM Studio y los servidores locales comunes de TTS/STT (Kokoro-FastAPI, openedai-speech) permiten todos los orígenes por defecto.

1. **Ollama (macOS)** - Arráncalo con `ollama serve` y descarga un modelo (`ollama pull <modelo>`)
2. **Ollama (Windows/Linux)** - Lo mismo, más permitir el origen de la app: `setx OLLAMA_ORIGINS "http://tauri.localhost"` en Windows (y luego reinicia Ollama desde la bandeja), o `OLLAMA_ORIGINS=http://tauri.localhost ollama serve` en Linux. Pasos completos: [Configurar LLM local](/docs/guides/local-llm-setup#permitir-que-luna-llegue-a-ollama)
3. **LM Studio** - Carga un modelo y pulsa Start Server
4. **TTS local** - Arranca tu servidor TTS (p. ej. Kokoro-FastAPI en `http://localhost:8880`)
5. **URL base** - Confirma que el puerto en **Ajustes > Personaje** coincide con el puerto que usa tu servidor

### Sin sonido (escritorio)

1. **Audio del sistema** - Revisa el volumen de tu SO y que Luna no esté silenciada en el mezclador del sistema
2. **TTS configurado** - Confirma que hay un proveedor de TTS configurado y una voz seleccionada (ver Problemas de texto-a-voz arriba)
3. **Micrófono/entrada de voz** - El webview de escritorio no tiene Web Speech API, así que el micrófono necesita una clave de Groq u OpenAI; ver [El botón del micrófono no responde (escritorio)](#el-botón-del-micrófono-no-responde-escritorio)

### Las actualizaciones no se instalan

Las actualizaciones automáticas funcionan para el `.dmg` de macOS, el `.exe` de Windows y el `.AppImage` de Linux. Si instalaste vía `.deb` o `.rpm`, actualiza con tu gestor de paquetes en su lugar. Reiniciar la app vuelve a buscar actualizaciones.

## Memoria y rendimiento

### La app va lenta

Los problemas de rendimiento pueden venir de:

1. **Modelo de memoria semántica** - El modelo de embeddings (~23MB) carga en el primer uso
2. **Historial de conversación grande** - Las sesiones largas acumulan datos
3. **Tamaño del modelo VRM** - Los modelos complejos usan más recursos de GPU

Soluciones:

1. Dale tiempo al modelo de embeddings para cargar al principio
2. Limpia las sesiones antiguas en Ajustes > Datos
3. Usa modelos VRM más simples si el rendimiento es un problema

### Errores de almacenamiento

Si ves errores de IndexedDB o de almacenamiento:

1. **Revisa el espacio disponible** - El almacenamiento de tu dispositivo puede estar lleno
2. **Borra los datos del sitio** - Reinicia el almacenamiento de la app (web: borra los datos del sitio, escritorio: reinstala)
3. **Desactiva el modo privado** - Algunas funciones de almacenamiento no funcionan en incógnito (solo web)

### El uso de memoria es alto

La app usa memoria para:

1. El renderizado 3D de Three.js
2. La geometría y texturas del modelo VRM
3. El historial de conversación
4. El modelo de embeddings para búsqueda semántica

Si la memoria es una preocupación, refresca la página periódicamente para limpiar los datos acumulados.

## Errores comunes

### Errores «Failed to fetch»

Suelen indicar problemas de red:

1. **Revisa la conexión a internet**
2. **Verifica el endpoint de API** - Algunos proveedores pueden estar caídos
3. **Problemas de CORS** - Si auto-alojas, revisa la configuración de CORS
4. **Cortafuegos/proxy** - Las redes corporativas pueden bloquear llamadas de API

Para LLMs locales, el navegador se conecta directamente a tu servidor local:

1. **Ollama en marcha** - Arráncalo con `ollama serve`
2. **LM Studio en marcha** - Carga un modelo y pulsa Start Server
3. **URL base correcta** - Usa `http://localhost:11434` para Ollama o `http://localhost:1234/v1` para LM Studio
4. **Origen de Ollama (CORS)** - Ollama rechaza los orígenes que no permite con un `403` en `/api/tags`. En el **sitio web alojado** (la app corre en `app.luna.ai`) permite ese origen: `OLLAMA_ORIGINS=https://app.luna.ai ollama serve` (para una vista previa de Vercel usa el origen exacto de la barra de direcciones). En la **app de escritorio de Windows o Linux** permite `OLLAMA_ORIGINS=http://tauri.localhost`; la app de escritorio de macOS no necesita nada. Pasos completos por plataforma: [Configurar LLM local](/docs/guides/local-llm-setup#permitir-que-luna-llegue-a-ollama). Contexto: [FAQ de orígenes web adicionales de Ollama](https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama).
5. **Modelo instalado** - Si ves `model not found`, ejecuta `ollama list`, descarga o carga un modelo, actualiza el desplegable y selecciona un modelo instalado

### «Página no encontrada» tras el despliegue

Si las rutas funcionan localmente pero no en producción:

1. **Revisa los ajustes del adaptador** - Asegúrate de que el adaptador de SvelteKit está bien configurado
2. **Verifica la salida de build** - Revisa los registros de despliegue
3. **Sensibilidad a mayúsculas** - Algunos hosts distinguen mayúsculas en las rutas de archivos

### La consola muestra «Cannot read property of undefined»

Esto suele significar que algo cargó fuera de orden:

1. **Refresca la página**
2. **Limpia la caché** - Refresco fuerte (Ctrl+Shift+R) en web, o reinicia la app de escritorio
3. **Busca actualizaciones** - Trae el código más reciente si auto-alojas, o reinicia la app de escritorio

## Más ayuda

Si tu problema no está cubierto aquí:

1. Revisa los [GitHub Issues](https://github.com/JuiceBoxxGames/luna/issues) por problemas similares
2. Abre un issue nuevo con:
   - Versión de la app (web o escritorio) y navegador si es web
   - Pasos para reproducirlo
   - Cualquier error de consola
   - Capturas de pantalla si son relevantes
