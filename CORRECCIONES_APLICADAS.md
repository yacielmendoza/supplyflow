# Correcciones aplicadas — ciclo de mejora continua

## Estado de partida

No existía `AUDITORIA_RESULTADOS.md` en la rama, así que este ciclo hizo su
propia auditoría rápida contra los criterios del sistema de diseño (cero
modales, cero clases dark-only hardcodeadas, `BottomNav` sin solaparse,
accesibilidad, responsive/safe-areas, i18n ES/EN) y contra `npx tsc --noEmit`
/ `npm run build`.

(Existe un `INFORME_AUDITORIA.md` en el repo, pero es una auditoría antigua
del backend en memoria de `server.ts` — no corresponde al rediseño de UI de
esta rama ni sustituye a `AUDITORIA_RESULTADOS.md`.)

## Hallazgos y correcciones (severidad Medio/Bajo)

1. **[Medio] Badges de notificación con color hardcodeado en vez de token.**
   `Header.tsx` y `BottomNav.tsx` usaban `bg-rose-500` para los badges de
   pendientes en lugar del token `--sf-rose` ya definido en `src/index.css`.
   Funcionalmente no rompía nada (mismo valor hoy), pero bypaseaba el sistema
   de tokens: un futuro ajuste de paleta en `--sf-rose` no se habría reflejado
   en estos dos badges. Corregido para leer `style={{ background:
   'var(--sf-rose)' }}` en ambos componentes.

2. **[Bajo] `aria-label` hardcodeado en español en el selector de restaurante.**
   `Header.tsx` tenía `aria-label="Restaurante"` fijo, ignorando el idioma
   del usuario — un usuario en inglés con lector de pantalla oía la etiqueta
   en español. Se añadió la clave `headerRestaurantSelector` a `es`/`en` en
   `src/lib/translations.ts` y el `aria-label` ahora usa `t.headerRestaurantSelector`.

## Verificaciones realizadas (sin defectos)

- Cero modales: no hay `fixed inset-0` en `src/`; `AccountView`,
  `NotificationsView`, `ShoppingView` son vistas de árbol completo, no overlays.
- `BottomNav` respeta `env(safe-area-inset-bottom)` vía `.safe-bottom`; el
  `<main>` scrollable reserva `calc(96px + env(safe-area-inset-bottom))` de
  padding inferior — sin solapamiento con barras de acción fijas.
- Accesibilidad: botones tipo toggle/tab revisados (tema, idioma, filtros,
  tabs de `AdminCatalog`) tienen `aria-pressed`/`aria-label`/`aria-current`.
- i18n: `translations.ts` tiene el mismo conjunto de claves en `es` y `en`
  (334 claves cada uno, sin diferencias) tras el cambio anterior.

## Estado final

- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: **build limpio** (vite build + esbuild server.ts OK).
