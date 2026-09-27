---
title: Grafo de memoria
description: Visualización interactiva de las conexiones de memoria semántica
---

# Grafo de memoria

El Grafo de memoria es una visualización de red interactiva que muestra cómo los recuerdos de tu compañera están conectados semánticamente.

## Acceder al Grafo de memoria

Haz clic en el **icono de cerebro** en la esquina superior izquierda de la pantalla principal para abrir el Grafo de memoria en un modal a pantalla completa.

## Entender la visualización

### Nodos (recuerdos)

Cada nodo representa un recuerdo almacenado (dato) sobre ti, vuestra relación o experiencias compartidas.

**Colores de nodo:**
- **Azul** — Datos del usuario (tus preferencias, tu historia, tus atributos)
- **Rosa** — Datos de la relación (dinámicas entre tú y la compañera)
- **Verde** — Experiencias compartidas (eventos que habéis comentado juntos)

### Conexiones

Las líneas entre los nodos indican **similitud semántica** — los recuerdos relacionados por significado están conectados. Partículas animadas fluyen por las conexiones para visualizar estas relaciones.

### Estadísticas

La esquina inferior izquierda muestra el número total de recuerdos y de conexiones en la vista actual.

## Interacciones

### Seleccionar un recuerdo

Haz clic en cualquier nodo para seleccionarlo:
- El recuerdo seleccionado y sus conexiones se resaltan
- Los recuerdos no relacionados se desvanecen
- Aparece un panel de detalles a la derecha con el contenido completo del recuerdo, su puntuación de importancia y el número de referencias

### Filtrar categorías

Usa los interruptores de categoría en el panel de control de la esquina superior izquierda para mostrar u ocultar tipos de recuerdo. Esto ayuda a centrarse en aspectos concretos de lo que tu compañera sabe.

### Restablecer la vista

Haz clic en «Restablecer vista» para alejar el zoom y ver el grafo completo, borrando cualquier selección.

## Detalles técnicos

El Grafo de memoria usa **embeddings de 384 dimensiones** (vía Transformers.js con el modelo multilingual paraphrase-multilingual-MiniLM-L12-v2) para calcular las relaciones semánticas entre recuerdos. Los recuerdos con **similitud coseno >= 0.5** quedan conectados.

El **número de referencias** registra cuántas veces se ha recuperado un recuerdo durante las conversaciones — los recuentos altos indican recuerdos que informan las respuestas con frecuencia.

La **puntuación de importancia** (0-100) refleja lo significativo que es el recuerdo según su contenido emocional, detalles personales y otras heurísticas.

### Requisitos

- Los recuerdos deben tener embeddings para aparecer en el grafo
- El modelo de embeddings se carga automáticamente al iniciar la app
- Los recuerdos existentes sin embeddings se rellenan automáticamente cuando el modelo termina de cargar

## Relacionado

- [Sistema de compañera](/docs/technology/companion-system) — Arquitectura completa incluido el sistema de memoria de tres niveles
- [Visión de la arquitectura](/docs/technology/architecture) — Diseño del sistema e interacciones entre componentes
