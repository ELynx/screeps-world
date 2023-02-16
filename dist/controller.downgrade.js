'use strict'

const Controller = require('./controller.template')

const downgradeController = new Controller('downgrade')

// STRATEGY safe mode could not be activated below 50% - 5000, don't allow that drop
const Tresholds =
{
  1: (CONTROLLER_DOWNGRADE[1] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  2: (CONTROLLER_DOWNGRADE[2] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  3: (CONTROLLER_DOWNGRADE[3] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  4: (CONTROLLER_DOWNGRADE[4] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  5: (CONTROLLER_DOWNGRADE[5] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  6: (CONTROLLER_DOWNGRADE[6] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  7: (CONTROLLER_DOWNGRADE[7] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2,
  8: (CONTROLLER_DOWNGRADE[8] - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) / 2
}

// STRATEGY give it 5000 histeresis
const Targets =
{
  1: CONTROLLER_DOWNGRADE[1] / 2,
  2: CONTROLLER_DOWNGRADE[2] / 2,
  3: CONTROLLER_DOWNGRADE[3] / 2,
  4: CONTROLLER_DOWNGRADE[4] / 2,
  5: CONTROLLER_DOWNGRADE[5] / 2,
  6: CONTROLLER_DOWNGRADE[6] / 2,
  7: CONTROLLER_DOWNGRADE[7] / 2,
  8: CONTROLLER_DOWNGRADE[8] / 2
}

downgradeController.actRange = 3

downgradeController.extra = function (controller) {
  return controller.__targetTicks
}

downgradeController.roomPrepare = function (room) {
  this._prepareExcludedTargets(room)
}

downgradeController.observeMyCreep = function (creep) {
  // actually only single creep / WORK ups the timer
  this._excludeTarget(creep)
}

downgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller, creep.memory.xtra)
}

downgradeController.targets = function (room) {
  if (!room.controller.upgradeBlocked) {
    const level = room.controller.level
    if (room.controller.ticksToDowngrade < Tresholds[level]) {
      room.controller.__targetTicks = Targets[level]
      return [room.controller]
    }
  }

  return []
}

downgradeController.register()

module.exports = downgradeController
