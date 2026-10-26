# Plan de pruebas

Cómo correrlas:
- De punta a punta: `npx playwright test` (levanta la app en modo demo). Sin acceso a la descarga de Playwright, usa `CHROMIUM_PATH=/ruta/a/chromium`.
- Base de datos: `npm run test:db` contra un Postgres local (ver `scripts/test-db.sh`).

Cada prueba de navegador falla si hay errores de consola o respuestas 5xx. Las pantallas principales pasan un escaneo de accesibilidad con axe (sin problemas serios ni críticos), en claro y oscuro.

Leyenda: ✅ automatizada y pasando · 🗄️ cubierta en la prueba de base de datos · 📝 manual (pendiente con el backend real)

## F01 Crear la oficina e invitar
| ID | caso | estado |
| --- | --- | --- |
| F01-H1 | persona nueva entra por enlace, crea oficina, invita y llega a su espacio | ✅ |
| F01-E1 | correo mal escrito en invitaciones se rechaza con motivo | ✅ |
| F01-E2 | sin nombre de oficina no avanza | ✅ |
| F01-E3 | nombre de oficina tope 80 caracteres | ✅ |
| F01-E4 | tildes y emoji en el nombre | ✅ |
| F01-N1 | no se puede pasar de 10 personas (cuenta invitaciones pendientes) | ✅ 🗄️ |
| F01-N2 | un miembro común no puede invitar | ✅ 🗄️ |
| F01-M1 | el correo de invitación llega y su enlace funciona | 📝 |

## F02 Unirse por invitación
| ID | caso | estado |
| --- | --- | --- |
| F02-H1 | la invitada entra, se une y aparece en #general | ✅ 🗄️ |
| F02-E1 | una invitación usada no sirve dos veces | ✅ 🗄️ |
| F02-N1 | enlace inexistente | ✅ 🗄️ |
| F02-N2 | invitación para otro correo | ✅ 🗄️ |
| F02-N3 | invitación vencida | 🗄️ (estado `expired`) |

## F03 Crear y escribir una página
| ID | caso | estado |
| --- | --- | --- |
| F03-H1 | nueva página, título enfocado, Enter pasa al editor, se guarda | ✅ |
| F03-E1 | título tope 200 caracteres | ✅ |
| F03-E3 | recargar conserva título y contenido | ✅ |
| F03-E4 | dos personas: la segunda ve "X está editando" y recibe los cambios sin recargar | ✅ 🗄️ (bloqueo) |
| F03-E5 | texto de búsqueda y versión al editar | 🗄️ |
| F03-K1 | crear página y escribir solo con teclado | ✅ |

## F04 Organizar
| ID | caso | estado |
| --- | --- | --- |
| F04-H1 | subpágina, favorito, mover a Privado | ✅ |
| F04-N1 | mover una página dentro de su propia subpágina se rechaza | ✅ 🗄️ (trigger) |

## F05 Comentar y mencionar
| ID | caso | estado |
| --- | --- | --- |
| F05-H1 | comentario con @mención llega a la bandeja de la otra persona | ✅ 🗄️ |
| F05-H2 | responder, resolver, reabrir | ✅ 🗄️ (responder reabre) |
| F05-E1 | mencionar a alguien sin acceso: se avisa en la lista y no se le notifica | ✅ |

## F06 Compartir
| ID | caso | estado |
| --- | --- | --- |
| F06-H1 | privada invisible para otros; con "Puede ver" la lee pero no edita ni comenta | ✅ 🗄️ |

## F07 Tareas
| ID | caso | estado |
| --- | --- | --- |
| F07-H1 | nueva tarea en el tablero, asignada → aviso a la persona | ✅ 🗄️ |
| F07-E1 | filtro sin resultados y "Quitar filtros" | ✅ |
| F07-E2 | mover tarjeta con teclado (sin arrastrar) | ✅ |
| F07-E3 | crear tarea en un día del calendario | ✅ |
| F07-E4 | nombre larguísimo no rompe el ancho de la página | ✅ |

## F08 Chat
| ID | caso | estado |
| --- | --- | --- |
| F08-H1 | mensaje en #general aparece en otra pestaña sin recargar | ✅ |
| F08-E1 | Enter dos veces no duplica | ✅ |
| F08-E2 | sin conexión: queda en cola y se envía solo al volver, una sola vez | ✅ |
| F08-E3 | flecha arriba edita el último mensaje propio | ✅ |
| F08-N1 | un DM es invisible para una tercera persona (también en búsqueda) | ✅ 🗄️ |
| F08-E4 | dos DMs seguidos = un aviso | 🗄️ |
| F08-M1 | tiempo real entre dos computadores distintos | 📝 (Supabase Realtime) |

## F09 Conversación ↔ página
| ID | caso | estado |
| --- | --- | --- |
| F09-H1 | convertir mensaje en tarea y abrirla | ✅ 🗄️ |
| F09-H2 | conversar desde la propia página | ✅ 🗄️ |
| F09-E1 | enlace a una página privada se ve como "sin acceso" para quien no la ve | ✅ |

## F10 Búsqueda
| ID | caso | estado |
| --- | --- | --- |
| F10-H1 | Ctrl+K encuentra sin importar tildes | ✅ |
| F10-N1 | no muestra privadas ajenas | ✅ |

## F11 Recuperar
| ID | caso | estado |
| --- | --- | --- |
| F11-H1 | papelera: mover y restaurar con subpáginas | ✅ |
| F11-H2 | historial: restaurar versión anterior | ✅ |

## Transversales
| ID | caso | estado |
| --- | --- | --- |
| X-A11y | axe en 9 pantallas + modo oscuro | ✅ |
| X-Movil | 390 px: cajón, página, comentarios y chat sin desbordes | ✅ |
| X-Sesion | sesión vencida devuelve al login | 📝 (Supabase Auth) |
| X-Pagos | tarjeta rechazada | n/a (sin pagos en el MVP) |
