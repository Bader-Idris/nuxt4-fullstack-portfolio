export function clamp(input: number, min: number, max: number): number {
  return Math.max(min, Math.min(input, max));
}

export function remap(
  input: number,
  inLow: number,
  inHigh: number,
  outLow: number,
  outHigh: number,
): number {
  return ((input - inLow) * (outHigh - outLow)) / (inHigh - inLow) + outLow;
}

export function remapClamp(
  input: number,
  inLow: number,
  inHigh: number,
  outLow: number,
  outHigh: number,
): number {
  return clamp(
    ((input - inLow) * (outHigh - outLow)) / (inHigh - inLow) + outLow,
    outLow < outHigh ? outLow : outHigh,
    outLow > outHigh ? outLow : outHigh,
  );
}

export function lerp(start: number, end: number, ratio: number): number {
  return (1 - ratio) * start + ratio * end;
}

export function smoothstep(value: number, min: number, max: number): number {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

export function safeMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function signedModDelta(a: number, b: number, mod: number): number {
  let delta = (b - a + mod) % mod;
  if (delta > mod / 2) delta -= mod;
  return delta;
}

export function segmentCircleIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return []; // No intersection
  }

  const intersections = [];
  const sqrtD = Math.sqrt(discriminant);

  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: x1 + t1 * dx,
      y: y1 + t1 * dy,
    });
  }

  if (t2 >= 0 && t2 <= 1 && discriminant !== 0) {
    intersections.push({
      x: x1 + t2 * dx,
      y: y1 + t2 * dy,
    });
  }

  return intersections;
}

export const TAU = 2 * Math.PI;
export const mod = (a: number, n: number) => ((a % n) + n) % n;

export const equivalent = (a: number) => mod(a + Math.PI, TAU) - Math.PI; // [-π, +π]

export function smallestAngle(current: number, target: number): number {
  return equivalent(target - current);
}

export function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lineIntersectsCircle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  center: { x: number; y: number },
  radius: number,
) {
  // Vector from p1 to p2
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Vector from p1 to circle center
  const fx = center.x - p1.x;
  const fy = center.y - p1.y;

  // Project fx,fy onto dx,dy — normalized t position
  const t = (fx * dx + fy * dy) / (dx * dx + dy * dy);

  let closest = null;

  if (t < 0)
    closest = p1; // closest at segment start
  else if (t > 1)
    closest = p2; // closest at segment end
  else closest = { x: p1.x + t * dx, y: p1.y + t * dy }; // projection point

  return dist(closest, center) <= radius;
}

export function pointInPolygon(
  point: { x: number; y: number },
  poly: { x: number; y: number }[],
) {
  let inside = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x,
      yi = poly[i]!.y;
    const xj = poly[j]!.x,
      yj = poly[j]!.y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function circleIntersectsPolygon(
  center: { x: number; y: number },
  radius: number,
  poly: { x: number; y: number }[],
) {
  // Check if any vertex of polygon is inside circle
  for (const p of poly) {
    if (dist(p, center) <= radius) return true;
  }

  // Check if any edge intersects circle
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]!;
    const p2 = poly[(i + 1) % poly.length]!;
    if (lineIntersectsCircle(p1, p2, center, radius)) return true;
  }

  // Check if circle center is inside polygon
  if (pointInPolygon(center, poly)) return true;

  return false;
}