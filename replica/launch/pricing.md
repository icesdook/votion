# Precios

> Supuesto: precios en pesos chilenos más IVA (la mayoría de los clientes serán empresas). Valores de referencia en dólares con un tipo de cambio cercano a $890–900, sin confirmar para hoy: revísalo en el Banco Central antes de publicar.

## Lo que cobra la competencia (leído el 2026-10-26)

| producto | plan | USD por persona al mes (anual / mensual) | 10 personas al mes (anual) | fuente y fecha de verificación |
| --- | --- | --- | --- | --- |
| Notion | Plus | 12 / 16 | **USD 120** | [comparativa](https://tinycommand.com/blogs/notion-pricing-2026), verificada en notion.so/pricing en ago 2026 |
| Notion | Business | 18 / 22 | USD 180 | idem |
| Notion | IA (add-on) | +10 | +USD 100 | idem |
| Slack | Pro | 7,25 / 8,75 | USD 72,50 | [guía 2026](https://www.zenzap.co/blog-posts/slack-pricing-in-2026-complete-guide-what-it-really-costs-your-business) |
| ClickUp | Unlimited | 7 / 10 | USD 70 | [comparativa](https://tinycommand.com/blogs/clickup-pricing-2026), verificada en clickup.com/pricing en ago 2026 |

**Lo que paga hoy una oficina de 10 personas con documentos + chat** (Notion Plus + Slack Pro, anual): **unos USD 192 al mes** (unos $172.000), y sube con cada persona nueva.

## Lo que dicen las reseñas sobre precio y cobros (de `fixes.md`)

- Cobros, pruebas y cancelaciones: **9 reseñas, 8 de 1–2★**, en 2 fuentes. Cobros después de la prueba, después de borrar la cuenta, planes difíciles de cancelar, renovación anual poco clara.
- Precio que sube con el equipo o los invitados: **9 reseñas en 3 fuentes**.
- IA cara o metida a la fuerza: **11 reseñas en 2 fuentes**.

## El modelo

- **Precio fijo por oficina**, no por persona. Es el mensaje central: sumar a alguien no cambia la cuenta.
- **Prueba de 30 días sin tarjeta.** Al terminar, la oficina queda en modo solo lectura (nada se borra) hasta que alguien pague o exporte.
- **Anual = 2 meses gratis.**
- **Sin plan gratis para siempre.** Las reseñas castigan los planes gratuitos que después pasan a cobrarse ("scam"). Mejor una prueba honesta.
- **Sin IA obligatoria** ni cobro aparte por ella.

| plan | para quién | mensual + IVA | anual + IVA |
| --- | --- | --- | --- |
| **Dúo** | hasta 3 personas (consultas, estudios chicos) | $14.990 | $149.900 |
| **Oficina** ⭐ | hasta 10 personas | **$39.990** | $399.900 |
| **Oficina privada** | hasta 10 personas, en tu propio servidor o en uno dedicado en Chile, con soporte de instalación | desde $89.990 | a cotizar |

Comparación honesta: el plan Oficina cuesta unos USD 45 al mes contra unos USD 192 de Notion + Slack para 10 personas. Pero el chat de Telar todavía no tiene llamadas, integraciones ni apps nativas: la comparación vale para equipos que solo usan documentos, tareas y mensajes.

El plan **Oficina privada** sale de la evidencia de privacidad (15 reseñas sobre IA y datos) y de tu experiencia en seguridad. Es para estudios jurídicos, contables o de salud. Requiere el paquete Docker (`fixes.md`, arreglo F), así que no se vende hasta tenerlo.

## Arreglos de cobro dentro del producto (se construyen con la pasarela)

- [ ] Cancelar en **un clic** desde Ajustes → Plan, sin llamadas ni formularios.
- [ ] Correo **7 días antes** de cada renovación anual y **3 días antes** del fin de la prueba.
- [ ] Al cancelar, sigue funcionando hasta el fin del periodo pagado y después pasa a solo lectura. **Nunca se borra nada por falta de pago** (en las reseñas aparece pérdida de datos al vencer una suscripción).
- [ ] Exportar todo (páginas en Markdown, tareas en CSV) siempre disponible, también en solo lectura.
- [ ] Boleta o factura electrónica (SII) automática.
- [ ] El precio de la página de precios es el que se cobra (hay quejas por cobros mayores al precio mostrado).

## Productos y precios a crear en la pasarela

Los creas tú en la pasarela que elijas: Stripe si está disponible para tu empresa en Chile, o Flow / Mercado Pago (verifica cobros recurrentes y emisión de documentos tributarios).

| producto | precio | intervalo | id interno sugerido |
| --- | --- | --- | --- |
| Telar Dúo | $14.990 + IVA | mensual | `duo_monthly` |
| Telar Dúo | $149.900 + IVA | anual | `duo_yearly` |
| Telar Oficina | $39.990 + IVA | mensual | `office_monthly` |
| Telar Oficina | $399.900 + IVA | anual | `office_yearly` |

Primero en modo de prueba, igual que todo hasta replica-deploy.
