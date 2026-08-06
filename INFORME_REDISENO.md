# Informe de revisión — Rediseño UI 2026 (rama `rediseno-ui-mobile`)

Fecha: 2026-07-31
Alcance: revisión exhaustiva del rediseño ya implementado (tokens de color, shell nativo, vistas a pantalla completa) buscando residuos de modales, colores hardcodeados dark-only, problemas de accesibilidad, huecos de i18n y consistencia visual entre tema claro/oscuro.

## Estado de verificación

- `npx tsc --noEmit`: **sin errores** (antes había 2 errores preexistentes en `src/lib/supabase.ts` por falta del tipo `vite/client`; se resolvió agregando `src/vite-env.d.ts`).
- `npm run build` (vite build + esbuild del server): **compila sin errores** en todos los commits de esta revisión.
- Paridad de claves de traducción ES/EN en `src/lib/translations.ts`: **334/334 claves**, sin huecos en ningún idioma.

## Qué se revisó

1. **Modales residuales** — se buscó `fixed inset-0`, overlays con backdrop, `role="dialog"`, etc. en todo `src/`. No se encontró ningún modal real; las únicas coincidencias de la palabra "Modal" son nombres de variables/comentarios heredados (`shoppingModalRequest`, comentarios que documentan qué modal reemplaza cada vista). Todo el flujo (Cuenta, Notificaciones, Modo Compra) es vista a pantalla completa con `ViewHeader` y botón atrás, tal como exige la regla clave del rediseño.
2. **Clases dark-only hardcodeadas** — se buscó `bg-slate-*`, `text-slate-*`, `border-slate-*`, `bg-gray-*`, `text-gray-*`, variantes `dark:` de Tailwind, y hex hardcodeados fuera de `var(--sf-*)`. Todo limpio: los únicos `text-white` restantes son texto blanco sobre chips/badges de color sólido (logo, badges de contador rosa) que funcionan igual en ambos temas por diseño, no fondos de superficie.
3. **Barra inferior fija (`BottomNav`)** — se verificó la altura real de la barra (~82px + safe-area) contra el `padding-bottom` del contenido principal en `App.tsx` (`calc(96px + safe-area)`), con margen cómodo. Las vistas con su propia barra de acción fija (`ShoppingView`) reservan `padding-bottom` propio suficiente para su barra. Las vistas de pantalla completa sin `BottomNav` (Cuenta, Notificaciones) no la necesitan.
4. **Espaciado / tamaños táctiles / radios** — se corrigieron los steppers +/- del checklist diario (36–40px → 44px) y los botones de editar/eliminar de las tarjetas móviles del catálogo admin (26px → 40–44px). El resto de la UI ya usaba objetivos táctiles de 44px o mayores.
5. **Accesibilidad**:
   - Se restauró el **foco visible de teclado** globalmente: varias pantallas usan `focus:outline-none` para su estilo de tarjeta/pill personalizado, lo que eliminaba el anillo de foco por defecto sin reemplazo. Se agregó una regla CSS global (sin `@layer`, para ganar por cascada a las utilidades de Tailwind) que aplica un `outline` visible en `:focus-visible` a inputs, selects, botones y enlaces.
   - Se agregaron `aria-label` a botones de solo ícono que no lo tenían (compartir por WhatsApp, cerrar formularios inline, editar/eliminar en la tabla de admin, marcar notificación como leída).
   - Se agregó `aria-pressed` a todos los grupos de botones tipo toggle/segmented control (filtros de solicitudes, filtros y categorías del checklist, pestañas de admin, tema/idioma en Cuenta, segmentos de Notificaciones, filtro de proveedor en Modo Compra).
6. **Responsive** — verificado uso consistente de `md:`/`sm:` para pasar de tarjetas móviles a tabla de escritorio (catálogo admin) y de grid de 1 a 2 columnas; sin hallazgos.
7. **Funcionalidad intacta** — navegación por tabs, Modo Compra, alta/edición de productos y locales, checklist con envío, badges de pendientes: sin cambios de lógica, solo de presentación/i18n/accesibilidad. Verificado por lectura de código y compilación exitosa (sin navegador disponible en este entorno).
8. **i18n** — se encontraron y corrigieron varios huecos reales donde el idioma inglés mostraba texto en español:
   - El panel de "Tiempos de Espera Máximos" (pestaña Admin → Tiempos) estaba **100% hardcodeado en español**, sin usar el objeto `t` en absoluto. Se le agregaron ~15 claves nuevas (ES/EN) y ahora está completamente traducido.
   - La etiqueta "ATRASADO" en las tarjetas de solicitud y en el panel de tiempos estaba hardcodeada; ahora usa `t.tagOverdue`.
   - `Dashboard.tsx` y `NotificationsView.tsx` mostraban el valor crudo del enum de estado (`Pendiente`, `Asignada`, etc., siempre en español) en vez de la etiqueta traducida — se corrigió con un mapeo a `t.pending/assigned/...`.
   - `LoginScreen.tsx` mostraba el slug crudo del rol (`cocinero`, `comprador`, `admin`) en vez de la etiqueta traducida.
   - `formatCategoryName()` devolvía nombres de categoría **siempre en español** sin importar el idioma activo (usado en los chips/filtros de categoría del checklist diario). Ahora recibe el objeto de traducciones y lee las 9 categorías desde `translations.ts`.
   - El prefijo "Tel:" en las tarjetas de restaurante/proveedor del catálogo admin estaba hardcodeado.
   - El botón "atrás" de `ViewHeader` tenía `aria-label="Atrás"` fijo; ahora recibe `backLabel` traducido desde cada vista que lo usa.

## Otros ajustes

- El `theme-color` de la PWA (barra de estado del navegador/OS) era un hex estático heredado del tema anterior al rediseño y no coincidía ni con el nuevo dark ni con el tema claro. Ahora `App.tsx` actualiza dinámicamente el meta tag según el tema activo del usuario, y los fallbacks estáticos (`index.html`, `manifest.json`) se alinearon al valor `--sf-bg` oscuro actual.

## Cosas que quedaron fuera de esta pasada (decisión deliberada, no bug)

- Los valores de "tipo de establecimiento" (`Food Truck` / `Restaurante` / `Cafe` / `Bistro`) y el código crudo de categoría de producto (`INGREDIENTS`, `SNACKS`, …) que se muestra en estilo monoespaciado en las tablas/tarjetas del catálogo admin son, a propósito, valores de datos con apariencia de "código", igual que en el resto del catálogo — no se tradujeron para mantener consistencia con ese patrón visual ya establecido.
- Los textos de las notificaciones push del sistema (`showLocalNotification` en `App.tsx`, p. ej. "🚨 NUEVA SOLICITUD #...") son anteriores al rediseño y no forman parte de las vistas migradas listadas en el encargo; no se tocaron para mantener el alcance acotado.
- La categoría `SUPPLIES` existe en el tipo `Category` y en `assignedCategories` de un usuario semilla, pero no aparece en la lista de categorías seleccionables del catálogo admin ni en el filtro del checklist — es un hueco de datos preexistente, no del rediseño visual.

## Qué requiere decisión humana

- No hay entorno de navegador en esta sesión, por lo que toda la verificación fue por lectura de código + `tsc`/`build`. Se recomienda una pasada visual rápida en dispositivo real (iOS y Android) para confirmar contraste y `safe-area` en notch/home-indicator antes de fusionar a `main`.
- Ninguna decisión de producto quedó pendiente; todos los cambios fueron correcciones de consistencia dentro del rediseño ya aprobado.

## Commits de esta revisión

```
093293a fix: add vite/client type reference to resolve import.meta.env errors
9bf63a5 fix(i18n): translate remaining hardcoded Spanish strings and status labels
f8e488a fix(a11y): restore visible keyboard focus ring and fix undersized touch targets
c0d54f1 fix(i18n): translate product category names in the Daily Checklist
cc58136 fix(a11y): add aria-pressed to toggle-style buttons
d4c009c fix: sync PWA theme-color meta tag with the active per-user theme
```
