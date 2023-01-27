'use strict'

const globals = require('globals')
const Controller = require('controller.template')

const rampupController = new Controller('rampup')

rampupController.actRange = 3

rampupController.allied = true

rampupController.act = function (currentController, creep) {
  const hasUniversalStore = creep.room.storage || creep.room.terminal

  const [t, l, b, r] = creep.pos.squareArea(actRange)
  const allStructures = creep.room.lookForAtArea(LOOK_STRUCTURES, t, l, b, r, true)
  const rampsToBoost = _.filter(
    allStructures,
    function (structure) {
      // STRATEGY boost ramps that are just built
      return structure.structureType === STRUCTURE_RAMPART && structure.hits === 1
    }
  )

  for (let i = 0; i < rampsToBoost.length; ++i) {
    const rc = this.wrapIntent(creep, 'repair', rampsToBoost[i])
    if (rc !== globals.WARN_INTENDED_EXHAUSTED && rc !== globals.ERR_INTENDED_EXHAUSTED) {
      return rc
    }
  }

  return OK
}

rampupController.filterCreep = function (creep) {
  return this._hasEnergy(creep) && creep.getActiveBodyparts(WORK) > 0
}

// NOT registered, called from room actor explicitly

module.exports = rampupController
