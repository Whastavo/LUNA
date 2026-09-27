---
title: Guía web
description: Cómo configurar y usar Luna en la web.
---

# Guía web

Esta guía te acompaña en el uso de Luna, ya sea en la versión alojada en [luna.ai](https://luna.ai) o en una instancia auto-alojada.

## Auto-alojamiento

### Requisitos previos

- Node.js 22 o superior
- pnpm
- Un navegador moderno (Chrome, Firefox, Safari, Edge)

### Instalación

```bash
git clone https://github.com/JuiceBoxxGames/luna.git
cd luna
pnpm install
pnpm dev
```

La app estará disponible en `http://localhost:5173`.

## Configuración inicial

### 1. Configurar un proveedor de LLM

Tu compañera necesita un LLM para generar respuestas.

1. Abre el panel de **Controles** (icono de deslizadores, arriba a la derecha) y pulsa el botón de **Ajustes** (engranaje)
2. Ve a la pestaña **Personaje** y abre la sección de **Servicios de IA**
3. Activa el interruptor de Chat (LLM), luego selecciona un proveedor del desplegable e introduce tu clave de API
4. Alternativamente, usa un servidor local como Ollama o LM Studio (no necesita clave de API)

Todas las claves de API se guardan localmente en tu dispositivo y nunca se envían a ningún sitio salvo a la API del proveedor correspondiente.

### 2. Cargar un modelo VRM

Luna trae un avatar por defecto, pero puedes cargar el tuyo:

1. Ve a **Ajustes > Personaje**
2. Pulsa **Añadir personalizado** en la sección Avatar y selecciona un archivo `.vrm` local (arrastrar y soltar también funciona)

### 3. Configurar texto-a-voz (opcional)

Para que tu compañera hable las respuestas en voz alta:

1. Ve a **Ajustes > Personaje** y abre la sección de **Servicios de IA**
2. Activa el interruptor de Voz (TTS), luego selecciona un proveedor (ElevenLabs, OpenAI TTS o TTS local)
3. Introduce tu clave de API (proveedores en la nube) y configura los ajustes de voz

## Usar el chat

Escribe un mensaje en la barra de chat inferior y pulsa Enter. La respuesta de tu compañera aparecerá como una burbuja de diálogo 3D que sigue la cabeza del avatar.

Si el TTS está activado, el avatar hablará la respuesta con animación de lip-sync.

## Entrada de voz

Pulsa el botón del micrófono en la barra de chat para usar voz-a-texto. Hay tres opciones disponibles:

- **Servidor Whisper local** — Transcripción auto-alojada compatible con OpenAI (Speaches, faster-whisper-server, whisper.cpp) vía el endpoint `/v1/audio/transcriptions`. El audio nunca sale de tu máquina. Configúralo en **Ajustes > Personaje** bajo Entrada de voz (STT) con una URL base (por defecto `http://localhost:8000/v1/`) y un nombre de modelo.
- **Whisper de Groq u OpenAI** — Transcripción en la nube de mayor calidad vía la API Whisper de Groq u OpenAI. Requiere la clave de API correspondiente, añadida en la misma sección de Entrada de voz (STT).
- **Web Speech API** — Integrada en tu navegador (Chrome, Edge, Safari). No requiere clave de API. Es la opción por defecto en el navegador cuando no hay nada más configurado.

La selección es automática por prioridad: gana un servidor local configurado, luego Groq, luego OpenAI, luego Web Speech. En la app de escritorio la Web Speech API no está disponible, así que configura un servidor Whisper local o una clave de Groq para la entrada de voz.

Consulta [Configurar STT local](/docs/guides/local-stt-setup) para ejecutar un servidor Whisper local.

## Modo foto

Pulsa el **botón de cámara** (arriba a la izquierda) para abrir el modo foto. Aparece un panel compacto con pestañas en la esquina:

- **Cámara** — deslizador de lente (campo de visión), un interruptor de seguimiento de cabeza para que te mire, una cuadrícula de tercios y restablecer el encuadre. Orbita, desplaza y haz zoom libremente mientras posas
- **Pose** — mantén una pose de la biblioteca de poses, o Natural para su postura habitual
- **Cara** — elige entre las expresiones que realmente incluye tu modelo
- **Escena** — fondos predefinidos (incluido transparente para stickers), filtros de color, una viñeta y marcos de polaroid o película
- **Sticker** — suelta stickers en la toma, arrástralos para moverlos, usa la rueda para redimensionarlos, doble clic o la lista para quitarlos

Captura en alta resolución, toma un instantáneo rápido o usa el temporizador de 3 segundos. Lo que ves en la vista previa es exactamente lo que contiene el archivo. Las capturas van a tu carpeta de Descargas tanto en la app web como en la de escritorio; se mantienen fuera del tablero de fotos, que queda reservado a las imágenes que le has mostrado. Pulsa Escape o la X para salir.

## Recordatorios y temporizadores

Pídeselo en el chat: «recuérdame en 10 minutos estirarme». Ella lo programa, lo menciona ella misma cuando salta, y se fija en los temporizadores que vencieron mientras la app estaba cerrada. La campana de alarma (arriba a la derecha) muestra las tareas pendientes y los recordatorios activados o perdidos; los descartes se conservan. Los recordatorios se mantienen sincronizados entre la app principal y la superposición de escritorio.

## Tocar

Tócala y reacciona: una expresión y una pequeña onda por su pelo y su ropa. Dónde toques importa, y también tu etapa de relación; al principio se sonroja con facilidad, y las reacciones más cálidas llegan con la cercanía. Un toque rápido provoca una reacción; arrastrar orbita la cámara y nunca la activa.

## Controles de escena

El panel de **Controles** (icono de deslizadores, arriba a la derecha, y luego el icono de cámara) guarda la escena:

- **Cámara** — deslizadores de zoom, altura y campo de visión con restablecimiento
- **Fondo** — fondos de escena persistentes: colores sólidos, degradados pastel (Sakura, Melocotón, Lavanda y más) y patrones (puntos, corazones, destellos, rayas de caramelo, vichy)
- **Física** — un deslizador de intensidad de movimiento de Sutil a Vivo que escala el movimiento de huesos con muelle (pelo, faldas, lazos) respetando el ajuste propio de cada modelo

## Gestión de datos

Todos los datos se guardan localmente en tu dispositivo.

- **Exportar** — Ve a Ajustes > Datos > Exportar guardado para descargar una copia de seguridad JSON
- **Importar** — Ve a Ajustes > Datos > Importar guardado para restaurar desde una copia
- **Combinar o reemplazar** — Elige si añadir los datos importados a los existentes o reemplazarlos por completo

## Temas

Luna admite modos claro y oscuro con detección automática de la preferencia del sistema. Abre el panel de **Controles** (icono de deslizadores, arriba a la derecha) y pulsa el botón de tema para alternar Sistema, Claro y Oscuro.
