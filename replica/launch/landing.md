# Landing

Construida en `src/features/landing/landing.tsx` (ruta `/`). La app vive en `/w`. Pasa axe (sin problemas serios ni críticos) y no se desborda a 390 px. Colores 100% desde los tokens (0 fallas AA).

| sección | contenido | de dónde sale |
| --- | --- | --- |
| Hero | "Tu oficina, armada desde el primer minuto." + "Páginas, tareas y conversaciones del equipo en un solo lugar, en español…" + botón "Probar gratis 30 días" + captura real del tablero | ángulo recomendado (`fixes.md`, opción 1) |
| El problema | empiezan en blanco · la conversación vive en otra app · los cobros sorprenden | odio n.º 1 (curva, 42) y n.º 2 (cobros, 9 con 1–2★), parafraseados; el punto del chat es tu hipótesis, sin evidencia en las reseñas |
| Cómo funciona | crea tu oficina → invita (hasta 10, sin contraseñas) → trabajen y conversen | flujo central F01, F02, F08/F09 |
| Funciones | nada que armar · conversar donde está el trabajo · de mensaje a tarea · comentarios sobre el texto · permisos que se entienden · buscar | arreglos A y B primero; el resto es paridad |
| Precios | Dúo $14.990 · Oficina $39.990 · Oficina privada (próximamente), todo + IVA | `pricing.md` |
| Preguntas | tarjeta, más de 10, importar, IA, datos, cancelar | objeciones de las reseñas (IA, privacidad, cobros) |
| Llamado final | "Prueba Telar con tu equipo este mes." | — |

Sin prueba social: no hay testimonios, cifras de usuarios, estrellas ni logos de clientes, porque todavía no existen. La etiqueta del plan Oficina dice "Recomendado", no "la más elegida". Cuando tengas usuarios beta reales que den permiso, se agrega una sección con sus palabras.

**Promesas de la landing que todavía hay que construir antes de cobrar** (ver `launch-plan.md`): cancelación en un clic, aviso 7 días antes de renovar, modo solo lectura en vez de borrar, ayuda por chat en español, y el plan Oficina privada (marcado "Próximamente").

Páginas legales: `/privacidad` y `/terminos` son **borradores** marcados como tales. Debe revisarlos un abogado (Ley 19.628 / 21.719) antes de publicar.
