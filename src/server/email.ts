import "server-only";

// Correos transaccionales por la API pública de Resend, con la clave del dueño del proyecto.
// Sin RESEND_API_KEY no envía nada y lo dice (útil en desarrollo y en modo demo).

type Sent = { ok: true; id: string } | { ok: false; skipped?: true; error: string };

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#faf6f0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#201c18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:10px;padding:32px">
<tr><td><h1 style="font-size:22px;line-height:30px;margin:0 0 12px">${title}</h1>${body}</td></tr></table>
<p style="font-size:12px;color:#5f574d;margin-top:16px">Recibes este correo porque alguien usó tu dirección en Telar. Si no fuiste tú, ignóralo.</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#b34a2c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block">${label}</a></p>
<p style="font-size:12px;color:#5f574d;word-break:break-all">O copia este enlace: ${href}</p>`;
}

export function inviteEmail(p: { workspace: string; inviter: string; url: string }) {
  const w = escape(p.workspace);
  const i = escape(p.inviter);
  return {
    subject: `${p.inviter} te invitó a ${p.workspace}`,
    html: layout(
      `Te invitaron a ${w}`,
      `<p style="font-size:15px;line-height:24px;margin:0">${i} te sumó a su oficina en Telar: páginas, tareas y conversaciones del equipo, en un solo lugar.</p>${button(p.url, "Unirme al equipo")}
<p style="font-size:13px;color:#5f574d">La invitación vence en 7 días.</p>`,
    ),
    text: `${p.inviter} te invitó a ${p.workspace}.\n\nÚnete aquí: ${p.url}\n\nLa invitación vence en 7 días.`,
  };
}

export function digestEmail(p: { name: string; items: { who: string; what: string; where: string }[]; url: string }) {
  const rows = p.items
    .slice(0, 10)
    .map((x) => `<li style="margin:0 0 8px"><strong>${escape(x.who)}</strong> ${escape(x.what)} en ${escape(x.where)}</li>`)
    .join("");
  return {
    subject: `Tienes ${p.items.length} ${p.items.length === 1 ? "aviso" : "avisos"} sin leer`,
    html: layout(`Hola ${escape(p.name)}, esto quedó pendiente`, `<ul style="padding-left:18px;font-size:15px;line-height:22px">${rows}</ul>${button(p.url, "Abrir la bandeja")}`),
    text: `${p.items.map((x) => `- ${x.who} ${x.what} en ${x.where}`).join("\n")}\n\nAbrir la bandeja: ${p.url}`,
  };
}

export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }): Promise<Sent> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, skipped: true, error: "RESEND_API_KEY o EMAIL_FROM sin configurar" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) return { ok: false, error: `Resend respondió ${res.status}` };
  const data = (await res.json()) as { id: string };
  return { ok: true, id: data.id };
}
