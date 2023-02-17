'use strict'

const Tasked = require('./tasked.template')

const beetle = new Tasked('beetle')

const BreachCompleteDistance = 1

beetle.breachLength = function (breach) {
  // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/utils.js#L555
  return breach.length - 4
}

beetle.wipeBreach = function (creep) {
  creep.memory._brP = undefined
  creep.memory._brI = undefined
  creep.memory._brT = undefined
  creep.memory._brC = undefined
}

beetle.creepPrepare = function (creep) {
  creep.__canWithdraw = creep.getActiveBodyparts(CARRY) > 0
}

beetle.creepAtDestination = function (creep) {
  creep.purgeEnergy()

  let beHostile = true

  if (Game.rooms.sim === undefined) {
    if (room.myOrMyReserved() || room.ally || room.neutral) {
      beHostile = false
    }
  }

  // every N ticks refresh situation
  if (creep.memory._brT) {
    if (Game.time - creep.memory._brT > 10) {
      this.wipeBreach(creep)
    }
  }

  // at the end of path refresh situation immediately
  if (creep.memory._brP && creep.memory._brI) {
    if (this.breachLength(creep.memory._brP) <= creep.memory._brI) {
      this.wipeBreach(creep)
    }
  }

  const controlPos = creep.getControlPos()

  let targetPos

  if (creep.room.__aggro && creep.room.__aggro.length > 0) {
    targetPos = creep.pos.findClosestByRange(creep.room.__aggro).pos
  } else if (creep.pos.inRangeTo(controlPos, BreachCompleteDistance)) {
    // after arriving on the spot, start running like headless chicken
    // biased to center, as needed
    targetPos = new RoomPosition(
      Math.floor(Math.random() * 49),
      Math.floor(Math.random() * 49),
      creep.room.name
    )
  } else {
    targetPos = controlPos
  }

  // how much is remaining
  const toTargetPos = creep.pos.getRangeTo(targetPos)

  // there is place to go and no path known
  if (toTargetPos > 1 && creep.memory._brP === undefined) {
    let path
    let color

    // try to find a path to nearby location
    // detect obstacles so there is a chance to go through existing breaches
    // try to reach the place if nearby
    const easyDistance = BreachCompleteDistance * 3
    const easyRange = toTargetPos > easyDistance ? easyDistance : BreachCompleteDistance

    const easyPath = creep.room.findPath(
      creep.pos,
      targetPos,
      {
        ignoreCreeps: false,
        ignoreDestructibleStructures: false,
        maxRooms: 1,
        range: easyRange,
        maxOps: 500,

        serialize: false // ! to be used for position check
      }
    )

    // check if endpoint is within wanted range
    if (easyPath.length > 0) {
      const last = easyPath[easyPath.length - 1]
      last.roomName = creep.room.name
      if (targetPos.inRangeTo(last, easyRange)) {
        // because expect serialized
        path = Room.serializePath(easyPath)
        color = '#0f0'
      }
    }

    // no, easy path was not found, need to look through walls
    if (path === undefined) {
      // come a bit closer, do not plan a trip up to the point
      const hardRange = Math.max(toTargetPos - easyDistance, BreachCompleteDistance)

      path = creep.room.findPath(
        creep.pos,
        targetPos,
        {
          ignoreCreeps: true,
          ignoreDestructibleStructures: beHostile,
          maxRooms: 1,
          range: hardRange,

          serialize: true
        }
      )
      color = '#f00'
    }

    creep.memory._brP = path
    creep.memory._brI = 0
    creep.memory._brT = Game.time
    creep.memory._brC = color
  }

  let next

  if (toTargetPos > 1) {
    if (creep.memory._brP) {
      const path = Room.deserializePath(creep.memory._brP)

      creep.room.visual.poly(path, { stroke: creep.memory._brC })

      for (let i = creep.memory._brI; i < path.length; ++i) {
        const pathItem = path[i]

        const supposeNowX = pathItem.x - pathItem.dx
        const supposeNowY = pathItem.y - pathItem.dy

        if (creep.pos.x === supposeNowX && creep.pos.y === supposeNowY) {
          next = pathItem
          creep.memory._brI = i
          break
        }
      }
    }
  } else {
    next = targetPos
  }

  if (next) {
    let target

    if (beHostile) {
      const [t, l, b, r] = creep.pos.squareArea(1)

      const around = creep.room.lookForAtArea(
        LOOK_STRUCTURES,
        t, // top
        l, // left
        b, // bottom
        r, // right
        true // as array
      )

      for (const itemKey in around) {
        const item = around[itemKey]
        const struct = item.structure

        if (item.x !== next.x || item.y !== next.y) {
          continue
        }

        if (struct.hits === undefined) {
          continue
        }

        if (struct.structureType === STRUCTURE_RAMPART && !struct.isPublic) {
          target = struct
          break
        }

        const obstacle = _.some(OBSTACLE_OBJECT_TYPES, _.matches(struct.structureType))
        if (obstacle) {
          target = struct
        }
      }

      if (creep.__canWithdraw) {
        const withdraws = _.map(around, _.property('structure'))
        creep.withdrawFromAdjacentStructures(withdraws)
      }
    }

    let rc
    if (target) {
      rc = creep.dismantle(target)
      // coordinate effort - ask nearbys to attack
      if (rc === OK) {
        creep.room.visual.circle(target.pos, { fill: '#f00' })
        if (target.__aggro === undefined) {
          target.__aggro = true
          if (creep.room.__aggro) {
            creep.room.__aggro.push(target)
          }
        }
      }
    } else {
      rc = creep.moveWrapper(next.direction)
      // trick - expect that movement actually happened
      // search step from +1 of current
      if (rc === OK) {
        ++creep.memory._brI
      }
    }

    // extend breach time
    if (rc === OK) {
      creep.memory._brT = Game.time
    }
    // end of next is present
  } else {
    this.wipeBreach(creep)
  }
}

beetle.flagPrepare = function (flag) {
  if (flag.room && flag.room.__breached) {
    return this.FLAG_IGNORE
  }

  return this.FLAG_SPAWN
}

beetle.makeBody = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 250) {
    // 150  50    100
    return [MOVE, WORK]
  }

  if (energy < 300) {
    // 250  50    50    50     100
    return [MOVE, MOVE, CARRY, WORK]
  }

  if (!this.__bodyCache) {
    this.__bodyCache = { }
  }

  const elvl = Math.ceil((energy - 300) / 500)

  const cached = this.__bodyCache[elvl]
  if (cached) {
    return cached
  }

  // 300 for base combo and 150 per next level
  const budget = 300 + 150 * elvl
  const pairs = Math.min(Math.floor(budget / 150), 25)

  const a = new Array(pairs)
  a.fill(MOVE)

  const b = new Array(pairs - 1)
  b.fill(WORK)

  // one spot for withdraw
  const body = a.concat([CARRY]).concat(b)

  this.__bodyCache[elvl] = body

  return body
}

beetle.register()

module.exports = beetle
