'use strict'

const Controller = require('./controller.template')

const upgradeController = new Controller('upgrade')

upgradeController.actRange = 3

upgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeController.targets = function (room) {
  // don't upgrade controller in room with active fight
  if (room.__fight) {
    return []
  }

  return [room.controller]
}

upgradeController.register()

module.exports = upgradeController
