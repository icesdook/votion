import { test, expect, loginAs, expectAccessible } from "./fixtures";

const SCREENS: [string, string][] = [
  ["S05 inicio", "/w"],
  ["S06 página", "/w/p/p-bienvenida"],
  ["S10 tareas", "/w/p/p-tareas"],
  ["S14 bandeja", "/w/inbox"],
  ["S16 papelera", "/w/trash"],
  ["S18 ajustes", "/w/settings?tab=members"],
  ["S19 perfil", "/w/profile"],
  ["S20 canal", "/w/c/ch-general"],
];

test.describe("Accesibilidad (axe: sin problemas serios ni críticos)", () => {
  test("S01 login", async ({ page, errors }) => {
    void errors;
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entra a tu oficina" })).toBeVisible();
    await expectAccessible(page, "S01 login");
  });

  for (const [label, url] of SCREENS) {
    test(label, async ({ page, errors }) => {
      void errors;
      await loginAs(page, "camila");
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await expectAccessible(page, label);
    });
  }

  test("tema oscuro en página y chat", async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme: "dark" });
    await loginAs(page, "camila");
    await page.goto("/w/p/p-manual");
    await page.waitForLoadState("networkidle");
    await expectAccessible(page, "S06 oscuro");
    await page.goto("/w/c/ch-general");
    await expectAccessible(page, "S20 oscuro");
  });
});

test.describe("Teclado", () => {
  test("crear página y llegar al editor solo con teclado", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    await page.getByRole("button", { name: "Nueva página", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/w\/p\//);
    await expect(page.getByLabel("Título")).toBeFocused();
    await page.keyboard.type("Hecho con teclado");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Primera línea");
    await expect(page.getByText("Primera línea")).toBeVisible();
    await expect(page.getByRole("treeitem", { name: /Hecho con teclado/ })).toBeVisible();
  });
});

test.describe("Móvil 390px @movil", () => {
  test("cajón, página y chat sin desbordes @movil", async ({ page, errors }) => {
    void errors;
    await loginAs(page, "camila");
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await noOverflow()).toBe(true);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /Manual de la oficina/ }).click();
    await expect(page.getByLabel("Título")).toHaveValue("Manual de la oficina");
    expect(await noOverflow()).toBe(true);
    await page.getByRole("button", { name: /^Comentarios/ }).click();
    await expect(page.getByRole("complementary", { name: "Comentarios" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar comentarios" }).click();
    await page.goto("/w/c/ch-general");
    const box = page.getByLabel("Mensaje para #general");
    await box.fill("Desde el celular");
    await box.press("Enter");
    await expect(page.getByRole("article").filter({ hasText: "Desde el celular" })).toBeVisible();
    expect(await noOverflow()).toBe(true);
  });
});
