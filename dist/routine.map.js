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
      if (roomMemory && roomMemory.ownerLevel !== undefined) {
        roomMemory.nodeAccessed = Game.time
        result = byOwnerUsernameAndLevel(roomMemory.ownerUsername, roomMemory.ownerLevel)
      } else {
        result = byRoomName(roomName)
      }
    }

    Game[cacheName].set(roomName, result)

    return result
  },

  __routeCallback_safeTravel_sk (roomName, fromRoomName) {
    const byRoomName = roomName1 => {
      const parsed = bootstrap._parseRoomName(roomName1)
      if (bootstrap._isHighwayRoomName(parsed)) return 1
      if (bootstrap._isSourceKeeperRoomName(parsed)) return 2.5
      if (bootstrap._isSectorCenterRoomName(parsed)) return 1

      // room without known owner, let's not make new enemies
      Game.roomsToScan.add(roomName)
      return Infinity
    }

    const byOwnerUsername = username => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      if (Game.iff.isNPC(username)) return 1

      return Game.iff.isAlly(username) ? 1 : Infinity
    }

    return this.___routeCallback(roomName, fromRoomName, '__map__safeTravel_sk', byRoomName, byOwnerUsername)
  },

  __routeCallback_safeTravel_notSk (roomName, fromRoomName) {
    const byRoomName = roomName1 => {
      const parsed = bootstrap._parseRoomName(roomName1)
      if (bootstrap._isHighwayRoomName(parsed)) return 1
      if (bootstrap._isSourceKeeperRoomName(parsed)) return Infinity
      if (bootstrap._isSectorCenterRoomName(parsed)) return 1

      // room without known owner, let's not make new enemies
      Game.roomsToScan.add(roomName)
      return Infinity
    }

    const byOwnerUsername = username => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      if (Game.iff.isNPC(username)) return 1

      return Game.iff.isAlly(username) ? 1 : Infinity
    }

    return this.___routeCallback(roomName, fromRoomName, '__map__safeTravel_notSk', byRoomName, byOwnerUsername)
  },

  __routeCallback_combatTravel (roomName, fromRoomName) {
    const byRoomName = roomName1 => {
      const parsed = bootstrap._parseRoomName(roomName1)
      if (bootstrap._isHighwayRoomName(parsed)) return 1
      if (bootstrap._isSourceKeeperRoomName(parsed)) return 2.5
      if (bootstrap._isSectorCenterRoomName(parsed)) return 1

      // room without known owner, let's not make new enemies
      Game.roomsToScan.add(roomName)
      return Infinity
    }

    const byOwnerUsernameAndLevel = (username, level) => {
      if (username === undefined) return 1
      if (username === Game.iff.ownUsername) return 1
      if (Game.iff.isNPC(username)) return 1

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
    const fromRoom = fromPos.roomName
    const toRoom = toPos.roomName

    let routeCallback

    if (mode === 'safe') {
      let toSk = false

      const parsedTo = bootstrap._parseRoomName(toRoom)
      if (!toSk && bootstrap._isSectorCenterRoomName(parsedTo)) toSk = true
      if (!toSk && bootstrap._isSourceKeeperRoomName(parsedTo)) toSk = true

      let fromSk
      if (!toSk) {
        const parsedFrom = bootstrap._parseRoomName(fromRoom)
        if (!fromSk && bootstrap._isSectorCenterRoomName(parsedFrom)) fromSk = true
        if (!fromSk && bootstrap._isSourceKeeperRoomName(parsedFrom)) fromSk = true
      }

      let toFromSk = toSk === true || fromSk === true

      routeCallback = (x, y) => {
        if (Game.flags['block_' + x]) return Infinity
        if (Game.flags['block_' + x + '_' + y]) return Infinity
        if (Game.flags['block_' + y + '_' + x]) return Infinity

        if (x === toRoom) return 1

        if (toFromSk) return this.__routeCallback_safeTravel_sk(x, y)
        else return this.__routeCallback_safeTravel_notSk(x, y)
      }
    }

    if (mode === 'combat') {
      routeCallback = (x, y) => {
        if (Game.flags['block_' + x]) return Infinity
        if (Game.flags['block_' + x + '_' + y]) return Infinity
        if (Game.flags['block_' + y + '_' + x]) return Infinity

        if (x === toRoom) return 1

        return this.__routeCallback_combatTravel(x, y)
      }
    }

    return Game.map.findRoute(fromRoom, toRoom, { routeCallback })
  },

  _autoMarch (creep, destinationPosition, mode) {
    if (creep.fatigue > 0) {
      return creep.fatigueWrapper()
    }

    if (creep.memory._march) {
      const dest = creep.memory._march.dest
      if (dest.x === destinationPosition.x && dest.y === destinationPosition.y && dest.room === destinationPosition.roomName) {
        const time = creep.memory._march.time
        if (time >= (Memory.roomOwnerChangeDetected || 0)) {
          let exitIndex = 0
          if (creep.memory._march.room !== creep.room.name) {
            // push movement at least one step into the room before slicing the path
            if (creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49) {
              creep.memory._march.path = creep.memory._march.path.slice(1)
              creep.memory._march.room = creep.room.name
            } else {
              exitIndex = 1
            }
          }

          const path = creep.memory._march.path
          if (path.length > 0) {
            const direction = _.parseInt(path[0])
            const exit = path.length > exitIndex ? _.parseInt(path[exitIndex]) : undefined
            const rc = creep.march(direction, exit)
            if (rc >= OK) {
              return rc
            }
          }
        }
      }
    }

    creep.memory._march = undefined

    const route = this.__route(creep.pos, destinationPosition, mode)
    if (route === ERR_NO_PATH) return ERR_NO_PATH

    let first
    let path = ''
    for (const segment of route) {
      if (first === undefined) first = segment.exit
      path += segment.exit
    }

    creep.memory._march = {
      dest: {
        x: destinationPosition.x,
        y: destinationPosition.y,
        room: destinationPosition.roomName
      },
      time: Game.time,
      path,
      room: creep.room.name
    }

    return creep.march(first)
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
    if (creep.memory._march && creep.memory._march.path.length === 1) {
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
