'use strict'

const intentSolver = require('./routine.intent')
const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const mineralRestockController = new Controller('mineral.restock')

mineralRestockController.actRange = 1

mineralRestockController.act = function (structure, creep) {
  for (const resourceType in creep.store) {
    const wantTake = structure.demand[resourceType] || 0
    if (wantTake <= 0) continue

    const canGive = intentSolver.getUsedCapacity(creep, resourceType)
    if (canGive <= 0) continue

    const howMuch = (canGive > wantTake) ? (canGive - wantTake) : undefined

    const rc = this.wrapIntent(creep, 'transfer', structure, resourceType, howMuch)
    if (rc !== OK) {
      return rc
    }
  }

  // if here then all transfers were OK
  // thus do not keep at target
  return bootstrap.WARN_INTENDEE_EXHAUSTED
}

mineralRestockController._checkStore = function (structure, freeCapacity = 0) {
  if (structure && structure.isActiveSimple) {
    return intentSolver.getFreeCapacity(structure) > freeCapacity
  }

  return false
}

// STRATEGY mineral fill order
mineralRestockController.targets = function (room) {
  if (this._checkStore(room.terminal, 1000)) {
    return [room.terminal]
  }

  if (this._checkStore(room.storage)) {
    return [room.storage]
  }

  return []
}

mineralRestockController.filterCreep = function (creep) {
  // STRATEGY can move, has non-energy resouces
  return this._hasCM(creep) && !this._isEmpty(creep) && !this._hasEnergy(creep)
}

// before profiler wrap
const mineralDumpController = _.assign({}, mineralRestockController)

mineralDumpController.id = 'mineral.dump'

mineralDumpController.targets = function (room) {
  if (this._checkStore(room.storage)) {
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
