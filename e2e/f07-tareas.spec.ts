import { test, expect, loginAs, readDB } from "./fixtures";

test.describe("F07 gestionar tareas", () => {
  test("F07-H1 nueva tarea en el tablero, asignada a alguien que recibe aviso", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-tareas");
    await page.getByRole("tab", { name: /Tablero/ }).click();
    await page.getByRole("button", { name: "Nueva", exact: true }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Título").fill("Llamar al contador");
    await dlg.getByRole("button", { name: /^Responsable:/ }).click();
    await page.getByRole("option", { name: /Valentina Díaz/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Llamar al contador" })).toBeVisible();
    const n = await readDB(page, (db) => (db.notifications as { userId: string; kind: string }[]).filter((x) => x.userId === "u-valentina" && x.kind === "assigned").length);
    expect(n).toBe(1);
  });

  test("F07-E1 filtro sin resultados y quitar filtros", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-tareas");
    await page.getByRole("button", { name: /Filtrar/ }).click();
    await page.getByRole("button", { name: "Agregar filtro" }).click();
    await page.getByRole("menuitem", { name: "Estado" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Estado:/ }).click();
    await page.getByLabel("Buscar o crear opción").fill("Bloqueada");
    await page.getByLabel("Buscar o crear opción").press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByText("Ninguna tarea coincide con el filtro")).toBeVisible();
    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(page.getByRole("grid").getByRole("row")).toHaveCount(7);
  });

  test("F07-E2 mover una tarea con teclado (sin arrastrar)", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-tareas");
    await page.getByRole("tab", { name: /Tablero/ }).click();
    const card = page.locator("div[draggable]").filter({ hasText: "Ordenar archivos del trimestre" });
    await card.getByRole("button", { name: "Mover tarea" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: /Mover a Listo/ }).click();
    const st = await readDB(page, (db) => (db.dbRows as { id: string; values: Record<string, string> }[]).find((r) => r.id === "row-1")!.values["prop-estado"]);
    expect(st).toBe("st-done");
  });

  test("F07-E3 calendario: crear tarea en un día", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-tareas");
    await page.getByRole("tab", { name: /Calendario/ }).click();
    await expect(page.getByRole("grid", { name: "Calendario" })).toBeVisible();
    const day = page.getByRole("button", { name: /^Nueva tarea el 15/ });
    await day.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").getByLabel("Título").fill("Pagar arriendo");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("gridcell").filter({ hasText: "Pagar arriendo" })).toBeVisible();
  });

  test("F07-E4 una tarea con nombre largo no rompe la tabla", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.goto("/w/p/p-tareas");
    const first = page.getByLabel("Nombre de la tarea").first();
    await first.fill("Una tarea con un nombre larguísimo que no debería romper el diseño de la tabla ni empujar columnas");
    await first.press("Enter");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
