# Correcciones aplicadas — ciclo de mejora continua

## Estado de partida

`AUDITORIA_RESULTADOS.md` (commit `8464dd8`) reportó **VEREDICTO: CON HALLAZGOS**:
0 críticos, 2 altos (A1, A2), 6 medios (M1–M6) y 8 bajos (B1–B8). Este ciclo
resolvió los 2 hallazgos Altos, los 6 Medios y una parte de los Bajos
priorizados por la propia auditoría.

## Hallazgos resueltos

### 🟠 Alto

1. **A1 — Tema/idioma/sesión no persistían tras recargar.**
   `App.tsx` ahora persiste el perfil completo del usuario activo en
   `localStorage` (`restosupply_session_user`) cada vez que se selecciona un
   usuario o se guarda el perfil (tema/idioma/nombre/avatar/etc.), y lo
   restaura de forma síncrona al montar (antes de la carga de red), evitando
   el parpadeo de vuelta al `LoginScreen`. El idioma también se guarda por
   separado (`restosupply_language`) para persistir la preferencia incluso
   antes de iniciar sesión. `onLogout` limpia solo la sesión, no la
   preferencia de idioma.

2. **A2 — Alta/edición de catálogo (productos/locales) se perdía al refrescar.**
   No existe tabla de Supabase para productos/restaurantes (son datos
   estáticos de demo) y crear ese esquema desde cero quedaba fuera del
   alcance seguro de este ciclo. Se cerró la brecha real reportada
   ("se pierde al refrescar") persistiendo el catálogo editado en
   `localStorage` (`restosupply_products_override` /
   `restosupply_restaurants_override`), restaurado al cargar. Es persistencia
   **local a este navegador/dispositivo**, no sincronización entre
   dispositivos — documentado aquí para que quede explícito el alcance, tal
   como sugería la auditoría.

   **Verificación con Playwright + hallazgo adicional real:** al probar esto
   en un navegador real, la restauración funcionaba en `localStorage` pero
   la UI tardaba en reflejarla porque `loadInitialData()` esperaba (`Promise.all`)
   a que **las 4** fuentes resolvieran, incluida `fetchSupplyRequests()`
   (la única que depende de la red/Supabase) antes de aplicar la restauración
   de catálogo/localStorage — si Supabase está lento o inalcanzable, el
   catálogo (que no depende de red) queda bloqueado con él. Corregido en
   `App.tsx`: `fetchRestaurants`/`fetchUsers`/`fetchProducts` (instantáneos,
   estáticos + override local) ya no esperan a `fetchSupplyRequests`, que
   ahora se resuelve por separado y actualiza `supplyRequests` cuando
   termine. Confirmado con Playwright: agregar un producto y un local nuevo,
   recargar la página y verlos persistidos de inmediato en la pestaña
   Catálogo.

### 🟡 Medio

3. **M1 — Radios inconsistentes (4px vs 8px) en tags de categoría.** Unificados
   a `rounded-lg` en `ShoppingView.tsx` y `AdminCatalog.tsx` (3 sitios).
4. **M2 — Objetivos táctiles de 32px.** Subidos a 44px: enlace de compartir por
   WhatsApp en `RequestsList.tsx` y botón de nota en `DailyChecklist.tsx`
   (con `min-w-11 min-h-11` para que el layout con texto en desktop no se
   rompa).
5. **M3 — Accesibilidad: nombres/estado accesibles faltantes.** Se añadió
   `aria-label` a los steppers +/- de stock y al botón de nota en
   `DailyChecklist.tsx`, y `aria-pressed`/`aria-label` al selector de idioma
   de `LoginScreen.tsx`.
6. **M4 — Cadenas en español hardcodeadas.** Movidas a `t.xxx` (ES/EN) en
   `translations.ts`: textos por defecto de la notificación de prueba,
   título/cuerpo de "notificaciones activadas", plantilla de WhatsApp de
   ejemplo (todas en `NotificationsView.tsx`), y la opción "Cafe / Desayunos"
   en `AdminCatalog.tsx`.
7. **M5 — Divs clicables sin soporte de teclado.** Se añadió
   `role="button"`, `tabIndex={0}` y `onKeyDown` (Enter/Espacio) a la fila de
   ítem en `ShoppingView.tsx` y a la tarjeta de solicitud en
   `NotificationsView.tsx`.
8. **M6 — Bloque de tokens legado duplicado en `index.css`.** Eliminado (su
   valor dark tenía una deriva real de `--sf-text`); el tema ya se aplica
   correctamente vía las reglas basadas en tokens que quedaron.

### 🟢 Bajo (parcial — priorizados por bajo riesgo/alto impacto de pulido)

9. **B4 (parcial) — Objetivos táctiles límite (36–40px).** Subidos a 44px:
   presets de avatar (`AccountView.tsx`), botón de marcar leída
   (`NotificationsView.tsx`), botones de cerrar formulario y editar/eliminar
   en tarjetas móviles (`AdminCatalog.tsx`).
10. **B6 — Color de selección de texto hardcodeado.** `App.tsx` ahora usa
    `selection:bg-[var(--sf-accent)] selection:text-[var(--sf-accent-contrast)]`
    en vez de `emerald-500`/`white` fijos.
11. **B8 — `aria-label` genérico en presets de avatar.** Reemplazado el
    `alt={p.id}` (p. ej. "chef") por `aria-label` traducido
    (`avatarPresetChef/Runner/Admin`) y `aria-pressed` en el botón; el `alt`
    de la imagen se vació para no duplicar el nombre accesible.

### No abordados en este ciclo (documentado, no bloqueante)

- **B1** (tokens de acento fuera de `html.light`/`html.dark`) y **B2** (foco
  visible sin capa CSS): decisiones de arquitectura documentadas por la
  propia auditoría como funcionales hoy; tocarlas sin una batería de pruebas
  visuales en ambos temas es más riesgo que beneficio para este ciclo.
- **B3** (botones ~26px en la tabla de escritorio, solo mouse/no táctil): sin
  impacto móvil, se deja para un ciclo dedicado a la tabla de escritorio.
- **B5** (pantallas sin breakpoints propios): patrón mobile-first defendible
  según la propia auditoría, no es un bug.
- **B7** (bundle de ~608 kB sin code-splitting): mejora de rendimiento válida
  pero con superficie de riesgo mayor (rutas de carga diferida, PWA/SW
  cacheando chunks); se deja para un ciclo enfocado en performance con
  verificación de la PWA instalada, no solo `npm run build`.

## Ciclo de verificación posterior (2026-07-31, sobre `3d2a561`)

`AUDITORIA_RESULTADOS.md` seguía documentando el estado de `7cd65cd` (previo
a este mismo ciclo de correcciones). Antes de aceptar el veredicto como
resuelto se hizo una verificación independiente de los 8 hallazgos A1/A2/M1–M6
contra el código real de `3d2a561`: 7 de 8 quedaron correctos tal como se
describe arriba. Se encontró un resto real de **M1** (radios inconsistentes)
que el commit anterior no cubrió:

- `src/components/AdminCatalog.tsx:278` — el tag de categoría de la fila de
  tabla de escritorio (`AdminCatalog`, vista no-edición) seguía usando
  `rounded` (4px) en vez de `rounded-lg` (8px), igual que el resto de tags de
  categoría ya corregidos en `ShoppingView.tsx` y en las tarjetas móviles de
  `AdminCatalog.tsx`. Corregido a `rounded-lg`.

No se encontraron más defectos reales en esta pasada (no se creó ningún
modal nuevo, el fallback público de Supabase sigue intacto, i18n sigue en
346/346 claves sin huecos).

## Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio** (vite build + esbuild server.ts OK). El
  aviso de chunk >500kB (B7) persiste, es preexistente y no bloqueante.
- i18n: `translations.ts` sigue con el mismo número de claves en `es` y `en`
  (346/346, sin huecos) tras añadir las nuevas claves de este ciclo.
- Cero modales: no se introdujo ningún `fixed inset-0`/overlay nuevo.
- `NUNCA` se tocó el fallback público de Supabase en `src/lib/supabase.ts`.

## Ciclo de corrección (2026-07-31, sobre `2f6882c`)

`AUDITORIA_RESULTADOS.md` seguía mostrando `VEREDICTO: CON HALLAZGOS` (documenta
el estado de `7cd65cd`, previo a los dos ciclos de corrección anteriores).
Verificación independiente confirmó que A1, A2, M1–M6 y las mejoras Bajas
parciales (B4/B6/B8) descritas arriba **siguen correctas en el código actual**
— no hubo regresión. Se hizo además una auditoría rápida propia enfocada en
teclado, i18n y consistencia funcional, y se encontraron 3 defectos reales
nuevos, no documentados en ningún ciclo anterior:

1. **(Alto, funcional) Bug de teclado: los inputs/botones anidados dentro de
   tarjetas `role="button"` no detenían la propagación de `keydown`.**
   En `ShoppingView.tsx` (fila de ítem) y `NotificationsView.tsx` (tarjeta de
   solicitud), la tarjeta contenedora captura `Enter`/`Espacio` para su propia
   acción (marcar comprado / navegar a la solicitud). El contenedor de la nota
   y el botón "marcar leída" sólo detenían el evento `onClick` (mouse), no
   `onKeyDown`: un usuario de teclado que escribía un espacio dentro del campo
   de nota disparaba también el toggle de "comprado" del ítem (y sonido),
   hacía imposible escribir notas con espacios, y pulsar Enter en el botón de
   "marcar leída" navegaba a la solicitud además de descartarla. Corregido
   añadiendo `onKeyDown={(e) => e.stopPropagation()}` en el wrapper de nota de
   `ShoppingView.tsx` y en el botón de "marcar leída" de
   `NotificationsView.tsx`.
2. **(Medio, i18n) Resumen de WhatsApp para compartir una solicitud
   (`RequestsList.tsx`) se generaba siempre en español**, ignorando el idioma
   del usuario — `generateRequestWhatsAppSummary` en `src/lib/notifications.ts`
   no aceptaba idioma. Ahora recibe `lang` (`currentUser.language`) y usa 6
   claves nuevas (`waSummary*`) en `translations.ts` (ES/EN).
3. **(Medio, i18n) Notificaciones push del sistema y la nota autogenerada de
   solicitudes pendientes, todas hardcodeadas en español en `App.tsx`**
   (nueva solicitud por Realtime, pedido atrasado, acceso restringido, nueva
   solicitud de compra automática al cambiar estado, solicitud generada al
   finalizar compra, y el texto de `notes` de esa solicitud generada). Se
   movieron a 17 claves nuevas en `translations.ts` (ES/EN) y se leen a través
   de un `tRef` (mismo patrón ya usado en el repo para `shoppingModalRequestRef`)
   para evitar closures obsoletos dentro del listener de Supabase Realtime y
   del intervalo de detección de atrasos, que sólo se registran una vez y no
   deben quedarse con el idioma de render inicial.

No se encontraron más defectos reales (sin modales nuevos, tokens/temas
intactos, fallback público de Supabase sin tocar).

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio** (613.17 kB / 160.46 kB gzip — aviso de
  chunk preexistente B7, no bloqueante, sin cambio de alcance).
- i18n: `translations.ts` pasa de 346 a 370 claves en **ambos** idiomas
  (ES/EN), sin huecos.

## Ciclo de corrección (2026-07-31, sobre `0b509d9`)

`AUDITORIA_RESULTADOS.md` seguía mostrando el estado de `7cd65cd` (previo a
los cuatro ciclos de corrección anteriores). Dos commits de este mismo
agente corrector habían quedado sin documentar en este archivo:

- `b302d99` — P0 de accesibilidad: la auditoría *renderizada* (no solo
  estática) encontró que `--sf-violet/amber/sky/text-subtle/text-muted/accent`
  no llegaban a 4.5:1 en varios pares texto/fondo, peor en tema claro (sky
  2.77, amber 2.15, accent 3.77, subtle 2.56). Se retonó la paleta de hues
  **por tema** (más oscura en claro, igual/más clara en oscuro) y se añadió
  `--sf-amber-contrast` para texto sobre relleno sólido de amber.
- `0b509d9` — pulido visual reportado por el usuario: selector de local del
  Header pasa de `<select>` nativo a popover con tokens propios; el punto de
  presencia del avatar ya no queda cortado por el `overflow-hidden` circular;
  cabecera de progreso de `ShoppingView` rediseñada (sin emoji duplicado);
  steppers de `DailyChecklist` a pastilla circular; se quitó el pill de local
  redundante en las tarjetas de `RequestsList` (el header ya lo muestra).

Antes de aceptar el ciclo como cerrado se hizo una auditoría fresca dirigida
(delegada a un agente de investigación) sobre los 9 criterios + posibles
regresiones de esos dos commits, comparando contra el código actual y no
contra el diff. Encontró 8 hallazgos reales nuevos, cerrados en este ciclo:

### Alto

1. **Regresión de objetivo táctil.** `0b509d9` había reducido los steppers
   de stock de `DailyChecklist.tsx` de `w-11 h-11` (44px) a `w-10 h-10`
   (40px) al convertirlos en pastilla circular, revirtiendo sin querer una
   corrección de un ciclo anterior. Restaurado a `w-11 h-11` (44px).
2. **Foco perdido al cerrar el popover del selector de local.** El nuevo
   popover de `Header.tsx` (de `0b509d9`) no devolvía el foco al botón
   disparador al cerrarse con `Escape` o al elegir una opción — el elemento
   enfocado se desmontaba y el navegador soltaba el foco a `<body>`,
   dejando a un usuario de teclado sin referencia. Se añadió `triggerRef` +
   `closePopover(returnFocus)` que llama `.focus()` sobre el botón disparador
   en ambos casos.

### Medio

3. **Patrón ARIA incorrecto en el mismo popover.** Usaba `role="listbox"` +
   `role="option"` pero cada opción era su propio *tab stop* en vez de un
   único listbox con `roving tabindex` + navegación por flechas (lo que
   exige ese rol). Implementar el patrón completo era desproporcionado para
   un selector de ≤10 locales; se optó por quitar `role="listbox"`/`"option"`
   (queda como un grupo de botones, patrón válido) y usar `aria-current`
   en vez de `aria-selected` para marcar el local activo.
4. **Contraste insuficiente en botones activos de "ajuste rápido" de stock.**
   Los estados `ok`/`out` de `DailyChecklist.tsx` usaban `color: '#fff'`
   fijo; en tema oscuro eso da ~2.5:1 (accent) y ~3.7:1 (rose) sobre texto
   `text-xs` en negrita — ambos por debajo de 4.5:1 AA. Se cambió a
   `var(--sf-accent-contrast)` (ya usado por el estado `low`), que da ≥5:1
   en ambos temas para accent y rose (verificado calculando la razón real).
5. **Cero regiones `aria-live` en toda la app.** Los mensajes de éxito
   transitorios (checklist enviado, perfil guardado, notificación de prueba
   enviada) sólo cambiaban visualmente — un usuario de lector de pantalla no
   recibía confirmación. Se añadió `role="status" aria-live="polite"` a los
   tres contenedores (`DailyChecklist.tsx`, `NotificationsView.tsx`) y
   `aria-live="polite"` al botón de guardar de `AccountView.tsx` (su label
   cambia de texto al confirmar).
6. **Lógica de presentación de estado triplicada/cuadruplicada.** El helper
   `tint()` estaba copiado literalmente en 4 archivos (con un valor por
   defecto distinto en `LoginScreen.tsx`, un riesgo latente de deriva), y el
   mapa color-por-estado (`STATUS_COLOR(S)`) + el mapa de etiquetas
   traducidas estaban duplicados en `Dashboard.tsx`, `RequestsList.tsx`
   (dos veces, una de ellas como función local) y `NotificationsView.tsx`.
   Extraído a `src/lib/colors.ts` (`tint`, `STATUS_COLORS`,
   `getStatusLabels(t)`) — un solo origen de verdad, importado por los 4
   componentes.

### Bajo

7. **Segundo color del degradado de progreso hardcodeado.** Las 3 barras de
   progreso (`ShoppingView`, `DailyChecklist`, `RequestsList`) usaban
   `linear-gradient(90deg, var(--sf-accent), #2dd4bf)` con un hex fijo sin
   tokenizar. Añadido `--sf-accent-2` (mismo valor, en `html.light` y
   `html.dark`) y actualizadas las 3 referencias.
8. **Campos de búsqueda sin `aria-label` de respaldo.** `DailyChecklist.tsx`
   y `AdminCatalog.tsx` dependían solo de `placeholder` (desaparece al
   escribir). Añadido `aria-label` con la misma cadena traducida.

No se encontraron más defectos reales (sin modales nuevos, tokens/fallback
de Supabase intactos, 370/370 claves i18n sin huecos, sin strings nuevos
hardcodeados).

### Skills y subagentes creados este ciclo

No existía ningún skill ni subagente propio del proyecto (`.claude/` sólo
tenía `launch.json`). Se crearon 8 pares skill+subagente para las
especializaciones de diseño/UX/frontend pedidas: `mobile-ux-review`,
`design-system-guardian`, `wcag-audit`, `motion-microinteractions`,
`design-token-architect`, `typography-color-system`, `visual-qa`,
`frontend-architecture-review` — cada uno con su `SKILL.md`
(`.claude/skills/<kebab>/SKILL.md`) y su subagente correspondiente
(`.claude/agents/<name>.md`, `tools` acotados a solo-lectura salvo
`design-token-architect`, el único con `Edit`). Detalle completo y
justificación de cada uno en `HERRAMIENTAS_IA.md`, junto con 3 MCP
recomendados (no instalados por requerir auth interactiva): Figma, Chrome
DevTools/Playwright, Vercel.

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio** (614.16 kB / 160.88 kB gzip — aviso de
  chunk preexistente B7, no bloqueante, sin cambio de alcance).
- i18n: `translations.ts` se mantiene en 370/370 claves en ambos idiomas
  (este ciclo no añadió strings nuevos, sólo `aria-label`s que reusan claves
  existentes).
- Cero modales, cero cambios al fallback público de Supabase en
  `src/lib/supabase.ts`.
- Cero modales, cero cambios al fallback público de Supabase.
