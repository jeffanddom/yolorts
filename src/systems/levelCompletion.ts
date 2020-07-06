import { some } from 'lodash'

import { Game, GameState } from '~/Game'

export const update = (g: Game): void => {
  const levelComplete = !some(g.entities.entities, (e) => e.enemy)

  if (levelComplete) {
    g.setState(GameState.LevelComplete)
  }
}
