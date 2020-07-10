import { vec2 } from 'gl-matrix'

import { TILE_SIZE } from '~/constants'
import { Damageable } from '~/entities/components/Damageable'
import { Damager } from '~/entities/components/Damager'
import { Transform } from '~/entities/components/Transform'
import { Game } from '~/Game'
import { ParticleEmitter } from '~/particles/ParticleEmitter'
import { Primitive } from '~/renderer/interfaces'
import { aabbOverlap, radialTranslate2 } from '~/util/math'
import { None, Some } from '~/util/Option'

export const update = (g: Game): void => {
  const damagers: [string, Damager, Transform][] = []
  const damageables: [string, Damageable, Transform][] = []

  for (const id in g.entities.entities) {
    const e = g.entities.entities[id]
    if (!e.transform) {
      continue
    }

    if (e.damager) {
      damagers.push([e.id, e.damager, e.transform])
    }

    if (e.damageable) {
      damageables.push([e.id, e.damageable, e.transform])
    }
  }

  for (const i in damagers) {
    const [attackerId, damager, attackerTransform] = damagers[i]
    const attackerAabb = damager.aabb(attackerTransform)

    g.debugDraw(() => {
      const d = vec2.sub(vec2.create(), attackerAabb[1], attackerAabb[0])
      return [
        {
          primitive: Primitive.RECT,
          strokeStyle: 'magenta',
          pos: attackerAabb[0],
          dimensions: d,
        },
      ]
    })

    let hit = None<[string, Damageable]>()
    for (const j in damageables) {
      const [targetId, damageable, targetTransform] = damageables[j]

      if (
        attackerId !== targetId &&
        aabbOverlap(damageable.aabb(targetTransform), attackerAabb)
      ) {
        hit = Some([targetId, damageable])
        break
      }
    }

    if (!hit.isSome()) {
      continue
    }

    const [targetId, damageable] = hit.unwrap()

    // For now, the only behavior for damagers is "bullet" style: apply
    // damage to the damageable, and then remove self from simulation.
    damageable.health -= damager.damageValue
    g.entities.markForDeletion(attackerId)

    // Side effects:
    // - explosion
    // - camera shake if player hit

    const explosion = new ParticleEmitter({
      spawnTtl: 0.2,
      position: radialTranslate2(
        vec2.create(),
        attackerTransform.position,
        attackerTransform.orientation,
        TILE_SIZE / 2,
      ),
      particleTtl: 0.1,
      particleRadius: 10,
      particleSpeedRange: [90, 125],
      particleRate: 270,
      orientation: 0,
      arc: Math.PI * 2,
      colors: ['#FF4500', '#FFA500', '#FFD700', '#000'],
    })
    g.emitters.push(explosion)

    if (g.player.map((p) => p.id).equals(Some(targetId))) {
      g.camera.shake()
    }
  }
}