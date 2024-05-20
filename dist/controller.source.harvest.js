'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const sourceHarvestGenericController = new Controller('source.harvest.generic')

sourceHarvestGenericController.actRange = 1

sourceHarvestGenericController._act = function (source, creep) {
  return this.wrapIntent(creep, 'harvest', source)
}

sourceHarvestGenericController._sticky = function (target) {
  if (target.__sourceHarvestControllers__sticky) return true

  const creeps = target.room.getRoomControlledCreeps()
  const sticky = _.some(creeps, _.matchesProperty('memory._est', target.id))
  if (sticky) {
    target.__sourceHarvestControllers__sticky = true
  }

  return sticky
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

  return !this._sticky(target)
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
}

sourceHarvestSpecialistController.onAssign = function (target, creep) {
  target.__sourceHarvestControllers__sticky = true
  creep.memory._est = target.id
}

sourceHarvestSpecialistController.act = function (source, creep) {
  // stick to position
  creep.memory.atds = true

  const rc = this._act(source, creep)

  // remember for cook
  creep._source_harvest_specialist_rc_ = rc
  creep._source_ = source

  return rc
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

  return !this._sticky(target)
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
