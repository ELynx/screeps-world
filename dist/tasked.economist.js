'use strict'

const intentSolver = require('./routine.intent')

const Tasked = require('./tasked.template')

const economist = new Tasked('economist')

economist.act = function () {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]

    const intents = intentSolver.getRoomIntents(room)

    const energySpent = intents['__spent_total'] || 0
    const energyAcquired = intents['__acquired_total'] || 0

    console.log(roomName + ' spent ' + energySpent + ' and acquired ' + energyAcquired)
  }
}

economist.register()

module.exports = economist
