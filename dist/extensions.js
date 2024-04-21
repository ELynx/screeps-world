'use strict'

const bootstrap = require('./bootstrap')

Object.defineProperty(
  Creep.prototype,
  'viable',
  {
    get: function () {
      if (this.spawning) return true

      const limit = this.__viable_value || (this.body.length * CREEP_SPAWN_TIME)

      return this.ticksToLive >= limit
    },
    set: function (value) {
      this.__viable_value = value
    },
    configurable: true,
    enumerable: true
  }
)

// anything that get benefits
Creep.prototype.myOrAlly = function () {
  return this.my || this.ally
}

// anycreep who is not `my` but do not get harmful effects
Creep.prototype.allyOrNeutral = function () {
  return this.ally || this.neutral
}

Creep.prototype.rememberPosition = function () {
  this.memory._pos =
  {
    from:
    {
      x: this.pos.x,
      y: this.pos.y,
      room: this.pos.roomName
    },
    time: Game.time,
    room: this.room.name
  }
}

Creep.prototype.forgetPosition = function () {
  this.memory._pos = undefined
}

Creep.prototype.moved = function () {
  // quick reference
  const mempos = this.memory._pos

  if (mempos === undefined) return undefined

  if (Game.time > mempos.time + 1) {
    this.forgetPosition()
    return undefined
  }

  if (this.room.name !== mempos.room) {
    this.forgetPosition()
    return undefined
  }

  return this.pos.x !== mempos.from.x || this.pos.y !== mempos.from.y || this.pos.roomName !== mempos.from.room
}

Creep.prototype._refreshMove = function () {
  if (this.memory._move) {
    this.memory._move.time = Game.time
  }

  if (this.memory._stop) {
    this.memory._stop.time = Game.time
  }
}

Creep.prototype.fatigueWrapper = function () {
  this._refreshMove()

  if (this.memory._pos) {
    this.memory._pos.time = Game.time
  }

  return OK
}

if (!Creep.prototype.__original_move) {
  Creep.prototype.__original_move = Creep.prototype.move

  Creep.prototype.move = function (creepOrDirection) {
    const rc = this.__original_move(creepOrDirection)

    if (rc === OK) {
      if (_.isFinite(creepOrDirection)) {
        this._direction_ = creepOrDirection
        const [dx, dy] = bootstrap.directionToDelta[this._direction_]
        this._next_pos_ = new RoomPosition(this.pos.x + dx, this.pos.y + dy, this.pos.roomName)
      } else if (_.isObject(creepOrDirection)) {
        this._next_pos_ = creepOrDirection.pos
        this._direction_ = this.pos.getDirectionTo(this._next_pos_)
      }
    }

    return rc
  }
}

Creep.prototype.moveWrapper = function (direction, options = { }) {
  if (this.fatigue > 0) {
    return this.fatigueWrapper()
  }

  let actualDirection = direction

  if (options.jiggle === true) {
    if (this.moved() === false) {
      const adjacentDirections = bootstrap.adjacentDirections[direction]
      actualDirection = adjacentDirections[Game.time % 2]
    }
  }

  this.rememberPosition()

  return this.move(actualDirection)
}

Creep.prototype.moveToWrapper = function (destination, options = { }) {
  if (this.fatigue > 0) {
    return this.fatigueWrapper()
  }

  // quick cheap check that is in real code buried quite deep
  if (options.noPathFinding === true) {
    if (this.memory._move === undefined) {
      return ERR_NOT_FOUND
    }
  }

  if (this.moved()) {
    this._refreshMove()
  }

  this.rememberPosition()

  // even if was set, force to false
  options.serializeMemory = false

  const rc = this.moveTo(destination, bootstrap.moveOptionsWrapper(this, options))

  // stash a copy for fast use and serialize
  if (this.memory._move && _.isArray(this.memory._move.path)) {
    this._move_path_ = this.memory._move.path.slice(0)
    this.memory._move.path = Room.serializePath(this.memory._move.path)
  }

  if (options.rememberStop === true) {
    if (this._move_path_) {
      const stop = _.last(this._move_path_)
      if (stop) {
        bootstrap.rememberPositionAsStop(this, stop)
      }
    }
  }

  return rc
}

Creep.prototype.blockPosition = function () {
  this.room.blocked.push(
    {
      x: this.pos.x,
      y: this.pos.y
    }
  )
}

Creep.prototype.blockStop = function () {
  if (this.memory._stop) {
    this.room.blocked.push(
      {
        x: this.memory._stop.stop.x,
        y: this.memory._stop.stop.y
      }
    )
  }
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
  if (!this._my_) return 0

  if (this.__level_value) return this.__level_value

  const totalCapacity = this.energyCapacityAvailable

  const extensionCapacity = EXTENSION_ENERGY_CAPACITY[this.controller.level]

  for (let i = 0; i <= this.controller.level; ++i) {
    const canHaveSpawns = CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][i]
    const canHaveExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][i]

    const maxTotalCapacity = canHaveSpawns * SPAWN_ENERGY_CAPACITY + canHaveExtensions * extensionCapacity

    if (totalCapacity >= maxTotalCapacity) {
      this.__level_value = i
    } else {
      break
    }
  }

  return this.__level_value
}

Room.prototype.getRoomControlledCreeps = function () {
  if (this.__getRoomControlledCreeps_creeps === undefined) {
    const toFilter = Game.creepsByCrum[this.name] || { }

    this.__getRoomControlledCreeps_creeps = _.filter(
      toFilter,
      function (creep) {
        if (creep.spawning) {
          return false
        }

        // loaded plunder are given to controllers when they are in `own` rooms
        if (this._my_ && creep.shortcut === 'plunder' && creep.store.getUsedCapacity() > 0) {
          return true
        }

        // control non-tasked
        return creep.shortcut === '__no_flag__'
      },
      this
    )
  }

  return this.__getRoomControlledCreeps_creeps
}

Room.prototype.getRoomControlledWorkers = function () {
  if (this.__getRoomControlledWorkers_creeps === undefined) {
    this.__getRoomControlledWorkers_creeps = _.filter(this.getRoomControlledCreeps(), _.matchesProperty('memory.btyp', 'worker'))
  }

  return this.__getRoomControlledWorkers_creeps
}

Room.prototype.getViableRoomOwnedCreeps = function () {
  if (this.__getViableRoomOwnedCreeps_creeps === undefined) {
    this.__getViableRoomOwnedCreeps_creeps = _.filter(
      Game.creeps,
      function (creep) {
        return creep.viable && (this.name === (creep.memory.frum || creep.memory.crum))
      },
      this
    )
  }

  return this.__getViableRoomOwnedCreeps_creeps
}

Room.prototype.extendedOwnerUsername = function () {
  return Game.iff.extendedOwnerUsername(this.controller)
}

Room.prototype.myOrMyReserved = function () {
  if (this._my_) return true

  const username = this.extendedOwnerUsername()
  return Game.iff.ownUsername === username
}

Room.prototype.myReserved = function () {
  if (this._my_) return false

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
  if (!this._my_) return 0

  if (this.__extendedAvailableEnergyCapacity_value) return this.__extendedAvailableEnergyCapacity_value

  // if there are no spawns in this room, nothing will help
  if (!_.some(this.spawns)) {
    this.__extendedAvailableEnergyCapacity_value = 0
    return this.__extendedAvailableEnergyCapacity_value
  }

  // if there are no workers, only dribble will help
  if (this.getRoomControlledWorkers().length === 0) {
    this.__extendedAvailableEnergyCapacity_value = SPAWN_ENERGY_CAPACITY
    return this.__extendedAvailableEnergyCapacity_value
  }

  this.__extendedAvailableEnergyCapacity_value = this.energyCapacityAvailable
  return this.__extendedAvailableEnergyCapacity_value
}

RoomPosition.prototype.offBorderDistance = function () {
  return Math.max(Math.min(this.x, this.y, 49 - this.x, 49 - this.y) - 1, 0)
}

RoomPosition.prototype.squareArea = function (squareStep) {
  const top___ = Math.max(this.y - squareStep, 0)
  const left__ = Math.max(this.x - squareStep, 0)
  const bottom = Math.min(this.y + squareStep, 49)
  const right_ = Math.min(this.x + squareStep, 49)

  return [top___, left__, bottom, right_]
}

RoomPosition.prototype.findInSquareArea = function (lookForType, squareStep, filterFunction = undefined) {
  const [t, l, b, r] = this.squareArea(squareStep)
  const items = Game.rooms[this.roomName].lookForAtArea(lookForType, t, l, b, r, true)

  for (const itemInfo of items) {
    const item = itemInfo[lookForType]

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
  // with a twist
  const dx = Math.abs(this.x - otherRoomPosition.x)
  const dy = Math.abs(this.y - otherRoomPosition.y)

  // in screeps geometry center and adjacent positions are reachable
  if (dx <= 1 && dy <= 1) return 1

  return dx + dy
}

Structure.prototype.isActiveSimple = true

if (!Structure.prototype.__original_isActive) {
  Structure.prototype.__original_isActive = Structure.prototype.isActive

  Structure.prototype.isActive = function () {
    return this.isActiveSimple
  }
}

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

StructureController.prototype.canActivateSafeMode = function () {
  if (this.safeMode) return false
  if (this.safeModeCooldown) return false
  if (this.upgradeBlocked) return false

  return this.safeModeAvailable > 0
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

    Game.myCreepsCount = 0

    Game.rooms_values = []

    Game.creepsById = new Map()
    Game.storages = new Map()
    Game.extractors = new Map()
    Game.labs = new Map()
    Game.terminals = new Map()
    Game.factories = new Map()
    Game.observers = new Map()
    Game.powerSpawns = new Map()
    Game.nukers = new Map()

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      // cachge property that is actually a function call
      room._my_ = room.my

      Game.rooms_values.push(room)

      room.myCreepsCount = 0

      room.flags = new Map()
      room.spawns = new Map()
      room.extensions = new Map()
      room.towers = new Map()
      room.links = new Map()
      room.labs = new Map()

      room.blocked = []
    }

    for (const flagName in Game.flags) {
      const flag = Game.flags[flagName]
      flag.shortcut = cutShort(flag.name)

      if (flag.room) {
        flag.room.flags[flagName] = flag
      }
    }

    for (const creepName in Game.creeps) {
      Game.myCreepsCount += 1

      const creep = Game.creeps[creepName]

      Game.creepsById[creep.id] = creep
      creep.room.myCreepsCount += 1

      if (creep.memory.flag) {
        creep.flag = Game.flags[creep.memory.flag]
        creep.shortcut = cutShort(creep.memory.flag)
      } else {
        creep.flag = undefined
        creep.shortcut = '__no_flag__'
      }

      creep.__extensions__crumGroupBy_value = creep.memory.crum || '__no_crum__'
    }

    Game.flagsByShortcut = _.groupBy(Game.flags, _.property('shortcut'))
    Game.creepsByShortcut = _.groupBy(Game.creeps, _.property('shortcut'))
    Game.creepsByCrum = _.groupBy(Game.creeps, _.property('__extensions__crumGroupBy_value'))

    for (const id in Game.structures) {
      const structure = Game.structures[id]

      switch (structure.structureType) {
        case STRUCTURE_SPAWN:
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
        default:
          break
      }
    }
  }
}

module.exports = extensions
