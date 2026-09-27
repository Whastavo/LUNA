---
title: Empezando el proyecto
description: Por qué empecé a construir Luna, una compañera con avatar VRM que respeta tu privacidad frente a las plataformas cerradas.
date: '2026-01-24'
image: /blog/project-start-gif.gif
tag: DevLog
---

# Empezando el proyecto

Hemos abierto la caja de Pandora. La IA ya está ahí fuera para siempre, nos guste o no. Eso no es malo en sí mismo, pero como toda tecnología poderosa anterior, la primera ola está dominada por plataformas cerradas que extraen todo lo posible de los usuarios. Tus conversaciones, tus datos, tus personajes, encerrados tras suscripciones y términos de servicio que nunca lees.

Han hecho falta proyectos como este para empezar a empujar las cosas en otra dirección. Devolver el control al usuario. Demostrar que puedes tener una compañera de IA que respeta tu privacidad, funciona en tus términos y no llama a ningún servidor corporativo cada vez que hablas con ella.

Esa es la idea detrás de Luna. Un recipiente para que la IA habite visualmente. Tú traes el modelo, la voz y el proveedor de LLM. La app es solo la carcasa. Todo se ejecuta localmente, todo es tuyo.

## La inspiración (y el problema)

Dos productos me hicieron pensar de verdad en este espacio.

<img
  src="/blog/grok-ani.jpg"
  sizes="(max-width: 768px) calc(100vw - 40px), 736px"
  width="1280" height="720"
  alt="La compañera Ani de Grok"
  loading="lazy" decoding="async"
/>

El primero es **Ani**, la compañera de xAI para Grok. Cuando se lanzó a mediados de 2025 se hizo viral por completo. Millones de impresiones en las primeras 48 horas. El avatar 3D, la voz, el sistema de afecto que evoluciona a medida que interactúas. Demostró que hay un apetito enorme por este tipo de experiencias. La gente quiere de verdad compañeras de IA que se sientan vivas.

¿La contrapartida? Está encerrada tras una suscripción a SuperGrok de 30 $/mes. Tus conversaciones viven en los servidores de xAI. Los personajes, los avatares, el sistema de personalidad, todo es propietario. Estás alquilando la experiencia. Si xAI decide cambiar la personalidad de Ani, quitar una función o cerrarla mañana, no tienes nada que decir al respecto. Ya han tenido que desactivar funciones por la polémica en torno a la moderación de contenidos. Cuando no eres dueño de la plataforma, siempre estás a merced de quien lo sea.

<img
  src="/blog/razer-project-ava.jpg"
  sizes="(max-width: 768px) calc(100vw - 40px), 736px"
  width="920" height="518"
  alt="Project Ava de Razer"
  loading="lazy" decoding="async"
/>

El segundo es **Project Ava** de Razer, presentado en el CES 2026. Una compañera de IA holográfica que se posa en tu escritorio dentro de un cilindro físico. Avatares anime, interacción por voz, conciencia de pantalla. El concepto de hardware es genuinamente genial. Un holograma 3D de 5,5" con micrófonos duales y una cámara que puede ver tu pantalla.

Pero luego miras los detalles. Funciona con el motor de Grok, así que vuelves de lleno al ecosistema de xAI. Es un dispositivo de hardware propietario con software propietario. Se espera que cueste algo dentro de la gama de periféricos premium de Razer (probablemente hablamos de más de 200 $) y ni siquiera se ha enviado todavía. Estás comprando un sistema cerrado donde el fabricante de hardware y el proveedor de IA controlan ambos tu experiencia. Si cualquiera de las dos compañías gira, te queda un pisapapeles caro.

Ambos productos validaron la idea de que la gente quiere compañeras de IA. Pero también mostraron exactamente qué pasa cuando esa experiencia se construye sobre plataformas cerradas. El usuario siempre es el producto, nunca el dueño.

## Lo que estoy construyendo

El bucle central es directo: cargas un modelo VRM, conectas un proveedor de LLM, opcionalmente añades TTS, y obtienes una compañera que responde con audio sincronizado con los labios y expresiones faciales.

Por debajo hay más cosas en marcha. Un sistema de memoria que rastrea el contexto de la conversación, un modelo de relación que evoluciona con el tiempo y un motor de eventos que impulsa interacciones dinámicas. Pero la experiencia superficial debería sentirse simple.

La diferencia con Ani o Project Ava es que todo aquí se ejecuta en tu máquina. Tú eliges el avatar. Tú eliges la IA. Tú eres dueño del historial de conversación. Si no te gusta algo, puedes cambiarlo. Si el proyecto desapareciera mañana, seguirías teniendo todo.

## Decisiones técnicas

SvelteKit fue la elección obvia para el frontend. Las runes de Svelte 5 hacen que la gestión de estado reactivo sea limpia, y SvelteKit nos da tanto la app web como el sitio de documentación desde una sola base de código. Three.js se encarga del renderizado 3D con soporte VRM a través de `@pixiv/three-vrm`.

Para la capa de LLM, uso el AI SDK de Vercel. Abstrae las diferencias entre proveedores, así que cambiar entre una API en la nube y una instancia local de Ollama es solo un cambio de configuración. La arquitectura es intencionalmente agnóstica al proveedor. La personalidad, la memoria y el contexto de conversación de la compañera se ensamblan en un system prompt en tiempo de ejecución, y a la app no le importa qué hay al otro lado.

El almacenamiento es todo del lado del cliente. IndexedDB a través de Dexie.js. Sin cuentas, sin servidores que guarden tus datos. Todo se queda en tu dispositivo.

## Qué sigue

El foco inmediato es hacer que la experiencia web central sea sólida: chat, voz, expresiones y memoria funcionando de forma fiable. Después, estoy mirando una app de escritorio vía Tauri para funciones que necesitan una integración más profunda con el sistema operativo, cosas como overlays transparentes y soporte de modelos locales.

Más actualizaciones a medida que las cosas tomen forma.
