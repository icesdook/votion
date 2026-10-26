# Backend

Estado: **la base de datos está lista y probada; falta conectar las pantallas a Supabase**, porque eso requiere un proyecto real con tus claves.

## Hecho

- `supabase/migrations/20261026000001_init.sql`: 20 tablas, RLS en todas, límite de 10 personas y bloqueo de ciclos de páginas como triggers.
- `supabase/migrations/20261026000002_server_logic.sql`:
  - Funciones del servidor (RPC, atómicas): `create_workspace`, `invite_members`, `get_invite` (pública), `accept_invite`, `open_dm`, `open_page_chat`, `create_channel`, `message_to_task`, `lock_page`, `unlock_page`.
  - Triggers: perfil al registrarse; avisos por mención (páginas, comentarios, chat), respuesta, DM (uno por hora por conversación) y tarea asignada, solo a quien tiene acceso; texto de búsqueda; versión de la página cada 10 min; enlace a página en mensajes; responder reabre el hilo.
  - Limpieza con pg_cron (si está habilitado): papelera a 30 días, recorte de versiones, bloqueos vencidos.
  - Lectura de lo recién creado (`INSERT ... RETURNING`), necesaria para `supabase-js`.
- `supabase/tests/` + `npm run test:db`: **41 comprobaciones** como usuarios reales con RLS (incluye un intruso que no ve nada y un miembro que no puede invitar). Encontraron y corrigieron 3 errores reales antes de llegar a producción.
- `src/server/email.ts`: correo de invitación y resumen diario por Resend, con HTML escapado; sin clave no envía y lo informa.
- `supabase/templates/magic_link.html`: plantilla propia para el enlace mágico.
- `.env.example` con todas las variables (claves nuevas `sb_publishable_` / `sb_secret_`).
- `npm audit`: 0 vulnerabilidades.

## Falta (necesita tus claves)

1. Cliente Supabase en `src/data/`: el mismo `api.ts`, pero leyendo con RLS, escribiendo con las RPC y escuchando cambios con Realtime. Se elige con `NEXT_PUBLIC_DATA=supabase`.
2. Sesión con cookies http-only (`@supabase/ssr`) y la ruta `/auth/callback` del enlace mágico.
3. Envío del correo de invitación al invitar, y job del resumen diario.
4. Subida de archivos e imágenes a Storage (bucket privado, 25 MB, URLs firmadas).
5. Presencia y "escribiendo…" con Realtime presence.
6. Inicio con Google (should): necesita tu app OAuth en Google Cloud. Solo pide `email` y `profile`, que no requieren verificación larga.

## Pagos

Fuera del MVP (ver `architecture.md`). Se decide en replica-launch: precio plano por oficina. La pasarela se elige según lo que esté disponible para tu empresa en Chile (Stripe, Flow o Mercado Pago). Cuando se agregue: checkout alojado por la pasarela, webhooks con firma verificada e idempotentes, estado de suscripción en la base de datos y cancelar en un clic.

## Checklist de seguridad

- [x] secretos solo en variables de entorno; `.env*` en `.gitignore` (excepto `.env.example`); la clave secreta no se usa en el cliente
- [ ] validación en el servidor con zod en cada server action (al conectar Supabase; la base ya valida tipos, largos y estados con `check`)
- [x] autorización en cada lectura y escritura (RLS), probada con una segunda persona y con alguien ajeno
- [ ] límite de intentos en login y en invitaciones (Supabase Auth trae límite para correos; agregar uno propio a `invite_members`)
- [n/a] webhooks con firma: sin pagos en el MVP
- [ ] subidas: tamaño y tipo limitados (la tabla `files` ya limita 25 MB), bucket privado
- [x] sin datos personales en URLs (solo ids) ni en logs
- [x] dependencias auditadas (`npm audit`: 0)
- [ ] política de privacidad con cada proveedor: Supabase, Vercel, Resend (en replica-launch)

## Cuentas que debes crear tú

| servicio | para qué | qué necesito de ti | costo de partida |
| --- | --- | --- | --- |
| Supabase | base de datos, login, tiempo real, archivos | crear el proyecto (región São Paulo, la más cercana a Chile) y pegar en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | plan gratuito para probar |
| Resend | correos de invitación y resumen | crear cuenta, verificar tu dominio, `RESEND_API_KEY` y `EMAIL_FROM` | plan gratuito para probar |
| Google Cloud (opcional) | entrar con Google | app OAuth con `email` y `profile`; client id y secret van en Supabase, no en el repo | gratis |
