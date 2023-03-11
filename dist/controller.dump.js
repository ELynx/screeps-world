'use strict'

const mineralRestockController = require('controller.mineral.restock')

const dumpController = _.assign({}, mineralRestockController)
dumpController.id = 'dump'

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
