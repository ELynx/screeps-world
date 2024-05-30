'use strict'

let MapRoutineDisabled = false

if (!(new PathFinder.CostMatrix())._bits) {
  console.log('CostMatrix missing _bits')
  MapRoutineDisabled = true
}

PathFinder.CostMatrix.prototype.blockArray = function (blocks) {
  if (!this._bits) {
    return
  }

  for (const block of blocks) {
    // https://github.com/screeps/engine/blob/78d980e50821ea9956d940408b733c44fc9d94ed/src/game/path-finder.js#L25
    this._bits[block.x * 50 + block.y] = 255
    room.visual.circle(block.x, block.y, { fill: 'transparent', radius: 0.55, stroke: 'white' })
  }
}

const map = {
  costCallback_costMatrixForRoomActivity: function (roomName, costMatrix) {
    if (MapRoutineDisabled) return undefined

    const room = Game.rooms[roomName]
    if (room === undefined) return undefined

    if (room.blocked.length > 0) {
      const costMatrix1 = room.__map__cache1 || costMatrix

      costMatrix1.blockArray(room.blocked)
      room.blocked = []

      room.__map__cache1 = costMatrix1
    }

    return room.__map__cache1 // not a problem if undefined
  }
}

module.exports = map
