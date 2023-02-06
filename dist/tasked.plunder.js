'use strict'

const mapUtils = require('./routine.map')

const Tasked = require('./tasked.template')

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
    creep.moveToWrapper(
      pos,
      {
        costCallback: mapUtils.costCallback_costMatrixWithUnwalkableBorders,
        reusePath: 10,
        range
      }
    )
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
    const spawns = _.filter(Game.spawns, _.matchesProperty('room.name', creep.room.name))
    if (spawns.length > 0) {
      this.moveAndUnload(creep, spawns[0])
    } else {
      this.moveAndUnload(creep, creep.getControlPos())
    }
  }
}

plunder.getSomeOwnRoomName = function (creep) {
  const storage = creep.memory.strI ? Game.getObjectById(creep.memory.strI) : undefined
  if (storage) return storage.room.name

  const terminal = creep.memory.trmI ? Game.getObjectById(creep.memory.trmI) : undefined
  if (terminal) return terminal.room.name

  // intervention - if not energy, search for storage or terminal globally
  if (creep.store.getUsedCapacity() > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
    const flag = Game.flags[creep.getFlagName()]
    if (flag) {
      const storage1 = flag.memory.strI ? Game.getObjectById(flag.memory.strI) : undefined
      if (storage1) return storage1.room.name

      const terminal1 = flag.memory.trmI ? Game.getObjectById(flag.memory.trmI) : undefined
      if (terminal1) return terminal1.room.name
    }
  }

  const controller = creep.memory.ctlI ? Game.getObjectById(creep.memory.ctlI) : undefined
  if (controller) return controller.room.name

  return undefined
}

plunder.moveAndLoad = function (creep, target) {
  if (creep.pos.isNearTo(target)) {
    const resources = _.shuffle(Object.keys(target.store))
    for (const resourceType in resources) {
      const rc = creep.withdraw(target, resourceType)
      if (rc === OK) break
    }
  } else {
    creep.moveToWrapper(
      target,
      {
        costCallback: mapUtils.costCallback_costMatrixWithUnwalkableBorders,
        reusePath: 10,
        range: 1
      }
    )
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
  if (creep.room.my) {
    this.creepAtOwnRoom(creep)
  } else {
    this.creepAtOtherRooms(creep)
  }
}

plunder.creepRoomTravel = function (creep) {
  // keep track of closest owned stuff

  const flag = Game.flags[creep.getFlagName()]

  if (creep.room.my) {
    if (creep.room.storage) {
      creep.memory.strI = creep.room.storage.id
      if (flag) flag.memory.strI = creep.memory.strI
    }

    if (creep.room.terminal) {
      creep.memory.trmI = creep.room.terminal.id
      if (flag) flag.memory.trmI = creep.memory.trmI
    }

    if (creep.room.controller) {
      creep.memory.ctlI = creep.room.controller.id
      if (flag) flag.memory.ctlI = creep.memory.ctlI
    }
  }

  this._creepRoomTravel(creep)
}

plunder.flagPrepare = function (flag) {
  if (flag.room) {
    if (flag.room.__breached === false) {
      return this.FLAG_IGNORE
    }
  }

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
