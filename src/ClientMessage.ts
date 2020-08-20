import { DirectionMove } from '~/interfaces'

export enum ClientMessageType {
  MOVE_PLAYER,
}

interface MovePlayerClientMessage {
  frame: number
  type: ClientMessageType.MOVE_PLAYER
  direction: DirectionMove
}

export type ClientMessage = MovePlayerClientMessage
