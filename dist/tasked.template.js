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
      creep.memory._xxx = creep.room.name
    }

    if (creep._canMove_) {
      const controlPos = creep.getControlPos()
      creep.moveToWrapper(controlPos, { reusePath: 50, range: controlPos.offBorderDistance() })
    }
  }

  this.creepRoomTravel = function (creep) {
    this._creepRoomTravel(creep)
  }

  this._coastToHalt = function (creep) {
    if (!creep._canMove_) {
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
    const creeps = _.filter(
      Game.creeps,
      function (creep) {
        // creep with no memory of flag are given up
        return creep.name.startsWith(this.id) && creep.getFlagName()
      },
      this
    )

    if (this.prepare) {
      this.prepare()
    }

    const flagCount = { }

    for (let i = 0; i < creeps.length; ++i) {
      const creep = creeps[i]

      creep._canMove_ = creep.getActiveBodyparts(MOVE) > 0 && creep.fatigue === 0

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

    const flagKey = this.id + '_'

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
