# Deploy: Telar

Fecha: 2026-10-26 · Commit: ver `git log -1` en `main` · Aprobación tuya: **todavía no**

## Veredicto: **no sale a producción todavía**

Tres bloqueantes, dos de ellos esperando tus cuentas:
1. **Faltan 2 *must*** (correo del enlace mágico y de invitación): necesitan Supabase y Resend conectados.
2. **Borrar la cuenta propia no existe.** Hoy se puede salir de una oficina, pero no eliminar la cuenta y sus datos. Lo exige la ley chilena de datos y Apple. Se construye junto con Supabase (Auth admin + `on delete cascade` del esquema).
3. **Privacidad y términos son borradores** sin revisión legal.

Lo que **sí se puede hacer ya**, con tu aprobación: una **demo pública** con datos de ejemplo en el navegador (`NEXT_PUBLIC_DEMO=1`), sin login real ni datos de nadie. Sirve para las entrevistas de validación del `launch-plan.md`.

## Preflight

| check | resultado |
| --- | --- |
| Pruebas de punta a punta | ✅ 49/49 (`npx playwright test`) |
| Pruebas de base de datos | ✅ 45/45 (`npm run test:db`) |
| Bugs S1 o S2 abiertos | ✅ ninguno (1 S3 abierto: casillas del editor sin etiqueta) |
| Paridad: *must* | ❌ 22 de 24 (los 2 que faltan son correos reales); puntaje 86,0 |
| Barrido de marca | ✅ limpio (exit 0) |
| Ficha de tienda | ✅ 0 errores, 0 advertencias (solo para cuando haya app) |
| Build de producción | ✅ pasa |
| `npm audit` | ✅ 0 vulnerabilidades |
| Privacidad y términos publicados, con proveedores | ⚠️ publicados como borrador y con proveedores listados; falta revisión legal |
| Borrar la cuenta propia | ❌ no existe |
| Favicon, títulos, imagen OG y correos propios | ✅ revisado a ojo |
| Cobros (si se cobra) | ❌ sin pasarela: solo bloquea si quieres cobrar desde el día 1 |

## Producción (cuando estén las claves)

| paso | quién | estado |
| --- | --- | --- |
| Proyecto Supabase **de producción** aparte (São Paulo), con respaldos diarios activos | tú | pendiente |
| Migraciones aplicadas por el deploy: `supabase db push` desde CI, no a mano | yo dejo el workflow | pendiente |
| pg_cron activado (Database → Extensions) para papelera y versiones | tú (un clic) | pendiente |
| Plantilla `supabase/templates/magic_link.html` en Auth → Email Templates | tú | pendiente |
| SMTP de Supabase apuntando a Resend, para que el enlace mágico salga de tu dominio | tú | pendiente |
| Variables en Vercel (Production) según `.env.example`, con `NEXT_PUBLIC_DATA=supabase` y `NEXT_PUBLIC_DEMO=0` | tú | pendiente |
| URLs de redirección de Auth: `https://[dominio]/auth/callback` | tú | pendiente |
| Pasarela de pago en modo real (cuando corresponda, ver `pricing.md`) | tú | pendiente |

## Hosting y dominio

**Vercel**, conectado a `icesdook/votion`: `main` despliega a producción y cada PR genera una URL de vista previa. Tú creas la cuenta e importas el repo.

Cuando compres el dominio (por ejemplo `telar.cl` en NIC Chile, si está libre):

| registro | nombre | valor |
| --- | --- | --- |
| A | `@` | la IP que muestra Vercel en *Domains* (hoy suele ser `76.76.21.21`; usa la que te muestre) |
| CNAME | `www` | `cname.vercel-dns.com` |
| TXT | según pida Vercel | valor de verificación |
| TXT (SPF) | `send` o el que indique Resend | el que entregue Resend |
| CNAME/TXT (DKIM) | `resend._domainkey` | el que entregue Resend |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@[dominio]` → pasar a `p=quarantine` cuando los reportes estén limpios |

Dominio canónico: el apex (`telar.cl`), con `www` redirigiendo a él. HTTPS automático en Vercel; hay que comprobarlo después.

## Vigilancia (primera semana)

- Errores: Sentry (plan gratis) en cliente y servidor.
- Disponibilidad: chequeo cada 5 minutos a `/` y a `/login` (Better Stack o UptimeRobot), con alerta a tu correo y teléfono.
- Analítica sin cookies (Plausible o la de Vercel), así no hace falta banner.
- Recorrido completo en el sitio real: crear oficina → invitar → la invitada entra desde **su teléfono** → página, comentario con @, tarea asignada, mensaje → tarea.
- Revisar a diario los logs de Supabase (Auth y Postgres) y los rebotes de Resend.

## Demo pública (se puede hacer ahora)

1. Importas el repo en Vercel.
2. Variables: `NEXT_PUBLIC_DATA=fake`, `NEXT_PUBLIC_DEMO=1`. No hacen falta claves.
3. Deploy. Queda en `https://[proyecto].vercel.app`, con el equipo de ejemplo en el login. Los datos viven en el navegador de cada visitante, no hay base de datos.
4. Ojo: cualquiera con el enlace ve la demo. No pongas datos reales ahí.
