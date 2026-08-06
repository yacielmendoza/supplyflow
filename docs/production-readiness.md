# Preparación para producción

## Comprobaciones obligatorias

- Ejecutar `npm run check` localmente y verificar el workflow `Verify SupplyFlow` en GitHub Actions.
- Aplicar todas las migraciones versionadas a un proyecto de staging y ejecutar los asesores de seguridad y rendimiento de Supabase.
- Confirmar RLS en todas las tablas de `public` y verificar con tres cuentas: administrador, comprador y cocinero.
- Configurar en Supabase Auth el Site URL y Redirect URLs de Vercel. Los enlaces existentes que contengan `localhost` no se corrigen retroactivamente: se debe reenviar el correo.
- Configurar SMTP propio antes de producción; el correo integrado de Supabase es sólo para evaluación.
- Definir alertas de errores de cliente/servidor y una política de respaldo antes de atender operaciones reales.

## Riesgos abiertos

- La migración `20260806073953_phase_2_3_operational_workflows.sql` debe aplicarse y probarse en staging antes de que la Preview operativa pueda ser utilizada.
- La experiencia offline actual impide enviar cambios sin red y se actualiza mediante Realtime al reconectar; una cola durable de mutaciones requiere validación de conflicto con usuarios reales.
- El servidor Express y las fuentes demo permanecen en el repositorio como legado no montado. Sólo deben eliminarse después de la aceptación de las rutas persistentes equivalentes.
