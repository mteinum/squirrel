import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, parseDate, booleanValue } from "../src/data/normalize";
import { project } from "../src/data/geo";
import {
  SafariState,
  emptyFilters,
  matches,
  readDiscoveries,
  saveDiscoveries,
} from "../src/state";
import type { Snapshot } from "../src/data/types";
const snapshot = JSON.parse(
  readFileSync(new URL("../public/data/census.json", import.meta.url), "utf8"),
) as Snapshot;
test("calendar dates are month-first, validated and timezone independent", () => {
  assert.equal(parseDate("10062018"), "2018-10-06");
  assert.equal(parseDate("02292020"), "2020-02-29");
  for (const date of ["02312018", "02292018", "13012018", "", undefined])
    assert.equal(parseDate(date), null);
});
test("false and missing boolean flags remain distinguishable", () => {
  assert.equal(booleanValue(" FALSE "), false);
  assert.equal(booleanValue("true"), true);
  assert.equal(booleanValue(undefined), null);
  assert.equal(booleanValue("maybe"), null);
});
test("reject invalid coordinates, retain duplicated source IDs and preserve notes as text", () => {
  const row = {
    unique_squirrel_id: "A",
    x: "-73.97",
    y: "40.78",
    date: "10062018",
    other_activities: "<script>alert(1)</script>",
    above_ground_sighter: "12",
  };
  const data = normalize(
    [
      row,
      { ...row, primary_fur_color: "Black" },
      { ...row, x: "" },
      { ...row, y: "NaN" },
      { ...row, x: "40.78", y: "-73.97" },
    ],
    "source",
    "now",
  );
  assert.equal(data.metadata.rejectedCoordinates, 3);
  assert.equal(data.observations.length, 2);
  assert.deepEqual(
    data.observations.map((o) => o.id),
    ["A", "A~2"],
  );
  assert.ok(data.observations.every((o) => o.observationId === "A"));
  assert.equal(data.observations[0].heightValue, 12);
  assert.equal(data.observations[0].notes[0].text, row.other_activities);
});
test("bundled snapshot has unique navigation keys and valid metadata", () => {
  assert.equal(snapshot.observations.length, snapshot.metadata.count);
  assert.equal(
    new Set(snapshot.observations.map((o) => o.id)).size,
    snapshot.metadata.count,
  );
  assert.ok(snapshot.metadata.count > 2500);
  assert.ok(snapshot.observations.every((o) => o.date?.startsWith("2018-10")));
});
test("local metric projection preserves short distances and park aspect", () => {
  const p = project(-73.9654, 40.7829),
    north = project(-73.9654, 40.7839),
    east = project(-73.9644, 40.7829);
  assert.deepEqual(p, { x: 0, z: -0 });
  assert.ok(Math.abs(Math.hypot(north.x, north.z) * 10 - 111.05) < 0.2);
  assert.ok(Math.abs(Math.hypot(east.x, east.z) * 10 - 84.42) < 0.2);
});
test("filters intersect; surprise respects search, colour, behaviour, date and shift", () => {
  const state = new SafariState(snapshot.observations);
  const wanted = snapshot.observations.find(
    (o) => o.fur === "Black" && o.behaviours.climbing,
  )!;
  state.filters = {
    fur: "Black",
    behaviour: "climbing",
    date: wanted.date!,
    shift: wanted.shift!,
    query: wanted.observationId,
  };
  assert.ok(state.matching.length);
  assert.ok(state.matching.every((o) => matches(o, state.filters)));
  assert.equal(state.surprise(() => 0)?.id, wanted.id);
  state.filters.query = "no-such-observation-ever";
  assert.equal(state.surprise(), null);
  assert.ok(matches(wanted, emptyFilters()));
});
test("missions only complete from selected observations, handle invalid IDs and reset", () => {
  const state = new SafariState(snapshot.observations);
  assert.equal(state.completed.size, 0);
  assert.equal(state.select("invalid"), null);
  assert.equal(state.discovered.size, 0);
  const black = snapshot.observations.find((o) => o.fur === "Black")!;
  state.select(black.id);
  state.select(black.id);
  assert.equal(state.discovered.size, 1);
  assert.ok(state.completed.has("black"));
  const restored = new SafariState(snapshot.observations, [
    ...state.discovered,
  ]);
  assert.ok(restored.completed.has("black"));
  state.discovered.clear();
  assert.equal(state.completed.size, 0);
});
test("storage tolerates corrupt, stale, unavailable and malicious values", () => {
  const valid = new Set(["A"]);
  for (const raw of [
    "{",
    "null",
    '{"version":2,"ids":["A"]}',
    '{"version":1,"ids":"A"}',
  ])
    assert.deepEqual(readDiscoveries({ getItem: () => raw }, valid).ids, []);
  assert.deepEqual(
    readDiscoveries(
      { getItem: () => '{"version":1,"ids":["A","A","missing",5]}' },
      valid,
    ).ids,
    ["A"],
  );
  assert.equal(
    readDiscoveries(
      {
        getItem: () => {
          throw Error();
        },
      },
      valid,
    ).unavailable,
    true,
  );
  assert.equal(
    saveDiscoveries(
      {
        setItem: () => {
          throw Error();
        },
      },
      ["A"],
    ),
    false,
  );
});
