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
}

const map = {
  costCallback_costMatrixForRoomActivity: function (roomName, costMatrix) {
    if (Game.__roomActivityCostCallbackCache === undefined) {
      Game.__roomActivityCostCallbackCache = { }
    }

    const cached = Game.__roomActivityCostCallbackCache[roomName]
    if (cached) {
      return cached
    }

    costMatrix.setStationaryCreepsUnwalkabke(roomName)

    Game.__roomActivityCostCallbackCache[roomName] = costMatrix

    return costMatrix
  }
}

module.exports = map
