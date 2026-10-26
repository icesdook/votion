import Image from "next/image";
import Link from "next/link";
import { Check, CheckSquare, FileText, Lock, MessageCircle, MessageSquare, Search, Sparkles, Users, XCircle } from "lucide-react";
import { AppLink } from "./app-link";

const FAQ: [string, string][] = [
  ["¿Necesito tarjeta para probar?", "No. Tienes 30 días completos sin tarjeta. Si no sigues, tu oficina queda en solo lectura y puedes exportar todo."],
  ["¿Qué pasa si somos más de 10?", "Telar está pensado para oficinas de hasta 10 personas: así se mantiene simple y rápido. Si crecen más, te ayudamos a exportar tus páginas y tareas."],
  ["¿Puedo traer lo que ya tengo en otra herramienta?", "Por ahora puedes pegar texto con formato en cualquier página. Un importador desde Markdown y CSV está en camino."],
  ["¿Usan inteligencia artificial con mis documentos?", "No. Telar no tiene IA obligatoria y tus datos no se envían a proveedores de IA."],
  ["¿Dónde se guardan mis datos?", "En una base de datos con permisos por persona en cada página. Si tu oficina lo necesita, el plan Oficina privada se instala en tu propio servidor."],
  ["¿Cómo cancelo?", "En Ajustes → Plan, con un clic. Sigues usando lo pagado hasta el final del periodo y nada se borra."],
];

function Shot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg shadow-pop">
      <Image src={src} alt={alt} width={1440} height={900} priority={priority} className="h-auto w-full" sizes="(max-width: 900px) 100vw, 1100px" />
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-6 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-h3 font-bold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/telar-mark.svg" alt="" width={28} height={28} className="rounded-md" />
            Telar
          </Link>
          <nav aria-label="Secciones" className="hidden flex-1 gap-5 text-sm text-text-muted md:flex">
            <a href="#como-funciona" className="hover:text-text">
              Cómo funciona
            </a>
            <a href="#precios" className="hover:text-text">
              Precios
            </a>
            <a href="#preguntas" className="hover:text-text">
              Preguntas
            </a>
          </nav>
          <span className="flex-1 md:hidden" />
          <AppLink variant="header" />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1100px] px-4 pt-16 pb-12 text-center md:px-6 md:pt-24">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3 py-1 text-xs font-medium text-on-accent-soft">
            Para oficinas de hasta 10 personas
          </p>
          <h1 className="mx-auto max-w-3xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] font-bold tracking-tight">Tu oficina, armada desde el primer minuto.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-text-muted md:text-h3 md:font-normal">
            Páginas, tareas y conversaciones del equipo en un solo lugar, en español. Sin armar nada desde cero y con un precio fijo por oficina.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AppLink variant="hero" />
            <a href="#como-funciona" className="text-sm font-medium text-text-muted underline-offset-4 hover:text-text hover:underline">
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-3 text-xs text-text-faint">30 días gratis, sin tarjeta. Se cancela en un clic.</p>
          <div className="mt-12">
            <Shot src="/landing/tablero.webp" alt="Tablero de tareas del equipo en Telar, con columnas Por hacer, En curso y Listo" priority />
          </div>
        </section>

        {/* Problema */}
        <section aria-labelledby="h-problema" className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:px-6">
            <h2 id="h-problema" className="text-h1 font-bold tracking-tight">
              Las herramientas de documentos se volvieron un proyecto en sí mismas.
            </h2>
            <ul className="flex flex-col gap-4 text-base">
              {[
                ["Empiezan en blanco.", "Antes de trabajar hay que diseñar el sistema: páginas, bases de datos, plantillas. A la mitad del equipo le cuesta y se queda afuera."],
                ["La conversación vive en otra app.", "Los documentos en un lado, el chat en otro, las tareas en un tercero. Y cada uno cobra por persona."],
                ["Los cobros sorprenden.", "Pruebas que se cobran solas, renovaciones que nadie avisó, planes difíciles de cancelar."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <XCircle className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                  <span>
                    <strong>{t}</strong> <span className="text-text-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" aria-labelledby="h-como" className="mx-auto max-w-[1100px] scroll-mt-16 px-4 py-20 md:px-6">
          <h2 id="h-como" className="text-center text-h1 font-bold tracking-tight">
            Tres pasos y ya están trabajando
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["Crea tu oficina", "Ponle nombre. Telar trae lista la bienvenida, el tablero de tareas, las reuniones semanales y el manual."],
              ["Invita al equipo", "Hasta 10 personas por correo. Entran con un enlace, sin contraseñas."],
              ["Trabajen y conversen", "Escriban, asignen tareas y hablen al lado de cada página. Si un mensaje es una tarea, conviértelo con un toque."],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">{i + 1}</span>
                <h3 className="text-h3 font-semibold">{t}</h3>
                <p className="text-text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Funciones, guiadas por los arreglos */}
        <section aria-labelledby="h-funciones" className="bg-surface">
          <div className="mx-auto max-w-[1100px] px-4 py-20 md:px-6">
            <h2 id="h-funciones" className="text-h1 font-bold tracking-tight">
              Hecho para el trabajo diario de una oficina
            </h2>
            <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
              <div className="flex flex-col gap-6">
                {[
                  { icon: Sparkles, t: "Nada que armar", d: "La oficina nace con su estructura. El menú de bloques muestra primero lo que se usa de verdad." },
                  { icon: MessageCircle, t: "Conversar donde está el trabajo", d: "Canales, mensajes directos y una conversación al lado de cada página. Lo que se acuerda queda junto al documento." },
                  { icon: CheckSquare, t: "De mensaje a tarea", d: "Cualquier mensaje se convierte en tarea con responsable y fecha. Quien la recibe se entera en el momento." },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="flex gap-4">
                    <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                    <div>
                      <h3 className="font-semibold">{t}</h3>
                      <p className="text-text-muted">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Shot src="/landing/pagina-chat.webp" alt="Página de Telar con la conversación del equipo abierta al costado" />
            </div>
            <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
              <Shot src="/landing/comentarios.webp" alt="Texto resaltado con un comentario y su hilo abierto en el panel lateral" />
              <div className="flex flex-col gap-6">
                {[
                  { icon: MessageSquare, t: "Comentarios sobre el texto", d: "Selecciona una frase y coméntala. Queda resaltada y con un toque se abre el hilo." },
                  { icon: Lock, t: "Permisos que se entienden", d: "Cada página es de toda la oficina o privada. Puedes dar acceso a una persona para ver, comentar o editar." },
                  { icon: Search, t: "Encuentra cualquier cosa", d: "Ctrl + K busca en páginas, mensajes y personas, sin importar las tildes." },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="flex gap-4">
                    <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                    <div>
                      <h3 className="font-semibold">{t}</h3>
                      <p className="text-text-muted">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" aria-labelledby="h-precios" className="mx-auto max-w-[1100px] scroll-mt-16 px-4 py-20 md:px-6">
          <h2 id="h-precios" className="text-center text-h1 font-bold tracking-tight">
            Un precio por oficina. No por persona.
          </h2>
          <p className="mt-3 text-center text-text-muted">Valores en pesos chilenos más IVA. Anual: 2 meses gratis.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Dúo", who: "Hasta 3 personas", price: "$14.990", year: "$149.900 al año", items: ["Todo lo de Oficina", "Ideal para consultas y estudios chicos"] },
              {
                name: "Oficina",
                who: "Hasta 10 personas",
                price: "$39.990",
                year: "$399.900 al año",
                items: ["Páginas, tareas y chat sin límite", "Comentarios, menciones y bandeja", "Historial y papelera de 30 días", "Ayuda por chat en español"],
                featured: true,
              },
              { name: "Oficina privada", who: "En tu propio servidor", price: "Desde $89.990", year: "Instalación incluida", items: ["Para estudios jurídicos, contables y de salud", "Tus datos no salen de tu infraestructura"], soon: true },
            ].map((p) => (
              <div key={p.name} className={`flex flex-col rounded-lg border p-6 ${p.featured ? "border-accent shadow-pop" : "border-border"}`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-h3 font-semibold">{p.name}</h3>
                  {p.featured && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-medium text-on-accent-soft">Recomendado</span>}
                  {p.soon && <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">Próximamente</span>}
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
                  <Users className="size-4" aria-hidden /> {p.who}
                </p>
                <p className="mt-6 text-h1 font-bold">
                  {p.price}
                  {!p.price.startsWith("Desde") && <span className="text-sm font-normal text-text-muted"> /mes</span>}
                </p>
                <p className="text-sm text-text-muted">{p.year}</p>
                <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-text-muted">
            30 días gratis sin tarjeta · Cancelas en un clic · Aviso 7 días antes de renovar · Nada se borra por dejar de pagar
          </p>
        </section>

        {/* Preguntas */}
        <section id="preguntas" aria-labelledby="h-faq" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-[760px] scroll-mt-16 px-4 py-20 md:px-6">
            <h2 id="h-faq" className="text-h1 font-bold tracking-tight">
              Preguntas frecuentes
            </h2>
            <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-bg">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {q}
                      <span aria-hidden className="text-text-faint transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Llamado final */}
        <section className="mx-auto max-w-[1100px] px-4 py-20 text-center md:px-6">
          <FileText className="mx-auto size-8 text-accent" aria-hidden />
          <h2 className="mt-4 text-h1 font-bold tracking-tight">Prueba Telar con tu equipo este mes.</h2>
          <p className="mt-3 text-text-muted">En cinco minutos tienen la oficina armada. Si no les sirve, exportan todo y listo.</p>
          <div className="mt-8 flex justify-center">
            <AppLink variant="hero" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-8 text-sm text-text-muted md:flex-row md:items-center md:px-6">
          <p className="flex-1">© Telar. Hecho en Chile.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacidad" className="hover:text-text">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-text">
              Términos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
