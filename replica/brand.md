# Marca

> Supuesto: elegí **Telar** como nombre de trabajo para seguir avanzando. Es tu decisión: si prefieres otro de la lista, cambiarlo es reemplazar el nombre y volver a correr el barrido.
> El repositorio se llama `votion`, que se parece demasiado al original en sonido y forma. Para el código da igual, pero no lo uses como nombre público. Puedes renombrar el repo en GitHub (Settings → Rename).

## 1. Nombre

Ángulo (de `fixes.md`): **la oficina armada desde el primer minuto, en español, con todo el trabajo y la conversación en un lugar.**

### 20 candidatos
| estilo | nombres |
| --- | --- |
| metáfora | **Telar**, Fogón, Quincho, Patio, Galpón, Nido |
| oficio y trabajo en común | **Minga**, **Faena**, Taller, Oficio, Pega |
| lugar y objeto | Mesón, Tablón, Pizarra, Bitácora |
| grupo | Colmena, Ronda, Juntas, Aldea, Lote |

### Filtro
| nombre | se queda | por qué |
| --- | --- | --- |
| **Telar** | ✅ recomendado | tejer páginas, tareas y conversación; corto, se escribe al oírlo; no suena ni se ve como el original |
| Fogón | ✅ | gente reunida alrededor; cálido; en México y otros países también es "cocina" (aceptable) |
| Minga | ✅ con riesgo | trabajo colectivo (Chiloé, Andes): el significado ideal, pero hay software llamado así y nombres parecidos en la categoría |
| Faena | ✅ con riesgo | "trabajo" en Chile, pero en España "¡qué faena!" es algo molesto |
| Taller | ✅ débil | claro, pero muy genérico: difícil de registrar como marca |
| Colmena | ❌ | significa lo mismo que una app de colaboración ya establecida (Hive), y hay una suite "Colmeia" en Brasil |
| Pega, Quincho | ❌ | chilenismos que no viajan |
| Pizarra, Bitácora, Tablón | ❌ | describen otra cosa (notas, bitácora) |

### Comprobaciones (filtro, no asesoría legal)
"Por correr" significa que nadie la hizo. Nunca se escribe "disponible" sin haberlo revisado.

| check | Telar | Fogón | Minga | Faena | Taller |
| --- | --- | --- | --- | --- | --- |
| Web: nombre + software de equipos (2026-10-26) | sin conflicto en la categoría | sin conflicto en la categoría | **"minga school"** (software educativo) y nombres parecidos (Mingdao, Ming.le) | sin conflicto en la categoría | — |
| **Chile: INAPI** (clases 9 y 42) — tramites.inapi.cl | por correr | por correr | por correr | por correr | por correr |
| EE.UU.: tmsearch.uspto.gov | por correr | por correr | por correr | por correr | por correr |
| UE: TMview / EUIPO | por correr | por correr | por correr | por correr | por correr |
| Global: WIPO Global Brand Database | por correr | por correr | por correr | por correr | por correr |
| Dominio `.cl`: nic.cl | por correr | por correr | por correr | por correr | por correr |
| Dominio `.com` / `.app` | por correr | por correr | por correr | por correr | por correr |
| App Store y Google Play: nombre exacto | por correr | por correr | por correr | por correr | por correr |
| Instagram, X, LinkedIn, GitHub | por correr | por correr | por correr | por correr | por correr |

Antes de gastar plata en el nombre (dominio, logo, registro en INAPI), conviene una búsqueda profesional con un abogado de marcas. Si `telar.cl` está tomado, hay variantes razonables: `telar.app`, `usatelar.cl` o `telaroficina.cl`.

## 2. Paleta

El original es casi blanco y negro, con un azul de enlace y un gris cálido característico en la barra lateral. **Mi borrador anterior usaba ese mismo gris de barra (`#f7f7f5`) y un azul parecido**, y los dos cambiaron.

| rol | claro | oscuro |
| --- | --- | --- |
| acento (terracota) | `#b34a2c` | `#e58c69` |
| superficie (lino) | `#faf6f0` | `#221f1c` |
| superficie 2 / hover | `#f2ebe1` / `#ede5d9` | `#2c2824` / `#332e29` |
| texto / secundario / tenue | `#201c18` / `#5f574d` / `#6b6257` | `#efe9e1` / `#b6ada1` / `#a39a8e` |
| mención | `#f6ecd0` | `#3a3120` |

28 combinaciones de texto y fondo por tema: **0 fallas AA** (`contrast.py`). Los colores del original están en `brand.json`, así que el barrido avisa si vuelven a aparecer.

## 3. Brief del logo

- **Idea:** una "T" tejida. Un hilo vertical pasa sobre la primera trama y bajo la segunda: personas y trabajo entrelazados.
- **Tipo:** símbolo + palabra "Telar" en minúscula o tipo título, con una sans humanista (Inter o similar) en peso 700.
- **Debe funcionar** a 16 px (favicon) y como ícono de app de 1024 px.
- **Entregables:** SVG; ícono de 1024×1024 sin transparencia para iOS; favicons 16/32/180/512; imagen social de 1200×630.
- **No debe parecerse al original:** nada de cubos, letras en caja negra y blanca, ni monocromo puro. Pon el logo del original al lado de los bocetos y compara.
- **Borrador actual:** `src/app/icon.svg` (terracota, crema y blanco), como marcador hasta tener el diseño final.

## 4. Voz

| palabra | lo que no es |
| --- | --- |
| **cercana** | no confianzuda: "tú", sin chilenismos ni chistes internos |
| **clara** | no seca: frases cortas que dicen qué pasó y qué hacer |
| **tranquila** | no alarmista: los errores se explican con calma y siempre ofrecen una salida |

| sí | no |
| --- | --- |
| "Movida a la papelera · Deshacer" | "¡Ups! Algo salió mal 😱" |
| "Aún no hay tareas. Agrega la primera y asígnala a alguien." | "Lista vacía" |
| "Sin conexión: tus mensajes se enviarán al reconectar." | "Error de red (ERR_INTERNET_DISCONNECTED)" |
| "Pide a Camila que la comparta contigo." | "403 Forbidden" |
| "La oficina llegó a 10 personas." | "Has alcanzado el límite de tu plan, actualiza ahora" |

### Los 10 textos más vistos (escritos desde cero, revisados con esta voz)
| dónde | texto |
| --- | --- |
| login | "Entra a tu oficina" · "Sin contraseñas: te mandamos un enlace al correo." |
| botón de login | "Enviarme el enlace" |
| crear oficina | "Crea tu oficina" · "Un espacio para las páginas, tareas y conversaciones de tu equipo." |
| inicio, botón principal | "Nueva página" |
| editor vacío | "Escribe algo o presiona / para ver opciones" |
| tareas vacías | "Aún no hay tareas" · "Agrega la primera, asígnala a alguien y ponle fecha." |
| chat vacío | "Este es el comienzo de #general" · "Saluda al equipo o comparte una página con [[." |
| confirmación | "Movida a la papelera" + "Deshacer" |
| error de envío | "No se envió · Reintentar" |
| sin acceso | "No tienes acceso a esta página" · "Pide a {nombre} que la comparta contigo." |

## 5. Barrido

`python3 sweep.py . --config replica/brand.json` → **limpio** (2026-10-26). Revisado también a ojo: título de las pestañas ("Telar"), favicon, plantillas de correo (colores y nombre), `package.json` (`telar`) y README.
