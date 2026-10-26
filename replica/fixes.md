# Qué arreglar y cómo posicionarse

**Muestra: 156 reseñas de 4 fuentes.** 82 de Capterra (sep 2025 – oct 2026), 20 de Trustpilot (jul–sep 2026; la nota general allí es 2,3/5 sobre 434 reseñas), 35 de App Store vía un agregador (sin fecha ni estrellas, se cuentan a la mitad) y 21 de un hilo de Hacker News de 2019 (antiguo, cuenta a la mitad). 95 tienen estrellas. 36 son solo positivas.

Límites, dicho claro:
- No pude leer Reddit ni Google Play desde aquí. Faltan voces de equipos chicos en foros.
- Capterra tiende a las 5 estrellas, Trustpilot a las quejas de cobro.
- La columna `text` de `reviews.csv` tiene **fragmentos textuales cortos** (menos de 15 palabras) con el enlace a la fuente. `summary` y `themes` son **mi resumen y mi codificación**, no citas. Ranking: misma fórmula que `reviews.py` (1★ pesa 1,0 … 5★ pesa 0,2; sin fecha o de más de 18 meses, la mitad).
- `feedback.md` es la salida automática de `reviews.py`. Con fragmentos tan cortos encuentra poco: el ranking de abajo usa la codificación manual.

## 1. Lo que odian

| # | problema | reseñas | fuentes | ejemplo |
| --- | --- | --- | --- | --- |
| 1 | Cuesta aprender, abruma, demasiado para lo simple | 32 (+6 "demasiadas opciones", +10 "armar todo toma tiempo") | 3 | ["overly complicated even for simple things"](https://www.capterra.com/p/186596/Notion/reviews/?rating=1) (2★) |
| 2 | Cobros, pruebas y cancelaciones poco claras | 9 (8 de 1–2★) | 2 | ["Terrible interface to manage plans and accounts."](https://fi.trustpilot.com/reviews/6a98f67348c60c8a6c111c1a) (1★) |
| 3 | Lento con páginas y bases grandes | 24 | 3 | ["Large databases slow down noticeably once you hit scale"](https://www.capterra.com/p/186596/Notion/reviews/?rating=1) |
| 4 | App móvil lenta o torpe | 27 | 3 | ["the mobile app sometimes displays frustrating loading delays"](https://www.capterra.com/p/186596/Notion/reviews/?rating=1) |
| 5 | Soporte lento o inalcanzable | 6 (5 de 1–2★) | 2 | ["No live chat support and it takes 1-3 days per email response."](https://fi.trustpilot.com/reviews/6aa7a4023c39e4b0b96dcea5) (2★) |
| 6 | IA empujada y cara; datos enviados a terceros | 11 IA + 4 privacidad | 2 + 2 | ["it's pivoted to AI"](https://www.capterra.com/p/186596/Notion/reviews/?page=4) |
| 7 | El precio sube con cada persona o invitado | 9 | 3 | ["the cost if you work on a team"](https://www.capterra.com/p/186596/Notion/reviews/?page=3) |
| 8 | Permisos confusos | 5 | 2 | ["clunky and lacks transparency"](https://www.capterra.com/p/186596/Notion/reviews/?rating=1) |

Débiles (menos de 3 reseñas o una sola fuente): login por código, accesibilidad (tamaño de letra), pérdida de datos (3, en 2 fuentes, pero grave cuando pasa).

## 2. Lo que falta

| # | pedido | reseñas | fuentes | ejemplo |
| --- | --- | --- | --- | --- |
| 1 | Modo sin conexión | 12 | 2 | ["there is no offline mode."](https://www.capterra.com/p/186596/Notion/reviews/?rating=1) |
| 2 | Gestión de tareas más sólida: cronograma, hora en eventos, avisos de plazo | 8 | 2 | ["lack of a built-in project timeline view."](https://www.capterra.com/p/186596/Notion/reviews/?page=4) |
| 3 | Encontrar cosas cuando hay muchas páginas | 6 | 2 | ["It can be difficult at times to find"](https://www.capterra.com/p/186596/Notion/reviews/?page=3) |
| 4 | Idioma (español, catalán, italiano) | 2 | 2 | **débil**: ["falten massa opcions i també el català"](https://fi.trustpilot.com/reviews/6a63ad4d8847bf8ee8cf6448) |

## 3. Lo que no resuelven (posicionamiento)

| trabajo o grupo ignorado | evidencia | qué tan sólida |
| --- | --- | --- |
| **Equipos chicos y poco técnicos** que no quieren armar su sistema desde una página en blanco | curva (32) + armado (10) + "blank page syndrome"; una reseña dice que a la gente poco técnica le costó adaptarse | sólida en el problema; débil en el grupo (pocas reseñas dicen "oficina chica") |
| **Oficinas que necesitan gestionar trabajo**, no solo notas | 8 reseñas: "no es el mejor software para gestionar equipos", "preferimos una herramienta dedicada" | media |
| **Conversación del equipo dentro de la herramienta** | **0 reseñas en la muestra lo piden.** Una sola menciona confusión sobre quién escribió cada nota | **sin evidencia**: es tu hipótesis. Valídala hablando con 5–10 oficinas antes de hacerla el titular |

## 4. Plan de arreglos

Evidencia × costo. Cada uno se agregó a `features.csv` con `original = no`.

| # | arreglo | tamaño | skill | evidencia |
| --- | --- | --- | --- | --- |
| A | **Oficina lista al crearla**: parte con Bienvenida, Tareas del equipo (tablero), Reuniones semanales y Manual, en vez de página en blanco | S | replica-build | curva 32 + armado 10, 3 fuentes |
| B | **Menú `/` corto**: los 8 bloques más usados primero y el resto en "Más bloques" | S | replica-build | demasiadas opciones 6, curva 32 |
| C | **Avisos de plazo**: aviso en la bandeja el día antes de la fecha de una tarea asignada | S | replica-backend (job) | tareas 8, 2 fuentes |
| D | **Precio plano por oficina, cancelar en un clic, aviso 7 días antes de renovar, sin cobro al terminar la prueba sin tarjeta** | S | replica-launch | cobros 9 (8 de 1–2★) + precio 9, 3 fuentes |
| E | **Ayuda humana en español dentro de la app** (canal #ayuda conectado al equipo del producto) | S | replica-launch / operación | soporte 6, 2 fuentes |
| F | **Sin IA a la fuerza y datos que no salen a terceros**; opción de alojarlo en tu propio servidor | S (mensaje) / M (paquete Docker) | replica-launch, replica-deploy | IA 11 + privacidad 4 |
| G | **App instalable (PWA) con lectura sin conexión** de páginas recientes y chat en cola | M | replica-build | sin conexión 12 + móvil 27 |
| H | **Rápido por diseño**: tope de 10 personas, tablas paginadas y una medición de rendimiento en las pruebas | S | replica-test | lentitud 24, 3 fuentes |

A y B se hacen ahora (son baratos y atacan el problema número uno). C entra cuando el backend esté conectado. D, E y F definen la etapa de lanzamiento.

## 5. El ángulo

**Opción 1, la recomendada:**
> Para oficinas de hasta 10 personas que encuentran las herramientas de documentos demasiado complicadas, [tu app] trae la oficina armada desde el primer minuto: páginas, tareas y conversación en un solo lugar, en español.
> Evidencia: curva de aprendizaje y armado, 42 reseñas en 3 fuentes.

**Opción 2:**
> Para equipos pequeños cansados de pagar más por cada persona y de cobros sorpresa, [tu app] cobra un precio fijo por oficina y se cancela en un clic.
> Evidencia: cobros y precio, 18 reseñas en 3 fuentes (casi todas de 1–2★).

**Opción 3:**
> Para oficinas que no quieren IA metida a la fuerza ni sus datos en servidores de terceros, [tu app] es simple, sin IA obligatoria y se puede alojar en tu propio servidor.
> Evidencia: IA y privacidad, 15 reseñas en 2 fuentes (más débil).

Recomiendo la **opción 1 como titular y la 2 como prueba en la página de precios**. La opción 3 encaja con tu experiencia en seguridad y puede ser un plan "alojado en tu servidor" para estudios jurídicos, contables o de salud. El chat interno va como el *cómo* ("y la conversación en el mismo lugar"), no como el *porqué*, hasta validarlo.

El nombre de la app no debe incluir ni parecerse al del original.
