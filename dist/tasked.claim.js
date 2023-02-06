'use strict'

const Tasked = require('./tasked.template')

const claim = new Tasked('claim')

claim._onProblemDetected = function (creep) {
  const flag = Game.flags[creep.getFlagName()]
  if (flag) {
    flag.setValue(0)
  }

  creep.unlive()
}

claim.creepAtDestination = function (creep) {
  // resistance detector
  if (creep.hits < creep.hitsMax) {
    this._onProblemDetected(creep)
    return
  }

  // blocked path detector
  if (creep.ticksToLive <= 2) {
    this._onProblemDetected(creep)
    return
  }

  const controller = creep.room.controller
  if (!controller) {
    this._onProblemDetected(creep)
    return
  }

  let rc = ERR_TIRED
  let wait = CREEP_CLAIM_LIFE_TIME // by default wait is longer than life

  if (controller.hostileOrUnowned()) {
    if (creep.pos.isNearTo(controller)) {
      if (creep.memory._clt === undefined) {
        creep.memory._clt = creep.ticksToLive
      }

      let sign = ''

      if (controller.owner && controller.owner.username !== creep.owner.username) {
        sign = 'Your base is under attack'
        rc = creep.attackController(controller)

        // see if creep can wait it out
        const ticksToUnblock = controller.upgradeBlocked || 0
        const ticksToUnsafe = controller.safeMode || 0
        const ticksToDowngrade = controller.level === 1 ? controller.ticksToDowngrade : 0

        wait = Math.max(ticksToUnblock, ticksToUnsafe, ticksToDowngrade)
      } else if (controller.reservation && controller.reservation.username !== creep.owner.username) {
        sign = 'Taking over'
        rc = creep.attackController(controller)
      } else {
        let myRooms = 0
        for (const roomName in Game.rooms) {
          const someRoom = Game.rooms[roomName]
          if (someRoom.my) {
            ++myRooms
          }
        }

        if (Game.gcl.level > myRooms) {
          sign = ''
          rc = creep.claimController(controller)
        } else {
          sign = 'I was here'
          rc = creep.reserveController(controller)
        }
      }

      if (controller.sign) {
        if (controller.sign.text !== sign || controller.sign.username !== creep.owner.username) {
          creep.signController(controller, sign)
        }
      } else if (sign.length > 0) {
        creep.signController(controller, sign)
      }
      // end of creep is near pos
    } else {
      creep.moveToWrapper(controller, { maxRooms: 1, reusePath: 50, range: 1 })
      rc = OK // keep walking
    }
  } // end of harmable controller

  if (rc === ERR_INVALID_TARGET ||
        rc === ERR_FULL ||
        rc === ERR_GCL_NOT_ENOUGH) {
    this._onProblemDetected(creep)
    return
  }

  // be sure that creep will not survive the wait
  if (rc === ERR_TIRED && creep.ticksToLive < wait) {
    const ticksToArrive = creep.memory._clt ? CREEP_CLAIM_LIFE_TIME - creep.memory._clt : 0
    const ticksBlocked = wait
    const ticksOverhead = 42 // be this early to minimize safe mode window, etc
    const spawnAfter = Game.time + ticksBlocked - ticksToArrive - ticksOverhead

    const flag = Game.flags[creep.getFlagName()]
    if (flag) {
      flag.memory.aftr = spawnAfter
    }

    creep.unlive()
  }
}

claim.flagPrepare = function (flag) {
  if (flag.room) {
    if (flag.room.__aggro !== undefined) {
      return this.FLAG_IGNORE
    }

    const flagController = flag.room.controller
    if (flagController) {
      // done about it
      if (!flagController.hostileOrUnowned()) return this.FLAG_REMOVE
    } else {
      return this.FLAG_REMOVE
    }
  }

  // save resources on not spamming
  if (flag.memory.aftr && flag.memory.aftr > Game.time) {
    return this.FLAG_IGNORE
  }

  return this.FLAG_SPAWN
}

claim.makeBody = function (spawn) {
  const elvl = spawn.room.memory.elvl

  // cannot spawn 650+
  if (elvl <= 2) return []

  if (elvl <= 3) {
    // on swamp move 1 unit per 2 ticks
    // move up front to allow crawl even damaged
    // 750   50    50    600    50
    return [MOVE, MOVE, CLAIM, MOVE]
  }

  if (elvl <= 4) {
    // on swamp move 1 unit per 1 tick
    // move up front to allow crawl even damaged
    // 850   50    50    50    50    600    50
    return [MOVE, MOVE, MOVE, MOVE, CLAIM, MOVE]
  }

  // 5+ or 1800+

  // on swamp move 1 unit per 1 tick
  // move up front to allow crawl even damaged
  // 1700  50    50    50    50    50    50    50    50    50    600    600    50
  return [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM, CLAIM, MOVE]
}

claim.register()

module.exports = claim
