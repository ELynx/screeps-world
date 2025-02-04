'use strict'

const Tasked = require('./tasked.template')

const claimTasked = new Tasked('claim')

claimTasked.bodyName = function (flag) {
  if (flag.name.indexOf('!') !== -1) return this.id + '_2'

  return this.id
}

claimTasked._onProblemDetected = function (creep) {
  const flag = creep.flag
  if (flag) {
    flag.setValue(0)
  }

  creep.unlive()
}

claimTasked._roomCheck = function (room) {
  if (room._my_) return false
  if (room.ally) return false
  if (room.neutral) return false

  return true
}

claimTasked.callRoomService = function (room) {
  // to avoid several calls per tick
  if (room.__claim_serviced) return
  room.__claim_serviced = true

  const flagName = 'strelok_' + room.name

  const flag = Game.flags[flagName]
  if (flag) return

  // STRATEGY room service flag position
  const position = new RoomPosition(49, 49, room.name)
  position.createFlagWithValue(flagName, 1)
}

claimTasked.creepAtDestination = function (creep) {
  const controller = creep.room.controller
  if (!controller) {
    this._onProblemDetected(creep)
    return
  }

  // resistance detector
  if (creep.hits < creep.hitsMax) {
    if (creep.room.myOrMyReserved()) {
      this.callRoomService(creep.room)
    } else {
      this._onProblemDetected(creep)
      return
    }
  }

  // blocked path detector
  if (creep.ticksToLive <= 2 && creep.memory._clt === undefined) {
    this._onProblemDetected(creep)
    return
  }

  let rc = ERR_TIRED
  let wait = CREEP_CLAIM_LIFE_TIME // by default wait is longer than life

  if (this._roomCheck(creep.room)) {
    if (creep.pos.isNearTo(controller)) {
      if (creep.memory._clt === undefined) {
        creep.memory._clt = creep.ticksToLive
      }

      let sign = ''

      if (controller.owner && controller.owner.username !== creep.owner.username) {
        sign = ''
        rc = creep.attackController(controller)

        // see if creep can wait it out
        const ticksToUnblock = controller.upgradeBlocked || 0
        const ticksToUnsafe = controller.safeMode || 0
        const ticksToDowngrade = controller.level === 1 ? controller.ticksToDowngrade : 0

        wait = Math.max(ticksToUnblock, ticksToUnsafe, ticksToDowngrade)
      } else if (controller.reservation && controller.reservation.username !== creep.owner.username) {
        sign = ''
        rc = creep.attackController(controller)

        if (controller.reservation.username === 'Invader') {
          this.callRoomService(creep.room)
        }
      } else {
        let doClaim = false

        if (creep.memory.flag.indexOf('CLAIM') !== -1) {
          let myRooms = 0
          for (const someRoom of Game.rooms_values) {
            if (someRoom._my_) {
              ++myRooms
            }
          }

          doClaim = Game.gcl.level > myRooms
        }

        if (doClaim) {
          sign = ''
          rc = creep.claimController(controller)
        } else {
          sign = ''
          rc = creep.reserveController(controller)

          // 50% around 15 rolls, 99% around 63 rolls
          if (_.random(1, 20) === 20) {
            const structures = creep.room.find(FIND_STRUCTURES)
            if (_.some(structures, _.matchesProperty('structureType', STRUCTURE_INVADER_CORE))) {
              this.callRoomService(creep.room)
            }
          }
        }
      }

      if (controller.sign) {
        if (controller.sign.username !== SYSTEM_USERNAME) {
          if (controller.sign.text !== sign || controller.sign.username !== creep.owner.username) {
            creep.signController(controller, sign)
          }
        }
      } else if (sign.length > 0) {
        creep.signController(controller, sign)
      }
      // end of creep is near pos
    } else {
      creep.moveToWrapper(
        controller,
        {
          maxRooms: 1,
          range: 1,
          reusePath: _.random(7, 11)
        }
      )
      rc = OK // keep walking
    }
  } // end of actable controller

  if (rc === ERR_INVALID_TARGET ||
      rc === ERR_FULL ||
      rc === ERR_GCL_NOT_ENOUGH) {
    this._onProblemDetected(creep)
    return
  }

  // plug for waiting out safe mode
  if (rc === ERR_NO_BODYPART && controller.safeMode) {
    rc = ERR_TIRED
  }

  // be sure that creep will not survive the wait
  if (rc === ERR_TIRED && creep.ticksToLive < wait) {
    const ticksToArrive = creep.memory._clt ? CREEP_CLAIM_LIFE_TIME - creep.memory._clt : 0
    const ticksBlocked = wait
    const spawnAfter = Game.time + ticksBlocked - ticksToArrive

    const flag = creep.flag
    if (flag) {
      flag.memory.aftr = spawnAfter
    }

    creep.unlive()
  }
}

claimTasked.flagPrepare = function (flag) {
  // in case of visibility, check flag sanity
  if (flag.room) {
    if (flag.room.controller === undefined) {
      return this.FLAG_REMOVE
    }

    if (!this._roomCheck(flag.room)) {
      return this.FLAG_REMOVE
    }

    if (flag.room.breached() === false) {
      return this.FLAG_IGNORE
    }
  }

  // for each extra creep allow some time to arrive together
  const syncronisities = flag.getValue() * 50

  // save resources on not spamming
  if (flag.memory.aftr && flag.memory.aftr > Game.time + syncronisities) {
    return this.FLAG_IGNORE
  }

  return this.FLAG_SPAWN
}

claimTasked.makeClaimM = function (claim, move) {
  // move up front to allow crawl even damaged
  const partsMoveBegin = new Array(move - 1)
  partsMoveBegin.fill(MOVE)

  const partsClaim = new Array(claim)
  partsClaim.fill(CLAIM)

  const partsMoveEnd = [MOVE]

  return partsMoveBegin.concat(partsClaim).concat(partsMoveEnd)
}

claimTasked.makeBody = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 750) return []

  if (energy < 850) {
    // on swamp move 1 unit per 2 ticks
    // 750
    return this.makeClaimM(1, 3)
  }

  if (energy < 1700) {
    // on swamp move 1 unit per 1 tick
    // 850
    return this.makeClaimM(1, 5)
  }

  // on swamp move 1 unit per 1 tick
  // 1700
  return this.makeClaimM(2, 10)
}

claimTasked.makeBody_2 = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 6800) return []

  // on swamp move 1 unit per 1 tick
  // 6800
  return this.makeClaimM(8, 40)
}

claimTasked.register()

module.exports = claimTasked
