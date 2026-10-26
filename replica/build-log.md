# Build log

Datos: capa falsa en `src/data/fake/` (localStorage + BroadcastChannel entre pestañas), con las mismas funciones que tendrá el backend (`src/data/api.ts`). Las pantallas no cambian al conectar Supabase.
Prueba: 19 pasos de punta a punta en navegador sin cabeza + 8 capturas extra, 0 errores de consola. Tipos y lint limpios.
Modo demo: `NEXT_PUBLIC_DEMO=1` muestra en el login al equipo de ejemplo y "Reiniciar demo" en el menú.

| ID | fecha | estado | falta | más difícil de lo esperado |
| --- | --- | --- | --- | --- |
| S01 Login | 2026-10-26 | parcial | envío real del correo con el enlace | — |
| S02 Crear oficina | 2026-10-26 | listo | correo de invitación real | carrera: la redirección automática se saltaba el paso de invitar (corregido con un ref) |
| S03 Aceptar invitación | 2026-10-26 | listo | — | estados: válida, vencida, usada, otra cuenta, otra oficina, límite |
| S04 Shell | 2026-10-26 | listo | — | `useParams`/`usePathname` necesitan Suspense con Cache Components |
| S05 Inicio | 2026-10-26 | listo | — | se agregaron "mis tareas" y "conversaciones recientes" (no están en el original) |
| S06 Página | 2026-10-26 | listo | portada | bloqueo suave y reflejo de cambios remotos sin pisar lo que uno escribe |
| S07 Menú / | 2026-10-26 | listo | — | — |
| S08 Comentarios | 2026-10-26 | parcial | resaltar el texto comentado dentro del editor | los comentarios nativos de BlockNote exigen Yjs; se hizo un modelo propio anclado al bloque |
| S09 Compartir | 2026-10-26 | listo | — | herencia y "el acceso más amplio gana", igual que en SQL |
| S10 Tabla | 2026-10-26 | listo | — | — |
| S11 Tablero | 2026-10-26 | listo | — | alternativa por teclado al arrastre (menú "Mover a") |
| S12 Calendario | 2026-10-26 | listo | — | semana parte el lunes (Chile) |
| S13 Fila como página | 2026-10-26 | listo | — | — |
| S14 Bandeja | 2026-10-26 | listo | — | oculta avisos de cosas a las que ya no tienes acceso |
| S15 Búsqueda | 2026-10-26 | listo | — | búsqueda sin tildes (normalización NFD) |
| S16 Papelera | 2026-10-26 | listo | purga automática a 30 días (job) | — |
| S17 Historial | 2026-10-26 | parcial | vista previa con formato | — |
| S18 Ajustes | 2026-10-26 | listo | — | — |
| S19 Perfil | 2026-10-26 | parcial | foto de perfil (Storage) | — |
| S20 Canales | 2026-10-26 | listo | "escribiendo…" (Realtime) | cola local con `clientId` para no duplicar al reintentar |
| S21 Mensajes directos | 2026-10-26 | listo | estado en línea | — |
| S22 Chat de página | 2026-10-26 | listo | — | — |

Must: 24 listos, 4 parciales (correo del enlace mágico, correo de invitación, resaltado inline, tiempo real entre equipos). Tres de los cuatro los cierra replica-backend.
Should: 12 listos, 4 parciales, 2 pendientes. Could: 2 listos, 2 parciales, 5 pendientes.

Notas:
- `/design` queda como página de revisión del sistema de diseño (no enlazada desde la app).
- Fechas de tareas como `YYYY-MM-DD` sin hora, para evitar corrimientos por zona horaria.
