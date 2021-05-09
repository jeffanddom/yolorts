import { mat4, quat, vec3, vec4 } from 'gl-matrix'
import { vec2 } from 'gl-matrix'

import { FrameEventType } from './FrameEvent'

import { aabb as damageableAabb } from '~/components/Damageable'
import * as hitbox from '~/components/Hitbox'
import { Transform } from '~/components/Transform'
import { DebugDrawObject } from '~/DebugDraw'
import { EntityId } from '~/entities/EntityId'
import { UnlitObjectType } from '~/renderer/Renderer3d'
import {
  SimState,
  SimulationPhase,
  simulationPhaseDebugColor,
} from '~/simulate'
import { Immutable } from '~/types/immutable'
import * as aabb2 from '~/util/aabb2'

export enum DamageAreaType {
  Circle,
  Hitbox,
  Point,
}

interface DamageAreaCircle {
  type: DamageAreaType.Circle
  radius: number
}

interface DamageAreaHitbox {
  type: DamageAreaType.Hitbox
  hitbox: hitbox.Hitbox
}

interface DamageAreaPoint {
  type: DamageAreaType.Point
}

export type DamageArea = DamageAreaCircle | DamageAreaHitbox | DamageAreaPoint

export type Damager = {
  damageValue: number
  area: DamageArea
  splash: boolean
  immuneList: EntityId[]
}

function cloneDamageArea(area: Immutable<DamageArea>): DamageArea {
  switch (area.type) {
    case DamageAreaType.Circle:
      return { type: DamageAreaType.Circle, radius: area.radius }
    case DamageAreaType.Hitbox:
      return { type: DamageAreaType.Hitbox, hitbox: hitbox.clone(area.hitbox) }
    case DamageAreaType.Point:
      return { type: DamageAreaType.Point }
  }
}

const damageAreaAabbOverlap = (() => {
  const tempVec2 = vec2.create()

  return (
    attackerTransform: Immutable<Transform>,
    attackerArea: Immutable<DamageArea>,
    targetAabb: aabb2.Aabb2,
  ): boolean => {
    switch (attackerArea.type) {
      case DamageAreaType.Circle:
        const radiusSquared = attackerArea.radius * attackerArea.radius
        return (
          vec2.squaredDistance(
            attackerTransform.position,
            vec2.set(tempVec2, targetAabb[0], targetAabb[1]),
          ) <= radiusSquared ||
          vec2.squaredDistance(
            attackerTransform.position,
            vec2.set(tempVec2, targetAabb[0], targetAabb[3]),
          ) <= radiusSquared ||
          vec2.squaredDistance(
            attackerTransform.position,
            vec2.set(tempVec2, targetAabb[2], targetAabb[1]),
          ) <= radiusSquared ||
          vec2.squaredDistance(
            attackerTransform.position,
            vec2.set(tempVec2, targetAabb[2], targetAabb[3]),
          ) <= radiusSquared
        )

      case DamageAreaType.Hitbox:
        const attackerAabb = hitbox.aabb(
          attackerArea.hitbox,
          attackerTransform.position,
        )
        return aabb2.overlap(attackerAabb, targetAabb)

      case DamageAreaType.Point:
        return aabb2.contains(targetAabb, attackerTransform.position)
    }
  }
})()

function damageAreaAabb(
  attackerTransform: Immutable<Transform>,
  attackerArea: Immutable<DamageArea>,
): aabb2.Aabb2 {
  switch (attackerArea.type) {
    case DamageAreaType.Circle:
      return [
        attackerTransform.position[0] - attackerArea.radius,
        attackerTransform.position[1] - attackerArea.radius,
        attackerTransform.position[0] + attackerArea.radius,
        attackerTransform.position[1] + attackerArea.radius,
      ]

    case DamageAreaType.Hitbox:
      return hitbox.aabb(attackerArea.hitbox, attackerTransform.position)

    case DamageAreaType.Point:
      return [
        attackerTransform.position[0] - 0.1,
        attackerTransform.position[1] - 0.1,
        attackerTransform.position[0] + 0.1,
        attackerTransform.position[1] + 0.1,
      ]
  }
}

export function clone(d: Immutable<Damager>): Damager {
  return {
    damageValue: d.damageValue,
    area: cloneDamageArea(d.area),
    splash: d.splash,
    immuneList: (d.immuneList as EntityId[]).slice(),
  }
}

export const update = (simState: SimState): void => {
  simState.debugDraw.draw3d(() => {
    const objects: DebugDrawObject[] = []

    for (const [entityId, d] of simState.entityManager.damageables) {
      const xform = simState.entityManager.transforms.get(entityId)!
      const [center, size] = aabb2.centerSize(damageableAabb(d, xform))
      objects.push({
        object: {
          type: UnlitObjectType.Model,
          modelName: 'linetile',
          model2World: mat4.fromRotationTranslationScale(
            mat4.create(),
            quat.create(),
            vec3.fromValues(center[0], 0.05, center[1]),
            vec3.fromValues(size[0], 1, size[1]),
          ),
          color: simulationPhaseDebugColor(vec4.create(), simState.phase),
        },
      })
    }

    return objects
  })

  for (const [id, damager] of simState.entityManager.damagers) {
    const transform = simState.entityManager.transforms.get(id)!

    const candidateIds = simState.entityManager.queryByWorldPos(
      damageAreaAabb(transform, damager.area),
    )

    const targetIds: EntityId[] = []
    for (const candidateId of candidateIds) {
      if (id === candidateId) {
        continue
      }

      if (damager.immuneList.includes(candidateId)) {
        continue
      }

      const damageable = simState.entityManager.damageables.get(candidateId)
      if (damageable === undefined) {
        continue
      }

      const targetTransform = simState.entityManager.transforms.get(
        candidateId,
      )!
      if (
        damageAreaAabbOverlap(
          transform,
          damager.area,
          damageableAabb(damageable, targetTransform),
        )
      ) {
        targetIds.push(candidateId)

        if (!damager.splash) {
          break
        }
      }
    }

    for (const targetId of targetIds) {
      // For now, the only behavior for damagers is "bullet" style: apply
      // damage to the damageable, and then remove self from simulation.

      const damageable = simState.entityManager.damageables.get(targetId)!
      simState.entityManager.damageables.update(targetId, {
        health: damageable.health - damager.damageValue,
      })

      simState.entityManager.markForDeletion(id)

      // Knockback
      simState.frameEvents.push({
        type: FrameEventType.TankHit,
        entityId: targetId,
        hitAngle: transform.orientation,
      })

      simState.frameEvents.push({
        type: FrameEventType.BulletHit,
        position: vec2.clone(transform.position),
      })

      // Debug draw hits
      simState.debugDraw.draw3d(() => {
        if (simState.phase !== SimulationPhase.ClientAuthoritative) {
          return []
        }
        const damageableTransform = simState.entityManager.transforms.get(
          targetId,
        )!
        const [center, size] = aabb2.centerSize(
          damageableAabb(damageable, damageableTransform),
        )
        return [
          {
            object: {
              type: UnlitObjectType.Model,
              modelName: 'linetile',
              model2World: mat4.fromRotationTranslationScale(
                mat4.create(),
                quat.create(),
                vec3.fromValues(center[0], 0.05, center[1]),
                vec3.fromValues(size[0], 1, size[1]),
              ),
              color: vec4.fromValues(1, 0, 0, 1),
            },
            lifetime: 60,
          },
        ]
      })
    }
  }
}