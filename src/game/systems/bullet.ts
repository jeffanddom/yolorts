import { quat, vec2, vec3 } from 'gl-matrix'

import { BulletType } from '~/game/components/Bullet'
import {
  MORTAR_FIRING_HEIGHT,
  MORTAR_GRAVITY,
  TILE_SIZE,
} from '~/game/constants'
import * as emitter from '~/game/systems/emitter'
import { makeExplosion } from '~/game/systems/explosion'
import { WeaponType } from '~/game/systems/WeaponType'
import { FrameState } from '~/game/updateSystems'
import { PlusX3, PlusY3, radialTranslate2 } from '~/util/math'

const range: Record<BulletType, number> = {
  [WeaponType.Standard]: 8 * TILE_SIZE,
  [WeaponType.Rocket]: 12 * TILE_SIZE,
  [WeaponType.Mortar]: 0,
}
const speed: Record<BulletType, number> = {
  [WeaponType.Standard]: 15 * TILE_SIZE,
  [WeaponType.Rocket]: 3,
  [WeaponType.Mortar]: 0,
}

export const update = (frameState: FrameState, dt: number): void => {
  for (const [id, bullet] of frameState.stateDb.bullets) {
    const nextLifetime = bullet.lifetime + dt

    const transform = frameState.stateDb.transforms.get(id)!
    let newPos
    switch (bullet.type) {
      case WeaponType.Standard:
        {
          newPos = radialTranslate2(
            vec2.create(),
            transform.position,
            transform.orientation,
            speed[bullet.type] * dt,
          )
        }
        break

      case WeaponType.Rocket:
        {
          const currentSpeed = bullet.currentSpeed ?? speed[bullet.type]

          if (bullet.lifetime < 0.5 && 0.5 <= nextLifetime) {
            frameState.stateDb.emitters.set(
              id,
              emitter.make('rocketExhaust', vec2.fromValues(0, -0.25), Math.PI),
            )
          }

          const acceleration = bullet.lifetime > 0.5 ? 50 : 3
          newPos = radialTranslate2(
            vec2.create(),
            transform.position,
            transform.orientation,
            currentSpeed * dt + 0.5 * acceleration * dt * dt,
          )
          frameState.stateDb.bullets.update(id, {
            currentSpeed: currentSpeed + acceleration * dt,
          })
        }
        break

      case WeaponType.Mortar:
        {
          const disp = vec3.scale(vec3.create(), bullet.vel!, dt)
          disp[1] += 0.5 * MORTAR_GRAVITY * dt * dt

          const transform3 = frameState.stateDb.transform3s.get(id)!
          const newPos3 = vec3.clone(transform3.position)
          vec3.add(newPos3, newPos3, disp)

          if (newPos3[1] <= MORTAR_FIRING_HEIGHT) {
            frameState.stateDb.markEntityForDeletion(id)
            frameState.stateDb.registerEntity(makeExplosion(transform.position))
            return
          }

          // Calculate bullet orientation by composing two rotations: a vertical
          // rotation (around the +X3 axis), then a horizontal rotation (around
          // the +Y3 axis).
          const xangle = Math.asin(bullet.vel![1] / vec3.length(bullet.vel!))
          const xrot = quat.setAxisAngle(quat.create(), PlusX3, xangle)

          // Because the model is facing -Z3, we need to calculate the XZ
          // rotation angle assuming that -Z3 is angle zero, and -X3 is 90
          // degrees.
          const yangle = Math.atan2(-bullet.vel![0], -bullet.vel![2])
          const yrot = quat.setAxisAngle(quat.create(), PlusY3, yangle)

          frameState.stateDb.transform3s.update(id, {
            position: newPos3,
            orientation: quat.multiply(quat.create(), yrot, xrot),
          })

          const newVel = vec3.clone(bullet.vel!)
          newVel[1] += MORTAR_GRAVITY * dt
          frameState.stateDb.bullets.update(id, { vel: newVel })

          // Use some fake 2d value
          newPos = vec2.fromValues(newPos3[0], newPos3[2])
        }
        break
    }

    frameState.stateDb.transforms.update(id, { position: newPos })
    frameState.stateDb.bullets.update(id, { lifetime: nextLifetime })

    if (bullet.type !== WeaponType.Mortar) {
      if (vec2.distance(newPos, bullet.origin) >= range[bullet.type]) {
        frameState.stateDb.markEntityForDeletion(id)
        return
      }
    }
  }
}
