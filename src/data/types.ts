export const behaviourKeys = [
  "running",
  "chasing",
  "climbing",
  "eating",
  "foraging",
  "approaches",
  "indifferent",
  "runs_from",
  "kuks",
  "quaas",
  "moans",
  "tail_flags",
  "tail_twitches",
] as const;
export type Behaviour = (typeof behaviourKeys)[number];
export interface Observation {
  id: string;
  observationId: string;
  longitude: number;
  latitude: number;
  date: string | null;
  shift: "AM" | "PM" | null;
  fur: string | null;
  highlightFur: string | null;
  age: string | null;
  location: string | null;
  heightValue: number | null;
  heightRaw: string | null;
  behaviours: Record<Behaviour, boolean | null>;
  notes: { field: string; text: string }[];
}
export interface Snapshot {
  schemaVersion: 1;
  metadata: {
    source: string;
    endpoint: string;
    retrievedAt: string;
    rawCount: number;
    count: number;
    rejectedCoordinates: number;
    missingIds: number;
    duplicateIds: number;
    transformations: string[];
  };
  observations: Observation[];
}
export interface ParkData {
  source: string;
  retrievedAt: string;
  attribution: string;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
}
