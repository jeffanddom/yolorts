import { mat2d, vec2 } from 'gl-matrix'

import { Immutable } from '~/types/immutable'
import { sample } from '~/util/random'

export class Camera2d {
  private position: vec2
  private viewportDimensions: vec2
  minWorldPos: vec2
  worldDimensions: vec2
  private zoom: number // ratio of view distance to world distance

  // shake stuff
  ttl: number
  cooldownTtl: number
  shakeOffset: vec2

  // Unset this when the following change:
  // - position
  // - viewportDimensions
  // - zoom
  // - shakeOffset
  wvTransformCache?: mat2d

  constructor(
    viewportDimensions: vec2,
    minWorldPos: vec2,
    worldDimensions: vec2,
  ) {
    this.position = vec2.create()
    this.viewportDimensions = viewportDimensions
    this.minWorldPos = minWorldPos
    this.worldDimensions = worldDimensions
    this.zoom = 1

    this.ttl = 0
    this.cooldownTtl = 0
    this.shakeOffset = vec2.fromValues(0, 0)
  }

  shake(): void {
    this.ttl = 0.25
    this.cooldownTtl = 0
  }

  setViewportDimensions(d: vec2): void {
    this.viewportDimensions = d
  }

  update(dt: number): void {
    this.ttl -= dt
    if (this.ttl <= 0) {
      this.ttl = 0
      vec2.zero(this.shakeOffset)
      return
    }

    this.cooldownTtl -= dt
    if (this.cooldownTtl <= 0) {
      this.cooldownTtl += 1 / 60
      this.shakeOffset = sample([
        vec2.fromValues(-3, 0),
        vec2.fromValues(3, 0),
        vec2.fromValues(0, -3),
        vec2.fromValues(0, 3),
      ])!
      this.wvTransformCache = undefined
    }
  }

  maxWorldPos(): vec2 {
    return vec2.add(vec2.create(), this.minWorldPos, this.worldDimensions)
  }

  setZoom(z: number): void {
    this.zoom = z
    this.wvTransformCache = undefined
  }

  getZoom(): number {
    return this.zoom
  }

  getPosition(): vec2 {
    return vec2.clone(this.position)
  }

  setPosition(worldPos: Immutable<vec2>): void {
    vec2.copy(this.position, worldPos)
  }

  /**
   * Return a transform matrix that converts worldspace positions to viewpace
   * positions. This will include the effect of screenshake.
   *
   * Callers should cache the result of this function rather than call multiple
   * times in the same scope.
   */
  wvTransform(): mat2d {
    if (this.wvTransformCache !== undefined) {
      return mat2d.clone(this.wvTransformCache)
    }

    // Recenter position using camera position as origin
    const cw = mat2d.fromTranslation(
      mat2d.create(),
      vec2.negate(vec2.create(), this.position),
    )

    // Recenter position using worldspace-projected viewport origin.
    const cwCorner = mat2d.fromTranslation(
      mat2d.create(),
      vec2.scale(vec2.create(), this.viewportDimensions, 0.5 / this.zoom),
    )

    // Apply zoom
    const zoom = mat2d.fromScaling(
      mat2d.create(),
      vec2.fromValues(this.zoom, this.zoom),
    )

    // Apply shake
    const shake = mat2d.fromTranslation(mat2d.create(), this.shakeOffset)

    // Compose transforms
    const transform = cw
    mat2d.multiply(transform, cwCorner, transform)
    mat2d.multiply(transform, zoom, transform)
    mat2d.multiply(transform, shake, transform)

    this.wvTransformCache = transform
    return mat2d.clone(this.wvTransformCache)
  }

  viewToWorldspace(vpos: vec2): vec2 {
    return vec2.transformMat2d(
      vec2.create(),
      vpos,
      mat2d.invert(mat2d.create(), this.wvTransform()),
    )
  }

  /**
   * Returns the minimum and maximum visible world positions given the current
   * zoom and position.
   */
  getVisibleExtents(): [vec2, vec2] {
    const transform = this.wvTransform()
    mat2d.invert(transform, transform)
    return [
      vec2.transformMat2d(vec2.create(), vec2.fromValues(0, 0), transform),
      vec2.transformMat2d(vec2.create(), this.viewportDimensions, transform),
    ]
  }
}
