# Paridad con el original

Fecha: 2026-10-26

## Veredicto: **todavía no se puede lanzar**

Faltan 2 *must*, y los dos son el envío real de correos: el enlace mágico para entrar y la invitación. Todo está construido y probado, pero no se puede activar sin las claves de Supabase y Resend (ver `backend.md`). No hay bugs S1 ni S2 abiertos.

Cuando estén las claves: **lanzable**. Con los arreglos de replica-entrepreneur: **mejor que el original**, que es la meta.

## Números

| | valor |
| --- | --- |
| Paridad de funciones | **86,0 / 100** (47 funciones contadas; *must* = 3, *should* = 2, *could* = 1, a medias = la mitad) |
| *Must* listos | 22 de 24 |
| Diseño (layout) | **no medido**: no hay capturas del original (el recon usó solo fuentes públicas en texto) |
| Pruebas | 46/46 de punta a punta, 41/41 de base de datos |
| Funciones propias que el original no tiene | 8, todas del chat interno (no suman a la paridad) |

### Por área, de más débil a más fuerte
| área | puntaje | qué falta |
| --- | --- | --- |
| tiempo real | 50 | coedición simultánea (hoy bloqueo suave) y presencia real |
| onboarding | 64 | correos reales; entrar con Google |
| plataforma | 67 | app nativa |
| páginas | 75 | portada, plantillas propias, historial con formato |
| colaboración | 89 | resumen por correo, mención de fecha |
| editor | 92 | subida de imágenes y archivos |
| base de datos | 94 | vistas cronograma, lista y galería |
| navegación, permisos, búsqueda, preferencias | 100 | — |

## Diseño

Sin capturas del original no hay puntaje de layout, y no lo invento. Si quieres medirlo, toma capturas de **tu propia cuenta** de Notion a 1440×900 de: barra lateral con una página abierta, una base de datos en tabla, el tablero y el panel de comentarios. Guárdalas como `replica/screens/S06.png`, `S10.png`, `S11.png` y `S08.png`, y se comparan con `imgdiff.py`. Igual no hay que perseguir el parecido visual: lo que importa es que haga el mismo trabajo, y el aspecto cambia con la marca propia.

## Comportamiento: original vs clon

| flujo | original | clon | decisión |
| --- | --- | --- | --- |
| Crear una página para el equipo | crear y luego elegir dónde (privada o teamspace) | "+" en *Oficina*: ya queda compartida, 1 clic | mantener (más simple) |
| Conversar con el equipo | no hay chat; comentarios o una app aparte | canales, DMs y chat al lado de cada página | mantener: es el diferenciador |
| Mensaje → tarea | no existe | "Convertir en tarea de…" desde el mensaje | mantener |
| Mencionar a alguien sin acceso | avisa y ofrece compartir | la lista lo marca "sin acceso" y no le avisa | **por mejorar**: ofrecer compartir en ese momento |
| Dos personas editando la misma página | edición simultánea | la segunda lee, comenta y ve los cambios en vivo, pero espera para editar | **por mejorar** (fase 2: Yjs) |
| Página borrada | papelera, 30 días | papelera, 30 días, restaura con subpáginas | igual |
| Límite de equipo | sin límite, cobra por persona | 10 personas por oficina | mantener (es el enfoque) |
| Precio para 10 personas | ~USD 120–160/mes (Plus) + IA aparte | por definir (replica-launch) | precio plano por oficina |
| Funcionamiento sin conexión | parcial | el chat guarda en cola y reenvía al volver | mantener |

## Lo que falta, en orden de construcción

1. **Conectar Supabase** (*must*): enlace mágico real, invitaciones por correo y tiempo real entre computadores. Bloqueado por tus claves.
2. **Subida de imágenes y archivos** (*should*, Storage).
3. **Presencia real** y "escribiendo…" (*should*, Realtime).
4. **Ofrecer compartir al mencionar a alguien sin acceso** (diferencia de comportamiento).
5. **Coedición simultánea con Yjs** (*should*): el área más débil, y la más cara de hacer.

Después: entrar con Google, resumen diario por correo, historial con formato, portada, vistas extra.
