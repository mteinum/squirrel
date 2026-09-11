import { execFileSync } from "node:child_process";
import { writeFile, rename } from "node:fs/promises";
const source = "https://data.cityofnewyork.us/resource/xhvt-s4va.json";
const url = new URL(source);
url.searchParams.set("$where", "gispropnum='M010'");
url.searchParams.set("$limit", "100");
url.searchParams.set("$order", ":id");
const rows = JSON.parse(
  execFileSync("curl", ["-fsS", "--retry", "2", "--max-time", "90", url.href], {
    maxBuffer: 30 * 1024 * 1024,
  }).toString(),
);
if (
  !Array.isArray(rows) ||
  !rows.length ||
  rows.some((r) => r.multipolygon?.type !== "MultiPolygon")
)
  throw new Error("Invalid official park geometry; snapshot unchanged.");
const geometry = {
  type: "MultiPolygon",
  coordinates: rows.flatMap((r) => r.multipolygon.coordinates),
};
await writeFile(
  "public/data/park.json.tmp",
  JSON.stringify({
    source:
      "https://data.cityofnewyork.us/Recreation/Functional-Parkland/xhvt-s4va",
    endpoint: url.href,
    retrievedAt: new Date().toISOString(),
    attribution: "NYC Department of Parks & Recreation · NYC Open Data",
    geometry,
  }),
);
await rename("public/data/park.json.tmp", "public/data/park.json");
console.log(
  `Saved ${geometry.coordinates.length} Central Park polygons, retaining source coordinates.`,
);
