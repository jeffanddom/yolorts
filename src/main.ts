import {
  PLAYFIELD_TILE_HEIGHT,
  PLAYFIELD_TILE_WIDTH,
  TILE_SIZE,
} from './constants'
import { Game } from './game'

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

const width = TILE_SIZE * PLAYFIELD_TILE_WIDTH
const height = TILE_SIZE * PLAYFIELD_TILE_HEIGHT

canvas.width = width
canvas.height = height

const map = {
  playfield: `
....~.....
....~.....
.^..~.....
....~.....
....~~~~~~
......^...
.....^^...
....^^^...
.....^^^..
.....^....
`,
  entities: `
..........
..........
..........
..........
.w........
.wwww.....
.w........
.w........
......p...
..........
`,
}

const ctx = canvas.getContext('2d')
const game = new Game(map)

function gameLoop() {
  requestAnimationFrame(gameLoop)
  game.update()
  game.render(ctx)
}

gameLoop()
