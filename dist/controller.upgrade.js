'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const upgradeController = new Controller('upgrade.generic')

upgradeController.actRange = 3

upgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeController._roomQualified = function (room) {
  // don't upgrade controller in room with active fight
  if (room._fight_) {
    return false
  }

  if (room.controller.upgradeBlocked) {
    return false
  }

  return true
}

upgradeController.targets = function (room) {
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
const upgradeControllerSpecialist = _.assign({ }, upgradeController)

upgradeControllerSpecialist.id = 'upgrade.specialist'

upgradeControllerSpecialist.validateTarget = undefined // TODO actually bypass range check only, not all checks

upgradeControllerSpecialist.targets = function (room) {
  if (!this._roomQualified(room)) {
    return []
  }

  return [room.controller]
}

upgradeControllerSpecialist.filterCreep = function (creep) {
  return this._defaultFilter(creep) && this._isUpgrader(creep)
}

upgradeController.register()
upgradeControllerSpecialist.register()

module.exports =
{
  generic: upgradeController,
  specialist: upgradeControllerSpecialist
}
