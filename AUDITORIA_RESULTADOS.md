# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-01 05:30 UTC
**Commit auditado:** `5f8f719` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** el ciclo anterior (`2299ec7`) ya había dejado el informe previo en un estado sólido; desde entonces solo aterrizó **1 commit** (`5f8f719`, "checklist action bar anchored above nav") que reescribió sustancialmente la barra de acción de `DailyChecklist.tsx` y tocó footer/`StatusPill` de `RequestsList.tsx`. Esta pasada no repite ciegamente el informe anterior: se releyeron **todos** los archivos de las 10 pantallas completos (no el diff) contra el código real de `5f8f719`, con 4 sub-auditorías delegadas en paralelo (shell: Login/Header/BottomNav/ViewHeader; Dashboard+RequestsList; DailyChecklist en profundidad por ser el único archivo tocado; AdminCatalog+AccountView+NotificationsView+ShoppingView), más verificación directa propia de `tsc`/`build`/conteo i18n/estado de `.claude/skills`. Cada hallazgo del informe anterior se re-verificó línea por línea contra el código actual — se marca explícitamente cuál sigue vigente, cuál se cerró y cuál es nuevo.

## VEREDICTO: CON HALLAZGOS

El único commit de este período (`5f8f719`) fue un **rediseño visual de la barra de acción de DailyChecklist**, no un ciclo corrector sobre los hallazgos del informe anterior — por tanto casi todos los hallazgos previos (C1, A1–A6, M1–M13, B1–B10) **siguen presentes sin cambios**, verificados de nuevo uno por uno contra el código actual. Además, esta pasada encontró **1 regresión nueva real** introducida por ese mismo commit (pérdida de `flex-wrap` en el footer de `RequestsList.tsx`, riesgo de CTAs apretados/con texto partido en viewports angostos) y **2 grupos de hallazgos nuevos** no cubiertos por ningún ciclo anterior: un patrón recurrente de operaciones asíncronas sin manejo de error que dejan la UI "atascada" sin salida (LoginScreen, AdminCatalog, ShoppingView), y una familia de defectos propios de la nueva barra fija de DailyChecklist (oclusión de contenido, parpadeo de layout, accesibilidad de los desplegables). El hallazgo Crítico (C1, pérdida de progreso del checklist) **no fue tocado por el commit que reescribió justo ese componente** — sigue exactamente igual de vigente. Compilación limpia, cero modales, fallback público de Supabase intacto, i18n en paridad 370/370.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
✓ 1733 modules transformed.
dist/index.html                   1.14 kB │ gzip:   0.56 kB
dist/assets/index-DcLywHL7.css   32.69 kB │ gzip:   6.90 kB
dist/assets/index-CnE6rhL6.js   615.85 kB │ gzip: 161.32 kB
(!) Some chunks are larger than 500 kB after minification.
✓ built in 8.09s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 102ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores. El aviso de chunk >500 kB (M12/B7 original) **persiste sin resolver**, y creció ligeramente (615.85 kB / 161.32 kB gzip vs. 614.16 kB / 160.88 kB gzip del ciclo anterior) — 6+ auditorías consecutivas documentándolo sin que se priorice.
- **i18n:** `src/lib/translations.ts` → **370/370 claves** en `es` y `en`, sin huecos (verificado por extracción programática de ambos bloques). El commit `5f8f719` añadió 1 clave nueva (`checklistOrderPreviewTitle`) a ambos idiomas correctamente.
- **Working tree:** limpio salvo la normalización habitual de `package-lock.json` por `npm install`, revertida antes de esta pasada (sin cambios reales de dependencias).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Δ vs. ciclo anterior | Qué falta para llegar a 10 |
|---|---|---|---|
| LoginScreen | **7/10** | = | Tap target 28px en selector de idioma, spinner infinito sin error/reintento, sin manejo de error en `handleSelect` (botón puede quedar girando para siempre si falla el login), degradado hardcodeado. |
| Header | **6.5/10** | = | Badge de notificaciones ilegible en AA en oscuro (3.67:1), radio del popover (20px) sobreescribe activamente el de `.sf-card` (26px) con un `style` inline, estado de conexión solo por color+`title`. |
| BottomNav | **7.5/10** | = | Mismo bug de contraste del badge; sin defecto propio más allá de eso — el componente más limpio del shell junto a ViewHeader. |
| ViewHeader | **8.5/10** | = | Único resto: default de i18n hardcodeado (`'Back'`) hoy inalcanzable pero sin proteger para un consumidor futuro. |
| Dashboard | **6.5/10** | = | Botón "Ver todas" sin padding (~16-20px, el enlace más usado), `scoped`/`stats`/`recent` sin memoizar (recalculan en cada evento Realtime), `key={s.label}` frágil en vez de un `id` estable. |
| RequestsList | **6/10** | **↓ desde 7/10** | **Regresión nueva de `5f8f719`:** se quitó `flex-wrap` del footer de acciones sin dar a los `chipBtn` seguridad de encogido — en viewports angostos con 2+ CTAs (p. ej. comprador en "Pendiente": Tomar Pedido + Modo Compra) el texto de los botones puede partirse a dos líneas o el footer desbordar. Además persisten sin cambio: badge OVERDUE con `text-white` que falla AA en oscuro, `chipBtn` (~36px) por debajo de 44px, `filteredRequests`+4 contadores sin memoizar, `getTimeAgo` sin auto-refresco. |
| DailyChecklist | **6/10** | = | **C1 sigue exactamente igual** pese a que este ciclo reescribió justo este componente — el estado (`readings`/`reviewedIds`/`notes`/`isUrgent`/`showOrderPreview`, este último nuevo) sigue en `useState` local sin persistir. La nueva barra fija introduce hallazgos propios: `paddingBottom` estático (96px) desacoplado de la altura real medida y de los desplegables (puede ocultar el último producto de la lista), parpadeo de layout en cada montaje (recurrente por el propio C1), y accesibilidad inconsistente entre los dos desplegables (uno tiene `aria-expanded`, el otro no; ninguno tiene `aria-controls`; el contenido precede al disparador en el DOM, orden de tabulación invertido; sin cierre por Escape, a diferencia del popover de Header). |
| AdminCatalog | **6/10** | = | Fallo de contraste real en tabla de escritorio (tema claro, 4.03:1), bug de radio 4px en edición de tabla, formulario de producto triplicado (con bug de copy: `EditCard` etiqueta el nombre del producto con la clave de "Nombre de Restaurante"), `colorBadge` hardcodeado fuera de tokens, sin manejo de error en las 3 rutas de guardado CRUD. |
| ShoppingView | **7.5/10** | = | La pantalla mejor lograda; le falta el tap target del botón de nota, `aria-live` en el envío, y manejo de error en `handleFinish` (si `onCompleteShopping()` falla, el botón queda en "Procesando…" sin salida — la única acción principal de la pantalla queda sin vía de recuperación). |
| AccountView | **7/10** | = | Cambios de perfil sin guardar se pierden en silencio al pulsar "atrás" (mientras tema/idioma sí se auto-aplican, condicionando al usuario a asumir lo contrario); avatares preestablecidos sin `onError`. |
| NotificationsView | **6/10** | = | "Marcar todo leído" con ~16-18px de alto (la acción más usada del header de la pestaña, falla incluso el mínimo WCAG 2.5.8 de 24×24px), 5 controles de Ajustes entre 32-40px, lista sin virtualización, `visibleRequests`/`urgentCount` sin memoizar. |

**Promedio: 6.8/10** (bajó de 7.0/10 el ciclo anterior por la regresión de tap-target/wrap en RequestsList — ninguna otra pantalla mejoró ni empeoró, porque el único commit del período no abordó ningún hallazgo pendiente). La base de diseño (tokens, tipografía, cero modales, i18n) se mantiene de nivel producción; lo que sigue separando a SupplyFlow de un Stripe/Linear/Revolut es la misma familia de bugs de contraste AA reales, tap targets bajo el propio estándar de 44px en los controles *más usados* de 6 pantallas distintas, la pérdida de datos del checklist (crítica, sin tocar en 2+ ciclos) y un patrón nuevo y recurrente de operaciones de red sin manejo de error que dejan botones "atascados".

---

## (d) Hallazgos por severidad

### 🔴 Crítico

**C1 — El progreso del Checklist Diario se pierde por completo si el usuario cambia de pestaña y vuelve. (SIN CAMBIOS, verificado de nuevo tras la reescritura de este mismo componente.)**
`src/App.tsx:713` sigue montando `DailyChecklist` de forma condicional (`{activeTab === 'CHECKLIST' && (...)}`, no `display:none`), igual que `DASHBOARD`/`REQUESTS`/`ADMIN`. Todo el estado de captura sigue en `useState` local sin elevar ni persistir: `readings` (`DailyChecklist.tsx:26`), `reviewedIds` (`:34`), `notes` (`:47`), `showNoteInput` (`:48`), `isUrgent` (`:49`), y el nuevo `showOrderPreview` (`:51`, añadido por `5f8f719`, con el mismo problema). El commit `5f8f719` reescribió la barra de acción de este componente casi por completo y **no tocó la arquitectura de estado** — la oportunidad de resolverlo en el mismo cambio se dejó pasar.
- **Consecuencia real:** un cocinero interrumpido por una notificación de otra pestaña, o que revisa "Solicitudes" a mitad de checklist, pierde cada ítem marcado, cada nota y cada ajuste de stock sin ningún aviso — rompe la promesa central de la pantalla (`t.checklistSpeed`).
- **Recomendación (sin cambios):** elevar el estado a `App.tsx`, o persistirlo en `localStorage`/`sessionStorage` con clave por restaurante+fecha (mismo patrón ya usado para `restosupply_products_override`); alternativamente, montar las 4 pestañas siempre y alternar visibilidad por CSS en vez de `&&`.

### 🟠 Alto

**A1 — Familia de badges con `text-white`/`color:'#fff'` hardcodeado que falla contraste AA (4.5:1) en tema oscuro. (SIN CAMBIOS, 4 sitios confirmados de nuevo con línea actual.)**
Cálculo de contraste real (luminancia relativa sRGB, hex tomados de `index.css`): blanco sobre `--sf-rose` oscuro (`#f43f5e`) = **3.67:1**; blanco sobre `--sf-accent` oscuro (`#10b981`) = **2.54:1**. Ambos muy por debajo de 4.5:1. En tema claro ambos pares pasan (6.29:1 / 5.48:1) — bug exclusivo de tema oscuro, por eso el QA visual estándar no lo detecta.
- `src/components/Header.tsx:144-145` — badge de notificaciones pendientes.
- `src/components/BottomNav.tsx:59-60` — badge de conteo.
- `src/components/RequestsList.tsx:210` — badge "OVERDUE".
- `src/components/DailyChecklist.tsx:331-333` — badge contador de ítems a reponer (reubicado por `5f8f719` desde su posición anterior, el bug viajó con él sin corregirse).
- **Recomendación (sin cambios, diff mínimo):** reemplazar `text-white`/`color:'#fff'` por `var(--sf-accent-contrast)` en los 4 sitios — token ya validado ≥5:1 para `--sf-accent` y `--sf-rose` en ambos temas desde el ciclo `b302d99`.

**A2 — Cambios de perfil sin guardar se pierden en silencio al salir de Cuenta. (SIN CAMBIOS.)**
`AccountView.tsx` calcula `dirty` (`:76-80`) pero solo lo usa para deshabilitar el botón "Guardar" (`:164`); `ViewHeader` se invoca en `:104` pasando `onBack` sin ninguna intercepción, y `ViewHeader.tsx:28-32` lo dispara directo al pulsar "atrás". Tema/idioma sí se aplican al instante (`:89-98`), lo que razonablemente condiciona al usuario a asumir que todo se guarda solo.
- **Recomendación:** interceptar `onBack` para auto-guardar si `dirty === true` (consistente con el patrón de aplicación instantánea ya usado para tema/idioma), o mostrar un aviso inline antes de navegar.

**A3 — Fallo de contraste real en la tabla de escritorio de AdminCatalog (tema claro). (SIN CAMBIOS.)**
`AdminCatalog.tsx:288` — badge de umbral mínimo con `background: tint('var(--sf-amber)', 16)` y texto `var(--sf-amber)` da **≈4.03:1**, por debajo de 4.5:1 para texto 12px negrita. La tarjeta móvil equivalente (`:231`, fondo `sf-inset` plano) da **≈4.76:1** y sí pasa — mismo dato, dos tratamientos, uno falla.
- **Recomendación:** igualar el badge de la tabla de escritorio al tratamiento plano `sf-inset` que ya usa la tarjeta móvil — resuelve contraste y consistencia visual (M1) en el mismo cambio.

**A4 — Colores hardcodeados fuera del sistema de tokens. (SIN CAMBIOS.)**
- `LoginScreen.tsx:81` y `Header.tsx:74` — mismo degradado duplicado `bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400` + `shadow-emerald-900/30`.
- `AdminCatalog.tsx:365` — `` `${r.colorBadge || 'bg-emerald-500'}` ``, consumiendo valores hardcodeados de `caddyShackData.ts:11,20,29,38` (`bg-emerald-600`/`bg-amber-600`/`bg-indigo-600`/`bg-rose-600`) y `App.tsx:272,534` (mismo default hardcodeado al crear un restaurante nuevo).
- **Recomendación:** extraer `--sf-brand-gradient` para el logo; migrar `colorBadge` a claves semánticas (`'emerald'|'amber'|'indigo'|'rose'`) resueltas a `var(--sf-*)` en el componente, no en los datos.

**A5 — Objetivos táctiles por debajo de 44px en los controles *más usados* de 6 pantallas distintas. (SIN CAMBIOS — M8 de DailyChecklist es la única excepción, ya corregida.)**
- `LoginScreen.tsx:69` — selector de idioma, ~28px.
- `Dashboard.tsx:155-161` — "Ver todas", sin padding, ~16-20px.
- `NotificationsView.tsx:134` — "Marcar todo leído", ~16-18px, falla incluso el mínimo WCAG 2.5.8 de 24×24px.
- `ShoppingView.tsx:231-237` — botón de nota, sin padding ni tamaño mínimo.
- `RequestsList.tsx:107-108` (`chipBtn`, usado en :343,363,370,377,391,397,402) — CTAs primarios a ~36px.
- **Novedad confirmada este ciclo:** `DailyChecklist.tsx` **ya no** pertenece a este grupo — el botón de envío (`:360-364`, ahora `h-11`) y los steppers (`:247-257`, `w-11 h-11`) sí alcanzan 44px tras `5f8f719` (fix incidental, no buscado deliberadamente).
- **Recomendación:** subir cada uno a `min-h-11` — mismo patrón ya aplicado parcialmente. El fix de `chipBtn` (una sola línea, `py-2`→`min-h-11`) resuelve 7 usos de una vez.

**A6 — Categoría `SUPPLIES` inalcanzable desde el filtro del Checklist Diario y de AdminCatalog. (SIN CAMBIOS.)**
`DailyChecklist.tsx:181` y `AdminCatalog.tsx:62` mantienen la misma lista hardcodeada de categorías (duplicada en ambos archivos) que omite `'SUPPLIES'`, pese a que `Category` (`types.ts:3-12`) la incluye, tiene traducción (`categorySupplies`) y se asigna a un comprador real (`caddyShackData.ts:68`).
- **Recomendación:** extraer `PRODUCT_CATEGORIES: Category[]` derivado del tipo, consumido por ambos archivos.

**A7 — NUEVO (regresión de `5f8f719`): el footer de acciones de RequestsList perdió `flex-wrap`, arriesgando CTAs apretados/con texto partido en viewports angostos.**
El diff de `5f8f719` cambió `RequestsList.tsx:320` de `flex items-center justify-between gap-2 flex-wrap` a `flex items-center justify-between gap-2` (quitó el wrap), mientras que el grupo de acciones (`:326`) solo ganó `min-w-0 justify-end` y el icono de WhatsApp `flex-shrink-0` (`:331`) — pero los propios `chipBtn` (botones "Tomar Pedido", "Modo Compra", etc., usados hasta 2 a la vez en el mismo footer, p. ej. comprador en estado "Pendiente": `:362-366` + `:369-373`) no recibieron ninguna protección de encogido (`whitespace-nowrap`/`flex-shrink-0`). En un viewport de ~375px, "Ver detalles" (~130px) + icono WhatsApp (44px) + 2 `chipBtn` (~120px c/u) suman ≈450px contra ~340px disponibles dentro de la tarjeta — sin `flex-wrap` para bajar el grupo de acciones a una segunda línea, el texto de los botones puede partirse a dos líneas de forma desigual, o el footer desbordar (la app no tiene ninguna guarda `overflow-x` en `App.tsx`).
- **Recomendación:** restaurar `flex-wrap` en la línea 320 (más simple, preserva el fix del icono a la derecha), o añadir `whitespace-nowrap` a `chipBtn` y dejar que el grupo de acciones (`:326`) haga su propio wrap independiente. Verificar visualmente en 360-390px de ancho con comprador/admin en estados con 2 CTAs simultáneos.

### 🟡 Medio

**M1 — Bug de radio en AdminCatalog: inputs de edición de tabla con esquinas de 4px en vez de 20px. (SIN CAMBIOS.)**
`AdminCatalog.tsx:270,274,281,287,292,295` combinan `sf-inset` (20px, `@layer components`) con la utilidad `rounded` (4px, `@layer utilities`) — en Tailwind v4 `utilities` siempre gana. Botones de acción de la misma tabla (`:300,301,305,306`) en `rounded` (4px) vs. `rounded-lg` (8px) en la variante móvil (`:224-225`).

**M2 — Formulario de producto triplicado en AdminCatalog. (SIN CAMBIOS, con el mismo bug de copy.)**
Alta inline (`:163-206`), `EditCard` móvil (`:396-447`), edición inline de tabla (`:270-296`) — 3 implementaciones del mismo bloque de 6 campos. `EditCard.tsx:410` sigue etiquetando el nombre del producto con `t.adminRestaurantName` en vez de `t.adminProductName` (ambas claves existen y difieren, verificado en `translations.ts:199/609` vs. `:214/624`).

**M3 — AdminCatalog sin estado vacío al filtrar/buscar sin resultados. (SIN CAMBIOS.)**
Tanto la lista móvil (`:209-247`) como la tabla (`:265-312`) renderizan nada si `filteredProducts.length === 0`.

**M4 — Confirmaciones de guardado sin `aria-live` en 2 pantallas. (SIN CAMBIOS — AccountView y NotificationsView sí lo tienen, confirmado correcto.)**
- `AdminCatalog.tsx:503-507` — botón de `OverdueSettingsPanel`.
- `ShoppingView.tsx:259-266` — botón "Confirmar y Notificar Entrega".

**M5 — Botones de la pestaña Ajustes de NotificationsView (32-40px) inconsistentes con el estándar de 44px. (SIN CAMBIOS.)**
`:148-152` (segmentado FEED/AJUSTES), `:315` (Activar push), `:323,328` (pruebas de sonido), `:356-364` (enlace WhatsApp), `:365-368` (Enviar) — todos por debajo de 44px, mientras el botón de marcar-leída de tarjeta (`:253`) del mismo archivo sí está en 44px. `handleClearDismissedHistory` (`:201`) al límite de ~24px.

**M6 — Lista de solicitudes de NotificationsView sin virtualización/paginación. (SIN CAMBIOS.)**
`:207-299` renderiza todas las tarjetas sin corte.

**M7 — Nota de ShoppingView se pierde si el usuario navega sin pulsar "Guardar" explícitamente. (SIN CAMBIOS.)**
`:215-228` — sin `onKeyDown` para Enter, sin guardado automático al perder foco; el texto se descarta si el editor se cierra de otra forma.

**M9 — Spinner infinito sin estado de error en LoginScreen. (SIN CAMBIOS.)**
`:89-93` — mientras `users.length === 0` se muestra "Cargando…" indefinidamente sin mensaje ni reintento si el backend falla.

**M10 — Recalculo sin memoizar en cada evento de Supabase Realtime, ahora confirmado en 3 pantallas (antes 2). (SIN CAMBIOS + 1 instancia nueva confirmada.)**
- `Dashboard.tsx:56,59-106,108-110` (`scoped`/`stats`/`recent`).
- `RequestsList.tsx:68-79` (`filteredRequests` + 4 contadores, 5 pasadas de `.filter()`).
- **Nuevo esta pasada:** `NotificationsView.tsx:102-103` (`visibleRequests`, `urgentCount`) — mismo patrón, no reportado en el ciclo anterior por no haberse re-auditado ese archivo a este nivel de detalle.

**M11 — `motion` sigue instalado (`package.json`) pero sin uso en `src/`. (SIN CAMBIOS.)**
El encargo pide explícitamente animaciones con `motion`. La reescritura de `5f8f719` fue la oportunidad más reciente de introducirlo (expand/collapse del nuevo drawer de vista previa del pedido) y usó CSS/`animate-fadeIn` en su lugar, no `motion`.

**M12 — Bundle principal de 615.85 kB (161.32 kB gzip) sin code-splitting. (SIN CAMBIOS, 6+ ciclos.)**
Creció ligeramente desde 614.16 kB. Sigue siendo, junto con M11, lo más alejado del estándar de rendimiento "clase mundial" pedido.

**M13 — 4 strings sin traducir. (SIN CAMBIOS.)**
- `AccountView.tsx:205` — `"iPhone / iPad (Safari)"` literal.
- `AdminCatalog.tsx:344,345,347` — "Food Truck"/"Restaurante"/"Bistro" quedan literales para EN, mientras `:346` ("Cafe") sí está traducida.
- `ViewHeader.tsx:16` — default `backLabel = 'Back'` hardcodeado, hoy inalcanzable (los 3 consumidores pasan `t.back`).

**M14 — NUEVO: patrón recurrente de operaciones asíncronas sin manejo de error que dejan la UI sin salida.**
No es un hallazgo aislado — se repite en 3 pantallas con la misma forma (falta `try/catch`, el estado de "cargando" nunca se revierte si la promesa rechaza):
- `ShoppingView.tsx:71-77` (`handleFinish`) — si `onCompleteShopping()` falla (red inestable en un pasillo de tienda, caso realista), el botón queda en "Procesando…" para siempre, sin reintento ni salida. Es la acción principal de la pantalla.
- `AdminCatalog.tsx` — `handleSaveEdit` (`:76-80`), `handleCreateProductSubmit` (`:82-94`), `handleCreateRestaurantSubmit` (`:96-103`) — ninguna captura el rechazo; el usuario no recibe ninguna señal de *por qué* el formulario no se cerró.
- `LoginScreen.tsx:43-47` (`handleSelect`) — `loadingUserId` nunca se resetea si `onSelectUser` falla; el botón queda girando.
- **Recomendación:** envolver estas 5 llamadas en `try/catch/finally`, revertir el estado de carga en el `catch`, y mostrar un mensaje de error inline (patrón consistente con el `aria-live` ya usado en confirmaciones de éxito).

**M15 — NUEVO: la nueva barra fija de DailyChecklist (introducida por `5f8f719`) trae su propia familia de defectos.**
- **Oclusión de contenido:** `paddingBottom: 'calc(96px + env(safe-area-inset-bottom))'` (`:114`) es una constante estática, desacoplada de la altura real medida (`navH`) y de la barra misma. Solo la fila principal de la barra ya mide ~64px + BottomNav ~80-90px ⇒ >96px combinados **sin ningún drawer abierto** — el último producto de la lista puede quedar detrás de la barra en uso normal. Con `showOrderPreview` (hasta `max-h-[42vh]`) o `showNoteInput` abiertos, la ocultación empeora y no está reflejada en absoluto en el padding.
- **Parpadeo de layout:** `navH` arranca en `76` (`:54`) y se corrige en un `useEffect` post-pintado (no `useLayoutEffect`), causando un salto visible de la barra en cada montaje — y por causa de C1, el componente se remonta (y por tanto parpadea) **cada vez** que el usuario vuelve a la pestaña, no solo una vez por sesión.
- **Accesibilidad inconsistente entre los 2 desplegables:** el toggle de vista previa del pedido tiene `aria-expanded` (`:327`), el de nota **no** (`:348-353`); ninguno tiene `aria-controls`; ambos paneles preceden a su botón disparador en el DOM (`:279-299` antes que `:324-345`; `:302-320` antes que `:348-353`), invirtiendo el orden de tabulación esperado al abrirlos; ninguno cierra con Escape ni clic fuera, a diferencia del popover de `Header.tsx` que sí implementa ambos.
- **Acoplamiento DOM frágil:** `document.querySelector('nav')` (`:56`) asume que hay un único `<nav>` en toda la app (cierto hoy, verificado) pero sin ninguna señal en tiempo de compilación si eso cambia.
- **Recomendación:** medir la altura real de la barra (incl. drawers abiertos) con `ResizeObserver` y aplicarla al padding en vez de un número fijo; usar `useLayoutEffect`; igualar los 2 desplegables al patrón de accesibilidad ya usado por el popover de Header (`aria-expanded`+`aria-controls`+Escape+orden DOM contenido-después-del-disparador); considerar extraer un hook `useBottomNavOffset()` compartido antes de que otra pantalla copie el patrón `querySelector`.

### 🟢 Bajo

**B1 — Radio del popover de Header (20px) sobreescribe activamente el de `.sf-card` (26px) vía `style` inline.** `Header.tsx:103-104`. (Reclasificado de "residual" a activo: no es una clase olvidada, es un override deliberado que rompe la consistencia visual con toda otra superficie `.sf-card` de la app.)

**B2 — `<th>` de la tabla de AdminCatalog sin `scope="col"`.** `AdminCatalog.tsx:255-261`.

**B3 — Estado de conexión de Header comunicado solo por color + `title`.** `Header.tsx:179-187`, sin alternativa textual descubrible por gesto táctil.

**B4 — `getNavTabs()` no memoizado en `App.tsx:608-634`**, obliga a `BottomNav` a recibir un array `tabs` nuevo en cada render del padre.

**B5 — AdminCatalog monta simultáneamente tarjetas móviles y tabla de escritorio** (`:209`, `:250`, ambas solo ocultas por CSS) — cada producto se renderiza dos veces en el DOM.

**B6 — Asimetría de alcance CRUD en AdminCatalog:** Restaurantes solo permite alta (`:361-373`), Proveedores es 100% de solo lectura (`:378-388`), sin documentar como decisión deliberada.

**B8 — Números mágicos:** offsets de stock inconsistentes en DailyChecklist (+1/+2/+3), `setTimeout` de confirmación sin relación entre AccountView (1600ms) y NotificationsView (3000ms), offsets `64px`/`112px` hardcodeados en `ShoppingView.tsx:99,156` en vez de derivar de `ViewHeader`.

**B9 — Código muerto/engañoso:** `NotificationsView.tsx:116` llama y espera `triggerNotification`, un no-op explícito en `src/lib/api.ts:213-215`; `DailyChecklist.tsx` (`handleQuickSet`) llama `markAsReviewed` de forma redundante.

**B10 — `RequestsList.tsx:84-91` (`getTimeAgo`) no se refresca solo** — sin `setInterval`, la etiqueta queda congelada hasta el próximo render por otro motivo.

**B11 — NUEVO: avatares preestablecidos de AccountView sin `onError`.** `AccountView.tsx:148` — el avatar personalizado sí tiene `onError` (`:115`), los 3 presets no; un fallo de red en la URL de Unsplash muestra un icono roto en vez del fallback de iniciales.

**B12 — NUEVO: `Dashboard.tsx` usa `key={s.label}` (texto traducido) en vez de un `id` estable** (`:26-31,72-105,128`) — frágil si un locale futuro produce etiquetas duplicadas.

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Crítico — sin excepción, ya lleva 2+ ciclos sin tocarse pese a reescribirse el componente exacto)** C1 — Elevar o persistir el estado del Checklist Diario.
2. **(Alto, regresión de este mismo commit, arreglo de una línea)** A7 — Restaurar `flex-wrap` en el footer de `RequestsList.tsx:320` o proteger los `chipBtn` con `whitespace-nowrap`.
3. **(Alto, esfuerzo mínimo, 4 archivos de una vez)** A1 — Sustituir `text-white`/`color:'#fff'` por `var(--sf-accent-contrast)` en `Header.tsx:144`, `BottomNav.tsx:59`, `RequestsList.tsx:210`, `DailyChecklist.tsx:332`.
4. **(Alto)** A5 — Subir a ≥44px `chipBtn` (una línea, 7 usos), LoginScreen idioma, Dashboard "Ver todas", NotificationsView "Marcar todo leído", ShoppingView nota.
5. **(Alto)** A3 — Igualar el badge de umbral de la tabla de escritorio de AdminCatalog al tratamiento plano de la tarjeta móvil.
6. **(Alto)** A2 — Guarda de "cambios sin guardar" en AccountView antes de navegar atrás.
7. **(Alto)** A6 — Categoría `SUPPLIES` alcanzable por filtro (lista compartida derivada de `Category`).
8. **(Alto)** A4 — Tokenizar el degradado del logo y los `colorBadge` de restaurantes.
9. **(Medio, impacto directo en confiabilidad percibida)** M14 — `try/catch/finally` en `ShoppingView.handleFinish`, las 3 rutas de guardado de AdminCatalog, y `LoginScreen.handleSelect` — evita botones "atascados" sin salida.
10. **(Medio, recién introducido, mismo componente que C1)** M15 — Corregir oclusión de contenido de la barra fija de DailyChecklist (padding dinámico), parpadeo de layout, y accesibilidad de los 2 desplegables.
11. **(Medio, alto impacto de percepción "premium")** M11 — Adoptar `motion` para expand/collapse (empezando por el nuevo drawer de DailyChecklist, ya que se acaba de tocar), transición de altura de nota, entrada de tarjetas al filtrar.
12. **(Medio)** M1–M7, M10, M13 — cerrar los hallazgos de AdminCatalog/NotificationsView/memoización/i18n listados arriba.
13. **(Medio, deuda técnica recurrente, 6+ ciclos)** M12 — code-splitting del bundle (615.85 kB).
14. **(Bajo, cuando haya tiempo)** B1–B12 — radios residuales, `scope="col"`, memoización fina, `onError` en avatares, `key` estable en Dashboard, números mágicos.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` siguen conteniendo exactamente los 8 pares creados en el ciclo `c53ed7a` (`mobile-ux-review`, `design-system-guardian`, `wcag-audit`, `motion-microinteractions`, `design-token-architect`, `typography-color-system`, `visual-qa`, `frontend-architecture-review`) — **no hay nada que duplicar**, ninguno nuevo se creó ni se necesitaba tocar desde el ciclo anterior. Los 3 gaps identificados en la pasada previa **siguen sin cubrirse** (ningún ciclo corrector los ha creado todavía), y esta pasada añade un **4º gap real** con evidencia propia:

| Skill nueva propuesta | Por qué hace falta (evidencia) |
|---|---|
| `i18n-parity-guardian` | Sin cambios respecto al ciclo anterior — ninguna skill existente cubre paridad de claves + grep de literales fuera de `t.xxx` (M13, 4 strings sin traducir, sin cambios en 2 ciclos). |
| `supabase-persistence-guardian` | Sin cambios — regla dura de "nunca romper el fallback público" sin skill dedicada que la verifique explícitamente en cada ciclo. |
| `performance-budget-auditor` | M12 (bundle) lleva **6+ ciclos consecutivos** documentado sin dueño y sigue creciendo (614→615.85 kB este período). |
| `async-error-handling-guardian` (NUEVO, evidencia de esta pasada) | M14 encontró el mismo patrón —operación async sin `try/catch`, estado de carga que nunca se revierte, UI "atascada" sin salida— repetido en **3 pantallas independientes** (ShoppingView, AdminCatalog ×3, LoginScreen) sin que ninguna de las 8 skills existentes lo cubra (`frontend-architecture-review` toca duplicación/rendimiento, no manejo de errores de red). Una checklist dedicada ("¿toda promesa de UI tiene catch + reversión de estado de carga + mensaje visible?") habría detectado los 5 sitios de una vez. |

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto al ciclo anterior: **Figma MCP** (specs/tokens de diseño), **Chrome DevTools/Playwright MCP** (screenshots estructurados y comparables entre corridas — Playwright local ya disponible vía Bash sin MCP; habría sido especialmente útil esta pasada para verificar visualmente A7, la regresión de wrap, en vez de deducirla solo por análisis estático de CSS), **Vercel MCP** (estado del deploy de preview). Ninguno es bloqueante.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas; la nueva barra fija de DailyChecklist es `fixed inset-x-0` (no `inset-0`, no es un overlay/backdrop) — no viola la regla. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white` en superficies/`text-slate-*`/`border-slate-*`) | **PASA (regla tal como está escrita)**, pero ver fila 5 — `text-white` sobre badges de color sólido sigue fallando WCAG AA en la práctica en 4 sitios (A1), sin cambios desde el ciclo anterior. |
| 3 | `BottomNav` no se solapa ni oculta contenido | **PASA (BottomNav en sí)**, pero **nueva salvedad**: la barra fija de DailyChecklist puede ocultar el último producto de su propia lista (M15) — no es BottomNav, pero es contenido oculto por un elemento fijo nuevo, digno de nota bajo este criterio. |
| 4 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — M1, B1 (radios); A5 (táctil, 6 pantallas, el hallazgo más extendido); nueva regresión A7 (wrap de footer). |
| 5 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — C1 funcional-crítico sin tocar; A1, A3 (contraste real); A5 (táctil); M15 (a11y de los nuevos desplegables); B2, B3, M4 (aria-live/scope/nombre accesible). |
| 6 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial, nuevo)** — A7 (footer de RequestsList sin wrap en viewports angostos) y M15 (oclusión de contenido de la barra fija de DailyChecklist) son ambos defectos de responsive introducidos por el commit de este período; sin cambios en el resto de pantallas. |
| 7 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — C1 (pérdida de datos del checklist, sin tocar en 2+ ciclos) y A2 (perfil sin guardar) siguen siendo regresiones funcionales reales; A6 (categoría inalcanzable) sigue sin cerrar; nuevo M14 (operaciones que dejan la UI atascada sin salida en 3 pantallas). |
| 8 | i18n ES/EN mismas claves | **PASA** — 370/370 claves en ambos locales, sin huecos (creció de 369 a 370 por la clave nueva de este commit, correctamente en paridad); M13 son 4 strings sueltos que no rompen la paridad de claves. |
| 9 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; M12 (bundle 615.85 kB, creciendo) es un aviso no bloqueante, no un fallo de compilación. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `2299ec7`. Desde entonces aterrizó únicamente el commit `5f8f719` — un rediseño visual de la barra de acción de `DailyChecklist.tsx` (barra fija anclada sobre BottomNav, drawer de vista previa del pedido) y ajustes de footer en `RequestsList.tsx` (icono de WhatsApp siempre a la derecha, `StatusPill` con truncamiento). **No fue un ciclo corrector** sobre los hallazgos del informe anterior: de los 30 hallazgos documentados en `2299ec7` (1 crítico, 6 grupos altos, 13 medios, 10 bajos), **ninguno se cerró**, salvo M8 (tap targets del botón de envío/steppers de DailyChecklist, que alcanzó 44px como efecto colateral del rediseño, no como fix deliberado). Esta pasada, además de re-verificar los 29 hallazgos restantes uno por uno contra el código actual, encontró **1 regresión nueva** (A7) y **2 grupos de hallazgos nuevos** (M14, M15) directamente atribuibles al único commit de este período.
