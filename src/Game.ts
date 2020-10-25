import { vec2 } from 'gl-matrix'

import { maps } from '~/assets/maps'
import { TILE_SIZE } from '~/constants'
import * as entities from '~/entities'
import { EntityManager } from '~/entities/EntityManager'
import { Type } from '~/entities/types'
import { Map } from '~/map/interfaces'
import * as terrain from '~/terrain'

export enum GameState {
  Connecting,
  Running,
  YouDied,
  LevelComplete,
}

export const gameProgression = [
  maps.bigMap,
  maps.quadtreeTest,
  maps.collisionTest,
]

export const initMap = (
  entityManager: EntityManager,
  map: Map,
): terrain.Layer => {
  // Level setup
  const terrainLayer = new terrain.Layer({
    tileOrigin: map.origin,
    tileDimensions: map.dimensions,
    terrain: map.terrain,
  })

  // Populate entities
  let playerCounter = 0
  for (let i = 0; i < map.dimensions[1]; i++) {
    for (let j = 0; j < map.dimensions[0]; j++) {
      const et = map.entities[i * map.dimensions[0] + j]
      if (et === null) {
        continue
      }

      const entity = entities.types.make(et)
      if (et === Type.PLAYER) {
        playerCounter++
        entity.playerNumber = playerCounter
      }

      if (entity.transform !== undefined) {
        entity.transform.position = vec2.add(
          vec2.create(),
          terrainLayer.minWorldPos(),
          vec2.fromValues(
            j * TILE_SIZE + TILE_SIZE * 0.5,
            i * TILE_SIZE + TILE_SIZE * 0.5,
          ),
        )
      }

      entityManager.register(entity)
    }
  }

  entityManager.commitPrediction()

  return terrainLayer
}
