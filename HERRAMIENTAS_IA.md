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
