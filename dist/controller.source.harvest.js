'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const sourceHarvestGenericController = new Controller('source.harvest.generic')

sourceHarvestGenericController.actRange = 1

sourceHarvestGenericController._act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

sourceHarvestGenericController._notSticky = function (target) {
  const others = target.room.getRoomControlledCreeps()
  return !_.some(others, _.matchesProperty('memory._est', target.id))
}

sourceHarvestGenericController.act = function (source, creep) {
  return this._act(source, creep)
}

sourceHarvestGenericController.validateTarget = function (allTargets, target, creep) {
  // pay respect to defaults
  if (!this._validateTarget(allTargets, target, creep)) {
    return false
  }

  // for room fast start
  if (target.room.spawns && target.room.spawns.size === 0) return true

  return this._notSticky(target)
}

sourceHarvestGenericController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => intentSolver.getEnergy(source) > 0)
}

sourceHarvestGenericController.filterCreep = function (creep) {
  return !this._isStationarySpecialist(creep) && this._hasWCM(creep) && this._isEmpty(creep)
}

// before profiler wrap
const sourceHarvestSpecialistController = _.assign({ }, sourceHarvestGenericController)

sourceHarvestSpecialistController.id = 'source.harvest.specialist'

sourceHarvestSpecialistController.roomPrepare = function (room) {
  this._roomPrepare(room)
  this._prepareExcludedTargets(room)
}

sourceHarvestSpecialistController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
  // stick creep to source
  creep.memory._est = creep.memory.dest
}

sourceHarvestSpecialistController.act = function (source, creep) {
  // stick to position
  creep.memory.atds = true
  return this._act(source, creep)
}

sourceHarvestSpecialistController.validateTarget = function (allTargets, target, creep) {
  // pay respect to defaults
  if (!this._validateTarget(allTargets, target, creep)) {
    return false
  }

  // if already has sticky, stick
  if (creep.memory._est !== undefined) {
    return target.id === creep.memory._est
  }

  return this._notSticky(target)
}

sourceHarvestSpecialistController.filterCreep = function (creep) {
  return this._isHarvester(creep) && this._hasWCM(creep) && this._hasFreeCapacity(creep)
}

sourceHarvestGenericController.register()
sourceHarvestSpecialistController.register()

module.exports =
{
  generic: sourceHarvestGenericController,
  specialist: sourceHarvestSpecialistController
}
