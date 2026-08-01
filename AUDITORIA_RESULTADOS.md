# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-01 08:20 UTC
**Commit auditado:** `cfdd27d` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring), sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** desde el informe anterior (auditoría sobre `5f8f719`) aterrizaron **18 commits** correctores que dicen cerrar prácticamente todos los hallazgos previos (C1, A1–A7, M1–M15, B1–B12). Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit**: se releyó el código real completo de las 10 pantallas contra `cfdd27d`, con 4 sub-auditorías delegadas en paralelo (shell: Login/Header/BottomNav/ViewHeader + `App.tsx`; Dashboard+RequestsList; DailyChecklist en profundidad; AdminCatalog+AccountView+NotificationsView+ShoppingView), cada una con instrucciones explícitas de verificar cada hallazgo anterior línea por línea y no asumir el commit como prueba. Un hallazgo Crítico de la sub-auditoría del shell (violación de Rules of Hooks en `App.tsx:621`) se **verificó de forma independiente y directa** por este agente, leyendo el código fuente él mismo antes de aceptarlo. Se ejecutó además `tsc`/`build` propios y una extracción programática de paridad i18n (no un conteo manual).

## VEREDICTO: CON HALLAZGOS

Los 18 commits del período cerraron genuinamente la gran mayoría de los 30 hallazgos del ciclo anterior (contraste, tap targets, i18n, code-splitting, motion, memoización, manejo de errores) — el trabajo es real y verificable, no cosmético. Pero esta pasada encontró **2 hallazgos Críticos nuevos**, ambos introducidos por los propios commits correctores de este período, y uno de ellos **rompe el flujo de login/logout de toda la aplicación**:

1. **`App.tsx:621`** — el commit que arregla B4 (memoizar `getNavTabs()`) coloca el nuevo `useMemo` **después** de un `return` condicional (`if (!currentUser) return <LoginScreen/>`, línea 586). Esto es una violación directa de las Rules of Hooks de React: el número de hooks invocados difiere entre el render sin sesión (elLoginScreen) y el render con sesión, y React lanza una excepción real ("Rendered more hooks than during the previous render") exactamente en la transición de seleccionar un perfil o de cerrar sesión — verificado de forma independiente reproduciendo el patrón contra la versión instalada de React 19.2.8 del propio proyecto. `tsc`/`build` no lo detectan porque es un invariante de runtime, no un error de tipos.
2. **`DailyChecklist.tsx` + `App.tsx:730-739`** — el arreglo de persistencia del Checklist Diario (C1 del ciclo anterior) funciona correctamente para el escenario que se probó (cambiar de pestaña y volver), pero **no cubre cambiar de restaurante sin cambiar de pestaña** (el selector del Header puede cambiar `selectedRestaurantId` en cualquier momento). Como no hay `key={selectedRestaurant.id}` en el `<DailyChecklist>` de `App.tsx`, el componente no se remonta, sus `useState` no vuelven a leer el draft del nuevo restaurante, y el `useEffect` de persistencia sobrescribe inmediatamente el `localStorage` del restaurante B con el estado (obsoleto, del restaurante A) todavía en memoria — destruyendo el progreso real de B. Es, en esencia, una reaparición del mismo problema de pérdida de datos que C1 describía, por una puerta distinta.

Además de ambos Críticos, quedan **9 hallazgos Altos** (2 regresiones/arreglos incompletos de hallazgos previos + 7 nuevos) y una familia amplia de hallazgos Medios/Bajos, destacando un patrón transversal no cubierto por ningún ciclo anterior: **`prefers-reduced-motion` no se respeta en ningún sitio de la app** (cero coincidencias de esa media query en todo `src/`), pese a ser una regla explícita del encargo y pese a que la librería `motion` sí se adoptó correctamente en 3 componentes puntuales. Compilación limpia, cero modales, fallback público de Supabase intacto, i18n en paridad 380/380.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
✓ 2136 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-BoTTvcyO.css              33.50 kB │ gzip:  7.06 kB
... (13 chunks lazy-loaded, todos <23 kB salvo vendor)
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-DkcJPIlQ.js              308.95 kB │ gzip: 86.16 kB
✓ built in 3.47s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 7ms
```

- **`tsc --noEmit`: PASA**, sin errores. (Importante: esto **no** detecta el Crítico C1 de esta pasada — es una violación de Rules of Hooks, un invariante de runtime de React, no un error de tipos.)
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. **M12 del ciclo anterior (bundle de 615.85 kB sin code-splitting, documentado sin resolver durante 6+ ciclos) está genuinamente cerrado**: `vite.config.ts` ahora separa `react`/`react-dom`, `@supabase/supabase-js` y `motion` en `manualChunks`, y `App.tsx` carga con `React.lazy` cada pantalla salvo Login — el chunk principal bajó de 615.85 kB a **308.95 kB** (86.16 kB gzip), sin aviso de Vite.
- **i18n:** `src/lib/translations.ts` → **380/380 claves** en `es` y `en`, sin huecos ni duplicados (verificado por extracción programática con balanceo de llaves, no un `grep` superficial).
- **Working tree:** limpio (`git status` sin cambios pendientes al momento de escribir este informe).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Δ vs. ciclo anterior | Qué falta para llegar a 10 |
|---|---|---|---|
| LoginScreen | **7/10** | = | Fallo de contraste AA real en tema **claro** para el texto de rol de `cocinero`/`comprador` (4.04:1/3.72:1 y 4.37:1/4.03:1 — el patrón `tint()` reutiliza el mismo hue para texto y fondo); ícono de marca con `color:'#ffffff'` sin tokenizar que cae a ~1.67:1 sobre el stop ámbar del degradado; único componente del shell sin `playAlertSound`; footer "SupplyFlow V2 · Demo" sin i18n; `setTimeout` de 500ms artificial antes de `onSelectUser` en vez de latencia real o su ausencia. |
| Header | **7/10** | +0.5 | Badge de notificaciones **invisible para lectores de pantalla** (`aria-label` del botón padre reemplaza todo el contenido hijo, el número nunca se anuncia); mismo ícono `#ffffff` sin tokenizar; popover de selección de local sin patrón `listbox`/`menu` real; `title`/`aria-label` del botón de perfil comunican información distinta; sin re-render evitado (props/callbacks no memoizados desde `App.tsx`, anula parcialmente el beneficio de memoizar `currentNavTabs`). |
| BottomNav | **7/10** | = | Mismo bug de badge invisible para lectores de pantalla que Header; sin microinteracción de cambio de tab (Spotify/Apple Music dan bounce/scale sutil); sin `React.memo` (recibe props nuevas en cada render de `App`). |
| ViewHeader | **8/10** | = | Sigue siendo el componente más limpio; ahora `backLabel` es prop requerida (cierra el hallazgo pendiente); le falta soporte para slots más ricos (subtítulo, elevación al hacer scroll) para reutilizarse en pantallas de detalle futuras. |
| Dashboard | **8/10** | +1.5 | La memoización de `scoped`/`stats`/`recent` es código React correcto, pero **su efectividad real está limitada** porque el canal Realtime de `App.tsx:190-218` no filtra por restaurante/usuario — cualquier evento en cualquier restaurante invalida la caché de memo de todos los clientes (gap arquitectónico en `App.tsx`, no en `Dashboard.tsx`); lógica de 3 branches (cocinero/comprador/admin) duplicada casi idéntica; sin deltas/tendencias tipo "+3 vs. ayer" que sí muestran Stripe/Linear. |
| RequestsList | **7/10** | +1 | El grupo interno de acciones del footer (`chipBtn` sin `whitespace-nowrap`, línea del wrapper interno sin `flex-wrap`) sigue pudiendo partir el texto de los botones a media palabra en viewports ~375px con 2 CTAs simultáneos (comprador/admin en "Pendiente") — el fix de A7 solo restauró el wrap de la fila **externa**, no protegió el grupo interno; badge "URGENTE" con `tint(rose,16%)` falla AA en oscuro (~4.2:1, distinto del badge OVERDUE ya corregido); `animate-pulse` del badge OVERDUE ignora `prefers-reduced-motion`; botones de "+N más"/"Ver detalles" sin `aria-expanded`/`aria-controls`. |
| DailyChecklist | **6/10** | = | **Nuevo Crítico** (pérdida de datos al cambiar de restaurante sin cambiar de pestaña, ver arriba) reemplaza a C1 como el defecto que más aleja a esta pantalla de "clase mundial"; orden de tabulación del drawer de nota sigue invertido en el DOM real (solo se le añadió ARIA, no se reordenó, por lo que un usuario de teclado no puede tabular hacia el textarea recién revelado); `itemsNeedingReplenishment` no filtra por `.active`, mostrando un conteo distinto al que realmente se envía; clave de fecha del draft en UTC en vez de hora local (desalineación en turnos nocturnos fuera de UTC+0); `summaryBarH` todavía depende solo de `ResizeObserver` async (sin lectura síncrona), un resto del mismo patrón de parpadeo que M15b debía eliminar. |
| AdminCatalog | **6/10** | = | Formulario de producto sigue triplicado (alta inline, `EditCard`, edición de tabla — refactor mayor diferido deliberadamente); tabla de escritorio y tarjetas móviles se renderizan ambas simultáneamente (`block md:hidden`/`hidden md:block`, doble costo de reconciliación); tipo de restaurante (`r.type`) se muestra sin traducir fuera del formulario de alta (badge de tarjeta y `<select>` de filtro); botones Cancelar/Guardar de los 3 formularios (~28-32px) inconsistentes con el resto del propio archivo que sí exige 44px. |
| ShoppingView | **8/10** | +0.5 | Los 4 hallazgos que se le atribuían (tap target, `aria-live`, guardado de nota, `handleFinish` atascado) están genuinamente cerrados con código real (`try/finally`, `onBlur`/`onKeyDown`, `min-h-11`); resta un caso de datos obsoletos: `itemNotes` se inicializa una sola vez desde `request.items[].itemNote` y no se resincroniza si Realtime actualiza `request` tras el montaje; chips de filtro de proveedor a ~24px, por debajo del propio estándar de 44px del archivo. |
| AccountView | **8/10** | +1 | El auto-guardado al pulsar "atrás" (A2) y el `onError` de los avatares preestablecidos (B11) están genuinamente cerrados; le falta un estado de error explícito si `onSaveProfile` fallara (hoy no hay ruta de `catch` a este nivel, se asume éxito optimista). |
| NotificationsView | **7/10** | +1 | Tap targets y memoización (`visibleRequests`/`urgentCount`) genuinamente cerrados; `triggerNotification` (no-op muerto) fue **eliminado**, no solo parcheado — buena señal de mantenibilidad; sigue sin virtualización de lista (aceptable al volumen actual, techo de escalabilidad real) y sin sincronización entre pestañas del estado de "descartados" (`dismissedIds` en `localStorage` sin listener de `storage`). |

**Promedio (10 pantallas del encargo): 7.1/10** (subió de 6.8/10 el ciclo anterior — mejora real y amplia, no ruido). La base de diseño (tokens, tipografía, cero modales, i18n, code-splitting) alcanzó nivel de producción genuino este ciclo. Lo que impide un veredicto de aprobado no es la pulcritud visual — que mejoró sustancialmente — sino **dos defectos funcionales reales que un QA manual centrado en "cómo se ve" no detecta**: un crash de React en la transición más básica de la app (login/logout) y una vía de pérdida de datos silenciosa al cambiar de restaurante. Ambos son exactamente el tipo de regresión que un ciclo de "arreglar los hallazgos de la lista" puede introducir sin querer si no se re-verifica el comportamiento completo, no solo el diff.

---

## (d) Hallazgos por severidad

### 🔴 Crítico

**C1 — NUEVO: violación de Rules of Hooks en `App.tsx:621` que hace crashear la app en cada login y cada logout.**
`App.tsx:586-595` retorna `<LoginScreen/>` de forma condicional cuando `currentUser` es `null`. `App.tsx:621` declara `const currentNavTabs = useMemo(...)` **después** de ese `return` — introducido por el commit que memoiza `getNavTabs()` (arreglo de B4 del ciclo anterior). Cuando no hay sesión, el componente `App` ejecuta N hooks y retorna en la línea 586 sin llegar a la línea 621; en el instante en que el usuario selecciona un perfil (`handleSelectUser` → `setCurrentUser(u)`), el siguiente render ejecuta esos mismos N hooks **más** el nuevo `useMemo` — un cambio en el número/orden de hooks invocados en el mismo componente entre renders consecutivos, la violación central que las Rules of Hooks de React prohíben. Se reprodujo el patrón de forma aislada contra la versión de React 19.2.8 instalada en este proyecto, confirmando el error real de React: *"Rendered more hooks than during the previous render"*. El caso simétrico ocurre en `handleLogout` (`App.tsx:576-583`, `setCurrentUser(null)`): el render pasa de N+1 hooks a N.
- **Por qué no se detectó antes:** cualquier sesión de prueba que reutilice `localStorage` (el flujo normal de re-testear cambios) nunca vuelve a pasar por la rama `currentUser === null` tras el primer login, así que el crash solo aparece la primera vez que un usuario nuevo entra a la app o cuando alguien cierra sesión — exactamente los dos momentos que definen la primera impresión y el cierre de sesión del producto.
- **`tsc --noEmit` y `npm run build` NO lo detectan** — es un invariante de runtime de React, no un error de tipos ni de compilación; ESLint con `eslint-plugin-react-hooks` sí lo habría detectado (verificar si está configurado y activo en CI).
- **Recomendación:** mover el `useMemo` de la línea 621 (y cualquier hook futuro) por encima del `return` condicional de la línea 586, exactamente como ya están todos los demás hooks del componente (líneas 87-296 preceden al `return`). No requiere cambiar el cuerpo del memo, solo su posición.

**C2 — NUEVO (reaparición de la clase de bug de C1 del ciclo anterior, por una vía distinta): cambiar de restaurante sin cambiar de pestaña destruye el progreso guardado del Checklist Diario del restaurante de destino.**
El arreglo de persistencia del ciclo anterior (`DailyChecklist.tsx:25-91`, clave de `localStorage` por restaurante+día) funciona correctamente para el escenario que motivó el hallazgo original (cambiar de pestaña y volver — `DailyChecklist` se desmonta/remonta vía `App.tsx:730-739` `activeTab === 'CHECKLIST' && (...)`). Pero **no cubre cambiar de restaurante mientras la pestaña Checklist permanece montada**: el selector de local del Header puede cambiar `selectedRestaurantId` en cualquier momento sin desmontar `DailyChecklist`; como `App.tsx:730-739` no le pasa `key={selectedRestaurant.id}`, React reutiliza la misma instancia del componente, cuyos `useState` (`readings`/`reviewedIds`/`notes`/`isUrgent`, inicializados perezosamente desde el draft en `DailyChecklist.tsx:54-77`) **no vuelven a ejecutarse** al cambiar el prop `selectedRestaurant`. El `useEffect` de persistencia (`DailyChecklist.tsx:81-91`, que sí tiene `selectedRestaurant.id` en su array de dependencias) se dispara igualmente y escribe el estado — todavía con la forma del restaurante anterior — bajo la clave de `localStorage` del **nuevo** restaurante, sobrescribiendo cualquier progreso real que ese restaurante tuviera guardado.
- **Consecuencia real:** un admin o cocinero que supervisa más de un local, con el checklist de ambos a medio completar, puede perder el trabajo guardado del segundo restaurante con una sola acción (cambiar el selector del Header) — sin ningún aviso, exactamente el tipo de pérdida silenciosa de datos que el C1 original describía, ahora disparado por una interacción distinta que el ciclo corrector no probó.
- **Recomendación (elegir una):** (a) añadir `key={selectedRestaurant.id}` al `<DailyChecklist>` en `App.tsx` para forzar un remount completo al cambiar de restaurante — más simple, reutiliza el mismo mecanismo de persistencia ya probado para el cambio de pestaña; (b) añadir un `useEffect` con `[selectedRestaurant.id]` como dependencia que relea el draft (`readDraft`) y reinicie explícitamente los 4 estados antes de que el efecto de persistencia pueda ejecutarse con datos obsoletos.

### 🟠 Alto

**A1 — RegRESIÓN/arreglo incompleto: el footer de acciones de RequestsList sigue pudiendo partir el texto de los CTAs a media palabra en viewports estrechos.**
El commit `3360244` restauró `flex-wrap` en la fila **externa** del footer (`RequestsList.tsx:344`), pero el **grupo interno** de acciones a la derecha (`RequestsList.tsx:350`, `flex items-center gap-2 min-w-0 justify-end`) sigue sin `flex-wrap` propio, y sus `chipBtn` (línea 120-121) no tienen `whitespace-nowrap`. En un viewport de ~375px, un comprador o admin viendo una solicitud en estado "Pendiente" (2 CTAs simultáneos: p. ej. "Tomar Pedido" + "Modo Compra" en `RequestsList.tsx:385-398`, o "Asignarme" + "Modo Compra" en `:413-424`) tiene un grupo interno de ≈364px de ancho natural contra ≈343px disponibles — como el contenedor tiene `min-w-0` (se le permite encoger) y el texto de los botones no tiene protección contra el wrap, el navegador parte el texto ("Tomar"/"Pedido" en dos líneas) en vez de desbordar visiblemente o bajar el grupo completo a una segunda línea.
- **Recomendación:** añadir `flex-wrap` también al contenedor interno de `RequestsList.tsx:350`, o `whitespace-nowrap` a `chipBtn` (línea 120-121) para que cada botón se envuelva como unidad completa en vez de partirse a media palabra.

**A2 — Badge "URGENTE" de RequestsList falla contraste AA en tema oscuro (distinto del badge OVERDUE ya corregido).**
`RequestsList.tsx:215-221` usa `background: tint('var(--sf-rose)', 16)` + `color: 'var(--sf-rose)'` (texto y fondo del mismo hue). Contraste real calculado: rose `#f43f5e` sobre el fondo compuesto al 16% sobre `--sf-surface` oscuro (`#0f1626`) ≈ **4.2:1**, por debajo de 4.5:1 para texto de 12px en negrita. En tema claro pasa (~4.76:1) porque `--sf-rose` es mucho más oscuro ahí. El mismo patrón `tint()` con amber (14%) y text-subtle (14%) sí supera 5:1 — no es un bug sistémico del helper `tint()`, es específico de esta combinación rose/16%.
- **Recomendación:** igualar al tratamiento ya usado correctamente en el badge OVERDUE (`RequestsList.tsx:222-228`): fondo sólido `var(--sf-rose)` + texto `var(--sf-accent-contrast)`, en vez de fondo tintado + texto del mismo hue.

**A3 — `prefers-reduced-motion` no se respeta en ningún sitio de la app fuera de los 3 componentes donde se adoptó `motion` explícitamente — hallazgo transversal, no de una sola pantalla.**
`grep -rn "prefers-reduced-motion"` sobre todo `src/` no devuelve ninguna coincidencia. Mientras `useReducedMotion()` de la librería `motion` sí se aplicó correctamente en los drawers/tarjetas de `RequestsList.tsx` y `DailyChecklist.tsx` (M11 del ciclo anterior, verificado genuino), **todo el resto de animación del proyecto es CSS pura sin ninguna guarda**: `animate-pulse` del badge OVERDUE (`RequestsList.tsx:223`), `.animate-fadeIn`/`.sf-pop` (`index.css:170-185`, usados en `Header.tsx:106,146`, `BottomNav.tsx:59`, `AdminCatalog.tsx:131,188,360`, `AccountView.tsx:216`), las transiciones inline de entrada de `LoginScreen.tsx` (líneas 94-95, 135-136, 179, ~700ms), y la barra de progreso de `DailyChecklist.tsx:214` (`transition-all duration-300`). El badge `animate-pulse` en particular es una animación infinita y autoiniciada, un caso claro de WCAG 2.2.2 (Pause, Stop, Hide) para usuarios con sensibilidad vestibular.
- **Recomendación:** añadir una regla global en `index.css` — `@media (prefers-reduced-motion: reduce) { .animate-fadeIn, .sf-pop, .animate-pulse { animation: none !important; } }` — y auditar las transiciones inline de `LoginScreen.tsx` para envolverlas en la misma condición (o migrarlas a `motion` con `MotionConfig reducedMotion="user"`, consistente con el resto del proyecto).

**A4 — Contadores de Header y BottomNav invisibles para lectores de pantalla.**
`Header.tsx:137-152` (`aria-label={t.headerNotifications}` en el botón que envuelve el ícono *y* el número de notificaciones pendientes) y `BottomNav.tsx:39-64` (`aria-label={tab.label}` envolviendo el badge de conteo) — un `aria-label` en el elemento padre reemplaza por completo el nombre accesible de todo su contenido hijo, así que un usuario de VoiceOver/TalkBack escucha solo "Alertas y Notificaciones" o "Solicitudes", sin ninguna indicación de cuántos ítems pendientes hay — información que un usuario vidente recibe gratis vía el badge rojo.
- **Recomendación:** incluir el conteo en el propio `aria-label`, p. ej. `` aria-label={activeRequestsCount > 0 ? `${t.headerNotifications} (${activeRequestsCount})` : t.headerNotifications} ``, mismo patrón para `tab.label` en BottomNav.

**A5 — Fallo de contraste AA real (calculado) en el texto de rol de LoginScreen, exclusivo de tema claro.**
`LoginScreen.tsx:151-162` pinta el texto de rol con el mismo hue que su propio fondo tintado (`tint(config.color, 10)` para la fila, `tint(config.color, 16)` para el avatar). En tema **claro**: `cocinero` (ámbar `#b45309`) da 4.04:1 (fila) / 3.72:1 (avatar); `comprador` (accent `#047857`) da 4.37:1 / 4.03:1 — ambos por debajo de 4.5:1 para texto de 12-14px. `admin` (violeta `#6d28d9`) sí pasa (5.53:1/5.02:1). En tema oscuro los 3 roles pasan cómodamente (5.85-8.04:1), lo que explica por qué ningún ciclo anterior lo detectó si las pruebas se hicieron mayormente en oscuro.
- **Recomendación:** no reutilizar el mismo hue de baja opacidad para texto y fondo; oscurecer más los tokens de ámbar/accent en tema claro, o usar un token de texto fijo de alto contraste (`--sf-text`) para la etiqueta de rol y reservar el hue solo para el ícono/punto, como ya hace `--sf-accent-soft` en Header (verificado 4.73:1/5.74:1).

**A6 — Orden de tabulación invertido en el drawer de nota de DailyChecklist — la accesibilidad de teclado sigue rota pese al ARIA añadido.**
M15c del ciclo anterior se cerró solo a medias: `aria-expanded`+`aria-controls` sí se añadieron de forma consistente a ambos disclosures (`DailyChecklist.tsx:433-436` y `456-459`), pero **el orden real en el DOM no se corrigió** — ambos paneles (`362-394` vista previa, `397-427` nota) siguen renderizándose *antes* que la barra principal con sus botones disparadores (`430-476`). Un usuario de teclado que llega al botón de nota (línea 456) y lo activa con Enter/Espacio, al presionar Tab de nuevo **no llega al textarea recién revelado** — por estar antes en el DOM, ya fue "pasado" en el orden de tabulación; el foco salta directo al checkbox de urgente (465) y al botón de envío (471). El textarea solo es alcanzable tabulando hacia adelante desde algo *anterior* al disparador, o con Shift+Tab hacia atrás — nunca tabulando hacia adelante desde el control que lo abre. Es una violación real de WCAG 2.4.3 (Focus Order), más grave que en el drawer de vista previa porque este panel sí contiene controles interactivos reales (textarea + botón), no solo texto.
- **Recomendación:** mover los 2 bloques de `AnimatePresence` (362-427) a **después** de la barra principal (430-476) en el JSX, y usar CSS (`flex-col-reverse`, `order`, o posicionamiento absoluto) para mantener el apilamiento visual esperado (el contenido del drawer aparece arriba de la fila) — desacopla el orden visual del orden del DOM, igual que ya hace el popover de Header (disparador antes que su contenido, en DOM y visualmente).

**A7 — `itemsNeedingReplenishment` de DailyChecklist no filtra por `.active`, mostrando un conteo distinto al que realmente se envía.**
`DailyChecklist.tsx:149-154` filtra `products` directamente sin comprobar `p.active`, a diferencia de `activeProducts` (línea 132) y `filteredProducts` (línea 145) que sí lo hacen. Un producto desactivado en AdminCatalog pero con una lectura obsoleta bajo su `minThreshold` sigue contando en el badge "bajo mínimo" (líneas 205-210), sigue apareciendo en el drawer de vista previa del pedido (375-390) como si fuera a pedirse, y sigue sumando al conteo "N ítems a reponer" del texto principal (441, 445) — pese a que tanto `submitDailyChecklist` (`src/lib/api.ts:145-147`) como el fallback local (`App.tsx:316`) sí filtran por `.active` al construir la solicitud real. El número que el usuario ve antes de enviar puede ser mayor que lo que realmente se envía.
- **Recomendación:** aplicar el mismo filtro `.active` en `itemsNeedingReplenishment` que ya usan las otras dos listas derivadas del mismo archivo.

**A8 — AdminCatalog: tipo de restaurante (`r.type`) sigue sin traducir fuera del formulario de alta.**
M13 del ciclo anterior se cerró solo a medias: las opciones del `<select>` del formulario de alta de restaurante sí usan `t.adminTypeFoodTruck/Restaurant/Cafe/Bistro` (`AdminCatalog.tsx:372-375`, genuinamente corregido), pero el valor crudo `r.type` se sigue mostrando literal en el badge de la tarjeta de restaurante (`AdminCatalog.tsx:395`, `{r.type}`) y en el `<select>` de filtro de productos (`AdminCatalog.tsx:171`, `{r.name} ({r.type})`). Como `caddyShackData.ts` almacena `type: 'Restaurante'|'Bistro'|'Food Truck'` como strings literales fijos, un usuario en inglés sigue viendo "Restaurante"/"Bistro" como texto literal en dos superficies visibles.
- **Recomendación:** añadir un helper `formatRestaurantType(type, t)` en `formatters.ts` (mismo patrón que `formatCategoryName`) y usarlo en ambos sitios.

**A9 — Objetivos táctiles inconsistentes dentro del propio AdminCatalog.**
Los botones Cancelar/Guardar de los 3 formularios de producto (alta inline `:226-227`, alta de restaurante `:383-384`, `EditCard` `:470-471`) usan `px-4 py-2`/`px-3 py-1.5` (~28-32px de alto), muy por debajo del estándar de 44px que el mismo archivo aplica consistentemente en otros lugares (botones de cerrar `w-11 h-11` en `:191,363`). Un comprador usando la tarjeta de edición móvil en una cocina real puede fallar el tap en Cancelar/Guardar precisamente porque el resto de la pantalla lo acostumbra a objetivos de 44px.
- **Recomendación:** subir a `min-h-11` los 6 botones señalados.

### 🟡 Medio

**M1 — Formulario de producto de AdminCatalog sigue triplicado (alta inline, `EditCard`, edición de tabla).** Refactor mayor documentado como deuda diferida desde el ciclo anterior — no es una regresión, sigue siendo una decisión de alcance razonable, pero cada nuevo campo de producto debe implementarse 3 veces.

**M2 — AdminCatalog renderiza simultáneamente tarjetas móviles y tabla de escritorio.** `AdminCatalog.tsx:237` (`block md:hidden`) y `:278` (`hidden md:block`) mapean ambos `filteredProducts` sin condicionar el montaje — solo ocultos por CSS. Con el catálogo completo (~282 productos en `caddyShackData.ts`), cada producto se reconciliaría dos veces incluso filtrado a un solo restaurante.

**M3 — Asimetría de alcance CRUD en AdminCatalog sin documentar.** Restaurantes solo permite alta; Proveedores es 100% de solo lectura — sin ningún comentario o nota que indique si es una decisión deliberada de este ciclo de MVP.

**M4 — La memoización de listas derivadas de Realtime (M10 del ciclo anterior) es código React correcto pero su efectividad real está limitada por el canal Realtime sin scope.** `App.tsx:190-218` suscribe `sf_supply_requests_all` sin filtrar por restaurante, y llama `setSupplyRequests` con una referencia nueva en cada evento de cualquier restaurante del sistema — como `requests` es dependencia de los `useMemo` de `Dashboard.tsx` y `RequestsList.tsx`, la caché de memo se invalida con la misma frecuencia que antes del arreglo en un escenario multi-restaurante con volumen real. El `useMemo` sí ayuda para renders no relacionados con `requests`, pero no resuelve el problema de fondo de recomputar en cada tick de Realtime a escala.

**M5 — Botones de "+N más"/"Ver detalles" de RequestsList sin `aria-expanded`/`aria-controls`.** `RequestsList.tsx:288` y `:345-348` alternan el mismo estado `expandedRequestIds` sin exponer semántica de disclosure widget (WCAG 4.1.2).

**M6 — Duplicación arquitectónica en la construcción de estadísticas de Dashboard.** `Dashboard.tsx:67-111` repite lógica de filtro/reduce casi idéntica 3 veces (cocinero/comprador/admin) con predicados ligeramente distintos — riesgo de deriva copy-paste al añadir un rol o estadística nueva.

**M7 — `itemNotes` de ShoppingView puede quedar obsoleto tras una actualización de Realtime.** `ShoppingView.tsx:39-45` inicializa el estado local solo en el montaje; si `request` se actualiza vía Realtime después (otro dispositivo edita la misma nota), reabrir "editar nota" muestra el borrador antiguo, no el valor guardado más reciente.

**M8 — Chips de filtro de proveedor en ShoppingView a ~24px, por debajo del propio estándar de 44px del archivo.** `ShoppingView.tsx:140,152` — inconsistente con el resto de botones de la misma pantalla, que sí están en `min-h-11`, y particularmente relevante en una pantalla pensada para uso de una mano en un pasillo de tienda.

**M9 — Ícono de marca (`Flame`) con `color:'#ffffff'` hardcodeado, sin tokenizar y con contraste real bajo contra su propio degradado.** `LoginScreen.tsx:101` y `Header.tsx:78` — único resto de hex hardcodeado tras la migración de tokens de A4 del ciclo anterior, duplicado en 2 archivos. Contraste de blanco contra los stops del degradado: esmeralda 3.77:1, teal 2.49:1, ámbar **1.67:1** — dependiendo de la posición exacta del ícono, probablemente cae en la zona teal/ámbar de bajo contraste.

**M10 — Callbacks no memoizados hacia Header/BottomNav anulan parte del beneficio de memoizar `currentNavTabs`.** `App.tsx:707,711-712,779` crean funciones nuevas en cada render; ni `Header` ni `BottomNav` están envueltos en `React.memo`, así que estas identidades nuevas siguen forzando re-render en cada tick de estado de `App` (mensajes SSE, reloj de 60s, polling de atrasos).

**M11 — `summaryBarH` de DailyChecklist sigue dependiendo solo de `ResizeObserver` asíncrono, sin lectura síncrona inicial.** `DailyChecklist.tsx:109-117` arranca en un valor fijo de `96` y se corrige solo cuando el observer dispara — a diferencia de `navH` (líneas 97-103), que sí lee `offsetHeight` de forma síncrona dentro de `useLayoutEffect`. Mismo patrón de parpadeo que M15b debía eliminar, reubicado en vez de resuelto del todo.

**M12 — Clave de fecha del draft de DailyChecklist usa UTC, no hora local.** `DailyChecklist.tsx:26` — `new Date().toISOString().slice(0,10)` trunca a la fecha calendario **UTC**, mientras el resto de la app (p. ej. `Dashboard.tsx:39`) razona en hora local. Para un restaurante fuera de UTC+0 en turno nocturno, la clave del draft puede avanzar al "día siguiente" varias horas antes de medianoche local.

**M13 — `showOrderPreview` de DailyChecklist no se persiste pese a estar nombrado explícitamente en el alcance original del arreglo de C1.** `ChecklistDraft` (`DailyChecklist.tsx:18-23`) no tiene ese campo; el drawer se vuelve a colapsar silenciosamente al cambiar de pestaña y volver.

**M14 — `PRODUCT_CATEGORIES`/`Category` sin verificación de exhaustividad en tiempo de compilación.** `formatters.ts:4-14` y `types.ts:3-12` son dos listas mantenidas independientemente; TypeScript detecta una categoría añadida al array que no está en el tipo, pero no al revés — el mismo tipo de deriva que causó A6 del ciclo anterior podría repetirse silenciosamente.

**M15 — `M14` (try/catch) del ciclo anterior arreglado en `LoginScreen.handleSelect` sin `catch`, solo `try/finally`.** `LoginScreen.tsx:56-62` — el spinner ya no se queda atascado (el `finally` corrige eso), pero cualquier excepción de `onSelectUser` se relanza sin capturar, convirtiéndose en un error global no controlado en vez de un mensaje visible al usuario (a diferencia del patrón ya usado para M9 en el mismo archivo). El disparador realista sigue existiendo: `App.tsx:568` y `:136` llaman `localStorage.setItem` sin protección un paso después de una llamada equivalente que sí está en try/catch.

**M16 — Lista de solicitudes de NotificationsView sin virtualización (M6 del ciclo anterior, sin cambios, aceptable al volumen actual).**

**M17 — `dismissedIds` de NotificationsView en `localStorage` sin sincronización entre pestañas.** Sin listener de evento `storage`; bajo impacto para un PWA de un solo dispositivo, pero un resto real de la B9 original.

### 🟢 Bajo

**B1 — LoginScreen footer "SupplyFlow V2 · Demo" hardcodeado, sin pasar por `t.xxx`.** `LoginScreen.tsx:180`.

**B2 — `title` y `aria-label` del botón de perfil de Header comunican información distinta, y el estado de conexión no se anuncia en vivo.** `Header.tsx:161-162` — `title` muestra el nombre del usuario, `aria-label` muestra el estado de conexión; ninguno tiene `aria-live` para anunciar una transición de reconexión.

**B3 — Popover de selección de local de Header no usa un patrón `listbox`/`menu` real.** `Header.tsx:104-131` — operable por teclado (Tab/Enter) pero sin roving-tabindex ni navegación por flechas esperada de un selector de este nivel de diseño.

**B4 — LoginScreen es la única pantalla del shell sin `playAlertSound` en sus interacciones.** Inconsistente con Header/BottomNav/ViewHeader, que sí dan feedback sonoro al tap.

**B5 — Botones de acción de fila de la tabla de escritorio de AdminCatalog (~26px) por debajo de sus equivalentes móviles (44px).** `AdminCatalog.tsx:328,329,333,334` — pasa el mínimo WCAG 2.5.8 de 24px pero es inconsistente con el resto del archivo; contexto de mouse/desktop, prioridad baja.

**B6 — "+N más" de RequestsList en el límite de 24px (WCAG 2.5.8), lejos del estándar aspiracional de 44px del resto del archivo.** `RequestsList.tsx:288`.

**B7 — Etiquetas de las pestañas de filtro de RequestsList pueden truncarse a casi ilegibles en ~375px.** `RequestsList.tsx:113-118,151` — `grid-cols-4` con badge de conteo deja ~45-50px por etiqueta.

**B8 — `handleSubmit` de DailyChecklist tipado `React.FormEvent` pero conectado vía `onClick` sin ningún `<form>` en el archivo.** `DailyChecklist.tsx:170-181,470` — resto de una estructura `<form onSubmit>` anterior; compila y funciona, pero confunde sobre la semántica real del botón.

**B9 — `readDraft` de DailyChecklist sin validación de forma en runtime del JSON parseado.** `DailyChecklist.tsx:30-37` — un draft corrupto o de un esquema anterior podría producir un `reviewedIds` no iterable y hacer fallar `new Set(...)` en el siguiente `useState`.

**B10 — Separadores decorativos (`•`/`·`) de DailyChecklist sin `aria-hidden`.** `DailyChecklist.tsx:198,294` — un lector de pantalla puede anunciar "bullet" entre fragmentos de texto adyacentes.

**B11 — Acoplamiento DOM frágil: `document.querySelector('nav')` en DailyChecklist.** `DailyChecklist.tsx:99` — funciona hoy porque hay un único `<nav>` en toda la app, pero sin ninguna señal en tiempo de compilación si eso cambia.

**B12 — Sin objetos/arrays literales memoizados en RequestsList.** `FILTERS` (`:113-118`) y los mapas de etiquetas de estado se recrean en cada render; costo despreciable hoy, inconsistente con que el resto del archivo ya usa `useMemo`.

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Crítico, esfuerzo mínimo — una línea de código, máximo impacto)** C1 — Mover el `useMemo` de `App.tsx:621` por encima del `return` condicional de la línea 586. Verificar con una prueba manual real de login-desde-cero (borrar `localStorage`) y logout, no solo con una sesión ya persistida.
2. **(Crítico)** C2 — Añadir `key={selectedRestaurant.id}` al `<DailyChecklist>` en `App.tsx` (o el `useEffect` de recarga explícita alternativo), y probar el escenario exacto: progreso en Restaurante A → cambiar a Restaurante B desde el selector del Header sin cambiar de pestaña → verificar que el draft de B (si existía) sigue intacto.
3. **(Alto, una línea)** A1 — `flex-wrap` en `RequestsList.tsx:350` o `whitespace-nowrap` en `chipBtn`.
4. **(Alto, una línea)** A2 — Badge URGENTE de RequestsList al mismo tratamiento sólido que OVERDUE.
5. **(Alto, transversal, impacto de accesibilidad amplio)** A3 — Regla global `prefers-reduced-motion` en `index.css` cubriendo `animate-pulse`/`.animate-fadeIn`/`.sf-pop`/transiciones inline de LoginScreen.
6. **(Alto)** A4 — Incluir el conteo en el `aria-label` de los badges de Header/BottomNav.
7. **(Alto)** A5 — Corregir contraste de texto de rol en LoginScreen tema claro (no reusar el mismo hue para texto y fondo tintado).
8. **(Alto, requiere reordenar JSX, no solo ARIA)** A6 — Mover los 2 drawers de DailyChecklist después de su barra disparadora en el DOM.
9. **(Alto, una línea)** A7 — Filtrar por `.active` en `itemsNeedingReplenishment`.
10. **(Alto)** A8 — `formatRestaurantType(type, t)` compartido en `formatters.ts`, usado en los 2 sitios pendientes de AdminCatalog.
11. **(Alto, 6 botones)** A9 — Subir a `min-h-11` los botones Cancelar/Guardar de los 3 formularios de AdminCatalog.
12. **(Medio, alta frecuencia de aparición en informes anteriores)** M4 — Filtrar el canal Realtime de `App.tsx:190-218` por restaurante/usuario relevante en vez de suscribir todos los eventos del sistema — esto es lo que de verdad haría efectiva la memoización ya implementada.
13. **(Medio)** M9 — Token `--sf-brand-fg` para el ícono de marca en vez de `#ffffff` duplicado.
14. **(Medio)** M10 — `useCallback` en los handlers pasados a Header/BottomNav + `React.memo` en ambos componentes.
15. **(Medio)** M11/M12/M13 — Cerrar del todo la familia de defectos de la barra fija de DailyChecklist: lectura síncrona de `summaryBarH`, clave de fecha en hora local, persistir `showOrderPreview`.
16. **(Medio)** M15 — Añadir `catch` explícito (no solo `finally`) en `LoginScreen.handleSelect`, y envolver los `localStorage.setItem` sueltos de `App.tsx:136,568` en try/catch, igual que ya se hizo para `persistJSON`.
17. **(Medio)** M1–M3, M5–M8, M14, M16, M17 — cerrar en orden de impacto/esfuerzo los hallazgos de AdminCatalog/RequestsList/ShoppingView/NotificationsView listados arriba.
18. **(Bajo, cuando haya tiempo)** B1–B12 — i18n del footer de LoginScreen, patrón `listbox` del popover de Header, feedback sonoro consistente, `aria-hidden` en separadores decorativos, validación de forma de `readDraft`, memoización fina.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` ya contienen **12 pares completos** (`mobile-ux-review`/`mobile-ux-reviewer`, `design-system-guardian` ×2, `wcag-audit`/`wcag-auditor`, `motion-microinteractions`/`motion-reviewer`, `design-token-architect` ×2, `typography-color-system`/`typography-color-reviewer`, `visual-qa` ×2, `frontend-architecture-review`/`frontend-architecture-reviewer`, `i18n-parity-guardian` ×2, `supabase-persistence-guardian` ×2, `performance-budget-auditor` ×2, `async-error-handling-guardian` ×2) — los 4 gaps identificados en los 2 ciclos anteriores **ya se cubrieron** (i18n, Supabase, performance, async-error-handling), y ninguno de los 12 debe duplicarse. Esta pasada identifica **2 gaps nuevos reales**, con evidencia propia de esta auditoría — ninguno de los 12 skills existentes los cubre porque ninguno audita el flujo de renderizado condicional de React ni la relación prop→estado-persistido entre componentes padre-hijo:

| Skill nueva propuesta | Por qué hace falta (evidencia) |
|---|---|
| `react-hooks-invariant-guardian` | C1 de esta pasada (`App.tsx:621`) es un crash real de producción invisible tanto para `tsc` como para `npm run build` — ninguno de los 12 skills existentes revisa el orden/posición de los hooks respecto a `return`s condicionales. Una checklist dedicada ("¿todo hook está antes de cualquier `return` temprano en el componente? ¿el número de hooks es el mismo en todas las ramas de renderizado?") habría detectado esto antes de mergear el commit que arregló B4. Complementa (no duplica) a `frontend-architecture-reviewer`, que audita duplicación/rendimiento, no invariantes de runtime de React. |
| `stateful-prop-transition-guardian` | C2 de esta pasada (pérdida de datos de DailyChecklist al cambiar de restaurante) es la segunda vez en 2 ciclos consecutivos que un componente con estado persistido en `localStorage` pierde datos por una transición de props no probada (antes: cambio de pestaña; ahora: cambio de restaurante sin cambio de pestaña). Ningún skill existente audita específicamente "¿qué pasa con el estado de este componente si cambia un prop identificador (id de restaurante/usuario/fecha) sin que el componente se desmonte?" — una pregunta distinta de `supabase-persistence-guardian` (que audita el fallback de red y el patrón de overrides, no las transiciones de props). |

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto a los ciclos anteriores: **Figma MCP** (specs/tokens de diseño), **Chrome DevTools/Playwright MCP** (Playwright local ya disponible vía Bash sin MCP en este entorno — habría sido especialmente útil esta pasada para reproducir visualmente C1, el crash de login/logout, en vez de solo por análisis estático + reproducción aislada de hooks), **Vercel MCP** (estado del deploy de preview). Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx`; la barra fija de DailyChecklist y la barra de acciones de ShoppingView son `fixed inset-x-0`, no overlays de pantalla completa. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white` en superficies/`text-slate-*`/`border-slate-*`) | **PASA** por grep en los 4 grupos de archivos auditados — 0 coincidencias. Persisten 2 casos de `color:'#ffffff'` **inline** (no clase Tailwind) en el ícono de marca (M9), técnicamente fuera del literal de esta regla pero sí una violación del principio de "cero colores hardcodeados". |
| 3 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — `.safe-bottom` aplicado en `BottomNav.tsx`, `App.tsx` reserva el padding equivalente en `<main>`. La barra fija de DailyChecklist calcula su padding dinámicamente vía `ResizeObserver` (M15a del ciclo anterior, verificado cerrado para el estado estable). |
| 4 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — A9 (AdminCatalog, 6 botones), M8 (ShoppingView, chips de proveedor), B5/B6/B7 (varios objetivos por debajo de 44px pero sobre el mínimo de 24px). |
| 5 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — A2/A5 (contraste real calculado, 2 casos nuevos); A4 (badges invisibles a lectores de pantalla); A6 (orden de tabulación, WCAG 2.4.3); A3 (motion sin pausa, WCAG 2.2.2); M5 (disclosure sin ARIA completo). |
| 6 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — A1 (footer de RequestsList sigue partiendo texto en viewports ~375px con 2 CTAs, arreglo de A7 del ciclo anterior incompleto). |
| 7 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (crítica)** — C1 (crash de React en login/logout) y C2 (pérdida de datos del checklist al cambiar de restaurante) son ambas regresiones funcionales reales de severidad máxima, introducidas por los propios commits correctores de este ciclo. |
| 8 | i18n ES/EN mismas claves | **PASA** — 380/380 claves en ambos locales, sin huecos (verificado por extracción programática); A8/B1 son strings puntuales fuera de la paridad de claves (no la rompen), no huecos de traducción. |
| 9 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal de 308.95 kB (86.16 kB gzip), sin aviso de tamaño (M12 del ciclo anterior, genuinamente resuelto). **Importante:** este PASA no cubre C1, que es un fallo de runtime, no de compilación — un build/tsc verde no es evidencia de que la app funcione en el flujo de login/logout. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `5f8f719`. Desde entonces aterrizaron 18 commits correctores (`19c845f` → `cfdd27d`) que abordaron, con evidencia real verificada en esta pasada: C1 (persistencia parcial), A1–A7, M1, M2 (parcial), M3, M4, M7, M9, M10, M11, M12, M13 (parcial), M14, M15 (parcial), B1, B2, B4 (con regresión), B6, B8, B9, B10, B11, B12, y crearon 4 skills/subagentes nuevos (`i18n-parity-guardian`, `supabase-persistence-guardian`, `performance-budget-auditor`, `async-error-handling-guardian`). El trabajo es sustancialmente real: la puntuación promedio subió de 6.8 a 7.1, el bundle bajó de 615.85 kB a 308.95 kB, y la mayoría de los hallazgos Altos/Medios de hace 2 ciclos están genuinamente cerrados con código verificable, no solo relabeled. Pero **2 de esos mismos commits introdujeron 2 hallazgos Críticos nuevos** (uno de ellos un crash de React en el flujo de login/logout, el otro una vía de pérdida de datos que reaparece la clase de problema que el propio ciclo creía haber cerrado) — el motivo de que el veredicto siga siendo CON HALLAZGOS pese a la mejora real y amplia en el resto del código.
