# Correcciones aplicadas — ciclo de mejora continua

## Estado de partida

`AUDITORIA_RESULTADOS.md` (auditado sobre `9118b61`, commit de cierre
`265a8ce`) reportó **VEREDICTO: CON HALLAZGOS**: 0 críticos, 5 altos
(H1–H5), 15 medios (M1–M15) y 23 bajos (B1–B23). Este ciclo resolvió los 5
Altos, 9 de los 15 Medios priorizados en la sección (e) del informe (M1–M7,
M11–M13), y 7 hallazgos Bajos de bajo esfuerzo/alto impacto encontrados de
paso en los mismos archivos (B3, B5, B12, B13, B15, B18, B19, B20 — 8 en
total). Quedan diferidos, sin cambio de prioridad respecto a lo que la
propia auditoría recomendó diferir: M8/M9 (`aria-live` + virtualización de
`RequestsList`/`Dashboard`, requieren diseño propio), M10 (`React.memo` en
`Dashboard`/`RequestsList`), M14/M15 parcialmente cubiertos (ver abajo), y
la deuda de arquitectura mayor (extracción de `useCrossTabDraft<T>`,
formulario triplicado de `AdminCatalog`, `App.tsx` monolítico).

## Método de trabajo de este ciclo

Dado el volumen de hallazgos repartidos en 8 archivos independientes, este
ciclo se ejecutó como 6 líneas de trabajo en paralelo (una por archivo o
grupo de archivos sin solapamiento), cada una con el texto literal del
hallazgo de la auditoría como especificación, más una corrección manual
directa (sin delegar) de `DailyChecklist.tsx` — el archivo de mayor riesgo,
con cuatro ciclos consecutivos de hallazgos de sincronización entre
pestañas — dado que sus fixes (H1–H3) tienen dependencias cruzadas reales
entre sí (el mismo `seq`/`writerId` que cierra H2 es también la señal que
H1 usa para decidir si acepta una escritura remota).

## Hallazgos resueltos

### 🟠 Alto

1. **H1 — `DailyChecklist`: `readings` (conteos de stock) sin la misma
   protección de recencia que `isUrgent`/`reviewedIds`/`showOrderPreview`.**
   Se añadió `recentReadingChangeRef`, un mapa `Record<productId, timestamp>`
   poblado en `handleStockChange` en cada edición local. El listener de
   `storage` ahora protege cada producto de `readings` si EITHER tiene el
   foco de DOM activo (protección existente) OR fue editado localmente
   dentro de la ventana de gracia de 4s (protección nueva) — cerrando
   exactamente la ventana entre `blur` (pasar al siguiente producto, el
   flujo normal de revisión) y que la escritura de persistencia (ahora
   además debounced, ver M13) llegue a completarse.

2. **H2 — el contador lógico `seq` no resolvía colisiones entre escritores
   concurrentes.** Se añadió `writerId` a `ChecklistDraft`: un id aleatorio
   generado una vez por pestaña abierta (`tabInstanceIdRef`, vía
   `crypto.randomUUID()` con fallback). La función `isWriteNewer` reemplaza
   la comparación estricta `incoming.seq <= lastKnownSeqRef.current` por un
   orden total: si `seq` coincide entre dos escrituras, el desempate es por
   `writerId` (comparación de string, determinista e idéntica en cualquier
   pestaña que observe ambas escrituras) — así el sistema converge en un
   único ganador en vez de que la segunda escritura se descarte en
   silencio y para siempre.

3. **H3 — el banner "Mantener la mía / Descartar" podía borrar el
   borrador compartido completo de un compañero editando en vivo.** Se
   separó el antiguo estado único `draftOwner` en dos estados
   independientes: `staleDraftOwner` (snapshot tomado una sola vez al
   montar, nunca actualizado después — sigue siendo el único que puede
   disparar `discardDraft`, seguro porque a esa altura nadie está editando
   activamente) y `liveCoEditor` (actualizado en vivo por el listener de
   `storage` cada vez que llega una escritura remota de otro usuario
   durante una sesión de edición en curso — sin ningún botón destructivo
   asociado, solo un indicador informativo con nuevas claves i18n
   `checklistLiveCoEditorPrefix`/`Suffix`).

4. **H4 — `RequestsList`: el deep-link desde notificaciones no hacía
   scroll hasta la tarjeta resaltada.** Se añadió un efecto que, tras
   expandir la tarjeta correspondiente a `highlightedRequestId`, espera al
   layout (doble `requestAnimationFrame`, ya que la expansión cambia la
   altura del contenido) y llama
   `scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'center' })`
   sobre el nodo `request-card-${id}` ya existente.

5. **H5 — `AccountView`: la lista "Cambiar usuario" sin indicación
   programática de la cuenta activa.** `aria-current={active ? 'true' : undefined}`
   en el botón, mismo patrón que el resto de la app.

### 🟡 Medio

- **M1** — `Header`: el botón de perfil usaba `t.tabSettings` ("Ajustes")
  para un botón que navega a "Cuenta"; corregido a `t.accountTitle`.
- **M2** — `aria-pressed`→`aria-current` migrado en los 4 sitios que se
  habían quedado atrás: selector de avatar preestablecido y `ToggleBtn`
  (tema/idioma) en `AccountView`, chips de filtro de proveedor en
  `ShoppingView`.
- **M3** — `AdminCatalog`: `aria-label={t.adminLocalLabel}` en el `<select>`
  de filtro de restaurante.
- **M4** — `AdminCatalog`: confirmación de dos toques (patrón inline ya
  usado en `DailyChecklist`, sin modal) antes de eliminar un producto, en
  la vista de tarjetas móvil y en la tabla de escritorio.
- **M5** — `AdminCatalog`: guard de doble-envío (`isSavingEdit` /
  `isCreatingProduct` / `isCreatingRestaurant`) en los 3 handlers async de
  guardar/crear, con `disabled` en su botón disparador mientras el `await`
  está pendiente.
- **M6** — `AccountView`: `try/catch` alrededor de `onSaveProfile`; solo se
  activa `savedFlash` en éxito real, con banner de error inline en fallo.
- **M7** — `AccountView`: fallback real (ícono + círculo, no casilla en
  blanco) para un avatar preestablecido roto.
- **M11** — `LoginScreen`: eliminado el estado `loadingUserId` — código
  muerto bajo el batching automático de React 19 (confirmado que
  `onSelectUser` es totalmente síncrono); el spinner y el `disabled` que
  nunca surtían efecto se retiraron en vez de fingir un delay artificial.
- **M12** — `Header`: `id`/`aria-controls` enlazando el trigger del
  selector de restaurante con su `listbox`, por el patrón APG.
- **M13** — `DailyChecklist`: la escritura a `localStorage` (antes en cada
  tecla) ahora se debounce 400ms (`persistTimeoutRef`/`pendingPersistRef`),
  con flush inmediato garantizado en 3 puntos: al desmontar (cambio de
  pestaña de la app), al enviar el checklist, y al descartar el borrador —
  para que ninguna edición real se pierda por quedar solo en el timer.

### 🟢 Bajo

- **B3** — `LoginScreen`: cabecera de sección `<span>`→`<h2>`.
- **B4** — `Header`: el popover ahora también cierra cuando el foco sale
  del documento por completo (`relatedTarget === null`), no solo con Tab
  dentro de la página.
- **B5** — `AccountView`: `avatarError` como estado propio (patrón ya
  usado en `Header`) en vez de mutar `avatarUrl` en el `onError` del
  avatar principal — una imagen rota ya no ensucia el formulario.
- **B12** — `ShoppingView`: Escape revierte la nota al valor previo y
  cierra el modo edición sin guardar, vía real de cancelar distinta de
  Enter/blur.
- **B13** — `AdminCatalog`: los 3 `<h3>` sin `<h2>` intermedio (incluido
  el de `OverdueSettingsPanel`, no documentado en el ciclo anterior)
  retagueados a `<h2>`.
- **B15** — `ShoppingView`: guardado duplicado de nota en `blur`+`click`
  corregido — el `blur` ya no dispara `handleSaveNote` cuando el
  `relatedTarget` es el propio botón "Guardar".
- **B16** — `AdminCatalog`: `saveError` pasó de compartido a escopado por
  formulario (`edit`/`createProduct`/`createRestaurant`), cada banner
  identifica qué acción falló.
- **B17** — `AdminCatalog`: `type: any` reemplazado por
  `Restaurant['type']`.
- **B18** — `AccountView`: re-seleccionar la cuenta ya activa ya no
  reproduce el sonido de clic (no-op real).
- **B19** — `NotificationsView`: las 3 sub-secciones de Ajustes
  ("Push notifications", "Probar sonidos", "Simular notificación") pasaron
  de `<div>` a `<h2>` semántico.
- **B20** — `DailyChecklist`: el botón de quick-set "agotado" usa
  `t.stockOut` en vez del literal `'0'` sin traducir.

### Adyacente a M15 (parcial)

`showOrderPreview` se sacó por completo de `ChecklistDraft`: ya no se lee
del borrador al montar ni se sincroniza vía el listener de `storage` — es
puramente estado de viewport local a la pestaña actual, nunca compartido.
Esto resuelve el escenario concreto que M15 describe (el cajón de vista
previa abriéndose/cerrándose solo por la acción de otro usuario). No se
tocó el resto de M8/M9/M10 (requieren diseño propio, diferidos según la
propia auditoría).

## i18n

6 claves nuevas añadidas a `es`/`en` en paralelo (sin colisión, cada línea
de trabajo verificó su propio subconjunto): `stockOut`,
`checklistLiveCoEditorPrefix`/`Suffix` (`DailyChecklist`),
`adminSaveErrorEdit`/`CreateProduct`/`CreateRestaurant` (`AdminCatalog`).
Paridad verificada por extracción programática propia tras la fusión de
las 6 líneas de trabajo: **429/429 claves** en ambos locales, sin huecos en
ninguna dirección (subió de 423/423 en el ciclo anterior).

## Herramientas Claude Code (skills/subagentes)

Ver `HERRAMIENTAS_IA.md` para el detalle completo. Resumen:

- **Reforzado `cross-tab-sync-guardian`** (tercera vez) con 2 ítems: (a)
  distinguir protección por foco de DOM vs. protección por ventana de
  recencia, verificando explícitamente cuál tiene cada campo de un draft
  compartido — motivado directamente por H1 de este ciclo; (b) verificar
  colisión entre escritores concurrentes de un contador `seq` local —
  motivado por H2.
- **Reforzado `wcag-audit`** con 1 ítem: al migrar un patrón de UI
  (`aria-pressed`→`aria-current`) reportado en un archivo, grepear todo el
  repo por la misma forma de interacción antes de dar el hallazgo por
  cerrado — motivado por M2 reapareciendo en `AccountView`/`ShoppingView`.
- **Reforzado `async-error-handling-guardian`** con 1 ítem sobre guard de
  doble-envío en handlers async disparados por controles interactivos —
  motivado por M5/B15.
- **Creado `destructive-action-guardian`** (nuevo par skill+subagente,
  solo lectura: Glob/Grep/Read) — gap de especialización genuino
  identificado por dos instancias independientes del mismo patrón de bug
  en el mismo ciclo (M4 de `AdminCatalog`, H3 de `DailyChecklist`).

## Estado final de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
vite v6.4.3 building for production...
✓ 2137 modules transformed.
... (chunks lazy-loaded por pantalla, todos <27 kB salvo vendor/index)
dist/assets/vendor-motion-BRJSaMgm.js       96.82 kB │ gzip: 32.02 kB
dist/assets/vendor-supabase-CI_V8wt2.js    218.46 kB │ gzip: 56.99 kB
dist/assets/index-DHhqmitZ.js              315.64 kB │ gzip: 88.11 kB
✓ built in ~5s
dist/server.cjs — Done
```

- **`tsc --noEmit`: PASA**, sin errores.
- **`npm run build`: PASA**, sin errores ni avisos de tamaño de chunk.
- **i18n:** 429/429 claves en paridad `es`/`en`.
- **Estándares del proyecto:** grep propio post-fusión sobre los 7 archivos
  de componente tocados — 0 coincidencias de clases dark-only
  (`bg-slate-*`/`text-white`/`text-slate-*`/`border-slate-*`), 0
  `fixed inset-0`, 0 colores hardcodeados fuera de `index.css`. Todas las
  confirmaciones destructivas nuevas (M4) usan el patrón inline de dos
  toques ya existente en el repo, no un modal.
- **`package-lock.json`:** se revirtió el mismo diff incidental de flags
  `"peer": true` por versión de npm del entorno, documentado en ciclos
  anteriores, sin relación con el código de este ciclo.

## Pendiente para el próximo ciclo (sin cambio de prioridad)

Tal como señala la propia auditoría: M8/M9 (`aria-live` +
virtualización), M10 (`React.memo`), y la extracción de
`useCrossTabDraft<T>` — la auditoría documenta que la lógica de
sincronización de `DailyChecklist` "creció, no se redujo" ciclo tras
ciclo (206 líneas, 7 refs) y que H1 de este ciclo es la cuarta instancia
consecutiva de exactamente el tipo de bug que esa extracción prevendría
estructuralmente por diseño de tipos, no por checklist manual.
