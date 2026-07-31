---
title: Solución de Problemas
description: Respuestas a problemas comunes, errores de CORS y rendimiento.
---

# Solución de Problemas

Aquí encontrarás soluciones a los problemas más frecuentes al usar Luna.

## 1. Error de Conexión o CORS con Ollama / LLM Local
**Síntoma**: La aplicación indica que no se puede conectar al servidor local.

**Solución**:
- Asegúrate de que el servidor local esté ejecutándose (`ollama serve` o LM Studio).
- Verifica que la variable `OLLAMA_ORIGINS="*"` esté configurada antes de iniciar Ollama.
- Comprueba que la URL en **Ajustes > LLM** no contenga barras inclinadas finales o errores tipográficos (`http://localhost:11434` es el estándar).

## 2. El Avatar 3D no se Carga o va Lento
**Solución**:
- Verifica que tu navegador tenga habilitada la aceleración por hardware en la configuración.
- Asegúrate de que el archivo `.vrm` no sea excesivamente pesado (modelos recomendados inferior a 50MB y menos de 100k polígonos).

## 3. Mi Clave de API es Rechazada
**Solución**:
- Revisa que no haya espacios en blanco antes o después de la clave pegada.
- Verifica si la clave tiene créditos suficientes o permisos de modelo activos en tu panel de proveedor (OpenAI, Anthropic, Gemini, etc.).
