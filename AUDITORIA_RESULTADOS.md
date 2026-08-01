# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-01 00:18 UTC
**Commit auditado:** `2299ec7` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** lectura completa de cada pantalla contra el código actual (no contra el diff), verificación directa (grep/Read/cálculo manual de contraste WCAG con la fórmula de luminancia relativa sRGB sobre los valores hex reales de `index.css`) más 4 sub-auditorías delegadas en paralelo, una por grupo de pantallas. Se leyó `CORRECCIONES_APLICADAS.md`, `INFORME_REDISENO.md` e `INFORME_AUDITORIA.md` completos antes de auditar; **ningún hallazgo de este informe repite algo ya documentado como resuelto** — donde se verificó que un fix previo sigue vigente se anota explícitamente como confirmado sin regresión.

## VEREDICTO: CON HALLAZGOS

Han pasado 8 ciclos de corrección desde la última vez que se sobrescribió este archivo (seguía describiendo el estado de `7cd65cd`, muy por detrás de `2299ec7`). Esos ciclos cerraron correctamente los hallazgos A1/A2/M1–M6 y varios B* del informe anterior, más 11 hallazgos adicionales encontrados en pasadas de verificación propias. El estado actual del código es notablemente más sólido (tokens consistentes, cero modales, foco visible global, i18n en paridad 369/369), pero esta pasada — la primera en auditar las **10 pantallas completas simultáneamente con cálculo real de contraste por par de colores**, en vez de por lotes — encontró **1 hallazgo Crítico** (pérdida real de datos de usuario) y **6 grupos de hallazgos Altos** que no habían sido cubiertos por ningún ciclo anterior, incluyendo una familia de fallos de contraste WCAG AA que las auditorías previas habían dado por buena ("`text-white` sobre badge de color sólido = PASS") sin calcular el ratio real. No hay nada que rompa la compilación, cero modales, y el fallback público de Supabase sigue intacto.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
✓ 1733 modules transformed.
dist/index.html                   1.14 kB │ gzip:   0.57 kB
dist/assets/index-BZQk_V4d.css   33.12 kB │ gzip:   6.94 kB
dist/assets/index-C1g4oFEe.js   614.16 kB │ gzip: 160.88 kB
(!) Some chunks are larger than 500 kB after minification.
✓ built in 2.87s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 13ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores. El aviso de chunk >500 kB (B7, ya documentado hace 5 ciclos) **persiste sin resolver** — 614.16 kB / 160.88 kB gzip, prácticamente sin cambio desde la primera vez que se detectó (608 kB). Se reclasifica como hallazgo Medio en esta pasada por su persistencia.
- **i18n:** `src/lib/translations.ts` → **369/369 claves** en `es` y `en`, sin huecos (verificado por extracción programática de ambos bloques, no por conteo de líneas).
- **Working tree:** limpio salvo este archivo (`package-lock.json` se normalizó por `npm install` y se revirtió antes de esta pasada, sin cambios reales de dependencias).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Qué falta para llegar a 10 |
|---|---|---|
| LoginScreen | **7/10** | Tap target de 28px en selector de idioma, spinner infinito sin estado de error, degradado de marca hardcodeado, `motion` (ya instalado) sin usar en la animación de entrada. |
| Header | **7/10** | Badge de notificaciones ilegible en AA en tema oscuro (3.67:1), radio del popover (20px) no coincide con `.sf-card` (26px), degradado hardcodeado. |
| BottomNav | **8/10** | Mismo bug de contraste del badge que Header; `getNavTabs()` sin memoizar en el padre. |
| ViewHeader | **8.5/10** | El componente más sólido de los 5 del shell; único resto es un default de i18n hardcodeado (`'Back'`), hoy inalcanzable. |
| Dashboard | **6.5/10** | Botón "Ver todas" sin padding (~16-20px, el enlace más usado de la pantalla), `stats`/`recent` sin memoizar (recalculan en cada evento Realtime). |
| RequestsList | **7/10** | Badge OVERDUE con `text-white` que falla AA en oscuro, CTAs principales (~36px) por debajo del propio estándar de 44px, cero uso de `motion` en expand/collapse pese a tenerlo instalado. |
| DailyChecklist | **6/10** | **Pérdida de progreso al cambiar de pestaña (Crítico)**, mismo bug de contraste `#fff` en el badge contador, categoría `SUPPLIES` inalcanzable por filtro. |
| AdminCatalog | **6/10** | Fallo de contraste real en tabla de escritorio (tema claro), bug de radio 4px durante edición de tabla, formulario de producto triplicado, tabla de escritorio muy por debajo del pulido de las tarjetas móviles. |
| ShoppingView | **7.5/10** | La pantalla mejor lograda; solo le falta el tap target del botón de nota y `aria-live` en el estado de envío. |
| AccountView | **7/10** | Cambios de perfil sin guardar se pierden en silencio al pulsar "atrás"; sin micro-interacciones táctiles (`active:scale-*`/`motion`). |
| NotificationsView | **6/10** | "Marcar todo leído" con ~16px de alto (la acción más usada del header de la pestaña), botones de Ajustes 32-40px inconsistentes con el resto de la app. |

**Promedio: 7.0/10.** Base de diseño (tokens, tipografía, cero modales, i18n) ya de nivel producción; lo que separa a SupplyFlow de un Stripe/Linear/Revolut hoy es un puñado de bugs de contraste AA reales (no solo estéticos), tap targets por debajo del propio estándar de 44px del proyecto en los controles *más usados* de cada pantalla, y la ausencia total de `motion` pese a ser una dependencia ya instalada y pedida explícitamente por el encargo.

---

## (d) Hallazgos por severidad

### 🔴 Crítico

**C1 — El progreso del Checklist Diario se pierde por completo si el usuario cambia de pestaña y vuelve.**
`src/App.tsx:713-721` monta `DailyChecklist` solo cuando `activeTab === 'CHECKLIST'` (render condicional, no `display:none`). Todo el estado de captura — `readings`, `reviewedIds`, `notes`, `isUrgent` (`DailyChecklist.tsx:26-49`) — vive en `useState` local sin persistencia ni elevación a `App.tsx`. Si el cocinero navega a "Solicitudes" (p. ej. para revisar algo) y vuelve a "Checklist", el componente se remonta desde cero y **todo lo marcado, cada nota escrita y cada ajuste de stock se pierde sin ningún aviso**.
- **Consecuencia real:** rompe la promesa central de la pantalla (`t.checklistSpeed`, checklist en <60s) — un cocinero que revisa 30 productos y es interrumpido por una notificación de otra pestaña pierde todo su trabajo.
- **Recomendación:** elevar el estado (`readings`/`reviewedIds`/`notes`/`isUrgent`) a `App.tsx`, o persistirlo en `localStorage` con clave por restaurante+fecha (mismo patrón ya usado para `restosupply_products_override`).

### 🟠 Alto

**A1 — Familia de badges con `text-white`/`color:'#fff'` hardcodeado que falla contraste AA (4.5:1) en tema oscuro.**
Auditorías previas clasificaron `text-white` sobre badges de color sólido como "PASS" sin calcular el ratio real. Este ciclo lo calculó: en tema oscuro, blanco sobre `--sf-rose` (`#f43f5e`) = **3.67:1**; blanco sobre `--sf-accent` (`#10b981`) = **2.54:1**. Ambos muy por debajo de 4.5:1 para texto pequeño en negrita. En tema claro los mismos pares sí pasan (6.28:1 / 5.48:1), por eso el defecto nunca se detectó a simple vista.
- `src/components/RequestsList.tsx:210` — badge "OVERDUE", `text-white` sobre `var(--sf-rose)`.
- `src/components/Header.tsx:144` — badge de notificaciones pendientes, `text-white` sobre `var(--sf-rose)`.
- `src/components/BottomNav.tsx:59` — badge de conteo, `text-white` sobre `var(--sf-rose)`.
- `src/components/DailyChecklist.tsx:280` — badge contador de ítems a reponer, `color:'#fff'` sobre `var(--sf-rose)` o `var(--sf-accent)` según el caso.
- **Recomendación (diff mínimo, ya validado por el propio proyecto):** reemplazar por `var(--sf-accent-contrast)` en los 4 sitios — el mismo token que `CORRECCIONES_APLICADAS.md` (ciclo `b302d99`) ya verificó que da ≥5:1 para **ambos** `--sf-accent` y `--sf-rose` en los dos temas. No hace falta ningún token nuevo, solo aplicar el que ya existe a estas 4 ubicaciones que quedaron fuera del fix original.

**A2 — Cambios de perfil sin guardar se pierden en silencio al salir de Cuenta.**
`AccountView.tsx` requiere pulsar "Guardar cambios" explícitamente para nombre/email/teléfono/avatar, pero el botón "atrás" del `ViewHeader` (`ViewHeader.tsx:29-32`) llama a `onBack()` sin ninguna guarda de "cambios sin guardar". Como tema/idioma sí se aplican al instante (`AccountView.tsx:89-98`), el usuario puede asumir razonablemente que todo se guarda solo — y no es así para el resto del formulario.
- **Recomendación:** interceptar `onBack` cuando el formulario tenga cambios (`dirty === true`) y auto-guardar, o mostrar un aviso inline antes de navegar.

**A3 — Fallo de contraste real en la tabla de escritorio de AdminCatalog (tema claro).**
`AdminCatalog.tsx:288` — badge de umbral mínimo con `background: tint('var(--sf-amber)', 16)` y texto `var(--sf-amber)` da **≈4.0:1**, por debajo de 4.5:1 para texto 12px en negrita. La misma información en la tarjeta móvil (`AdminCatalog.tsx:231`, fondo `sf-inset` plano) da ≈4.76:1 y sí pasa — mismo dato, dos tratamientos visuales, uno falla.
- **Recomendación:** igualar el badge de la tabla de escritorio al tratamiento plano (`sf-inset`) que ya usa la tarjeta móvil — resuelve el contraste y la inconsistencia visual (ver M-AdminCatalog abajo) en el mismo cambio.

**A4 — Colores hardcodeados fuera del sistema de tokens (violación directa de la regla "CERO colores hardcodeados").**
- `src/components/LoginScreen.tsx:81` y `src/components/Header.tsx:74` — mismo degradado duplicado `bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400` + `shadow-emerald-900/30` para el logo, fuera de `var(--sf-*)`.
- `src/components/AdminCatalog.tsx:365` — `${r.colorBadge || 'bg-emerald-500'}`, y los valores reales de `colorBadge` que consume están hardcodeados en `src/data/caddyShackData.ts:11,20,29,38` y `src/App.tsx:272,534` (`bg-emerald-600`, `bg-amber-600`, `bg-indigo-600`, `bg-rose-600`).
- **Recomendación:** para el logo, extraer un `--sf-brand-gradient` (o aceptar que es la única excepción documentada de marca, pero tokenizarlo igual para que no se duplique). Para `colorBadge`, migrar los 4 valores de datos a claves semánticas (`'emerald'|'amber'|'indigo'|'rose'`) resueltas a `var(--sf-*)` en el componente, no a clases Tailwind crudas en los datos.

**A5 — Objetivos táctiles por debajo de 44px en los controles *más usados* de 5 pantallas distintas.**
No son objetivos táctiles marginales — son la acción principal o más frecuente de cada pantalla:
- `src/components/LoginScreen.tsx:69` — selector de idioma, ~28px (primer control interactivo de toda la app).
- `src/components/Dashboard.tsx:155-161` — botón "Ver todas", sin ningún padding, ~16-20px.
- `src/components/NotificationsView.tsx:134` — "Marcar todo leído", sin padding, ~16px de alto (falla incluso el mínimo WCAG 2.5.8 de 24×24px, no solo el estándar propio de 44px).
- `src/components/ShoppingView.tsx:231-237` — botón "Agregar/Editar nota", sin padding ni tamaño mínimo.
- `src/components/RequestsList.tsx:107-108` (`chipBtn`, usado en líneas 342,362,369,376,390,396,402) — CTAs primarios ("Tomar pedido", "Modo compra", "Confirmar recepción"...) a ~36px.
- **Recomendación:** subir cada uno a `min-h-11`/`py-2.5`+ como ya se hizo con los steppers y el botón de WhatsApp en ciclos anteriores — mismo patrón, aplicado de forma incompleta.

**A6 — Categoría `SUPPLIES` inalcanzable desde el filtro del Checklist Diario (hueco funcional, no solo visual).**
`DailyChecklist.tsx:171` tiene una lista de categorías hardcodeada que omite `'SUPPLIES'`, pese a que `Category` (`src/types.ts:3-12`) sí la incluye, tiene traducción (`categorySupplies`) y se asigna a compradores en `caddyShackData.ts:68`. La misma lista, con el mismo hueco, está duplicada en `AdminCatalog.tsx:62`. Un producto de esa categoría solo es alcanzable filtrando por "TODAS", nunca por su propia categoría.
- **Recomendación:** extraer `export const PRODUCT_CATEGORIES: Category[]` (derivado del tipo, incluyendo `SUPPLIES`) en un módulo compartido, consumido por ambos archivos.

### 🟡 Medio

**M1 — Bug de radio en AdminCatalog: inputs de edición de tabla se ven con esquinas de 4px en vez de 20px.**
`AdminCatalog.tsx:270,274,281,287,292,295` combinan `sf-inset` (radio 20px, `@layer components`) con la utilidad `rounded` (4px, `@layer utilities`); en Tailwind v4 `utilities` siempre gana sobre `components` (el propio `index.css:148-153` documenta este mecanismo para otro caso). Botones de acción de la misma tabla (`:300,301,305,306`) también en `rounded` (4px) vs `rounded-lg` (8px) en la variante móvil de los mismos botones (`:224-225`).

**M2 — Formulario de producto triplicado en AdminCatalog sin componente compartido.**
El mismo bloque de campos (nombre, categoría, unidad, mínimo, cantidad sugerida, proveedor) está implementado 3 veces: alta inline (`:163-206`), `EditCard` móvil (`:396-447`) y edición inline de tabla (`:270-296`). Efecto colateral real: `EditCard` etiqueta el campo de nombre de producto con la clave de traducción `t.adminRestaurantName` (`:410`) en vez de `t.adminProductName` (`:170`) — bug de copy, no solo de arquitectura.

**M3 — AdminCatalog sin estado vacío al filtrar/buscar sin resultados.**
Tanto la lista móvil (`:209-247`) como la tabla de escritorio (`:250-317`) no renderizan nada si `filteredProducts.length === 0`.

**M4 — Confirmaciones de guardado sin `aria-live` en 2 pantallas.**
- `AdminCatalog.tsx:503-507` — botón de guardado de `OverdueSettingsPanel` cambia su texto a "Guardado" sin `aria-live`, a diferencia del mismo patrón ya aplicado en `AccountView.tsx:165`/`DailyChecklist.tsx:134`/`NotificationsView.tsx:371`.
- `ShoppingView.tsx:259-266` — botón "Confirmar y Notificar Entrega" cambia a "Procesando..." sin `aria-live`.

**M5 — Botones de la pestaña Ajustes de NotificationsView (32-40px) inconsistentes con el estándar de 44px del resto de la app.**
`NotificationsView.tsx:152,315,323-333,356-364,365-368` — segmented control, "Activar" push, botones de sonido, enlace WhatsApp y "Enviar", todos por debajo de 44px, incluyendo el propio botón de marcar-leída de tarjeta (línea 253) que sí está en 44px dentro del mismo archivo. `handleClearDismissedHistory` ("Ver leídas", línea 201) queda al límite de ~24px.

**M6 — Lista de solicitudes de NotificationsView sin virtualización/paginación.**
`NotificationsView.tsx:207-298` renderiza todas las tarjetas sin corte; con un histórico de cientos de solicitudes el scroll se degradaría.

**M7 — Nota de ShoppingView se pierde si el usuario navega sin pulsar "Guardar" explícitamente.**
`ShoppingView.tsx:215-228` — sin `onKeyDown` para Enter y sin persistencia automática; el texto tecleado se descarta si el usuario cierra el editor de otra forma.

**M8 — `DailyChecklist.tsx:308-312` — botón de envío principal a ~32px**, por debajo del estándar de 44px ya aplicado a los steppers y al botón de nota del mismo archivo. Chips secundarios (ajuste rápido, categoría, filtro de revisado, líneas 160,177,210,224-233) a 24-28px.

**M9 — Spinner infinito sin estado de error en LoginScreen.**
`LoginScreen.tsx:89-93` — mientras `users.length === 0` se muestra "Cargando…" indefinidamente; si el backend falla de forma permanente, el usuario queda atascado sin mensaje ni botón de reintento.

**M10 — Recalculo sin memoizar en cada evento de Supabase Realtime (Dashboard y RequestsList).**
`Dashboard.tsx:56,62-106,108-110` (`scoped`, `stats` por rol, `recent` con `sort()`) y `RequestsList.tsx:68-79` (`filteredRequests` + 4 contadores, 5 pasadas de `.filter()`) se recalculan en cada render sin `useMemo`, incluyendo cada actualización de `supplyRequests` vía Realtime (`App.tsx:177-209`). Comparar con `DailyChecklist.tsx:52-74`, que sí memoiza los cálculos análogos — inconsistencia de patrón entre pantallas hermanas. Irrelevante al volumen actual, real con 10x datos.

**M11 — `motion` está instalado (`package.json`) pero no se usa en ningún archivo de `src/` (verificado por grep global en todo el repo).**
El encargo pide explícitamente "animaciones fluidas y microinteracciones (con `motion`)". Hoy: `LoginScreen.tsx:34-37` reimplementa una animación de entrada a mano con `requestAnimationFrame`; `RequestsList.tsx:266-317` expande/colapsa sin transición de altura; ninguna lista anima entrada/salida al filtrar. Es la brecha más grande entre el código actual y el nivel de acabado de Linear/Stripe/Apple Wallet que pide el benchmark.

**M12 — Bundle principal de 614 kB (161 kB gzip) sin code-splitting — hallazgo B7 original, sin resolver en 5+ ciclos.**
Aviso de Vite no bloqueante, documentado desde la primera auditoría (`8464dd8`, entonces 608 kB) y nunca priorizado. Se reclasifica de Bajo a Medio por su persistencia y por ser, junto con M11, lo más alejado del estándar de rendimiento de un producto "clase mundial".

**M13 — 3 strings sin traducir (hueco i18n, no de paridad de claves).**
- `AccountView.tsx:205` — `"iPhone / iPad (Safari)"` literal.
- `AdminCatalog.tsx:344,345,347` — opciones "Food Truck"/"Restaurante"/"Bistro" del selector de tipo quedan literales en español para un usuario EN, mientras "Cafe" (línea 346) sí está traducida — inconsistencia parcial dentro de la propia pantalla.
- `ViewHeader.tsx:16` — default `backLabel = 'Back'` hardcodeado en inglés; hoy inalcanzable (los 3 consumidores actuales pasan `t.back`), pero es una trampa latente para un consumidor futuro que lo omita.

### 🟢 Bajo

**B1 — Radios inconsistentes residuales (distintos de M1):** badge de estado de stock en `DailyChecklist.tsx:215` usa `rounded-md` (6px), único outlier de su archivo; radio del popover de `Header.tsx:104` (20px) no coincide con `.sf-card` (26px).

**B2 — `<th>` de la tabla de AdminCatalog sin `scope="col"`** (`AdminCatalog.tsx:255-261`) — pierde asociación columna/celda para lectores de pantalla.

**B3 — Estado de conexión (online/reconectando) de Header comunicado solo por color + `title`** (`Header.tsx:179-187`), sin alternativa textual descubrible por gesto táctil ni parte del nombre accesible del botón de avatar.

**B4 — `getNavTabs()` no memoizado en `App.tsx:608-634`** — recrea el array de tabs en cada render del padre.

**B5 — AdminCatalog monta simultáneamente la vista de tarjetas móvil y la tabla de escritorio** (`:209`, `:250`, ambas solo ocultas por CSS `md:`) — cada producto se renderiza dos veces en el DOM sin importar el viewport.

**B6 — Asimetría de alcance CRUD dentro de AdminCatalog:** pestaña Restaurantes solo permite alta, no editar/borrar (`:361-373`); pestaña Proveedores es 100% de solo lectura (`:378-388`) — sin documentar como decisión deliberada.

**B7 — Objetos de estilo inline repetidos** (`style={{ color: 'var(--sf-text)' }}`) recreados en cada render: 2 veces en `AccountView.tsx` (123,259), 9 veces en `NotificationsView.tsx` (180,198,233,240,261,307,337,346,353) — impacto insignificante al volumen actual, cosmético de mantenibilidad.

**B8 — Números mágicos sin nombrar:** offsets de stock por defecto inconsistentes en `DailyChecklist.tsx:29,71,86,189` (+1/+2/+3 sobre `minThreshold`); `setTimeout` de confirmación con duraciones distintas sin relación entre `AccountView.tsx:86` (1600ms) y `NotificationsView.tsx:118` (3000ms); offsets `64px`/`112px` hardcodeados en `ShoppingView.tsx:99,156` en vez de derivar de la altura real de `ViewHeader`.

**B9 — Código muerto/engañoso:** `NotificationsView.tsx:116` llama y espera `triggerNotification`, que en `src/lib/api.ts:213-215` es un no-op explícito — sugiere una llamada de red real que no ocurre. `DailyChecklist.tsx:87` (`handleQuickSet`) llama `markAsReviewed` de forma redundante (ya la hace `handleStockChange` internamente, línea 78).

**B10 — `RequestsList.tsx:84-91` (`getTimeAgo`) no se refresca solo** — la etiqueta "hace 5 min" queda congelada hasta el próximo render por otro motivo (sin `setInterval`).

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Crítico → primero, sin excepción)** C1 — Elevar o persistir el estado del Checklist Diario para que no se pierda al cambiar de pestaña.
2. **(Alto, esfuerzo mínimo, resuelve 4 archivos de una vez)** A1 — Sustituir `text-white`/`color:'#fff'` por `var(--sf-accent-contrast)` en `RequestsList.tsx:210`, `Header.tsx:144`, `BottomNav.tsx:59`, `DailyChecklist.tsx:280`.
3. **(Alto)** A5 — Subir a ≥44px los 5 controles más usados identificados (LoginScreen idioma, Dashboard "Ver todas", NotificationsView "Marcar todo leído", ShoppingView nota, RequestsList `chipBtn`).
4. **(Alto)** A3 — Igualar el badge de umbral de la tabla de escritorio de AdminCatalog al tratamiento plano de la tarjeta móvil (resuelve contraste + consistencia visual a la vez).
5. **(Alto)** A2 — Guarda de "cambios sin guardar" en AccountView antes de navegar atrás.
6. **(Alto)** A6 — Categoría `SUPPLIES` alcanzable por filtro en DailyChecklist/AdminCatalog (extraer lista compartida derivada del tipo `Category`).
7. **(Alto)** A4 — Tokenizar el degradado del logo y los `colorBadge` de restaurantes.
8. **(Medio, alto impacto de percepción "premium")** M11 — Adoptar `motion` (ya instalado) para al menos: expand/collapse de `RequestsList`, transición de altura del editor de nota, entrada de tarjetas al filtrar. Aplicar la skill `motion-microinteractions` ya existente.
9. **(Medio)** M1–M6 — Cerrar los hallazgos de AdminCatalog/NotificationsView listados arriba; son de esfuerzo bajo/medio y muchos comparten causa raíz con A3/A5.
10. **(Medio, deuda técnica recurrente)** M12 — Dedicar por fin un sub-ciclo a code-splitting del bundle (614 kB); ya lleva 5 auditorías consecutivas documentado sin resolver.
11. **(Bajo, cuando haya tiempo)** B1–B10 — limpieza de radios residuales, `scope="col"`, memoización fina, números mágicos.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` ya contienen los 8 pares pedidos explícitamente en el encargo (`mobile-ux-review`, `design-system-guardian`, `wcag-audit`, `motion-microinteractions`, `design-token-architect`, más `typography-color-system`, `visual-qa`, `frontend-architecture-review` — creados en el ciclo `c53ed7a`, con frontmatter `name`/`description`/`tools` correcto según la especificación oficial). **No hay nada que duplicar.** Sí hay 3 gaps reales, justificados por hallazgos concretos de esta pasada que ninguna skill existente cubre hoy:

| Skill nueva propuesta | Por qué hace falta (evidencia de esta auditoría) |
|---|---|
| `i18n-parity-guardian` | Ninguna de las 8 skills existentes menciona i18n. Esta pasada encontró 3 strings/valores sin traducir (M13) que una revisión de diseño/UX/WCAG no detecta por diseño — hace falta una checklist dedicada a paridad de claves + grep de literales fuera de `t.xxx`, ejecutable en cada cambio de copy. |
| `supabase-persistence-guardian` | El encargo fija como regla dura "NUNCA romper el fallback público de Supabase en `src/lib/supabase.ts`" y el proyecto ya tiene un patrón establecido de persistencia local (`localStorage` overrides para catálogo/sesión) que ninguna skill actual verifica explícitamente. Un guardia dedicado evitaría que un ciclo futuro toque `supabase.ts` sin darse cuenta o rompa el patrón de overrides. |
| `performance-budget-auditor` | M12 (bundle 614 kB) lleva **5 ciclos consecutivos** documentado y nunca priorizado porque ninguna skill lo posee como responsabilidad propia — `frontend-architecture-review` lo toca solo tangencialmente ("render performance"). Una skill con presupuesto explícito (tamaño de bundle, memoización en rutas con Realtime) le daría un dueño real. |

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Se confirma la recomendación de `HERRAMIENTAS_IA.md`, sin cambios: **Figma MCP** (specs/tokens de diseño), **Chrome DevTools/Playwright MCP** (screenshots estructurados y comparables entre corridas — Playwright local ya está disponible vía Bash sin MCP), **Vercel MCP** (estado del deploy de preview sin salir de la sesión). Ninguno es bloqueante para el flujo actual.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas; confirmado en las 4 sub-auditorías. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white` en superficies/`text-slate-*`/`border-slate-*`) | **PASA (regla tal como está escrita)**, pero ver fila 5 — el `text-white` sobre badges de color sólido está permitido por esta regla, y aun así **falla WCAG AA en la práctica** (A1). |
| 3 | `BottomNav` no se solapa ni oculta contenido | **PASA** — verificado por cálculo: nav ≈79-80px + safe-area vs. `padding-bottom: calc(96px + safe-area)` en `App.tsx:700`, margen ~16px. |
| 4 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — M1, B1 (radios); A5, M5, M8 (táctil, el hallazgo más extendido de esta pasada). |
| 5 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — C1 no es de accesibilidad pero es funcional-crítico; A1, A3 (contraste real, antes no calculado); A5 (táctil); B2, B3, M4 (aria-live/scope/nombre accesible). |
| 6 | Responsive móvil/tablet/desktop + safe areas iOS | **PASA** — sin cambios respecto a ciclos previos, sin hallazgos nuevos. |
| 7 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — C1 (checklist pierde datos) y A2 (perfil sin guardar) son regresiones funcionales reales encontradas esta pasada; A6 (categoría inalcanzable) es un hueco de datos preexistente sin cerrar. |
| 8 | i18n ES/EN mismas claves | **PASA** — 369/369 claves en ambos locales, sin huecos; M13 son 3 strings sueltos que no rompen la paridad de claves pero sí el copy. |
| 9 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; M12 (bundle 614 kB) es un aviso no bloqueante, no un fallo de compilación. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `7cd65cd`. Desde entonces, `CORRECCIONES_APLICADAS.md` documenta 5 ciclos de corrección adicionales (persistencia de sesión/tema/idioma y de catálogo; cierre de M1-M6; bug de teclado `stopPropagation`; i18n de WhatsApp/notificaciones del sistema; contraste P0 de la paleta de hues; popover de Header con foco/ARIA correctos; centralización de `tint()`/`STATUS_COLORS`; creación de las 8 skills/subagentes) hasta `2299ec7`. Todos esos fixes fueron verificados como vigentes (sin regresión) durante esta auditoría — ninguno de los hallazgos de este informe los repite.
