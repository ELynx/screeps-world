'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const energyHarvestGenericController = new Controller('energy.harvest.generic')

energyHarvestGenericController.actRange = 1

energyHarvestGenericController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

energyHarvestGenericController.validateTarget = function (allTargets, target, creep) {
  // check that target is not someone else's sticky
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

energyHarvestGenericController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

energyHarvestGenericController.filterCreep = function (creep) {
  return this._isNotHarvester(creep) && this._isNotUpgrader(creep) && this._isHarvestAble(creep)
}

energyHarvestGenericController.register()

module.exports = energyHarvestGenericController
