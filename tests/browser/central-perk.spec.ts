import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`fictional detour stays separate from observations at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    const sign = page.getByRole("button", {
      name: "Open Central Perk Easter egg",
    });
    await expect(page.locator("[data-scene] canvas")).toBeVisible();
    await expect(page.locator(".perk-sign")).toHaveAttribute("style", /left/);
    await expect(sign).toBeVisible();
    const box = (await sign.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    const bottom = (await page.locator(".park-bottom").boundingBox())!;
    expect(box.y + box.height).toBeLessThan(bottom.y);
    await page.screenshot({
      path: `artifacts/central-perk-${viewport.width}.png`,
      animations: "disabled",
    });
    const originalURL = page.url();
    const count = await page.locator(".matching-number").textContent();
    const progress = await page.locator(".mission-count").first().textContent();
    await sign.focus();
    await page.keyboard.press("Enter");
    const note = page.getByRole("dialog", { name: "Central Perk" });
    await expect(note).toBeVisible();
    await expect(note).toContainText("AN ENTIRELY FICTIONAL DETOUR");
    await expect(note).toContainText("unable to locate it in Central Park");
    await expect(sign).toHaveAttribute("aria-expanded", "true");
    await expect(note.locator("h2")).toBeFocused();
    await page.screenshot({
      path: `artifacts/central-perk-${viewport.width}-note.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Tab");
    await expect(
      note.getByRole("button", { name: "Return to the squirrels" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(note).not.toBeVisible();
    await expect(sign).toBeFocused();
    await expect(sign).toHaveAttribute("aria-expanded", "false");
    await sign.click();
    await note.getByRole("button", { name: "Return to the squirrels" }).click();
    await expect(note).not.toBeVisible();
    await expect(sign).toBeFocused();
    expect(page.url()).toBe(originalURL);
    await expect(page.locator(".matching-number")).toHaveText(count!);
    await expect(page.locator(".mission-count").first()).toHaveText(progress!);
    await expect(page.locator(".featured-squirrel")).toBeHidden();
    const position = await sign.getAttribute("style");
    await page
      .getByRole("button", { name: "Top-down view", exact: true })
      .click();
    await expect(page.locator(".perk-sign")).not.toHaveAttribute(
      "style",
      position!,
    );
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await expect(sign).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    expect(errors).toEqual([]);
  });
}
