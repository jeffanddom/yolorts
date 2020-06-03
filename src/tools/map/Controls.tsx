import * as React from 'react'
import { useState } from 'react'
import { vec2 } from 'gl-matrix'
import { BrushMode, Editor } from './Editor'
import { Terrain } from '~map/interfaces'
import * as entities from '~entities'

export const Controls = ({ editor }: { editor: Editor }) => {
  const [state, setState] = useState({
    zoom: 1,
    map: editor.map,
    tilePos: vec2.create(),
    brush: editor.brush,
  })

  React.useEffect(() => {
    editor.events.addListener('zoom', ({ zoom }) =>
      setState((prevState) => {
        return { ...prevState, zoom }
      }),
    )

    editor.events.addListener('cursorMove', ({ tilePos }) =>
      setState((prevState) => {
        return { ...prevState, tilePos }
      }),
    )

    editor.events.addListener('brushChanged', ({ brush }) =>
      setState((prevState) => {
        return { ...prevState, brush }
      }),
    )
  }, [])

  return (
    <div>
      <h4>Controls</h4>
      <ul>
        <li>Zoom: {state.zoom.toFixed(2)}</li>
        <li>
          Map: {state.map.dimensions[0]}x{state.map.dimensions[1]}
        </li>
        <li>
          Cursor position:{' '}
          {state.tilePos !== undefined ? (
            <span>
              ({state.tilePos[0]}, {state.tilePos[1]})
            </span>
          ) : (
            <span></span>
          )}
        </li>
        <li>
          Brush: {BrushMode[state.brush.mode]} (
          {state.brush.mode === BrushMode.TERRAIN
            ? Terrain[state.brush.terrain]
            : entities.types.Type[state.brush.entity]}
          )
        </li>
      </ul>
    </div>
  )
}