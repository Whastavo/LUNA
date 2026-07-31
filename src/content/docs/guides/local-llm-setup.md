---
title: Configuración de LLM Local
description: Cómo conectar Luna a Ollama, LM Studio o vLLM para ejecutar modelos de IA 100% locales.
---

# Configuración de LLM Local

Ejecutar un modelo de lenguaje local te permite usar Luna de forma 100% privada y fuera de línea, sin coste por token ni compartir datos con servicios externos.

## Uso con Ollama

[Ollama](https://ollama.com) es la forma más sencilla de ejecutar LLMs locales en macOS, Windows y Linux.

### 1. Instalar y Ejecutar Ollama
Descarga e instala Ollama desde su sitio web oficial. Luego ejecuta un modelo en tu terminal:

```bash
ollama run llama3.2
```

### 2. Permitir CORS en Ollama (Importante)
Para que la aplicación web de Luna pueda comunicarse con Ollama, debes habilitar las cabeceras CORS:

- **macOS / Linux**:
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```
- **Windows**:
  Establece la variable de entorno de sistema `OLLAMA_ORIGINS` con el valor `*` y reinicia Ollama.

### 3. Configurar Luna
1. En Luna, abre **Ajustes > LLM**.
2. Selecciona **Ollama** como tu proveedor.
3. Establece la URL del servidor en `http://localhost:11434`.
4. Haz clic en **Obtener modelos** y selecciona el modelo que hayas descargado (por ejemplo, `llama3.2`).

## Uso con LM Studio o Servidores Compatibles con OpenAI

Si usas LM Studio, vLLM, Jan o LocalAI:

1. Inicia el servidor local compatible con OpenAI (generalmente en `http://localhost:1234/v1` o `http://localhost:8000/v1`).
2. En Luna, selecciona **Custom / OpenAI Compatible**.
3. Introduce tu URL de servidor local.
4. Si el servidor requiere una API key ficticia, introduce `not-needed` o cualquier texto.
