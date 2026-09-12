import * as THREE from "three";
import type { Observation } from "../../data/types";
import { squirrelRig } from "../squirrel";
import {
  mapObservationToAnimation,
  seededRandom,
  type SquirrelAnimationState,
} from "./state";
import {
  activities,
  locomotions,
  tails,
  idleActions,
  neutralPose,
  smooth,
  type IdleAction,
  type Pose,
} from "./motions";

type Phase = "arrival" | "action" | "rest" | "idle" | "settle";
export interface AnimationStep {
  moving: boolean;
  wakeIn: number | null;
  reaction: string;
  phase: Phase;
}

/** One actor, driven by the scene's existing frame callback. No timers or RAFs here. */
export function createSquirrelAnimator(
  model: THREE.Group,
  observation: Observation,
  arrivalMs = 0,
) {
  const rig = squirrelRig(model);
  const state = mapObservationToAnimation(observation);
  const random = seededRandom(observation.id);
  const bindings = Object.values(rig).map((node) => ({
    node,
    position: node.position.clone(),
    rotation: node.rotation.clone(),
    scale: node.scale.clone(),
  }));
  const waveGeometry = new THREE.RingGeometry(
    0.42,
    0.46,
    28,
    1,
    -0.8,
    Math.PI * 1.5,
  );
  const waves = Array.from({ length: 3 }, () => {
    const wave = new THREE.Mesh(
      waveGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xd9b46d,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    wave.renderOrder = 8;
    wave.visible = false;
    model.add(wave);
    return wave;
  });
  let phase: Phase = arrivalMs ? "arrival" : "action";
  let duration = arrivalMs ? arrivalMs / 1000 : 4 + random() * 1.5;
  let elapsed = 0,
    lastNow: number | null = null,
    cycle = 0,
    restAfterIdle = 0;
  let idle: IdleAction = "sniff",
    heading = (random() - 0.5) * 0.7,
    reduced = false,
    disposed = false;
  let lastPose = neutralPose();
  let facing: number | null = null;
  const idleNames = Object.keys(idleActions) as IdleAction[];
  function advance() {
    elapsed -= duration;
    if (phase === "arrival" || phase === "settle") {
      phase = "action";
      duration = 4 + random() * 1.5;
      cycle++;
      heading = (random() - 0.5) * 0.7;
      facing = null;
    } else if (phase === "action") {
      const pause = 8 + random() * 7;
      duration = 2 + random() * 3;
      restAfterIdle = pause - duration - 1.6;
      idle = idleNames[Math.floor(random() * idleNames.length)];
      phase = "rest";
    } else if (phase === "rest") {
      phase = "idle";
      duration = 1.6;
    } else {
      phase = "settle";
      duration = restAfterIdle;
    }
  }
  function resetJoints() {
    bindings.forEach(({ node, position, rotation, scale }) => {
      node.position.copy(position);
      node.rotation.copy(rotation);
      node.scale.copy(scale);
    });
    waves.forEach((wave) => {
      wave.visible = false;
    });
  }
  function apply(p: Pose, facing: number) {
    resetJoints();
    model.position.set(
      p.x * Math.cos(facing) + p.z * Math.sin(facing),
      p.y,
      -p.x * Math.sin(facing) + p.z * Math.cos(facing),
    );
    model.rotation.y = facing + p.yaw;
    rig.body.rotation.x = p.pitch;
    rig.body.rotation.z = p.roll;
    rig.body.position.y = p.bodyY;
    rig.body.scale.y = p.stretch;
    rig.head.rotation.set(p.headPitch, p.headYaw, p.headRoll);
    rig.pawL.rotation.x = p.pawL;
    rig.pawR.rotation.x = p.pawR;
    rig.pawL.position.y += p.pawLiftL;
    rig.pawR.position.y += p.pawLiftR;
    rig.footL.rotation.x = p.footL;
    rig.footR.rotation.x = p.footR;
    rig.tail.rotation.set(p.tailLift, p.tailYaw, 0);
    rig.tailTip.rotation.y = p.tailTip;
    rig.food.visible = p.food;
    rig.food.position.y += p.foodY;
    lastPose = p;
  }
  function primary(p: Pose, u: number, t: number) {
    // Physical activities take turns with locomotion; a squirrel needn't eat mid-sprint.
    if (state.activity && (!state.locomotion || cycle % 2 === 0))
      activities[state.activity](p, u, t);
    else if (state.locomotion) locomotions[state.locomotion](p, u, t);
    else if (!state.tail && !state.vocalization) idleActions[idle](p, u, t);
    if (state.tail) tails[state.tail](p, u, t);
    if (state.vocalization) {
      const speed =
        state.vocalization === "kuk"
          ? 19
          : state.vocalization === "quaa"
            ? 7
            : 2;
      const strength = smooth(u / 0.12) * (1 - smooth((u - 0.8) / 0.2));
      p.headPitch += Math.sin(t * speed) * 0.12 * strength;
      p.headRoll += state.vocalization === "moan" ? 0.22 * strength : 0;
      p.stretch += Math.max(0, Math.sin(t * speed)) * 0.04 * strength;
    }
  }
  function vocalize(t: number, camera: THREE.Camera) {
    if (!state.vocalization) return;
    const presets = {
      kuk: { count: 3, gap: 0.32, life: 0.42, size: 1.5 },
      quaa: { count: 3, gap: 0.82, life: 1.2, size: 2.6 },
      moan: { count: 1, gap: 0, life: 2.8, size: 2.2 },
    };
    const v = presets[state.vocalization];
    const cameraWorld = new THREE.Vector3();
    camera.getWorldPosition(cameraWorld);
    waves.forEach((wave, i) => {
      const age = (t - 0.65 - i * v.gap) / v.life;
      if (i >= v.count || age < 0 || age > 1) return;
      wave.visible = true;
      wave.position.set(0.7, 1.6, -0.7);
      const scale = 0.3 + age * v.size;
      wave.scale.set(
        scale,
        state.vocalization === "moan" ? scale * 0.5 : scale,
        1,
      );
      wave.material.opacity =
        (state.vocalization === "moan" ? 0.35 : 0.65) * Math.sin(Math.PI * age);
      wave.lookAt(cameraWorld);
    });
  }
  return {
    state,
    get pose() {
      return lastPose;
    },
    pause() {
      lastNow = null;
    },
    update(
      now: number,
      camera: THREE.Camera,
      reduceMotion = false,
    ): AnimationStep {
      if (disposed) return { moving: false, wakeIn: null, reaction: "", phase };
      if (reduced !== reduceMotion) {
        reduced = reduceMotion;
        lastNow = null;
        elapsed = 0;
        phase = "action";
        duration = 4 + random() * 1.5;
      }
      if (lastNow !== null) elapsed += Math.max(0, now - lastNow) / 1000;
      lastNow = now;
      while (elapsed >= duration && duration > 0) advance();
      const origin = new THREE.Vector3();
      model.parent!.getWorldPosition(origin);
      if (facing === null) {
        facing = Math.atan2(
          -(camera.position.x - origin.x),
          -(camera.position.z - origin.z),
        );
        if (state.locomotion !== "approach" && state.locomotion !== "avoid")
          facing += heading;
      }
      const p = neutralPose();
      if (reduced) {
        primary(p, 0.4, 1.4);
        p.x = p.y = p.z = 0;
        p.reaction = "";
        p.yaw = 0;
        if (state.activity === "eat") {
          p.food = true;
          p.pawL = p.pawR = 0.7;
        }
        if (state.tail === "flag") {
          p.tailLift = -0.5;
          p.tailYaw = 0.3;
          p.tailTip = 0;
        }
        apply(p, facing);
        model.visible = true;
        return { moving: false, wakeIn: null, reaction: "", phase };
      }
      model.visible = phase !== "arrival";
      if (phase === "action") primary(p, elapsed / duration, elapsed);
      else if (phase === "idle")
        idleActions[idle](p, elapsed / duration, elapsed);
      apply(p, facing);
      if (phase === "action") vocalize(elapsed, camera);
      const moving = phase === "action" || phase === "idle";
      return {
        moving,
        wakeIn: moving ? null : Math.max(1, (duration - elapsed) * 1000),
        reaction: p.reaction,
        phase,
      };
    },
    dispose() {
      disposed = true;
      resetJoints();
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      waves.forEach((wave) => {
        wave.removeFromParent();
        wave.material.dispose();
      });
      waveGeometry.dispose();
    },
  };
}
export type SquirrelAnimator = ReturnType<typeof createSquirrelAnimator>;
export type { SquirrelAnimationState };
