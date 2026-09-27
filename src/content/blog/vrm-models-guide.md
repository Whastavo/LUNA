---
title: Qué son los modelos VRM (y dónde encontrarlos)
description: VRM es el estándar abierto para avatares 3D. Esto es lo que es, dónde encontrar modelos gratuitos y cómo hacer el tuyo.
date: '2026-02-04'
image: /blog/vrm-models.jpg
tag: Guía
---

# Qué son los modelos VRM (y dónde encontrarlos)

Si has pasado cualquier tiempo cerca de VTubers, compañeras virtuales o apps basadas en avatares, probablemente has visto el término "VRM" por todas partes. Pero la mayoría de la gente fuera de la comunidad VTuber no sabe de verdad lo que significa. Así que vamos a arreglarlo.

## VRM en 30 segundos

VRM es un formato de archivo abierto para avatares humanoides 3D. Piénsalo como JPEG para fotos o MP4 para vídeo, pero para personajes 3D. Un archivo contiene todo: el modelo 3D, texturas, expresiones faciales, física para pelo y ropa, comportamiento de seguimiento ocular e incluso metadatos de licencia. Creas un personaje una vez, y funciona en cualquier app que soporte VRM.

El formato fue creado en Japón en 2018 por el [VRM Consortium](https://vrm-consortium.org/en/), un grupo de más de 13 compañías incluyendo pixiv, Dwango y Unity Technologies Japan. Salió del boom VTuber y resolvió un problema real: antes de VRM, cada plataforma tenía su propio formato de avatar incompatible. Hacías un personaje para una app y tenías que rehacerlo completamente para otra.

A finales de 2024, el [Khronos Group](https://www.khronos.org/) (la gente detrás de OpenGL, Vulkan y glTF) se asoció con el VRM Consortium para empujar VRM hacia la estandarización internacional. Se está convirtiendo en algo serio.

## Qué hay realmente dentro de un archivo VRM

Por debajo, un archivo VRM es solo un binario glTF 2.0 (`.glb`) con metadatos extra. Si renombraras `character.vrm` a `character.glb`, cualquier visor 3D podría abrirlo. Pero las extensiones VRM son lo que lo hace útil para avatares específicamente:

- **Malla y texturas** para la apariencia del personaje
- **Un esqueleto humanoide** con nombres de huesos estandarizados (caderas, espina, pecho, cabeza, brazos, etc.)
- **Expresiones** para emociones y sincronización labial (feliz, triste, enfadado, más formas de boca para el habla)
- **Spring bones** que gestionan la física del pelo, la ropa, las colas y los accesorios
- **Ajustes de mirada** que controlan cómo los ojos siguen un objetivo
- **Materiales MToon** para ese sombreado toon de estilo anime que la mayoría de modelos VRM usan
- **Metadatos de licencia** incrustados directamente en el archivo (más sobre esto luego)

El sistema de expresiones es particularmente genial. VRM define expresiones estándar como `happy`, `angry`, `sad`, `relaxed` y `surprised`, más fonemas de sincronización labial (`aa`, `ih`, `ou`, `ee`, `oh`) mapeados a vocales japonesas. Es por eso que apps como Luna pueden hacer sincronización labial automática con cualquier modelo VRM sin configuración extra.

## Dónde encontrar modelos VRM gratuitos

### VRoid Hub

[VRoid Hub](https://hub.vroid.com/en) es la plataforma principal para compartir modelos VRM. La gestiona pixiv (la misma compañía detrás de la popular plataforma de ilustración). Los creadores suben sus personajes y fijan permisos sobre cómo pueden usarse.

La trampa: muchos modelos en VRoid Hub están configurados como solo visualización. Los creadores pueden elegir si su modelo es descargable o solo para mostrar. Así que navegarás por un montón de personajes geniales y encontrarás que muchos no están disponibles para descargar. Los descargables lo dirán claramente en la página del modelo.

### BOOTH

[BOOTH](https://booth.pm/) es el mercado de creadores de pixiv y es honestamente la mayor fuente de avatares 3D de estilo anime que existe. Muchos creadores listan modelos gratis (0 yenes), mientras que otros cobran desde unos pocos cientos hasta unos pocos miles de yenes. El sitio está principalmente en japonés, pero la traducción del navegador lo maneja bien.

Consejo pro: [BOOTHPLORER](https://boothplorer.com/) es una herramienta de terceros que hace que navegar el catálogo de avatares de BOOTH sea mucho más fácil, con mejor filtrado y búsqueda. Todo enlaza de vuelta al listado de la tienda original.

### Otras fuentes

- **[VIVERSE Avatar Creator](https://avatar.viverse.com/)** de HTC te deja crear y exportar archivos VRM directamente en tu navegador
- **[Sketchfab](https://sketchfab.com/tags/vrm)** tiene algunos modelos compatibles con VRM de varios creadores
- **[Avatares gratuitos](https://github.com/ToxSam/open-source-avatars)** — un repositorio de GitHub curado de avatares VRM gratuitos

## Haciendo el tuyo

### VRoid Studio (la forma fácil)

[VRoid Studio](https://vroid.com/en/studio) es gratis, funciona en Windows, macOS e iPad, y no requiere experiencia en modelado 3D. Usa sliders y piezas predefinidas para que construyas un personaje visualmente. Puedes personalizar la forma del cuerpo, los rasgos faciales, dibujar peinados a mano alzada y elegir atuendos. Cuando terminas, exportas directamente a VRM.

La contrapartida: todos los modelos VRoid comparten la misma malla base, así que tienden a tener un "look VRoid" reconocible. Si has visto suficientes VTubers, normalmente puedes detectar un modelo VRoid. No es un mal look en absoluto, pero es una estética específica. Para mucha gente está totalmente bien.

### Blender (la forma difícil)

Si quieres control creativo total sobre cada polígono, [Blender](https://www.blender.org/) con el [complemento VRM](https://vrm-addon-for-blender.info/) puede crear y exportar archivos VRM. Tienes libertad ilimitada con cualquier estilo de arte, cualquier nivel de detalle.

La contrapartida: necesitas saber modelado 3D de verdad. Estás lidiando con rigging, asignación de huesos, configuración de materiales, configuración de blend shapes y física de spring bones. Es un pipeline real. Pero si ya sabes Blender, el complemento VRM hace que el proceso de exportación sea directo.

### El punto medio

[CharacterStudio](https://github.com/M3-org/CharacterStudio) es un creador de VRM gratuito basado en web que se sitúa en algún punto entre la simplicidad de VRoid y la potencia de Blender. Merece la pena echarle un vistazo si quieres más control que VRoid sin convertirte en un artista 3D completo.

## El tema de las licencias

Una de las características más inteligentes de VRM es que la información de licencia está incrustada directamente en el archivo. No en un README aparte que se pierde. No en un archivo de texto que nadie lee. Está en los metadatos VRM y se espera que las apps la lean y la respeten.

Los creadores pueden especificar:

- **Quién puede usarlo como avatar** (solo el autor, gente con permiso, o todos)
- **Uso comercial** (solo personal, lucro personal permitido, o comercial completo)
- **Modificación** (prohibida, permitida pero sin redistribuir, o totalmente abierta)
- **Restricciones de contenido** (violencia, contenido sexual, uso político/religioso, etc.)
- **Requisitos de crédito** (obligatorio u opcional)

Esto importa mucho en la comunidad VTuber porque los avatares a menudo representan personas específicas. Un creador puede estar bien contigo usando su modelo casualmente pero no querer que aparezca en el stream comercial de otra persona. Las licencias incrustadas hacen esos límites claros.

Comprueba siempre los permisos antes de usar el modelo de alguien. La mayoría de apps compatibles con VRM te mostrarán esos permisos.

## VRM 0.x vs 1.0

Si ves modelos etiquetados como VRM 0.x o VRM 1.0, aquí va la versión corta: VRM 1.0 salió en septiembre de 2022 y es el estándar actual. Es modular, tiene mejores controles de expresión y añade funciones como restricciones de nodo. VRM 0.x está deprecado pero todavía se usa mucho, ya que muchos modelos existentes se hicieron con él.

La mayoría de apps soportan ambas versiones. VRoid Studio te deja exportar en cualquiera de los formatos. Si estás haciendo un modelo nuevo, ve con 1.0. Si estás descargando modelos existentes, no te estreses por la versión, ya que tu app probablemente lo manejará de cualquier forma.

## Usar VRM con Luna

Esto es exactamente para lo que Luna fue construida. Suelta cualquier archivo VRM y tienes una compañera 3D con sincronización labial automática, expresiones faciales y física de spring bones. El modelo se renderiza en tu navegador o app de escritorio con sombreado MToon, y las expresiones son impulsadas por las respuestas de la IA.

Puedes conseguir un modelo gratuito de VRoid Hub, hacer uno en VRoid Studio, o encargar algo personalizado. El estándar VRM significa que todo simplemente funciona sin conversión ni configuración. Carga el archivo, conecta tu LLM, y tu compañera está lista.

El formato abierto es lo que hace esto posible. Sin sistema de avatares propietario, sin vendor lock-in. Tu personaje es un archivo en tu disco duro del que eres completamente dueño.
