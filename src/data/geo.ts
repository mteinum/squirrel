// WGS84 local tangent-plane approximation at Central Park's centre.
// East/north radii of curvature provide local metres, then rotate 29° to align
// the park's long axis. One scene unit = 10 m; uniform scaling preserves proportions.
const latitude0 = (40.7829 * Math.PI) / 180;
const a = 6378137,
  e2 = 6.69437999014e-3;
const w = Math.sqrt(1 - e2 * Math.sin(latitude0) ** 2);
const eastRadius = (a / w) * Math.cos(latitude0),
  northRadius = (a * (1 - e2)) / w ** 3;
const theta = (29 * Math.PI) / 180;
export function project(
  longitude: number,
  latitude: number,
): { x: number; z: number } {
  const east = (((longitude + 73.9654) * Math.PI) / 180) * eastRadius;
  const north = (((latitude - 40.7829) * Math.PI) / 180) * northRadius;
  return {
    x: (east * Math.cos(theta) - north * Math.sin(theta)) / 10,
    z: -(east * Math.sin(theta) + north * Math.cos(theta)) / 10,
  };
}
export function insidePolygon(
  x: number,
  z: number,
  polygon: { x: number; z: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p = polygon[i],
      q = polygon[j];
    if (
      p.z > z !== q.z > z &&
      x < ((q.x - p.x) * (z - p.z)) / (q.z - p.z) + p.x
    )
      inside = !inside;
  }
  return inside;
}
