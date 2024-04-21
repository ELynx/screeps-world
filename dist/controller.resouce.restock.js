'use strict'

const intentSolver = require('./routine.intent')
const bootstrap = require('./bootstrap')

const cookActor = require('./actor.cook')

const Controller = require('./controller.template')

const resourceRestockController = new Controller('resource.restock')

resourceRestockController.actRange = 1

resourceRestockController.act = function (structure, creep) {
  for (const resourceType in creep.store) {
    // OK if energy, save some trips

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
  for (const resourceType in creep.store) {
    // do not go specifically for energy
    if (resourceType === RESOURCE_ENERGY) continue

    const wantTake = target.demand.amount(resourceType)
    if (wantTake <= 0) continue

    const canGive = intentSolver.getUsedCapacity(creep, resourceType)
    if (canGive <= 0) continue

    return true
  }

  return false
}

resourceRestockController.targets = function (room) {
  // TODO unmagic number, 1000+ is passive storage
  const PassiveDemand = 1000

  const allStructures = room.find(FIND_STRUCTURES)

  let withAnyResourceDemand = _.filter(
    allStructures,
    structure => {
      return structure.demand.priority !== null &&
             structure.demand.priority < PassiveDemand &&
             structure.demand.amount() > 0 &&
             structure.isActiveSimple
    }
  )

  if (withAnyResourceDemand.length === 0) {
    withAnyResourceDemand = _.filter(
      allStructures,
      structure => {
        return structure.demand.priority !== null &&
               structure.demand.priority >= PassiveDemand &&
               structure.demand.amount() > 0 &&
               structure.isActiveSimple
      }
    )
  }

  return withAnyResourceDemand
}

resourceRestockController.filterCreep = function (creep) {
  return this._hasCM(creep) && this._hasNonEnergy(creep)
}

resourceRestockController.register()

module.exports = resourceRestockController
