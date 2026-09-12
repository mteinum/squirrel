import { behaviourKeys, type Observation } from "./data/types";

const nicknames = [
  "Sir Nuttingham",
  "Professor Acorn",
  "Gary",
  "Hazel",
  "Captain Crumb",
  "Nutasha",
  "Barry McBush",
  "Agent 00Nut",
  "Lord Fluffington",
  "Squirrelly Dan",
  "Lady Chestnut",
  "Walter Whiskers",
  "Maple",
  "Inspector Nibbles",
  "Juniper",
  "Count Snackula",
  "Pip",
  "The Great Catsby",
  "Major Mischief",
  "Fern",
];

/** Presentation only: stable across sessions, without changing census records. */
export function nickname(observation: Pick<Observation, "id">): string {
  let hash = 2166136261;
  for (const character of observation.id)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return nicknames[(hash >>> 0) % nicknames.length];
}

export function fieldLabel(value: string): string {
  const labels: Record<string, string> = {
    approaches: "Approaching humans",
    runs_from: "Avoiding humans",
    indifferent: "Unbothered by humans",
    "Ground Plane": "On the ground",
    "Above Ground": "Above the ground",
    tail_flags: "Tail flagging",
    tail_twitches: "Tail twitching",
  };
  return (
    labels[value] ??
    value.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase())
  );
}

export function squirrelActivity(o: Observation): {
  label: string;
  note: string;
} {
  const copy: Record<string, string> = {
    running: "Highly mobile. Possibly late for something.",
    chasing: "An urgent squirrel matter is underway.",
    climbing: "Vertical ambitions detected.",
    eating: "Snack-related activity detected.",
    foraging: "Searching the premises for snacks.",
    approaches: "Curiosity levels are concerning.",
    indifferent: "Human presence deemed irrelevant.",
    runs_from: "Strategic retreat initiated.",
    kuks: "Strong opinions detected.",
    quaas: "An extended squirrel statement.",
    moans: "Expressing concerns at length.",
    tail_flags: "Tail-based communication intensifies.",
    tail_twitches: "Minor tail negotiations underway.",
  };
  const active = behaviourKeys.filter((key) => o.behaviours[key] === true);
  const primary = (
    [
      "eating",
      "running",
      "foraging",
      "climbing",
      "chasing",
      "runs_from",
      "approaches",
      "indifferent",
      "kuks",
      "quaas",
      "moans",
      "tail_flags",
      "tail_twitches",
    ] as const
  ).find((key) => o.behaviours[key] === true);
  return {
    label: active.length ? active.map(fieldLabel).join(" · ") : "Not recorded",
    note: primary
      ? copy[primary]
      : "A small resident. A considerable presence.",
  };
}

export function countMessage(count: number): string {
  if (count === 0) return "No squirrels detected. Suspicious.";
  if (count === 1) return "We have our squirrel.";
  if (count <= 10) return "A manageable amount of squirrel.";
  if (count <= 100) return "Things are getting squirrelly.";
  if (count < 1000) return "That’s a lot of acorns.";
  return "Central Park appears compromised.";
}
