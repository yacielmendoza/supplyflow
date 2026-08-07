# 05 · QA, nomenclatura y entrega

Asume que la primera pasada tiene inconsistencias. Se revisa **el set como
sistema**, no cada pieza por separado.

---

## 1. Preflight — antes de gastar una generación

- [ ] El bloque `<<LOCK>>` está sustituido por el bloque completo, sin recortar
- [ ] Las referencias correctas están adjuntas, en el orden correcto (`Image0` primero)
- [ ] Cada referencia dice en el prompt **qué controla y qué NO controla**
- [ ] `quality: high` y la `resolution` que marca la tabla de presupuesto
- [ ] El `aspect_ratio` es uno de los siete soportados
- [ ] La pieza tiene un destino real en `02-inventario-de-assets.md`
- [ ] Si lleva texto literal, está escrito con tildes y ñ en el prompt

No generes extras especulativos. Que una generación salga "bonita" no la aprueba.

---

## 2. Matriz de consistencia del set

Se rellena una vez producidos C, D y E, y se mira en horizontal:

| Asset | Peso de trazo | Radios | Proporción de lima | Silueta | Rejilla de fondo | Estado |
|---|---|---|---|---|---|---|
| C0 | referencia | referencia | referencia | referencia | referencia | — |
| C1 | | | | | | |
| C2 | | | | | | |
| C3 | | | | | | |
| C4 | | | | | | |
| D1–D7 | | | n/a | n/a | | |
| E1–E4 | | | | | | |

Una pieza pasa solo si sigue el mismo Brand Lock. Una diferencia sin justificar
documentada es **deriva**, no estilo.

**El fallo más frecuente:** el peso de trazo. Ponlas todas a la misma altura en
una fila y míralas de lejos — la que "pesa" distinto salta de inmediato.

---

## 3. Checklist por módulo

### Marca (A)

- [ ] El símbolo sigue legible reducido a 16 px
- [ ] El knock-out donde la barra cruza el contorno **sigue abierto** (es lo distintivo)
- [ ] "SupplyFlow" está escrito exacto — S y F mayúsculas, sin espacio
- [ ] Las letterforms del lockup vertical son idénticas a las del horizontal
- [ ] El monocromo no perdió ninguna forma al pasar a un solo color
- [ ] La versión vectorizada mantiene la geometría, sin nodos basura

### Plataforma (B)

- [ ] B1 tiene esquinas **cuadradas** (no redondeadas por la imagen)
- [ ] En B3, todo el símbolo cabe en el círculo central del 40% — incluida la punta de la barra
- [ ] B4 y B6 no tienen nada de lima
- [ ] B6 sigue siendo legible a 24 px
- [ ] Splash: existen las dos versiones y ambas tienen el lockup ópticamente centrado
- [ ] `manifest.json` declara `any`, `maskable` y `monochrome` como entradas separadas

### Ilustración (C, D)

- [ ] Ninguna ilustración contiene texto, números ni microcopy inventado
- [ ] Ninguna cara tiene rasgos
- [ ] El lima aparece **una sola vez** por pieza en los spots (D)
- [ ] Fondo realmente transparente, no blanco
- [ ] La silueta de C1→C4 es reconociblemente la misma persona
- [ ] Hay espacio libre suficiente arriba para el titular del DOM

### Hojas (E)

- [ ] Todas las celdas son del mismo tamaño y el padding es idéntico
- [ ] Los 8 iconos tienen el mismo peso de trazo — este es **el** criterio
- [ ] Al recortar, cada icono queda ópticamente centrado en su lienzo de 128²
- [ ] Ningún icono se lee como comida fotorrealista

### Marketing (F)

- [ ] La captura dentro del marco es la captura real, píxel a píxel
- [ ] No hay una sola palabra de interfaz inventada
- [ ] Las tildes del titular están renderizadas (`mínimo`, `catálogo`)
- [ ] No hay badges de tienda, estrellas ni valoraciones inventadas

---

## 4. Reparación

Cuando algo falla:

1. Nombra **qué regla del Brand Lock** se rompió.
2. Decide si el arreglo es generativo o determinista. Recortar, reescalar,
   recentrar y limpiar alfa son deterministas — no gastes una generación en eso.
3. Deja el Brand Lock y todas las piezas que pasan **sin tocar**.
4. Regenera solo la pieza fallida, con el prompt corregido.
5. Vuelve a correr su checklist de módulo y la matriz del set.

**Propagación de invalidaciones:**

| Si cambias… | Se invalida… |
|---|---|
| A1 (símbolo) | A2, A3, A4, A5, todo B, F1, F2, F3 |
| C0 (ancla) | todo C, todo D, todo E |
| La paleta | **todo** |
| Un titular de F3 | solo ese frame |

---

## 5. Nomenclatura

```
sf-symbol-v1.svg
sf-lockup-h-v1.svg
sf-icon-ios-1024-v1.png
sf-icon-maskable-512-v1.png
sf-onboarding-01-v1.png
sf-empty-sin-pedidos-v1.png
sf-category-proteinas-v1.png
sf-badge-streak-30-v1.png
sf-store-screenshot-03-v1.png
```

Regla: `sf-{familia}-{pieza}-{tamaño?}-v{n}`. Sin espacios, sin tildes, sin
mayúsculas. Debe poder pedirse "regenera `sf-empty-sin-pedidos`" sin ambigüedad
y sin tocar nada más.

---

## 6. Optimización antes de shippear

La app es una PWA mobile-first con presupuesto de bundle vigilado
(`vite.config.ts` ya separa chunks). Los assets nuevos no pueden deshacer eso:

- PNG de ilustración → **WebP**, calidad 82. Ahorro típico 60–70%.
- Iconos y símbolo → **SVG**, nunca PNG.
- Ilustraciones de onboarding → `loading="lazy"` salvo la primera.
- Splash → PNG (los generadores de splash de iOS no aceptan WebP).
- Ninguna ilustración por encima de **80 KB** ya optimizada. Si una lo supera,
  es que tiene detalle que el estilo no debería tener.
- Todo lo decorativo va con `alt=""` y `aria-hidden="true"`; las ilustraciones
  informativas de los estados vacíos llevan `alt` traducido vía `t.xxx`.

---

## 7. Límites conocidos — decláralos, no los escondas

| Límite | Consecuencia |
|---|---|
| GPT Image 2.0 entrega ráster | A1 y A3 hay que vectorizarlos; el PNG no es el archivo de marca |
| Texto pequeño poco fiable | Ninguna ilustración lleva texto; el copy vive en el DOM |
| Deriva entre llamadas | Sin `C0` como `Image0`, la consistencia no se sostiene |
| Letterforms del wordmark | Si el modelo las altera dos veces, se compone tipográficamente con Schibsted Grotesk real |
| Sin control de semilla | Dos ejecuciones del mismo prompt no son idénticas; la referencia es el único control real |
| Ratios cerrados | 1200×630 (OG) no es un ratio nativo: se genera 16:9 y se recorta |

---

## 8. Manifiesto de entrega

Al cerrar la producción, rellena y entrega esto:

```text
Brand Lock:        v1
Concepto:          El umbral
Símbolo elegido:   A1-{a|b|c}
Ancla de estilo:   C0-{1|2}
Tipografía:        Schibsted Grotesk 700/800 + Inter 400/500/600 + JetBrains Mono
Archivos vector:   
Archivos ráster:   
Fuentes a instalar:
Límites conocidos: 
Piezas pendientes: 
```

---

## 9. Etapa 2 — integración en el código

Fuera del alcance de esta etapa, pero es el destino de todo esto. En orden de
impacto:

1. **Aplicar `tokens-propuestos.css`** sobre `src/index.css` y hacer pasada visual
   en ambos temas (agente `visual-qa`) y de contraste (agente `wcag-auditor`).
2. **Sustituir la marca**: `public/icon.svg`, el bloque `icons` de
   `manifest.json`, y el icono `Flame` en `Header.tsx:78` y `LoginScreen.tsx:101`.
   Al hacerlo desaparece la colisión semántica con "urgente".
3. **Alinear `appName`** en `translations.ts` — hoy dice `RestoSupply`.
4. **`EmptyState.tsx` compartido**, consumiendo D1–D7; hoy el patrón está
   duplicado en cuatro vistas.
5. **`Onboarding.tsx`** lazy-loaded, una sola vez, persistido en
   `restosupply_onboarding_seen`, con C1–C4 y respeto a `prefers-reduced-motion`.
6. **Iconos de categoría** (E1) sumados a `RESTAURANT_COLOR_TOKENS` en
   `src/lib/colors.ts`, sin sustituir el token de color existente.
7. **Insignias de racha** (E4) — requiere lógica de racha nueva; es la única pieza
   del inventario que necesita producto además de diseño.
