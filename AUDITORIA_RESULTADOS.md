# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-05 03:32 UTC
**Commit auditado:** `21a730d` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring/sesión/tema), sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** desde el informe anterior (auditado sobre `b38034d`, VEREDICTO: CON HALLAZGOS) aterrizaron 11 commits correctores (`107ff85..935cdef`) que dicen cerrar los 3 Altos y los 6 Medios de esa auditoría, más una selección de Bajos. Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit ni por `CORRECCIONES_APLICADAS.md`**: se releyó el código real contra `HEAD`, con 4 sub-auditorías delegadas en paralelo (shell: Login/Header/BottomNav/ViewHeader + `App.tsx`; Dashboard+RequestsList; DailyChecklist en profundidad, incluida reconstrucción manual de la secuencia de eventos multi-pestaña; AdminCatalog+AccountView+NotificationsView+ShoppingView), cada una con instrucciones explícitas de verificar cada claim línea por línea contra el código actual, contando elementos exactos donde el claim hacía una afirmación numérica. El agente auditor verificó de forma independiente y directa el hallazgo de mayor riesgo (la nueva sincronización entre pestañas de `DailyChecklist`, líneas 166-206) antes de aceptar el veredicto de cualquier sub-auditoría. Se ejecutaron además `tsc`/`build` propios y una extracción programática de paridad i18n.

## VEREDICTO: CON HALLAZGOS

Los 3 Altos y los 6 Medios reclamados por el ciclo corrector están **genuinamente resueltos en su escenario principal**, verificados línea por línea: `M5` (sincronización de tema movida a `useEffect` antes del `return` condicional, `App.tsx:639-652`), `B3` (`ViewFallback` con `role="status"`/`aria-live`, `App.tsx:55-63`), `B5` (`min-h-11`/`whitespace-nowrap` en `BottomNav`), `A2` (17/17 `<label>` de los 3 formularios de `AdminCatalog.tsx` con `htmlFor`/`id` reales), `A3` (`Field` de `AccountView.tsx` con `<label htmlFor> sr-only` real, no un placebo de `aria-label`), `M1` (sonido no-alarma en envíos sin urgencia real), `M7` (`aria-controls` ya no cuelga en `RequestsList`), `M8` (labels en inputs de prueba de `NotificationsView`), y las memoizaciones `B1`/`B12`/`B11` confirmadas.

Pero una auditoría fresca más profunda — no limitada a re-verificar la lista anterior — encontró que **dos de los fixes reclamados están solo parcialmente cerrados, y uno de ellos (`M2`, la sincronización entre pestañas de `DailyChecklist`) introduce dos bugs nuevos de integridad de datos que no existían antes de este ciclo corrector**: el listener de `storage` puede sobrescribir en silencio el tecleo activo de un usuario distinto en otra pestaña/dispositivo, y entra en un ciclo de reatribución de autoría indefinido entre dos pestañas abiertas por usuarios distintos; además, cuando el borrador se elimina tras un envío exitoso, la otra pestaña **nunca se entera** de que ya se envió, lo que puede producir un **segundo pedido real duplicado**. `A1` (la fuga de datos entre usuarios) queda parcialmente cerrada: el flujo estándar de logout→login sí muestra el banner correctamente, pero un borrador heredado sin `authorId` no dispara ningún aviso (reintroduce el bug original en silencio), y el propio efecto de autoguardado reatribuye la autoría al primer usuario que simplemente *abre* la pantalla, sin que haya editado nada — rompiendo la trazabilidad de turno que el fix dice perseguir.

Además, se identificaron **5 hallazgos Altos nuevos** de deuda preexistente que ningún ciclo anterior había detectado (ninguno introducido por este ciclo, salvo los dos de `DailyChecklist` ya descritos arriba, que sí son regresión del propio fix de este ciclo): `<html lang>` nunca se sincroniza con el idioma elegido por el usuario (viola WCAG 3.1.1); 6 controles de edición inline en la tabla de escritorio de `AdminCatalog` sin ningún nombre accesible (una **cuarta** superficie de edición que la corrección de `A2` no cubrió); descendientes focalizables anidados dentro de contenedores `role="button"` en `ShoppingView`/`NotificationsView` (viola el modelo de contenido ARIA); el icono de urgencia (`Flame`) de Dashboard sin alternativa textual; y el editor de stock de `DailyChecklist` sin entrada numérica directa, solo stepper ±1, degradando la calidad del dato que alimenta pedidos reales.

También aparecieron **9 hallazgos Medios nuevos** y una familia amplia de Bajos de pulido — detalle completo abajo. Compilación limpia, cero modales, cero clases dark-only, cero colores hardcodeados fuera de tokens, fallback público de Supabase intacto, i18n en paridad 400/400.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
vite v6.4.3 building for production...
✓ 2137 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-Doqd9Qhb.css              31.75 kB │ gzip:  6.84 kB
... (13 chunks lazy-loaded por pantalla, todos <25 kB)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-Cb_myiRt.js              311.39 kB │ gzip: 86.91 kB
✓ built in 5.08s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 16ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. Chunk principal 311.39 kB (86.91 kB gzip), variación mínima (+1.79 kB) respecto al ciclo anterior — coherente con las ~20 claves i18n y helpers nuevos.
- **i18n:** `src/lib/translations.ts` → **400/400 claves** en `es` y `en` (verificado por extracción programática propia: 400 en cada bloque, 0 solo-en-es, 0 solo-en-en), sin huecos ni duplicados.
- **Diseño de tokens:** `grep` de `bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`/`fixed inset-0`/hex hardcodeado sobre los componentes + `App.tsx` + `index.css`: **0 coincidencias reales** (el único hex fuera de `index.css` sigue siendo el `<meta name="theme-color">` de `App.tsx:650`, legítimo porque una etiqueta `<meta>` no puede consumir una custom property CSS, y refleja exactamente `--sf-bg`).
- **`htmlFor`:** 20 ocurrencias en `src/` (17 de `AdminCatalog.tsx` + 3 de `AccountView.tsx`/`NotificationsView.tsx`), consistente con los claims A2/A3/M8.
- **Working tree:** limpio al momento de escribir este informe (se revirtió un cambio incidental de `package-lock.json` generado por `npm install` en este entorno — drift de metadatos `peer` entre versiones de npm, sin relación con el código auditado, mismo patrón ya documentado en el ciclo anterior).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Δ vs. ciclo anterior | Qué falta para llegar a 10 |
|---|---|---|---|
| LoginScreen | **7.5/10** | = | Fundamentos sólidos (tokens, `prefers-reduced-motion`, estados de carga/timeout/reintento). Nuevo: un `setTimeout` de 500ms artificial antes de navegar tras elegir usuario (`LoginScreen.tsx:54-67`) sin operación asíncrona real detrás — resta sensación de app "instantánea" tipo Superhuman/Arc; las cabeceras de sección ("Cocina"/"Compradores"/"Administración") son `<span>` sin jerarquía semántica de encabezado. |
| Header | **7/10** | -0.5 | Popover con foco/Escape correctos, badge accesible y memoizado. El contenedor de opciones de restaurante no sigue el patrón ARIA `listbox`/`menu` completo (sin `role="listbox"`, sin mover el foco al abrir) — funciona por proximidad de botones sueltos, pero degrada con más locales; `title` + `aria-label` duplicados en el avatar es redundante para lectores de pantalla. |
| BottomNav | **8/10** | +0.5 | `min-h-11` explícito y `whitespace-nowrap` ya presentes (B5 cerrado), badges accesibles, `React.memo`, safe-area correcto. Falta `aria-label` en el `<nav>` como landmark nombrado, y una decisión explícita documentada sobre `aria-current="page"` vs. un patrón `tablist`/`aria-selected` (cambia contenido sin navegación real). |
| ViewHeader | **8.5/10** | +1.5 | El componente más pulido del shell: back-affordance en vez de modal, `aria-label` en volver, truncamiento seguro. Sin fricción real — solo le falta exponer un `id` para que el consumidor pueda enlazar `aria-labelledby` si algún día lo necesita. |
| Dashboard | **6/10** | = | Memoización y personalización por rol correctas. El icono `Flame` de urgencia en "Actividad reciente" no tiene alternativa textual (hallazgo Alto nuevo); **sigue sin ningún indicador de tendencia/delta** (M6, deuda deliberadamente diferida); stat tiles siguen sin ser interactivos (no navegan al detalle); `grid-cols-2` fijo sin variante responsive para tablet/desktop; 3 ramas de rol casi-duplicadas sin refactor. |
| RequestsList | **7/10** | = | `aria-controls`, badge URGENTE y memoización de `statusLabels`/unidades genuinamente cerrados. El botón principal "Ver/Ocultar detalles" —el control más pulsado de la pantalla— no llega a 44px en móvil (~28px, peor que el ya conocido B6 del chip "+N más" por ser el control primario, no un caso de borde); el resumen de WhatsApp sigue interpolando la unidad sin traducir pese a que la vista en tarjeta ya la traduce (fuga de i18n no citada por ningún ciclo previo); `aria-pressed` mal aplicado a filtros de selección única. |
| DailyChecklist | **6/10** | -1 (recalibrado, no solo regresión — auditoría más profunda) | Los 2 fixes de seguridad de datos más importantes del ciclo (banner de traspaso, sonido no-alarma) están genuinamente resueltos en su escenario principal. Pero la sincronización entre pestañas (M2) **introduce dos bugs de integridad de datos nuevos** (sobrescritura silenciosa de tecleo activo entre usuarios distintos, y envíos duplicados no detectados entre pestañas) que no existían antes de este ciclo; A1 queda parcialmente cerrado (borrador heredado sin `authorId` no muestra aviso; autoguardado en el montaje reatribuye autoría sin edición real); el editor de stock solo permite ±1 sin entrada numérica directa, degradando la precisión del dato que alimenta pedidos reales; nota sin `<label htmlFor>` pese a que el resto del ciclo sí lo aplicó en las demás pantallas. |
| AdminCatalog | **6/10** | = | Los 17 `<label>` de los 3 formularios ya citados están genuinamente corregidos con `htmlFor`/`id`. Pero existe una **cuarta superficie de edición** —la fila editable de la tabla de escritorio— con 6 controles sin ningún nombre accesible, que la corrección de A2 no llegó a cubrir; un sufijo `"s"` hardcodeado tras el nombre de unidad traducido rompe la pluralización en ambos idiomas ("Unidads", "Boxs"); la pestaña "Proveedores" no tiene ni siquiera una fuente de datos real (import estático, sin alta/edición/borrado) pese a lucir igual que "Restaurantes", que sí las tiene; formulario triplicado y doble montaje tabla+tarjetas siguen sin cambios. |
| ShoppingView | **8/10** | = | La pantalla más pulida de las 4 de su grupo: objetivos táctiles amplios, `aria-label` distintivo por nota ya cerrado (B15). El guardado duplicado de nota (B10) se confirma reproducible (mecanismo real: `mousedown` en "Guardar" dispara `blur` antes que `click`, ambos llaman `handleSaveNote`); descendientes focalizables anidados dentro de un `role="button"` violan el modelo de contenido ARIA (mismo patrón que NotificationsView); sin "deshacer" tras marcar un ítem por error. |
| AccountView | **8/10** | +1 | La pantalla mejor arquitecturada de las 4 de su grupo: labels reales verificadas (A3 cerrado, el nombre accesible sobrevive a que el usuario escriba), punto de entrada único, auto-guardado al volver. Sigue sin ruta de error si `onSaveProfile` fallara (prop síncrona `void`); avatares preestablecidos dependen de una CDN externa (Unsplash) sin skeleton de carga. |
| NotificationsView | **7/10** | = | Tap targets, memoización de la lista visible y sincronización entre pestañas (patrón que `DailyChecklist` copió, con menos suerte) genuinamente sólidos. `statusLabels` no memoizado pese a que el resto del archivo sí sigue ese patrón; mismo problema de anidamiento ARIA que ShoppingView; sin agrupación temporal ni swipe-to-dismiss; el simulador de notificación de prueba sigue sin separación visual clara de los ajustes reales. |

**Promedio (10 pantallas del encargo): 7.05/10** (vs. 7.1/10 del ciclo anterior — esencialmente plano). El patrón se repite por tercer ciclo consecutivo: el trabajo corrector es real y verificable línea por línea, pero cuanto más a fondo se audita (una cuarta superficie de formulario no citada explícitamente, una carrera entre pestañas de dos usuarios distintos, un icono sin alternativa textual en una pantalla que ya se había auditado dos veces), más hallazgos de severidad comparable aparecen. La novedad de este ciclo es distinta a las anteriores: por primera vez, uno de los propios fixes del ciclo corrector (`M2` en `DailyChecklist`) **introduce** una regresión real de integridad de datos en vez de solo dejar destapada deuda preexistente — ver detalle en (d).

---

## (d) Hallazgos por severidad

### 🔴 Crítico

Ninguno. Los 2 Críticos históricos (`App.tsx` Rules of Hooks; `DailyChecklist` sin `key` de restaurante) se re-verificaron de forma independiente por el agente auditor y por la sub-auditoría del shell: `currentNavTabs`/`activePendingRequestsCount` siguen declarados en `App.tsx:607-631`, antes del primer `return` condicional en `App.tsx:655`; `<DailyChecklist key={selectedRestaurant.id}>` sigue presente en `App.tsx:755`. Sin regresión.

Los dos bugs nuevos de `DailyChecklist` (ver A6/A7 abajo) se clasifican como Alto y no Crítico porque solo se manifiestan bajo un escenario específico (dos pestañas/dispositivos abiertos simultáneamente por usuarios distintos sobre el mismo restaurante/día) — real en el flujo de cocina compartida que esta app soporta explícitamente, pero no determinístico en el uso de una sola pestaña, a diferencia de los Críticos históricos que ocurrían en cada logout/cambio de restaurante.

### 🟠 Alto

**A1 — PARCIALMENTE CERRADO: fuga de datos entre usuarios en `DailyChecklist` (ciclo anterior) — quedan 2 brechas reales.**
`DailyChecklist.tsx:142-146` (banner condicional) y `:148-164` (`discardDraft`) están correctamente implementados para el flujo estándar de logout→login. Pero:
- (a) Un borrador heredado sin `authorId` (persistido antes de esta migración) hace que `draft?.authorId && ...` (línea 143) sea `falsy` completo — **no se muestra ningún banner**, reintroduciendo en silencio el bug original para cualquier borrador huérfano de antes de este despliegue.
- (b) El efecto de autoguardado (`DailyChecklist.tsx:166-185`) corre también en el montaje inicial, antes de que el usuario decida "Continuar"/"Descartar" — el borrador se reescribe con `authorId: currentUser.id` (línea 177) por el solo hecho de abrir la pantalla, sin editar nada. Un tercer usuario que abra después verá "Retomando borrador de B" cuando en realidad el contenido es de A — la trazabilidad de turno que el fix busca queda rota por su propia mecánica.
- **Recomendación:** tratar `authorId` ausente como "autor desconocido" y mostrar igual el banner; no persistir en el efecto de autoguardado hasta que haya un cambio real del usuario actual (`useRef` de "ya editó"), o conservar `authorId` original hasta la decisión explícita.

**A6 — NUEVO (regresión de este ciclo): sobrescritura silenciosa de ediciones activas entre pestañas/usuarios distintos en `DailyChecklist`.**
`DailyChecklist.tsx:191-206`. El comentario del código (línea 189-190) describe el filtro `incoming.authorId === currentUser.id` como "salta el eco de mi propio guardado" — pero los eventos `storage` **nunca** se disparan en la pestaña que escribió (comportamiento estándar del navegador), así que no existe tal eco que saltar dentro de la misma pestaña. Lo que el filtro realmente protege es el caso benigno (dos pestañas del mismo usuario); no protege el caso peligroso: **dos usuarios distintos con pestañas abiertas simultáneamente sobre el mismo restaurante/día** (el escenario exacto de cocina compartida que A1 fue creado para resolver). Secuencia trazada y confirmada línea por línea: B escribe una nota → autoguardado (línea 166-185) persiste con `authorId: B` → dispara `storage` en la pestaña de A → A acepta el `setState` incondicionalmente (línea 197-201), **incluso si A tenía el foco puesto en su propio campo de nota en ese instante** — su tecleo se pierde sin aviso ni merge. Ese `setState` dispara de nuevo el autoguardado de A (con `authorId: A`), que dispara `storage` en la pestaña de B, que acepta y reescribe con `authorId: B` de nuevo — un ciclo de reatribución de autoría que se repite indefinidamente mientras ambas pestañas sigan abiertas.
- **Recomendación:** no sobrescribir campos con foco activo; usar `savedAt`/un contador de versión para descartar ecos por contenido idéntico en vez de por `authorId`; considerar un lock optimista.

**A7 — NUEVO (regresión de este ciclo): envío del Checklist no se propaga entre pestañas — riesgo de pedido duplicado real.**
`DailyChecklist.tsx:294-298` hace `localStorage.removeItem` tras un envío exitoso. Esto dispara un evento `storage` con `e.newValue = null`; `parseDraft(null)` devuelve `null` (línea 53) y el listener lo descarta sin más (`if (!incoming || ...) return`, línea 196). La otra pestaña/dispositivo **nunca se entera de que el checklist ya fue enviado**, sigue mostrando el formulario con datos obsoletos, y si su usuario pulsa "Enviar" genera una **segunda solicitud de compra real** para el mismo restaurante/día — no un dato mostrado de forma incorrecta, sino una acción de negocio duplicada.
- **Recomendación:** tratar `e.newValue === null` para la misma clave como señal explícita de "enviado/descartado en otro lugar" (deshabilitar el envío + aviso visible), no como "sin cambios que aplicar".

**A8 — NUEVO: `<html lang>` nunca se sincroniza con el idioma elegido por el usuario (WCAG 3.1.1).**
`index.html:2` fija `lang="es"` de forma estática. Grep completo de `document.documentElement.lang` en `src/` → cero resultados. `handleChangeLanguage`/`handleSelectUser` (`App.tsx:572-584`) actualizan `appLanguage`/`currentUser.language` y los persisten, pero nunca tocan `document.documentElement.lang`. Un usuario que cambia a inglés desde `LoginScreen` sigue teniendo `lang="es"` en el documento — lectores de pantalla (VoiceOver/TalkBack) pronunciarán todo el contenido en inglés con fonética española.
- **Recomendación:** `useEffect(() => { document.documentElement.lang = currentUser?.language || appLanguage; }, [currentUser?.language, appLanguage])` junto al efecto de tema en `App.tsx`, antes del `return` condicional.

**A9 — NUEVO: 6 controles de edición inline en la tabla de escritorio de `AdminCatalog` sin ningún nombre accesible — cuarta superficie que A2 no cubrió.**
`AdminCatalog.tsx:302,306,313,319,324,327` (nombre, categoría, unidad, umbral mínimo, cantidad sugerida, proveedor sugerido en la fila editable de la tabla `md:block`). A diferencia de los 17 `<label>` de los 3 formularios (alta inline, alta de restaurante, `EditCard`), que sí quedaron corregidos, esta cuarta ruta de edición nunca tuvo `<label>`, `aria-label` ni `aria-labelledby`, ni antes ni después de este ciclo. Un lector de pantalla anuncia "textbox"/"combobox" sin contexto al editar cualquier producto desde escritorio.
- **Recomendación:** `aria-labelledby` apuntando al `id` del `<th scope="col">` de cada columna, o replicar el patrón `sr-only <label>` ya usado en `EditCard`.

**A10 — NUEVO: descendientes focalizables anidados dentro de contenedores `role="button"` en `ShoppingView` y `NotificationsView` (violación del modelo de contenido ARIA).**
`ShoppingView.tsx:166-264` y `NotificationsView.tsx:233-273` usan `<div role="button" tabIndex={0}>` para la fila/tarjeta completa, y anidan dentro elementos realmente focalizables (el `<input>` y botón "Guardar" de nota, el botón "marcar leído"). La especificación ARIA prohíbe descendientes focalizables dentro de un widget `role="button"`. El `stopPropagation` en los handlers internos evita el doble-disparo funcional visible, pero no corrige el árbol de accesibilidad expuesto a tecnologías asistivas.
- **Recomendación:** el contenedor externo no debería llevar `role="button"`; usar un `<div>` sin rol con un botón/`<a>` explícito para la acción principal, dejando los controles secundarios como hermanos, no hijos, de ese widget.

**A11 — NUEVO: icono de urgencia (`Flame`) en "Actividad reciente" de Dashboard sin alternativa textual.**
`Dashboard.tsx:195-197`. A diferencia de `RequestsList.tsx:218-224`, donde el mismo icono va acompañado del texto visible `t.tagUrgent`, aquí no hay `aria-label` ni texto `sr-only` — un usuario de lector de pantalla no tiene forma de saber que la solicitud es urgente. Viola WCAG 1.1.1/1.4.1.
- **Recomendación:** `aria-label={t.tagUrgent}` o `<span className="sr-only">{t.tagUrgent}</span>` junto al icono.

**A12 — NUEVO: editor de stock de `DailyChecklist` sin entrada numérica directa, solo stepper ±1.**
`DailyChecklist.tsx:470-483` — todo el contador de stock es `Minus`/número estático/`Plus`, sin ningún `<input type="number">` en el archivo. Para corregir un conteo real de, p. ej., 340 unidades con un umbral de 100, la única vía es pulsar "+" cientos de veces (los atajos "0"/"Bajo"/"Suficiente" fijan valores arbitrarios relativos al umbral, no el conteo real observado). Esto degrada la precisión del dato que alimenta pedidos reales de compra.
- **Recomendación:** campo numérico editable directamente (`min=0`), manteniendo los botones ±1 y los atajos como aceleradores, no como único mecanismo de entrada.

### 🟡 Medio

**M1 — NUEVO: timer sin cancelar en `handleSelectRequestFromNotification` puede ocultar el resaltado de una solicitud más reciente.** `App.tsx:148-159` — sin `ref` que cancele el `setTimeout` anterior; abrir dos notificaciones en menos de 5s hace que el primer timeout borre el resaltado del segundo request antes de tiempo.

**M2 — NUEVO: retraso artificial de 500ms en cada login sin operación asíncrona real detrás.** `LoginScreen.tsx:54-67` — `onSelectUser`/`handleSelectUser` son 100% síncronos; el `setTimeout` de 500ms solo demora la navegación sin aportar feedback real.

**M3 — NUEVO: popover de selección de restaurante en `Header` sin patrón ARIA `listbox`/`menu` completo.** `Header.tsx:104-131` — sin `role="listbox"`, sin mover el foco al abrir; funciona por proximidad de botones, degrada con más locales.

**M4 — NUEVO: `App.tsx` concentra routing/sesión/tema junto a 15+ handlers de negocio en un único archivo de 806 líneas.** Dificulta aislar y testear el shell; cualquier cambio en lógica de compras toca el mismo archivo que gestiona sesión/tema.

**M5 — NUEVO: botón "Ver/Ocultar detalles" de `RequestsList` —el control de disclosure más usado de la pantalla— no llega a 44px en móvil (~28px).** `RequestsList.tsx:350-354`. Más grave que el ya conocido B6 ("+N más") por ser el control primario, no un caso de borde.

**M6 — NUEVO: resumen de WhatsApp de `RequestsList` interpola la unidad sin traducir.** `src/lib/notifications.ts:153` (`generateRequestWhatsAppSummary`), alcanzado desde `RequestsList.tsx:358` — un usuario en inglés comparte un mensaje con "Paquete" en vez de "Pack", pese a que la corrección M3/M4 del ciclo anterior sí tradujo la vista en tarjeta del mismo dato.

**M7 — NUEVO: stat tiles de Dashboard no son interactivos (sin drill-down al filtro correspondiente).** `Dashboard.tsx:140-158` — brecha frente a cualquier dashboard Stripe/Linear/Revolut, donde los KPI tiles son atajos de navegación.

**M8 — NUEVO: sufijo `"s"` hardcodeado tras el nombre de unidad traducido rompe la pluralización en ambos idiomas.** `AdminCatalog.tsx:263,267,320,324` y `ShoppingView.tsx:205` — `` {formatUnitName(p.unit, t)}s ``. Ejemplos verificados contra `translations.ts`: ES "Unidad"→"Unidads" (correcto: "Unidades"), "Galón"→"Galóns"; EN "Box"→"Boxs" (correcto: "Boxes"). Deuda preexistente que la traducción de unidades de este ciclo no corrigió y que ahora también afecta al inglés.

**M9 — NUEVO: pestaña "Proveedores" de `AdminCatalog` sin fuente de datos real ni CRUD alguno.** `App.tsx:785` pasa `suppliers={INITIAL_SUPPLIERS}` importado estático de `src/data/caddyShackData.ts`; `AdminCatalogProps` no declara `onAdd/onUpdate/onDeleteSupplier`. Visualmente idéntica a "Restaurantes" (que sí tiene alta real), sin ninguna indicación en la UI de que es de solo lectura sobre datos mock.

**M10 — nota de `DailyChecklist` sin asociación programática `<label>`↔control, pese a que el resto del ciclo sí lo corrigió en Admin/Account/Notifications.** `DailyChecklist.tsx:574-587` — `<label>` sin `htmlFor`, `<textarea>` sin `id`. Mismo defecto que `A2`/`A3`/`M8` (numeración anterior) cerraron en otras 3 pantallas, dejado sin tocar en la de mayor criticidad de datos.

### 🟢 Bajo

**B1 — `animate-spin` no cubierto por la regla global de `prefers-reduced-motion`.** `index.css:189-200` solo anula `.animate-fadeIn`/`.sf-pop`/`.animate-pulse`/`transition-duration`; los spinners (`LoginScreen.tsx:115,169`, `App.tsx:58`) usan `keyframes`, fuera del alcance de esa regla. Discutible por tratarse de estado de carga esencial, pero conviene decidirlo explícitamente.

**B2 — Contraste de `--sf-text-subtle` en tema claro en el límite de AA (~4.56:1), margen frágil.** `index.css:40`, usado en `LoginScreen.tsx:183`.

**B3 — `<nav>` de `BottomNav` sin `aria-label` que lo identifique como landmark.** `BottomNav.tsx:24-32`.

**B4 — Título del documento fijo en español, no sigue `appLanguage`.** `index.html:10`.

**B5 — Botones de tabs de filtro de `RequestsList` (~36px) por debajo del estándar propio de 44px.** `RequestsList.tsx:140-153`.

**B6 — "+N más" de RequestsList en ~24px (sin cambios respecto al ciclo anterior).** `RequestsList.tsx:291-295`.

**B7 — Etiquetas de filtro de RequestsList truncan en viewports ~375px (sin cambios).** `RequestsList.tsx:139-166`.

**B8 — `aria-pressed` mal aplicado a los filtros de selección única de RequestsList** (semántica de toggle independiente para lo que es selección única). `RequestsList.tsx:146`.

**B9 — Cero uso de `aria-live` en Dashboard/RequestsList para contadores y feed que cambian por Realtime sin interacción del usuario.**

**B10 — `grid-cols-2` fijo en Dashboard sin variante responsive para tablet/desktop.** `Dashboard.tsx:139`.

**B11 — Fuentes muy pequeñas (10-11px) en badges de estado/contador de Dashboard/RequestsList.**

**B12 — Bloques de acciones por rol duplicados inline en `RequestsList.tsx:368-439`**, mismo patrón ya documentado en `Dashboard.tsx:67-111`, no citado antes para este archivo.

**B13 — `eslint-disable-next-line react-hooks/exhaustive-deps` aparentemente innecesario en `RequestsList.tsx:70-85`** (las deps declaradas ya cubren lo referenciado).

**B14 — Sin virtualización del feed de `RequestsList`** (se degradará con cientos de solicitudes "Completada" acumuladas).

**B15 — Botones de acción async de `RequestsList` sin estado in-flight/disabled explícito por request** (mitigado en la práctica por el update optimista, pero sin guardia estructural contra doble-tap).

**B16 — Botones de tabs/"Agregar" de `AdminCatalog` (~28-32px) por debajo del estándar propio de 44px.** `AdminCatalog.tsx:156-165,183-187,357-360`.

**B17 — `aria-live="polite"` colocado directamente en `<button>` cuyo texto cambia (Guardar→Guardado), patrón no convencional.** `AdminCatalog.tsx:535`, `AccountView.tsx:179`, `ShoppingView.tsx:292`.

**B18 — Botones "Continuar"/"Descartar" del banner de `DailyChecklist` con `min-h-11` pero sin `flex items-center`, texto no centrado verticalmente** (a diferencia de "Ocultar nota", que sí lo añadió). `DailyChecklist.tsx:350,353`.

**B19 — Botones de ajuste rápido ("0"/"Bajo"/"Suficiente") de DailyChecklist sin `aria-label` contextual con el nombre del producto**, a diferencia de los botones ±1 de la misma tarjeta que sí lo tienen. `DailyChecklist.tsx:458-467`.

**B20 — Contador de stock de DailyChecklist no es una región `aria-live`**, sin confirmación auditiva del nuevo valor al pulsar +/-. `DailyChecklist.tsx:476`.

**B21 — Sonido "de éxito" de DailyChecklist suena antes de confirmar el envío, sin manejo de error visible si `onSubmitChecklist` rechazara.** `DailyChecklist.tsx:290-302` — hoy "funciona" solo porque el fallback de `App.tsx` nunca rechaza de verdad.

**B22 — Concatenación de strings i18n produce capitalización irregular en español ("...de María, Hace 5 min...").** `DailyChecklist.tsx:344-348` + `translations.ts:206-209`.

**Diferidos, confirmados sin regresión (documentados en ciclos anteriores, no re-litigados aquí):** formulario triplicado y doble montaje tabla+tarjetas de `AdminCatalog`; canal Realtime de `App.tsx:199-231` sin filtrar por restaurante (con detalle nuevo: también dispara sonido/notificación local para solicitudes de restaurantes ajenos al usuario, no solo tráfico innecesario); 3 ramas de rol duplicadas en Dashboard; sin virtualización en NotificationsView; guardado duplicado de nota en ShoppingView (B10 histórico, mecanismo real confirmado: `mousedown`→`blur` antes que `click`, ambos llaman `handleSaveNote`); botones de tabla de escritorio de AdminCatalog ~26px.

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Alto, prioridad máxima — regresión de este ciclo)** A6/A7 — Rediseñar la sincronización entre pestañas de `DailyChecklist.tsx:191-206`: no aceptar `setState` sobre campos con foco activo; usar `savedAt`/versión para deduplicar en vez de `authorId`; tratar `e.newValue === null` como señal explícita de "ya enviado/descartado" en vez de ignorarlo. Probar con dos pestañas de usuarios distintos abiertas simultáneamente sobre el mismo restaurante/día.
2. **(Alto)** A1 (brechas restantes) — banner visible también para borradores sin `authorId`; no reatribuir autoría en el autoguardado del montaje sin edición real del usuario actual.
3. **(Alto)** A8 — sincronizar `document.documentElement.lang` con el idioma activo en un `useEffect` de `App.tsx`.
4. **(Alto)** A9 — nombres accesibles para los 6 controles de la fila editable de la tabla de escritorio de `AdminCatalog`.
5. **(Alto)** A10 — quitar `role="button"` de los contenedores de `ShoppingView`/`NotificationsView` que anidan controles focalizables; mover la acción principal a un botón/`<a>` explícito hermano, no padre.
6. **(Alto)** A11 — `aria-label`/texto `sr-only` en el icono `Flame` de Dashboard.
7. **(Alto, requiere diseño de input, no una línea)** A12 — entrada numérica directa en el editor de stock de `DailyChecklist`, complementando (no reemplazando) los botones ±1.
8. **(Medio, una línea cada uno)** M1 (ref de timeout), M2 (quitar el delay artificial de login), M6 (traducir unidad en el resumen de WhatsApp), M8 (mover la pluralización a `formatUnitName` o claves de plural dedicadas), M10 (label real en la nota de DailyChecklist).
9. **(Medio)** M5 — `min-h-11` en el botón "Ver/Ocultar detalles" de RequestsList.
10. **(Medio)** M3 — patrón `listbox`/gestión de foco en el popover de restaurante del Header.
11. **(Medio)** M9 — documentar explícitamente en la UI que "Proveedores" es de solo lectura, o conectar un CRUD real si el alcance del producto lo requiere.
12. **(Medio, requiere diseño, no una línea)** M7 — stat tiles interactivos con drill-down en Dashboard; sigue pendiente M6 histórico (deltas/tendencias).
13. **(Bajo, en orden de esfuerzo/impacto)** B1–B22 — memoización residual (`statusLabels` de NotificationsView, `suppliers`/`filteredItems` de ShoppingView), tap targets residuales, `aria-live` en contadores/feed, landmark del `<nav>`, título del documento, capitalización i18n, centrado vertical de botones del banner de DailyChecklist.
14. **(Deuda de arquitectura mayor, sin cambios de prioridad respecto a ciclos anteriores)** formulario triplicado/doble montaje de AdminCatalog, Realtime sin filtrar por restaurante (con el matiz nuevo de ruido de notificaciones cross-tenant), duplicación de ramas de rol (ahora en 2 archivos), virtualización de NotificationsView/RequestsList, `App.tsx` monolítico (M4 de esta pasada) — seguir diferidos a un ciclo dedicado de refactor.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` contienen **14 pares completos**. Se verificó que las 3 recomendaciones de fortalecimiento de checklist del ciclo anterior (`wcag-audit` ítem #9, `i18n-parity-guardian` ítem #4 ampliado, `stateful-prop-transition-guardian` ítem #6) **se aplicaron genuinamente** — se leyó el contenido completo de los 3 `SKILL.md` y los 3 ítems están presentes tal como se describieron.

Esta pasada sí encontró evidencia de un **gap de especialización nuevo, no solo checklists incompletos**: el hallazgo A6/A7 (carrera de sincronización entre pestañas vía eventos `storage`, que sobrescribe ediciones activas y no propaga un borrado como señal significativa) no está cubierto por ninguna de las 14 skills existentes. `stateful-prop-transition-guardian` audita qué pasa con el estado local cuando cambia un *prop identificador sin desmontaje* — un problema de sincronización dentro de una misma pestaña — no la semántica de sincronización *entre pestañas/dispositivos* vía `window.addEventListener('storage', ...)`, que tiene su propia clase de bugs (distinguir eco propio de escritura remota real, no pisar un campo con foco activo, tratar un valor `null` como señal y no como ausencia de cambio). Este es ya el segundo lugar del código que implementa este patrón (`NotificationsView` primero, `DailyChecklist` ahora con fallas reales) sin que ninguna skill lo audite como su responsabilidad propia.

**Se recomienda crear:**

| Skill/subagente nuevo | Cuándo se dispara | Evidencia de esta pasada |
|---|---|---|
| `cross-tab-sync-guardian` | Al añadir/tocar un listener `window.addEventListener('storage', ...)` que sincroniza estado de UI entre pestañas/dispositivos | A6 (sobrescritura silenciosa de tecleo activo entre usuarios distintos) y A7 (borrado no propagado → envío duplicado) en `DailyChecklist.tsx:191-206`, la segunda implementación de este patrón en el repo y la primera con bugs reales. Checklist propuesto: (1) ¿el listener distingue "eco de mi propia escritura" (imposible, el evento no se dispara en la pestaña de origen) de "escritura remota real"? (2) ¿se sobrescribe un campo con foco activo del usuario local? (3) ¿un valor `null`/borrado se trata como señal explícita o se descarta silenciosamente? (4) ¿existe una prueba mental/manual con dos pestañas de *identidades distintas* abiertas a la vez, no solo dos pestañas del mismo usuario? |

No se identificó ningún otro gap que justifique una skill nueva — los demás hallazgos Altos de esta pasada (A8 lang, A9 labels de tabla, A10 nesting ARIA, A11 icono sin alt, A12 input numérico) son variantes ya cubiertas por el alcance declarado de `wcag-audit`/`mobile-ux-review`, simplemente no detectadas hasta ahora por no haber cubierto esa superficie específica — se recomienda añadir un ítem a `wcag-audit` reforzando "cubrir TODAS las superficies de edición del mismo dato/entidad, no solo las citadas en el último informe" (patrón que ya se repitió en A2→A9 de esta misma pasada).

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto a los ciclos anteriores: **Figma MCP**, **Chrome DevTools/Playwright MCP** (Playwright local ya disponible vía Bash sin necesidad de MCP — sería la forma más directa de reproducir en un navegador real el escenario de dos pestañas de A6/A7 en vez de solo por análisis estático/trazado manual), **Vercel MCP**. Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx`. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`) | **PASA** — 0 coincidencias. |
| 3 | Cero colores hardcodeados (todo `var(--sf-*)`/`.sf-*`) | **PASA** — 0 hex fuera de `index.css` salvo el `<meta name="theme-color">` legítimo. |
| 4 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — confirmado por la sub-auditoría del shell (`BottomNav.tsx:25` + `App.tsx:739`). |
| 5 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — múltiples tap targets por debajo del estándar propio de 44px (M5, B5, B6, B7, B16, y los 6 controles de tabla de A9), sobre el mínimo WCAG de 24px. |
| 6 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — 5 hallazgos Altos nuevos (A8 lang, A9 labels de tabla, A10 nesting ARIA, A11 icono sin alt) más los 2 de integridad de datos (A6/A7, no estrictamente WCAG pero sí de robustez); los fixes A2/A3/M1/M7/M8 del ciclo anterior se mantienen genuinamente cerrados en su alcance original. |
| 7 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — B7 (truncamiento a ~375px, sin cambios), B10 (Dashboard sin variante responsive de grid, nuevo). |
| 8 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — A6/A7 (carrera e envío duplicado en Checklist multi-pestaña, funcional nuevo); A1 parcialmente cerrado; M9 (Proveedores sin CRUD real); los 2 Críticos históricos siguen genuinamente cerrados. |
| 9 | i18n ES/EN mismas claves | **PASA** — 400/400 claves en ambos locales, sin huecos (verificado por extracción programática). M6/M8 (unidad sin traducir en WhatsApp; pluralización rota) son huecos de **cobertura de traducción de valores**, no de paridad de claves. |
| 10 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal 311.39 kB (86.91 kB gzip), sin aviso de tamaño de Vite. Este PASA no cubre ninguno de los hallazgos de este informe — ninguno es detectable por compilación. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `b38034d` (VEREDICTO: CON HALLAZGOS, 3 Altos + 6 Medios). Desde entonces aterrizaron 11 commits correctores (`107ff85..935cdef`) que cerraron, con evidencia real verificada de forma independiente en esta pasada: los 3 Altos (A1 parcialmente, A2/A3 completos), los 6 Medios completos (M1/M2/M3-M4/M5/M7/M8 de la numeración anterior), y una selección de Bajos (B1/B2/B3/B5/B9/B11/B12/B15 de la numeración anterior). El trabajo es sustancialmente real y verificado línea por línea, no solo por mensaje de commit. Pero por primera vez en este ciclo de auditoría continua, uno de los propios fixes (`M2`, sincronización entre pestañas de `DailyChecklist`) **introduce** dos bugs de integridad de datos nuevos en vez de solo dejar destapada deuda preexistente — la lección concreta para el próximo ciclo corrector es que un fix de sincronización entre pestañas necesita su propia prueba explícita con dos pestañas de *usuarios distintos* abiertas a la vez, no solo la verificación de que el banner aparece en el flujo estándar de logout/login. La puntuación promedio se mantiene esencialmente plana (7.05/10 vs. 7.1/10) no por falta de progreso real, sino porque una auditoría más profunda que la de ciclos anteriores (una cuarta superficie de edición no citada, dos pestañas de usuarios distintos simuladas a mano, iconos de estado sin alternativa textual) encontró hallazgos de severidad comparable a los que se cerraron. Se recomienda crear una skill/subagente nuevo (`cross-tab-sync-guardian`) — la primera desde el inicio de este ciclo de mejora continua — para cubrir la clase de bug que A6/A7 representan, no cubierta por ninguna de las 14 skills existentes.
