import { path2 } from '~/path2'
import { vec2, mat2d } from 'gl-matrix'

export enum Primitive {
  PATH = 0,
  RECT = 1,
  CIRCLE = 2,
  LINE = 3,
}

export interface Path {
  primitive: Primitive.PATH
  fillStyle: string
  mwTransform: mat2d
  path: path2 // modelspace coordinates
}

export interface Rect {
  primitive: Primitive.RECT
  fillStyle?: string
  strokeStyle?: string
  pos: vec2 // worldspace coordinates
  dimensions: vec2
}

export interface Circle {
  primitive: Primitive.CIRCLE
  fillStyle: string
  pos: vec2 // worldspace coordinates
  radius: number
}

export interface Line {
  primitive: Primitive.LINE
  style: string
  from: vec2
  to: vec2
  width: number
}

export type Renderable = Path | Rect | Circle | Line

export interface IRenderer {
  clear(color: string): void
  setTransform(t: mat2d): void
  render(r: Renderable): void
}