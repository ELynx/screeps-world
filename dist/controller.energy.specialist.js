'use strict'

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.unowned = true

energySpecialistController.ignoreCreepsForTargeting = false

energySpecialistController.act = function (target, creep) {
  if (target.store) {
    return this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
  } else {
    return this.wrapIntent(creep, 'harvest', target)
  }
}

energySpecialistController.fromValidateTarget = function (allTargets, target, creep) {
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

energySpecialistController.toValidateTarget = function (allTargets, target, creep) {
  return true
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  if (target.store) {
    return this.toValidateTarget(allTargets, target, creep)
  } else {
    return this.fromValidateTarget(allTargets, target, creep)
  }
}

energySpecialistController.fromTargets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energyRestockControllerSpecialist.toTargets = function (room) {
  return room.find(FIND_STRUCTURES,
    {
      filter: function (structure) {
        if (structure.structureType === STRUCTURE_LINK || structure.structureType === STRUCTURE_CONTAINER) {
          if (structure.isActiveSimple() && structure.isSource()) {
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          }
        }

        return false
      }
    }
  )
}

energySpecialistController.targets = function (room) {
  const from = this.fromTargets(room)
  const to = this.toTargets(room)

  return from.concat(to)
}

energySpecialistController.filterCreep = function (creep) {
  return creep.memory.rstk === true && (this._isHarvestAble(creep) || this._isWorkAble(creep))
}

energySpecialistController.register()

module.exports = energySpecialistController
