'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

energySpecialistController.actRange = 1

energySpecialistController.unloadTargets = function (source) {
  return []
}

energySpecialistController.act = function (source, creep) {
  // start by harvesting; if that is OK, keep harvesting
  const harvestRc = this.wrapIntent(creep, 'harvest', source)
  if (harvestRc === OK) return OK

  const targets = this.unloadTargets(source)

  // go to "build" phase
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

  // if source is hard empty, 
  if (harvestRc === bootstrap.ERR_INTENDED_EXHAUSTED) return bootstrap.WARN_INTENDED_EXHAUSTED

  // TODO
  return -1
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
