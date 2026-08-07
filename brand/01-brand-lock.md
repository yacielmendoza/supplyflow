# 01 · Brand Lock

> Fuente única de verdad. Cada prompt de generación copia **literalmente** los
> bloques marcados como `LOCK`. Si algo aquí cambia, todo lo que dependa de ello
> queda invalidado y se regenera (ver [`05-qa-y-entrega.md`](05-qa-y-entrega.md)).

---

## 1. Contexto de marca

| Campo | Valor | Estado |
|---|---|---|
| Nombre | **SupplyFlow** (una palabra, S y F mayúsculas) | `fixed` |
| Producto | Coordinación de abastecimiento para grupos de restaurantes, por **mínimos operativos** | `fixed` |
| Industria | Operaciones de restaurante / back-of-house | `fixed` |
| Posicionamiento | La cocina no reporta inventario: reporta lo que bajó del mínimo. La app convierte esa señal en compra ejecutada | `fixed` |
| Audiencia | Cocina (manos ocupadas, prisa, ruido), Compra (en ruta, en mercado, una mano), Admin (control, métricas) | `fixed` |
| Tono | Operativo, directo, sin adorno. Confiable como una herramienta, no cálido como una app de consumo | `proposed` |
| Idiomas | ES (primario) / EN | `fixed` |

> ⚠️ **Nota de nomenclatura pendiente.** `translations.ts` declara
> `appName: 'RestoSupply'`, pero `manifest.json`, `index.html` y `LoginScreen.tsx`
> dicen **SupplyFlow**. Todo este sistema asume **SupplyFlow**. Alinear
> `translations.ts` es parte de la etapa 2 — no generes ningún asset con
> "RestoSupply".

---

## 2. Concepto central

### `LOCK` — Premisa visual

> **El umbral.** Un nivel que cae y una línea que marca dónde deja de ser
> aceptable. Todo el sistema gráfico es una variación de *algo cruzando una línea*.

Esto es literalmente lo que hace el producto (mínimos operativos), así que no es
una metáfora prestada: es el mecanismo del negocio dibujado. Un solo movimiento
expresivo — la línea — y el resto del sistema en silencio.

**Principios que se derivan:**

1. **Estado antes que objeto.** No dibujamos comida, cajas ni camiones. Dibujamos
   *niveles, umbrales y flujo*.
2. **Un solo acento.** El lima solo aparece donde hay señal: el umbral, el estado
   activo, la acción primaria. Nunca decora.
3. **Geometría ortogonal.** Horizontales y verticales; diagonales solo a 45°.
   Legible a 16 px, legible desde la puerta de una cámara de frío.
4. **Sin cara.** Los personajes son siluetas. Es más inclusivo, y es la única
   forma de que 12 ilustraciones generadas parezcan la misma persona.

### `LOCK` — Prohibiciones (nunca, en ningún asset)

```
NEVER: llamas o fuego (colisiona con el icono de "urgente" en la UI),
hojas / brotes / ramas, gorros de chef, carritos de compra, camiones de
reparto, escudos, chispas o destellos, globos terráqueos, degradados
arbitrarios, mesh gradients, brillo plástico, 3D, isométrico, bloom,
sombras largas, texto falso / microcopy inventado dentro de ilustraciones,
caras con rasgos detallados, marcas de agua, stock-photo look,
lima como color de texto sobre blanco.
```

---

## 3. Paleta

Derivada de la UI de referencia: **lima ácido sobre casi-negro, superficies
blancas puras, neutros fríos.** Todos los pares de uso están verificados contra
WCAG 2.2 AA (≥ 4.5:1 para texto).

### `LOCK` — Acento

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `lime-400` | `#D8FF6B` | Hover del acento en tema oscuro, glow | — |
| **`lime-500`** | **`#C9FA43`** | **Acento primario.** Relleno de botón, umbral, estado activo | 16.06:1 sobre `#0B0C0E` ✅ |
| `lime-600` | `#A8DB1E` | Presionado, bordes de acento | — |
| `lime-700` | `#7FA80F` | **Solo relleno.** 2.8:1 sobre blanco → ❌ nunca como texto | — |
| `lime-800` | `#4D6B08` | Acento **como texto** en tema claro | 6.14:1 sobre `#FFFFFF` ✅ |

**Regla de contraste del acento:** el texto sobre un relleno lima siempre es
`#0B0C0E` (16.06:1). Blanco sobre lima está prohibido.

### `LOCK` — Neutros

| Token | Hex | Rol |
|---|---|---|
| `ink-950` | `#0B0C0E` | Fondo de app (tema oscuro) · texto (tema claro) |
| `ink-900` | `#121317` | Superficie / tarjeta (oscuro) |
| `ink-850` | `#16181D` | Superficie secundaria (oscuro) |
| `ink-800` | `#1D2026` | Superficie hover (oscuro) |
| `ink-700` | `#262A32` | Borde (oscuro) |
| `ink-600` | `#383D47` | Borde fuerte (oscuro) |
| `gray-400` | `#9AA0AB` | Texto atenuado (oscuro) — 7.06:1 sobre `ink-900` ✅ |
| `gray-500` | `#5A616C` | Texto atenuado (claro) — 6.25:1 sobre blanco ✅ |
| `paper-100` | `#F4F5F7` | Fondo de app (tema claro) |
| `paper-200` | `#EEF0F3` | Superficie secundaria (claro) |
| `paper-300` | `#E4E7EC` | Borde (claro) |
| `paper-400` | `#CDD2DA` | Borde fuerte (claro) |
| `white` | `#FFFFFF` | Superficie / tarjeta (claro) · texto (oscuro) |

### `LOCK` — Semánticos

Reafinados para convivir con el lima sin competir con él. Cada hue tiene un valor
por tema porque el mismo hex no puede pasar AA en ambos fondos.

| Rol | Oscuro | Claro | Contraste |
|---|---|---|---|
| Urgente / error | `#FF4D5E` | `#C2183A` | 5.72 / 6.02 ✅ |
| Atención / pendiente | `#FFB020` | `#9A5B00` | 10.15 / 5.43 ✅ |
| Información / en curso | `#4CC2FF` | `#0B6E9E` | 9.25 / 5.62 ✅ |
| Auxiliar / categoría | `#A98BFF` | `#5B32C7` | 6.92 / 7.70 ✅ |

**Reparto de color en ilustración (2.5 colores):** casi-negro + lima + **un solo**
neutro de apoyo por pieza. Los semánticos no entran en ilustración; viven solo en
la UI.

---

## 4. Tipografía

### `LOCK` — Sistema

| Rol | Familia | Fuente | Pesos | Notas |
|---|---|---|---|---|
| Display | **Schibsted Grotesk** | Google Fonts | 700, 800 | Grotesca nórdica, tracking cerrado, carácter técnico-operativo. Empareja con la geometría ortogonal del símbolo |
| Cuerpo | **Inter** | Google Fonts | 400, 500, 600 | Legibilidad a 13–15 px en cocina; **cifras tabulares** (`font-variant-numeric: tabular-nums`) obligatorias en cantidades y contadores |
| Mono | **JetBrains Mono** | Google Fonts | 400, 500 | SKUs, códigos de pedido, timestamps |

**Alternativa aprobable (opción B):** *Bricolage Grotesque* 700–800 como display,
mismo cuerpo. Más editorial y con eje óptico; elígela si quieres más personalidad
y menos neutralidad. Una u otra — no ambas.

**Reglas:**
- Números siempre tabulares. Una lista de cantidades que "baila" al actualizarse
  en tiempo real (Realtime de Supabase) es un bug visual.
- Tracking del display: `-0.02em` en tamaños ≥ 24 px, `0` por debajo.
- Nunca el display para texto corrido. Nunca el mono para copy.

---

## 5. Lenguaje de forma

### `LOCK`

```
Radios:        12 (chips) · 20 (inset) · 26 (tarjeta) · 34 (contenedor) · 999 (píldora)
Bordes:        1 px, siempre el token de borde del tema, nunca color puro
Sombras:       oscuro → casi ninguna, la jerarquía la da la superficie
               claro → suave y baja, difusa, nunca dura
Trazo (icono): 2 px a 24 px de caja, extremos y uniones redondeados
Trazo (ilus.): 3.5% del lado mayor del canvas, uniforme, extremos redondeados
Geometría:     horizontales y verticales; diagonales solo a 45°
Rejilla:       base 4 px · escala de espaciado 4 8 12 16 24 32 48 64
Objetivo táctil: ≥ 44 px siempre
```

La UI de referencia es **muy redonda** (píldoras completas en nav y botones,
tarjetas de radio grande). Ese es el registro: contenedores generosos, contenido
denso dentro.

---

## 6. Dispositivos gráficos

Los cuatro elementos que hacen que un asset se reconozca como SupplyFlow sin
llevar el logo encima.

| # | Dispositivo | Qué es | Dónde aparece |
|---|---|---|---|
| **G1** | **La línea de mínimo** | Barra horizontal lima de extremo redondeado que cruza toda la pieza y sobresale ligeramente por la derecha | Símbolo, onboarding, estados vacíos, insignias |
| **G2** | **El nivel** | Contenedor de esquinas redondeadas relleno hasta una altura; sólido bajo la línea, solo contorno por encima | Símbolo, iconos de categoría, gráficos |
| **G3** | **El flujo** | Trayecto continuo de extremos redondeados, giros solo a 90° o 45°, con un punto lima en el nodo activo | Onboarding, ilustración de proceso, patrón |
| **G4** | **La retícula** | Rejilla de puntos de 4 px al 4% de opacidad sobre el fondo | Fondos de splash, marketing, cabeceras |

---

## 7. Composición

```
Jerarquía:        un foco por pieza; el resto es espacio negativo
Espacio negativo: ≥ 25% del canvas en toda ilustración
Logo:             esquina superior izquierda en marketing; centrado en splash e icono
Clear space:      1× la altura del símbolo por los cuatro lados
Fondo ilustración: transparente (PNG). El color de fondo lo pone la app, no la imagen
Encuadre:         frontal u ortogonal. Nunca perspectiva de tres puntos, nunca isométrico
```

---

## 8. Bloque a pegar en cada prompt

Este es el bloque `[BRAND LOCK]` literal. Va **al final** de cada prompt de
generación, sin modificar. Ajusta solo la línea de paleta cuando la pieza use un
subconjunto.

```text
[BRAND LOCK — DO NOT DEVIATE]
Brand: SupplyFlow (never render the name unless the prompt explicitly asks for it).
Palette: near-black #0B0C0E, acid lime #C9FA43, pure white #FFFFFF, cool grey #9AA0AB.
Use exactly these hex values. No other colours.
Shape language: rounded rectangles, corner radius generous and consistent,
uniform rounded-cap strokes, strictly horizontal and vertical geometry,
diagonals only at 45 degrees.
Signature device: a single acid-lime horizontal bar with rounded caps that
crosses the composition and extends slightly past the form on the right.
Style: flat vector, solid fills, no gradients, no shadows, no texture, no 3D,
no bevel, no glow, no outline stroke around the whole image.
Negative space: at least 25 percent of the canvas.
Never: flames, fire, leaves, sprouts, chef hats, shopping carts, delivery trucks,
shields, sparkles, globes, gradient meshes, plastic sheen, isometric projection,
bloom, long shadows, watermarks, invented text or fake UI microcopy,
detailed facial features, lime-coloured text on a white background.
```
