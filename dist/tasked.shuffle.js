'use strict'

const Tasked = require('./tasked.template')

const shuffle = new Tasked('shuffle')

shuffle.spawnPriority = function (flag) {
  return 'lowkey'
}

shuffle.creepAtDestination = function (creep) {
  const pos = creep.getControlPos()
  if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
    creep.moveToWrapper(
      pos,
      {
        maxRooms: 1,
        reusePath: _.random(7, 11)
      }
    )
  } else {
    if (creep.flag) {
      let from
      let to

      if (creep.flag.name.indexOf('>>>') !== -1) {
        from = creep.room.storage
        to = creep.room.terminal
      }

      if (creep.flag.name.indexOf('<<<') !== -1) {
        from = creep.room.terminal
        to = creep.room.storage
      }

      if (from && to) {
        const resourceTypes1 = _.shuffle(_.keys(from.store))
        for (const resourceType of resourceTypes1) {
          if (from.structureType === STRUCTURE_TERMINAL && resourceType === RESOURCE_ENERGY) { continue }

          const rc = creep.withdraw(from, resourceType)
          if (rc !== OK) break
        }

        const resourceTypes2 = _.shuffle(_.keys(creep.store))
        for (const resourceType of resourceTypes2) {
          const rc = creep.transfer(to, resourceType)
          if (rc !== OK) break
        }
      }
    }
  }
}

shuffle.flagPrepare = function (flag) {
  if (flag.room === undefined) return this.FLAG_IGNORE
  if (flag.room.storage === undefined) return this.FLAG_IGNORE
  if (flag.room.terminal === undefined) return this.FLAG_IGNORE

  if (flag.name.indexOf('>>>') !== -1) {
    if (flag.room.storage.store.getUsedCapacity() === 0) return this.FLAG_IGNORE
  }

  if (flag.name.indexOf('<<<') !== -1) {
    if (flag.room.terminal.store.getUsedCapacity() === 0) return this.FLAG_IGNORE
  }

  return this.FLAG_SPAWN
}

shuffle.makeBody = function (spawn) {
  const a = new Array(49)
  a.fill(CARRY)

  const b = new Array(1)
  b.fill(MOVE)

  return a.concat(b)
}

shuffle.register()

module.exports = shuffle
