'use strict'

const intentSolver = require('./routine.intent')
const bootstrap = require('./bootstrap')

const cookActor = require('./actor.cook')

const Controller = require('./controller.template')

const resourceRestockController = new Controller('resource.restock')

resourceRestockController.actRange = 1

resourceRestockController.act = function (structure, creep) {
  for (const resourceType in creep.store) {
    const wantTake = structure.demand.amount(resourceType)
    if (wantTake <= 0) continue

    const canGive = intentSolver.getUsedCapacity(creep, resourceType)
    if (canGive <= 0) continue

    const howMuch = (canGive > wantTake) ? wantTake : undefined

    const rc = this.wrapIntent(creep, 'transfer', structure, resourceType, howMuch)
    if (rc >= OK) {
      // one transfer per tick
      // creep will be de-assigned, if more resources are there it will be found again
      return bootstrap.WARN_INTENDEE_EXHAUSTED
    }
  }

  // there is something wrong with resources
  return bootstrap.ERR_INTENDEE_EXHAUSTED
}

resourceRestockController.validateTarget = function (allTargets, target, creep) {
  return cookActor.validateRoomStructuresWithResouceDemand(allTargets, target, creep)
}

resourceRestockController.targets = function (room) {
  return cookActor.roomStructuresWithResouceDemand(room)
}

resourceRestockController.filterCreep = function (creep) {
  return this._hasCM(creep) && this._hasNonEnergy(creep)
}

resourceRestockController.register()

module.exports = resourceRestockController
