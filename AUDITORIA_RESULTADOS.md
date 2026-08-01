# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-01 12:17 UTC
**Commit auditado:** `b38034d` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring), sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** desde el informe anterior (auditoría sobre `cfdd27d`) aterrizó **1 commit** corrector (`b38034d`) que dice cerrar los 2 Críticos, los 9 Altos completos y una parte alta de los Medios/Bajos de esa auditoría. Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit**: se releyó el código real de las 10 pantallas contra `b38034d`, con 4 sub-auditorías delegadas en paralelo (shell: Login/Header/BottomNav/ViewHeader + `App.tsx`; Dashboard+RequestsList; DailyChecklist en profundidad; AdminCatalog+AccountView+NotificationsView+ShoppingView), cada una con instrucciones explícitas de verificar cada hallazgo anterior línea por línea contra el código actual, no contra el diff ni el resumen de `CORRECCIONES_APLICADAS.md`. Los 2 hallazgos Críticos del ciclo anterior (`App.tsx:621` Rules of Hooks, `DailyChecklist` sin `key` de restaurante) se **verificaron de forma independiente y directa** por este agente, leyendo el código fuente él mismo antes de aceptar la resolución de cualquier sub-auditoría. Se ejecutaron además `tsc`/`build` propios y una extracción programática de paridad i18n.

## VEREDICTO: CON HALLAZGOS

Los 2 hallazgos Críticos y los 9 Altos completos del ciclo anterior están **genuinamente cerrados**, verificados de forma independiente línea por línea (no solo por el mensaje de commit): el `useMemo` de `currentNavTabs` en `App.tsx:605-629` ya está antes del `return` condicional de `App.tsx:632`, y `<DailyChecklist key={selectedRestaurant.id} ...>` en `App.tsx:749` fuerza el remount correcto al cambiar de restaurante. De los 22 ítems restantes verificados explícitamente por las 4 sub-auditorías (Medios/Bajos previamente documentados), **20 se confirman genuinamente cerrados**, 1 solo parcialmente (B10: queda un segundo separador decorativo sin `aria-hidden` en `DailyChecklist.tsx:429`) y el resto de los ítems marcados como "diferido" en ciclos anteriores (M1–M4, M6, M16, B6, B7, B8, B11) siguen correctamente abiertos, sin regresión ni falsa resolución.

Pero una auditoría fresca más profunda — no limitada a re-verificar la lista anterior — encontró **3 hallazgos Altos nuevos**, ninguno introducido por el commit de este ciclo (son deuda preexistente que ningún ciclo anterior había detectado, no regresiones):

1. **Fuga de datos entre usuarios en `DailyChecklist`** (`DailyChecklist.tsx:36-38`) — el borrador de `localStorage` se indexa solo por restaurante+fecha, nunca por usuario. En un dispositivo compartido de cocina (el flujo normal de esta app: `handleLogout` no limpia `selectedRestaurantId`, `handleSelectUser` solo cambia de pestaña), un segundo usuario que abre el Checklist del mismo restaurante el mismo día carga en silencio las lecturas/notas/urgencia sin enviar del primer usuario, sin ninguna indicación de que son datos ajenos.
2. **Formularios de `AdminCatalog.tsx` sin asociación programática `<label>`↔control** (17 `<label>` sin `htmlFor`/`id`, `grep -rn htmlFor src/` da 0 resultados en todo el repo) — viola WCAG 1.3.1/4.1.2 en los 3 formularios de producto/restaurante.
3. **Campos de `AccountView.tsx` (Nombre/Email/Teléfono) dependen solo de `placeholder`** — sin `<label>` ni `aria-label`, viola WCAG 3.3.2 en los 3 campos principales de edición de perfil.

Además, se identificaron **6 hallazgos Medios nuevos** (sonido de alarma en cada envío de Checklist independientemente de si es urgente, ausencia de sincronización entre pestañas del borrador de Checklist, categorías y unidades de producto mostradas sin traducir en varios puntos de `AdminCatalog`/`ShoppingView`, efectos de sincronización de tema ejecutados en el cuerpo del render en vez de `useEffect`, cero indicadores de tendencia/delta en Dashboard, `aria-controls` colgante cuando el panel expandible está colapsado) y una familia amplia de hallazgos Bajos de pulido. Compilación limpia, cero modales, cero clases dark-only, cero colores hardcodeados fuera de tokens, fallback público de Supabase intacto, i18n en paridad 380/380.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
✓ 2137 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-DeVsKbEn.css              31.35 kB │ gzip:  6.77 kB
... (13 chunks lazy-loaded por pantalla, todos <23 kB)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-CYkVf1wq.js              309.60 kB │ gzip: 86.35 kB
✓ built in 4.32s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 30ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. Chunk principal 309.60 kB (86.35 kB gzip), sin cambio material respecto al ciclo anterior.
- **i18n:** `src/lib/translations.ts` → **380/380 claves** en `es` y `en`, sin huecos ni duplicados (verificado por extracción programática con balanceo de llaves).
- **Diseño de tokens:** `grep` de `bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`/`fixed inset-0`/hex hardcodeado sobre las 10 pantallas + `App.tsx` + `index.css`: **0 coincidencias reales** (los 2 únicos hex fuera de `index.css` son los `<meta name="theme-color">` de `App.tsx:660`, legítimos porque una etiqueta `<meta>` no puede consumir una custom property CSS, y reflejan exactamente `--sf-bg`).
- **Working tree:** limpio (`git status` sin cambios pendientes al momento de escribir este informe; se revirtió un cambio incidental de `package-lock.json` generado por `npm install` en este entorno, sin relación con el código auditado).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Δ vs. ciclo anterior | Qué falta para llegar a 10 |
|---|---|---|---|
| LoginScreen | **7.5/10** | +0.5 | Ya no reutiliza el mismo hue para texto y fondo (A5 cerrado); mantiene fundamentos fuertes (temas por token, animación con reduced-motion, estados de carga/timeout/reintento robustos). Falta riqueza visual/personalidad (solo ícono + lista tintada por rol, sin ilustración ni storytelling de marca como Airbnb/Revolut en onboarding), estado de carga tipo skeleton-shimmer en vez de spinner desnudo, y sin plan de escalabilidad si el roster de usuarios crece (sin búsqueda/filtro). |
| Header | **7.5/10** | +0.5 | Popover con foco/Escape correctos, badge con conteo accesible (A4 cerrado), memoizado (M10 cerrado). Falta estado skeleton mientras cargan `restaurants`/`users`, búsqueda en el popover para listas largas de locales, y animación de transición del número del badge (Stripe/Linear animan el cambio de cifra, no solo el `pop`-in). |
| BottomNav | **7.5/10** | +0.5 | Badge con conteo accesible (A4 cerrado), memoizado (M10 cerrado). Falta comportamiento hide-on-scroll (Instagram/YouTube/Spotify), feedback háptico (Vibration API) al cambiar de tab, y guardia explícita de `min-h-11`/`whitespace-nowrap` en el label por si el texto localizado crece. |
| ViewHeader | **7/10** | -1 (recalibrado, no regresión) | Correcto y consistente, pero es el componente menos diferenciado: sin large-title colapsable al hacer scroll (patrón iOS), sin soporte de subtítulo/breadcrumb, sin estado skeleton propio (depende enteramente del `Suspense` del caller). Lee como "utilidad correcta" más que como un momento de chrome de pantalla cuidado. |
| Dashboard | **6/10** | -2 (recalibrado tras auditoría más profunda) | Scoping y memoización correctos (M4 del componente en sí resuelto, aunque el canal Realtime de origen sigue sin filtrar — ver M4 abajo). **Cero indicadores de tendencia/delta** — cada cifra es un conteo desnudo sin "+3 vs. ayer" ni sparkline, la carencia más visible frente a cualquier dashboard Stripe/Linear/Revolut; los stat tiles son decorativos, no interactivos (no navegan al detalle); las 3 ramas de rol (`Dashboard.tsx:67-111`) siguen duplicadas casi idénticas (M6, deuda documentada sin cambios). |
| RequestsList | **7/10** | = | Wrap de footer, badge URGENTE sólido y `aria-expanded`/`aria-controls` genuinamente cerrados (A1, A2, M5). Quedan: `aria-controls` apuntando a un id que no existe en el DOM cuando el panel está colapsado (el contenido se desmonta, no se oculta); "+N más" a ~24px, muy por debajo del estándar de 44px del resto del archivo (B6, sin cambios); etiquetas de filtro pueden truncarse en viewports de 375px (B7, sin cambios); `statusLabels` no memoizado pese a que `FILTERS` sí lo está (B12 solo parcial). |
| DailyChecklist | **7/10** | +1 | Los 2 fixes de seguridad de datos más importantes del ciclo (remount por `key={selectedRestaurant.id}`, orden de drawers reordenado en el DOM real, no solo ARIA) están genuinamente cerrados y verificados línea por línea. Lo que impide un 9-10: **fuga de datos entre usuarios en dispositivo compartido** (hallazgo Alto nuevo, ver abajo); sonido de alarma (`'urgent'`) en cada envío exitoso, incluso sin urgencia real; sin sincronización entre pestañas del borrador (a diferencia de `NotificationsView`, que sí la tiene); un segundo separador decorativo sin `aria-hidden` (B10 solo parcial). |
| AdminCatalog | **6/10** | = | Traducción de tipo de restaurante y objetivos táctiles de 44px en los 3 formularios genuinamente cerrados (A8, A9). Formulario de producto sigue triplicado (M1), tabla+tarjetas ambas montadas simultáneamente (M2), asimetría CRUD sin documentar (M3) — deuda ya conocida, sin cambios. **Hallazgo nuevo:** 17 `<label>` sin `htmlFor`/`id` en los 3 formularios (0 resultados de `htmlFor` en todo el repo) — viola WCAG 1.3.1/4.1.2; categorías de producto (`p.category`) mostradas sin traducir en 4 sitios pese a que `formatCategoryName` ya existe y se usa en `DailyChecklist`; unidades (`UnitType`) nunca traducidas en ningún sitio de la app. |
| ShoppingView | **8/10** | = | Los 4 hallazgos que se le atribuían (M7 resync de nota, M8 chips 44px, y los ya cerrados en ciclos previos) están genuinamente cerrados con código real. La pantalla más pulida de las 4 revisadas por esa sub-auditoría: objetivos táctiles amplios, ritmo adecuado para uso en tienda. Falta feedback háptico junto al sonido, un "deshacer" tras marcar un ítem por error (PATCH optimista inmediato sin snackbar), y diferenciación visual por proveedor en los chips de filtro (todo en el mismo color de acento). |
| AccountView | **7/10** | -1 (recalibrado, no regresión) | La pantalla mejor arquitecturada de las 4: punto de entrada único, edición inline, auto-guardado al pulsar "atrás". **Hallazgo nuevo:** los 3 campos principales (Nombre/Email/Teléfono) dependen solo de `placeholder`, sin `<label>` ni `aria-label` — viola WCAG 3.3.2; sigue sin ruta de error si `onSaveProfile` fallara (prop síncrona, `void`, estructuralmente no puede propagar un fallo); avatares preestablecidos son fotos de stock genéricas en vez de una ilustración propia de marca. |
| NotificationsView | **7/10** | = | Tap targets, memoización y sincronización entre pestañas (M17) genuinamente cerrados. IA de dos segmentos limpia, tarjetas con semántica de teclado correcta. Falta agrupación por día/urgencia y gesto de swipe-to-dismiss (patrón esperado en un PWA táctil); el panel de "Ajustes" mezcla configuración real con un simulador de notificación de prueba sin jerarquía visual que los separe — un producto de consumo real no expondría ese simulador sin un flag de desarrollo; **hallazgo nuevo menor:** inputs de notificación de prueba sin `<label>`/`aria-label`. |

**Promedio (10 pantallas del encargo): 7.1/10** (igual al ciclo anterior — los 2 Críticos y 9 Altos se cerraron genuinamente, pero una auditoría más profunda de accesibilidad e integridad de datos encontró hallazgos reales nuevos de severidad comparable, así que el promedio no sube pese al trabajo real realizado). La app está genuinamente más cerca de producción que hace un ciclo: ningún flujo básico crashea, no hay pérdida de datos por cambio de pestaña/restaurante, y la base de tokens/i18n/code-splitting sigue sólida. Lo que impide el veredicto de aprobado esta vez no son regresiones — es la profundidad de la auditoría: cuanto más a fondo se revisa (formularios completos campo por campo, escenarios multiusuario en dispositivo compartido, cobertura real de traducción más allá de la paridad de claves), más hallazgos reales de accesibilidad e integridad de datos aparecen que ningún ciclo anterior había cubierto.

---

## (d) Hallazgos por severidad

### 🔴 Crítico

Ninguno. Los 2 Críticos del ciclo anterior (`App.tsx:621` Rules of Hooks; `DailyChecklist` sin `key` de restaurante) se verificaron **de forma independiente y directa** por este agente auditor, además de por la sub-auditoría del shell:
- `App.tsx:605-629` — `currentNavTabs`/`activePendingRequestsCount` ahora se declaran en las líneas 599-629, **antes** del primer `return` condicional en `App.tsx:632`. El orden/cantidad de hooks ya no cambia entre el render sin sesión y el render con sesión.
- `App.tsx:749` — `<DailyChecklist key={selectedRestaurant.id} ...>` dentro del bloque `activeTab === 'CHECKLIST'`. Cambiar de restaurante desde el selector del Header ahora fuerza un remount completo, releyendo el draft correcto en vez de sobrescribir el de otro restaurante.

### 🟠 Alto

**A1 — NUEVO: fuga de datos entre usuarios en `DailyChecklist` en un dispositivo compartido.**
`DailyChecklist.tsx:36-38` (`draftKeyFor`) indexa el borrador de `localStorage` solo por `restaurantId` + fecha local, **nunca por usuario**. Esta app tiene un flujo explícito de multiusuario en un mismo dispositivo: `App.tsx:590-597` (`handleLogout`) limpia solo la sesión, no `selectedRestaurantId`; `App.tsx:570-577` (`handleSelectUser`) resetea `activeTab` a `DASHBOARD` pero no toca `selectedRestaurantId` tampoco. Escenario reproducible: el Usuario A abre el Checklist, marca algunas lecturas y una nota, no envía, cierra sesión; el Usuario B inicia sesión más tarde el mismo día, mismo restaurante (el último seleccionado, que persiste), y al abrir la pestaña Checklist, `DailyChecklist` remonta (correctamente, por C2) y `readDraft` carga **en silencio** las lecturas/nota/urgencia sin enviar del Usuario A — sin ningún indicio de que son datos ajenos ni de cuándo se guardaron.
- **Por qué es Alto y no Crítico:** a diferencia del C2 del ciclo anterior, esto no sobrescribe ni destruye datos reales — es un borrador sin enviar mostrado al usuario equivocado, recuperable revisando/corrigiendo antes de enviar. Pero en un contexto real de cocina compartida es exactamente el tipo de "silenciosamente incorrecto" que erosiona la confianza en los datos que terminan enviándose como pedido real.
- **Recomendación:** incluir `currentUser.id` en `draftKeyFor`, o (mejor para el caso de uso real de turnos) mantener la clave por restaurante+fecha pero añadir un campo `authorId`/`authorName` al draft y mostrar un banner visible "Retomando borrador de {nombre}, {hora}" con opción de descartar, para que el traspaso entre turnos sea explícito en vez de silencioso.

**A2 — NUEVO: formularios de `AdminCatalog.tsx` sin asociación programática `<label>`↔control (WCAG 1.3.1, 4.1.2).**
17 elementos `<label>` en el archivo (p. ej. `:194,199,205,213,217,222,366,370,379,438,443,449,457,461,466`) no usan `htmlFor`/`id`, ni envuelven el control. `grep -rn htmlFor src/` no devuelve **ningún** resultado en todo el repositorio. La proximidad visual no sustituye un nombre programático: muchas combinaciones de lector de pantalla/navegador anunciarán estos `<input>`/`<select>` sin ningún nombre. Afecta a los 3 formularios (alta inline de producto, alta de restaurante, `EditCard`).
- **Recomendación:** añadir pares `id`/`htmlFor` coincidentes, o envolver cada `<input>`/`<select>` dentro de su `<label>`.

**A3 — NUEVO: campos de `AccountView.tsx` (Nombre/Email/Teléfono) dependen solo de `placeholder`, sin `<label>` ni `aria-label` (WCAG 3.3.2).**
`AccountView.tsx:297-316` — el componente reutilizable `Field` renderiza solo un ícono + `placeholder`, sin ningún `<label>` ni `aria-label`. El placeholder desaparece al escribir y no todos los lectores de pantalla lo exponen como nombre accesible. Son los 3 campos principales de edición de perfil, no un control secundario.
- **Recomendación:** añadir un `<label htmlFor>` visualmente oculto (`sr-only`) o `aria-label={placeholder}` en cada `<input>` de `Field`.

### 🟡 Medio

**M1 — NUEVO: sonido de alarma (`'urgent'`) suena en cada envío exitoso del Checklist, sin importar si hay urgencia real.**
`DailyChecklist.tsx:211` — `playAlertSound('urgent')` se dispara incondicionalmente en `handleSubmit`, incluso cuando `isUrgent` es `false` y nada está bajo el mínimo. `src/lib/notifications.ts:10-36` confirma que `'urgent'` es un doble-tono tipo alarma, deliberadamente distinto de `'success'`. El resto de confirmaciones exitosas del código (`AdminCatalog`, `RequestsList`, `AccountView`, `ShoppingView`) usa `'success'`/`'click'` y reserva `'urgent'` para alertas reales. Entrena al personal a asociar el sonido de alarma con "checklist guardado", debilitando su valor de señal para situaciones realmente urgentes.
- **Recomendación:** `playAlertSound(isUrgent ? 'urgent' : 'success')`.

**M2 — NUEVO: `DailyChecklist` es la única pantalla con estado persistido sin sincronización entre pestañas (`storage` event).**
El patrón ya existe en el propio código (`NotificationsView.tsx:78-89`, listener de `storage` para `dismissedIds`), pero no se aplicó al draft del Checklist — el formulario con estado más largo y crítico de la app (los conteos de stock alimentan pedidos reales). Con dos pestañas abiertas en el mismo restaurante/día, la última en guardar gana sin ninguna conciliación ni aviso.
- **Recomendación:** aplicar el mismo patrón `window.addEventListener('storage', ...)` ya usado en `NotificationsView.tsx:78-89`.

**M3 — NUEVO: categorías de producto mostradas sin traducir en `AdminCatalog.tsx` pese a que el helper ya existe.**
`src/lib/formatters.ts:43` define `formatCategoryName(category, t)`, usado correctamente en `DailyChecklist.tsx:298,333`, pero `AdminCatalog.tsx` muestra `p.category` crudo (p. ej. `"INGREDIENTS"`) en la insignia de tarjeta móvil (`:247`), la insignia de tabla de escritorio (`:305`) y ambos `<select>` de categoría (`:201`, `:444`) — incluso para usuarios en inglés.
- **Recomendación:** usar `formatCategoryName(p.category, t)` en los 4 sitios (manteniendo `value={c}` crudo en las opciones del `<select>`).

**M4 — NUEVO: `UnitType` nunca se traduce en ningún sitio de la app.**
`src/types.ts` define `UnitType` como literales en español (`'Paquete'|'Caja'|'Bolsa'|...`). No existe ningún `formatUnitName` ni claves de traducción al inglés. `AdminCatalog.tsx` (múltiples sitios) y `ShoppingView.tsx:204` muestran `p.unit`/`item.unit` crudo — un usuario en inglés sigue viendo "Paquete"/"Caja"/"Bolsa" en toda la UI de producto/compra, la misma clase de hallazgo que A8 del ciclo anterior ya cerró para el tipo de restaurante, pendiente para unidades.
- **Recomendación:** añadir `formatUnitName(unit, t)` (mismo patrón que `formatRestaurantType`) y aplicarlo en todos los sitios de visualización; mantener `UnitType` sin traducir como formato de datos interno.

**M5 — NUEVO: sincronización de tema/`theme-color` ejecutada en el cuerpo del render de `App.tsx`, no en `useEffect`.**
`App.tsx:649-661` — `document.documentElement.classList.add/remove` y la mutación del `<meta name="theme-color">` corren directamente en el cuerpo del componente en cada render, no dentro de un `useEffect`. Es idempotente hoy (sin bug visible), pero viola la pureza de render que exige React y hace un `querySelector` + escritura de DOM en cada re-render, incluidos los disparados por Realtime (frecuentes). Frágil bajo Strict Mode / futuras características concurrentes.
- **Recomendación:** mover a `useEffect(() => {...}, [isLight])`, calculando `currentUser?.theme === 'light'` antes del `return` condicional de la línea 632 (hoy depende de `currentUser`, que se comprueba después).

**M6 — NUEVO: Dashboard sin ningún indicador de tendencia/delta.**
`Dashboard.tsx:139-159` — cada stat tile muestra solo un conteo desnudo (p. ej. "Completadas hoy: 4"), sin "+2 vs. ayer", sparkline ni flecha de dirección. Es la carencia más visible frente a cualquier dashboard de referencia (Stripe/Linear/Revolut), donde todo KPI lleva una señal de comparación. Los tiles tampoco son interactivos (no navegan al detalle al tocar).
- **Recomendación:** para un ciclo dedicado a Dashboard — no es un bug de una línea, requiere decidir la fuente de datos históricos para el delta.

**M7 — NUEVO: `aria-controls` apunta a un id inexistente en el DOM cuando el panel expandible de `RequestsList` está colapsado.**
`RequestsList.tsx:291-294,350-354` fijan `aria-controls="request-details-{id}"` correctamente cuando está expandido, pero el panel referenciado (`:301-304`) está condicionalmente montado (`{isExpanded && (...)}`, no solo oculto) — cuando está colapsado, el id referenciado no existe en absoluto en el DOM, una referencia `aria-controls` técnicamente colgante en reposo.
- **Recomendación:** mantener el panel montado (usar `hidden` o altura 0 en vez de desmontar) o quitar `aria-controls` mientras está colapsado.

**M8 — Inputs de notificación de prueba en `NotificationsView.tsx` sin `<label>`/`aria-label`.**
`NotificationsView.tsx:357-370` — `testTitle`/`testBody` solo tienen contexto visual del encabezado precedente. Severidad menor por ser una herramienta secundaria de "simular push", no un flujo principal.

### 🟢 Bajo

**B1 — `statusLabels` de RequestsList/Dashboard no memoizado pese a que `FILTERS` sí lo está (B12 del ciclo anterior, cierre parcial).** `RequestsList.tsx:87`, `Dashboard.tsx:124`. Impacto despreciable (literal de 6 claves), pero inconsistente con el propio fix ya aplicado en el mismo archivo.

**B2 — Segundo separador decorativo de DailyChecklist sin `aria-hidden` (B10 del ciclo anterior, cierre parcial).** `DailyChecklist.tsx:429` — `<span className="sf-accent font-bold">• {t.withNote}</span>`, el primero (`:334`) sí se corrigió.

**B3 — `ViewFallback` (placeholder de Suspense) sin `role="status"`/`aria-live`.** `App.tsx:55-62` — spinner puro sin anuncio para lectores de pantalla al navegar a una pestaña con carga diferida, a diferencia de `LoginScreen.tsx:113` que sí usa el patrón correcto.

**B4 — Popover de selección de local de Header sin patrón `listbox`/roving-tabindex real.** `Header.tsx:104-131` — operable pero se lee como una lista de botones, no un selector de opción única; aceptable para pocas opciones, degrada con muchos locales.

**B5 — Sin guardia explícita de altura mínima en el botón de BottomNav.** `BottomNav.tsx:53` — hoy supera 44px por el layout actual, pero sin un `min-h-11` explícito como defensa si los tokens de padding/tamaño cambian.

**B6 — "+N más" de RequestsList en ~24px, lejos del estándar de 44px del resto del archivo (sin cambios respecto al ciclo anterior).** `RequestsList.tsx:291-294`.

**B7 — Etiquetas de filtro de RequestsList pueden truncarse en viewports ~375px (sin cambios).** `RequestsList.tsx:139-166`.

**B8 — Botones de acción de la tabla de escritorio de AdminCatalog (~26px) por debajo del propio estándar de 44px que A9 acaba de unificar en el resto del archivo.** `AdminCatalog.tsx:328-329,333-334`.

**B9 — Botón "hide note" de DailyChecklist sin padding, hit-area ~del tamaño del texto.** `DailyChecklist.tsx:475`.

**B10 — Posible guardado duplicado en el editor de nota de ShoppingView (Enter + blur sincrónico).** `ShoppingView.tsx:227-233` — idempotente (mismo valor), pero un round-trip de red redundante.

**B11 — `currentRestaurantProducts` de App.tsx sin memoizar, cascada de recomputo innecesario en DailyChecklist.** `App.tsx:296-298`.

**B12 — `filteredProducts` de AdminCatalog sin memoizar, inconsistente con el patrón `useMemo` ya establecido en el resto del código de este mismo ciclo.** `AdminCatalog.tsx:66-70`.

**B13 — Sin manejo de error en el envío del Checklist (`handleSubmit` sin try/catch), latente porque el contrato actual siempre resuelve.** `DailyChecklist.tsx:209-220`.

**B14 — Borradores de Checklist abandonados nunca se limpian (sin TTL).** `DailyChecklist.tsx:36-38` — solo se borran al enviar con éxito.

**B15 — Nota de ShoppingView sin `aria-label` distintivo más allá del `placeholder`.** `ShoppingView.tsx:223-238`.

**B16 — Texto de footer de LoginScreen idéntico en ES/EN (i18n arquitectónicamente correcto, contenido sin traducir).** `translations.ts:17,435`.

**Diferidos, confirmados sin regresión (documentados en ciclos anteriores, no re-litigados aquí):** M1–M3 (formulario triplicado/doble render/asimetría CRUD de AdminCatalog), M4 (canal Realtime de `App.tsx:198-230` sin filtrar por restaurante — la memoización downstream de Dashboard/RequestsList es correcta pero no resuelve el problema de fondo), M6 (3 ramas de rol duplicadas en Dashboard), M16 (sin virtualización en NotificationsView), B8 (handleSubmit tipado `React.FormEvent` sin `<form>` real en DailyChecklist), B11 (`document.querySelector('nav')` frágil en DailyChecklist).

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Alto)** A1 — Incluir `currentUser.id` en `draftKeyFor` de `DailyChecklist.tsx` (o añadir banner de "retomando borrador de X" con opción de descartar). Probar el escenario: Usuario A deja borrador sin enviar → cierra sesión → Usuario B abre Checklist del mismo restaurante/día → confirmar que no ve datos de A sin aviso.
2. **(Alto)** A2 — Añadir `id`/`htmlFor` a los 17 `<label>` de `AdminCatalog.tsx` (o envolver los controles).
3. **(Alto)** A3 — Añadir `<label>` oculto o `aria-label` a los 3 campos de `Field` en `AccountView.tsx:297-316`.
4. **(Medio, una línea)** M1 — `playAlertSound(isUrgent ? 'urgent' : 'success')` en `DailyChecklist.tsx:211`.
5. **(Medio)** M2 — Listener de `storage` en DailyChecklist, mismo patrón que `NotificationsView.tsx:78-89`.
6. **(Medio)** M3/M4 — `formatCategoryName`/nuevo `formatUnitName` aplicados en todos los sitios de `AdminCatalog.tsx`/`ShoppingView.tsx` que hoy muestran `category`/`unit` crudos.
7. **(Medio)** M5 — Mover la sincronización de tema/`theme-color` de `App.tsx:649-661` a un `useEffect`.
8. **(Medio)** M7 — Mantener montado (no desmontar) el panel de detalles de `RequestsList` mientras está colapsado, o quitar `aria-controls` en ese estado.
9. **(Medio)** M8 — Labels en los inputs de notificación de prueba de `NotificationsView.tsx:357-370`.
10. **(Medio, requiere diseño, no una línea)** M6 — Diseñar e implementar deltas/tendencias en Dashboard cuando haya presupuesto para un ciclo dedicado a esa pantalla.
11. **(Bajo, en orden de esfuerzo/impacto)** B1–B16 — memoización de `statusLabels`/`filteredProducts`/`currentRestaurantProducts`, segundo `aria-hidden` de DailyChecklist, `aria-live` de `ViewFallback`, tap targets residuales (B6, B8, B9), guardado duplicado de nota en ShoppingView, TTL de borradores abandonados.
12. **(Deuda de arquitectura mayor, sin cambios de prioridad respecto a ciclos anteriores)** M1–M3, M4 (Realtime scoping), M6 (duplicación de Dashboard), M16 (virtualización) — seguir diferidos a un ciclo dedicado de refactor, tal como vienen documentados.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` ya contienen **14 pares completos** (`mobile-ux-review`, `design-system-guardian`, `wcag-audit`, `motion-microinteractions`, `design-token-architect`, `typography-color-system`, `visual-qa`, `frontend-architecture-review`, `i18n-parity-guardian`, `supabase-persistence-guardian`, `performance-budget-auditor`, `async-error-handling-guardian`, `react-hooks-invariant-guardian`, `stateful-prop-transition-guardian`) — cobertura ya muy amplia, y **ninguno debe duplicarse**.

Esta pasada **no encontró un gap que justifique un par skill+subagente completamente nuevo**. En cambio, los 2 hallazgos Altos nuevos de accesibilidad y el hallazgo Alto de integridad de datos multiusuario son evidencia de que 3 skills existentes tienen checklists incompletos respecto a su propio alcance declarado — se recomienda que el corrector **fortalezca sus `SKILL.md`** con ítems explícitos, en vez de crear peers redundantes:

| Skill a fortalecer | Ítem de checklist a añadir | Evidencia de esta pasada |
|---|---|---|
| `wcag-audit`/`wcag-auditor` | "¿Todo `<input>`/`<select>`/`<textarea>` tiene un nombre accesible programático — `<label htmlFor>` o `aria-label` — y no depende solo de `placeholder` o proximidad visual?" | 20 controles de formulario en `AdminCatalog.tsx` + `AccountView.tsx` sin asociación programática, tras 8+ ciclos de auditoría WCAG que no lo detectaron — el checklist actual evidentemente no cubre este caso explícitamente. |
| `i18n-parity-guardian` | "¿Todo valor de un tipo enumerado (`Category`, `UnitType`, tipo de restaurante, etc.) que se muestra en UI pasa por un helper `formatXxx(valor, t)`, o se está renderizando el literal crudo del enum?" — la paridad de claves ES/EN no detecta este caso porque no falta ninguna clave, el valor mismo nunca se traduce. | Categorías y unidades de producto mostradas sin traducir en `AdminCatalog.tsx`/`ShoppingView.tsx` pese a que la paridad de claves está en 380/380 sin huecos. |
| `stateful-prop-transition-guardian` | "¿La clave de persistencia (`localStorage`) incluye **todas** las dimensiones de identidad relevantes (restaurante + usuario + fecha), no solo la última que causó un bug conocido?" | La fuga de datos entre usuarios de DailyChecklist es la tercera variante de la misma familia de bug (pestaña → restaurante → ahora usuario) que este skill fue creado específicamente para prevenir, pero su alcance original (creado tras el bug de restaurante) no contemplaba la dimensión de usuario. |

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto a los ciclos anteriores: **Figma MCP** (specs/tokens de diseño), **Chrome DevTools/Playwright MCP** (el Playwright local ya disponible vía Bash en este entorno sin necesidad de MCP — habría sido útil esta pasada para reproducir visualmente el escenario multiusuario de A1 en vez de solo por análisis estático), **Vercel MCP** (estado del deploy de preview). Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx`; las barras fijas de DailyChecklist/ShoppingView son `fixed inset-x-0`/`fixed bottom-0 inset-x-0`, no overlays de pantalla completa. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`) | **PASA** — 0 coincidencias en los 4 grupos de archivos auditados. |
| 3 | Cero colores hardcodeados (todo `var(--sf-*)`/`.sf-*`) | **PASA** — 0 hex fuera de `index.css` salvo los 2 `<meta name="theme-color">` legítimos (una etiqueta `<meta>` no puede consumir custom properties CSS) que reflejan `--sf-bg` exactamente. |
| 4 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — sin cambios respecto al ciclo anterior, sin hallazgos nuevos contra este criterio. |
| 5 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — B6/B8/B9 (varios objetivos táctiles por debajo de 44px, sobre el mínimo WCAG de 24px), inconsistencia entre controles del mismo archivo (A9 ya corrigió 6, quedan otros sin tocar). |
| 6 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — 2 hallazgos Altos nuevos (A2/A3, asociación label↔control), M7 (`aria-controls` colgante), M8/B3 (labels/aria-live faltantes en superficies secundarias); las correcciones de contraste/motion/orden de tabulación del ciclo anterior se mantienen genuinamente cerradas. |
| 7 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — B7 (truncamiento de etiquetas de filtro en RequestsList a ~375px, sin cambios respecto al ciclo anterior). |
| 8 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — A1 (fuga de datos entre usuarios en Checklist en dispositivo compartido) es un hallazgo Alto funcional nuevo; los 2 Críticos funcionales del ciclo anterior (crash de login/logout, pérdida de datos al cambiar de restaurante) están genuinamente cerrados y verificados de forma independiente. |
| 9 | i18n ES/EN mismas claves | **PASA** — 380/380 claves en ambos locales, sin huecos (verificado por extracción programática). M3/M4 (categorías/unidades sin traducir) son huecos de **cobertura real de traducción de valores de enum**, no de paridad de claves — la paridad en sí está intacta. |
| 10 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal 309.60 kB (86.35 kB gzip), sin aviso de tamaño de Vite. Importante: este PASA no cubre A1 (fuga de datos multiusuario) ni A2/A3 (accesibilidad de formularios) — ninguno es detectable por compilación. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `cfdd27d` (VEREDICTO: CON HALLAZGOS, 2 Críticos + 9 Altos). Desde entonces aterrizó 1 commit corrector (`b38034d`) que cerró, con evidencia real verificada de forma independiente en esta pasada (no solo por el mensaje de commit): los 2 Críticos (crash de Rules of Hooks en login/logout, pérdida de datos al cambiar de restaurante), los 9 Altos completos (wrap de footer, badge URGENTE, `prefers-reduced-motion` global, badges accesibles, contraste de LoginScreen, orden de tabulación de drawers, filtro `.active`, traducción de tipo de restaurante, tap targets de AdminCatalog), y una parte alta de los Medios/Bajos (aria-expanded/controls, resync de nota en ShoppingView, chips de proveedor, token de marca, memo/callbacks del shell, familia de defectos de la barra fija de DailyChecklist, catch explícito en LoginScreen, guarda de exhaustividad de categorías, sincronización entre pestañas de NotificationsView, footer i18n, sonido en LoginScreen, validación de forma de `readDraft`, `aria-hidden` en un separador). El trabajo es sustancialmente real: la puntuación promedio se mantiene en 7.1/10 no por falta de progreso, sino porque una auditoría más profunda que la de ciclos anteriores (formularios completos campo por campo, escenarios multiusuario en dispositivo compartido) encontró 3 hallazgos Altos nuevos de deuda preexistente que ningún ciclo anterior había detectado — no regresiones del commit de este ciclo. Ninguna skill/subagente nueva se creó esta pasada (14 pares ya cubren el espacio); se documentan 3 recomendaciones concretas de fortalecimiento de checklist para skills existentes.
