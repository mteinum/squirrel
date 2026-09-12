import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  nickname,
  fieldLabel,
  squirrelActivity,
  countMessage,
} from "../src/field-guide";
import type { Snapshot } from "../src/data/types";

const { observations } = JSON.parse(
  readFileSync(new URL("../public/data/census.json", import.meta.url), "utf8"),
) as Snapshot;

test("field identities are stable, presentation-only, and describe recorded activity", () => {
  const original = JSON.stringify(observations);
  for (const observation of observations) {
    assert.equal(nickname(observation), nickname(structuredClone(observation)));
    assert.ok(nickname(observation).length > 0);
    const activity = squirrelActivity(observation);
    if (activity.label === "Eating")
      assert.equal(observation.behaviours.eating, true);
  }
  assert.ok(new Set(observations.map(nickname)).size > 10);
  assert.equal(JSON.stringify(observations), original);
  assert.equal(fieldLabel("Ground Plane"), "On the ground");
  assert.equal(fieldLabel("runs_from"), "Avoiding humans");
});

test("count messages distinguish empty, singular and crowded results", () => {
  assert.match(countMessage(0), /No squirrels/);
  assert.equal(countMessage(1), "We have our squirrel.");
  assert.notEqual(countMessage(10), countMessage(11));
  assert.notEqual(countMessage(100), countMessage(101));
  assert.notEqual(countMessage(999), countMessage(1000));
});
