'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const energyRestockController = new Controller('energy.restock')

energyRestockController.actRange = 1

energyRestockController.roomPrepare = function (room) {
  this._roomPrepare(room)
  this._prepareExcludedTargets(room)
}

energyRestockController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
}

energyRestockController.act = function (target, creep) {
  const wantTake = target.demand.amount(RESOURCE_ENERGY)
  const canGive = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY)

  const howMuch = Math.min(wantTake, canGive)

  if (howMuch <= 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY, howMuch)
}

energyRestockController.targets = function (room) {
  const allStructures = room.find(FIND_STRUCTURES)
  const withEnergyDemand = _.filter(
    allStructures,
    function (structure) {
      return structure.demand.priority !== null && structure.demand.amount(RESOURCE_ENERGY) > 0 && structure.isActiveSimple
    }
  )

  if (withEnergyDemand.length === 0) return []

  withEnergyDemand.sort(
    function (t1, t2) {
      const priority1 = t1.demand.priority
      const priority2 = t2.demand.priority

      return priority1 - priority2
    }
  )

  const priority = withEnergyDemand[0].demand.priority

  return _.takeWhile(withEnergyDemand, _.matchesProperty('demand.priority', priority))
}

energyRestockController.filterCreep = function (creep) {
  return this._hasCM(creep) && this._hasEnergy(creep)
}

energyRestockController.register()

module.exports = energyRestockController
