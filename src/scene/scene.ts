import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { project, insidePolygon } from "../data/geo";
import type { Observation, ParkData } from "../data/types";
import { furColours, squirrelResources } from "./squirrel";
import { nickname, squirrelActivity } from "../field-guide";
export interface SafariScene {
  setObservations(observations: Observation[]): void;
  select(observation: Observation, fly?: boolean): void;
  reset(): void;
  topDown(): void;
  zoom(factor: number): void;
  setVision(enabled: boolean): void;
  dispose(): void;
}
export function createScene(
  host: HTMLElement,
  park: ParkData,
  onSelect: (id: string) => void,
  onFailure: () => void,
  portraitHost: HTMLElement,
): SafariScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 760px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe9ecdf, 0);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive Central Park diorama. Use the observation list for keyboard selection.",
  );
  renderer.domElement.setAttribute("role", "img");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 2200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 30;
  controls.maxDistance = 950;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI / 2.65;
  controls.maxTargetRadius = 230;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  scene.add(new THREE.HemisphereLight(0xfff8e6, 0x718570, 2.6));
  const sun = new THREE.DirectionalLight(0xffe5b3, 3.3);
  sun.position.set(-120, 240, 80);
  sun.castShadow = !mobile;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 270;
  sun.shadow.camera.bottom = -270;
  sun.shadow.camera.far = 650;
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 1;
  scene.add(sun);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x879761,
    roughness: 1,
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0xab956f,
    roughness: 1,
  });
  const polygons = park.geometry.coordinates.map((poly) =>
    poly.map((ring) => ring.map((p) => project(p[0], p[1]))),
  );
  for (const polygon of polygons) {
    const shape = new THREE.Shape(
      polygon[0].map((p) => new THREE.Vector2(p.x, -p.z)),
    );
    polygon
      .slice(1)
      .forEach((ring) =>
        shape.holes.push(
          new THREE.Path(ring.map((p) => new THREE.Vector2(p.x, -p.z))),
        ),
      );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 5,
      bevelEnabled: false,
    });
    const mesh = new THREE.Mesh(geometry, [groundMaterial, sideMaterial]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -5;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        polygon[0].map((p) => new THREE.Vector3(p.x, 0.35, p.z)),
      ),
      new THREE.LineBasicMaterial({ color: 0xd4d7a8 }),
    );
    scene.add(line);
  }
  const isLand = (x: number, z: number) =>
    polygons.some(
      (poly) =>
        insidePolygon(x, z, poly[0]) &&
        !poly.slice(1).some((hole) => insidePolygon(x, z, hole)),
    );
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1 });
  // These decorative water shapes, paths and tree positions are illustrative, not source geography.
  const lakeMaterial = mat(0x86b6ac);
  function lake(x: number, z: number, rx: number, rz: number) {
    const outline = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2,
        r = 1 + 0.09 * Math.sin(a * 3);
      return new THREE.Vector2(
        x + Math.cos(a) * rx * r,
        -z + Math.sin(a) * rz * r,
      );
    });
    const water = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape(outline)),
      lakeMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.5;
    scene.add(water);
  }
  lake(4, -45, 28, 36);
  lake(-15, 78, 18, 21);
  lake(12, 156, 9, 12);
  lake(-12, -162, 11, 13);
  function path(points: number[][], width: number) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], 0.38, p[1])),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, width, 4, false),
      mat(0xd6c598),
    );
    mesh.scale.y = 0.14;
    mesh.position.y = 0.3;
    scene.add(mesh);
  }
  path(
    [
      [-22, 185],
      [-28, 130],
      [5, 108],
      [27, 62],
      [29, 0],
      [34, -58],
      [13, -110],
      [-24, -176],
    ],
    1.6,
  );
  path(
    [
      [27, 178],
      [26, 127],
      [-25, 100],
      [-30, 40],
      [-32, -18],
      [-29, -83],
      [22, -150],
      [23, -180],
    ],
    1.3,
  );
  let seed = 3481;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const count = mobile ? 100 : 200;
  const leaves = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    mat(0xffffff),
    count,
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.6, 5, 5),
    mat(0x796445),
    count,
  );
  const dummy = new THREE.Object3D(),
    treeColors = [0xbc753d, 0xc99845, 0xe2b75d, 0x56714d, 0x6e7f51, 0xa94f32];
  for (let i = 0; i < count; i++) {
    let x = 0,
      z = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      x = (random() - 0.5) * 88;
      z = (random() - 0.5) * 390;
      const inLake =
        ((x - 4) / 34) ** 2 + ((z + 45) / 42) ** 2 < 1 ||
        ((x + 15) / 23) ** 2 + ((z - 78) / 27) ** 2 < 1;
      if (isLand(x, z) && !inLake) break;
    }
    const s = 2.5 + random() * 2;
    dummy.position.set(x, 2, z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 5 + random() * 2;
    dummy.scale.set(s, s * (1.1 + random() * 0.5), s);
    dummy.rotation.y = random() * 6;
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(
      i,
      new THREE.Color(treeColors[Math.floor(random() * treeColors.length)]),
    );
  }
  leaves.castShadow = true;
  trunks.castShadow = true;
  scene.add(leaves, trunks);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.ShadowMaterial({ opacity: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.2;
  floor.receiveShadow = true;
  scene.add(floor);
  const resources = squirrelResources();
  // Reuse the existing materials and instanced markers; vision adds no render loop.
  const environmentColours = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          material instanceof THREE.MeshStandardMaterial &&
          !environmentColours.has(material)
        )
          environmentColours.set(material, material.color.clone());
      }
    }
  });
  let vision = false;
  const pinHost =
    host.parentElement!.querySelector<HTMLElement>("[data-pins]")!;
  const perkSign =
    host.parentElement!.querySelector<HTMLButtonElement>(".perk-sign")!;
  const bottomControls =
    host.parentElement!.querySelector<HTMLElement>(".park-bottom")!;
  const boundary = polygons.flatMap((polygon) => polygon[0]);
  const eastEdge = Math.max(...boundary.map((point) => point.x));
  const westEdge = Math.min(...boundary.map((point) => point.x));
  const southEdge = Math.max(...boundary.map((point) => point.z));
  const northEdge = Math.min(...boundary.map((point) => point.z));
  // An imaginary detour beyond the southeast boundary, never an observation.
  const perkAnchor = new THREE.Vector3(
    eastEdge + (eastEdge - westEdge) * 0.4,
    0,
    southEdge - (southEdge - northEdge) * 0.06,
  );
  const perkScreen = new THREE.Vector3();
  function positionPerk() {
    perkScreen.copy(perkAnchor).project(camera);
    const x = ((perkScreen.x + 1) * host.clientWidth) / 2;
    const y = ((1 - perkScreen.y) * host.clientHeight) / 2;
    const compact = matchMedia("(max-width: 760px)").matches;
    // Let the sign leave the viewport naturally when the camera explores elsewhere.
    const width = compact ? 138 : 214;
    const left = x - width * 0.15;
    perkSign.hidden =
      perkScreen.z < -1 ||
      perkScreen.z > 1 ||
      left < 12 ||
      left + width > host.clientWidth - 12 ||
      y < 210 ||
      // The placard sits 14px above its post; keep its lower edge clear.
      y - 10 > bottomControls.offsetTop;
    perkSign.style.left = `${x}px`;
    perkSign.style.top = `${y}px`;
  }
  let pins: { observation: Observation; button: HTMLButtonElement }[] = [];
  function createPin(observation: Observation, active = false) {
    const button = document.createElement("button");
    button.className = `squirrel-pin${active ? " selected-pin" : ""}`;
    button.setAttribute(
      "aria-label",
      `Observe ${nickname(observation)} · ${observation.observationId}`,
    );
    button.innerHTML =
      '<span class="pin-acorn" aria-hidden="true"><svg viewBox="0 0 32 32" fill="currentColor"><path d="M8 14h16c0 9-5 13-8 15-4-2-8-6-8-15ZM5 13c0-10 22-10 22 0H5Zm10-7V2h3v4Z"/></svg></span>';
    if (active) {
      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = nickname(observation);
      const subtitle = document.createElement("small");
      subtitle.textContent = `${squirrelActivity(observation).label} →`;
      text.append(title, subtitle);
      button.append(text);
    }
    button.addEventListener("click", () => onSelect(observation.id));
    pinHost.append(button);
    return { observation, button };
  }
  function rebuildPins() {
    pinHost.replaceChildren();
    pins = [];
    // A few representative pins aid discovery; every record retains its real 3D marker.
    const sorted = [...observations].sort((a, b) => a.latitude - b.latitude);
    const count = Math.min(7, sorted.length);
    for (let i = 0; i < count; i++) {
      const observation =
        sorted[Math.floor(((i + 0.5) * sorted.length) / count)];
      if (observation.id !== selectedObservation?.id)
        pins.push(createPin(observation));
    }
    if (selectedObservation) pins.unshift(createPin(selectedObservation, true));
  }
  function positionPins() {
    const positions: { x: number; y: number }[] = [];
    for (const { observation, button } of pins) {
      const p = project(observation.longitude, observation.latitude);
      const screen = new THREE.Vector3(p.x, 5, p.z).project(camera);
      const x = ((screen.x + 1) * host.clientWidth) / 2;
      const y = ((1 - screen.y) * host.clientHeight) / 2;
      const blocked = positions.some(
        (p) => Math.hypot(x - p.x, y - p.y) < (mobile ? 65 : 95),
      );
      const show =
        screen.z >= -1 &&
        screen.z <= 1 &&
        x > 25 &&
        x < host.clientWidth - 70 &&
        y > (mobile ? 115 : 190) &&
        y < host.clientHeight - (mobile ? 215 : 100) &&
        !blocked;
      button.hidden = !show;
      if (show) {
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        positions.push({ x, y });
      }
    }
  }
  const selectionMaterials = new Set<THREE.Material>();
  let portraitFrame = 0;
  const markerGeometry = new THREE.SphereGeometry(1, 8, 6);
  const markers = new THREE.InstancedMesh(
    markerGeometry,
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    10000,
  );
  markers.frustumCulled = false;
  scene.add(markers);
  const selected = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(2.3, 3, 36),
    new THREE.MeshBasicMaterial({
      color: 0xffd66c,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 1;
  halo.renderOrder = 5;
  selected.add(halo);
  selected.visible = false;
  scene.add(selected);
  const selectedModel = new THREE.Group();
  selectedModel.position.y = 1;
  selectedModel.scale.setScalar(3);
  selected.add(selectedModel);
  const nearModels = new THREE.Group();
  scene.add(nearModels);
  let observations: Observation[] = [],
    selectedObservation: Observation | null = null;
  let frame = 0,
    disposed = false,
    visible = true;
  let tween: {
    start: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    cameraFrom: THREE.Vector3;
    cameraTo: THREE.Vector3;
  } | null = null;
  let portrait: THREE.WebGLRenderer | null = null;
  const portraitScene = new THREE.Scene(),
    portraitCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100),
    portraitModel = new THREE.Group();
  portraitCamera.position.set(4, 2.8, -5);
  portraitCamera.lookAt(0, 1.25, 0.2);
  portraitScene.add(new THREE.HemisphereLight(0xfff7e5, 0x8f9e82, 3));
  const portraitSun = new THREE.DirectionalLight(0xffedcd, 3);
  portraitSun.position.set(-3, 6, -5);
  portraitScene.add(portraitSun, portraitModel);
  function renderPortrait() {
    if (!portrait || !selectedObservation || document.hidden) return;
    const { width, height } = portraitHost.getBoundingClientRect();
    if (!width || !height) return;
    portrait.setSize(width, height, false);
    portraitCamera.aspect = width / height;
    portraitCamera.updateProjectionMatrix();
    portrait.render(portraitScene, portraitCamera);
  }
  function updateLOD() {
    const distance = camera.position.distanceTo(controls.target);
    const size = THREE.MathUtils.clamp(distance / 700, 0.55, 1.35);
    observations.forEach((o, i) => {
      const p = project(o.longitude, o.latitude);
      dummy.position.set(p.x, 1.4, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(size * (vision ? 1.65 : 1));
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);
    });
    markers.instanceMatrix.needsUpdate = true;
    nearModels.clear();
    if (distance < 155) {
      const candidates = observations
        .map((o) => ({ o, p: project(o.longitude, o.latitude) }))
        .filter(
          ({ o, p }) =>
            o.id !== selectedObservation?.id &&
            Math.hypot(p.x - controls.target.x, p.z - controls.target.z) < 35,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.p.x - controls.target.x, a.p.z - controls.target.z) -
            Math.hypot(b.p.x - controls.target.x, b.p.z - controls.target.z),
        )
        .slice(0, mobile ? 12 : 28);
      candidates.forEach(({ o, p }) => {
        const model = resources.create(o.fur);
        model.position.set(p.x, 0.5, p.z);
        model.scale.setScalar(1.4);
        model.rotation.y = p.x;
        nearModels.add(model);
      });
    }
    if (selectedObservation) {
      const scale = THREE.MathUtils.clamp(distance / 120, 1.5, 5);
      selectedModel.scale.setScalar(scale);
      halo.scale.setScalar(scale / 1.7);
    }
  }
  function requestRender() {
    if (!frame && !disposed && visible && !document.hidden)
      frame = requestAnimationFrame(render);
  }
  function render(now: number) {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / 650),
        eased = 1 - (1 - t) ** 3;
      controls.target.lerpVectors(tween.from, tween.to, eased);
      camera.position.lerpVectors(tween.cameraFrom, tween.cameraTo, eased);
      if (t === 1) tween = null;
      controls.update();
    }
    renderer.render(scene, camera);
    positionPins();
    positionPerk();
    if (tween) requestRender();
  }
  function changed() {
    updateLOD();
    const centre = new THREE.Vector3(0, 0, 0).project(camera);
    const northPoint = project(-73.9654, 40.7839);
    const north = new THREE.Vector3(northPoint.x, 0, northPoint.z).project(
      camera,
    );
    const compass =
      host.parentElement?.querySelector<SVGElement>(".compass svg");
    if (compass)
      compass.style.transform = `rotate(${(Math.atan2(north.x - centre.x, north.y - centre.y) * 180) / Math.PI}deg)`;
    requestRender();
  }
  controls.addEventListener("change", changed);
  controls.addEventListener("start", stopTween);
  function stopTween() {
    tween = null;
  }
  function reset() {
    tween = null;
    controls.target.set(0, 0, 0);
    camera.position.set(230, 320, 320).multiplyScalar(1.15);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    // Fit the real park outline to narrow screens as well as wide canvases.
    // Leave a little room for the field-guide overlays without changing geography.
    for (let attempt = 0; attempt < 12; attempt++) {
      const points = polygons
        .flatMap((poly) => poly[0])
        .map((p) => new THREE.Vector3(p.x, 0, p.z).project(camera));
      const extent = Math.max(
        ...points.map((p) =>
          Math.max(Math.abs(p.x) / 0.88, Math.abs(p.y) / 0.75),
        ),
      );
      if (extent <= 1.01) break;
      camera.position.multiplyScalar(Math.min(extent, 1.3));
      camera.updateMatrixWorld();
    }
    controls.update();
    changed();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
    renderPortrait();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resizeObserver.observe(portraitHost);
  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) requestRender();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersectionObserver.observe(host);
  const lifecycle = new AbortController();
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        requestRender();
        renderPortrait();
      }
    },
    { signal: lifecycle.signal },
  );
  reducedMotion.addEventListener(
    "change",
    () => {
      if (reducedMotion.matches && tween) {
        camera.position.copy(tween.cameraTo);
        controls.target.copy(tween.to);
        tween = null;
        controls.update();
      }
    },
    { signal: lifecycle.signal },
  );
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      onFailure();
    },
    { signal: lifecycle.signal },
  );
  const raycaster = new THREE.Raycaster();
  let down: { x: number; y: number; id: number } | null = null,
    dragged = false,
    pointers = new Set<number>();
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => {
      pointers.add(e.pointerId);
      if (pointers.size > 1) dragged = true;
      else {
        down = { x: e.clientX, y: e.clientY, id: e.pointerId };
        dragged = false;
      }
    },
    { signal: lifecycle.signal },
  );
  renderer.domElement.addEventListener(
    "pointermove",
    (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)
        dragged = true;
    },
    { signal: lifecycle.signal },
  );
  renderer.domElement.addEventListener(
    "pointercancel",
    (e) => {
      pointers.delete(e.pointerId);
      down = null;
    },
    { signal: lifecycle.signal },
  );
  renderer.domElement.addEventListener(
    "pointerup",
    (e) => {
      pointers.delete(e.pointerId);
      if (!down || dragged || down.id !== e.pointerId) {
        down = null;
        return;
      }
      down = null;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObject(markers)[0];
      if (hit?.instanceId !== undefined) {
        onSelect(observations[hit.instanceId].id);
        return;
      }
      // Small markers keep a generous screen-space touch target without moving sightings.
      let nearest: Observation | null = null,
        bestDistance = e.pointerType === "touch" ? 18 : 9;
      for (const observation of observations) {
        const p = project(observation.longitude, observation.latitude);
        const screen = new THREE.Vector3(p.x, 1.4, p.z).project(camera);
        if (screen.z < -1 || screen.z > 1) continue;
        const distance = Math.hypot(
          ((screen.x + 1) * rect.width) / 2 + rect.left - e.clientX,
          ((1 - screen.y) * rect.height) / 2 + rect.top - e.clientY,
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = observation;
        }
      }
      if (nearest) onSelect(nearest.id);
    },
    { signal: lifecycle.signal },
  );
  resize();
  reset();
  return {
    setVision(enabled) {
      vision = enabled;
      environmentColours.forEach((original, material) => {
        material.color.copy(original);
        if (enabled) {
          const grey = (original.r + original.g + original.b) / 3;
          material.color
            .lerp(new THREE.Color(grey, grey, grey), 0.65)
            .multiplyScalar(0.62);
        }
      });
      observations.forEach((o, i) =>
        markers.setColorAt(
          i,
          new THREE.Color(
            enabled
              ? 0xffe5a1
              : (furColours[o.fur ?? "Unknown"] ?? furColours.Unknown),
          ),
        ),
      );
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
      changed();
    },
    setObservations(list) {
      observations = list;
      markers.count = list.length;
      list.forEach((o, i) =>
        markers.setColorAt(
          i,
          new THREE.Color(
            vision
              ? 0xffe5a1
              : (furColours[o.fur ?? "Unknown"] ?? furColours.Unknown),
          ),
        ),
      );
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
      rebuildPins();
      changed();
    },
    select(observation, fly = false) {
      selectedObservation = observation;
      rebuildPins();
      const p = project(observation.longitude, observation.latitude);
      selected.position.set(p.x, 0, p.z);
      selected.visible = true;
      selectionMaterials.forEach((m) => m.dispose());
      selectionMaterials.clear();
      selectedModel.clear();
      const model = resources.create(observation.fur);
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.material = (obj.material as THREE.Material).clone();
          (obj.material as THREE.Material).depthTest = false;
          obj.renderOrder = 6;
        }
      });
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh)
          selectionMaterials.add(obj.material as THREE.Material);
      });
      selectedModel.add(model);
      portraitModel.clear();
      portraitModel.add(resources.create(observation.fur));
      if (!portrait) {
        try {
          portrait = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          portrait.setPixelRatio(Math.min(devicePixelRatio, 2));
          portrait.domElement.setAttribute(
            "aria-label",
            "Illustrative low-poly squirrel holding an acorn",
          );
          portrait.domElement.setAttribute("role", "img");
          portraitHost.replaceChildren(portrait.domElement);
        } catch {
          portraitHost.textContent = "🐿";
        }
      }
      cancelAnimationFrame(portraitFrame);
      portraitFrame = requestAnimationFrame(renderPortrait);
      if (fly) {
        const to = new THREE.Vector3(p.x, 0, p.z),
          cameraTo = to.clone().add(new THREE.Vector3(55, 75, 75));
        if (reducedMotion.matches) {
          camera.position.copy(cameraTo);
          controls.target.copy(to);
          controls.update();
        } else
          tween = {
            start: performance.now(),
            from: controls.target.clone(),
            to,
            cameraFrom: camera.position.clone(),
            cameraTo,
          };
      }
      changed();
    },
    reset,
    topDown() {
      tween = null;
      camera.position
        .copy(controls.target)
        .add(
          new THREE.Vector3(
            0,
            camera.position.distanceTo(controls.target),
            0.1,
          ),
        );
      controls.update();
      changed();
    },
    zoom(factor) {
      tween = null;
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(
        THREE.MathUtils.clamp(
          offset.length() * factor,
          controls.minDistance,
          controls.maxDistance,
        ),
      );
      camera.position.copy(controls.target).add(offset);
      controls.update();
      changed();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(portraitFrame);
      lifecycle.abort();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.removeEventListener("change", changed);
      controls.removeEventListener("start", stopTween);
      controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          geometries.add(obj.geometry);
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
            (m) => materials.add(m),
          );
          if (obj instanceof THREE.InstancedMesh) obj.dispose();
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      selectionMaterials.forEach((m) => m.dispose());
      resources.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      pinHost.replaceChildren();
      perkSign.hidden = true;
      portrait?.dispose();
      portrait?.forceContextLoss();
      portrait?.domElement.remove();
    },
  };
}
