import type { SquirrelAnimationState } from "./state";
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  bodyY: number;
  stretch: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  pawL: number;
  pawR: number;
  pawLiftL: number;
  pawLiftR: number;
  footL: number;
  footR: number;
  tailYaw: number;
  tailLift: number;
  tailTip: number;
  food: boolean;
  foodY: number;
  reaction: string;
}
export const neutralPose = (): Pose => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  bodyY: 0,
  stretch: 1,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  pawL: 0,
  pawR: 0,
  pawLiftL: 0,
  pawLiftR: 0,
  footL: 0,
  footR: 0,
  tailYaw: 0,
  tailLift: 0,
  tailTip: 0,
  food: false,
  foodY: 0,
  reaction: "",
});
export const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const envelope = (u: number) =>
  smooth(u / 0.1) * (1 - smooth((u - 0.82) / 0.18));
type Motion = (p: Pose, u: number, t: number) => void;
const travel = (u: number) => smooth(u / 0.6) * (1 - smooth((u - 0.8) / 0.2));
const hops = (u: number, n: number) =>
  Math.abs(Math.sin(Math.PI * n * Math.min(u / 0.65, 1))) * (u < 0.65 ? 1 : 0);

export const activities: Record<
  NonNullable<SquirrelAnimationState["activity"]>,
  Motion
> = {
  eat(p, u, t) {
    const e = envelope(u);
    p.food = true;
    p.foodY = 0.13 * e;
    p.pawL = p.pawR = (0.65 + 0.16 * Math.sin(t * 22)) * e;
    p.pawLiftL = p.pawLiftR = 0.12 * e;
    p.headPitch = (0.12 + 0.08 * Math.sin(t * 24)) * e;
    p.stretch = 1 + 0.04 * e;
    p.tailYaw = 0.04 * Math.sin(t * 2) * e;
  },
  forage(p, u, t) {
    const e = envelope(u);
    const searching = 1 - smooth((u - 0.68) / 0.15);
    p.pitch = -0.55 * searching * e;
    p.bodyY = -0.22 * searching * e;
    p.headPitch = (-0.3 + Math.sin(t * 17) * 0.08) * searching * e;
    p.z = -0.65 * travel(u);
    p.x = 0.25 * Math.sin(u * Math.PI) * e;
    p.y = u > 0.3 && u < 0.5 ? Math.sin(((u - 0.3) / 0.2) * Math.PI) * 0.22 : 0;
    p.pawL = Math.max(0, Math.sin(t * 13)) * 0.8 * searching * e;
    p.pawR = Math.max(0, -Math.sin(t * 13)) * 0.8 * searching * e;
    p.food = u > 0.72;
    p.foodY = 0.1;
    p.reaction = u > 0.74 && u < 0.87 ? "!" : "";
  },
  climb(p, u, t) {
    const e = envelope(u);
    p.y = 1.1 * Math.sin(Math.PI * u) ** 2;
    p.pitch = -0.12 * e;
    p.stretch = 1 + 0.15 * e;
    p.pawL = (1.9 + 0.55 * Math.sin(t * 11)) * e;
    p.pawR = (1.9 - 0.55 * Math.sin(t * 11)) * e;
    p.footL = 0.3 * Math.sin(t * 11) * e;
    p.footR = -p.footL;
    p.headPitch = -0.35 * e;
    p.tailLift = -0.3 * e;
  },
};
export const locomotions: Record<
  NonNullable<SquirrelAnimationState["locomotion"]>,
  Motion
> = {
  run(p, u, t) {
    const e = envelope(u);
    const hop = hops(u, 4);
    p.z = -1.4 * travel(u);
    p.x = 0.4 * Math.sin(u * Math.PI) * e;
    p.y = hop * 0.3;
    p.pitch = -0.5 * e * (u < 0.65 ? 1 : 0.25);
    p.pawL = 0.55 * Math.sin(t * 16) * e;
    p.pawR = -p.pawL;
    p.footL = -0.3 * Math.sin(t * 16) * e;
    p.footR = -p.footL;
    p.tailLift = -0.18 * hop;
    p.headYaw = u > 0.65 ? 0.35 * Math.sin(t * 4) * e : 0;
  },
  chase(p, u, t) {
    const e = envelope(u);
    p.z = -1.6 * travel(u);
    p.x = 0.5 * Math.sin(u * Math.PI * 6) * e;
    p.y = hops(u, 6) * 0.24;
    p.yaw = 0.55 * Math.cos(u * Math.PI * 6) * e;
    p.pitch = -0.65 * e;
    p.pawL = 0.7 * Math.sin(t * 23) * e;
    p.pawR = -p.pawL;
    p.footL = -0.4 * Math.sin(t * 23) * e;
    p.footR = -p.footL;
    p.headYaw = -0.3 * p.yaw;
  },
  approach(p, u, t) {
    const e = envelope(u);
    const walking = Math.min(1, u / 0.5);
    p.z = -0.9 * travel(u);
    p.y = u < 0.5 ? Math.abs(Math.sin(walking * Math.PI * 2)) * 0.2 : 0;
    p.headRoll = 0.18 * e;
    p.stretch = 1 + 0.12 * e;
    p.pawL = p.pawR = 0.15 * e;
    p.headYaw = 0.07 * Math.sin(t * 2) * e;
    p.reaction = u > 0.5 && u < 0.78 ? "?" : "";
  },
  avoid(p, u, t) {
    const e = envelope(u);
    const fleeing = smooth((u - 0.25) / 0.18);
    p.yaw = Math.PI * fleeing * (1 - smooth((u - 0.85) / 0.15));
    p.z = 1.5 * smooth((u - 0.25) / 0.4) * (1 - smooth((u - 0.8) / 0.2));
    p.y =
      u > 0.16 && u < 0.3
        ? Math.sin(((u - 0.16) / 0.14) * Math.PI) * 0.42
        : u > 0.3 && u < 0.65
          ? Math.abs(Math.sin(((u - 0.3) / 0.35) * Math.PI * 3)) * 0.27
          : 0;
    p.pitch = -0.5 * fleeing * e;
    p.headYaw = u > 0.65 ? -0.65 * e : 0;
    p.pawL = 0.5 * Math.sin(t * 22) * fleeing * e;
    p.pawR = -p.pawL;
    p.reaction = u > 0.13 && u < 0.3 ? "!!" : "";
  },
  relax(p, u, t) {
    const e = envelope(u);
    p.headYaw = -0.55 * e;
    p.headRoll = -0.2 * e;
    p.bodyY = -0.07 * e;
    p.pawLiftR = 0.38 * e;
    p.pawR = (2.25 + 0.25 * Math.sin(t * 14)) * e;
    p.tailYaw = -0.08 * e;
  },
};
export const tails: Record<
  NonNullable<SquirrelAnimationState["tail"]>,
  Motion
> = {
  flag(p, u, t) {
    const e = envelope(u);
    p.tailYaw = 0.8 * Math.sin(t * 5) * e;
    p.tailLift = -0.48 * e;
    p.tailTip = 0.3 * Math.sin(t * 5 + 0.5) * e;
  },
  twitch(p, u, t) {
    const e = envelope(u);
    const burst = Math.sin(t * 5) > 0.1 ? 1 : 0;
    p.tailTip = 0.18 * Math.sin(t * 48) * burst * e;
  },
};
export type IdleAction =
  "sniff" | "look" | "stretch" | "groom" | "hop" | "flick";
export const idleActions: Record<IdleAction, Motion> = {
  sniff(p, u, t) {
    p.headPitch = 0.09 * Math.sin(t * 16) * envelope(u);
  },
  look(p, u) {
    p.headYaw = 0.45 * Math.sin(u * Math.PI * 2) * envelope(u);
  },
  stretch(p, u) {
    p.stretch = 1 + 0.12 * Math.sin(u * Math.PI);
    p.headPitch = -0.15 * envelope(u);
  },
  groom(p, u, t) {
    p.pawR = (2 + 0.18 * Math.sin(t * 12)) * envelope(u);
    p.pawLiftR = 0.3 * envelope(u);
    p.headRoll = -0.2 * envelope(u);
  },
  hop(p, u) {
    p.y = 0.14 * Math.sin(u * Math.PI) ** 2;
  },
  flick(p, u, t) {
    p.tailTip = 0.1 * Math.sin(t * 30) * envelope(u);
  },
};
