import { TILE_SIZE, IEntity, IGenericComponent } from './common'
import { path2 } from './path2'
import { Entity } from './Entity'
import { Transform } from './Transform'
import { Damageable } from './Damageable'
import { PathRenderable } from './PathRenderable'

const WALL_HEALTH = 4.0

class DisplayWallDamage implements IGenericComponent {
  update(entity: IEntity): void {
    const damage = entity.damageable.health
    const scale = damage / WALL_HEALTH
    const color = 90 + (40 * scale)

    entity.pathRenderable.fillStyle = `rgba(${color},${color},${color},1)`
  }
}

class WallComponent implements IGenericComponent {
  update(entity: IEntity): void {}
}

export const makeWall = (): IEntity => {
  const e = new Entity()
  e.transform = new Transform()
  e.wall = new WallComponent()
  e.pathRenderable = new PathRenderable(
    path2.fromValues([
      [-TILE_SIZE * 0.5, -TILE_SIZE * 0.5],
      [TILE_SIZE * 0.5, -TILE_SIZE * 0.5],
      [TILE_SIZE * 0.5, TILE_SIZE * 0.5],
      [-TILE_SIZE * 0.5, TILE_SIZE * 0.5],
    ]),
    '#000',
  )
  e.damageable = new Damageable(WALL_HEALTH)
  e.prerender = new DisplayWallDamage()
  return e
}
