import { test, expect, loginAs, readDB } from "./fixtures";

type M = { id: string; channelId: string; body: { t: string; v?: string }[]; deletedAt?: string; editedAt?: string; linkedPageId?: string };
const textOf = (m: M) => m.body.map((n) => n.v ?? "").join("");

test.describe("F08 chatear con el equipo", () => {
  test("F08-H1 enviar en #general y verlo en otra pestaña sin recargar", async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    await loginAs(a, "camila");
    await b.goto("/login");
    await b.evaluate(() => sessionStorage.setItem("ofi.session", "u-tomas"));
    await b.goto("/w/c/ch-general");
    await a.goto("/w/c/ch-general");
    const box = a.getByLabel("Mensaje para #general");
    await box.fill("Almuerzo a las 13:30 🍕");
    await box.press("Enter");
    await expect(a.getByRole("article").filter({ hasText: "Almuerzo a las 13:30 🍕" })).toBeVisible();
    await expect(b.getByRole("article").filter({ hasText: "Almuerzo a las 13:30 🍕" })).toBeVisible();
    await ctx.close();
  });

  test("F08-E1 Enter dos veces seguidas no duplica", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/c/ch-proyectos");
    const box = page.getByLabel("Mensaje para #proyectos");
    await box.fill("Uno solo");
    await box.press("Enter");
    await box.press("Enter");
    await expect(page.getByRole("article").filter({ hasText: "Uno solo" })).toHaveCount(1);
  });

  test("F08-E2 sin conexión: queda en cola y se envía al volver", async ({ page, context, errors }) => {
    await loginAs(page, "camila");
    await page.goto("/w/c/ch-proyectos");
    await context.setOffline(true);
    await expect(page.getByText(/Sin conexión/)).toBeVisible();
    const box = page.getByLabel("Mensaje para #proyectos");
    await box.fill("Escrito sin señal");
    await box.press("Enter");
    await expect(page.getByText("No se envió · Reintentar")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole("article").filter({ hasText: "Escrito sin señal" })).toBeVisible();
    const n = await readDB(page, (db) => (db.messages as M[]).filter((m) => textOf(m) === "Escrito sin señal").length);
    expect(n).toBe(1);
    // sin conexión el navegador registra fallas de red de la precarga de rutas: son esperables
    errors.splice(0, errors.length, ...errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e)));
  });

  test("F08-E3 flecha arriba edita el último mensaje propio", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/c/ch-proyectos");
    const box = page.getByLabel("Mensaje para #proyectos");
    await box.fill("Con erorr");
    await box.press("Enter");
    await expect(page.getByRole("article").filter({ hasText: "Con erorr" })).toBeVisible();
    await box.press("ArrowUp");
    const edit = page.getByLabel("Editar mensaje");
    await edit.fill("Sin error");
    await edit.press("Enter");
    await expect(page.getByRole("article").filter({ hasText: "Sin error" }).getByText("(editado)")).toBeVisible();
  });

  test("F08-N1 un DM entre dos personas es invisible para una tercera", async ({ page, errors }) => {
    void errors;
    await page.goto("/login");
    await page.evaluate(() => sessionStorage.setItem("ofi.session", "u-tomas"));
    await page.goto("/w/c/ch-dm-cm");
    await expect(page.getByText("Esta conversación no existe o no tienes acceso")).toBeVisible();
    await page.goto("/w");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("comentario en el manual");
    await expect(page.getByText(/Nada coincide/)).toBeVisible();
  });
});

test.describe("F09 de la conversación a la página", () => {
  test("F09-H1 convertir un mensaje en tarea", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/c/ch-general");
    const msg = page.getByRole("article").filter({ hasText: "Encontré dos proveedores" });
    await msg.hover();
    await msg.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: /Convertir en tarea de Tareas del equipo/ }).click();
    await expect(page.getByText(/lo convirtió en/)).toBeVisible();
    await page.getByRole("button", { name: "Abrir" }).click();
    await expect(page.getByLabel("Título")).toHaveValue(/Encontré dos proveedores/);
    await expect(page.getByRole("navigation", { name: "Ruta" }).getByRole("link", { name: /Tareas del equipo/ })).toBeVisible();
  });

  test("F09-H2 conversar sobre una página desde la propia página", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-manual");
    await page.getByRole("button", { name: "Conversar sobre esta página" }).click();
    const box = page.getByLabel("Mensaje sobre la página");
    await box.fill("¿Quién actualiza el horario?");
    await box.press("Enter");
    await expect(page.getByRole("complementary", { name: "Conversación de la página" }).getByText("¿Quién actualiza el horario?")).toBeVisible();
  });

  test("F09-E1 enlace a una página privada se muestra como sin acceso", async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    await loginAs(a, "camila");
    await a.goto("/w/c/ch-general");
    const box = a.getByLabel("Mensaje para #general");
    await box.fill("Mis notas: [[Notas");
    await a.getByRole("option", { name: /Notas personales/ }).click();
    await box.press("Enter");
    await expect(a.getByRole("article").getByRole("link", { name: /Notas personales/ }).first()).toBeVisible();
    const b = await ctx.newPage();
    await b.goto("/login");
    await b.evaluate(() => sessionStorage.setItem("ofi.session", "u-tomas"));
    await b.goto("/w/c/ch-general");
    const msg = b.getByRole("article").filter({ hasText: "Mis notas" });
    await expect(msg.getByText("página sin acceso")).toBeVisible();
    await expect(msg.getByRole("link", { name: /Notas personales/ })).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("F10 encontrar algo", () => {
  test("F10-H1 Ctrl+K busca páginas sin importar tildes", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("reunion"); // sin tilde
    await expect(page.getByRole("option", { name: /Manual de la oficina/ })).toBeVisible();
    await page.getByRole("combobox").fill("vacaciones");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/w/p/p-vacaciones");
  });

  test("F10-N1 la búsqueda no muestra páginas privadas ajenas", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "tomas");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("Notas personales");
    await expect(page.getByRole("option", { name: /Notas personales/ })).toHaveCount(0);
  });
});
