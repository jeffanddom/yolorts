import { vec4 } from 'gl-matrix'

import { IDebugDrawWriter } from '~/engine/DebugDraw'
import { ClientMessage } from '~/engine/network/ClientMessage'
import { SimulationPhase } from '~/engine/network/SimulationPhase'
import * as terrain from '~/engine/terrain'
import { StateDb } from '~/game/state/StateDb'
import * as systems from '~/game/systems'
import { FrameEvent } from '~/game/systems/FrameEvent'

export function simulationPhaseDebugColor(
  out: vec4,
  phase: SimulationPhase,
): vec4 {
  switch (phase) {
    case SimulationPhase.ServerTick:
      return vec4.set(out, 0, 0, 0, 0)
    case SimulationPhase.ClientPrediction:
      return vec4.set(out, 1, 0, 0.8, 1)
    case SimulationPhase.ClientReprediction:
      return vec4.set(out, 0.8, 0.8, 0, 1)
    case SimulationPhase.ClientAuthoritative:
      return vec4.set(out, 0.2, 1, 0.2, 1)
  }
}

export type FrameState = {
  stateDb: StateDb
  messages: ClientMessage[]
  frameEvents: FrameEvent[]
  terrainLayer: terrain.Layer
  frame: number
  debugDraw: IDebugDrawWriter

  // Let's be SUPER judicious about when we actually use the phase property.
  // Ideally, we should only use it for diagnostics and debug, rather than for
  // actual business logic.
  phase: SimulationPhase
}

export function updateSystems(frameState: FrameState, dt: number): void {
  // Init transforms before any system can modify them.
  systems.transformInit(frameState)

  systems.hiding(frameState.stateDb)
  systems.builder(frameState, dt)
  systems.shooter(frameState)
  systems.turret(frameState, dt)
  systems.bullet(frameState, dt)
  systems.explosion(frameState)
  systems.damager(frameState)

  systems.tankMover(frameState, dt)
  systems.wallCollider(frameState)
  systems.playfieldClamping(frameState)

  systems.damageable(frameState)

  systems.emitter(frameState.stateDb, dt)

  frameState.stateDb.postFrameUpdate()
}
