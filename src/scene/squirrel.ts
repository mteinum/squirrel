import * as THREE from "three";
export const furColours: Record<string, number> = {
  Gray: 0x8f8b80,
  Black: 0x393d39,
  Cinnamon: 0xb66a3e,
  Unknown: 0xd8cdb8,
};
export function squirrelResources() {
  const bodyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const tailBase = new THREE.Vector3(0, 0.6, 0.45);
  const tipBase = new THREE.Vector3(0, 2, 1.1);
  const tailGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [tailBase.clone(), new THREE.Vector3(0, 1.1, 1), tipBase.clone()].map(
        (p) => p.sub(tailBase),
      ),
    ),
    8,
    0.34,
    6,
    false,
  );
  const tipGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        tipBase.clone(),
        new THREE.Vector3(0, 2.6, 0.6),
        new THREE.Vector3(0, 2.45, 0.1),
      ].map((p) => p.sub(tipBase)),
    ),
    8,
    0.34,
    6,
    false,
  );
  const materials = Object.fromEntries(
    Object.entries(furColours).map(([key, color]) => [
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    ]),
  );
  const cream = new THREE.MeshStandardMaterial({
    color: 0xe9d8b9,
    roughness: 1,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c241e });
  function create(fur: string | null) {
    const group = new THREE.Group();
    const material = materials[fur ?? "Unknown"] ?? materials.Unknown;
    const body = new THREE.Group();
    body.name = "body";
    group.add(body);
    function part(
      parent: THREE.Object3D,
      mat: THREE.Material,
      pos: number[],
      scale: number[],
      name = "",
    ) {
      const mesh = new THREE.Mesh(bodyGeometry, mat);
      mesh.name = name;
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }
    part(body, material, [0, 0.7, 0], [0.48, 0.66, 0.43]);
    part(body, cream, [0, 0.82, -0.33], [0.31, 0.42, 0.13]);
    const head = new THREE.Group();
    head.name = "head";
    head.position.set(0, 1.25, -0.2);
    body.add(head);
    part(head, material, [0, 0.21, -0.02], [0.43, 0.4, 0.42]);
    part(head, material, [-0.25, 0.6, 0.06], [0.14, 0.31, 0.13]);
    part(head, material, [0.25, 0.6, 0.06], [0.14, 0.31, 0.13]);
    part(head, cream, [0, 0.09, -0.37], [0.24, 0.15, 0.2]);
    part(head, black, [0, 0.17, -0.55], [0.09, 0.07, 0.06]);
    for (const x of [-1, 1]) {
      part(head, black, [x * 0.29, 0.3, -0.31], [0.061, 0.069, 0.041]);
      part(
        body,
        material,
        [x * 0.32, 0.15, -0.18],
        [0.24, 0.15, 0.36],
        x < 0 ? "footL" : "footR",
      );
      const paw = new THREE.Group();
      paw.name = x < 0 ? "pawL" : "pawR";
      paw.position.set(x * 0.32, 1.05, -0.43);
      paw.rotation.z = x * 0.35;
      body.add(paw);
      part(paw, material, [0, -0.15, 0], [0.16, 0.28, 0.15]);
    }
    part(
      body,
      new THREE.MeshStandardMaterial({ color: 0xc8954f, roughness: 1 }),
      [0, 0.83, -0.63],
      [0.17, 0.2, 0.15],
      "food",
    );
    const tail = new THREE.Group();
    tail.name = "tail";
    tail.position.copy(tailBase);
    tail.add(new THREE.Mesh(tailGeometry, material));
    const tip = new THREE.Group();
    tip.name = "tailTip";
    tip.position.copy(tipBase).sub(tailBase);
    tip.add(new THREE.Mesh(tipGeometry, material));
    tail.add(tip);
    body.add(tail);
    return group;
  }
  // Acorn material is shared too, through the template cache below.
  const templates = Object.fromEntries(
    Object.keys(furColours).map((fur) => [fur, create(fur)]),
  );
  return {
    create: (fur: string | null) =>
      (templates[fur ?? "Unknown"] ?? templates.Unknown).clone(true),
    dispose: () => {
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      Object.values(templates).forEach((group) =>
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            geometries.add(obj.geometry);
            (Array.isArray(obj.material)
              ? obj.material
              : [obj.material]
            ).forEach((m) => mats.add(m));
          }
        }),
      );
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function squirrelRig(model: THREE.Group) {
  const joint = (name: string) => {
    const node = model.getObjectByName(name);
    if (!node) throw new Error(`Squirrel joint missing: ${name}`);
    return node;
  };
  return {
    body: joint("body"),
    head: joint("head"),
    pawL: joint("pawL"),
    pawR: joint("pawR"),
    footL: joint("footL"),
    footR: joint("footR"),
    tail: joint("tail"),
    tailTip: joint("tailTip"),
    food: joint("food"),
  };
}
