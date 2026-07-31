---
title: Introducción
description: Qué es Luna y cómo empezar.
---

# Introducción

## Resumen Rápido
- Una aplicación compañera de código abierto con avatares VRM 3D.
- Carga un modelo VRM, conecta cualquier proveedor de LLM y da vida a tu compañera de IA.
- Voz, memoria y un sistema de relaciones integrados.
- Enfoque local prioritario: tus datos permanecen en tu propio dispositivo.
- Aplicación de escritorio con modo de superposición transparente para macOS, Windows y Linux.

## ¿Qué es Luna?
La mayoría de las compañeras de IA actuales son interfaces de chat de texto o están atrapadas en plataformas cerradas. Luna combina un renderizador de avatares 3D interactivos con un motor de IA flexible que se conecta a cualquier proveedor de tu elección (Ollama local, OpenAI, Anthropic, Gemini, Groq, OpenRouter o vLLM).

Luna está diseñada para la compañía, la creatividad y el entretenimiento. Te permite personalizar avatares, voces, personalidades y comportamientos manteniendo el control total de tus datos.

## Características Principales

### Avatares VRM 3D Interactivos
Carga cualquier archivo de avatar VRM 3D estándar. Luna renderiza el modelo con expresiones faciales automáticas, sincronización labial (lip sync) basada en voz o audio y físicas de movimiento en tiempo real (spring bones).

### Trae tu Propia IA
Sin dependencias forzadas de un único proveedor. Conéctate a modelos en la nube como OpenAI, Anthropic, Gemini, Groq u OpenRouter, o ejecuta modelos totalmente locales mediante Ollama o endpoints compatibles con OpenAI (vLLM, LM Studio, Jan, LocalAI).

### Arquitectura Local-First
Tus conversaciones, memoria, configuraciones y datos de personaje se almacenan localmente en tu navegador/equipo usando IndexedDB (a través de Dexie.js). Sin servidores centrales recopilando tus datos.

### Sistema de Memoria Semántica
Luna recuerda hechos, preferencias e interacciones clave de conversaciones anteriores utilizando incrustaciones (embeddings) semánticas y un grafo de memoria interactivo visualizable.

### Voz y Audio
Soporte para síntesis de voz (TTS) mediante la API del navegador o motores TTS locales/remotos (como Piper, ElevenLabs o Web Speech API) y reconocimiento de voz (STT) para interactuar mediante la voz.

### Modos de Aplicación
- **Modo Compañera**: Conversación fluida con gestos, expresiones y memoria continua.
- **Modo Novia / Simulador de Citas**: Incluye mecánicas de afinidad, estado de ánimo, niveles de relación y eventos interactivos.
- **Modo Overlay de Escritorio**: La aplicación de escritorio fija a tu compañera transparente sobre cualquier ventana de trabajo o juego.

## Siguientes Pasos
- Consulta la [Guía Web](/docs/guides/web-guide) para usar Luna en el navegador.
- Explora la [Guía de Escritorio](/docs/guides/desktop-guide) para instalar la app de escritorio.
- Configura tu IA local con la [Configuración LLM Local](/docs/guides/local-llm-setup).
