'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.unloadTargets = function (source) {
  return []
}

energySpecialistController.act = function (source, creep) {
  // start by harvesting; if that is OK, keep harvesting
  const harvestRc = this.wrapIntent(creep, 'harvest', source)
  if (harvestRc === OK) return OK

  // cover all cases where something was exhausted
  if (harvestRc === bootstrap.WARN_BOTH_EXHAUSED ||
      harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED ||
      harvestRc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
      harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED ||
      harvestRc === bootstrap.ERR_INTENDED_EXHAUSTED) {
    // TODO
  }

  // some other NOK state, report outside to release from controller
  // also, this is a fall-through when there is no targets found and build has to be performed
  return harvestRc
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // if there is no one in the room, no collision
  if (target.room === undefined) {
    return true
  }

  // maximum one per source
  // eslint-disable-next-line no-unreachable-loop
  const others = this._allAssignedTo(target)
  for (const other of others) {
    return false
  }

  return true
}

energySpecialistController.targets = function (room) {
  // just stick'em to the source
  return room.find(FIND_SOURCES)
}

energySpecialistController.filterCreep = function (creep) {
  // does not matter if full or empty, can work => go to loop
  return this._isRestocker(creep) && this._hasWCM(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
