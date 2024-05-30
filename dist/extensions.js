'use strict'

const bootstrap = require('./bootstrap')

Object.defineProperty(
  Creep.prototype,
  'viable',
  {
    get () {
      if (this.spawning) return true

      const limit = this.__viable_value || (this.body.length * CREEP_SPAWN_TIME)

      return this.ticksToLive >= limit
    },
    set (value) {
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
  const _pos = this.memory._pos

  if (_pos === undefined) return undefined

  if (Game.time > _pos.time + 1) {
    this.forgetPosition()
    return undefined
  }

  if (this.room.name !== _pos.room) {
    this.forgetPosition()
    return undefined
  }

  return this.pos.x !== _pos.from.x || this.pos.y !== _pos.from.y || this.pos.roomName !== _pos.from.room
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

const PreferTop = [TOP, TOP, BOTTOM]
const PreferRight = [RIGHT, RIGHT, LEFT]
const PreferBottom = [TOP, BOTTOM, BOTTOM]
const PreferLeft = [RIGHT, LEFT, LEFT]

Creep.prototype.march = function (direction) {
  if (direction !== TOP && direction !== RIGHT && direction !== BOTTOM && direction !== LEFT) {
    console.log('Unexpected march for creep ' + this + ' in direction [' + direction + ']')
    return ERR_INVALID_ARGS
  }

  if (this.fatigue > 0) {
    return this.fatigueWrapper()
  }

  if (this.moved()) {
    this._refreshMove()
  }

  this.rememberPosition()

  if (this.memory._move) {
    if (this.memory._move.room !== this.pos.roomName) {
      bootstrap.imitateMoveErase(this)
      // continue below
    } else {
      const followExistingPathOptions = {
        noPathFinding: true,
        reusePath: _.random(3, 5),
        serializeMemory: true
      }

      const rc = this.moveTo(this.memory._move.dest.x, this.memory._move.dest.y, followExistingPathOptions)

      if (rc < OK) {
        console.log('Unexpected moveTo response for creep ' + this + ' [' + rc + ']')
        bootstrap.imitateMoveErase(this)
        // continue below as recovery strategy
      } else {
        return rc
      }
    }
  }

  // portals are avoided, no need to provision
  // https://github.com/screeps/engine/blob/97c9d12385fed686655c13b09f5f2457dd83a2bf/src/game/rooms.js#L164
  let findNewPathOptions = {
    ignoreCreeps: this.room.isHighway(),
    reusePath: _.random(3, 5),
    serializeMemory: true
  }
  let optionsWrapped = false

  const terrain = this.room.getTerrain()
  const delta = bootstrap.directionToDelta[direction]
  const xAhead = this.pos.x + delta[0]
  const yAhead = this.pos.y + delta[1]
  const maskAhead = terrain.get(xAhead, yAhead)

  let needPathfinding = false

  if (maskAhead === TERRAIN_MASK_SWAMP) {
    findNewPathOptions = bootstrap.moveOptionsWrapper(this, findNewPathOptions)
    optionsWrapped = true

    needPathfinding = !findNewPathOptions.ignoreRoads
  }

  if (!needPathfinding && this.moved() === false) {
    needPathfinding = true
  }

  if (needPathfinding) {
    if (!optionsWrapped) {
      findNewPathOptions = bootstrap.moveOptionsWrapper(this, findNewPathOptions)
      optionsWrapped = true
    }

    let xStart = 0
    let xEnd = 49
    let yStart = 0
    let yEnd = 49

    if (direction === TOP) yEnd = 0
    if (direction === RIGHT) xStart = 49
    if (direction === BOTTOM) yStart = 49
    if (direction === LEFT) xEnd = 0

    const goals = []
    for (let x1 = xStart; x1 <= xEnd; ++x1) {
      for (let y1 = yStart; y1 <= yEnd; ++y1) {
        const maskOnBorder = terrain.get(x1, y1)
        if (maskOnBorder !== TERRAIN_MASK_WALL) {
          goals.push(new RoomPosition(x1, y1, this.pos.roomName))
        }
      }
    }

    if (goals.length > 0) {
      const destination = _.sample(goals)
      return this.moveTo(destination, findNewPathOptions)
    }

    return ERR_NOT_FOUND
  }

  let marchDirection = direction

  if (maskAhead === TERRAIN_MASK_WALL) {
    // coordinate checks inside steer creep towards center
    if (direction === TOP || direction === BOTTOM) {
      if (xAhead < 25) marchDirection = _.sample(PreferRight)
      else marchDirection = _.sample(PreferLeft)
    } else if (direction === RIGHT || direction === LEFT) {
      if (yAhead < 25) marchDirection = _.sample(PreferBottom)
      else marchDirection = _.sample(PreferTop)
    }
  }

  return this.move(marchDirection)
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
      creep => {
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
      creep => {
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

Room.prototype.mineralType = function () {
  this.memory.nodeAccessed = Game.time

  if (this.memory.mnrl !== undefined) {
    return this.memory.mnrl
  }

  const minerals = this.find(FIND_MINERALS)
  for (const mineral of minerals) {
    this.memory.mnrl = mineral.mineralType
  }

  if (this.memory.mnrl === undefined) {
    this.memory.mnrl = ''
  }

  return this.memory.mnrl
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
  if (this.spawns.size === 0) {
    this.__extendedAvailableEnergyCapacity_value = 0
    return this.__extendedAvailableEnergyCapacity_value
  }

  // if there are no workers, dribble or what is left
  if (this.getRoomControlledWorkers().length === 0) {
    this.__extendedAvailableEnergyCapacity_value = Math.max(SPAWN_ENERGY_CAPACITY, this.energyAvailable)
    return this.__extendedAvailableEnergyCapacity_value
  }

  this.__extendedAvailableEnergyCapacity_value = this.energyCapacityAvailable
  return this.__extendedAvailableEnergyCapacity_value
}

const MarkNumbers = new Map()
MarkNumbers.set(1, '1')
MarkNumbers.set(10, '2')
MarkNumbers.set(2, '3')
MarkNumbers.set(20, '4')
MarkNumbers.set(12, '5')
MarkNumbers.set(21, '6')
MarkNumbers.set(13, '7')
MarkNumbers.set(31, '8')
MarkNumbers.set(23, '9')
MarkNumbers.set(32, 'A')

Room.prototype.__assignLabMarks = function () {
  const labsArr = Array.from(this.labs.values())

  let xMin = 50
  let xMax = -1
  let yMin = 50
  let yMax = -1
  for (const lab of labsArr) {
    const x = lab.pos.x
    const y = lab.pos.y

    if (x < xMin) xMin = x
    if (x > xMax) xMax = x
    if (y < yMin) yMin = y
    if (y > yMax) yMax = y
  }

  let xRef
  let yRef
  if (this.terminal) {
    xRef = this.terminal.pos.x
    yRef = this.terminal.pos.y
  } else {
    xRef = this.controller.pos.x
    yRef = this.controller.pos.y
  }

  let xStart
  let xEnd
  if (Math.abs(xMin - xRef) < Math.abs(xMax - xRef)) {
    xStart = xMin
    xEnd = xMax
  } else {
    xStart = xMax
    xEnd = xMin
  }

  let yStart
  let yEnd
  if (Math.abs(yMin - yRef) < Math.abs(yMax - yRef)) {
    yStart = yMin
    yEnd = yMax
  } else {
    yStart = yMax
    yEnd = yMin
  }

  const xStep = Math.sign(xEnd - xStart)
  const yStep = Math.sign(yEnd - yStart)
  if (xStep === 0 || yStep === 0) {
    console.log('Cannot allocate marks for room [' + this.name + ']')
    return
  }

  for (const lab of labsArr) {
    const dx = lab.pos.x - xStart
    const dy = lab.pos.y - yStart
    const xNo = dx / xStep
    const yNo = dy / yStep
    const no = xNo * 10 + yNo
    const mark = MarkNumbers.get(no)
    if (!mark) {
      console.log('Cannot allocate mark for lab ' + lab)
      continue
    }
    lab.setMark(mark)
    lab.__extensions__mark = mark
  }

  console.log('Assignment of marks is complete for room [' + this.name + ']')
}

Room.prototype._assignLabMarks = function () {
  if (this.labs.size === 0) return
  if (this.__extensions__mark__done) return

  let hasWork = false
  for (const lab of this.labs.values()) {
    if (lab.__extensions__mark === undefined) lab.__extensions__mark = lab.mark()
    if (lab.__extensions__mark === 'X') {
      hasWork = true
    }
  }

  if (hasWork) {
    this.__assignLabMarks()
  }

  this.__extensions__mark__done = true
}

Room.prototype.setLabRecepie = function (mark, isSource, resourceType, input, silent = false) {
  // also sets the cache
  this._assignLabMarks()

  for (const lab of this.labs.values()) {
    if (lab.__extensions__mark === mark) {
      lab.setSource(isSource)
      lab.setResourceType(resourceType)
      lab.setInput(input)
      return
    }
  }

  if (silent) return

  console.log('Lab with mark [' + mark + '] not found in room [' + this.name + ']')
}

Room.prototype.isHighway = function () {
  if (this.controller) return false
  return bootstrap.isHighwayRoomName(this.name)
}

Room.prototype.isHighwayCrossing = function () {
  if (this.controller) return false
  return bootstrap.isHighwayCrossingRoomName(this.name)
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

RoomPosition.prototype.manhattanDistance = function (other) {
  const dx = Math.abs(this.x - other.x)
  const dy = Math.abs(this.y - other.y)

  // with a twist
  // in screeps geometry center and adjacent positions are reachable
  if (dx <= 1 && dy <= 1) return 1

  return dx + dy
}

RoomPosition.prototype.getRoomLinearDistance = function (other, contineous = false) {
  // use notation that allows for blind distance
  return Game.map.getRoomLinearDistance(this.roomName, other.roomName, contineous)
}

RoomPosition.prototype.isHighway = function () {
  return bootstrap.isHighwayRoomName(this.roomName)
}

RoomPosition.prototype.isHighwayCrossing = function () {
  return bootstrap.isHighwayCrossingRoomName(this.roomName)
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

const _inputKey_ = 'input'
const _isSourceKey_ = 'isSource'
const _markKey_ = 'mark'
const _resourceTypeKey_ = 'resourceType'

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

StructureLab.prototype.isSource = function () {
  return this.getFromMemory(_isSourceKey_)
}

StructureLab.prototype.setSource = function (flag) {
  this.setToMemory(_isSourceKey_, flag)
}

StructureLab.prototype.resourceType = function () {
  const result = this.getFromMemory(_resourceTypeKey_)

  if (result === undefined) {
    return ''
  }

  return result
}

StructureLab.prototype.setResourceType = function (resourceType) {
  this.setToMemory(_resourceTypeKey_, resourceType)
}

StructureLab.prototype.mark = function () {
  return this.getFromMemory(_markKey_) || 'X'
}

StructureLab.prototype.setMark = function (mark) {
  this.setToMemory(_markKey_, mark)
}

StructureLab.prototype.input = function () {
  return this.getFromMemory(_inputKey_)
}

StructureLab.prototype.setInput = function (input) {
  this.setToMemory(_inputKey_, input)
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
@param {integer} amount to be sold
@return result of deal or other error codes.
**/
StructureTerminal.prototype.autoSell = function (order, amount) {
  if (order.type === ORDER_BUY) {
    const has = this.store.getUsedCapacity(order.resourceType)

    if (has === undefined || has <= 0) {
      return [ERR_NOT_ENOUGH_RESOURCES, 0]
    }

    const canBeTransferred = this._caclTransactionAmount(order.roomName)

    if (canBeTransferred < 1) {
      return [ERR_NOT_ENOUGH_ENERGY, 0]
    }

    const actualAmount = Math.min(amount, has, canBeTransferred, order.amount)

    return [Game.market.deal(order.id, actualAmount, this.room.name), actualAmount]
  }

  return [ERR_INVALID_ARGS, undefined]
}

StructureTerminal.prototype.autoSend = function (resourceType, amount, destination, description = undefined) {
  const has = this.store.getUsedCapacity(resourceType)

  if (has === undefined || has <= 0) {
    return [ERR_NOT_ENOUGH_RESOURCES, 0]
  }

  const canBeTransferred = this._caclTransactionAmount(destination)

  if (canBeTransferred < 1) {
    return [ERR_NOT_ENOUGH_ENERGY, 0]
  }

  const actualAmount = Math.min(amount, canBeTransferred)

  return [this.send(resourceType, actualAmount, destination, description), actualAmount]
}

const extensions = {
  shortcuts () {
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
      room.traps = []
    }

    for (const flagName in Game.flags) {
      const flag = Game.flags[flagName]
      flag.shortcut = cutShort(flag.name)

      if (flag.room) {
        flag.room.flags.set(flagName, flag)
      }
    }

    for (const creepName in Game.creeps) {
      Game.myCreepsCount += 1

      const creep = Game.creeps[creepName]

      Game.creepsById.set(creep.id, creep)
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
          structure.room.spawns.set(structure.id, structure)
          break
        case STRUCTURE_EXTENSION:
          structure.room.extensions.set(structure.id, structure)
          break
        case STRUCTURE_TOWER:
          structure.room.towers.set(structure.id, structure)
          break
        case STRUCTURE_STORAGE:
          Game.storages.set(structure.id, structure)
          break
        case STRUCTURE_LINK:
          structure.room.links.set(structure.id, structure)
          break
        case STRUCTURE_EXTRACTOR:
          Game.extractors.set(structure.id, structure)
          structure.room.extractor = structure
          break
        case STRUCTURE_LAB:
          Game.labs.set(structure.id, structure)
          structure.room.labs.set(structure.id, structure)
          break
        case STRUCTURE_TERMINAL:
          Game.terminals.set(structure.id, structure)
          break
        case STRUCTURE_FACTORY:
          Game.factories.set(structure.id, structure)
          structure.room.factory = structure
          break
        case STRUCTURE_OBSERVER:
          Game.observers.set(structure.id, structure)
          structure.room.observer = structure
          break
        case STRUCTURE_POWER_SPAWN:
          Game.powerSpawns.set(structure.id, structure)
          structure.room.powerSpawn = structure
          break
        case STRUCTURE_NUKER:
          Game.nukers.set(structure.id, structure)
          structure.room.nuker = structure
          break
        default:
          break
      }
    }
  }
}

module.exports = extensions
