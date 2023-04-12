'use strict'

const Controller = require('./controller.template')

const rampupController = new Controller('rampup')

rampupController.actRange = 3

// STRATEGY ramp up newly built fortifications; for rampts - survive 3 x decay periods (300 ticks)
const RampupHits = 3 * RAMPART_DECAY_AMOUNT + 1

rampupController.roomPrepare = function () {
  this._roomPrepare()
  this._prepareExcludedTargets()
}

rampupController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
}

rampupController.act = function (target, creep) {
  return this.wrapIntent(creep, 'repair', target, RampupHits)
}

rampupController.targets = function (room) {
  return room.find(FIND_STRUCTURES,
    {
      filter: function (structure) {
        return (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) && structure.hits && structure.hits < RampupHits && structure.hits <= structure.hitsMax
      }
    }
  )
}

rampupController.filterCreep = function (creep) {
  return this._isNotRestocker(creep) && this._defaultFilter(creep)
}

rampupController.register()

module.exports = rampupController
