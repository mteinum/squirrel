import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Snapshot } from "../../src/data/types";
import { nickname } from "../../src/field-guide";
const { observations } = JSON.parse(
  readFileSync(
    new URL("../../public/data/census.json", import.meta.url),
    "utf8",
  ),
) as Snapshot;

test("field kit retains every option, combines chips with advanced filters, and clears empty results", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".matching-number")).toHaveText("3,023");
  const row = (name: string) => page.locator(`[data-filter-row="${name}"]`);
  await row("fur")
    .getByRole("button", { name: "Cinnamon", exact: true })
    .click();
  await row("behaviour").locator("summary").click();
  await row("behaviour").getByRole("combobox").selectOption("approaches");
  const expected = observations.filter(
    (o) => o.fur === "Cinnamon" && o.behaviours.approaches,
  );
  await expect(page.locator(".matching-number")).toHaveText(
    expected.length.toLocaleString(),
  );
  await expect(row("behaviour").locator("summary")).toContainText(
    "Approaching humans",
  );
  await page.locator('[data-pane="filters"] [data-action="surprise"]').click();
  const selected = observations.find(
    (o) => o.id === new URL(page.url()).searchParams.get("squirrel"),
  )!;
  expect(expected).toContainEqual(selected);
  await expect(page.locator("[data-nickname]")).toHaveText(nickname(selected));
  await row("date").locator("summary").click();
  await expect(row("date").locator("option")).toHaveCount(
    new Set(observations.map((o) => o.date ?? "Unknown")).size + 1,
  );
  await row("date").getByRole("combobox").selectOption("2018-10-06");
  await row("shift").getByRole("button", { name: "PM", exact: true }).click();
  await expect(page.locator(".matching-number")).toHaveText(
    observations
      .filter(
        (o) =>
          o.fur === "Cinnamon" &&
          o.behaviours.approaches &&
          o.date === "2018-10-06" &&
          o.shift === "PM",
      )
      .length.toLocaleString(),
  );
  await page.locator('[data-action="vision"]').click();
  await expect(page.locator('[data-action="vision"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-vision-count]")).toContainText(
    await page.locator(".matching-number").innerText(),
  );
  await page
    .getByRole("button", { name: "Observation list", exact: true })
    .click();
  await page.getByRole("searchbox").fill("a squirrel that does not exist");
  await page
    .locator(".header-nav")
    .getByRole("button", { name: "Explore", exact: true })
    .click();
  await expect(page.locator(".matching-number")).toHaveText("0");
  await expect(page.locator("[data-count-message]")).toHaveText(
    "No squirrels detected. Suspicious.",
  );
  await expect(
    page.locator('[data-pane="filters"] [data-action="surprise"]'),
  ).toBeDisabled();
  await expect(page.locator("[data-search-active]")).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".matching-number")).toHaveText("3,023");
  await expect(page.locator("[data-vision-count]")).toContainText("3,023");
  await expect(page.locator('.filter-chip[aria-pressed="true"]')).toHaveCount(
    4,
  );
  await page.locator('[data-action="vision"]').click();
  await expect(page.locator(".park")).not.toHaveClass(/squirrel-vision/);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`field guide layout and selection at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await expect(page.locator("[data-scene] canvas")).toBeVisible();
    await expect(page.locator(".squirrel-pin:visible").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    if (viewport.width > 760) {
      const park = await page.locator(".park").boundingBox();
      expect(park!.width / viewport.width).toBeGreaterThanOrEqual(0.7);
      expect(park!.width / viewport.width).toBeLessThanOrEqual(0.75);
    } else {
      await expect(page.locator(".sheet-handle")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        (await page.locator("[data-scene]").boundingBox())!.height,
      ).toBeGreaterThan(500);
      await page.locator(".sheet-handle").press("Enter");
      await expect(page.locator(".sheet-handle")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await page
        .locator('[data-chips="fur"]')
        .getByRole("button", { name: "Black", exact: true })
        .click();
      await expect(page.locator("[data-mobile-count]")).toHaveText(
        observations.filter((o) => o.fur === "Black").length.toLocaleString(),
      );
      await page.locator(".sheet-handle").click();
    }
    await page.screenshot({
      path: `artifacts/field-guide-${viewport.width}.png`,
      animations: "disabled",
    });
    await page.locator('[data-action="surprise"]:visible').first().click();
    await expect(page.locator(".featured-squirrel")).toBeVisible();
    await expect(page.locator("[data-radar]")).toHaveText(
      "Squirrel located. Field trip successful.",
    );
    const id = new URL(page.url()).searchParams.get("squirrel")!;
    const selected = observations.find((o) => o.id === id)!;
    await expect(page.locator("[data-nickname]")).toHaveText(
      nickname(selected),
    );
    if (viewport.width === 390) expect(selected.fur).toBe("Black");
    await page.screenshot({
      path: `artifacts/field-guide-${viewport.width}-selected.png`,
      animations: "disabled",
    });
    await page.locator(".featured-details").click();
    await expect(page.locator("[data-card] h2")).toBeFocused();
    await expect(page.locator("[data-card]")).toContainText(
      selected.observationId,
    );
    await expect(page.locator("[data-portrait] canvas")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-card] h2")).toHaveText(nickname(selected));
    expect(errors).toEqual([]);
  });
}

test("vision and reduced-motion camera travel settle without a continuous render loop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame;
    let scheduled = 0;
    window.requestAnimationFrame = (callback) => {
      scheduled++;
      return raf(callback);
    };
    Object.defineProperty(window, "scheduledFrames", { get: () => scheduled });
  });
  await page.goto("./");
  await expect(page.locator("[data-scene] canvas")).toBeVisible();
  await page.locator('[data-action="vision"]').click();
  await page.locator('[data-action="surprise"]:visible').first().click();
  await expect(page.locator("[data-radar]")).toHaveText(
    "Squirrel located. Field trip successful.",
  );
  await expect(page.locator(".squirrel-pin.selected-pin")).toBeVisible();
  const sample = () =>
    page.evaluate(() => Reflect.get(window, "scheduledFrames") as number);
  await expect
    .poll(async () => {
      const before = await sample();
      await page.waitForTimeout(250);
      return (await sample()) - before;
    })
    .toBe(0);
  expect(await page.locator(".squirrel-pin").count()).toBeLessThanOrEqual(8);
  await page.screenshot({
    path: "artifacts/field-guide-vision.png",
    animations: "disabled",
  });
});
