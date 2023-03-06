'use strict'

const spawn = require('./routine.spawn')
const mapUtils = require('./routine.map')

const Tasked = require('./tasked.template')

const plunder = new Tasked('plunder')

plunder.spawnStrategy = function (flag) {
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

  if (creep.store.getUsedCapacity() === 0) {
    const roomName = this.getTargetRoomName(creep)
    if (roomName) {
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

  return undefined
}

plunder.moveAndLoad = function (creep, target) {
  if (creep.pos.isNearTo(target)) {
    const resourceTypes = _.shuffle(_.keys(target.store))
    for (const resourceType of resourceTypes) {
      const rc = creep.withdraw(target, resourceType)
      if (rc !== OK) break
    }
  } else {
    creep.moveToWrapper(
      target,
      {
        costCallback: mapUtils.costCallback_costMatrixWithUnwalkableBorders,
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
      function (structure) {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )

    const candidateTargets = allStructures.concat(allRuins)

    targets = _.filter(
      candidateTargets,
      function (candiadate) {
        if (candiadate.store === undefined) return false
        // nuker is no-withdraw
        if (candiadate.structureType && candiadate.structureType === STRUCTURE_NUKER) return false

        let hasResources = false
        for (const resourceType in candiadate.store) {
          if (candiadate.store[resourceType] > 0) {
            hasResources = true
            break
          }
        }
        if (!hasResources) return false

        const hasRamp = _.some(
          ramparts,
          function (ramp) {
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
    return
  }

  let target

  if (creep.memory.dest) {
    target = _.find(targets, _.matchesProperty('id', creep.memory.dest))
  }

  if (target === undefined) {
    target = creep.pos.findClosestByRange(targets)
    creep.memory.dest = target.id
  }

  this.moveAndLoad(creep, target)
}

plunder.creepAtDestination = function (creep) {
  if (creep.room.my) {
    this.creepAtOwnRoom(creep)
  } else {
    this.creepAtOtherRooms(creep)
  }
}

plunder.creepRoomTravel = function (creep) {
  // keep track of closest owned rooms
  if (creep.room.my) {
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

plunder.makeBody = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 300) {
    // 100  50     50
    return [CARRY, MOVE]
  }

  if (energy < 400) {
    // 300  50     50     50     50    50    50
    return [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
  }

  if (energy < 1000) {
    // capacity 200, steal complete full built extension
    // 400  50     50     50     50     50    50    50    50
    return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
  }

  // 1000 50     50     50     50     50     50     50     50     50     50     50    50    50    50    50    50    50    50    50    50
  return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
}

plunder.register()

module.exports = plunder
