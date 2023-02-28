'use strict'

const Controller = require('./controller.template')

const energyRestockController = new Controller('energy.restock')

// STRATEGY parameters for restocking
const TowerRestockNormal = 0.9
const TowerRestockCritical = 0.25

energyRestockController.actRange = 1

energyRestockController.ally = true
energyRestockController.neutral = true

energyRestockController.roomPrepare = function (room) {
  this._roomPrepare(room)
  this._prepareExcludedTargets(room)
}

energyRestockController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
}

energyRestockController.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyRestockController.targets = function (room) {
  const allStructures = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.store && structure.isActiveSimple
      }
    }
  )
  if (allStructures.length === 0) return []

  const critical = _.filter(
    allStructures,
    function (structure) {
      if (structure.structureType === STRUCTURE_TOWER) {
        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TowerRestockCritical * structure.store.getCapacity(RESOURCE_ENERGY)
      }

      return false
    }
  )
  if (critical.length > 0) return critical

  const normal = _.filter(
    allStructures,
    function (structure) {
      if (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) {
        return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      } else if (structure.structureType === STRUCTURE_TOWER) {
        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TowerRestockNormal * structure.store.getCapacity(RESOURCE_ENERGY)
      }

      return false
    }
  )
  if (normal.length > 0) return normal

  // low
  return _.filter(
    allStructures,
    function (structure) {
      if (structure.structureType === STRUCTURE_TERMINAL) {
        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < (room.memory.trme || 0)
      } else if (structure.structureType === STRUCTURE_STORAGE) {
        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < (room.memory.stre || 0)
      }

      return false
    }
  )
}

energyRestockController.filterCreep = function (creep) {
  return this._hasCM(creep) && this._hasEnergy(creep)
}

energyRestockController.register()

module.exports = energyRestockController
