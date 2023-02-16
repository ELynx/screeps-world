'use strict'

const Controller = require('./controller.template')

const energyUnspecialistController = new Controller('energy.unspecialist')

energyUnspecialistController.actRange = 1

energyUnspecialistController.unowned = true

energyUnspecialistController.ignoreCreepsForTargeting = false

energyUnspecialistController.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyUnspecialistController.targets = function (room) {
  return room.find(FIND_STRUCTURES,
    {
      filter: function (structure) {
        if (structure.structureType === STRUCTURE_LINK || structure.structureType === STRUCTURE_CONTAINER) {
          if (structure.isActiveSimple() && structure.isSource()) {
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          }
        }

        return false
      }
    }
  )
}

energyUnspecialistController.filterCreep = function (creep) {
  return creep.memory.rstk === true && this._hasCM(creep) && this._hasEnergy(creep)
}

energyUnspecialistController.register()

module.exports = energyUnspecialistController
