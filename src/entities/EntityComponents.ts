import { Bullet } from '~/components/Bullet'
import { Damageable } from '~/components/Damageable'
import { Damager } from '~/components/Damager'
import { Hitbox } from '~/components/Hitbox'
import { Team } from '~/components/team'
import { Transform } from '~/components/Transform'
import { Type } from '~/entities/types'
import { BuilderComponent, BuilderCreator } from '~/systems/builder'
import { PickupType } from '~/systems/pickups'
import { ShooterComponent } from '~/systems/shooter'
import { TurretComponent } from '~/systems/turret'

export interface EntityComponents {
  bullet?: Bullet
  damageable?: Damageable
  damager?: Damager
  dropType?: PickupType
  hitbox?: Hitbox
  moveable?: boolean
  obscured?: boolean
  obscuring?: boolean
  playerNumber?: number
  playfieldClamped?: boolean
  renderable?: string
  renderableV2?: string
  shooter?: ShooterComponent
  targetable?: boolean
  team?: Team
  transform?: Transform
  turret?: TurretComponent
  type?: Type
  wall?: boolean

  // Components that are currently not used by simulation
  builder?: BuilderComponent
  builderCreator?: BuilderCreator
  harvestType?: PickupType
  inventory?: PickupType[]
  pickupType?: PickupType
}

export const makeDefaultEntity = (): EntityComponents => {
  return { team: Team.Neutral }
}
