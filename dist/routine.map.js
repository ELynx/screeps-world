'use strict'

if (!(new PathFinder.CostMatrix())._bits) {
  console.log('CostMatrix missing _bits')
}

PathFinder.CostMatrix.prototype.setStationaryCreepsUnwalkabke = function (roomName) {
  if (!this._bits) {
    return
  }

  const room = Game.rooms[roomName]
  if (room === undefined) return

  for (const block of room.blocked) {
    // https://github.com/screeps/engine/blob/78d980e50821ea9956d940408b733c44fc9d94ed/src/game/path-finder.js#L25
    this._bits[block.x * 50 + block.y] = 255
    room.visual.circle(block.x, block.y, { fill: 'transparent', radius: 0.55, stroke: 'white' })
  }

  // reset array for re-entry
  room.blocked = []
}

const map = {
  costCallback_costMatrixForRoomActivity: function (roomName, costMatrix) {
    if (Game.__map__costCallback_costMatrixForRoomActivity_cache === undefined) {
      Game.__map__costCallback_costMatrixForRoomActivity_cache = { }
    }

    const currentState = Game.__map__costCallback_costMatrixForRoomActivity_cache[roomName] || costMatrix

    currentState.setStationaryCreepsUnwalkabke(roomName)

    Game.__map__costCallback_costMatrixForRoomActivity_cache[roomName] = currentState

    return currentState
  }
}

module.exports = map
