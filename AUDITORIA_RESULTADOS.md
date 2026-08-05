# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-05 (pasada automatizada del ciclo de mejora continua)
**Commit auditado:** `27766c8` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring/sesión/tema/idioma), sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.
**Metodología:** desde el informe anterior (auditado sobre `21a730d`, VEREDICTO: CON HALLAZGOS, 5 Altos nuevos + 2 regresiones del propio ciclo corrector en `DailyChecklist`) aterrizaron 12 commits correctores (`b01b9bf..27766c8`) que dicen cerrar los 7 Altos (A1 remanente + A6–A12) y los 10 Medios de esa auditoría. Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit ni por `CORRECCIONES_APLICADAS.md`**: se releyó el código real contra `HEAD` con 4 sub-auditorías delegadas en paralelo, cada una con instrucciones explícitas de verificar cada claim línea por línea contra el código actual, con trazado manual de secuencias de eventos donde aplicaba:

1. **Shell** (LoginScreen, Header, BottomNav, ViewHeader, `App.tsx` routing/sesión/tema/idioma) — verificación de A8, M1, M2, M3, B3 + re-verificación de los 2 Críticos históricos.
2. **Dashboard + RequestsList** — verificación de A11, M5, M6, M8, B5/B8.
3. **DailyChecklist en profundidad** — reconstrucción manual, evento por evento, de los 4 escenarios de mayor riesgo (A6, A7, ciclo de reatribución de autoría, A1 remanente) más A12/M10, con foco especial porque este archivo lleva ya **dos** ciclos correctores consecutivos reclamando cerrado el mismo bug de sincronización entre pestañas.
4. **AdminCatalog + AccountView + NotificationsView + ShoppingView** — verificación de A9, A10 (en ambos archivos), M8, M9, y re-verificación de A2/A3.

Además, el agente auditor ejecutó de forma independiente `tsc`/`build` propios, una extracción programática de paridad i18n (dos pasadas independientes con distinto código de extracción, mismo resultado), y greps propios de clases dark-only/hex hardcodeado/`fixed inset-0`.

## VEREDICTO: CON HALLAZGOS

Los 7 Altos y los 10 Medios reclamados por el ciclo corrector están **mayormente resueltos para el escenario literal que cada uno describe**, verificados evento por evento: A8 (`document.documentElement.lang`/`document.title` sincronizados en un `useEffect` antes del `return` condicional), M1 (`highlightTimeoutRef` cancela el timeout anterior), M2 (delay artificial de login eliminado, navegación síncrona), M3 (patrón `listbox` real y funcionalmente completo en el popover de restaurante de `Header`), B3 (`aria-label` en `<nav>`), A11 (`role="img"`+`aria-label` en el icono `Flame`, en Dashboard **y** de regalo en NotificationsView), M5 (botón de disclosure de RequestsList a `min-h-11` real, no solo la clase presente), M6 (resumen de WhatsApp ya traduce la unidad), M8 (pluralización real vía mapas de claves dedicadas, no un sufijo `s`), B5/B8 (`aria-current` correcto para selección única), A9 (6/6 controles de la tabla de escritorio de AdminCatalog con `aria-label` real), A10 (ambos archivos, ShoppingView y NotificationsView, ya no anidan focalizables dentro de `role="button"`, verificado con dos arquitecturas distintas y ambas correctas), M9 (aviso `role="status"` visible y bien ubicado en la pestaña Proveedores), M10 (`<label htmlFor>` real en la nota de DailyChecklist), y — el hallazgo de mayor riesgo de todo este ciclo — **A6/A7/el ciclo de reatribución de autoría de `DailyChecklist` están genuinamente rotos en su raíz** para los tres escenarios exactos que la auditoría anterior documentó: se trazó evento por evento con foco activo simulado, con dos pestañas de usuarios distintos, y con el guard `applyingRemoteUpdateRef`, y ninguno de los tres reprodujo.

Pero — como en cada una de las últimas auditorías de este ciclo — una revisión más profunda que la lista de verificación encontró que **A1 sigue solo parcialmente cerrado (una tercera variante de la misma brecha, no las dos ya conocidas) y que la propia corrección de A6 protege solo un subconjunto de los campos que necesitaba proteger**: `isUrgent`, `reviewedIds` y `showOrderPreview` se siguen sobrescribiendo sin ninguna protección de foco/versión cuando llega una actualización remota — el mismo modo de fallo de A6, simplemente en campos distintos de los que el fix cubrió. Además, el propio mecanismo de "frescura" que hace posible que A6/A7 funcionen (`savedAt` comparado entre pestañas) se apoya en relojes de pared **no sincronizados entre dispositivos distintos** — si el reloj de una tablet de cocina se atrasa respecto a otra, sus ediciones genuinamente más nuevas se descartan en silencio y **para siempre** mientras dure el desfase, sin ningún aviso al usuario. Y la brecha de reatribución de autoría al abrir la pantalla (A1-b) se cerró solo para la mitad de los casos: un borrador **ya existente** al montar no se reatribuye (correcto), pero si **no existe ningún borrador** al montar, el primer usuario que simplemente abre la pantalla sigue reatribuyéndose la autoría de los valores por defecto sin haber editado nada — exactamente el síntoma original de A1, reubicado a la otra rama del condicional.

También se identificaron **2 hallazgos Altos nuevos** fuera de `DailyChecklist`: pérdida de foco real al activar "+N más" en RequestsList (el elemento se desmonta al activarse, dejando el foco de teclado/lector de pantalla en ningún sitio), y los dos hallazgos de fragilidad de `DailyChecklist` ya descritos arriba. Y **11 hallazgos Medios nuevos** — detalle completo en (d). Compilación limpia, cero modales, cero clases dark-only, cero colores hardcodeados fuera de tokens, fallback público de Supabase intacto, i18n en paridad 421/421 (verificado dos veces con extracción programática independiente).

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
vite v6.4.3 building for production...
✓ 2137 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-CgD5Bpsn.css              32.26 kB │ gzip:  6.95 kB
... (13 chunks lazy-loaded por pantalla, todos <25 kB)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-2mls8vwE.js              314.34 kB │ gzip: 87.78 kB
✓ built in 3.83s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 8ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. Chunk principal 314.34 kB (87.78 kB gzip), variación mínima (+2.95 kB) respecto al ciclo anterior — coherente con las claves i18n y el input numérico nuevos.
- **i18n:** `src/lib/translations.ts` → **421/421 claves** en `es` y `en` (verificado por extracción programática propia, dos pasadas independientes con distinto código de extracción y los mismos límites de bloque confirmados por línea: `es:` en la línea 4, `en:` en la línea 465; 0 huecos en cualquier dirección).
- **Diseño de tokens:** grep propio de `bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`/`fixed inset-0`/hex hardcodeado sobre los 10 componentes + `App.tsx` + `index.css`: **0 coincidencias reales** (el único hex fuera de `index.css` sigue siendo el `<meta name="theme-color">` de `App.tsx:656`, legítimo, refleja `--sf-bg` vía el mismo token `isLight` que gobierna el tema).
- **Working tree:** limpio al momento de escribir este informe (se revirtió un cambio incidental de `package-lock.json` generado por `npm install` en este entorno, sin relación con el código auditado, mismo patrón ya documentado en ciclos anteriores).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Δ vs. ciclo anterior | Qué falta para llegar a 10 |
|---|---|---|---|
| LoginScreen | **8/10** | +0.5 | El delay artificial de 500ms (M2) ya no existe — navegación síncrona, sensación "instantánea" real. Falta: las cabeceras de sección ("Cocina"/"Compradores"/"Administración") siguen siendo `<span>` sin jerarquía de encabezado (nunca citado explícitamente, sigue abierto); sin personalización tipo "bienvenido de nuevo" (último avatar usado preseleccionado/resaltado, como hacen Slack/Notion en su selector de cuenta). |
| Header | **8/10** | +1 | El patrón `listbox` de M3 es una implementación APG real y funcionalmente completa (foco movido al abrir, flechas/Home/End, roving tabindex) — no atributos superficiales. Nuevo hallazgo: el popover no se cierra al salir con `Tab` (sin `focusout`/trampa de foco), queda abierto e interactivo mientras el foco ya se movió al siguiente control; el `<img>` de avatar no tiene `onError` de respaldo a las iniciales (a diferencia de `AccountView`, que sí lo tiene desde un ciclo anterior) — un avatar roto muestra el icono de imagen rota del navegador en el elemento más visible del chrome. |
| BottomNav | **8.5/10** | +0.5 | `aria-label` de landmark (B3) ya presente. Sigue sin una decisión documentada sobre `aria-current="page"` vs. un patrón `tablist`/`aria-selected` (cambia contenido sin navegación real, discutible pero no incorrecto); la transición de tab activo es un cambio de color instantáneo, no un indicador animado tipo Spotify/Apple Music. |
| Dashboard | **6.5/10** | +0.5 | Icono `Flame` con alternativa textual (A11) genuinamente cerrado. Sigue sin: stat tiles interactivos con drill-down (M7, deuda deliberadamente diferida por "requiere diseño"); indicadores de tendencia/delta (M6 histórico); `grid-cols-2` fijo sin variante responsive; cero `aria-live` en contadores/feed que cambian por Realtime sin interacción; ni Dashboard ni RequestsList están envueltos en `React.memo` (a diferencia de BottomNav). |
| RequestsList | **6.5/10** | -0.5 (nuevo hallazgo Alto compensa el progreso real) | `min-h-11` real en "Ver/Ocultar detalles" (M5), semántica ARIA correcta para el grupo de filtro de selección única (`aria-current`, B5/B8), resumen de WhatsApp traducido (M6), pluralización real (M8) — todo confirmado. Pero se encontró un hallazgo **Alto nuevo**: el botón "+N más" solo existe dentro de la rama `{!isExpanded && (...)}` y se desmonta al activarse — un usuario de teclado/lector de pantalla pierde el foco al expandir, sin re-enfoque programático a ningún punto útil. Persisten sin cambios: sin `aria-live`, sin virtualización del feed (agravado por `nowTick` que fuerza un re-render completo cada minuto solo para refrescar timestamps relativos), 3 bloques de acción por rol duplicados inline. |
| DailyChecklist | **6.5/10** | +0.5 (progreso real en la raíz del bug, pero alcance incompleto) | Es el archivo más auditado del repo por tercer ciclo consecutivo, y por primera vez los 3 escenarios exactos de la auditoría anterior (sobrescritura de campo con foco, envío no propagado, ciclo de reatribución de autoría) se confirmaron rotos en su raíz tras un trazado evento por evento — no un parche superficial. Pero el propio mecanismo tiene huecos adyacentes que el fix no cubrió: `isUrgent`/`reviewedIds`/`showOrderPreview` siguen expuestos al mismo modo de fallo de sobrescritura silenciosa que A6 debía eliminar (solo protegidos los campos de stock/nota); la comparación de frescura por `savedAt` usa relojes de pared no sincronizados entre dispositivos — un desfase de reloj puede descartar en silencio y **permanentemente** una edición genuinamente más nueva; y el guard de reatribución de autoría al montar (A1) solo cubre la rama "ya existe un borrador" — si **no** existe ningún borrador al montar, abrir la pantalla sigue reatribuyendo la autoría de los valores por defecto sin edición real, el síntoma original de A1 reubicado. El nuevo `<input type="number">` de A12 funciona pero tiene una regresión menor: borrar el campo hasta vaciarlo lo fuerza a "0" de inmediato (controlado), interrumpiendo la re-entrada de un número nuevo. |
| AdminCatalog | **6.5/10** | +0.5 | Las 4 superficies de edición del catálogo (incluida la fila de tabla de escritorio, A9) ya tienen nombres accesibles reales; pluralización correcta (M8); aviso de solo-lectura visible en Proveedores (M9). Sigue sin cambios: formulario triplicado (alta inline/`EditCard`/fila de tabla, las mismas 6 columnas implementadas 3 veces), doble montaje simultáneo tabla+tarjetas (toggle solo CSS, no renderizado condicional), selector de pestañas con `aria-pressed` (semántica de toggle) en vez de un patrón de selección única — la misma clase de defecto que si se corrigió en `RequestsList` pero no aquí ni en `NotificationsView`. |
| ShoppingView | **8/10** | = | La reestructura de A10 es limpia y arquitectónicamente correcta (un `<button>` real envolviendo solo contenido no interactivo, editor de nota como hermano, no anidado) — mejor que el patrón de superposición de NotificationsView para un futuro mantenedor. El guardado duplicado de nota (B10 histórico) sobrevive intacto a la reestructura de A10: `blur` (por `mousedown` en "Guardar") y `click` siguen llamando ambos a `handleSaveNote`. Controles repetidos por ítem ("Agregar nota"/"Guardar") sin nombre accesible que los distinga entre productos — un lector de pantalla navegando por tipo de control encuentra una lista de botones idénticos. |
| AccountView | **8/10** | = | Sigue la pantalla mejor arquitecturada de las 4 de su grupo: 17 labels reales verificadas sin regresión, `onError` en todos los avatares, auto-guardado al volver. Sin ruta de error si `onSaveProfile` fallara; avatares preestablecidos sin skeleton de carga (Unsplash). |
| NotificationsView | **7/10** | = | El patrón de botón superpuesto de A10 es verificablemente correcto en el árbol de accesibilidad (dos elementos focalizables hermanos, no anidados) aunque más fresco que el de ShoppingView; `statusLabels` ya memoizado. Nuevos: un `<label>` huérfano sin control asociado en Ajustes (HTML inválido); el botón de "marcar leída" usa el mismo `aria-label` genérico en cada tarjeta, sin el nombre de la solicitud (a diferencia del botón principal, que sí lo incluye); el switch Feed/Ajustes usa `aria-pressed` en vez de semántica de selección única, igual que en AdminCatalog. |

**Promedio (10 pantallas del encargo): 7.35/10** (vs. 7.05/10 del ciclo anterior — mejora real, no plana esta vez). El patrón de fondo se mantiene: el trabajo corrector es sustancialmente real y verificado evento por evento, incluida — por primera vez en tres ciclos — una corrección genuina en la raíz del bug de sincronización entre pestañas de `DailyChecklist`, no solo un parche que se sostiene bajo el escenario que se probó. Pero el mismo patrón de "cuanto más a fondo se audita, más aparece" se repite: los campos que el fix de A6 no incluyó en su lista de protección (`isUrgent`, `reviewedIds`, `showOrderPreview`), el desfase de reloj entre dispositivos que el mecanismo de `savedAt` no contempla, y la rama del condicional de montaje que A1 no cubrió, son todos huecos *adyacentes* al trabajo real que sí se hizo — no errores en lo que se probó, sino alcance incompleto de qué se necesitaba probar.

---

## (d) Hallazgos por severidad

### 🔴 Crítico

Ninguno. Los 2 Críticos históricos (`App.tsx` Rules of Hooks; `DailyChecklist` sin `key` de restaurante) se re-verificaron de forma independiente por la sub-auditoría del shell: `currentNavTabs` (`useMemo`, `App.tsx:613-637`), el efecto de tema (`App.tsx:646-658`) y el nuevo efecto de sincronización de idioma (`App.tsx:665-668`) están todos antes del primer `return` condicional en `App.tsx:671`; `<DailyChecklist key={selectedRestaurant.id}>` sigue presente en `App.tsx:771`. Sin regresión.

### 🟠 Alto

**H1 — `DailyChecklist`: campos `isUrgent`/`reviewedIds`/`showOrderPreview` sin protección frente a sobrescritura remota — el mismo modo de fallo de A6, en campos distintos de los que el fix cubrió.**
`DailyChecklist.tsx:277,279,280` — el `setState` que aplica un draft remoto protege el campo de stock con foco activo (`focusedStockProductIdRef`) y el textarea de nota (`noteFieldRef`), pero `setReviewedIds(new Set(incoming.reviewedIds))`, `setIsUrgent(incoming.isUrgent)` y `setShowOrderPreview(incoming.showOrderPreview)` se aplican de forma incondicional. `isUrgent` es crítico de negocio (gobierna `playAlertSound('urgent')` y la semántica de urgencia del pedido). Escenario: A marca "Urgente" un instante antes de que llegue una actualización remota de B cuyo `savedAt` es cronológicamente posterior pero fue generada a partir de un snapshot anterior a la acción de A — el toggle de A se revierte en silencio, sin aviso.
**Recomendación:** aplicar la misma disciplina de "preservar el valor local si hubo una interacción reciente" (un `ref` de "última interacción local" con timestamp, no solo foco de `<input>`) a estos 3 campos, o migrar de "sobrescritura de snapshot completo" a un merge campo por campo con `savedAt` por campo en vez de un único `savedAt` por draft completo.

**H2 — `DailyChecklist`: la comparación de frescura por `savedAt` usa relojes de pared no sincronizados entre dispositivos — riesgo de pérdida de datos silenciosa y permanente.**
`DailyChecklist.tsx:262-266` (`incoming.savedAt <= lastKnownSavedAtRef.current` descarta la actualización entrante) compara `Date.now()` de un dispositivo contra `Date.now()` de otro, sin reloj lógico ni compensación de desfase. Si el reloj de una tablet de cocina se atrasa respecto a otra (común en dispositivos no gestionados), cada edición genuinamente más nueva de esa tablet parecerá "vieja" frente al dispositivo adelantado y se descartará en `:262-266` con un `return` silencioso, sin ninguna señal al usuario — el mismo resultado final que A6 (pérdida silenciosa de datos), pero causado por desfase de reloj, no por foco activo, y no cubierto por ninguno de los 3 escenarios que el fix de este ciclo probó explícitamente.
**Recomendación:** usar un contador monotónico lógico por pestaña/dispositivo en vez de (o adicional a) `Date.now()`, o degradar a un merge por diff de campos en vez de comparar un timestamp único de todo el draft.

**H3 — `DailyChecklist`: A1 sigue solo parcialmente cerrado — el guard de reatribución de autoría al montar no cubre la rama "sin borrador existente".**
`DailyChecklist.tsx:162` (`skipInitialPersistRef = useRef(!!draft)`) — cuando **ya existe** un borrador al montar, el guard funciona correctamente y la primera escritura del efecto de persistencia se salta (`:212-219`), tal como reclama la corrección. Pero cuando **no existe** ningún borrador al montar (`draft` es `null`, el ref arranca en `false`), la primera ejecución del efecto de persistencia no encuentra ningún guard activo y persiste de inmediato los valores por defecto (`p.currentStock ?? p.minThreshold + 2`, `:112-118`) con `authorId: currentUser.id`, `savedAt: Date.now()` — reatribuyendo la autoría a quien simplemente abrió la pantalla, sin editar nada. Un segundo usuario que abra minutos después verá "Retomando borrador de [primer usuario], recién" cuando el primer usuario solo miró la pantalla. Es el síntoma exacto que A1(b) describía en la auditoría anterior, reubicado de la rama "borrador existente" (ya cerrada) a la rama "sin borrador" (nunca cubierta).
**Recomendación:** aplicar el mismo guard `skipInitialPersistRef`, inicializado en `true` independientemente de si `draft` existe o no, y solo liberarlo tras la primera interacción real del usuario (no tras el primer render del efecto).

**H4 — `RequestsList`: pérdida de foco real al activar "+N más" — el elemento se desmonta al expandirse, sin re-enfoque programático.**
`RequestsList.tsx:290-295` (el botón "+N más" solo existe dentro de `{!isExpanded && (...)}`, `:282`) — activarlo con teclado hace que `isExpanded` pase a `true` y el propio elemento que tenía el foco se desmonte en el mismo ciclo de render. El foco cae a `<body>` sin ningún re-enfoque explícito al contenido recién revelado ni al botón "Ver/Ocultar detalles" del pie (que sí permanece montado y solo cambia su etiqueta — el patrón correcto, usado en el mismo archivo). Un lector de pantalla no anuncia nada útil tras la activación.
**Recomendación:** mantener el disparador de "+N más" montado (alternando visualmente al mismo affordance de disclosure), o mover el foco explícitamente al botón del pie / a la región de detalle recién revelada al expandir.

### 🟡 Medio

**M1 — `Header`: el popover de restaurante no se cierra al salir con `Tab`.** `Header.tsx:49-61` — solo hay listeners de `mousedown` fuera y `Escape`; sin `focusout`/trampa de foco. Repro: abrir el selector, presionar `Tab` — el panel queda visualmente abierto e interactivo mientras el foco de teclado ya avanzó al siguiente control (la campana de notificaciones), contradiciendo lo que un usuario de lector de pantalla navegando linealmente encuentra (un listbox "abierto" con el foco en otro lugar).

**M2 — `App.tsx`: LoginScreen se fuerza a tema oscuro tras logout, sin documentar si es intencional.** `App.tsx:645-658` (`isLight = currentUser?.theme === 'light'`) — cuando `currentUser` es `null` (carga inicial o justo tras `handleLogout`), `isLight` es siempre `false`. Un usuario con tema claro guardado que cierra sesión ve el LoginScreen cambiar instantáneamente a oscuro, sin ninguna clave de preferencia de tema independiente de la sesión (a diferencia de `appLanguage`, que sí persiste por separado). Podría ser una decisión de marca deliberada, pero no hay comentario ni documentación que lo distinga de un bug.

**M3 — Cero `aria-live` en Dashboard/RequestsList para valores que cambian por Realtime sin interacción del usuario.** (B9 histórico, confirmado sin cambios) — stat tiles, feed de actividad reciente, contadores de pestañas de filtro, badges de estado que cambian cuando otro usuario actualiza una solicitud: 0 ocurrencias de `aria-live`/`role="status"`/`role="alert"` en ambos archivos.

**M4 — Sin virtualización del feed de `RequestsList`, agravado por un re-render completo cada minuto.** (B14 histórico, confirmado sin cambios) — `nowTick` (`RequestsList.tsx:91-95`) fuerza un re-render de todas las tarjetas visibles cada 60s solo para refrescar timestamps relativos, así que el costo de "sin windowing" se repite continuamente, no solo ante cambios de datos.

**M5 — Ni `Dashboard` ni `RequestsList` están envueltos en `React.memo`**, a diferencia de `BottomNav`. Riesgo bajo hoy dado el tamaño de la app, pero cualquier cambio de estado no relacionado en `App.tsx` re-ejecuta el cuerpo de ambos componentes.

**M6 — `DailyChecklist`: la clave de `localStorage` deriva de la fecha actual en cada escritura, pero el listener la fija una sola vez al montar — deriva de clave al cruzar medianoche.** `draftKeyFor` (`:36-49`) llama a `new Date()` en cada invocación; el efecto de persistencia la recalcula en cada escritura (`:220`), pero el efecto del listener `storage` la calcula una sola vez con deps `[selectedRestaurant.id, currentUser.id]` (`:250,287`, sin dependencia de fecha), y el `draft` inicial también es un `useMemo` con las mismas deps (`:110`). Una sesión que cruza la medianoche termina escuchando la clave de ayer mientras escribe en la de hoy, perdiendo en silencio eventos remotos genuinos — relevante porque los turnos de cocina sí pueden cruzar medianoche.

**M7 — `ShoppingView`/`NotificationsView`: nombres accesibles repetidos y no distinguibles en controles por ítem.** `ShoppingView.tsx:253-264` (botón "Agregar/Editar nota") y `:245-250` ("Guardar") no tienen `aria-label` propio — su nombre accesible es el mismo texto genérico en cada fila. `NotificationsView.tsx:271-278` (botón de descarte/"marcar leída") usa el mismo `aria-label` genérico en cada tarjeta, sin el número de solicitud ni el restaurante (a diferencia del botón principal de abrir la solicitud, que sí los incluye). Un usuario de lector de pantalla navegando por tipo de control (rotor de VoiceOver, tecla "b" de NVDA) encuentra una lista de botones "Agregar nota"/"Guardar"/"Marcar como leída" idénticos sin forma de distinguir a qué ítem pertenece cada uno.

**M8 — `NotificationsView`: `<label>` sin control asociado en Ajustes — HTML inválido.** `NotificationsView.tsx:344` — un `<label>` sin `htmlFor` que no envuelve ningún elemento etiquetable (le siguen dos `<button>`, no un input/select/textarea). Debería ser un `<h3>`/`<span>`/`<div>`, como el encabezado vecino "Simular notificación" que sí usa un `<div>`.

**M9 — `AdminCatalog`/`NotificationsView`: `aria-pressed` (semántica de toggle) en switches de selección única — misma clase de defecto ya corregida solo en `RequestsList`.** `AdminCatalog.tsx:156-162` (switcher PRODUCTOS/RESTAURANTES/PROVEEDORES/TIEMPOS) y `NotificationsView.tsx:164-183` (switcher FEED/AJUSTES) siguen usando `aria-pressed={active}` sobre controles funcionalmente equivalentes al filtro de `RequestsList` que este mismo ciclo migró a `aria-current` (B5/B8). La corrección no se replicó a estos dos sitios estructuralmente idénticos.

**M10 — `DailyChecklist`: el input numérico de stock se fuerza a "0" al vaciar el campo, interrumpiendo la re-entrada de un valor nuevo.** `DailyChecklist.tsx:577-580` — `Number('')` evalúa a `0` en JS, y `Number.isFinite(0)` es `true`, así que borrar el campo hasta vaciarlo (la forma natural de reemplazar "15" por "340" sin seleccionar todo primero) fuerza el campo controlado de vuelta a "0" en vez de quedarse vacío — degrada justo el caso de uso de precisión de datos que A12 buscaba resolver. Regresión menor introducida por el propio fix de A12 de este ciclo.

**M11 — `DailyChecklist`: "Empezar checklist nuevo" tras un borrado remoto descarta ediciones locales sin ninguna confirmación.** `DailyChecklist.tsx:197-201` (`startFreshAfterRemoteClear`) — si el usuario local tenía datos reales sin guardar cuando el envío de otra pestaña disparó `remoteCleared`, pulsar la acción del banner los descarta sin aviso. No es una fuga de datos entre usuarios, pero sí pérdida de datos propios sin advertencia.

### 🟢 Bajo

**B1 — `App.tsx`: listener de `beforeinstallprompt` sin `removeEventListener` en el cleanup del efecto.** `App.tsx:239-256` — handler anónimo inline, nunca removido; bajo riesgo en producción (el efecto solo corre una vez) pero se acumula bajo Strict Mode en desarrollo.

**B2 — `App.tsx`: sin sincronización de sesión entre pestañas — login/logout en una pestaña no se propaga a otra pestaña del mismo navegador.** Contrasta con el rigor de sincronización entre pestañas que `DailyChecklist`/`NotificationsView` sí invierten para otro estado.

**B3 — `LoginScreen`: cabeceras de sección ("Cocina"/"Compradores"/"Administración") siguen siendo `<span>`, no un encabezado semántico.** `LoginScreen.tsx:145` — sin `<h2>`, un usuario de lector de pantalla navegando por encabezados no tiene forma de saltar entre los tres grupos de rol.

**B4 — `Header`: `<img>` de avatar sin `onError` de respaldo a las iniciales**, a diferencia del mismo patrón ya protegido en `AccountView`. `Header.tsx:209-215`.

**B5 — `RequestsList`: grupo de tabs de filtro sin nombre accesible de grupo.** `RequestsList.tsx:139` — sin `role="group"`/`aria-label` que indique el propósito del conjunto de 4 botones.

**B6 — "+N más" de RequestsList en ~24px, en el límite mínimo de WCAG (sin margen).** `RequestsList.tsx:291` (sin cambios respecto a ciclos anteriores, interactúa con H4 de arriba).

**B7 — Estados "Comprada" y "Entregada" de RequestsList comparten el mismo token de color**, sin diferenciación visual más allá del texto. `src/lib/colors.ts:16-23`.

**B8 — `eslint-disable-next-line react-hooks/exhaustive-deps` aparentemente innecesario en `RequestsList.tsx:84`** (sin cambios, deps declaradas ya cubren lo referenciado).

**B9 — `grid-cols-2` fijo en Dashboard sin variante responsive para tablet/desktop.** `Dashboard.tsx:139` (sin cambios).

**B10 — `ShoppingView`: `suppliers`/`filteredItems` recalculados en cada render sin `useMemo`**, a diferencia de `filteredProducts` de `AdminCatalog`. `ShoppingView.tsx:51,53`.

**B11 — `NotificationsView`: `e.stopPropagation()` residual en `handleDismiss`**, vestigio de la arquitectura anidada anterior a la reestructura de A10 — ya no es funcionalmente necesario. `NotificationsView.tsx:92`.

**B12 — `ShoppingView`: el editor de nota no tiene una vía real de "cancelar".** `onBlur` siempre guarda lo que esté escrito; no hay forma de salir de una edición sin confirmarla. `ShoppingView.tsx:238`.

**B13 — `AdminCatalog`: salto de nivel de encabezado (`<h1>` seguido de `<h3>` sin `<h2>` intermedio).** `AdminCatalog.tsx:138,194,366`.

**B14 — `DailyChecklist`: `markAsReviewed` se invoca dos veces en `handleQuickSet`** (una dentro de `handleStockChange`, otra directa) — inofensivo por ser un `Set`, pero redundante. `DailyChecklist.tsx:359,368`.

**B15 — `DailyChecklist`: una actualización remota fuerza el estado de UI local `showOrderPreview`**, abriendo/cerrando el cajón de vista previa de pedido de un usuario sin ninguna acción local suya. `DailyChecklist.tsx:280`.

**B16 (histórico, confirmado sin regresión) — `ShoppingView`: guardado duplicado de nota sobrevive a la reestructura de A10.** `mousedown` en "Guardar" dispara `blur` antes que `click`, ambos siguen llamando a `handleSaveNote`. `ShoppingView.tsx:238,246`.

**B17 (histórico, confirmado sin regresión) — `AdminCatalog`: formulario triplicado (alta inline/`EditCard`/fila de tabla) y doble montaje simultáneo tabla+tarjetas (toggle solo CSS).**

**B18 (histórico, confirmado sin regresión) — `DailyChecklist`: `aria-pressed` en los botones de filtro de revisión/categoría/ajuste rápido (selección única), botones del banner sin `flex items-center`, quick-set sin `aria-label` contextual, sin `aria-live` en el contador de stock al usar los botones ±1, sonido de éxito antes de confirmar el envío sin `try/catch`, concatenación de strings con capitalización irregular.**

**Diferidos, confirmados sin regresión (documentados en ciclos anteriores, no re-litigados en detalle aquí):** canal Realtime de `App.tsx` sin filtrar por restaurante; 3 ramas de rol duplicadas en Dashboard/RequestsList; `App.tsx` monolítico (routing + sesión + tema + idioma + 15+ handlers de negocio en un archivo, confirmado sin cambios por la sub-auditoría del shell); AccountView sin skeleton de carga para avatares de Unsplash.

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Alto, prioridad máxima)** H1 — extender la protección de A6 (preservar valor local ante actualización remota) a `isUrgent`/`reviewedIds`/`showOrderPreview` en `DailyChecklist`, no solo a stock/nota.
2. **(Alto)** H2 — reemplazar la comparación de frescura por `Date.now()` entre dispositivos distintos por un contador lógico monotónico, o mergear por campo en vez de por snapshot completo.
3. **(Alto)** H3 — aplicar el guard de "no reatribuir autoría al montar" (`skipInitialPersistRef` o equivalente) también cuando **no** existe un borrador previo al montar, no solo cuando sí existe.
4. **(Alto)** H4 — mantener montado el disparador "+N más" de RequestsList (o mover el foco explícitamente al expandir) para no perder el foco de teclado/lector de pantalla.
5. **(Medio, una línea/patrón conocido cada uno)** M1 (cerrar popover de Header al salir con Tab — `focusout`), M8 (cambiar el `<label>` huérfano de NotificationsView por un `<div>`/`<h3>`), M9 (migrar `aria-pressed`→`aria-current` en AdminCatalog/NotificationsView, mismo patrón ya aplicado en RequestsList), M10 (no forzar "0" al vaciar el input de stock — permitir string vacío como estado intermedio), M7 (nombres accesibles distinguibles por ítem en ShoppingView/NotificationsView).
6. **(Medio)** M2 — decidir y documentar si el tema oscuro forzado en LoginScreen tras logout es intencional, o persistir una preferencia de tema independiente de la sesión.
7. **(Medio)** M6 — recalcular la clave de `localStorage` del listener de `DailyChecklist` cuando cruza medianoche, no solo al montar.
8. **(Medio)** M11 — confirmación antes de descartar ediciones locales al pulsar "Empezar checklist nuevo" tras un borrado remoto.
9. **(Medio, requiere diseño, no una línea)** M3/M4 — `aria-live` en contadores/feed de Dashboard/RequestsList; virtualización del feed de RequestsList.
10. **(Bajo, en orden de esfuerzo/impacto)** B1–B18 — listener sin limpiar, sincronización de sesión entre pestañas, encabezados semánticos de LoginScreen, `onError` en avatar de Header, memoización residual de ShoppingView, limpieza de `stopPropagation` vestigial.
11. **(Deuda de arquitectura mayor, sin cambios de prioridad respecto a ciclos anteriores)** formulario triplicado/doble montaje de AdminCatalog, Realtime sin filtrar por restaurante, duplicación de ramas de rol, `App.tsx` monolítico — seguir diferidos a un ciclo dedicado de refactor. Considerar extraer la lógica de sincronización entre pestañas de `DailyChecklist` (~140 líneas, 4 refs) a un hook reutilizable (`useCrossTabDraft`) dado que es ya la segunda implementación de este patrón en el repo y cada campo protegido nuevo requiere plomería manual repetida — el propio hallazgo H1 es evidencia directa de que ese patrón manual no escala de forma segura.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` contienen ahora **15 pares completos** (14 del ciclo anterior + `cross-tab-sync-guardian`, creado en respuesta a la auditoría de `21a730d`). Se leyó el contenido completo de `cross-tab-sync-guardian/SKILL.md` y `.claude/agents/cross-tab-sync-guardian.md`: ambos son de alta calidad, específicos del incidente real (no genéricos), con una checklist de 6 ítems accionable y evidencia line-by-line del bug que los motivó.

**Evaluación de esta pasada: el gap que motivó la creación de esta skill (A6/A7) está genuinamente cerrado en sus 3 escenarios explícitos** — la skill cumplió su propósito. Pero H1/H2/H3 de esta misma pasada muestran que la skill, tal como está escrita hoy, **no habría atrapado los 3 hallazgos Altos nuevos**: su checklist (ítems 1–6) cubre "¿se sobrescribe un campo con foco activo?", "¿se trata `null` como señal?", "¿hay un guard contra el ciclo de reatribución?" — pero no pregunta explícitamente "¿**todos** los campos persistidos en el mismo objeto de estado compartido tienen la misma protección, o solo los que motivaron el incidente original?" (H1), ni "¿la comparación de frescura asume relojes sincronizados entre dispositivos?" (H2). Esto es el mismo patrón que ya motivó el refuerzo de `wcag-audit`/`i18n-parity-guardian`/`stateful-prop-transition-guardian` en ciclos anteriores: un checklist correcto pero con alcance más angosto que la clase de bug real.

**Se recomienda fortalecer `cross-tab-sync-guardian/SKILL.md` con 2 ítems nuevos** (no crear una skill nueva — el gap es de alcance de checklist, no de especialización sin cubrir):

| Ítem a añadir | Motivo (evidencia de esta pasada) |
|---|---|
| "Si el objeto de draft sincronizado tiene N campos, la protección de foco/versión debe enumerarse explícitamente para los N, no solo para los que motivaron el incidente original que creó esta skill — un campo nuevo añadido después (o ya presente pero no citado) hereda el mismo riesgo por defecto." | H1: `isUrgent`/`reviewedIds`/`showOrderPreview` en `DailyChecklist.tsx:277-280` quedaron sin la misma protección que `readings`/`note` sí recibieron, pese a estar en el mismo objeto de draft y el mismo listener. |
| "Si la señal de frescura es un timestamp (`savedAt`/`Date.now()`), verificar explícitamente si se compara entre relojes de dispositivos distintos sin compensación de desfase — un timestamp por sí solo no es un identificador de orden causal fiable entre dispositivos." | H2: `lastKnownSavedAtRef` compara `Date.now()` de un dispositivo contra otro sin ningún mecanismo de reloj lógico; un desfase real entre dos tablets de cocina descarta ediciones genuinas en silencio y de forma permanente. |

No se identificó ningún otro gap de especialización nuevo. H3 (guard de montaje incompleto) es del alcance ya cubierto por `stateful-prop-transition-guardian` (transiciones de estado al montar/cambiar props identificadores) — no necesita una skill nueva, solo que se aplique con más rigor la próxima vez. H4 (pérdida de foco en RequestsList) es del alcance ya cubierto por `wcag-audit`/`mobile-ux-review` — el patrón "elemento con foco se desmonta al activarse" es genérico, no específico de este repo, y merece un ítem de checklist en `wcag-audit` ("verificar qué pasa con el foco cuando el elemento activado se desmonta o cambia de posición en el DOM tras su propia activación").

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios respecto a los ciclos anteriores: **Figma MCP**, **Chrome DevTools/Playwright MCP** (Playwright local ya disponible vía Bash — sería la forma más directa de reproducir en un navegador real los 3 escenarios de `DailyChecklist` con dos contextos de navegador simultáneos en vez de solo por trazado manual, tal como recomienda el propio ítem 6 de `cross-tab-sync-guardian`), **Vercel MCP**. Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx`. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`) | **PASA** — 0 coincidencias. |
| 3 | Cero colores hardcodeados (todo `var(--sf-*)`/`.sf-*`) | **PASA** — 0 hex fuera de `index.css` salvo el `<meta name="theme-color">` legítimo. |
| 4 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — sin cambios respecto al ciclo anterior, confirmado estructuralmente intacto. |
| 5 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — "+N más" (B6, ~24px), fila de tabla de AdminCatalog (~26px histórico), sobre el mínimo WCAG de 24px pero bajo el estándar propio de 44px. |
| 6 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — H4 (pérdida de foco), M8 (label huérfano), M9 (aria-pressed mal aplicado en 2 sitios), M7 (nombres accesibles no distinguibles); los fixes A8/A9/A10/A11/M3/M5 de este ciclo se mantienen genuinamente cerrados en su alcance original. |
| 7 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — B9 (Dashboard sin variante responsive de grid, sin cambios). |
| 8 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — H1/H2/H3 (huecos adyacentes en la sincronización de `DailyChecklist`, ninguno reproduce los 3 escenarios ya cerrados); M2 (tema forzado tras logout sin documentar); M10 (regresión menor del input de stock); M11 (pérdida de datos propios sin confirmar); los 2 Críticos históricos y los 3 escenarios explícitos de A6/A7 siguen genuinamente cerrados. |
| 9 | i18n ES/EN mismas claves | **PASA** — 421/421 claves en ambos locales, sin huecos (verificado por extracción programática dos veces). |
| 10 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal 314.34 kB (87.78 kB gzip), sin aviso de tamaño de Vite. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `21a730d` (VEREDICTO: CON HALLAZGOS, 5 Altos nuevos + 2 regresiones de `DailyChecklist`). Desde entonces aterrizaron 12 commits correctores (`b01b9bf..27766c8`) que, con evidencia real verificada de forma independiente en esta pasada — trazado evento por evento, no solo lectura de diff — cerraron genuinamente: los 7 Altos en su escenario literal (incluida, por primera vez en tres ciclos, una corrección real en la raíz del bug de sincronización entre pestañas de `DailyChecklist`, no un parche que solo pasa la prueba que se ejecutó), los 10 Medios completos, y una selección de Bajos. La puntuación promedio subió de 7.05/10 a 7.35/10 — mejora real, no plana, la primera vez que este ciclo de auditoría continua registra un avance neto en vez de un empate.

Pero el patrón de fondo persiste: 2 hallazgos Altos nuevos fuera de `DailyChecklist` (H4 en RequestsList) y, dentro del propio `DailyChecklist`, 2 hallazgos Altos que son huecos *adyacentes* al trabajo genuinamente cerrado (H1: campos no incluidos en la protección de A6; H2: relojes de dispositivo no sincronizados en el mecanismo que hace posible A6/A7) más una tercera variante de A1 (H3: la rama del condicional de montaje que el fix no cubrió). La lección concreta para el próximo ciclo, ya reflejada en la sección (f): un fix de sincronización entre pestañas que protege algunos campos de un objeto de estado compartido necesita, como parte de su propia definición de "hecho", una lista explícita de *todos* los campos de ese objeto y una confirmación de cuáles quedan protegidos y cuáles no — no solo los campos que motivaron el incidente original.

Se recomienda fortalecer (no crear) `cross-tab-sync-guardian` con 2 ítems de checklist nuevos (cobertura completa de campos del draft; relojes no sincronizados entre dispositivos) — ver (f) para el detalle.
