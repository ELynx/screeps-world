'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.unowned = true

energySpecialistController.ignoreCreepsForTargeting = false

energyRestockControllerSpecialist.TODO = function (room) {
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

energySpecialistController.act = function (source, creep) {
  const harvestRc = this.wrapIntent(creep, 'harvest', source)

  // if all is OK then return OK
  if (harvestRc === OK) {
    return harvestRc
  }

  // if this will be a last dig for capacity, search for drop site nearby
  if (harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED ||
      harvestRc === bootstrap.WANR_BOTH_EXHAUSED ||
      harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
    // TODO find and act
  }

  // if this will be a last dig for source, see if wait is warranted
  if (harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED || harvestRc === bootstrap.ERR_INTENDED_EXHAUSTED) {
    // TODO anything?
  }

  // whatever error transpired, continue
  return harvestRc
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // if there is only one choice, pick it
  if (allTargets.length === 1) {
    return true
  }

  // if there is no one in the room, no collision
  if (target.room === undefined) {
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

energySpecialistController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energySpecialistController.filterCreep = function (creep) {
  return creep.memory.rstk === true && this._isHarvestAble(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
