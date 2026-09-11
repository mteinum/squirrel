import { behaviourKeys, type Observation, type Snapshot } from "./types";
export type RawRecord = Record<string, unknown>;
export function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return !s || ["?", "nan", "null", "n/a"].includes(s.toLowerCase()) ? null : s;
}
export function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return null;
}
export function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) return null;
  const month = Number(value.slice(0, 2)),
    day = Number(value.slice(2, 4)),
    year = Number(value.slice(4));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}
function coordinate(value: unknown): number {
  return typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "")
    ? Number(value)
    : NaN;
}
export function normalize(
  rows: RawRecord[],
  endpoint: string,
  retrievedAt: string,
): Snapshot {
  let rejectedCoordinates = 0,
    missingIds = 0,
    duplicateIds = 0;
  const ids = new Set<string>();
  const observations: Observation[] = [];
  for (const raw of rows) {
    const longitude = coordinate(raw.x),
      latitude = coordinate(raw.y);
    // Deliberately broad NYC-area bounds catch swapped axes and unrelated positions without clipping park-edge sightings.
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -74.1 ||
      longitude > -73.8 ||
      latitude < 40.6 ||
      latitude > 40.95
    ) {
      rejectedCoordinates++;
      continue;
    }
    const observationId = nullableText(raw.unique_squirrel_id);
    let id = observationId;
    if (!id) {
      missingIds++;
      continue;
    }
    if (ids.has(id)) {
      duplicateIds++;
      let suffix = 2;
      while (ids.has(`${observationId}~${suffix}`)) suffix++;
      id = `${observationId}~${suffix}`;
    }
    ids.add(id);
    const heightRaw = nullableText(raw.above_ground_sighter);
    const heightValue =
      heightRaw && /^\d+(\.\d+)?$/.test(heightRaw) ? Number(heightRaw) : null;
    const notes = [
      "specific_location",
      "other_activities",
      "other_interactions",
      "other_comments",
      "color_notes",
      "combination_of_primary_and",
    ].flatMap((field) => {
      const text = nullableText(raw[field]);
      return text ? [{ field, text }] : [];
    });
    observations.push({
      id,
      observationId: observationId!,
      longitude,
      latitude,
      date: parseDate(raw.date),
      shift: raw.shift === "AM" || raw.shift === "PM" ? raw.shift : null,
      fur: nullableText(raw.primary_fur_color),
      highlightFur: nullableText(raw.highlight_fur_color),
      age: nullableText(raw.age),
      location: nullableText(raw.location),
      heightValue,
      heightRaw,
      behaviours: Object.fromEntries(
        behaviourKeys.map((key) => [key, booleanValue(raw[key])]),
      ) as Observation["behaviours"],
      notes,
    });
  }
  observations.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return {
    schemaVersion: 1,
    metadata: {
      source:
        "https://data.cityofnewyork.us/Environment/2018-Central-Park-Squirrel-Census-Squirrel-Data/vfnx-vebw",
      endpoint,
      retrievedAt,
      rawCount: rows.length,
      count: observations.length,
      rejectedCoordinates,
      missingIds,
      duplicateIds,
      transformations: [
        "MMDDYYYY to validated ISO calendar date; unknown dates remain null.",
        "Boolean strings and booleans to true/false/null; missing text to null.",
        "Parse numeric above_ground_sighter; units unspecified in API metadata. Retain original text including FALSE.",
        "Reject missing/non-finite/out-of-NYC coordinates; report rejected count. Preserve original valid lon/lat.",
        "Trim text, preserve source notes; skip/report missing IDs; preserve repeated source IDs with stable ordered ~2 suffixes for links.",
        "Sort by observation ID; local WGS84 tangent-plane metric projection applied only at rendering.",
      ],
    },
    observations,
  };
}
