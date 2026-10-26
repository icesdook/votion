import { test, expect, loginAs, readDB } from "./fixtures";

test.describe("F01 crear la oficina e invitar", () => {
  test("F01-H1 persona nueva crea su oficina e invita", async ({ page, errors }) => {
    void errors;
    await page.goto("/login");
    await page.getByLabel("Correo de trabajo").fill("diego@nueva.cl");
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    await page.getByRole("button", { name: /Abrir el enlace/ }).click();
    await page.waitForURL("**/onboarding");
    await page.getByLabel("Tu nombre").fill("Diego");
    await page.getByLabel("Nombre de la oficina").fill("Estudio Ñuble 🏔️");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Invita a tu equipo" })).toBeVisible();
    await page.getByLabel(/Correos/).fill("ana@nueva.cl, no-es-correo");
    await page.getByRole("button", { name: "Enviar invitaciones" }).click();
    await expect(page.getByText("ana@nueva.cl", { exact: true })).toBeVisible();
    await expect(page.getByText(/no-es-correo: Correo no válido/)).toBeVisible(); // F01-E1
    await page.getByRole("button", { name: "Ir a mi oficina" }).click();
    await page.waitForURL("**/w");
    await expect(page.getByRole("button", { name: /Estudio Ñuble 🏔️/ })).toBeVisible(); // F01-E4 tildes y emoji
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "general", exact: true })).toBeVisible();
  });

  test("F01-E2 sin nombre de oficina no avanza", async ({ page, errors }) => {
    void errors;
    await page.goto("/login");
    await page.getByLabel("Correo de trabajo").fill("vacio@nueva.cl");
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await page.getByRole("button", { name: /Abrir el enlace/ }).click();
    await page.waitForURL("**/onboarding");
    await page.getByLabel("Tu nombre").fill("Vacío");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/onboarding/);
    await expect(page.getByLabel("Nombre de la oficina")).toHaveAttribute("maxlength", "80"); // F01-E3
  });

  test("F01-N1 no se puede pasar de 10 personas", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/settings?tab=members");
    const emails = Array.from({ length: 6 }, (_, i) => `p${i}@oficina.demo`).join(", ");
    await page.getByLabel("Correos").fill(emails);
    await page.getByRole("button", { name: "Invitar" }).click();
    await expect(page.getByText(/Invitación enviada a p0@oficina.demo/)).toBeVisible();
    await expect(page.getByText(/p5@oficina.demo: Se alcanzó el límite de 10 personas/)).toBeVisible();
    await expect(page.getByText(/llegó a 10 personas/)).toBeVisible();
  });

  test("F01-N2 un miembro común no ve la opción de invitar", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "tomas");
    await page.goto("/w/settings?tab=members");
    await expect(page.getByRole("heading", { name: "Personas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invitar" })).toHaveCount(0);
  });
});

test.describe("F02 unirse por invitación", () => {
  test("F02-H1 la persona invitada se une y aparece en #general", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/settings?tab=members");
    await page.getByLabel("Correos").fill("nueva@oficina.demo");
    await page.getByRole("button", { name: "Invitar" }).click();
    await expect(page.getByText(/Invitación enviada/)).toBeVisible();
    const token = await readDB(page, (db) => (db.invites as { token: string }[])[0].token);
    // cerrar sesión y entrar como la invitada
    await page.getByRole("button", { name: /Oficina Demo/ }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await page.goto(`/invite/${token}`);
    await page.getByRole("button", { name: "Entrar para aceptar" }).click();
    await page.getByLabel("Correo de trabajo").fill("nueva@oficina.demo");
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await page.getByRole("button", { name: /Abrir el enlace/ }).click();
    await page.waitForURL(`**/invite/${token}`);
    await page.getByLabel("Tu nombre").fill("Paula Nueva");
    await page.getByRole("button", { name: "Unirme" }).click();
    await page.waitForURL("**/w");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "general", exact: true }).click();
    await expect(page.getByText("Paula Nueva se unió a la oficina.")).toBeVisible();
    // F02-E1 la invitación no sirve dos veces
    await page.goto(`/invite/${token}`);
    await expect(page.getByRole("heading", { name: /Ya eres parte/ })).toBeVisible();
  });

  test("F02-N1 enlace inexistente", async ({ page, errors }) => {
    void errors;
    await page.goto("/invite/no-existe");
    await expect(page.getByRole("heading", { name: "Invitación no encontrada" })).toBeVisible();
  });

  test("F02-N2 la invitación es para otro correo", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/settings?tab=members");
    await page.getByLabel("Correos").fill("solo-para-mi@oficina.demo");
    await page.getByRole("button", { name: "Invitar" }).click();
    await expect(page.getByText(/Invitación enviada/)).toBeVisible();
    const token = await readDB(page, (db) => (db.invites as { token: string }[])[0].token);
    await page.getByRole("button", { name: /Oficina Demo/ }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await page.goto("/login");
    await page.getByLabel("Correo de trabajo").fill("otra-persona@gmail.com");
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await page.getByRole("button", { name: /Abrir el enlace/ }).click();
    await page.goto(`/invite/${token}`);
    await page.getByLabel("Tu nombre").fill("Otra");
    await page.getByRole("button", { name: "Unirme" }).click();
    await expect(page.getByText(/Esta invitación es para solo-para-mi@oficina.demo/)).toBeVisible();
  });
});
