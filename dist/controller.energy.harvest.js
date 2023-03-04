'use strict'

const Controller = require('./controller.template')

const energyHarvestController = new Controller('energy.harvest')

energyHarvestController.actRange = 1

energyHarvestController.unowned = true
energyHarvestController.sourceKeeper = true

energyHarvestController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

energyHarvestController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energyHarvestController.filterCreep = function (creep) {
  return this._isNotRestocker(creep) && this._isHarvestAble(creep)
}

energyHarvestController.register()

module.exports = energyHarvestController
