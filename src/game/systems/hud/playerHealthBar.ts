import { vec2 } from 'gl-matrix'

import { Primitive2d, Renderable2d } from '~/engine/renderer/Renderer2d'
import { StateDb } from '~/game/state/StateDb'
import { inverseLerp, lerp } from '~/util/math'

export const update = (
  stateDb: StateDb,
  playerNumber: number,
): Renderable2d[] => {
  const playerId = stateDb.getPlayerId(playerNumber)
  if (playerId === undefined) {
    return []
  }

  const damageable = stateDb.damageables.get(playerId)!
  const maxFill = 100
  const fill = lerp(
    0,
    maxFill,
    inverseLerp(0, damageable.maxHealth, damageable.health),
  )
  const y = 15

  return [
    // background
    {
      primitive: Primitive2d.RECT,
      pos: vec2.fromValues(15, y),
      dimensions: vec2.fromValues(15, maxFill),
      fillStyle: 'rgba(200, 200, 200, 0.3)',
      strokeStyle: 'rgba(128, 128, 128, 0.8)',
    },
    // fill
    {
      primitive: Primitive2d.RECT,
      pos: vec2.fromValues(15, y + maxFill - fill),
      dimensions: vec2.fromValues(15, fill),
      fillStyle: 'rgba(192, 36, 36, 0.7)',
    },
  ]
}
