'use strict'

const globals = require('globals')
const Controller = require('controller.template')

const mineralRestockController = new Controller('mineral.restock')

mineralRestockController.actRange = 1

mineralRestockController.allied = true

mineralRestockController.act = function (withStore, creep) {
  for (const resourceType in creep.store) {
    const rc = this.wrapIntent(creep, 'transfer', withStore, resourceType)
    if (rc !== OK) {
      return rc
    }
  }

  // if here then all transfers were OK
  // thus do not keep at target
  return globals.WARN_INTENDEE_EXHAUSTED
}

mineralRestockController._checkStore = function (structure) {
  if (structure && structure.isActiveSimple()) {
    return structure.store.getFreeCapacity() > 0
  }

  return false
}

mineralRestockController.targets = function (room) {
  // STRATEGY what to fill first
  if (this._checkStore(room.terminal)) {
    return [room.terminal]
  }

  if (this._checkStore(room.storage)) {
    return [room.storage]
  }

  return []
}

mineralRestockController.filterCreep = function (creep) {
  // STRATEGY has non-energy resouces, can walk
  if (creep.getActiveBodyparts(CARRY) > 0 && creep.getActiveBodyparts(MOVE) > 0) {
    // don't bring energy
    return (!this._isEmpty(creep)) && (!this._hasEnergy(creep))
  }

  return false
}

mineralRestockController.register()

module.exports = mineralRestockController
