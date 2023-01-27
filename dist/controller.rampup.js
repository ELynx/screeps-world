'use strict'

const globals = require('globals')
const Controller = require('controller.template')

const rampupController = new Controller('rampup')

rampupController.actRange = 3

rampupController.allied = true

rampupController.act = function (currentController, creep) {
  const [t, l, b, r] = creep.pos.squareArea(this.actRange)
  const allStructures = creep.room.lookForAtArea(LOOK_STRUCTURES, t, l, b, r, true)
  const rampsToBoost = _.filter(
    allStructures,
    function (item) {
      // STRATEGY boost ramps that are just built
      return item.structure.structureType === STRUCTURE_RAMPART && item.structure.hits < 301
    }
  )

  for (let i = 0; i < rampsToBoost.length; ++i) {
    const rc = this.wrapIntent(creep, 'repair', rampsToBoost[i], 301)
    if (rc !== OK) {
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
