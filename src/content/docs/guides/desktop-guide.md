---
title: Guía de escritorio
description: Cómo instalar y usar la aplicación de escritorio de Luna con modo superposición.
---

# Guía de escritorio

Luna Desktop es una aplicación que lleva a tu compañera IA a tu escritorio con un modo de superposición transparente. Tu compañera puede flotar sobre otras aplicaciones, siempre visible mientras trabajas.

Disponible para **macOS**, **Windows** y **Linux**.

## Instalación

### Descargar

Ve a la página de [GitHub Releases](https://github.com/JuiceBoxxGames/luna/releases) y descarga la build para tu plataforma:

| Plataforma | Archivo | Instalación |
|----------|------|---------|
| **macOS** | `.dmg` (universal) | Abre la imagen de disco y arrastra Luna a tu carpeta de Aplicaciones |
| **Windows** | `.exe` | Ejecuta el instalador |
| **Linux** | `.AppImage` | `chmod +x` al archivo y ejecútalo |
| **Linux** | `.deb` / `.rpm` | Instala con tu gestor de paquetes |

#### Abrir una build sin firmar

La app de escritorio está en beta y actualmente **sin firmar**, así que tu SO te avisará la primera vez que la abras. Es lo esperado.

- **macOS:** clic derecho en la app → **Abrir** → **Abrir**. O ejecuta `xattr -dr com.apple.quarantine /Applications/Luna.app` una vez.
- **Windows:** en el aviso de SmartScreen, pulsa **Más información** → **Ejecutar de todos modos**.
- **Linux:** los AppImage solo necesitan el bit de ejecución (`chmod +x Luna.AppImage`).

### Compilar desde el código fuente

Si prefieres compilarla tú mismo:

#### Requisitos previos

- Node.js 22+
- [Cadena de herramientas de Rust](https://rustup.rs/) (para Tauri)
- pnpm

```bash
# Clona el repositorio
git clone https://github.com/JuiceBoxxGames/luna.git
cd luna

# Instala las dependencias
pnpm install

# Ejecuta en modo desarrollo
pnpm tauri dev

# O compila un binario de versión
pnpm tauri build
```

El comando dev lanza tanto un servidor de desarrollo como la ventana de escritorio. El comando build produce un instalador para tu plataforma actual en `src-tauri/target/release/bundle/`.

## Actualizaciones

La app de escritorio se mantiene al día sola. Al arrancar comprueba en silencio si hay una versión nueva, y cuando la hay aparece una pequeña banda que ofrece **Instalar y reiniciar** — púlsala y la app descarga la actualización, la instala y se relanza.

También puedes comprobarlo manualmente en cualquier momento desde el diálogo **Acerca de** (el botón de información en la app) vía **Buscar actualizaciones**.

> Las actualizaciones automáticas funcionan para el `.dmg` de macOS, el `.exe` de Windows y el `.AppImage` de Linux. Si instalaste vía `.deb` o `.rpm`, actualiza con tu gestor de paquetes en su lugar.

## Funciones

### Ventana principal

La ventana principal ofrece la experiencia completa de Luna — igual que la versión web con todas las funciones:

- Avatar VRM con animaciones
- Interfaz de chat
- Ajustes y configuración
- Sistemas de memoria y relación

Un **icono de monitor** azul en la esquina superior derecha lanza el modo superposición.

### Modo superposición

El modo superposición separa a tu compañera en una ventana transparente siempre encima:

- **Fondo transparente**: solo el personaje es visible; todo lo demás se ve a través
- **Siempre encima**: la compañera se mantiene visible sobre todas las demás ventanas
- **Arrastrable**: haz clic y arrastra en cualquier parte del personaje para reposicionarlo
- **Chat flotante**: pulsa el icono de chat abajo para expandir una entrada de chat
- **Burbujas de diálogo**: las respuestas aparecen en una burbuja acoplada sobre los controles inferiores (la ventana se mueve, así que una burbuja con seguimiento de cabeza sería ilegible)
- **Indicador de estado**: la píldora de estado de ánimo/relación aparece sobre el icono de chat
- **Redimensionable**: arrastra la pestaña de la esquina superior izquierda para redimensionar la superposición; el tamaño se recuerda entre sesiones
- **Bloqueable**: el botón de candado de los controles flotantes fija la superposición en su sitio para que los clics no la arrastren
- **Cámara de superposición**: los controles flotantes incluyen un panel de cámara con deslizadores de zoom, altura y campo de visión independientes del encuadre de la ventana principal

#### Controles

| Acción | Cómo |
|--------|-----|
| Mover el personaje | Clic y arrastre sobre el personaje |
| Abrir el chat | Pulsa el icono de chat abajo |
| Enviar mensaje | Escribe y pulsa Enter |
| Cerrar el chat | Envía un mensaje (se colapsa solo) |
| Salir de la superposición | Pulsa el botón X de la esquina superior derecha |
| Pulsar para hablar | `Ctrl+Shift+Espacio` (atajo global) |
| Alternar superposición | `Ctrl+Shift+U` (atajo global) |
| Enfocar el chat | `Ctrl+Shift+C` (atajo global) |

### Cambiar entre modos

- **Principal → Superposición**: pulsa el icono de monitor azul en la esquina superior derecha
- **Superposición → Principal**: pulsa el botón X en la esquina superior derecha de la superposición

Ambas ventanas comparten los mismos datos — tu conversación, recuerdos y estado de relación persisten entre modos.

## Limitaciones conocidas

Algunas funciones siguen en desarrollo:

| Función | Estado |
|---------|--------|
| Soporte de macOS | ✅ Disponible |
| Soporte de Windows | ✅ Disponible |
| Soporte de Linux | ✅ Disponible |
| Transparencia clicable | ❌ Desactivada (bloquea la UI) |
| Atajos globales | ✅ Disponibles |
| Auto-actualización en la app | ✅ Disponible |
| Persistencia de tamaño y bloqueo | ✅ Disponible (posición de la ventana entre sesiones aún prevista) |
| Bandeja del sistema | ⏳ Previsto |

## Solución de problemas

### La app no arranca

Si compilaste desde el código fuente, asegúrate de que Rust está instalado:

```bash
rustc --version
```

Si no está instalado, ejecuta:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Si descargaste un binario de versión y no arranca, prueba a descargarlo de nuevo o revisa la página de [GitHub Issues](https://github.com/JuiceBoxxGames/luna/issues).

### El fondo de la superposición no es transparente

Esto puede pasar si el renderer no está bien configurado. Prueba:

1. Sal y vuelve a lanzar la app
2. Asegúrate de estar en la última versión de [Releases](https://github.com/JuiceBoxxGames/luna/releases)

### El personaje mira hacia otra dirección

La cámara está fija en modo superposición. Si el personaje aparece rotado, sal de la superposición y vuelve a entrar.

### La entrada de voz no funciona

La app de escritorio usa el webview de Tauri, que no soporta la Web Speech API del navegador. Para la entrada de voz en escritorio, configura un servidor Whisper local, una clave de API de Groq o una clave de OpenAI en **Ajustes > Personaje** bajo la sección de Entrada de voz (STT).

### No puedo interactuar con la UI de la superposición

El botón X y el icono de chat deberían ser siempre clicables. Si no responden, la ventana puede haber perdido el foco — pulsa en cualquier parte de la superposición primero.

## Detalles técnicos

La app de escritorio usa:

- **Tauri v2** — framework basado en Rust para apps de escritorio
- **La misma base de código SvelteKit** — sin fork, componentes compartidos
- **Detección de plataforma** — `isTauri()` comprueba el entorno Tauri
- **Multi-ventana** — ventana principal + ventana de superposición gestionadas por separado

Para detalles de arquitectura, consulta [Visión de la arquitectura](/docs/technology/architecture).
