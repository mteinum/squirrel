import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Snapshot } from "../../src/data/types";
const snapshot = JSON.parse(
  readFileSync(
    new URL("../../public/data/census.json", import.meta.url),
    "utf8",
  ),
) as Snapshot;
const firstBlack = snapshot.observations.find((o) => o.fur === "Black")!;
async function ready(page: import("@playwright/test").Page) {
  await page.goto("./");
  await expect(page.locator(".matching-number")).toHaveText("3,023");
  await expect(page.locator("[data-scene] canvas")).toBeVisible();
  await expect(page.locator(".map-status")).toBeHidden();
}
test("desktop scene, filters, cards, missions, notebook, deep links and sharing", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    missing: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) missing.push(response.url());
  });
  await ready(page);
  await page.screenshot({ path: "artifacts/desktop.png" });
  await page
    .locator('[data-chips="fur"]')
    .getByRole("button", { name: "Black", exact: true })
    .click();
  await expect(page.locator(".matching-number")).toHaveText(
    String(snapshot.observations.filter((o) => o.fur === "Black").length),
  );
  await page
    .locator('[data-chips="behaviour"]')
    .getByRole("button", { name: "Climbing", exact: true })
    .click();
  await expect(page.locator(".matching-number")).toHaveText(
    String(
      snapshot.observations.filter(
        (o) => o.fur === "Black" && o.behaviours.climbing,
      ).length,
    ),
  );
  await page.locator('[data-action="surprise"]:visible').first().click();
  await expect(page.locator(".featured-squirrel")).toBeVisible();
  await page.locator(".featured-details").click();
  await expect(page.locator("[data-card]")).toContainText("Black");
  await expect(page.locator("[data-card]")).toContainText("Climbing");
  const selectedId = new URL(page.url()).searchParams.get("squirrel")!;
  const selected = snapshot.observations.find((o) => o.id === selectedId)!;
  const earned =
    2 +
    Number(selected.behaviours.approaches === true) +
    Number(selected.behaviours.moans === true);
  await expect(page.locator(".mission-count").first()).toHaveText(
    `${earned}/5`,
  );
  const sharedUrl = page.url();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy sighting link" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(sharedUrl);
  await page.reload();
  await expect(page.locator('[data-pane="observation"]')).toBeVisible();
  await expect(page.locator(".mission-count").first()).toHaveText(
    `${earned}/5`,
  );
  await page.screenshot({ path: "artifacts/selected.png" });
  await page
    .locator(".panel-tabs:visible")
    .getByRole("button", { name: "Notebook" })
    .click();
  await expect(page.locator("[data-notebook] button")).toHaveCount(1);
  await page.locator("[data-notebook] button").click();
  await expect(page.locator("[data-card]")).toContainText("Black");
  await page.goto("./?squirrel=invalid-id");
  await expect(page.locator(".toast")).toContainText("could not be found");
  await page
    .locator(".panel-tabs:visible")
    .getByRole("button", { name: "Notebook" })
    .click();
  await page
    .getByRole("button", { name: "Reset discoveries & mission progress" })
    .click();
  await expect(page.locator(".mission-count").first()).toHaveText("0/5");
  await expect(page.locator("[data-notebook]")).toContainText("A fresh page");
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});
test("list search, pagination, empty results and keyboard access", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Observation list", exact: true })
    .click();
  await expect(page.locator("[data-list] button")).toHaveCount(20);
  const first = await page.locator("[data-list] button").first().textContent();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.locator("[data-page]")).toHaveText("2 / 152");
  expect(
    await page.locator("[data-list] button").first().textContent(),
  ).not.toBe(first);
  await page
    .getByLabel("Search ID, coat, age or notes")
    .fill("no-squirrel-ever");
  await expect(page.locator("[data-list]")).toContainText(
    "No observations found",
  );
  await page.getByLabel("Search ID, coat, age or notes").fill(firstBlack.id);
  await expect(page.locator("[data-list] button")).toHaveCount(1);
  await page.locator("[data-list] button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-card]")).toContainText(
    firstBlack.observationId,
  );
  await expect(page.locator("[data-card] h2")).toBeFocused();
});
test("mobile keeps park and controls available without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await page.locator("[data-scene]").boundingBox())!.height,
  ).toBeGreaterThan(300);
  await page.screenshot({ path: "artifacts/mobile.png" });
  await page.locator('[data-action="surprise"]:visible').first().click();
  await expect(page.locator(".featured-squirrel")).toBeVisible();
  await page.locator(".featured-details").click();
  await expect(page.locator('[data-pane="observation"]')).toBeVisible();
  await page.locator('[data-action="sheet"]').click();
  await page.getByRole("button", { name: "Top-down view" }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.screenshot({ path: "artifacts/mobile-selected.png" });
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("non-WebGL list, denied clipboard and unavailable storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Storage disabled");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(Error("denied")) },
    });
  });
  await page.goto("./");
  await expect(page.locator('[data-pane="list"]')).toBeVisible();
  await expect(page.locator("[data-list] button")).toHaveCount(20);
  await page.locator("[data-list] button").first().click();
  await expect(page.locator("[data-card]")).toContainText("10A-AM-1006-01");
  await page.getByRole("button", { name: "Copy sighting link" }).click();
  await expect(page.getByLabel("Copy this link")).toBeVisible();
  await expect(page.getByLabel("Copy this link")).toHaveValue(
    /squirrel=10A-AM-1006-01/,
  );
  await page.screenshot({ path: "artifacts/no-webgl.png" });
});
test("all five missions persist and reset", async ({ page }) => {
  const records = [
    firstBlack,
    snapshot.observations.find((o) => o.fur === "Cinnamon")!,
    ...(["approaches", "climbing", "moans"] as const).map((b) =>
      snapshot.observations.find((o) => o.behaviours[b])!,
    ),
  ];
  for (const o of records) {
    await page.goto(`./?squirrel=${encodeURIComponent(o.id)}`);
    await expect(page.locator("[data-card]")).toContainText(o.observationId);
  }
  await expect(page.locator(".mission-count").first()).toHaveText("5/5");
  await page.reload();
  await expect(page.locator(".mission-count").first()).toHaveText("5/5");
  await page
    .locator(".panel-tabs:visible")
    .getByRole("button", { name: "Missions" })
    .click();
  await expect(page.locator(".mission-row.complete")).toHaveCount(5);
});
test("failed snapshot can retry and reduced motion selection works", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/data/census.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Retry loading" }),
  ).toBeVisible();
  await page.unroute("**/data/census.json");
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.locator("[data-scene] canvas")).toBeVisible();
  await page.locator('[data-action="surprise"]:visible').first().click();
  await expect(page.locator(".featured-squirrel")).toBeVisible();
  await page.locator(".featured-details").click();
  await expect(page.locator('[data-pane="observation"]')).toBeVisible();
});
test("a visible marker selects a real record, while dragging does not select", async ({
  page,
}) => {
  await ready(page);
  await page.locator(".squirrel-pin:visible").first().click();
  await expect(page.locator(".featured-squirrel")).toBeVisible();
  const id = new URL(page.url()).searchParams.get("squirrel");
  expect(snapshot.observations.some((o) => o.id === id)).toBe(true);
  const before = page.url();
  await page.mouse.move(540, 550);
  await page.mouse.down();
  await page.mouse.move(630, 520, { steps: 12 });
  await page.mouse.up();
  expect(page.url()).toBe(before);
  await page.getByRole("button", { name: "Top-down view" }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.screenshot({ path: "artifacts/marker-selection.png" });
});
test("source note markup stays inert text", async ({ page }) => {
  const fixture = structuredClone(snapshot);
  fixture.observations[0].notes = [
    {
      field: "other_activities",
      text: '<img src=x onerror="window.injected=true">',
    },
  ];
  await page.route("**/data/census.json", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto(`./?squirrel=${fixture.observations[0].id}`);
  await expect(page.locator(".note-text")).toHaveText(
    '<img src=x onerror="window.injected=true">',
  );
  await expect(page.locator("[data-card] img")).toHaveCount(0);
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
});
test("mount cleanup releases canvases, observers and queued frames, and supports remount", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const frames = new Set<number>();
    const raf = requestAnimationFrame,
      cancel = cancelAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      const id = raf((t) => {
        frames.delete(id);
        cb(t);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      cancel(id);
    };
    const observers = new Set<object>();
    for (const name of ["ResizeObserver", "IntersectionObserver"] as const) {
      const Original = window[name];
      const Wrapped = class extends (Original as typeof ResizeObserver) {
        observe(...args: Parameters<ResizeObserver["observe"]>) {
          observers.add(this);
          super.observe(...args);
        }
        disconnect() {
          observers.delete(this);
          super.disconnect();
        }
      };
      Object.defineProperty(window, name, { value: Wrapped });
    }
    Object.defineProperty(window, "lifecycleCounts", {
      get: () => ({ frames: frames.size, observers: observers.size }),
    });
  });
  await page.goto("/tests/browser/lifecycle.html");
  for (let cycle = 0; cycle < 2; cycle++) {
    await page
      .getByRole("button", { name: "Mount experience", exact: true })
      .click();
    await expect(page.locator("#fixture [data-scene] canvas")).toBeVisible();
    await page.locator('#fixture [data-action="surprise"]:visible').click();
    await page.locator("#fixture .featured-details").click();
    await expect(page.locator("#fixture [data-portrait] canvas")).toBeVisible();
    await page
      .getByRole("button", { name: "Unmount experience", exact: true })
      .click();
    await expect(page.locator("#fixture canvas")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                lifecycleCounts: { frames: number; observers: number };
              }
            ).lifecycleCounts,
        ),
      )
      .toEqual({ frames: 0, observers: 0 });
  }
});
test("production assets and deep links work under the configured base path", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await ready(page);
  await page.goto(`./?squirrel=${firstBlack.id}`);
  await expect(page.locator("[data-card]")).toContainText(
    firstBlack.observationId,
  );
  await expect(page.locator("[data-portrait] canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/selected.png" });
  expect(failures).toEqual([]);
});
