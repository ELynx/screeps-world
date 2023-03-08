'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

// TODO un-copy-paste
const dumpController = new Controller('dump')

dumpController.actRange = 1

dumpController.act = function (withStore, creep) {
  for (const resourceType in creep.store) {
    const rc = this.wrapIntent(creep, 'transfer', withStore, resourceType)
    if (rc !== OK) {
      return rc
    }
  }

  // if here then all transfers were OK
  // thus do not keep at target
  return bootstrap.WARN_INTENDEE_EXHAUSTED
}

dumpController._checkStore = function (structure) {
  if (structure && structure.isActiveSimple) {
    return structure.store.getFreeCapacity() > 0
  }

  return false
}

dumpController.targets = function (room) {
  if (this._checkStore(room.storage)) {
    return [room.storage]
  }

  return []
}

dumpController.filterCreep = function (creep) {
  return creep.shortcut === 'plunder' && this._hasCM(creep) && !this._isEmpty(creep)
}

dumpController.register()

module.exports = dumpController
