'use strict'

const spawn = require('./routine.spawn')

const Tasked = require('./tasked.template')

const plunder = new Tasked('plunder')

plunder.combatTravel = true

plunder.spawnStrategy = function (_flag) {
  return spawn.FROM_ANY_ROOM
}

plunder.prepare = function () {
  this.roomTargets = { }
  this.roomBoring = { }
}

plunder.creepPrepare = function (creep) {
  this._flagCountCreep(creep)
}

plunder.getTargetRoomName = function (creep) {
  if (creep.memory.frum) return creep.memory.frum

  const flagPos = creep.getFlagPos()
  if (flagPos) return flagPos.roomName

  return undefined
}

plunder.creepAtOwnRoom = function (creep) {
  // all control (was) done by room controller
  // see if it is time for next raid or end of career

  if (creep.memory._rt1 === undefined) creep.memory._rt1 = Game.time

  if (creep.store.getUsedCapacity() === 0) {
    // assign custom ttl limit
    const leftAt = creep.memory._rt0 || Game.time
    const arrivedAt = creep.memory._rt1 || Game.time
    const backTrip = arrivedAt - leftAt
    const roundTrip = Math.floor(2.2 * backTrip)
    creep.viable = roundTrip

    const roomName = this.getTargetRoomName(creep)
    if (roomName && creep.viable) {
      creep.setControlRoom(roomName)
    } else {
      creep.unlive()
    }
  }
}

plunder.getSomeOwnRoomName = function (creep) {
  // if not (only) energy, recall room with "high" production
  if (creep.store.getUsedCapacity() > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
    // recall creep
    if (creep.memory.hrum) {
      return creep.memory.hrum
    }

    // recall operation
    if (creep.flag && creep.flag.memory.hrum) {
      return creep.flag.memory.hrum
    }
  }

  // recall last room seen by creep
  if (creep.memory.arum) {
    return creep.memory.arum
  }

  // backup, recall last room seen by flag
  if (creep.flag && creep.flag.memory.arum) {
    return creep.flag.memory.arum
  }

  // backup of backup, find any `own` room
  let backupRoomName
  let backupRoomDistance = Number.MAX_SAFE_INTEGER

  for (const room of Game.rooms_values) {
    if (!room._my_) continue

    let distance = Game.map.getRoomLinearDistance(creep.room.name, room.name)

    if (room.storage && room.storage.store.getFreeCapacity() === 0) distance += 99

    if (distance < backupRoomDistance) {
      backupRoomName = room.name
      backupRoomDistance = distance
    }
  }

  return backupRoomName
}

const FunFactor = new Map(
  [
    [RESOURCE_POWER, 100],
    [RESOURCE_OPS, 50],
    [RESOURCE_GHODIUM, 10],
    [RESOURCE_ENERGY, 0.1]
  ]
)

plunder.findTarget = function (creep, targets) {
  return _.filter(
    targets,
    target => (target.__plunder__str || 0) > 0 && (target.__plunder__fun || 0) > 0
  ).sort(
    (t1, t2) => {
      const s1 = t1.__plunder__fun || 0
      const s2 = t2.__plunder__fun || 0

      return s2 - s1
    }
  )[0]
}

plunder.moveAndLoad = function (creep, target) {
  const free = creep.store.getFreeCapacity()
  target.__plunder__str = (target.__plunder__str || 0) - free
  target.__plunder__fun = (target.__plunder__fun || 0) - free // rough estimate :)

  if (creep.pos.isNearTo(target)) {
    const resourceTypes = _.shuffle(_.keys(target.store))
    for (const resourceType of resourceTypes) {
      const rc = creep.withdraw(target, resourceType)
      if (rc >= OK) break
    }
  } else {
    creep.moveToWrapper(
      target,
      {
        maxRooms: 1,
        range: 1,
        reusePath: _.random(3, 5)
      }
    )
  }
}

plunder.creepAtOtherRooms = function (creep) {
  let targets = this.roomTargets[creep.room.name]
  if (targets === undefined) {
    const allStructures = creep.room.find(FIND_STRUCTURES)
    const allRuins = creep.room.find(FIND_RUINS)

    const ramparts = _.filter(
      allStructures,
      structure => {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )

    const candidateTargets = allStructures.concat(allRuins)

    targets = _.filter(
      candidateTargets,
      candiadate => {
        if (candiadate.store === undefined) return false
        // nuker is no-withdraw
        if (candiadate.structureType && candiadate.structureType === STRUCTURE_NUKER) return false

        // spawn energy self-refill should be kept in check
        if (candiadate.structureType && candiadate.structureType === STRUCTURE_SPAWN && candiadate.store[RESOURCE_ENERGY] < 10) return false

        for (const resourceType in candiadate.store) {
          const str = candiadate.store.getUsedCapacity(resourceType)
          const fun = str * (FunFactor.get(resourceType) || 1)

          candiadate.__plunder__str = (candiadate.__plunder__str || 0) + str
          candiadate.__plunder__fun = (candiadate.__plunder__fun || 0) + fun
        }

        if ((candiadate.__plunder__str || 0) <= 0) return false
        if ((candiadate.__plunder__fun || 0) <= 0) return false

        const hasRamp = _.some(
          ramparts,
          ramp => {
            return ramp.pos.x === candiadate.pos.x && ramp.pos.y === candiadate.pos.y
          }
        )

        return !hasRamp
      }
    )

    this.roomTargets[creep.room.name] = targets
  }

  if (targets.length === 0) {
    this.roomBoring[creep.room.name] = true
  }

  if (targets.length === 0 || creep.store.getFreeCapacity() === 0) {
    creep.setControlRoom(this.getSomeOwnRoomName(creep))
    creep.memory._rt0 = Game.time
    creep.memory._rt1 = undefined
    creep.memory._plT = undefined
    return
  }

  let target

  if (creep.memory._plT) {
    target = _.find(targets, _.matchesProperty('id', creep.memory._plT))
  }

  if (target === undefined) {
    target = this.findTarget(creep, targets)
    creep.memory._plT = target.id
  }

  this.moveAndLoad(creep, target)
}

plunder.creepAtDestination = function (creep) {
  if (creep.room._my_) {
    this.creepAtOwnRoom(creep)
  } else {
    this.creepAtOtherRooms(creep)
  }
}

plunder.creepRoomTravel = function (creep) {
  // keep track of closest owned rooms
  if (creep.room._my_) {
    // test overflowing storage
    if (creep.room.storage && creep.room.storage.store.getFreeCapacity() === 0) {
      // forget
      if (creep.memory.arum === creep.room.name) creep.memory.arum = undefined
      if (creep.memory.hrum === creep.room.name) creep.memory.hrum = undefined

      this._creepRoomTravel(creep)
      return
    }

    const high = creep.room.terminal !== undefined || creep.room.storage !== undefined

    creep.memory.arum = creep.room.name
    if (high) {
      creep.memory.hrum = creep.room.name
    }

    if (creep.flag) {
      creep.flag.memory.arum = creep.room.name
      if (high) {
        creep.flag.memory.hrum = creep.room.name
      }
    }
  }

  this._creepRoomTravel(creep)
}

plunder.flagPrepare = function (flag) {
  if (flag.room) {
    if (flag.room.breached() === false) {
      return this.FLAG_IGNORE
    }
  }

  if (this.roomBoring[flag.pos.roomName]) {
    return this.FLAG_REMOVE
  }

  return this._flagCountBasic(flag, 100)
}

plunder.makeCM = function (pairs) {
  if (this.__bodyPrototype === undefined) {
    this.__bodyPrototype = new Array(50).fill(null).map((unused, i) => i % 2 === 0 ? CARRY : MOVE)
  }

  if (pairs === 25) return this.__bodyPrototype
  return this.__bodyPrototype.slice(0, 2 * pairs)
}

plunder.makeBody = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()
  const sourceLevel = room.memory.slvl || 0

  if (energy < 400) {
    // 300
    return this.makeCM(3)
  }

  if (energy < 800) {
    // capacity 200, steal complete full built extension
    // 400
    return this.makeCM(4)
  }

  if (energy < 1200) {
    // 800
    return this.makeCM(8)
  }

  if (energy < 2000 || sourceLevel < 2) {
    // 1200
    return this.makeCM(12)
  }

  if (energy < 2500) {
    // 2000
    return this.makeCM(20)
  }

  // 2500
  return this.makeCM(25)
}

plunder.register()

module.exports = plunder
