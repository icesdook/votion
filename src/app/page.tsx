import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Telar · Tu oficina, armada desde el primer minuto" },
  description: "Páginas, tareas y conversaciones del equipo en un solo lugar, en español. Para oficinas de hasta 10 personas, con precio fijo por oficina.",
  openGraph: {
    title: "Telar · Tu oficina, armada desde el primer minuto",
    description: "Páginas, tareas y conversaciones del equipo en un solo lugar, en español.",
    images: [{ url: "/landing/tablero.webp", width: 1440, height: 900 }],
    locale: "es_CL",
    type: "website",
  },
};

export default function Home() {
  return <Landing />;
}
