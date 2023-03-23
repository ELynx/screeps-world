'use strict'

const Controller = require('./controller.template')

const energyUnspecialistController = new Controller('energy.unspecialist')

energyUnspecialistController.actRange = 1

energyUnspecialistController.act = function (target, creep) {
  return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
}

energyUnspecialistController.targets = function (room) {
  const allStructures = room.find(FIND_STRUCTURES)
  const restockTargets = _.filter(
    allStructures,
    function (structure) {
      if (structure.isActiveSimple) {
        if (structure.demand_restocker !== undefined) {
          return structure.demand_restocker.priority !== null && structure.demand_restocker[RESOURCE_ENERGY] > 0
        }
      }

      return false
    }
  )

  restockTargets.sort(
    function (t1, t2) {
      const priority1 = t1.demand_restocker.priority
      const priority2 = t2.demand_restocker.priority

      return priority1 - priority2
    }
  )

  return restockTargets
}

energyUnspecialistController.filterCreep = function (creep) {
  return this._isRestocker(creep) && this._hasCM(creep) && this._hasEnergy(creep)
}

energyUnspecialistController.register()

module.exports = energyUnspecialistController
