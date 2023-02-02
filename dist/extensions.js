'use strict'

const bootstrap = require('bootstrap')

// ones that do get harmful effects
Structure.prototype.hostileOrUnowned = function () {
  return true
}

// ones that do get harmful effects
OwnedStructure.prototype.hostileOrUnowned = function () {
  return this.unowned || this.hostile
}

// anycreep who get benefits, mostly healing
Creep.prototype.myOrAlly = function () {
  return this.my || this.ally
}

// anycreep who is not `my` but do not get harmful effects
Creep.prototype.allyOrNeutral = function () {
  return this.ally || this.neutral
}

/**
@return Game object creep is targeted to.
**/
Creep.prototype.target = function () {
  return Game.getObjectById(this.memory.dest)
}

/**
@param {array<Creep>} creeps to heal.
**/
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

/**
@param {array<Creep>} creeps to heal.
**/
Creep.prototype.healAdjacent = function (creeps) {
  for (let i = 0; i < creeps.length; ++i) {
    const target = creeps[i]
    if (this.pos.isNearTo(target)) {
      return this.heal(target)
    }
  }

  return ERR_NOT_FOUND
}

Creep.prototype.purgeEnergy = function () {
  if (this.store[RESOURCE_ENERGY] > 0) this.drop(RESOURCE_ENERGY)
}

Creep.prototype.withdrawFromAdjacentStructures = function (targets) {
  if (this.getActiveBodyparts(CARRY) === 0) return ERR_FULL

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

Creep.prototype.moveWrapper = function (direction) {
  return this.move(direction)
}

Creep.prototype.moveToWrapper = function (destination, options = { }) {
  return this.moveTo(destination, bootstrap.moveOptionsWrapper(options))
}

Creep.prototype.unlive = function () {
  let result = false

  if (this.room.my() && this.room.memory.elvl > 0) {
    this.setControlRoom(this.room.name)
    result = true
  } else if (this.memory._xxx) {
    this.setControlRoom(this.memory._xxx)
    result = true
  } else {
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      if (room.my() && room.memory.elvl > 0) {
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
    this.memory.recycle = true

    return OK
  }

  return this.suicide()
}

if (!(new PathFinder.CostMatrix())._bits) {
  console.log('CostMatrix missing _bits')
}

PathFinder.CostMatrix.prototype.setBordersUnwalkable = function () {
  if (!this._bits) {
    return
  }

  for (let index = 0; index <= 49; ++index) {
    this._bits[index] = 255
    this._bits[index + 2450] = 255
  }

  for (let row = 1; row <= 48; ++row) {
    const index0 = row * 50
    this._bits[index0] = 255
    this._bits[index0 + 49] = 255
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
    this.setColor(newColor, this.secondaryColor)
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

Room.prototype.roomDebug = function (what) {
  if (this._verboseT_ === undefined ||
        this._verboseT_ !== Game.time) {
    this._debugY_ = 1.5
    this._verboseT_ = Game.time
  }

  this.visual.text(what, 0, this._debugY_++, { align: 'left', font: 'courier' })
}

/**
Get a list of creeps assigned to a room, cached
**/
Room.prototype.getRoomControlledCreeps = function () {
  if (this._roomCreeps === undefined) {
    this._roomCreeps = _.filter(
      Game.creeps,
      function (creep, name) {
        // skip tasked
        if (creep.memory.flag) return false

        return creep.memory.crum === this.name
      },
      this
    )
  }

  return this._roomCreeps
}

Room.prototype.my = function () {
  return this.controller && this.controller.my
}

Room.prototype.ally = function () {
  return this.controller && this.controller.ally
}

Room.Terrain.prototype.costMatrixWithUnwalkableBorders = function (roomName, costMatrix) {
  if (Game.__unwalkableBordersCostCallbackCache === undefined) {
    Game.__unwalkableBordersCostCallbackCache = { }
  }

  const cached = Game.__unwalkableBordersCostCallbackCache[roomName]
  if (cached) {
    return cached
  }

  const modified = costMatrix.clone()
  modified.setBordersUnwalkable()

  Game.__unwalkableBordersCostCallbackCache[roomName] = modified

  return modified
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
  return !(id === undefined)
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

        if (x < 0 || x > 49 || y < 0 || y > 49) continue

        result[(x + 1) + 100 * (y + 1)] = new RoomPosition(x, y, pos.roomName)
      }
    }

    return result
  }

  const fromThis = aroundAsMap(this)
  const fromOther = aroundAsMap(otherRoomPosition)

  const intersections = _.intersection(Object.keys(fromThis), Object.keys(fromOther))

  const result = []
  for (const outerIndex in intersections) {
    const innerIndex = intersections[outerIndex]
    result.push(fromThis[innerIndex])
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

Structure.prototype.isActiveSimple = function () {
  // if special flag is set on the room
  if (this.room.memory.noSimple) {
    return this.isActive()
  }

  // simple strategy, this is most likely any way
  return true
}

Structure.prototype.getFromMemory = function (key) {
  if (!Memory.structures) return undefined

  if (!Memory.structures[this.id]) return undefined

  return Memory.structures[this.id][key]
}

Structure.prototype.setToMemory = function (key, value) {
  if (!Memory.structures) Memory.structures = { }

  if (!Memory.structures[this.id]) Memory.structures[this.id] = { }

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
