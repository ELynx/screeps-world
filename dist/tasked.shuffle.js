'use strict'

const intentSolver = require('./routine.intent')

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

      if (to && to.demand.priority) {
        const resourceTypes = _.shuffle(_.keys(creep.store))
        for (const resourceType of resourceTypes) {
          const want = to.demand.amount(resourceType)
          if (want <= 0) continue

          const canGive = creep.store.getUsedCapacity(resourceType)
          if (canGive <= 0) continue

          const mutual = Math.min(want, canGive)

          intentSolver.wrapCreepIntent(creep, 'transfer', to, resourceType, mutual)
          break
        }
      }

      const canTakeThisTick = creep.store.getFreeCapacity()
      if (canTakeThisTick <= 0) return // this is ugly code but fast

      if (to && to.demand.priority && from && from.supply.priority) {
        const resourceTypes = _.shuffle(_.keys(from.store))
        for (const resourceType of resourceTypes) {
          const want = to.demand.amount(resourceType)
          if (want <= 0) continue

          const canGive = from.supply.amount(resourceType)
          if (canGive <= 0) continue

          const mutual = Math.min(want, canGive, canTakeThisTick)

          intentSolver.wrapCreepIntent(creep, 'withdraw', from, resourceType, mutual)
          break
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
    // TODO dns
    if (flag.room.storage.store.getUsedCapacity() === 0) return this.FLAG_IGNORE
    if (flag.room.terminal.store.getFreeCapacity() < 30000) return this.FLAG_IGNORE
  }

  if (flag.name.indexOf('<<<') !== -1) {
    // TODO dns
    if (flag.room.terminal.store.getUsedCapacity() === 0) return this.FLAG_IGNORE
    if (flag.room.storage.store.getFreeCapacity() < 10000) return this.FLAG_IGNORE
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
