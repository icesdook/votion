import type { Metadata } from "next";
import { LegalPage } from "@/features/landing/legal";

export const metadata: Metadata = { title: "Privacidad" };

export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        <strong>Borrador para revisión legal.</strong> Debe revisarlo un abogado antes de publicar, en especial respecto de la Ley 19.628 y la Ley 21.719 de protección de datos personales.
      </p>
      <h2>Qué datos tratamos</h2>
      <p>Nombre y correo de cada persona, el contenido que el equipo escribe (páginas, tareas, comentarios y mensajes) y datos técnicos mínimos para mantener la sesión y la seguridad.</p>
      <h2>Para qué</h2>
      <p>Solo para prestar el servicio: mostrar el contenido a quienes tienen permiso, enviar los avisos que cada persona activa y cobrar el plan. No vendemos datos ni los usamos para entrenar inteligencia artificial.</p>
      <h2>Con quién los compartimos</h2>
      <ul>
        <li>Supabase: base de datos, inicio de sesión y archivos.</li>
        <li>Vercel: alojamiento de la aplicación.</li>
        <li>Resend: envío de correos.</li>
        <li>La pasarela de pago que se elija, solo para cobrar.</li>
      </ul>
      <h2>Tus derechos</h2>
      <p>Puedes acceder, corregir, exportar y eliminar tus datos desde la aplicación o escribiendo a privacidad@[tu-dominio].</p>
      <h2>Conservación</h2>
      <p>El contenido borrado queda 30 días en la papelera y luego se elimina. Al cerrar la oficina se elimina todo, salvo lo que la ley obligue a conservar (por ejemplo, documentos tributarios).</p>
    </LegalPage>
  );
}
