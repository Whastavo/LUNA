---
title: Visión General de la Arquitectura
description: Diseño del sistema, flujo de datos y decisiones técnicas en Luna.
---

# Visión General de la Arquitectura

Luna está diseñada como una aplicación **local-first** en el lado del cliente, con una capa de integración nativa para la versión de escritorio vía Tauri.

## Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Interfaz de Usuario (Svelte 5)           │
├──────────────────────────────┬──────────────────────────────┤
│     Renderizado VRM 3D      │     Motor de Diálogo / LLM   │
│   (Three.js / @pixiv/three-vrm)│  (OpenAI, Ollama, Gemini...) │
├──────────────────────────────┴──────────────────────────────┤
│                   Sistema de Memoria y Estado               │
│                     (Dexie.js / IndexedDB)                  │
└─────────────────────────────────────────────────────────────┘
```

### 1. Capa de Presentación (UI)
Construida con **Svelte 5** y Tailwind CSS. Utiliza Svelte Runes (`$state`, `$derived`, `$effect`) para una reactividad ultra fluida y un rendimiento óptimo.

### 2. Motor de Avatar 3D
Utiliza **Three.js** y `@pixiv/three-vrm` para cargar y animar archivos `.vrm`.
- Maneja expresiones emocionales, párpados y parpadeo automático.
- Aplica físicas en tiempo real para pelo y ropa (*spring bones*).
- Realiza sincro labial (*lip sync*) analizando frecuencias de audio o salida de texto.

### 3. Capa de IA y Estado del Personaje
Gestiona las llamadas a modelos de lenguaje (LLM), el análisis de sentimientos y la extracción de hechos/memorias de las conversaciones.
- Mantiene el historial en IndexedDB mediante **Dexie.js**.
- Genera vectores de incrustación (*embeddings*) locales mediante Transformers.js para búsquedas semánticas de memoria.
