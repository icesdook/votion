# Bugs

Resumen: 9 encontrados, 8 corregidos, 1 abierto (S3). Ningún S1 abierto.

| ID | sev | título | estado |
| --- | --- | --- | --- |
| BUG-001 | S2 | La lista de @menciones en comentarios queda escondida bajo la cabecera | corregido |
| BUG-002 | S2 | Sin conexión, el mensaje no se reenvía solo al volver la red | corregido |
| BUG-003 | S3 | Enter en el título no pasa al editor si este aún carga | corregido |
| BUG-004 | S1 | El parche de accesibilidad del editor congelaba la página (bucle con ProseMirror) | corregido (introducido y detectado en esta misma etapa) |
| BUG-005 | S3 | Las casillas de las listas no tienen etiqueta accesible | **abierto** |
| BUG-006 | S3 | Contraste insuficiente en texto chico (`text-faint`) | corregido |
| BUG-007 | S3 | Celdas de la tabla: nombre accesible distinto al texto visible; botón suelto dentro de la grilla | corregido |
| BUG-008 | S2 | Crear oficina se saltaba el paso de invitar (encontrado en replica-build) | corregido |
| BUG-009 | S1 | RLS: crear y leer de vuelta una página o canal fallaba; abrir un DM era imposible (encontrado en replica-backend) | corregido |

---

### BUG-001 — Menciones ocultas en comentarios (S2)
Pasos: abrir una página → Comentarios → escribir "@Mat".
Esperado: lista de personas visible y seleccionable.
Real: la lista se abría hacia arriba y quedaba recortada bajo la cabecera del panel; no se podía elegir a nadie.
Evidencia: captura de la prueba F05-E1.
Arreglo: el composer abre la lista hacia abajo si arriba hay menos de 280 px. Prueba: F05-H1, F05-E1.

### BUG-002 — Cola sin conexión no se reenvía (S2)
Pasos: chat → desconectar → enviar → reconectar.
Esperado: el mensaje se envía solo al volver la red, una vez.
Real: quedaba en "No se envió · Reintentar" hasta tocarlo.
Causa: el listener de `online` leía una lista de pendientes desactualizada.
Arreglo: la cola vive en una referencia; el listener se registra una vez. Prueba: F08-E2.

### BUG-003 — Enter en el título antes de que cargue el editor (S3)
Pasos: nueva página → escribir el título → Enter de inmediato → seguir escribiendo.
Real: lo escrito caía en el título ("Hecho con tecladoPrimera línea").
Arreglo: Enter suelta el foco del título y lo entrega al editor apenas aparece. Prueba: F03-K1 repetida 24 veces sin fallas.

### BUG-004 — Página congelada (S1, regresión propia)
Causa: poner `aria-label` a mano sobre la raíz del editor hacía que ProseMirror re-renderizara, y el observador lo volvía a poner, en bucle.
Arreglo: la etiqueta se pasa con la opción oficial `domAttributes` de BlockNote. Prueba: escaneo axe de S06 y toda la suite.

### BUG-005 — Casillas sin etiqueta (S3, abierto)
Las casillas de "lista de pendientes" las crea BlockNote por dentro sin `aria-label`. Etiquetarlas desde fuera dispara el mismo bucle que BUG-004.
Opciones: bloque de casilla propio (`createBlockSpec`) o aporte al proyecto BlockNote. Mientras tanto se excluyen del escaneo axe, con el motivo escrito en `e2e/fixtures.ts`.

### BUG-006 — Contraste de `text-faint` (S3)
3,3–3,6:1 en texto de 12 px (hace falta 4,5:1). Corregido en los tokens, no componente por componente: claro `#6c6962`, oscuro `#999792`. 28 combinaciones, 0 fallas AA.

### BUG-007 — Tabla accesible (S3)
Corregido: el nombre de cada celda es "Propiedad: valor visible", y "Nueva" queda fuera de la grilla.

## Por revisar (no reproducido)
- Con Supabase real: tiempo real entre computadores distintos, sesión vencida y entrega de correos (casos 📝 en `test-plan.md`).
- `page_access()` es recursiva por fila: medir con unas 5.000 páginas antes de lanzar.
