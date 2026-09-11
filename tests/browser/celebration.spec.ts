import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Snapshot } from "../../src/data/types";
import { STORAGE_KEY } from "../../src/state";

const { observations } = JSON.parse(
  readFileSync(
    new URL("../../public/data/census.json", import.meta.url),
    "utf8",
  ),
) as Snapshot;
const black = observations.find(
  (o) =>
    o.fur === "Black" &&
    !o.behaviours.climbing &&
    !o.behaviours.approaches &&
    !o.behaviours.moans,
)!;
const blackClimber = observations.find(
  (o) =>
    o.fur === "Black" &&
    o.behaviours.climbing &&
    !o.behaviours.approaches &&
    !o.behaviours.moans,
)!;

async function selectFromList(page: Page, id: string) {
  await page
    .getByRole("button", { name: "Observation list", exact: true })
    .click();
  await page.getByRole("searchbox").fill(id);
  await page.locator("[data-list] button").click();
}
async function freezeBurst(page: Page) {
  await page.locator(".badge-celebration").evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 650;
    });
  });
}

test("new badges celebrate once, keep controls usable and do not replay restored discoveries", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".map-status")).toBeHidden();
  await selectFromList(page, black.id);
  const celebration = page.locator(".badge-celebration");
  await expect(celebration).toBeVisible();
  await expect(celebration).toContainText("A little midnight");
  await expect(page.locator(".celebration-particle")).toHaveCount(32);
  await expect(page.locator(".toast")).toContainText("Acorn collected!");
  await expect(page.locator('[data-pane="observation"] h2')).toBeFocused();
  await freezeBurst(page);
  await page.screenshot({ path: "artifacts/badge-celebration-desktop.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".celebration-particle")).toHaveCount(0);
  expect(
    await celebration.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  // The overlay doesn't intercept map controls or steal focus.
  await page
    .getByRole("button", { name: "Top-down view", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(celebration).toBeHidden();
  await selectFromList(page, black.id);
  await expect(celebration).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-pane="observation"]')).toBeVisible();
  await expect(celebration).toBeHidden();
  expect(errors).toEqual([]);
});

test("mobile groups simultaneous badges, limits particles and clears after the reward", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`./?squirrel=${blackClimber.id}`);
  await expect(page.locator(".celebration-title")).toHaveText(
    "2 acorns collected!",
  );
  await expect(page.locator(".celebration-detail")).toContainText(
    "On the up & up",
  );
  await expect(page.locator(".celebration-particle")).toHaveCount(20);
  await freezeBurst(page);
  const card = await page.locator(".celebration-card").boundingBox();
  const park = await page.locator(".park").boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(park!.x);
  expect(card!.x + card!.width).toBeLessThanOrEqual(park!.x + park!.width);
  expect(card!.y).toBeGreaterThanOrEqual(park!.y);
  expect(card!.y + card!.height).toBeLessThanOrEqual(park!.y + park!.height);
  await page.screenshot({ path: "artifacts/badge-celebration-mobile.png" });
  await expect(page.locator(".badge-celebration")).toBeHidden({
    timeout: 5000,
  });
  await expect(page.locator(".celebration-particle")).toHaveCount(0);
});

test("reduced motion keeps a static reward without WebGL and resetting allows earning again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/data/park.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto(`./?squirrel=${black.id}`);
  const celebration = page.locator(".badge-celebration");
  await expect(celebration).toBeVisible();
  await expect(page.locator(".park")).toHaveClass(/scene-unavailable/);
  await expect(
    page.locator(".celebration-particle, .celebration-halo"),
  ).toHaveCount(0);
  expect(
    await celebration.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.screenshot({
    path: "artifacts/badge-celebration-reduced-motion.png",
  });
  await page
    .locator(".panel-tabs")
    .getByRole("button", { name: "Notebook" })
    .click();
  await page
    .getByRole("button", { name: "Reset discoveries & mission progress" })
    .click();
  await expect(celebration).toBeHidden();
  await selectFromList(page, black.id);
  await expect(celebration).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the fifth badge gets the full collection celebration", async ({
  page,
}) => {
  const ids = [
    black.id,
    observations.find((o) => o.fur === "Cinnamon" && !o.behaviours.moans)!.id,
    observations.find((o) => o.behaviours.approaches && !o.behaviours.moans)!
      .id,
    blackClimber.id,
  ];
  await page.addInitScript(
    ({ key, ids }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, ids }));
    },
    { key: STORAGE_KEY, ids },
  );
  const moans = observations.find((o) => o.behaviours.moans)!;
  await page.goto(`./?squirrel=${moans.id}`);
  await expect(page.locator(".trail-complete")).toContainText(
    "You found all five!",
  );
  await expect(page.locator(".celebration-collection .collected")).toHaveCount(
    5,
  );
  await expect(page.locator(".toast")).toContainText(
    "All five acorns collected!",
  );
  await freezeBurst(page);
  await page.screenshot({ path: "artifacts/badge-celebration-complete.png" });
});

test("unmount cancels an active celebration and remount does not replay it", async ({
  page,
}) => {
  await page.goto(`./tests/browser/lifecycle.html?squirrel=${black.id}`);
  await page
    .getByRole("button", { name: "Mount experience", exact: true })
    .click();
  await expect(page.locator(".badge-celebration")).toBeVisible();
  const animations = await page
    .locator(".badge-celebration")
    .evaluateHandle((node) => node.getAnimations({ subtree: true }));
  expect(await animations.evaluate((items) => items.length)).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Unmount experience", exact: true })
    .click();
  expect(
    await animations.evaluate((items) =>
      items.every((animation) => animation.playState === "idle"),
    ),
  ).toBe(true);
  await expect(page.locator(".badge-celebration")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mount experience", exact: true })
    .click();
  await expect(page.locator('[data-pane="observation"]')).toBeVisible();
  await expect(page.locator(".badge-celebration")).toBeHidden();
  await animations.dispose();
});
