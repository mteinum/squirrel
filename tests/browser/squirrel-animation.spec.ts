import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { behaviourKeys, type Snapshot } from "../../src/data/types";
const snapshot = JSON.parse(
  readFileSync(
    new URL("../../public/data/census.json", import.meta.url),
    "utf8",
  ),
) as Snapshot;
const cases = [
  "eating",
  "running",
  "foraging",
  "tail_flags",
  ...behaviourKeys.filter(
    (b) => !["eating", "running", "foraging", "tail_flags"].includes(b),
  ),
  "idle",
] as const;
for (const behaviour of cases) {
  test(`selected motion: ${behaviour}`, async ({ page }) => {
    const clockTime = new Date("2026-09-12T12:00:00Z");
    await page.clock.install({ time: clockTime });
    await page.clock.pauseAt(new Date(clockTime.getTime() + 1000));
    const data = structuredClone(snapshot);
    const observation = data.observations.find((o) =>
      behaviour === "idle"
        ? !behaviourKeys.some((b) => o.behaviours[b])
        : o.behaviours[behaviour],
    )!;
    // Isolate one recorded true flag to review its motion independently of compatible layers.
    for (const key of behaviourKeys)
      if (key !== behaviour) observation.behaviours[key] = false;
    await page.route("**/data/census.json", (route) =>
      route.fulfill({ json: data }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/tests/browser/animation-lab.html?squirrel=${observation.id}`,
    );
    await expect(page.locator("[data-card]")).toContainText(
      observation.observationId,
    );
    await page.clock.runFor(32);
    await page.clock.fastForward(1500);
    const a = await page.evaluate(() => Reflect.get(window, "animationReview"));
    let b = a;
    await expect
      .poll(async () => {
        await page.clock.fastForward(100);
        b = await page.evaluate(() => Reflect.get(window, "animationReview"));
        return JSON.stringify(b.joints) + JSON.stringify(b.position);
      })
      .not.toBe(JSON.stringify(a.joints) + JSON.stringify(a.position));
    expect(a.actors).toBe(1);
    expect(b.actors).toBe(1);
    expect(Math.hypot(b.position.x, b.position.z)).toBeLessThan(2);
    await page.screenshot({
      path: `artifacts/animation-${behaviour}.png`,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}

test("selection replacement, rest, hidden-tab pause, reduced motion, and cleanup keep one actor and one frame loop", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.clock.install({ time: new Date("2026-09-12T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-12T12:00:01Z"));
  await page.addInitScript(() => {
    const frames = new Set<number>(),
      timers = new Set<number>();
    const raf = requestAnimationFrame,
      caf = cancelAnimationFrame,
      set = window.setTimeout,
      clear = window.clearTimeout;
    window.requestAnimationFrame = (callback) => {
      const id = raf((t) => {
        frames.delete(id);
        callback(t);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      caf(id);
    };
    window.setTimeout = ((
      callback: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      const id = set(() => {
        timers.delete(id);
        if (typeof callback === "function") callback(...args);
      }, delay);
      timers.add(id);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = (id) => {
      if (typeof id === "number") timers.delete(id);
      clear(id);
    };
    Object.defineProperty(window, "animationWork", {
      get: () => ({ frames: frames.size, timers: timers.size }),
    });
  });
  await page.goto("/tests/browser/animation-lab.html");
  await expect(page.locator("[data-scene] canvas")).toBeVisible();
  await page.clock.runFor(32);
  const baseline = await page.evaluate(() =>
    Reflect.get(window, "animationWork"),
  );
  const records = ["eating", "running", "kuks", "tail_flags"].map((key) =>
    snapshot.observations.find(
      (o) => o.behaviours[key as (typeof behaviourKeys)[number]],
    )!,
  );
  for (const observation of records) {
    await page
      .getByRole("button", { name: "Observation list", exact: true })
      .click();
    await page.getByRole("searchbox").fill(observation.id);
    await page.locator("[data-list] button").first().click();
    await page.clock.runFor(32);
    await page.clock.fastForward(1200);
    await page
      .getByRole("button", { name: "Observation list", exact: true })
      .click();
    await page.getByRole("searchbox").fill("");
    await page.clock.runFor(32);
    const review = await page.evaluate(() =>
      Reflect.get(window, "animationReview"),
    );
    expect(review.actors).toBe(1);
    expect(review.waves).toBeLessThanOrEqual(3);
    expect(
      await page.evaluate(() => Reflect.get(window, "inspectMarkerScales")()),
    ).toEqual([snapshot.observations.indexOf(observation)]);
    const work = await page.evaluate(() =>
      Reflect.get(window, "animationWork"),
    );
    expect(work.frames).toBeLessThanOrEqual(1);
    expect(work.timers).toBeLessThanOrEqual(baseline.timers + 4);
  }
  await page.clock.fastForward(5000);
  const rest = await page.evaluate(
    () => Reflect.get(window, "animationReview").renders,
  );
  await page.clock.fastForward(300);
  expect(
    await page.evaluate(() => Reflect.get(window, "animationReview").renders),
  ).toBe(rest);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(32);
  const reduced = await page.evaluate(() =>
    Reflect.get(window, "animationReview"),
  );
  await page.clock.fastForward(30000);
  expect(
    await page.evaluate(() => Reflect.get(window, "animationReview").renders),
  ).toBe(reduced.renders);
  expect(
    Math.hypot(reduced.position.x, reduced.position.y, reduced.position.z),
  ).toBe(0);
  expect(reduced.waves).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(32);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const paused = await page.evaluate(
    () => Reflect.get(window, "animationReview").renders,
  );
  await page.clock.fastForward(30000);
  expect(
    await page.evaluate(() => Reflect.get(window, "animationReview").renders),
  ).toBe(paused);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(32);
  await page.getByRole("button", { name: "Close featured squirrel" }).click();
  await page.clock.runFor(32);
  expect(
    await page.evaluate(() => Reflect.get(window, "inspectMarkerScales")()),
  ).toEqual([]);
  expect(new URL(page.url()).searchParams.has("squirrel")).toBe(false);
  await page.evaluate(() => Reflect.get(window, "unmountAnimationReview")());
  await page.clock.fastForward(30000);
  expect(
    await page.evaluate(() => Reflect.get(window, "animationWork")),
  ).toEqual({ frames: 0, timers: 0 });
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("the animated squirrel remains above the expanded mobile notebook", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const o = snapshot.observations.find((o) => o.behaviours.eating)!;
  await page.goto(`/tests/browser/animation-lab.html?squirrel=${o.id}`);
  await expect(page.locator(".panel")).toHaveClass(/expanded/);
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "animationReview").renders),
    )
    .toBeGreaterThan(3);
  const frame = await page.locator("[data-scene]").boundingBox();
  const sheet = await page.locator(".panel").boundingBox();
  const actor = await page.evaluate(() =>
    Reflect.get(window, "animationReview"),
  );
  expect(frame!.y + actor.screen.y).toBeLessThan(sheet!.y - 15);
  expect(actor.screen.x).toBeGreaterThan(0);
  expect(actor.screen.x).toBeLessThan(390);
  await page.screenshot({
    path: "artifacts/animation-mobile.png",
    animations: "disabled",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
