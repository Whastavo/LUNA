# Sistema de diseño

La referencia única de cómo se ve Luna. La app y el sitio (landing, blog, docs) comparten un conjunto de tokens y un vocabulario de botones. Lee esto antes de añadir UI para que el trabajo nuevo se mantenga consistente.

Fuente de verdad: `src/app.css` (`:root` + `.dark`). Todo lo demás consume esos tokens.

## Tokens de diseño

Los tokens viven en `src/app.css` bajo `:root`. El modo oscuro override los colores relevantes en `.dark`.

### Colores principales

| Token | Uso |
|-------|-----|
| `--accent` | Color principal de acento (botones, enlaces activos) |
| `--accent-hover` | Hover del color de acento |
| `--accent-muted` | Versión suave del acento (fondos sutiles) |
| `--accent-subtle` | Versión aún más suave |

### Colores de fondo

| Token | Uso |
|-------|-----|
| `--bg-primary` | Fondo principal de la página |
| `--bg-secondary` | Fondo de tarjetas y paneles |
| `--bg-tertiary` | Fondo de badges, chips, inputs |
| `--bg-page` | Fondo de la página completa |

### Colores de texto

| Token | Uso |
|-------|-----|
| `--text-primary` | Texto principal |
| `--text-secondary` | Texto secundario (descripciones) |
| `--text-tertiary` | Texto terciario (placeholders, hints) |

### Bordes

| Token | Uso |
|-------|-----|
| `--border-subtle` | Bordes sutiles (cards, inputs) |
| `--border-light` | Bordes más suaves |

### Sombras

| Token | Uso |
|-------|-----|
| `--shadow-xs` | Sombra muy pequeña |
| `--shadow-sm` | Sombra pequeña |
| `--shadow-md` | Sombra media |
| `--shadow-lg` | Sombra grande |
| `--shadow-xl` | Sombra extra grande |
| `--shadow-glow` | Sombra con brillo (botones principales) |

### Bordes redondeados

| Token | Uso |
|-------|-----|
| `--radius-sm` | Bordes pequeños |
| `--radius-md` | Bordes medianos |
| `--radius-lg` | Bordes grandes |
| `--radius-xl` | Bordes extra grandes |
| `--radius-full` | Completamente redondeado (círculos) |

## Componentes

### Botones

- **Primario**: Fondo `--accent`, texto blanco, hover `--accent-hover`
- **Secundario**: Fondo `--bg-tertiary`, texto `--text-secondary`
- **Peligro**: Fondo rojo, texto blanco

### Inputs

- Fondo `--bg-secondary`, borde `--border-subtle`
- Focus: borde `--accent-muted`
- Error: borde rojo

### Cards

- Fondo `--bg-primary`, borde `--border-subtle`, shadow `--shadow-sm`
- Hover: shadow `--shadow-md`

## Convenciones

- **TypeScript** en todas partes
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- **Tokens de diseño** en lugar de colores hardcodeados
- **Comentarios mínimos** que expliquen por qué, no qué
- **Componentes pequeños y reutilizables**
