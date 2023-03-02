'use strict'

const bootstrap = require('./bootstrap')

// anything that get benefits
Creep.prototype.myOrAlly = function () {
  return this.my || this.ally
}

// anycreep who is not `my` but do not get harmful effects
Creep.prototype.allyOrNeutral = function () {
  return this.ally || this.neutral
}

Creep.prototype.moveWrapper = function (direction) {
  return this.move(direction)
}

Creep.prototype.moveToWrapper = function (destination, options = { }) {
  return this.moveTo(destination, bootstrap.moveOptionsWrapper(this, options))
}

Flag.prototype.getValue = function () {
  switch (this.color) {
    case COLOR_PURPLE:
      return 6
    case COLOR_RED:
      return 5
    case COLOR_ORANGE:
      return 3
    case COLOR_YELLOW:
      return 2
    case COLOR_GREEN:
      return 1
    case COLOR_BLUE:
    case COLOR_CYAN:
      return 0
    default:
      return -1
  }
}

Flag.prototype.setValue = function (newValue) {
  let newColor = COLOR_WHITE

  if (newValue >= 6) {
    newColor = COLOR_PURPLE
  } else if (newValue === 5) {
    newColor = COLOR_RED
  } else if (newValue >= 3) {
    newColor = COLOR_ORANGE
  } else if (newValue === 2) {
    newColor = COLOR_YELLOW
  } else if (newValue === 1) {
    newColor = COLOR_GREEN
  } else if (newValue === 0) {
    newColor = COLOR_BLUE
  }

  if (this.color !== newColor) {
    this.setColor(newColor, newColor)
  }
}

Flag.prototype.setSecondaryColor = function (newColor) {
  if (this.secondaryColor === newColor) {
    return
  }

  this.setColor(this.color, newColor)
}

Flag.prototype.resetSecondaryColor = function () {
  if (this.color === this.secondaryColor) {
    return
  }

  this.setColor(this.color, this.color)
}

// anything that get benefits
OwnedStructure.prototype.myOrAlly = function () {
  return this.my || this.ally
}

Room.prototype.level = function () {
  if (!this.my) return 0

  if (this.__level) return this.__level

  const totalCapacity = this.energyCapacityAvailable

  const extensionCapacity = EXTENSION_ENERGY_CAPACITY[this.controller.level]

  for (let i = 0; i <= this.controller.level; ++i) {
    const canHaveSpawns = CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][i]
    const canHaveExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][i]

    const maxTotalCapacity = canHaveSpawns * SPAWN_ENERGY_CAPACITY + canHaveExtensions * extensionCapacity

    if (totalCapacity >= maxTotalCapacity) {
      this.__level = i
    } else {
      break
    }
  }

  return this.__level
}

/**
Get a list of creeps assigned to a room, cached
**/
Room.prototype.getRoomControlledCreeps = function () {
  if (this.__roomCreeps === undefined) {
    this.__roomCreeps = _.filter(
      Game.creeps,
      function (creep) {
        // check room
        if (creep.memory.crum !== this.name) {
          return false
        }

        // loaded plunder are given to controllers when they are in room
        if (creep.shortcut === 'plunder' && creep.store.getUsedCapacity() > 0) {
          return true
        }

        // control non-tasked
        return creep.shortcut === '__no_flag__'
      },
      this
    )
  }

  return this.__roomCreeps
}

Room.prototype.extendedOwnerUsername = function () {
  return Game.iff.extendedOwnerUsername(this.controller)
}

Room.prototype.myOrMyReserved = function () {
  if (this.my) return true

  const username = this.extendedOwnerUsername()
  return Game.iff.ownUsername === username
}

Room.prototype.myOrAlly = function () {
  return this.myOrMyReserved() || this.ally
}

Room.prototype.ownedOrReserved = function () {
  return this.controller && (this.controller.owner || this.controller.reservation)
}

Room.prototype.sourceKeeper = function () {
  this.memory.nodeAccessed = Game.time

  if (this.memory.srck !== undefined) {
    return this.memory.srck
  }

  const keeperLairs = this.find(
    FIND_STRUCTURES,
    {
      filter: { structureType: STRUCTURE_KEEPER_LAIR }
    }
  ).length

  this.memory.srck = keeperLairs > 0

  return this.memory.srck
}

Room.prototype.sourceEnergyCapacity = function () {
  if (this.ownedOrReserved()) {
    return SOURCE_ENERGY_CAPACITY
  }

  if (this.sourceKeeper()) {
    return SOURCE_ENERGY_KEEPER_CAPACITY
  }

  return SOURCE_ENERGY_NEUTRAL_CAPACITY
}

Room.prototype.extendedAvailableEnergyCapacity = function () {
  if (!this.my) return 0

  if (this.__extendedAvailableEnergyCapacity) return this.__extendedAvailableEnergyCapacity

  // if there are no spawns in this room, nothing will help
  if (!_.some(this.spawns)) {
    this.__extendedAvailableEnergyCapacity = 0
    return this.__extendedAvailableEnergyCapacity
  }

  // if there are no workers, only dribble will help
  if (!_.some(this.getRoomControlledCreeps(), _.matchesProperty('memory.btyp', 'worker'))) {
    this.__extendedAvailableEnergyCapacity = SPAWN_ENERGY_CAPACITY
    return this.__extendedAvailableEnergyCapacity
  }

  this.__extendedAvailableEnergyCapacity = this.energyCapacityAvailable
  return this.__extendedAvailableEnergyCapacity
}

RoomPosition.prototype.offBorderDistance = function () {
  return Math.max(Math.min(this.x, this.y, 49 - this.x, 49 - this.y) - 1, 0)
}

RoomPosition.prototype.squareArea = function (squareStep) {
  const t = Math.max(this.y - squareStep, 0)
  const l = Math.max(this.x - squareStep, 0)
  const b = Math.min(this.y + squareStep, 49)
  const r = Math.min(this.x + squareStep, 49)

  return [t, l, b, r]
}

RoomPosition.prototype.findInSquareArea = function (lookForType, squareStep, filterFunction = undefined) {
  const [t, l, b, r] = this.squareArea(squareStep)
  const items = Game.rooms[this.roomName].lookForAtArea(lookForType, t, l, b, r, true)

  for (const itemKey in items) {
    const item = items[itemKey][lookForType]

    if (filterFunction) {
      if (filterFunction(item)) {
        return item.id
      }
    } else {
      return item.id
    }
  }

  return undefined
}

RoomPosition.prototype.hasInSquareArea = function (lookForType, squareStep, filterFunction = undefined) {
  const id = this.findInSquareArea(lookForType, squareStep, filterFunction)
  return id !== undefined
}

RoomPosition.prototype.findSharedAdjacentPositions = function (otherRoomPosition) {
  if (this.roomName !== otherRoomPosition.roomName) return []

  const adx = this.x - otherRoomPosition.x
  const ady = this.y - otherRoomPosition.y

  // there are no adjacent positions if positions are too far away
  if (Math.abs(adx) > 2 || Math.abs(ady) > 2) return []

  const aroundAsMap = function (pos) {
    const result = { }

    for (let dx = -1; dx <= 1; ++dx) {
      for (let dy = -1; dy <= 1; ++dy) {
        if (dx === 0 && dy === 0) continue

        const x = pos.x + dx
        const y = pos.y + dy

        if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue

        result[(x + 1) + 100 * (y + 1)] = new RoomPosition(x, y, pos.roomName)
      }
    }

    return result
  }

  const fromThis = aroundAsMap(this)
  const fromOther = aroundAsMap(otherRoomPosition)

  const intersections = _.intersection(_.keys(fromThis), _.keys(fromOther))

  const result = []
  for (const index of intersections) {
    result.push(fromThis[index])
  }

  return result
}

RoomPosition.prototype.createFlagWithValue = function (flagName, flagValue) {
  let color = COLOR_WHITE

  if (flagValue >= 6) {
    color = COLOR_PURPLE
  } else if (flagValue === 5) {
    color = COLOR_RED
  } else if (flagValue >= 3) {
    color = COLOR_ORANGE
  } else if (flagValue === 2) {
    color = COLOR_YELLOW
  } else if (flagValue === 1) {
    color = COLOR_GREEN
  } else if (flagValue === 0) {
    color = COLOR_BLUE
  }

  return this.createFlag(flagName, color)
}

RoomPosition.prototype.manhattanDistance = function (otherRoomPosition) {
  return Math.abs(this.x - otherRoomPosition.x) + Math.abs(this.y - otherRoomPosition.y)
}

Structure.prototype.isActiveSimple = true

Structure.prototype.getFromMemory = function (key) {
  if (!Memory.structures) return undefined
  if (!Memory.structures[this.id]) return undefined

  Memory.structures[this.id].nodeAccessed = Game.time

  return Memory.structures[this.id][key]
}

Structure.prototype.setToMemory = function (key, value) {
  if (!Memory.structures) Memory.structures = { }
  if (!Memory.structures[this.id]) Memory.structures[this.id] = { }

  Memory.structures[this.id].nodeAccessed = Game.time

  Memory.structures[this.id][key] = value
}

const _isSourceKey_ = 'isSource'

StructureContainer.prototype.isSource = function () {
  let result = this.getFromMemory(_isSourceKey_)

  if (result === undefined) {
    result = this.pos.hasInSquareArea(LOOK_SOURCES, 1)
    this.setToMemory(_isSourceKey_, result)
  }

  return result
}

StructureLink.prototype.isSource = function () {
  let result = this.getFromMemory(_isSourceKey_)

  if (result === undefined) {
    result = this.pos.hasInSquareArea(LOOK_SOURCES, 2)
    this.setToMemory(_isSourceKey_, result)
  }

  return result
}

StructureTerminal.prototype._caclTransactionAmount = function (roomTo) {
  // how much sending 1000 costs
  const c1000 = Game.market.calcTransactionCost(1000, this.room.name, roomTo)
  if (c1000 === 0) {
    return 0
  }

  // how many times 1000 can be sent
  const energy = this.store[RESOURCE_ENERGY]
  const times = energy / c1000

  // how many can be sent
  return Math.floor(1000 * times)
}

/**
Try to sell as much as possible for order.
@param {Order} order to be sold to.
@param {integer} keep = 0 how many to keep at terminal.
@return result of deal or other error codes.
**/
StructureTerminal.prototype.autoSell = function (order, keep = 0) {
  if (order.type === ORDER_BUY) {
    const has = this.store[order.resourceType]
    if (has === undefined || has <= keep) {
      return ERR_NOT_ENOUGH_RESOURCES
    }

    const maxAmount = this._caclTransactionAmount(order.roomName)

    if (maxAmount < 1) {
      return ERR_NOT_ENOUGH_ENERGY
    }

    const amount = Math.min(has - keep, maxAmount, order.amount)

    return Game.market.deal(order.id, amount, this.room.name)
  }

  return ERR_INVALID_ARGS
}

const extensions = {
  shortcuts: function () {
    const cutShort = function (name) {
      const index = name.indexOf('_')

      // don't cut names starting with _
      if (index > 0) {
        return name.substring(0, index)
      } else {
        return name
      }
    }

    Game.creepsById = { }
    Game.spawnsById = { }
    Game.storages = { }
    Game.extractors = { }
    Game.labs = { }
    Game.terminals = { }
    Game.factories = { }
    Game.observers = { }
    Game.powerSpawns = { }
    Game.nukers = { }

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]

      room.flags = { }
      room.creeps = { }
      room.spawns = { }
      room.extensions = { }
      room.towers = { }
      room.links = { }
      room.labs = { }
    }

    for (const flagName in Game.flags) {
      const flag = Game.flags[flagName]
      flag.shortcut = cutShort(flag.name)

      if (flag.room) {
        flag.room.flags[flagName] = flag
      }
    }

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName]

      Game.creepsById[creep.id] = creep
      creep.room.creeps[creep.id] = creep

      if (creep.memory.flag) {
        creep.flag = Game.flags[creep.memory.flag]
        creep.shortcut = cutShort(creep.memory.flag)
      } else {
        creep.flag = undefined
        creep.shortcut = '__no_flag__'
      }
    }

    Game.flagsByShortcut = _.groupBy(Game.flags, _.property('shortcut'))
    Game.creepsByShortcut = _.groupBy(Game.creeps, _.property('shortcut'))

    for (const id in Game.structures) {
      const structure = Game.structures[id]

      switch (structure.structureType) {
        case STRUCTURE_SPAWN:
          Game.spawnsById[structure.id] = structure
          structure.room.spawns[structure.id] = structure
          break
        case STRUCTURE_EXTENSION:
          structure.room.extensions[structure.id] = structure
          break
        case STRUCTURE_TOWER:
          structure.room.towers[structure.id] = structure
          break
        case STRUCTURE_STORAGE:
          Game.storages[structure.id] = structure
          break
        case STRUCTURE_LINK:
          structure.room.links[structure.id] = structure
          break
        case STRUCTURE_EXTRACTOR:
          Game.extractors[structure.id] = structure
          structure.room.extractor = structure
          break
        case STRUCTURE_LAB:
          Game.labs[structure.id] = structure
          structure.room.labs[structure.id] = structure
          break
        case STRUCTURE_TERMINAL:
          Game.terminals[structure.id] = structure
          break
        case STRUCTURE_FACTORY:
          Game.factories[structure.id] = structure
          structure.room.factory = structure
          break
        case STRUCTURE_OBSERVER:
          Game.observers[structure.id] = structure
          structure.room.observer = structure
          break
        case STRUCTURE_POWER_SPAWN:
          Game.powerSpawns[structure.id] = structure
          structure.room.powerSpawn = structure
          break
        case STRUCTURE_NUKER:
          Game.nukers[structure.id] = structure
          structure.room.nuker = structure
          break
      }
    }
  }
}

module.exports = extensions
