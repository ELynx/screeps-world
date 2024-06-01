'use strict'

const bootstrap = require('./bootstrap')

let CostMatrixDisabled = false

if (!(new PathFinder.CostMatrix())._bits) {
  console.log('CostMatrix missing _bits')
  CostMatrixDisabled = true
}

PathFinder.CostMatrix.prototype.blockArray = function (blocks, visual = undefined) {
  if (!this._bits) {
    return
  }

  for (const block of blocks) {
    // https://github.com/screeps/engine/blob/78d980e50821ea9956d940408b733c44fc9d94ed/src/game/path-finder.js#L25
    this._bits[block.x * 50 + block.y] = 255
    if (visual) {
      visual.circle(block.x, block.y, { fill: 'transparent', radius: 0.55, stroke: 'white' })
    }
  }
}

const map = {
  costCallback_costMatrixForRoomActivity (roomName, costMatrix) {
    if (CostMatrixDisabled) return undefined

    const room = Game.rooms[roomName]
    if (room === undefined) return undefined

    if (room.blocked.length > 0) {
      const costMatrix1 = room.__map__cache1 || costMatrix

      costMatrix1.blockArray(room.blocked, room.visual)
      room.blocked = []

      room.__map__cache1 = costMatrix1
    }

    return room.__map__cache1 // not a problem if undefined
  },

  routeCallback_safeTravel (roomName, _fromRoomName) {
    if (Game.__map__safeTravel) {
      const cached = Game.__map__safeTravel.get(roomName)
      if (cached !== undefined) return cached
    }

    if (Game.__map__safeTravel === undefined) {
      Game.__map__safeTravel = new Map()
    }

    let result

    const fromRoomName = roomName1 => {
      if (bootstrap.isHighwayRoomName(roomName1)) return 1
      if (bootstrap.isSourceKeeperRoomName(roomName1)) return Infinity
      if (bootstrap.isSectorCenterRoomName(roomName1)) return 1

      // room without known owner, beware
      return 2
    }

    const fromOwnerUsername = username => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      return Game.iff.isAlly(username) ? 1 : Infinity
    }

    const room = Game.rooms[roomName]
    if (room) {
      if (room.controller) {
        result = fromOwnerUsername(room.extendedOwnerUsername())
      } else {
        result = fromRoomName(roomName)
      }
    } else {
      const roomMemory = Memory.rooms[roomName]
      if (roomMemory && roomMemory.ownerUsername) {
        roomMemory.nodeAccessed = Game.time
        result = fromOwnerUsername(roomMemory.ownerUsername)
      } else {
        result = fromRoomName(roomName)
      }
    }

    Game.__map__safeTravel.set(roomName, result)

    return result
  },

  safeTravel (creep, destinationPosition) {
    return creep.moveToWrapper(
      destinationPosition,
      {
        range: destinationPosition.offBorderDistance(),
        reusePath: _.random(3, 5)
      }
    )
  },

  combatTravel (creep, destinationPosition) {
    creep.moveToWrapper(
      controlPos,
      {
        range: destinationPosition.offBorderDistance(),
        reusePath: _.random(3, 5)
      }
    )
  }
}

module.exports = map
