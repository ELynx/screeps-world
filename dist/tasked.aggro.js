'use strict'

const Tasked = require('./tasked.template')

const aggro = new Tasked('aggro')

aggro.act = function () {
  const flags = Game.flagsByShortcut[this.id] || []
  for (const flag of flags) {
    const room = flag.room

    if (room) {
      const atPos = flag.pos.lookFor(LOOK_STRUCTURES)

      const atPosTargets = _.filter(
        atPos,
        function (structure) {
          return structure.hits && structure.structureType !== STRUCTURE_ROAD
        }
      )

      room.addAggro(atPosTargets)
    }
  }
}

aggro.register()

module.exports = aggro
