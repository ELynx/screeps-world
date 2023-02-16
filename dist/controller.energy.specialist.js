'use strict'

const Controller = require('./controller.template')

const energyHarvestController = new Controller('energy.harvest')

energyHarvestController.actRange = 1

energyHarvestController.unowned = true

energyHarvestController.ignoreCreepsForTargeting = false

energyHarvestController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

energyHarvestController.validateTarget = function (allTargets, target, creep) {
  // if there is only one choice, pick it
  if (allTargets.length === 1) {
    return true
  }

  // if there is no one in the room, no collision
  if (target.room === undefined) {
    return true
  }

  // non-restockers do not care and just go for energy
  if (creep.memory.rstk === undefined) {
    return true
  }

  let otherRestockersWork = 0

  const others = this._allAssignedTo(target)
  for (let i = 0; i < others.length; ++i) {
    const other = others[i]
    if (other.memory.rstk) {
      otherRestockersWork += _.countBy(other.body, 'type')[WORK] || 0
    }
  }

  // no collision
  if (otherRestockersWork === 0) {
    return true
  }

  const workNeeded = target.room.sourceEnergyCapacity() / ENERGY_REGEN_TIME / HARVEST_POWER

  return workNeeded > otherRestockersWork
}

energyHarvestController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energyHarvestController.filterCreep = function (creep) {
  return this._isHarvestAble(creep)
}

energyHarvestController.register()

module.exports = energyHarvestController

'use strict'

const Controller = require('./controller.template')

const energyRestockControllerSpecialist = new Controller('energy.restock.specialist')

energyRestockControllerSpecialist.actRange = 1

energyRestockControllerSpecialist.unowned = true

energyRestockControllerSpecialist.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyRestockControllerSpecialist.targets = function (room) {
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

energyRestockControllerSpecialist.filterCreep = function (creep) {
  return creep.memory.rstk === true && this._isWorkAble(creep)
}

energyRestockControllerSpecialist.register()

module.exports = energyRestockControllerSpecialist
