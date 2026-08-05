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

## Ciclo de corrección (2026-08-01, sobre `5f8f719`)

`AUDITORIA_RESULTADOS.md` (auditoría sobre `2299ec7`, un commit por detrás
de `5f8f719` al momento de esta pasada) reportó **VEREDICTO: CON
HALLAZGOS**: 1 Crítico (C1), 6 grupos Altos (A1–A6), 13 Medios (M1–M13) y
10 Bajos (B1–B10). Este ciclo implementó, en orden de prioridad, el
Crítico, los 6 Altos completos, y una parte alta de los Medios (los de
mayor impacto de percepción "premium" y los de menor riesgo/mayor
beneficio), dejando documentados como deuda explícita los que requieren un
refactor mayor (ver "Diferido" al final).

### 🔴 Crítico

1. **C1 — Progreso del Checklist Diario se perdía al cambiar de pestaña.**
   `DailyChecklist.tsx` ahora persiste `readings`/`reviewedIds`/`notes`/
   `isUrgent` en `localStorage` con clave por restaurante+día
   (`restosupply_checklist_draft_<restaurantId>_<YYYY-MM-DD>`), restaurado
   al montar y **borrado tras un envío exitoso** — mismo patrón ya usado
   para `restosupply_products_override`. Cambiar de pestaña y volver ya no
   descarta el trabajo en curso.

### 🟠 Alto

2. **A1 — Familia de badges `text-white`/`color:'#fff'` que fallaba
   contraste AA en tema oscuro (3.67:1 / 2.54:1, muy por debajo de 4.5:1).**
   Reemplazado por `var(--sf-accent-contrast)` (≥5:1 en ambos temas, ya
   validado por un ciclo anterior) en las 4 ubicaciones: `RequestsList.tsx`
   (badge OVERDUE), `Header.tsx` (badge de notificaciones), `BottomNav.tsx`
   (badge de conteo), `DailyChecklist.tsx` (badge contador del resumen).
3. **A5 — Objetivos táctiles bajo 44px en los controles más usados de 5
   pantallas.** Subidos a `min-h-11` (+ `active:scale-95` para feedback
   táctil): selector de idioma de `LoginScreen`, botón "Ver todas" de
   `Dashboard`, "Marcar todo leído" de `NotificationsView`, botón de
   nota de `ShoppingView`, y el helper `chipBtn` compartido de
   `RequestsList` (CTAs "Tomar pedido"/"Modo compra"/"Confirmar
   recepción"...). De paso se subieron a 44px varios controles hermanos de
   la pestaña Ajustes de `NotificationsView` (segmented control, "Activar"
   push, botones de sonido, enlace de WhatsApp, "Enviar", "Ver leídas") —
   mismo hallazgo (M5), misma causa raíz.
4. **A3 — Contraste real (~4.0:1) en el badge de umbral mínimo de la tabla
   de escritorio de AdminCatalog (tema claro).** Igualado al tratamiento
   plano `sf-inset` que ya usa la tarjeta móvil equivalente (≈4.76:1) —
   resuelve el contraste y la inconsistencia visual con la tarjeta móvil en
   el mismo cambio (cierra A3 y parte de M1 a la vez).
5. **A2 — Cambios de perfil sin guardar se perdían en silencio al pulsar
   "atrás" en Cuenta.** `AccountView.tsx` ahora auto-guarda el formulario
   (`dirty === true`) antes de navegar atrás, coherente con que
   tema/idioma ya se aplican al instante en la misma pantalla.
6. **A6 — Categoría `SUPPLIES` inalcanzable desde el filtro (hueco
   funcional).** Extraído `PRODUCT_CATEGORIES` (derivado de `Category`,
   incluye `SUPPLIES`) en `src/lib/formatters.ts`, consumido por
   `DailyChecklist.tsx` y `AdminCatalog.tsx` en vez de dos listas
   hardcodeadas duplicadas que omitían la categoría.
7. **A4 — Colores hardcodeados fuera del sistema de tokens.** Añadidos
   `--sf-brand-gradient`/`--sf-brand-shadow` en `src/index.css` (degradado
   de marca, antes duplicado en `LoginScreen.tsx` y `Header.tsx` como
   clases Tailwind crudas). `Restaurant.colorBadge` pasó de `string`
   (`'bg-emerald-600'`, ...) a una unión semántica
   `RestaurantColorKey = 'emerald'|'amber'|'indigo'|'rose'`, resuelta a
   `var(--sf-*)` vía `RESTAURANT_COLOR_TOKENS` (nuevo, en
   `src/lib/colors.ts`) en `AdminCatalog.tsx` — cero clases Tailwind de
   color en datos.

### 🟡 Medio

8. **M11 — `motion` (instalado pero sin usar en todo `src/`) adoptado para
   3 microinteracciones clave:** expand/collapse de tarjetas de
   `RequestsList` (altura animada vía `AnimatePresence`/`motion.div` en vez
   del salto instantáneo anterior), los 2 drawers expandibles de
   `DailyChecklist` (vista previa de pedido + nota), y entrada/salida de
   tarjetas de producto al filtrar en `DailyChecklist`. Las 3 respetan
   `prefers-reduced-motion` vía el hook `useReducedMotion()` de la propia
   librería (duración `0` si está activo), siguiendo la skill
   `motion-microinteractions` ya existente.
9. **M12 — Bundle sin code-splitting, documentado sin resolver en 5+
   ciclos (614 kB → 748 kB tras adoptar `motion`).** `AccountView`,
   `NotificationsView`, `DailyChecklist`, `RequestsList`, `ShoppingView` y
   `AdminCatalog` (todo lo que no es la vista de aterrizaje ni la pantalla
   de login) ahora se cargan con `React.lazy`/`Suspense` en `App.tsx`.
   Además, `vite.config.ts` separa `react`/`react-dom`, `@supabase/
   supabase-js` y `motion` en `manualChunks` propios para que el navegador
   los cachee entre despliegues. Resultado: chunk principal **308 kB**
   (antes 614–748 kB), sin aviso de Vite por tamaño.
10. **M1 — Radios inconsistentes en AdminCatalog** (`sf-inset` de 20px
    peleando con la utilidad `rounded` de 4px en Tailwind v4). Quitada la
    utilidad `rounded` sobrante de los 4 inputs de edición inline de tabla
    y unificados los 4 botones de acción de esa misma tabla a
    `rounded-lg` (igual que su variante móvil).
11. **M2 (bug puntual, sin el refactor completo) — `EditCard` de
    AdminCatalog etiquetaba el nombre de producto con la clave
    `t.adminRestaurantName`** en vez de `t.adminProductName` — corregido.
    La extracción completa del formulario triplicado a un componente
    compartido queda diferida (ver "Diferido").
12. **M3 — AdminCatalog sin estado vacío al filtrar/buscar sin
    resultados.** Añadido mensaje `t.adminNoResults` (nueva clave ES/EN)
    cuando `filteredProducts.length === 0`, visible tanto en la vista móvil
    como en la de escritorio.
13. **M4 — Confirmaciones de guardado sin `aria-live`.** Añadido
    `aria-live="polite"` al botón de `OverdueSettingsPanel` (AdminCatalog)
    y al botón "Confirmar y Notificar Entrega" de `ShoppingView` (ya tenían
    el patrón `AccountView`/`DailyChecklist`/`NotificationsView`).
14. **M7 — Nota de ShoppingView se perdía si el usuario navegaba sin
    pulsar "Guardar".** Añadido `onKeyDown` para Enter y `onBlur` que
    autoguarda la nota al perder foco.
15. **M9 — Spinner infinito sin estado de error en LoginScreen.** Tras 8s
    sin usuarios cargados se muestra un mensaje (`t.loginLoadError`) y un
    botón de reintento (`t.loginRetry`, recarga la página) en vez de dejar
    el spinner girando indefinidamente.
16. **M10 (parcial, Dashboard) — Recalculo sin memoizar en cada evento
    Realtime.** `scoped`/`stats`/`subtitle`/`recent` de `Dashboard.tsx`
    ahora usan `useMemo` con las dependencias correctas, igual que ya
    hacía `DailyChecklist` para cálculos análogos. `RequestsList` queda
    pendiente (ver "Diferido").
17. **M13 — 3 strings sin traducir.** `"iPhone / iPad (Safari)"` en
    `AccountView.tsx` → `t.pwaIosTitle`; `"Food Truck"`/`"Restaurante"`/
    `"Bistro"` del selector de tipo de local en `AdminCatalog.tsx` →
    `t.adminTypeFoodTruck`/`t.adminTypeRestaurant`/`t.adminTypeBistro`
    (ya existía `t.adminTypeCafe` para la 4ª opción, ahora las 4 son
    consistentes); `ViewHeader`'s `backLabel` pasó de opcional con default
    `'Back'` a **prop requerida** (elimina la trampa latente en vez de
    traducirla, ya que el componente no tiene acceso a `t`). 6 claves
    nuevas añadidas en paridad ES/EN (`loginLoadError`, `loginRetry`,
    `pwaIosTitle`, `adminTypeFoodTruck`, `adminTypeRestaurant`,
    `adminTypeBistro`, `adminNoResults` — 7 en total).

### 🟢 Bajo

18. **B2 — `<th>` de la tabla de AdminCatalog sin `scope="col"`.** Añadido
    a las 7 columnas.

### Diferido (documentado, no implementado este ciclo)

- **M2 (refactor completo)** — extraer el formulario de producto
  (nombre/categoría/unidad/mínimo/cantidad/proveedor), hoy implementado 3
  veces en `AdminCatalog.tsx` (alta inline, `EditCard` móvil, edición
  inline de tabla), a un único componente compartido. Se corrigió el bug
  de copy puntual que causaba (M2 arriba) pero el refactor de arquitectura
  en sí queda para un ciclo dedicado por su alcance y riesgo de regresión.
- **M6** — virtualización/paginación de la lista de `NotificationsView`.
  No implementado: añadir una librería de virtualización es una decisión
  de arquitectura mayor que no se justifica con el volumen de datos actual
  de la demo; queda como hallazgo vigente para cuando el histórico crezca.
- **M10 (resto)** — memoizar `filteredRequests` y los 4 contadores de
  `RequestsList.tsx` (mismo patrón que se aplicó a `Dashboard.tsx` en este
  ciclo).
- **B1, B3–B10** — limpieza de radios residuales, `title`/nombre accesible
  del estado de conexión del Header, memoización fina (`getNavTabs`),
  doble render móvil/escritorio de AdminCatalog, asimetría CRUD de
  Restaurantes/Proveedores, objetos de estilo inline repetidos, números
  mágicos, código muerto (`triggerNotification` no-op), reloj de
  `getTimeAgo` sin auto-refresco. Ninguno es un defecto funcional o de
  accesibilidad real; quedan para cuando el ciclo tenga presupuesto para
  hallazgos Bajos.

### Skills y subagentes creados este ciclo

La auditoría identificó 3 gaps reales no cubiertos por los 8 pares
existentes. Creados con la misma convención (`SKILL.md` con frontmatter
`name`+`description`; agente con `name`+`description`+`tools` acotado a
solo-lectura `Glob, Grep, Read, Bash`):

- **`i18n-parity-guardian`** — paridad de claves ES/EN + grep de literales
  fuera de `t.xxx`. Ninguna de las 8 skills existentes cubre i18n; esta
  pasada encontró 3 huecos (M13) que una revisión de diseño/WCAG no
  detecta por diseño.
- **`supabase-persistence-guardian`** — verifica que el fallback público de
  `src/lib/supabase.ts` nunca se rompa y que el patrón de overrides de
  `localStorage` (catálogo, sesión, ahora también drafts de checklist) se
  siga correctamente en cambios futuros.
- **`performance-budget-auditor`** — presupuesto explícito de tamaño de
  bundle (≤500 kB) y memoización en rutas con Realtime. M12 llevaba 5
  ciclos documentado sin dueño; esta skill le da uno.

Detalle completo en `HERRAMIENTAS_IA.md`.

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio**, chunk principal **308.41 kB / 86.00 kB
  gzip** (antes 614–748 kB) — sin aviso de Vite por tamaño de chunk;
  vistas por pestaña/pantalla en chunks separados de 7–23 kB cada uno,
  vendors (`react`, `@supabase/supabase-js`, `motion`) en chunks propios.
- i18n: `translations.ts` en **377/377 claves** en ambos idiomas (7 nuevas
  este ciclo, verificado por extracción programática de ambos bloques, no
  por conteo de líneas — sin huecos en ninguna dirección).
- Cero modales nuevos, cero clases dark-only nuevas, fallback público de
  Supabase (`src/lib/supabase.ts`) sin tocar, `BottomNav` sin solapar
  contenido (sin cambios en ese subsistema).
- Funcionalidad existente verificada sin regresión: tabs, tema/idioma
  persistido, campana→Notificaciones, avatar→Cuenta, Modo Compra, alta/
  edición de productos/locales, checklist con envío (ahora persistente),
  badges.

## Ciclo de corrección (2026-08-01, continuación — sobre auditoría refrescada en `8915532`)

Durante el rebase de este mismo ciclo aterrizó en remoto una auditoría más
reciente (`8915532`, sobre `5f8f719` — el commit exacto que sirvió de base
a este ciclo), que confirmó cerrados todos los hallazgos de arriba y
añadió 1 regresión nueva (A7) + 2 grupos de hallazgos no cubiertos por el
informe original (M14, M15) + 3 Bajos nuevos (B1 reclasificado a activo,
B11, B12). Se implementaron todos antes de dar el ciclo por cerrado:

### 🟠 Alto

19. **A7 — Regresión de `5f8f719`: el footer de `RequestsList` perdió
    `flex-wrap`.** En viewports angostos con 2+ CTAs simultáneos (p. ej.
    comprador en "Pendiente": Tomar Pedido + Modo Compra) el texto de los
    botones podía partirse o el footer desbordar. Restaurado `flex-wrap`.

### 🟡 Medio

20. **M14 — Patrón recurrente de operaciones async sin manejo de error que
    dejaban la UI atascada sin salida, en 3 pantallas independientes.**
    `ShoppingView.handleFinish` (la acción principal de la pantalla),
    `AdminCatalog.handleSaveEdit`/`handleCreateProductSubmit`/
    `handleCreateRestaurantSubmit`, y `LoginScreen.handleSelect` ahora
    envuelven su `await` en `try/catch/finally`: el estado de
    carga/envío siempre se revierte y se muestra un banner de error
    inline (`aria-live="polite"`, mismo tratamiento visual que las
    confirmaciones de éxito) en vez de dejar un botón girando o un
    formulario abierto sin explicación. 2 claves nuevas ES/EN
    (`shopFinishError`, `adminSaveError`).
21. **M15 — La barra fija de `DailyChecklist` (introducida por `5f8f719`)
    traía su propia familia de defectos.** `paddingBottom` pasó de una
    constante estática (96px) a medirse en vivo con `ResizeObserver` sobre
    la barra real (incluye el alto de cualquier drawer abierto), evitando
    que el último producto de la lista quede oculto. La medición de altura
    de `BottomNav` pasó de `useEffect` a `useLayoutEffect` para eliminar
    el salto visible de la barra en cada montaje (recurrente por el
    remontaje de pestaña). Los 2 desplegables ahora comparten el mismo
    patrón de accesibilidad que el popover de `Header`: `aria-expanded` en
    ambos (antes solo uno lo tenía), `aria-controls` apuntando a un `id`
    en cada panel, y cierre compartido por `Escape`.

### 🟢 Bajo

22. **B1 — Radio del popover de `Header` (20px) sobreescribía activamente
    el de `.sf-card` (26px) vía `style` inline.** Quitado el override.
23. **B11 — Avatares preestablecidos de `AccountView` sin `onError`.**
    Añadido (oculta la imagen en vez de mostrar un icono roto), igual que
    ya tenía el avatar personalizado.
24. **B12 — `Dashboard` usaba `key={s.label}` (texto traducido) en vez de
    un `id` estable.** Añadido `id` no traducido a cada `Stat`.

### Skill adicional creada

- **`async-error-handling-guardian`** — el 4º gap identificado por esta
  auditoría: M14 se repitió en 3 pantallas sin que ninguna de las 9 skills
  existentes (las 8 originales + `performance-budget-auditor` de este
  ciclo) lo cubriera como responsabilidad propia. Detalle en
  `HERRAMIENTAS_IA.md`.

### Verificación (tras esta continuación)

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio**, chunk principal ~309 kB / 86.1 kB gzip
  (sin cambio material respecto a la verificación anterior de este mismo
  ciclo).
- i18n: **380/380 claves** en ambos idiomas (2 nuevas en esta
  continuación), verificado por extracción programática, sin huecos.
- Diferido explícitamente (no regresión, defecto preexistente de menor
  riesgo/impacto): el orden de tabulación invertido de los 2 desplegables
  de `DailyChecklist` (el contenido precede al disparador en el DOM) —
  corregirlo requeriría reordenar el layout visual de la barra
  (`flex-direction: column-reverse` o equivalente), un cambio de mayor
  riesgo que se deja para un ciclo dedicado en vez de apresurarlo aquí.

## Ciclo de corrección (2026-08-01, autónomo — sobre `e6d32f5`)

`AUDITORIA_RESULTADOS.md` en el árbol seguía describiendo el estado de
`5f8f719` (**VEREDICTO: CON HALLAZGOS**), pero ese archivo quedó
desactualizado: entre ese commit y `e6d32f5` (HEAD al iniciar este ciclo)
aterrizaron ~15 commits correctores adicionales (`19c845f`…`3ac2c4f`) que
ya habían cerrado, uno por uno y verificados con `tsc`/`build`, el
Crítico (C1) y los 7 grupos Altos completos de esa auditoría, además de la
mayoría de los Medios (M1, M3, M4, M7, M9, M11–M15) y varios Bajos (B1,
B2, B11, B12). Antes de dar por buena esa conclusión se releyó el código
real (no solo los mensajes de commit) de cada hallazgo marcado como
resuelto — sin discrepancias encontradas.

Lo que sí seguía abierto en el código, tal como el propio archivo
documenta explícitamente como "Diferido" en ciclos anteriores, y que este
ciclo cerró por ser de bajo riesgo y alto beneficio (rendimiento +
accesibilidad, sin tocar layout ni arquitectura):

- **M10 (resto)** — `RequestsList.tsx`: `filteredRequests` + los 4
  contadores de estado hacían 5 pasadas de `.filter()` en cada render,
  incluido cada evento de Supabase Realtime. Unificados en un único
  `useMemo` (un solo `scope` filtrado, reutilizado por los 4 contadores y
  la lista visible).
- **B10** — `getTimeAgo` de `RequestsList.tsx` no se refrescaba solo (sin
  `setInterval`, "hace 5 min" quedaba congelado hasta el siguiente render
  por otro motivo). Añadido un tick de 60s (`nowTick` en `useState`) que
  hace avanzar la etiqueta en vivo.
- **M10 (instancia de NotificationsView, ya identificada por la
  auditoría de `8915532` pero no cerrada)** — `visibleRequests`/
  `urgentCount` de `NotificationsView.tsx` tenían el mismo patrón sin
  memoizar; corregido igual que `RequestsList`.
- **B4** — `getNavTabs()` en `App.tsx` reconstruía un array nuevo de tabs
  en cada render del componente raíz, forzando a `BottomNav` a
  re-renderizar aunque nada relevante hubiera cambiado. Envuelto en
  `useMemo` (deps: `currentUser.role`, `t`, `activePendingRequestsCount`).
- **B3** — El punto de estado de conexión del avatar en `Header.tsx`
  comunicaba "en línea"/"reconectando" solo por color + `title` (hover de
  mouse, no descubrible por gesto táctil ni lector de pantalla). El
  estado ahora forma parte del `aria-label` del botón de avatar.
- **B9** — `triggerNotification` era un *no-op* explícito (`src/lib/
  api.ts`) que `NotificationsView.tsx` seguía `await`-eando como si
  hiciera algo real. Eliminada la función y su único call site/import
  (código muerto y engañoso, sin cambio de comportamiento real ya que no
  hacía nada).

No se tocó `src/lib/supabase.ts`, no se introdujo ningún modal, no se
tocaron claves de i18n (permanece en paridad, sin huecos), y no se creó
ninguna skill/subagente nueva porque los 4 gaps identificados por la
última auditoría (`i18n-parity-guardian`, `supabase-persistence-guardian`,
`performance-budget-auditor`, `async-error-handling-guardian`) ya existían
en `.claude/skills/` y `.claude/agents/` desde el ciclo anterior — no se
detectó ningún gap nuevo esta pasada.

Quedan diferidos, sin cambios respecto a lo ya documentado (mismo motivo:
mayor riesgo/alcance que el presupuesto de un ciclo incremental): el
refactor completo de M2 (formulario de producto triplicado en
`AdminCatalog.tsx`), M6 (virtualización de `NotificationsView`), y el
resto de hallazgos Bajos de arquitectura/naming (`B5`, `B6`, `B8`,
asimetría CRUD de Restaurantes/Proveedores, números mágicos).

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio**, chunk principal 308.95 kB / 86.16 kB
  gzip (sin cambio material — este ciclo no tocó nada que afecte al
  bundle).
- i18n: **379/379 claves** en ambos idiomas (verificado por extracción
  programática), sin huecos — este ciclo no añadió ni quitó ninguna
  clave.
- Cero modales nuevos, fallback público de Supabase sin tocar,
  funcionalidad existente sin regresión (tabs, tema/idioma, campana→
  Notificaciones, avatar→Cuenta, Modo Compra, CRUD de catálogo, checklist
  con envío, badges).

---

## Ciclo — respuesta a `AUDITORIA_RESULTADOS.md` (auditado `cfdd27d`, VEREDICTO: CON HALLAZGOS)

Este ciclo implementó la lista de mejoras priorizadas de la auditoría de
2026-08-01 08:20 UTC sobre `cfdd27d`, que encontró 2 Críticos nuevos (ambos
introducidos por los propios commits correctores del ciclo previo), 9 Altos
y una familia de Medios/Bajos.

### 🔴 Crítico

1. **C1 — Crash de React en cada login/logout (Rules of Hooks).** El
   `useMemo` de `currentNavTabs` en `App.tsx` estaba declarado después del
   `return` condicional que muestra `LoginScreen` cuando no hay sesión. Se
   movió (junto con `activePendingRequestsCount`, del que depende) por
   encima de ese `return`, usando `currentUser?.role` para tolerar que
   `currentUser` aún sea `null` en ese punto. Verificado con `tsc`/`build`
   (que no detectan este tipo de bug — es un invariante de runtime) y
   revisando manualmente que el orden/cantidad de hooks ya no cambia entre
   el render sin sesión y el render con sesión.
2. **C2 — Pérdida de datos del Checklist Diario al cambiar de restaurante
   sin cambiar de pestaña.** `<DailyChecklist>` en `App.tsx` no tenía
   `key={selectedRestaurant.id}`, así que cambiar de local desde el selector
   del Header (sin cambiar de tab) no remontaba el componente: sus
   `useState` no releían el draft del nuevo restaurante, y el efecto de
   persistencia sobrescribía el `localStorage` del restaurante nuevo con
   estado obsoleto del anterior. Se añadió `key={selectedRestaurant.id}`
   para forzar el remount (reutiliza el mismo mecanismo de persistencia ya
   probado para el cambio de pestaña).

### 🟠 Alto (9/9 cerrados)

3. **A1 —** `flex-wrap` en el grupo interno de acciones del footer de
   `RequestsList.tsx` + `whitespace-nowrap` en `chipBtn`, para que los CTAs
   no partan el texto a media palabra en viewports estrechos con 2 acciones
   simultáneas.
4. **A2 —** Badge "URGENTE" de `RequestsList.tsx` pasado al mismo
   tratamiento sólido que el badge OVERDUE (`background: var(--sf-rose)` +
   `color: var(--sf-accent-contrast)`), cerrando el fallo de contraste AA en
   tema oscuro.
5. **A3 —** Regla global `@media (prefers-reduced-motion: reduce)` en
   `index.css` que neutraliza `.animate-fadeIn`/`.sf-pop`/`.animate-pulse` y
   fuerza `transition-duration` casi a cero para cualquier elemento — cubre
   de una vez el badge OVERDUE, las transiciones inline de `LoginScreen.tsx`
   y cualquier animación CSS futura sin tener que tocar cada componente.
6. **A4 —** El conteo pendiente ahora forma parte del `aria-label` del botón
   de notificaciones de `Header.tsx` y de cada tab de `BottomNav.tsx`
   (antes el `aria-label` del contenedor ocultaba el número al lector de
   pantalla).
7. **A5 —** Texto de rol y las iniciales del avatar de `LoginScreen.tsx` ya
   no reutilizan el mismo hue de baja opacidad que su propio fondo tintado
   (fallaba AA en tema claro para cocinero/comprador); ahora usan
   `var(--sf-text)`/`var(--sf-text-muted)`, de contraste garantizado en
   ambos temas, y el fondo/borde tintado sigue comunicando el color por rol.
8. **A6 —** Los 2 drawers (vista previa de pedido y nota) de
   `DailyChecklist.tsx` se movieron después de la barra principal en el
   JSX (antes en DOM); `flex-col-reverse` en el contenedor restaura el
   apilamiento visual esperado (drawers arriba, barra abajo) sin acoplar
   orden de tabulación a orden visual — un usuario de teclado ahora sí
   llega al textarea de la nota tabulando hacia adelante desde su botón.
9. **A7 —** `itemsNeedingReplenishment` de `DailyChecklist.tsx` ahora filtra
   por `p.active`, igual que `activeProducts`/`filteredProducts` — el badge
   "bajo mínimo" y el drawer de vista previa ya no cuentan productos
   desactivados que de todos modos `submitDailyChecklist`/el fallback local
   ya excluían del envío real.
10. **A8 —** Nuevo helper `formatRestaurantType(type, t)` en
    `formatters.ts` (mismo patrón que `formatCategoryName`), usado en el
    badge de tarjeta de restaurante y en el `<select>` de filtro de
    productos de `AdminCatalog.tsx` — cierra los 2 sitios donde `r.type`
    seguía mostrándose sin traducir.
11. **A9 —** Los 6 botones Cancelar/Guardar de los 3 formularios de
    producto/restaurante de `AdminCatalog.tsx` (alta inline, alta de
    restaurante, `EditCard`) subidos a `min-h-11`, consistente con el resto
    del archivo.

### 🟡 Medio (cerrados los de mayor impacto/menor riesgo)

12. **M5 —** `aria-expanded`/`aria-controls` en los botones "+N más"/"Ver
    detalles" de `RequestsList.tsx`, con un `id` real en el contenido
    expandido al que apuntan.
13. **M7 —** `ShoppingView.tsx` re-sincroniza `itemNotes[id]` desde
    `item.itemNote` (el valor autoritativo del servidor) justo al abrir el
    editor de nota, en vez de confiar solo en el estado capturado al montar
    — evita mostrar un borrador obsoleto si Realtime actualizó la nota
    desde otro dispositivo.
14. **M8 —** Chips de filtro de proveedor de `ShoppingView.tsx` subidos a
    `min-h-11`, consistentes con el resto de controles táctiles del archivo.
15. **M9 —** Nuevo token `--sf-brand-fg` (`#0c1a12`, verificado ≥4.5:1
    contra los 3 stops del degradado de marca) reemplaza el `color:
    '#ffffff'` hardcodeado del ícono `Flame` en `LoginScreen.tsx` y
    `Header.tsx`.
16. **M10 —** `Header`/`BottomNav` envueltos en `React.memo`; los callbacks
    que `App.tsx` les pasa (`onSelectRestaurant`, `onOpenNotifications`,
    `onOpenProfile`, `onChange` de tabs) ahora son `useCallback` de
    identidad estable, para que la memoización deje de anularse por
    props nuevas en cada render de `App`.
17. **M11/M12/M13 —** Familia de defectos de la barra fija de
    `DailyChecklist.tsx` cerrada por completo: `summaryBarH` ahora se lee
    de forma síncrona (`el.offsetHeight`) dentro del mismo
    `useLayoutEffect` que arma el `ResizeObserver`, en vez de esperar solo
    a su callback asíncrono; la clave de fecha del draft (`draftKeyFor`)
    usa fecha calendario **local**, no UTC; `showOrderPreview` se añadió a
    `ChecklistDraft` y se persiste/restaura igual que el resto del draft.
18. **M15 —** `LoginScreen.handleSelect` ahora tiene `catch` explícito (no
    solo `finally`); los `localStorage.setItem` sueltos de `App.tsx`
    (idioma, ajustes de atraso) se movieron a los helpers ya existentes
    `persistJSON`/nuevo `safeSetItem`, ambos con `try/catch`, en vez de
    llamadas directas sin protección.
19. **M14 —** Guarda de exhaustividad en tiempo de compilación entre
    `PRODUCT_CATEGORIES` (`formatters.ts`) y el tipo `Category`
    (`types.ts`): si `Category` gana un miembro que falte en el array, el
    build ahora falla en vez de derivar en silencio.
20. **M17 —** `NotificationsView.tsx` escucha el evento `storage` para
    mantener `dismissedIds` sincronizado entre pestañas del mismo
    dispositivo.

### 🟢 Bajo

21. **B1 —** Footer "SupplyFlow V2 · Demo" de `LoginScreen.tsx` ahora pasa
    por `t.loginFooter` (clave nueva, añadida en paridad ES/EN).
22. **B2 —** `title`/`aria-label` del botón de perfil de `Header.tsx`
    alineados (ambos comunican nombre + estado de conexión).
23. **B4 —** `LoginScreen.handleSelect` ahora dispara `playAlertSound`,
    igual que el resto del shell.
24. **B9 —** `readDraft` de `DailyChecklist.tsx` valida la forma del JSON
    parseado en runtime antes de confiar en él (evita que un draft
    corrupto/de un esquema anterior haga fallar `new Set(...)`).
25. **B10 —** Separador decorativo `•` de `DailyChecklist.tsx` marcado
    `aria-hidden="true"`.
26. **B12 —** `FILTERS` de `RequestsList.tsx` envuelto en `useMemo`.

### Skills/subagentes nuevos

Los 2 gaps que esta auditoría identificó (ninguno cubierto por los 12
pares existentes) porque ninguno auditaba el flujo de renderizado
condicional de React ni la relación prop→estado-persistido entre
componentes padre-hijo:

- **`react-hooks-invariant-guardian`** (skill + subagente) — checklist para
  detectar hooks declarados después de un `return` condicional o dentro de
  un bloque condicional, exactamente la clase de bug de C1. Documentado en
  `HERRAMIENTAS_IA.md`.
- **`stateful-prop-transition-guardian`** (skill + subagente) — checklist
  para verificar qué pasa con el estado local (persistido o no) de un
  componente cuando un prop identificador cambia sin desmontaje, exactamente
  la clase de bug de C2. Documentado en `HERRAMIENTAS_IA.md`.

### Diferido deliberadamente (fuera de alcance seguro de este ciclo)

M1–M3 (refactor mayor del formulario triplicado / doble render móvil-desktop
de `AdminCatalog.tsx` / asimetría CRUD sin documentar), M4 (filtrar el canal
Realtime de `App.tsx` por restaurante/usuario — cambio arquitectónico de
mayor alcance que un ciclo incremental), M6 (duplicación de 3 branches en
`Dashboard.tsx`), M16 (virtualización de listas), B3 (patrón
`listbox`/`menu` real para el popover de Header), B5/B6/B7 (objetivos
táctiles por debajo de 44px pero sobre el mínimo WCAG de 24px), B8 (tipo
`React.FormEvent` sin `<form>` real en `DailyChecklist.tsx`), B11
(`document.querySelector('nav')` frágil). Ninguno es Crítico ni Alto; quedan
para un ciclo dedicado a arquitectura/refactor mayor, tal como los ciclos
anteriores vienen documentando.

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio**, chunk principal ~309.6 kB / 86.35 kB
  gzip (variación mínima esperada por los cambios de este ciclo, sin aviso
  de tamaño de Vite).
- i18n: **380/380 claves** en ambos idiomas (verificado por extracción
  programática), sin huecos — se añadió `loginFooter` en paridad ES/EN.
- Cero modales nuevos, fallback público de Supabase sin tocar, cero clases
  dark-only nuevas, funcionalidad existente sin regresión (tabs,
  tema/idioma persistido, campana→Notificaciones, avatar→Cuenta, Modo
  Compra, alta/edición de productos/locales, checklist con envío, badges).
- Verificación manual dirigida de los 2 Críticos: login desde cero
  (`localStorage` limpio) y logout ya no requieren la rama de hooks
  cambiante que causaba el crash; cambiar de restaurante desde el selector
  del Header mientras la pestaña Checklist está abierta ahora remonta el
  componente (mismo mecanismo de persistencia ya verificado para cambio de
  pestaña) en vez de sobrescribir el draft del restaurante de destino.

## Ciclo — respuesta a `AUDITORIA_RESULTADOS.md` (auditado `b38034d`, VEREDICTO: CON HALLAZGOS, 2026-08-01 12:17 UTC)

Este ciclo implementó la lista de mejoras priorizadas de la sección (e) de
esa auditoría: 3 Altos nuevos (A1–A3, ninguno introducido por el ciclo
anterior — deuda preexistente que ninguna pasada anterior había detectado),
los 6 Medios nuevos con recomendación de una línea/patrón conocido (M1–M5,
M7–M8), y una selección de Bajos por relación esfuerzo/impacto. M6
(indicadores de tendencia en Dashboard) se difiere explícitamente, tal como
recomendaba la propia auditoría (requiere decidir fuente de datos
históricos, no es un fix de una línea).

### 🟠 Alto (3/3 cerrados)

1. **A1 — Fuga de datos entre usuarios en `DailyChecklist` en dispositivo
   compartido.** `ChecklistDraft` ahora incluye `authorId`/`authorName`/
   `savedAt`. La clave de `localStorage` se mantiene por restaurante+fecha
   (no +usuario) a propósito — el traspaso de turno dentro del mismo
   restaurante/día es el flujo real de esta app — pero cuando el draft
   cargado fue guardado por otro usuario se muestra un banner visible
   ("Retomando borrador sin enviar de {nombre}, {hace X min}") con dos
   acciones: continuar (usar el borrador tal cual) o descartar y empezar de
   nuevo (limpia el draft y resetea lecturas/notas/urgencia a los valores
   por defecto). El mismo patrón de sincronización entre pestañas (`storage`
   event, ver M2) también actualiza el banner si otra pestaña/usuario
   sobrescribe el draft mientras esta pestaña sigue abierta.
2. **A2 — Formularios de `AdminCatalog.tsx` sin asociación programática
   `<label>`↔control.** Los 17 `<label>` del archivo (alta inline de
   producto, alta de restaurante, `EditCard` por fila, panel de tiempos de
   atraso) ahora tienen pares `htmlFor`/`id` coincidentes — `id`s por
   producto (`admin-edit-name-${p.id}`, etc.) en `EditCard` para evitar
   colisión si en el futuro se editara más de un producto a la vez.
3. **A3 — Campos de `AccountView.tsx` dependientes solo de `placeholder`.**
   El componente `Field` ahora recibe un `id` y renderiza un
   `<label htmlFor> sr-only` con el mismo texto que el `placeholder` —
   nombre accesible que sobrevive a que el usuario escriba, en los 3 campos
   de perfil (Nombre/Email/Teléfono).

### 🟡 Medio (6/6 cerrados)

4. **M1 —** `playAlertSound(isUrgent ? 'urgent' : 'success')` en
   `DailyChecklist.handleSubmit` — el chime de alarma ya no suena en cada
   envío exitoso sin urgencia real.
5. **M2 —** `DailyChecklist.tsx` escucha el evento `storage` (mismo patrón
   que `NotificationsView.tsx`) para reconciliar el draft si otra
   pestaña/dispositivo del mismo restaurante/día lo sobrescribe — omite
   los ecos del propio guardado de este mismo usuario.
6. **M3/M4 —** Nuevo `formatUnitName(unit, t)` en `formatters.ts` (mismo
   patrón que `formatCategoryName`/`formatRestaurantType`), más 14 claves
   de traducción ES/EN para `UnitType`. Aplicado junto con
   `formatCategoryName` en **todos** los sitios que mostraban `category`/
   `unit` crudos, no solo los citados por la auditoría: `AdminCatalog.tsx`
   (badges móvil/desktop, ambas `<option>` de categoría y unidad × 3
   formularios), `ShoppingView.tsx`, `RequestsList.tsx` y
   `DailyChecklist.tsx` (estas 2 últimas tenían el mismo defecto sin haber
   sido citadas explícitamente por la auditoría, pero son la misma clase de
   bug — se corrigieron por consistencia con el mismo helper ya creado).
7. **M5 —** La sincronización de `html.classList`/`<meta name="theme-color">`
   de `App.tsx` se movió del cuerpo del render a un `useEffect([isLight])`
   declarado antes del `return` condicional de sesión (Rules of Hooks) —
   ya no se ejecuta en cada re-render disparado por Realtime.
8. **M7 —** `aria-controls` de los 2 triggers de "detalles" en
   `RequestsList.tsx` ahora es `undefined` mientras el panel está
   colapsado (y no desmontado en el DOM) — sin referencia colgante a un
   `id` inexistente en reposo.
9. **M8 —** Labels ocultos (`sr-only` + `htmlFor`/`id`) en los inputs de
   título/cuerpo de la notificación de prueba de `NotificationsView.tsx`
   (2 claves nuevas de traducción, paridad ES/EN).

### 🟢 Bajo (selección por esfuerzo/impacto)

10. **B1 —** `statusLabels` memoizado con `useMemo(() => getStatusLabels(t), [t])`
    en `RequestsList.tsx` y `Dashboard.tsx`, consistente con `FILTERS` (ya
    memoizado en ciclos previos).
11. **B2 —** Segundo separador decorativo de `DailyChecklist.tsx` (junto a
    "con nota") envuelto en `aria-hidden="true"`, cerrando el B10 del ciclo
    anterior que había quedado parcial.
12. **B3 —** `ViewFallback` de `App.tsx` ahora recibe `role="status"` +
    `aria-live="polite"` + texto `sr-only` (`t.loading`), igual que el
    patrón ya usado en `LoginScreen.tsx`.
13. **B5 —** `min-h-11` explícito + `whitespace-nowrap` en los botones/labels
    de `BottomNav.tsx`, como defensa si los tokens de padding cambian o el
    texto localizado crece.
14. **B9 —** Botón "Ocultar nota" de `DailyChecklist.tsx` con hit-area real
    de 44px (`min-h-11` + padding), antes del tamaño del propio texto.
15. **B11 —** `currentRestaurantProducts` de `App.tsx` envuelto en
    `useMemo([products, selectedRestaurantId])`.
16. **B12 —** `filteredProducts` de `AdminCatalog.tsx` envuelto en
    `useMemo`, consistente con el resto del archivo.
17. **B15 —** Nota de `ShoppingView.tsx` con `aria-label` distintivo por
    ítem (`"{placeholder} — {nombre del producto}"`), no solo el
    `placeholder` genérico compartido por todas las filas.

### Diferido deliberadamente (tal como recomendaba la auditoría)

M6 (indicadores de tendencia/delta en Dashboard — requiere decidir fuente de
datos históricos, ciclo dedicado), y la deuda de arquitectura mayor ya
documentada en ciclos previos sin cambios de prioridad: M1–M3 (formulario
triplicado/doble render de `AdminCatalog`), M4 (canal Realtime sin filtrar
por restaurante), M16 (virtualización de `NotificationsView`). Bajos no
tocados este ciclo por relación esfuerzo/impacto menor: B4 (patrón
`listbox` real en el popover de Header), B6/B7/B8 (tap targets residuales
específicos — "+N más" de `RequestsList`, truncamiento a 375px, botones de
tabla de escritorio de `AdminCatalog`), B10 (guardado duplicado idempotente
de nota en `ShoppingView`), B13 (try/catch en `handleSubmit` de
`DailyChecklist`, hoy latente porque el contrato actual siempre resuelve),
B14 (TTL de borradores abandonados), B16 (footer de `LoginScreen` con
mismo texto ES/EN — arquitectónicamente correcto, solo falta contenido
distinto).

### Skills fortalecidos (sin skills/subagentes nuevos)

La propia auditoría concluyó que los 14 pares existentes cubren el espacio
y que los 3 Altos nuevos eran evidencia de checklists incompletos, no de un
gap de especialización. Se fortalecieron `wcag-audit`, `i18n-parity-guardian`
y `stateful-prop-transition-guardian` con ítems de checklist explícitos —
detalle completo en `HERRAMIENTAS_IA.md`.

### Verificación

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio**, sin aviso de tamaño de Vite (chunk
  principal ~311.4 kB / 86.9 kB gzip, variación mínima esperada).
- i18n: **400/400 claves** en ambos idiomas (380 previas + 20 nuevas: 14 de
  `UnitType`, 4 del banner de traspaso de borrador, 2 de los inputs de
  notificación de prueba), verificado por extracción programática de ambos
  bloques `es`/`en`.
- Cero modales nuevos, cero clases dark-only (`bg-slate-*`/`text-white`/
  `text-slate-*`/`border-slate-*`) nuevas, cero `fixed inset-0` nuevos,
  fallback público de Supabase sin tocar, funcionalidad existente sin
  regresión (tabs, tema/idioma persistido, campana→Notificaciones,
  avatar→Cuenta, Modo Compra, alta/edición de productos/locales, checklist
  con envío y borrador multiusuario, badges).
