# SupplyFlow

Aplicación móvil primero para coordinar el abastecimiento de un grupo pequeño de restaurantes. La fuente de verdad operativa es Supabase; no se muestran datos demo si la conexión o el esquema no están disponibles.

## Arquitectura

- React, Vite y TypeScript estricto en el navegador.
- Supabase Auth para sesión; perfiles, organizaciones, locales y roles protegidos con RLS.
- Migraciones SQL versionadas en `supabase/migrations/`.
- Solicitudes creadas mediante RPC transaccional; sus artículos, compras parciales, conteos e historial son registros normalizados.
- Vercel publica únicamente Previews de la rama de trabajo. Nunca se debe usar una clave `service_role` en el cliente.

## Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Configura sólo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de un proyecto con las migraciones aplicadas.
3. Instala dependencias con `npm ci`.
4. Ejecuta `npm run dev`.

Verificación completa:

```powershell
npm run check
```

## Despliegue de staging

La rama `codex/supplyflow-production-foundation` usa el proyecto gratuito `supplyflow-staging`. En Vercel, las variables públicas deben limitarse a Preview y a esa rama. El URL de sitio y las Redirect URLs de Supabase Auth deben incluir el dominio de Preview; no deben apuntar a `localhost` fuera de desarrollo local.

## Operación y seguridad

- Administrador: administra catálogo, proveedores, locales y asignación de compradores dentro de su organización.
- Comprador: ve únicamente solicitudes autorizadas y registra compras parciales.
- Cocinero: crea solicitudes y registra conteos sólo en locales asignados.
- Las transiciones son: Pendiente → Asignada → En compra → Comprada → Entregada → Completada.

Antes de una Preview funcional, aplica las migraciones al proyecto de staging y ejecuta los asesores de seguridad de Supabase. Si una migración no se puede aplicar, la aplicación debe mostrar el error explícito y no volver a la demo.
