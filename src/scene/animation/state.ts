import {
  behaviourKeys,
  type Behaviour,
  type Observation,
} from "../../data/types";

export interface SquirrelAnimationState {
  locomotion?: "run" | "chase" | "approach" | "avoid" | "relax";
  activity?: "eat" | "forage" | "climb";
  vocalization?: "kuk" | "quaa" | "moan";
  tail?: "flag" | "twitch";
  observed: Behaviour[];
}

const locomotion = {
  runs_from: "avoid",
  approaches: "approach",
  chasing: "chase",
  running: "run",
  indifferent: "relax",
} as const;
const activities = {
  eating: "eat",
  foraging: "forage",
  climbing: "climb",
} as const;
const vocalizations = { moans: "moan", quaas: "quaa", kuks: "kuk" } as const;
const tails = { tail_flags: "flag", tail_twitches: "twitch" } as const;
function first<T extends string>(
  values: Partial<Record<Behaviour, T>>,
  o: Observation,
): T | undefined {
  return (Object.entries(values) as [Behaviour, T][]).find(
    ([key]) => o.behaviours[key] === true,
  )?.[1];
}
/** Census flags are independent booleans. Missing, false, and the UI's “Any” are not activities. */
export function mapObservationToAnimation(
  o: Observation,
): SquirrelAnimationState {
  return {
    locomotion: first(locomotion, o),
    activity: first(activities, o),
    vocalization: first(vocalizations, o),
    tail: first(tails, o),
    observed: behaviourKeys.filter((key) => o.behaviours[key] === true),
  };
}

export function seededRandom(id: string): () => number {
  let seed = 2166136261;
  for (const character of id)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
