# Correcciones aplicadas — ciclo de mejora continua

## Estado de partida

`AUDITORIA_RESULTADOS.md` (commit `27766c8`) reportó **VEREDICTO: CON HALLAZGOS**:
0 críticos, 4 altos (H1–H4), 11 medios (M1–M11) y 18 bajos (B1–B18). Este
ciclo resolvió los 4 hallazgos Altos, 6 de los 11 Medios priorizados en la
sección (e) del informe, y 2 hallazgos Bajos de bajo esfuerzo/alto impacto
encontrados de paso en los mismos archivos. Los Medios que requieren diseño
propio (M3/M4 — `aria-live` + virtualización de `RequestsList`) y la deuda
de arquitectura mayor (formulario triplicado de `AdminCatalog`, `App.tsx`
monolítico, extracción de `useCrossTabDraft`) quedan diferidos, sin cambio
de prioridad respecto a lo que la propia auditoría recomendó diferir.

## Hallazgos resueltos

### 🟠 Alto

1. **H1 — `DailyChecklist`: `isUrgent`/`reviewedIds`/`showOrderPreview` sin
   protección frente a sobrescritura remota.** Estos tres campos no tienen
   un `<input>` con foco que sirva de señal de "edición en curso" como sí
   tienen el stock y la nota, así que se añadió un ref
   `recentLocalChangeRef` que registra el timestamp de la última interacción
   local por campo (marcar/desmarcar revisado, tocar el checkbox Urgente,
   abrir/cerrar la vista previa de pedido con el botón o con Escape). El
   listener de `storage` ahora compara ese timestamp contra una ventana de
   gracia de 4s antes de aceptar el valor remoto entrante para cada uno de
   los tres campos — misma disciplina que la protección por foco existente,
   solo que basada en recencia en vez de foco de DOM, porque estos son
   controles discretos (checkbox/botón), no campos de texto continuos.

2. **H2 — `savedAt` comparaba relojes de pared entre dispositivos
   distintos.** Se añadió `seq` a `ChecklistDraft`: un contador lógico
   monotónico (estilo Lamport) que solo avanza a partir del máximo valor
   que cualquier pestaña ha observado, nunca de `Date.now()`. El efecto de
   persistencia escribe `seq = lastKnownSeqRef.current + 1`; el listener de
   `storage` descarta una actualización entrante solo si `incoming.seq <=
   lastKnownSeqRef.current`, inmune al desfase de reloj entre dos tablets
   de cocina. `savedAt` se conserva como fallback (drafts escritos antes de
   este cambio, sin `seq`) y para el texto humano "hace N minutos" del
   banner de autoría — ya no decide por sí solo si una actualización se
   aplica.

3. **H3 — el guard de reatribución de autoría al montar (`A1`) no cubría
   la rama "sin borrador existente".** `skipInitialPersistRef` pasó de
   inicializarse en `!!draft` (solo protegía cuando ya había un borrador) a
   inicializarse siempre en `true`. La primera ejecución del efecto de
   persistencia — con o sin borrador previo — ahora se salta siempre; solo
   la siguiente ejecución, disparada por un cambio de estado real (una
   edición genuina, no el montaje), persiste y atribuye autoría. Abrir la
   pantalla sin editar nada ya no reatribuye los valores por defecto a
   quien solo miró.

4. **H4 — `RequestsList`: pérdida de foco real al activar "+N más".** El
   botón solo existe mientras `!isExpanded` y se desmontaba en el mismo
   ciclo de render que lo activaba, dejando el foco en `<body>`. El botón
   del pie "Ver/Ocultar detalles" permanece montado (solo cambia su
   etiqueta) — se guardó una `ref` por solicitud a ese botón
   (`footerToggleRefs`) y el `onClick` de "+N más" ahora mueve el foco ahí
   explícitamente tras expandir, en vez de dejarlo caer a ningún sitio. De
   paso, el propio "+N más" subió a `min-h-11` (cerraba B6).

### 🟡 Medio

5. **M1 — el popover de restaurante de `Header` no se cerraba al salir con
   `Tab`.** Se añadió un listener de `focusout` en el contenedor del
   selector (sin trampa de foco: `Tab` sigue pudiendo salir libremente) que
   cierra el popover cuando el foco entrante (`relatedTarget`) no está
   contenido en el selector — cubre exactamente el escenario reportado
   (`Tab` desde el listbox hacia la campana de notificaciones).

6. **M6 — la clave de `localStorage` del listener de `DailyChecklist` no
   se recalculaba al cruzar medianoche.** La comparación `e.key !== key`
   usaba una clave calculada una sola vez al montar el efecto. Ahora se
   calcula `draftKeyFor(selectedRestaurant.id)` dentro del propio handler,
   en cada evento, así que una sesión que sigue abierta después de
   medianoche sigue escuchando la clave de *hoy*, no la capturada ayer.

7. **M7 — nombres accesibles no distinguibles por ítem en
   `ShoppingView`/`NotificationsView`.** `ShoppingView.tsx`: el botón
   "Guardar" y el botón "Agregar/Editar nota" de cada fila ahora incluyen
   `aria-label` con el nombre del producto
   (`${t.noteSave} — ${item.productName}`, etc.) — antes tenían el mismo
   texto genérico en cada fila. `NotificationsView.tsx`: el botón de
   "marcar leída" ahora incluye el número de solicitud y el restaurante en
   su `aria-label`, igual que ya hacía el botón principal de abrir la
   tarjeta.

8. **M8 — `<label>` huérfano en Ajustes de `NotificationsView`.** No
   envolvía ningún control ni tenía `htmlFor` (le seguían dos `<button>`).
   Cambiado a `<div>`, igual que el encabezado vecino "Simular
   notificación".

9. **M9 — `aria-pressed` (semántica de toggle) en switches de selección
   única.** Migrados a `aria-current="true"` en `AdminCatalog.tsx`
   (switcher PRODUCTOS/RESTAURANTES/PROVEEDORES/TIEMPOS) y
   `NotificationsView.tsx` (switcher FEED/AJUSTES) — mismo patrón ya
   aplicado a `RequestsList` en el ciclo anterior (B5/B8), replicado ahora
   a los dos sitios estructuralmente idénticos que se habían quedado atrás.

10. **M10 — el input numérico de stock se forzaba a "0" al vaciarlo.**
    `Number('')` evalúa a `0` en JS, así que borrar el campo para
    reemplazar "15" por "340" sin seleccionar todo primero lo devolvía a
    "0" en cada keystroke. Se añadió `pendingEmptyStockIds` (un `Set` de
    ids de producto cuyo input está temporalmente vacío mientras se
    escribe): el campo se renderiza como cadena vacía en vez de "0" hasta
    que se escribe un número válido o se pierde el foco, sin tocar el
    valor numérico real (`readings`) hasta ese momento.

11. **M11 — "Empezar checklist nuevo" tras un borrado remoto descartaba
    ediciones locales sin confirmar.** Se añadió una confirmación de dos
    toques *solo cuando hay ediciones locales reales*
    (`reviewedIds.size > 0 || notes.trim() !== '' || isUrgent`): el primer
    toque cambia la etiqueta del botón a la variante de confirmación
    (`checklistRemoteClearedConfirmBtn`, clave nueva en ambos locales); el
    segundo toque descarta. Si no hay ediciones reales que perder, el
    botón actúa de inmediato como antes.

### 🟢 Bajo (resueltos de paso, mismos archivos)

- **B4 — avatar de `Header` sin `onError` de respaldo a las iniciales.**
  Añadido el mismo patrón que ya tenía `AccountView`: un estado
  `avatarError` que cae a las iniciales si la imagen falla, reseteado si
  `avatarUrl` cambia.
- **B11 — `e.stopPropagation()` residual en `handleDismiss` de
  `NotificationsView`.** Vestigio de la arquitectura anidada anterior a la
  reestructura de A10 (el botón de descarte ya no está anidado dentro de
  un `role="button"`, es un hermano con `pointer-events-auto`) — eliminado
  junto con el parámetro `e` que ya no se usa.

## Herramientas de IA: cambios en `.claude/`

No se creó ninguna skill/subagente nuevo — la sección (f) de la auditoría
concluyó explícitamente que el gap encontrado era de **alcance de
checklist**, no de especialización sin cubrir, y pidió reforzar (no
duplicar) `cross-tab-sync-guardian`:

- **`.claude/skills/cross-tab-sync-guardian/SKILL.md`** y
  **`.claude/agents/cross-tab-sync-guardian.md`**: +2 ítems de checklist
  (7 y 8) — "enumerar explícitamente los N campos del objeto sincronizado,
  no solo los que motivaron el incidente original" (evidencia directa: H1)
  y "un timestamp de reloj de pared no es una señal de orden causal segura
  entre dispositivos, usar un contador lógico monotónico" (evidencia
  directa: H2). Documentado en el propio skill que ambos ítems nacen de
  hallazgos reales de esta pasada, no genéricos.
- **`.claude/skills/wcag-audit/SKILL.md`** y
  **`.claude/agents/wcag-auditor.md`**: +1 ítem (9a) — "trazar qué pasa con
  el foco cuando un disparador focalizable está condicionado por el mismo
  booleano que activa" (evidencia directa: H4). Patrón genérico, no
  específico de este repo, tal como señaló la propia auditoría.

## Diferido sin cambios (fuera de alcance seguro de este ciclo)

- M3/M4 (`aria-live` en Dashboard/RequestsList; virtualización del feed) —
  la propia auditoría los marca como "requiere diseño, no una línea".
- M2 (tema oscuro forzado en `LoginScreen` tras logout) — requiere una
  decisión de producto (¿es intencional?), no solo código; se deja para
  que el usuario/equipo de diseño lo confirme antes de tocarlo.
- M5 (`React.memo` en Dashboard/RequestsList), B1–B3/B5–B10/B12–B18 y toda
  la deuda de arquitectura mayor (formulario triplicado de `AdminCatalog`,
  `App.tsx` monolítico, extracción de `useCrossTabDraft`) — sin cambios de
  prioridad respecto a lo que el propio informe recomendó diferir a un
  ciclo dedicado.

## Estado final de build/tsc

```
$ npx tsc --noEmit
(sin salida — exit 0, sin errores)

$ npm run build
✓ 2137 modules transformed.
✓ built in 3.87s
dist/server.cjs 78.2kb — Done in 17ms
```

i18n: `checklistRemoteClearedConfirmBtn` (clave nueva de M11) añadida en
`es` y `en` con el mismo texto en ambos — paridad de claves verificada por
extracción programática (423/423 en ambos locales, incluye el objeto
completo tras el cambio).

`package-lock.json`: el `npm install` de este entorno generó un diff
incidental (mismo patrón ya documentado en ciclos anteriores) — revertido
antes de commitear, sin relación con el código de este ciclo.
