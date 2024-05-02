'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const energyHarvestController = new Controller('energy.harvest')

energyHarvestController.actRange = 1

energyHarvestController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

energyHarvestController.validateTarget = function (allTargets, target, creep) {
  // for room hot start
  if (target.room.spawns && target.room.spawns.size === 0) return true

  // check that target is not someone else's sticky
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

energyHarvestController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

energyHarvestController.filterCreep = function (creep) {
  return this._isNotRestocker(creep) && this._isNotUpgrader(creep) && this._isHarvestAble(creep)
}

energyHarvestController.register()

module.exports = energyHarvestController
