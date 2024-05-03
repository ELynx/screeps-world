'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const sourceHarvestSpecialistController = new Controller('source.harvest.specialist')

sourceHarvestSpecialistController.actRange = 1

sourceHarvestSpecialistController.roomPrepare = function (room) {
  this._roomPrepare(room)
  this._prepareExcludedTargets(room)
}

sourceHarvestSpecialistController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
  // stick creep to source
  creep.memory._est = creep.memory.dest
}

sourceHarvestSpecialistController.unloadTargets = function (source) {
  const Distance = 2

  const allStructures = source.room.withDemand(RESOURCE_ENERGY)

  const aroundSource = _.filter(
    allStructures,
    structure => {
      if (Math.abs(structure.pos.x - source.pos.x) > Distance) return false
      if (Math.abs(structure.pos.y - source.pos.y) > Distance) return false
      return true
    }
  )

  aroundSource.sort(
    (t1, t2) => {
      const priority1 = t1.demand.priority
      const priority2 = t2.demand.priority

      return priority1 - priority2
    }
  )

  return aroundSource
}

sourceHarvestSpecialistController.act = function (source, creep) {
  // start by harvesting; if that is OK, keep harvesting
  const harvestRc = this.wrapIntent(creep, 'harvest', source)
  if (harvestRc === OK) return OK

  // in remote room, stash some energy for repair
  if (source.room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
    const inSource = intentSolver.getEnergy(source)
    const inCreep = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY)
    // STRATEGY energy not transferred to targets in remote rooms
    if (inSource + inCreep <= 200) {
      return bootstrap.WARN_INTENDEE_EXHAUSTED
    }
  }

  const targets = this.unloadTargets(source)

  // nothing to unload to, do other controllers
  // can happen if all destinations are full
  if (targets.length === 0) return bootstrap.WARN_INTENDED_EXHAUSTED

  // step on the container, in case not there
  let onContainer = false
  for (const target of targets) {
    if (target.structureType === STRUCTURE_CONTAINER) {
      if (creep.pos.x === target.pos.x && creep.pos.y === target.pos.y) {
        onContainer = true
        break
      }
    }
  }

  if (!onContainer) {
    for (const target of targets) {
      if (target.structureType === STRUCTURE_CONTAINER) {
        if ((creep.pos.x !== target.pos.x || creep.pos.y !== target.pos.y) && source.pos.isNearTo(target.pos)) {
          const direction = creep.pos.getDirectionTo(target)
          creep.moveWrapper(direction, { jiggle: true })
          break
        }
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

sourceHarvestSpecialistController.validateTarget = function (allTargets, target, creep) {
  // if already sticky
  if (creep.memory._est !== undefined) {
    return target.id === creep.memory._est
  }

  // if not, check that target is not someone else's sticky
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

sourceHarvestSpecialistController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

sourceHarvestSpecialistController.filterCreep = function (creep) {
  // does not matter if full or empty, can work => go to loop
  return this._isHarvester(creep) && this._hasWCM(creep)
}

sourceHarvestSpecialistController.register()

module.exports = sourceHarvestSpecialistController
