'use strict'

const intentSolver = require('./routine.intent')

const Tasked = require('./tasked.template')

const economist = new Tasked('economist')

economist.act = function () {
  if (globals.economist === undefined) {
    globals.economist = { }
  }

  const ringIndex = Game.time % ENERGY_REGEN_TIME

  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]

    if (room.my) {
      const intents = intentSolver.getRoomIntents(room)

      const energySpent = intents.__spent_total || 0
      const energyAcquired = intents.__acquired_total || 0
    }
  }
}

economist.register()

module.exports = economist
