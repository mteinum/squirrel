import { execFileSync } from "node:child_process";
import { writeFile, rename, mkdir } from "node:fs/promises";
import { normalize, type RawRecord } from "../src/data/normalize";
const endpoint = "https://data.cityofnewyork.us/resource/vfnx-vebw.json";
function download(url: string): unknown {
  // curl respects the host's standard proxy settings, unlike some Node fetch configurations.
  return JSON.parse(
    execFileSync(
      "curl",
      [
        "--fail",
        "--silent",
        "--show-error",
        "--retry",
        "2",
        "--max-time",
        "90",
        url,
      ],
      { maxBuffer: 60 * 1024 * 1024 },
    ).toString(),
  );
}
let rows: RawRecord[] = [];
let usedEndpoint = endpoint;
try {
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const url = new URL(endpoint);
    url.searchParams.set("$limit", String(limit));
    url.searchParams.set("$offset", String(offset));
    url.searchParams.set("$order", "unique_squirrel_id ASC, :id ASC");
    const page = download(url.href);
    if (!Array.isArray(page)) throw new Error("Expected census record array");
    rows.push(...(page as RawRecord[]));
    console.log(`Census page ${offset / limit + 1}: ${page.length} records`);
    if (page.length < limit) break;
    if (offset > 100000) throw new Error("Unexpected dataset size");
  }
  const total = download(`${endpoint}?$select=count(*)`) as { count: string }[];
  if (rows.length !== Number(total[0]?.count))
    throw new Error("Record count changed during pagination");
} catch (error) {
  console.warn(
    "Paginated API failed; trying the official complete JSON export.",
    String(error),
  );
  usedEndpoint =
    "https://data.cityofnewyork.us/api/views/vfnx-vebw/rows.json?accessType=DOWNLOAD";
  const exported = download(usedEndpoint) as {
    meta: { view: { columns: { fieldName: string }[] } };
    data: unknown[][];
  };
  if (!Array.isArray(exported.data))
    throw new Error(
      "Official export failed; existing snapshot has not been modified.",
    );
  rows = exported.data.map((row) =>
    Object.fromEntries(
      exported.meta.view.columns.map((col, i) => [col.fieldName, row[i]]),
    ),
  );
}
const snapshot = normalize(rows, usedEndpoint, new Date().toISOString());
if (!snapshot.observations.length || snapshot.metadata.missingIds)
  throw new Error(
    `Suspicious census export: ${JSON.stringify(snapshot.metadata)}`,
  );
if (rows.length !== 3023)
  console.warn(
    `Sanity check: expected approximately 3,023 observations; retrieved ${rows.length}. Review source changes.`,
  );
await mkdir("public/data", { recursive: true });
await writeFile("public/data/census.json.tmp", JSON.stringify(snapshot));
await rename("public/data/census.json.tmp", "public/data/census.json");
console.log(JSON.stringify(snapshot.metadata, null, 2));
