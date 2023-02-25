'use strict'

const Tasked = require('./tasked.template')

const aggro = new Tasked('aggro')

aggro.act = function () {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]
    room.__aggro = []
    room.__breached = undefined
  }

  const flags = Game.flagsByShortcut[this.id] || []
  for (const index in flags) {
    const flag = flags[index]
    const room = flag.room

    if (room) {
      const atPos = flag.pos.lookFor(LOOK_STRUCTURES)

      const aggros = _.filter(
        atPos,
        function (structure) {
          return structure.hits && structure.structureType !== STRUCTURE_ROAD
        }
      )

      room.__aggro = room.__aggro.concat(aggros)

      room.__breached = room.__aggro.length === 0
    }
  }
}

aggro.register()

module.exports = aggro
