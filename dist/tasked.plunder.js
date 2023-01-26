'use strict'

const Tasked = require('tasked.template')

const plunder = new Tasked('plunder')

plunder.prepare = function () {
  this.roomTargets = { }
  this.roomBoring = { }
}

plunder.creepPrepare = function (creep) {
  this._flagCountCreep(creep)
}

plunder.moveAndUnload = function (creep, target) {
  let pos
  let range

  if (target.pos) {
    pos = target.pos
    range = 1
  } else {
    pos = target
    range = 5 // good enough
  }

  if (creep.pos.inRangeTo(pos, range)) {
    for (const resourceType in creep.store) {
      let rc
      if (target.store && target.store.getFreeCapacity(resourceType) > 0) {
        rc = creep.transfer(target, resourceType)
      }

      if (rc !== OK) {
        rc = creep.drop(resourceType)
      }

      if (rc === OK) break // from resource loop
    }
  } else {
    creep.moveToWrapper(pos, { reusePath: 50, range })
  }

  if (creep.store.getUsedCapacity() === 0) {
    const whereFlag = creep.getFlagPos()
    if (whereFlag) {
      creep.setControlRoom(whereFlag.roomName)
    } else {
      creep.unlive()
    }
  }
}

plunder.creepAtOwnRoom = function (creep) {
  if (creep.room.storage) {
    this.moveAndUnload(creep, creep.room.storage)
  } else if (creep.room.terminal) {
    this.moveAndUnload(creep, creep.room.terminal)
  } else {
    this.moveAndUnload(creep, creep.getControlPos())
  }
}

plunder.getSomeOwnRoomName = function (creep) {
  const storage = creep.memory.storage ? Game.getObjectById(creep.memory.storage) : undefined
  if (storage) return storage.room.name

  const terminal = creep.memory.terminal ? Game.getObjectById(creep.memory.terminal) : undefined
  if (terminal) return terminal.room.name

  const controller = creep.memory.controller ? Game.getObjectById(creep.memory.controller) : undefined
  if (controller) return controller.room.name

  return undefined
}

plunder.moveAndLoad = function (creep, target) {
  if (creep.pos.isNearTo(target)) {
    for (const resourceType in target.store) {
      const rc = creep.withdraw(target, resourceType)
      if (rc === OK) break
    }
  } else {
    creep.moveToWrapper(target, { reusePath: 50, range: 1 })
  }
}

plunder.creepAtOtherRooms = function (creep) {
  let targets = this.roomTargets[creep.room.name]
  if (targets === undefined) {
    const allStructures = creep.room.find(FIND_STRUCTURES)

    const ramparts = _.filter(
      allStructures,
      function (structure) {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )

    targets = _.filter(
      allStructures,
      function (structure) {
        if (structure.store === undefined) return false

        let hasResources = false
        for (const resourceType in structure.store) {
          if (structure.store[resourceType] > 0) {
            hasResources = true
            break
          }
        }
        if (!hasResources) return false

        const hasRamp = _.some(
          ramparts,
          function (ramp) {
            return ramp.pos.x === structure.pos.x && ramp.pos.y === structure.pos.y
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
    target = _.find(targets, { id: creep.memory.dest })
  }

  if (target === undefined) {
    target = creep.pos.findClosestByRange(targets)
    creep.memory.dest = target.id
  }

  this.moveAndLoad(creep, target)
}

plunder.creepAtDestination = function (creep) {
  if (creep.room.my()) {
    this.creepAtOwnRoom(creep)
  } else {
    this.creepAtOtherRooms(creep)
  }
}

plunder.creepRoomTravel = function (creep) {
  // keep track of closest owned stuff

  if (creep.room.my()) {
    if (creep.room.storage) { creep.memory.storage = creep.room.storage.id }

    if (creep.room.terminal) { creep.memory.terminal = creep.room.terminal.id }

    if (creep.room.controller) { creep.memory.controller = creep.room.controller.id }
  }

  this._creepRoomTravel(creep)
}

plunder.flagPrepare = function (flag) {
  if (this.roomBoring[flag.pos.roomName]) return this.FLAG_REMOVE

  return this._flagCountBasic(flag, 100)
}

plunder.makeBody = function (spawn) {
  const elvl = spawn.room.memory.elvl

  if (elvl <= 1) {
    // 100   50     50
    return [CARRY, MOVE]
  }

  if (elvl <= 3) {
    // 300   50     50     50     50    50    50
    return [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
  }

  // capacity 200, steal complete full built extension
  // 600   50     50     50     50     50    50    50    50
  return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
}

plunder.register()

module.exports = plunder
