/*eslint curly: "error"*/
'use strict'

const Controller = require('controller.template')

const redAlert = new Controller('redalert')

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

redAlert.actRange = 3

redAlert.extra = function (controller) {
  return controller._targetTicks_
}

redAlert.roomPrepare = function (room) {
  this._prepareExcludedTargets(room)
}

redAlert.observeMyCreep = function (creep) {
  // actually only single creep / WORK ups the timer
  this._excludeTarget(creep)
}

redAlert.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller, creep.memory.xtra)
}

redAlert.targets = function (room) {
  if (!room.controller.upgradeBlocked) {
    const level = room.controller.level
    if (room.controller.ticksToDowngrade < Tresholds[level]) {
      room.controller._targetTicks_ = Targets[level]
      return [room.controller]
    }
  }

  return []
}

redAlert.register()

module.exports = redAlert
