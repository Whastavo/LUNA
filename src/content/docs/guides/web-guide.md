---
title: Guía de la Aplicación Web
description: Cómo usar Luna en tu navegador web.
---

# Guía de la Aplicación Web

La aplicación web de Luna te permite ejecutar tu compañera de IA directamente en cualquier navegador moderno sin necesidad de instalación.

## Requisitos
- Un navegador moderno con soporte para WebGL 2.0 (Chrome, Edge, Firefox, Safari o Brave).
- Una clave de API para tu proveedor de LLM preferido (OpenAI, Gemini, Anthropic, Groq, OpenRouter) o una instancia de LLM local accesible (Ollama, LM Studio).

## Primeros Pasos

### 1. Iniciar la Aplicación
Navega a la sección **App** de Luna. Si es tu primera vez, se iniciará el asistente de configuración inicial (Onboarding).

### 2. Seleccionar o Cargar un Avatar
Luna incluye un modelo VRM predeterminado. Puedes cargar tu propio modelo `.vrm` desde las opciones de configuración de avatar o arrastrando y soltando el archivo `.vrm` en la pantalla.

### 3. Configurar el Proveedor de IA
Ve a **Ajustes > LLM** y selecciona tu proveedor:
- **Proveedores en la nube**: Introduce tu clave de API correspondiente.
- **Proveedores locales**: Introduce la URL base (por ejemplo, `http://localhost:11434` para Ollama).

### 4. Personalizar la Compañera
En **Ajustes > Persona**, puedes personalizar el nombre, rol, rasgos de personalidad, voz y modo de interacción (Compañera o Simulador de Citas).

## Almacenamiento y Privacidad
Todos tus datos (historial de chat, memoria, modelos cargados y configuraciones) se guardan localmente en el almacenamiento de tu navegador (IndexedDB). Si borras los datos del navegador, perderás tu historial a menos que hayas exportado una copia de seguridad en **Ajustes > Datos**.
