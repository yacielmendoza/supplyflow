# Auditoría — rediseno-ui-mobile (SupplyFlow V2)

**Fecha:** 2026-08-05 23:31 UTC (pasada automatizada del ciclo de mejora continua)
**Commit auditado:** `758e5d8` (HEAD de `rediseno-ui-mobile` al momento de esta pasada)
**Alcance:** las 10 pantallas del encargo (LoginScreen, Dashboard, RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView, ShoppingView, Header, BottomNav) + ViewHeader, `App.tsx` (routing/wiring/sesión/tema/idioma), `public/sw.js`, sistema de tokens (`src/index.css`), i18n, compilación, y las skills/subagentes en `.claude/`.

**Metodología:** desde el informe anterior (auditado sobre `9118b61`, VEREDICTO: CON HALLAZGOS, 5 Altos + 15 Medios + 23 Bajos) aterrizaron 7 commits correctores (`035b199..96481e2`) que `CORRECCIONES_APLICADAS.md` dice cerraron los 5 Altos (H1–H5) y 9 de los 15 Medios. Esta pasada **no da por buena ninguna de esas afirmaciones por el mensaje del commit ni por el propio `CORRECCIONES_APLICADAS.md`**: se releyó el código real contra `HEAD` con 4 sub-auditorías delegadas en paralelo, cada una con instrucciones explícitas de verificar cada claim línea por línea contra el código actual, trazar manualmente secuencias de eventos, y cazar activamente huecos adyacentes a la misma clase de bug reportada:

1. **Shell** (LoginScreen, Header, BottomNav, ViewHeader, `App.tsx` routing/sesión/tema/idioma) — verificación de M11/B3/M1/M12/B4, re-verificación de los 2 Críticos históricos.
2. **Dashboard + RequestsList + wiring de notificaciones** — verificación de H4 (deep-link con scroll), incluyendo el disparador real (push del sistema operativo vía `public/sw.js`), no solo el efecto de scroll en sí.
3. **DailyChecklist en profundidad** — reconstrucción manual, evento por evento, de H1 (recencia de `readings`), H2 (colisión de `seq`) y H3 (banner dividido), con foco especial porque este archivo lleva ya **cinco** ciclos consecutivos con hallazgos de sincronización entre pestañas.
4. **AdminCatalog + AccountView + NotificationsView + ShoppingView** — verificación de M3–M7, B12, B13, B15–B19.

Además, el agente auditor ejecutó de forma independiente `tsc`/`build` propios, una extracción programática de paridad i18n, y greps propios de clases dark-only/hex hardcodeado/`fixed inset-0`.

## VEREDICTO: CON HALLAZGOS

Los 5 Altos y 9 de los 15 Medios reclamados por el ciclo corrector están, en su gran mayoría, **genuinamente resueltos para el escenario literal que cada uno describe**, verificados evento por evento: H1 (`readings` de `DailyChecklist` ahora tiene protección por ventana de recencia por-producto, no solo por foco — el escenario exacto de "editar y pasar al siguiente producto" ya no pierde el dato), H2 (`writerId` + desempate determinista resuelve genuinamente el split-brain de `seq`, sin ambigüedad sobre quién gana), M11 (código muerto de `LoginScreen` retirado con razonamiento correcto, sin regresión de UX), B3/M1/M12/B4 (jerarquía semántica, etiqueta de traducción, enlace ARIA y cierre de popover en `Header`, todos cerrados sin fisuras), H5/M2/M6/M7/B5/B18 de `AccountView` (salvo un matiz serio, ver abajo), M3/M4/M5/B13/B16/B17 de `AdminCatalog` (salvo dos matices), B19 de `NotificationsView`, y M2/B12 de `ShoppingView`. Los 2 Críticos históricos (Rules of Hooks en `App.tsx`; `key` de restaurante en `DailyChecklist`) se re-verificaron línea por línea de forma independiente en dos sub-auditorías distintas: sin regresión.

Pero — **el patrón de "cuanto más a fondo se audita, más aparece" que ya definió los cuatro ciclos anteriores se repite una quinta vez, y esta vez con un giro más serio: al menos tres de los propios fixes de este ciclo introdujeron un problema nuevo, en algún caso objetivamente peor que el que reemplazaron.**

El hallazgo de mayor riesgo de negocio de todo este historial de auditorías está en `DailyChecklist`: el mecanismo que cierra H1/M13 (proteger `readings` con una ventana de recencia + debouncing de 400ms) puede dejar, tras aceptar un merge remoto, un temporizador de persistencia ya armado con una foto de estado *anterior* al merge — cuando ese temporizador dispara, **sobrescribe en disco, en silencio y sin ningún aviso, la edición de un compañero que el propio merge en memoria acababa de aceptar correctamente**. Es un bug de la misma familia que H1/H2 del ciclo anterior (pérdida de datos operativos de stock por una carrera entre pestañas), pero estructuralmente peor: el sistema *aparenta* haber fusionado bien en memoria mientras revierte el resultado en el almacenamiento persistente, sin ninguna forma de que la UI lo detecte. Además, el campo `notes` del mismo borrador **nunca recibió la protección de recencia que sí se le dio a `readings` en este mismo ciclo** — quedó exactamente en el estado "solo protegido por foco" que motivó H1 originalmente, así que basta cerrar el cajón de nota (acción normal del flujo) para perder la protección. Y el banner "Descartar" (dividido este ciclo en `staleDraftOwner`/`liveCoEditor` para cerrar el H3 anterior) sigue siendo pulsable durante la ventana exacta en la que `liveCoEditor` está activo, porque el aviso informativo se oculta cuando `staleDraftOwner` también lo está pero el botón destructivo no depende de `liveCoEditor` en absoluto — el escenario que H3 debía prevenir (borrar el trabajo en vivo de un compañero) sigue siendo alcanzable, solo que ahora requiere una secuencia de eventos más específica.

Fuera de `DailyChecklist`, aparecieron **cinco Altos nuevos independientes**, cada uno un fix real pero más angosto que la clase de bug completa: (1) el "deep-link desde notificación" de `RequestsList` (H4 del ciclo anterior) nunca cubre una notificación push real del sistema operativo — el service worker ignora el `requestId` adjunto y `showLocalNotification` ni siquiera lo adjunta, así que el mecanismo de expand+scroll solo sirve para navegación in-app; (2) el propio auto-clear de 5s del resaltado compite en una condición de carrera real con la carga diferida (`React.lazy`) de `RequestsList` en redes lentas; (3) el manejo de error de guardado de perfil de `AccountView` (M6) es código muerto en producción porque las funciones de persistencia que envuelve ya tragan sus propias excepciones — "Guardado ✓" se muestra incluso cuando `localStorage` falla por cuota excedida; (4) el fix del guardado duplicado de nota de `ShoppingView` (B15) no cubre iOS Safari, la plataforma principal de esta PWA, porque WebKit no mueve el foco a un `<button>` al tocarlo; (5) `handleDeleteClick` de `AdminCatalog` es la única de las 4 mutaciones async del archivo sin ningún manejo de error, rompiendo la paridad que el propio M5 de este ciclo estableció para sus 3 hermanas.

Compilación limpia, cero modales, cero clases dark-only, cero colores hardcodeados fuera de tokens, fallback público de Supabase intacto (sin cambios en `src/lib/supabase.ts` este ciclo), i18n en paridad 429/429.

**Nota sobre comparabilidad de puntuaciones:** como en la pasada anterior, cada sub-auditoría puntuó como juez duro y exigente contra el mismo listón de siempre. El promedio de esta pasada (6.35/10) es apenas superior al de la pasada anterior (6.2/10) pese a que 8 hallazgos Altos nuevos aparecieron — la combinación de "muchos hallazgos genuinamente cerrados" y "nuevos gaps adyacentes de severidad comparable" explica por qué el promedio se mueve poco en vez de subir con fuerza: `DailyChecklist` bajó de 5/10 a 4/10 (el peor resultado de todo el historial de este archivo) mientras el resto del lote subió ligeramente.

---

## (b) Estado de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
vite v6.4.3 building for production...
✓ 2137 modules transformed.
dist/index.html                              1.31 kB │ gzip:  0.61 kB
dist/assets/index-Cxx_-grH.css              32.23 kB │ gzip:  6.95 kB
... (13 chunks lazy-loaded por pantalla, todos <27 kB)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-DHhqmitZ.js              315.64 kB │ gzip: 88.11 kB
✓ built in 4.65s
dist/server.cjs 78.2kb / dist/server.cjs.map 126.6kb — Done in 10ms
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk. Chunk principal 315.64 kB (88.11 kB gzip), variación mínima respecto al ciclo anterior.
- **i18n:** `src/lib/translations.ts` → **429/429 claves** en `es` y `en` (verificado por extracción programática propia, 0 huecos en cualquier dirección).
- **Diseño de tokens:** grep propio de `bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`/`fixed inset-0`/hex hardcodeado sobre los 10 componentes + `App.tsx` + `public/sw.js` + `index.css`: **0 coincidencias reales** (el único hex fuera de `index.css` sigue siendo el `<meta name="theme-color">` de `App.tsx:656`, legítimo; las cadenas `#125` en `translations.ts:444,913` son números de solicitud de ejemplo, no colores).
- **Working tree:** se revirtió el mismo diff incidental de `package-lock.json` generado por `npm install` en este entorno (cambios de flag `"peer": true` por versión de npm del entorno, sin relación con el código auditado — mismo patrón documentado en todos los ciclos anteriores).

---

## (c) Puntuación por pantalla vs. benchmark premium (Apple Wallet/Music, Google Photos/Maps, Stripe, Airbnb, Linear, Notion, Revolut, Spotify, Slack, Arc, Superhuman)

| Pantalla/Componente | Puntuación | Qué falta para llegar a 10 |
|---|---|---|
| LoginScreen | **7/10** | Jerarquía semántica correcta (B3 cerrado), código muerto de carga retirado con razonamiento sólido (M11 cerrado), sin regresión de UX. Falta: biometría/passkey o recordar-último-perfil; sin haptics en la selección; transición hacia el dashboard es un corte duro de unmount/mount en vez de una transición de elemento compartido. |
| Header | **7.5/10** | Listbox APG completo y sólido (M12/B4 cerrados). Nuevo: fallback de nombre de restaurante vacío si los datos aún no cargaron (`Header.tsx:42` no comparte el fallback defensivo de `App.tsx`); sin type-ahead; badge de notificaciones sin micro-animación; opciones del listbox bajo 44px (~40px); contribuye (junto con `App.tsx`/`ViewHeader`) al hallazgo de pérdida de foco al navegar a pantallas de página completa. |
| BottomNav | **7/10** | Sin cambios este ciclo (fuera de alcance de las claims), sin regresión. `safe-area`, 44px y `aria-current` correctos. Falta: indicador activo animado tipo píldora (Apple Music/Airbnb) pese a que `motion` ya está instalado y en uso en otros 2 componentes; sin tick háptico. |
| Dashboard | **6/10** | Sin cambios este ciclo (confirmado por diff vacío). Stat tiles sin affordance táctil pese a representar datos filtrables; cero `aria-live`; `grid-cols-2` fijo sin responsive; sin `React.memo`; sin indicador de tendencia/delta. |
| RequestsList | **6.5/10** | H4 es un fix real y bien razonado (doble rAF documentado en el propio código), pero **no cubre el disparador real que motivó el hallazgo**: una notificación push del sistema operativo nunca invoca este código (ver H4 nuevo abajo) — solo funciona para navegación in-app. Centrado de scroll impreciso durante los primeros ~190ms de la animación de expansión. Condición de carrera nueva entre el auto-clear de 5s y la carga diferida del propio componente. Persisten sin cambios: cero `aria-live`, sin virtualización, sin `React.memo`, grupo de filtro sin `role="group"`, "Comprada"/"Entregada" comparten color token. |
| DailyChecklist | **4/10** (bajó desde 5/10) | Quinto ciclo consecutivo auditando este archivo. H1/H2 se confirmaron genuinamente cerrados para sus escenarios literales tras un trazado evento por evento — pero **el propio mecanismo que los cierra introdujo un bug nuevo, objetivamente peor**: un temporizador de persistencia huérfano puede revertir en disco, en silencio, la edición de un compañero justo después de que el merge en memoria la había aceptado correctamente. `notes` se quedó sin la protección de recencia que sí recibió `readings` este mismo ciclo. El banner "Descartar" (H3) sigue siendo pulsable durante la ventana de co-edición en vivo que se suponía debía proteger. Componente de 1010 líneas (852→1010, la lógica de sync **creció**, no se extrajo al hook recomendado hace 2 ciclos), sin virtualización de la grilla de productos. |
| AdminCatalog | **5.5/10** | M3/M4/M5/B13/B16(parcial)/B17(parcial) genuinamente cerrados: confirmación de dos toques en ambas superficies, guards de doble-envío reales, jerarquía de encabezados correcta. Pero: `handleDeleteClick` es la única de las 4 mutaciones async del archivo sin manejo de error; `saveError` no se limpia al cancelar/cambiar de fila editada; 7 sitios con `as any` residual; objetivos táctiles bajo 44px en la tabla de escritorio y varios controles de cabecera; formulario triplicado y doble montaje simultáneo (mobile-cards + desktop-table) sin cambios. |
| AccountView | **7/10** | H5/M7/B5/B18 genuinamente cerrados: `aria-current` correcto, fallback real de avatar preestablecido, `avatarError` como estado propio, no-op real al reseleccionar cuenta activa. Pero: el fix de M6 (manejo de error de guardado) es **código muerto en producción** — las funciones de persistencia que envuelve ya tragan sus propias excepciones, así que "Guardado ✓" se muestra incluso si `localStorage` falla por cuota excedida. Sin landmark `<main>` (B23). |
| NotificationsView | **7/10** | B19 cerrado sin regresión (subsecciones con `<h2>` semántico). Falta: `handleEnablePush` async sin estado de carga/disabled; sin landmark `<main>`; "Marcar todas como leídas" sin ventana de deshacer. |
| ShoppingView | **6/10** | M2/B12 genuinamente cerrados (chips con `aria-current`, Escape revierte al valor previo). Pero el fix de B15 (guardado duplicado de nota) **no cubre iOS Safari** — la plataforma móvil principal de esta PWA — porque WebKit no mueve el foco a un `<button>` al tocarlo, así que el guard basado en `relatedTarget` falla exactamente ahí. `handleCheck`/`handleSaveNote` sin guard de doble-envío (a diferencia de `handleFinish`, que sí lo tiene). Sin `useMemo` en `suppliers`/`filteredItems`. |

**Promedio (10 pantallas del encargo): 6.35/10** (vs. 6.2/10 del ciclo anterior). El movimiento pequeño esconde una historia más seria que el número sugiere: `DailyChecklist` — el archivo de mayor riesgo operativo real de la app — bajó a su peor puntuación registrada (4/10), mientras el resto del lote mejora ligeramente. No debe leerse como "el ciclo corrector no funcionó": la mayoría de los fixes son genuinos y verificados evento por evento; el problema es que 8 de ellos, al cerrar el escenario reportado con precisión, dejaron sin cubrir el escenario adyacente — o, en el caso más grave de `DailyChecklist`, el propio mecanismo del fix creó una vía nueva hacia el mismo síntoma (pérdida silenciosa de datos compartidos).

---

## (d) Hallazgos por severidad

### 🔴 Crítico

Ninguno. Los 2 Críticos históricos (`App.tsx` Rules of Hooks; `DailyChecklist` sin `key` de restaurante) se re-verificaron de forma independiente en dos sub-auditorías distintas: todos los hooks de `App.tsx` están declarados antes del primer `return` condicional (`App.tsx:671`, enumerados uno por uno hasta la línea 823 sin excepciones en ninguna rama), `<DailyChecklist key={selectedRestaurant.id}>` sigue presente en `App.tsx:771`, y los ~20 hooks de `DailyChecklist` están todos antes de su único `return` (`:618`). Sin regresión.

### 🟠 Alto

**H1 — `DailyChecklist`: el propio mecanismo que cierra H1/M13 de este ciclo (protección de recencia + debounce de persistencia) puede dejar un temporizador huérfano que revierte en disco, en silencio, la edición de un compañero — un bug nuevo, objetivamente peor que el que reemplaza.**
`DailyChecklist.tsx:376-397` (efecto de persistencia), `:402-406` (flush de unmount), `:445` (`applyingRemoteUpdateRef.current = true`). La guarda que evita re-disparar la persistencia durante la aplicación de un merge remoto salta el efecto **por completo**, sin cancelar ni reprogramar ningún temporizador ya armado. Secuencia: Tab A edita P3 (arma un temporizador con una foto del estado en `t=0`, a disparar en `t=400`); a `t=100` llega un merge remoto de Tab B que se acepta correctamente en memoria (P3 de A se preserva por la ventana de recencia, el resto se actualiza con lo de B); a `t=400` el temporizador de A dispara igual, con la foto vieja de `t=0` — que no incluye la edición de B — sobrescribiendo en disco el trabajo de B sin ningún aviso. Si B no vuelve a tocar esos campos, su edición se pierde para siempre, propagándose además vía `storage` a la propia pestaña de B con un `seq` más alto (indistinguible de una escritura legítima más reciente).
**Recomendación:** cuando `applyingRemoteUpdateRef` esté activo, no limitarse a saltar el efecto — cancelar explícitamente `persistTimeoutRef`/`pendingPersistRef` o reprogramar el temporizador con el estado *post-merge* real, nunca dejar sobrevivir un temporizador armado con una foto anterior al merge.

**H2 — `DailyChecklist`: el campo `notes` nunca recibió la misma protección de ventana de recencia que `readings` sí recibió este ciclo — se quedó exactamente en el estado "solo protegido por foco" que motivó H1 del ciclo anterior.**
`DailyChecklist.tsx:256-259` (`recentLocalChangeRef` solo cubre `isUrgent`/`reviewedIds`, no `notes`), `:472` (`setNotes` solo comprueba `document.activeElement === noteFieldRef.current`). Escenario: el usuario escribe una nota y cierra el cajón (Escape o botón "Ocultar") — el `<textarea>` se desmonta, así que `document.activeElement` ya no puede ser ese nodo bajo ninguna circunstancia; una actualización remota que llegue después, sin límite de tiempo, sobrescribe la nota recién escrita de inmediato y sin aviso.
**Recomendación:** añadir `notes` al mapa de recencia (poblado en el `onChange` del textarea) y comprobar `focus || recencia` en `:472`, igual que se hizo para `readings`.

**H3 — `DailyChecklist`: el banner "Descartar" sigue siendo pulsable durante la ventana exacta en la que `liveCoEditor` está activo — el escenario que H3 del ciclo anterior debía prevenir sigue siendo alcanzable.**
`DailyChecklist.tsx:661,674-676,686` — el aviso informativo de `liveCoEditor` solo se renderiza si `!staleDraftOwner` (`:686`), pero el botón "Descartar" (`:674-676`, dentro del bloque de `staleDraftOwner`, línea `:661`) no depende de `liveCoEditor` en absoluto. Escenario: Tab A ve el banner de borrador obsoleto de B al montar (`staleDraftOwner` activo); B reabre su pestaña y empieza a editar en vivo; la escritura de B llega y actualiza `liveCoEditor` en A, pero el aviso queda oculto por la condición `&& !staleDraftOwner`; A, sin ninguna señal de que B está editando ahora mismo, pulsa "Descartar" (sigue activo) → se borra el borrador compartido completo, incluyendo el trabajo en vivo de B.
**Recomendación:** deshabilitar u ocultar el botón "Descartar" (o exigir una confirmación adicional) cuando `liveCoEditor` esté activo, con independencia de `staleDraftOwner`.

**H4 — `RequestsList`/`App.tsx`/`public/sw.js`: el "deep-link desde notificación" nunca cubre una notificación push real del sistema operativo — el fix de H4 del ciclo anterior solo funciona para navegación in-app.**
`public/sw.js:70-80` (`notificationclick`) ignora por completo `event.notification.data.requestId` — solo hace `clients.matchAll(...).focus()`/`openWindow('/')`, sin `postMessage` ni `requestId`. Peor: `showLocalNotification` (`src/lib/notifications.ts:96-119`), que dispara casi todas las notificaciones reales de la app (nueva solicitud, atrasada), **ni siquiera adjunta `data: { requestId }`**. El único disparador que sí llega a `handleSelectRequestFromNotification` (`App.tsx:149-165`) es el clic sobre un ítem de la bandeja in-app (`NotificationsView.tsx:247`) o sobre "Actividad reciente" del Dashboard (`Dashboard.tsx:183`) — navegación síncrona dentro de la misma pestaña ya abierta, no una notificación push real tocada con la app en segundo plano.
**Recomendación:** en `sw.js:70-80`, leer `event.notification.data?.requestId` y usar `client.postMessage({ type: 'OPEN_REQUEST', requestId })` sobre el cliente enfocado (o `clients.openWindow('/?requestId=...')` si no hay ventana abierta); adjuntar `data: { requestId }` en `showLocalNotification`; escuchar el mensaje en `App.tsx` para invocar `handleSelectRequestFromNotification`.

**H5 — `RequestsList`/`App.tsx`: condición de carrera nueva entre el auto-clear de 5s del resaltado y la carga diferida (`React.lazy`) del propio componente.**
El temporizador de 5s que limpia `highlightedRequestId` arranca en `App.tsx:161-164` en el mismo tick que se dispara la navegación, no cuando la tarjeta realmente se resalta en pantalla. `RequestsList` se importa vía `React.lazy` (`App.tsx:39`) y solo se monta si `activeTab === 'REQUESTS'`. En la primera visita de la sesión a esa pestaña, sobre una red lenta (3G, el contexto real de una cocina/food-truck), la descarga del chunk puede competir con los 5000ms del timeout — si tarda más, `highlightedRequestId` ya es `null` cuando el componente monta, y la notificación queda "perdida" sin ningún error visible.
**Recomendación:** desacoplar el auto-clear del tap — arrancarlo solo tras confirmar que `RequestsList` montó y completó el scroll (callback `onHighlightSettled`), no con un timer de reloj de pared iniciado antes de que el destino exista.

**H6 — `AccountView`: el fix de M6 (manejo de error de guardado de perfil) es código muerto en producción — las funciones de persistencia que envuelve ya tragan sus propias excepciones.**
`AccountView.tsx:90-100` — el `try/catch` alrededor de `onSaveProfile` es correcto en su propio flujo de control, pero `onSaveProfile` = `handleSaveProfile` (`App.tsx:139-146`), que delega en `persistJSON`/`safeSetItem` (`App.tsx:79-93`) — **ambas ya atrapan internamente cualquier excepción de `localStorage.setItem`**. Resultado: si la cuota de almacenamiento está llena (frecuente en Safari privado o cerca del límite de una PWA), la excepción nunca llega al `catch` de `AccountView`, `setSavedFlash(true)` se dispara igual, y el usuario ve "Guardado ✓" mientras el perfil no se persistió — se pierde en el siguiente reinicio sin ningún aviso previo.
**Recomendación:** `persistJSON`/`safeSetItem` deben devolver un booleano de éxito (o relanzar) para que el `try/catch` de `AccountView` tenga algo real que atrapar.

**H7 — `ShoppingView`: el fix de B15 (guardado duplicado de nota) no cubre iOS Safari, la plataforma móvil principal de esta PWA.**
`ShoppingView.tsx:244-267` — el guard compara `e.relatedTarget` contra el botón "Guardar" para evitar que `blur` dispare `handleSaveNote` cuando el propio clic en "Guardar" ya lo hará. Pero **WebKit/iOS Safari no mueve el foco a un `<button>` al tocarlo** (comportamiento histórico, salvo "Full Keyboard Access" activado) — en un iPhone, `relatedTarget` es `null`, el guard falla, `handleSaveNote` se dispara por el `blur`, y el `click` del mismo botón (sigue montado hasta después del `await`) lo dispara una segunda vez: dos requests concurrentes con el mismo contenido.
**Recomendación:** usar el mismo patrón de guard `isSaving`/`disabled` ya existente en `AdminCatalog`, o cancelar el guardado por blur con `pointerdown`/`mousedown` en el botón en vez de depender de `relatedTarget`.

**H8 — `AdminCatalog`: `handleDeleteClick` es la única de las 4 mutaciones async del archivo sin ningún manejo de error, rompiendo la paridad que el propio M5 de este ciclo estableció para sus 3 hermanas.**
`AdminCatalog.tsx:157-168` — `onDeleteProduct(id)` se llama sin `await`, sin `.catch()`, sin guard de "en curso". Si la red falla, la promesa rechazada queda sin manejar, no aparece ningún banner de error, el producto sigue en la lista sin explicación, y la confirmación de dos toques ya se reseteó — el usuario no tiene ninguna señal de que el borrado falló.
**Recomendación:** aplicar el mismo patrón `isDeleting`/`saveError` escopado que ya usan `handleSaveEdit`/`handleCreateProductSubmit`/`handleCreateRestaurantSubmit`.

### 🟡 Medio

**M1 — `RequestsList`: el centrado del scroll del fix de H4 es impreciso durante los primeros ~190ms de la animación de expansión.** `RequestsList.tsx:72-86` — el doble `requestAnimationFrame` cubre ~2 frames (~32ms) de una transición `motion` de 220ms (`:343`); `scrollIntoView({block:'center'})` mide la posición con la tarjeta todavía casi colapsada, así que el centrado real se desplaza hacia abajo mientras la animación continúa después del scroll.

**M2 — `Header`/`App.tsx`/`ViewHeader`: pérdida total de foco al navegar entre el shell principal y las pantallas de página completa (Cuenta/Notificaciones), en ambas direcciones.** `App.tsx:701-738` monta/desmonta `Header`+`main`+`BottomNav` vs. `ViewHeader`+vista en ramas mutuamente excluyentes; grep de `focus`/`autoFocus` en los 4 archivos involucrados: cero resultados. El elemento que disparó la navegación se desmonta sin que nada mueva el foco al `<h1>`/botón "Atrás" de destino; un usuario de lector de pantalla no recibe ningún anuncio de que la navegación ocurrió.

**M3 — `AdminCatalog`: `saveError` no se limpia al cancelar una edición o cambiar de fila editada.** `AdminCatalog.tsx:76-79,300,394` — el banner de error de un producto A permanece visible tras cancelar o pasar a editar el producto B, sin relación con la acción actual.

**M4 — `ShoppingView`: `handleCheck`/`handleSaveNote` sin guard de doble-envío, a diferencia de `handleFinish` en el mismo archivo.** `ShoppingView.tsx:67-72,176-182` — un doble-toque rápido en el checkbox de un ítem puede enviar dos `onToggleItem` con el mismo valor calculado del mismo closure obsoleto, con resolución fuera de orden posible.

**M5 — `NotificationsView`: `handleEnablePush` async sin `disabled` durante el `await`.** `NotificationsView.tsx:337` — inconsistente con el patrón ya aplicado este mismo ciclo en los 3 handlers de `AdminCatalog`.

**M6 — `AdminCatalog`: objetivos táctiles por debajo de 44px en la tabla de escritorio y varios controles de cabecera, inconsistente con el resto de la app.** `AdminCatalog.tsx:202,219,226,229,393,394,398,401,423` — mientras las tarjetas móviles usan `w-11 h-11` (44px), la fila de tabla (`p-1.5`/`w-3.5 h-3.5`, ~26px) y varios controles de cabecera (`py-1.5`/`py-2`) no alcanzan el mínimo que `AccountView`/`NotificationsView`/`ShoppingView` sí aplican de forma consistente.

**M7 — `DailyChecklist`: el texto del indicador de co-edición promete una garantía que el código no cumple.** `translations.ts:232,701` (`checklistLiveCoEditorSuffix`: "Los cambios se combinan automáticamente"/"Changes merge automatically") — dado H1 nuevo (el merge en memoria puede no llegar nunca a disco), este texto le promete al usuario una convergencia que el sistema no garantiza en el caso de colisión de temporizadores.

**M8 — Dashboard/RequestsList: cero `aria-live` para valores que cambian por Realtime sin interacción del usuario.** (histórico, confirmado sin cambios) — stat tiles (`Dashboard.tsx:151-153`), barra de progreso y contadores (`RequestsList.tsx:284-300`): 0 ocurrencias de `aria-live`/`role="status"` en ambos archivos, a diferencia de los otros 8 componentes de la app.

**M9 — `RequestsList`: sin virtualización del feed, agravado por un re-render completo cada minuto.** (histórico, confirmado sin cambios) — `nowTick` (`RequestsList.tsx:119-123`) fuerza un re-render de todas las tarjetas visibles cada 60s.

**M10 — Ni `Dashboard` ni `RequestsList` están envueltos en `React.memo`**, a diferencia de `BottomNav`/`Header`. (histórico, sin cambios).

### 🟢 Bajo

**B1 (histórico, sin cambios) — `App.tsx`: listener de `beforeinstallprompt` sin `removeEventListener` en el cleanup.** `App.tsx:239-242`.

**B2 (histórico, sin cambios) — `App.tsx`: sin sincronización de sesión entre pestañas.**

**B3 — `Header.tsx:42`: no comparte el mismo fallback defensivo que `App.tsx` para el caso de `restaurants` vacío.** `App.tsx:291-301` calcula `selectedRestaurant` con un objeto de respaldo si el array está vacío, pero ese fallback no se pasa a `Header`, que recalcula `restaurants.find(...) || restaurants[0]` (puede ser `undefined`). Riesgo hoy latente/imperceptible porque `fetchRestaurants()` es síncrono sobre datos locales (`lib/api.ts:7-13`); se volvería visible (selector con nombre en blanco) el día que esa función pase a ser una llamada de red real.

**B4 — Clave i18n muerta `tabSettings`.** `translations.ts:45,514` — ya no la referencia ningún archivo del repo tras el fix de M1; limpieza pendiente, cero riesgo funcional.

**B5 — Inconsistencia de motor de animación entre el shell y el resto de la app.** `motion` (v12, `package.json:21`) está en uso real en `RequestsList`/`DailyChecklist`, pero `LoginScreen`/`Header`/`BottomNav`/`ViewHeader` implementan sus propias transiciones a mano vía `useState`+`requestAnimationFrame`+clases Tailwind — dos sistemas de animación coexistiendo para el mismo tipo de problema.

**B6 — Opciones del listbox de restaurantes bajo 44px (~40px).** `Header.tsx:172-191` — `px-3 py-2.5` con `text-sm` ronda ~40px, por debajo de los 44px que sí aplican el trigger, `BottomNav` y `LoginScreen`.

**B7 (histórico, sin cambios) — "Comprada" y "Entregada" comparten el mismo token de color.** `src/lib/colors.ts:20-21`, ambos `var(--sf-accent)`.

**B8 (histórico, sin cambios, línea desplazada) — `eslint-disable-next-line react-hooks/exhaustive-deps` en `RequestsList.tsx:112`** (desplazado desde ~91 por las líneas del efecto de scroll).

**B9 (histórico, sin cambios) — `grid-cols-2` fijo en Dashboard sin variante responsive.** `Dashboard.tsx:139`.

**B10 (histórico, sin cambios) — `ShoppingView`: `suppliers`/`filteredItems` sin `useMemo`.** `ShoppingView.tsx:51,53` — el archivo ni siquiera importa `useMemo`.

**B11 — `AdminCatalog`: 7 sitios con `as any` residual pese al fix de B17.** `AdminCatalog.tsx:230,260,266,367,374,446,525,531` — el tipo de la interfaz pública se corrigió (`Restaurant['type']`), pero el estado local (`newRestType`) y los `onChange` de selects de categoría/unidad/tipo siguen con `as any`.

**B12 — `ShoppingView`: Escape revierte al valor actual del servidor, no al valor de apertura del editor, si hay una actualización realtime concurrente.** `ShoppingView.tsx:236-242` — caso límite; el cierre del render captura `item` actual, no un snapshot al abrir.

**B13 (histórico, confirmado sin cambios) — `src/lib/colors.ts:5`, `color-mix()` sin fallback documentado.** Requiere Safari ≥16.2/Chrome ≥111/Firefox ≥113.

**B14 (histórico, confirmado, alcance ampliado) — Pantallas construidas sobre `ViewHeader` sin landmark `<main>`.** Trazado explícito contra `App.tsx:686-756`: **3 pantallas** (`AccountView`, `NotificationsView`, `ShoppingView`), no 2 como se documentó antes — las 3 se renderizan en ramas tempranas fuera del único `<main>` del árbol (que solo envuelve el layout de tabs con `AdminCatalog`).

**B15 (histórico, sin cambios) — `AdminCatalog`: formulario triplicado (alta inline/`EditCard`/fila de tabla, mismas 6 columnas 3 veces) y doble montaje simultáneo mobile-cards + desktop-table (solo oculto por CSS).**

**B16 (histórico, sin cambios) — Feedback táctil (`active:scale-95`) inconsistente entre controles del mismo archivo** en Dashboard/RequestsList.

**Diferidos, confirmados sin regresión (documentados en ciclos anteriores, no re-litigados en detalle):** canal Realtime de `App.tsx` sin filtrar por restaurante, 3 ramas de rol duplicadas en Dashboard/RequestsList, `App.tsx` monolítico, dos sistemas de animación distintos entre chrome y contenido (ver B5 arriba, ahora detallado).

---

## (e) Mejoras priorizadas para el ciclo corrector

1. **(Alto, prioridad máxima — riesgo real de pérdida de datos ajenos, peor que cualquier hallazgo anterior de este archivo)** H1 — corregir el temporizador huérfano de persistencia de `DailyChecklist`: cancelar/reprogramar explícitamente `persistTimeoutRef`/`pendingPersistRef` cuando se aplica un merge remoto, nunca dejar sobrevivir una foto de estado anterior al merge.
2. **(Alto, mismo patrón que H1 del ciclo anterior, campo distinto)** H2 — extender la ventana de recencia por-campo (ya usada para `readings`) al campo `notes` de `DailyChecklist`.
3. **(Alto)** H3 — acoplar el botón "Descartar" a la ausencia de `liveCoEditor`, no solo a `staleDraftOwner`.
4. **(Alto, requiere tocar el service worker)** H4 — adjuntar `requestId` en `showLocalNotification` y manejarlo en `notificationclick` de `sw.js` con `postMessage`/`openWindow`, y escuchar ese mensaje en `App.tsx`.
5. **(Alto)** H5 — desacoplar el auto-clear de 5s del resaltado de `RequestsList` del tap original; arrancarlo solo tras confirmar montaje+scroll.
6. **(Alto, una función compartida)** H6 — `persistJSON`/`safeSetItem` deben poder fallar de verdad hacia arriba (booleano de éxito o relanzar), para que el `try/catch` de `AccountView` (y cualquier otro consumidor futuro) tenga algo real que atrapar.
7. **(Alto)** H7 — corregir el guardado duplicado de nota de `ShoppingView` para iOS Safari (guard `isSaving`/`disabled` en vez de depender de `relatedTarget`).
8. **(Alto, un handler, patrón ya existente en el mismo archivo)** H8 — aplicar a `handleDeleteClick` de `AdminCatalog` el mismo patrón `isDeleting`/`saveError` que ya tienen sus 3 hermanas.
9. **(Medio, mismo patrón en 2 sitios)** M4/M5 — guard de doble-envío en `handleCheck`/`handleSaveNote` de `ShoppingView` y en `handleEnablePush` de `NotificationsView`.
10. **(Medio)** M2 — gestión de foco al navegar entre el shell y las pantallas de página completa (mover foco al `<h1>`/"Atrás" de destino tras cada transición).
11. **(Medio, una línea cada uno)** M3 (limpiar `saveError` al cancelar/cambiar de fila en `AdminCatalog`), M6 (unificar objetivos táctiles a 44px en la tabla de escritorio de `AdminCatalog`), M7 (revisar o suavizar la promesa de texto de `liveCoEditor` una vez cerrado H1).
12. **(Medio, requiere diseño, no una línea)** M1 (esperar `onAnimationComplete` de `motion` antes de medir el centrado del scroll en `RequestsList`), M8/M9 (`aria-live` + virtualización de `RequestsList`/`Dashboard`).
13. **(Bajo, en orden de esfuerzo/impacto)** B1–B16 — listener sin limpiar, fallback de restaurante vacío en `Header`, clave i18n muerta, objetivos táctiles del listbox, tipado `as any` residual, landmarks `<main>` (ahora 3 pantallas), etc.
14. **(Deuda de arquitectura mayor, quinta vez que se documenta, con evidencia cada vez más fuerte)** Extraer la lógica de sincronización entre pestañas de `DailyChecklist` (~475 líneas de sus 1010 totales, subió desde 852 líneas totales el ciclo pasado) a un hook reutilizable `useCrossTabDraft<T>` con protección derivada del tipo — H1/H2/H3 de este ciclo son la quinta instancia consecutiva de exactamente la clase de bug que esta extracción prevendría estructuralmente, y esta vez el fix ad-hoc introdujo un bug nuevo en el propio intento de cerrar los anteriores. Formulario triplicado de `AdminCatalog`, `App.tsx` monolítico: seguir diferidos a un ciclo dedicado de refactor.

---

## (f) Skills y subagentes: gaps a crear

`.claude/skills/` y `.claude/agents/` contienen **16 pares completos** (mobile-ux-review, design-system-guardian, wcag-audit, motion-microinteractions, design-token-architect, typography-color-system, visual-qa, frontend-architecture-review, i18n-parity-guardian, supabase-persistence-guardian, performance-budget-auditor, async-error-handling-guardian, react-hooks-invariant-guardian, stateful-prop-transition-guardian, cross-tab-sync-guardian, destructive-action-guardian). **Ningún hallazgo de esta pasada corresponde a una clase de bug sin cubrir por ninguna skill existente** — pero tres necesitan refuerzo real (dos de ellas, cuarta vez consecutiva), y no se justifica crear un skill nuevo esta vez: cada gap encontrado encaja en el alcance ya declarado de una skill existente, solo que con un ítem de checklist más específico que el que ya tienen.

**Reforzar `cross-tab-sync-guardian`** (cuarta vez — el patrón de fondo, "checklist correcto pero de alcance más angosto que la clase de bug real", se repite de nuevo):

| Ítem a añadir | Motivo (evidencia de esta pasada) |
|---|---|
| "Cuando un efecto de persistencia se salta por completo durante la aplicación de un merge remoto (una guarda tipo `applyingRemoteUpdateRef`), verificar explícitamente qué pasa con cualquier temporizador/debounce YA ARMADO antes de esa guarda — si el temporizador sigue vivo con una foto de estado anterior al merge, disparará más tarde y sobrescribirá el resultado del merge en el medio persistente (no solo en memoria). Saltar un efecto no es lo mismo que cancelar lo que ese efecto ya había programado." | H1 nuevo: el propio fix que protege `readings` con una ventana de recencia + debounce de 400ms dejó un temporizador huérfano que revierte en disco la edición de un compañero tras un merge remoto aceptado — un bug nuevo, peor que el original, introducido por el mecanismo que debía prevenirlo. |
| "Al cerrar un hallazgo sobre UN campo de un draft/objeto compartido (p. ej. `readings` recibe protección de recencia), enumerar explícitamente TODOS los demás campos del mismo tipo compartido antes de dar el ciclo por cerrado — no asumir que el resto ya está cubierto porque un ítem de checklist anterior lo mencionó en abstracto." | H2 nuevo: `notes` es estructuralmente idéntico a `readings` (campo continuo editado con blur para pasar al siguiente), pero se quedó sin la misma protección que sí se le dio a `readings` en este mismo ciclo — la tercera variante de "un campo se queda atrás" en 2 ciclos consecutivos. |

**Reforzar `destructive-action-guardian`** con un ítem sobre acoplamiento de condiciones:

| Ítem a añadir | Motivo |
|---|---|
| "Cuando se divide un estado de peligro único en dos (p. ej. 'borrador obsoleto' vs. 'co-edición en vivo'), verificar que la condición de visibilidad del AVISO informativo y la condición de habilitación del BOTÓN destructivo sean la misma o que la del botón sea un subconjunto estricto de la del aviso — nunca al revés. Leer ambas condiciones JSX una al lado de la otra, no evaluarlas por separado." | H3 nuevo: el fix de H3 del ciclo anterior divide correctamente `staleDraftOwner`/`liveCoEditor`, pero el botón "Descartar" solo depende de `staleDraftOwner` mientras el aviso que debería advertir sobre `liveCoEditor` se oculta precisamente cuando `staleDraftOwner` también está activo — dejando una ventana donde el botón sigue activo sin que su aviso correspondiente sea visible. |

**Reforzar `async-error-handling-guardian`** (segunda vez) con dos ítems:

| Ítem a añadir | Motivo |
|---|---|
| "Antes de dar por válido un `try/catch` como manejo de error real, trazar la cadena de llamadas completa de la función `await`-ada — si una función varias capas más abajo ya atrapa sus propias excepciones sin relanzarlas (p. ej. un wrapper de persistencia con su propio try/catch interno), el `catch` exterior es código muerto inalcanzable y el estado de 'éxito' de la UI es un falso positivo garantizado, no un caso raro." | H6 nuevo: `AccountView` envuelve `onSaveProfile` en try/catch (control de flujo correcto en sí mismo), pero `persistJSON`/`safeSetItem`, dos capas más abajo, ya tragan cualquier excepción de `localStorage.setItem` — el catch de `AccountView` nunca puede activarse en producción. |
| "Al añadir guards de doble-envío/manejo de error a N handlers async hermanos en el mismo archivo (guardar/crear/editar), grep por OTROS handlers async disparados del mismo modo (eliminar/alternar/activar) en el mismo componente antes de dar el hallazgo por cerrado — no limitar el fix a los handlers nombrados explícitamente en el reporte." | H8 nuevo: `handleSaveEdit`/`handleCreateProductSubmit`/`handleCreateRestaurantSubmit` de `AdminCatalog` recibieron guard de doble-envío y manejo de error este ciclo (M5), pero `handleDeleteClick` — la cuarta mutación async del mismo archivo, con el mismo patrón `onClick` disparando una promesa — se quedó sin ninguno de los dos. |

No se identifica ningún gap de especialización genuino nuevo esta pasada (a diferencia de la creación de `destructive-action-guardian` dos ciclos atrás): el hallazgo de iOS Safari (H7, WebKit no mueve el foco a `<button>` al tocar) es la primera instancia de esta clase concreta de bug en el repo — se recomienda vigilar si reaparece en un futuro ciclo antes de justificar un skill dedicado a quirks de WebKit/iOS Safari; por ahora se cubre añadiendo el caso a la sección de "guards basados en foco/blur" que `async-error-handling-guardian`/`cross-tab-sync-guardian` ya tratan en otros contextos.

### MCP recomendados (no instalables en este entorno headless — requieren auth interactiva)

Sin cambios de fondo respecto a los ciclos anteriores: **Figma MCP**, **Vercel MCP** (sin cambios en la justificación). Una actualización real este ciclo sobre **Chrome DevTools/Playwright MCP**: el hallazgo H7 (iOS Safari) es exactamente la clase de bug que Playwright local en este entorno (`/opt/pw-browsers/chromium`, solo Chromium) **no puede reproducir** — se recomienda que un ciclo futuro con acceso a un dispositivo real o un servicio de testing multi-navegador (BrowserStack/Sauce Labs, ambos requieren auth interactiva, no instalables aquí) verifique específicamente los guards basados en `relatedTarget`/foco-al-tocar en WebKit real. Ninguno es bloqueante para el ciclo corrector.

---

## (g) Checklist de estándares

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Cero modales (`fixed inset-0`/backdrop) | **PASA** — 0 hallazgos en las 10 pantallas + `App.tsx` + `sw.js`. |
| 2 | Cero clases dark-only hardcodeadas (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`) | **PASA** — 0 coincidencias. |
| 3 | Cero colores hardcodeados (todo `var(--sf-*)`/`.sf-*`) | **PASA** — 0 hex fuera de `index.css` salvo el `<meta name="theme-color">` legítimo. |
| 4 | `BottomNav` sin solaparse ni ocultar contenido (`env(safe-area-inset-bottom)`) | **PASA** — confirmado estructuralmente intacto, sin cambios. |
| 5 | Espaciado/tipografía/táctil/radios/sombras coherentes | **FALLA (parcial)** — objetivos táctiles bajo 44px en `AdminCatalog` (tabla de escritorio, M6) y en el listbox de `Header` (B6, nuevo). |
| 6 | Accesibilidad WCAG 2.2 AA | **FALLA (parcial)** — M2 (pérdida de foco al navegar entre pantallas de página completa, nuevo), M8 (cero `aria-live`), B14 (landmark `<main>` ausente en 3 pantallas, alcance ampliado); los fixes H5/M1/M12/B4/M7 de `AccountView`/`Header` de este ciclo se mantienen genuinamente cerrados. |
| 7 | Responsive móvil/tablet/desktop + safe areas iOS | **FALLA (parcial)** — B9 (Dashboard sin variante responsive de grid, sin cambios). |
| 8 | Funcionalidad (tabs, tema/idioma, campana, avatar, Modo Compra, CRUD, checklist, badges) | **FALLA (parcial)** — H1-H3 (riesgo de pérdida de datos en `DailyChecklist`, con un bug nuevo introducido por el propio fix de este ciclo), H4/H5 (deep-link de notificación push real sin cubrir + condición de carrera de carga diferida), H6 (falso-positivo de guardado en `AccountView`), H7 (guardado duplicado en iOS Safari), H8 (eliminar producto sin manejo de error); los 2 Críticos históricos y el escenario literal de H1/H2 del ciclo anterior siguen genuinamente cerrados. |
| 9 | i18n ES/EN mismas claves | **PASA** — 429/429 claves en ambos locales, sin huecos. |
| 10 | Compilación (`tsc --noEmit` y `npm run build`) | **PASA** — ambos sin errores; bundle principal 315.64 kB (88.11 kB gzip), sin aviso de tamaño de Vite. |

---

## Historial de ciclos cubiertos desde la última vez que se sobrescribió este archivo

Este archivo describía el estado de `9118b61` (VEREDICTO: CON HALLAZGOS, 5 Altos + 15 Medios + 23 Bajos). Desde entonces aterrizaron 7 commits correctores (`035b199..96481e2`) que, con evidencia real verificada de forma independiente en esta pasada — trazado evento por evento, no solo lectura de diff — cerraron genuinamente: los 5 Altos en su escenario literal exacto, y la gran mayoría de los Medios/Bajos priorizados. La puntuación promedio subió ligeramente de 6.2/10 a 6.35/10 — pero ese número casi plano esconde que `DailyChecklist` bajó a su peor puntuación de todo el historial (4/10), porque el propio mecanismo que cierra sus hallazgos históricos introdujo uno nuevo de mayor severidad de negocio (un temporizador de persistencia huérfano que revierte en disco el trabajo de un compañero, en silencio).

El patrón de fondo de los últimos 5 ciclos se confirma una vez más, y esta vez con un matiz adicional: no basta con verificar que un fix cierra el escenario reportado y que los campos "hermanos" ya conocidos también quedan protegidos — hace falta verificar además que **el propio mecanismo del fix no abra una vía nueva hacia el mismo síntoma** (un temporizador que sobrevive a la guarda que debía neutralizarlo). Se recomienda fortalecer `cross-tab-sync-guardian` (cuarta vez) con los 2 ítems de la sección (f) — uno de ellos, sobre temporizadores huérfanos tras una guarda de re-entrada, es un ítem genuinamente nuevo, no una repetición de refuerzos anteriores — fortalecer `destructive-action-guardian` con 1 ítem sobre acoplamiento de condiciones de aviso/botón, y fortalecer `async-error-handling-guardian` (segunda vez) con 2 ítems: rastrear la cadena de llamadas completa antes de confiar en un `try/catch`, y aplicar paridad de guards a TODOS los handlers async hermanos de un archivo, no solo a los nombrados en el hallazgo original.
