'use strict'

const intentSolver = require('./routine.intent')
const bodywork = require('./routine.bodywork')

const Controller = require('./controller.template')

const ttlController = new Controller('ttl')

// STRATEGY time when stronger creep is called for renew
const TTL = 200

ttlController.actRange = 1

ttlController.act = function (spawn, creep) {
  // by default creep is here only for renewal
  let renew = true
  let recycle = false

  // if spawning is ongoing
  const spawning = intentSolver.getSpawnSpawning(spawn)
  if (spawning) {
    // if creep will not live long enough
    if (creep.ticksToLive <= spawning.remainingTime) {
      // just give some resources back
      renew = false
      recycle = true
    } else {
      // wait
      renew = false
      recycle = false
    }
  }

  // override for recycle calls
  if (creep.memory.rccl === true) {
    renew = false
    recycle = true
  }

  if (renew) {
    const rc = intentSolver.wrapSpawnIntent(spawn, 'renewCreep', creep)
    if (rc >= OK) return rc

    // forgetaboutit
    recycle = true
  }

  if (recycle) {
    return intentSolver.wrapSpawnIntent(spawn, 'recycleCreep', creep)
  }

  // keep on target if can be dealt with later
  return OK
}

ttlController.targets = function (room) {
  // since works only in `my` rooms, save CPU on filter
  return _.values(room.spawns)
}

ttlController.filterCreep = function (creep) {
  // cannot walk, do not waste CPU on pathfinding
  if (creep.getActiveBodyparts(MOVE) === 0) return false

  // recycle was forced
  if (creep.memory.rccl === true) return true

  // too young
  if (creep.ticksToLive > TTL) return false

  // fast check if was rejected once
  if (creep.memory._ttl) return false

  // STRATEGY don't drag resources around
  if (!this._isEmpty(creep)) return false

  // check creeps with default body type
  const btyp = creep.memory.btyp
  if (btyp && bodywork[btyp]) {
    // do background check
    const room = Game.rooms[creep.memory.crum]
    if (room) {
      // renew creeps that are higher level than room can produce
      const exampleBody = bodywork[btyp](room)
      if (exampleBody.length < creep.body.length) {
        return true
      }
    }
  }

  // flag to avoid repeated checks
  creep.memory._ttl = true

  return false
}

ttlController.register()

module.exports = ttlController
