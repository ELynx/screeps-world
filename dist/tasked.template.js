'use strict'

let profiler

if (Game.flags.profiler) {
  profiler = require('./screeps-profiler')
}

const bootstrap = require('./bootstrap')

const spawn = require('./routine.spawn')

Room.prototype.aggro = function () {
  return this.__tasked_template__room_aggro || []
}

Room.prototype.addAggro = function (agroArray) {
  if (this.__tasked_template__room_aggro) {
    this.__tasked_template__room_aggro = this.__tasked_template__room_aggro.concat(agroArray)
  } else {
    this.__tasked_template__room_aggro = agroArray
  }
}

Room.prototype.breached = function () {
  return this.__tasked_template__room_aggro ? this.__tasked_template__room_aggro.length === 0 : undefined
}

Room.prototype.getControlPos = function () {
  // some interesting positions first
  if (this.storage) return this.storage.pos
  if (this.terminal) return this.terminal.pos
  if (this.controller) return this.controller.pos

  return bootstrap.centerRoomPosition(this.name)
}

Creep.prototype.getFlagPos = function () {
  const flag = this.flag
  if (flag) {
    // bottom row is for special indicator flags, etc.
    // they point to "the room in general"
    if (flag.pos.y === 49) return bootstrap.centerRoomPosition(flag.pos.roomName)

    return flag.pos
  }

  return undefined
}

Creep.prototype.getControlRoom = function () {
  return this.memory.crum
}

Creep.prototype.setControlRoom = function (crum) {
  this.memory.crum = crum
}

Creep.prototype.setFromRoom = function (frum) {
  this.memory.frum = frum
}

Creep.prototype.getControlPos = function () {
  const crum = this.getControlRoom()
  const flagPos = this.getFlagPos()

  // flag is visible and flag is in expected room
  // aim at the flag
  if (flagPos && flagPos.roomName === crum) {
    return flagPos
  }

  // if room is visible, search it
  const room = Game.rooms[crum]
  if (room) return room.getControlPos()

  // if room is not visible, point at center
  return bootstrap.centerRoomPosition(crum)
}

Creep.prototype.healClosest = function (creeps) {
  if (creeps.length === 0) {
    return ERR_NOT_FOUND
  }

  const target = this.pos.findClosestByRange(creeps)
  if (target) {
    if (this.pos.isNearTo(target)) {
      return this.heal(target)
    } else {
      return this.rangedHeal(target)
    }
  }

  return ERR_NOT_FOUND
}

Creep.prototype.healAdjacent = function (creeps) {
  for (const target of creeps) {
    if (this.pos.isNearTo(target)) {
      return this.heal(target)
    }
  }

  return ERR_NOT_FOUND
}

Creep.prototype.meleeAdjacent = function (targets) {
  let target4
  let target3
  let target2
  let target1

  for (const target of targets) {
    if (this.pos.isNearTo(target)) {
      let noMelee = false
      if (target.body) {
        if (!_.some(target.body, _.matchesProperty('type', ATTACK))) {
          noMelee = true
        }
      } else {
        noMelee = true
      }

      const hasAggro = target._aggro_ !== undefined

      target4 = target
      if (noMelee) target3 = target
      if (hasAggro) target2 = target
      if (noMelee && hasAggro) target1 = target
    }

    if (target1) break
  }

  if (target1) return this.attack(target1)
  if (target2) return this.attack(target2)
  if (target3) return this.attack(target3)
  if (target4) return this.attack(target4)

  return ERR_NOT_FOUND
}

Creep.prototype.purgeEnergy = function () {
  if (this.store[RESOURCE_ENERGY] > 0) this.drop(RESOURCE_ENERGY)
}

Creep.prototype.withdrawFromAdjacentStructures = function (targets) {
  for (const target of targets) {
    if (target.structureType &&
        target.store &&
        target.store[RESOURCE_ENERGY] > 0 &&
        this.pos.isNearTo(target)) {
      if (this.withdraw(target, RESOURCE_ENERGY) === OK) {
        return OK
      }
    }
  }

  return ERR_NOT_FOUND
}

Creep.prototype.unlive = function () {
  let result = false

  if (this.room.level() > 0) {
    this.setControlRoom(this.room.name)
    this.setFromRoom(undefined)
    result = true
  } else if (this.memory.mrts) {
    this.setControlRoom(this.memory.mrts)
    this.setFromRoom(undefined)
    result = true
  } else {
    for (const room of Game.rooms_values) {
      if (room.level() > 0) {
        this.setControlRoom(room.name)
        this.setFromRoom(undefined)
        result = true
        break
      }
    }
  }

  if (result) {
    // forget who they serve
    this.memory.flag = undefined
    this.flag = undefined
    // mark to be cycled out of existence
    this.memory.rccl = true

    return OK
  }

  return this.suicide()
}

Flag.prototype.resetCount = function () {
  this.memory.fcnt = undefined
}

function Tasked (id) {
  this.FLAG_REMOVE = 0
  this.FLAG_IGNORE = 1
  this.FLAG_SPAWN = 2

  /**
    Unique identifier.
    **/
  this.id = id

  this.breachedExtraCreeps = 0

  this.prepare = undefined

  this.creepPrepare = undefined

  this.creepAtDestination = undefined

  this.spawnFrom = function (flag) {
    return spawn.FROM_CLOSEST_ROOM
  }

  this.spawnPriority = function (flag) {
    return 'normal'
  }

  this.bodyName = function (flag) {
    return this.id
  }

  this._creepRoomTravel = function (creep) {
    if (creep.room.level() > 0) {
      // remember unliving room
      creep.memory.mrts = creep.room.name
    }

    if (creep.__canMove) {
      const controlPos = creep.getControlPos()
      creep.moveToWrapper(
        controlPos,
        {
          range: controlPos.offBorderDistance(),
          reusePath: _.random(3, 5)
        }
      )
    } else {
      creep.fatigueWrapper()
    }
  }

  this.creepRoomTravel = function (creep) {
    this._creepRoomTravel(creep)
  }

  this._coastToHalt = function (creep) {
    if (!creep.__canMove) {
      creep.fatigueWrapper()
      return
    }

    const pos = creep.getControlPos()
    if (creep.room.name !== pos.roomName) {
      return
    }

    const haltRange = Math.min(15, pos.offBorderDistance())
    if (!creep.pos.inRangeTo(pos, haltRange)) {
      creep.moveToWrapper(
        pos,
        {
          maxRooms: 1,
          range: haltRange,
          reusePath: _.random(7, 11)
        }
      )
    }
  }

  this.flagPrepare = undefined

  this.makeBody = undefined

  this._flagCountCreep = function (creep) {
    if (creep.memory.fcnt) return

    const flag = creep.flag
    if (flag) {
      const now = flag.memory.fcnt || 0
      flag.memory.fcnt = now + 1
      creep.memory.fcnt = true
    }
  }

  this._flagCount = function (flag) {
    return flag.memory.fcnt || 0
  }

  this._flagCountBasic = function (flag, limit) {
    const had = this._flagCount(flag)
    if (had < limit) return this.FLAG_SPAWN

    return this.FLAG_IGNORE
  }

  this.act = function () {
    if (this.prepare) {
      this.prepare()
    }

    const creepsCountKey = '__creeps_count_' + this.id

    const creeps = Game.creepsByShortcut[this.id] || []

    for (const creep of creeps) {
      bootstrap.activeBodyParts(creep)
      creep.__canMove = creep._move_ > 0 && creep.fatigue === 0

      if (this.creepPrepare) {
        this.creepPrepare(creep)
      }

      // count how many creeps are already going to destination
      if (creep.flag) {
        const was = creep.flag[creepsCountKey] || 0
        const now = was + 1
        creep.flag[creepsCountKey] = now
      }

      if (creep.spawning) {
        continue
      }

      const controlRoom = creep.getControlRoom()
      if (controlRoom === undefined) {
        creep.unlive()
        continue
      }

      if (creep.room.name === controlRoom) {
        this.creepAtDestination(creep)
      } else {
        this.creepRoomTravel(creep)
      }
    }

    if (this.makeBody === undefined) {
      return
    }

    const flags = Game.flagsByShortcut[this.id] || []

    for (const flag of flags) {
      let want = flag.getValue()

      // sanitize flags
      if (want < 0) {
        spawn.erase(flag.name)
        flag.remove()

        continue
      }

      if (flag.room && flag.room.breached()) {
        want = want + this.breachedExtraCreeps
      }

      if (this.flagPrepare) {
        const decision = this.flagPrepare(flag)

        if (decision === this.FLAG_IGNORE) {
          spawn.erase(flag.name)
          flag.resetSecondaryColor()
          continue
        }

        if (decision !== this.FLAG_SPAWN) {
          spawn.erase(flag.name)
          flag.remove()
          continue
        }
      }

      const has = (flag[creepsCountKey] || 0) + spawn.count(flag.name)

      if (has < want) {
        flag.setSecondaryColor(COLOR_GREY)
      } else {
        flag.setSecondaryColor(COLOR_WHITE)
        continue
      }

      const spawnFromStrategy = this.spawnFrom(flag)
      const spawnPriorityStrategy = this.spawnPriority(flag)
      const bodyNameStrategy = this.bodyName(flag)

      const creepMemory = {
        btyp: bodyNameStrategy,
        crum: flag.pos.roomName,
        flag: flag.name
      }

      let spawnCallback

      if (spawnPriorityStrategy === 'urgent') {
        spawnCallback = _.bind(spawn.addUrgent, spawn)
      } else if (spawnPriorityStrategy === 'lowkey') {
        spawnCallback = _.bind(spawn.addLowkey, spawn)
      } else if (spawnPriorityStrategy === 'normal') {
        spawnCallback = _.bind(spawn.addNormal, spawn)
      } else {
        console.log('Unknown spawn priority strategy [' + spawnPriorityStrategy + ']')
        spawnCallback = _.bind(spawn.addNormal, spawn)
      }

      spawnCallback(
        flag.name, // id in queue
        bodyNameStrategy, // body, string indicates to call body function
        flag.name, // name (prefix)
        creepMemory, // memory
        spawnFromStrategy, // from
        flag.pos.roomName, // to
        want - has // n
      )
    } // end of loop for all flags
  } // end of act

  this.register = function () {
    bootstrap.registerTaskController(this)

    if (this.makeBody) {
      spawn.registerBodyFunction(this.id, _.bind(this.makeBody, this))
    }

    if (this.makeBody_2) {
      spawn.registerBodyFunction(this.id + '_2', _.bind(this.makeBody_2, this))
    }

    if (profiler) {
      profiler.registerObject(this, this.id)
    }
  }
};

module.exports = Tasked
