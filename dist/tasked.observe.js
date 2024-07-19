'use strict'

const Tasked = require('./tasked.template')

const observe = new Tasked('observe')

observe.spawnPriority = function (flag) {
  return 'lowkey'
}

observe.creepAtDestination = function (creep) {
  const pos = creep.getControlPos()
  if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
    creep.moveToWrapper(
      pos,
      {
        maxRooms: 1,
        reusePath: _.random(7, 11)
      }
    )
  }
}

observe.flagPrepare = function (flag) {
  // spawn forces
  if (flag.name.indexOf('!') !== -1) return this.FLAG_SPAWN

  if (flag.room) return this.FLAG_IGNORE
  return this.FLAG_SPAWN
}

observe.makeBody = function (spawn) {
  return [MOVE]
}

observe.register()

module.exports = observe
