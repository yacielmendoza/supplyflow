# 03 · Workflow de generación

> **El orden no es opcional.** Cada fase produce la referencia que la siguiente
> necesita. Saltarte una fase no ahorra tiempo: produce un set que no se ve como
> un sistema, y regenerar cuesta más que esperar.

---

## Parámetros reales de GPT Image 2.0

Consultados del catálogo del modelo, no de memoria:

| Parámetro | Valores | Nota |
|---|---|---|
| `resolution` | `1k` · `2k` · `4k` | por defecto `1k` |
| `quality` | `low` · `medium` · `high` | por defecto `low` — **súbelo siempre** |
| `aspect_ratio` | `1:1` `4:3` `3:4` `16:9` `9:16` `3:2` `2:3` | no hay ratios libres |
| `medias[]` | array de imágenes de referencia | `Image0` = primera, `Image1` = segunda… |

**Fortalezas del modelo que este workflow explota:** `text-rendering`,
`typography`, `editing`, `4k`. Es decir: es bueno editando una base existente
preservándola, y bueno con texto grande. Es *malo* con texto pequeño y con
mantener estilo entre llamadas sin referencia.

**Regla de presupuesto por asset:**

| Tipo de asset | resolution | quality |
|---|---|---|
| Símbolo, iconos, estados vacíos | `2k` | `high` |
| Hojas que se van a recortar (E1–E4) | `4k` | `high` |
| Onboarding, splash, marketing | `2k` | `high` |
| Exploración / candidatos descartables | `1k` | `medium` |

---

## Grafo de dependencias

```
FASE 0  ── Paleta (determinista, sin generación)
                │
FASE 1  ── A1 Símbolo maestro ×3 candidatos ─── ⏸ ELECCIÓN HUMANA
                │
                ├── A2 rejilla        ┐
                ├── A3 lockup h       │  todos usan A1 como Image0
                ├── A4 lockup v       │
                ├── A5 monocromo      ┘
                │
FASE 2  ── B1 · B2 · B3 · B4 · B6   (Image0 = A1)
           B5 splash                 (Image0 = A3 lockup, Image1 = A7 patrón)
                │
FASE 3  ── C0 ANCLA DE ESTILO ──────────── ⏸ ELECCIÓN HUMANA
                │   (Image0 = A1 · solo para ADN de forma y color)
                │
        ┌───────┼────────────┬─────────────┐
        │       │            │             │
       C1 ─→ C2 ─→ C3 ─→ C4  D1..D7      E1..E4
     (encadenados)        (C0 como Image0) (C0 + fragmento de C1)
                │
FASE 4  ── A7 patrón   (Image0 = C0)
                │
FASE 5  ── F1..F5   (Image0 = A3 · Image1 = capturas REALES de la app)
```

Dos únicas puertas de aprobación humana: **A1** (¿cuál es nuestro símbolo?) y
**C0** (¿cuál es nuestro estilo de ilustración?). Todo lo demás es derivación.

---

## Fase 0 · Paleta — sin generación

Ya está resuelta en [`01-brand-lock.md#paleta`](01-brand-lock.md#paleta) y
contrastada. No generes un "moodboard de paleta": los valores hex son
deterministas y un modelo generativo no puede darte un `#C9FA43` exacto. El
board de revisión, si lo quieres, se hace en HTML/CSS.

---

## Fase 1 · Símbolo maestro

**Genera los 3 candidatos con parámetros idénticos.** Si varías `resolution` o
`quality` entre ellos, estás comparando calidades de render, no ideas.

| Candidato | Ruta | Mecanismo en una frase |
|---|---|---|
| **A1-a** | Abstracto | Un contenedor de esquinas redondeadas relleno hasta un nivel, atravesado por la línea de mínimo que se recorta en negativo del contorno |
| **A1-b** | Lettermark | La **S** construida como dos arcos de flujo con una interrupción exacta en el punto donde cruza la línea de mínimo |
| **A1-c** | Pictórico | Una caja de suministro vista de frente, cuya tapa entreabierta forma la línea de mínimo saliendo por la derecha |

Los tres: `1:1`, `2k`, `high`, fondo transparente, **sin texto**, sin referencias.

### Después de elegir

Con el candidato ganador como `Image0`, genera A2, A3, A4, A5 en **la misma
sesión y en ese orden**. El lockup (A3) es el asset más frágil del set: lleva el
wordmark "SupplyFlow" renderizado, y ahí es donde el modelo puede alterar
letterforms. Revísalo carácter por carácter antes de seguir.

**Antes de la Fase 2, vectoriza A1 y A3.** Todo lo demás puede vivir como PNG;
la marca no.

---

## Fase 2 · Iconos de plataforma

Cada uno con `Image0 = A1 (símbolo aprobado)` y la instrucción de **preservar
geometría exacta**, no reinterpretar.

Puntos que se fallan siempre y hay que instruir explícitamente:

- **B1 iOS**: lienzo **cuadrado y lleno, sin esquinas redondeadas propias**. iOS
  aplica la máscara. Si generas el icono ya redondeado, sale un doble redondeo.
- **B3 maskable**: el símbolo debe caber en el **40% central**. Android recorta
  hasta un círculo. Instruye "safe zone" explícitamente o perderás los extremos
  de la línea de mínimo, que es justo lo distintivo.
- **B4 monochrome**: silueta blanca pura sobre transparente, **sin lima**. El
  sistema tinta el icono; cualquier color se pierde.
- **B6 notificación**: igual que B4 pero simplificado a una sola forma sólida —
  a 24 px la línea de mínimo desaparece; usa solo el contenedor.

---

## Fase 3 · El ancla de estilo (C0)

**Esta es la pieza más importante de todo el pipeline.**

C0 no se shippea. Es una sola imagen 1:1 que fija, en un único render:

1. el peso de trazo exacto,
2. la proporción de lima frente a negro,
3. cómo se dibuja una silueta humana en este sistema,
4. cómo se dibujan los cuatro dispositivos gráficos (G1–G4),
5. el radio de esquina de los objetos ilustrados.

Todo asset de las fases 3 y 4 la lleva como `Image0`. Es la diferencia entre "12
ilustraciones bonitas" y "un sistema".

**Genera 2 variantes de C0 y elige una.** Es la segunda y última puerta humana.
Una vez elegida, congélala: si más adelante decides cambiarla, **todo C, D y E
quedan invalidados** y hay que regenerarlos.

---

## Fase 3b · Encadenamiento dentro de cada familia

Tres patrones distintos según lo que necesite consistencia:

### Patrón "cadena" — para el onboarding (C1→C4)

El personaje debe ser reconociblemente **la misma silueta** en las cuatro
pantallas. Encadena:

```
C1: Image0 = C0
C2: Image0 = C0   Image1 = C1   ("misma silueta y proporciones que Image1")
C3: Image0 = C0   Image1 = C2
C4: Image0 = C0   Image1 = C3
```

Nunca encadenes más de un eslabón hacia atrás: la deriva se acumula. Siempre
`C0` en `Image0` como ancla dura.

### Patrón "estrella" — para los estados vacíos (D1–D7)

No comparten personaje, solo lenguaje. Todos cuelgan directo del ancla:

```
D1..D7: Image0 = C0   (sin encadenar entre sí)
```

Puedes lanzarlos en paralelo. Si uno sale mal, se regenera solo, sin tocar los demás.

### Patrón "hoja y recorte" — para las familias (E1–E4)

**Una sola generación** que contiene toda la familia en una rejilla, a `4k`, y
después se recorta con cualquier herramienta de imagen.

```
E1: Image0 = C0  →  una hoja 4×2 con las 8 categorías  →  recortar a 8 PNG
```

Por qué: ocho llamadas separadas dan ocho pesos de trazo distintos. Una hoja los
dibuja en el mismo pase, con el mismo pincel. Es la técnica que más consistencia
compra por generación.

En el prompt de hoja hay que ser explícito con la rejilla: *"8 cells in a 4×2
grid, equal cell size, generous identical padding in every cell, thin neutral
separator lines, each icon optically centred in its own cell, all icons at the
same visual weight and the same stroke width."*

---

## Fase 5 · Marketing

**Regla dura:** las capturas de pantalla de F1–F4 son **capturas reales de la
app**, subidas como referencia. Nunca le pidas al modelo que invente una
interfaz. Genera UI plausible pero falsa — microcopy inventado, cifras que no
existen, componentes que la app no tiene — y eso es exactamente lo que un
revisor de tienda y un usuario detectan primero.

Flujo correcto para un screenshot de tienda:

1. Corre la app, captura la pantalla real a 1290×2796.
2. Súbela como `Image1`.
3. `Image0 = A3` (lockup).
4. El prompt pide componer marco de dispositivo + fondo de marca + titular,
   **preservando la captura sin alterar un solo píxel de su contenido**.

---

## Reglas de referencia (aplican a todo el pipeline)

1. **Máximo 3 referencias.** A partir de la cuarta el modelo empieza a promediar
   en vez de obedecer.
2. **Cada referencia se etiqueta con su rol y con lo que NO controla.** Ejemplo:
   *"Image0 is the style reference: it defines stroke weight, colour proportion
   and shape language. It does NOT define the subject or the composition."*
   Esta segunda mitad es la que la gente omite, y es la que evita que el modelo
   te copie la escena entera.
3. **Nunca re-subas un resultado que ya está referenciado.** Reutiliza el mismo
   id / archivo. Duplicar la referencia duplica su peso.
4. **Un concepto por prompt.** Si el prompt contiene "y también", pártelo en dos
   assets.
5. **`quality: high` desde el primer intento** en cualquier pieza que vaya a
   producción. Iterar sobre un `low` te hace tomar decisiones sobre artefactos.
6. **Regenerar, no parchear.** Si una pieza falla, arregla el prompt y
   regenérala; no la edites encima. Editar encima acumula deriva.

---

## Puntos de parada

Detente y reporta en vez de seguir generando cuando:

- El modelo altera las letterforms del wordmark en A3 tras dos intentos → el
  wordmark se compone tipográficamente con la fuente real, no se genera.
- El símbolo pierde geometría al vectorizarlo → hay que redibujarlo a mano en
  vector; el PNG solo sirve de referencia.
- Una hoja (E) sale con pesos de trazo desiguales tras dos intentos → baja a
  celdas de 4 y haz dos hojas.
- Cualquier asset introduce un color fuera de la paleta → es señal de que el
  bloque `[BRAND LOCK]` no se pegó completo.
