# Herramientas de IA para el ciclo de mejora continua

Este documento registra qué herramientas de Claude Code (skills y subagentes)
existen en `.claude/` para este repo, por qué se crearon, y qué MCP se
recomienda evaluar a futuro (sin instalar nada que requiera autenticación
interactiva, imposible en un ciclo headless).

## Estado previo

Antes de este ciclo, `.claude/` solo contenía `launch.json` (configuración de
arranque del dev server). No existía ningún skill ni subagente propio del
proyecto — todo el trabajo de diseño/UX/accesibilidad se hacía "a mano" en
cada ciclo, sin una checklist reutilizable ni un rol delegable.

## Skills creados (`.claude/skills/<kebab-name>/SKILL.md`)

Cada skill es una checklist accionable y específica de este repo (no
genérica) que cualquier sesión de Claude Code puede invocar antes de dar por
terminada una pantalla. Todas incluyen frontmatter `name` + `description`
siguiendo la especificación oficial.

| Skill | Cuándo se dispara | Por qué se creó |
|---|---|---|
| `mobile-ux-review` | Antes de dar por lista una pantalla/flujo tocado | No existía checklist de UX propia del proyecto (feedback, reachability, empty states, cero modales) |
| `design-system-guardian` | Antes de mergear cualquier cambio de UI | El proyecto exige UN solo sistema de diseño por tokens; sin checklist es fácil que se cuele un color hardcodeado o una clase dark-only |
| `wcag-audit` | Cualquier cambio interactivo | Ya hubo 2 ciclos completos dedicados solo a cerrar hallazgos de accesibilidad (A1/M3/M5, luego el bug de `stopPropagation` en teclado) — merece una checklist fija, no reinventarla cada vez |
| `motion-microinteractions` | Al añadir/tocar animación con `motion` | El proyecto pide "animaciones fluidas y microinteracciones sutiles" con `prefers-reduced-motion" — sin guía se puede animar por decoración en vez de por estado |
| `design-token-architect` | Al necesitar un color/radio/sombra nuevo | El propio código ya mostró el patrón correcto (tokens por tema + `-contrast`) en el commit `b302d99`; documentarlo evita que un ciclo futuro vuelva a compartir un hue entre temas y falle contraste |
| `typography-color-system` | Auditoría de consistencia visual | Los 3 roles de color de texto (`--sf-text`/`-muted`/`-subtle`) y el uso de `tabular-nums` no estaban documentados en ningún sitio |
| `visual-qa` | Antes de cerrar un cambio de UI | El repo pide "prueba la funcionalidad en un navegador antes de reportar completo"; esto lo convierte en una rutina repetible con pasos concretos (ambos temas, ambos idiomas, viewport móvil) |
| `frontend-architecture-review` | Cambios estructurales / revisión de mantenibilidad | Este mismo ciclo encontró 3 patrones duplicados (`tint()` en 4 archivos, mapas de estado en 3 archivos) que una checklist de arquitectura habría detectado antes |
| `i18n-parity-guardian` | Cualquier cambio de copy / string nuevo en UI | Ninguna de las 8 skills anteriores cubre i18n; una auditoría (2026-08-01) encontró 3 strings sin traducir (M13) que una revisión de diseño/WCAG no detecta por diseño |
| `supabase-persistence-guardian` | Cambios a `src/lib/supabase.ts`/`api.ts` o a cualquier uso de `localStorage` | El proyecto tiene una regla dura ("nunca romper el fallback público de Supabase") y un patrón establecido de overrides en `localStorage` que ninguna skill verificaba explícitamente antes de esta |
| `performance-budget-auditor` | Tras `npm run build`, al añadir una pestaña/pantalla o dependencia nueva | El bundle sin code-splitting (M12) llevaba 5+ ciclos documentado sin dueño porque ninguna skill lo poseía como responsabilidad propia; ahora tiene un presupuesto explícito (≤500 kB) y quien lo audite |
| `async-error-handling-guardian` | Al añadir/editar un handler `async` conectado a un botón o `onSubmit` | Una auditoría (2026-08-01) encontró el mismo patrón —operación async sin `try/catch`, estado de carga que nunca se revierte, UI "atascada"— repetido en 3 pantallas independientes (M14); ninguna skill existente lo cubría |
| `react-hooks-invariant-guardian` | Al añadir/editar un hook en un componente que tiene un `return` condicional temprano | La auditoría de `cfdd27d` encontró un crash real de producción (Rules of Hooks violadas en `App.tsx:621`, un `useMemo` colocado después del `return` de `LoginScreen`) invisible tanto para `tsc` como para `npm run build` — ninguna skill existente revisaba la posición de los hooks respecto a returns condicionales |
| `stateful-prop-transition-guardian` | Al crear/tocar un componente con estado persistido (`localStorage`) inicializado desde un prop identificador (id de restaurante/usuario/fecha) | Misma auditoría: `DailyChecklist` perdía datos al cambiar de restaurante sin cambiar de pestaña (el componente no se remonta, sus `useState` no releen el draft nuevo, el efecto de persistencia sobrescribe el draft del restaurante nuevo con estado viejo) — la segunda vez en 2 ciclos que esta clase de bug reaparece por una puerta distinta; ninguna skill existente audita transiciones de props identificadores sin desmontaje |
| `cross-tab-sync-guardian` | Al añadir/tocar un `window.addEventListener('storage', ...)` que sincroniza estado de UI entre pestañas/dispositivos para la misma clave de `localStorage` | Auditoría 2026-08-05: el listener de `DailyChecklist` sobrescribía en silencio el tecleo activo de un usuario distinto en otra pestaña (A6) y no propagaba un borrado como señal de "ya enviado", permitiendo un pedido de compra duplicado real (A7) — una clase de bug distinta a la que cubre `stateful-prop-transition-guardian` (esa es intra-pestaña; esta es entre pestañas, con su propia semántica: no existe "eco de mi propio guardado" porque el evento `storage` nunca se dispara en la pestaña que escribió) |

## Subagentes creados (`.claude/agents/<name>.md`)

Un subagente por especialización, cada uno con `tools` acotado a lo que
realmente necesita (la mayoría son de solo lectura: `Glob`, `Grep`, `Read`,
y `Bash` solo cuando necesita correr `tsc`/`build`/dev server o calcular
contraste). Frontmatter `name` + `description` + `tools` según la
especificación oficial de subagentes.

| Subagente | Tools | Rol |
|---|---|---|
| `mobile-ux-reviewer` | Glob, Grep, Read, Bash | Revisión de UX de una pantalla/flujo |
| `design-system-guardian` | Glob, Grep, Read | Verifica uso exclusivo de tokens/clases `.sf-*` |
| `wcag-auditor` | Glob, Grep, Read, Bash | Auditoría WCAG 2.2 AA con cálculo real de contraste |
| `motion-reviewer` | Glob, Grep, Read | Revisión de animaciones/microinteracciones |
| `design-token-architect` | Glob, Grep, Read, **Edit** | Único subagente con permiso de escritura: añade/corrige tokens en `src/index.css` cuando se le pide implementar, no solo revisar |
| `typography-color-reviewer` | Glob, Grep, Read | Consistencia tipográfica y de roles de color |
| `visual-qa` | Glob, Grep, Read, Bash | QA visual real (dev server + navegador) en ambos temas/idiomas |
| `frontend-architecture-reviewer` | Glob, Grep, Read, Bash | Arquitectura de componentes, duplicación, rendimiento |
| `i18n-parity-guardian` | Glob, Grep, Read, Bash | Paridad de claves ES/EN + literales fuera de `t.xxx` |
| `supabase-persistence-guardian` | Glob, Grep, Read, Bash | Verifica que el fallback público de Supabase y el patrón de overrides de `localStorage` no se rompan |
| `performance-budget-auditor` | Glob, Grep, Read, Bash | Presupuesto de tamaño de bundle, code-splitting y memoización en rutas con Realtime |
| `async-error-handling-guardian` | Glob, Grep, Read, Bash | Verifica que toda operación async con estado de carga la revierta y muestre error en el `catch` |
| `react-hooks-invariant-guardian` | Glob, Grep, Read, Bash | Verifica que todo hook esté antes de cualquier `return` condicional y fuera de bloques condicionales (invariante de runtime que `tsc`/`build` no detectan) |
| `stateful-prop-transition-guardian` | Glob, Grep, Read, Bash | Verifica qué pasa con el estado local (persistido o no) de un componente cuando un prop identificador cambia sin desmontaje — `key={prop}` o efecto de re-sincronización explícito |
| `cross-tab-sync-guardian` | Glob, Grep, Read, Bash | Verifica listeners `window.addEventListener('storage', ...)`: distingue eco propio (inexistente) de escritura remota real, detecta sobrescritura de campos con foco activo, y que un `newValue === null` se trate como señal explícita de borrado/envío en vez de ignorarse |

Todos son de solo-lectura salvo `design-token-architect` (alcance
deliberadamente angosto: solo puede tocar el archivo de tokens, no
componentes). El resto reporta hallazgos file:line + severidad + fix
concreto para que el agente CORRECTOR del ciclo los implemente — así se
mantiene la separación auditor/corrector que ya usa este proyecto.

## MCP recomendados (NO instalados — requieren auth interactiva)

No se instaló ningún servidor MCP nuevo en este ciclo porque los candidatos
útiles para diseño/UX requieren autenticación interactiva, imposible en un
ciclo headless/autónomo. Quedan anotados aquí como recomendación para que un
humano los configure si se desea:

- **Figma MCP** — si el equipo llega a diseñar en Figma antes de implementar,
  permitiría a Claude Code leer specs/tokens directamente del archivo de
  diseño en vez de inferirlos del código existente. Requiere token de Figma.
- **Chrome DevTools / Playwright MCP** — automatizaría la parte de
  `visual-qa` (screenshots reales en ambos temas/viewports) sin depender de
  que el operador humano abra un navegador manualmente. El Playwright local
  ya está disponible vía Bash en este entorno (`/opt/pw-browsers/chromium`),
  así que el skill `visual-qa` puede usarlo directo sin MCP; un MCP dedicado
  solo aportaría screenshots estructurados/comparables entre corridas.
- **Vercel MCP** — dado que el proyecto ya tiene preview deploys en Vercel
  (`supplyflow-git-rediseno-ui-mobile-...`), un MCP de Vercel permitiría
  verificar el estado del deploy del PR sin salir de la sesión. Requiere
  token de cuenta de Vercel.

Ninguno de estos es necesario para el flujo actual (skills + subagentes +
`npm run dev`/Playwright local ya cubren el ciclo), se documentan solo como
mejora futura opcional.

## Ciclo corrector 2026-08-05 (contra `AUDITORIA_RESULTADOS.md`, commit `5b72904`)

No se creó ningún skill/subagente nuevo — la propia auditoría de este ciclo
concluyó que los 14 pares existentes ya cubren el espacio, y que los 3
hallazgos Altos nuevos (A1/A2/A3) eran evidencia de checklists incompletos en
skills ya existentes, no de un gap de especialización sin cubrir. Se
fortalecieron 3 `SKILL.md` con ítems de checklist explícitos y accionables:

| Skill fortalecido | Ítem añadido | Motivo (evidencia de esta auditoría) |
|---|---|---|
| `wcag-audit` | Ítem #9: todo `<input>`/`<select>`/`<textarea>` necesita nombre accesible programático (`htmlFor`/`id`, wrap, o `aria-label`) — proximidad visual y `placeholder` no bastan; revisar cada instancia repetida (formularios "add" inline, tarjetas de edición por fila), no solo la primera. | 17 `<label>` sin `htmlFor` en `AdminCatalog.tsx` (A2) + 3 campos de `AccountView.tsx` dependientes solo de `placeholder` (A3), tras 8+ ciclos de auditoría WCAG que no lo habían detectado explícitamente. |
| `i18n-parity-guardian` | Ítem #4 ampliado: todo valor de un tipo enumerado (`Category`, `UnitType`, tipo de restaurante, `RequestStatus`) mostrado en UI debe pasar por un `formatXxx(valor, t)`; la paridad de claves (#1) NO detecta este caso porque no falta ninguna clave. Enumerar TODOS los sitios donde el campo se renderiza crudo, no solo el primero. | Categorías/unidades sin traducir en `AdminCatalog.tsx`/`ShoppingView.tsx` (M3/M4) pese a 380/380 de paridad de claves; `formatUnitName` nuevo aplicado en 4 archivos distintos que mostraban `p.unit`/`item.unit` crudo. |
| `stateful-prop-transition-guardian` | Ítem #6: enumerar explícitamente TODAS las dimensiones de identidad en juego en esta app (restaurante + fecha + usuario actual) al auditar una clave de `localStorage`, no solo las que un ciclo anterior ya corrigió; una dimensión omitida a propósito solo es válida si el traspaso se hace explícito en la UI (banner + opción de descartar), no silencioso. | Fuga de datos entre usuarios en `DailyChecklist` (A1) — tercera variante del mismo bug (pestaña → restaurante → ahora usuario) que este skill fue creado para prevenir, pero cuyo alcance original no contemplaba la dimensión de usuario. |

Sin cambios en los MCP recomendados (siguen sin ser instalables en este
entorno headless).

## Ciclo corrector 2026-08-05 (segunda pasada, contra `AUDITORIA_RESULTADOS.md`, commit `ffa8e56`, VEREDICTO: CON HALLAZGOS)

Este ciclo sí encontró un gap de especialización real, no solo checklists
incompletas: `stateful-prop-transition-guardian` audita qué pasa con el
estado local de un componente cuando un *prop identificador* cambia sin
desmontaje (una clase de bug dentro de una misma pestaña). El hallazgo A6/A7
de esta auditoría — el listener `window.addEventListener('storage', ...)`
de `DailyChecklist` sobrescribiendo en silencio el tecleo activo de un
usuario distinto en otra pestaña, y no propagando un borrado como señal de
"ya enviado" — es una clase de bug distinta: sincronización *entre*
pestañas/dispositivos vía el evento `storage`, con su propia semántica (no
existe "eco de mi propio guardado" porque ese evento nunca se dispara en la
pestaña que escribió; un valor `null` es una señal, no una ausencia de
cambio). Ninguna de las 14 skills/subagentes existentes lo cubría como
responsabilidad propia, pese a ser ya la segunda implementación de este
patrón en el repo (`NotificationsView` lo usa también para `dismissedIds`).

| Skill/subagente nuevo | Cuándo se dispara | Por qué se creó |
|---|---|---|
| `cross-tab-sync-guardian` (`.claude/skills/cross-tab-sync-guardian/SKILL.md` + `.claude/agents/cross-tab-sync-guardian.md`, tools: Glob/Grep/Read/Bash, solo lectura) | Al añadir/tocar un `window.addEventListener('storage', ...)` que sincroniza estado de UI entre pestañas/dispositivos para la misma clave de `localStorage` | A6 (sobrescritura silenciosa de tecleo activo entre usuarios distintos) y A7 (borrado no propagado → riesgo de pedido de compra duplicado real) en `DailyChecklist.tsx:191-206`. El propio comentario del código que introdujo el bug describía mal la semántica del evento `storage` (asumía un "eco" que el navegador nunca dispara en la pestaña de origen) — exactamente el tipo de error de modelo mental que una checklist explícita previene. |

Correcciones aplicadas en el propio código en este ciclo (ver
`CORRECCIONES_APLICADAS.md` para el detalle línea por línea): el listener de
`DailyChecklist` ahora (1) usa `savedAt` para descartar entregas
duplicadas/fuera de orden en vez de filtrar por `authorId`, (2) no
sobrescribe el campo de nota ni el contador de stock que el usuario local
tiene enfocado en ese instante, (3) trata `e.newValue === null` como señal
explícita de "enviado/descartado en otro lugar" (bloquea el reenvío y avisa
en vez de ignorarlo), y (4) un flag de ref rompe el ciclo de reatribución de
autoría entre pestañas que el propio fix anterior había introducido.

Sin cambios en los MCP recomendados (siguen sin ser instalables en este
entorno headless) — se reitera que Playwright local (`/opt/pw-browsers/chromium`)
es la forma más directa de reproducir en un navegador real el escenario de
dos pestañas de A6/A7 en un ciclo futuro, sin necesidad de un MCP dedicado.

## Ciclo corrector 2026-08-05 (tercera pasada, contra `AUDITORIA_RESULTADOS.md`, sección (f))

Esta pasada fortaleció 3 `SKILL.md`/agentes ya existentes (la tercera vez
que se fortalece `cross-tab-sync-guardian` en concreto — el patrón de fondo
sigue siendo "el checklist correcto pero de alcance más angosto que la
clase de bug real") y creó **un** skill/subagente nuevo tras confirmar que
el gap es de especialización genuina, no de checklist incompleta de una
skill ya existente.

### Skills fortalecidos

| Skill fortalecido | Ítem(s) añadido(s) | Motivo (evidencia de esta auditoría) |
|---|---|---|
| `cross-tab-sync-guardian` (`.claude/skills/cross-tab-sync-guardian/SKILL.md` + `.claude/agents/cross-tab-sync-guardian.md`) | Ítem #9: un campo protegido solo por foco de DOM (`focusedFieldRef`) NO tiene la misma garantía que un campo protegido por ventana de recencia de interacción (`recentLocalChangeRef`) — el primero deja de proteger en cuanto el usuario hace `blur`, aunque la escritura de persistencia local todavía no se haya completado. Verificar explícitamente, para CADA campo del draft compartido, cuál de los dos mecanismos tiene, no solo si tiene alguno. Ítem #10: si la señal de orden es un contador monotónico local (`seq = lastKnownSeqRef.current + 1`), verificar explícitamente qué pasa cuando dos pestañas calculan el MISMO valor antes de observarse mutuamente (colisión de escritores concurrentes) — un contador sin desambiguador por escritor no es un orden total seguro, aunque ya no dependa del reloj de pared. | H1: `readings` en `DailyChecklist.tsx` tenía protección por foco desde antes de este ciclo, pero nunca recibió la misma protección de ventana de recencia que sí se dio a los otros 3 campos compartidos — el refuerzo del ciclo anterior preguntaba "¿tienen los N campos protección?" pero no distinguía QUÉ TIPO de protección basta para cada patrón de interacción (campo continuo con `blur` vs. control discreto). H2: el propio fix que reemplazó `Date.now()` por `seq` para cerrar un hallazgo de un ciclo anterior introdujo un hueco de colisión distinto, con el mismo síntoma final: pérdida silenciosa y permanente de datos. |
| `wcag-audit` (`.claude/skills/wcag-audit/SKILL.md` + `.claude/agents/wcag-auditor.md`) | Ítem #10: al migrar una instancia de un patrón de UI (p. ej. `aria-pressed`→`aria-current` para selección única) por un hallazgo reportado en UN archivo, buscar en TODO el repo la misma forma de interacción (grupo de botones mutuamente excluyentes) antes de dar el hallazgo por cerrado — no limitarse al archivo donde se reportó. | El mismo defecto se corrigió este ciclo en dos archivos (`AdminCatalog`/`NotificationsView`) pero reapareció, sin migrar, en otros dos archivos (`AccountView`, `ShoppingView`) con controles estructuralmente idénticos que nunca se revisaron con el mismo criterio. |
| `async-error-handling-guardian` (`.claude/skills/async-error-handling-guardian/SKILL.md` + `.claude/agents/async-error-handling-guardian.md`) | Ítem #7: todo handler async disparado por un control interactivo (botón `onClick`/`onBlur`) debe deshabilitar o bloquear ese control mientras su `await` está pendiente, no solo revertir el estado de carga en el bloque `catch` — un doble-toque en móvil (común con conexión lenta) puede disparar la misma mutación dos veces antes de que la primera respuesta actualice la UI. | Esta pasada encontró 3 handlers async de guardar/crear sin guard de doble-envío en un mismo componente de formulario admin, más un bug de guardado duplicado ya conocido en un componente de edición de notas de compra — la misma clase de bug repetible, hasta ahora sin detectar por ninguna skill existente. |

### Skill/subagente nuevo

| Skill/subagente nuevo | Cuándo se dispara | Por qué se creó (y por qué no es un duplicado) |
|---|---|---|
| `destructive-action-guardian` (`.claude/skills/destructive-action-guardian/SKILL.md` + `.claude/agents/destructive-action-guardian.md`, tools: Glob/Grep/Read, solo lectura) | Al añadir/tocar cualquier control que elimina, descarta, resetea o sobrescribe datos persistidos (botón de eliminar, banner "Descartar"/"Resetear", acción de vaciar) | Ninguna skill existente audita específicamente "¿esta acción destruye datos sin confirmación, y de quién son esos datos?": `mobile-ux-review` cubre feedback/reachability/empty-states y menciona preferir undo sobre confirmación, pero no tiene un chequeo dedicado de ámbito; `cross-tab-sync-guardian` cubre la mecánica de sincronización entre pestañas pero no el ÁMBITO de una acción de descarte. Esta pasada encontró dos instancias independientes de la misma clase de bug en archivos no relacionados dentro del mismo ciclo: eliminar un producto en `AdminCatalog` (catálogo admin) sin ningún paso de confirmación, y el banner "Descartar" de un borrador compartido (`DailyChecklist`) que borra el borrador COMPLETO para todas las pestañas/usuarios abiertos con un solo toque (no "descartar mi vista local"). Es evidencia de un gap de especialización real, no de una checklist incompleta de una skill ya existente — de ahí que se cree un par nuevo en vez de añadir un ítem a `mobile-ux-review` o `cross-tab-sync-guardian`. Checklist: (1) toda acción que borra/descarta/sobrescribe datos persistidos requiere confirmación (confirmación en dos toques en línea, sin popup/diálogo, según la regla de cero modales de este repo) o una ventana de deshacer; (2) para datos compartidos entre pestañas/dispositivos/usuarios, verificar explícitamente el ámbito REAL de la acción — "descartar mi vista" y "borrar el recurso compartido para todos" deben ser dos affordances distintas, nunca la misma etiqueta de botón. |

Sin cambios en los MCP recomendados (siguen sin ser instalables en este
entorno headless).
