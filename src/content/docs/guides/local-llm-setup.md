---
title: Configurar LLM local
description: Cómo configurar y conectar LLMs locales a Luna usando Ollama o LM Studio.
---

# Configurar LLM local

Ejecutar un LLM local significa que tus conversaciones nunca salen de tu máquina. Sin claves de API, sin costes de uso y con soporte completo fuera de línea.

## Ollama

[Ollama](https://ollama.ai) es una herramienta ligera para ejecutar LLMs localmente. Disponible en macOS, Linux y Windows.

### Instalación

**macOS**

```bash
brew install ollama
```

**Linux**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows**

Descarga el instalador desde [ollama.ai](https://ollama.ai) y ejecútalo.

### Descargar un modelo

Descarga un modelo antes de poder usarlo:

```bash
ollama pull llama3.2
```

Otras opciones que vale la pena probar: `mistral`, `phi3`, `codellama`.

### Iniciar el servidor

```bash
ollama serve
```

Esto inicia la API de Ollama en `http://localhost:11434`.

### Conectar con Luna

1. Abre el panel de **Controles** (icono de deslizadores, arriba a la derecha) y pulsa **Ajustes** (engranaje)
2. Ve a la pestaña **Personaje** y abre la sección de **Servicios de IA**
3. Activa el interruptor de Chat (LLM), luego selecciona **Ollama** en el desplegable de proveedores
4. Deja la URL base como `http://localhost:11434` salvo que hayas cambiado el puerto de Ollama
5. Luna obtendrá los modelos instalados en tu máquina. Pulsa el icono de actualizar si acabas de descargar un modelo nuevo.
6. Selecciona un modelo instalado del desplegable
7. Empieza a chatear

Si el desplegable está vacío, revisa tus modelos de Ollama instalados con:

```bash
ollama list
```

### Permitir que Luna llegue a Ollama

Ollama solo responde peticiones de orígenes en su lista de permitidos. Si no permite a Luna, verás que la lista de modelos se queda vacía y el registro de Ollama mostrará respuestas `403` en `/api/tags`. Qué origen necesitas permitir depende de cómo ejecutes Luna.

**App de escritorio**

| Tu SO | Configuración necesaria | Qué hacer |
|---------|--------------|------------|
| macOS | Ninguna | Ollama ya permite el origen `tauri://localhost` de la app de macOS. Solo ejecuta `ollama serve`. |
| Windows | Sí | Permite `http://tauri.localhost` (ver abajo). |
| Linux | Sí | Permite `http://tauri.localhost` (ver abajo). |

La app de escritorio en Windows y Linux reporta su origen a Ollama como `http://tauri.localhost`, que no está en la lista de permitidos por defecto de Ollama, así que tienes que añadirlo una vez.

En **Windows**, configúralo y reinicia Ollama por completo:

```
setx OLLAMA_ORIGINS "http://tauri.localhost"
```

`setx` solo aplica a programas iniciados después, así que cierra Ollama desde la bandeja del sistema (clic derecho en el icono de la bandeja, Salir) y arráncalo de nuevo. Si ejecutas `ollama serve` en una terminal en su lugar, usa `set OLLAMA_ORIGINS=http://tauri.localhost` en esa misma ventana antes de ejecutarlo.

En **Linux**, inicia Ollama con el origen en su entorno:

```bash
OLLAMA_ORIGINS=http://tauri.localhost ollama serve
```

Si Ollama corre como servicio systemd, ejecuta `systemctl edit ollama`, añade `Environment="OLLAMA_ORIGINS=http://tauri.localhost"` bajo `[Service]`, y luego `sudo systemctl restart ollama`.

**Sitio web alojado (app.luna.ai)**

La app web corre en `app.luna.ai`, y tu navegador se conecta directamente a Ollama en tu máquina, así que permite ese origen:

```bash
OLLAMA_ORIGINS=https://app.luna.ai ollama serve
```

Usa lo que aparezca en la barra de direcciones de tu navegador. Para desarrollo local usa `http://localhost:5173`. Para una vista previa de Vercel, usa el origen exacto mostrado en la barra de direcciones (sin barra final), como `https://tu-preview.vercel.app`. Separa varios orígenes con comas, o usa `OLLAMA_ORIGINS=*` para permitir cualquier origen en tu máquina.

## LM Studio

[LM Studio](https://lmstudio.ai) ofrece una GUI para descargar y ejecutar modelos locales. Buena opción si prefieres no usar la terminal.

### Instalación

Descarga desde [lmstudio.ai](https://lmstudio.ai) e instálalo.

### Descargar modelos

Abre LM Studio y explora el catálogo de modelos integrado. Busca un modelo, pulsa descargar y espera a que termine.

### Iniciar el servidor

1. Ve a la pestaña **Server** en LM Studio
2. Pulsa **Start Server**

Esto inicia una API compatible con OpenAI en `http://localhost:1234`.

### Conectar con Luna

1. Abre el panel de **Controles** (icono de deslizadores, arriba a la derecha) y pulsa **Ajustes** (engranaje)
2. Ve a la pestaña **Personaje** y abre la sección de **Servicios de IA**
3. Activa el interruptor de Chat (LLM), luego selecciona **LM Studio** en el desplegable de proveedores
4. Deja la URL base como `http://localhost:1234/v1` salvo que hayas cambiado el puerto de LM Studio
5. Luna obtendrá los modelos del servidor de LM Studio en ejecución. Pulsa el icono de actualizar si cargas un modelo distinto.
6. Selecciona el modelo cargado del desplegable
7. Empieza a chatear

## Modelos recomendados

| Modelo | Tamaño | Ideal para | RAM necesaria |
|-------|------|----------|--------------|
| Llama 3.2 (3B) | ~2GB | Chat general, respuestas rápidas | 8GB |
| Llama 3.1 (8B) | ~4.7GB | Respuestas de mayor calidad | 16GB |
| Mistral (7B) | ~4.1GB | Buen equilibrio de velocidad y calidad | 16GB |
| Phi-3 (3.8B) | ~2.3GB | Ligero, eficiente | 8GB |

Empieza con **Llama 3.2 (3B)** si no estás seguro. Funciona bien en la mayoría del hardware y da resultados sólidos para uso conversacional.

## URL base personalizada

Si estás ejecutando el servidor LLM en otra máquina o en un puerto no predeterminado, introduce la URL completa en los ajustes del proveedor. Por ejemplo:

- Máquina remota: `http://192.168.1.50:11434`
- Puerto personalizado: `http://localhost:8080`

Para Ollama, tanto `http://localhost:11434` como `http://localhost:11434/v1` funcionan. Luna usa `/api/tags` para descubrir modelos y `/v1/chat/completions` para el chat.

## Solución de problemas

### «Error al obtener modelos»

El servidor LLM puede no estar en ejecución, o puede no estar permitiendo el origen de Luna. Inicia el servidor:

- Ollama: `ollama serve`
- LM Studio: ve a la pestaña Server y pulsa Start Server

Si el servidor está en ejecución pero la lista sigue vacía, casi siempre es un problema de origen. El registro de Ollama mostrará `403` en `/api/tags`. Permite el origen de Luna como se describe en [Permitir que Luna llegue a Ollama](#permitir-que-luna-llegue-a-ollama): en la **app de escritorio de Windows o Linux** eso significa `OLLAMA_ORIGINS=http://tauri.localhost`; en el **sitio web alojado** es `OLLAMA_ORIGINS=https://app.luna.ai`. La app de escritorio de macOS no necesita nada. Reinicia Ollama tras cambiarlo y pulsa el icono de actualizar en el desplegable de modelos de Luna.

### «model not found»

El modelo seleccionado ya no está instalado localmente, o el servidor local devolvió una lista de modelos obsoleta.

Para Ollama:

```bash
ollama list
ollama pull llama3.2
```

Luego selecciona el modelo instalado en el desplegable de modelos de Luna.

### «Connection refused»

El puerto no coincide. Puertos por defecto:

| Proveedor | Puerto |
|----------|------|
| Ollama | 11434 |
| LM Studio | 1234 |

Asegúrate de que la URL en Luna coincide con el puerto que usa tu servidor.

### Los modelos siguen sin cargar (prueba 127.0.0.1)

Si Ollama está en ejecución y ya permitiste el origen pero la lista de modelos sigue vacía, cambia la URL base en Luna de `http://localhost:11434` a `http://127.0.0.1:11434`. En algunos sistemas (la mayoría de las veces Windows) `localhost` resuelve primero a la dirección IPv6 `::1`, mientras que Ollama escucha en la dirección IPv4 `127.0.0.1`, así que la conexión nunca llega. Apuntar Luna directamente a `127.0.0.1` evita el desajuste. Esto depende de la máquina, así que no afectará a todo el mundo.

### Respuestas lentas

- Prueba un modelo más pequeño (3B de parámetros en vez de 7B+)
- Comprueba que la aceleración por GPU está activada en los ajustes de tu herramienta LLM
- Cierra otras aplicaciones que consuman mucha memoria

### Errores CORS en el navegador

Si ejecutas Luna en un navegador y obtienes errores de CORS con Ollama, configura la variable de entorno de orígenes antes de iniciar el servidor:

```bash
OLLAMA_ORIGINS=https://app.luna.ai ollama serve
```

Ollama documenta esto en [allowing additional web origins](https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama).

Para vistas previas de Vercel, reemplaza el valor por el origen de vista previa exacto de la barra de direcciones:

```bash
OLLAMA_ORIGINS=https://tu-preview.vercel.app ollama serve
```

Si usas varios orígenes de Luna, sepáralos con comas. Usa `OLLAMA_ORIGINS=http://localhost:5173` para desarrollo local, o `OLLAMA_ORIGINS=*` solo si quieres permitir deliberadamente cualquier origen de navegador en tu máquina.

La **app de escritorio** pasa por la misma lista de permitidos de Ollama. macOS funciona sin configuración, pero las apps de escritorio de Windows y Linux necesitan `OLLAMA_ORIGINS=http://tauri.localhost`. Consulta [Permitir que Luna llegue a Ollama](#permitir-que-luna-llegue-a-ollama).
