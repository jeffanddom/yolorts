import { mat4, quat, vec3 } from 'gl-matrix'

import { MouseButton, mouseButtonsFromBitmask } from '~/engine/input/interfaces'
import * as math from '~/util/math'

export class Camera {
  private spherePos: math.SphereCoord
  private viewOffset: vec3

  constructor(canvas: HTMLCanvasElement) {
    this.spherePos = math.sphereCoordFromValues(3, Math.PI / 2, 0)
    this.viewOffset = vec3.create()

    // stop right clicks from opening the context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        this.spherePos[0] += event.deltaY * 0.025
        this.spherePos[0] = math.clamp(this.spherePos[0], 1, 10)
      },
      { passive: false },
    )

    canvas.addEventListener('mousemove', (event) => {
      const buttons = mouseButtonsFromBitmask(event.buttons)

      if (buttons.has(MouseButton.Left)) {
        const scale = 0.005
        this.spherePos[2] = math.normalizeAngle(
          this.spherePos[2] + event.movementX * -scale,
        )

        // Keep inclination away from poles.
        this.spherePos[1] += event.movementY * -scale
        this.spherePos[1] = math.clamp(
          this.spherePos[1],
          0.0005,
          Math.PI - 0.0005,
        )
      }

      if (buttons.has(MouseButton.Right)) {
        const scale = 0.0025
        this.viewOffset[0] += -event.movementX * scale
        this.viewOffset[1] += event.movementY * scale
      }
    })
  }

  public world2View(out: mat4): mat4 {
    const worldPos = math.sphereCoordToVec3(vec3.create(), this.spherePos)
    mat4.targetTo(out, worldPos, math.Zero3, math.PlusY3)

    const rot = mat4.getRotation(quat.create(), out)

    const offset = mat4.fromTranslation(
      mat4.create(),
      vec3.transformQuat(vec3.create(), this.viewOffset, rot),
    )

    mat4.multiply(out, offset, out)
    const res = mat4.invert(out, out)
    if (res === null) {
      throw `cannot invert matrix`
    }

    return out
  }
}
