import { vec2 } from 'gl-matrix'

import { TILE_SIZE } from '~/constants'
import { mockDebugDraw } from '~/DebugDraw'
import { EntityManager } from '~/entities/EntityManager'
import { GameState, gameProgression, initMap } from '~/Game'
import { Map } from '~/map/interfaces'
import { IClientConnection } from '~/network/ClientConnection'
import { ClientMessage, ClientMessageType } from '~/network/ClientMessage'
import { ServerMessageType } from '~/network/ServerMessage'
import { SimulationPhase, simulate } from '~/simulate'
import * as terrain from '~/terrain'
import * as aabb2 from '~/util/aabb2'
import { RunningAverage } from '~/util/RunningAverage'
import * as time from '~/util/time'

export class ServerSim {
  entityManager: EntityManager

  // A buffer of unprocessed client messages received from clients. The messages
  // are grouped by frame, and the groups are indexed by the number of frames
  // ahead of the server's current frame.
  clientMessagesByFrame: ClientMessage[][]
  clients: {
    frame: number
    conn: IClientConnection
  }[]
  playerCount: number
  simulationFrame: number

  // Common game state
  state: GameState
  nextState: GameState | undefined
  shuttingDown: boolean

  currentLevel: number

  map: Map
  terrainLayer: terrain.Layer

  updateFrameDurations: RunningAverage
  lastUpdateAt: number
  simulationDurations: RunningAverage

  constructor(config: { playerCount: number; minFramesBehindClient: number }) {
    this.clientMessagesByFrame = []
    this.entityManager = new EntityManager(aabb2.create())
    this.clients = []
    this.playerCount = config.playerCount
    this.simulationFrame = 0

    this.state = GameState.Connecting
    this.nextState = undefined
    this.shuttingDown = false

    this.currentLevel = 0

    this.map = Map.empty()
    this.terrainLayer = new terrain.Layer({
      tileOrigin: vec2.create(),
      tileDimensions: vec2.create(),
      terrain: this.map.terrain,
    })

    this.updateFrameDurations = new RunningAverage(3 * 60)
    this.lastUpdateAt = time.current()
    this.simulationDurations = new RunningAverage(3 * 60)
  }

  shutdown(): void {
    this.shuttingDown = true

    // Terminate all client connections
    for (const { conn } of this.clients) {
      conn.close()
    }
  }

  connectClient(conn: IClientConnection): void {
    if (this.shuttingDown) {
      conn.close()
      return
    }

    if (this.clients.length === this.playerCount) {
      console.log('already reached maximum player count') // TODO: close connection
      return
    }

    this.clients.push({
      frame: -1,
      conn,
    })
    console.log(`connected player: ${this.clients.length}`)
  }

  setState(s: GameState): void {
    this.nextState = s
  }

  update(dt: number): void {
    if (this.shuttingDown) {
      return
    }

    const now = time.current()
    this.updateFrameDurations.sample(now - this.lastUpdateAt)
    this.lastUpdateAt = now

    // process incoming client messages
    for (const client of this.clients) {
      for (const msg of client.conn.consume()) {
        if (
          msg.type === ClientMessageType.FRAME_END &&
          msg.frame > client.frame
        ) {
          client.frame = msg.frame
        }

        // Discard the message if it is no longer possible to simulate; i.e.,
        // the frame it describes has already been simulated.
        if (msg.frame < this.simulationFrame) {
          continue
        }

        // index is an offset from this.simulationFrame
        const index = msg.frame - this.simulationFrame

        // Ensure there is a container the message's frame
        for (let i = this.clientMessagesByFrame.length; i <= index; i++) {
          this.clientMessagesByFrame.push([])
        }

        // Store message grouped by frame, but don't worry about FRAME_END
        // messages.
        if (msg.type !== ClientMessageType.FRAME_END) {
          this.clientMessagesByFrame[index].push(msg)
        }

        for (const receiver of this.clients) {
          if (client === receiver) {
            continue
          }

          client.conn.send({
            type: ServerMessageType.REMOTE_CLIENT_MESSAGE,
            message: msg
          })
        }
      }
    }

    if (this.nextState !== undefined) {
      this.state = this.nextState
      this.nextState = undefined

      switch (this.state) {
        case GameState.Running:
          // Level setup
          this.map = Map.fromRaw(gameProgression[this.currentLevel])
          const worldOrigin = vec2.scale(
            vec2.create(),
            this.map.origin,
            TILE_SIZE,
          )
          const dimensions = vec2.scale(
            vec2.create(),
            this.map.dimensions,
            TILE_SIZE,
          )

          this.entityManager = new EntityManager([
            worldOrigin[0],
            worldOrigin[1],
            worldOrigin[0] + dimensions[0],
            worldOrigin[1] + dimensions[1],
          ])
          this.terrainLayer = initMap(this.entityManager, this.map)

          this.clients.forEach((client, index) => {
            client.conn.send({
              type: ServerMessageType.START_GAME,
              playerNumber: index + 1,
            })
          })
          break
      }
    }

    switch (this.state) {
      case GameState.Connecting:
        {
          if (this.clients.length === this.playerCount) {
            this.setState(GameState.Running)
          }
        }
        break

      case GameState.Running:
        {
          // Advance only if all clients have already reached the frame the
          // server is about to simulate.
          let doSim = true
          for (const c of this.clients) {
            if (c.frame < this.simulationFrame) {
              doSim = false
              break
            }
          }

          if (!doSim) {
            break
          }

          const start = time.current()

          // Remove this frame's client messages from the history, then process.
          const frameMessages = this.clientMessagesByFrame.shift() ?? []
          simulate(
            {
              entityManager: this.entityManager,
              messages: frameMessages,
              terrainLayer: this.terrainLayer,
              frame: this.simulationFrame,
              debugDraw: mockDebugDraw,
              phase: SimulationPhase.ServerTick,
            },
            this.state,
            dt,
          )

          this.simulationDurations.sample(time.current() - start)

          for (const client of this.clients) {
            client.conn.send({
              type: ServerMessageType.FRAME_UPDATE,
              frame: this.simulationFrame,
              inputs: frameMessages,
              updateFrameDurationAvg: this.updateFrameDurations.average(),
              simulationDurationAvg: this.simulationDurations.average(),
            })
          }

          this.simulationFrame++
        }
        break
    }

    // On the server, there is no reason to accumulate prediction state, because
    // the server simulation is authoritative.
    this.entityManager.commitPrediction()
  }
}
