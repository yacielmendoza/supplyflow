# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-05 (pasada automatizada del ciclo de mejora continua)
**Commit auditado:** `9118b61` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring/sesión/tema/idioma), sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** desde el informe anterior (auditado sobre `27766c8`, VEREDICTO: CON HALLAZGOS, 4 Altos + 11 Medios) aterrizaron 6 commits correctores (`306a31d..2a99a8f`) que `CORRECCIONES_APLICADAS.md` dice cerraron los 4 Altos (H1–H4) y 7 de los 11 Medios (M1, M6–M11). Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit ni por el propio `CORRECCIONES_APLICADAS.md`**: se releyó el código real contra `HEAD` con 4 sub-auditorías delegadas en paralelo, cada una con instrucciones explícitas de verificar cada claim línea por línea contra el código actual y trazar manualmente secuencias de eventos donde aplicaba:

1. **Shell** (LoginScreen, Header, BottomNav, ViewHeader, `App.tsx` routing/sesión/tema/idioma) — verificación de M1 (popover Tab-out) y B4 (avatar `onError`), re-verificación de los 2 Críticos históricos.
2. **Dashboard + RequestsList** — verificación de H4 (pérdida de foco en "+N más"), re-chequeo de M3/M4/M5/B5/B7/B8/B9.
3. **DailyChecklist en profundidad** — reconstrucción manual, evento por evento, de H1 (protección de campos), H2 (reloj lógico `seq`) y H3 (guard de montaje), más M6/M10/M11, con foco especial porque este archivo lleva ya **cuatro** ciclos consecutivos con hallazgos de sincronización entre pestañas.
4. **AdminCatalog + AccountView + NotificationsView + ShoppingView** — verificación de M7 (nombres accesibles distinguibles), M8 (label huérfano), M9 (`aria-pressed`→`aria-current`), B11 (`stopPropagation` residual), re-chequeo de la deuda de arquitectura conocida.

Además, el agente auditor ejecutó de forma independiente `tsc`/`build` propios, una extracción programática de paridad i18n, y greps propios de clases dark-only/hex hardcodeado/`fixed inset-0`.

## VEREDICTO: CON HALLAZGOS

Los 4 Altos y 7 de los 11 Medios reclamados por el ciclo corrector están **genuinamente resueltos para el escenario literal que cada uno describe**, verificados evento por evento: H1 (el guard de reatribución de autoría al montar ahora es incondicional — `useRef(true)` en vez de `useRef(!!draft)` — y funciona en ambas ramas, con/sin borrador previo), H2 (el `focusout` del popover de `Header` cierra correctamente al salir con Tab, con trazado del `relatedTarget` confirmado), H3 (el guard de montaje de `DailyChecklist` — antes llamado A1/H3 según el ciclo — cubre ahora ambas ramas), H4 (la pérdida de foco de "+N más" en `RequestsList` está genuinamente resuelta: el botón de destino ya está montado en el DOM antes del clic, así que el `.focus()` síncrono aterriza en un nodo real, sin necesidad de `useEffect`/`setTimeout`), M6 (la clave de `localStorage` del listener de `DailyChecklist` se recalcula en cada evento, no solo al montar), M7 (nombres accesibles distinguibles por ítem, verificados en `ShoppingView` y `NotificationsView`), M8 (el `<label>` huérfano de `NotificationsView` es ahora un `<div>`), M9 (`aria-current` consistente entre `AdminCatalog`, `NotificationsView` y `RequestsList`, mismo valor `'true'`/`undefined`), M10 (el input de stock ya no se fuerza a "0" al vaciarse — verificado con el caso límite de perder el foco sin escribir nada, que revierte al valor anterior sin forzar cero), M11 (confirmación de dos toques antes de descartar ediciones reales, con el caso sin ediciones actuando de inmediato).

Pero — **el mismo patrón de "cuanto más a fondo se audita, más aparece" que ya definió los tres ciclos anteriores se repite una cuarta vez**, y esta vez con el hallazgo de mayor riesgo de negocio de todo el historial de este ciclo: la propia corrección de H1/H2 de `DailyChecklist`, al proteger `isUrgent`/`reviewedIds`/`showOrderPreview` con una ventana de recencia, **dejó exactamente el mismo hueco sin cerrar en el campo `readings` (los conteos de stock físico) — el campo de mayor valor de negocio de todo el borrador, y el único que NUNCA tuvo el mismo tipo de protección que los demás.** `readings` solo está protegido mientras el producto tiene el foco activo (`focusedStockProductIdRef`); en cuanto el usuario hace *blur* para pasar al siguiente producto —el flujo normal de revisión uno-por-uno— existe una ventana real en la que una actualización remota concurrente puede sobrescribir en silencio ese conteo recién editado, antes de que el efecto de persistencia local siquiera llegue a escribirlo. Además, el propio contador lógico `seq` introducido para cerrar H2 (reloj de pared → reloj lógico) **no es resistente a colisión entre escritores concurrentes**: dos pestañas que parten del mismo `lastKnownSeqRef` y escriben casi simultáneamente calculan el mismo `seq`, y la comparación estricta `<=` descarta la segunda escritura de forma silenciosa y permanente — reproduciendo el síntoma original de H2 (pérdida de datos por carrera entre dispositivos) por un mecanismo distinto al que el fix de este ciclo probó. Y el propio banner "Mantener la mía / Descartar" que gestiona los conflictos de borrador es, en sí mismo, una acción destructiva sin ámbito claro: "Descartar" no descarta "mi vista local", borra **el borrador compartido completo** para todas las pestañas abiertas — incluida la de un compañero que esté editando en ese momento — exactamente el flujo de uso concurrente que la propia app dice soportar.

También se identificaron **hallazgos Altos nuevos fuera de `DailyChecklist`**: en `RequestsList`, el deep-link desde una notificación push nunca hace scroll hasta la tarjeta resaltada (el `id` del DOM existe pero `scrollIntoView` no se llama en ningún sitio del repo), rompiendo el caso de uso exacto para el que existen las notificaciones en una lista larga; y en `AccountView`, la lista "Cambiar usuario" no expone ninguna indicación programática de cuál es la cuenta activa (ni `aria-current` ni `aria-pressed`, solo un ícono visual). Compilación limpia, cero modales, cero clases dark-only, cero colores hardcodeados fuera de tokens, fallback público de Supabase intacto, i18n en paridad 423/423.

**Nota sobre comparabilidad de puntuaciones:** esta pasada instruyó explícitamente a cada sub-auditoría a puntuar como "juez duro y exigente, no indulgente" contra el mismo listón de referencia de siempre. El promedio de esta pasada (ver sección c) es más bajo que el del ciclo anterior; parte de esa caída refleja hallazgos nuevos reales (no solo criterio más estricto), pero el lector no debe interpretar el delta numérico como una regresión funcional lineal — varios de los hallazgos Altos del ciclo anterior sí están genuinamente cerrados, en paralelo a los hallazgos nuevos que bajan la nota.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
vite v6.4.3 building for production...
✓ 2137 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-DL_5FbBe.css              32.21 kB │ gzip:  6.94 kB
... (13 chunks lazy-loaded por pantalla, todos <25 kB)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-CL_yFcNY.js              314.79 kB │ gzip: 87.94 kB
✓ built in 3.56s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 11ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. Chunk principal 314.79 kB (87.94 kB gzip), variación mínima respecto al ciclo anterior.
- **i18n:** `src/lib/translations.ts` → **423/423 claves** en `es` y `en` (verificado por extracción programática propia; `es:` en la línea 4, `en:` en la línea 465-466; 0 huecos en cualquier dirección). Spot-check adicional de las claves consumidas por Header/LoginScreen/BottomNav confirma coincidencia semántica, no solo presencia de la clave.
- **Diseño de tokens:** grep propio de `bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`/`fixed inset-0`/hex hardcodeado sobre los 10 componentes + `App.tsx` + `index.css`: **0 coincidencias reales** (el único hex fuera de `index.css` sigue siendo el `<meta name="theme-color">` de `App.tsx:656`, legítimo).
- **Working tree:** se revirtió un diff incidental de `package-lock.json` generado por `npm install` en este entorno (cambios de flag `"peer": true` por versión de npm del entorno, sin relación con el código auditado — mismo patrón ya documentado en ciclos anteriores).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Qué falta para llegar a 10 |
|---|---|---|
| LoginScreen | **7/10** | Estructura limpia, timeout/retry real, animación de entrada escalonada. Falta: cabeceras de sección siguen sin ser `<h2>` (B3, sin cambios); el estado de "cargando" (`Loader2`, disabled de botones hermanos) es código muerto — con el batching automático de React 19, `setLoadingUserId`/`onSelectUser` (síncrono)/`setLoadingUserId(null)` colapsan en un solo commit y el spinner nunca llega a pintarse; sin skeleton de carga de la lista de usuarios; sin feedback háptico (`navigator.vibrate`) más allá de `active:scale-[0.98]`. |
| Header | **7.5/10** | El listbox del selector de restaurante es una implementación APG genuinamente sólida (roving tabindex, flechas/Home/End/Escape, y ahora M1: cierre real al salir con Tab, trazado con `relatedTarget`). Nuevo hallazgo: el botón de perfil usa `aria-label`/`title` = "Ajustes" (`t.tabSettings`) cuando en realidad navega a "Cuenta" — no existe ninguna pantalla de Ajustes en `currentNavTabs`, así que el nombre accesible describe un destino que no existe. Falta también `id`/`aria-controls` entre el trigger y el listbox (recomendado por el patrón APG, no estrictamente obligatorio dado que el foco se mueve); sin búsqueda/type-ahead si la lista de restaurantes crece; badge de notificaciones sin micro-animación al cambiar (a diferencia del badge de `BottomNav`, que sí usa `sf-pop`). |
| BottomNav | **7/10** | `safe-area`, objetivos táctiles ≥44px y `aria-current="page"` correctos. Falta: indicador activo animado tipo píldora/subrayado (Apple Music/Google Photos/Airbnb) en vez de un cambio de color instantáneo; sin tick háptico al cambiar de pestaña; diferenciación activo/inactivo solo por grosor de trazo + color, un delta sutil frente al patrón relleno/contorno de Apple HIG. |
| Dashboard | **6/10** | Icono `Flame` con alternativa textual, tokens correctos en ambos temas. Falta: stat tiles sin ningún affordance táctil pese a representar datos filtrables (ya existe `onGoToRequests` como prop, sin usar para esto); cero `aria-live` en valores que cambian por Realtime; `grid-cols-2` fijo sin variante responsive (B9, sin cambios); sin `React.memo`; sin indicador de tendencia/delta; feedback táctil (`active:scale-95`) inconsistente entre controles del mismo archivo. |
| RequestsList | **6.5/10** | H4 genuinamente cerrado — trazado completo confirma que el foco no se pierde y aterriza en el botón correcto tras expandir "+N más". Pero se encontró un **Alto nuevo**: el deep-link desde notificaciones nunca hace scroll hasta la tarjeta resaltada (`scrollIntoView` no existe en el repo), rompiendo el flujo "volver a esta solicitud exacta" que las notificaciones existen para resolver. Persisten sin cambios: cero `aria-live`, sin virtualización (agravado por `nowTick` cada 60s), sin `React.memo`, grupo de filtro sin `role="group"`, "Comprada"/"Entregada" comparten color token. |
| DailyChecklist | **5/10** | Cuarto ciclo consecutivo auditando este archivo, y las 3 correcciones reclamadas (H1/H2/H3) se confirmaron genuinamente cerradas para sus escenarios exactos tras un trazado evento por evento — no un parche superficial. Pero: `readings` (los conteos de stock, el campo de mayor valor real del checklist) **nunca recibió la misma protección de recencia que sí se dio a `isUrgent`/`reviewedIds`/`showOrderPreview`**, dejando una ventana de pérdida de datos real en el flujo normal de "editar y pasar al siguiente producto"; el propio contador lógico `seq` que cierra H2 tiene un hueco de colisión entre escritores concurrentes (dos pestañas pueden calcular el mismo `seq` antes de verse mutuamente, y la más reciente se descarta en silencio y para siempre); y el banner de conflicto "Mantener la mía/Descartar" puede borrar el borrador compartido completo de un compañero de trabajo con un solo toque mal dado, durante el flujo de uso concurrente que el propio archivo dice soportar por diseño. Componente de 852 líneas, sin debounce en la escritura a `localStorage` (cada tecla dispara una escritura + broadcast completos), sin virtualización de la grilla de productos. |
| AdminCatalog | **5/10** | Las 4 superficies de edición ya tienen nombres accesibles reales (M9), pluralización correcta, aviso de solo-lectura en Proveedores. Pero: formulario del catálogo triplicado (alta inline/`EditCard`/fila de tabla, mismas 6 columnas 3 veces — sin cambios); doble montaje simultáneo tabla+tarjetas (solo CSS); salto de nivel de encabezado en **3 sitios** (`h1`→`h3` en 194, 366, y 516 — uno más de lo documentado antes); el `<select>` de filtro de restaurante no tiene nombre accesible (a diferencia del buscador adyacente, que sí lo tiene); eliminar un producto no tiene confirmación ni deshacer; los 3 handlers async de guardar/crear no bloquean su botón disparador durante el `await`, exponiendo doble-envío por doble-toque. |
| AccountView | **6/10** | Arquitectura interna la mejor del grupo: edición inline real, guardado automático razonado, jerarquía `<h2>` correcta. Pero: sin manejo de error si `onSaveProfile` falla (la UI reporta éxito igual); **3 sitios nuevos** con la misma clase de defecto de M9 (`aria-pressed` en controles de selección única: selector de avatar preestablecido, `ToggleBtn` de tema/idioma) y un cuarto sin ninguna semántica: la lista "Cambiar usuario" no indica cuál es la cuenta activa a un lector de pantalla (solo un ícono visual); avatar preestablecido roto se oculta sin ningún fallback (a diferencia del avatar principal, que sí cae a la inicial). |
| NotificationsView | **7/10** | La pantalla más sólida de las 4 de su grupo: M7/M8/M9/B11 confirmados cerrados sin regresión, sincronización entre pestañas bien razonada y documentada en el propio código. Falta: sub-secciones de Ajustes ("Push notifications", "Probar sonidos", "Simular notificación") sin `<h2>`/`<h3>` semántico bajo el único `<h1>` de `ViewHeader`; sin undo por-ítem tras descartar una notificación (solo recuperación en bloque vía "mostrar leídas"). |
| ShoppingView | **5/10** | Arquitectura de botón único por fila (A10 histórico) sigue siendo la más limpia del repo para este patrón, con razonamiento ARIA documentado en el propio código. Pero: el guardado duplicado de nota (B16 histórico) sigue activo — `blur` (disparado por `mousedown` en "Guardar") y `click` llaman ambos a `handleSaveNote`, dos escrituras de red por una acción del usuario; el filtro de proveedor reincide en la clase de defecto de M9 (`aria-pressed` en selección única, mismo patrón migrado en otros archivos este mismo ciclo pero no aquí); sin vía real de "cancelar" edición de nota; `suppliers`/`filteredItems` sin `useMemo`. |

**Promedio (10 pantallas del encargo): 6.2/10** (vs. 7.35/10 del ciclo anterior). Como se explica en el veredicto, esta caída combina hallazgos Altos genuinamente nuevos (el más grave: `readings` sin protección en `DailyChecklist`, un riesgo real de pérdida de datos operativos) con una instrucción explícita de puntuar con mayor exigencia esta pasada — ambos factores son reales y no deben promediarse entre sí para "explicar" la caída completa por criterio; el trabajo corrector de H1–H4/M6–M11 es sustancialmente real y verificado evento por evento, y en paralelo aparecieron gaps adyacentes de la misma clase de bug que ya lleva 4 ciclos reapareciendo.

---

## (d) Hallazgos por severidad

### 🔴 Crítico

Ninguno. Los 2 Críticos históricos (`App.tsx` Rules of Hooks; `DailyChecklist` sin `key` de restaurante) se re-verificaron de forma independiente: todos los hooks de `App.tsx` están declarados antes del primer `return` condicional (`App.tsx:671`, verificado hasta la línea 824 sin excepciones), y `<DailyChecklist key={selectedRestaurant.id}>` sigue presente en `App.tsx:771`. Sin regresión.

### 🟠 Alto

**H1 — `DailyChecklist`: el campo `readings` (conteos de stock) carece de la misma protección de recencia que sí recibieron `isUrgent`/`reviewedIds`/`showOrderPreview` — el campo de mayor valor de negocio del borrador es el que queda peor protegido.**
`DailyChecklist.tsx:335-343` — el `setState` de `readings` solo comprueba `focusedStockProductIdRef.current` (protección exclusiva del producto con foco activo en ese instante), sin la ventana de recencia de 4s (`recentLocalChangeRef`) que sí protege a los otros tres campos desde el fix de este ciclo (`:350-359`). Escenario: el usuario edita el stock del producto P3 y hace *blur* para pasar a P4 (el flujo normal de revisión uno-por-uno) — en la ventana entre el `blur` y que el efecto de persistencia (pasivo, se agenda después del pintado) escriba el nuevo valor y avance `lastKnownSeqRef`, llega una actualización remota concurrente con un `seq` mayor: como P3 ya no tiene el foco, su valor recién editado se sobrescribe en silencio con el valor remoto desactualizado.
**Recomendación:** extender `recentLocalChangeRef` con un mapa por-producto (`Record<productId, number>`) que registre el timestamp de la última edición local de cada `readings[productId]`, con la misma disciplina de ventana de gracia ya aplicada a los otros tres campos — no depender solo del foco de DOM.

**H2 — `DailyChecklist`: el contador lógico `seq` introducido para cerrar el H2 del ciclo anterior no resuelve colisiones entre escritores concurrentes — reproduce el síntoma original (pérdida silenciosa y permanente) por un mecanismo distinto.**
`DailyChecklist.tsx:278,328` — `seq` se calcula como `lastKnownSeqRef.current + 1`, derivado solo del último valor observado por la propia pestaña, sin ningún desambiguador por escritor. Escenario: dos pestañas A y B parten ambas de `lastKnownSeqRef = 10` (ninguna ha visto todavía la última escritura de la otra); A edita y persiste `seq = 11`; antes de que el evento `storage` de A llegue a B, B edita independientemente y también calcula `seq = 11` (sobrescribiendo la entrada de localStorage de A) y fija su propio `lastKnownSeqRef = 11`; cuando A recibe el evento `storage` de la escritura de B, la comparación `incoming.seq(11) <= lastKnownSeqRef.current(11)` en `:328` es verdadera → se descarta permanentemente, sin reintento ni aviso. Es exactamente el escenario de uso previsto por los propios comentarios del archivo (una tablet de cocina compartida con dos personas editando el mismo borrador casi al mismo tiempo).
**Recomendación:** añadir un desambiguador por pestaña/dispositivo a la comparación (p. ej. `` `${seq}.${tabInstanceId}` `` como clave de orden total), o pasar de "sobrescritura de snapshot completo por gate único" a un merge campo por campo con reintento de lectura-antes-de-incrementar.

**H3 — `DailyChecklist`: el banner "Mantener la mía / Descartar" puede borrar el borrador compartido completo de un compañero de trabajo con un solo toque, durante el flujo de uso concurrente que el propio archivo dice soportar.**
`DailyChecklist.tsx:155-159,227-235,360,515-534` — `draftOwner` (y por tanto este banner) se activa en dos situaciones distintas con la misma UI: (a) al montar, cuando ya existe un borrador de otra persona (caso legítimo, informativo); (b) en vivo, en **cada** actualización remota aceptada durante una sesión normal de edición concurrente (`:360`) — el flujo que el propio comentario del tipo (`:25-29,50-53`) describe como intencional para cambio de turno/dispositivo compartido. En el caso (b), pulsar "Mantener la mía" (`:525`) no restaura nada real — solo descarta el aviso, porque cualquier campo sin protección de recencia ya se fusionó con el valor remoto antes de que el banner se renderice. Y "Descartar" (`:528` → `discardDraft`, `:227-235`) no descarta "mi vista local": llama a `resetToDefaults()` y `localStorage.removeItem(...)`, borrando el borrador compartido completo y disparando un evento `storage` con `newValue === null` que activa `remoteCleared = true` en cualquier otra pestaña abierta (`:314-320`) — incluida la de un compañero editando en ese momento.
**Recomendación:** separar en dos affordances distintas: un banner "borrador de otra sesión" (solo al montar, seguro de descartar) frente a un indicador de presencia en vivo "alguien más está editando este checklist ahora" sin ninguna acción destructiva asociada.

**H4 — `RequestsList`: el deep-link desde una notificación nunca hace scroll hasta la solicitud resaltada — el `id` del DOM existe pero no se usa.**
`App.tsx:149-165` (`handleSelectRequestFromNotification`) fija `highlightedRequestId`, cambia a la pestaña de Solicitudes, y limpia el resaltado automáticamente a los 5000ms. `RequestsList.tsx:60-65` expande la tarjeta correspondiente y fuerza el filtro a "Todas"; la tarjeta ya lleva `id={`request-card-${req.id}`}` (`:210`) y un anillo de acento visible, pero `scrollIntoView` no se invoca en ningún punto del repo (confirmado por grep sobre todo `src`). Escenario: un comprador toca una notificación push sobre la solicitud #47 en una lista de 60 ítems; la app cambia de pestaña pero #47 queda fuera de la vista, con solo 5 segundos antes de que el anillo de resaltado desaparezca — el caso de uso exacto para el que existen las notificaciones queda roto en cualquier lista lo bastante larga como para necesitar scroll.
**Recomendación:** en el efecto que reacciona a `highlightedRequestId` (`RequestsList.tsx:60-65`), tras expandir, llamar `document.getElementById(...)?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'center' })` (con un `requestAnimationFrame` o un efecto secundario para esperar al layout tras la expansión), y considerar desacoplar el auto-clear de 5s de la finalización real del scroll.

**H5 — `AccountView`: la lista "Cambiar usuario" no expone ninguna indicación programática de cuál es la cuenta activa.**
`AccountView.tsx:257-278` — el único indicador de la cuenta activa es un ícono `<Check>` puramente visual (`:276`), sin `aria-current`/`aria-pressed`/`aria-label` en el `<button>` que lo comunique a un lector de pantalla. Un usuario de VoiceOver/NVDA navegando "Cambiar usuario" escucha tres botones idénticos con nombre y rol, sin ninguna forma de determinar cuál es la sesión actual.
**Recomendación:** `aria-current={active ? 'true' : undefined}` en el botón (`:277`), consistente con el resto de la app (mismo patrón ya usado en `RequestsList`/`AdminCatalog`/`NotificationsView`).

### 🟡 Medio

**M1 — `Header`: el botón de perfil usa la clave de traducción equivocada, anunciando un destino que no existe.** `Header.tsx:223-224` — `title`/`aria-label` = `t.tabSettings` ("Ajustes"), pero el botón navega a `screen = 'ACCOUNT'` (pantalla "Cuenta"); no existe ninguna pestaña de Ajustes en `currentNavTabs` (`App.tsx:613-637`). Un lector de pantalla anuncia "Ajustes: [nombre] — En línea" para un control que en realidad abre "Cuenta" — el usuario construye un modelo mental incorrecto de la app a partir de esta etiqueta. Existen claves más adecuadas ya en `translations.ts` (`accountTitle`/`profileSettings`) sin usar aquí.

**M2 — Clase de defecto `aria-pressed` en controles de selección única recurre en sitios nuevos, pese a haberse migrado a `aria-current` en otros archivos este mismo ciclo.** `AccountView.tsx:152` (selector de avatar preestablecido), `AccountView.tsx:196-203,329` (`ToggleBtn` de tema/idioma), `ShoppingView.tsx:140,152` (chips de filtro de proveedor). Mismo patrón exacto ya corregido este ciclo en `AdminCatalog`/`NotificationsView` (M9) y en `RequestsList` en el ciclo anterior (B5/B8), pero no replicado a estos 4 sitios estructuralmente idénticos.

**M3 — `AdminCatalog`: el `<select>` de filtro de restaurante no tiene nombre accesible.** `AdminCatalog.tsx:173-176` — hay un `<span>{t.adminLocalLabel}</span>` visualmente adyacente pero sin `<label htmlFor>` ni `aria-label` que lo conecte al `<select>`; un lector de pantalla anuncia solo "combo box, [nombre del restaurante] ([tipo])", sin indicar que es el filtro de local. El buscador dos líneas más abajo (`:180-181`) sí tiene `aria-label`.

**M4 — `AdminCatalog`: eliminar un producto no tiene confirmación ni deshacer.** `AdminCatalog.tsx:257,338` — `onClick={() => onDeleteProduct(p.id)}` dispara de inmediato tanto en la vista de tarjetas móvil como en la tabla de escritorio, sin paso de confirmación ni ventana de deshacer. Un solo toque erróneo elimina permanentemente un producto del catálogo.

**M5 — `AdminCatalog`: los 3 handlers async de guardar/crear no bloquean su botón disparador durante el `await`, exponiendo doble-envío por doble-toque.** `handleSaveEdit` (`:83-92`), `handleCreateProductSubmit` (`:94-111`), `handleCreateRestaurantSubmit` (`:113-125`) son `async` pero ninguno deshabilita su botón ni muestra estado de carga mientras esperan — un doble-toque (común en móvil sobre conexión lenta) dispara la mutación dos veces antes de que la primera respuesta actualice la UI. Misma clase de bug que el guardado duplicado de nota de `ShoppingView` (B16), presente en 3 sitios más.

**M6 — `AccountView`: sin manejo de error si `onSaveProfile` falla.** `AccountView.tsx:82-95` — `saveProfile`/`handleBack` llaman a `onSaveProfile` sin `try/catch` ni UI de fallo; `savedFlash` se activa incondicionalmente, así que la interfaz reporta éxito aunque la llamada falle o lance en silencio.

**M7 — `AccountView`: un avatar preestablecido roto se oculta sin ningún fallback, peor que el avatar principal.** `AccountView.tsx:161` — `onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}` deja una casilla en blanco si la imagen de Unsplash falla (404, CSP, sin conexión), a diferencia del avatar principal (`:123-128`), que sí cae a una inicial.

**M8 — Dashboard/RequestsList: cero `aria-live` para valores que cambian por Realtime sin interacción del usuario.** (histórico, confirmado sin cambios) — stat tiles, feed de actividad, contadores de pestañas de filtro, badges de estado: 0 ocurrencias de `aria-live`/`role="status"`/`role="alert"` en ambos archivos.

**M9 — `RequestsList`: sin virtualización del feed, agravado por un re-render completo cada minuto.** (histórico, confirmado sin cambios) — `nowTick` (`:98-102`) fuerza un re-render de todas las tarjetas visibles cada 60s solo para refrescar timestamps relativos.

**M10 — Ni `Dashboard` ni `RequestsList` están envueltos en `React.memo`**, a diferencia de `BottomNav`. (histórico, sin cambios).

**M11 — `LoginScreen`: el estado de "cargando" es código muerto por el batching automático de React 19.** `LoginScreen.tsx:31,54-68,150,155,169-173` — `handleSelect` llama `setLoadingUserId(user.id)`, luego `onSelectUser(user)` (totalmente síncrono, ver `App.tsx:578-585`), luego `finally { setLoadingUserId(null) }` — con `createRoot` de React 19, las 3 actualizaciones colapsan en un solo commit con el valor final (`null`); el spinner `Loader2` (`:169-173`) nunca llega a pintarse, y `disabled={loadingUserId !== null}` nunca deshabilita funcionalmente a los botones hermanos durante un toque real.

**M12 — `Header`: el listbox del selector no tiene `id`/`aria-controls` que lo enlace con el trigger.** `Header.tsx:134-162` — el botón disparador tiene `aria-haspopup="listbox"`/`aria-expanded` pero ningún `aria-controls`, y el `role="listbox"` no tiene `id` propio para enlazar. Recomendado (no estrictamente obligatorio, dado que el foco sí se mueve) por el patrón APG de Collapsible Dropdown Listbox.

**M13 — `DailyChecklist`: sin *debounce* en la escritura de persistencia — cada pulsación dispara una escritura completa a `localStorage` y un broadcast entre pestañas.** `DailyChecklist.tsx:259-299` — escribir en el input de stock o en la nota re-ejecuta el efecto en cada carácter, serializando el borrador completo, incrementando `seq` y disparando un evento `storage` nativo por cada tecla — además de desperdiciar trabajo en tablets de gama baja, esto agranda la ventana de colisión descrita en H2 (más escrituras concurrentes = más oportunidades de que dos pestañas calculen el mismo `seq` antes de verse mutuamente).

**M14 — `DailyChecklist`: el foco no se restaura al cerrar el cajón de nota/vista previa.** `DailyChecklist.tsx:400-411,724-729,752` — cerrar vía Escape o el botón de alternancia nunca devuelve el foco al control que abrió el cajón; un usuario de teclado/lector de pantalla puede perder su posición cuando el contenido con foco (p. ej. el textarea en `:799`) se desmonta al animarse fuera.

**M15 — `DailyChecklist`: `showOrderPreview` no debería sincronizarse entre dispositivos en absoluto — es estado de viewport, no dato compartido.** `DailyChecklist.tsx:24,149,287,357-359` — al ser parte de `ChecklistDraft`, abrir la pantalla sobre un borrador existente puede renderizar el cajón de vista previa ya abierto solo porque una sesión previa no relacionada lo dejó así al guardar; e incluso con la protección de H1 aplicada, pasados los 4s de gracia el cajón de un usuario puede abrirse/cerrarse en pantalla por la acción de un compañero, sin ninguna acción local propia.

### 🟢 Bajo

**B1 (histórico, sin cambios) — `App.tsx`: listener de `beforeinstallprompt` sin `removeEventListener` en el cleanup.** `App.tsx:239-256`, handler anónimo inline nunca removido.

**B2 (histórico, sin cambios) — `App.tsx`: sin sincronización de sesión entre pestañas.**

**B3 (histórico, sin cambios) — `LoginScreen`: cabeceras de sección siguen siendo `<span>`, no un encabezado semántico.** `LoginScreen.tsx:145`.

**B4 — `Header`: caso límite residual del fix de M1 — si el foco sale del documento por completo (`relatedTarget === null`), el popover no se cierra.** `Header.tsx:66-69`, guard `if (next && ...)` — no es el escenario reportado (Tab dentro de la página), solo un caso límite adicional.

**B5 — `AccountView`: `onError` del avatar principal mutа `avatarUrl` a cadena vacía en vez de un flag de error separado**, a diferencia del patrón nuevo de `Header` (avatarError como estado propio) — una imagen rota puede "ensuciar" (`isDirty`) el formulario y persistirse como avatar vacío al navegar fuera. `AccountView.tsx:123`.

**B6 (histórico, sin cambios) — `RequestsList`: grupo de tabs de filtro sin `role="group"`/`aria-label`.** `RequestsList.tsx:146`.

**B7 (histórico, sin cambios) — "Comprada" y "Entregada" comparten el mismo token de color.** `src/lib/colors.ts:20-21`.

**B8 (histórico, matiz nuevo) — `eslint-disable-next-line react-hooks/exhaustive-deps` en `RequestsList.tsx:91`, ahora con justificación plausible pero no documentada** (`inScope` cierra sobre `selectedRestaurantId`, ya en deps — añadirlo forzaría recomputar sin necesidad; el fix más limpio sería inlinear `inScope` dentro del `useMemo`).

**B9 (histórico, sin cambios) — `grid-cols-2` fijo en Dashboard sin variante responsive.** `Dashboard.tsx:139`.

**B10 (histórico, sin cambios) — `ShoppingView`: `suppliers`/`filteredItems` sin `useMemo`.** `ShoppingView.tsx:51,53`.

**B11 (histórico, confirmado cerrado) — `stopPropagation` residual de `NotificationsView` eliminado, sin regresión.**

**B12 — `ShoppingView`: sin vía real de "cancelar" edición de nota** — solo Enter/blur, ambos guardan. `ShoppingView.tsx:233-238`.

**B13 (histórico, confirmado, agravado) — `AdminCatalog`: salto de nivel de encabezado en 3 sitios, no 2.** `AdminCatalog.tsx:138(h1),194,366,516(h3, sin h2 intermedio)` — el `h3` de `OverdueSettingsPanel` (`:516`) es un tercer sitio no documentado antes.

**B14 (histórico, confirmado sin regresión) — `DailyChecklist`: `markAsReviewed` invocado dos veces en `handleQuickSet`.** `DailyChecklist.tsx:446-449` — inofensivo (`Set`), redundante.

**B15 (histórico, confirmado sin regresión) — `ShoppingView`: guardado duplicado de nota (`blur` + `click` en "Guardar") sobrevive.** `ShoppingView.tsx:238,246`.

**B16 — `AdminCatalog`: estado `saveError` compartido sin ámbito entre 3 formularios distintos**, el banner nunca indica cuál acción falló. `AdminCatalog.tsx:81,90,109,123,146-149`.

**B17 — `AdminCatalog`: tipado débil en el límite del componente admin.** `AdminCatalog.tsx:22` — `type: any` descarta la unión `'Food Truck' | 'Restaurante' | 'Cafe' | 'Bistro'` que sí se aplica en el estado local.

**B18 — `AccountView`: `playAlertSound('click')` suena incluso al re-seleccionar la cuenta ya activa** (operación no-op). `AccountView.tsx:259-262`.

**B19 — `NotificationsView`: sub-secciones de Ajustes sin encabezado semántico.** "Push notifications"/"Probar sonidos"/"Simular notificación" son `<div>`, no `<h2>`/`<h3>` — sin puntos de navegación por encabezado bajo el único `<h1>` de `ViewHeader`.

**B20 — `DailyChecklist`: etiqueta del botón "agotado" del quick-set es el literal `'0'` sin traducir**, a diferencia de "bajo"/"suficiente" que sí usan `t.stockLow`/`t.stockSufficient`. `DailyChecklist.tsx:633`.

**B21 — Dashboard/RequestsList: feedback táctil (`active:scale-95`) inconsistente entre controles del mismo archivo.** Presente en algunos botones (`RequestsList` pie/WhatsApp, `BottomNav`), ausente en otros (fila de actividad de Dashboard, tabs de filtro de `RequestsList`).

**B22 — `src/lib/colors.ts:5`, `color-mix()` sin fallback documentado** — requiere Safari ≥16.2/Chrome ≥111/Firefox ≥113; en iOS Safari más antiguo el fondo tintado de badges/pills se pierde silenciosamente (degrada, no rompe).

**B23 — Pantallas construidas sobre `ViewHeader` (`AccountView`, `NotificationsView`) no tienen landmark `<main>`**, a diferencia de las pestañas principales (`App.tsx:753`).

**Diferidos, confirmados sin regresión (documentados en ciclos anteriores, no re-litigados en detalle):** formulario triplicado y doble montaje de `AdminCatalog` (B24), canal Realtime de `App.tsx` sin filtrar por restaurante, 3 ramas de rol duplicadas en Dashboard/RequestsList, `App.tsx` monolítico, dos sistemas de animación distintos entre chrome (Tailwind/CSS) y contenido (`motion`) sin unificar.

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Alto, prioridad máxima — riesgo real de pérdida de datos operativos)** H1 — extender la misma protección de recencia que ya tienen `isUrgent`/`reviewedIds`/`showOrderPreview` al campo `readings` de `DailyChecklist`, con un mapa por-producto, no solo protección por foco.
2. **(Alto)** H2 — añadir un desambiguador por pestaña/dispositivo a la comparación de `seq` en `DailyChecklist`, o mergear campo por campo en vez de por snapshot completo con gate único.
3. **(Alto)** H3 — separar el banner de conflicto de `DailyChecklist` en dos affordances: aviso de borrador obsoleto al montar (con acción de descarte segura) vs. indicador de presencia en vivo durante edición concurrente (sin ninguna acción destructiva).
4. **(Alto)** H4 — implementar `scrollIntoView` en el flujo de deep-link de notificación de `RequestsList`.
5. **(Alto, una línea)** H5 — `aria-current` en el botón de cuenta activa de `AccountView`.
6. **(Medio, mismo patrón repetido, migrar los 4 sitios de una vez)** M2 — `aria-pressed`→`aria-current` en `AccountView` (selector de avatar, `ToggleBtn`) y `ShoppingView` (chips de proveedor).
7. **(Medio, una línea/patrón conocido cada uno)** M1 (corregir la clave de traducción del botón de perfil de `Header`), M3 (`aria-label` en el `<select>` de restaurante de `AdminCatalog`), M12 (`id`/`aria-controls` en el listbox de `Header`).
8. **(Medio)** M4 — confirmación/deshacer antes de eliminar un producto en `AdminCatalog`.
9. **(Medio, mismo patrón en 4 sitios)** M5 — guard de doble-envío en los 3 handlers async de `AdminCatalog` + revisar de nuevo el guardado duplicado de `ShoppingView` (B15) con la misma solución.
10. **(Medio)** M6/M7 — manejo de error de guardado en `AccountView`; fallback real (no casilla en blanco) para avatares preestablecidos rotos.
11. **(Medio)** M11 — o bien hacer real el estado de carga de `LoginScreen` (con un `await`/microtask genuino) o eliminar el código muerto del spinner/disabled.
12. **(Medio, requiere diseño, no una línea)** M8/M9 — `aria-live` en Dashboard/RequestsList; virtualización del feed de RequestsList; M13 — debounce en la persistencia de `DailyChecklist`.
13. **(Bajo, en orden de esfuerzo/impacto)** B1–B23 — listener sin limpiar, sincronización de sesión entre pestañas, encabezados semánticos, landmarks `<main>` en pantallas de `ViewHeader`, feedback táctil consistente, etc.
14. **(Deuda de arquitectura mayor, sin cambios de prioridad respecto a ciclos anteriores, pero con evidencia cada vez más fuerte)** Extraer la lógica de sincronización entre pestañas de `DailyChecklist` (~206 líneas, 7 refs — creció, no se redujo, desde el ciclo anterior) a un hook reutilizable `useCrossTabDraft<T>` con protección derivada del tipo, no de una lista manual de nombres de campo — H1 de este ciclo es la cuarta instancia consecutiva de exactamente el bug que esta extracción prevendría estructuralmente. Formulario triplicado de `AdminCatalog`, `App.tsx` monolítico: seguir diferidos a un ciclo dedicado de refactor.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` contienen **15 pares completos**: `mobile-ux-review`, `design-system-guardian`, `wcag-audit`, `motion-microinteractions`, `design-token-architect`, `typography-color-system`, `visual-qa`, `frontend-architecture-review`, `i18n-parity-guardian`, `supabase-persistence-guardian`, `performance-budget-auditor`, `async-error-handling-guardian`, `react-hooks-invariant-guardian`, `stateful-prop-transition-guardian`, `cross-tab-sync-guardian`. Ninguno de los hallazgos de esta pasada corresponde a una clase de bug sin cubrir por ninguna skill existente — pero dos de ellas necesitan refuerzo real, y se identifica **un gap de especialización genuino** (no solo de checklist) que no encaja bien en ninguna de las 15 existentes.

**Reforzar `cross-tab-sync-guardian`** (esta es la tercera vez que se refuerza; el patrón de fondo — "el checklist correcto pero de alcance más angosto que la clase de bug real" — se repite):

| Ítem a añadir | Motivo (evidencia de esta pasada) |
|---|---|
| "Un campo protegido solo por foco de DOM (`focusedFieldRef`) NO tiene la misma garantía que un campo protegido por ventana de recencia de interacción (`recentLocalChangeRef`) — el primero deja de proteger en cuanto el usuario hace `blur`, incluso si la escritura de persistencia local todavía no se completó. Verificar explícitamente, para cada campo del draft compartido, cuál de los dos mecanismos tiene, no solo si tiene alguno." | H1: `readings` en `DailyChecklist.tsx:335-343` tenía protección por foco desde antes de este ciclo, pero nunca la ventana de recencia que sí se dio a los otros 3 campos — la skill reforzada en el ciclo anterior preguntaba "¿tienen los N campos protección?" pero no distinguía qué *tipo* de protección basta para cada patrón de interacción (campo continuo con blur vs. control discreto). |
| "Si la señal de orden es un contador monotónico local (`seq = lastKnownSeqRef.current + 1`), verificar explícitamente qué pasa cuando dos pestañas calculan el mismo valor antes de observarse mutuamente (colisión de escritores concurrentes) — un contador sin desambiguador por escritor no es un orden total seguro, aunque ya no dependa del reloj de pared." | H2: el propio fix que reemplazó `Date.now()` por `seq` para cerrar el H2 del ciclo anterior introdujo un hueco de colisión distinto, con el mismo síntoma final (pérdida silenciosa y permanente). |

**Reforzar `wcag-audit`** con un ítem sobre alcance de migración de patrones:

| Ítem a añadir | Motivo |
|---|---|
| "Al migrar una instancia de un patrón de UI (p. ej. `aria-pressed`→`aria-current` para selección única) por un hallazgo reportado en un archivo concreto, buscar en TODO el repo la misma forma de interacción (grupo de botones mutuamente excluyentes) antes de dar el hallazgo por cerrado — no limitarse al archivo donde se reportó." | M2: el mismo defecto se corrigió este ciclo en `AdminCatalog`/`NotificationsView` (M9 del ciclo anterior) pero reapareció sin tocar en `AccountView` (2 sitios) y `ShoppingView` (1 sitio) — archivos con controles estructuralmente idénticos que nunca se revisaron con el mismo criterio. |

**Nuevo skill/subagente recomendado: `destructive-action-guardian`** (Glob/Grep/Read, solo lectura). No existe hoy ninguna skill que audite específicamente "¿esta acción destruye datos sin confirmación, y de quién son esos datos?" — `mobile-ux-review` cubre feedback/reachability/empty-states pero no confirmación de acciones destructivas; `cross-tab-sync-guardian` cubre la mecánica de sincronización pero no el *ámbito* de una acción de descarte. Esta pasada encontró **dos instancias independientes de la misma clase de bug** en archivos no relacionados en el mismo ciclo: eliminar un producto en `AdminCatalog` sin confirmación (M4), y el banner "Descartar" de `DailyChecklist` que borra el borrador compartido completo de otro usuario con un solo toque (H3) — evidencia de un gap de especialización real, no de una checklist incompleta de una skill ya existente. Checklist propuesta: (1) toda acción que borra/descarta/sobrescribe datos persistidos requiere confirmación o ventana de deshacer; (2) para datos compartidos entre pestañas/dispositivos/usuarios (no solo datos locales del usuario actual), verificar explícitamente el ámbito real de la acción — "descartar mi vista" y "borrar el recurso compartido para todos" deben ser dos affordances distintas, nunca la misma etiqueta de botón.

**Reforzar `async-error-handling-guardian`** con un ítem sobre doble-envío: "todo handler async disparado por un control interactivo (botón/onBlur) debe deshabilitar o bloquear ese control mientras el `await` está pendiente, no solo revertir el estado de carga en el `catch`" — motivado por M5 (3 handlers de `AdminCatalog` sin guard de doble-envío) y B15 (guardado duplicado de nota de `ShoppingView`, ya documentado en ciclos anteriores sin una skill que lo detecte como clase de bug repetible).

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto a los ciclos anteriores: **Figma MCP**, **Chrome DevTools/Playwright MCP** (Playwright local ya disponible vía Bash en `/opt/pw-browsers/chromium` — seguiría siendo la forma más directa de reproducir en un navegador real los escenarios de colisión concurrente de `DailyChecklist` con dos contextos simultáneos), **Vercel MCP**. Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx`. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`) | **PASA** — 0 coincidencias. |
| 3 | Cero colores hardcodeados (todo `var(--sf-*)`/`.sf-*`) | **PASA** — 0 hex fuera de `index.css` salvo el `<meta name="theme-color">` legítimo. |
| 4 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — confirmado estructuralmente intacto. |
| 5 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — saltos de nivel de encabezado en `AdminCatalog` (3 sitios, B13), `NotificationsView` (sub-secciones sin heading, B19), `LoginScreen` (B3). |
| 6 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — H5 (sin indicación de selección activa), M1-M3-M12 (nombres/relaciones accesibles), M2 (clase `aria-pressed` recurrente); los fixes H1-H4/M6-M11 de este ciclo se mantienen genuinamente cerrados en su alcance original. |
| 7 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — B9 (Dashboard sin variante responsive de grid, sin cambios). |
| 8 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — H1/H2/H3 (riesgo real de pérdida de datos en `DailyChecklist`, huecos adyacentes a un fix genuino), H4 (deep-link de notificación roto), M4/M5 (eliminar sin confirmar, doble-envío); los 2 Críticos históricos y los 4 escenarios explícitos de H1-H4 del ciclo anterior siguen genuinamente cerrados. |
| 9 | i18n ES/EN mismas claves | **PASA** — 423/423 claves en ambos locales, sin huecos. |
| 10 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal 314.79 kB (87.94 kB gzip), sin aviso de tamaño de Vite. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `27766c8` (VEREDICTO: CON HALLAZGOS, 4 Altos + 11 Medios). Desde entonces aterrizaron 6 commits correctores (`306a31d..2a99a8f`) que, con evidencia real verificada de forma independiente en esta pasada — trazado evento por evento, no solo lectura de diff — cerraron genuinamente: los 4 Altos en su escenario literal exacto, y 7 de los 11 Medios completos. La puntuación promedio bajó de 7.35/10 a 6.2/10 — pero, como se detalla en el veredicto y en la sección (c), esta caída combina hallazgos Altos genuinamente nuevos (el más grave: `readings` sin protección en `DailyChecklist`, con riesgo real de pérdida de datos operativos de stock) con un criterio de puntuación deliberadamente más exigente en esta pasada, no una regresión funcional lineal del mismo tamaño que el número sugiere.

El patrón de fondo de los últimos 4 ciclos se confirma una vez más: un fix de sincronización entre pestañas que protege algunos campos de un objeto de estado compartido necesita, como parte de su propia definición de "hecho", una lista explícita de *todos* los campos de ese objeto — incluidos los que ya tenían *algún* mecanismo de protección previo, como `readings` — y una confirmación de qué *tipo* de protección tiene cada uno, no solo si tiene alguna. Se recomienda fortalecer (no solo re-fortalecer una tercera vez) `cross-tab-sync-guardian` con los 2 ítems nuevos de la sección (f), fortalecer `wcag-audit` con 1 ítem sobre alcance de migración de patrones, y crear el nuevo skill `destructive-action-guardian` — el primer gap de especialización genuino (no de checklist) identificado en 3 ciclos, motivado por dos instancias independientes de "acción destructiva sin ámbito claro" en archivos no relacionados dentro del mismo ciclo.
