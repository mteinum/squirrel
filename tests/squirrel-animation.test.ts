import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import {
  behaviourKeys,
  type Behaviour,
  type Snapshot,
} from "../src/data/types";
import { mapObservationToAnimation } from "../src/scene/animation/state";
import { createSquirrelAnimator } from "../src/scene/animation/controller";
import { squirrelResources } from "../src/scene/squirrel";
const source = (
  JSON.parse(
    readFileSync(
      new URL("../public/data/census.json", import.meta.url),
      "utf8",
    ),
  ) as Snapshot
).observations[0];
function observation(...flags: Behaviour[]) {
  return {
    ...source,
    behaviours: Object.fromEntries(
      behaviourKeys.map((key) => [key, flags.includes(key)]),
    ) as typeof source.behaviours,
  };
}
function actor(...flags: Behaviour[]) {
  const resources = squirrelResources(),
    model = resources.create("Cinnamon");
  const parent = new THREE.Group();
  parent.add(model);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(5, 8, 10);
  const controller = createSquirrelAnimator(model, observation(...flags));
  return {
    model,
    controller,
    camera,
    dispose() {
      controller.dispose();
      resources.dispose();
    },
  };
}
test("adapter preserves independent compatible layers, false/null flags and the original record", () => {
  const o = observation("running", "eating", "tail_twitches", "quaas");
  const before = JSON.stringify(o);
  assert.deepEqual(mapObservationToAnimation(o), {
    locomotion: "run",
    activity: "eat",
    tail: "twitch",
    vocalization: "quaa",
    observed: ["running", "eating", "quaas", "tail_twitches"],
  });
  assert.equal(JSON.stringify(o), before);
  const unknown = observation();
  unknown.behaviours.running = null;
  assert.deepEqual(mapObservationToAnimation(unknown), {
    locomotion: undefined,
    activity: undefined,
    tail: undefined,
    vocalization: undefined,
    observed: [],
  });
});
test("every recorded behaviour has a distinct procedural pose and stays near its fixed anchor", () => {
  const signatures = new Set<string>();
  for (const key of behaviourKeys) {
    const a = actor(key);
    a.controller.update(0, a.camera);
    const samples = [];
    for (let t = 0; t <= 5500; t += 100) {
      a.controller.update(t, a.camera);
      const pose = a.controller.pose;
      assert.ok(Math.hypot(pose.x, pose.z) < 2, `${key} wandered`);
      assert.ok(pose.y >= 0 && pose.y <= 1.2, `${key} height`);
      if (t === 1200 || t === 2300) samples.push({ ...pose });
    }
    signatures.add(JSON.stringify(samples));
    assert.ok(a.model.position.length() < 0.001, `${key} returns to anchor`);
    a.dispose();
  }
  assert.equal(signatures.size, behaviourKeys.length);
});
test("quiet intervals require no frames, actions repeat, and seeded runs are reproducible", () => {
  const a = actor("eating", "tail_twitches"),
    b = actor("eating", "tail_twitches");
  let actions = 0,
    last = "",
    quiet = 0;
  for (let t = 0; t <= 60000; t += 100) {
    const result = a.controller.update(t, a.camera);
    const other = b.controller.update(t, b.camera);
    assert.deepEqual(result, other);
    assert.deepEqual(a.controller.pose, b.controller.pose);
    if (result.phase === "action" && last !== "action") actions++;
    if (!result.moving) {
      quiet++;
      assert.ok(result.wakeIn! > 0);
    }
    last = result.phase;
  }
  assert.ok(actions >= 3);
  assert.ok(quiet > 250);
  a.dispose();
  b.dispose();
});
test("pause freezes the timeline and reduced motion has a stable pose without waves or scheduled work", () => {
  const a = actor("running", "tail_flags", "kuks");
  a.controller.update(0, a.camera);
  a.controller.update(1200, a.camera);
  const before = JSON.stringify(a.controller.pose);
  a.controller.pause();
  a.controller.update(80000, a.camera);
  assert.equal(JSON.stringify(a.controller.pose), before);
  const staticStep = a.controller.update(80100, a.camera, true);
  const pose = JSON.stringify(a.controller.pose);
  assert.equal(staticStep.moving, false);
  assert.equal(staticStep.wakeIn, null);
  a.controller.update(90000, a.camera, true);
  assert.equal(JSON.stringify(a.controller.pose), pose);
  assert.equal(a.model.position.length(), 0);
  assert.equal(
    a.model.children.filter(
      (node) => node instanceof THREE.Mesh && node.visible,
    ).length,
    0,
  );
  a.dispose();
});
test("vocalization pool is bounded, styles differ, and disposal removes all temporary effects", () => {
  const samples = [];
  for (const key of ["kuks", "quaas", "moans"] as const) {
    const a = actor(key);
    a.controller.update(0, a.camera);
    a.controller.update(850, a.camera);
    const waves = a.model.children.filter(
      (node) => node instanceof THREE.Mesh && node.visible,
    );
    assert.ok(waves.length > 0 && waves.length <= 3);
    samples.push(waves.map((w) => w.scale.toArray()));
    a.controller.dispose();
    assert.equal(
      a.model.children.filter((node) => node instanceof THREE.Mesh).length,
      0,
    );
    assert.equal(a.controller.update(900, a.camera).moving, false);
    a.dispose();
  }
  assert.equal(new Set(samples.map((s) => JSON.stringify(s))).size, 3);
});
