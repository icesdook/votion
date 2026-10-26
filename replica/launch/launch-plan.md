# Plan de lanzamiento

## 0. Antes de mostrarlo a nadie (bloqueantes)
- [ ] Conectar Supabase y Resend (tus claves) → login real, invitaciones por correo y tiempo real entre computadores.
- [ ] Revisar el nombre: INAPI clases 9 y 42, `telar.cl`, redes (`brand.md`).
- [ ] Revisión legal de privacidad y términos.

## 1. Validar la hipótesis del chat (semanas 1–2)
Ninguna de las 156 reseñas pide chat interno. Antes de construir más sobre esa idea:
- [ ] Conversa con **10 oficinas de 3 a 10 personas** en Los Ángeles, Concepción y Chillán: estudios contables, jurídicos, corredoras de propiedades, constructoras, consultas. Pregunta qué usan hoy para documentos, tareas y chat, cuánto pagan y qué les molesta. **No muestres el producto hasta el final.**
- [ ] Si 6 de 10 usan WhatsApp como chat de trabajo y se quejan de perder cosas ahí, el chat es el ángulo. Si no, el ángulo sigue siendo "oficina armada + precio fijo".

## 2. Beta cerrada (semanas 3–6)
- [ ] Lista de espera en la landing: botón "Quiero probarlo" con correo, nombre de la oficina y tamaño.
- [ ] **Las primeras 10 oficinas a mano:** tú les creas la oficina, haces la primera sesión de 30 minutos con ellos y les escribes a la semana. Anota cada vez que alguien se pierde.
- [ ] Analítica respetuosa (Plausible o similar, sin cookies) y registro de errores (Sentry) antes de la beta.
- [ ] Métrica principal: **oficinas con 3 o más personas activas en la segunda semana**. Secundarias: tareas creadas desde mensajes y páginas editadas por más de una persona.

## 3. Cobros (antes de cobrar el primer peso)
- [ ] Pasarela en modo prueba con los 4 precios de `pricing.md`.
- [ ] Cancelar en un clic, aviso 7 días antes de renovar, aviso 3 días antes del fin de la prueba.
- [ ] Al vencer: solo lectura y exportar todo. Nunca borrar.
- [ ] Boleta o factura electrónica automática.
- [ ] Canal de ayuda en español dentro de la app (arreglo E), atendido por ti al principio.

## 4. Lanzamiento público
- [ ] **Dónde están los que buscan una alternativa:** grupos de pymes y emprendedores del Biobío, asociaciones gremiales locales (cámaras de comercio, colegios profesionales), comunidades de contadores y abogados en LinkedIn. Mensaje: "¿Tu equipo trabaja entre Word, WhatsApp y planillas? Arma tu oficina en 5 minutos."
- [ ] Publicación en Product Hunt o en una comunidad de desarrollo hispana, encabezada por el arreglo (la oficina nace armada, precio fijo), **sin nombrar al original** en títulos ni anuncios.
- [ ] Un artículo honesto: "Lo que aprendimos leyendo 156 reseñas de herramientas de documentos", con los temas y sin citar a nadie de forma que parezca testimonio.
- [ ] Compra Ágil / Mercado Público: oficinas municipales chicas como clientes de "Oficina privada", cuando exista.

## 5. Tiendas de apps (después, con la app instalable)
Ficha lista en `listing.json` (`listing.py`: 0 errores, 0 advertencias). Falta:
- [ ] Capturas en los tamaños vigentes de App Store Connect y Play Console, donde se vean los arreglos: la oficina armada, de mensaje a tarea, el precio fijo.
- [ ] Etiquetas de privacidad y formulario de seguridad de datos: correo, nombre y contenido del usuario; sin rastreo ni publicidad.
- [ ] URL de privacidad y soporte, clasificación por edad 4+, cuenta de demostración para quien revise la app.
- [ ] Guía 4.1 de Apple (copias): la marca propia, la plantilla de oficina y el chat integrado tienen que verse en las primeras capturas y en las primeras líneas.
