'use strict'

const Controller = require('./controller.template')

const upgradeGenericController = new Controller('upgrade.generic')

upgradeGenericController.actRange = 3

upgradeGenericController._act = function (controller, creep) {
  return this.wrapIntent(creep, 'upgradeController', controller)
}

upgradeGenericController._check = function (room) {
  // don't upgrade while there is a fight
  if (Game._war_ || Game._fight_ || room._fight_) {
    return []
  }

  if (room.controller.upgradeBlocked) {
    return false
  }

  return true
}

upgradeGenericController.act = function (controller, creep) {
  return this._act(controller, creep)
}

upgradeGenericController.targets = function (room) {
  if (!this._check(room)) {
    return []
  }

  if (room.controller.level >= 8) {
    return []
  }

  return [room.controller]
}

// before profiler wrap
const upgradeSpecialistController = _.assign({ }, upgradeGenericController)

upgradeSpecialistController.id = 'upgrade.specialist'

upgradeSpecialistController.act = function (controller, creep) {
  // mark as arrived if standing near the link
  // otherwise may not reach link later for withdraw
  if (!creep.memory.atds) {
    for (const link of controller.room.links.values()) {
      if (link.isSource()) continue
      if (creep.pos.isNearTo(link)) {
        creep.memory.atds = true
        break // from links loop
      }
    }
  }

  return this._act(controller, creep)
}

upgradeSpecialistController.targets = function (room) {
  if (!this._check(room)) {
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
