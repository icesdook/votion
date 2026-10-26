# Componentes

Base accesible: **shadcn/ui sobre Radix** (diálogos, popovers, menús, selects, tooltips, tabs) e íconos **Lucide** (ISC). Editor: **BlockNote**, con tema mapeado a los tokens.
Supuesto: sin capturas del original. Medidas tomadas de patrones comunes de editores de documentos, en una grilla de 4 px.
Todos los textos de la interfaz son propios y en español de Chile neutro ("tú").

Reglas generales:
- Foco visible en todo: anillo de 2 px `focus` con 2 px de separación, solo con `:focus-visible`.
- Áreas táctiles de mínimo 32 px en escritorio y 44 px en móvil.
- Movimiento con `--duration-fast/base`; con `prefers-reduced-motion` se desactivan las transiciones.
- Nada de hex en componentes: solo clases mapeadas a tokens.

---

```
Button
  variantes  primary (accent), secondary (surface-2 + border), ghost (transparente, hover), danger, icon (cuadrado)
  tamaños    sm 28px, md 32px, lg 40px (móvil: md 40px)
  estados    default, hover (hover / accent 8% más oscuro), active, focus-visible, disabled (50% opacidad, cursor not-allowed), loading (spinner + label oculto visualmente)
  tokens     radius md, texto sm/500, padding x 12px (md)
  a11y       <button> real; icon lleva aria-label; loading → aria-busy
  usado en   todas
```

```
Input
  variantes  text, email, search (ícono lupa), inline (sin borde, para títulos y renombrar)
  tamaños    md 32px, lg 40px
  estados    vacío (placeholder text-faint), foco (border accent + anillo), error (border danger + mensaje bajo el campo), disabled
  tokens     border-input, radius md, texto sm
  a11y       <label> asociado siempre (visible u oculto); error con aria-describedby + aria-invalid
  usado en   S01, S02, S15, S18, S19, S20-S22
```

```
Sidebar
  variantes  expandido (248px, redimensionable 200–420), colapsado (oculto, botón en topbar), móvil (drawer desde la izquierda con overlay)
  secciones  cabecera del espacio (nombre + menú), buscar, inicio, bandeja (badge), — favoritos —, — espacio (compartidas) —, — privadas —, — chat (canales, mensajes directos) —, papelera, ajustes
  tokens     bg surface, ítems texto sm, alto 28px, hover hover, activo surface-2 + texto text
  a11y       <nav aria-label="Principal">; secciones colapsables con aria-expanded
  usado en   S04
```

```
PageTreeItem
  variantes  hoja, con hijos (chevron), favorito, página de base de datos (ícono tabla)
  estados    normal, hover (muestra "+" y "…"), activo, arrastrando (fantasma 60%), destino de drop (línea accent o fondo accent-soft si es "dentro de"), renombrando (Input inline), cargando hijos
  a11y       role="treeitem" en un role="tree"; flechas ↑↓ navegan, → expande, ← colapsa, Enter abre, F2 renombra
  usado en   S04
```

```
Topbar
  contenido  breadcrumbs, presencia (avatares apilados), "Compartir", "Conversar" (abre chat lateral), comentarios, "…"
  alto       44px
  a11y       <header>; breadcrumbs en <nav aria-label="Ruta">
  usado en   S06, S10-S13
```

```
Editor (BlockNote)
  ancho      720px (normal), 1100px (ancho completo, opción por página)
  título     title/700, placeholder "Sin título"
  cuerpo     base/400, line 26px
  bloques    párrafo, H1/H2/H3, viñetas, numerada, checklist, toggle, cita (borde izquierdo 3px text), aviso (surface + emoji), divisor, código (mono, surface-2), imagen, archivo, enlace a página, tabla de tareas
  estados    vacío ("Escribe algo o presiona / para ver opciones"), editando, solo lectura (sin manijas, sin /), bloqueado por otro ("Ana está editando; puedes comentar"), sin permiso (pantalla vacía con mensaje)
  manija     ⋮⋮ al pasar sobre el bloque: arrastrar o abrir menú de bloque
  a11y       contenteditable con role="textbox" aria-multiline; atajos documentados en "?"
  usado en   S06, S13
```

```
SlashMenu
  ancho      320px, alto máx 360px con scroll
  ítem       ícono 20px en caja surface-2 + nombre sm/500 + descripción xs text-muted
  estados    filtrando (resalta coincidencia), sin resultados ("Nada con ese nombre"), seleccionado (hover)
  a11y       role="listbox"; ↑↓ Enter Esc; aria-activedescendant
  usado en   S07
```

```
Popover / Menu
  variantes  menú contextual, menú de bloque, compartir, selector de emoji, selector de fecha
  tokens     bg bg, shadow pop, radius lg, padding 4px; ítems 28px
  a11y       Radix: foco atrapado, Esc cierra, devuelve el foco al disparador
  usado en   S06, S09, S10
```

```
Dialog / Peek
  variantes  modal centrado (ajustes, confirmar borrado), peek lateral (fila de tarea abierta, 50% ancho, o pantalla completa en móvil), command palette (Ctrl/Cmd+K, 640px, arriba al 15%)
  estados    abriendo, abierto, cerrando
  a11y       role="dialog" aria-modal; foco al primer control; Esc cierra
  usado en   S13, S15, S18
```

```
Avatar
  variantes  imagen, iniciales (color derivado del id entre los tag-*), apilado (máx 4 + "+n")
  tamaños    20, 24, 32, 40px
  estados    en línea (punto success 8px con borde bg), ausente
  a11y       alt con el nombre; el punto de estado incluye texto oculto "en línea"
  usado en   S04, S09, S18, S20, S21, presencia
```

```
CommentThread
  variantes  inline (anclado a un bloque, resalta el texto con mention-bg), de página (arriba del contenido), en panel (S08)
  partes     autor + hora relativa, cuerpo con menciones, reacciones, input de respuesta, "Resolver"
  estados    abierto, resuelto (colapsado, texto text-muted, "Reabrir"), editando, borrado ("Comentario eliminado")
  a11y       <article> por comentario; botón Resolver con aria-label incluyendo el autor
  usado en   S06, S08, S13
```

```
Mention
  variantes  persona (@Nombre, bg mention-bg, texto on-mention), página (ícono + título subrayado al hover), fecha
  estados    normal, sin acceso ("Página sin acceso", texto text-muted), borrada (tachado)
  a11y       persona y página son enlaces; tooltip con correo o ruta
  usado en   editor, comentarios, chat
```

```
Tag (select / estado)
  colores    gray, blue, green, yellow, red, purple (pares tag-* verificados AA)
  tamaño     alto 20px, texto xs/500, radius sm, padding x 6px
  usado en   S10, S11, S13
```

```
DataTable
  partes     cabecera con ícono de tipo + nombre (menú: renombrar, tipo, ordenar, ocultar, borrar), filas de 34px, celda por tipo, "+ Nueva" al final
  celdas     texto, select/estado (Tag), persona (Avatar + nombre), fecha (formato "26 oct 2026"), checkbox, número (alineado a la derecha)
  estados    vacía ("Aún no hay tareas. Agrega la primera."), llena, filtrada sin resultados ("Ninguna tarea coincide con el filtro" + "Quitar filtros"), editando celda, cargando (filas esqueleto)
  a11y       role="grid"; flechas mueven entre celdas; Enter edita; Esc cancela
  usado en   S10
```

```
BoardColumn + BoardCard
  columna    ancho 272px, cabecera con Tag de estado + contador, "+ Nueva" al pie
  tarjeta    bg bg, shadow card, radius md, padding 10px; título sm/500 + propiedades visibles (persona, fecha)
  estados    normal, hover, arrastrando (rotación 2°, shadow pop), destino (columna con accent-soft)
  a11y       arrastre con teclado: espacio toma, flechas mueven, espacio suelta; anuncio con aria-live
  usado en   S11
```

```
CalendarGrid
  vista      mes; celdas con número del día, chips de tareas (máx 3 + "n más")
  estados    hoy (número en círculo accent), fuera de mes (text-faint), vacío
  a11y       role="grid" con días como gridcell; chips son botones
  usado en   S12
```

```
ChatMessage
  variantes  ajeno (avatar + nombre + hora), agrupado (mismo autor < 5 min: sin avatar), propio (igual que ajeno, alineado a la izquierda para leer fácil), sistema ("Ana se unió", text-muted xs)
  partes     cuerpo sm con menciones y enlaces a páginas (tarjeta de vista previa: ícono + título + ruta), reacciones, acciones al pasar (reaccionar, responder en hilo, convertir en tarea, editar, borrar)
  estados    enviando (opacidad 60%), enviado, editado ("(editado)" xs), error ("No se envió · Reintentar" en danger), borrado ("Mensaje eliminado")
  a11y       lista con role="log" aria-live="polite"; cada mensaje es <article> con autor y hora legibles
  usado en   S20, S21, S22
```

```
ChatComposer
  partes     textarea autoexpandible (máx 8 líneas), @ menciones, # o [[ para enlazar páginas, adjuntar, enviar
  estados    vacío ("Escribe a #general"), escribiendo, con adjunto, sin conexión ("Sin conexión: se enviará al reconectar")
  teclado    Enter envía, Shift+Enter nueva línea, ↑ edita el último mensaje propio
  a11y       <label> oculto "Mensaje para #canal"
  usado en   S20, S21, S22
```

```
UnreadBadge
  tokens     bg accent, texto on-accent xs/600, pill, mínimo 18px
  a11y       texto oculto "n sin leer"
  usado en   S04, S14, S20
```

```
Toast
  variantes  info, éxito, error, con acción (Deshacer)
  posición   abajo al centro; 4 s (8 s si tiene acción)
  a11y       role="status" (info/éxito), role="alert" (error)
  usado en   todas
```

```
EmptyState
  partes     ícono Lucide 32px text-faint, título sm/600, texto sm text-muted, acción primaria
  regla      cada lista y vista tiene uno, con un texto propio que diga qué hacer después
  usado en   S05, S10, S11, S12, S14, S16, S20, S21
```

```
Skeleton
  bg surface-2 con pulso suave (sin pulso con reduced-motion)
  usado en   cargas de sidebar, página, tabla y chat
```
