'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const unliveController = new Controller('unlive')

unliveController.actRange = 1

unliveController.act = function (spawn, creep) {
  return intentSolver.wrapSpawnIntent(spawn, 'recycleCreep', creep)
}

unliveController.targets = function (room) {
  // since works only in `my` rooms, save CPU on filter
  return _.values(room.spawns)
}

unliveController.filterCreep = function (creep) {
  return this._isRecyclee(creep)
}

unliveController.register()

module.exports = unliveController
