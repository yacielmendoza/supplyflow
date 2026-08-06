# SupplyFlow — puesta en marcha de Fase 1

## Variables de entorno

Configura en cada entorno (local, Preview y Production) únicamente:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_<public-key>
```

No incluyas `service_role`, claves secretas ni tokens administrativos en el frontend o en variables `VITE_*`.

## Migración local versionada

La migración `supabase/migrations/20260806065306_phase_1_identity_and_tenancy.sql` crea organizaciones, perfiles, locales, membresías por local y RLS. No se ha aplicado a ningún proyecto remoto.

Cuando se autorice explícitamente la aplicación remota, ejecuta la migración con credenciales administrativas fuera del navegador y verifica RLS con usuarios de cada rol antes de habilitar flujos operativos.

Cada cuenta nueva recibe un perfil sin organización ni rol. Un administrador de plataforma debe asignar `organization_id` y `role` de forma controlada antes de que la persona pueda entrar.

## Verificación

```powershell
npm run test
npm run lint
npm run build
npx supabase migration list --local
```

Un Preview de Vercel debe tener las dos variables públicas y una base con el esquema compatible. Si falta la configuración o el perfil no está aprovisionado, la app muestra un estado explícito y no carga datos demo.
