'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const sourceHarvestGenericController = new Controller('source.harvest.generic')

sourceHarvestGenericController.actRange = 1

sourceHarvestGenericController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

sourceHarvestGenericController.validateTarget = function (allTargets, target, creep) {
  // check that target is not someone else's sticky
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

sourceHarvestGenericController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

sourceHarvestGenericController.filterCreep = function (creep) {
  return this._isNotHarvester(creep) && this._isNotUpgrader(creep) && this._isHarvestAble(creep)
}

sourceHarvestGenericController.register()

module.exports = sourceHarvestGenericController
