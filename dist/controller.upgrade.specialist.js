'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const upgradeSpecialistController = new Controller('upgrade.specialist')

const takeId = 'energy.take'

upgradeSpecialistController.actRange = 3

upgradeSpecialistController.takeTargets = function (room) {
  const take = bootstrap.roomControllers[takeId]

  if (take === undefined) {
    console.log('Missing take')
    return []
  }

  return take._findTargets(room)
}

upgradeSpecialistController.take = function (target, creep) {
  const take = bootstrap.roomControllers[takeId]

  if (take === undefined) {
    return bootstrap.ERR_INVALID_INTENT_NAME
  }

  return take.act(target, creep)
}

upgradeSpecialistController.act = function (controller, creep) {
  const upgradeRc = this.wrapIntent(creep, 'upgradeController', controller)

  // if all is OK then return OK
  if (upgradeRc === OK) {
    return upgradeRc
  }

  // if this will be a last upgrade on this load, search where to take energy
  if (upgradeRc === bootstrap.WARN_BOTH_EXHAUSED ||
    upgradeRc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
    upgradeRc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
    const takeTargets = this.takeTargets(creep.room)

    for (const takeTarget of takeTargets) {
      if (creep.pos.isNearTo(takeTarget)) {
        const takeRc = this.take(takeTarget, creep)

        // on error, such as intended exhausted, check other target
        if (takeRc < 0) continue

        // take was OK or warning

        // upgrade is infinite, stay in place
        return OK
      }
    }
  }

  // whatever error transpired, continue
  return upgradeRc
}

upgradeSpecialistController.targets = function (room) {
  // don't upgrade controller in room with active fight
  if (room.__fight) {
    return []
  }

  if (room.controller.upgradeBlocked) {
    return []
  }

  return [room.controller]
}

upgradeSpecialistController.filterCreep = function (creep) {
  return this._isUpgrader(creep) && this._isWorkAble(creep)
}

upgradeSpecialistController.register()

module.exports = upgradeSpecialistController
