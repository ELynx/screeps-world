'use strict'

const Controller = require('controller.template')

const energyRestockControllerSpecialist = new Controller('energy.restock.specialist')

energyRestockControllerSpecialist.actRange = 1

energyRestockControllerSpecialist.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyRestockControllerSpecialist.targets = function (room) {
  return room.find(FIND_STRUCTURES,
    {
      filter: function(structure) {
        if (structure.structureType == STRUCTURE_LINK || structure.structureType == STRUCTURE_CONTAINER) {
          if (structure.isActiveSimple() && structure.isSource()) {
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          }
        }

        return false
      }
    }
  )
}

energyRestockControllerSpecialist.filterCreep = function (creep) {
  return creep.memory.rstk === true && this._isWorkAble(creep)
}

energyRestockControllerSpecialist.register()

module.exports = energyRestockControllerSpecialist
