'use strict'

const Controller = require('./controller.template')

const upgradeController = new Controller('upgrade')

upgradeController.actRange = 3

upgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeController.validateTarget = function (allTargets, target, creep) {
  // no limit below level 8
  if (target.level < 8) {
    return true
  }

  let othersWork = 0

  const others = this._allAssignedTo(target)
  for (const other of others) {
    othersWork += _.countBy(other.body, 'type')[WORK] || 0
  }

  return othersWork < CONTROLLER_MAX_UPGRADE_PER_TICK
}

upgradeController.targets = function (room) {
  // don't upgrade controller in room with active fight
  if (room.__fight) {
    return []
  }

  if (room.controller.upgradeBlocked) {
    return []
  }

  return [room.controller]
}

upgradeController.register()

module.exports = upgradeController
