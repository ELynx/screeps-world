'use strict'

const profiler = require('./screeps-profiler')

const bootstrap = require('./bootstrap')

const makeDebuggable = require('./routine.debuggable')
const spawn = require('./routine.spawn')

Room.prototype.getControlPos = function () {
  // some interesting positions first
  if (this.storage) return this.storage.pos
  if (this.terminal) return this.terminal.pos
  if (this.controller) return this.controller.pos

  return bootstrap.centerRoomPosition(this.name)
}

Creep.prototype.getFlagName = function () {
  return this.memory.flag
}

Creep.prototype.getFlagPos = function () {
  const flag = Game.flags[this.getFlagName()]
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
  for (let i = 0; i < creeps.length; ++i) {
    const target = creeps[i]
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

  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]

    if (this.pos.isNearTo(target)) {
      let noMelee = false
      if (target.body) {
        if (!_.some(target.body, _.matchesProperty('type', ATTACK))) {
          noMelee = true
        }
      } else {
        noMelee = true
      }

      const hasAggro = target.__aggro !== undefined

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
  for (const targetKey in targets) {
    const target = targets[targetKey]
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

  if (this.room.my && this.room.memory.elvl > 0) {
    this.setControlRoom(this.room.name)
    result = true
  } else if (this.memory.mrts) {
    this.setControlRoom(this.memory.mrts)
    result = true
  } else {
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      if (room.my && room.memory.elvl > 0) {
        this.setControlRoom(room.name)
        result = true
        break
      }
    }
  }

  if (result) {
    // forget who they serve
    this.memory.flag = undefined
    // mark to be cycled out of existence
    this.memory.rccl = true

    return OK
  }

  return this.suicide()
}

function Tasked (id) {
  this.FLAG_REMOVE = 0
  this.FLAG_IGNORE = 1
  this.FLAG_SPAWN = 2

  /**
    Unique identifier.
    **/
  this.id = id

  // attach methods that allow fast debug writing
  makeDebuggable(this, 'Tasked')

  this.prepare = undefined

  this.creepPrepare = undefined

  this.creepAtDestination = undefined

  this._creepRoomTravel = function (creep) {
    if (creep.room.memory.elvl > 0) {
      // remember unliving room
      creep.memory.mrts = creep.room.name
    }

    if (creep.__canMove) {
      const controlPos = creep.getControlPos()
      creep.moveToWrapper(controlPos, { reusePath: 50, range: controlPos.offBorderDistance() })
    }
  }

  this.creepRoomTravel = function (creep) {
    this._creepRoomTravel(creep)
  }

  this._coastToHalt = function (creep) {
    if (!creep.__canMove) {
      return
    }

    const pos = creep.getControlPos()
    if (creep.room.name !== pos.roomName) {
      return
    }

    const haltRange = Math.min(15, pos.offBorderDistance())
    if (!creep.pos.inRangeTo(pos, haltRange)) {
      creep.moveToWrapper(pos, { maxRooms: 1, reusePath: 50, range: haltRange })
    }
  }

  this.flagPrepare = undefined

  this.makeBody = undefined

  this._flagCountCreep = function (creep) {
    if (creep.memory.fcnt) return

    const flag = Game.flags[creep.getFlagName()]
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

    const flagKey = this.id + '_'

    const creeps = _.filter(
      Game.creeps,
      function (creep) {
        const flagName = creep.getFlagName()
        return flagName && flagName.startsWith(flagKey)
      }
    )

    const flagCount = { }

    for (let i = 0; i < creeps.length; ++i) {
      const creep = creeps[i]

      creep.__canMove = creep.getActiveBodyparts(MOVE) > 0 && creep.fatigue === 0

      if (this.creepPrepare) {
        this.creepPrepare(creep)
      }

      // count how many creeps are already going to destination
      const flagName = creep.getFlagName()
      let now = flagCount[flagName] || 0
      ++now
      flagCount[flagName] = now

      if (creep.spawning) {
        continue
      }

      if (creep.room.name === creep.getControlRoom()) {
        this.creepAtDestination(creep)
      } else {
        this.creepRoomTravel(creep)
      }
    }

    if (this.makeBody === undefined) {
      return
    }

    for (const flagName in Game.flags) {
      if (!flagName.startsWith(flagKey)) {
        continue
      }

      const flag = Game.flags[flagName]

      const want = flag.getValue()

      // sanitize flags
      if (want < 0) {
        spawn.erase(flagName)
        flag.remove()

        continue
      }

      if (this.flagPrepare) {
        const decision = this.flagPrepare(flag)
        if (decision === this.FLAG_IGNORE) {
          spawn.erase(flagName) // to free up queue
          flag.resetSecondaryColor()
          continue
        }

        if (decision !== this.FLAG_SPAWN) {
          spawn.erase(flagName)
          flag.remove()

          continue
        }
      }

      const has = (flagCount[flagName] || 0) + spawn.count(flagName)

      if (has < want) {
        flag.setSecondaryColor(COLOR_GREY)
      } else {
        flag.setSecondaryColor(COLOR_WHITE)
        continue
      }

      const creepMemory =
            {
              crum: flag.pos.roomName,
              flag: flagName
            }

      spawn.addNormal(
        flagName, // id in queue
        this.id, // body, string indicates to call body function
        flagName, // name (prefix)
        creepMemory, // memory
        spawn.FROM_ANY_ROOM, // from
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

    profiler.registerObject(this, this.id)
  }
};

module.exports = Tasked
