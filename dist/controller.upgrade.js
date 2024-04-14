'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const upgradeController = new Controller('upgrade.generic')

upgradeController.actRange = 3

upgradeController.act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeController._validateUpgradeLimit = function (target) {
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

upgradeController.validateTarget = function (allTargets, target, creep) {
  if (!this._validateTarget(allTargets, target, creep)) return false

  return this._validateUpgradeLimit(target)
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

// before profiler wrap
const upgradeControllerSpecialist = _.assign({ }, upgradeController)

upgradeControllerSpecialist.id = 'upgrade.specialist'

upgradeController.validateTarget = undefined // just go for it, block all others as well

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
