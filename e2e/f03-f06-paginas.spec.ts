import { test, expect, loginAs, readDB } from "./fixtures";

type P = { id: string; title: string; searchText: string; isPrivate: boolean; parentId: string | null; archivedAt?: string };

test.describe("F03 crear y escribir una página", () => {
  test("F03-H1 nueva página, título y contenido se guardan", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.getByRole("button", { name: "Nueva página", exact: true }).click();
    await page.waitForURL(/\/w\/p\//);
    const title = page.getByLabel("Título");
    await expect(title).toBeFocused();
    await title.fill("Acta reunión lunes ✅");
    await title.press("Enter");
    await page.keyboard.type("Acordamos revisar los contratos.");
    await expect(page.getByText(/Guardado/)).toBeVisible();
    const id = page.url().split("/").at(-1)!;
    const saved = await readDB(page, (db) => (db.pages as P[]).find((p) => p.id === id)!);
    expect(saved.title).toBe("Acta reunión lunes ✅");
    expect(saved.searchText).toContain("Acordamos revisar los contratos.");
    // F03-E3 recargar conserva todo
    await page.reload();
    await expect(page.getByLabel("Título")).toHaveValue("Acta reunión lunes ✅");
    await expect(page.getByText("Acordamos revisar los contratos.")).toBeVisible();
    // aparece en el árbol
    await expect(page.getByRole("treeitem", { name: /Acta reunión lunes/ })).toBeVisible();
  });

  test("F03-E1 título de 200 caracteres como máximo", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.getByRole("button", { name: "Nueva página", exact: true }).click();
    await page.waitForURL(/\/w\/p\//);
    await page.getByLabel("Título").fill("x".repeat(250));
    await expect(page.getByLabel("Título")).toHaveValue("x".repeat(200));
  });

  test("F03-E4 dos personas a la vez: la segunda ve que la primera edita y recibe los cambios", async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    await loginAs(a, "camila");
    await a.goto("/w/p/p-manual");
    await a.locator(".bn-editor").click();
    await expect(a.getByText(/está editando/)).toHaveCount(0);
    // la segunda pestaña entra como Matías
    await b.goto("/login");
    await b.evaluate(() => sessionStorage.setItem("ofi.session", "u-matias"));
    await b.goto("/w/p/p-manual");
    await expect(b.getByText(/Camila Rojas está editando esta página/)).toBeVisible();
    // Camila escribe; Matías lo ve sin recargar
    await a.locator(".bn-editor").getByText("Acuerdos básicos").click();
    await a.keyboard.press("End");
    await a.keyboard.type(" Actualizado hoy.");
    await expect(b.getByText(/Actualizado hoy\./)).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });
});

test.describe("F03 menú /", () => {
  test("F03-E6 lo común primero y el resto en 'Más bloques'", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.getByRole("button", { name: "Nueva página", exact: true }).click();
    await expect(page.getByLabel("Título")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Contenido de la página")).toBeFocused();
    await page.keyboard.type("/");
    const menu = page.locator(".bn-suggestion-menu");
    await expect(menu).toBeVisible();
    const groups = await menu.locator(".bn-suggestion-menu-label").allInnerTexts();
    expect(groups.slice(0, 3)).toEqual(["Básicos", "Equipo", "Más bloques"]);
  });
});

test.describe("F04 organizar páginas", () => {
  test("F04-H1 subpágina, favorito y mover a privado", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    const bienvenida = page.getByRole("treeitem", { name: /Bienvenida al equipo/ });
    await bienvenida.hover();
    await bienvenida.getByRole("button", { name: "Agregar subpágina" }).click();
    await page.waitForURL(/\/w\/p\//);
    await page.getByLabel("Título").fill("Subpágina de prueba");
    await page.getByLabel("Título").blur();
    await expect(page.getByRole("navigation", { name: "Ruta" }).getByRole("link", { name: /Bienvenida al equipo/ })).toBeVisible();
    // favorito
    await page.getByRole("button", { name: "Más opciones de la página" }).click();
    await page.getByRole("menuitem", { name: "Agregar a favoritos" }).click();
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /Subpágina de prueba/ }).first()).toBeVisible();
    // mover una página propia a Privado
    const notas = page.getByRole("treeitem", { name: /Bienvenida al equipo/ });
    await notas.hover();
    await notas.getByRole("button", { name: /Opciones de Bienvenida/ }).click();
    await page.getByRole("menuitem", { name: "Mover a Privado" }).click();
    await expect(page.getByRole("tree", { name: "Páginas privadas" }).getByRole("treeitem", { name: /Bienvenida al equipo/ })).toBeVisible();
  });

  test("F04-N1 no se puede mover una página dentro de su propia subpágina", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "matias");
    const manual = page.getByRole("treeitem", { name: /Manual de la oficina/ });
    await manual.getByRole("button", { name: "Expandir" }).click();
    const hijo = page.getByRole("treeitem", { name: /Vacaciones y permisos/ });
    await manual.locator("> div").dragTo(hijo.locator("> div"));
    await expect(page.getByText("No puedes mover una página dentro de sí misma.")).toBeVisible();
    const parent = await readDB(page, (db) => (db.pages as P[]).find((p) => p.id === "p-manual")!.parentId);
    expect(parent).toBeNull();
  });
});

test.describe("F05 comentar y mencionar", () => {
  test("F05-H1 comentario con mención llega a la bandeja de la otra persona", async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    await loginAs(a, "camila");
    await a.goto("/w/p/p-bienvenida");
    await a.getByRole("button", { name: /^Comentarios/ }).click();
    const box = a.getByLabel("Comentar la página");
    await box.fill("Revisemos esto @Tom");
    await a.getByRole("option", { name: /Tomás Fuentes/ }).click();
    await box.press("Enter");
    await expect(a.getByRole("article").filter({ hasText: "Revisemos esto" })).toBeVisible();
    const b = await ctx.newPage();
    await b.goto("/login");
    await b.evaluate(() => sessionStorage.setItem("ofi.session", "u-tomas"));
    await b.goto("/w/inbox");
    await expect(b.getByRole("button", { name: /Camila Rojas te mencionó/ })).toBeVisible();
    await ctx.close();
  });

  test("F05-H2 responder, resolver y reabrir", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-manual");
    await page.getByRole("button", { name: /^Comentarios/ }).click();
    const hilo = page.getByRole("article", { name: /Hilo de Javiera/ });
    await hilo.getByRole("button", { name: "Responder" }).click();
    await page.getByLabel("Responder").fill("De acuerdo");
    await page.getByLabel("Responder").press("Enter");
    await expect(hilo.getByText("De acuerdo")).toBeVisible();
    await hilo.getByRole("button", { name: /Resolver hilo/ }).click();
    await expect(page.getByText("Sin comentarios abiertos")).toBeVisible();
    await page.getByRole("tab", { name: "Resueltos" }).click();
    await page.getByRole("button", { name: "Reabrir hilo" }).click();
    await page.getByRole("tab", { name: "Abiertos" }).click();
    await expect(page.getByText("De acuerdo")).toBeVisible();
  });

  test("F05-H3 el texto comentado se resalta y al tocarlo abre su hilo", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-manual");
    await page.locator(".bn-editor").waitFor();
    const count = () => page.evaluate(() => (CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get("ofi-comment")?.size ?? 0);
    await expect.poll(count).toBe(1);
    // clic justo sobre el texto resaltado
    const box = await page.evaluate(() => {
      const r = [...((CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get("ofi-comment") ?? [])][0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await expect(page.getByRole("complementary", { name: "Comentarios" })).toBeVisible();
    await expect(page.getByRole("article", { name: /Hilo de Javiera/ })).toHaveClass(/ring-2/);
    // comentar una selección nueva
    const p = page.locator(".bn-editor").getByText("Reunión de equipo los lunes a las 10:00.", { exact: false });
    await p.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Shift+Home");
    await page.getByRole("button", { name: "Comentar", exact: true }).click();
    const input = page.getByLabel("Comentar la selección");
    await input.fill("¿Se puede mover al martes?");
    await input.press("Enter");
    await expect.poll(count).toBe(2);
    // resolver quita el resaltado
    await page.getByRole("article", { name: /Hilo de Camila/ }).getByRole("button", { name: /Resolver hilo/ }).click();
    await expect.poll(count).toBe(1);
  });

  test("F05-E1 mencionar a alguien sin acceso no le avisa", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-notas-camila"); // privada de Camila
    await page.getByRole("button", { name: /^Comentarios/ }).click();
    const box = page.getByLabel("Comentar la página");
    await box.fill("@Mat");
    await expect(page.getByRole("option", { name: /Matías Soto.*sin acceso/ })).toBeVisible();
    await page.getByRole("option", { name: /Matías Soto/ }).click();
    await box.press("Enter");
    await expect(page.getByRole("article").filter({ hasText: "@Matías Soto" })).toBeVisible();
    const n = await readDB(page, (db) => (db.notifications as { userId: string; pageId?: string }[]).filter((x) => x.userId === "u-matias" && x.pageId === "p-notas-camila").length);
    expect(n).toBe(0);
  });
});

test.describe("F06 compartir", () => {
  test("F06-H1 privada: otra persona no la ve; con 'Puede ver' la lee pero no edita ni comenta", async ({ browser }) => {
    const ctx = await browser.newContext();
    const b = await ctx.newPage();
    await b.goto("/login");
    await b.evaluate(() => sessionStorage.setItem("ofi.session", "u-tomas"));
    await b.goto("/w/p/p-notas-camila");
    await expect(b.getByRole("heading", { name: "No tienes acceso a esta página" })).toBeVisible();
    await expect(b.getByRole("treeitem", { name: /Notas personales/ })).toHaveCount(0);

    const a = await ctx.newPage();
    await loginAs(a, "camila");
    await a.goto("/w/p/p-notas-camila");
    await a.getByRole("button", { name: /Compartir/ }).click();
    await a.getByLabel("Acceso de Tomás Fuentes").selectOption("view");

    await b.reload();
    await expect(b.getByLabel("Título")).toHaveValue("Notas personales");
    await expect(b.getByLabel("Título")).toHaveAttribute("readonly", "");
    await expect(b.locator('.bn-editor[contenteditable="true"]')).toHaveCount(0);
    await b.getByRole("button", { name: /^Comentarios/ }).click();
    await expect(b.getByLabel("Comentar la página")).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("F11 recuperar", () => {
  test("F11-H1 papelera: mover y restaurar con subpáginas", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "matias");
    await page.goto("/w/p/p-manual");
    await page.getByRole("button", { name: "Más opciones de la página" }).click();
    await page.getByRole("menuitem", { name: /papelera/ }).click();
    await page.waitForURL("**/w");
    await expect(page.getByRole("treeitem", { name: /Manual de la oficina/ })).toHaveCount(0);
    await page.goto("/w/trash");
    await expect(page.getByText("Vacaciones y permisos")).toHaveCount(0); // solo la raíz
    await page.getByRole("button", { name: "Restaurar" }).click();
    await page.goto("/w/p/p-vacaciones");
    await expect(page.getByLabel("Título")).toHaveValue("Vacaciones y permisos");
    await expect(page.getByText("Esta página está en la papelera.")).toHaveCount(0);
  });

  test("F11-H2 historial: restaurar una versión anterior", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-vacaciones");
    await page.locator(".bn-editor").getByText(/Pide tus vacaciones/).click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Texto reemplazado");
    await expect(page.getByText(/Guardado/)).toBeVisible();
    await page.getByRole("button", { name: "Más opciones de la página" }).click();
    await page.getByRole("menuitem", { name: "Historial" }).click();
    await expect(page.getByRole("dialog").getByText(/Pide tus vacaciones/)).toBeVisible();
    await page.getByRole("button", { name: "Restaurar esta versión" }).click();
    const text = await readDB(page, (db) => (db.pages as P[]).find((p) => p.id === "p-vacaciones")!.searchText);
    expect(text).toContain("Pide tus vacaciones");
  });
});
