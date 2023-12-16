'use strict'

const intentSolver = require('./routine.intent')
const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const mineralRestockController = new Controller('mineral.restock')

mineralRestockController.actRange = 1

mineralRestockController._wantFunction = function (structure, resourceType) {
  return structure.demand.amount(resourceType)
}

mineralRestockController.act = function (structure, creep) {
  for (const resourceType in creep.store) {
    const wantTake = this._wantFunction(structure, resourceType)
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

// STRATEGY mineral fill order
mineralRestockController.targets = function (room) {
  if (this._universalWantStoreNonEnergy(room.terminal)) {
    return [room.terminal]
  }

  if (this._universalWantStoreNonEnergy(room.storage)) {
    return [room.storage]
  }

  return []
}

mineralRestockController.filterCreep = function (creep) {
  // STRATEGY can move, has non-energy resouces
  return this._hasCM(creep) && !this._isEmpty(creep) && !this._hasEnergy(creep)
}

// before profiler wrap
const mineralDumpController = _.assign({ }, mineralRestockController)

mineralDumpController.id = 'mineral.dump'

mineralDumpController._wantFunction = function (structure, resourceType) {
  return intentSolver.getFreeCapacity(structure, resourceType)
}

mineralDumpController.targets = function (room) {
  if (this._universalWantStoreNonEnergy(room.storage)) {
    return [room.storage]
  }

  return []
}

mineralDumpController.filterCreep = function (creep) {
  return creep.shortcut === 'plunder' && this._hasCM(creep) && !this._isEmpty(creep)
}

mineralRestockController.register()
mineralDumpController.register()

module.exports =
{
  full: mineralRestockController,
  dump: mineralDumpController
}
