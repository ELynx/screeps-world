'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.unloadTargets = function (source) {
  const allStructures = source.room.find(FIND_STRUCTURES)

  const aroundSource = _.filter(
    allStructures,
    function (structure) {
      if (Math.abs(structure.pos.x - source.pos.x) > 2) return false
      if (Math.abs(structure.pos.y - source.pos.y) > 2) return false
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

  // nothing to unload to, go to "build" phase
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

  // when source is empty, maybe it is time for other controllers
  // keep energy for other controllers

  if (harvestRc === bootstrap.ERR_INTENDED_EXHAUSTED) return harvestRc
  if (source.ticksToRegeneration && source.ticksToRegeneration > 10) {
    if (harvestRc === bootstrap.WARN_BOTH_EXHAUSED ||
        harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED) {
      return harvestRc
    }
  }

  // transfer per tick
  this.wrapIntent(creep, 'transfer', targets[0], RESOURCE_ENERGY)

  // cover conditions when creep stays under controller
  if (harvestRc === bootstrap.WARN_BOTH_EXHAUSED) return OK
  if (harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED) return OK
  if (harvestRc === bootstrap.WARN_INTENDEE_EXHAUSTED) return OK
  if (harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED) return OK // stick and try to harvest even if full

  // report error conditions
  return harvestRc
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // ignore sources without energy, to keep creeps out of controller
  if (target.energy === 0) return false

  // TODO this logic does not handle edge cases
  // e.g. two sources regen at same tick => two restockers want to swap places

  // already stands near, go for it
  if (target.pos.isNearTo(creep.pos)) return true

  // stands near other source?
  // do not go away, independent of energy
  for (const someTarget of allTargets) {
    if (someTarget.pos.isNearTo(creep.pos)) return false
  }

  // not near anything, take source if free
  const others = this._allAssignedTo(target)
  return others.length === 0
}

energySpecialistController.targets = function (room) {
  // get all sources in, sort out per creep
  return room.find(FIND_SOURCES)
}

energySpecialistController.filterCreep = function (creep) {
  // does not matter if full or empty, can work => go to loop
  return this._isRestocker(creep) && this._hasWCM(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
