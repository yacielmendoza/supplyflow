# 02 · Inventario de assets

34 piezas, 24 generaciones (varias familias se producen como *hoja* y se
recortan). Cada fila indica formato de entrega y su destino real en el repo.

Estado: `⬜ pendiente` en todas — esta etapa define, no produce.

---

## A · Núcleo de marca

Sin esto no se genera nada más.

| ID | Asset | Formato final | Tamaño | Destino |
|---|---|---|---|---|
| A1 | Símbolo maestro (3 candidatos → 1) | SVG (vectorizado desde PNG) | caja 24 | `public/brand/symbol.svg` |
| A2 | Rejilla de construcción + clear space | PNG doc | 2048² | `brand/assets/` (documentación) |
| A3 | Lockup horizontal (símbolo + wordmark) | SVG | alto 32 base | `public/brand/lockup-h.svg` |
| A4 | Lockup vertical | SVG | ancho 96 base | `public/brand/lockup-v.svg` |
| A5 | Símbolo monocromo (negro / blanco) | SVG ×2 | caja 24 | `public/brand/symbol-{black,white}.svg` |
| A6 | Favicon optimizado (redibujado a 16/32 px) | SVG + ICO | 16, 32 | `public/favicon.svg` |
| A7 | Patrón de marca repetible (G3 + G4) | PNG tileable | 1024² | `public/brand/pattern.png` |

> **A1 y A3 se vectorizan a mano.** El PNG de GPT Image es la referencia de
> diseño; el archivo que se shippea es SVG limpio. No mandes un trace automático
> a producción sin limpiar nodos.

---

## B · Identidad de plataforma (PWA / tienda)

| ID | Asset | Formato | Tamaño | Destino |
|---|---|---|---|---|
| B1 | App icon iOS (sin recorte, sin esquinas — iOS las aplica) | PNG opaco | 1024² | `public/icons/ios-1024.png` |
| B2 | Android adaptive — capa foreground | PNG transparente | 1024² | `public/icons/android-fg.png` |
| B3 | Maskable PWA (símbolo dentro del 40% de zona segura) | PNG opaco | 512², 192² | `public/icons/maskable-{512,192}.png` |
| B4 | Monochrome icon (silueta blanca, Android themed) | PNG transparente | 512² | `public/icons/monochrome.png` |
| B5 | Splash screen — oscuro y claro | PNG | 1290×2796 | `public/splash/{dark,light}.png` |
| B6 | Icono de notificación (silueta blanca plana) | PNG transparente | 96² | `public/icons/notification.png` |

**Reemplaza:** `public/icon.svg` (la llama actual) y el array `icons` de
`public/manifest.json`, que hoy declara un único SVG `any maskable` — no cubre
maskable real ni monochrome.

---

## C · Onboarding

Cuatro pantallas + el ancla de estilo. El copy va en el DOM vía `t.xxx`, **nunca
quemado en la imagen**.

| ID | Asset | Concepto | Ratio | Destino |
|---|---|---|---|---|
| **C0** | **Ancla de estilo** | No se shippea. Es la referencia maestra de todo lo visual | 1:1 | `brand/assets/style-anchor.png` |
| C1 | Onboarding 1 | *Tu stock, en una sola lista* — silueta frente a un panel de niveles | 3:4 | `public/illustration/onboarding-01.png` |
| C2 | Onboarding 2 | *Marca el mínimo, no el inventario* — un solo nivel cae bajo la línea | 3:4 | `public/illustration/onboarding-02.png` |
| C3 | Onboarding 3 | *El pedido viaja solo hasta la compra* — el flujo G3 conecta cocina y compra | 3:4 | `public/illustration/onboarding-03.png` |
| C4 | Onboarding 4 | *Listo* — permisos de notificación + instalación PWA | 3:4 | `public/illustration/onboarding-04.png` |

**Pantalla nueva a construir en etapa 2:** `src/components/Onboarding.tsx`,
lazy-loaded, mostrada una sola vez antes de `LoginScreen`, persistida en
`restosupply_onboarding_seen`.

---

## D · Estados vacíos y de sistema

Hoy la app resuelve el vacío con texto plano (`t.dashEmpty` = "Nada por aquí
todavía"). Estas siete piezas son la mayor ganancia percibida por esfuerzo.

| ID | Asset | Dónde | Ratio |
|---|---|---|---|
| D1 | Sin pedidos | `RequestsList` | 1:1 |
| D2 | Checklist completo (celebración) | `DailyChecklist` al terminar | 1:1 |
| D3 | Sin notificaciones | `NotificationsView` | 1:1 |
| D4 | Sin resultados de búsqueda | `AdminCatalog`, `ShoppingView` | 1:1 |
| D5 | Catálogo vacío | `AdminCatalog` | 1:1 |
| D6 | Sin conexión | banner de reconexión (`t.reconnecting`) | 1:1 |
| D7 | Error genérico | fallback de `api.ts` | 1:1 |

Destino: `public/illustration/empty-{01..07}.png`, 512² transparente.
**Etapa 2:** un componente `EmptyState.tsx` compartido — hoy el patrón está
duplicado en al menos cuatro vistas.

---

## E · Sistema de contenido

Se generan como **hojas** (una sola imagen con rejilla) y se recortan. Es la
única forma de conseguir que 8 iconos parezcan de la misma familia.

| ID | Asset | Contenido | Generación |
|---|---|---|---|
| E1 | Hoja de iconos de categoría | 8 celdas: proteínas · lácteos · frutas y verduras · secos y abarrotes · bebidas · congelados · limpieza · desechables | 1 hoja 4×2, 4k, 1:1 |
| E2 | Avatares de rol | 3 celdas: Cocina · Compra · Admin | 1 hoja 3×1, 2k, 3:2 |
| E3 | Marcas de restaurante placeholder | 6 celdas, misma forma, 6 colorways | 1 hoja 3×2, 2k, 3:2 |
| E4 | Insignias de racha | 5 niveles: 3 · 7 · 14 · 30 · 90 días de checklist | 1 hoja 5×1, 2k, 16:9 |

Destino: `public/icons/category/*.png` (128² c/u), `public/avatars/role-*.png`,
`public/brand/restaurant-*.png`, `public/badges/streak-*.png`.

> E1 sustituye el color plano por categoría que hoy vive en
> `RESTAURANT_COLOR_TOKENS` (`src/lib/colors.ts`) — el token de color se mantiene,
> el icono se suma.

---

## F · Marketing y tienda

| ID | Asset | Ratio | Tamaño | Destino |
|---|---|---|---|---|
| F1 | OG / share card | 16:9 | 1200×630 (recorte) | `public/og.png` + `<meta og:image>` |
| F2 | Feature graphic de tienda | 16:9 | 1024×500 | fuera del repo |
| F3 | Screenshots de tienda (5 frames) | 9:16 | 1290×2796 | fuera del repo |
| F4 | Hero de landing | 16:9 | 2560×1440 | fuera del repo |
| F5 | Cabecera de email | 3:2 | 1200×400 | fuera del repo |

F3 usa **capturas reales** de la app dentro de un marco de dispositivo, no UI
inventada. Ver la regla en [`04-prompts-gpt-image-2.md`](04-prompts-gpt-image-2.md#f--marketing).

---

## Resumen de esfuerzo

| Bloque | Generaciones | Bloquea a |
|---|---|---|
| A (núcleo) | 3 candidatos + 4 | todo |
| C0 (ancla) | 1 | C, D, E |
| B (plataforma) | 5 | — |
| C (onboarding) | 4 | — |
| D (vacíos) | 7 | — |
| E (hojas) | 4 | — |
| F (marketing) | 5 | necesita A + capturas reales |
| **Total** | **~24 llamadas** | |
