import type { Behaviour, Observation } from "./data/types";
export interface Filters {
  fur: string;
  behaviour: string;
  date: string;
  shift: string;
  query: string;
}
export const emptyFilters = (): Filters => ({
  fur: "",
  behaviour: "",
  date: "",
  shift: "",
  query: "",
});
export function matches(observation: Observation, filters: Filters): boolean {
  return (
    (!filters.fur || (observation.fur ?? "Unknown") === filters.fur) &&
    (!filters.behaviour ||
      observation.behaviours[filters.behaviour as Behaviour] === true) &&
    (!filters.date || (observation.date ?? "Unknown") === filters.date) &&
    (!filters.shift || (observation.shift ?? "Unknown") === filters.shift) &&
    (!filters.query ||
      [
        observation.id,
        observation.fur,
        observation.age,
        ...observation.notes.map((n) => n.text),
      ]
        .join(" ")
        .toLowerCase()
        .includes(filters.query.trim().toLowerCase()))
  );
}
export const missions = [
  {
    id: "black",
    title: "A little midnight",
    detail: "Find a black squirrel",
    match: (o: Observation) => o.fur === "Black",
  },
  {
    id: "cinnamon",
    title: "Sugar & spice",
    detail: "Find a cinnamon squirrel",
    match: (o: Observation) => o.fur === "Cinnamon",
  },
  {
    id: "approaches",
    title: "Hello, neighbour",
    detail: "Find an “approaches” observation",
    match: (o: Observation) => o.behaviours.approaches === true,
  },
  {
    id: "climbing",
    title: "On the up & up",
    detail: "Find a “climbing” observation",
    match: (o: Observation) => o.behaviours.climbing === true,
  },
  {
    id: "moans",
    title: "Something to say",
    detail: "Find a “moans” observation",
    match: (o: Observation) => o.behaviours.moans === true,
  },
];
export const STORAGE_KEY = "squirrel-safari:discoveries:v1";
export function readDiscoveries(
  storage: Pick<Storage, "getItem">,
  validIds: Set<string>,
): { ids: string[]; unavailable: boolean } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ids: [], unavailable: false };
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1 ||
      !("ids" in data) ||
      !Array.isArray(data.ids)
    )
      return { ids: [], unavailable: false };
    return {
      ids: [
        ...new Set(
          data.ids.filter(
            (id): id is string => typeof id === "string" && validIds.has(id),
          ),
        ),
      ],
      unavailable: false,
    };
  } catch {
    return { ids: [], unavailable: true };
  }
}
export function saveDiscoveries(
  storage: Pick<Storage, "setItem">,
  ids: string[],
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ids }));
    return true;
  } catch {
    return false;
  }
}
export class SafariState {
  filters = emptyFilters();
  selected: Observation | null = null;
  discovered = new Set<string>();
  readonly byId: Map<string, Observation>;
  constructor(
    readonly observations: Observation[],
    ids: string[] = [],
  ) {
    this.byId = new Map(observations.map((o) => [o.id, o]));
    ids.forEach((id) => {
      if (this.byId.has(id)) this.discovered.add(id);
    });
  }
  get matching(): Observation[] {
    return this.observations.filter((o) => matches(o, this.filters));
  }
  select(id: string): Observation | null {
    const observation = this.byId.get(id);
    if (!observation) return null;
    this.selected = observation;
    this.discovered.add(id);
    return observation;
  }
  get completed(): Set<string> {
    const observations = [...this.discovered].flatMap(
      (id) => this.byId.get(id) ?? [],
    );
    return new Set(
      missions.filter((m) => observations.some(m.match)).map((m) => m.id),
    );
  }
  surprise(random = Math.random): Observation | null {
    const pool = this.matching;
    if (!pool.length) return null;
    return this.select(
      pool[
        Math.min(
          pool.length - 1,
          Math.floor(Math.max(0, random()) * pool.length),
        )
      ].id,
    );
  }
}
