import { Client } from '~/Client'
import { ClientMessage, ClientMessageType } from '~/ClientMessage'
import { TILE_SIZE } from '~/constants'
import { EntityManager } from '~/entities/EntityManager'
import { radialTranslate2, rotateUntil } from '~/util/math'

const TANK_SPEED = 60 * (TILE_SIZE / 8)
const TANK_ROT_SPEED = Math.PI

export const update = (
  simState: {
    entityManager: EntityManager
    messages: ClientMessage[]
    client?: Client
  },
  dt: number,
  frame: number,
): void => {
  const messages = simState.messages.filter(
    (m) => m.frame === frame && m.type === ClientMessageType.MOVE_PLAYER,
  )

  messages.forEach((message) => {
    const player = simState.entityManager.getPlayer(message.playerNumber)
    if (!player) {
      return
    }

    player.transform!.orientation = rotateUntil({
      from: player.transform!.orientation,
      to: message.direction,
      amount: TANK_ROT_SPEED * dt,
    })
    radialTranslate2(
      player.transform!.position,
      player.transform!.position,
      message.direction,
      TANK_SPEED * dt,
    )
  })
}
