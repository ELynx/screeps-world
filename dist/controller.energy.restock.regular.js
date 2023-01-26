/*eslint curly: "error"*/
'use strict'

const Controller = require('controller.template')

const energyRestockControllerRegular = new Controller('energy.restock.regular')

// STRATEGY parameters for restocking
const TowerRestockNormal = 0.9
const TowerRestockCritical = 0.25

energyRestockControllerRegular.actRange = 1

energyRestockControllerRegular.allied = true

energyRestockControllerRegular.roomPrepare = function (room) {
  this._prepareExcludedTargets(room)
}

energyRestockControllerRegular.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
}

energyRestockControllerRegular.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyRestockControllerRegular.targets = function (room) {
  const allStructures = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.store && structure.isActiveSimple()
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
      if (structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_EXTENSION) {
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

energyRestockControllerRegular.register()

module.exports = energyRestockControllerRegular
