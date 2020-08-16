import { mat2d, vec2 } from 'gl-matrix'

import { CursorMode } from '../playerInput'

import { TILE_SIZE } from '~/constants'
import { Game } from '~/Game'
import { toRenderables } from '~/Model'
import * as models from '~/models'
import { Primitive } from '~/renderer/interfaces'
import { tileCoords, tileToWorld } from '~/util/tileMath'

export const update = (g: Game): void => {
  const mousePos = g.mouse.getPos()
  if (mousePos) {
    const mouseWorldPos = g.camera.viewToWorldspace(mousePos)

    // crosshair (TODO: this could probably be moved to HUD rendering, which
    // uses viewspace)
    const topLeft = vec2.sub(
      vec2.create(),
      mouseWorldPos,
      vec2.fromValues(3, 3),
    )
    const d = vec2.fromValues(6, 6)
    g.renderer.render({
      primitive: Primitive.RECT,
      strokeStyle: 'black',
      fillStyle: 'white',
      pos: topLeft,
      dimensions: d,
    })

    // tile indicator
    if (g.playerInputState.cursorMode !== CursorMode.NONE) {
      const tileWorldPos = tileToWorld(tileCoords(topLeft))

      g.renderer.render({
        primitive: Primitive.RECT,
        strokeStyle: 'rgba(255, 255, 0, 0.7)',
        fillStyle: 'rgba(0, 0, 0, 0)',
        pos: vec2.sub(
          vec2.create(),
          tileWorldPos,
          vec2.fromValues(TILE_SIZE / 2, TILE_SIZE / 2),
        ),
        dimensions: vec2.fromValues(TILE_SIZE, TILE_SIZE),
      })

      g.renderer.setGlobalOpacity(0.5)

      switch (g.playerInputState.cursorMode) {
        case CursorMode.HARVEST:
          toRenderables(models.harvestIcon, {
            worldTransform: mat2d.fromTranslation(mat2d.create(), tileWorldPos),
          }).forEach((r) => g.renderer.render(r))
          break
        case CursorMode.BUILD_TURRET:
          toRenderables(models.turret, {
            worldTransform: mat2d.fromTranslation(mat2d.create(), tileWorldPos),
          }).forEach((r) => g.renderer.render(r))
          break
        case CursorMode.BUILD_WALL:
          toRenderables(models.wall, {
            worldTransform: mat2d.fromTranslation(mat2d.create(), tileWorldPos),
          }).forEach((r) => g.renderer.render(r))
          break
        case CursorMode.MOVE_BUILDER:
          toRenderables(models.builder, {
            worldTransform: mat2d.fromTranslation(mat2d.create(), tileWorldPos),
          }).forEach((r) => g.renderer.render(r))
          break
      }

      g.renderer.setGlobalOpacity(1)
    }
  }
}