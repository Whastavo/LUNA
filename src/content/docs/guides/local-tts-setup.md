---
title: Configuración de TTS Local
description: Configura la síntesis de voz local para que tu compañera hable sin conexión.
---

# Configuración de Text-to-Speech (TTS) Local

Luna soporta múltiples opciones de voz para darle voz a tu compañera:

## Opciones Disponibles

### 1. Web Speech API (Integrada)
- **Ventajas**: Funciona directamente en tu navegador sin instalar nada adicional.
- **Configuración**: Selecciona **Web Speech API** en **Ajustes > TTS**. Elige una de las voces instaladas en tu sistema operativo.

### 2. Motor TTS Local / Servidor de Voz (Piper, Coqui)
Puedes conectar Luna a servidores de voz locales compatibles con OpenAI o mediante endpoints personalizados HTTP.

- **Piper TTS**: Ligero, rápido y de alta calidad para ejecución local.
- **Configuración**: En **Ajustes > TTS**, selecciona **Custom Server** e introduce la URL de tu endpoint de síntesis de voz.
