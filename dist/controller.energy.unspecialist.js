'use strict'

const Controller = require('./controller.template')

const energyUnspecialistController = new Controller('energy.unspecialist')

energyUnspecialistController.actRange = 1

energyUnspecialistController.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyUnspecialistController.targets = function (room) {
  return room.find(FIND_STRUCTURES,
    {
      filter: function (structure) {
        if (structure.structureType === STRUCTURE_LINK || structure.structureType === STRUCTURE_CONTAINER) {
          if (structure.isSource() && structure.isActiveSimple) {
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          }
        }

        return false
      }
    }
  )
}

energyUnspecialistController.filterCreep = function (creep) {
  return this._isRestocker(creep) && this._hasCM(creep) && this._hasEnergy(creep)
}

energyUnspecialistController.register()

module.exports = energyUnspecialistController
