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

  ___routeCallback (roomName, _fromRoomName, cacheName, byRoomName, byOwnerUsernameAndLevel) {
    if (Game[cacheName]) {
      const cached = Game[cacheName].get(roomName)
      if (cached !== undefined) return cached
    }

    if (Game[cacheName] === undefined) {
      Game[cacheName] = new Map()
    }

    const roomMemory = Memory.rooms[roomName]
    if (roomMemory && roomMemory.blok) {
      roomMemory.nodeAccessed = Game.time
      Game[cacheName].set(roomName, Infinity)
      return Infinity
    }

    let result

    const room = Game.rooms[roomName]
    if (room) {
      if (room.controller) {
        result = byOwnerUsernameAndLevel(room.extendedOwnerUsername(), room.controller.level)
      } else {
        result = byRoomName(roomName)
      }
    } else {
      if (roomMemory && roomMemory.ownerUsername && roomMemory.ownerLevel) {
        roomMemory.nodeAccessed = Game.time
        result = fromOwnerUsername(roomMemory.ownerUsername, roomMemory.ownerLevel)
      } else {
        result = byRoomName(roomName)
      }
    }

    Game[cacheName].set(roomName, result)

    return result
  },

  __routeCallback_safeTravel (roomName, fromRoomName) {
    const byRoomName = roomName1 => {
      if (bootstrap.isHighwayRoomName(roomName1)) return 1
      if (bootstrap.isSourceKeeperRoomName(roomName1)) return Infinity
      if (bootstrap.isSectorCenterRoomName(roomName1)) return 1

      // room without known owner, let's not make new enemies
      Game.roomsToScan.add(roomName)
      return Infinity
    }

    const byOwnerUsername = username => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      return Game.iff.isAlly(username) ? 1 : Infinity
    }

    return this.___routeCallback(roomName, fromRoomName, '__map__safeTravel', byRoomName, byOwnerUsername)
  },

  __routeCallback_combatTravel (roomName, _fromRoomName) {
    const byRoomName = roomName1 => {
      if (bootstrap.isHighwayRoomName(roomName1)) return 1
      if (bootstrap.isSourceKeeperRoomName(roomName1)) return 2.5
      if (bootstrap.isSectorCenterRoomName(roomName1)) return 1

      // room without known owner, let's not make new enemies
      Game.roomsToScan.add(roomName)
      return Infinity
    }

    const byOwnerUsernameAndLevel = (username, level) => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      if (Game.iff.isAlly(username)) return 1
      if (Game.iff.isHostile(username)) {
        // no walls and ramparts added at all
        if (level < 2) return 1
        return 2 // better bash head against enemy than source keeper
      }

      // do not bother neutrals
      return Infinity
    }

    return this.___routeCallback(roomName, fromRoomName, '__map__combatTravel', byRoomName, byOwnerUsernameAndLevel)
  },

  __route (fromPos, toPos, mode) {
    let routeCallback
    if (mode === 'safe') routeCallback = (x, y) => this.__routeCallback_safeTravel(x, y)
    if (mode === 'combat') routeCallback = (x, y) => this.__routeCallback_combatTravel(x, y)
  },

  _autoMarch (creep, destinationPosition, mode) {
    // TODO
    return this._arrive(creep, destinationPosition)
  },

  _arrive (creep, destinationPosition) {
    return creep.moveToWrapper(
      destinationPosition,
      {
        range: destinationPosition.offBorderDistance(),
        reusePath: _.random(3, 5)
      }
    )
  },

  _travel (creep, destinationPosition, mode) {
    if (creep.pos.getRoomLinearDistance(destinationPosition) <= 1) {
      return this._arrive(creep, destinationPosition)
    }

    return this._autoMarch(creep, destinationPosition, mode)
  },

  safeTravel (creep, destinationPosition) {
    return this._travel(creep, destinationPosition, 'safe')
  },

  combatTravel (creep, destinationPosition) {
    return this._travel(creep, destinationPosition, 'combat')
  }
}

module.exports = map
