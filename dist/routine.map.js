'use strict'

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

PathFinder.CostMatrix.prototype.setStationaryCreepsUnwalkabke = function (roomName) {
  if (!this._bits) {
    return
  }

  const room = Game.rooms[roomName]
  if (room === undefined) return

  for (const block of room.blocked) {
    // https://github.com/screeps/engine/blob/78d980e50821ea9956d940408b733c44fc9d94ed/src/game/path-finder.js#L25
    this._bits[block.x * 50 + block.y] = 255
    room.visual.circle(block.x, block.y, {fill: 'transparent', radius: 0.55, stroke: 'white'})
  }
}

const map = {
  costCallback_costMatrixWithUnwalkableBorders: function (roomName, costMatrix) {
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
  },

  costCallback_costMatrixForRoomActivity: function (roomName, costMatrix) {
    if (Game.__roomActivityCostCallbackCache === undefined) {
      Game.__roomActivityCostCallbackCache = { }
    }

    const cached = Game.__roomActivityCostCallbackCache[roomName]
    if (cached) {
      return cached
    }

    const modified = costMatrix.clone()
    modified.setBordersUnwalkable()
    modified.setStationaryCreepsUnwalkabke(roomName)

    Game.__roomActivityCostCallbackCache[roomName] = modified

    return modified
  }
}

module.exports = map
