import { vec2 } from 'gl-matrix'

import * as damageable from '~/components/Damageable'
import { Team } from '~/components/team'
import * as transform from '~/components/Transform'
import { TILE_SIZE } from '~/constants'
import {
  EntityComponents,
  makeDefaultEntity,
} from '~/entities/EntityComponents'
import { PlayerRenderables } from '~/entities/player/PlayerRenderables'
import { Type } from '~/entities/types'
import { BuilderCreator } from '~/systems/builder'
import { ShooterComponent } from '~/systems/shooter'

export const makePlayer = (): EntityComponents => {
  const e = makeDefaultEntity()
  e.type = Type.PLAYER

  e.playfieldClamped = true
  e.targetable = true
  e.team = Team.Friendly
  e.moveable = true

  const shooter = new ShooterComponent()
  e.builderCreator = new BuilderCreator()
  e.damageable = damageable.make(10, {
    offset: vec2.fromValues(-TILE_SIZE * 0.3, -TILE_SIZE * 0.5),
    dimensions: vec2.fromValues(TILE_SIZE * 0.6, TILE_SIZE),
  })
  e.inventory = []
  e.renderable = new PlayerRenderables()
  e.hitbox = {
    offset: vec2.fromValues(-TILE_SIZE * 0.3, -TILE_SIZE * 0.5),
    dimensions: vec2.fromValues(TILE_SIZE * 0.6, TILE_SIZE),
  }
  e.shooter = shooter

  e.transform = transform.make()

  return e
}
