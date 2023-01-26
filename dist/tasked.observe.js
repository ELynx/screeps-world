'use strict'

const Tasked = require('tasked.template')

const observe = new Tasked('observe')

observe.creepAtDestination = function (creep) {
  const pos = creep.getControlPos()
  if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
    creep.moveToWrapper(pos, { maxRooms: 1 })
  }
}

observe.flagPrepare = function (flag) {
  if (flag.room) return this.FLAG_IGNORE
  return this.FLAG_SPAWN
}

observe.makeBody = function (spawn) {
  return [MOVE]
}

observe.register()

module.exports = observe
