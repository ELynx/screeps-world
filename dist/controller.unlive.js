'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const unliveController = new Controller('unlive')

unliveController.actRange = 1

unliveController.act = function (spawn, creep) {
  return intentSolver.wrapSpawnIntent(spawn, 'recycleCreep', creep)
}

unliveController.targets = function (room) {
  if (!room._my_) return []

  return Array.from(room.spawns.values())
}

unliveController.filterCreep = function (creep) {
  return this._isRecyclee(creep)
}

unliveController.register()

module.exports = unliveController
