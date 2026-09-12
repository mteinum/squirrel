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
  if (o.behaviours.eating)
    return { label: "Eating", note: "Snack-related activity detected." };
  if (o.behaviours.running)
    return {
      label: "Running",
      note: "Highly mobile. Possibly late for something.",
    };
  if (o.behaviours.climbing)
    return { label: "Climbing", note: "Taking the scenic route. Vertically." };
  if (o.behaviours.foraging)
    return { label: "Foraging", note: "An independent snack investigation." };
  const active = behaviourKeys.find((key) => o.behaviours[key] === true);
  return {
    label: active ? fieldLabel(active) : "Not recorded",
    note: "A small resident. A considerable presence.",
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
