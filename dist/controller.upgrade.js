'use strict'

const Controller = require('./controller.template')

const upgradeGenericController = new Controller('upgrade.generic')

upgradeGenericController.actRange = 3

upgradeGenericController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeGenericController._roomQualified = function (room) {
  // don't upgrade controller in room with active fight
  if (room._fight_) {
    return false
  }

  if (room.controller.upgradeBlocked) {
    return false
  }

  return true
}

upgradeGenericController.targets = function (room) {
  if (!this._roomQualified(room)) {
    return []
  }

  // leave 8 and above :) to specialists
  if (room.controller.level >= 8) {
    return []
  }

  return [room.controller]
}

// before profiler wrap
const upgradeSpecialistController = _.assign({ }, upgradeGenericController)

upgradeSpecialistController.id = 'upgrade.specialist'

upgradeSpecialistController.validateTarget = undefined // TODO actually bypass range check only, not all checks

upgradeSpecialistController.targets = function (room) {
  if (!this._roomQualified(room)) {
    return []
  }

  return [room.controller]
}

upgradeSpecialistController.filterCreep = function (creep) {
  return this._defaultFilter(creep) && this._isUpgrader(creep)
}

upgradeGenericController.register()
upgradeSpecialistController.register()

module.exports =
{
  generic: upgradeGenericController,
  specialist: upgradeSpecialistController
}
