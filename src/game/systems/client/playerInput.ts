import { vec2 } from 'gl-matrix'
import { mat4 } from 'gl-matrix'
import { vec4 } from 'gl-matrix'
import { vec3 } from 'gl-matrix'

import { Camera3d } from '~/common/Camera3d'
import { DirectionMove, IKeyboard, IMouse } from '~/engine/input/interfaces'
import { MouseButton } from '~/engine/input/interfaces'
import {
  ClientAttackUpdate,
  ClientMoveUpdate,
} from '~/engine/network/ClientMessage'
import { UnlitObjectType } from '~/engine/renderer/Renderer3d'
import { ClientGame } from '~/game/ClientGame'
import { CLIENT_INPUT_DELAY } from '~/game/constants'

export const keyMap = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  switchWeapon: 'KeyQ',
  harvestMode: 'Digit1',
  buildTurretMode: 'Digit2',
  buildWallMode: 'Digit3',
  moveBuilderMode: 'Digit4',
  dash: 'Space',
}

export const update = (client: ClientGame, frame: number): void => {
  if (client.playerNumber === undefined) {
    return
  }

  const playerId = client.stateDb.getPlayerId(client.playerNumber)
  if (playerId === undefined) {
    return
  }

  const moveUpdate = handleMoveInput(client.keyboard)

  const attackUpdate = handleAttackInput({
    mouse: client.mouse,
    camera: client.camera,
  })

  client.sendClientMessage({
    frame: frame + CLIENT_INPUT_DELAY,
    playerNumber: client.playerNumber,
    move: moveUpdate,
    attack: attackUpdate,
    changeWeapon: client.keyboard.upKeys.has(keyMap.switchWeapon),
  })

  const playerPos = client.stateDb.transforms.get(playerId)!.position
  client.debugDraw.draw3d(() => {
    if (attackUpdate === undefined) {
      return []
    }

    return [
      {
        object: {
          type: UnlitObjectType.Lines,
          // prettier-ignore
          positions: new Float32Array([
            playerPos[0], 0, playerPos[1],
            attackUpdate.targetPos[0], 0, attackUpdate.targetPos[1],
          ]),
          color: vec4.fromValues(1, 0, 0, 1),
        },
      },
      {
        object: {
          type: UnlitObjectType.Model,
          modelName: 'linecube',
          model2World: mat4.fromTranslation(
            mat4.create(),
            vec3.fromValues(
              attackUpdate.targetPos[0],
              0.5,
              attackUpdate.targetPos[1],
            ),
          ),
          color: vec4.fromValues(1, 1, 0, 1),
        },
      },
    ]
  })
}

const handleMoveInput = (keyboard: IKeyboard): ClientMoveUpdate | undefined => {
  let direction
  if (keyboard.heldkeys.has(keyMap.moveUp)) {
    if (keyboard.heldkeys.has(keyMap.moveLeft)) {
      direction = DirectionMove.NW
    } else if (keyboard.heldkeys.has(keyMap.moveRight)) {
      direction = DirectionMove.NE
    } else {
      direction = DirectionMove.N
    }
  } else if (keyboard.heldkeys.has(keyMap.moveDown)) {
    if (keyboard.heldkeys.has(keyMap.moveLeft)) {
      direction = DirectionMove.SW
    } else if (keyboard.heldkeys.has(keyMap.moveRight)) {
      direction = DirectionMove.SE
    } else {
      direction = DirectionMove.S
    }
  } else if (keyboard.heldkeys.has(keyMap.moveLeft)) {
    direction = DirectionMove.W
  } else if (keyboard.heldkeys.has(keyMap.moveRight)) {
    direction = DirectionMove.E
  }

  if (direction === undefined) {
    return undefined
  }

  return {
    direction,
    dash: keyboard.downKeys.has(keyMap.dash),
  }
}

const handleAttackInput = ({
  mouse,
  camera,
}: {
  mouse: IMouse
  camera: Camera3d
}): ClientAttackUpdate | undefined => {
  const mousePos = mouse.getPos()
  if (mousePos === undefined) {
    return
  }

  // Get mouse position on display plane, in worldspace coordinates
  const mouseWorldPos = camera.screenToWorld(vec3.create(), mousePos)

  // Get camera ray in world space
  const cameraWorldPos = camera.getPos()
  const [dx, dy, dz] = vec3.sub(vec3.create(), mouseWorldPos, cameraWorldPos)

  // Extrapolate ray to the xz-plane
  const targetPos = vec2.fromValues(
    cameraWorldPos[0] - (cameraWorldPos[1] * dx) / dy,
    cameraWorldPos[2] - (cameraWorldPos[1] * dz) / dy,
  )

  return {
    targetPos,
    fireHeld: mouse.isHeld(MouseButton.Left),
    fireDown: mouse.isDown(MouseButton.Left),
  }
}
