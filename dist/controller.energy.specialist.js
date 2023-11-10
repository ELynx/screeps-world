'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.roomPrepare = function (room) {
  this._roomPrepare(room)
  this._prepareExcludedTargets(room)
}

energySpecialistController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
  // stick creep to source
  creep.memory._est = creep.memory.dest
}

energySpecialistController.unloadTargets = function (source) {
  const allStructures = source.room.find(FIND_STRUCTURES)

  const aroundSource = _.filter(
    allStructures,
    function (structure) {
      // force maintenance
      // if (structure.hits && structure.hitsMax && structure.hits < structure.hitsMax) return false

      let distance = 1 // default for container
      if (structure.structureType === STRUCTURE_LINK) distance = 2
      if (Math.abs(structure.pos.x - source.pos.x) > distance) return false
      if (Math.abs(structure.pos.y - source.pos.y) > distance) return false
      return true
    }
  )

  const withEnergyDemand = _.filter(
    aroundSource,
    function (structure) {
      if (structure.demand_restocker !== undefined) {
        return structure.demand_restocker.priority !== null && structure.demand_restocker.amount(RESOURCE_ENERGY) > 0 && structure.isActiveSimple
      }

      return false
    }
  )

  withEnergyDemand.sort(
    function (t1, t2) {
      const priority1 = t1.demand_restocker.priority
      const priority2 = t2.demand_restocker.priority

      return priority1 - priority2
    }
  )

  return withEnergyDemand
}

energySpecialistController.act = function (source, creep) {
  // start by harvesting; if that is OK, keep harvesting
  const harvestRc = this.wrapIntent(creep, 'harvest', source)
  if (harvestRc === OK) return OK

  const targets = this.unloadTargets(source)

  // nothing to unload to, do other controllers
  // can happen if all destinations are full
  if (targets.length === 0) return bootstrap.WARN_INTENDED_EXHAUSTED

  // step on the container, in case not there
  for (const target of targets) {
    if (target.structureType === STRUCTURE_CONTAINER) {
      if (creep.pos.x !== target.pos.x || creep.pos.y !== target.pos.y) {
        const direction = creep.pos.getDirectionTo(target)
        creep.moveWrapper(direction)
        break
      }
    }
  }

  // transfer to target
  for (const target of targets) {
    if (creep.pos.isNearTo(target.pos)) {
      const transferRc = this.wrapIntent(creep, 'transfer', target, RESOURCE_ENERGY)
      if (transferRc >= OK) {
        break
      }
    }
  }

  // cover conditions when creep stays under controller
  if (harvestRc === bootstrap.WARN_INTENDEE_EXHAUSTED) return OK
  if (harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED) return OK

  return harvestRc
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // if already sticky
  if (creep.memory._est !== undefined) {
    return target.id === creep.memory._est
  }

  // if not, check that target is not someone else's sticky
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

energySpecialistController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

energySpecialistController.filterCreep = function (creep) {
  // does not matter if full or empty, can work => go to loop
  return this._isRestocker(creep) && this._hasWCM(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
