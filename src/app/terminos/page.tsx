import type { Metadata } from "next";
import { LegalPage } from "@/features/landing/legal";

export const metadata: Metadata = { title: "Términos" };

export default function Terminos() {
  return (
    <LegalPage title="Términos del servicio">
      <p>
        <strong>Borrador para revisión legal.</strong> Debe revisarlo un abogado antes de publicar.
      </p>
      <h2>El servicio</h2>
      <p>Telar ofrece un espacio de trabajo para oficinas de hasta 10 personas, con páginas, tareas y conversaciones.</p>
      <h2>Prueba y cobro</h2>
      <p>La prueba dura 30 días y no pide tarjeta. Los planes se cobran por adelantado, de forma mensual o anual, al precio publicado más IVA. Avisamos por correo 7 días antes de cada renovación anual.</p>
      <h2>Cancelación</h2>
      <p>Se cancela con un clic desde Ajustes. El servicio sigue hasta el final del periodo pagado y luego la oficina queda en solo lectura. Puedes exportar todo en cualquier momento.</p>
      <h2>Tu contenido</h2>
      <p>El contenido es de tu oficina. Solo lo usamos para prestar el servicio.</p>
      <h2>Uso aceptable</h2>
      <p>No se permite usar Telar para actividades ilegales, enviar correo no deseado ni intentar acceder a datos de otras oficinas.</p>
    </LegalPage>
  );
}
