import { quat } from 'gl-matrix'
import { glMatrix } from 'gl-matrix'
import { mat2d, vec2, vec3, vec4 } from 'gl-matrix'

import { Immutable } from '~/types/immutable'

export const Zero2: Immutable<vec2> = vec2.create()
export const One2: Immutable<vec2> = vec2.fromValues(1, 1)
export const PlusY2: Immutable<vec2> = vec2.fromValues(0, 1)
export const MinusY2: Immutable<vec2> = vec2.fromValues(0, -1)
export const PlusX2: Immutable<vec2> = vec2.fromValues(1, 0)
export const MinusX2: Immutable<vec2> = vec2.fromValues(-1, 0)
export const North2: Immutable<vec2> = MinusY2
export const South2: Immutable<vec2> = PlusY2
export const West2: Immutable<vec2> = MinusX2
export const East2: Immutable<vec2> = PlusX2

export const Zero3: Immutable<vec3> = vec3.create()
export const One3: Immutable<vec3> = vec3.fromValues(1, 1, 1)
export const PlusX3: Immutable<vec3> = vec3.fromValues(1, 0, 0)
export const MinusX3: Immutable<vec3> = vec3.fromValues(-1, 0, 0)
export const PlusY3: Immutable<vec3> = vec3.fromValues(0, 1, 0)
export const MinusY3: Immutable<vec3> = vec3.fromValues(0, -1, 0)
export const PlusZ3: Immutable<vec3> = vec3.fromValues(0, 0, 1)
export const MinusZ3: Immutable<vec3> = vec3.fromValues(0, 0, -1)

export const Zero4: Immutable<vec4> = vec4.fromValues(0, 0, 0, 0)
export const One4: Immutable<vec4> = vec4.fromValues(1, 1, 1, 1)
export const PlusX4: Immutable<vec4> = vec4.fromValues(1, 0, 0, 0)
export const MinusX4: Immutable<vec4> = vec4.fromValues(-1, 0, 0, 0)
export const PlusY4: Immutable<vec4> = vec4.fromValues(0, 1, 0, 0)
export const MinusY4: Immutable<vec4> = vec4.fromValues(0, -1, 0, 0)
export const PlusZ4: Immutable<vec4> = vec4.fromValues(0, 0, 1, 0)
export const MinusZ4: Immutable<vec4> = vec4.fromValues(0, 0, -1, 0)
export const PlusW4: Immutable<vec4> = vec4.fromValues(0, 0, 0, 1)
export const MinusW4: Immutable<vec4> = vec4.fromValues(0, 0, 0, -1)

export const QuatIdentity: Immutable<quat> = quat.create()

export type SphereCoord = [number, number, number] // [r, theta, phi]

export enum SphereElement {
  Radius,
  Theta,
  Phi,
}

export function sphereCoordFromValues(
  r: number, // radius
  theta: number, // inclination
  phi: number, // azimuth
): SphereCoord {
  return [r, theta, phi]
}

/**
 * This function treats +Y as the vertical axis, and +X/+Z as the ground plane.
 * In other words, theta is the rotation away from +Y toward the +X/+Z plane,
 * and phi is the rotation around +Y with zero as +Z.
 *
 * https://en.wikipedia.org/wiki/Spherical_coordinate_system#Cartesian_coordinates
 */
export function sphereCoordToVec3(
  out: vec3,
  coord: Immutable<SphereCoord>,
): vec3 {
  const rSinTheta =
    coord[SphereElement.Radius] * Math.sin(coord[SphereElement.Theta])
  out[0] = rSinTheta * Math.sin(coord[SphereElement.Phi]) // r * sin(theta) * sin(phi)
  out[1] = coord[SphereElement.Radius] * Math.cos(coord[SphereElement.Theta]) // r * cos(theta)
  out[2] = rSinTheta * Math.cos(coord[SphereElement.Phi]) // r *  sin(theta) * cos(phi)
  return out
}

export const clamp = (v: number, min: number, max: number): number => {
  if (v < min) {
    return min
  }

  if (v > max) {
    return max
  }

  return v
}

export const clamp2 = (
  out: vec2,
  v: Immutable<vec2>,
  range: Immutable<[vec2, vec2]>,
): vec2 => {
  return vec2.min(out, vec2.max(out, v, range[0]), range[1])
}

export const lerp = (min: number, max: number, alpha: number): number => {
  return min + alpha * (max - min)
}

export const inverseLerp = (min: number, max: number, pos: number): number => {
  return (pos - min) / (max - min)
}

/**
 * Translate vector start by amount in a direction indicated by orientation.
 * orientation is interpreted as clockwise radians from north (negative y).
 */
export const radialTranslate2 = (
  out: vec2,
  start: Immutable<vec2>,
  orientation: number,
  amount: number,
): vec2 => {
  return vec2.add(
    out,
    start,
    vec2.rotate(vec2.create(), [0, -amount], Zero2, orientation),
  )
}

export const getAngle = (
  from: Immutable<vec2>,
  to: Immutable<vec2>,
): number => {
  const offset = vec2.sub(vec2.create(), to, from)
  return Math.sign(offset[0]) * vec2.angle(North2, offset)
}

export const normalizeAngle = (theta: number): number => {
  if (theta > Math.PI) {
    return theta - 2 * Math.PI
  } else if (theta < -Math.PI) {
    return theta + 2 * Math.PI
  }
  return theta
}

export const rotateUntil = (params: {
  from: number
  to: number
  amount: number
}): number => {
  const { from, to, amount } = params
  const diff = normalizeAngle(normalizeAngle(to) - normalizeAngle(from))

  return normalizeAngle(
    from + (amount >= Math.abs(diff) ? diff : Math.sign(diff) * amount),
  )
}

export const vec2FromValuesBatch = (raw: [number, number][]): Array<vec2> => {
  return raw.map((r) => vec2.fromValues(r[0], r[1]))
}

/**
 * Applies uniform scaling and translation to a circle. This will not perform
 * skew or rotation.
 */
export const transformCircle = (
  { pos, radius }: { pos: vec2; radius: number },
  transform: mat2d,
): { pos: vec2; radius: number } => {
  const center = vec2.transformMat2d(vec2.create(), pos, transform)
  const edge = vec2.create()
  vec2.transformMat2d(
    edge,
    vec2.add(edge, pos, vec2.fromValues(radius, 0)),
    transform,
  )

  return {
    pos: center,
    radius: vec2.length(vec2.sub(edge, edge, center)),
  }
}

/**
 * Convert radians to degrees
 */
export function r2d(radians: number): number {
  return (radians * 180) / Math.PI
}

export function vec3toFixedString(
  v: Immutable<vec3>,
  decimals: number,
): string {
  return `(${v[0].toFixed(decimals)}, ${v[1].toFixed(decimals)}, ${v[2].toFixed(
    decimals,
  )})`
}

/**
 * Translate a screenspace position (relative to the upper-left corner of the
 * viewport) to a viewspace position. The absolute value of the z-distance of
 * this point is equivalent to the focal length.
 *
 * See: "Picking", chapter 6.6 Van Verth and Bishop, 2nd ed.
 */
export function screenToView(
  out: vec3,
  screenPos: Immutable<vec2>,
  viewportDimensions: Immutable<vec2>,
  focalLength: number,
): vec3 {
  const w = viewportDimensions[0]
  const h = viewportDimensions[1]

  out[0] = (2 * (screenPos[0] - w / 2)) / h
  out[1] = (-2 * (screenPos[1] - h / 2)) / h
  out[2] = -focalLength

  return out
}

export function fovToFocalLength(fov: number): number {
  return 1 / Math.tan(fov / 2)
}

export function multilerp3(
  out: vec3,
  from: Immutable<vec3>,
  to: Immutable<vec3>,
  a0: number,
  a1: number,
  a2: number,
): void {
  out[0] = lerp(from[0], to[0], a0)
  out[1] = lerp(from[1], to[1], a1)
  out[2] = lerp(from[2], to[2], a2)
}

export function multilerp4(
  out: vec4,
  from: Immutable<vec4>,
  to: Immutable<vec4>,
  a0: number,
  a1: number,
  a2: number,
  a3: number,
): void {
  out[0] = lerp(from[0], to[0], a0)
  out[1] = lerp(from[1], to[1], a1)
  out[2] = lerp(from[2], to[2], a2)
  out[3] = lerp(from[3], to[3], a3)
}
/**
 * Currently, we're borrowing the logic from the following solution:
 * https://stackoverflow.com/a/51170230
 *
 * What we want:
 * - use a separate slider for "roll" value
 * - assuming a fixed roll value, particles should behave as if affixed to a
 *   stick attached to the origin for any change of spherical coords
 */
export function quatLookAt(
  out: quat,
  src: Immutable<vec3>,
  dst: Immutable<vec3>,
  front: Immutable<vec3>,
  up: Immutable<vec3>,
): quat {
  const delta = vec3.sub(vec3.create(), dst, src)
  vec3.normalize(delta, delta)

  const axis = vec3.cross(vec3.create(), front, delta)
  vec3.normalize(axis, axis)
  if (glMatrix.equals(vec3.sqrLen(axis), 0)) {
    vec3.copy(axis, up)
  }

  const angle = Math.acos(vec3.dot(front, delta))

  return quat.setAxisAngle(out, axis, angle)
}
