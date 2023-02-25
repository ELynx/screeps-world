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

      room.memory.spnt = (room.memory.spnt || 0) + energySpent
      room.memory.aqrd = (room.memory.aqrd || 0) + energyAcquired

      if (room.memory.aqrd >= INVADERS_ENERGY_GOAL) {
        room.memory.epct = Math.round(100 * room.memory.spnt / room.memory.aqrd)
        room.memory.spnt = 0
        room.memory.aqrd = 0
      }
    }
  }
}

economist.register()

module.exports = economist
