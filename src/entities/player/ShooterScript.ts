import { vec2 } from 'gl-matrix'

import { Transform } from '../../components/Transform'

import { IShooterScript } from '~/components/interfaces'
import { Team } from '~/components/team'
import { TILE_SIZE } from '~/constants'
import { makeBullet } from '~/entities/bullet'
import { Game } from '~/Game'
import { MouseButton } from '~/Mouse'
import { ParticleEmitter } from '~/particles/ParticleEmitter'
import { getAngle, radialTranslate2 } from '~/util/math'

const COOLDOWN_PERIOD = 0.25

export class ShooterScript implements IShooterScript {
  cooldownTtl: number
  orientation: number

  constructor() {
    this.cooldownTtl = 0
    this.orientation = 0
  }

  update(
    transform: Transform,
    _team: Team,
    entityId: string,
    game: Game,
    dt: number,
  ): void {
    const mousePos = game.mouse.getPos()
    if (!mousePos) {
      return
    }

    this.orientation = getAngle(
      transform.position,
      game.camera.viewToWorldspace(mousePos),
    )

    if (this.cooldownTtl > 0) {
      this.cooldownTtl -= dt
      return
    }

    if (game.mouse.isDown(MouseButton.LEFT)) {
      this.cooldownTtl = COOLDOWN_PERIOD

      const bulletPos = radialTranslate2(
        vec2.create(),
        transform.position,
        this.orientation,
        TILE_SIZE * 0.25,
      )

      game.entities.register(
        makeBullet({
          position: bulletPos,
          orientation: this.orientation,
          owner: entityId,
        }),
      )

      const muzzleFlash = new ParticleEmitter({
        spawnTtl: 0.1,
        position: bulletPos,
        particleTtl: 0.065,
        particleRadius: 3,
        particleRate: 240,
        particleSpeedRange: [120, 280],
        orientation: this.orientation,
        arc: Math.PI / 4,
        colors: ['#FF9933', '#CCC', '#FFF'],
      })
      game.emitters.push(muzzleFlash)
    }
  }
}
