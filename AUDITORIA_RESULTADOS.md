# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-07-31 13:20 UTC
**Commit auditado:** `7cd65cd` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** sistema de diseño por tokens, shell (Header/BottomNav/Dashboard/ViewHeader), vistas de pantalla completa (AccountView, NotificationsView, ShoppingView), pantallas migradas (RequestsList, DailyChecklist, AdminCatalog, LoginScreen), i18n, accesibilidad, responsive/safe-areas, compilación.

## VEREDICTO: CON HALLAZGOS

No hay hallazgos que rompan la compilación ni modales residuales, pero sí 2 hallazgos de severidad Alta (persistencia de tema/idioma y de catálogo admin) y varios de severidad Media/Baja en accesibilidad, consistencia visual e i18n. Ninguno bloquea el uso de la app hoy, pero todos son accionables y deben cerrarse antes de considerar el rediseño "clase mundial" terminado.

---

## (b) Estado de build/tsc

- `npx tsc --noEmit` → **sin errores** (exit 0).
- `npm run build` (vite build + esbuild server.ts) → **compila sin errores** (exit 0).
  - Aviso no bloqueante de Vite: `dist/assets/index-*.js` = 608.02 kB (159.31 kB gzip), por encima del umbral de 500 kB de aviso de chunk. No es un defecto de esta auditoría (no estaba en los 9 criterios) pero es una mejora recomendable para "clase mundial" — ver sección de mejoras.

---

## (c) Hallazgos por severidad

### 🔴 Crítico

Ninguno.

### 🟠 Alto

**A1 — Tema e idioma NO persisten tras recargar la página.**
`src/App.tsx:56-57` inicializa `currentUser` en `null` y `appLanguage` en `'es'` sin leer ningún storage. El tema (`currentUser.theme`, `App.tsx:515`) y el idioma (`currentUser.language`, `App.tsx:514`) sólo existen en el objeto `currentUser`, que vive en estado de React puro. `handleSaveProfile` (`App.tsx:85-90`) al cambiar tema/idioma desde `AccountView.tsx:86-95` únicamente hace `setCurrentUser`/`setUsers` — **no hay ningún `localStorage.setItem` para tema/idioma en todo el repo** (los dos únicos usos de `localStorage` son `restosupply_overdue_settings` en `App.tsx:78,480` y `restosupply_read_notifications` en `NotificationsView.tsx:61,70,95`). `fetchUsers()` (`src/lib/api.ts:11-13`) siempre devuelve el array estático `INITIAL_USERS`, ignorando cualquier cambio previo. Confirmado también que `LoginScreen.tsx` no lee ni escribe `localStorage`.
- **Consecuencia real:** al recargar (o reabrir la PWA), el usuario vuelve a `LoginScreen`, y el tema/idioma elegido se pierde — el criterio "tema/idioma persistido" del encargo **no se cumple**.
- **Recomendación:** persistir `currentUser.id` (o al menos `theme`/`language`) en `localStorage` al cambiar, y restaurarlos en el montaje de `App.tsx` antes/junto con `loadInitialData()`.

**A2 — Alta/edición de productos y locales no persiste en el backend (solo en memoria).**
`src/lib/api.ts:194` marca explícitamente la sección `// ── Products (local only for demo) ─────`: `createProduct` (líneas 196-198), `updateProduct` (200-203) y `deleteProduct` (205-207) no tocan Supabase — devuelven objetos sintéticos o `true` sin ninguna escritura real. `handleAddRestaurant` (`App.tsx:472-476`) sólo muta el estado de React con un id generado en cliente; **no existe `createRestaurant` en `src/lib/api.ts` ni en `src/lib/supabase.ts`**. Esto contrasta con `submitDailyChecklist`/`toggleItemPurchased` (`api.ts:101-192`), que sí hacen `supabase.from('sf_supply_requests')...` reales.
- **Consecuencia real:** un admin que agrega o edita un producto/local ve el cambio aplicado en su sesión, pero se pierde al refrescar o no es visible en otro dispositivo — rompe silenciosamente la promesa de sincronización en tiempo real para esta parte de la app, y el criterio 7 ("alta/edición productos/locales") sólo se cumple a medias (UI wired, no hay durabilidad).
- **Recomendación:** decidir si es alcance deliberado de "demo" (en cuyo caso, avisar en UI que estos cambios no persisten) o completar la persistencia en Supabase igual que las solicitudes.

### 🟡 Medio

**M1 — Inconsistencia de radios en el mismo patrón visual (`sf-inset` como tag de categoría).**
`.sf-inset` define `border-radius: 20px` (`src/index.css:79-83`) en la capa `components`, pero las utilidades `rounded-*` de Tailwind viven en la capa `utilities`, que gana siempre por precedencia de cascade-layers (el propio proyecto documenta este mecanismo para `focus-visible` en `index.css:135-140`). El mismo tag de categoría se renderiza a **4px** (`rounded` a secas) en `src/components/ShoppingView.tsx:186` y `src/components/AdminCatalog.tsx:220,278,368`, pero a **8px** (`rounded-lg`) en `src/components/RequestsList.tsx:262,291`. Recomendación: unificar a `rounded-lg` (o quitar el `rounded-*` explícito y dejar que `.sf-inset` decida) en los 4 sitios con 4px.

**M2 — Objetivos táctiles icon-only por debajo de 36px en pantallas móviles.**
- `src/components/RequestsList.tsx:353` — enlace de compartir por WhatsApp: `p-2` + icono `w-4 h-4` ≈ **32px** total.
- `src/components/DailyChecklist.tsx:294` — botón de nota: en móvil (sin el prefijo `sm:`) el texto está oculto (`hidden sm:inline`, línea 297) y sólo queda el icono con `p-2` ≈ **32px**.
Recomendación: subir a `p-2.5`/`w-9 h-9` (36px) como mínimo, idealmente 44px como el resto de los steppers ya corregidos.

**M3 — Accesibilidad: 2 botones stepper sin `aria-label`, 1 botón pierde nombre accesible en móvil, 1 toggle sin `aria-pressed`.**
- `src/components/DailyChecklist.tsx:237-240` y `:242-245` — steppers `-`/`+` de stock: sólo ícono (`Minus`/`Plus`), sin `aria-label`.
- `src/components/DailyChecklist.tsx:293-298` — el botón de nota tiene su etiqueta de texto envuelta en `hidden sm:inline` (línea 297): por debajo de `sm:` el botón queda sin nombre accesible (ni texto visible ni `aria-label` de respaldo).
- `src/components/LoginScreen.tsx:66-72` — el selector de idioma (Globe + "EN"/"ES") no tiene `aria-pressed`, a diferencia del equivalente en `AccountView.tsx:176-183` que sí lo usa.
Recomendación: añadir `aria-label={t.xxx}` a los 3 botones de `DailyChecklist`/`LoginScreen`, y `aria-pressed` al toggle de idioma de `LoginScreen`.

**M4 — Cadenas en español hardcodeadas que no respetan el idioma seleccionado.**
- `src/components/NotificationsView.tsx:55,56` — valores por defecto de los inputs de "notificación de prueba" (`'🚨 ATENCIÓN COCINA / COMPRADORES'`, `'Solicitud #125 generada para Caddy Shack Grill - Falta Tocino y Pan'`), visibles en la UI.
- `src/components/NotificationsView.tsx:108` — `showLocalNotification('Notificaciones Activadas', 'Recibirás alertas instantáneas...')`, título/cuerpo de la notificación del SO siempre en español.
- `src/components/NotificationsView.tsx:120` — texto de plantilla para compartir por WhatsApp, siempre en español.
- `src/components/AdminCatalog.tsx:347` — `<option value="Cafe">Cafe / Desayunos</option>` en el selector de tipo de local; "Desayunos" no está traducido (a diferencia de sus opciones hermanas, que son términos de marca).
Recomendación: mover estos 5 strings a `t.xxx` en `translations.ts` (ES/EN).

**M5 — Divs clicables sin soporte de teclado.**
`src/components/ShoppingView.tsx:152-227` (fila de ítem, `onClick={() => handleCheck(item)}`) y `src/components/NotificationsView.tsx:232-299` (tarjeta de solicitud, `onClick={() => onSelectRequest?.(req.id)}`) son `<div>` con `onClick` pero sin `role="button"`, `tabIndex={0}` ni manejador de teclado (`onKeyDown`) — inalcanzables/inoperables solo con teclado.
Recomendación: añadir `role="button" tabIndex={0}` y un `onKeyDown` que dispare el mismo handler en `Enter`/`Space`, o convertir el contenedor a `<button>`.

**M6 — Drift de valores entre el bloque de tokens y un bloque legado duplicado en `index.css`.**
`src/index.css:168-176` ("Global Theme Root Configuration — legacy screens still read these") redeclara `background-color`/`color` de `html.light`/`html.dark` con hex literales en vez de `var()`, duplicando las líneas 48-57. El valor claro coincide exactamente con el token, pero el `color` oscuro de este bloque legado (`#f8fafc`, línea 175) **no coincide** con `--sf-text` en dark (`#f1f5f9`, línea 18) — una deriva de valor real, aunque casi imperceptible visualmente.
Recomendación: eliminar el bloque duplicado o hacer que lea `var(--sf-text)`/`var(--sf-bg)` en vez de hex fijo.

### 🟢 Bajo

**B1 — Tokens de acento (`--sf-rose/--sf-amber/--sf-violet/--sf-sky`) viven en un `:root` compartido, no dentro de `html.light`/`html.dark`.**
Funciona igual en ambos temas (cascada), pero no son ajustables por tema como el resto de los tokens — documentar esta decisión o moverlos si algún día necesitan variar entre claro/oscuro (`src/index.css:59-65`).

**B2 — El foco visible depende de una regla CSS sin capa que le gana a `focus:outline-none` de Tailwind por precedencia de cascade-layers**, en vez de un `focus-visible:ring-*` explícito junto a cada `outline-none` (12 ocurrencias en inputs/selects). Funciona hoy, pero es frágil: un cambio futuro de configuración de capas rompería el foco visible en toda la app sin aviso en compilación.

**B3 — Botones de editar/eliminar en la tabla de escritorio de `AdminCatalog.tsx:301,302,306,307`** (`hidden md:block`, sólo desktop) miden ~26px — no es un problema táctil móvil, pero vale la pena normalizar si algún día ese bloque se expone a touch.

**B4 — Varios objetivos táctiles "límite" (36–40px, no 44px ideal):** `AccountView.tsx:140` (presets de avatar, 36px), `NotificationsView.tsx:258` (marcar leída, 36px), `AdminCatalog.tsx:168,336` (cerrar formulario, 36px), `AdminCatalog.tsx:225,226` (editar/eliminar en tarjetas móviles, 40px).

**B5 — 5 pantallas sin ningún breakpoint `sm:`/`md:`/`lg:`** (`BottomNav.tsx`, `Dashboard.tsx`, `NotificationsView.tsx`, `AccountView.tsx`, `LoginScreen.tsx`): se apoyan solo en `max-w-*` + centrado, lo cual evita overflow en desktop pero no ofrece un layout distinto en tablet/desktop (patrón mobile-first defendible, no un bug duro).

**B6 — `App.tsx:610`** usa `selection:bg-emerald-500 selection:text-white` (color de selección de texto) hardcodeado en vez de tokens `--sf-*` — cosmético, sólo afecta al resaltado de selección de texto.

**B7 — Bundle principal de 608 kB (159 kB gzip)** sin code-splitting (aviso de Vite en el build) — no estaba en los 9 criterios, pero es una mejora de rendimiento recomendable para "clase mundial".

**B8 — `AccountView.tsx:137-145`** — el nombre accesible de los botones de preset de avatar cae al `alt={p.id}` (p. ej. `"chef"`), presente pero poco descriptivo; un `aria-label` explícito con el nombre traducido sería más claro.

---

## (d) Mejoras priorizadas para nivel de clase mundial

1. **(Alto → resolver primero)** Persistir sesión/tema/idioma en `localStorage` con restauración al montar (A1) — es la brecha más visible para cualquier usuario que recargue la PWA.
2. **(Alto)** Decidir y comunicar el alcance de persistencia del catálogo admin (A2): completar Supabase para productos/locales o marcar explícitamente la limitación en la UI.
3. **(Medio)** Cerrar los 6 hallazgos de accesibilidad/consistencia (M1–M6) — son rápidos (esfuerzo bajo/medio cada uno) y suman mucho a la percepción de pulido.
4. **(Bajo, cuando haya tiempo)** Code-splitting del bundle (B7), normalizar objetivos táctiles límite (B4), y limpiar el bloque de tokens legado (B6/M6).

---

## (e) Checklist de los 9 criterios

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos reales; único `absolute inset-0` es decorativo en `LoginScreen.tsx:59` (no interactivo, no overlay) |
| 2 | Cero clases dark-only hardcodeadas; correcto en ambos temas | **PASA** — 0 hallazgos; los 6 `text-white` restantes están sobre badges/logo de color sólido, no sobre superficies |
| 3 | `BottomNav` no se solapa con barras de acción ni oculta contenido | **PASA** — paddings (`96px`/`112px` + safe-area) superan con margen la altura real de las barras; `BottomNav` nunca coexiste con las barras propias de `ShoppingView`/vistas de pantalla completa |
| 4 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — M1 (radios 4px vs 8px en mismo patrón) y M2 (2 objetivos táctiles de 32px) |
| 5 | Accesibilidad | **FALLA (parcial)** — M3 (3 elementos sin nombre accesible/estado) y M5 (2 divs clicables sin soporte de teclado); el resto de la app (BottomNav, toggles, foco visible global) está correcto |
| 6 | Responsive móvil/tablet/desktop + safe areas iOS | **PASA** — `viewport-fit=cover` + `env(safe-area-inset-top/bottom)` correctos en Header/BottomNav/vistas; breakpoints presentes en las pantallas con más datos (RequestsList, DailyChecklist, AdminCatalog); nota B5 sobre 5 pantallas sin breakpoints propios (no bloqueante) |
| 7 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — 6/8 flujos confirmados correctos (tabs, campana→Notificaciones, avatar→Cuenta, Modo Compra con persistencia real, checklist→solicitud real, badges con token `--sf-rose`); **tema/idioma no persiste (A1)** y **CRUD de catálogo no persiste en backend (A2)** |
| 8 | i18n ES/EN mismas claves | **PASA** — 335/335 claves en ambos locales, 0 huecos; con hallazgo menor M4 (5 strings hardcodeados en español que deberían usar `t.xxx`) |
| 9 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores |

---

## Commits revisados desde la última auditoría

```
7cd65cd fix(ui): use --sf-rose token for badges, i18n restaurant selector aria-label
14b61fc fix: fall back to public Supabase URL/key so preview deploys don't crash
aa563db docs: add redesign review report (INFORME_REDISENO.md)
d4c009c fix: sync PWA theme-color meta tag with the active per-user theme
cc58136 fix(a11y): add aria-pressed to toggle-style buttons
c0d54f1 fix(i18n): translate product category names in the Daily Checklist
f8e488a fix(a11y): restore visible keyboard focus ring and fix undersized touch targets
9bf63a5 fix(i18n): translate remaining hardcoded Spanish strings and status labels
093293a fix: add vite/client type reference to resolve import.meta.env errors
d034e14 feat(ui): 2026 redesign — token theming, bottom nav, no modales
```
