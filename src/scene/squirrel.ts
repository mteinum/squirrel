import * as THREE from "three";
export const furColours: Record<string, number> = {
  Gray: 0x8f8b80,
  Black: 0x393d39,
  Cinnamon: 0xb66a3e,
  Unknown: 0xd8cdb8,
};
export function squirrelResources() {
  const bodyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.6, 0.45),
    new THREE.Vector3(0, 1.1, 1),
    new THREE.Vector3(0, 2.0, 1.1),
    new THREE.Vector3(0, 2.6, 0.6),
    new THREE.Vector3(0, 2.45, 0.1),
  ]);
  const tailGeometry = new THREE.TubeGeometry(tailCurve, 12, 0.34, 6, false);
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
    const group = new THREE.Group(),
      material = materials[fur ?? "Unknown"] ?? materials.Unknown;
    function part(mat: THREE.Material, pos: number[], scale: number[]) {
      const mesh = new THREE.Mesh(bodyGeometry, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    }
    part(material, [0, 0.7, 0], [0.48, 0.66, 0.43]);
    part(cream, [0, 0.82, -0.33], [0.31, 0.42, 0.13]);
    part(material, [0, 1.46, -0.22], [0.43, 0.4, 0.42]);
    part(material, [-0.25, 1.85, -0.14], [0.14, 0.31, 0.13]);
    part(material, [0.25, 1.85, -0.14], [0.14, 0.31, 0.13]);
    part(cream, [0, 1.34, -0.57], [0.24, 0.15, 0.2]);
    part(black, [0, 1.42, -0.75], [0.09, 0.07, 0.06]);
    for (const x of [-1, 1]) {
      part(black, [x * 0.29, 1.55, -0.51], [0.061, 0.069, 0.041]);
      part(material, [x * 0.32, 0.15, -0.18], [0.24, 0.15, 0.36]);
      const arm = part(material, [x * 0.32, 0.9, -0.43], [0.16, 0.28, 0.15]);
      arm.rotation.z = x * 0.35;
    }
    part(
      new THREE.MeshStandardMaterial({ color: 0xc8954f, roughness: 1 }),
      [0, 0.83, -0.63],
      [0.17, 0.2, 0.15],
    );
    group.add(new THREE.Mesh(tailGeometry, material));
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
