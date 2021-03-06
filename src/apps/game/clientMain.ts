import { vec2 } from 'gl-matrix'

import { Client } from '~/engine/client/Client'
import { ClientMessage } from '~/engine/network/ClientMessage'
import { BaseClientMessage } from '~/engine/network/ClientSimulator'
import { ClientGame } from '~/game/ClientGame'
import { SIMULATION_PERIOD_S } from '~/game/constants'
import * as autoReload from '~/web/autoReload'

declare global {
  interface Window {
    client: Client<BaseClientMessage>
  }
}

const client = new Client<ClientMessage>({
  document,
  apiLocation: location,
  viewportDimensions: vec2.fromValues(window.innerWidth, window.innerHeight),
  pixelRatio: window.devicePixelRatio,
  simulationPeriod: SIMULATION_PERIOD_S,
  getClientSim: (config) => new ClientGame(config),
})

window.addEventListener('resize', () => {
  client.setViewportDimensions(
    vec2.fromValues(window.innerWidth, window.innerHeight),
  )
})

function clientRenderLoop() {
  requestAnimationFrame(clientRenderLoop)
  client.update()
}

clientRenderLoop()

client.connectToServer()

// Add a debounced hotkey for restarting the server
let restartHotkeyTimeout: number | undefined = undefined
document.addEventListener('keyup', (event) => {
  if (event.code === 'KeyR' && event.ctrlKey && event.shiftKey) {
    if (restartHotkeyTimeout !== undefined) {
      return
    }

    restartHotkeyTimeout = window.setTimeout(() => {
      restartHotkeyTimeout = undefined
    }, 500)

    fetch(
      `${window.location.protocol}//${window.location.host}/api/restart`,
    ).then(() => {
      window.location.reload()
    })
  }
})

// Start auto-reload polling
autoReload.poll()

// Development-related globals
window.client = client
