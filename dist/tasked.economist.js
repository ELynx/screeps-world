'use strict'

const intentSolver = require('./routine.intent')

const Tasked = require('./tasked.template')

const economist = new Tasked('economist')

economist.act = function () {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]

    if (room.my) {
      const intents = intentSolver.getRoomIntents(room)

      const energySpent = intents.__spent_total || 0
      const energyAcquired = intents.__acquired_total || 0

      room.memory.elvl = (room.memory.elvl || 0) + energyAcquired - energySpent
    } else {
      // don't balance energy of not directly controlled rooms
      room.memory.elvl = 0
    }
  }
}

economist.register()

module.exports = economist
