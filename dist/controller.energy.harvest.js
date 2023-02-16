'use strict'

const Controller = require('./controller.template')

const energyHarvestController = new Controller('energy.harvest')

energyHarvestController.actRange = 1

energyHarvestController.unowned = true

energyHarvestController.ignoreCreepsForTargeting = false

energyHarvestController.act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

energyHarvestController.validateTarget = function (allTargets, target, creep) {
  // if there is only one choice, pick it
  if (allTargets.length === 1) {
    return true
  }

  // if there is no one in the room, no collision
  if (target.room === undefined) {
    return true
  }

  // non-restockers do not care and just go for energy
  if (creep.memory.rstk === undefined) {
    return true
  }

  let otherRestockersWork = 0

  const others = this._allAssignedTo(target)
  for (let i = 0; i < others.length; ++i) {
    const other = others[i]
    if (other.memory.rstk) {
      otherRestockersWork += _.countBy(other.body, 'type')[WORK] || 0
    }
  }

  // no collision
  if (otherRestockersWork === 0) {
    return true
  }

  const workNeeded = target.room.sourceEnergyCapacity() / ENERGY_REGEN_TIME / HARVEST_POWER

  return workNeeded > otherRestockersWork
}

energyHarvestController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energyHarvestController.filterCreep = function (creep) {
  return this._isHarvestAble(creep)
}

energyHarvestController.register()

module.exports = energyHarvestController
