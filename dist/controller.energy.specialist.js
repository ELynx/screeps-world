'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.act = function (source, creep) {
  return -1
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
