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

  const targets = this.unloadTargets(source)

  // nothing to work with, quit the loop and build it
  if (targets.length === 0) return bootstrap.WARN_INTENDED_EXHAUSTED
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // maximum one per source
  const others = this._allAssignedTo(target)
  return others.length === 0
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
