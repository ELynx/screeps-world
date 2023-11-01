'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const upgradeController = new Controller('upgrade')

upgradeController.actRange = 3

upgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeController.validateTarget = function (allTargets, target, creep) {
  // plug the default check as well
  if (this._validateRestocker(target, creep) === false) return false

  // no limit below level 8
  if (target.level < 8) {
    return true
  }

  let othersWork = 0
  const others = this._allAssignedTo(target)
  for (const other of others) {
    bootstrap.activeBodyParts(other)
    othersWork += other._work_
  }

  return othersWork < CONTROLLER_MAX_UPGRADE_PER_TICK
}

upgradeController.targets = function (room) {
  // don't upgrade controller in room with active fight
  if (room._fight_) {
    return []
  }

  if (room.controller.upgradeBlocked) {
    return []
  }

  return [room.controller]
}

upgradeController.register()

module.exports = upgradeController
